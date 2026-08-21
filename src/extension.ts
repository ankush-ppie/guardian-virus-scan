import * as vscode from 'vscode';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  isGitRepo,
  getAllLocalBranches,
  getAllRemoteBranches,
  getCurrentBranch,
  detectProjectType,
  scanBranch,
  scanWorkingTree,
  WorkspaceScanResult,
  applySafePreferences,
  getActiveThreats,
  hasRemotes,
  fetchRemoteRefs,
} from './scanner';
import { buildReportHtml } from './report';
import { getAllSafeRules, addSafeRule, removeSafeRule } from './preferences';
import {
  auditInstalledExtensions,
  uninstallExtension,
  uninstallAllMaliciousExtensions,
  ExtensionAuditReport,
} from './extensionAuditor';
import {
  runCredentialScan,
  CredentialScanOptions,
  exportCredentialTsv,
  exportCredentialJson,
  exportCredentialMarkdown,
} from './credentialScanner';

let reportPanel: vscode.WebviewPanel | undefined;
let latestResult: WorkspaceScanResult | undefined;
const virtualDocuments = new Map<string, string>();

// ─── Core: scan all branches in a workspace ───────────────────────────────────

async function runFullScan(
  workspacePath: string,
  progress?: vscode.Progress<{ message?: string; increment?: number }>,
  token?: vscode.CancellationToken,
  onProgress?: (info: { message: string; percent?: number }) => void
): Promise<WorkspaceScanResult> {
  const start = Date.now();

  if (!isGitRepo(workspacePath)) {
    throw new Error('Not a git repository.');
  }

  const config = vscode.workspace.getConfiguration('guardian');
  const shouldFetch = config.get<boolean>('fetchRemotesBeforeScan', true);

  if (shouldFetch && !token?.isCancellationRequested && hasRemotes(workspacePath)) {
    progress?.report({ message: 'Fetching latest remote branches from origin...' });
    onProgress?.({ message: 'Fetching latest remote branches from origin...', percent: 10 });
    try {
      fetchRemoteRefs(workspacePath);
    } catch {
      // Non-blocking fallback: proceed with locally cached refs
    }
  }

  const currentBranch = getCurrentBranch(workspacePath);
  const branches = getAllLocalBranches(workspacePath);
  const remoteBranches = getAllRemoteBranches(workspacePath);

  // Remote-tracking refs are present in the local Git object database;
  // scanning them requires no checkout or disk changes.
  // Exclude currentBranch because scanWorkingTree already scans the working tree for currentBranch.
  const refsToScan = [...new Set([...branches, ...remoteBranches])].filter(b => b !== currentBranch);

  if (branches.length === 0 && remoteBranches.length === 0) {
    throw new Error('No local or remote-tracking branches found.');
  }

  // Detect project type from current branch (or first available)
  const detectFrom = branches.includes(currentBranch) ? currentBranch : branches[0];
  const projectType = detectProjectType(workspacePath, detectFrom);

  const results: WorkspaceScanResult['branches'] = [];
  progress?.report({ message: 'Scanning current working tree (including ignored/untracked security files)' });
  onProgress?.({ message: 'Scanning current working tree (including ignored/untracked security files)', percent: 25 });
  results.push(scanWorkingTree(workspacePath, currentBranch, projectType));
  const step = refsToScan.length > 0 ? 70 / refsToScan.length : 70;

  for (let i = 0; i < refsToScan.length; i++) {
    if (token?.isCancellationRequested) break;

    const branch = refsToScan[i];
    progress?.report({
      message: `Scanning ref ${i + 1}/${refsToScan.length}: ${branch}`,
      increment: step,
    });
    onProgress?.({
      message: `Scanning ref ${i + 1}/${refsToScan.length}: ${branch}`,
      percent: 25 + Math.round(((i + 1) / refsToScan.length) * 70),
    });

    const result = scanBranch(workspacePath, branch, currentBranch, projectType);
    results.push(result);
  }

  const pkg = require('../package.json');

  return {
    workspacePath,
    projectType,
    currentBranch,
    localBranches: branches,
    remoteBranches,
    branches: results,
    scanDurationMs: Date.now() - start,
    version: pkg.version,
  };
}

// ─── Open a threat file ───────────────────────────────────────────────────────
// ALWAYS reads from the infected branch via `git show branch:file`.
// Never switches branches. Never opens the disk file (which may be the clean
// version on the current branch). The file opens as a read-only virtual doc
// labelled [branch] filename so the user knows exactly what they are viewing.
async function openThreatFile(
  context: vscode.ExtensionContext,
  workspaceRoot: string,
  file: string,
  line: number,
  branch: string
) {
  const targetLine = Math.max(0, (line || 1) - 1);

  try {
    const gitPath = file.replace(/\\/g, '/');
    const isWorkingTree = branch.endsWith(' (working tree)');
    let raw: string;
    if (isWorkingTree) {
      const root = path.resolve(workspaceRoot);
      const target = path.resolve(root, file);
      if (target !== root && !target.startsWith(root + path.sep)) {
        throw new Error('Refusing to read a path outside the workspace.');
      }
      raw = fs.readFileSync(target, 'utf8');
    } else {
      raw = execFileSync('git', ['show', `${branch}:${gitPath}`], {
        cwd: workspaceRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
      }).toString('utf8');
    }

    // Virtual URI: guardian-branch:/main/.vscode/settings.json
    // Each branch+file combo gets its own URI so multiple files can be open
    const scheme = 'guardian-branch';
    const uri = vscode.Uri.parse(
      `${scheme}:/${encodeURIComponent(branch)}/${file.replace(/\\/g, '/')}`
    );

    virtualDocuments.set(uri.toString(), raw);

    const doc = await vscode.workspace.openTextDocument(uri);
    const editor = await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside,
    });

    // Jump to the infected line
    const range = new vscode.Range(targetLine, 0, targetLine, 999);
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  } catch (e: any) {
    vscode.window.showErrorMessage(
      `Guardian: Could not read "${file}" from branch "${branch}" — ${e.message}`
    );
  }
}

async function openCredentialFile(
  context: vscode.ExtensionContext,
  workspaceRoot: string,
  file: string,
  line: number = 1,
  locationType: string,
  branchOrCommit?: string
) {
  const targetLine = Math.max(0, (line || 1) - 1);
  try {
    if (locationType === 'github-alert' && file.startsWith('http')) {
      vscode.env.openExternal(vscode.Uri.parse(file));
      return;
    }

    if (locationType === 'history' && branchOrCommit) {
      const gitPath = file.replace(/\\/g, '/');
      const raw = execFileSync('git', ['show', `${branchOrCommit}:${gitPath}`], {
        cwd: workspaceRoot,
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 8 * 1024 * 1024,
        windowsHide: true,
      }).toString('utf8');

      const scheme = 'guardian-branch';
      const uri = vscode.Uri.parse(
        `${scheme}:/${encodeURIComponent(`commit-${branchOrCommit}`)}/${file.replace(/\\/g, '/')}`
      );
      virtualDocuments.set(uri.toString(), raw);

      const doc = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(doc, {
        preview: false,
        viewColumn: vscode.ViewColumn.Beside,
      });

      const range = new vscode.Range(targetLine, 0, targetLine, 999);
      editor.selection = new vscode.Selection(range.start, range.end);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
      return;
    }

    if (locationType === 'tracked' && branchOrCommit) {
      await openThreatFile(context, workspaceRoot, file, line, branchOrCommit);
      return;
    }

    // Local file or .git/config
    const root = path.resolve(workspaceRoot);
    const target = path.resolve(root, file);
    if (!fs.existsSync(target)) {
      vscode.window.showWarningMessage(`Guardian: File "${file}" was not found on disk.`);
      return;
    }

    const doc = await vscode.workspace.openTextDocument(target);
    const editor = await vscode.window.showTextDocument(doc, {
      preview: false,
      viewColumn: vscode.ViewColumn.Beside,
    });

    const range = new vscode.Range(targetLine, 0, targetLine, 999);
    editor.selection = new vscode.Selection(range.start, range.end);
    editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
  } catch (e: any) {
    vscode.window.showErrorMessage(`Guardian: Could not open "${file}" — ${e.message}`);
  }
}

// ─── Show / refresh the report panel ─────────────────────────────────────────

function showReport(
  result: WorkspaceScanResult,
  context: vscode.ExtensionContext,
  initialTab: 'glassworm' | 'extension-audit' | 'credential-scan' = 'glassworm'
) {
  const activeInfectedCount = result.branches.filter(b => getActiveThreats(b.threats).length > 0).length;
  const extMaliciousCount = result.extensionAudit?.maliciousCount ?? 0;
  const credCriticalCount = result.credentialAudit?.criticalCount ?? 0;

  let title = '🛡️ Guardian — All branches clean';
  if (credCriticalCount > 0) {
    title = `🛡️ Guardian — ${credCriticalCount} critical secret(s) found`;
  } else if (activeInfectedCount > 0 && extMaliciousCount > 0) {
    title = `🛡️ Guardian — ${activeInfectedCount} infected branch(es), ${extMaliciousCount} malicious ext(s)`;
  } else if (activeInfectedCount > 0) {
    title = `🛡️ Guardian — ${activeInfectedCount} branch${activeInfectedCount !== 1 ? 'es' : ''} infected`;
  } else if (extMaliciousCount > 0) {
    title = `🛡️ Guardian — ${extMaliciousCount} malicious extension${extMaliciousCount !== 1 ? 's' : ''}`;
  }

  if (reportPanel) {
    latestResult = result;
    reportPanel.title = title;
    reportPanel.webview.html = buildReportHtml(result, initialTab);
    reportPanel.reveal(vscode.ViewColumn.One);
    reportPanel.webview.postMessage({ action: 'switchTab', tab: initialTab });
    return;
  }

  // Create panel fresh
  reportPanel = vscode.window.createWebviewPanel(
    'guardianReport',
    title,
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );
  reportPanel.onDidDispose(() => { reportPanel = undefined; });
  reportPanel.webview.html = buildReportHtml(result, initialTab);

  // Register listener ONCE — reads latestResult so it's always fresh
  reportPanel.webview.onDidReceiveMessage(
    async (msg) => {
      if (msg.action === 'rescan') {
        const folders = vscode.workspace.workspaceFolders;
        const workspacePath = latestResult?.workspacePath || folders?.[0]?.uri.fsPath;
        if (!workspacePath) return;

        updateStatusBar(latestResult, true);
        try {
          const rawResult = await runFullScan(
            workspacePath,
            undefined,
            undefined,
            (progress) => {
              reportPanel?.webview.postMessage({ action: 'glasswormScanProgress', progress });
            }
          );
          const safeRules = getAllSafeRules(context.workspaceState, context.globalState);
          const result = applySafePreferences(rawResult, safeRules);
          latestResult = result;
          updateStatusBar(result, false);
          showReport(result, context, 'glassworm');
        } catch (e: any) {
          updateStatusBar(latestResult, false);
          reportPanel?.webview.postMessage({
            action: 'glasswormScanError',
            message: e.message || 'Scan failed',
          });
        }
        return;
      }

      if (msg.action === 'reloadWindow') {
        vscode.commands.executeCommand('workbench.action.reloadWindow');
        return;
      }

      if (msg.action === 'copyText') {
        if (msg.text) {
          await vscode.env.clipboard.writeText(msg.text);
          vscode.window.setStatusBarMessage(`Copied "${msg.text}" to clipboard`, 2000);
        }
        return;
      }

      if (msg.action === 'markSafe') {
        const { rule, file, scope } = msg;
        await addSafeRule(rule, file, scope, context.workspaceState, context.globalState);
        const safeRules = getAllSafeRules(context.workspaceState, context.globalState);
        if (latestResult) {
          latestResult = applySafePreferences(latestResult, safeRules);
          showReport(latestResult, context);
          updateStatusBar(latestResult, false);
        }
        const scopeDesc = scope === 'global' ? 'all projects' : 'this project';
        vscode.window.setStatusBarMessage(`🛡️ Guardian: "${rule}" marked as safe for ${scopeDesc}.`, 2500);
        return;
      }

      if (msg.action === 'markUnsafe') {
        const { rule, file } = msg;
        await removeSafeRule(rule, file, context.workspaceState, context.globalState);
        const safeRules = getAllSafeRules(context.workspaceState, context.globalState);
        if (latestResult) {
          latestResult = applySafePreferences(latestResult, safeRules);
          showReport(latestResult, context);
          updateStatusBar(latestResult, false);
        }
        vscode.window.setStatusBarMessage(`🛡️ Guardian: "${rule}" marked as active/unsafe.`, 2500);
        return;
      }

      if (msg.action === 'openFile') {
        if (latestResult) {
          await openThreatFile(
            context,
            latestResult.workspacePath,
            msg.file,
            msg.line,
            msg.branch
          );
        }
        return;
      }

      if (msg.action === 'startExtensionAudit') {
        const report = await auditInstalledExtensions((progress) => {
          reportPanel?.webview.postMessage({ action: 'extensionAuditProgress', progress });
        });
        if (latestResult) {
          latestResult.extensionAudit = report;
        }
        reportPanel?.webview.postMessage({ action: 'extensionAuditComplete', report });
        return;
      }

      if (msg.action === 'uninstallExtension') {
        const { id, path } = msg;
        const result = await uninstallExtension(id, path);
        if (result.success) {
          vscode.window.setStatusBarMessage(`🛡️ Guardian: Extension "${id}" uninstalled.`, 2500);
          // Re-fetch extension audit fresh
          const report = await auditInstalledExtensions((progress) => {
            reportPanel?.webview.postMessage({ action: 'extensionAuditProgress', progress });
          });
          if (latestResult) {
            latestResult.extensionAudit = report;
          }
          reportPanel?.webview.postMessage({ action: 'extensionAuditComplete', report });
        } else {
          vscode.window.showErrorMessage(result.message);
          reportPanel?.webview.postMessage({
            action: 'extensionUninstalled',
            id,
            success: false,
            message: result.message,
          });
        }
        return;
      }

      if (msg.action === 'uninstallAllMalicious') {
        const { extensions } = msg;
        const results = await uninstallAllMaliciousExtensions(extensions || []);
        if (results.successful.length > 0) {
          vscode.window.setStatusBarMessage(`🛡️ Guardian: Removed ${results.successful.length} malicious extension(s).`, 2500);
          // Re-fetch extension audit fresh
          const report = await auditInstalledExtensions((progress) => {
            reportPanel?.webview.postMessage({ action: 'extensionAuditProgress', progress });
          });
          if (latestResult) {
            latestResult.extensionAudit = report;
          }
          reportPanel?.webview.postMessage({ action: 'extensionAuditComplete', report });
        }
        if (results.failed.length > 0) {
          vscode.window.showErrorMessage(
            `Guardian: Failed to automatically remove: ${results.failed.join(', ')}. Try running CLI uninstall commands.`
          );
        }
        return;
      }

      if (msg.action === 'startCredentialScan') {
        const options: CredentialScanOptions = msg.options || {
          scanTracked: true,
          scanHistory: false,
          scanLocal: true,
          scanRemotes: true,
        };
        const workspacePath = latestResult?.workspacePath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (!workspacePath) {
          vscode.window.showErrorMessage('Guardian: No workspace folder open for credential scan.');
          return;
        }

        const report = await runCredentialScan(workspacePath, options, (progress) => {
          reportPanel?.webview.postMessage({ action: 'credentialScanProgress', progress });
        });

        if (latestResult) {
          latestResult.credentialAudit = report;
        }
        reportPanel?.webview.postMessage({ action: 'credentialScanComplete', report });
        return;
      }

      if (msg.action === 'exportCredentialReport') {
        const format = msg.format || 'tsv';
        const report = latestResult?.credentialAudit;
        if (!report) {
          vscode.window.showWarningMessage('Guardian: No credential scan report to export. Please run a scan first.');
          return;
        }

        let defaultName = 'guardian-credentials-report.tsv';
        let filters: Record<string, string[]> = { 'TSV Document': ['tsv'], 'All Files': ['*'] };
        let content = exportCredentialTsv(report);

        if (format === 'json') {
          defaultName = 'guardian-credentials-report.json';
          filters = { 'JSON Document': ['json'], 'All Files': ['*'] };
          content = exportCredentialJson(report);
        } else if (format === 'md') {
          defaultName = 'guardian-credentials-report.md';
          filters = { 'Markdown Document': ['md'], 'All Files': ['*'] };
          content = exportCredentialMarkdown(report);
        }

        const uri = await vscode.window.showSaveDialog({
          defaultUri: vscode.workspace.workspaceFolders?.[0]?.uri
            ? vscode.Uri.joinPath(vscode.workspace.workspaceFolders[0].uri, defaultName)
            : undefined,
          filters,
        });

        if (uri) {
          fs.writeFileSync(uri.fsPath, content, { mode: 0o600 });
          vscode.window.showInformationMessage(`🛡️ Guardian: Redacted credential report exported to ${path.basename(uri.fsPath)}`);
        }
        return;
      }

      if (msg.action === 'openCredentialLocation') {
        const workspacePath = latestResult?.workspacePath || vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
        if (workspacePath) {
          await openCredentialFile(
            context,
            workspacePath,
            msg.file,
            msg.line,
            msg.locationType,
            msg.branchOrCommit
          );
        }
        return;
      }
    },
    undefined,
    context.subscriptions
  );
}

let statusBarItem: vscode.StatusBarItem | undefined;

function updateStatusBar(result?: WorkspaceScanResult, isScanning: boolean = false) {
  if (!statusBarItem) return;

  if (isScanning) {
    statusBarItem.text = '$(sync~spin) Guardian: Scanning...';
    statusBarItem.tooltip = 'Guardian is scanning workspace and branch refs...';
    statusBarItem.backgroundColor = undefined;
    statusBarItem.show();
    return;
  }

  if (!result) {
    statusBarItem.text = '$(shield) Guardian';
    statusBarItem.tooltip = 'Guardian: Click to scan workspace and open report';
    statusBarItem.backgroundColor = undefined;
    statusBarItem.show();
    return;
  }

  const activeInfectedBranches = result.branches.filter(b => getActiveThreats(b.threats).length > 0);
  const totalActiveThreats = result.branches.reduce((acc, b) => acc + getActiveThreats(b.threats).length, 0);

  if (totalActiveThreats > 0) {
    statusBarItem.text = `$(shield) Guardian: ${totalActiveThreats} threat${totalActiveThreats !== 1 ? 's' : ''}`;
    statusBarItem.tooltip = `Guardian: ${activeInfectedBranches.length} infected branch(es), ${totalActiveThreats} threat(s) detected. Click to open report.`;
    statusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground');
  } else {
    statusBarItem.text = '$(shield) Guardian: Clean';
    statusBarItem.tooltip = `Guardian: All ${result.branches.length} branch refs clean. Click to open report.`;
    statusBarItem.backgroundColor = undefined;
  }
  statusBarItem.show();
}

// ─── Activate ─────────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {

  statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 10);
  statusBarItem.command = 'guardian.openReport';
  updateStatusBar();
  context.subscriptions.push(statusBarItem);

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('guardian-branch', {
      provideTextDocumentContent: uri => virtualDocuments.get(uri.toString()) ?? '',
    })
  );

  // ── Startup & Background Scanning ──────────────────────────────────────────
  async function performStartupScan() {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders?.length) return;

    updateStatusBar(undefined, true);

    let totalActiveThreats = 0;
    let hasValidScan = false;

    for (const folder of folders) {
      try {
        const raw = await runFullScan(folder.uri.fsPath);
        const safeRules = getAllSafeRules(context.workspaceState, context.globalState);
        const result = applySafePreferences(raw, safeRules);
        latestResult = result;
        hasValidScan = true;

        const active = result.branches.reduce((acc, b) => acc + getActiveThreats(b.threats).length, 0);
        totalActiveThreats += active;
      } catch {
        // Quiet ignore for non-git folders
      }
    }

    updateStatusBar(latestResult, false);

    if (!hasValidScan) return;

    // If report panel was already open from a previous session, refresh it
    if (reportPanel && latestResult) {
      showReport(latestResult, context);
    }

    // Exactly 1 message for all workspaces on startup
    if (totalActiveThreats > 0) {
      vscode.window.showWarningMessage(
        `🚨 Guardian: ${totalActiveThreats} threat${totalActiveThreats !== 1 ? 's' : ''} detected across workspace.`,
        'View Report'
      ).then(choice => {
        if (choice === 'View Report' && latestResult) {
          showReport(latestResult, context);
        }
      });
    } else {
      vscode.window.showInformationMessage(
        '🛡️ Guardian: Workspace scan complete — all clean.',
        'View Report'
      ).then(choice => {
        if (choice === 'View Report' && latestResult) {
          showReport(latestResult, context);
        }
      });
    }
  }

  // Trigger on startup (with small delay so VS Code UI finishes loading)
  if (vscode.workspace.workspaceFolders?.length) {
    setTimeout(() => {
      performStartupScan();
    }, 1500);
  }

  // Trigger when a folder is added
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(event => {
      if (event.added.length > 0) {
        performStartupScan();
      }
    })
  );

  // ── Commands ─────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('guardian.openReport', async () => {
      if (latestResult) {
        showReport(latestResult, context);
      } else {
        const folders = vscode.workspace.workspaceFolders;
        if (folders?.length) {
          try {
            updateStatusBar(undefined, true);
            const raw = await runFullScan(folders[0].uri.fsPath);
            const safeRules = getAllSafeRules(context.workspaceState, context.globalState);
            latestResult = applySafePreferences(raw, safeRules);
            updateStatusBar(latestResult, false);
            showReport(latestResult, context);
          } catch (e: any) {
            updateStatusBar(undefined, false);
            vscode.window.showErrorMessage(`Guardian scan failed: ${e.message}`);
          }
        } else {
          vscode.window.showInformationMessage('Guardian: No workspace folder open.');
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('guardian.scanAllBranches', async () => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders?.length) {
        vscode.window.showInformationMessage('Guardian: No workspace folder open.');
        return;
      }
      const workspacePath = folders[0].uri.fsPath;
      updateStatusBar(latestResult, true);
      try {
        const rawResult = await runFullScan(
          workspacePath,
          undefined,
          undefined,
          (progress) => {
            reportPanel?.webview.postMessage({ action: 'glasswormScanProgress', progress });
          }
        );
        const safeRules = getAllSafeRules(context.workspaceState, context.globalState);
        const result = applySafePreferences(rawResult, safeRules);
        latestResult = result;
        updateStatusBar(result, false);
        showReport(result, context, 'glassworm');
      } catch (e: any) {
        updateStatusBar(latestResult, false);
        if (!e.message?.includes('Not a git repository')) {
          vscode.window.showErrorMessage(`Guardian scan failed: ${e.message}`);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('guardian.auditExtensions', async () => {
      if (!latestResult) {
        const folders = vscode.workspace.workspaceFolders;
        if (folders?.length) {
          try {
            const raw = await runFullScan(folders[0].uri.fsPath);
            const safeRules = getAllSafeRules(context.workspaceState, context.globalState);
            latestResult = applySafePreferences(raw, safeRules);
          } catch {
            latestResult = {
              workspacePath: folders[0].uri.fsPath,
              projectType: 'generic',
              branches: [],
              scanDurationMs: 0,
            };
          }
        } else {
          latestResult = {
            workspacePath: 'Extension Supply-Chain Scan',
            projectType: 'generic',
            branches: [],
            scanDurationMs: 0,
          };
        }
      }
      showReport(latestResult, context, 'extension-audit');

      const report = await auditInstalledExtensions((progress) => {
        reportPanel?.webview.postMessage({ action: 'extensionAuditProgress', progress });
      });
      if (latestResult) {
        latestResult.extensionAudit = report;
      }
      reportPanel?.webview.postMessage({ action: 'extensionAuditComplete', report });
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('guardian.scanCredentials', async () => {
      const folders = vscode.workspace.workspaceFolders;
      if (!folders?.length) {
        vscode.window.showInformationMessage('Guardian: No workspace folder open.');
        return;
      }
      const workspacePath = folders[0].uri.fsPath;
      if (!latestResult) {
        try {
          const raw = await runFullScan(workspacePath);
          const safeRules = getAllSafeRules(context.workspaceState, context.globalState);
          latestResult = applySafePreferences(raw, safeRules);
        } catch {
          latestResult = {
            workspacePath,
            projectType: 'generic',
            branches: [],
            scanDurationMs: 0,
          };
        }
      }
      showReport(latestResult, context, 'credential-scan');

      const defaultOptions: CredentialScanOptions = {
        scanTracked: true,
        scanHistory: false,
        scanLocal: true,
        scanRemotes: true,
      };

      const report = await runCredentialScan(workspacePath, defaultOptions, (progress) => {
        reportPanel?.webview.postMessage({ action: 'credentialScanProgress', progress });
      });

      if (latestResult) {
        latestResult.credentialAudit = report;
      }
      reportPanel?.webview.postMessage({ action: 'credentialScanComplete', report });
    })
  );
}

export function deactivate() {
  reportPanel?.dispose();
  statusBarItem?.dispose();
}

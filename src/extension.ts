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
} from './scanner';
import { buildReportHtml } from './report';
import { getAllSafeRules, addSafeRule, removeSafeRule } from './preferences';
import {
  auditInstalledExtensions,
  uninstallExtension,
  uninstallAllMaliciousExtensions,
  ExtensionAuditReport,
} from './extensionAuditor';

let reportPanel: vscode.WebviewPanel | undefined;
let latestResult: WorkspaceScanResult | undefined;
const virtualDocuments = new Map<string, string>();

// ─── Core: scan all branches in a workspace ───────────────────────────────────

async function runFullScan(
  workspacePath: string,
  progress: vscode.Progress<{ message?: string; increment?: number }>,
  token: vscode.CancellationToken
): Promise<WorkspaceScanResult> {
  const start = Date.now();

  if (!isGitRepo(workspacePath)) {
    throw new Error('Not a git repository.');
  }

  const currentBranch = getCurrentBranch(workspacePath);
  const branches = getAllLocalBranches(workspacePath);
  const remoteBranches = getAllRemoteBranches(workspacePath);

  // Remote-tracking refs are already present in the local Git object database;
  // scanning them requires no checkout, fetch, or network access.
  // Exclude currentBranch because scanWorkingTree already scans the working tree for currentBranch.
  const refsToScan = [...new Set([...branches, ...remoteBranches])].filter(b => b !== currentBranch);

  if (branches.length === 0 && remoteBranches.length === 0) {
    throw new Error('No local or remote-tracking branches found.');
  }

  // Detect project type from current branch (or first available)
  const detectFrom = branches.includes(currentBranch) ? currentBranch : branches[0];
  const projectType = detectProjectType(workspacePath, detectFrom);

  const results: WorkspaceScanResult['branches'] = [];
  progress.report({ message: 'Scanning current working tree (including ignored/untracked security files)' });
  results.push(scanWorkingTree(workspacePath, currentBranch, projectType));
  const step = refsToScan.length > 0 ? 100 / refsToScan.length : 100;

  for (let i = 0; i < refsToScan.length; i++) {
    if (token.isCancellationRequested) break;

    const branch = refsToScan[i];
    progress.report({
      message: `Scanning ref ${i + 1}/${refsToScan.length}: ${branch}`,
      increment: step,
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

    // Show a clear notice — different message for tasks.json (highest risk file)
    const isTasksFile = file.toLowerCase().includes('tasks.json');
    if (isTasksFile) {
      vscode.window.showWarningMessage(
        `🛡️ Guardian: Viewing "${file}" from branch "${branch}" (read-only). ` +
        `This file contains auto-run tasks but is safe to view — it is NOT loaded as a workspace config.`
      );
    } else {
      vscode.window.showInformationMessage(
        `🛡️ Guardian: Viewing "${file}" from branch "${branch}" (read-only). Your current branch is unchanged.`
      );
    }

  } catch (e: any) {
    vscode.window.showErrorMessage(
      `Guardian: Could not read "${file}" from branch "${branch}" — ${e.message}`
    );
  }
}

// ─── Show / refresh the report panel ─────────────────────────────────────────

function showReport(
  result: WorkspaceScanResult,
  context: vscode.ExtensionContext,
  initialTab: 'glassworm' | 'extension-audit' = 'glassworm'
) {
  const activeInfectedCount = result.branches.filter(b => getActiveThreats(b.threats).length > 0).length;
  const extMaliciousCount = result.extensionAudit?.maliciousCount ?? 0;

  let title = '🛡️ Guardian — All branches clean';
  if (activeInfectedCount > 0 && extMaliciousCount > 0) {
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
        vscode.commands.executeCommand('guardian.scanAllBranches');
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
        vscode.window.showInformationMessage(`🛡️ Guardian: "${rule}" marked as safe for ${scopeDesc}.`);
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
        vscode.window.showInformationMessage(`🛡️ Guardian: "${rule}" marked as active/unsafe.`);
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

        if (report.maliciousCount > 0) {
          vscode.window.showErrorMessage(
            `🚨 Guardian: ${report.maliciousCount} malicious extension${report.maliciousCount !== 1 ? 's' : ''} detected! Review and remove them in the Guardian report.`,
            'View Report'
          ).then(choice => {
            if (choice === 'View Report' && latestResult) {
              showReport(latestResult, context, 'extension-audit');
            }
          });
        } else {
          vscode.window.showInformationMessage(`🛡️ Guardian: All ${report.totalAudited} installed extensions are clean (${report.userCount} user-installed, ${report.builtinCount} built-in).`);
        }
        return;
      }

      if (msg.action === 'uninstallExtension') {
        const { id, path } = msg;
        const result = await uninstallExtension(id, path);
        reportPanel?.webview.postMessage({
          action: 'extensionUninstalled',
          id,
          success: result.success,
          message: result.message,
        });
        if (result.success) {
          vscode.window.showInformationMessage(
            `🛡️ Guardian: Extension "${id}" uninstalled. Reload window to complete removal.`,
            'Reload Window'
          ).then(choice => {
            if (choice === 'Reload Window') {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
          });
        } else {
          vscode.window.showErrorMessage(result.message);
        }
        return;
      }

      if (msg.action === 'uninstallAllMalicious') {
        const { extensions } = msg;
        const results = await uninstallAllMaliciousExtensions(extensions || []);
        reportPanel?.webview.postMessage({
          action: 'allMaliciousUninstalled',
          results,
        });
        if (results.successful.length > 0) {
          vscode.window.showInformationMessage(
            `🛡️ Guardian: Removed ${results.successful.length} malicious extension(s). Reload window to apply changes.`,
            'Reload Window'
          ).then(choice => {
            if (choice === 'Reload Window') {
              vscode.commands.executeCommand('workbench.action.reloadWindow');
            }
          });
        }
        if (results.failed.length > 0) {
          vscode.window.showErrorMessage(
            `Guardian: Failed to automatically remove: ${results.failed.join(', ')}. Try running 'code --uninstall-extension <id>' in terminal.`
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

  // Helper: run scan with progress UI
  async function triggerScan(workspacePath: string) {
    updateStatusBar(undefined, true);
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: '🛡️ Guardian: Scanning for Glassworm & threats...',
        cancellable: true,
      },
      async (progress, token) => {
        try {
          const rawResult = await runFullScan(workspacePath, progress, token);

          if (token.isCancellationRequested) {
            updateStatusBar(latestResult, false);
            vscode.window.showInformationMessage('Guardian: Scan cancelled.');
            return;
          }

          const safeRules = getAllSafeRules(context.workspaceState, context.globalState);
          const result = applySafePreferences(rawResult, safeRules);

          latestResult = result;
          updateStatusBar(result, false);
          showReport(result, context);

          // Status bar notification if infected
          const activeInfectedBranches = result.branches.filter(b => getActiveThreats(b.threats).length > 0);
          if (activeInfectedBranches.length > 0) {
            const names = activeInfectedBranches.map(b => b.branch).join(', ');
            vscode.window.showWarningMessage(
              `🛡️ Guardian: ${activeInfectedBranches.length} infected branch${activeInfectedBranches.length !== 1 ? 'es' : ''} found: ${names}`,
              'View Report'
            ).then(choice => {
              if (choice === 'View Report') showReport(result, context);
            });
          }

        } catch (e: any) {
          updateStatusBar(latestResult, false);
          // Not a git repo — scan silently skipped (no error popup)
          if (e.message?.includes('Not a git repository')) return;
          vscode.window.showErrorMessage(`Guardian scan failed: ${e.message}`);
        }
      }
    );
  }

  // ── Auto-scan when a workspace folder is opened ───────────────────────────

  // Trigger on already-open folders (VS Code launched with a folder)
  if (vscode.workspace.workspaceFolders?.length) {
    // Small delay so VS Code UI finishes loading before we pop up progress
    setTimeout(() => {
      for (const folder of vscode.workspace.workspaceFolders!) {
        triggerScan(folder.uri.fsPath);
      }
    }, 1500);
  }

  // Trigger when a new folder is added to the workspace mid-session
  context.subscriptions.push(
    vscode.workspace.onDidChangeWorkspaceFolders(event => {
      for (const folder of event.added) {
        triggerScan(folder.uri.fsPath);
      }
    })
  );

  // ── Commands ─────────────────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('guardian.openReport', async () => {
      if (latestResult) {
        showReport(latestResult, context);
      } else {
        vscode.commands.executeCommand('guardian.scanAllBranches');
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
      for (const folder of folders) {
        await triggerScan(folder.uri.fsPath);
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('guardian.auditExtensions', async () => {
      if (!latestResult) {
        const folders = vscode.workspace.workspaceFolders;
        if (folders?.length) {
          await triggerScan(folders[0].uri.fsPath);
          if (latestResult) {
            showReport(latestResult, context, 'extension-audit');
          }
        } else {
          const emptyResult: WorkspaceScanResult = {
            workspacePath: 'Extension Supply-Chain Audit',
            projectType: 'generic',
            branches: [],
            scanDurationMs: 0,
          };
          latestResult = emptyResult;
          showReport(emptyResult, context, 'extension-audit');
        }
      } else {
        showReport(latestResult, context, 'extension-audit');
      }

      // Automatically trigger the audit progress
      const report = await auditInstalledExtensions((progress) => {
        reportPanel?.webview.postMessage({ action: 'extensionAuditProgress', progress });
      });
      if (latestResult) {
        latestResult.extensionAudit = report;
      }
      reportPanel?.webview.postMessage({ action: 'extensionAuditComplete', report });

      if (report.maliciousCount > 0) {
        vscode.window.showErrorMessage(
          `🚨 Guardian: ${report.maliciousCount} malicious extension${report.maliciousCount !== 1 ? 's' : ''} detected! Review and remove them in the Guardian report.`,
          'View Report'
        ).then(choice => {
          if (choice === 'View Report' && latestResult) {
            showReport(latestResult, context, 'extension-audit');
          }
        });
      } else {
        vscode.window.showInformationMessage(`🛡️ Guardian: All ${report.totalAudited} installed extensions are clean (${report.userCount} user-installed, ${report.builtinCount} built-in).`);
      }
    })
  );
}

export function deactivate() {
  reportPanel?.dispose();
  statusBarItem?.dispose();
}

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
} from './scanner';
import { buildReportHtml } from './report';

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
  context: vscode.ExtensionContext
) {
  const infectedCount = result.branches.filter(b => b.threats.length > 0).length;
  const title = infectedCount > 0
    ? `🛡️ Guardian — ${infectedCount} branch${infectedCount !== 1 ? 'es' : ''} infected`
    : '🛡️ Guardian — All branches clean';

  if (reportPanel) {
    latestResult = result;
    reportPanel.title = title;
    reportPanel.webview.html = buildReportHtml(result);
    reportPanel.reveal(vscode.ViewColumn.One);
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
  reportPanel.webview.html = buildReportHtml(result);

  // Register listener ONCE — reads latestResult so it's always fresh
  reportPanel.webview.onDidReceiveMessage(
    async (msg) => {
      if (msg.action === 'rescan') {
        vscode.commands.executeCommand('guardian.scanAllBranches');
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
      }
    },
    undefined,
    context.subscriptions
  );
}

// ─── Activate ─────────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider('guardian-branch', {
      provideTextDocumentContent: uri => virtualDocuments.get(uri.toString()) ?? '',
    })
  );

  // Helper: run scan with progress UI
  async function triggerScan(workspacePath: string) {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: '🛡️ Guardian: Scanning branches...',
        cancellable: true,
      },
      async (progress, token) => {
        try {
          const result = await runFullScan(workspacePath, progress, token);

          if (token.isCancellationRequested) {
            vscode.window.showInformationMessage('Guardian: Scan cancelled.');
            return;
          }

          latestResult = result;
          showReport(result, context);

          // Status bar summary
          const infectedBranches = result.branches.filter(b => b.threats.length > 0);
          if (infectedBranches.length > 0) {
            const names = infectedBranches.map(b => b.branch).join(', ');
            vscode.window.showWarningMessage(
              `🛡️ Guardian: ${infectedBranches.length} infected branch${infectedBranches.length !== 1 ? 'es' : ''} found: ${names}`,
              'View Report'
            ).then(choice => {
              if (choice === 'View Report') showReport(result, context);
            });
          }

        } catch (e: any) {
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

  // ── Manual scan command ───────────────────────────────────────────────────
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
}

export function deactivate() {
  reportPanel?.dispose();
}

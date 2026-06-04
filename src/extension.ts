import * as vscode from 'vscode';
import {
  isGitRepo,
  getAllLocalBranches,
  getCurrentBranch,
  detectProjectType,
  scanBranch,
  WorkspaceScanResult,
} from './scanner';
import { buildReportHtml } from './report';

let reportPanel: vscode.WebviewPanel | undefined;

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

  if (branches.length === 0) {
    throw new Error('No local branches found.');
  }

  // Detect project type from current branch (or first available)
  const detectFrom = branches.includes(currentBranch) ? currentBranch : branches[0];
  const projectType = detectProjectType(workspacePath, detectFrom);

  const results: WorkspaceScanResult['branches'] = [];
  const step = 100 / branches.length;

  for (let i = 0; i < branches.length; i++) {
    if (token.isCancellationRequested) break;

    const branch = branches[i];
    progress.report({
      message: `Scanning branch ${i + 1}/${branches.length}: ${branch}`,
      increment: step,
    });

    const result = scanBranch(workspacePath, branch, currentBranch, projectType);
    results.push(result);
  }

  return {
    workspacePath,
    projectType,
    branches: results,
    scanDurationMs: Date.now() - start,
  };
}

// ─── Show / refresh the report panel ─────────────────────────────────────────

function showReport(
  result: WorkspaceScanResult,
  context: vscode.ExtensionContext
) {
  const infectedCount = result.branches.filter(b => b.threats.length > 0).length;

  if (reportPanel) {
    reportPanel.reveal(vscode.ViewColumn.One);
  } else {
    reportPanel = vscode.window.createWebviewPanel(
      'guardianReport',
      infectedCount > 0
        ? `🛡️ Guardian — ${infectedCount} branch${infectedCount !== 1 ? 'es' : ''} infected`
        : '🛡️ Guardian — All branches clean',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );
    reportPanel.onDidDispose(() => { reportPanel = undefined; });
  }

  reportPanel.webview.html = buildReportHtml(result);

  reportPanel.webview.onDidReceiveMessage(
    async (msg) => {
      if (msg.action === 'rescan') {
        vscode.commands.executeCommand('guardian.scanAllBranches');
      }

      if (msg.action === 'openFile') {
        const { file, line, branch } = msg as { file: string; line: number; branch: string };

        // If the threat is on the current branch, open directly from disk.
        // Otherwise write a temp read-only buffer from `git show`.
        const workspaceRoot = result.workspacePath;
        const absPath = vscode.Uri.file(
          require('path').join(workspaceRoot, file)
        );

        try {
          const doc = await vscode.workspace.openTextDocument(absPath);
          const editor = await vscode.window.showTextDocument(doc, { preview: false });
          // Jump to threat line (0-based in VS Code API)
          const targetLine = Math.max(0, (line ?? 1) - 1);
          const range = new vscode.Range(targetLine, 0, targetLine, 999);
          editor.selection = new vscode.Selection(range.start, range.end);
          editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
        } catch {
          // File not on disk (different branch) — show the content in a virtual doc
          try {
            const { execSync } = require('child_process');
            const gitPath = file.replace(/\\/g, '/');
            const raw = execSync(`git show "${branch}":"${gitPath}"`, {
              cwd: workspaceRoot, stdio: 'pipe', maxBuffer: 5 * 1024 * 1024,
            }).toString('utf8');

            // Register a one-time content provider for this virtual file
            const scheme = 'guardian-branch';
            const uri = vscode.Uri.parse(`${scheme}:/${branch}/${file}`);

            // Use a disposable provider registered just for this uri
            const provider = new class implements vscode.TextDocumentContentProvider {
              provideTextDocumentContent() { return raw; }
            }();
            const disposable = vscode.workspace.registerTextDocumentContentProvider(scheme, provider);
            context.subscriptions.push(disposable);

            const doc = await vscode.workspace.openTextDocument(uri);
            const editor = await vscode.window.showTextDocument(doc, { preview: false });
            const targetLine = Math.max(0, (line ?? 1) - 1);
            const range = new vscode.Range(targetLine, 0, targetLine, 999);
            editor.selection = new vscode.Selection(range.start, range.end);
            editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
          } catch (e: any) {
            vscode.window.showErrorMessage(`Guardian: Could not open file — ${e.message}`);
          }
        }
      }
    },
    undefined,
    context.subscriptions
  );
}

// ─── Activate ─────────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext) {

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
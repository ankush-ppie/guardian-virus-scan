"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = require("vscode");
const scanner_1 = require("./scanner");
const report_1 = require("./report");
const path = require("path");
const child_process_1 = require("child_process");

let reportPanel;
let latestResult;

// ─── Core: scan all branches ──────────────────────────────────────────────────
async function runFullScan(workspacePath, progress, token) {
    const start = Date.now();
    if (!(0, scanner_1.isGitRepo)(workspacePath)) throw new Error('Not a git repository.');
    const currentBranch = (0, scanner_1.getCurrentBranch)(workspacePath);
    const branches = (0, scanner_1.getAllLocalBranches)(workspacePath);
    if (branches.length === 0) throw new Error('No local branches found.');
    const detectFrom = branches.includes(currentBranch) ? currentBranch : branches[0];
    const projectType = (0, scanner_1.detectProjectType)(workspacePath, detectFrom);
    const results = [];
    const step = 100 / branches.length;
    for (let i = 0; i < branches.length; i++) {
        if (token.isCancellationRequested) break;
        const branch = branches[i];
        progress.report({ message: `Scanning branch ${i + 1}/${branches.length}: ${branch}`, increment: step });
        results.push((0, scanner_1.scanBranch)(workspacePath, branch, currentBranch, projectType));
    }
    return { workspacePath, projectType, branches: results, scanDurationMs: Date.now() - start };
}

// ─── Open a threat file ───────────────────────────────────────────────────────
// ALWAYS reads from the infected branch via `git show branch:file`.
// Never switches branches. Never opens the disk file (which may be the clean
// version on the current branch). The file opens as a read-only virtual doc
// labelled [branch] filename so the user knows exactly what they are viewing.
async function openThreatFile(context, workspaceRoot, file, line, branch) {
    const targetLine = Math.max(0, (line || 1) - 1);

    try {
        const gitPath = file.replace(/\\/g, '/');

        // Read the infected file content from the infected branch — never from disk
        const raw = (0, child_process_1.execSync)(`git show "${branch}":"${gitPath}"`, {
            cwd: workspaceRoot, stdio: 'pipe', maxBuffer: 5 * 1024 * 1024,
        }).toString('utf8');

        // Virtual URI: guardian-branch:/main/.vscode/settings.json
        // Each branch+file combo gets its own URI so multiple files can be open
        const scheme = 'guardian-branch';
        const uri = vscode.Uri.parse(
            `${scheme}:/${encodeURIComponent(branch)}/${file.replace(/\\/g, '/')}`
        );

        // Register (or re-register) the content provider for this URI
        const disposable = vscode.workspace.registerTextDocumentContentProvider(scheme, {
            provideTextDocumentContent: () => raw,
        });
        context.subscriptions.push(disposable);

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

    } catch (e) {
        vscode.window.showErrorMessage(
            `Guardian: Could not read "${file}" from branch "${branch}" — ${e.message}`
        );
    }
}

// ─── Show / refresh the report panel ─────────────────────────────────────────
function showReport(result, context) {
    const infectedCount = result.branches.filter(b => b.threats.length > 0).length;
    const title = infectedCount > 0
        ? `🛡️ Guardian — ${infectedCount} branch${infectedCount !== 1 ? 'es' : ''} infected`
        : '🛡️ Guardian — All branches clean';

    if (reportPanel) {
        // Panel exists — update content only, listener stays registered from creation
        latestResult = result;
        reportPanel.title = title;
        reportPanel.webview.html = (0, report_1.buildReportHtml)(result);
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
    reportPanel.webview.html = (0, report_1.buildReportHtml)(result);

    // Register listener ONCE — reads latestResult so it's always fresh
    reportPanel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.action === 'rescan') {
            vscode.commands.executeCommand('guardian.scanAllBranches');
            return;
        }
        if (msg.action === 'openFile') {
            await openThreatFile(
                context,
                latestResult.workspacePath,
                msg.file,
                msg.line,
                msg.branch
            );
        }
    }, undefined, context.subscriptions);
}

// ─── Activate ─────────────────────────────────────────────────────────────────
function activate(context) {
    async function triggerScan(workspacePath) {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '🛡️ Guardian: Scanning branches...',
            cancellable: true,
        }, async (progress, token) => {
            try {
                const result = await runFullScan(workspacePath, progress, token);
                if (token.isCancellationRequested) {
                    vscode.window.showInformationMessage('Guardian: Scan cancelled.');
                    return;
                }
                latestResult = result;
                showReport(result, context);
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
            } catch (e) {
                if (e.message && e.message.includes('Not a git repository')) return;
                vscode.window.showErrorMessage(`Guardian scan failed: ${e.message}`);
            }
        });
    }

    if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length) {
        setTimeout(() => {
            for (const folder of vscode.workspace.workspaceFolders) {
                triggerScan(folder.uri.fsPath);
            }
        }, 1500);
    }

    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(event => {
            for (const folder of event.added) triggerScan(folder.uri.fsPath);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('guardian.scanAllBranches', async () => {
            const folders = vscode.workspace.workspaceFolders;
            if (!folders || !folders.length) {
                vscode.window.showInformationMessage('Guardian: No workspace folder open.');
                return;
            }
            for (const folder of folders) await triggerScan(folder.uri.fsPath);
        })
    );
}

function deactivate() {
    if (reportPanel) reportPanel.dispose();
}
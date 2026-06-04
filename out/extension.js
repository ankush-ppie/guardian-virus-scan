"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const scanner_1 = require("./scanner");
const report_1 = require("./report");
let reportPanel;
// ─── Core: scan all branches in a workspace ───────────────────────────────────
async function runFullScan(workspacePath, progress, token) {
    const start = Date.now();
    if (!(0, scanner_1.isGitRepo)(workspacePath)) {
        throw new Error('Not a git repository.');
    }
    const currentBranch = (0, scanner_1.getCurrentBranch)(workspacePath);
    const branches = (0, scanner_1.getAllLocalBranches)(workspacePath);
    if (branches.length === 0) {
        throw new Error('No local branches found.');
    }
    // Detect project type from current branch (or first available)
    const detectFrom = branches.includes(currentBranch) ? currentBranch : branches[0];
    const projectType = (0, scanner_1.detectProjectType)(workspacePath, detectFrom);
    const results = [];
    const step = 100 / branches.length;
    for (let i = 0; i < branches.length; i++) {
        if (token.isCancellationRequested)
            break;
        const branch = branches[i];
        progress.report({
            message: `Scanning branch ${i + 1}/${branches.length}: ${branch}`,
            increment: step,
        });
        const result = (0, scanner_1.scanBranch)(workspacePath, branch, currentBranch, projectType);
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
function showReport(result, context) {
    const infectedCount = result.branches.filter(b => b.threats.length > 0).length;
    if (reportPanel) {
        reportPanel.reveal(vscode.ViewColumn.One);
    }
    else {
        reportPanel = vscode.window.createWebviewPanel('guardianReport', infectedCount > 0
            ? `🛡️ Guardian — ${infectedCount} branch${infectedCount !== 1 ? 'es' : ''} infected`
            : '🛡️ Guardian — All branches clean', vscode.ViewColumn.One, { enableScripts: true, retainContextWhenHidden: true });
        reportPanel.onDidDispose(() => { reportPanel = undefined; });
    }
    reportPanel.webview.html = (0, report_1.buildReportHtml)(result);
    reportPanel.webview.onDidReceiveMessage(async (msg) => {
        if (msg.action === 'rescan') {
            vscode.commands.executeCommand('guardian.scanAllBranches');
        }
        if (msg.action === 'openFile') {
            const { file, line, branch } = msg;
            // If the threat is on the current branch, open directly from disk.
            // Otherwise write a temp read-only buffer from `git show`.
            const workspaceRoot = result.workspacePath;
            const absPath = vscode.Uri.file(require('path').join(workspaceRoot, file));
            try {
                const doc = await vscode.workspace.openTextDocument(absPath);
                const editor = await vscode.window.showTextDocument(doc, { preview: false });
                // Jump to threat line (0-based in VS Code API)
                const targetLine = Math.max(0, (line ?? 1) - 1);
                const range = new vscode.Range(targetLine, 0, targetLine, 999);
                editor.selection = new vscode.Selection(range.start, range.end);
                editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
            }
            catch {
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
                    const provider = new class {
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
                }
                catch (e) {
                    vscode.window.showErrorMessage(`Guardian: Could not open file — ${e.message}`);
                }
            }
        }
    }, undefined, context.subscriptions);
}
// ─── Activate ─────────────────────────────────────────────────────────────────
function activate(context) {
    // Helper: run scan with progress UI
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
                showReport(result, context);
                // Status bar summary
                const infectedBranches = result.branches.filter(b => b.threats.length > 0);
                if (infectedBranches.length > 0) {
                    const names = infectedBranches.map(b => b.branch).join(', ');
                    vscode.window.showWarningMessage(`🛡️ Guardian: ${infectedBranches.length} infected branch${infectedBranches.length !== 1 ? 'es' : ''} found: ${names}`, 'View Report').then(choice => {
                        if (choice === 'View Report')
                            showReport(result, context);
                    });
                }
            }
            catch (e) {
                // Not a git repo — scan silently skipped (no error popup)
                if (e.message?.includes('Not a git repository'))
                    return;
                vscode.window.showErrorMessage(`Guardian scan failed: ${e.message}`);
            }
        });
    }
    // ── Auto-scan when a workspace folder is opened ───────────────────────────
    // Trigger on already-open folders (VS Code launched with a folder)
    if (vscode.workspace.workspaceFolders?.length) {
        // Small delay so VS Code UI finishes loading before we pop up progress
        setTimeout(() => {
            for (const folder of vscode.workspace.workspaceFolders) {
                triggerScan(folder.uri.fsPath);
            }
        }, 1500);
    }
    // Trigger when a new folder is added to the workspace mid-session
    context.subscriptions.push(vscode.workspace.onDidChangeWorkspaceFolders(event => {
        for (const folder of event.added) {
            triggerScan(folder.uri.fsPath);
        }
    }));
    // ── Manual scan command ───────────────────────────────────────────────────
    context.subscriptions.push(vscode.commands.registerCommand('guardian.scanAllBranches', async () => {
        const folders = vscode.workspace.workspaceFolders;
        if (!folders?.length) {
            vscode.window.showInformationMessage('Guardian: No workspace folder open.');
            return;
        }
        for (const folder of folders) {
            await triggerScan(folder.uri.fsPath);
        }
    }));
}
function deactivate() {
    reportPanel?.dispose();
}

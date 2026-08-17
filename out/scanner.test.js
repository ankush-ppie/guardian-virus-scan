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
const assert = __importStar(require("assert"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const child_process_1 = require("child_process");
const scanner_1 = require("./scanner");
const report_1 = require("./report");
function rules(threats) {
    return threats.map(t => t.rule).sort();
}
function testInjectedConfigFamilies() {
    const clean = `const config = { plugins: {} };\nexport default config;\n`;
    const v1 = clean + ' '.repeat(300) + `global['!']='9-1435-5';const x='rmcej%otb%';`;
    assert.deepStrictEqual(rules((0, scanner_1.scanInjectedConfig)(v1, 'postcss.config.mjs')), ['KNOWN_INJECTED_CONFIG_V1']);
    const v2 = clean + ' '.repeat(300) +
        `global.i="A9-1956-3";global.r=require;const http=require("http");` +
        `const {spawn}=require("child_process");`;
    assert.deepStrictEqual(rules((0, scanner_1.scanInjectedConfig)(v2, 'postcss.config.mjs')), ['KNOWN_INJECTED_CONFIG_V2']);
    const legitimate = `import { globalIgnores } from 'eslint/config';\nexport default [globalIgnores(['.next/**'])];\n`;
    assert.deepStrictEqual((0, scanner_1.scanInjectedConfig)(legitimate, 'eslint.config.mjs'), []);
}
function testPropagationScript() {
    const malicious = [
        'date %LAST_COMMIT_DATE%',
        'time %LAST_COMMIT_TIME%',
        'git commit --amend -m "%LAST_COMMIT_TEXT%" --no-verify',
        'git -c credential.helper="" push -uf origin %CURRENT_BRANCH% --no-verify',
    ].join('\r\n');
    assert.deepStrictEqual(rules((0, scanner_1.scanPropagationScript)(malicious, 'config.bat')), ['FORCE_PUSH_PROPAGATION_SCRIPT']);
    assert.deepStrictEqual((0, scanner_1.scanPropagationScript)('git push origin main', 'config.bat'), []);
}
function testWorkingTreeCoverage() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-test-'));
    try {
        fs.mkdirSync(path.join(root, '.vscode'), { recursive: true });
        fs.mkdirSync(path.join(root, 'public', 'fonts'), { recursive: true });
        fs.writeFileSync(path.join(root, 'package.json'), '{}');
        fs.writeFileSync(path.join(root, '.vscode', 'tasks.json'), `{
      // JSONC is valid in VS Code even though JSON.parse rejects it.
      "tasks": [{
        "label": "Font cache",
        "command": "node ./public/fonts/fa-solid-400.woff2",
        "presentation": { "reveal": "never", "hide": true },
        "runOptions": { "runOn": "folderOpen" },
      }]
    }`);
        fs.writeFileSync(path.join(root, 'public', 'fonts', 'fa-solid-400.woff2'), ' '.repeat(200) + `global['!']='8-1';const x='rmcej%otb%';`);
        fs.writeFileSync(path.join(root, 'postcss.config.mjs'), `export default { plugins: {} };` + ' '.repeat(200) +
            `global.i="A";global.r=require;const http=require("http");const {spawn}=require("child_process");`);
        const result = (0, scanner_1.scanWorkingTree)(root, 'main', 'node');
        const found = new Set(rules(result.threats));
        assert.ok(found.has('KNOWN_FAKE_FONT_AUTORUN_TASK'));
        assert.ok(found.has('KNOWN_FAKE_FONT_PAYLOAD'));
        assert.ok(found.has('KNOWN_INJECTED_CONFIG_V2'));
    }
    finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}
function testRemoteTrackingRefCoverage() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-git-test-'));
    const git = (...args) => (0, child_process_1.execFileSync)('git', args, {
        cwd: root,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    try {
        git('init', '-q');
        git('config', 'user.name', 'Guardian Test');
        git('config', 'user.email', 'guardian@example.invalid');
        git('config', 'commit.gpgsign', 'false');
        fs.writeFileSync(path.join(root, 'package.json'), '{}');
        fs.writeFileSync(path.join(root, 'postcss.config.mjs'), `export default { plugins: {} };` + ' '.repeat(200) +
            `global['!']='9';const marker='rmcej%otb%';`);
        git('add', '.');
        git('commit', '-qm', 'fixture');
        git('update-ref', 'refs/remotes/origin/infected', 'HEAD');
        const result = (0, scanner_1.scanBranch)(root, 'origin/infected', 'main', 'node');
        assert.ok(rules(result.threats).includes('KNOWN_INJECTED_CONFIG_V1'));
    }
    finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}
function testBranchOverviewReport() {
    const mockResult = {
        workspacePath: '/mock/project',
        projectType: 'node',
        currentBranch: 'main',
        localBranches: ['main'],
        remoteBranches: ['origin', 'origin/main'],
        branches: [
            {
                branch: 'main (working tree)',
                isCurrentBranch: true,
                threats: [],
                scannedFiles: ['package.json'],
            },
            {
                branch: 'origin',
                isCurrentBranch: false,
                threats: [],
                scannedFiles: [],
            },
            {
                branch: 'origin/main',
                isCurrentBranch: false,
                threats: [],
                scannedFiles: [],
            },
        ],
        scanDurationMs: 50,
        version: '1.1.0',
    };
    const html = (0, report_1.buildReportHtml)(mockResult);
    // 1: Default it should be collapsed (no 'open' attribute on details.branch-overview)
    assert.ok(html.includes('<details class="branch-overview">'), 'Branch overview should not have "open" attribute by default');
    assert.ok(!html.includes('<details class="branch-overview" open>'), 'Branch overview must be collapsed by default');
    // 2: Chip click should not toggle collapse/expand (preventDefault & stopPropagation on bo-chips)
    assert.ok(html.includes('<div class="bo-chips" onclick="event.preventDefault(); event.stopPropagation()">'), 'bo-chips must have onclick event.preventDefault(); event.stopPropagation()');
    // 3: Local & remote managed in 1 single chip like "1 Local • 2 Remote"
    assert.ok(html.includes('1 Local • 2 Remote'), 'Should contain "1 Local • 2 Remote" in chip');
    assert.ok(html.includes('bo-chip-counts'), 'Should use bo-chip-counts class for combined chip');
    // 4: Filter toolbar and tags
    assert.ok(html.includes('data-filter="all"'), 'Filter toolbar should contain "all" filter');
    assert.ok(html.includes('data-filter="local"'), 'Filter toolbar should contain "local" filter');
    assert.ok(html.includes('data-filter="remote"'), 'Filter toolbar should contain "remote" filter');
    assert.ok(html.includes('data-filter="infected"'), 'Filter toolbar should contain "infected" filter');
    assert.ok(html.includes('data-filter="clean"'), 'Filter toolbar should contain "clean" filter');
    // 5: Branch items have type & status attributes and scope tags
    assert.ok(html.includes('data-type="local"'), 'Local branches must have data-type="local"');
    assert.ok(html.includes('data-type="remote"'), 'Remote branches must have data-type="remote"');
    assert.ok(html.includes('branch-scope-tag tag-local'), 'Local branch must have Local scope tag');
    assert.ok(html.includes('branch-scope-tag tag-remote'), 'Remote branch must have Remote scope tag');
    assert.ok(html.includes('main (working tree)'), 'Current branch should be represented as main (working tree)');
    // 6: Header reload blue text button and tooltip
    assert.ok(html.includes('reload-link-btn'), 'Header should contain reload-link-btn');
    assert.ok(html.includes('Reload Window'), 'Header should contain Reload Window button');
    assert.ok(html.includes('title="Cmd+Shift+P → Developer: Reload Window"'), 'Header reload button should have command tooltip');
    // 7: Copy branch buttons (only in Branch Overview lists)
    assert.ok(html.includes('bo-copy-btn'), 'Branch overview items should have copy buttons');
    assert.ok(html.includes('copyBranch(event,'), 'Copy buttons should invoke copyBranch helper');
}
async function testSafeRulesPreferences() {
    const { addSafeRule, removeSafeRule, matchSafeRule, getAllSafeRules } = require('./preferences');
    const { applySafePreferences, getActiveThreats, getSafeThreats } = require('./scanner');
    // Mock StateStorage
    class MockState {
        constructor() {
            this.data = new Map();
        }
        get(key, defaultValue) {
            return (this.data.has(key) ? this.data.get(key) : defaultValue);
        }
        async update(key, value) {
            this.data.set(key, value);
        }
    }
    const workspaceState = new MockState();
    const globalState = new MockState();
    // Add project-level rule
    await addSafeRule('BUILD_YAML_CUSTOM_BUILDER', 'build.yaml', 'project', workspaceState, globalState);
    // Add global-level rule
    await addSafeRule('VSCODE_TASK_AUTORUN', undefined, 'global', workspaceState, globalState);
    const rules = getAllSafeRules(workspaceState, globalState);
    assert.strictEqual(rules.length, 2, 'Should retrieve 2 safe rules');
    // Match checks
    const match1 = matchSafeRule('BUILD_YAML_CUSTOM_BUILDER', 'build.yaml', rules);
    assert.ok(match1, 'Should match exact file and rule');
    assert.strictEqual(match1?.scope, 'project');
    const match2 = matchSafeRule('VSCODE_TASK_AUTORUN', '.vscode/tasks.json', rules);
    assert.ok(match2, 'Should match global rule across any file');
    assert.strictEqual(match2?.scope, 'global');
    const matchMismatch = matchSafeRule('BUILD_YAML_CUSTOM_BUILDER', 'other/file.dart', rules);
    assert.strictEqual(matchMismatch, undefined, 'Should not match different file for file-specific rule');
    // Test applySafePreferences on scan result
    const rawResult = {
        workspacePath: '/mock/repo',
        projectType: 'flutter',
        currentBranch: 'main',
        localBranches: ['main'],
        remoteBranches: [],
        branches: [
            {
                branch: 'main (working tree)',
                isCurrentBranch: true,
                threats: [
                    {
                        severity: 'medium',
                        file: 'build.yaml',
                        rule: 'BUILD_YAML_CUSTOM_BUILDER',
                        detail: 'build.yaml custom builder',
                    },
                    {
                        severity: 'high',
                        file: '.vscode/tasks.json',
                        rule: 'VSCODE_TASK_AUTORUN',
                        detail: 'auto run task',
                    },
                    {
                        severity: 'critical',
                        file: 'setup.sh',
                        rule: 'MALICIOUS_CURL_BASH',
                        detail: 'curl pipe bash',
                    },
                ],
                scannedFiles: ['build.yaml', '.vscode/tasks.json', 'setup.sh'],
            },
        ],
        scanDurationMs: 10,
        version: '1.1.0',
    };
    const processed = applySafePreferences(rawResult, rules);
    const threats = processed.branches[0].threats;
    assert.strictEqual(threats[0].isSafe, true, 'build.yaml threat should be marked safe');
    assert.strictEqual(threats[0].safeScope, 'project');
    assert.strictEqual(threats[1].isSafe, true, 'tasks.json threat should be marked safe');
    assert.strictEqual(threats[1].safeScope, 'global');
    assert.strictEqual(threats[2].isSafe, false, 'setup.sh threat should remain active');
    assert.strictEqual(getActiveThreats(threats).length, 1, 'Only 1 active threat remains');
    assert.strictEqual(getSafeThreats(threats).length, 2, '2 safe findings identified');
    // Test Report HTML generation with safe findings
    const html = (0, report_1.buildReportHtml)(processed);
    assert.ok(html.includes('Marked Safe (Project)'), 'Report should render project safe badge');
    assert.ok(html.includes('Marked Safe (Global)'), 'Report should render global safe badge');
    assert.ok(html.includes('Mark as Unsafe'), 'Report should render Mark as Unsafe buttons');
    assert.ok(html.includes('Whitelisted Rules (Marked as Safe)'), 'Report should display Whitelisted Rules panel');
    assert.ok(html.includes('data-filter="safe"'), 'Report toolbar should include Safe filter tag');
    assert.ok(html.includes('markSafe('), 'Report script should define markSafe');
    assert.ok(html.includes('markUnsafe('), 'Report script should define markUnsafe');
    // Remove rule check
    await removeSafeRule('BUILD_YAML_CUSTOM_BUILDER', 'build.yaml', workspaceState, globalState);
    const rulesAfterRemove = getAllSafeRules(workspaceState, globalState);
    assert.strictEqual(rulesAfterRemove.length, 1, 'Should have 1 rule left after removal');
    assert.strictEqual(rulesAfterRemove[0].rule, 'VSCODE_TASK_AUTORUN');
}
async function runAllTests() {
    testInjectedConfigFamilies();
    testPropagationScript();
    testWorkingTreeCoverage();
    testRemoteTrackingRefCoverage();
    testBranchOverviewReport();
    await testSafeRulesPreferences();
    console.log('Guardian scanner regression tests passed.');
}
runAllTests();

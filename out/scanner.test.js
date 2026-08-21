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
const credentialScanner_1 = require("./credentialScanner");
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
function testFetchRemoteRefs() {
    const remoteRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-remote-test-'));
    const localRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-local-test-'));
    const git = (cwd, ...args) => (0, child_process_1.execFileSync)('git', args, {
        cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
    });
    try {
        // 1. Setup mock remote repository with main and infected-branch
        git(remoteRoot, 'init', '-q');
        git(remoteRoot, 'config', 'user.name', 'Remote Origin');
        git(remoteRoot, 'config', 'user.email', 'origin@example.invalid');
        git(remoteRoot, 'config', 'commit.gpgsign', 'false');
        fs.writeFileSync(path.join(remoteRoot, 'package.json'), '{}');
        git(remoteRoot, 'add', '.');
        git(remoteRoot, 'commit', '-qm', 'initial');
        // Create an infected branch on the remote
        git(remoteRoot, 'checkout', '-qb', 'feature/remote-infected');
        fs.writeFileSync(path.join(remoteRoot, 'postcss.config.mjs'), `export default { plugins: {} };` + ' '.repeat(200) +
            `global['!']='9';const marker='rmcej%otb%';`);
        git(remoteRoot, 'add', '.');
        git(remoteRoot, 'commit', '-qm', 'infected commit');
        git(remoteRoot, 'checkout', '-q', 'main');
        // 2. Setup local repository with remote 'origin'
        git(localRoot, 'init', '-q');
        git(localRoot, 'config', 'user.name', 'Local User');
        git(localRoot, 'config', 'user.email', 'user@example.invalid');
        git(localRoot, 'config', 'commit.gpgsign', 'false');
        git(localRoot, 'remote', 'add', 'origin', remoteRoot);
        assert.strictEqual((0, scanner_1.hasRemotes)(localRoot), true, 'hasRemotes should be true when origin is configured');
        // Before fetch: no remote branches locally
        const remotesBefore = (0, scanner_1.getAllRemoteBranches)(localRoot);
        assert.strictEqual(remotesBefore.length, 0, 'No remote branches should exist locally before fetch');
        // Execute fetchRemoteRefs
        const fetchSuccess = (0, scanner_1.fetchRemoteRefs)(localRoot);
        assert.strictEqual(fetchSuccess, true, 'fetchRemoteRefs should return true on success');
        // After fetch: remote tracking branches exist locally without checking them out
        const remotesAfter = (0, scanner_1.getAllRemoteBranches)(localRoot);
        assert.ok(remotesAfter.includes('origin/feature/remote-infected'), 'Remote tracking branch should be fetched');
        // Scan the newly fetched remote branch
        const scanRes = (0, scanner_1.scanBranch)(localRoot, 'origin/feature/remote-infected', 'main', 'node');
        assert.ok(rules(scanRes.threats).includes('KNOWN_INJECTED_CONFIG_V1'), 'Scanner must detect threat in fetched remote branch');
    }
    finally {
        fs.rmSync(remoteRoot, { recursive: true, force: true });
        fs.rmSync(localRoot, { recursive: true, force: true });
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
        version: '1.2.0',
    };
    const html = (0, report_1.buildReportHtml)(mockResult);
    // 1: Default it should be collapsed (no 'open' attribute on details.branch-overview)
    assert.ok(html.includes('<details class="branch-overview">'), 'Branch overview should not have "open" attribute by default');
    assert.ok(!html.includes('<details class="branch-overview" open>'), 'Branch overview must be collapsed by default');
    // 2: Chip click should not toggle collapse/expand (preventDefault & stopPropagation on bo-chips)
    assert.ok(html.includes('<div class="bo-chips" onclick="event.preventDefault(); event.stopPropagation()">'), 'bo-chips must have onclick event.preventDefault(); event.stopPropagation()');
    // 3: Local & remote managed in 1 single chip like "1 Local · 2 Remote"
    assert.ok(html.includes('1 Local · 2 Remote'), 'Should contain "1 Local · 2 Remote" in chip');
    assert.ok(html.includes('bo-chip-counts'), 'Should use bo-chip-counts class for combined chip');
    // 4: Filter toolbar and tags
    assert.ok(html.includes('data-value="all"'), 'Filter toolbar should contain "all" filter');
    assert.ok(html.includes('data-value="local"'), 'Filter toolbar should contain "local" filter');
    assert.ok(html.includes('data-value="remote"'), 'Filter toolbar should contain "remote" filter');
    assert.ok(html.includes('data-value="infected"'), 'Filter toolbar should contain "infected" filter');
    assert.ok(html.includes('data-value="clean"'), 'Filter toolbar should contain "clean" filter');
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
        version: '1.2.0',
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
    assert.ok(html.includes('data-value="safe"'), 'Report toolbar should include Safe filter tag');
    assert.ok(html.includes('markSafe('), 'Report script should define markSafe');
    assert.ok(html.includes('markUnsafe('), 'Report script should define markUnsafe');
    // Remove rule check
    await removeSafeRule('BUILD_YAML_CUSTOM_BUILDER', 'build.yaml', workspaceState, globalState);
    const rulesAfterRemove = getAllSafeRules(workspaceState, globalState);
    assert.strictEqual(rulesAfterRemove.length, 1, 'Should have 1 rule left after removal');
    assert.strictEqual(rulesAfterRemove[0].rule, 'VSCODE_TASK_AUTORUN');
}
function testExtensionAuditor() {
    const { scanFileContent, scanExtensionDirectory } = require('./extensionAuditor');
    const { COMPROMISED_EXTENSIONS, WAVE_MARKER } = require('./auditData');
    // 1. Blocklist lookup
    assert.ok(COMPROMISED_EXTENSIONS['96-studio.json-formatter'], 'Should include wave-5 extension');
    assert.strictEqual(COMPROMISED_EXTENSIONS['96-studio.json-formatter'].campaign, 'wave-5');
    assert.strictEqual(COMPROMISED_EXTENSIONS['96-studio.json-formatter'].source, 'Socket.dev');
    const blocklistThreats = scanExtensionDirectory('/nonexistent/path', '96-studio.json-formatter');
    assert.strictEqual(blocklistThreats.length, 1);
    assert.strictEqual(blocklistThreats[0].type, 'blocklist');
    assert.strictEqual(blocklistThreats[0].rule, 'KNOWN_MALICIOUS_EXTENSION_ID');
    // Clean extension lookup
    const cleanThreats = scanExtensionDirectory('/nonexistent/path', 'some.clean-extension');
    assert.strictEqual(cleanThreats.length, 0);
    // 2. Wave marker detection
    const codeWithWave = `// Normal JS\nconsole.log("hello");\nconst marker = "${WAVE_MARKER}";\n`;
    const waveThreats = scanFileContent('extension.js', codeWithWave);
    assert.strictEqual(waveThreats.length, 1);
    assert.strictEqual(waveThreats[0].rule, 'GLASSWORM_WAVE_MARKER');
    // 3. Invisible Unicode variation selector run
    const invisibleChars = '\uFE00\uFE01\uFE02\uFE03\uFE04\uFE05\uFE06\uFE07'; // 8 variation selectors
    const codeWithInvisible = `const payload = "${invisibleChars}";\n`;
    const unicodeThreats = scanFileContent('dist/main.js', codeWithInvisible);
    assert.strictEqual(unicodeThreats.length, 1);
    assert.strictEqual(unicodeThreats[0].rule, 'INVISIBLE_UNICODE_VARIATION_SELECTORS');
    // 4. Invisible Unicode decoder pattern
    const codeWithDecoder = `
    function decode(s) {
      let v = s.codePointAt(0);
      let offset = 0xFE00;
      return String.fromCharCode(v - offset);
    }
  `;
    const decoderThreats = scanFileContent('bundle.js', codeWithDecoder);
    assert.strictEqual(decoderThreats.length, 1);
    assert.strictEqual(decoderThreats[0].rule, 'INVISIBLE_UNICODE_DECODER');
    // 5. Legitimate library exclusion
    const legitCodeWithDecoder = `
    // Inside pdf.worker.js
    function handleFont(s) {
      let v = s.codePointAt(0);
      let offset = 0xFE00;
      return v;
    }
  `;
    const legitThreats = scanFileContent('node_modules/pdfjs-dist/build/pdf.worker.js', legitCodeWithDecoder);
    assert.strictEqual(legitThreats.length, 0, 'Legitimate pdf.worker.js should be excluded from false positives');
    // 6. Test Report HTML with Extension Audit
    const scanResultWithAudit = {
        workspacePath: '/mock/repo',
        projectType: 'node',
        branches: [
            {
                branch: 'main (working tree)',
                isCurrentBranch: true,
                threats: [],
                scannedFiles: ['package.json'],
            },
        ],
        scanDurationMs: 15,
        extensionAudit: {
            totalAudited: 3,
            userCount: 2,
            builtinCount: 1,
            maliciousCount: 1,
            cleanCount: 2,
            extensions: [
                {
                    id: '96-studio.json-formatter',
                    displayName: 'JSON Formatter Pro',
                    version: '1.0.2',
                    publisher: '96-studio',
                    extensionPath: '/mock/extensions/96-studio.json-formatter',
                    isBuiltin: false,
                    status: 'malicious',
                    threats: [
                        {
                            type: 'blocklist',
                            rule: 'KNOWN_MALICIOUS_EXTENSION_ID',
                            detail: 'Matched known malicious extension database [Campaign: wave-5 · Source: Socket.dev].',
                            campaign: 'wave-5',
                            source: 'Socket.dev',
                        },
                    ],
                },
                {
                    id: 'esbenp.prettier-vscode',
                    displayName: 'Prettier - Code formatter',
                    version: '10.1.0',
                    publisher: 'esbenp',
                    extensionPath: '/mock/extensions/esbenp.prettier-vscode',
                    isBuiltin: false,
                    status: 'clean',
                    threats: [],
                    categories: ['Formatters'],
                    license: 'MIT',
                    marketplaceUrl: 'https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode',
                    repositoryUrl: 'https://github.com/prettier/prettier-vscode',
                    iconDataUri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                },
                {
                    id: 'vscode.git',
                    displayName: 'Git',
                    version: '1.0.0',
                    publisher: 'vscode',
                    extensionPath: '/Applications/Visual Studio Code.app/Contents/Resources/app/extensions/git',
                    isBuiltin: true,
                    status: 'clean',
                    threats: [],
                },
                {
                    id: 'ankushlokhande.guardian-virus-scan',
                    displayName: 'Guardian — Glassworm & Malware Scanner',
                    version: '1.4.0',
                    publisher: 'ankushlokhande',
                    extensionPath: '/mock/extensions/ankushlokhande.guardian-virus-scan-1.4.0',
                    isBuiltin: false,
                    status: 'clean',
                    threats: [],
                },
            ],
            scanDurationMs: 120,
            timestamp: Date.now(),
        },
    };
    const html = (0, report_1.buildReportHtml)(scanResultWithAudit);
    assert.ok(html.includes('Supply-Chain Security &amp; Extension Scan') || html.includes('Supply-Chain Security & Extension Scan'), 'Should render Scan section title');
    assert.ok(html.includes('1 Malicious Extension Detected!'), 'Should render malicious extension banner');
    assert.ok(html.includes('Remove All (1)'), 'Should render Remove All button');
    assert.ok(html.includes('Uninstall Extension'), 'Should render individual Uninstall Extension button');
    assert.ok(html.includes('JSON Formatter Pro'), 'Should render malicious extension display name');
    assert.ok(html.includes('Prettier - Code formatter'), 'Should render clean extension display name');
    assert.ok(html.includes('Git'), 'Should render built-in extension display name');
    assert.ok(html.includes('triggerExtensionAudit('), 'Should define triggerExtensionAudit');
    assert.ok(html.includes('uninstallAllMalicious('), 'Should define uninstallAllMalicious');
    // Verify Metadata and Minimal Layout (logo, name, 1 category, description, clean badge, uninstall button)
    assert.ok(html.includes('Formatters'), 'Should render category chip');
    assert.ok(html.includes('ext-icon-img'), 'Should render extension icon image');
    assert.ok(html.includes('Prettier - Code formatter'), 'Should render extension title');
    assert.ok(html.includes('badge-clean-outline') || html.includes('✓ Clean'), 'Should render Clean badge');
    assert.ok(html.includes('btn-uninstall-esbenp_prettier_vscode'), 'Should render uninstall button for clean user extension');
    assert.ok(!html.includes('btn-uninstall-ankushlokhande_guardian_virus_scan'), 'Should NOT render uninstall button for self Guardian extension');
    assert.ok(!html.includes('class="ext-marketplace-link"'), 'Should NOT render Marketplace link');
    assert.ok(!html.includes('class="ext-github-link"'), 'Should NOT render GitHub link on extension cards');
    // Verify Empty State and Filters
    assert.ok(html.includes('id="ext-filter-empty-state"'), 'Should render extension empty state container');
    assert.ok(html.includes('clearExtSearchAndFilter('), 'Should define clearExtSearchAndFilter');
    assert.ok(html.includes('data-filter="user"'), 'Should render User Installed filter button');
    assert.ok(html.includes('data-filter="builtin"'), 'Should render Built-in filter button');
    assert.ok(html.includes('ext-stat-user'), 'Should render user installed stat count');
    assert.ok(html.includes('ext-stat-builtin'), 'Should render built-in stat count');
    assert.ok(html.includes('data-category="user"'), 'Should include data-category="user" on user card');
    assert.ok(html.includes('data-category="builtin"'), 'Should include data-category="builtin" on builtin card');
    // Verify Tab 1 & Tab 2 Navigation
    assert.ok(html.includes('id="tab-btn-glassworm"'), 'Should render Tab 1 button');
    assert.ok(html.includes('id="tab-btn-extension-audit"'), 'Should render Tab 2 button');
    assert.ok(html.includes('Repo Scan'), 'Should render Tab 1 title');
    assert.ok(html.includes('Extension Scan'), 'Should render Tab 2 title');
    assert.ok(html.includes('Guardian — Glassworm &amp; Malware Scanner'), 'Should render full extension name in header');
    assert.ok(html.includes('id="tab-glassworm"'), 'Should render Tab 1 pane');
    assert.ok(html.includes('id="tab-extension-audit"'), 'Should render Tab 2 pane');
    assert.ok(html.includes('switchTab('), 'Should include switchTab function in script');
    assert.ok(html.includes('ext-stat-total'), 'Should include extension stats bar');
    // Test opening directly with initialTab = 'extension-audit'
    const extTabHtml = (0, report_1.buildReportHtml)(scanResultWithAudit, 'extension-audit');
    assert.ok(extTabHtml.includes('class="nav-tab-btn active" id="tab-btn-extension-audit"'), 'Tab 2 button should be active when requested');
    assert.ok(extTabHtml.includes('id="tab-extension-audit" class="tab-pane active"'), 'Tab 2 pane should be active when requested');
    assert.ok(!extTabHtml.includes('id="tab-glassworm" class="tab-pane active"'), 'Tab 1 pane should not be active when Tab 2 is requested');
}
async function testCredentialScanner() {
    // 1. Test Redaction and Fingerprinting
    const token = 'ghp_1234567890abcdef1234567890abcdef1234';
    const redacted = (0, credentialScanner_1.redactCredential)(token);
    assert.strictEqual(redacted, 'ghp_12…1234');
    const fp = (0, credentialScanner_1.fingerprintCredential)(token);
    assert.ok(fp.startsWith('sha256:'), 'Fingerprint should start with sha256:');
    assert.strictEqual(fp.length, 19, 'Fingerprint should be 19 chars (sha256: + 12 hex)');
    const urlToken = 'https://user:secret12345@github.com/org/repo.git';
    assert.strictEqual((0, credentialScanner_1.redactCredential)(urlToken), 'https://[REDACTED]@github.com/org/repo.git');
    // 2. Test Shannon Entropy & Ignore List
    assert.strictEqual((0, credentialScanner_1.isIgnoredValue)('AKIAIOSFODNN7EXAMPLE'), true, 'AKIAIOSFODNN7EXAMPLE should be ignored');
    assert.strictEqual((0, credentialScanner_1.isIgnoredValue)('YOUR_API_KEY_HERE'), true, 'YOUR_API_KEY_HERE should be ignored');
    assert.strictEqual((0, credentialScanner_1.isLowEntropy)('AKIAAAAAAAAAAAAAAAAA'), true, 'Repeated chars should be low entropy');
    assert.strictEqual((0, credentialScanner_1.isLowEntropy)('AKIA1B2C3D4E5F6G7H8I'), false, 'Random keys should pass entropy check');
    // 3. Test Pattern Matching via findCredentialsInText
    const sampleText = [
        'GITHUB_PAT=ghp_1234567890abcdef1234567890abcdef1234',
        'GITHUB_FINE=github_pat_11AAAAAAA0123456789abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGH',
        'NPM_TOKEN=npm_1234567890abcdef1234567890abcdef1234',
        'AWS_KEY=AKIA1234567890ABCDEF',
        'SLACK_BOT=xoxb-12345678901-1234567890123-abcdefghijklmnopqrstuvwx',
        'STRIPE_KEY=sk_live_51Abcdefghijklmnopqrstuvwxyz01234567',
        'ANTHROPIC_KEY=sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz',
        'OPENAI_PROJ=sk-proj-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefgh',
        'GOOGLE_KEY=AIzaSyD1234567890abcdefghijklmnopqrstuv',
    ].join('\n');
    const findings = (0, credentialScanner_1.findCredentialsInText)(sampleText, 'config.ts', 'tracked');
    const matchedRules = findings.map(f => f.id);
    assert.ok(matchedRules.includes('github-pat-classic'), 'Should match github-pat-classic');
    assert.ok(matchedRules.includes('github-pat-fine'), 'Should match github-pat-fine');
    assert.ok(matchedRules.includes('npm-token'), 'Should match npm-token');
    assert.ok(matchedRules.includes('aws-access-key'), 'Should match aws-access-key');
    assert.ok(matchedRules.includes('slack-token'), 'Should match slack-token');
    assert.ok(matchedRules.includes('stripe-live'), 'Should match stripe-live');
    assert.ok(matchedRules.includes('anthropic-key'), 'Should match anthropic-key');
    assert.ok(matchedRules.includes('openai-key'), 'Should match openai-key');
    assert.ok(matchedRules.includes('google-api-key'), 'Should match google-api-key');
    // Verify that findings NEVER contain the raw plaintext secret in redactedValue
    for (const f of findings) {
        assert.ok(!f.redactedValue.includes('ghp_1234567890abcdef1234567890abcdef1234'), 'Plaintext secret must be redacted');
    }
    // 4. Test runCredentialScan on a real test git workspace
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-cred-test-'));
    try {
        (0, child_process_1.execFileSync)('git', ['init', '-b', 'main'], { cwd: root });
        (0, child_process_1.execFileSync)('git', ['config', 'user.name', 'Tester'], { cwd: root });
        (0, child_process_1.execFileSync)('git', ['config', 'user.email', 'tester@example.com'], { cwd: root });
        (0, child_process_1.execFileSync)('git', ['config', 'commit.gpgsign', 'false'], { cwd: root });
        // Commit 1: Tracked file with GitHub PAT
        fs.writeFileSync(path.join(root, 'api.js'), 'const token = "ghp_1234567890abcdef1234567890abcdef1234";\n');
        (0, child_process_1.execFileSync)('git', ['add', '.'], { cwd: root });
        (0, child_process_1.execFileSync)('git', ['commit', '--no-gpg-sign', '-m', 'Initial commit with secret'], { cwd: root });
        // Commit 2: Remove secret from tracked file, but it remains in git history!
        fs.writeFileSync(path.join(root, 'api.js'), 'const token = process.env.API_TOKEN;\n');
        (0, child_process_1.execFileSync)('git', ['add', '.'], { cwd: root });
        (0, child_process_1.execFileSync)('git', ['commit', '--no-gpg-sign', '-m', 'Fix secret in code'], { cwd: root });
        // Add local .env file (untracked)
        fs.writeFileSync(path.join(root, '.env'), 'ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnopqrstuvwxyz0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz\n');
        // Add remote with embedded credentials
        (0, child_process_1.execFileSync)('git', ['remote', 'add', 'origin', 'https://oauth2:ghp_1234567890abcdef1234567890abcdef1234@github.com/example/repo.git'], { cwd: root });
        let progressEvents = [];
        const report = await (0, credentialScanner_1.runCredentialScan)(root, {
            scanTracked: true,
            scanHistory: true,
            scanLocal: true,
            scanRemotes: true,
        }, (p) => {
            progressEvents.push(p);
        });
        assert.ok(report.totalFindings >= 3, 'Should find at least 3 secrets (history, local, remote)');
        assert.ok(report.historyCount >= 1, 'Should find secret in git history');
        assert.ok(report.localCount >= 1, 'Should find secret in local .env');
        assert.ok(report.remotesCount >= 1, 'Should find secret in git remote URL');
        assert.ok(progressEvents.length > 0, 'Should trigger progress callbacks');
        // 5. Test Exporters
        const tsv = (0, credentialScanner_1.exportCredentialTsv)(report);
        assert.ok(tsv.includes('location\twhere\tpath\ttype\tredacted\tfingerprint\tdescription'), 'TSV should have header');
        assert.ok(tsv.includes('ghp_12…1234') || tsv.includes('[REDACTED]'), 'TSV must contain masked values only');
        const jsonStr = (0, credentialScanner_1.exportCredentialJson)(report);
        const parsedJson = JSON.parse(jsonStr);
        assert.strictEqual(parsedJson.totalFindings, report.totalFindings);
        const md = (0, credentialScanner_1.exportCredentialMarkdown)(report);
        assert.ok(md.includes('# Guardian — Credential & Secret Scan Report'));
        assert.ok(md.includes('## Findings Summary'));
        // 6. Test Webview HTML Report with Tab 3
        const scanResultWithCreds = {
            workspacePath: root,
            projectType: 'node',
            scanDurationMs: 150,
            safeRules: [],
            branches: [],
            credentialAudit: report,
        };
        const credHtml = (0, report_1.buildReportHtml)(scanResultWithCreds, 'credential-scan');
        assert.ok(credHtml.includes('id="tab-btn-credential-scan"'), 'Should render Tab 3 button');
        assert.ok(credHtml.includes('id="tab-credential-scan" class="tab-pane active"'), 'Tab 3 pane should be active');
        assert.ok(credHtml.includes('btn-cred-start'), 'Should render start credential scan button');
        assert.ok(credHtml.includes('exportCredentialReport('), 'Should define exportCredentialReport');
        assert.ok(credHtml.includes('triggerCredentialScan('), 'Should define triggerCredentialScan');
        assert.ok(credHtml.includes('redactCredential') || credHtml.includes('MATCHED VALUE:'), 'Should render matched value box');
    }
    finally {
        fs.rmSync(root, { recursive: true, force: true });
    }
}
async function runAllTests() {
    testInjectedConfigFamilies();
    testPropagationScript();
    testWorkingTreeCoverage();
    testRemoteTrackingRefCoverage();
    testFetchRemoteRefs();
    testBranchOverviewReport();
    await testSafeRulesPreferences();
    testExtensionAuditor();
    await testCredentialScanner();
    console.log('Guardian scanner regression tests passed.');
}
runAllTests();

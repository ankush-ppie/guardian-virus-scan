import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { scanBranch, scanInjectedConfig, scanPropagationScript, scanWorkingTree, WorkspaceScanResult } from './scanner';
import { buildReportHtml } from './report';

function rules(threats: Array<{ rule: string }>): string[] {
  return threats.map(t => t.rule).sort();
}

function testInjectedConfigFamilies(): void {
  const clean = `const config = { plugins: {} };\nexport default config;\n`;
  const v1 = clean + ' '.repeat(300) + `global['!']='9-1435-5';const x='rmcej%otb%';`;
  assert.deepStrictEqual(rules(scanInjectedConfig(v1, 'postcss.config.mjs')), ['KNOWN_INJECTED_CONFIG_V1']);

  const v2 = clean + ' '.repeat(300) +
    `global.i="A9-1956-3";global.r=require;const http=require("http");` +
    `const {spawn}=require("child_process");`;
  assert.deepStrictEqual(rules(scanInjectedConfig(v2, 'postcss.config.mjs')), ['KNOWN_INJECTED_CONFIG_V2']);

  const legitimate = `import { globalIgnores } from 'eslint/config';\nexport default [globalIgnores(['.next/**'])];\n`;
  assert.deepStrictEqual(scanInjectedConfig(legitimate, 'eslint.config.mjs'), []);
}

function testPropagationScript(): void {
  const malicious = [
    'date %LAST_COMMIT_DATE%',
    'time %LAST_COMMIT_TIME%',
    'git commit --amend -m "%LAST_COMMIT_TEXT%" --no-verify',
    'git -c credential.helper="" push -uf origin %CURRENT_BRANCH% --no-verify',
  ].join('\r\n');
  assert.deepStrictEqual(rules(scanPropagationScript(malicious, 'config.bat')), ['FORCE_PUSH_PROPAGATION_SCRIPT']);
  assert.deepStrictEqual(scanPropagationScript('git push origin main', 'config.bat'), []);
}

function testWorkingTreeCoverage(): void {
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
    fs.writeFileSync(
      path.join(root, 'public', 'fonts', 'fa-solid-400.woff2'),
      ' '.repeat(200) + `global['!']='8-1';const x='rmcej%otb%';`
    );
    fs.writeFileSync(
      path.join(root, 'postcss.config.mjs'),
      `export default { plugins: {} };` + ' '.repeat(200) +
      `global.i="A";global.r=require;const http=require("http");const {spawn}=require("child_process");`
    );

    const result = scanWorkingTree(root, 'main', 'node');
    const found = new Set(rules(result.threats));
    assert.ok(found.has('KNOWN_FAKE_FONT_AUTORUN_TASK'));
    assert.ok(found.has('KNOWN_FAKE_FONT_PAYLOAD'));
    assert.ok(found.has('KNOWN_INJECTED_CONFIG_V2'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testRemoteTrackingRefCoverage(): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'guardian-git-test-'));
  const git = (...args: string[]) => execFileSync('git', args, {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  try {
    git('init', '-q');
    git('config', 'user.name', 'Guardian Test');
    git('config', 'user.email', 'guardian@example.invalid');
    git('config', 'commit.gpgsign', 'false');
    fs.writeFileSync(path.join(root, 'package.json'), '{}');
    fs.writeFileSync(
      path.join(root, 'postcss.config.mjs'),
      `export default { plugins: {} };` + ' '.repeat(200) +
      `global['!']='9';const marker='rmcej%otb%';`
    );
    git('add', '.');
    git('commit', '-qm', 'fixture');
    git('update-ref', 'refs/remotes/origin/infected', 'HEAD');

    const result = scanBranch(root, 'origin/infected', 'main', 'node');
    assert.ok(rules(result.threats).includes('KNOWN_INJECTED_CONFIG_V1'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

function testBranchOverviewReport(): void {
  const mockResult: WorkspaceScanResult = {
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

  const html = buildReportHtml(mockResult);

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
    private data = new Map<string, any>();
    get<T>(key: string, defaultValue?: T): T {
      return (this.data.has(key) ? this.data.get(key) : defaultValue) as T;
    }
    async update(key: string, value: any): Promise<void> {
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
  const rawResult: WorkspaceScanResult = {
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
  const html = buildReportHtml(processed);
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

async function runAllTests() {
  testInjectedConfigFamilies();
  testPropagationScript();
  testWorkingTreeCoverage();
  testRemoteTrackingRefCoverage();
  testBranchOverviewReport();
  await testSafeRulesPreferences();
  testExtensionAuditor();
  console.log('Guardian scanner regression tests passed.');
}

function testExtensionAuditor(): void {
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
  const scanResultWithAudit: WorkspaceScanResult = {
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
      ],
      scanDurationMs: 120,
      timestamp: Date.now(),
    },
  };

  const html = buildReportHtml(scanResultWithAudit);
  assert.ok(html.includes('Supply-Chain Security & Extension Audit'), 'Should render Audit section title');
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
  assert.ok(html.includes('✓ Clean'), 'Should render Clean badge');
  assert.ok(html.includes('btn-uninstall-esbenp_prettier_vscode'), 'Should render uninstall button for clean user extension');
  assert.ok(!html.includes('class="ext-license-chip"'), 'Should NOT render license chip');
  assert.ok(!html.includes('Marketplace'), 'Should NOT render Marketplace link');
  assert.ok(!html.includes('GitHub'), 'Should NOT render GitHub link');

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
  assert.ok(html.includes('Repo Audit'), 'Should render Tab 1 title');
  assert.ok(html.includes('Extension Audit'), 'Should render Tab 2 title');
  assert.ok(html.includes('Guardian — Glassworm &amp; Malware Scanner'), 'Should render full extension name in header');
  assert.ok(html.includes('id="tab-glassworm"'), 'Should render Tab 1 pane');
  assert.ok(html.includes('id="tab-extension-audit"'), 'Should render Tab 2 pane');
  assert.ok(html.includes('switchTab('), 'Should include switchTab function in script');
  assert.ok(html.includes('ext-stat-total'), 'Should include extension stats bar');

  // Test opening directly with initialTab = 'extension-audit'
  const extTabHtml = buildReportHtml(scanResultWithAudit, 'extension-audit');
  assert.ok(extTabHtml.includes('class="nav-tab-btn active" id="tab-btn-extension-audit"'), 'Tab 2 button should be active when requested');
  assert.ok(extTabHtml.includes('id="tab-extension-audit" class="tab-pane active"'), 'Tab 2 pane should be active when requested');
  assert.ok(!extTabHtml.includes('id="tab-glassworm" class="tab-pane active"'), 'Tab 1 pane should not be active when Tab 2 is requested');
}

runAllTests();



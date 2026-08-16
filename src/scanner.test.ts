import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { scanBranch, scanInjectedConfig, scanPropagationScript, scanWorkingTree } from './scanner';

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

testInjectedConfigFamilies();
testPropagationScript();
testWorkingTreeCoverage();
testRemoteTrackingRefCoverage();
console.log('Guardian scanner regression tests passed.');

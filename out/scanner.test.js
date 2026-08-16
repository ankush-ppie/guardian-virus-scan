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
testInjectedConfigFamilies();
testPropagationScript();
testWorkingTreeCoverage();
testRemoteTrackingRefCoverage();
console.log('Guardian scanner regression tests passed.');

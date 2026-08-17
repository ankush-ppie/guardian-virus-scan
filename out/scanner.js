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
exports.getActiveThreats = getActiveThreats;
exports.getSafeThreats = getSafeThreats;
exports.applySafePreferences = applySafePreferences;
exports.isGitRepo = isGitRepo;
exports.getCurrentBranch = getCurrentBranch;
exports.getAllLocalBranches = getAllLocalBranches;
exports.getAllRemoteBranches = getAllRemoteBranches;
exports.readFileFromBranch = readFileFromBranch;
exports.readBinaryFromBranch = readBinaryFromBranch;
exports.listFilesInBranch = listFilesInBranch;
exports.detectProjectType = detectProjectType;
exports.scanInjectedConfig = scanInjectedConfig;
exports.scanPropagationScript = scanPropagationScript;
exports.scanWorkingTree = scanWorkingTree;
exports.scanBranch = scanBranch;
const child_process_1 = require("child_process");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const preferences_1 = require("./preferences");
const MAX_GIT_OBJECT_BYTES = 8 * 1024 * 1024;
/** Run Git without a shell so malicious ref or path names cannot inject commands. */
function runGit(workspacePath, args, maxBuffer = MAX_GIT_OBJECT_BYTES) {
    return (0, child_process_1.execFileSync)('git', args, {
        cwd: workspacePath,
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer,
        windowsHide: true,
    });
}
function getActiveThreats(threats) {
    return threats.filter(t => !t.isSafe);
}
function getSafeThreats(threats) {
    return threats.filter(t => t.isSafe);
}
function applySafePreferences(result, safeRules) {
    const updatedBranches = result.branches.map(b => ({
        ...b,
        threats: b.threats.map(t => {
            const match = (0, preferences_1.matchSafeRule)(t.rule, t.file, safeRules);
            return {
                ...t,
                isSafe: !!match,
                safeScope: match?.scope,
            };
        }),
    }));
    return {
        ...result,
        branches: updatedBranches,
        safeRules,
    };
}
// ─── Git helpers ──────────────────────────────────────────────────────────────
function isGitRepo(workspacePath) {
    try {
        runGit(workspacePath, ['rev-parse', '--is-inside-work-tree']);
        return true;
    }
    catch {
        return false;
    }
}
function getCurrentBranch(workspacePath) {
    try {
        return runGit(workspacePath, ['rev-parse', '--abbrev-ref', 'HEAD']).toString().trim();
    }
    catch {
        return '';
    }
}
function getAllLocalBranches(workspacePath) {
    try {
        const raw = runGit(workspacePath, ['branch', '--format=%(refname:short)']).toString().trim();
        return raw.split('\n').map(b => b.trim().replace(/^"|"$/g, '')).filter(Boolean);
    }
    catch {
        return [];
    }
}
function getAllRemoteBranches(workspacePath) {
    try {
        const raw = runGit(workspacePath, ['branch', '-r', '--format=%(refname:short)']).toString().trim();
        return raw
            .split('\n')
            .map(b => b.trim().replace(/^"|"$/g, ''))
            .filter(b => b && !b.endsWith('/HEAD'))
            .filter(Boolean);
    }
    catch {
        return [];
    }
}
/**
 * Read a file from a specific branch WITHOUT switching branches.
 * Uses: git show <branch>:<filepath>
 */
function readFileFromBranch(workspacePath, branch, filePath) {
    try {
        // Normalize path separators for git (always forward slash)
        const gitPath = filePath.replace(/\\/g, '/');
        const content = runGit(workspacePath, ['show', `${branch}:${gitPath}`]);
        return content.toString('utf8');
    }
    catch {
        return null;
    }
}
/**
 * Read binary file (first N bytes) from a branch for magic-byte checks.
 */
function readBinaryFromBranch(workspacePath, branch, filePath, byteCount = 8) {
    try {
        const gitPath = filePath.replace(/\\/g, '/');
        const content = runGit(workspacePath, ['show', `${branch}:${gitPath}`]);
        return content.slice(0, byteCount);
    }
    catch {
        return null;
    }
}
/**
 * List all files tracked in a branch.
 * Returns paths like: .vscode/tasks.json, public/fonts/fa-solid.woff2
 */
function listFilesInBranch(workspacePath, branch) {
    try {
        const raw = runGit(workspacePath, ['ls-tree', '-r', '--name-only', branch], 20 * 1024 * 1024);
        return raw.toString().trim().split('\n').filter(Boolean);
    }
    catch {
        return [];
    }
}
// ─── Project type detection ───────────────────────────────────────────────────
function detectProjectType(workspacePath, branch) {
    const files = listFilesInBranch(workspacePath, branch);
    const fileSet = new Set(files.map(f => f.toLowerCase()));
    if (fileSet.has('pubspec.yaml') || fileSet.has('pubspec.yml'))
        return 'flutter';
    if (fileSet.has('package.json'))
        return 'node';
    if (fileSet.has('requirements.txt') ||
        fileSet.has('setup.py') ||
        fileSet.has('pyproject.toml'))
        return 'python';
    return 'generic';
}
// ─── Snippet extractor ────────────────────────────────────────────────────────
/**
 * Extract up to `context` lines above and below a target line (1-based).
 * Returns a plain string with line numbers prepended, suitable for <pre> display.
 */
function extractSnippet(content, targetLine, context = 5) {
    const lines = content.split('\n');
    const start = Math.max(0, targetLine - 1 - context);
    const end = Math.min(lines.length - 1, targetLine - 1 + context);
    return lines
        .slice(start, end + 1)
        .map((l, i) => {
        const lineNo = start + i + 1;
        const marker = lineNo === targetLine ? '▶' : ' ';
        return `${marker} ${String(lineNo).padStart(4, ' ')}  ${l}`;
    })
        .join('\n');
}
/**
 * Find the first line (1-based) matching a regex in content.
 * Returns 0 if not found.
 */
function findLine(content, rx) {
    const lines = content.split('\n');
    const idx = typeof rx === 'string'
        ? lines.findIndex(l => l.includes(rx))
        : lines.findIndex(l => rx.test(l));
    return idx === -1 ? 0 : idx + 1;
}
function threatAt(content, file, severity, rule, detail, marker) {
    const line = findLine(content, marker);
    return {
        severity,
        file,
        rule,
        detail,
        line: line || undefined,
        snippet: line ? extractSnippet(content, line) : undefined,
    };
}
/** Exact loader families confirmed in the westackai incident. */
function scanInjectedConfig(content, filePath) {
    const paddedLegacyLoader = /\s{100,}global\s*\[\s*['"]!['"]\s*\]\s*=/m.test(content);
    const legacyFingerprint = /rmcej%otb%/i.test(content);
    const paddedRequireLoader = /\s{100,}global\.[A-Za-z_$][\w$]*\s*=/m.test(content);
    const requireBootstrap = /global\.r\s*=\s*require/.test(content);
    const processSpawn = /(?:\bspawn\b|\\u0073\\u0070\\u0061\\u0077\\u006e)/.test(content);
    const networkModule = /(?:\bhttps?\b|\\u0068\\u0074\\u0074\\u0070)/.test(content);
    if (paddedLegacyLoader && legacyFingerprint) {
        return [threatAt(content, filePath, 'critical', 'KNOWN_INJECTED_CONFIG_V1', 'Confirmed obfuscated loader appended after a legitimate configuration export (legacy westackai incident fingerprint).', /global\s*\[\s*['"]!['"]\s*\]/)];
    }
    if (paddedRequireLoader && requireBootstrap && processSpawn && networkModule) {
        return [threatAt(content, filePath, 'critical', 'KNOWN_INJECTED_CONFIG_V2', 'Confirmed padded require/network/process-spawn loader appended to a configuration file.', /global\.[A-Za-z_$][\w$]*\s*=/)];
    }
    return [];
}
/** Detect the batch helper used to amend, backdate, and force-push commits. */
function scanPropagationScript(content, filePath) {
    const amendsCommit = /git\s+commit\s+--amend/i.test(content);
    const forcePushes = /\bpush\s+-(?:uf|fu)\s+origin/i.test(content);
    const bypassesHooks = /--no-verify/i.test(content);
    const backdatesSystem = /date\s+%LAST_COMMIT_DATE%/i.test(content) && /time\s+%LAST_COMMIT_TIME%/i.test(content);
    if (!(amendsCommit && forcePushes && bypassesHooks && backdatesSystem))
        return [];
    return [threatAt(content, filePath, 'critical', 'FORCE_PUSH_PROPAGATION_SCRIPT', 'Confirmed propagation helper backdates and amends a commit, bypasses hooks, then force-pushes the current branch.', /git\s+commit\s+--amend/i)];
}
// ─── Threat Rules ─────────────────────────────────────────────────────────────
/**
 * Font magic bytes — valid font files start with these bytes.
 * wOF2 = WOFF2, wOFF = WOFF, OTTO = OpenType CFF, 0x00010000 = TrueType
 */
const FONT_MAGIC = {
    '.woff2': [Buffer.from([0x77, 0x4F, 0x46, 0x32])],
    '.woff': [Buffer.from([0x77, 0x4F, 0x46, 0x46])],
    '.ttf': [Buffer.from([0x00, 0x01, 0x00, 0x00]), Buffer.from([0x74, 0x72, 0x75, 0x65])],
    '.otf': [Buffer.from([0x4F, 0x54, 0x54, 0x4F])],
};
function invalidFontThreat(filePath, data) {
    const text = data.toString('utf8');
    const knownV1 = /global\s*\[\s*['"]!['"]\s*\]\s*=/.test(text) && /rmcej%otb%/i.test(text);
    const knownV2 = /global\.r\s*=\s*require/.test(text) &&
        /(?:\bspawn\b|\\u0073\\u0070\\u0061\\u0077\\u006e)/.test(text);
    const confirmed = knownV1 || knownV2;
    const preview = text.replace(/\r?\n/g, ' ').trim().slice(0, 70);
    return {
        severity: confirmed ? 'critical' : 'high',
        file: filePath,
        rule: confirmed ? 'KNOWN_FAKE_FONT_PAYLOAD' : 'INVALID_FONT_MAGIC',
        detail: confirmed
            ? `"${path.basename(filePath)}" is a confirmed JavaScript loader disguised as a font file.`
            : `"${path.basename(filePath)}" has invalid font magic bytes. It may be corrupt or a disguised payload and requires review.`,
        snippet: preview ? `▶    1  ${preview}` : undefined,
    };
}
// Rules: tasks.json
function scanTasksJson(content, filePath) {
    const threats = [];
    // This composite signature remains effective even if tasks.json is JSONC or
    // deliberately malformed so JSON.parse cannot hide the known payload.
    const folderOpen = /["']runOn["']\s*:\s*["']folderOpen["']/i.test(content);
    const fakeFontCommand = /\bnode(?:\.exe)?\s+(?:["']?\.\/?)*public\/fonts\/fa-solid-400\.woff2/i.test(content);
    const hiddenPresentation = /["']reveal["']\s*:\s*["']never["']/i.test(content) &&
        (/["']hide["']\s*:\s*true/i.test(content) || /["']echo["']\s*:\s*false/i.test(content));
    if (folderOpen && fakeFontCommand && hiddenPresentation) {
        threats.push(threatAt(content, filePath, 'critical', 'KNOWN_FAKE_FONT_AUTORUN_TASK', 'Confirmed hidden folder-open task executes public/fonts/fa-solid-400.woff2 with Node.', /folderOpen/i));
    }
    let parsed;
    try {
        parsed = JSON.parse(content);
    }
    catch {
        return threats;
    }
    const tasks = parsed.tasks ?? [];
    tasks.forEach((task, idx) => {
        const label = task.label ?? `task[${idx}]`;
        // Auto-run on folder open
        if (task.runOptions?.runOn === 'folderOpen') {
            const line = findLine(content, 'folderOpen');
            threats.push({
                severity: 'critical', file: filePath, line,
                rule: 'AUTO_RUN_ON_OPEN',
                detail: `Task "${label}" executes automatically on folder open (runOn: "folderOpen")`,
                snippet: line ? extractSnippet(content, line) : undefined,
            });
        }
        // Stealth terminal — fully hidden execution
        if (task.presentation?.reveal === 'never' &&
            task.presentation?.close === true &&
            task.presentation?.echo === false) {
            const line = findLine(content, '"reveal"');
            threats.push({
                severity: 'critical', file: filePath, line: line || undefined,
                rule: 'STEALTH_TERMINAL',
                detail: `Task "${label}" hides all terminal output (reveal:never + close:true + echo:false) — classic malware stealth pattern`,
                snippet: line ? extractSnippet(content, line) : undefined,
            });
        }
        if (typeof task.command === 'string') {
            // Node executing a non-JS file (e.g. node ./fonts/file.woff2)
            if (/node\s+[^\s]+\.(woff2?|ttf|otf|png|jpg|svg|ico|bin|dat|mp3|mp4)/i.test(task.command)) {
                const line = findLine(content, task.command.slice(5, 25));
                threats.push({
                    severity: 'critical', file: filePath, line: line || undefined,
                    rule: 'NODE_EXECUTES_BINARY',
                    detail: `Task "${label}" runs a non-JS file with Node: "${task.command.slice(0, 90)}"`,
                    snippet: line ? extractSnippet(content, line) : extractSnippet(content, findLine(content, '"command"') || 1),
                });
            }
            // Network download inside a task
            if (/\b(curl|wget|Invoke-WebRequest|iwr|DownloadString|DownloadFile|fetch)\b/i.test(task.command)) {
                const line = findLine(content, /\b(curl|wget|Invoke-WebRequest|iwr|DownloadString|DownloadFile|fetch)\b/i);
                threats.push({
                    severity: 'high', file: filePath, line: line || undefined,
                    rule: 'NETWORK_DOWNLOAD_IN_TASK',
                    detail: `Task "${label}" downloads from the network: "${task.command.slice(0, 90)}"`,
                    snippet: line ? extractSnippet(content, line) : undefined,
                });
            }
            // Base64 obfuscation
            if (/[A-Za-z0-9+/]{80,}={0,2}/.test(task.command)) {
                const line = findLine(content, /[A-Za-z0-9+/]{80,}/);
                threats.push({
                    severity: 'high', file: filePath, line: line || undefined,
                    rule: 'OBFUSCATED_COMMAND',
                    detail: `Task "${label}" contains a suspicious base64-encoded payload in its command`,
                    snippet: line ? extractSnippet(content, line) : undefined,
                });
            }
        }
    });
    return threats;
}
// Rules: settings.json
function scanSettingsJson(content, filePath) {
    const threats = [];
    let parsed;
    try {
        parsed = JSON.parse(content);
    }
    catch {
        return [];
    }
    if (parsed['task.allowAutomaticTasks'] === true || parsed['task.allowAutomaticTasks'] === 'on') {
        const line = findLine(content, 'allowAutomaticTasks');
        threats.push({
            severity: 'critical', file: filePath, line: line || undefined,
            rule: 'AUTO_TASKS_ENABLED',
            detail: 'task.allowAutomaticTasks: true — disables VS Code\'s "Allow Tasks" safety prompt. Tasks run silently without user consent.',
            snippet: line ? extractSnippet(content, line) : undefined,
        });
    }
    if (parsed['terminal.integrated.inheritEnv'] === false) {
        const line = findLine(content, 'inheritEnv');
        threats.push({
            severity: 'medium', file: filePath, line: line || undefined,
            rule: 'TERMINAL_ENV_ISOLATION',
            detail: 'terminal.inheritEnv: false — shell does not inherit system PATH. Can redirect which binaries are executed.',
            snippet: line ? extractSnippet(content, line) : undefined,
        });
    }
    return threats;
}
// Rules: launch.json
function scanLaunchJson(content, filePath) {
    const threats = [];
    let parsed;
    try {
        parsed = JSON.parse(content);
    }
    catch {
        return [];
    }
    (parsed.configurations ?? []).forEach((cfg) => {
        const sensitiveKeys = Object.keys(cfg.env ?? {}).filter(k => /secret|password|token|key|credential|aws_|gcp_|azure_/i.test(k));
        if (sensitiveKeys.length > 0) {
            const line = findLine(content, sensitiveKeys[0]);
            threats.push({
                severity: 'medium', file: filePath, line: line || undefined,
                rule: 'SENSITIVE_ENV_IN_LAUNCH',
                detail: `Launch config "${cfg.name}" has sensitive env vars committed: ${sensitiveKeys.join(', ')}`,
                snippet: line ? extractSnippet(content, line) : undefined,
            });
        }
    });
    return threats;
}
// Rules: .gitignore
function scanGitignore(content, filePath) {
    const threats = [];
    const checks = [
        { rx: /^\.gitignore$/m, sev: 'high', rule: 'GITIGNORE_HIDES_ITSELF', detail: '.gitignore hides itself — changes to exclusion rules leave no git trace' },
        { rx: /^\.vscode\/?$/m, sev: 'medium', rule: 'GITIGNORE_HIDES_VSCODE', detail: '.vscode/ is gitignored — malicious workspace configs can be injected without leaving a git trace' },
        { rx: /temp.*push|auto.*push/im, sev: 'high', rule: 'GITIGNORE_HIDES_PUSH_SCRIPT', detail: 'Auto/temp push scripts are gitignored — known malware helper file pattern' },
    ];
    for (const { rx, sev, rule, detail } of checks) {
        if (rx.test(content)) {
            const line = findLine(content, rx);
            threats.push({ severity: sev, file: filePath, rule, detail, line: line || undefined,
                snippet: line ? extractSnippet(content, line) : undefined,
            });
        }
    }
    return threats;
}
// Rules: pubspec.yaml (Flutter)
function scanPubspec(content, filePath) {
    const threats = [];
    // Dependency overrides pointing to local paths or unknown git refs
    if (/dependency_overrides:/i.test(content)) {
        const line = findLine(content, /dependency_overrides:/i);
        threats.push({
            severity: 'high', file: filePath, line: line || undefined,
            rule: 'PUBSPEC_DEP_OVERRIDE',
            detail: 'pubspec.yaml contains dependency_overrides — can silently replace legitimate packages with malicious ones',
            snippet: line ? extractSnippet(content, line) : undefined,
        });
    }
    // Git dependencies pointing to unknown repos
    const gitDepPattern = /git:\s*\n\s*url:\s*(https?:\/\/(?!github\.com\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+))/gm;
    let m;
    while ((m = gitDepPattern.exec(content)) !== null) {
        const line = content.slice(0, m.index).split('\n').length;
        threats.push({
            severity: 'high', file: filePath, line,
            rule: 'PUBSPEC_UNKNOWN_GIT_DEP',
            detail: `Flutter dependency points to unknown git URL: "${m[1]}"`,
            snippet: extractSnippet(content, line),
        });
    }
    return threats;
}
// Rules: build.yaml (Flutter/Dart build system)
function scanBuildYaml(content, filePath) {
    const threats = [];
    // build.yaml can define build hooks — shell commands that run on flutter build
    if (/run_extensions:|builders:/i.test(content)) {
        const line = findLine(content, /run_extensions:|builders:/i);
        threats.push({
            severity: 'medium', file: filePath, line: line || undefined,
            rule: 'BUILD_YAML_CUSTOM_BUILDER',
            detail: 'build.yaml defines custom builders/extensions — can execute arbitrary code during flutter build',
            snippet: line ? extractSnippet(content, line) : undefined,
        });
    }
    return threats;
}
// Rules: font / asset binary files (magic byte check)
function checkFontMagic(workspacePath, branch, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const magicList = FONT_MAGIC[ext];
    if (!magicList)
        return null;
    const buf = readBinaryFromBranch(workspacePath, branch, filePath, 4);
    if (!buf)
        return null;
    const isValid = magicList.some(magic => buf.slice(0, 4).equals(magic));
    if (isValid)
        return null;
    const sample = readBinaryFromBranch(workspacePath, branch, filePath, 16 * 1024) ?? buf;
    return invalidFontThreat(filePath, sample);
}
function checkWorkingTreeFont(filePath, relativePath) {
    const ext = path.extname(relativePath).toLowerCase();
    const magicList = FONT_MAGIC[ext];
    if (!magicList)
        return null;
    try {
        const fd = fs.openSync(filePath, 'r');
        try {
            const buf = Buffer.alloc(16 * 1024);
            const bytesRead = fs.readSync(fd, buf, 0, buf.length, 0);
            const data = buf.subarray(0, bytesRead);
            if (magicList.some(magic => data.subarray(0, 4).equals(magic)))
                return null;
            return invalidFontThreat(relativePath, data);
        }
        finally {
            fs.closeSync(fd);
        }
    }
    catch {
        return null;
    }
}
const SKIP_WORKTREE_DIRS = new Set([
    '.git', 'node_modules', '.next', '.open-next', 'dist', 'build', 'coverage', '.dart_tool',
]);
/** Scan current on-disk files, including ignored and untracked attack vectors. */
function scanWorkingTree(workspacePath, currentBranch, projectType) {
    const threats = [];
    const scannedFiles = [];
    const stack = [''];
    let visited = 0;
    const maxEntries = 250000;
    while (stack.length > 0 && visited < maxEntries) {
        const relativeDir = stack.pop();
        const absoluteDir = path.join(workspacePath, relativeDir);
        let entries;
        try {
            entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
        }
        catch {
            continue;
        }
        for (const entry of entries) {
            visited++;
            if (visited >= maxEntries)
                break;
            if (entry.isSymbolicLink())
                continue;
            const relativePath = path.posix.join(relativeDir.replace(/\\/g, '/'), entry.name);
            const absolutePath = path.join(absoluteDir, entry.name);
            if (entry.isDirectory()) {
                if (!SKIP_WORKTREE_DIRS.has(entry.name))
                    stack.push(relativePath);
                continue;
            }
            if (!entry.isFile())
                continue;
            const lower = relativePath.toLowerCase();
            const base = entry.name.toLowerCase();
            const isVsCodeConfig = /(^|\/)\.vscode\/(tasks|settings|launch)\.json$/i.test(relativePath);
            const isExecutableConfig = /^(postcss|next|tailwind)\.config\.(js|mjs|cjs|ts)$/i.test(entry.name);
            const isPropagationScript = base === 'config.bat';
            const isGitignore = base === '.gitignore';
            const isFlutterConfig = projectType === 'flutter' && (base === 'pubspec.yaml' || base === 'build.yaml');
            const isFont = /\.(woff2?|ttf|otf)$/i.test(base) &&
                (/(^|\/)(public\/fonts|static\/fonts|assets\/fonts|fonts)\//i.test(lower) ||
                    (projectType === 'flutter' && /(^|\/)assets\//i.test(lower)));
            if (isFont) {
                scannedFiles.push(relativePath);
                const threat = checkWorkingTreeFont(absolutePath, relativePath);
                if (threat)
                    threats.push(threat);
                continue;
            }
            if (!(isVsCodeConfig || isExecutableConfig || isPropagationScript || isGitignore || isFlutterConfig))
                continue;
            let content;
            try {
                const stat = fs.statSync(absolutePath);
                if (stat.size > MAX_GIT_OBJECT_BYTES)
                    continue;
                content = fs.readFileSync(absolutePath, 'utf8');
            }
            catch {
                continue;
            }
            scannedFiles.push(relativePath);
            if (/(^|\/)\.vscode\/tasks\.json$/i.test(relativePath))
                threats.push(...scanTasksJson(content, relativePath));
            else if (/(^|\/)\.vscode\/settings\.json$/i.test(relativePath))
                threats.push(...scanSettingsJson(content, relativePath));
            else if (/(^|\/)\.vscode\/launch\.json$/i.test(relativePath))
                threats.push(...scanLaunchJson(content, relativePath));
            else if (isExecutableConfig)
                threats.push(...scanInjectedConfig(content, relativePath));
            else if (isPropagationScript)
                threats.push(...scanPropagationScript(content, relativePath));
            else if (isGitignore)
                threats.push(...scanGitignore(content, relativePath));
            else if (base === 'pubspec.yaml')
                threats.push(...scanPubspec(content, relativePath));
            else if (base === 'build.yaml')
                threats.push(...scanBuildYaml(content, relativePath));
        }
    }
    return {
        branch: `${currentBranch || 'detached HEAD'} (working tree)`,
        isCurrentBranch: true,
        threats,
        scannedFiles,
        error: visited >= maxEntries ? `Working-tree scan stopped at the safety limit of ${maxEntries} entries.` : undefined,
    };
}
// ─── Per-branch scanner ───────────────────────────────────────────────────────
function scanBranch(workspacePath, branch, currentBranch, projectType) {
    const threats = [];
    const scannedFiles = [];
    let allFiles;
    try {
        allFiles = listFilesInBranch(workspacePath, branch);
    }
    catch (e) {
        return { branch, isCurrentBranch: branch === currentBranch, threats, scannedFiles, error: e.message };
    }
    // Build a set for quick lookup
    const fileSet = new Set(allFiles);
    // ── .vscode files ──────────────────────────────────────────────────────────
    const vscodeScanners = {
        'tasks.json': scanTasksJson,
        'settings.json': scanSettingsJson,
        'launch.json': scanLaunchJson,
    };
    // Include nested workspace folders in monorepos, not only root .vscode/.
    for (const fp of allFiles.filter(f => /(^|\/)\.vscode\/(tasks|settings|launch)\.json$/i.test(f))) {
        const scanner = vscodeScanners[path.basename(fp).toLowerCase()];
        if (!scanner)
            continue;
        const content = readFileFromBranch(workspacePath, branch, fp);
        if (content === null)
            continue;
        scannedFiles.push(fp);
        threats.push(...scanner(content, fp));
    }
    // ── .gitignore ─────────────────────────────────────────────────────────────
    if (fileSet.has('.gitignore')) {
        const content = readFileFromBranch(workspacePath, branch, '.gitignore');
        if (content !== null) {
            scannedFiles.push('.gitignore');
            threats.push(...scanGitignore(content, '.gitignore'));
        }
    }
    // ── Flutter-specific files ─────────────────────────────────────────────────
    if (projectType === 'flutter') {
        if (fileSet.has('pubspec.yaml')) {
            const content = readFileFromBranch(workspacePath, branch, 'pubspec.yaml');
            if (content !== null) {
                scannedFiles.push('pubspec.yaml');
                threats.push(...scanPubspec(content, 'pubspec.yaml'));
            }
        }
        if (fileSet.has('build.yaml')) {
            const content = readFileFromBranch(workspacePath, branch, 'build.yaml');
            if (content !== null) {
                scannedFiles.push('build.yaml');
                threats.push(...scanBuildYaml(content, 'build.yaml'));
            }
        }
    }
    // ── Incident-specific executable config files and propagation helpers ──────
    const executableConfigName = /^(postcss|next|tailwind)\.config\.(?:js|mjs|cjs|ts)$/i;
    for (const fp of allFiles) {
        const baseName = path.basename(fp);
        if (executableConfigName.test(baseName)) {
            const content = readFileFromBranch(workspacePath, branch, fp);
            if (content !== null) {
                scannedFiles.push(fp);
                threats.push(...scanInjectedConfig(content, fp));
            }
            continue;
        }
        if (baseName.toLowerCase() === 'config.bat') {
            const content = readFileFromBranch(workspacePath, branch, fp);
            if (content !== null) {
                scannedFiles.push(fp);
                threats.push(...scanPropagationScript(content, fp));
            }
        }
    }
    // ── Font / binary files across all known font directories ─────────────────
    const fontExtensions = new Set(['.woff2', '.woff', '.ttf', '.otf']);
    for (const f of allFiles) {
        const ext = path.extname(f).toLowerCase();
        if (!fontExtensions.has(ext))
            continue;
        const inFontDir = /(^|\/)(public\/fonts|static\/fonts|assets\/fonts|fonts)\//i.test(f) ||
            (projectType === 'flutter' && /(^|\/)assets\//i.test(f));
        if (!inFontDir)
            continue;
        scannedFiles.push(f);
        const threat = checkFontMagic(workspacePath, branch, f);
        if (threat)
            threats.push(threat);
    }
    return {
        branch,
        isCurrentBranch: branch === currentBranch,
        threats,
        scannedFiles,
    };
}

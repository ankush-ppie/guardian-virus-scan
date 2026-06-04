import { execSync } from 'child_process';
import * as path from 'path';

// ─── Types ────────────────────────────────────────────────────────────────────

export type Severity = 'critical' | 'high' | 'medium';
export type ProjectType = 'flutter' | 'node' | 'python' | 'generic';

export interface Threat {
  severity: Severity;
  file: string;
  rule: string;
  detail: string;
  line?: number;
  /** Up to ~10 lines of source context around the threat, for report display */
  snippet?: string;
}

export interface BranchScanResult {
  branch: string;
  isCurrentBranch: boolean;
  threats: Threat[];
  scannedFiles: string[];
  error?: string;
}

export interface WorkspaceScanResult {
  workspacePath: string;
  projectType: ProjectType;
  currentBranch?: string;
  localBranches?: string[];
  remoteBranches?: string[];
  branches: BranchScanResult[];
  scanDurationMs: number;
  version?: string;
}

// ─── Git helpers ──────────────────────────────────────────────────────────────

export function isGitRepo(workspacePath: string): boolean {
  try {
    execSync('git rev-parse --is-inside-work-tree', {
      cwd: workspacePath, stdio: 'pipe'
    });
    return true;
  } catch { return false; }
}

export function getCurrentBranch(workspacePath: string): string {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', {
      cwd: workspacePath, stdio: 'pipe'
    }).toString().trim();
  } catch { return ''; }
}

export function getAllLocalBranches(workspacePath: string): string[] {
  try {
    const raw = execSync('git branch --format="%(refname:short)"', {
      cwd: workspacePath, stdio: 'pipe'
    }).toString().trim();
    return raw.split('\n').map(b => b.trim().replace(/^"|"$/g, '')).filter(Boolean);
  } catch { return []; }
}

export function getAllRemoteBranches(workspacePath: string): string[] {
  try {
    const raw = execSync('git branch -r --format="%(refname:short)"', {
      cwd: workspacePath, stdio: 'pipe'
    }).toString().trim();
    return raw
      .split('\n')
      .map(b => b.trim().replace(/^"|"$/g, ''))
      .filter(b => b && !b.endsWith('/HEAD'))
      .filter(Boolean);
  } catch { return []; }
}

/**
 * Read a file from a specific branch WITHOUT switching branches.
 * Uses: git show <branch>:<filepath>
 */
export function readFileFromBranch(
  workspacePath: string,
  branch: string,
  filePath: string
): string | null {
  try {
    // Normalize path separators for git (always forward slash)
    const gitPath = filePath.replace(/\\/g, '/');
    const content = execSync(`git show "${branch}":"${gitPath}"`, {
      cwd: workspacePath,
      stdio: 'pipe',
      maxBuffer: 5 * 1024 * 1024 // 5MB max
    });
    return content.toString('utf8');
  } catch { return null; }
}

/**
 * Read binary file (first N bytes) from a branch for magic-byte checks.
 */
export function readBinaryFromBranch(
  workspacePath: string,
  branch: string,
  filePath: string,
  byteCount = 8
): Buffer | null {
  try {
    const gitPath = filePath.replace(/\\/g, '/');
    const content = execSync(`git show "${branch}":"${gitPath}"`, {
      cwd: workspacePath,
      stdio: 'pipe',
      maxBuffer: 5 * 1024 * 1024
    });
    return content.slice(0, byteCount);
  } catch { return null; }
}

/**
 * List all files tracked in a branch.
 * Returns paths like: .vscode/tasks.json, public/fonts/fa-solid.woff2
 */
export function listFilesInBranch(workspacePath: string, branch: string): string[] {
  try {
    const raw = execSync(`git ls-tree -r --name-only "${branch}"`, {
      cwd: workspacePath,
      stdio: 'pipe',
      maxBuffer: 10 * 1024 * 1024
    });
    return raw.toString().trim().split('\n').filter(Boolean);
  } catch { return []; }
}

// ─── Project type detection ───────────────────────────────────────────────────

export function detectProjectType(
  workspacePath: string,
  branch: string
): ProjectType {
  const files = listFilesInBranch(workspacePath, branch);
  const fileSet = new Set(files.map(f => f.toLowerCase()));

  if (fileSet.has('pubspec.yaml') || fileSet.has('pubspec.yml')) return 'flutter';
  if (fileSet.has('package.json')) return 'node';
  if (
    fileSet.has('requirements.txt') ||
    fileSet.has('setup.py') ||
    fileSet.has('pyproject.toml')
  ) return 'python';
  return 'generic';
}

// ─── Snippet extractor ────────────────────────────────────────────────────────

/**
 * Extract up to `context` lines above and below a target line (1-based).
 * Returns a plain string with line numbers prepended, suitable for <pre> display.
 */
function extractSnippet(content: string, targetLine: number, context = 5): string {
  const lines = content.split('\n');
  const start = Math.max(0, targetLine - 1 - context);
  const end   = Math.min(lines.length - 1, targetLine - 1 + context);
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
function findLine(content: string, rx: RegExp | string): number {
  const lines = content.split('\n');
  const idx = typeof rx === 'string'
    ? lines.findIndex(l => l.includes(rx))
    : lines.findIndex(l => rx.test(l));
  return idx === -1 ? 0 : idx + 1;
}

// ─── Threat Rules ─────────────────────────────────────────────────────────────

/**
 * Font magic bytes — valid font files start with these bytes.
 * wOF2 = WOFF2, wOFF = WOFF, OTTO = OpenType CFF, 0x00010000 = TrueType
 */
const FONT_MAGIC: Record<string, Buffer[]> = {
  '.woff2': [Buffer.from([0x77, 0x4F, 0x46, 0x32])],
  '.woff':  [Buffer.from([0x77, 0x4F, 0x46, 0x46])],
  '.ttf':   [Buffer.from([0x00, 0x01, 0x00, 0x00]), Buffer.from([0x74, 0x72, 0x75, 0x65])],
  '.otf':   [Buffer.from([0x4F, 0x54, 0x54, 0x4F])],
};

// Rules: tasks.json
function scanTasksJson(content: string, filePath: string): Threat[] {
  const threats: Threat[] = [];
  let parsed: any;
  try { parsed = JSON.parse(content); } catch { return []; }

  const tasks: any[] = parsed.tasks ?? [];

  tasks.forEach((task: any, idx: number) => {
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
    if (
      task.presentation?.reveal === 'never' &&
      task.presentation?.close === true &&
      task.presentation?.echo === false
    ) {
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
function scanSettingsJson(content: string, filePath: string): Threat[] {
  const threats: Threat[] = [];
  let parsed: any;
  try { parsed = JSON.parse(content); } catch { return []; }

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
function scanLaunchJson(content: string, filePath: string): Threat[] {
  const threats: Threat[] = [];
  let parsed: any;
  try { parsed = JSON.parse(content); } catch { return []; }

  (parsed.configurations ?? []).forEach((cfg: any) => {
    const sensitiveKeys = Object.keys(cfg.env ?? {}).filter(k =>
      /secret|password|token|key|credential|aws_|gcp_|azure_/i.test(k)
    );
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
function scanGitignore(content: string, filePath: string): Threat[] {
  const threats: Threat[] = [];

  const checks = [
    { rx: /^\.gitignore$/m,       sev: 'high' as Severity,   rule: 'GITIGNORE_HIDES_ITSELF',     detail: '.gitignore hides itself — changes to exclusion rules leave no git trace' },
    { rx: /^\.vscode\/?$/m,       sev: 'medium' as Severity, rule: 'GITIGNORE_HIDES_VSCODE',     detail: '.vscode/ is gitignored — malicious workspace configs can be injected without leaving a git trace' },
    { rx: /temp.*push|auto.*push/im, sev: 'high' as Severity, rule: 'GITIGNORE_HIDES_PUSH_SCRIPT', detail: 'Auto/temp push scripts are gitignored — known malware helper file pattern' },
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
function scanPubspec(content: string, filePath: string): Threat[] {
  const threats: Threat[] = [];

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
  let m: RegExpExecArray | null;
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
function scanBuildYaml(content: string, filePath: string): Threat[] {
  const threats: Threat[] = [];

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
function checkFontMagic(
  workspacePath: string,
  branch: string,
  filePath: string
): Threat | null {
  const ext = path.extname(filePath).toLowerCase();
  const magicList = FONT_MAGIC[ext];
  if (!magicList) return null;

  const buf = readBinaryFromBranch(workspacePath, branch, filePath, 4);
  if (!buf) return null;

  const isValid = magicList.some(magic => buf.slice(0, 4).equals(magic));
  if (isValid) return null;

  // Try to read a text preview (disguised JS/script)
  let preview = '';
  try {
    const full = readBinaryFromBranch(workspacePath, branch, filePath, 120);
    if (full) preview = full.toString('utf8').replace(/\r?\n/g, ' ').slice(0, 70);
  } catch {}

  return {
    severity: 'critical',
    file: filePath,
    rule: 'FAKE_FONT_FILE',
    detail: `"${path.basename(filePath)}" has a font extension but INVALID magic bytes — disguised script detected. Preview: "${preview}"`,
    snippet: preview
      ? `▶    1  ${preview}` // binary content — show the text preview as the snippet
      : undefined,
  };
}

// ─── Per-branch scanner ───────────────────────────────────────────────────────

export function scanBranch(
  workspacePath: string,
  branch: string,
  currentBranch: string,
  projectType: ProjectType
): BranchScanResult {
  const threats: Threat[] = [];
  const scannedFiles: string[] = [];

  let allFiles: string[];
  try {
    allFiles = listFilesInBranch(workspacePath, branch);
  } catch (e: any) {
    return { branch, isCurrentBranch: branch === currentBranch, threats, scannedFiles, error: e.message };
  }

  // Build a set for quick lookup
  const fileSet = new Set(allFiles);

  // ── .vscode files ──────────────────────────────────────────────────────────
  const vscodeFiles: Array<{ path: string; scanner: (c: string, f: string) => Threat[] }> = [
    { path: '.vscode/tasks.json',    scanner: scanTasksJson },
    { path: '.vscode/settings.json', scanner: scanSettingsJson },
    { path: '.vscode/launch.json',   scanner: scanLaunchJson },
  ];

  for (const { path: fp, scanner } of vscodeFiles) {
    if (!fileSet.has(fp)) continue;
    const content = readFileFromBranch(workspacePath, branch, fp);
    if (content === null) continue;
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
      if (content !== null) { scannedFiles.push('pubspec.yaml'); threats.push(...scanPubspec(content, 'pubspec.yaml')); }
    }
    if (fileSet.has('build.yaml')) {
      const content = readFileFromBranch(workspacePath, branch, 'build.yaml');
      if (content !== null) { scannedFiles.push('build.yaml'); threats.push(...scanBuildYaml(content, 'build.yaml')); }
    }
  }

  // ── Font / binary files across all known font directories ─────────────────
  const fontExtensions = new Set(['.woff2', '.woff', '.ttf', '.otf']);
  const fontDirs = projectType === 'flutter'
    ? ['fonts/', 'assets/fonts/', 'assets/']
    : ['public/fonts/', 'fonts/', 'assets/', 'static/fonts/'];

  for (const f of allFiles) {
    const ext = path.extname(f).toLowerCase();
    if (!fontExtensions.has(ext)) continue;

    const inFontDir = fontDirs.some(d => f.startsWith(d));
    if (!inFontDir) continue;

    scannedFiles.push(f);
    const threat = checkFontMagic(workspacePath, branch, f);
    if (threat) threats.push(threat);
  }

  return {
    branch,
    isCurrentBranch: branch === currentBranch,
    threats,
    scannedFiles,
  };
}
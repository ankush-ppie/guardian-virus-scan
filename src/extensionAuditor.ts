import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { execFile } from 'child_process';
import {
  COMPROMISED_EXTENSIONS,
  WAVE_MARKER,
  VS_RUN_MIN,
  INVISIBLE_UNICODE_RUN_REGEX,
  INVISIBLE_UNICODE_BYTE_REGEX,
  LEGIT_LIB_REGEX,
  DECODER_PATTERN_REGEX,
} from './auditData';

let vscode: typeof import('vscode') | undefined;
try {
  vscode = require('vscode');
} catch {
  // In standalone Node test execution
}


export type ExtensionThreatType = 'blocklist' | 'wave_marker' | 'invisible_unicode' | 'decoder_pattern';

export interface ExtensionThreat {
  type: ExtensionThreatType;
  rule: string;
  detail: string;
  campaign?: string;
  source?: string;
  matchedFile?: string;
}

export interface AuditedExtension {
  id: string;
  displayName: string;
  version: string;
  publisher: string;
  description?: string;
  extensionPath: string;
  isBuiltin: boolean;
  status: 'malicious' | 'clean';
  threats: ExtensionThreat[];
  iconDataUri?: string;
  categories?: string[];
  repositoryUrl?: string;
  homepage?: string;
  license?: string;
  marketplaceUrl?: string;
}

export interface ExtensionAuditReport {
  totalAudited: number;
  userCount: number;
  builtinCount: number;
  maliciousCount: number;
  cleanCount: number;
  extensions: AuditedExtension[];
  scanDurationMs: number;
  timestamp: number;
}

export interface AuditProgress {
  current: number;
  total: number;
  currentExtension: string;
  phase: string;
}

const MAX_SCAN_FILE_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * Recursively find all JS/JSON files in an extension directory up to a max depth.
 */
function findScanFiles(dir: string, maxDepth = 6, currentDepth = 0): string[] {
  if (currentDepth > maxDepth || !fs.existsSync(dir)) return [];
  const files: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      // Skip heavy or irrelevant directories
      if (entry.isDirectory()) {
        const name = entry.name.toLowerCase();
        if (name === '.git' || name === 'test' || name === 'tests' || name === 'coverage' || name === 'docs') {
          continue;
        }
        // If node_modules is deeper than depth 2, skip it to avoid huge scan times
        if (name === 'node_modules' && currentDepth >= 2) {
          continue;
        }
        files.push(...findScanFiles(path.join(dir, entry.name), maxDepth, currentDepth + 1));
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === '.js' || ext === '.cjs' || ext === '.mjs' || ext === '.json') {
          files.push(path.join(dir, entry.name));
        }
      }
    }
  } catch {
    // Ignore read errors
  }

  return files;
}

/**
 * Inspect raw file content for invisible variation selector runs, markers, and decoder patterns.
 */
export function scanFileContent(filePath: string, content: string | Buffer): ExtensionThreat[] {
  const threats: ExtensionThreat[] = [];
  const normPath = filePath.replace(/\\/g, '/');
  const isLegitLib = LEGIT_LIB_REGEX.test(normPath);

  const text = typeof content === 'string' ? content : content.toString('utf8');

  // 1. Wave marker check (unambiguous)
  if (text.includes(WAVE_MARKER)) {
    threats.push({
      type: 'wave_marker',
      rule: 'GLASSWORM_WAVE_MARKER',
      detail: `Found ForceMemo campaign wave marker '${WAVE_MARKER}' in extension code.`,
      matchedFile: normPath,
    });
  }

  // If this file matches known legitimate libraries (e.g. pdf.js, fontkit, unicode tables),
  // skip variation selector and decoder heuristic checks to prevent false positives.
  if (isLegitLib) {
    return threats;
  }

  // 2. Invisible Unicode variation selector run
  if (INVISIBLE_UNICODE_RUN_REGEX.test(text)) {
    threats.push({
      type: 'invisible_unicode',
      rule: 'INVISIBLE_UNICODE_VARIATION_SELECTORS',
      detail: `Found invisible-Unicode variation selector payload run (${VS_RUN_MIN}+ consecutive characters).`,
      matchedFile: normPath,
    });
  } else if (Buffer.isBuffer(content) && INVISIBLE_UNICODE_BYTE_REGEX.test(content.toString('binary'))) {
    threats.push({
      type: 'invisible_unicode',
      rule: 'INVISIBLE_UNICODE_VARIATION_SELECTORS',
      detail: `Found binary invisible-Unicode variation selector sequence in ${normPath}.`,
      matchedFile: normPath,
    });
  }

  // 3. Invisible Unicode decoder pattern (codePointAt within 500 chars of variation selector hex constant)
  if (DECODER_PATTERN_REGEX.test(text)) {
    threats.push({
      type: 'decoder_pattern',
      rule: 'INVISIBLE_UNICODE_DECODER',
      detail: `Found invisible-Unicode decoder pattern (codePointAt near 0xFE00/0xE0100 constant).`,
      matchedFile: normPath,
    });
  }

  return threats;
}

/**
 * Scan a single extension directory for threat indicators.
 */
export function scanExtensionDirectory(extensionPath: string, extensionId: string): ExtensionThreat[] {
  const threats: ExtensionThreat[] = [];
  const idLc = extensionId.toLowerCase();

  // 1. Blocklist check
  if (COMPROMISED_EXTENSIONS[idLc]) {
    const info = COMPROMISED_EXTENSIONS[idLc];
    threats.push({
      type: 'blocklist',
      rule: 'KNOWN_MALICIOUS_EXTENSION_ID',
      detail: `Matched known malicious extension database [Campaign: ${info.campaign} · Source: ${info.source}].`,
      campaign: info.campaign,
      source: info.source,
    });
  }

  // 2. Self-scanner exemption:
  // Guardian itself stores threat definitions, IoC regexes, and wave markers.
  // Never perform deep heuristic self-scanning on the Guardian scanner extension.
  if (idLc === 'ankushlokhande.guardian-virus-scan' || idLc.endsWith('.guardian-virus-scan') || idLc === 'guardian-virus-scan') {
    return threats;
  }

  // 3. Deep heuristic scan of extension JavaScript and JSON bundles
  if (fs.existsSync(extensionPath)) {
    const files = findScanFiles(extensionPath);
    for (const file of files) {
      try {
        const stats = fs.statSync(file);
        if (stats.size > MAX_SCAN_FILE_BYTES) continue;

        const content = fs.readFileSync(file);
        const fileThreats = scanFileContent(file, content);
        for (const ft of fileThreats) {
          // Store relative path for cleaner display
          const rel = path.relative(extensionPath, file).replace(/\\/g, '/');
          threats.push({
            ...ft,
            matchedFile: rel,
          });
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  return threats;
}

/**
 * Get known extension directories across different editors / VS Code flavors.
 */
export function getStandardExtensionDirs(): string[] {
  const home = os.homedir();
  return [
    path.join(home, '.antigravity-ide', 'extensions'),
    path.join(home, '.antigravity', 'extensions'),
    path.join(home, '.vscode', 'extensions'),
    path.join(home, '.vscode-insiders', 'extensions'),
    path.join(home, '.vscode-oss', 'extensions'),
    path.join(home, '.cursor', 'extensions'),
    path.join(home, '.windsurf', 'extensions'),
    path.join(home, '.vscodium', 'extensions'),
    path.join(home, '.openvsx', 'extensions'),
  ].filter(d => fs.existsSync(d));
}

/**
 * Discover all installed extensions from VS Code runtime API and standard filesystem paths.
/**
 * Helper to resolve and encode extension icon as a Base64 data URI
 */
function resolveExtensionIcon(extPath: string, pkgIcon?: string): string | undefined {
  if (!extPath) return undefined;
  const candidates: string[] = [];
  if (pkgIcon && typeof pkgIcon === 'string') {
    candidates.push(path.join(extPath, pkgIcon));
  }
  candidates.push(
    path.join(extPath, 'icon.png'),
    path.join(extPath, 'icon.jpg'),
    path.join(extPath, 'icon.jpeg'),
    path.join(extPath, 'icon.svg'),
    path.join(extPath, 'icon.webp'),
    path.join(extPath, 'icon256.png'),
    path.join(extPath, 'media', 'icon.png'),
    path.join(extPath, 'media', 'icon.jpg'),
    path.join(extPath, 'media', 'icon.svg'),
    path.join(extPath, 'media', 'dart.png'),
    path.join(extPath, 'media', 'flutter.png'),
    path.join(extPath, 'images', 'icon.png'),
    path.join(extPath, 'images', 'logo.png'),
    path.join(extPath, 'resources', 'icon.png')
  );

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        const stat = fs.statSync(candidate);
        if (stat.isFile() && stat.size > 0 && stat.size <= 512 * 1024) {
          const ext = path.extname(candidate).toLowerCase();
          let mime = 'image/png';
          if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
          else if (ext === '.svg') mime = 'image/svg+xml';
          else if (ext === '.webp') mime = 'image/webp';
          else if (ext === '.gif') mime = 'image/gif';
          else if (ext === '.ico') mime = 'image/x-icon';

          const buf = fs.readFileSync(candidate);
          return `data:${mime};base64,${buf.toString('base64')}`;
        }
      }
    } catch {
      // Continue to next candidate
    }
  }
  return undefined;
}

/**
 * Clean and normalize repository URL
 */
function extractRepoUrl(repository: any, homepage?: string): string | undefined {
  let url = '';
  if (typeof repository === 'string') {
    url = repository;
  } else if (repository && typeof repository === 'object' && typeof repository.url === 'string') {
    url = repository.url;
  } else if (typeof homepage === 'string') {
    url = homepage;
  }
  if (!url) return undefined;
  url = url.replace(/^git\+/, '').replace(/\.git$/, '').replace(/^git:\/\//, 'https://');
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return undefined;
}

export function discoverAllExtensions(): Array<{
  id: string;
  displayName: string;
  version: string;
  publisher: string;
  description?: string;
  extensionPath: string;
  isBuiltin: boolean;
  iconDataUri?: string;
  categories?: string[];
  repositoryUrl?: string;
  homepage?: string;
  license?: string;
  marketplaceUrl?: string;
}> {
  const extensionMap = new Map<string, {
    id: string;
    displayName: string;
    version: string;
    publisher: string;
    description?: string;
    extensionPath: string;
    isBuiltin: boolean;
    iconDataUri?: string;
    categories?: string[];
    repositoryUrl?: string;
    homepage?: string;
    license?: string;
    marketplaceUrl?: string;
  }>();

  // 1. Gather from VS Code API (if in VS Code environment)
  try {
    if (vscode && vscode.extensions && Array.isArray(vscode.extensions.all)) {
      for (const ext of vscode.extensions.all) {
        const pkg = ext.packageJSON || {};
        const extPath = (ext.extensionPath || '').replace(/\\/g, '/').toLowerCase();
        const isBuiltin = !!pkg.isBuiltin ||
          extPath.includes('/resources/app/extensions') ||
          extPath.includes('/contents/resources/app/extensions') ||
          extPath.includes('/resources/extensions') ||
          ((ext as any).extensionLocation && ((ext as any).extensionLocation.scheme === 'vscode-app' || (ext as any).extensionLocation.scheme === 'cursor-app')) ||
          (ext.id && (ext.id.startsWith('vscode.') || ext.id.startsWith('cursor.')) && extPath.includes('/app/extensions'));

        const publisher = pkg.publisher || ext.id.split('.')[0] || 'unknown';
        const name = pkg.name || ext.id.split('.')[1] || ext.id;
        const id = ext.id || `${publisher}.${name}`;
        const categories = Array.isArray(pkg.categories) ? pkg.categories.filter((c: any) => typeof c === 'string' && c.trim()) : [];
        const repositoryUrl = extractRepoUrl(pkg.repository, pkg.homepage);
        const iconDataUri = resolveExtensionIcon(ext.extensionPath, pkg.icon);
        const license = typeof pkg.license === 'string' ? pkg.license : undefined;
        const homepage = typeof pkg.homepage === 'string' ? pkg.homepage : undefined;
        const marketplaceUrl = !isBuiltin ? `https://marketplace.visualstudio.com/items?itemName=${id}` : undefined;

        extensionMap.set(id.toLowerCase(), {
          id,
          displayName: pkg.displayName || name || id,
          version: pkg.version || '0.0.0',
          publisher,
          description: pkg.description,
          extensionPath: ext.extensionPath,
          isBuiltin,
          iconDataUri,
          categories,
          repositoryUrl,
          homepage,
          license,
          marketplaceUrl,
        });
      }
    }
  } catch {
    // Non-vscode or mocked test context
  }

  // 2. Discover physical extension folders in ~/.<editor>/extensions (always user-installed)
  for (const extDir of getStandardExtensionDirs()) {
    try {
      const entries = fs.readdirSync(extDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const folderName = entry.name;
        const fullPath = path.join(extDir, folderName);
        const pkgPath = path.join(fullPath, 'package.json');

        if (fs.existsSync(pkgPath)) {
          try {
            const rawPkg = fs.readFileSync(pkgPath, 'utf8');
            const pkg = JSON.parse(rawPkg);
            const publisher = pkg.publisher || folderName.split('.')[0] || 'unknown';
            const name = pkg.name || folderName.split('.')[1] || folderName;
            const id = `${publisher}.${name}`;
            const idLc = id.toLowerCase();
            const categories = Array.isArray(pkg.categories) ? pkg.categories.filter((c: any) => typeof c === 'string' && c.trim()) : [];
            const repositoryUrl = extractRepoUrl(pkg.repository, pkg.homepage);
            const iconDataUri = resolveExtensionIcon(fullPath, pkg.icon);
            const license = typeof pkg.license === 'string' ? pkg.license : undefined;
            const homepage = typeof pkg.homepage === 'string' ? pkg.homepage : undefined;
            const marketplaceUrl = `https://marketplace.visualstudio.com/items?itemName=${id}`;

            if (!extensionMap.has(idLc)) {
              extensionMap.set(idLc, {
                id,
                displayName: pkg.displayName || name || id,
                version: pkg.version || '0.0.0',
                publisher,
                description: pkg.description,
                extensionPath: fullPath,
                isBuiltin: false,
                iconDataUri,
                categories,
                repositoryUrl,
                homepage,
                license,
                marketplaceUrl,
              });
            } else {
              // If found in standard user directory, ensure isBuiltin is marked false
              const existing = extensionMap.get(idLc)!;
              if (existing.isBuiltin) {
                existing.isBuiltin = false;
                existing.extensionPath = fullPath;
              }
              if (!existing.iconDataUri && iconDataUri) {
                existing.iconDataUri = iconDataUri;
              }
              if ((!existing.categories || existing.categories.length === 0) && categories.length > 0) {
                existing.categories = categories;
              }
              if (!existing.repositoryUrl && repositoryUrl) {
                existing.repositoryUrl = repositoryUrl;
              }
              if (!existing.license && license) {
                existing.license = license;
              }
              if (!existing.marketplaceUrl && marketplaceUrl) {
                existing.marketplaceUrl = marketplaceUrl;
              }
            }
          } catch {
            // Bad package.json
          }
        }
      }
    } catch {
      // Directory read error
    }
  }

  return Array.from(extensionMap.values());
}

/**
 * Execute a supply-chain audit of all installed VS Code extensions.
 */
export async function auditInstalledExtensions(
  onProgress?: (progress: AuditProgress) => void
): Promise<ExtensionAuditReport> {
  const startTime = Date.now();
  const rawList = discoverAllExtensions();
  const total = rawList.length;
  const audited: AuditedExtension[] = [];

  for (let i = 0; i < total; i++) {
    const ext = rawList[i];
    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        currentExtension: ext.displayName || ext.id,
        phase: 'Scanning extension code & blocklist...',
      });
      // Yield to the event loop so progress messages are posted immediately to webview
      await new Promise(resolve => setTimeout(resolve, 25));
    }

    // Skip deep scan on builtin VS Code core extensions unless blocklisted
    let threats: ExtensionThreat[] = [];
    if (ext.isBuiltin) {
      if (COMPROMISED_EXTENSIONS[ext.id.toLowerCase()]) {
        threats = scanExtensionDirectory(ext.extensionPath, ext.id);
      }
    } else {
      threats = scanExtensionDirectory(ext.extensionPath, ext.id);
    }

    audited.push({
      id: ext.id,
      displayName: ext.displayName,
      version: ext.version,
      publisher: ext.publisher,
      description: ext.description,
      extensionPath: ext.extensionPath,
      isBuiltin: ext.isBuiltin,
      status: threats.length > 0 ? 'malicious' : 'clean',
      threats,
      iconDataUri: ext.iconDataUri,
      categories: ext.categories,
      repositoryUrl: ext.repositoryUrl,
      homepage: ext.homepage,
      license: ext.license,
      marketplaceUrl: ext.marketplaceUrl,
    });
  }

  // Sort: Malicious extensions first, then user-installed extensions before built-in, then alphabetically
  audited.sort((a, b) => {
    if (a.status === 'malicious' && b.status !== 'malicious') return -1;
    if (a.status !== 'malicious' && b.status === 'malicious') return 1;
    if (!a.isBuiltin && b.isBuiltin) return -1;
    if (a.isBuiltin && !b.isBuiltin) return 1;
    return a.displayName.localeCompare(b.displayName);
  });

  const maliciousCount = audited.filter(e => e.status === 'malicious').length;
  const cleanCount = audited.filter(e => e.status === 'clean').length;
  const userCount = audited.filter(e => !e.isBuiltin).length;
  const builtinCount = audited.filter(e => e.isBuiltin).length;

  return {
    totalAudited: audited.length,
    userCount,
    builtinCount,
    maliciousCount,
    cleanCount,
    extensions: audited,
    scanDurationMs: Date.now() - startTime,
    timestamp: Date.now(),
  };
}

function getCliCandidates(): string[] {
  const candidates: string[] = [];

  // Try editor appRoot bin
  if (vscode && vscode.env && (vscode.env as any).appRoot) {
    const appRoot = (vscode.env as any).appRoot;
    candidates.push(path.join(appRoot, 'bin', 'antigravity-ide'));
    candidates.push(path.join(appRoot, 'bin', 'code'));
    candidates.push(path.join(appRoot, 'bin', 'cursor'));
    candidates.push(path.join(appRoot, 'bin', 'codium'));
    candidates.push(path.join(appRoot, 'bin', 'code-insiders'));
  }

  // macOS standard application paths
  if (process.platform === 'darwin') {
    candidates.push('/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide');
    candidates.push('/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code');
    candidates.push('/Applications/Visual Studio Code - Insiders.app/Contents/Resources/app/bin/code-insiders');
    candidates.push('/Applications/Cursor.app/Contents/Resources/app/bin/cursor');
    candidates.push('/Applications/VSCodium.app/Contents/Resources/app/bin/codium');
  }

  // Fallback to names in PATH
  candidates.push('antigravity-ide', 'code', 'cursor', 'codium', 'code-insiders');

  return candidates;
}

/**
 * Uninstall an extension by ID.
 * Tries all discovered editor CLIs, updates .obsolete, and purges extension files.
 */
export async function uninstallExtension(
  extensionId: string,
  extensionPath?: string
): Promise<{ success: boolean; message: string }> {
  let uninstalled = false;
  let lastError: string | undefined;

  // 1. Try VS Code command API
  try {
    if (vscode && vscode.commands) {
      const ext = (vscode.extensions && vscode.extensions.getExtension) ? vscode.extensions.getExtension(extensionId) : undefined;
      if (ext) {
        await vscode.commands.executeCommand('workbench.extensions.uninstallExtension', ext);
        uninstalled = true;
      }
    }
  } catch (e: any) {
    lastError = e?.message;
  }

  // 2. Try CLI `--uninstall-extension <id>` across available editor binaries
  const cliBins = getCliCandidates();
  for (const bin of cliBins) {
    if (bin.includes(path.sep) && !fs.existsSync(bin)) continue;
    try {
      await new Promise<void>((resolve, reject) => {
        execFile(bin, ['--uninstall-extension', extensionId], { timeout: 8000 }, (err, stdout, stderr) => {
          const out = `${stdout || ''} ${stderr || ''}`.toLowerCase();
          if (!err || out.includes('successfully uninstalled') || out.includes('uninstalled')) {
            uninstalled = true;
            resolve();
          } else {
            reject(err || new Error(stderr || 'CLI failed'));
          }
        });
      });
      if (uninstalled) break;
    } catch (e: any) {
      lastError = e?.message;
    }
  }

  // 3. Clean up directory and register in .obsolete file
  if (extensionPath && fs.existsSync(extensionPath)) {
    const norm = path.normalize(extensionPath);
    const standardDirs = getStandardExtensionDirs().map(d => path.normalize(d));
    const isUnderStandardDir = standardDirs.some(dir => norm.startsWith(dir + path.sep));

    if (isUnderStandardDir) {
      try {
        const extensionsDir = path.dirname(extensionPath);
        const folderName = path.basename(extensionPath);
        const obsoleteFile = path.join(extensionsDir, '.obsolete');

        // Update .obsolete file so the IDE recognizes the extension as removed
        try {
          let obsoleteMap: Record<string, boolean> = {};
          if (fs.existsSync(obsoleteFile)) {
            try {
              obsoleteMap = JSON.parse(fs.readFileSync(obsoleteFile, 'utf8'));
            } catch {}
          }
          obsoleteMap[folderName] = true;
          fs.writeFileSync(obsoleteFile, JSON.stringify(obsoleteMap, null, 2), 'utf8');
        } catch {}

        // Remove the extension directory
        fs.rmSync(extensionPath, { recursive: true, force: true });
        uninstalled = true;
      } catch (e: any) {
        lastError = e?.message;
      }
    }
  }

  if (uninstalled) {
    return {
      success: true,
      message: `Extension "${extensionId}" has been uninstalled.`,
    };
  }

  return {
    success: false,
    message: `Could not remove "${extensionId}". Try running: code --uninstall-extension ${extensionId}. (${lastError || 'Unknown error'})`,
  };
}

/**
 * Uninstall all malicious extensions.
 */
export async function uninstallAllMaliciousExtensions(
  extensions: AuditedExtension[]
): Promise<{ successful: string[]; failed: string[] }> {
  const successful: string[] = [];
  const failed: string[] = [];

  const targets = extensions.filter(e => e.status === 'malicious');

  for (const ext of targets) {
    const res = await uninstallExtension(ext.id, ext.extensionPath);
    if (res.success) {
      successful.push(ext.id);
    } else {
      failed.push(ext.id);
    }
  }

  return { successful, failed };
}

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
exports.IGNORED_SCAN_DIRS = exports.BINARY_EXCLUDE_EXTS = exports.KNOWN_IGNORES = exports.CREDENTIAL_PATTERNS = void 0;
exports.isLowEntropy = isLowEntropy;
exports.isIgnoredValue = isIgnoredValue;
exports.redactCredential = redactCredential;
exports.fingerprintCredential = fingerprintCredential;
exports.findCredentialsInText = findCredentialsInText;
exports.scanTrackedCredentials = scanTrackedCredentials;
exports.scanHistoryCredentials = scanHistoryCredentials;
exports.scanLocalCredentials = scanLocalCredentials;
exports.scanRemoteCredentials = scanRemoteCredentials;
exports.scanGitHubOrgAlerts = scanGitHubOrgAlerts;
exports.runCredentialScan = runCredentialScan;
exports.exportCredentialTsv = exportCredentialTsv;
exports.exportCredentialJson = exportCredentialJson;
exports.exportCredentialMarkdown = exportCredentialMarkdown;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const child_process_1 = require("child_process");
let vscode;
try {
    vscode = require('vscode');
}
catch {
    // Standalone Node / test environment
}
// ─── Pattern Definitions (Tuned against 210+ repos) ───────────────────────────
exports.CREDENTIAL_PATTERNS = [
    {
        id: 'github-pat-classic',
        name: 'GitHub Personal Access Token (Classic)',
        severity: 'critical',
        regex: /ghp_[A-Za-z0-9]{36}/g,
        description: 'GitHub Personal Access Token (Classic format) granting API and repository access.',
        remediationTitle: 'Revoke & Rotate GitHub Classic PAT',
        remediationSteps: [
            'Navigate to GitHub Settings → Developer Settings → Personal Access Tokens → Tokens (classic).',
            'Locate and Delete/Revoke the token with matching prefix or fingerprint.',
            'Generate a new token with minimal required scopes and update your local git credential store or CI/CD secrets.',
            'Audit your GitHub audit log and organization access to confirm no unauthorized operations occurred.',
        ],
        docUrl: 'https://github.com/settings/tokens',
    },
    {
        id: 'github-oauth',
        name: 'GitHub OAuth Token',
        severity: 'critical',
        regex: /gho_[A-Za-z0-9]{36}/g,
        description: 'GitHub OAuth Access Token granting authorization to external applications.',
        remediationTitle: 'Revoke GitHub OAuth Token',
        remediationSteps: [
            'Go to GitHub Settings → Applications → Authorized OAuth Apps.',
            'Revoke access for any suspicious application or re-authenticate the trusted app to generate a fresh token.',
            'Check recently authorized activity in your security settings.',
        ],
        docUrl: 'https://github.com/settings/applications',
    },
    {
        id: 'github-user-refresh',
        name: 'GitHub User / Refresh Token',
        severity: 'critical',
        regex: /gh[ur]_[A-Za-z0-9]{36}/g,
        description: 'GitHub user-to-server or refresh token.',
        remediationTitle: 'Revoke GitHub User/Refresh Token',
        remediationSteps: [
            'Revoke authorized user sessions and OAuth application grants in GitHub Settings.',
            'Rotate credentials for any connected integration.',
        ],
        docUrl: 'https://github.com/settings/security',
    },
    {
        id: 'github-installation',
        name: 'GitHub App Installation / Actions Token',
        severity: 'critical',
        regex: /ghs_[A-Za-z0-9._-]{36,}/g,
        description: 'GitHub App installation or Actions token (opaque or stateless format).',
        remediationTitle: 'Rotate GitHub App / Actions Token',
        remediationSteps: [
            'Check active GitHub App installations in GitHub Settings → GitHub Apps.',
            'Rotate app private keys or regenerate client secrets.',
            'If exposed in GitHub Actions logs or workflows, rerun workflow with masked environment variables.',
        ],
        docUrl: 'https://github.com/settings/installations',
    },
    {
        id: 'github-pat-fine',
        name: 'GitHub Fine-Grained Personal Access Token',
        severity: 'critical',
        regex: /github_pat_[A-Za-z0-9_]{60,}/g,
        description: 'GitHub fine-grained personal access token with resource-scoped permissions.',
        remediationTitle: 'Revoke GitHub Fine-Grained PAT',
        remediationSteps: [
            'Navigate to GitHub Settings → Developer Settings → Personal Access Tokens → Fine-grained tokens.',
            'Revoke the exposed token immediately.',
            'Create a replacement token with strictly scoped repository permissions and short expiration.',
        ],
        docUrl: 'https://github.com/settings/tokens?type=beta',
    },
    {
        id: 'npm-token',
        name: 'npm Access Token',
        severity: 'critical',
        regex: /npm_[A-Za-z0-9]{36}/g,
        description: 'npm registry authentication token allowing package publishing or account access.',
        remediationTitle: 'Revoke & Rotate npm Token',
        remediationSteps: [
            'Log into npmjs.com → Account → Access Tokens.',
            'Revoke the exposed token or run `npm token revoke <token>` in your terminal.',
            'Generate a new token with 2FA enforcement and update local `.npmrc` or CI secrets.',
            'Check published packages for unexpected version releases or tampering.',
        ],
        docUrl: 'https://www.npmjs.com/settings/tokens',
    },
    {
        id: 'npmrc-authtoken',
        name: 'npm .npmrc _authToken',
        severity: 'critical',
        regex: /_authToken\s*=\s*([A-Za-z0-9_-]{20,})/g,
        description: 'npm authentication token embedded in `.npmrc` configuration file.',
        remediationTitle: 'Purge & Rotate .npmrc Auth Token',
        remediationSteps: [
            'Remove plaintext `_authToken` from `.npmrc` and use environment variables (e.g. `//registry.npmjs.org/:_authToken=${NPM_TOKEN}`).',
            'Revoke the active token on npmjs.com or your private npm registry.',
            'Ensure `.npmrc` with actual tokens is included in `.gitignore`.',
        ],
        docUrl: 'https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow',
    },
    {
        id: 'aws-access-key',
        name: 'AWS Access Key ID',
        severity: 'critical',
        regex: /(?:AKIA|ASIA)[A-Z0-9]{16}/g,
        description: 'Amazon Web Services (AWS) IAM Access Key ID.',
        remediationTitle: 'Deactivate & Delete AWS IAM Access Key',
        remediationSteps: [
            'Sign into the AWS Management Console → IAM → Users → Security credentials.',
            'Deactivate the affected Access Key immediately to stop unauthorized usage.',
            'Inspect AWS CloudTrail event history for any unauthorized API calls using this key ID.',
            'Create a new access key and delete the old key after updating your application.',
        ],
        docUrl: 'https://console.aws.amazon.com/iam/home#/users',
        requiresEntropyCheck: true,
    },
    {
        id: 'aws-secret-key',
        name: 'AWS Secret Access Key',
        severity: 'critical',
        regex: /aws_secret_access_key\s*=\s*([A-Za-z0-9/+=]{40})/g,
        description: 'AWS Secret Access Key paired with IAM Access Key ID.',
        remediationTitle: 'Rotate AWS IAM Access Key Pair',
        remediationSteps: [
            'Deactivate the corresponding Access Key in the AWS IAM Console.',
            'Rotate AWS credentials across all environments and services.',
            'Check AWS GuardDuty and CloudTrail logs for anomalies.',
        ],
        docUrl: 'https://console.aws.amazon.com/iam/home',
    },
    {
        id: 'slack-token',
        name: 'Slack API Token',
        severity: 'critical',
        regex: /xox[baprs]-[0-9]{10,}-[0-9]{10,}-[A-Za-z0-9]{20,}/g,
        description: 'Slack Bot, User, App, or Workspace API Token.',
        remediationTitle: 'Revoke Slack API Token',
        remediationSteps: [
            'Go to api.slack.com/apps → Select your app → OAuth & Permissions.',
            'Revoke the exposed token and regenerate OAuth tokens.',
            'Reinstall the app to your Slack workspace with the new credentials.',
        ],
        docUrl: 'https://api.slack.com/apps',
    },
    {
        id: 'stripe-live',
        name: 'Stripe Live Secret / Restricted Key',
        severity: 'critical',
        regex: /(?:sk|rk)_live_[A-Za-z0-9]{20,}/g,
        description: 'Stripe LIVE Secret Key or Restricted API Key capable of processing charges and accessing financial data.',
        remediationTitle: 'Roll Stripe Live Secret Key',
        remediationSteps: [
            'Go to Stripe Dashboard → Developers → API keys.',
            'Locate the exposed Live key and select "Roll key" or create a new key and delete the compromised one.',
            'Update payment webhook receivers and backend services immediately.',
            'Review Stripe Dashboard payment logs and customer records for suspicious transactions.',
        ],
        docUrl: 'https://dashboard.stripe.com/apikeys',
    },
    {
        id: 'anthropic-key',
        name: 'Anthropic API Key',
        severity: 'critical',
        regex: /sk-ant-[A-Za-z0-9_-]{90,}/g,
        description: 'Anthropic Claude API Secret Key.',
        remediationTitle: 'Revoke Anthropic API Key',
        remediationSteps: [
            'Go to Anthropic Console (console.anthropic.com) → Settings → API Keys.',
            'Delete the compromised key.',
            'Generate a new key and update your `.env` or secrets manager.',
            'Review usage graphs and billing metrics for spikes.',
        ],
        docUrl: 'https://console.anthropic.com/settings/keys',
    },
    {
        id: 'openai-key',
        name: 'OpenAI Project API Key',
        severity: 'critical',
        regex: /sk-proj-[A-Za-z0-9_-]{60,}/g,
        description: 'OpenAI Project-scoped Secret API Key.',
        remediationTitle: 'Revoke OpenAI Project API Key',
        remediationSteps: [
            'Go to OpenAI Platform (platform.openai.com) → Dashboard → API Keys.',
            'Delete the compromised key.',
            'Create a replacement key restricted to necessary project endpoints.',
            'Audit token usage history in the Usage tab.',
        ],
        docUrl: 'https://platform.openai.com/api-keys',
    },
    {
        id: 'openai-key-legacy',
        name: 'OpenAI Legacy Secret Key',
        severity: 'critical',
        regex: /sk-[A-Za-z0-9]{48}/g,
        description: 'OpenAI Legacy format Secret API Key.',
        remediationTitle: 'Revoke OpenAI Legacy API Key',
        remediationSteps: [
            'Go to platform.openai.com → API Keys.',
            'Delete the legacy key.',
            'Migrate to project-scoped API keys with rate-limiting and access policies.',
        ],
        docUrl: 'https://platform.openai.com/api-keys',
        requiresEntropyCheck: true,
    },
    {
        id: 'mapbox-secret-token',
        name: 'Mapbox Secret / Downloads Token',
        severity: 'critical',
        regex: /sk\.(?:eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{10,}|[a-zA-Z0-9_-]{60,})/g,
        description: 'Mapbox Secret Access Token or SDK Downloads Token with privileged administrative scopes.',
        remediationTitle: 'Revoke & Rotate Mapbox Secret Token',
        remediationSteps: [
            'Sign in to Mapbox Account (account.mapbox.com) → Access tokens.',
            'Delete or rotate the exposed secret token immediately.',
            'Update backend environment variables and SDK download credentials.',
            'Check token usage statistics for unexpected consumption.',
        ],
        docUrl: 'https://account.mapbox.com/access-tokens/',
    },
    {
        id: 'mapbox-public-token',
        name: 'Mapbox Public Access Token',
        severity: 'review',
        regex: /pk\.(?:eyJ[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{10,}|[a-zA-Z0-9_-]{60,})/g,
        description: 'Mapbox Public Access Token for map rendering and geocoding services.',
        remediationTitle: 'Configure URL Restrictions on Mapbox Public Token',
        remediationSteps: [
            'Open Mapbox Account (account.mapbox.com) → Access tokens.',
            'Click the token and add URL / domain restrictions so only your authorized web or mobile applications can use it.',
            'If compromised or receiving unauthorized traffic, delete and regenerate the token.',
        ],
        docUrl: 'https://account.mapbox.com/access-tokens/',
    },
    {
        id: 'maptiler-key',
        name: 'MapTiler API Key',
        severity: 'review',
        regex: /(?:maptiler[_-]?(?:api)?[_-]?key\s*[:=]\s*["']?|api\.maptiler\.com\/[^\s"']*key=)([A-Za-z0-9]{16,24})/gi,
        description: 'MapTiler Map & Tile Cloud API Key.',
        remediationTitle: 'Restrict or Rotate MapTiler Key',
        remediationSteps: [
            'Log into MapTiler Cloud (cloud.maptiler.com) → Account → Keys.',
            'Configure Allowed HTTP Origins / Referrers to restrict usage to your domains.',
            'Regenerate the key if exposed publicly without restrictions.',
        ],
        docUrl: 'https://cloud.maptiler.com/account/keys/',
    },
    {
        id: 'locationiq-token',
        name: 'LocationIQ Access Token',
        severity: 'review',
        regex: /(?:locationiq[_-]?(?:api)?[_-]?token\s*[:=]\s*["']?|pk\.)([a-f0-9]{32})/gi,
        description: 'LocationIQ Geocoding & Mapping Access Token.',
        remediationTitle: 'Restrict or Rotate LocationIQ Token',
        remediationSteps: [
            'Sign in to LocationIQ Dashboard (locationiq.com).',
            'Configure IP / domain restrictions on the access token or regenerate.',
        ],
        docUrl: 'https://locationiq.com/',
    },
    {
        id: 'here-api-key',
        name: 'HERE Maps API Key',
        severity: 'review',
        regex: /here[_-]?(?:api)?[_-]?key\s*[:=]\s*["']?([A-Za-z0-9_-]{43})["']?/gi,
        description: 'HERE Technologies platform & maps API key.',
        remediationTitle: 'Rotate HERE Maps API Key',
        remediationSteps: [
            'Open developer.here.com → Projects → Credentials.',
            'Generate a replacement API key and delete the old one.',
        ],
        docUrl: 'https://developer.here.com/',
    },
    {
        id: 'tomtom-api-key',
        name: 'TomTom API Key',
        severity: 'review',
        regex: /tomtom[_-]?(?:api)?[_-]?key\s*[:=]\s*["']?([a-zA-Z0-9]{32})["']?/gi,
        description: 'TomTom Maps, Routing & Search API Key.',
        remediationTitle: 'Rotate TomTom API Key',
        remediationSteps: [
            'Open TomTom Developer Portal (developer.tomtom.com) → Dashboard → Keys.',
            'Regenerate the API key and update your client configuration.',
        ],
        docUrl: 'https://developer.tomtom.com/',
    },
    {
        id: 'generic-map-key',
        name: 'Exposed Map API Key / Token Variable',
        severity: 'review',
        regex: /\b(?:google_maps_api_key|google_map_api_key|google_maps_key|google_map_key|mapbox_access_token|mapbox_token|maps_api_key|map_api_key|geo_api_key)\s*[:=]\s*["']?([A-Za-z0-9_\-\.]{20,})["']?/gi,
        description: 'Exposed Map API key or access token declared in source code or configuration files.',
        remediationTitle: 'Secure Map API Key via Environment Variables',
        remediationSteps: [
            'Move plaintext map keys out of code and into environment variables or secrets manager.',
            'Configure provider restrictions (HTTP referrers, iOS bundle IDs, Android package names / SHA-1 certificates) in the respective developer console.',
        ],
        docUrl: 'https://developers.google.com/maps/api-security-best-practices',
    },
    {
        id: 'google-api-key',
        name: 'Google API Key / Google Maps Key',
        severity: 'review',
        regex: /AIza[A-Za-z0-9_-]{35}/g,
        description: 'Google Cloud / Google Maps / Firebase API Key. Verify application and API restrictions.',
        remediationTitle: 'Restrict or Rotate Google / Maps API Key',
        remediationSteps: [
            'Open Google Cloud Console → APIs & Services → Credentials.',
            'Inspect the key: apply Application Restrictions (HTTP referrers, Android apps, iOS apps, or IP addresses) and API Restrictions (e.g. Maps SDK only).',
            'If unrestricted or previously misused, regenerate/rotate the key.',
        ],
        docUrl: 'https://console.cloud.google.com/apis/credentials',
        requiresEntropyCheck: true,
    },
    {
        id: 'private-key-pem',
        name: 'Private Key PEM Block',
        severity: 'critical',
        regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----/g,
        description: 'Cryptographic Private Key block (SSH, TLS, RSA, ECDSA, OpenSSH, PGP).',
        remediationTitle: 'Rotate Cryptographic Keypair',
        remediationSteps: [
            'Generate a new cryptographic keypair (`ssh-keygen -t ed25519` or `openssl req ...`).',
            'Replace the public key on all authorized servers, Git hosting providers (GitHub/GitLab), and VPN endpoints.',
            'Remove the compromised private key from all repositories and workstations.',
            'Never commit private keys to version control; use SSH agents or secret managers.',
        ],
        docUrl: 'https://docs.github.com/en/authentication/connecting-to-github-with-ssh',
    },
    {
        id: 'git-url-creds',
        name: 'Git Remote URL Credentials',
        severity: 'critical',
        regex: /https:\/\/[A-Za-z0-9_.-]+:[A-Za-z0-9_./+-]{8,}@(github|gitlab|bitbucket)/g,
        description: 'Plaintext username & password/token embedded inside a Git remote URL.',
        remediationTitle: 'Clean Git Remote URL & Rotate Password/Token',
        remediationSteps: [
            'Run `git remote set-url origin https://github.com/owner/repo.git` to strip credentials from `.git/config`.',
            'Configure Git Credential Manager or SSH keys for authentication.',
            'Revoke the password or access token that was embedded in the URL.',
        ],
        docUrl: 'https://git-scm.com/docs/git-credential-store',
    },
];
// ─── Known Non-Secret / Placeholder Ignore List ───────────────────────────────
exports.KNOWN_IGNORES = new Set([
    'AKIAIOSFODNN7EXAMPLE',
    'AKIAIOSFODNN7',
    'EXAMPLEKEY',
    'XXXXXXXXXXXX',
    'YOUR_API_KEY',
    'your-api-key',
    'changeme',
    'placeholder',
    '000000000000',
    '123456789012',
    'sk-ant-api03-placeholder',
    'sk-proj-placeholder',
    'ghp_000000000000000000000000000000000000',
    'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
]);
// Binary / Asset extensions to exclude from text scanning
exports.BINARY_EXCLUDE_EXTS = new Set([
    '.svg', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.ico', '.pdf',
    '.woff', '.woff2', '.ttf', '.eot', '.otf', '.min.js', '.lock',
    '.wasm', '.mp3', '.mp4', '.avi', '.mov', '.zip', '.tar', '.gz', '.7z',
    '.exe', '.dylib', '.so', '.bin', '.vsix', '.jar', '.aar',
]);
exports.IGNORED_SCAN_DIRS = new Set([
    '.git', 'node_modules', '.dart_tool', '.gradle', '.idea', '.vscode',
    'Pods', '.venv', 'venv', 'dist', 'build', '.next', '.nuxt', '.output',
    '.cache', '.turbo', 'coverage', 'target', 'vendor',
]);
// ─── Shannon Entropy Check ───────────────────────────────────────────────────
/**
 * Calculate Shannon entropy of a candidate secret value.
 * Real API keys generally have high entropy (H >= 2.0).
 * Repeated test strings (e.g. AAAAAAAAAAAAAAAAA) have low entropy or single-character domination (>55%).
 */
function isLowEntropy(value) {
    if (!value || value.length < 8)
        return false;
    let body = value;
    if (value.startsWith('AIza')) {
        // Google API Key: strip 'AIza' (4 chars) to evaluate the 35 random characters
        body = value.slice(4);
    }
    else if (value.startsWith('AKIA') || value.startsWith('ASIA')) {
        // AWS Access Key ID: strip 'AKIA'/'ASIA' (4 chars)
        body = value.slice(4);
    }
    else if (value.startsWith('sk-proj-') || value.startsWith('sk-ant-')) {
        body = value.slice(8);
    }
    else if (value.startsWith('sk-') || value.startsWith('pk-')) {
        body = value.slice(3);
    }
    else {
        // Generic key candidate: if hyphen/underscore delimited, check candidate body
        const parts = value.split(/[_\-]/);
        const candidate = parts[parts.length - 1];
        if (candidate && candidate.length >= 8) {
            body = candidate;
        }
    }
    if (body.length < 8)
        return false;
    const counts = new Map();
    for (let i = 0; i < body.length; i++) {
        const char = body[i];
        counts.set(char, (counts.get(char) || 0) + 1);
    }
    let maxCount = 0;
    for (const count of counts.values()) {
        if (count > maxCount)
            maxCount = count;
    }
    // If one character dominates more than 55% of the string, it is repetitive dummy padding
    if (maxCount / body.length > 0.55)
        return true;
    // Calculate Shannon entropy: H = -sum(p * log2(p))
    let entropy = 0;
    for (const count of counts.values()) {
        const p = count / body.length;
        entropy -= p * Math.log2(p);
    }
    return entropy < 2.0;
}
/**
 * Check if a candidate secret value should be ignored.
 */
function isIgnoredValue(value) {
    if (!value)
        return true;
    const upper = value.toUpperCase();
    if (exports.KNOWN_IGNORES.has(value) || exports.KNOWN_IGNORES.has(upper))
        return true;
    if (upper.includes('YOUR_API_KEY') ||
        upper.includes('PLACEHOLDER') ||
        upper.includes('EXAMPLEKEY') ||
        upper.includes('CHANGEME') ||
        upper.includes('AKIAIOSFODNN7EXAMPLE')) {
        return true;
    }
    for (const ignore of exports.KNOWN_IGNORES) {
        if (value === ignore || upper === ignore.toUpperCase())
            return true;
        if (ignore.length >= 16 && (value.includes(ignore) || upper.includes(ignore.toUpperCase()))) {
            return true;
        }
    }
    return false;
}
/**
 * Redact a secret value:
 * `ghp_1234567890abcdef1234567890abcdef1234` -> `ghp_12…1234`
 * Remote URL: `https://[REDACTED]@github.com/...`
 */
function redactCredential(value) {
    if (!value)
        return '[REDACTED]';
    if (value.startsWith('http://') || value.startsWith('https://')) {
        return value.replace(/^(https?:\/\/)[^@]+(@.*)$/, '$1[REDACTED]$2');
    }
    if (value.startsWith('-----BEGIN')) {
        return value;
    }
    if (value.length <= 12) {
        return value.slice(0, 3) + '…' + value.slice(-2);
    }
    const prefix = value.slice(0, 6);
    const suffix = value.slice(-4);
    return `${prefix}…${suffix}`;
}
/**
 * Generate 12-char SHA-256 fingerprint for a credential value.
 */
function fingerprintCredential(value) {
    const hash = crypto.createHash('sha256').update(value).digest('hex');
    return `sha256:${hash.slice(0, 12)}`;
}
// ─── Git Execution Helper ────────────────────────────────────────────────────
function execGit(workspacePath, args, maxBuffer = 16 * 1024 * 1024) {
    return (0, child_process_1.execFileSync)('git', args, {
        cwd: workspacePath,
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer,
        windowsHide: true,
    });
}
// ─── Scanners ────────────────────────────────────────────────────────────────
/**
 * Extract matched threats from a text string with line context.
 */
function findCredentialsInText(text, filePath, locationType, branchOrCommit) {
    const threats = [];
    const lines = text.split(/\r?\n/);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
        const lineContent = lines[lineIndex];
        for (const pattern of exports.CREDENTIAL_PATTERNS) {
            const reg = new RegExp(pattern.regex.source, pattern.regex.flags);
            let match;
            while ((match = reg.exec(lineContent)) !== null) {
                if (match[0].length === 0) {
                    reg.lastIndex++;
                    continue;
                }
                const fullMatch = match[0];
                const secretValue = match[1] || fullMatch;
                if (isIgnoredValue(secretValue))
                    continue;
                if (pattern.requiresEntropyCheck && isLowEntropy(secretValue))
                    continue;
                const redacted = redactCredential(fullMatch);
                const fp = fingerprintCredential(secretValue);
                // Build context snippet around the line (up to 3 lines)
                const start = Math.max(0, lineIndex - 1);
                const end = Math.min(lines.length - 1, lineIndex + 1);
                const snippetLines = [];
                const maskReg = new RegExp(pattern.regex.source, pattern.regex.flags);
                for (let i = start; i <= end; i++) {
                    const l = lines[i];
                    const maskedLine = l.replace(maskReg, (m) => redactCredential(m));
                    snippetLines.push(`${i + 1} | ${maskedLine}`);
                }
                threats.push({
                    id: pattern.id,
                    severity: pattern.severity,
                    ruleName: pattern.name,
                    description: pattern.description,
                    locationType,
                    file: filePath,
                    line: lineIndex + 1,
                    commit: locationType === 'history' ? branchOrCommit : undefined,
                    branch: locationType === 'tracked' ? branchOrCommit : undefined,
                    redactedValue: redacted,
                    fingerprint: fp,
                    snippet: snippetLines.join('\n'),
                    remediation: {
                        title: pattern.remediationTitle,
                        steps: pattern.remediationSteps,
                        docUrl: pattern.docUrl,
                    },
                });
            }
        }
    }
    return threats;
}
/**
 * 1. Tracked Files Scanner:
 * Scans all committed files across all branch tips.
 */
async function scanTrackedCredentials(workspacePath, progressCallback) {
    const results = [];
    try {
        const rawRefs = execGit(workspacePath, [
            'for-each-ref',
            'refs/heads',
            '--format=%(refname:short)',
        ]).toString('utf8').trim();
        let refs = rawRefs.split('\n').map(r => r.trim()).filter(Boolean);
        if (refs.length === 0) {
            refs = ['HEAD'];
        }
        const seenKeys = new Set();
        for (let i = 0; i < refs.length; i++) {
            const ref = refs[i];
            progressCallback?.(`Scanning tracked branch tip [${i + 1}/${refs.length}]: ${ref}`);
            let treeFilesRaw = '';
            try {
                treeFilesRaw = execGit(workspacePath, ['ls-tree', '-r', '--name-only', ref]).toString('utf8');
            }
            catch {
                continue;
            }
            const files = treeFilesRaw.split('\n').map(f => f.trim()).filter(Boolean);
            for (const file of files) {
                const ext = path.extname(file).toLowerCase();
                if (exports.BINARY_EXCLUDE_EXTS.has(ext))
                    continue;
                if (file.includes('node_modules/') || file.includes('.venv/') || file.includes('dist/'))
                    continue;
                try {
                    const content = execGit(workspacePath, ['show', `${ref}:${file}`], 4 * 1024 * 1024).toString('utf8');
                    const fileThreats = findCredentialsInText(content, file, 'tracked', ref);
                    for (const t of fileThreats) {
                        const key = `${t.id}|${t.file}|${t.line}|${t.fingerprint}`;
                        if (!seenKeys.has(key)) {
                            seenKeys.add(key);
                            results.push(t);
                        }
                    }
                }
                catch {
                    // Skip unreadable / binary objects
                }
            }
        }
    }
    catch {
        // Git execution error (e.g. non-git directory or bare repository)
    }
    return results;
}
/**
 * 2. Deep Git History Scanner:
 * Streams all reachable commit diffs across all branches to catch committed & later deleted secrets.
 */
async function scanHistoryCredentials(workspacePath, progressCallback) {
    const results = [];
    progressCallback?.('Analyzing full Git commit history diffs...');
    try {
        // Run git log diff streamer
        const rawDiff = execGit(workspacePath, [
            '-c', 'core.quotePath=false',
            'log', '--all', '--root', '-m', '-p', '--no-renames',
            '--no-ext-diff', '--no-textconv', '--format=commit %H%x09%cd%x09%s',
        ], 64 * 1024 * 1024).toString('utf8');
        const lines = rawDiff.split(/\r?\n/);
        let currentCommit = 'initial';
        let currentPath = 'unknown';
        const seenKeys = new Set();
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('commit ')) {
                currentCommit = line.slice(7, 15);
                continue;
            }
            if (line.startsWith('--- ')) {
                continue;
            }
            if (line.startsWith('+++ ')) {
                let p = line.slice(4).trim();
                if (p.startsWith('b/'))
                    p = p.slice(2);
                if (p === '/dev/null')
                    p = currentPath;
                currentPath = p;
                continue;
            }
            // Check added (+) and modified lines
            if (!line.startsWith('+') || line.startsWith('+++'))
                continue;
            const content = line.slice(1);
            const ext = path.extname(currentPath).toLowerCase();
            if (exports.BINARY_EXCLUDE_EXTS.has(ext))
                continue;
            for (const pattern of exports.CREDENTIAL_PATTERNS) {
                const reg = new RegExp(pattern.regex.source, pattern.regex.flags);
                let match;
                while ((match = reg.exec(content)) !== null) {
                    if (match[0].length === 0) {
                        reg.lastIndex++;
                        continue;
                    }
                    const fullMatch = match[0];
                    const secretValue = match[1] || fullMatch;
                    if (isIgnoredValue(secretValue))
                        continue;
                    if (pattern.requiresEntropyCheck && isLowEntropy(secretValue))
                        continue;
                    const redacted = redactCredential(fullMatch);
                    const fp = fingerprintCredential(secretValue);
                    const key = `${pattern.id}|${currentPath}|${currentCommit}|${fp}`;
                    if (!seenKeys.has(key)) {
                        seenKeys.add(key);
                        const maskReg = new RegExp(pattern.regex.source, pattern.regex.flags);
                        results.push({
                            id: pattern.id,
                            severity: pattern.severity,
                            ruleName: pattern.name,
                            description: pattern.description,
                            locationType: 'history',
                            file: currentPath,
                            commit: currentCommit,
                            redactedValue: redacted,
                            fingerprint: fp,
                            snippet: `commit ${currentCommit} | + ${content.replace(maskReg, m => redactCredential(m))}`,
                            remediation: {
                                title: pattern.remediationTitle,
                                steps: [
                                    ...pattern.remediationSteps,
                                    `Purge from Git history: use \`git filter-repo --invert-paths --path "${currentPath}"\` or BFG Repo Cleaner to strip historic commits.`,
                                    'Remember: Rewriting git history alone does not revoke the token. Revoke the token at the service provider first!',
                                ],
                                docUrl: pattern.docUrl,
                            },
                        });
                    }
                }
            }
        }
    }
    catch {
        // History stream error
    }
    return results;
}
/**
 * 3. Local & Untracked Files Scanner:
 * Scans disk for source files, `.env`, `.npmrc`, configs, untracked scripts up to depth 30.
 */
async function scanLocalCredentials(workspacePath, progressCallback) {
    const results = [];
    progressCallback?.('Scanning local workspace files & configurations (.env, .dart, configs)...');
    function scanDir(dir, depth = 0) {
        if (depth > 30)
            return;
        try {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const name = entry.name;
                if (exports.IGNORED_SCAN_DIRS.has(name)) {
                    continue;
                }
                if (name.startsWith('.') && name !== '.env' && !name.startsWith('.env.') && name !== '.npmrc' && name !== '.secrets') {
                    continue;
                }
                const fullPath = path.join(dir, name);
                const relPath = path.relative(workspacePath, fullPath);
                if (entry.isDirectory()) {
                    scanDir(fullPath, depth + 1);
                }
                else if (entry.isFile()) {
                    const ext = path.extname(name).toLowerCase();
                    if (exports.BINARY_EXCLUDE_EXTS.has(ext))
                        continue;
                    try {
                        const stat = fs.statSync(fullPath);
                        if (stat.size > 8 * 1024 * 1024)
                            continue; // Skip huge files
                        const content = fs.readFileSync(fullPath, 'utf8');
                        const fileThreats = findCredentialsInText(content, relPath, 'local');
                        results.push(...fileThreats);
                    }
                    catch { }
                }
            }
        }
        catch { }
    }
    scanDir(workspacePath);
    return results;
}
/**
 * 4. Git Remote URLs Scanner:
 * Reads `.git/config` for credentials baked into remote URLs.
 */
async function scanRemoteCredentials(workspacePath, progressCallback) {
    const results = [];
    progressCallback?.('Auditing .git/config remote URLs for embedded tokens...');
    const configPath = path.join(workspacePath, '.git', 'config');
    if (!fs.existsSync(configPath))
        return results;
    try {
        const content = fs.readFileSync(configPath, 'utf8');
        const remotePattern = /https:\/\/[A-Za-z0-9_.-]+:[A-Za-z0-9_./+-]{8,}@(github|gitlab|bitbucket)/g;
        let match;
        while ((match = remotePattern.exec(content)) !== null) {
            const url = match[0];
            const redacted = redactCredential(url);
            const fp = fingerprintCredential(url);
            results.push({
                id: 'git-url-creds',
                severity: 'critical',
                ruleName: 'Git Remote URL Embedded Credentials',
                description: 'Plaintext credentials or access token stored inside `.git/config` remote URL.',
                locationType: 'git-remote',
                file: '.git/config',
                redactedValue: redacted,
                fingerprint: fp,
                snippet: `remote url = ${redacted}`,
                remediation: {
                    title: 'Clean Git Remote URL & Rotate Credentials',
                    steps: [
                        'Update remote URL: `git remote set-url origin https://github.com/owner/repo.git`',
                        'Revoke the exposed access token or password.',
                        'Use SSH keys (`git@github.com:...`) or Git Credential Manager for secure authentication.',
                    ],
                    docUrl: 'https://docs.github.com/en/get-started/getting-started-with-git/about-remote-repositories',
                },
            });
        }
    }
    catch { }
    return results;
}
/**
 * 5. GitHub Organization Secret-Scanning Alerts:
 * Queries GitHub API via `gh` CLI for open alerts with secrets hidden.
 */
async function scanGitHubOrgAlerts(org, progressCallback) {
    const results = [];
    progressCallback?.(`Querying open Secret Protection alerts for GitHub organization "${org}"...`);
    try {
        const raw = (0, child_process_1.execFileSync)('gh', [
            'api',
            '--method', 'GET',
            '-H', 'Accept: application/vnd.github+json',
            '-H', 'X-GitHub-Api-Version: 2022-11-28',
            '--paginate',
            `/orgs/${org}/secret-scanning/alerts?state=open&hide_secret=true&per_page=100`,
            '--jq', '.[] | [(.number|tostring),(.repository.full_name//""),(.secret_type//""),(.secret_type_display_name//""),(.validity//""),(.created_at//"")] | join("\t")',
        ], {
            stdio: ['ignore', 'pipe', 'pipe'],
            maxBuffer: 16 * 1024 * 1024,
            windowsHide: true,
        }).toString('utf8').trim();
        if (!raw)
            return results;
        const rows = raw.split('\n');
        for (const row of rows) {
            if (!row)
                continue;
            const [number, repo, secretType, displayName, validity, createdAt] = row.split('\t');
            if (!number || !repo)
                continue;
            const url = `https://github.com/${repo}/security/secret-scanning/${number}`;
            results.push({
                id: secretType || 'github-secret-alert',
                severity: 'critical',
                ruleName: displayName || `GitHub Secret Alert (${secretType})`,
                description: `Open GitHub Secret Protection Alert #${number} in ${repo} (Validity: ${validity || 'active'}).`,
                locationType: 'github-alert',
                file: `${repo}#alert-${number}`,
                redactedValue: '[withheld-by-GitHub]',
                fingerprint: `alert:${number}`,
                snippet: `Repository: ${repo}\nAlert URL: ${url}\nCreated: ${createdAt || 'unknown'}\nValidity: ${validity || 'unknown'}`,
                remediation: {
                    title: `Resolve Alert in ${repo}`,
                    steps: [
                        `Open alert: ${url}`,
                        'Revoke the compromised token at the token issuer immediately.',
                        'Mark alert as resolved / revoked in GitHub Secret Scanning dashboard.',
                    ],
                    docUrl: url,
                },
            });
        }
    }
    catch {
        // `gh` CLI error or auth missing
    }
    return results;
}
// ─── Main Coordinator ─────────────────────────────────────────────────────────
async function runCredentialScan(workspacePath, options, progressCallback) {
    const start = Date.now();
    const allFindings = [];
    const warningMessages = [];
    const totalSteps = (options.scanTracked ? 1 : 0) +
        (options.scanHistory ? 1 : 0) +
        (options.scanLocal ? 1 : 0) +
        (options.scanRemotes ? 1 : 0) +
        (options.githubOrgs?.length || 0);
    let currentStep = 0;
    // Step: Tracked Files
    if (options.scanTracked) {
        currentStep++;
        progressCallback?.({
            phase: 'Tracked Branch Tips',
            currentStep,
            totalSteps,
            message: 'Scanning committed files across branch tips...',
            findingsCount: allFindings.length,
        });
        const tracked = await scanTrackedCredentials(workspacePath, (msg) => {
            progressCallback?.({
                phase: 'Tracked Branch Tips',
                currentStep,
                totalSteps,
                message: msg,
                findingsCount: allFindings.length,
            });
        });
        allFindings.push(...tracked);
    }
    // Step: Git Remotes
    if (options.scanRemotes) {
        currentStep++;
        progressCallback?.({
            phase: 'Git Remote URLs',
            currentStep,
            totalSteps,
            message: 'Auditing .git/config remote URLs for exposed credentials...',
            findingsCount: allFindings.length,
        });
        const remotes = await scanRemoteCredentials(workspacePath);
        allFindings.push(...remotes);
    }
    // Step: Local Untracked Files
    if (options.scanLocal) {
        currentStep++;
        progressCallback?.({
            phase: 'Local & Untracked Files',
            currentStep,
            totalSteps,
            message: 'Scanning local untracked files & disk configurations (.env, .npmrc)...',
            findingsCount: allFindings.length,
        });
        const local = await scanLocalCredentials(workspacePath);
        allFindings.push(...local);
    }
    // Step: Deep Git History
    if (options.scanHistory) {
        currentStep++;
        progressCallback?.({
            phase: 'Deep Git History',
            currentStep,
            totalSteps,
            message: 'Scanning all historical commit diffs...',
            findingsCount: allFindings.length,
        });
        const history = await scanHistoryCredentials(workspacePath, (msg) => {
            progressCallback?.({
                phase: 'Deep Git History',
                currentStep,
                totalSteps,
                message: msg,
                findingsCount: allFindings.length,
            });
        });
        allFindings.push(...history);
    }
    // Step: GitHub Organizations
    if (options.githubOrgs && options.githubOrgs.length > 0) {
        for (const org of options.githubOrgs) {
            currentStep++;
            progressCallback?.({
                phase: `GitHub Organization (${org})`,
                currentStep,
                totalSteps,
                message: `Querying GitHub Secret Protection alerts for ${org}...`,
                findingsCount: allFindings.length,
            });
            const orgAlerts = await scanGitHubOrgAlerts(org);
            allFindings.push(...orgAlerts);
        }
    }
    // Deduplicate findings by (file + line + fingerprint + locationType)
    const uniqueFindings = [];
    const seen = new Set();
    for (const f of allFindings) {
        const key = `${f.file}|${f.line || ''}|${f.fingerprint}|${f.locationType}|${f.commit || ''}`;
        if (!seen.has(key)) {
            seen.add(key);
            uniqueFindings.push(f);
        }
    }
    const criticalCount = uniqueFindings.filter(f => f.severity === 'critical').length;
    const reviewCount = uniqueFindings.filter(f => f.severity === 'review').length;
    const publicCount = uniqueFindings.filter(f => f.severity === 'public').length;
    const trackedCount = uniqueFindings.filter(f => f.locationType === 'tracked').length;
    const historyCount = uniqueFindings.filter(f => f.locationType === 'history').length;
    const localCount = uniqueFindings.filter(f => f.locationType === 'local').length;
    const remotesCount = uniqueFindings.filter(f => f.locationType === 'git-remote').length;
    const orgAlertsCount = uniqueFindings.filter(f => f.locationType === 'github-alert').length;
    return {
        totalFindings: uniqueFindings.length,
        criticalCount,
        reviewCount,
        publicCount,
        findings: uniqueFindings,
        trackedCount,
        historyCount,
        localCount,
        remotesCount,
        orgAlertsCount,
        reposScanned: 1,
        scanDurationMs: Date.now() - start,
        timestamp: Date.now(),
        options,
        warningMessages: warningMessages.length > 0 ? warningMessages : undefined,
    };
}
// ─── Export Report Generators ─────────────────────────────────────────────────
function exportCredentialTsv(report) {
    const rows = ['location\twhere\tpath\ttype\tredacted\tfingerprint\tdescription'];
    for (const f of report.findings) {
        rows.push(`${f.locationType}\t${f.commit || f.branch || 'disk'}\t${f.file}${f.line ? `:${f.line}` : ''}\t${f.id}\t${f.redactedValue}\t${f.fingerprint}\t${f.description}`);
    }
    return rows.join('\n');
}
function exportCredentialJson(report) {
    return JSON.stringify(report, null, 2);
}
function exportCredentialMarkdown(report) {
    const lines = [
        '# Guardian — Credential & Secret Scan Report',
        '',
        `**Scan Date:** ${new Date(report.timestamp).toUTCString()}`,
        `**Duration:** ${report.scanDurationMs}ms`,
        `**Total Findings:** ${report.totalFindings} (Critical: ${report.criticalCount}, Review: ${report.reviewCount})`,
        '',
        '> [!IMPORTANT]',
        '> **Privacy Note:** Secrets in this report are redacted and fingerprinted with SHA-256.',
        '',
        '## Findings Summary',
        '',
        '| Severity | Type | Location | Path | Redacted Value | Fingerprint |',
        '| --- | --- | --- | --- | --- | --- |',
    ];
    for (const f of report.findings) {
        const sevBadge = f.severity === 'critical' ? '🔴 CRITICAL' : f.severity === 'review' ? '🟡 REVIEW' : '⚪ INFO';
        lines.push(`| ${sevBadge} | ${f.ruleName} | ${f.locationType} | \`${f.file}${f.line ? `:${f.line}` : ''}\` | \`${f.redactedValue}\` | \`${f.fingerprint}\` |`);
    }
    lines.push('');
    lines.push('## Incident Response & Remediation');
    lines.push('1. **Revoke immediately:** Revoke active tokens at their respective cloud/vendor dashboards.');
    lines.push('2. **Rotate keys:** Generate replacement keys and update secret managers.');
    lines.push('3. **Purge Git history:** Use `git filter-repo` to permanently erase leaked values from commit history.');
    lines.push('*Deleting a file or rewriting history alone does not revoke active API keys.*');
    return lines.join('\n');
}

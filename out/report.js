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
exports.buildReportHtml = buildReportHtml;
const scanner_1 = require("./scanner");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let guardianIconDataUri = '';
function getGuardianIconDataUri() {
    if (guardianIconDataUri)
        return guardianIconDataUri;
    try {
        const candidates = [
            path.join(__dirname, '../media/icon.png'),
            path.join(__dirname, '../../media/icon.png'),
            path.join(process.cwd(), 'media/icon.png')
        ];
        for (const p of candidates) {
            if (fs.existsSync(p)) {
                const buf = fs.readFileSync(p);
                guardianIconDataUri = `data:image/png;base64,${buf.toString('base64')}`;
                return guardianIconDataUri;
            }
        }
    }
    catch { }
    return '';
}
function severityColor(s) {
    return s === 'critical' ? 'var(--red)' : s === 'high' ? 'var(--orange)' : 'var(--yellow)';
}
function severityBg(s) {
    return s === 'critical' ? 'var(--bg-red-soft)' : s === 'high' ? 'var(--bg-orange-soft)' : 'var(--bg-yellow-soft)';
}
function severityBorder(s) {
    return s === 'critical' ? 'var(--border-red)' : s === 'high' ? 'var(--border-orange)' : 'var(--border-yellow)';
}
function escHtml(s) {
    return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
function branchStatusBadge(result) {
    const active = (0, scanner_1.getActiveThreats)(result.threats);
    const safe = (0, scanner_1.getSafeThreats)(result.threats);
    const critical = active.filter(t => t.severity === 'critical').length;
    const high = active.filter(t => t.severity === 'high').length;
    const medium = active.filter(t => t.severity === 'medium').length;
    if (result.error)
        return `<span class="badge badge-gray">⚠ Error</span>`;
    if (critical > 0)
        return `<span class="badge badge-red">🔴 ${critical} critical${high ? ` · ${high} high` : ''}</span>`;
    if (high > 0)
        return `<span class="badge badge-orange">🟠 ${high} high${medium ? ` · ${medium} medium` : ''}</span>`;
    if (medium > 0)
        return `<span class="badge badge-yellow">🟡 ${medium} medium</span>`;
    if (safe.length > 0)
        return `<span class="badge badge-clean-outline"><span class="badge-icon-check">✓</span> Clean · ${safe.length} Safe</span>`;
    return `<span class="badge badge-clean-outline"><span class="badge-icon-check">✓</span> Clean</span>`;
}
function threatCard(t, branch, uid) {
    const snippetId = `snip-${uid}`;
    const btnId = `btn-${uid}`;
    const menuId = `menu-${uid}`;
    const snippetBlock = t.snippet ? `
        <div class="snippet-wrap" id="${snippetId}">
          <div class="snippet-toolbar">
            <span class="snippet-label">📄 ${escHtml(t.file)}${t.line ? `:${t.line}` : ''}</span>
          </div>
          <pre class="snippet-pre" id="pre-${uid}"></pre>
        </div>` : '';
    const snippetData = t.snippet
        ? `<script type="text/plain" id="data-${uid}">${escHtml(t.snippet)}<\/script>`
        : '';
    const safeAction = t.isSafe
        ? `
      <span class="safe-badge-pill">🛡️ Marked Safe (${t.safeScope === 'global' ? 'Global' : 'Project'})</span>
      <button class="unsafe-btn" onclick="markUnsafe(event, '${escHtml(t.rule)}', '${escHtml(t.file)}')">
        <span class="btn-icon">⚠️</span> Mark as Unsafe
      </button>`
        : `
      <div class="safe-dropdown" id="dropdown-${uid}">
        <button class="safe-btn" id="btn-safe-${uid}" onclick="toggleSafeDropdown(event, '${uid}')">
          <span class="btn-icon">🛡️</span> Mark as Safe <span class="caret-icon">▾</span>
        </button>
        <div class="safe-dropdown-menu" id="safe-menu-${uid}">
          <div class="safe-menu-header">Whitelisting Options</div>
          <button class="safe-menu-item" onclick="markSafe(event, '${escHtml(t.rule)}', '${escHtml(t.file)}', 'project')">
            <div class="smi-icon smi-project">📁</div>
            <div class="smi-content">
              <div class="smi-title">For This Project</div>
              <div class="smi-desc">Ignore in this repository only</div>
            </div>
          </button>
          <div class="safe-menu-divider"></div>
          <button class="safe-menu-item" onclick="markSafe(event, '${escHtml(t.rule)}', '${escHtml(t.file)}', 'global')">
            <div class="smi-icon smi-global">🌐</div>
            <div class="smi-content">
              <div class="smi-title">For All Projects</div>
              <div class="smi-desc">Ignore globally across all repos</div>
            </div>
          </button>
        </div>
      </div>`;
    return `
    <div class="threat-card ${t.isSafe ? 'is-safe' : ''}" data-sev="${t.severity}">
      <div class="threat-left-bar" style="background:${t.isSafe ? 'var(--green)' : severityColor(t.severity)}"></div>
      <div class="threat-body">
        <div class="threat-header">
          <span class="sev-pill" style="background:${t.isSafe ? 'var(--bg-green-soft)' : severityBg(t.severity)};color:${t.isSafe ? 'var(--green)' : severityColor(t.severity)};border:1px solid ${t.isSafe ? 'rgba(74, 222, 128, 0.3)' : severityBorder(t.severity)}">${t.isSafe ? 'SAFE' : t.severity.toUpperCase()}</span>
          <code class="rule-code">${escHtml(t.rule)}</code>
          <span class="file-ref">
            <span class="file-ref-icon">📁</span>${escHtml(t.file)}${t.line ? `<span class="file-ref-line">:${t.line}</span>` : ''}
          </span>
          <div class="threat-actions">
            ${safeAction}
            ${t.snippet
        ? `<button id="${btnId}" class="code-btn" onclick="toggleSnippet(event,'${snippetId}','${btnId}','pre-${uid}','data-${uid}')"><span class="btn-icon">⟨/⟩</span> View Code</button>`
        : ''}
            <button class="open-btn"
              data-file="${escHtml(t.file)}"
              data-line="${t.line ?? 1}"
              data-branch="${escHtml(branch)}"
              onclick="openFile(event,this)"><span class="btn-icon">↗</span> Open File</button>
          </div>
        </div>
        <div class="threat-detail">${escHtml(t.detail)}</div>
        ${snippetBlock}
        ${snippetData}
      </div>
    </div>`;
}
function isRemoteBranch(branchName, localBranches, remoteBranches) {
    if (branchName.endsWith(' (working tree)'))
        return false;
    if (remoteBranches.includes(branchName))
        return true;
    if (localBranches.includes(branchName))
        return false;
    return branchName.includes('/');
}
function branchSection(r, isRemote = false) {
    const activeThreats = (0, scanner_1.getActiveThreats)(r.threats);
    const safeThreats = (0, scanner_1.getSafeThreats)(r.threats);
    const isClean = activeThreats.length === 0 && !r.error;
    const isInfected = activeThreats.length > 0;
    const status = isInfected ? 'infected' : isClean ? 'clean' : 'error';
    const type = isRemote ? 'remote' : 'local';
    // Only active threats are rendered directly as threat cards in the branch
    const activeCards = activeThreats
        .map((t, i) => threatCard(t, r.branch, `${r.branch.replace(/[^a-zA-Z0-9]/g, '_')}_act_${i}`))
        .join('');
    // Safe threats are tucked under a collapsible sub-panel so they don't clutter the active infected list
    const safeCardsBlock = safeThreats.length > 0 ? `
    <details class="safe-threats-details">
      <summary class="safe-threats-summary">
        <span class="bo-chevron">▶</span>
        <span class="safe-threats-title">🛡️ ${safeThreats.length} Whitelisted / Safe Finding${safeThreats.length !== 1 ? 's' : ''}</span>
      </summary>
      <div class="safe-threats-body">
        ${safeThreats.map((t, i) => threatCard(t, r.branch, `${r.branch.replace(/[^a-zA-Z0-9]/g, '_')}_safe_${i}`)).join('')}
      </div>
    </details>` : '';
    return `
  <details class="branch-block ${status} ${safeThreats.length > 0 ? 'has-safe' : ''}" data-type="${type}" data-status="${status}" data-safe="${safeThreats.length > 0 ? 'true' : 'false'}" ${isInfected ? 'open' : ''}>
    <summary class="branch-summary">
      <div class="branch-left">
        <span class="branch-chevron">▶</span>
        <span class="branch-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>
        </span>
        <span class="branch-name">${escHtml(r.branch)}</span>
        ${r.isCurrentBranch ? '<span class="current-tag">CURRENT</span>' : ''}
      </div>
      <div class="branch-right">
        <span class="branch-scope-tag ${isRemote ? 'tag-remote' : 'tag-local'}" onclick="event.stopPropagation(); applyFilter('${type}')">${isRemote ? 'REMOTE' : 'LOCAL'}</span>
        ${branchStatusBadge(r)}
        <span class="branch-meta">${r.scannedFiles.length} file${r.scannedFiles.length !== 1 ? 's' : ''} scanned</span>
      </div>
    </summary>
    ${isClean && safeThreats.length === 0 ? '<div class="clean-msg"><span class="clean-icon">✓</span> No threats found in this branch.</div>' : ''}
    ${isClean && safeThreats.length > 0 ? `<div class="clean-msg"><span class="clean-icon">✓</span> All ${safeThreats.length} finding${safeThreats.length !== 1 ? 's' : ''} in this branch marked as safe by user.</div>` : ''}
    ${r.error ? `<div class="error-msg">⚠ Could not read branch: ${escHtml(r.error)}</div>` : ''}
    ${activeCards}
    ${safeCardsBlock}
  </details>`;
}
function buildSafeRulesPanel(safeRules) {
    if (!safeRules || safeRules.length === 0)
        return '';
    return `
<details class="safe-rules-panel">
  <summary class="safe-rules-header">
    <div class="safe-rules-header-left">
      <span class="bo-chevron">▶</span>
      <span class="bo-title-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
      </span>
      <span class="bo-title">Whitelisted Rules (Marked as Safe)</span>
    </div>
    <div class="safe-rules-header-right">
      <span class="safe-rules-count">${safeRules.length}</span>
      <span class="safe-rules-chevron">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </span>
    </div>
  </summary>
  <div class="safe-rules-body">
    <div class="safe-rules-list">
      ${safeRules.map(sr => `
        <div class="safe-rule-row">
          <div class="safe-rule-info">
            <code class="rule-code">${escHtml(sr.rule)}</code>
            ${sr.file ? `<span class="safe-rule-file">📄 ${escHtml(sr.file)}</span>` : ''}
            <span class="safe-rule-scope-badge ${sr.scope === 'global' ? 'scope-global' : 'scope-project'}">${sr.scope === 'global' ? '🌐 All Projects' : '📁 This Project'}</span>
          </div>
          <button class="unsafe-btn" onclick="markUnsafe(event, '${escHtml(sr.rule)}', '${escHtml(sr.file || '')}')">
            <span class="btn-icon">✕</span> Remove / Mark as Unsafe
          </button>
        </div>
      `).join('')}
    </div>
  </div>
</details>`;
}
function buildBranchOverview(result) {
    const scanMap = new Map();
    for (const b of result.branches)
        scanMap.set(b.branch, b);
    const currentBranch = result.currentBranch || '';
    const localBranches = result.localBranches || result.branches.map(b => b.branch);
    const remoteBranches = result.remoteBranches || [];
    const curScan = scanMap.get(`${currentBranch} (working tree)`) || scanMap.get(currentBranch);
    const curBadge = curScan ? branchStatusBadge(curScan) : '';
    const localRows = localBranches.map(name => {
        const scan = scanMap.get(name) || (name === currentBranch ? scanMap.get(`${currentBranch} (working tree)`) : undefined);
        const isCurrent = name === currentBranch;
        const dotClass = isCurrent ? 'dot-current'
            : scan && (0, scanner_1.getActiveThreats)(scan.threats).length > 0 ? 'dot-infected'
                : 'dot-clean';
        const inlineBadge = scan ? `<span class="bo-inline-badge">${branchStatusBadge(scan)}</span>` : '';
        return `<div class="bo-branch-row${isCurrent ? ' is-current' : ''}">
          <span class="bo-branch-dot ${dotClass}"></span>
          <span class="bo-branch-name-text">${escHtml(name)}${isCurrent ? ' <span class="bo-star">★</span>' : ''}</span>
          <div class="bo-row-right">
            ${inlineBadge}
            <button class="bo-copy-btn" onclick="copyBranch(event, '${escHtml(name)}', this)" title="Copy branch name">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            </button>
          </div>
        </div>`;
    }).join('');
    const remoteRows = remoteBranches.length === 0
        ? `<div class="bo-empty">No remote branches found</div>`
        : remoteBranches.map(name => {
            const slash = name.indexOf('/');
            const display = slash !== -1
                ? `<span class="remote-prefix">${escHtml(name.slice(0, slash + 1))}</span>${escHtml(name.slice(slash + 1))}`
                : escHtml(name);
            return `<div class="bo-branch-row">
              <span class="bo-branch-dot dot-remote"></span>
              <span class="bo-branch-name-text">${display}</span>
              <div class="bo-row-right">
                <button class="bo-copy-btn" onclick="copyBranch(event, '${escHtml(name)}', this)" title="Copy branch name">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                </button>
              </div>
            </div>`;
        }).join('');
    return `
<details class="branch-overview">
  <summary class="bo-header">
    <div class="bo-header-left">
      <span class="bo-chevron">▶</span>
      <span class="bo-title-icon">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>
      </span>
      <span class="bo-title">Branch Overview</span>
    </div>
    <div class="bo-chips" onclick="event.preventDefault(); event.stopPropagation()">
      ${currentBranch ? `<span class="bo-chip bo-chip-current"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg> ${escHtml(currentBranch)}</span>` : ''}
      <span class="bo-chip bo-chip-counts">${localBranches.length} Local · ${remoteBranches.length} Remote</span>
    </div>
  </summary>
  <div class="bo-body">
    <div class="bo-current-row">
      <div class="bo-current-left">
        <span class="bo-current-label">Current Working Tree</span>
        <span class="bo-current-name">${escHtml(currentBranch || 'unknown')}</span>
      </div>
      <div class="bo-current-right">
        ${curBadge}
      </div>
    </div>
    <div class="bo-columns">
      <div class="bo-col">
        <div class="bo-col-header">
          <span class="bo-col-title">Local Branches</span>
          <span class="bo-col-count">${localBranches.length}</span>
        </div>
        <div class="bo-branch-list">
          ${localRows}
        </div>
      </div>
      <div class="bo-col">
        <div class="bo-col-header">
          <span class="bo-col-title">Remote Branches</span>
          <span class="bo-col-count">${remoteBranches.length}</span>
        </div>
        <div class="bo-branch-list">
          ${remoteRows}
        </div>
      </div>
    </div>
  </div>
</details>`;
}
function buildAuditSection(audit) {
    const hasAudit = !!audit;
    const maliciousCount = audit?.maliciousCount || 0;
    const cleanCount = audit?.cleanCount || 0;
    const totalAudited = audit?.totalAudited || 0;
    const userCount = audit ? (audit.userCount ?? audit.extensions.filter(e => !e.isBuiltin).length) : 0;
    const builtinCount = audit ? (audit.builtinCount ?? audit.extensions.filter(e => e.isBuiltin).length) : 0;
    const isMalicious = maliciousCount > 0;
    const defaultFilter = userCount > 0 ? 'user' : 'all';
    if (!hasAudit) {
        return `
      <div id="extension-audit-container">
        <div class="branches-section">
          <div class="audit-initial-card" id="audit-initial-card">
            <div class="audit-initial-content">
              <div class="audit-initial-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <div class="audit-initial-info">
                <div class="audit-initial-title">Supply-Chain Security &amp; Extension Scan</div>
                <div class="audit-initial-desc">Analyze installed extensions against 418+ known malware supply-chain IDs and invisible-Unicode payloads.</div>
              </div>
            </div>
            <button class="audit-start-btn" id="btn-audit-start" onclick="triggerExtensionAudit()">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              Scan Extensions
            </button>
          </div>
        </div>
      </div>
    `;
    }
    const summaryBanner = isMalicious
        ? `
    <div class="summary-hero danger" id="audit-summary-banner">
      <div class="hero-left">
        <div class="hero-icon">🚨</div>
        <div class="hero-text">
          <div class="hero-title">${maliciousCount} Malicious Extension${maliciousCount !== 1 ? 's' : ''} Detected!</div>
          <div class="hero-sub">Matched active malware supply-chain blocklists or contain invisible-Unicode payload markers. Remove them immediately.</div>
        </div>
      </div>
      <div class="hero-actions">
        <button class="remove-all-btn" id="btn-remove-all-malicious" onclick="uninstallAllMalicious()">
          <span class="btn-icon">🗑️</span> Remove All (${maliciousCount})
        </button>
        <button class="hero-rescan-btn" onclick="triggerExtensionAudit()" title="Re-scan extensions">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          Re-Scan
        </button>
      </div>
    </div>`
        : `
    <div class="summary-hero ok" id="audit-summary-banner">
      <div class="hero-left">
        <div class="hero-check-circle">✓</div>
        <div class="hero-text">
          <div class="hero-title">All installed extensions are clean</div>
          <div class="hero-sub">Scanned ${totalAudited} extensions (${userCount} User · ${builtinCount} Built-in) — no malicious packages or supply-chain threats detected.</div>
        </div>
      </div>
      <div class="hero-actions">
        <button class="hero-rescan-btn" onclick="triggerExtensionAudit()" title="Re-scan extensions">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          Re-Scan
        </button>
      </div>
    </div>`;
    const extensionCards = audit.extensions.map(ext => buildExtensionCard(ext, defaultFilter)).join('');
    return `
    <div id="extension-audit-container">
      ${summaryBanner}
      <div class="branches-section" id="audit-results-wrapper">
        <div class="branches-toolbar">
          <div class="branches-toolbar-left">
            <span class="branches-toolbar-title">Supply-Chain Security &amp; Extension Scan</span>
            <span class="branches-filter-count" id="ext-filter-count">Showing all ${totalAudited} extensions</span>
          </div>
          <div class="branches-filter-controls">
            <div class="filter-group">
              <span class="filter-group-label">Type:</span>
              <div class="filter-group-buttons">
                <button class="filter-tag ${defaultFilter === 'user' ? 'active' : ''}" data-filter="user" onclick="handleExtFilterClick(this)">📦 User <span class="tag-count" id="ext-count-user">(${userCount})</span></button>
                <button class="filter-tag" data-filter="builtin" onclick="handleExtFilterClick(this)">⚙️ Built-in <span class="tag-count" id="ext-count-builtin">(${builtinCount})</span></button>
                <button class="filter-tag ${defaultFilter === 'all' ? 'active' : ''}" data-filter="all" onclick="handleExtFilterClick(this)">All <span class="tag-count" id="ext-count-all">(${totalAudited})</span></button>
              </div>
            </div>
            <div class="filter-group">
              <span class="filter-group-label">Status:</span>
              <div class="filter-group-buttons">
                <button class="filter-tag filter-tag-infected ${isMalicious ? 'active' : ''}" data-filter="malicious" onclick="handleExtFilterClick(this)">🔴 Infected <span class="tag-count" id="ext-count-malicious">(${maliciousCount})</span></button>
                <button class="filter-tag filter-tag-clean" data-filter="clean" onclick="handleExtFilterClick(this)">✅ Clean <span class="tag-count" id="ext-count-clean">(${cleanCount})</span></button>
              </div>
            </div>
            <div class="ext-search-box">
              <span class="ext-search-icon">🔍</span>
              <input type="text" class="ext-search-input" id="ext-search-input" placeholder="Search extensions..." oninput="searchExtensions(this.value)" />
            </div>
          </div>
        </div>
        <div class="ext-cards-list" id="ext-cards-list">
          ${extensionCards}
          <div id="ext-filter-empty-state" class="ext-filter-empty-state" style="${totalAudited === 0 ? 'display:flex;' : 'display:none;'}">
            <div class="empty-state-icon-box">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            </div>
            <div class="empty-state-title" id="ext-empty-msg">No extensions found matching your filter.</div>
            <div class="empty-state-sub" id="ext-empty-sub">Check your search query or reset the filters to view installed extensions.</div>
            <button class="ext-reset-btn" onclick="clearExtSearchAndFilter()">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
              Reset Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}
function buildExtensionCard(ext, activeFilter = 'user') {
    const isMalicious = ext.status === 'malicious';
    const isBuiltin = !!ext.isBuiltin;
    const isSelf = ext.id.toLowerCase().includes('guardian-virus-scan') || ext.id.toLowerCase() === 'ankushlokhande.guardian-virus-scan';
    const initial = (ext.displayName || ext.id).charAt(0).toUpperCase();
    const safeId = ext.id.replace(/[^a-zA-Z0-9]/g, '_');
    const threatsHtml = isMalicious && ext.threats.length > 0
        ? `
      <div class="ext-threat-box">
        ${ext.threats.map(t => `
          <div class="ext-threat-item">
            <div class="ext-threat-item-top">
              <span class="ext-threat-badge">${escHtml(t.rule)}</span>
              ${t.campaign ? `<span class="ext-campaign-pill">Campaign: ${escHtml(t.campaign)}</span>` : ''}
              ${t.source ? `<span class="ext-source-pill">Source: ${escHtml(t.source)}</span>` : ''}
            </div>
            <div class="ext-threat-detail">${escHtml(t.detail)}</div>
            ${t.matchedFile ? `<div class="ext-threat-file">📄 File: <code>${escHtml(t.matchedFile)}</code></div>` : ''}
          </div>
        `).join('')}
      </div>`
        : '';
    const actionsHtml = isMalicious
        ? `
      <div class="ext-card-actions">
        <button class="ext-uninstall-btn danger" id="btn-uninstall-${safeId}" data-ext-id="${escHtml(ext.id)}" data-ext-path="${escHtml((ext.extensionPath || '').replace(/\\/g, '\\\\'))}" onclick="uninstallExtensionFromBtn(this)">
          <span class="btn-icon">🗑️</span> Uninstall Extension
        </button>
      </div>`
        : (isBuiltin || isSelf)
            ? `
      <div class="ext-card-actions">
        <span class="badge badge-clean-outline"><span class="badge-icon-check">✓</span> Clean</span>
      </div>`
            : `
      <div class="ext-card-actions">
        <span class="badge badge-clean-outline"><span class="badge-icon-check">✓</span> Clean</span>
        <button class="ext-uninstall-btn" id="btn-uninstall-${safeId}" data-ext-id="${escHtml(ext.id)}" data-ext-path="${escHtml((ext.extensionPath || '').replace(/\\/g, '\\\\'))}" onclick="uninstallExtensionFromBtn(this)">
          <span class="btn-icon">🗑️</span> Uninstall
        </button>
      </div>`;
    const isHiddenInitially = activeFilter === 'user' && isBuiltin;
    const categoryHtml = (ext.categories && ext.categories.length > 0 && ext.categories[0].trim())
        ? `<span class="ext-category-chip">${escHtml(ext.categories[0])}</span>`
        : '';
    const iconHtml = ext.iconDataUri
        ? `<img class="ext-icon-img" src="${ext.iconDataUri}" alt="${escHtml(ext.displayName)}" />`
        : `<div class="ext-avatar ${isMalicious ? 'avatar-malicious' : isBuiltin ? 'avatar-builtin' : 'avatar-user'}">${escHtml(initial)}</div>`;
    return `
    <div class="ext-card ${isMalicious ? 'malicious' : 'clean'}" id="ext-card-${safeId}" data-id="${escHtml(ext.id.toLowerCase())}" data-name="${escHtml((ext.displayName || '').toLowerCase())}" data-publisher="${escHtml((ext.publisher || '').toLowerCase())}" data-category="${isBuiltin ? 'builtin' : 'user'}" data-status="${isMalicious ? 'malicious' : 'clean'}" style="${isHiddenInitially ? 'display:none;' : 'display:flex;'}">
      <div class="ext-card-header">
        <div class="ext-card-identity">
          <div class="ext-avatar-wrapper">
            ${iconHtml}
          </div>
          <div class="ext-title-box">
            <div class="ext-name-row">
              <span class="ext-name">${escHtml(ext.displayName)}</span>
              ${categoryHtml}
            </div>
            ${ext.description ? `<div class="ext-desc">${escHtml(ext.description)}</div>` : ''}
          </div>
        </div>
        ${actionsHtml}
      </div>
      ${threatsHtml}
    </div>
  `;
}
function buildReportHtml(result, initialTab = 'glassworm') {
    const allThreats = result.branches.flatMap(b => b.threats);
    const activeThreats = (0, scanner_1.getActiveThreats)(allThreats);
    const safeThreats = (0, scanner_1.getSafeThreats)(allThreats);
    const totalThreats = activeThreats.length;
    const totalSafeThreats = safeThreats.length;
    const infectedBranches = result.branches.filter(b => (0, scanner_1.getActiveThreats)(b.threats).length > 0);
    const cleanBranches = result.branches.filter(b => (0, scanner_1.getActiveThreats)(b.threats).length === 0 && !b.error);
    const safeBranches = result.branches.filter(b => (0, scanner_1.getSafeThreats)(b.threats).length > 0);
    const criticalCount = activeThreats.filter(t => t.severity === 'critical').length;
    const highCount = activeThreats.filter(t => t.severity === 'high').length;
    const totalFiles = result.branches.reduce((n, b) => n + b.scannedFiles.length, 0);
    const isClean = totalThreats === 0;
    const summaryTitle = isClean ? '✓ All branches are clean' : `${totalThreats} active threat${totalThreats !== 1 ? 's' : ''} found`;
    const summarySubtitle = isClean
        ? (totalSafeThreats > 0
            ? `Scanned ${result.branches.length} branch${result.branches.length !== 1 ? 'es' : ''} (${totalSafeThreats} finding${totalSafeThreats !== 1 ? 's' : ''} marked as safe by user) — no active threats detected.`
            : `Scanned ${result.branches.length} branch${result.branches.length !== 1 ? 'es' : ''} — no malicious content detected.`)
        : `Across ${infectedBranches.length} infected branch${infectedBranches.length !== 1 ? 'es' : ''}. Do not use infected branches until threats are removed.`;
    const localBranches = result.localBranches || [];
    const remoteBranches = result.remoteBranches || [];
    const localBranchCount = result.branches.filter(b => !isRemoteBranch(b.branch, localBranches, remoteBranches)).length;
    const remoteBranchCount = result.branches.filter(b => isRemoteBranch(b.branch, localBranches, remoteBranches)).length;
    const projectBadge = `<span class="proj-badge proj-${result.projectType}">${result.projectType.charAt(0).toUpperCase() + result.projectType.slice(1)}</span>`;
    // Tab 1 (Repo Audit) status icon (checkmark if clean, red bug if infected)
    const tab1Badge = totalThreats > 0
        ? `<span class="nav-tab-status status-danger" id="nav-tab-glassworm-badge" title="${totalThreats} active threat(s)">🪲</span>`
        : `<span class="nav-tab-status status-clean" id="nav-tab-glassworm-badge" title="All branches clean">✓</span>`;
    // Tab 2 (Extension Audit) status icon (checkmark if clean, red bug if infected)
    const extAudit = result.extensionAudit;
    const extMalicious = extAudit ? extAudit.maliciousCount : 0;
    const extClean = extAudit ? extAudit.cleanCount : 0;
    const extTotal = extAudit ? extAudit.totalAudited : 0;
    const extUser = extAudit ? (extAudit.userCount ?? extAudit.extensions.filter(e => !e.isBuiltin).length) : 0;
    const extBuiltin = extAudit ? (extAudit.builtinCount ?? extAudit.extensions.filter(e => e.isBuiltin).length) : 0;
    const tab2Badge = extMalicious > 0
        ? `<span class="nav-tab-status status-danger" id="nav-tab-ext-badge" title="${extMalicious} infected extension(s)">🪲</span>`
        : `<span class="nav-tab-status status-clean" id="nav-tab-ext-badge" title="Installed extensions clean">✓</span>`;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <title>Guardian — Glassworm & Threat Scan Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0d1117;
      --bg2:       #11161f;
      --bg3:       #131922;
      --border:    #1e2633;
      --border2:   #273244;
      --text:      #f1f5f9;
      --text2:     #94a3b8;
      --text3:     #64748b;
      
      --red:       #f87171;
      --orange:    #fb923c;
      --yellow:    #fbbf24;
      --green:     #4ade80;
      --blue:      #38bdf8;
      --purple:    #a78bfa;
      
      --bg-red-soft: rgba(248, 113, 113, 0.08);
      --bg-orange-soft: rgba(251, 146, 60, 0.08);
      --bg-yellow-soft: rgba(251, 191, 36, 0.08);
      --bg-green-soft: rgba(34, 197, 94, 0.06);
      
      --border-red: rgba(248, 113, 113, 0.25);
      --border-orange: rgba(251, 146, 60, 0.25);
      --border-yellow: rgba(251, 191, 36, 0.25);
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
      background: var(--bg); color: var(--text);
      font-size: 13px; line-height: 1.6;
      padding: 0 0 80px;
    }

    /* ─────────────────────────────────────────────
       HEADER
    ───────────────────────────────────────────── */
    .header {
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
      padding: 16px 28px 0;
      position: sticky; top: 0; z-index: 100;
    }
    .header-main {
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; margin-bottom: 6px; flex-wrap: wrap;
    }
    .header-brand {
      display: flex; align-items: center; gap: 12px; min-width: 0;
    }
    .header-logo {
      width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .header-logo-img {
      width: 36px; height: 36px;
      object-fit: contain;
      border-radius: 6px;
      display: block;
    }
    .header-info-col {
      display: flex; flex-direction: column; gap: 2px; min-width: 0;
    }
    .header-title-row {
      display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
    }
    .header-title-row h1 {
      font-size: 15px; font-weight: 600; color: var(--text);
      letter-spacing: -0.01em; line-height: 1.2;
    }
    .header-title-row h1 span { color: var(--text2); font-weight: 400; }
    .proj-badge {
      font-size: 11px; font-weight: 500;
      color: #94a3b8; background: #18202c;
      border: 1px solid #283344;
      padding: 1px 7px; border-radius: 4px;
      text-transform: capitalize;
    }
    .workspace-path {
      font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
      font-size: 11px; color: var(--text3);
      margin-top: 0;
      word-break: break-all;
      line-height: 1.3;
    }
    .header-actions {
      margin-left: auto;
      display: flex;
      align-items: center;
      flex-shrink: 0;
    }
    .reload-link-btn {
      background: rgba(56, 189, 248, 0.05);
      border: 1px solid rgba(56, 189, 248, 0.22);
      color: #38bdf8;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      padding: 6px 14px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.15s ease;
    }
    .reload-link-btn:hover {
      background: rgba(56, 189, 248, 0.12);
      border-color: #38bdf8;
      text-decoration: none;
    }

    /* ─────────────────────────────────────────────
       PRIMARY NAVIGATION TABS (Inside Header)
    ───────────────────────────────────────────── */
    .nav-tabs-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: none;
      margin: 14px -28px 0;
      padding: 0 16px;
      background: var(--bg2);
      border-bottom: 1px solid var(--border);
    }
    .nav-tabs-list {
      display: flex;
      gap: 6px;
      margin: 0;
      margin-bottom: -1px;
      padding: 0;
    }
    .nav-tab-btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 9px 16px;
      background: transparent;
      border: 1px solid transparent;
      border-bottom: 2px solid transparent;
      color: var(--text2);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
      user-select: none;
      border-top-left-radius: 6px;
      border-top-right-radius: 6px;
    }
    .nav-tab-btn:hover {
      color: var(--text);
      background: rgba(255, 255, 255, 0.03);
    }
    .nav-tab-btn.active {
      color: #ffffff;
      background: rgba(37, 99, 235, 0.14);
      border-color: rgba(56, 189, 248, 0.25);
      border-bottom: 2px solid #38bdf8;
    }
    .nav-tab-icon {
      font-size: 14px;
      display: inline-flex;
      align-items: center;
    }
    .nav-tab-title {
      letter-spacing: -0.01em;
    }
    .nav-tab-status {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      flex-shrink: 0;
    }
    .nav-tab-status.status-clean {
      background: rgba(34, 197, 94, 0.15);
      color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.35);
    }
    .nav-tab-status.status-danger {
      background: rgba(239, 68, 68, 0.18);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.4);
      font-size: 12px;
    }

    /* Tab Panes */
    .tab-pane {
      display: none;
    }
    .tab-pane.active {
      display: block;
      animation: tabFadeIn 0.15s ease;
    }
    @keyframes tabFadeIn {
      from { opacity: 0; transform: translateY(3px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ─────────────────────────────────────────────
       STAT TABS  (Top of active tab)
    ───────────────────────────────────────────── */
    .stat-tabs {
      display: flex;
      flex-direction: row;
      border-bottom: 1px solid var(--border);
      background: #0f141d;
      padding: 0;
    }
    .stat-tab {
      flex: 1 1 0;
      padding: 14px 18px;
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      gap: 4px; min-width: 0;
    }
    .stat-tab:last-child { border-right: none; }
    .stat-tab-val {
      font-size: 22px; font-weight: 600; line-height: 1.1;
      letter-spacing: -0.02em;
    }
    .stat-tab-lbl {
      font-size: 11px; color: var(--text3); font-weight: 400;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .c-red    { color: var(--red); }
    .c-orange { color: var(--orange); }
    .c-green  { color: var(--green); }
    .c-blue   { color: var(--blue); }
    .c-purple { color: var(--purple); }
    .c-muted  { color: var(--text2); }

    /* ─────────────────────────────────────────────
       SUMMARY HERO
    ───────────────────────────────────────────── */
    .summary-hero {
      margin: 20px 28px 0;
      padding: 16px 20px;
      border-radius: 10px;
      border: 1px solid var(--border);
      display: flex; align-items: center; justify-content: space-between;
      gap: 16px; flex-wrap: wrap;
    }
    .summary-hero.ok     { background: rgba(34, 197, 94, 0.04); border-color: rgba(34, 197, 94, 0.2); }
    .summary-hero.danger { background: rgba(248, 113, 113, 0.04); border-color: rgba(248, 113, 113, 0.25); }
    .summary-hero.warn   { background: rgba(251, 146, 60, 0.04); border-color: rgba(251, 146, 60, 0.25); }
    .hero-left {
      display: flex; align-items: center; gap: 14px;
    }
    .hero-check-circle {
      width: 32px; height: 32px; border-radius: 50%;
      background: #22c55e; color: #ffffff;
      font-size: 16px; font-weight: 700;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .hero-title {
      font-size: 15px; font-weight: 600;
      letter-spacing: -0.01em; line-height: 1.2;
    }
    .summary-hero.ok     .hero-title { color: #4ade80; }
    .summary-hero.danger .hero-title { color: var(--red); }
    .summary-hero.warn   .hero-title { color: var(--orange); }
    .hero-sub { font-size: 12px; color: var(--text2); margin-top: 3px; }
    .hero-actions {
      display: flex; align-items: center; gap: 10px; margin-left: auto; flex-shrink: 0;
    }
    .hero-badges {
      display: flex; gap: 6px; align-items: center;
    }
    .hero-rescan-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: #141a24;
      color: #e2e8f0;
      border: 1px solid #253042;
      padding: 6px 14px; border-radius: 8px;
      font-size: 12px; font-weight: 500; cursor: pointer;
      transition: all 0.12s ease;
      white-space: nowrap;
    }
    .hero-rescan-btn:hover {
      background: #182230;
      border-color: #3b4b66;
    }

    /* ─────────────────────────────────────────────
       BRANCH OVERVIEW & SAFE RULES
    ───────────────────────────────────────────── */
    .branch-overview, .safe-rules-panel {
      margin: 12px 28px 0;
      border: 1px solid var(--border);
      border-radius: 8px; overflow: hidden;
      background: var(--bg2);
    }
    .bo-header, .safe-rules-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px;
      background: var(--bg2);
      cursor: pointer; user-select: none; list-style: none;
    }
    .bo-header-left, .safe-rules-header-left {
      display: flex; align-items: center; gap: 8px;
    }
    .bo-header::-webkit-details-marker, .safe-rules-header::-webkit-details-marker { display: none; }
    details[open] > .bo-header, details[open] > .safe-rules-header { border-bottom: 1px solid var(--border); }
    details[open] > .bo-header .bo-chevron, details[open] > .safe-rules-header .bo-chevron { transform: rotate(90deg); }
    .bo-chevron { color: var(--text3); font-size: 8px; transition: transform 0.18s; display: inline-block; flex-shrink: 0; }
    .bo-title-icon { color: var(--text2); font-size: 13px; display: inline-flex; align-items: center; }
    .bo-title { font-size: 13px; font-weight: 500; color: #e2e8f0; letter-spacing: -0.01em; }
    .bo-chips { margin-left: auto; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; cursor: default; }
    .bo-chip {
      font-size: 11px; font-weight: 500;
      padding: 3px 10px; border-radius: 6px; white-space: nowrap;
      cursor: default; display: inline-flex; align-items: center; gap: 4px;
    }
    .bo-chip-current { background: rgba(56, 189, 248, 0.08); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.2); font-family: monospace; }
    .bo-chip-counts  { background: #18202c; color: var(--text2); border: 1px solid #283344; }
    .safe-rules-count {
      background: rgba(34, 197, 94, 0.12); color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 10px;
      font-size: 11px; font-weight: 700; padding: 1px 8px;
    }
    .safe-rules-header-right {
      display: flex; align-items: center; gap: 8px; margin-left: auto;
    }
    .safe-rules-chevron {
      color: var(--text3); font-size: 11px; display: inline-flex; align-items: center;
    }
    .bo-body { padding: 14px 16px; background: var(--bg); }

    .bo-current-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; margin-bottom: 14px;
      background: #141a24;
      border: 1px solid var(--border);
      border-left: 3px solid var(--blue);
      border-radius: 8px;
    }
    .bo-current-left { display: flex; flex-direction: column; gap: 2px; }
    .bo-current-label { font-size: 9px; font-weight: 700; color: var(--blue); text-transform: uppercase; letter-spacing: 0.1em; }
    .bo-current-name  { font-family: 'SF Mono','Cascadia Code','Consolas',monospace; font-size: 14px; font-weight: 700; color: var(--blue); }

    .bo-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .bo-col { background: var(--bg2); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .bo-col-header {
      display: flex; align-items: center; gap: 7px;
      padding: 8px 12px;
      background: #141a24; border-bottom: 1px solid var(--border);
    }
    .bo-col-icon { font-size: 12px; }
    .bo-col-title { font-size: 10px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.07em; flex: 1; }
    .bo-col-count { font-size: 11px; font-weight: 700; color: var(--text3); background: var(--bg3); padding: 1px 7px; border-radius: 10px; border: 1px solid var(--border); }
    .bo-branch-list { padding: 6px 8px; display: flex; flex-direction: column; gap: 1px; }
    .bo-branch-row {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 8px; border-radius: 6px;
      font-family: 'SF Mono','Cascadia Code','Consolas',monospace;
      font-size: 12px; color: var(--text2);
    }
    .bo-branch-row.is-current { color: var(--blue); background: rgba(56, 189, 248, 0.06); }
    .bo-branch-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
    .dot-current  { background: var(--blue); }
    .dot-infected { background: var(--red); }
    .dot-clean    { background: var(--green); }
    .dot-remote   { background: var(--text3); }
    .bo-branch-name-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bo-row-right { margin-left: auto; display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
    .bo-current-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .bo-copy-btn, .branch-copy-btn {
      background: none; border: 1px solid transparent; color: var(--text3);
      padding: 3px 5px; border-radius: 4px; cursor: pointer;
      display: inline-flex; align-items: center; justify-content: center;
      line-height: 1; opacity: 0.6; transition: all 0.12s ease; flex-shrink: 0;
    }
    .bo-copy-btn:hover, .branch-copy-btn:hover {
      opacity: 1; color: var(--text); background: var(--bg3); border-color: var(--border);
    }
    .bo-copy-btn.copied, .branch-copy-btn.copied {
      color: var(--green); border-color: rgba(74, 222, 128, 0.3); background: rgba(74, 222, 128, 0.1); opacity: 1;
    }
    .bo-inline-badge { flex-shrink: 0; }
    .bo-star { color: var(--blue); font-size: 10px; }
    .remote-prefix { color: var(--text3); }
    .bo-empty { font-size: 11px; color: var(--text3); font-style: italic; padding: 6px 8px; }

    /* ─────────────────────────────────────────────
       BRANCH FILTER TOOLBAR & SECTIONS
    ───────────────────────────────────────────── */
    .branches-section { padding: 14px 28px 0; }
    .branches-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; margin-top: 14px; margin-bottom: 12px;
      padding-bottom: 0; border-bottom: none;
      flex-wrap: wrap;
    }
    .branches-toolbar-left {
      display: flex; align-items: baseline; gap: 8px;
    }
    .branches-toolbar-title {
      font-size: 14px; font-weight: 600; color: var(--text);
      letter-spacing: -0.01em;
    }
    .branches-filter-count {
      font-size: 12px; color: var(--text3);
    }
    .branches-filter-controls {
      display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
    }
    .filter-group {
      display: flex; align-items: center; gap: 6px;
    }
    .filter-group-label {
      font-size: 11px; font-weight: 500; color: var(--text3);
    }
    .filter-group-buttons {
      display: flex; align-items: center; gap: 4px;
    }
    .filter-tag {
      font-size: 11px; font-weight: 500;
      padding: 4px 10px; border-radius: 6px;
      background: #131922; color: var(--text2);
      border: 1px solid var(--border);
      cursor: pointer; user-select: none;
      transition: all 0.12s ease;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .filter-tag:hover {
      background: #17202c;
      color: var(--text); border-color: var(--border2);
    }
    .filter-tag.active {
      background: #2563eb;
      color: #ffffff;
      border-color: #2563eb;
      font-weight: 600;
    }
    .filter-tag.filter-tag-infected.active {
      background: #dc2626; color: #ffffff; border-color: #dc2626;
    }
    .filter-tag.filter-tag-clean.active {
      background: #16a34a; color: #ffffff; border-color: #16a34a;
    }
    .filter-tag.filter-tag-safe.active {
      background: #7c3aed; color: #ffffff; border-color: #7c3aed;
    }
    .tag-count {
      font-size: 10px; font-weight: 700; opacity: 0.85; margin-left: 2px;
    }
    /* Empty state styling */
    .filter-empty-state,
    .ext-filter-empty-state {
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 38px 24px;
      background: #0d121a;
      border: 1px dashed #1e2838;
      border-radius: 10px;
      margin: 16px 0;
      gap: 4px;
    }
    .empty-state-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: #141b27;
      border: 1px solid #1e2838;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 8px;
    }
    .empty-state-title {
      font-size: 13.5px;
      font-weight: 600;
      color: var(--text);
      line-height: 1.4;
    }
    .empty-state-sub {
      font-size: 11.5px;
      color: var(--text3);
      margin-bottom: 8px;
    }
    .filter-reset-btn,
    .ext-reset-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #161f2e;
      border: 1px solid rgba(56, 189, 248, 0.25);
      color: #38bdf8;
      border-radius: 6px;
      padding: 6px 14px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .filter-reset-btn:hover,
    .ext-reset-btn:hover {
      background: rgba(56, 189, 248, 0.12);
      border-color: #38bdf8;
      transform: translateY(-1px);
    }

    /* Branch row type tag */
    .branch-scope-tag {
      font-size: 10px; font-weight: 600; text-transform: uppercase;
      padding: 2px 8px; border-radius: 4px; letter-spacing: 0.05em;
      white-space: nowrap; cursor: pointer; transition: all 0.12s;
    }
    .tag-local  { background: #161d28; color: var(--text2); border: 1px solid #242f40; }
    .tag-remote { background: #161d28; color: var(--text3); border: 1px solid #242f40; }

    .section-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 8px; margin-top: 14px;
    }
    .section-circle-check {
      width: 18px; height: 18px; border-radius: 50%;
      background: #22c55e; color: #ffffff;
      font-size: 11px; font-weight: 700;
      display: inline-flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .section-icon { font-size: 13px; }
    .section-label {
      font-size: 13px; font-weight: 600; color: var(--text);
    }
    .section-count {
      font-size: 10px; font-weight: 700;
      padding: 1px 7px; border-radius: 10px;
    }
    .section-count.green  { background: #18202c; color: var(--text2); border: 1px solid #283344; }
    .section-count.red    { background: var(--bg-red-soft); color: var(--red); border: 1px solid var(--border-red); }
    .section-count.muted  { background: var(--bg3); color: var(--text3); border: 1px solid var(--border); }
    .section-divider { display: none; }

    .branch-block {
      border: 1px solid #1d2533;
      background: #11161e;
      border-radius: 8px; margin-bottom: 6px;
      transition: all 0.12s ease;
    }
    .branch-block:hover {
      border-color: #263346;
    }
    .branch-block:not([open]) {
      overflow: hidden;
    }
    .branch-block[open] {
      overflow: visible;
    }
    .branch-block.infected {
      border-color: var(--border-red);
    }
    .branch-block.clean {
      border-color: #1d2533;
    }

    .branch-summary {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; cursor: pointer;
      list-style: none; user-select: none;
    }
    .branch-summary::-webkit-details-marker { display: none; }
    details[open] > .branch-summary .branch-chevron { transform: rotate(90deg); }
    .branch-left {
      display: flex; align-items: center; gap: 8px; min-width: 0;
    }
    .branch-chevron { color: var(--text3); font-size: 8px; transition: transform 0.18s; display: inline-block; flex-shrink: 0; }
    .branch-block.infected .branch-summary { background: transparent; }
    .branch-block.clean    .branch-summary { background: transparent; }
    .branch-icon  { color: var(--text3); flex-shrink: 0; display: inline-flex; align-items: center; }
    .branch-name  { font-weight: 600; color: var(--text); font-size: 12.5px;
                    font-family: 'SF Mono','Cascadia Code','Consolas',monospace;
                    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .current-tag  { font-size: 9.5px; font-weight: 700; background: rgba(37, 99, 235, 0.15); color: #60a5fa;
                    border: 1px solid rgba(37, 99, 235, 0.35); border-radius: 4px; padding: 1px 6px;
                    font-family: -apple-system, sans-serif; text-transform: uppercase; letter-spacing: 0.05em; flex-shrink: 0; }
    .branch-right { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .branch-meta  { color: var(--text3); font-size: 11px; white-space: nowrap; margin-left: 4px; }

    /* ─────────────────────────────────────────────
       BADGES
    ───────────────────────────────────────────── */
    .badge { padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 700; white-space: nowrap; flex-shrink: 0; letter-spacing: 0.01em; }
    .badge-red    { background: var(--bg-red-soft); color: var(--red);    border: 1px solid var(--border-red); }
    .badge-orange { background: var(--bg-orange-soft); color: var(--orange); border: 1px solid var(--border-orange); }
    .badge-yellow { background: var(--bg-yellow-soft); color: var(--yellow); border: 1px solid var(--border-yellow); }
    .badge-green  { background: var(--bg-green-soft); color: var(--green);  border: 1px solid rgba(74, 222, 128, 0.2); }
    .badge-gray   { background: var(--bg3); color: var(--text3); border: 1px solid var(--border); }
    .badge-clean-outline {
      background: rgba(34, 197, 94, 0.08);
      border: 1px solid rgba(34, 197, 94, 0.3);
      color: #4ade80;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
    .badge-icon-check { font-size: 11px; font-weight: 700; }

    /* ─────────────────────────────────────────────
       THREAT CARDS
    ───────────────────────────────────────────── */
    .threat-card {
      border-top: 1px solid var(--border);
      display: flex;
      background: var(--bg);
    }
    .threat-left-bar {
      width: 3px; flex-shrink: 0;
      opacity: 0.8;
    }
    .threat-body {
      flex: 1; padding: 12px 14px; min-width: 0;
    }
    .threat-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 7px; flex-wrap: wrap;
    }
    .sev-pill {
      padding: 3px 8px; border-radius: 5px;
      font-size: 9px; font-weight: 800;
      letter-spacing: 0.08em; white-space: nowrap; flex-shrink: 0;
    }
    .rule-code {
      font-family: 'SF Mono','Cascadia Code','Consolas',monospace;
      font-size: 11px; color: var(--vscode-textLink-foreground, var(--blue));
      background: var(--vscode-list-hoverBackground, rgba(128,128,128,0.06)); padding: 2px 8px;
      border-radius: 5px; white-space: nowrap;
      border: 1px solid var(--border);
    }
    .file-ref {
      font-family: 'SF Mono','Cascadia Code','Consolas',monospace;
      font-size: 10px; color: var(--text3);
      display: flex; align-items: center; gap: 4px;
    }
    .file-ref-icon { font-size: 10px; }
    .file-ref-line { color: var(--text3); opacity: 0.7; }
    .threat-detail { color: var(--text2); font-size: 12px; line-height: 1.6; }

    /* ─────────────────────────────────────────────
       ACTION BUTTONS
    ───────────────────────────────────────────── */
    .threat-actions { margin-left: auto; display: flex; gap: 6px; flex-shrink: 0; }
    .code-btn, .open-btn {
      display: flex; align-items: center; gap: 5px;
      font-size: 11px; font-weight: 600;
      padding: 4px 11px; border-radius: 6px;
      cursor: pointer; border: 1px solid transparent;
      white-space: nowrap;
      transition: all 0.12s;
      letter-spacing: 0.01em;
    }
    .btn-icon { font-size: 11px; }
    .code-btn         { background: var(--vscode-button-secondaryBackground, #3a3d3e); color: var(--vscode-button-secondaryForeground, #ffffff); border-color: var(--border); }
    .code-btn:hover   { background: var(--vscode-button-secondaryHoverBackground, #45494a); }
    .code-btn.active  { background: var(--vscode-button-background, #0e639c); color: var(--vscode-button-foreground, #ffffff); }
    .open-btn         { background: var(--vscode-button-background, #0e639c); color: var(--vscode-button-foreground, #ffffff); }
    .open-btn:hover   { background: var(--vscode-button-hoverBackground, #1177bb); }

    /* ─────────────────────────────────────────────
       CODE SNIPPET
    ───────────────────────────────────────────── */
    .snippet-wrap {
      display: none; margin-top: 10px;
      border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
    }
    .snippet-wrap.open { display: block; }
    .snippet-toolbar {
      display: flex; align-items: center;
      padding: 6px 12px;
      background: var(--bg3); border-bottom: 1px solid var(--border);
    }
    .snippet-label { font-family: 'SF Mono','Cascadia Code','Consolas',monospace; font-size: 10px; color: var(--text3); }
    .snippet-pre {
      margin: 0; padding: 12px 14px;
      background: var(--vscode-editor-background, #1e1e1e); overflow-x: auto;
      font-family: 'SF Mono','Cascadia Code','Fira Code','Consolas',monospace;
      font-size: 12px; line-height: 1.7; color: var(--text);
      white-space: pre; max-height: 340px; overflow-y: auto;
    }

    .clean-msg {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; color: var(--green); font-size: 12px;
      border-top: 1px solid var(--border); background: var(--bg-green-soft);
    }
    .clean-icon { font-size: 14px; }
    .error-msg { padding: 12px 16px; color: var(--orange); font-size: 12px; border-top: 1px solid var(--border); }

    /* ─────────────────────────────────────────────
       PROJECT BADGE
    ───────────────────────────────────────────── */
    .proj-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 5px; flex-shrink: 0; letter-spacing: 0.03em; }
    .proj-flutter { background: rgba(84, 197, 248, 0.1); color: #54c5f8; border: 1px solid rgba(84, 197, 248, 0.25); }
    .proj-node    { background: rgba(109, 191, 103, 0.1); color: #6dbf67; border: 1px solid rgba(109, 191, 103, 0.25); }
    .proj-python  { background: rgba(245, 197, 24, 0.1); color: #f5c518; border: 1px solid rgba(245, 197, 24, 0.25); }
    .proj-generic { background: var(--bg3); color: var(--text3); border: 1px solid var(--border); }

    /* ─────────────────────────────────────────────
       FOOTER
    ───────────────────────────────────────────── */
    /* ─────────────────────────────────────────────
       SAFE / UNSAFE ACTION BUTTONS & DROPDOWNS
    ───────────────────────────────────────────── */
    .threat-card.is-safe {
      background: rgba(74, 222, 128, 0.02);
    }
    .safe-badge-pill {
      font-size: 10px; font-weight: 700; color: var(--green);
      background: var(--bg-green-soft); border: 1px solid rgba(74, 222, 128, 0.3);
      padding: 3px 8px; border-radius: 5px; white-space: nowrap;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .safe-dropdown {
      position: relative; display: inline-block;
    }
    .safe-dropdown.is-open {
      z-index: 50;
    }
    .safe-btn, .unsafe-btn {
      background: var(--bg3); color: var(--text2);
      border: 1px solid var(--border2);
      padding: 4px 10px; border-radius: 6px; cursor: pointer;
      font-size: 11px; font-weight: 600; white-space: nowrap;
      display: inline-flex; align-items: center; gap: 5px;
      transition: all 0.14s ease;
    }
    .safe-btn:hover, .safe-dropdown.is-open .safe-btn {
      background: rgba(74, 222, 128, 0.12); color: var(--green);
      border-color: rgba(74, 222, 128, 0.35);
    }
    .caret-icon {
      font-size: 9px; opacity: 0.7; transition: transform 0.15s ease;
    }
    .safe-dropdown.is-open .caret-icon {
      transform: rotate(180deg);
    }
    .unsafe-btn {
      color: var(--orange); border-color: rgba(251, 146, 60, 0.3);
      background: rgba(251, 146, 60, 0.08);
    }
    .unsafe-btn:hover {
      background: rgba(251, 146, 60, 0.18); color: #ff9b50;
      border-color: rgba(251, 146, 60, 0.5);
    }

    .safe-dropdown-menu {
      display: none; position: absolute; right: 0; top: calc(100% + 6px);
      background: #1c1d22;
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 10px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.05);
      z-index: 60;
      min-width: 240px;
      padding: 6px;
      animation: menuFadeIn 0.12s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes menuFadeIn {
      from { opacity: 0; transform: translateY(-4px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .safe-dropdown.is-open .safe-dropdown-menu {
      display: block;
    }
    .safe-menu-header {
      font-size: 10px; font-weight: 700; color: var(--text3);
      text-transform: uppercase; letter-spacing: 0.06em;
      padding: 5px 9px 4px;
    }
    .safe-menu-item {
      display: flex; align-items: center; gap: 10px;
      width: 100%; text-align: left; background: none; border: none;
      padding: 7px 9px; border-radius: 7px; cursor: pointer;
      color: var(--text);
      transition: background 0.12s ease;
    }
    .safe-menu-item:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .smi-icon {
      width: 28px; height: 28px; border-radius: 6px;
      display: flex; align-items: center; justify-content: center;
      font-size: 14px; flex-shrink: 0;
    }
    .smi-project {
      background: rgba(55, 148, 255, 0.14);
      border: 1px solid rgba(55, 148, 255, 0.25);
    }
    .smi-global {
      background: rgba(167, 139, 250, 0.14);
      border: 1px solid rgba(167, 139, 250, 0.25);
    }
    .smi-content { flex: 1; min-width: 0; }
    .smi-title { font-size: 12px; font-weight: 600; color: var(--text); line-height: 1.2; }
    .smi-desc { font-size: 10px; color: var(--text3); margin-top: 2px; line-height: 1.2; }
    .safe-menu-divider {
      height: 1px; background: rgba(255, 255, 255, 0.08); margin: 4px 4px;
    }
    /* SAFE THREATS ACCORDION IN BRANCH */
    .safe-threats-details {
      border-top: 1px solid var(--border);
      background: rgba(74, 222, 128, 0.02);
    }
    .safe-threats-summary {
      display: flex; align-items: center; gap: 8px;
      padding: 8px 14px; cursor: pointer; user-select: none;
      font-size: 11px; font-weight: 600; color: var(--green);
      background: rgba(74, 222, 128, 0.05);
      list-style: none;
    }
    .safe-threats-summary::-webkit-details-marker { display: none; }
    .safe-threats-details[open] > .safe-threats-summary { border-bottom: 1px solid var(--border); }
    .safe-threats-details[open] > .safe-threats-summary .bo-chevron { transform: rotate(90deg); }
    .safe-threats-title { flex: 1; }
    .safe-threats-body { display: flex; flex-direction: column; }

    /* SAFE RULES PANEL */
    .safe-rules-panel {
      margin: 12px 28px 0;
      background: var(--bg2);
      border: 1px solid var(--border);
      border-radius: 8px; overflow: hidden;
    }
    .safe-rules-header {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 16px; background: var(--bg2);
      cursor: pointer; user-select: none; list-style: none;
    }
    .safe-rules-header::-webkit-details-marker { display: none; }
    details[open] > .safe-rules-header { border-bottom: 1px solid var(--border); }
    details[open] > .safe-rules-header .bo-chevron { transform: rotate(90deg); }
    .safe-rules-count {
      background: rgba(34, 197, 94, 0.12); color: #4ade80;
      border: 1px solid rgba(34, 197, 94, 0.25); border-radius: 10px;
      font-size: 11px; font-weight: 700; padding: 1px 8px;
    }
    .safe-rules-body { padding: 10px 16px; }
    .safe-rules-list { display: flex; flex-direction: column; gap: 6px; }
    .safe-rule-row {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; padding: 6px 10px; background: var(--bg3);
      border: 1px solid var(--border); border-radius: 6px;
    }
    .safe-rule-info { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .safe-rule-file { font-size: 11px; color: var(--text3); font-family: monospace; }
    .safe-rule-scope-badge {
      font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 4px;
    }
    .scope-project { background: rgba(55, 148, 255, 0.1); color: var(--blue); border: 1px solid rgba(55, 148, 255, 0.25); }
    .scope-global  { background: rgba(167, 139, 250, 0.1); color: var(--purple); border: 1px solid rgba(167, 139, 250, 0.25); }

    .filter-tag.filter-tag-safe.active {
      background: #10b981; color: #ffffff; border-color: #10b981;
    }

    .footer {
      padding: 22px 28px 0;
      display: flex; align-items: center; gap: 12px;
      color: var(--text3); font-size: 11px;
    }
    .footer-dot { color: var(--border); }
    .footer-badge {
      background: var(--bg3); color: var(--text3);
      border: 1px solid var(--border);
      padding: 2px 8px; border-radius: 4px;
      font-size: 10px; font-weight: 600;
    }

    /* ─────────────────────────────────────────────
       TAB 2: EXTENSION AUDIT STYLING
    ───────────────────────────────────────────── */
    /* Terminal / CMD Live Scanner Console */
    .scanner-console {
      background: #0b0f17;
      border: 1px solid #1e2633;
      border-radius: 10px;
      margin-top: 6px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
      font-family: 'SF Mono', 'Cascadia Code', 'Consolas', 'Fira Code', monospace;
    }
    .console-header {
      background: #111622;
      border-bottom: 1px solid #1e2633;
      padding: 10px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .console-dots {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .console-dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      display: inline-block;
    }
    .dot-red { background: #ef4444; }
    .dot-yellow { background: #f59e0b; }
    .dot-green { background: #10b981; }
    .console-title {
      font-size: 11px;
      color: #94a3b8;
      letter-spacing: -0.01em;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .console-status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10.5px;
      font-weight: 700;
      color: #38bdf8;
      letter-spacing: 0.05em;
    }
    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #38bdf8;
      box-shadow: 0 0 8px #38bdf8;
      animation: pulseGlow 1.2s infinite ease-in-out;
    }
    @keyframes pulseGlow {
      0%, 100% { transform: scale(0.8); opacity: 0.5; }
      50% { transform: scale(1.3); opacity: 1; }
    }
    .console-body {
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .console-log-line {
      font-size: 11.5px;
      line-height: 1.5;
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .log-info { color: #64748b; }
    .log-active { color: #e2e8f0; font-weight: 600; }
    .log-prompt { color: #38bdf8; font-weight: 700; }
    .console-cursor {
      display: inline-block;
      color: #38bdf8;
      margin-left: 3px;
      animation: blinkCursor 0.9s infinite step-start;
    }
    @keyframes blinkCursor {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
    .console-progress-container {
      margin-top: 6px;
      background: #111622;
      border: 1px solid #1e2633;
      border-radius: 6px;
      padding: 10px 14px;
    }
    .console-progress-track {
      width: 100%;
      height: 6px;
      background: #18202e;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }
    .console-progress-bar {
      height: 100%;
      background: linear-gradient(90deg, #2563eb, #38bdf8, #34d399);
      border-radius: 4px;
      transition: width 0.15s ease;
    }
    .console-progress-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #94a3b8;
    }
    .console-pct {
      font-weight: 700;
      color: #38bdf8;
    }
    .console-steps-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 8px;
      margin-top: 4px;
    }
    .console-step {
      font-size: 10.5px;
      color: #64748b;
      background: #111622;
      border: 1px solid #1e2633;
      border-radius: 6px;
      padding: 6px 10px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .console-step.active {
      color: #38bdf8;
      border-color: rgba(56, 189, 248, 0.4);
      background: rgba(56, 189, 248, 0.08);
      font-weight: 600;
    }
    .console-step.done {
      color: #4ade80;
      border-color: rgba(74, 222, 128, 0.3);
      background: rgba(74, 222, 128, 0.06);
      font-weight: 600;
    }
    .step-check { font-size: 11px; }

    .audit-initial-card {
      background: #11161e; border: 1px solid #1d2533;
      border-radius: 10px; padding: 24px; margin-top: 16px; margin-bottom: 16px;
      display: flex; align-items: center; justify-content: space-between;
      gap: 20px; flex-wrap: wrap;
    }
    .audit-initial-content { display: flex; align-items: center; gap: 16px; max-width: 700px; }
    .audit-initial-icon {
      width: 44px; height: 44px; border-radius: 10px;
      background: #161d28; border: 1px solid #242f40;
      display: flex; align-items: center; justify-content: center;
      flex-shrink: 0;
    }
    .audit-initial-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 3px; }
    .audit-initial-desc { font-size: 12px; color: var(--text2); line-height: 1.45; }
    .audit-start-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: #2563eb; color: #ffffff;
      border: 1px solid #2563eb; padding: 8px 18px;
      border-radius: 8px; font-size: 12.5px; font-weight: 600;
      cursor: pointer; transition: all 0.12s ease;
    }
    .audit-start-btn:hover { background: #1d4ed8; border-color: #1d4ed8; }

    .remove-all-btn {
      display: inline-flex; align-items: center; gap: 6px;
      background: #dc2626; color: #ffffff;
      border: 1px solid #dc2626; padding: 6px 14px;
      border-radius: 8px; font-size: 12px; font-weight: 600;
      cursor: pointer; transition: all 0.12s ease;
      white-space: nowrap;
    }
    .remove-all-btn:hover { background: #ef4444; border-color: #ef4444; }

    .ext-search-box {
      display: flex; align-items: center; gap: 6px;
      background: #131922; border: 1px solid var(--border);
      border-radius: 6px; padding: 4px 10px;
    }
    .ext-search-icon { font-size: 11px; color: var(--text3); }
    .ext-search-input {
      background: transparent; border: none; color: var(--text);
      font-size: 11.5px; outline: none; width: 220px;
    }
    .ext-search-input::placeholder { color: var(--text3); }

    .ext-cards-list { display: flex; flex-direction: column; gap: 6px; }
    .ext-card {
      background: #11161e;
      border: 1px solid #1d2533;
      border-radius: 8px; padding: 12px 16px;
      display: flex; flex-direction: column; gap: 8px;
      transition: all 0.12s ease;
    }
    .ext-card:hover { border-color: #263346; }
    .ext-card.malicious {
      border-color: rgba(248, 113, 113, 0.35);
      background: rgba(248, 113, 113, 0.03);
    }
    .ext-card.clean {
      border-color: #1d2533;
    }
    .ext-card.is-uninstalled {
      opacity: 0.55; filter: grayscale(0.6);
      background: var(--bg2); border-color: var(--border);
    }
    .ext-card-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px;
    }
    .ext-card-identity {
      display: flex; align-items: flex-start; gap: 12px;
      flex: 1; min-width: 0;
    }
    .ext-avatar-wrapper {
      width: 36px; height: 36px; border-radius: 8px;
      flex-shrink: 0; display: flex; align-items: center; justify-content: center;
      background: #161d28; border: 1px solid #242f40;
      overflow: hidden; margin-top: 1px;
    }
    .ext-icon-img {
      width: 100%; height: 100%; object-fit: contain;
      border-radius: 7px; display: block;
    }
    .ext-avatar {
      width: 100%; height: 100%; border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 700; flex-shrink: 0;
    }
    .avatar-malicious {
      background: rgba(248, 113, 113, 0.12); color: var(--red);
    }
    .avatar-user {
      background: #18202c; color: #38bdf8;
    }
    .avatar-builtin {
      background: #18202c; color: var(--text3);
    }
    .avatar-clean {
      background: #18202c; color: var(--text2);
    }
    .ext-title-box {
      display: flex; flex-direction: column; gap: 3px;
      flex: 1; min-width: 0;
    }
    .ext-name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .ext-name { font-size: 13px; font-weight: 600; color: var(--text); }
    .ext-category-chip {
      font-size: 9.5px; font-weight: 500;
      color: var(--text2); background: #161d28;
      border: 1px solid #242f40;
      padding: 1px 7px; border-radius: 4px;
    }
    .ext-desc { font-size: 11.5px; color: var(--text2); line-height: 1.45; word-break: break-word; }
    .ext-card-actions {
      margin-left: auto;
      display: flex; align-items: center; gap: 8px;
      flex-shrink: 0; align-self: flex-start;
      margin-top: 1px;
    }
      background: var(--vscode-button-secondaryBackground, #3a3d3e);
      color: var(--vscode-button-secondaryForeground, #ffffff);
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 5px 14px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s ease;
    }
    .ext-reset-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494a);
      transform: translateY(-1px);
    }
    .ext-uninstall-btn {
      display: inline-flex; align-items: center; gap: 4px;
      background: var(--bg2); color: var(--text2);
      border: 1px solid var(--border);
      padding: 4px 10px; border-radius: 6px;
      font-size: 11px; font-weight: 600; cursor: pointer;
      transition: all 0.12s ease;
    }
    .ext-uninstall-btn:hover {
      background: var(--bg-red-soft, rgba(239, 68, 68, 0.1));
      color: var(--red, #ef4444);
      border-color: var(--border-red, rgba(239, 68, 68, 0.4));
      transform: translateY(-1px);
    }
    .ext-uninstall-btn.danger {
      background: linear-gradient(135deg, #dc2626, #b91c1c);
      color: #ffffff;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .ext-uninstall-btn.danger:hover {
      background: linear-gradient(135deg, #ef4444, #dc2626);
      box-shadow: 0 2px 8px rgba(220, 38, 38, 0.4);
    }
    .ext-threat-box {
      background: var(--bg-red-soft);
      border: 1px solid var(--border-red);
      border-radius: 6px; padding: 10px 12px;
      display: flex; flex-direction: column; gap: 6px;
    }
    .ext-threat-item { display: flex; flex-direction: column; gap: 4px; }
    .ext-threat-item-top { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    .ext-threat-badge {
      font-family: monospace; font-size: 10px; font-weight: 700;
      color: var(--red); background: rgba(248, 113, 113, 0.15);
      border: 1px solid var(--border-red); padding: 1px 6px; border-radius: 4px;
    }
    .ext-campaign-pill {
      font-size: 9px; font-weight: 700; color: var(--orange);
      background: rgba(251, 146, 60, 0.15); border: 1px solid rgba(251, 146, 60, 0.3);
      padding: 1px 6px; border-radius: 4px; text-transform: uppercase;
    }
    .ext-source-pill {
      font-size: 9px; font-weight: 600; color: var(--text3);
      background: var(--bg3); border: 1px solid var(--border);
      padding: 1px 6px; border-radius: 4px;
    }
    .ext-threat-detail { font-size: 11px; color: var(--text2); }
    .ext-threat-file { font-size: 10px; color: var(--text3); font-family: monospace; }
    .uninstalled-pill {
      font-size: 10px; font-weight: 700; color: var(--text3);
      background: var(--bg2); border: 1px solid var(--border);
      padding: 3px 8px; border-radius: 12px;
    }

    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: var(--bg2); }
    ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #3a3a4a; }
  </style>
</head>
<body>

<div class="header">
  <div class="header-main">
    <div class="header-brand">
      <div class="header-logo">
        ${getGuardianIconDataUri() ? `<img src="${getGuardianIconDataUri()}" alt="Guardian" class="header-logo-img" />` : `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
          </svg>`}
      </div>
      <div class="header-info-col">
        <div class="header-title-row">
          <h1>Guardian — Glassworm &amp; Malware Scanner</h1>
          ${projectBadge}
        </div>
        <div class="workspace-path">${escHtml(result.workspacePath)}</div>
      </div>
    </div>
    <div class="header-actions">
      <button class="reload-link-btn" onclick="reloadWindow()" title="Cmd+Shift+P → Developer: Reload Window">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        Reload Window
      </button>
    </div>
  </div>
  <div class="nav-tabs-bar">
    <div class="nav-tabs-list">
      <button class="nav-tab-btn ${initialTab === 'glassworm' ? 'active' : ''}" id="tab-btn-glassworm" data-tab="glassworm" onclick="switchTab('glassworm')">
        <span class="nav-tab-icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
        </span>
        <span class="nav-tab-title">Repo Scan</span>
        ${tab1Badge}
      </button>
      <button class="nav-tab-btn ${initialTab === 'extension-audit' ? 'active' : ''}" id="tab-btn-extension-audit" data-tab="extension-audit" onclick="switchTab('extension-audit')">
        <span class="nav-tab-icon">🧩</span>
        <span class="nav-tab-title">Extension Scan</span>
        ${tab2Badge}
      </button>
    </div>
  </div>
</div>

<div id="tab-glassworm" class="tab-pane ${initialTab === 'glassworm' ? 'active' : ''}">
  <div class="stat-tabs">
    <div class="stat-tab">
      <div class="stat-tab-val ${totalThreats > 0 ? 'c-red' : 'c-muted'}">${totalThreats}</div>
      <div class="stat-tab-lbl">Active threats</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val ${criticalCount > 0 ? 'c-red' : 'c-muted'}">${criticalCount}</div>
      <div class="stat-tab-lbl">Critical</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val ${highCount > 0 ? 'c-orange' : 'c-muted'}">${highCount}</div>
      <div class="stat-tab-lbl">High</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val ${totalSafeThreats > 0 ? 'c-green' : 'c-muted'}">${totalSafeThreats}</div>
      <div class="stat-tab-lbl">Safe findings</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val ${infectedBranches.length > 0 ? 'c-red' : 'c-muted'}">${infectedBranches.length}</div>
      <div class="stat-tab-lbl">Infected branches</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val c-green">${cleanBranches.length}</div>
      <div class="stat-tab-lbl">Clean branches</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val c-blue">${totalFiles}</div>
      <div class="stat-tab-lbl">Files checked</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val c-muted">${result.scanDurationMs}ms</div>
      <div class="stat-tab-lbl">Scan time</div>
    </div>
  </div>

  <div class="summary-hero ${isClean ? 'ok' : criticalCount > 0 ? 'danger' : 'warn'}">
    <div class="hero-left">
      ${isClean ? '<div class="hero-check-circle">✓</div>' : `<div class="hero-icon">${criticalCount > 0 ? '🚨' : '⚠️'}</div>`}
      <div class="hero-text">
        <div class="hero-title">${summaryTitle}</div>
        <div class="hero-sub">${summarySubtitle}</div>
      </div>
    </div>
    <div class="hero-actions">
      ${!isClean ? `
        <div class="hero-badges">
          ${criticalCount > 0 ? `<span class="badge badge-red">🔴 ${criticalCount} Critical</span>` : ''}
          ${highCount > 0 ? `<span class="badge badge-orange">🟠 ${highCount} High</span>` : ''}
        </div>` : ''}
      <button class="hero-rescan-btn" onclick="rescan()" title="Rescan workspace branches">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
        Rescan
      </button>
    </div>
  </div>

  ${buildBranchOverview(result)}

  ${buildSafeRulesPanel(result.safeRules)}

  <div class="branches-section">
    <div class="branches-toolbar">
      <div class="branches-toolbar-left">
        <span class="branches-toolbar-title">Branches</span>
        <span class="branches-filter-count" id="filter-count">Showing all ${result.branches.length} branches</span>
      </div>
      <div class="branches-filter-controls">
        <div class="filter-group">
          <span class="filter-group-label">Scope:</span>
          <div class="filter-group-buttons">
            <button class="filter-tag active" data-group="scope" data-value="all" onclick="setScopeFilter('all')">All (${result.branches.length})</button>
            <button class="filter-tag" data-group="scope" data-value="local" onclick="setScopeFilter('local')">💻 Local (${localBranchCount})</button>
            ${remoteBranchCount > 0 ? `<button class="filter-tag" data-group="scope" data-value="remote" onclick="setScopeFilter('remote')">☁️ Remote (${remoteBranchCount})</button>` : ''}
          </div>
        </div>
        <div class="filter-group">
          <span class="filter-group-label">Status:</span>
          <div class="filter-group-buttons">
            <button class="filter-tag active" data-group="status" data-value="all" onclick="setStatusFilter('all')">All</button>
            <button class="filter-tag filter-tag-infected" data-group="status" data-value="infected" onclick="setStatusFilter('infected')">🔴 Infected (${infectedBranches.length})</button>
            <button class="filter-tag filter-tag-clean" data-group="status" data-value="clean" onclick="setStatusFilter('clean')">✅ Clean (${cleanBranches.length})</button>
            ${safeBranches.length > 0 ? `<button class="filter-tag filter-tag-safe" data-group="status" data-value="safe" onclick="setStatusFilter('safe')">🛡️ Safe (${safeBranches.length})</button>` : ''}
          </div>
        </div>
      </div>
    </div>

    <div id="filter-empty-state" class="filter-empty-state">
      <div class="empty-state-icon-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
      </div>
      <div class="empty-state-title" id="empty-state-msg">No branches match the selected filter.</div>
      <div class="empty-state-sub">Try changing the status or scope filters above.</div>
      <button class="filter-reset-btn" onclick="resetAllFilters()">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
        Reset Filters
      </button>
    </div>

    ${infectedBranches.length > 0 ? `
      <div class="section-header" id="infected-section-header">
        <span class="section-icon">🔴</span>
        <span class="section-label">Infected Branches</span>
        <span class="section-count red" id="infected-visible-count">${infectedBranches.length}</span>
      </div>
      ${infectedBranches.map(b => branchSection(b, isRemoteBranch(b.branch, localBranches, remoteBranches))).join('')}
    ` : ''}

    ${cleanBranches.length > 0 ? `
      <div class="section-header" id="clean-section-header">
        <span class="section-circle-check">✓</span>
        <span class="section-label">Clean Branches</span>
        <span class="section-count green" id="clean-visible-count">${cleanBranches.length}</span>
      </div>
      ${cleanBranches.map(b => branchSection(b, isRemoteBranch(b.branch, localBranches, remoteBranches))).join('')}
    ` : ''}

    ${result.branches.filter(b => b.error).length > 0 ? `
      <div class="section-header" id="error-section-header">
        <span class="section-icon">⚠️</span>
        <span class="section-label">Errors</span>
        <span class="section-count muted" id="error-visible-count">${result.branches.filter(b => b.error).length}</span>
      </div>
      ${result.branches.filter(b => b.error).map(b => branchSection(b, isRemoteBranch(b.branch, localBranches, remoteBranches))).join('')}
    ` : ''}
  </div>

  <div class="footer">
    <span class="footer-badge">Guardian v${result.version || '1.4.0'}</span>
    <span class="footer-dot">·</span>
    Scanned ${result.branches.length} branch${result.branches.length !== 1 ? 'es' : ''}
    <span class="footer-dot">·</span>
    ${totalFiles} files checked
    <span class="footer-dot">·</span>
    ${result.scanDurationMs}ms
  </div>
</div>

<div id="tab-extension-audit" class="tab-pane ${initialTab === 'extension-audit' ? 'active' : ''}">
  <div class="stat-tabs">
    <div class="stat-tab">
      <div class="stat-tab-val ${extMalicious > 0 ? 'c-red' : extAudit ? 'c-green' : 'c-muted'}" id="ext-stat-total">${extAudit ? extTotal : '—'}</div>
      <div class="stat-tab-lbl">Total extensions</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val c-blue" id="ext-stat-user">${extAudit ? extUser : '—'}</div>
      <div class="stat-tab-lbl">User installed</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val c-muted" id="ext-stat-builtin">${extAudit ? extBuiltin : '—'}</div>
      <div class="stat-tab-lbl">Built-in system</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val ${extMalicious > 0 ? 'c-red' : 'c-muted'}" id="ext-stat-malicious">${extAudit ? extMalicious : '—'}</div>
      <div class="stat-tab-lbl">Infected extensions</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val ${extClean > 0 ? 'c-green' : 'c-muted'}" id="ext-stat-clean">${extAudit ? extClean : '—'}</div>
      <div class="stat-tab-lbl">Clean extensions</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val c-purple">418+</div>
      <div class="stat-tab-lbl">Threat signatures</div>
    </div>
    <div class="stat-tab">
      <div class="stat-tab-val c-muted" id="ext-stat-time">${extAudit ? extAudit.scanDurationMs + 'ms' : '—'}</div>
      <div class="stat-tab-lbl">Scan time</div>
    </div>
  </div>

  ${buildAuditSection(result.extensionAudit)}

  <div class="footer">
    <span class="footer-badge">Guardian v${result.version || '1.4.0'}</span>
    <span class="footer-dot">·</span>
    Extension Supply-Chain Defense
    <span class="footer-dot">·</span>
    418+ Known Malware IDs &amp; Invisible Unicode Payload Engine
  </div>
</div>

<script>
  const vscode = acquireVsCodeApi();

  let currentActiveTab = '${initialTab}';

  function switchTab(tabId) {
    if (!tabId || (tabId !== 'glassworm' && tabId !== 'extension-audit')) return;
    currentActiveTab = tabId;

    const btns = document.querySelectorAll('.nav-tab-btn');
    btns.forEach(btn => {
      if (btn.getAttribute('data-tab') === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    const panes = document.querySelectorAll('.tab-pane');
    panes.forEach(pane => {
      if (pane.id === 'tab-' + tabId) {
        pane.classList.add('active');
      } else {
        pane.classList.remove('active');
      }
    });

    try {
      const state = vscode.getState() || {};
      state.activeTab = tabId;
      vscode.setState(state);
    } catch (e) {}
  }

  // Restore saved active tab on load
  try {
    const savedState = vscode.getState();
    if (savedState && savedState.activeTab && (savedState.activeTab === 'glassworm' || savedState.activeTab === 'extension-audit')) {
      switchTab(savedState.activeTab);
    }
  } catch (e) {}

  function toggleSafeDropdown(e, uid) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const container = document.getElementById('dropdown-' + uid);
    if (!container) return;
    const isCurrentlyOpen = container.classList.contains('is-open');
    document.querySelectorAll('.safe-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
    if (!isCurrentlyOpen) {
      container.classList.add('is-open');
    }
  }

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.safe-dropdown')) {
      document.querySelectorAll('.safe-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.safe-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
    }
  });

  window.addEventListener('scroll', () => {
    document.querySelectorAll('.safe-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
  }, { passive: true });

  function markSafe(e, rule, file, scope) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    document.querySelectorAll('.safe-dropdown.is-open').forEach(d => d.classList.remove('is-open'));
    vscode.postMessage({ action: 'markSafe', rule, file, scope });
  }

  function markUnsafe(e, rule, file) {
    if (e) { e.stopPropagation(); e.preventDefault(); }
    vscode.postMessage({ action: 'markUnsafe', rule, file });
  }

  let currentScopeFilter = 'all';
  let currentStatusFilter = 'all';

  function setScopeFilter(scope) {
    currentScopeFilter = scope || 'all';
    updateFilterUI();
  }

  function setStatusFilter(status) {
    currentStatusFilter = status || 'all';
    updateFilterUI();
  }

  function resetAllFilters() {
    currentScopeFilter = 'all';
    currentStatusFilter = 'all';
    updateFilterUI();
  }

  function applyFilter(name) {
    if (name === 'all') {
      resetAllFilters();
    } else if (name === 'local' || name === 'remote') {
      setScopeFilter(name);
    } else if (name === 'infected' || name === 'clean' || name === 'safe') {
      setStatusFilter(name);
    }
  }

  function updateFilterUI() {
    document.querySelectorAll('.filter-tag[data-group="scope"]').forEach(tag => {
      const v = tag.getAttribute('data-value');
      tag.classList.toggle('active', v === currentScopeFilter);
    });

    document.querySelectorAll('.filter-tag[data-group="status"]').forEach(tag => {
      const v = tag.getAttribute('data-value');
      tag.classList.toggle('active', v === currentStatusFilter);
    });

    const blocks = document.querySelectorAll('.branch-block');
    let visibleTotal = 0;
    let visibleInfected = 0;
    let visibleClean = 0;
    let visibleError = 0;

    blocks.forEach(block => {
      const type = block.getAttribute('data-type');
      const status = block.getAttribute('data-status');
      const hasSafe = block.getAttribute('data-safe') === 'true';

      const matchScope = (currentScopeFilter === 'all') || (currentScopeFilter === type);
      let matchStatus = true;
      if (currentStatusFilter === 'infected') {
        matchStatus = (status === 'infected');
      } else if (currentStatusFilter === 'clean') {
        matchStatus = (status === 'clean');
      } else if (currentStatusFilter === 'safe') {
        matchStatus = hasSafe;
      }

      const visible = matchScope && matchStatus;
      block.style.display = visible ? '' : 'none';

      if (visible) {
        visibleTotal++;
        if (status === 'infected') visibleInfected++;
        else if (status === 'clean') visibleClean++;
        else if (status === 'error') visibleError++;

        const activeCards = block.querySelectorAll('.threat-card:not(.is-safe)');
        const safeDetails = block.querySelector('.safe-threats-details');
        const cleanMsg = block.querySelector('.clean-msg');

        if (currentStatusFilter === 'safe') {
          block.open = true;
          activeCards.forEach(c => c.style.display = 'none');
          if (cleanMsg) cleanMsg.style.display = 'none';
          if (safeDetails) {
            safeDetails.style.display = 'block';
            safeDetails.open = true;
          }
        } else if (currentStatusFilter === 'infected') {
          activeCards.forEach(c => c.style.display = '');
          if (cleanMsg) cleanMsg.style.display = '';
          if (safeDetails) safeDetails.style.display = 'none';
        } else {
          activeCards.forEach(c => c.style.display = '');
          if (cleanMsg) cleanMsg.style.display = '';
          if (safeDetails) safeDetails.style.display = '';
        }
      }
    });

    const infHeader = document.getElementById('infected-section-header');
    const cleanHeader = document.getElementById('clean-section-header');
    const errHeader = document.getElementById('error-section-header');
    const emptyState = document.getElementById('filter-empty-state');
    const countLabel = document.getElementById('filter-count');

    if (infHeader) {
      infHeader.style.display = visibleInfected > 0 ? '' : 'none';
      const c = document.getElementById('infected-visible-count');
      if (c) c.textContent = visibleInfected;
    }
    if (cleanHeader) {
      cleanHeader.style.display = (visibleClean > 0 || (currentStatusFilter === 'safe' && visibleTotal > 0)) ? '' : 'none';
      const c = document.getElementById('clean-visible-count');
      if (c) c.textContent = visibleClean;
    }
    if (errHeader) {
      errHeader.style.display = visibleError > 0 ? '' : 'none';
      const c = document.getElementById('error-visible-count');
      if (c) c.textContent = visibleError;
    }

    if (emptyState) emptyState.style.display = visibleTotal === 0 ? 'flex' : 'none';
    if (countLabel) {
      const isDefault = currentScopeFilter === 'all' && currentStatusFilter === 'all';
      countLabel.textContent = isDefault
        ? ('Showing all ' + visibleTotal + ' branches')
        : ('Showing ' + visibleTotal + ' of ' + blocks.length + ' branches');
    }
  }

  function rescan() {
    vscode.postMessage({ action: 'rescan' });
  }

  function reloadWindow() {
    vscode.postMessage({ action: 'reloadWindow' });
  }

  function copyBranch(e, name, btn) {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      navigator.clipboard.writeText(name);
    } catch (_) {}
    vscode.postMessage({ action: 'copyText', text: name });

    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      btn.classList.add('copied');
      btn.setAttribute('title', 'Copied!');
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.remove('copied');
        btn.setAttribute('title', 'Copy branch name');
      }, 1500);
    }
  }

  function openFile(e, btn) {
    e.stopPropagation();
    const file   = btn.getAttribute('data-file');
    const line   = parseInt(btn.getAttribute('data-line'), 10) || 1;
    const branch = btn.getAttribute('data-branch');
    vscode.postMessage({ action: 'openFile', file, line, branch });
  }

  function toggleSnippet(e, snippetId, btnId, preId, dataId) {
    e.stopPropagation();
    const wrap = document.getElementById(snippetId);
    const btn  = document.getElementById(btnId);
    const pre  = document.getElementById(preId);
    if (!wrap || !btn || !pre) return;

    const isNowOpen = wrap.classList.toggle('open');
    btn.classList.toggle('active', isNowOpen);
    btn.innerHTML = isNowOpen
      ? '<span class="btn-icon">⟨/⟩</span> Hide Code'
      : '<span class="btn-icon">⟨/⟩</span> View Code';

    if (isNowOpen && pre.childNodes.length === 0) {
      const dataEl = document.getElementById(dataId);
      if (!dataEl) return;
      const raw = dataEl.textContent
        .replace(/&amp;/g,  '&')
        .replace(/&lt;/g,   '<')
        .replace(/&gt;/g,   '>')
        .replace(/&quot;/g, '"');
      const html = raw.split('\\n').map(line => {
        const isFlagged = line.trimStart().startsWith('▶');
        const escaped = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return isFlagged
          ? '<span style="display:block;background:var(--vscode-editor-lineHighlightBackground, rgba(128,128,128,0.1));color:var(--green);border-left:2px solid var(--green);padding-left:6px">' + escaped + '</span>'
          : '<span style="display:block;width:100%">' + escaped + '</span>';
      }).join('');
      pre.innerHTML = html;
    }
  }

  // ─── Extension Audit Client Logic ─────────────────────────────────────────

  let lastExtensionReport = null;
  let currentExtFilter = 'user';

  function triggerExtensionAudit() {
    const container = document.getElementById('extension-audit-container');
    const topBtn = document.getElementById('btn-audit-extensions-top');
    if (topBtn) topBtn.classList.add('is-scanning');

    if (container) {
      container.innerHTML = 
        '<div class="branches-section">' +
          '<div class="scanner-console" id="scanner-console">' +
            '<div class="console-header">' +
              '<div class="console-dots">' +
                '<span class="console-dot dot-red"></span>' +
                '<span class="console-dot dot-yellow"></span>' +
                '<span class="console-dot dot-green"></span>' +
              '</div>' +
              '<div class="console-title">guardian@security: ~ /scan-extensions --deep --signatures=418+</div>' +
              '<div class="console-status"><span class="pulse-dot"></span> RUNNING SCAN</div>' +
            '</div>' +
            '<div class="console-body">' +
              '<div class="console-log-line log-info"><span class="log-prompt">&gt;</span> [GUARDIAN-CORE] Initializing Extension Supply-Chain &amp; Malware Engine v1.4.0...</div>' +
              '<div class="console-log-line log-info"><span class="log-prompt">&gt;</span> [THREAT-DB] Loaded 418+ signatures (GlassWorm, ForceMemo, Sleeper-73).</div>' +
              '<div class="console-log-line log-active" id="console-live-line">' +
                '<span class="log-prompt">&gt;</span> [SCANNING] <span class="console-cursor-text" id="console-curr-text">Discovering installed extensions...</span><span class="console-cursor">█</span>' +
              '</div>' +
              '<div class="console-progress-container">' +
                '<div class="console-progress-track">' +
                  '<div class="console-progress-bar" id="scanner-progress-fill" style="width: 8%"></div>' +
                '</div>' +
                '<div class="console-progress-meta">' +
                  '<span id="scanner-ticker">Initializing extension runtime scan...</span>' +
                  '<span class="console-pct" id="console-pct">8%</span>' +
                '</div>' +
              '</div>' +
              '<div class="console-steps-grid">' +
                '<div class="console-step done" id="step-1"><span class="step-check">✓</span> 1. Threat Intel (418 IoCs)</div>' +
                '<div class="console-step active" id="step-2"><span class="step-check">⏳</span> 2. Discovering Packages</div>' +
                '<div class="console-step" id="step-3"><span class="step-check">○</span> 3. Unicode &amp; Payload Analysis</div>' +
                '<div class="console-step" id="step-4"><span class="step-check">○</span> 4. Supply-Chain Verdict</div>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    vscode.postMessage({ action: 'startExtensionAudit' });
  }

  function updateExtensionScanProgress(progress) {
    const liveText = document.getElementById('console-curr-text');
    const ticker = document.getElementById('scanner-ticker');
    const fill = document.getElementById('scanner-progress-fill');
    const pctEl = document.getElementById('console-pct');
    const step2 = document.getElementById('step-2');
    const step3 = document.getElementById('step-3');

    const pct = progress.total > 0 ? Math.min(95, Math.max(10, Math.round((progress.current / progress.total) * 100))) : 15;

    if (liveText && progress.currentExtension) {
      liveText.textContent = '[' + progress.current + '/' + progress.total + '] Checking: ' + progress.currentExtension + '...';
    }
    if (ticker && progress.currentExtension) {
      ticker.textContent = 'Scanning: ' + progress.currentExtension;
    }
    if (fill) {
      fill.style.width = pct + '%';
    }
    if (pctEl) {
      pctEl.textContent = pct + '%';
    }
    if (step2) {
      step2.className = 'console-step done';
      step2.innerHTML = '<span class="step-check">✓</span> 2. Discovered (' + progress.total + ' Extensions)';
    }
    if (step3) {
      step3.className = 'console-step active';
      step3.innerHTML = '<span class="step-check">⏳</span> 3. Unicode &amp; Payload Analysis';
    }
  }

  function escText(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderExtensionAuditResults(report) {
    lastExtensionReport = report;
    const container = document.getElementById('extension-audit-container');
    const topBtn = document.getElementById('btn-audit-extensions-top');
    if (topBtn) topBtn.classList.remove('is-scanning');

    const totalAudited = report.totalAudited || 0;
    const maliciousCount = report.maliciousCount || 0;
    const cleanCount = report.cleanCount || 0;
    const userCount = typeof report.userCount === 'number' ? report.userCount : (report.extensions || []).filter(e => !e.isBuiltin).length;
    const builtinCount = typeof report.builtinCount === 'number' ? report.builtinCount : (report.extensions || []).filter(e => e.isBuiltin).length;
    const isMalicious = maliciousCount > 0;

    if (userCount > 0) {
      currentExtFilter = 'user';
    } else {
      currentExtFilter = 'all';
    }

    // Update extension stats bar
    const statTotal = document.getElementById('ext-stat-total');
    if (statTotal) {
      statTotal.textContent = totalAudited;
      statTotal.className = 'stat-tab-val ' + (isMalicious ? 'c-red' : 'c-green');
    }
    const statUser = document.getElementById('ext-stat-user');
    if (statUser) {
      statUser.textContent = userCount;
    }
    const statBuiltin = document.getElementById('ext-stat-builtin');
    if (statBuiltin) {
      statBuiltin.textContent = builtinCount;
    }
    const statMalicious = document.getElementById('ext-stat-malicious');
    if (statMalicious) {
      statMalicious.textContent = maliciousCount;
      statMalicious.className = 'stat-tab-val ' + (maliciousCount > 0 ? 'c-red' : 'c-muted');
    }
    const statClean = document.getElementById('ext-stat-clean');
    if (statClean) {
      statClean.textContent = cleanCount;
      statClean.className = 'stat-tab-val ' + (cleanCount > 0 ? 'c-green' : 'c-muted');
    }
    const statTime = document.getElementById('ext-stat-time');
    if (statTime) {
      statTime.textContent = (report.scanDurationMs || 0) + 'ms';
    }

    // Update nav tab status icon
    const tabBadge = document.getElementById('nav-tab-ext-badge');
    if (tabBadge) {
      if (isMalicious) {
        tabBadge.className = 'nav-tab-status status-danger';
        tabBadge.textContent = '🪲';
        tabBadge.title = maliciousCount + ' infected extension(s)';
      } else {
        tabBadge.className = 'nav-tab-status status-clean';
        tabBadge.textContent = '✓';
        tabBadge.title = 'All extensions clean';
      }
    }

    if (!container) return;

    let summaryBanner = '';
    if (isMalicious) {
      summaryBanner = 
        '<div class="summary-hero danger" id="audit-summary-banner">' +
          '<div class="hero-left">' +
            '<div class="hero-icon">🚨</div>' +
            '<div class="hero-text">' +
              '<div class="hero-title">' + maliciousCount + ' Malicious Extension' + (maliciousCount !== 1 ? 's' : '') + ' Detected!</div>' +
              '<div class="hero-sub">Matched active malware supply-chain blocklists or contain invisible-Unicode payload markers. Remove them immediately.</div>' +
            '</div>' +
          '</div>' +
          '<div class="hero-actions">' +
            '<button class="remove-all-btn" id="btn-remove-all-malicious" onclick="uninstallAllMalicious()">' +
              '<span class="btn-icon">🗑️</span> Remove All (' + maliciousCount + ')' +
            '</button>' +
            '<button class="hero-rescan-btn" onclick="triggerExtensionAudit()" title="Re-scan extensions">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>' +
              'Re-Scan' +
            '</button>' +
          '</div>' +
        '</div>';
    } else {
      summaryBanner = 
        '<div class="summary-hero ok" id="audit-summary-banner">' +
          '<div class="hero-left">' +
            '<div class="hero-check-circle">✓</div>' +
            '<div class="hero-text">' +
              '<div class="hero-title">All installed extensions are clean</div>' +
              '<div class="hero-sub">Scanned ' + totalAudited + ' extensions (' + userCount + ' User · ' + builtinCount + ' Built-in) — no malicious packages or supply-chain threats detected.</div>' +
            '</div>' +
          '</div>' +
          '<div class="hero-actions">' +
            '<button class="hero-rescan-btn" onclick="triggerExtensionAudit()" title="Re-scan extensions">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>' +
              'Re-Scan' +
            '</button>' +
          '</div>' +
        '</div>';
    }

    let cardsHtml = '';
    for (let i = 0; i < report.extensions.length; i++) {
      const ext = report.extensions[i];
      const isMal = ext.status === 'malicious';
      const isBuiltin = !!ext.isBuiltin;
      const initial = (ext.displayName || ext.id).charAt(0).toUpperCase();
      const safeId = ext.id.replace(/[^a-zA-Z0-9]/g, '_');

      let threatsBox = '';
      if (isMal && ext.threats && ext.threats.length > 0) {
        let threatItems = '';
        for (let j = 0; j < ext.threats.length; j++) {
          const t = ext.threats[j];
          threatItems += 
            '<div class="ext-threat-item">' +
              '<div class="ext-threat-item-top">' +
                '<span class="ext-threat-badge">' + escText(t.rule) + '</span>' +
                (t.campaign ? '<span class="ext-campaign-pill">Campaign: ' + escText(t.campaign) + '</span>' : '') +
                (t.source ? '<span class="ext-source-pill">Source: ' + escText(t.source) + '</span>' : '') +
              '</div>' +
              '<div class="ext-threat-detail">' + escText(t.detail) + '</div>' +
              (t.matchedFile ? '<div class="ext-threat-file">📄 File: <code>' + escText(t.matchedFile) + '</code></div>' : '') +
            '</div>';
        }
        threatsBox = '<div class="ext-threat-box">' + threatItems + '</div>';
      }

      const isSelf = ext.id.toLowerCase().includes('guardian-virus-scan') || ext.id.toLowerCase() === 'ankushlokhande.guardian-virus-scan';
      let actionsHtml = '';
      if (isMal) {
        actionsHtml = 
          '<div class="ext-card-actions">' +
            '<button class="ext-uninstall-btn danger" id="btn-uninstall-' + safeId + '" data-ext-id="' + escText(ext.id) + '" data-ext-path="' + escText(ext.extensionPath || '') + '" onclick="uninstallExtensionFromBtn(this)">' +
              '<span class="btn-icon">🗑️</span> Uninstall Extension' +
            '</button>' +
          '</div>';
      } else if (isBuiltin || isSelf) {
        actionsHtml = 
          '<div class="ext-card-actions">' +
            '<span class="badge badge-clean-outline"><span class="badge-icon-check">✓</span> Clean</span>' +
          '</div>';
      } else {
        actionsHtml = 
          '<div class="ext-card-actions">' +
            '<span class="badge badge-clean-outline"><span class="badge-icon-check">✓</span> Clean</span>' +
            '<button class="ext-uninstall-btn" id="btn-uninstall-' + safeId + '" data-ext-id="' + escText(ext.id) + '" data-ext-path="' + escText(ext.extensionPath || '') + '" onclick="uninstallExtensionFromBtn(this)">' +
              '<span class="btn-icon">🗑️</span> Uninstall' +
            '</button>' +
          '</div>';
      }

      const isHidden = (currentExtFilter === 'user' && isBuiltin);

      const categoryHtml = (ext.categories && ext.categories.length > 0 && ext.categories[0].trim())
        ? '<span class="ext-category-chip">' + escText(ext.categories[0]) + '</span>'
        : '';

      const iconHtml = ext.iconDataUri
        ? '<img class="ext-icon-img" src="' + ext.iconDataUri + '" alt="' + escText(ext.displayName) + '" />'
        : '<div class="ext-avatar ' + (isMal ? 'avatar-malicious' : isBuiltin ? 'avatar-builtin' : 'avatar-user') + '">' + escText(initial) + '</div>';

      cardsHtml += 
        '<div class="ext-card ' + (isMal ? 'malicious' : 'clean') + '" id="ext-card-' + safeId + '" data-id="' + escText(ext.id.toLowerCase()) + '" data-name="' + escText((ext.displayName || '').toLowerCase()) + '" data-publisher="' + escText((ext.publisher || '').toLowerCase()) + '" data-category="' + (isBuiltin ? 'builtin' : 'user') + '" data-status="' + (isMal ? 'malicious' : 'clean') + '" style="' + (isHidden ? 'display:none;' : 'display:flex;') + '">' +
          '<div class="ext-card-header">' +
            '<div class="ext-card-identity">' +
              '<div class="ext-avatar-wrapper">' +
                iconHtml +
              '</div>' +
              '<div class="ext-title-box">' +
                '<div class="ext-name-row">' +
                  '<span class="ext-name">' + escText(ext.displayName) + '</span>' +
                  categoryHtml +
                '</div>' +
                (ext.description ? '<div class="ext-desc">' + escText(ext.description) + '</div>' : '') +
              '</div>' +
            '</div>' +
            actionsHtml +
          '</div>' +
          threatsBox +
        '</div>';
    }

    container.innerHTML = 
      summaryBanner +
      '<div class="branches-section" id="audit-results-wrapper">' +
        '<div class="branches-toolbar">' +
          '<div class="branches-toolbar-left">' +
            '<span class="branches-toolbar-title">Supply-Chain Security &amp; Extension Scan</span>' +
            '<span class="branches-filter-count" id="ext-filter-count">Showing all ' + totalAudited + ' extensions</span>' +
          '</div>' +
          '<div class="branches-filter-controls">' +
            '<div class="filter-group">' +
              '<span class="filter-group-label">Type:</span>' +
              '<div class="filter-group-buttons">' +
                '<button class="filter-tag ' + (currentExtFilter === 'user' ? 'active' : '') + '" data-filter="user" onclick="handleExtFilterClick(this)">📦 User <span class="tag-count" id="ext-count-user">(' + userCount + ')</span></button>' +
                '<button class="filter-tag ' + (currentExtFilter === 'builtin' ? 'active' : '') + '" data-filter="builtin" onclick="handleExtFilterClick(this)">⚙️ Built-in <span class="tag-count" id="ext-count-builtin">(' + builtinCount + ')</span></button>' +
                '<button class="filter-tag ' + (currentExtFilter === 'all' ? 'active' : '') + '" data-filter="all" onclick="handleExtFilterClick(this)">All <span class="tag-count" id="ext-count-all">(' + totalAudited + ')</span></button>' +
              '</div>' +
            '</div>' +
            '<div class="filter-group">' +
              '<span class="filter-group-label">Status:</span>' +
              '<div class="filter-group-buttons">' +
                '<button class="filter-tag filter-tag-infected ' + (isMalicious ? 'active' : '') + '" data-filter="malicious" onclick="handleExtFilterClick(this)">🔴 Infected <span class="tag-count" id="ext-count-malicious">(' + maliciousCount + ')</span></button>' +
                '<button class="filter-tag filter-tag-clean" data-filter="clean" onclick="handleExtFilterClick(this)">✅ Clean <span class="tag-count" id="ext-count-clean">(' + cleanCount + ')</span></button>' +
              '</div>' +
            '</div>' +
            '<div class="ext-search-box">' +
              '<span class="ext-search-icon">🔍</span>' +
              '<input type="text" class="ext-search-input" id="ext-search-input" placeholder="Search extensions..." oninput="searchExtensions(this.value)" />' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="ext-cards-list" id="ext-cards-list">' +
          cardsHtml +
          '<div id="ext-filter-empty-state" class="ext-filter-empty-state" style="' + (totalAudited === 0 ? 'display:flex;' : 'display:none;') + '">' +
            '<div class="empty-state-icon-box">' +
              '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>' +
            '</div>' +
            '<div class="empty-state-title" id="ext-empty-msg">No extensions found matching your filter.</div>' +
            '<div class="empty-state-sub" id="ext-empty-sub">Check your search query or reset the filters to view installed extensions.</div>' +
            '<button class="ext-reset-btn" onclick="clearExtSearchAndFilter()">' +
              '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>' +
              'Reset Filters' +
            '</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function handleExtFilterClick(btn) {
    document.querySelectorAll('#tab-extension-audit .filter-tag').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    filterExtensions(btn.getAttribute('data-filter') || 'all');
  }

  function filterExtensions(type) {
    currentExtFilter = type;
    applyExtFilterAndSearch();
  }

  let extSearchQuery = '';

  function searchExtensions(query) {
    extSearchQuery = (query || '').toLowerCase().trim();
    applyExtFilterAndSearch();
  }

  function applyExtFilterAndSearch() {
    const cards = document.querySelectorAll('.ext-card');
    let visibleCount = 0;

    cards.forEach(card => {
      const status = card.getAttribute('data-status') || '';
      const category = card.getAttribute('data-category') || 'user';
      const id = card.getAttribute('data-id') || '';
      const name = card.getAttribute('data-name') || '';
      const publisher = card.getAttribute('data-publisher') || '';

      let matchesFilter = true;
      if (currentExtFilter === 'user') {
        matchesFilter = (category === 'user');
      } else if (currentExtFilter === 'builtin') {
        matchesFilter = (category === 'builtin');
      } else if (currentExtFilter === 'malicious') {
        matchesFilter = (status === 'malicious');
      } else if (currentExtFilter === 'clean') {
        matchesFilter = (status === 'clean');
      } else {
        matchesFilter = true;
      }

      const matchesSearch = !extSearchQuery ||
        id.includes(extSearchQuery) ||
        name.includes(extSearchQuery) ||
        publisher.includes(extSearchQuery);

      if (matchesFilter && matchesSearch) {
        card.style.display = 'flex';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    const emptyEl = document.getElementById('ext-filter-empty-state');
    const emptyMsgEl = document.getElementById('ext-empty-msg');
    const emptySubEl = document.getElementById('ext-empty-sub');
    if (emptyEl) {
      if (visibleCount === 0) {
        emptyEl.style.display = 'flex';
        if (emptyMsgEl) {
          if (extSearchQuery) {
            emptyMsgEl.textContent = 'No extensions matching "' + extSearchQuery + '" found.';
            if (emptySubEl) emptySubEl.textContent = 'Check your search query or click reset below.';
          } else if (currentExtFilter === 'malicious') {
            emptyMsgEl.textContent = '🛡️ No infected extensions detected — all installed extensions are clean!';
            if (emptySubEl) emptySubEl.textContent = 'Switch to "User" or "All" to inspect your extension inventory.';
          } else if (currentExtFilter === 'user') {
            emptyMsgEl.textContent = 'No user-installed extensions found.';
            if (emptySubEl) emptySubEl.textContent = 'Switch to "All" or "Built-in" to inspect installed packages.';
          } else if (currentExtFilter === 'builtin') {
            emptyMsgEl.textContent = 'No built-in system extensions found.';
            if (emptySubEl) emptySubEl.textContent = 'Switch to "User" or "All" to inspect installed packages.';
          } else {
            emptyMsgEl.textContent = 'No extensions found matching your filter.';
            if (emptySubEl) emptySubEl.textContent = 'Reset your filter selection to view all extensions.';
          }
        }
      } else {
        emptyEl.style.display = 'none';
      }
    }
  }

  function clearExtSearchAndFilter() {
    const input = document.getElementById('ext-search-input');
    if (input) input.value = '';
    extSearchQuery = '';
    const allBtn = document.querySelector('#tab-extension-audit .filter-tag[data-filter="all"]');
    if (allBtn) {
      document.querySelectorAll('#tab-extension-audit .filter-tag').forEach(b => b.classList.remove('active'));
      allBtn.classList.add('active');
      currentExtFilter = 'all';
    }
    applyExtFilterAndSearch();
  }

  function copyCliUninstallFromBtn(btn) {
    const id = btn.getAttribute('data-ext-id');
    if (id) copyCliUninstall(id, btn);
  }

  function uninstallExtensionFromBtn(btn) {
    const id = btn.getAttribute('data-ext-id');
    const path = btn.getAttribute('data-ext-path') || '';
    if (!id) return;
    btn.disabled = true;
    btn.innerHTML = '<span class="btn-icon">⏳</span> Removing...';
    vscode.postMessage({ action: 'uninstallExtension', id: id, path: path });
  }

  function uninstallExtension(id, extPath, btn) {
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="btn-icon">⏳</span> Removing...';
    }
    vscode.postMessage({ action: 'uninstallExtension', id: id, path: extPath });
  }

  function uninstallAllMalicious() {
    if (!lastExtensionReport) return;
    const malicious = lastExtensionReport.extensions.filter(e => e.status === 'malicious');
    if (malicious.length === 0) return;

    const btn = document.getElementById('btn-remove-all-malicious');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="btn-icon">⏳</span> Removing all...';
    }

    vscode.postMessage({ action: 'uninstallAllMalicious', extensions: malicious });
  }

  function copyCliUninstall(id, btn) {
    const cmd = 'code --uninstall-extension ' + id;
    try {
      navigator.clipboard.writeText(cmd);
    } catch (_) {}
    vscode.postMessage({ action: 'copyText', text: cmd });

    if (btn) {
      const orig = btn.innerHTML;
      btn.innerHTML = '<span class="btn-icon">✓</span> Copied!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.innerHTML = orig;
        btn.classList.remove('copied');
      }, 1500);
    }
  }

  function handleExtensionUninstalled(id, success, message) {
    const safeId = id.replace(/[^a-zA-Z0-9]/g, '_');
    const card = document.getElementById('ext-card-' + safeId);
    if (card) {
      card.classList.add('is-uninstalled');
      const actions = card.querySelector('.ext-card-actions');
      if (actions) {
        actions.innerHTML = '<span class="uninstalled-pill">✓ Uninstalled</span>';
      }
    }

    if (lastExtensionReport) {
      const found = lastExtensionReport.extensions.find(e => e.id.toLowerCase() === id.toLowerCase());
      if (found) {
        found.status = 'clean';
        found.threats = [];
      }
      const remainingMalicious = lastExtensionReport.extensions.filter(e => e.status === 'malicious').length;
      lastExtensionReport.maliciousCount = remainingMalicious;
      lastExtensionReport.cleanCount = lastExtensionReport.totalAudited - remainingMalicious;

      const countEl = document.getElementById('ext-count-malicious');
      if (countEl) countEl.textContent = '(' + remainingMalicious + ')';

      const statMalicious = document.getElementById('ext-stat-malicious');
      if (statMalicious) {
        statMalicious.textContent = remainingMalicious;
        statMalicious.className = 'stat-tab-val ' + (remainingMalicious > 0 ? 'c-red' : 'c-muted');
      }
      const statClean = document.getElementById('ext-stat-clean');
      if (statClean) {
        statClean.textContent = lastExtensionReport.cleanCount;
        statClean.className = 'stat-tab-val ' + (lastExtensionReport.cleanCount > 0 ? 'c-green' : 'c-muted');
      }

      const tabBadge = document.getElementById('nav-tab-ext-badge');
      if (tabBadge) {
        if (remainingMalicious > 0) {
          tabBadge.className = 'nav-tab-status status-danger';
          tabBadge.textContent = '🪲';
          tabBadge.title = remainingMalicious + ' infected extension(s)';
        } else {
          tabBadge.className = 'nav-tab-status status-clean';
          tabBadge.textContent = '✓';
          tabBadge.title = 'All extensions clean';
        }
      }

      if (remainingMalicious === 0) {
        const banner = document.getElementById('audit-summary-banner');
        if (banner) {
          banner.className = 'summary-hero ok';
          banner.innerHTML = 
            '<div class="hero-left">' +
              '<div class="hero-check-circle">✓</div>' +
              '<div class="hero-text">' +
                '<div class="hero-title">All installed extensions are clean</div>' +
                '<div class="hero-sub">Scanned ' + lastExtensionReport.totalAudited + ' extensions (' + (lastExtensionReport.userCount != null ? lastExtensionReport.userCount : '') + ' User · ' + (lastExtensionReport.builtinCount != null ? lastExtensionReport.builtinCount : '') + ' Built-in) — no malicious packages or supply-chain threats detected.</div>' +
              '</div>' +
            '</div>' +
            '<div class="hero-actions">' +
              '<button class="hero-rescan-btn" onclick="triggerExtensionAudit()" title="Re-scan extensions">' +
                '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>' +
                'Re-Scan' +
              '</button>' +
            '</div>';
        }
      }
    }
  }

  function handleAllMaliciousUninstalled(results) {
    if (!lastExtensionReport) return;

    for (const id of (results?.successful || [])) {
      const safeId = id.replace(/[^a-zA-Z0-9]/g, '_');
      const card = document.getElementById('ext-card-' + safeId);
      if (card) {
        card.classList.add('is-uninstalled');
        const actions = card.querySelector('.ext-card-actions');
        if (actions) {
          actions.innerHTML = '<span class="uninstalled-pill">✓ Uninstalled</span>';
        }
      }
      const found = lastExtensionReport.extensions.find(e => e.id.toLowerCase() === id.toLowerCase());
      if (found) {
        found.status = 'clean';
        found.threats = [];
      }
    }

    lastExtensionReport.maliciousCount = 0;
    lastExtensionReport.cleanCount = lastExtensionReport.totalAudited;
    const countEl = document.getElementById('ext-count-malicious');
    if (countEl) countEl.textContent = '(0)';

    const statMalicious = document.getElementById('ext-stat-malicious');
    if (statMalicious) {
      statMalicious.textContent = '0';
      statMalicious.className = 'stat-tab-val c-muted';
    }
    const statClean = document.getElementById('ext-stat-clean');
    if (statClean) {
      statClean.textContent = lastExtensionReport.totalAudited;
      statClean.className = 'stat-tab-val c-green';
    }

    const tabBadge = document.getElementById('nav-tab-ext-badge');
    if (tabBadge) {
      tabBadge.className = 'nav-tab-status status-clean';
      tabBadge.textContent = '✓';
      tabBadge.title = 'All extensions clean';
    }

    const banner = document.getElementById('audit-summary-banner');
    if (banner) {
      banner.className = 'summary-hero ok';
      banner.innerHTML = 
        '<div class="hero-left">' +
          '<div class="hero-check-circle">✓</div>' +
          '<div class="hero-text">' +
            '<div class="hero-title">All installed extensions are clean</div>' +
            '<div class="hero-sub">Scanned ' + lastExtensionReport.totalAudited + ' extensions (' + (lastExtensionReport.userCount != null ? lastExtensionReport.userCount : '') + ' User · ' + (lastExtensionReport.builtinCount != null ? lastExtensionReport.builtinCount : '') + ' Built-in) — no malicious packages or supply-chain threats detected.</div>' +
          '</div>' +
        '</div>' +
        '<div class="hero-actions">' +
          '<button class="hero-rescan-btn" onclick="triggerExtensionAudit()" title="Re-scan extensions">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>' +
            'Re-Scan' +
          '</button>' +
        '</div>';
    }
  }

  window.addEventListener('message', event => {
    const msg = event.data;
    if (!msg) return;
    if (msg.action === 'extensionAuditProgress') {
      updateExtensionScanProgress(msg.progress);
    } else if (msg.action === 'extensionAuditComplete') {
      renderExtensionAuditResults(msg.report);
    } else if (msg.action === 'extensionUninstalled') {
      handleExtensionUninstalled(msg.id, msg.success, msg.message);
    } else if (msg.action === 'allMaliciousUninstalled') {
      handleAllMaliciousUninstalled(msg.results);
    }
  });
</script>
</body>
</html>`;
}

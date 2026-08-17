import { WorkspaceScanResult, BranchScanResult, Threat, getActiveThreats, getSafeThreats } from './scanner';
import { SafeRuleEntry } from './preferences';

function severityColor(s: string): string {
  return s === 'critical' ? 'var(--red)' : s === 'high' ? 'var(--orange)' : 'var(--yellow)';
}
function severityBg(s: string): string {
  return s === 'critical' ? 'var(--bg-red-soft)' : s === 'high' ? 'var(--bg-orange-soft)' : 'var(--bg-yellow-soft)';
}
function severityBorder(s: string): string {
  return s === 'critical' ? 'var(--border-red)' : s === 'high' ? 'var(--border-orange)' : 'var(--border-yellow)';
}
function escHtml(s: any): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function branchStatusBadge(result: BranchScanResult): string {
  const active = getActiveThreats(result.threats);
  const safe = getSafeThreats(result.threats);
  const critical = active.filter(t => t.severity === 'critical').length;
  const high = active.filter(t => t.severity === 'high').length;
  const medium = active.filter(t => t.severity === 'medium').length;
  if (result.error) return `<span class="badge badge-gray">⚠ Error</span>`;
  if (critical > 0) return `<span class="badge badge-red">🔴 ${critical} critical${high ? ` · ${high} high` : ''}</span>`;
  if (high > 0) return `<span class="badge badge-orange">🟠 ${high} high${medium ? ` · ${medium} medium` : ''}</span>`;
  if (medium > 0) return `<span class="badge badge-yellow">🟡 ${medium} medium</span>`;
  if (safe.length > 0) return `<span class="badge badge-green">✓ Clean · ${safe.length} Safe</span>`;
  return `<span class="badge badge-green">✓ Clean</span>`;
}

function threatCard(t: Threat, branch: string, uid: string): string {
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

function isRemoteBranch(branchName: string, localBranches: string[], remoteBranches: string[]): boolean {
  if (branchName.endsWith(' (working tree)')) return false;
  if (remoteBranches.includes(branchName)) return true;
  if (localBranches.includes(branchName)) return false;
  return branchName.includes('/');
}

function branchSection(r: BranchScanResult, isRemote: boolean = false): string {
  const activeThreats = getActiveThreats(r.threats);
  const safeThreats = getSafeThreats(r.threats);
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
      <span class="branch-chevron">▶</span>
      <span class="branch-icon">⎇</span>
      <span class="branch-name">${escHtml(r.branch)}${r.isCurrentBranch ? ' <span class="current-tag">current</span>' : ''}</span>
      <div class="branch-right">
        <span class="branch-scope-tag ${isRemote ? 'tag-remote' : 'tag-local'}" onclick="event.stopPropagation(); applyFilter('${type}')">${isRemote ? 'Remote' : 'Local'}</span>
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

function buildSafeRulesPanel(safeRules?: SafeRuleEntry[]): string {
  if (!safeRules || safeRules.length === 0) return '';

  return `
<details class="safe-rules-panel">
  <summary class="safe-rules-header">
    <span class="bo-chevron">▶</span>
    <span class="bo-title-icon">🛡️</span>
    <span class="bo-title">Whitelisted Rules (Marked as Safe)</span>
    <span class="safe-rules-count">${safeRules.length}</span>
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

function buildBranchOverview(result: WorkspaceScanResult): string {
  const scanMap = new Map<string, BranchScanResult>();
  for (const b of result.branches) scanMap.set(b.branch, b);

  const currentBranch = result.currentBranch || '';
  const localBranches = result.localBranches || result.branches.map(b => b.branch);
  const remoteBranches = result.remoteBranches || [];

  const curScan = scanMap.get(`${currentBranch} (working tree)`) || scanMap.get(currentBranch);
  const curBadge = curScan ? branchStatusBadge(curScan) : '';

  const localRows = localBranches.map(name => {
    const scan = scanMap.get(name) || (name === currentBranch ? scanMap.get(`${currentBranch} (working tree)`) : undefined);
    const isCurrent = name === currentBranch;
    const dotClass = isCurrent ? 'dot-current'
      : scan && getActiveThreats(scan.threats).length > 0 ? 'dot-infected'
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
    <span class="bo-chevron">▶</span>
    <span class="bo-title-icon">⎇</span>
    <span class="bo-title">Branch Overview</span>
    <div class="bo-chips" onclick="event.preventDefault(); event.stopPropagation()">
      ${currentBranch ? `<span class="bo-chip bo-chip-current">⎇ ${escHtml(currentBranch)}</span>` : ''}
      <span class="bo-chip bo-chip-counts">${localBranches.length} Local • ${remoteBranches.length} Remote</span>
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

export function buildReportHtml(result: WorkspaceScanResult): string {
  const allThreats = result.branches.flatMap(b => b.threats);
  const activeThreats = getActiveThreats(allThreats);
  const safeThreats = getSafeThreats(allThreats);
  const totalThreats = activeThreats.length;
  const totalSafeThreats = safeThreats.length;
  const infectedBranches = result.branches.filter(b => getActiveThreats(b.threats).length > 0);
  const cleanBranches = result.branches.filter(b => getActiveThreats(b.threats).length === 0 && !b.error);
  const safeBranches = result.branches.filter(b => getSafeThreats(b.threats).length > 0);
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

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
  <title>Guardian Scan Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        var(--vscode-editor-background, #1e1e1e);
      --bg2:       var(--vscode-sideBar-background, #252526);
      --bg3:       var(--vscode-panel-background, #1e1e1e);
      --border:    var(--vscode-panel-border, #2d2d2d);
      --border2:   var(--vscode-widget-border, #3c3c3c);
      --text:      var(--vscode-editor-foreground, #e2e2e8);
      --text2:     var(--vscode-descriptionForeground, #9090a0);
      --text3:     var(--vscode-disabledForeground, #50505e);
      
      --red:       var(--vscode-errorForeground, #f87171);
      --orange:    var(--vscode-editorWarning-foreground, #fb923c);
      --yellow:    var(--vscode-editorInfo-foreground, #fbbf24);
      --green:     var(--vscode-gitDecoration-addedResourceForeground, #4ade80);
      --blue:      var(--vscode-textLink-foreground, #60a5fa);
      --purple:    var(--vscode-gitDecoration-ignoredResourceForeground, #a78bfa);
      
      --bg-red-soft: rgba(248, 113, 113, 0.08);
      --bg-orange-soft: rgba(251, 146, 60, 0.08);
      --bg-yellow-soft: rgba(251, 191, 36, 0.08);
      --bg-green-soft: rgba(74, 222, 128, 0.06);
      
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
      position: sticky; top: 0; z-index: 20;
    }
    .header-main {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px; margin-bottom: 8px; flex-wrap: wrap;
    }
    .header-left {
      display: flex; flex-direction: column; min-width: 0;
    }
    .header-title-row {
      display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
    }
    .header-logo {
      width: 28px; height: 28px;
      background: linear-gradient(135deg, rgba(30, 58, 90, 0.5), rgba(13, 33, 55, 0.5));
      border: 1px solid var(--border2);
      border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }
    .header-title-row h1 {
      font-size: 14px; font-weight: 600; color: var(--text);
      letter-spacing: -0.01em;
    }
    .header-title-row h1 span { color: var(--text2); font-weight: 400; }
    .workspace-path {
      font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
      font-size: 10px; color: var(--text3);
      margin-top: 3px;
      word-break: break-all;
      padding-left: 38px;
    }
    .header-actions {
      margin-left: auto;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 4px;
      flex-shrink: 0;
    }
    .rescan-btn {
      display: flex; align-items: center; gap: 6px;
      background: var(--vscode-button-secondaryBackground, #3a3d3e);
      color: var(--vscode-button-secondaryForeground, #ffffff);
      border: 1px solid var(--border);
      padding: 5px 13px; border-radius: 7px; cursor: pointer;
      font-size: 12px; font-weight: 600; white-space: nowrap;
      transition: all 0.12s;
    }
    .rescan-btn:hover {
      background: var(--vscode-button-secondaryHoverBackground, #45494a);
      border-color: var(--vscode-focusBorder);
    }
    .reload-link-btn {
      background: none;
      border: none;
      color: var(--vscode-textLink-foreground, var(--blue));
      font-size: 10px;
      font-weight: 600;
      cursor: pointer;
      padding: 1px 2px;
      border-radius: 3px;
      display: inline-flex;
      align-items: center;
      text-decoration: none;
      white-space: nowrap;
      transition: all 0.12s ease;
    }
    .reload-link-btn:hover {
      text-decoration: underline;
      color: var(--vscode-textLink-activeForeground, #70b0ff);
    }

    /* ─────────────────────────────────────────────
       STAT TABS  (bottom of header, no scroll-away)
    ───────────────────────────────────────────── */
    .stat-tabs {
      display: flex; gap: 0;
      border-top: 1px solid var(--border);
      margin: 0 -28px;
    }
    .stat-tab {
      flex: 1; padding: 10px 16px;
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column;
      gap: 2px; min-width: 0;
    }
    .stat-tab:last-child { border-right: none; }
    .stat-tab-val {
      font-size: 20px; font-weight: 700; line-height: 1;
      letter-spacing: -0.02em;
    }
    .stat-tab-lbl {
      font-size: 10px; color: var(--text3);
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
      padding: 18px 22px;
      border-radius: 12px;
      border: 1px solid var(--border);
      display: flex; align-items: center; gap: 16px;
    }
    .summary-hero.ok     { background: var(--bg-green-soft); border-color: rgba(74, 222, 128, 0.2); }
    .summary-hero.danger { background: var(--bg-red-soft); border-color: rgba(248, 113, 113, 0.2); }
    .summary-hero.warn   { background: var(--bg-orange-soft); border-color: rgba(251, 146, 60, 0.2); }
    .hero-icon {
      font-size: 28px; flex-shrink: 0;
      width: 52px; height: 52px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 14px;
    }
    .summary-hero.ok     .hero-icon { background: rgba(74, 222, 128, 0.12); }
    .summary-hero.danger .hero-icon { background: rgba(248, 113, 113, 0.12); }
    .summary-hero.warn   .hero-icon { background: rgba(251, 146, 60, 0.12); }
    .hero-text {}
    .hero-title {
      font-size: 16px; font-weight: 700;
      letter-spacing: -0.02em; line-height: 1.2;
    }
    .summary-hero.ok     .hero-title { color: var(--green); }
    .summary-hero.danger .hero-title { color: var(--red); }
    .summary-hero.warn   .hero-title { color: var(--orange); }
    .hero-sub { font-size: 12px; color: var(--text2); margin-top: 4px; }
    .hero-badges { margin-left: auto; display: flex; flex-direction: column; gap: 5px; align-items: flex-end; flex-shrink: 0; }

    /* ─────────────────────────────────────────────
       BRANCH OVERVIEW
    ───────────────────────────────────────────── */
    .branch-overview {
      margin: 16px 28px 0;
      border: 1px solid var(--border);
      border-radius: 12px; overflow: hidden;
    }
    .bo-header {
      display: flex; align-items: center; gap: 8px;
      padding: 11px 16px;
      background: var(--bg3);
      cursor: pointer; user-select: none; list-style: none;
    }
    .bo-header::-webkit-details-marker { display: none; }
    details[open] > .bo-header { border-bottom: 1px solid var(--border); }
    details[open] > .bo-header .bo-chevron { transform: rotate(90deg); }
    .bo-chevron { color: var(--text3); font-size: 8px; transition: transform 0.18s; display: inline-block; flex-shrink: 0; }
    .bo-title-icon { color: var(--text3); font-size: 13px; }
    .bo-title { font-size: 11px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.08em; }
    .bo-chips { margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; cursor: default; }
    .bo-chip {
      font-size: 10px; font-weight: 600;
      padding: 2px 9px; border-radius: 20px; white-space: nowrap;
      cursor: default;
    }
    .bo-chip-current { background: rgba(55, 148, 255, 0.1); color: var(--blue);   border: 1px solid rgba(55, 148, 255, 0.25); }
    .bo-chip-counts  { background: rgba(167, 139, 250, 0.1); color: var(--purple); border: 1px solid rgba(167, 139, 250, 0.25); }
    .bo-chip-local   { background: rgba(167, 139, 250, 0.1); color: var(--purple); border: 1px solid rgba(167, 139, 250, 0.25); }
    .bo-chip-remote  { background: var(--bg3); color: var(--text3); border: 1px solid var(--border); }
    .bo-body { padding: 14px 16px; background: var(--bg2); }

    .bo-current-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; margin-bottom: 14px;
      background: var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.04));
      border: 1px solid var(--border);
      border-left: 3px solid var(--blue);
      border-radius: 8px;
    }
    .bo-current-left { display: flex; flex-direction: column; gap: 2px; }
    .bo-current-label { font-size: 9px; font-weight: 700; color: var(--blue); text-transform: uppercase; letter-spacing: 0.1em; }
    .bo-current-name  { font-family: 'SF Mono','Cascadia Code','Consolas',monospace; font-size: 14px; font-weight: 700; color: var(--blue); }

    .bo-columns { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .bo-col { background: var(--bg3); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .bo-col-header {
      display: flex; align-items: center; gap: 7px;
      padding: 8px 12px;
      background: var(--bg2); border-bottom: 1px solid var(--border);
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
    .bo-branch-row.is-current { color: var(--blue); background: var(--vscode-editor-inactiveSelectionBackground, rgba(128, 128, 128, 0.04)); }
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
      opacity: 1; color: var(--text); background: var(--bg); border-color: var(--border);
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
    .branches-section { padding: 16px 28px 0; }
    .branches-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      gap: 12px; margin-top: 22px; margin-bottom: 12px;
      padding-bottom: 10px; border-bottom: 1px solid var(--border);
      flex-wrap: wrap;
    }
    .branches-toolbar-left {
      display: flex; align-items: baseline; gap: 8px;
    }
    .branches-toolbar-title {
      font-size: 12px; font-weight: 700; color: var(--text);
      letter-spacing: -0.01em; text-transform: uppercase;
    }
    .branches-filter-count {
      font-size: 11px; color: var(--text3);
    }
    .branches-filter-controls {
      display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
    }
    .filter-group {
      display: flex; align-items: center; gap: 6px;
    }
    .filter-group-label {
      font-size: 10px; font-weight: 700; color: var(--text3);
      text-transform: uppercase; letter-spacing: 0.06em;
    }
    .filter-group-buttons {
      display: flex; align-items: center; gap: 4px;
    }
    .filter-group-divider {
      width: 1px; height: 16px; background: var(--border);
    }
    .filter-tag {
      font-size: 11px; font-weight: 600;
      padding: 3px 10px; border-radius: 6px;
      background: var(--bg3); color: var(--text2);
      border: 1px solid var(--border);
      cursor: pointer; user-select: none;
      transition: all 0.12s ease;
      display: inline-flex; align-items: center; gap: 4px;
    }
    .filter-tag:hover {
      background: var(--vscode-list-hoverBackground, rgba(128, 128, 128, 0.08));
      color: var(--text); border-color: var(--border2);
    }
    .filter-tag.active {
      background: var(--vscode-button-background, #0e639c);
      color: var(--vscode-button-foreground, #ffffff);
      border-color: var(--vscode-button-background, #0e639c);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    }
    .filter-tag.filter-tag-infected.active {
      background: var(--red); color: #ffffff; border-color: var(--red);
    }
    .filter-tag.filter-tag-clean.active {
      background: #16a34a; color: #ffffff; border-color: #16a34a;
    }
    .filter-tag.filter-tag-safe.active {
      background: var(--purple); color: #ffffff; border-color: var(--purple);
    }
    .tag-count {
      font-size: 10px; font-weight: 700; opacity: 0.85; margin-left: 2px;
    }
    .filter-empty-state {
      display: none; padding: 28px 16px; text-align: center;
      color: var(--text3); font-size: 12px;
      background: var(--bg2); border: 1px dashed var(--border); border-radius: 8px;
      margin: 16px 0;
    }
    .filter-reset-btn {
      margin-top: 8px; background: transparent; border: 1px solid var(--blue);
      color: var(--blue); border-radius: 4px; padding: 3px 10px;
      font-size: 11px; font-weight: 600; cursor: pointer;
    }
    .filter-reset-btn:hover { background: rgba(55, 148, 255, 0.1); }

    /* Branch row type tag */
    .branch-scope-tag {
      font-size: 9px; font-weight: 700; text-transform: uppercase;
      padding: 2px 7px; border-radius: 4px; letter-spacing: 0.05em;
      white-space: nowrap; cursor: pointer; transition: all 0.12s;
    }
    .branch-scope-tag:hover { opacity: 0.85; transform: scale(1.04); }
    .tag-local  { background: rgba(167, 139, 250, 0.12); color: var(--purple); border: 1px solid rgba(167, 139, 250, 0.3); }
    .tag-remote { background: var(--bg3); color: var(--text3); border: 1px solid var(--border); }

    .section-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 10px; margin-top: 18px;
    }
    .section-icon { font-size: 13px; }
    .section-label {
      font-size: 11px; font-weight: 700; color: var(--text2);
      text-transform: uppercase; letter-spacing: 0.09em;
    }
    .section-count {
      font-size: 10px; font-weight: 700;
      padding: 1px 8px; border-radius: 10px;
    }
    .section-count.red    { background: var(--bg-red-soft); color: var(--red);   border: 1px solid var(--border-red); }
    .section-count.green  { background: var(--bg-green-soft); color: var(--green); border: 1px solid rgba(74, 222, 128, 0.2); }
    .section-count.muted  { background: var(--bg3); color: var(--text3); border: 1px solid var(--border); }
    .section-divider {
      flex: 1; height: 1px; background: var(--border);
    }

    .branch-block {
      border: 1px solid var(--border);
      border-radius: 10px; margin-bottom: 8px;
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
    .branch-block.clean    { border-color: rgba(74, 222, 128, 0.2); }

    .branch-summary {
      display: flex; align-items: center; gap: 9px;
      padding: 11px 16px; cursor: pointer;
      list-style: none; user-select: none;
      transition: background 0.1s;
    }
    .branch-summary:hover {
      background: var(--vscode-list-hoverBackground, rgba(128, 128, 128, 0.05));
    }
    .branch-summary::-webkit-details-marker { display: none; }
    details[open] > .branch-summary .branch-chevron { transform: rotate(90deg); }
    .branch-chevron { color: var(--text3); font-size: 8px; transition: transform 0.18s; display: inline-block; flex-shrink: 0; }
    .branch-block.infected .branch-summary { background: transparent; }
    .branch-block.clean    .branch-summary { background: transparent; }
    .branch-icon  { color: var(--text3); flex-shrink: 0; font-size: 13px; }
    .branch-name  { font-weight: 600; color: var(--text); flex: 1; font-size: 13px; min-width: 0;
                    font-family: 'SF Mono','Cascadia Code','Consolas',monospace; }
    .current-tag  { font-size: 9px; font-weight: 600; background: rgba(55, 148, 255, 0.1); color: var(--blue);
                    border: 1px solid rgba(55, 148, 255, 0.2); border-radius: 4px; padding: 1px 5px; margin-left: 6px;
                    font-family: -apple-system, sans-serif; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: middle; }
    .branch-right { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .branch-meta  { color: var(--text3); font-size: 10px; white-space: nowrap; }

    /* ─────────────────────────────────────────────
       BADGES
    ───────────────────────────────────────────── */
    .badge { padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 700; white-space: nowrap; flex-shrink: 0; letter-spacing: 0.01em; }
    .badge-red    { background: var(--bg-red-soft); color: var(--red);    border: 1px solid var(--border-red); }
    .badge-orange { background: var(--bg-orange-soft); color: var(--orange); border: 1px solid var(--border-orange); }
    .badge-yellow { background: var(--bg-yellow-soft); color: var(--yellow); border: 1px solid var(--border-yellow); }
    .badge-green  { background: var(--bg-green-soft); color: var(--green);  border: 1px solid rgba(74, 222, 128, 0.2); }
    .badge-gray   { background: var(--bg3); color: var(--text3); border: 1px solid var(--border); }

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
      position: relative; z-index: 5;
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
      position: relative; display: inline-block; z-index: 50;
    }
    .safe-dropdown.is-open {
      z-index: 2000;
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
      z-index: 3000;
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
      margin: 16px 28px 0;
      background: var(--bg2);
      border: 1px solid rgba(74, 222, 128, 0.25);
      border-radius: 12px; overflow: hidden;
    }
    .safe-rules-header {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 16px; background: rgba(74, 222, 128, 0.05);
      cursor: pointer; user-select: none; list-style: none;
    }
    .safe-rules-header::-webkit-details-marker { display: none; }
    details[open] > .safe-rules-header { border-bottom: 1px solid var(--border); }
    details[open] > .safe-rules-header .bo-chevron { transform: rotate(90deg); }
    .safe-rules-count {
      margin-left: auto; font-size: 10px; font-weight: 700;
      background: rgba(74, 222, 128, 0.15); color: var(--green);
      padding: 1px 7px; border-radius: 10px; border: 1px solid rgba(74, 222, 128, 0.3);
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

    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: var(--bg2); }
    ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #3a3a4a; }
  </style>
</head>
<body>

<div class="header">
  <div class="header-main">
    <div class="header-left">
      <div class="header-title-row">
        <div class="header-logo">🛡️</div>
        <h1>Guardian <span>— Branch Scan Report</span></h1>
        ${projectBadge}
      </div>
      <div class="workspace-path">${escHtml(result.workspacePath)}</div>
    </div>
    <div class="header-actions">
      <button class="rescan-btn" onclick="rescan()">↺ Rescan</button>
      <button class="reload-link-btn" onclick="reloadWindow()" title="Cmd+Shift+P → Developer: Reload Window">Reload Window</button>
    </div>
  </div>
  <div class="stat-tabs">
    <div class="stat-tab">
      <div class="stat-tab-val ${totalThreats > 0 ? 'c-red' : 'c-green'}">${totalThreats}</div>
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
      <div class="stat-tab-val ${infectedBranches.length > 0 ? 'c-red' : 'c-green'}">${infectedBranches.length}</div>
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
</div>

<div class="summary-hero ${isClean ? 'ok' : criticalCount > 0 ? 'danger' : 'warn'}" style="margin:20px 28px 0">
  <div class="hero-icon">${isClean ? '✅' : criticalCount > 0 ? '🚨' : '⚠️'}</div>
  <div class="hero-text">
    <div class="hero-title">${summaryTitle}</div>
    <div class="hero-sub">${summarySubtitle}</div>
  </div>
  ${!isClean ? `<div class="hero-badges">
    ${criticalCount > 0 ? `<span class="badge badge-red">🔴 ${criticalCount} Critical</span>` : ''}
    ${highCount > 0 ? `<span class="badge badge-orange">🟠 ${highCount} High</span>` : ''}
  </div>` : ''}
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
          <button class="filter-tag active" data-group="scope" data-value="all" onclick="setScopeFilter('all')">All <span class="tag-count">(${result.branches.length})</span></button>
          <button class="filter-tag" data-group="scope" data-value="local" onclick="setScopeFilter('local')">💻 Local <span class="tag-count">(${localBranchCount})</span></button>
          ${remoteBranchCount > 0 ? `<button class="filter-tag" data-group="scope" data-value="remote" onclick="setScopeFilter('remote')">☁️ Remote <span class="tag-count">(${remoteBranchCount})</span></button>` : ''}
        </div>
      </div>
      <div class="filter-group-divider"></div>
      <div class="filter-group">
        <span class="filter-group-label">Status:</span>
        <div class="filter-group-buttons">
          <button class="filter-tag active" data-group="status" data-value="all" onclick="setStatusFilter('all')">All</button>
          <button class="filter-tag filter-tag-infected" data-group="status" data-value="infected" onclick="setStatusFilter('infected')">🔴 Infected <span class="tag-count">(${infectedBranches.length})</span></button>
          <button class="filter-tag filter-tag-clean" data-group="status" data-value="clean" onclick="setStatusFilter('clean')">✅ Clean <span class="tag-count">(${cleanBranches.length})</span></button>
          ${safeBranches.length > 0 ? `<button class="filter-tag filter-tag-safe" data-group="status" data-value="safe" onclick="setStatusFilter('safe')">🛡️ Safe <span class="tag-count">(${safeBranches.length})</span></button>` : ''}
        </div>
      </div>
    </div>
  </div>

  <div id="filter-empty-state" class="filter-empty-state">
    <p>No branches match the selected filter.</p>
    <button class="filter-reset-btn" onclick="resetAllFilters()">Reset filters</button>
  </div>

  ${infectedBranches.length > 0 ? `
    <div class="section-header" id="infected-section-header">
      <span class="section-icon">🔴</span>
      <span class="section-label">Infected Branches</span>
      <span class="section-count red" id="infected-visible-count">${infectedBranches.length}</span>
      <div class="section-divider"></div>
    </div>
    ${infectedBranches.map(b => branchSection(b, isRemoteBranch(b.branch, localBranches, remoteBranches))).join('')}
  ` : ''}

  ${cleanBranches.length > 0 ? `
    <div class="section-header" id="clean-section-header">
      <span class="section-icon">✅</span>
      <span class="section-label">Clean Branches</span>
      <span class="section-count green" id="clean-visible-count">${cleanBranches.length}</span>
      <div class="section-divider"></div>
    </div>
    ${cleanBranches.map(b => branchSection(b, isRemoteBranch(b.branch, localBranches, remoteBranches))).join('')}
  ` : ''}

  ${result.branches.filter(b => b.error).length > 0 ? `
    <div class="section-header" id="error-section-header">
      <span class="section-icon">⚠️</span>
      <span class="section-label">Errors</span>
      <span class="section-count muted" id="error-visible-count">${result.branches.filter(b => b.error).length}</span>
      <div class="section-divider"></div>
    </div>
    ${result.branches.filter(b => b.error).map(b => branchSection(b, isRemoteBranch(b.branch, localBranches, remoteBranches))).join('')}
  ` : ''}
</div>

<div class="footer">
  <span class="footer-badge">Guardian v${result.version || '1.1.0'}</span>
  <span class="footer-dot">·</span>
  Scanned ${result.branches.length} branch${result.branches.length !== 1 ? 'es' : ''}
  <span class="footer-dot">·</span>
  ${totalFiles} files checked
  <span class="footer-dot">·</span>
  ${result.scanDurationMs}ms
</div>

<script>
  const vscode = acquireVsCodeApi();

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

    if (emptyState) emptyState.style.display = visibleTotal === 0 ? 'block' : 'none';
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
</script>
</body>
</html>`;
}

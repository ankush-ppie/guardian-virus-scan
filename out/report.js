"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReportHtml = buildReportHtml;

function severityColor(s) {
  return s === 'critical' ? '#f87171' : s === 'high' ? '#fb923c' : '#fbbf24';
}
function severityBg(s) {
  return s === 'critical' ? '#3b0a0a' : s === 'high' ? '#3b1505' : '#3b2000';
}
function severityBorder(s) {
  return s === 'critical' ? '#f87171' : s === 'high' ? '#fb923c' : '#fbbf24';
}
function escHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function branchStatusBadge(result) {
  const critical = result.threats.filter(t => t.severity === 'critical').length;
  const high = result.threats.filter(t => t.severity === 'high').length;
  const medium = result.threats.filter(t => t.severity === 'medium').length;
  if (result.error) return `<span class="badge badge-gray">⚠ Error</span>`;
  if (critical > 0) return `<span class="badge badge-red">🔴 ${critical} critical${high ? ` · ${high} high` : ''}</span>`;
  if (high > 0) return `<span class="badge badge-orange">🟠 ${high} high${medium ? ` · ${medium} medium` : ''}</span>`;
  if (medium > 0) return `<span class="badge badge-yellow">🟡 ${medium} medium</span>`;
  return `<span class="badge badge-green">✓ Clean</span>`;
}

function threatCard(t, branch, uid) {
  const snippetId = `snip-${uid}`;
  const btnId = `btn-${uid}`;

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

  return `
    <div class="threat-card" data-sev="${t.severity}">
      <div class="threat-left-bar" style="background:${severityColor(t.severity)}"></div>
      <div class="threat-body">
        <div class="threat-header">
          <span class="sev-pill" style="background:${severityBg(t.severity)};color:${severityColor(t.severity)};border:1px solid ${severityColor(t.severity)}30">${t.severity.toUpperCase()}</span>
          <code class="rule-code">${escHtml(t.rule)}</code>
          <span class="file-ref">
            <span class="file-ref-icon">📁</span>${escHtml(t.file)}${t.line ? `<span class="file-ref-line">:${t.line}</span>` : ''}
          </span>
          <div class="threat-actions">
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

function branchSection(r) {
  const isClean = r.threats.length === 0 && !r.error;
  const isInfected = r.threats.length > 0;

  const cards = r.threats
    .map((t, i) => threatCard(t, r.branch, `${r.branch.replace(/[^a-zA-Z0-9]/g, '_')}_${i}`))
    .join('');

  return `
  <details class="branch-block ${isInfected ? 'infected' : isClean ? 'clean' : 'error'}" ${isInfected ? 'open' : ''}>
    <summary class="branch-summary">
      <span class="branch-chevron">▶</span>
      <span class="branch-icon">⎇</span>
      <span class="branch-name">${escHtml(r.branch)}${r.isCurrentBranch ? ' <span class="current-tag">current</span>' : ''}</span>
      <div class="branch-right">
        ${branchStatusBadge(r)}
        <span class="branch-meta">${r.scannedFiles.length} file${r.scannedFiles.length !== 1 ? 's' : ''} scanned</span>
      </div>
    </summary>
    ${isClean ? '<div class="clean-msg"><span class="clean-icon">✓</span> No threats found in this branch.</div>' : ''}
    ${r.error ? `<div class="error-msg">⚠ Could not read branch: ${escHtml(r.error)}</div>` : ''}
    ${cards}
  </details>`;
}

function buildBranchOverview(result) {
  const scanMap = new Map();
  for (const b of result.branches) scanMap.set(b.branch, b);

  const currentBranch = result.currentBranch || '';
  const localBranches = result.localBranches || result.branches.map(b => b.branch);
  const remoteBranches = result.remoteBranches || [];

  const curScan = scanMap.get(currentBranch);
  const curBadge = curScan ? branchStatusBadge(curScan) : '';

  const localRows = localBranches.map(name => {
    const scan = scanMap.get(name);
    const isCurrent = name === currentBranch;
    const dotClass = isCurrent ? 'dot-current'
      : scan && scan.threats.length > 0 ? 'dot-infected'
        : 'dot-clean';
    const inlineBadge = scan ? `<span class="bo-inline-badge">${branchStatusBadge(scan)}</span>` : '';
    return `<div class="bo-branch-row${isCurrent ? ' is-current' : ''}">
          <span class="bo-branch-dot ${dotClass}"></span>
          <span class="bo-branch-name-text" title="${escHtml(name)}">${escHtml(name)}${isCurrent ? ' <span class="bo-star">★</span>' : ''}</span>
          ${inlineBadge}
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
              <span class="bo-branch-name-text" title="${escHtml(name)}">${display}</span>
            </div>`;
    }).join('');

  return `
<details class="branch-overview" open>
  <summary class="bo-header">
    <span class="bo-chevron">▶</span>
    <span class="bo-title-icon">⎇</span>
    <span class="bo-title">Branch Overview</span>
    <div class="bo-chips">
      ${currentBranch ? `<span class="bo-chip bo-chip-current">⎇ ${escHtml(currentBranch)}</span>` : ''}
      <span class="bo-chip bo-chip-local">${localBranches.length} local</span>
      ${remoteBranches.length > 0 ? `<span class="bo-chip bo-chip-remote">${remoteBranches.length} remote</span>` : ''}
    </div>
  </summary>
  <div class="bo-body">
    ${currentBranch ? `
    <div class="bo-current-row">
      <div class="bo-current-left">
        <span class="bo-current-label">CURRENT BRANCH</span>
        <span class="bo-current-name">⎇ ${escHtml(currentBranch)}</span>
      </div>
      <span class="bo-current-badge">${curBadge}</span>
    </div>` : ''}
    <div class="bo-columns">
      <div class="bo-col">
        <div class="bo-col-header">
          <span class="bo-col-icon">💻</span>
          <span class="bo-col-title">Local Branches</span>
          <span class="bo-col-count">${localBranches.length}</span>
        </div>
        <div class="bo-branch-list">${localRows || '<div class="bo-empty">None</div>'}</div>
      </div>
      <div class="bo-col">
        <div class="bo-col-header">
          <span class="bo-col-icon">☁️</span>
          <span class="bo-col-title">Remote Branches</span>
          <span class="bo-col-count">${remoteBranches.length}</span>
        </div>
        <div class="bo-branch-list">${remoteRows}</div>
      </div>
    </div>
  </div>
</details>`;
}

function buildReportHtml(result) {
  const totalThreats = result.branches.reduce((n, b) => n + b.threats.length, 0);
  const infectedBranches = result.branches.filter(b => b.threats.length > 0);
  const cleanBranches = result.branches.filter(b => b.threats.length === 0 && !b.error);
  const criticalCount = result.branches.reduce((n, b) => n + b.threats.filter(t => t.severity === 'critical').length, 0);
  const highCount = result.branches.reduce((n, b) => n + b.threats.filter(t => t.severity === 'high').length, 0);
  const totalFiles = result.branches.reduce((n, b) => n + b.scannedFiles.length, 0);

  const isClean = totalThreats === 0;
  const summaryTitle = isClean ? '✓ All branches are clean' : `${totalThreats} threat${totalThreats !== 1 ? 's' : ''} found`;
  const summarySubtitle = isClean
    ? `Scanned ${result.branches.length} branch${result.branches.length !== 1 ? 'es' : ''} — no malicious content detected.`
    : `Across ${infectedBranches.length} infected branch${infectedBranches.length !== 1 ? 'es' : ''}. Do not use infected branches until threats are removed.`;

  const projectBadge = `<span class="proj-badge proj-${result.projectType}">${result.projectType.charAt(0).toUpperCase() + result.projectType.slice(1)}</span>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Guardian Scan Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0b0b0d;
      --bg2:       #101014;
      --bg3:       #141418;
      --border:    #1e1e26;
      --border2:   #26262e;
      --text:      #e2e2e8;
      --text2:     #9090a0;
      --text3:     #50505e;
      --red:       #f87171;
      --orange:    #fb923c;
      --yellow:    #fbbf24;
      --green:     #4ade80;
      --blue:      #60a5fa;
      --purple:    #a78bfa;
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
    .header-top {
      display: flex; align-items: center; gap: 10px;
      margin-bottom: 4px; flex-wrap: wrap;
    }
    .header-logo {
      width: 28px; height: 28px;
      background: linear-gradient(135deg, #1e3a5a, #0d2137);
      border: 1px solid #2a5a8a;
      border-radius: 7px;
      display: flex; align-items: center; justify-content: center;
      font-size: 15px; flex-shrink: 0;
    }
    .header-top h1 {
      font-size: 14px; font-weight: 600; color: var(--text);
      letter-spacing: -0.01em;
    }
    .header-top h1 span { color: var(--text2); font-weight: 400; }
    .workspace-path {
      font-family: 'SF Mono', 'Cascadia Code', 'Consolas', monospace;
      font-size: 10px; color: var(--text3);
      margin-bottom: 14px; margin-top: 2px;
      word-break: break-all;
      padding-left: 38px;
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
      border: 1px solid;
      display: flex; align-items: center; gap: 16px;
    }
    .summary-hero.ok     { background: #071a0f; border-color: #1a4a2a; }
    .summary-hero.danger { background: #160507; border-color: #5a1a1a; }
    .summary-hero.warn   { background: #130a02; border-color: #5a2a0a; }
    .hero-icon {
      font-size: 28px; flex-shrink: 0;
      width: 52px; height: 52px;
      display: flex; align-items: center; justify-content: center;
      border-radius: 14px;
    }
    .summary-hero.ok     .hero-icon { background: #0d2e1a; }
    .summary-hero.danger .hero-icon { background: #2d0a0a; }
    .summary-hero.warn   .hero-icon { background: #2a1205; }
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
      border: 1px solid var(--border2);
      border-radius: 12px; overflow: hidden;
    }
    .bo-header {
      display: flex; align-items: center; gap: 8px;
      padding: 11px 16px;
      background: var(--bg3);
      border-bottom: 1px solid var(--border);
      cursor: pointer; user-select: none; list-style: none;
    }
    .bo-header::-webkit-details-marker { display: none; }
    details[open] > .bo-header .bo-chevron { transform: rotate(90deg); }
    .bo-chevron { color: var(--text3); font-size: 8px; transition: transform 0.18s; display: inline-block; flex-shrink: 0; }
    .bo-title-icon { color: var(--text3); font-size: 13px; }
    .bo-title { font-size: 11px; font-weight: 700; color: var(--text2); text-transform: uppercase; letter-spacing: 0.08em; }
    .bo-chips { margin-left: auto; display: flex; gap: 6px; flex-wrap: wrap; }
    .bo-chip {
      font-size: 10px; font-weight: 600;
      padding: 2px 9px; border-radius: 20px; white-space: nowrap;
    }
    .bo-chip-current { background: #0d1e36; color: var(--blue);   border: 1px solid #1a3a6a; }
    .bo-chip-local   { background: #141422; color: var(--purple); border: 1px solid #2a2a52; }
    .bo-chip-remote  { background: var(--bg3); color: var(--text3); border: 1px solid var(--border2); }
    .bo-body { padding: 14px 16px; background: var(--bg2); }

    .bo-current-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: 10px 14px; margin-bottom: 14px;
      background: #0a1420;
      border: 1px solid #1a3050;
      border-left: 3px solid var(--blue);
      border-radius: 8px;
    }
    .bo-current-left { display: flex; flex-direction: column; gap: 2px; }
    .bo-current-label { font-size: 9px; font-weight: 700; color: #3a6aaa; text-transform: uppercase; letter-spacing: 0.1em; }
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
    .bo-col-count { font-size: 11px; font-weight: 700; color: var(--text3); background: var(--bg3); padding: 1px 7px; border-radius: 10px; border: 1px solid var(--border2); }
    .bo-branch-list { padding: 6px 8px; display: flex; flex-direction: column; gap: 1px; }
    .bo-branch-row {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 8px; border-radius: 6px;
      font-family: 'SF Mono','Cascadia Code','Consolas',monospace;
      font-size: 12px; color: var(--text2);
      transition: background 0.1s;
    }
    .bo-branch-row:hover { background: var(--bg); }
    .bo-branch-row.is-current { color: var(--blue); background: #0a1420; }
    .bo-branch-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 5px currentColor; }
    .dot-current  { background: var(--blue);   color: var(--blue); }
    .dot-infected { background: var(--red);    color: var(--red); }
    .dot-clean    { background: var(--green);  color: var(--green); }
    .dot-remote   { background: var(--text3);  color: var(--text3); box-shadow: none; }
    .bo-branch-name-text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .bo-inline-badge { margin-left: auto; flex-shrink: 0; }
    .bo-star { color: var(--blue); font-size: 10px; }
    .remote-prefix { color: var(--text3); }
    .bo-empty { font-size: 11px; color: var(--text3); font-style: italic; padding: 6px 8px; }

    /* ─────────────────────────────────────────────
       BRANCH SECTIONS
    ───────────────────────────────────────────── */
    .branches-section { padding: 16px 28px 0; }
    .section-header {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 10px; margin-top: 22px;
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
    .section-count.red    { background: #2a0a0a; color: var(--red);   border: 1px solid #5a1a1a; }
    .section-count.green  { background: #0a2a14; color: var(--green); border: 1px solid #1a5a2a; }
    .section-count.muted  { background: var(--bg3); color: var(--text3); border: 1px solid var(--border2); }
    .section-divider {
      flex: 1; height: 1px; background: var(--border);
    }

    .branch-block {
      border: 1px solid var(--border);
      border-radius: 10px; margin-bottom: 8px; overflow: hidden;
    }
    .branch-block.infected {
      border-color: #5a1a1a;
      box-shadow: 0 0 0 1px #5a1a1a20;
    }
    .branch-block.clean    { border-color: #1a4a2a; }

    .branch-summary {
      display: flex; align-items: center; gap: 9px;
      padding: 11px 16px; cursor: pointer;
      list-style: none; user-select: none;
    }
    .branch-summary::-webkit-details-marker { display: none; }
    details[open] > .branch-summary .branch-chevron { transform: rotate(90deg); }
    .branch-chevron { color: var(--text3); font-size: 8px; transition: transform 0.18s; display: inline-block; flex-shrink: 0; }
    .branch-block.infected .branch-summary { background: #120606; }
    .branch-block.clean    .branch-summary { background: #060e09; }
    .branch-icon  { color: var(--text3); flex-shrink: 0; font-size: 13px; }
    .branch-name  { font-weight: 600; color: var(--text); flex: 1; font-size: 13px; min-width: 0;
                    font-family: 'SF Mono','Cascadia Code','Consolas',monospace; }
    .current-tag  { font-size: 9px; font-weight: 600; background: #0d1e36; color: var(--blue);
                    border: 1px solid #1a3a6a; border-radius: 4px; padding: 1px 5px; margin-left: 6px;
                    font-family: -apple-system, sans-serif; text-transform: uppercase; letter-spacing: 0.05em; vertical-align: middle; }
    .branch-right { margin-left: auto; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
    .branch-meta  { color: var(--text3); font-size: 10px; white-space: nowrap; }

    /* ─────────────────────────────────────────────
       BADGES
    ───────────────────────────────────────────── */
    .badge { padding: 3px 9px; border-radius: 20px; font-size: 10px; font-weight: 700; white-space: nowrap; flex-shrink: 0; letter-spacing: 0.01em; }
    .badge-red    { background: #2a0808; color: var(--red);    border: 1px solid #6a1a1a; }
    .badge-orange { background: #2a1205; color: var(--orange); border: 1px solid #6a2a0a; }
    .badge-yellow { background: #2a1a02; color: var(--yellow); border: 1px solid #6a4a0a; }
    .badge-green  { background: #082a12; color: var(--green);  border: 1px solid #1a5a2a; }
    .badge-gray   { background: var(--bg3); color: var(--text3); border: 1px solid var(--border2); }

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
      font-size: 11px; color: #9cdcfe;
      background: #0f1e2e; padding: 2px 8px;
      border-radius: 5px; white-space: nowrap;
      border: 1px solid #1a3a5a;
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
      cursor: pointer; border: 1px solid;
      white-space: nowrap;
      transition: all 0.12s;
      position: relative; z-index: 5;
      letter-spacing: 0.01em;
    }
    .btn-icon { font-size: 11px; }
    .code-btn         { background: #0f1e2e; color: #9cdcfe; border-color: #1a3a5a; }
    .code-btn:hover   { background: #142840; border-color: #2a5a8a; }
    .code-btn.active  { background: #0d2a42; color: #4fc1ff; border-color: #2a6aaa; }
    .open-btn         { background: #0a1e0a; color: #6dbf67; border-color: #1a4a1a; }
    .open-btn:hover   { background: #0d280d; border-color: #2a6a2a; }

    /* ─────────────────────────────────────────────
       CODE SNIPPET
    ───────────────────────────────────────────── */
    .snippet-wrap {
      display: none; margin-top: 10px;
      border: 1px solid var(--border2); border-radius: 8px; overflow: hidden;
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
      background: #070709; overflow-x: auto;
      font-family: 'SF Mono','Cascadia Code','Fira Code','Consolas',monospace;
      font-size: 12px; line-height: 1.7; color: var(--text);
      white-space: pre; max-height: 340px; overflow-y: auto;
    }

    .clean-msg {
      display: flex; align-items: center; gap: 8px;
      padding: 12px 16px; color: var(--green); font-size: 12px;
      border-top: 1px solid var(--border); background: #060e09;
    }
    .clean-icon { font-size: 14px; }
    .error-msg { padding: 12px 16px; color: var(--orange); font-size: 12px; border-top: 1px solid var(--border); }

    /* ─────────────────────────────────────────────
       PROJECT BADGE
    ───────────────────────────────────────────── */
    .proj-badge { font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 5px; flex-shrink: 0; letter-spacing: 0.03em; }
    .proj-flutter { background: #0a1e38; color: #54c5f8; border: 1px solid #1a4a7a; }
    .proj-node    { background: #0a1e0a; color: #6dbf67; border: 1px solid #1a4a1a; }
    .proj-python  { background: #1e1800; color: #f5c518; border: 1px solid #4a3a00; }
    .proj-generic { background: var(--bg3); color: var(--text3); border: 1px solid var(--border2); }

    /* ─────────────────────────────────────────────
       RESCAN BUTTON
    ───────────────────────────────────────────── */
    .rescan-btn {
      display: flex; align-items: center; gap: 6px;
      background: var(--bg3); color: var(--text2);
      border: 1px solid var(--border2);
      padding: 6px 14px; border-radius: 7px; cursor: pointer;
      font-size: 12px; font-weight: 600; white-space: nowrap;
      margin-left: auto;
      transition: all 0.12s;
    }
    .rescan-btn:hover { background: var(--bg2); border-color: #3a3a4e; color: var(--text); }

    /* ─────────────────────────────────────────────
       FOOTER
    ───────────────────────────────────────────── */
    .footer {
      padding: 22px 28px 0;
      display: flex; align-items: center; gap: 12px;
      color: var(--text3); font-size: 11px;
    }
    .footer-dot { color: var(--border2); }
    .footer-badge {
      background: var(--bg3); color: var(--text3);
      border: 1px solid var(--border2);
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
  <div class="header-top">
    <div class="header-logo">🛡️</div>
    <h1>Guardian <span>— Branch Scan Report</span></h1>
    ${projectBadge}
    <button class="rescan-btn" onclick="rescan()">↺ Rescan</button>
  </div>
  <div class="workspace-path">${escHtml(result.workspacePath)}</div>
  <div class="stat-tabs">
    <div class="stat-tab">
      <div class="stat-tab-val ${totalThreats > 0 ? 'c-red' : 'c-green'}">${totalThreats}</div>
      <div class="stat-tab-lbl">Total threats</div>
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

<div class="branches-section">
  ${infectedBranches.length > 0 ? `
    <div class="section-header">
      <span class="section-icon">🔴</span>
      <span class="section-label">Infected Branches</span>
      <span class="section-count red">${infectedBranches.length}</span>
      <div class="section-divider"></div>
    </div>
    ${infectedBranches.map(branchSection).join('')}
  ` : ''}

  ${cleanBranches.length > 0 ? `
    <div class="section-header">
      <span class="section-icon">✅</span>
      <span class="section-label">Clean Branches</span>
      <span class="section-count green">${cleanBranches.length}</span>
      <div class="section-divider"></div>
    </div>
    ${cleanBranches.map(branchSection).join('')}
  ` : ''}

  ${result.branches.filter(b => b.error).length > 0 ? `
    <div class="section-header">
      <span class="section-icon">⚠️</span>
      <span class="section-label">Errors</span>
      <span class="section-count muted">${result.branches.filter(b => b.error).length}</span>
      <div class="section-divider"></div>
    </div>
    ${result.branches.filter(b => b.error).map(branchSection).join('')}
  ` : ''}
</div>

<div class="footer">
  <span class="footer-badge">Guardian v1.0</span>
  <span class="footer-dot">·</span>
  Scanned ${result.branches.length} branch${result.branches.length !== 1 ? 'es' : ''}
  <span class="footer-dot">·</span>
  ${totalFiles} files checked
  <span class="footer-dot">·</span>
  ${result.scanDurationMs}ms
</div>

<script>
  const vscode = acquireVsCodeApi();

  function rescan() {
    vscode.postMessage({ action: 'rescan' });
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
          ? '<span style="display:block;background:#0f2a08;color:#86efac;width:100%;border-left:2px solid #4ade80;padding-left:6px">' + escaped + '</span>'
          : '<span style="display:block;width:100%">' + escaped + '</span>';
      }).join('');
      pre.innerHTML = html;
    }
  }
</script>
</body>
</html>`;
}
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReportHtml = buildReportHtml;

function severityColor(s) {
  return s === 'critical' ? '#f87171' : s === 'high' ? '#fb923c' : '#fbbf24';
}
function severityBg(s) {
  return s === 'critical' ? '#450a0a' : s === 'high' ? '#431407' : '#422006';
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
  if (result.error) return `<span class="badge badge-gray">Error reading branch</span>`;
  if (critical > 0) return `<span class="badge badge-red">🔴 ${critical} critical${high ? ` · ${high} high` : ''}</span>`;
  if (high > 0) return `<span class="badge badge-orange">${high} high${medium ? ` · ${medium} medium` : ''}</span>`;
  if (medium > 0) return `<span class="badge badge-yellow">${medium} medium</span>`;
  return `<span class="badge badge-green">✓ Clean</span>`;
}

// ── Threat card ───────────────────────────────────────────────────────────────
// uid: simple counter passed in so every card gets a guaranteed-unique DOM id.
function threatCard(t, branch, uid) {
  const snippetId = `snip-${uid}`;
  const btnId = `btn-${uid}`;

  const snippetBlock = t.snippet ? `
        <div class="snippet-wrap" id="${snippetId}">
          <div class="snippet-toolbar">
            <span class="snippet-label">${escHtml(t.file)}${t.line ? `:${t.line}` : ''}</span>
          </div>
          <pre class="snippet-pre" id="pre-${uid}"></pre>
        </div>` : '';

  // Raw snippet stored in a hidden <script type="text/plain"> so JS can read
  // it safely without any HTML-injection risk from the code content itself.
  const snippetData = t.snippet
    ? `<script type="text/plain" id="data-${uid}">${escHtml(t.snippet)}<\/script>`
    : '';

  return `
    <div class="threat-card">
      <div class="threat-header">
        <span class="sev-pill" style="background:${severityBg(t.severity)};color:${severityColor(t.severity)};border:1px solid ${severityColor(t.severity)}40">${t.severity.toUpperCase()}</span>
        <code class="rule-code">${escHtml(t.rule)}</code>
        <span class="file-ref">${escHtml(t.file)}${t.line ? `:${t.line}` : ''}</span>
        <div class="threat-actions">
          ${t.snippet
      ? `<button id="${btnId}" class="code-btn" onclick="toggleSnippet(event, '${snippetId}', '${btnId}', 'pre-${uid}', 'data-${uid}')">‹/› View Code</button>`
      : ''}
          <button class="open-btn"
            data-file="${escHtml(t.file)}"
            data-line="${t.line ?? 1}"
            data-branch="${escHtml(branch)}"
            onclick="openFile(event, this)">↗ Open File</button>
        </div>
      </div>
      <div class="threat-detail">${escHtml(t.detail)}</div>
      ${snippetBlock}
      ${snippetData}
    </div>`;
}

function branchSection(r) {
  const isClean = r.threats.length === 0 && !r.error;
  const isInfected = r.threats.length > 0;

  // Each card gets a globally-unique counter id via a closure counter per branch section.
  // We use branch name + index to guarantee uniqueness across all branches.
  const cards = r.threats
    .map((t, i) => threatCard(t, r.branch, `${r.branch.replace(/[^a-zA-Z0-9]/g, '_')}_${i}`))
    .join('');

  return `
  <details class="branch-block ${isInfected ? 'infected' : isClean ? 'clean' : 'error'}" ${isInfected ? 'open' : ''}>
    <summary class="branch-summary">
      <span class="branch-chevron">▶</span>
      <span class="branch-icon">⎇</span>
      <span class="branch-name">${escHtml(r.branch)}${r.isCurrentBranch ? ' <em>(current)</em>' : ''}</span>
      ${branchStatusBadge(r)}
      <span class="branch-meta">${r.scannedFiles.length} file${r.scannedFiles.length !== 1 ? 's' : ''} scanned</span>
    </summary>
    ${isClean ? '<div class="clean-msg">✓ No threats found in this branch.</div>' : ''}
    ${r.error ? `<div class="error-msg">⚠ Could not read branch: ${escHtml(r.error)}</div>` : ''}
    ${cards}
  </details>`;
}

function buildReportHtml(result) {
  const totalThreats = result.branches.reduce((n, b) => n + b.threats.length, 0);
  const infectedBranches = result.branches.filter(b => b.threats.length > 0);
  const cleanBranches = result.branches.filter(b => b.threats.length === 0 && !b.error);
  const criticalCount = result.branches.reduce((n, b) => n + b.threats.filter(t => t.severity === 'critical').length, 0);
  const totalFiles = result.branches.reduce((n, b) => n + b.scannedFiles.length, 0);

  const summaryText = totalThreats === 0
    ? '✓ All branches are clean'
    : `${totalThreats} threat${totalThreats !== 1 ? 's' : ''} found across ${infectedBranches.length} branch${infectedBranches.length !== 1 ? 'es' : ''}`;

  const projectBadge = `<span class="proj-badge proj-${result.projectType}">${result.projectType.charAt(0).toUpperCase() + result.projectType.slice(1)}</span>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Guardian Scan Report</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #0d0d0d; color: #d4d4d4;
      font-size: 13px; line-height: 1.6;
      padding: 0 0 80px;
    }

    /* ── Header ── */
    .header {
      background: #111; border-bottom: 1px solid #222;
      padding: 18px 24px 14px;
      position: sticky; top: 0; z-index: 10;
    }
    .header-top { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; flex-wrap: wrap; }
    .header-top h1 { font-size: 15px; font-weight: 600; color: #fff; }
    .workspace-path { font-family: monospace; font-size: 11px; color: #444; margin-bottom: 10px; word-break: break-all; }

    /* ── Stats ── */
    .stats { display: flex; gap: 10px; flex-wrap: wrap; }
    .stat { background: #161616; border: 1px solid #242424; border-radius: 8px; padding: 8px 14px; min-width: 100px; }
    .stat-val { font-size: 20px; font-weight: 700; line-height: 1.2; }
    .stat-lbl { font-size: 10px; color: #555; margin-top: 2px; }
    .red    { color: #f87171; } .orange { color: #fb923c; }
    .green  { color: #4ade80; } .blue   { color: #60a5fa; }

    /* ── Summary banner ── */
    .summary-banner {
      margin: 16px 24px 0; padding: 12px 16px;
      border-radius: 8px; border: 1px solid;
      font-weight: 600; font-size: 13px;
    }
    .summary-banner.ok     { background: #052e16; border-color: #166534; color: #4ade80; }
    .summary-banner.danger { background: #2d0000; border-color: #7f1d1d; color: #f87171; }
    .summary-banner.warn   { background: #1c0a00; border-color: #7c2d12; color: #fb923c; }
    .summary-banner small  { font-weight: 400; font-size: 11px; opacity: 0.8; display: block; margin-top: 3px; }

    /* ── Branches ── */
    .branches-section { padding: 16px 24px 0; }
    .section-title { font-size: 11px; font-weight: 600; color: #444; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 10px; }

    .branch-block { border: 1px solid #1e1e1e; border-radius: 10px; margin-bottom: 8px; overflow: hidden; }
    .branch-block.infected { border-color: #7f1d1d; }
    .branch-block.clean    { border-color: #14532d; }

    .branch-summary {
      display: flex; align-items: center; gap: 8px;
      padding: 10px 14px; cursor: pointer;
      background: #111; list-style: none; user-select: none;
    }
    .branch-summary::-webkit-details-marker { display: none; }
    details[open] > .branch-summary .branch-chevron { transform: rotate(90deg); }
    .branch-chevron { color: #555; font-size: 9px; transition: transform 0.15s; display: inline-block; flex-shrink: 0; }
    .branch-block.infected .branch-summary { background: #180808; }
    .branch-block.clean    .branch-summary { background: #061210; }
    .branch-icon  { color: #555; flex-shrink: 0; }
    .branch-name  { font-weight: 500; color: #e5e5e5; flex: 1; font-size: 13px; min-width: 0; }
    .branch-name em { color: #444; font-style: normal; font-size: 11px; }
    .branch-meta  { color: #3a3a3a; font-size: 11px; white-space: nowrap; flex-shrink: 0; }

    /* ── Badges ── */
    .badge { padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
    .badge-red    { background: #450a0a; color: #f87171; border: 1px solid #7f1d1d; }
    .badge-orange { background: #431407; color: #fb923c; border: 1px solid #9a3412; }
    .badge-yellow { background: #422006; color: #fbbf24; border: 1px solid #92400e; }
    .badge-green  { background: #052e16; color: #4ade80; border: 1px solid #166534; }
    .badge-gray   { background: #1c1c1c; color: #555;   border: 1px solid #2a2a2a; }

    /* ── Threat card ── */
    .threat-card { border-top: 1px solid #1a1a1a; padding: 12px 14px; background: #0a0a0a; }
    .threat-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
    .sev-pill  { padding: 2px 7px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.04em; white-space: nowrap; flex-shrink: 0; }
    .rule-code { font-family: monospace; font-size: 11px; color: #9cdcfe; background: #161616; padding: 1px 6px; border-radius: 4px; white-space: nowrap; }
    .file-ref  { font-family: monospace; font-size: 10px; color: #3a3a3a; }
    .threat-detail { color: #888; font-size: 12px; line-height: 1.5; }

    /* ── Threat action buttons — NOT inside <summary> so clicks don't bubble ── */
    .threat-actions { margin-left: auto; display: flex; gap: 6px; flex-shrink: 0; }
    .code-btn, .open-btn {
      font-size: 11px; font-weight: 500;
      padding: 3px 10px; border-radius: 5px;
      cursor: pointer; border: 1px solid;
      white-space: nowrap;
      transition: background 0.12s, border-color 0.12s;
      /* Critical: prevent any parent click handler from receiving this event */
      position: relative; z-index: 5;
    }
    .code-btn         { background: #1a1a2e; color: #9cdcfe; border-color: #2a2a4e; }
    .code-btn:hover   { background: #22224a; border-color: #4a4aae; }
    .code-btn.active  { background: #0d2137; color: #4fc1ff; border-color: #3a7fbf; }
    .open-btn         { background: #0a2e0a; color: #6dbf67; border-color: #1e5c1e; }
    .open-btn:hover   { background: #0f3d0f; border-color: #2a7a2a; }

    /* ── Code snippet panel ── */
    .snippet-wrap {
      display: none;
      margin-top: 10px;
      border: 1px solid #242424; border-radius: 6px; overflow: hidden;
    }
    .snippet-wrap.open { display: block; }
    .snippet-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 5px 12px;
      background: #111; border-bottom: 1px solid #1e1e1e;
    }
    .snippet-label { font-family: monospace; font-size: 10px; color: #555; }
    .snippet-pre {
      margin: 0; padding: 12px 14px;
      background: #080808; overflow-x: auto;
      font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
      font-size: 12px; line-height: 1.65; color: #d4d4d4;
      white-space: pre; max-height: 360px; overflow-y: auto;
    }

    .clean-msg { padding: 10px 14px; color: #4ade80; font-size: 12px; border-top: 1px solid #141414; }
    .error-msg { padding: 10px 14px; color: #fb923c; font-size: 12px; border-top: 1px solid #141414; }

    /* ── Project badge ── */
    .proj-badge { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px; flex-shrink: 0; }
    .proj-flutter { background: #0d2b4a; color: #54c5f8; border: 1px solid #1565c0; }
    .proj-node    { background: #0a2e0a; color: #6dbf67; border: 1px solid #2e7d32; }
    .proj-python  { background: #2b2500; color: #f5c518; border: 1px solid #856404; }
    .proj-generic { background: #1c1c1c; color: #666;   border: 1px solid #2a2a2a; }

    /* ── Rescan button ── */
    .rescan-btn {
      background: #1a1a1a; color: #ccc; border: 1px solid #2a2a2a;
      padding: 6px 14px; border-radius: 6px; cursor: pointer;
      font-size: 12px; font-weight: 500; white-space: nowrap; margin-left: auto;
    }
    .rescan-btn:hover { background: #222; border-color: #444; }

    .footer { padding: 20px 24px 0; color: #2a2a2a; font-size: 11px; }

    ::-webkit-scrollbar { width: 5px; height: 5px; }
    ::-webkit-scrollbar-track { background: #111; }
    ::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 3px; }
  </style>
</head>
<body>

<div class="header">
  <div class="header-top">
    <h1>🛡️ Guardian — Branch Scan Report</h1>
    ${projectBadge}
    <button class="rescan-btn" onclick="rescan()">↺ Rescan</button>
  </div>
  <div class="workspace-path">${escHtml(result.workspacePath)}</div>
  <div class="stats">
    <div class="stat"><div class="stat-val ${totalThreats > 0 ? 'red' : 'green'}">${totalThreats}</div><div class="stat-lbl">Total threats</div></div>
    <div class="stat"><div class="stat-val ${infectedBranches.length > 0 ? 'red' : 'green'}">${infectedBranches.length}</div><div class="stat-lbl">Infected branches</div></div>
    <div class="stat"><div class="stat-val green">${cleanBranches.length}</div><div class="stat-lbl">Clean branches</div></div>
    <div class="stat"><div class="stat-val blue">${result.branches.length}</div><div class="stat-lbl">Total branches</div></div>
    <div class="stat"><div class="stat-val blue">${totalFiles}</div><div class="stat-lbl">Files checked</div></div>
    <div class="stat"><div class="stat-val blue">${result.scanDurationMs}ms</div><div class="stat-lbl">Scan time</div></div>
  </div>
</div>

<div class="summary-banner ${totalThreats === 0 ? 'ok' : criticalCount > 0 ? 'danger' : 'warn'}" style="margin:16px 24px 0">
  ${escHtml(summaryText)}
  ${totalThreats > 0 ? '<small>Review the malicious snippets below. Do not use infected branches until threats are removed.</small>' : ''}
</div>

<div class="branches-section">
  ${infectedBranches.length > 0 ? `
    <div class="section-title" style="margin-top:20px">Infected branches (${infectedBranches.length})</div>
    ${infectedBranches.map(branchSection).join('')}
  ` : ''}

  ${cleanBranches.length > 0 ? `
    <div class="section-title" style="margin-top:20px">Clean branches (${cleanBranches.length})</div>
    ${cleanBranches.map(branchSection).join('')}
  ` : ''}

  ${result.branches.filter(b => b.error).length > 0 ? `
    <div class="section-title" style="margin-top:20px">Errors</div>
    ${result.branches.filter(b => b.error).map(branchSection).join('')}
  ` : ''}
</div>

<div class="footer">Guardian v1.0 · Scanned in ${result.scanDurationMs}ms</div>

<script>
  const vscode = acquireVsCodeApi();

  // ── Rescan ──────────────────────────────────────────────────────────────────
  function rescan() {
    vscode.postMessage({ action: 'rescan' });
  }

  // ── Open File ───────────────────────────────────────────────────────────────
  // stopPropagation prevents the <details> toggle from firing when the button
  // is clicked (button is inside .threat-card which is inside <details>).
  function openFile(e, btn) {
    e.stopPropagation();
    const file   = btn.getAttribute('data-file');
    const line   = parseInt(btn.getAttribute('data-line'), 10) || 1;
    const branch = btn.getAttribute('data-branch');
    vscode.postMessage({ action: 'openFile', file, line, branch });
  }

  // ── Toggle snippet ──────────────────────────────────────────────────────────
  // snippetId  → id of .snippet-wrap div
  // btnId      → id of the toggle button (for active state)
  // preId      → id of the <pre> to render highlighted lines into
  // dataId     → id of <script type="text/plain"> holding raw escaped snippet
  //
  // Snippet content is stored in a <script type="text/plain"> tag so it is
  // never parsed as HTML. We read it, unescape HTML entities, then render each
  // line individually — highlighting the ▶ marker line in green.
  function toggleSnippet(e, snippetId, btnId, preId, dataId) {
    e.stopPropagation();

    const wrap = document.getElementById(snippetId);
    const btn  = document.getElementById(btnId);
    const pre  = document.getElementById(preId);
    if (!wrap || !btn || !pre) return;

    const isNowOpen = wrap.classList.toggle('open');
    btn.classList.toggle('active', isNowOpen);
    btn.textContent = isNowOpen ? '‹/› Hide Code' : '‹/› View Code';

    // Render snippet content only once (first open)
    if (isNowOpen && pre.childNodes.length === 0) {
      const dataEl = document.getElementById(dataId);
      if (!dataEl) return;

      // dataEl.textContent holds HTML-escaped snippet — unescape it
      const raw = dataEl.textContent
        .replace(/&amp;/g,  '&')
        .replace(/&lt;/g,   '<')
        .replace(/&gt;/g,   '>')
        .replace(/&quot;/g, '"');

      // Build highlighted HTML line by line
      const html = raw.split('\\n').map(line => {
        const isFlagged = line.trimStart().startsWith('▶');
        const escaped   = line
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        return isFlagged
          ? '<span style="display:block;background:#1a2f0a;color:#86efac;width:100%">' + escaped + '</span>'
          : '<span style="display:block;width:100%">' + escaped + '</span>';
      }).join('');

      pre.innerHTML = html;
    }
  }
</script>
</body>
</html>`;
}
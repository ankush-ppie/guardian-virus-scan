"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildReportHtml = buildReportHtml;
function severityColor(s) {
    return s === 'critical' ? '#f87171' : s === 'high' ? '#fb923c' : '#fbbf24';
}
function severityBg(s) {
    return s === 'critical' ? '#450a0a' : s === 'high' ? '#431407' : '#422006';
}
function branchStatusBadge(result) {
    const critical = result.threats.filter(t => t.severity === 'critical').length;
    const high = result.threats.filter(t => t.severity === 'high').length;
    const medium = result.threats.filter(t => t.severity === 'medium').length;
    if (result.error) {
        return `<span class="badge badge-gray">Error reading branch</span>`;
    }
    if (critical > 0) {
        return `<span class="badge badge-red">🔴 ${critical} critical${high ? ` · ${high} high` : ''}</span>`;
    }
    if (high > 0) {
        return `<span class="badge badge-orange">${high} high${medium ? ` · ${medium} medium` : ''}</span>`;
    }
    if (medium > 0) {
        return `<span class="badge badge-yellow">${medium} medium</span>`;
    }
    return `<span class="badge badge-green">✓ Clean</span>`;
}
function threatCard(t, branch) {
    const hasSnippet = !!t.snippet;
    const snippetHtml = hasSnippet
        ? `<div class="snippet-wrap" id="snip-${slugId(t)}">
        <div class="snippet-toolbar">
          <span class="snippet-label">📄 ${t.file}${t.line ? `:${t.line}` : ''}</span>
          <button class="open-btn" onclick="openFile(${JSON.stringify(t.file)}, ${t.line ?? 1}, ${JSON.stringify(branch)})">
            ↗ Open File
          </button>
        </div>
        <pre class="snippet-pre"><code>${escHtml(t.snippet)}</code></pre>
      </div>`
        : '';
    return `
    <div class="threat-card">
      <div class="threat-header">
        <span class="sev-pill" style="background:${severityBg(t.severity)};color:${severityColor(t.severity)};border:1px solid ${severityColor(t.severity)}40">${t.severity.toUpperCase()}</span>
        <code class="rule-code">${t.rule}</code>
        <span class="file-ref">${t.file}${t.line ? `:${t.line}` : ''}</span>
        <div class="threat-actions">
          ${hasSnippet ? `<button class="code-btn" onclick="toggleSnippet('snip-${slugId(t)}', this)">‹/› View Code</button>` : ''}
          <button class="open-btn" onclick="openFile(${JSON.stringify(t.file)}, ${t.line ?? 1}, ${JSON.stringify(branch)})">↗ Open File</button>
        </div>
      </div>
      <div class="threat-detail">${t.detail}</div>
      ${snippetHtml}
    </div>`;
}
function escHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function slugId(t) {
    // deterministic id from file+rule+line for DOM targeting
    return (t.file + t.rule + (t.line ?? '')).replace(/[^a-zA-Z0-9]/g, '_');
}
function branchSection(r) {
    const isClean = r.threats.length === 0 && !r.error;
    const isInfected = r.threats.length > 0;
    return `
  <details class="branch-block ${isInfected ? 'infected' : isClean ? 'clean' : 'error'}" ${isInfected ? 'open' : ''}>
    <summary class="branch-summary">
      <span class="branch-icon">⎇</span>
      <span class="branch-name">${r.branch}${r.isCurrentBranch ? ' <em>(current)</em>' : ''}</span>
      ${branchStatusBadge(r)}
      <span class="branch-meta">${r.scannedFiles.length} file${r.scannedFiles.length !== 1 ? 's' : ''} scanned</span>
    </summary>
    ${isClean ? '<div class="clean-msg">No threats found in this branch.</div>' : ''}
    ${r.error ? `<div class="error-msg">⚠ Could not read branch: ${r.error}</div>` : ''}
    ${r.threats.map(t => threatCard(t, r.branch)).join('')}
  </details>`;
}
function buildReportHtml(result) {
    const totalThreats = result.branches.reduce((n, b) => n + b.threats.length, 0);
    const infectedBranches = result.branches.filter(b => b.threats.length > 0);
    const cleanBranches = result.branches.filter(b => b.threats.length === 0 && !b.error);
    const criticalCount = result.branches.reduce((n, b) => n + b.threats.filter(t => t.severity === 'critical').length, 0);
    const summaryColor = totalThreats === 0 ? '#4ade80' : criticalCount > 0 ? '#f87171' : '#fb923c';
    const summaryText = totalThreats === 0
        ? '✓ All branches are clean'
        : `${totalThreats} threat${totalThreats !== 1 ? 's' : ''} across ${infectedBranches.length} branch${infectedBranches.length !== 1 ? 'es' : ''}`;
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
      padding: 0 0 60px;
    }

    /* ── Header ── */
    .header {
      background: #111; border-bottom: 1px solid #222;
      padding: 20px 28px 16px;
      position: sticky; top: 0; z-index: 10;
    }
    .header-top { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
    .header-top h1 { font-size: 16px; font-weight: 600; color: #fff; }
    .workspace-path { font-family: monospace; font-size: 11px; color: #555; margin-bottom: 12px; word-break: break-all; }

    /* ── Stat row ── */
    .stats { display: flex; gap: 12px; flex-wrap: wrap; }
    .stat {
      background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px;
      padding: 10px 16px; min-width: 120px;
    }
    .stat-val { font-size: 22px; font-weight: 700; line-height: 1; }
    .stat-lbl { font-size: 11px; color: #666; margin-top: 3px; }
    .stat-val.red    { color: #f87171; }
    .stat-val.orange { color: #fb923c; }
    .stat-val.green  { color: #4ade80; }
    .stat-val.blue   { color: #60a5fa; }

    /* ── Summary banner ── */
    .summary-banner {
      margin: 0 28px 0;
      padding: 14px 18px;
      border-radius: 10px;
      border: 1px solid;
      margin-top: 20px;
      font-weight: 600; font-size: 14px;
    }
    .summary-banner.ok     { background: #052e16; border-color: #166534; color: #4ade80; }
    .summary-banner.danger { background: #2d0000; border-color: #7f1d1d; color: #f87171; }
    .summary-banner.warn   { background: #1c0a00; border-color: #7c2d12; color: #fb923c; }

    /* ── Branches ── */
    .branches-section { padding: 20px 28px 0; }
    .section-title { font-size: 12px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; }

    .branch-block {
      border: 1px solid #222; border-radius: 10px;
      margin-bottom: 8px; overflow: hidden;
    }
    .branch-block.infected { border-color: #7f1d1d; }
    .branch-block.clean    { border-color: #14532d; }

    .branch-summary {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; cursor: pointer;
      background: #111; list-style: none;
      user-select: none;
    }
    .branch-summary::-webkit-details-marker { display: none; }
    .branch-block.infected .branch-summary { background: #1a0808; }
    .branch-block.clean    .branch-summary { background: #071510; }

    .branch-icon { color: #555; font-size: 14px; }
    .branch-name { font-weight: 500; color: #e5e5e5; flex: 1; }
    .branch-name em { color: #555; font-style: normal; font-size: 11px; }
    .branch-meta { color: #444; font-size: 11px; margin-left: auto; white-space: nowrap; }

    /* ── Badges ── */
    .badge { padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap; }
    .badge-red    { background: #450a0a; color: #f87171; border: 1px solid #7f1d1d; }
    .badge-orange { background: #431407; color: #fb923c; border: 1px solid #9a3412; }
    .badge-yellow { background: #422006; color: #fbbf24; border: 1px solid #92400e; }
    .badge-green  { background: #052e16; color: #4ade80; border: 1px solid #166534; }
    .badge-gray   { background: #1c1c1c; color: #666; border: 1px solid #333; }

    /* ── Threat cards ── */
    .threat-card {
      border-top: 1px solid #1e1e1e;
      padding: 12px 16px;
      background: #0d0d0d;
    }
    .threat-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; flex-wrap: wrap; }
    .sev-pill { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 700; letter-spacing: 0.05em; }
    .rule-code { font-family: monospace; font-size: 12px; color: #9cdcfe; background: #1a1a1a; padding: 1px 6px; border-radius: 4px; }
    .file-ref { font-family: monospace; font-size: 11px; color: #555; }
    .threat-detail { color: #aaa; font-size: 12px; line-height: 1.5; }

    /* ── Threat action buttons ── */
    .threat-actions { margin-left: auto; display: flex; gap: 6px; flex-shrink: 0; }
    .code-btn, .open-btn {
      font-size: 11px; font-weight: 500; padding: 3px 10px;
      border-radius: 5px; cursor: pointer; border: 1px solid;
      white-space: nowrap; transition: background 0.15s, border-color 0.15s;
    }
    .code-btn {
      background: #1a1a2e; color: #9cdcfe; border-color: #2a2a4e;
    }
    .code-btn:hover { background: #222240; border-color: #4a4a8e; }
    .code-btn.active { background: #0d2137; color: #4fc1ff; border-color: #3a7fbf; }
    .open-btn {
      background: #0a2e0a; color: #6dbf67; border-color: #1e5c1e;
    }
    .open-btn:hover { background: #0f3d0f; border-color: #2a7a2a; }

    /* ── Code snippet panel ── */
    .snippet-wrap {
      display: none;
      margin-top: 10px;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      overflow: hidden;
      background: #0a0a0a;
    }
    .snippet-wrap.open { display: block; }
    .snippet-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 6px 12px;
      background: #111; border-bottom: 1px solid #222;
    }
    .snippet-label { font-family: monospace; font-size: 11px; color: #555; }
    .snippet-pre {
      margin: 0; padding: 12px 14px;
      overflow-x: auto;
      font-family: 'Cascadia Code', 'Fira Code', 'Consolas', monospace;
      font-size: 12px; line-height: 1.6;
      color: #d4d4d4;
      white-space: pre;
    }
    /* Highlight the flagged line (starts with ▶) */
    .snippet-pre code { display: block; }
    .snippet-pre { background: #0a0a0a; }

    .clean-msg { padding: 12px 16px; color: #4ade80; font-size: 12px; border-top: 1px solid #1a1a1a; }
    .error-msg { padding: 12px 16px; color: #fb923c; font-size: 12px; border-top: 1px solid #1a1a1a; }

    /* ── Project badge ── */
    .proj-badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 4px; }
    .proj-flutter { background: #0d2b4a; color: #54c5f8; border: 1px solid #1565c0; }
    .proj-node    { background: #0a2e0a; color: #6dbf67; border: 1px solid #2e7d32; }
    .proj-python  { background: #2b2500; color: #f5c518; border: 1px solid #856404; }
    .proj-generic { background: #1c1c1c; color: #888; border: 1px solid #333; }

    /* ── Footer ── */
    .footer { padding: 20px 28px 0; color: #333; font-size: 11px; }

    /* ── Rescan button ── */
    .rescan-btn {
      background: #1a1a1a; color: #d4d4d4; border: 1px solid #333;
      padding: 8px 18px; border-radius: 6px; cursor: pointer;
      font-size: 13px; font-weight: 500;
      margin-left: auto;
    }
    .rescan-btn:hover { background: #252525; border-color: #555; }
  </style>
</head>
<body>

<div class="header">
  <div class="header-top">
    <h1>🛡️ Guardian — Branch Scan Report</h1>
    ${projectBadge}
    <button class="rescan-btn" onclick="rescan()">↺ Rescan</button>
  </div>
  <div class="workspace-path">${result.workspacePath}</div>
  <div class="stats">
    <div class="stat">
      <div class="stat-val ${totalThreats > 0 ? 'red' : 'green'}">${totalThreats}</div>
      <div class="stat-lbl">Total threats</div>
    </div>
    <div class="stat">
      <div class="stat-val ${infectedBranches.length > 0 ? 'red' : 'green'}">${infectedBranches.length}</div>
      <div class="stat-lbl">Infected branches</div>
    </div>
    <div class="stat">
      <div class="stat-val green">${cleanBranches.length}</div>
      <div class="stat-lbl">Clean branches</div>
    </div>
    <div class="stat">
      <div class="stat-val blue">${result.branches.length}</div>
      <div class="stat-lbl">Branches scanned</div>
    </div>
    <div class="stat">
      <div class="stat-val blue">${result.branches.reduce((n, b) => n + b.scannedFiles.length, 0)}</div>
      <div class="stat-lbl">Files checked</div>
    </div>
    <div class="stat">
      <div class="stat-val blue">${result.scanDurationMs}ms</div>
      <div class="stat-lbl">Scan duration</div>
    </div>
  </div>
</div>

<div class="summary-banner ${totalThreats === 0 ? 'ok' : criticalCount > 0 ? 'danger' : 'warn'}"
  style="margin: 20px 28px 0;">
  ${summaryText}
  ${totalThreats > 0 ? '<br><span style="font-weight:400;font-size:12px;opacity:0.8">Do not use infected branches until malicious files are removed. Version 2 will add one-click cleanup.</span>' : ''}
</div>

<div class="branches-section">
  <div class="section-title" style="margin-top:20px">
    ${infectedBranches.length > 0 ? `Infected branches (${infectedBranches.length})` : 'All branches'}
  </div>
  ${infectedBranches.map(branchSection).join('')}

  ${cleanBranches.length > 0 ? `
  <div class="section-title" style="margin-top:20px">Clean branches (${cleanBranches.length})</div>
  ${cleanBranches.map(branchSection).join('')}
  ` : ''}

  ${result.branches.filter(b => b.error).length > 0 ? `
  <div class="section-title" style="margin-top:20px">Errors</div>
  ${result.branches.filter(b => b.error).map(branchSection).join('')}
  ` : ''}
</div>

<div class="footer">
  Guardian v1.0 — Scan completed in ${result.scanDurationMs}ms &nbsp;·&nbsp;
  Version 2 will add one-click branch cleanup &amp; auto-remediation.
</div>

<script>
  const vscode = acquireVsCodeApi();
  function rescan() { vscode.postMessage({ action: 'rescan' }); }

  function toggleSnippet(id, btn) {
    const el = document.getElementById(id);
    if (!el) return;
    const isOpen = el.classList.toggle('open');
    btn.classList.toggle('active', isOpen);
    btn.textContent = isOpen ? '‹/› Hide Code' : '‹/› View Code';
  }

  function openFile(file, line, branch) {
    vscode.postMessage({ action: 'openFile', file, line, branch });
  }

  // Highlight ▶ lines in all snippet blocks
  document.querySelectorAll('.snippet-pre code').forEach(el => {
    el.innerHTML = el.textContent
      .split('\\n')
      .map(l => l.startsWith('▶')
        ? '<span style="background:#1a2a1a;color:#4ade80;display:block;width:100%">' + escHtml(l) + '</span>'
        : '<span style="display:block;width:100%">' + escHtml(l) + '</span>'
      )
      .join('');
  });

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }
</script>
</body>
</html>`;
}

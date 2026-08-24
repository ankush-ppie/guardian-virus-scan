# Changelog

All notable changes to the **Guardian Virus Scan** extension will be documented in this file.

## [1.5.0] - 2026-08-21

### Added
- **Credential & Secret Scanner (Tab 3)**:
  - **Multi-Source Coverage**: Deep scanning across tracked branch tips, deep Git commit history (`--history`), untracked local disk files (`--local`, e.g. `.env`, `.npmrc`, keys), and `.git/config` remote URLs.
  - **Multi-Source Single-Item Consolidation ("Where We Watch")**: Secrets detected across multiple locations in the same file are consolidated into 1 finding item with all watched locations displayed side-by-side (`🌐 Remote (Tracked Branch) + 📄 Local + 📜 Remote History`).
  - **Streamlined 2-Line Header Layout**:
    - **Line 1**: Glowing status circle dot (`🔴`, `🟡`, `🟢`), clean title typography, interactive token chip (`[ 🔑 AIzaSy...UDsY ]`), dedicated jump-to-file link (`[ 📄 android/...:69  commit: b2e90589  main ↗ ]`), and remediation steps drawer toggle.
    - **Line 2**: Dedicated `Source:` row clearly showing where the key was tracked.
  - **Plaintext Clipboard Copying**: Clicking the token chip copies the actual unmasked token to clipboard with instant `"✓ Copied!"` visual feedback while keeping on-screen text safely masked against shoulder surfing.
  - **Interactive Code Preview Eye Toggle**: Added an Eye toggle button (`👁️ Show Key` / `👁️‍🗨️ Hide Key`) with open/closed eye SVG icons in the code snippet header to toggle between masked and unmasked snippet previews.
  - **Enhanced Toolbar Source Filters**: Added source filter tags with live count badges (`All`, `✨ Multi-Source`, `🌐 Remote: Tracked`, `📜 Remote History`, `📄 Local`, `🔗 Git Remotes`, and `☁️ Org Alert`).
  - **Offline Privacy & Security**: Scans execute locally without transmitting secrets over the network.
  - **Secure Exporters**: Export audit findings to TSV (created with secure 0600 file permissions), JSON, or Markdown formats.
  - **Incident Response Guide**: Built-in vendor-specific remediation steps and Git history purging commands (`git filter-repo`).

## [1.4.0] - 2026-08-21

### Added
- **2-Tab Navigation Dashboard**:
  - Reorganized Guardian security report into a clean, modern 2-tab navigation structure:
    - **Tab 1: Glassworm & Security Report** — Git workspace branch threat scans, threat matrix, whitelisted safe rules, and branch threat cards with code snippets.
    - **Tab 2: Extension Scan** — Installed VS Code extension supply-chain scanner, malware blocklist detection (418+ IDs), invisible Unicode heuristics, and one-click removal.
  - Sticky header tab bar with real-time dynamic status badges (`🔴 Threats` / `✓ Clean`).
  - Active tab state persistence using VS Code webview API (`vscode.getState()` / `vscode.setState()`).
  - Direct routing to Tab 2 via `Guardian: Scan Installed Extensions for Malware` and extension malware notification alerts.

- **Supply-Chain & Installed Extension Audit**:
  - Comprehensive scan of all installed VS Code & editor extensions against a database of 418+ known malicious extension IDs compiled from GlassWorm waves 1–5, Solana/Yeeth waves, Socket threat research, and Manifold evil-twin campaigns.
  - Deep heuristic scanning of installed extension code bundles:
    - Detects ForceMemo campaign wave markers (`lzcdrtfxyqiplpd`).
    - Detects invisible Unicode variation selector payload runs (`U+FE00–U+FE0F`, `U+E0100–U+E01EF`).
    - Detects invisible Unicode proximity decoder patterns (`codePointAt` + variation selector constants) while safely excluding legitimate libraries (`pdf.js`, `fontkit`, etc.).
  - Animated live radar scanner view with real-time extension inspection ticker and progress feedback.
  - One-click **"Remove All Malicious Extensions"** action and individual 1-by-1 **"Uninstall Extension"** buttons with cross-platform CLI support (`antigravity`, `code`, `cursor`, `windsurf`, `codium`).
  - Dedicated Command Palette action: `Guardian: Scan Installed Extensions for Malware`.

- **Automatic Remote Branch Ref Synchronization**:
  - Automatically fetches updated remote-tracking branch metadata (`git fetch --all --prune`) before executing workspace scans.
  - Detects new and updated remote branches pushed to origin without requiring manual terminal fetch commands.
  - Safe & non-blocking: uses strict timeouts and disables interactive credential prompts (`GIT_TERMINAL_PROMPT=0`, `GIT_ASKPASS=""`) with graceful fallback to cached refs when offline.
  - Configurable via `guardian.fetchRemotesBeforeScan` in VS Code settings.

## [1.3.0] - 2026-08-20

### Added
- **Glassworm Threat Defense & Detection**:
  - Updated display name to `Guardian — Glassworm & Malware Scanner` to highlight dedicated Glassworm and supply-chain malware protection.
  - Added explicit Glassworm attack signature tagging in threat details for fake font loaders, injected configs (`postcss`, `next`, `tailwind`), auto-run folder tasks, and commit-amend force-push propagation helpers.
  - Expanded search keywords covering `glassworm`, `glass-worm`, `force-push`, `force-push-protection`, `commit-amend`, `tasks-json`, `autorun`, `stealth-terminal`, `font-malware`, `supply-chain-attack`, `guardian-security`, and legacy alias terms.
  - Updated Command Palette actions and scan progress indicators for streamlined user connection and instant workspace threat feedback.
  - Modernized `README.md` with a quick-read Glassworm attack vector overview and comprehensive threat detection matrix.

## [1.2.0] - 2026-08-17

### Added
- **False-Positive Whitelisting ("Mark as Safe" / "Mark as Unsafe")**:
  - Whitelist benign rules/files directly from the scan report for **This Project** (workspace state) or **All Projects** (global state).
  - Dedicated "Whitelisted Rules" management panel with quick "Mark as Unsafe" removal.
  - Automatically reclassifies branches where all threats are whitelisted into Clean branches with clear `✓ Clean · X Safe` badges.
- **Status Bar 1-Click Access**:
  - Unobtrusive `🛡️ Guardian` status bar item in the footer with live threat status and 1-click report opening.
- **Branch Overview & Quick Copy**:
  - Collapsible Branch Overview section with combined badge indicators (e.g. `4 Local · 2 Remote`).
  - One-click clipboard copy button for local and remote branch names.
- **Dual-Dimension Branch Filtering**:
  - Independent Scope (`All`, `Local`, `Remote`) and Status (`All`, `Infected`, `Clean`, `Safe`) filter controls with real-time branch count indicators.
  - Dedicated **`🛡️ Safe`** view to inspect and expand all whitelisted findings across branches.
- **UI Enhancements & Reload Action**:
  - Added "Reload Window" quick button with shortcut tooltip in the report header.

### Fixed
- Fixed z-index layering hierarchy ensuring sticky headers stay on top of scrolling action buttons.
- Added auto-closing behavior for action dropdowns on page scroll or outside click.

## [1.1.0] - 2026-08-16

### Added
- Scan high-risk files in the working tree, including ignored and untracked workspace files.
- Scan locally available remote-tracking refs as well as local branches.
- Add exact detections for both confirmed injected-config loader families.
- Add the confirmed hidden fake-font folder-open task and fake-font payload signatures.
- Add the backdate/amend/force-push `config.bat` propagation signature.
- Add regression tests covering infected and legitimate fixtures.

### Changed
- Invoke Git without a shell to prevent command injection through crafted refs or paths.
- Distinguish confirmed fake-font payloads from merely invalid/corrupt font files.
- Scan nested `.vscode` folders and nested application configs in monorepos.

## [1.0.0] - 2026-06-04

### Added
- **Branch Scanner Engine**: Scan all local Git branches in the background without modifying your current workspace branch (no `git checkout` required).
- **Threat Scan Rules**:
  - `AUTO_RUN_ON_OPEN`: Detects tasks set to run automatically on folder open.
  - `STEALTH_TERMINAL`: Flag tasks set to run in hidden or headless terminals.
  - `NODE_EXECUTES_BINARY`: Identifies tasks trying to execute unexpected binaries via Node.
  - `FAKE_FONT_FILE`: Detects suspicious/obfuscated files with font extensions (`.woff2`, `.ttf`, `.otf`, `.woff`).
  - `AUTO_TASKS_ENABLED`: Warns if settings permit automatic task execution without prompts.
  - `OBFUSCATED_COMMAND`: Flags tasks with obfuscated commands or strings.
  - `NETWORK_DOWNLOAD_IN_TASK`: Detects remote payloads download scripts inside tasks.
  - `GITIGNORE_HIDES_ITSELF` / `GITIGNORE_HIDES_VSCODE`: Flag configuration hiding techniques in `.gitignore`.
- **Project Auto-Detection**: Auto-detects project structure (Flutter, Node.js, Python, Generic) to adjust font asset rules and search locations.
- **Interactive Scan Report**: Webview-based dashboard to view security scan results, threat levels, and affected files/branches.

# Changelog

All notable changes to the **Guardian Virus Scan** extension will be documented in this file.

## [1.5.0] - 2026-08-20

### Added
- **2-Tab Navigation Dashboard**:
  - Reorganized Guardian security report into a clean, modern 2-tab navigation structure:
    - **Tab 1: Glassworm & Security Report** — Git workspace branch threat scans, threat matrix, whitelisted safe rules, and branch threat cards with code snippets.
    - **Tab 2: Extension Audit** — Installed VS Code extension supply-chain scanner, malware blocklist detection (418+ IDs), invisible Unicode heuristics, and one-click removal.
  - Sticky header tab bar with real-time dynamic status badges (`🔴 Threats` / `✓ Clean`).
  - Active tab state persistence using VS Code webview API (`vscode.getState()` / `vscode.setState()`).
  - Direct routing to Tab 2 via `Guardian: Audit Installed Extensions for Malware` and extension malware notification alerts.

## [1.4.0] - 2026-08-20

### Added
- **Supply-Chain & Installed Extension Audit**:
  - New **Audit Section** in the security report with an interactive **"Audit Extensions"** tool.
  - Threat database containing 418+ canonical malicious extension IDs compiled from GlassWorm waves 1–5, Solana/Yeeth waves, Socket threat research, and Manifold evil-twin campaigns.
  - Deep heuristic scanning of installed extension code bundles:
    - Detects ForceMemo campaign wave markers (`lzcdrtfxyqiplpd`).
    - Detects invisible Unicode variation selector payload runs (`U+FE00–U+FE0F`, `U+E0100–U+E01EF`).
    - Detects invisible Unicode proximity decoder patterns (`codePointAt` + variation selector constants) while safely excluding legitimate libraries (`pdf.js`, `fontkit`, etc.).
  - Animated live radar scanner view with real-time extension inspection ticker and progress feedback.
  - One-click **"Remove All Malicious Extensions"** action and individual 1-by-1 **"Uninstall Extension"** buttons.
  - Dedicated Command Palette action: `Guardian: Audit Installed Extensions for Malware`.

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

# Changelog

All notable changes to the **Guardian Virus Scan** extension will be documented in this file.

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

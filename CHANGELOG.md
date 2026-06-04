# Changelog

All notable changes to the **Guardian Virus Scan** extension will be documented in this file.

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

# 🛡️ Guardian — Virus Scan (v1.0)

Automatically scans **every local git branch** for malicious `.vscode/`
configs, fake font files, and injected code the moment you open a
folder in VS Code — before anything can execute.

---

## What it does

When you open any git repo folder in VS Code, Guardian:

1. Detects all local branches (no branch switching — uses `git show branch:file`)
2. Auto-detects your project type (Flutter / Node / Python / Generic)
3. Scans every branch for the full threat ruleset
4. Opens a **report panel** showing exactly which branches are infected and why

---

## Threat rules

| Rule | Severity | Applies to |
|---|---|---|
| `AUTO_RUN_ON_OPEN` | 🔴 Critical | tasks.json |
| `STEALTH_TERMINAL` | 🔴 Critical | tasks.json |
| `NODE_EXECUTES_BINARY` | 🔴 Critical | tasks.json |
| `FAKE_FONT_FILE` | 🔴 Critical | .woff2 / .ttf / .otf / .woff |
| `AUTO_TASKS_ENABLED` | 🔴 Critical | settings.json |
| `OBFUSCATED_COMMAND` | 🟠 High | tasks.json |
| `NETWORK_DOWNLOAD_IN_TASK` | 🟠 High | tasks.json |
| `GITIGNORE_HIDES_ITSELF` | 🟠 High | .gitignore |
| `PUBSPEC_DEP_OVERRIDE` | 🟠 High | pubspec.yaml (Flutter) |
| `PUBSPEC_UNKNOWN_GIT_DEP` | 🟠 High | pubspec.yaml (Flutter) |
| `GITIGNORE_HIDES_VSCODE` | 🟡 Medium | .gitignore |
| `GITIGNORE_HIDES_PUSH_SCRIPT` | 🟠 High | .gitignore |
| `SENSITIVE_ENV_IN_LAUNCH` | 🟡 Medium | launch.json |
| `BUILD_YAML_CUSTOM_BUILDER` | 🟡 Medium | build.yaml (Flutter) |
| `TERMINAL_ENV_ISOLATION` | 🟡 Medium | settings.json |

---

## Installation

### Step 1 — Install from source

```bash
# macOS / Linux
cp -r vscode-guardian-v1  ~/.vscode/extensions/guardian-virus-scan

# Windows (Command Prompt)
xcopy vscode-guardian-v1 "%USERPROFILE%\.vscode\extensions\guardian-virus-scan" /E /I
```

### Step 2 — Reload VS Code

Press `Ctrl+Shift+P` (or `Cmd+Shift+P` on Mac) and run:
```
Developer: Reload Window
```

The extension is now active. Open any git repo folder — the scan runs automatically.

---

### Package as .vsix (optional)

```bash
npm install -g @vscode/vsce
cd vscode-guardian-v1
vsce package
# → guardian-virus-scan-1.0.0.vsix

code --install-extension guardian-virus-scan-1.0.0.vsix
```

---

## Usage

| Trigger | What happens |
|---|---|
| Open any folder in VS Code | Auto-scan fires after 1.5s |
| Add a folder to workspace | Auto-scan fires immediately |
| `Ctrl+Shift+P` → **Guardian: Scan All Local Branches** | Manual rescan |
| Click **↺ Rescan** in the report panel | Manual rescan |

---

## How branch scanning works (no branch switching)

Guardian never runs `git checkout`. It reads files directly from git's
object store using:

```
git show <branch>:.vscode/tasks.json
git ls-tree -r --name-only <branch>
```

Your working tree and current branch are never modified.

---

## Project type support

| Project type | Extra files scanned |
|---|---|
| Flutter | `pubspec.yaml`, `build.yaml`, `fonts/`, `assets/fonts/` |
| Node.js | `public/fonts/`, `fonts/`, `assets/`, `static/fonts/` |
| Python | `.vscode/` configs + font dirs |
| Generic | `.vscode/` configs + any font dirs found |

---

## Roadmap

| Version | Feature |
|---|---|
| **v1 (this)** | Scan all branches, show report, detect threats |
| **v2 (planned)** | One-click malicious file removal per branch |
| **v3 (future)** | CI/CD pipeline integration, remote branch scanning |

---

## The attack this was built to stop

A force-push injects these files into your git remote:

```
.vscode/tasks.json       ← "eslint-check" task, runs on folderOpen, hidden terminal
.vscode/settings.json    ← task.allowAutomaticTasks: true (bypasses safety prompt)
public/fonts/*.woff2     ← actual Node.js payload disguised as font files
fonts/*.woff2            ← same attack, Flutter font directory
.gitignore               ← hides itself + temp_auto_push.bat from git history
```

The moment any developer opens the repo in VS Code, the task fires
`node ./public/fonts/fa-solid-400.woff2` silently with no terminal,
no output, no prompt. Guardian intercepts before that happens.

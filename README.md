<p align="center">
  <img src="media/icon.png" width="160" height="160" alt="Guardian Logo" />
</p>

<h1 align="center">Guardian — Virus Scan</h1>

<p align="center">
  <strong>Proactive Security & Branch Scanning for VS Code Workspace Safekeeping</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/visual-studio-marketplace/v/ankushlokhande.guardian-virus-scan?style=flat-square&color=38bdf8" alt="Version" />
  <img src="https://img.shields.io/github/license/ankush-ppie/guardian-virus-scan?style=flat-square&color=34d399" alt="License" />
  <img src="https://img.shields.io/visual-studio-marketplace/d/ankushlokhande.guardian-virus-scan?style=flat-square&color=f472b6" alt="Downloads" />
</p>

---

## 🛡️ Overview

**Guardian** automatically scans **every local Git branch** for malicious `.vscode/` configurations, hidden scripts, fake font files, and backdoor code triggers the moment you open a repository folder in VS Code—**before any tasks or processes execute.**

It runs silently and quickly, and never modifies your working directory or switches branches.

---

## 🚀 Key Features

* **Multi-Branch Scanner Engine**: Intercept threats across all local branches instantly (using low-level Git object store reads without running `git checkout`).
* **Zero Workspace Disturbance**: The current branch, unstaged files, and working directory state are completely untouched during scanning.
* **Auto Project Detection**: Adapts scanning profiles automatically based on target workspace (Flutter, Node.js, Python, or Generic code repositories).
* **Interactive Scan Dashboard**: A clean webview panel lists active threats, details the malicious files, and explains the rule violations.

---

## 🛑 Threat Detection Rules

Guardian guards against typical registry, task, or environment bypass scripts.

| Threat Rule | Severity | Target File / Area | Description |
| :--- | :--- | :--- | :--- |
| `AUTO_RUN_ON_OPEN` | 🔴 Critical | `.vscode/tasks.json` | Detects automation configurations configured to run immediately on folder opening. |
| `STEALTH_TERMINAL` | 🔴 Critical | `.vscode/tasks.json` | Flags background or hidden console terminals designed to run tasks invisibly. |
| `NODE_EXECUTES_BINARY` | 🔴 Critical | `.vscode/tasks.json` | Identifies tasks attempting to execute binary files disguised as font or script files via Node. |
| `FAKE_FONT_FILE` | 🔴 Critical | `.woff2`, `.ttf`, `.otf`, `.woff` | Identifies obfuscated Node/Python scripts masquerading as static font binaries. |
| `AUTO_TASKS_ENABLED` | 🔴 Critical | `.vscode/settings.json` | Flags configurations that automatically allow tasks without user prompt confirmations. |
| `OBFUSCATED_COMMAND` | 🟠 High | `.vscode/tasks.json` | Detects base64 or obfuscated terminal command payloads. |
| `NETWORK_DOWNLOAD_IN_TASK` | 🟠 High | `.vscode/tasks.json` | Identifies curl, wget, or fetch requests downloading unverified scripts. |
| `GITIGNORE_HIDES_ITSELF` | 🟠 High | `.gitignore` | Warns if the `.gitignore` tries to hide itself or push scripts from local tracking. |
| `PUBSPEC_DEP_OVERRIDE` | 🟠 High | `pubspec.yaml` (Flutter) | Flags dependency override manipulation pointing to malicious sources. |
| `PUBSPEC_UNKNOWN_GIT_DEP` | 🟠 High | `pubspec.yaml` (Flutter) | Warns against untrusted Git repository dependency configurations. |
| `GITIGNORE_HIDES_VSCODE` | 🟡 Medium | `.gitignore` | Detects hiding `.vscode/` configurations from normal commit files. |
| `GITIGNORE_HIDES_PUSH_SCRIPT` | 🟠 High | `.gitignore` | Detects git-ignore hiding files ending with `.sh` or `.bat`. |
| `SENSITIVE_ENV_IN_LAUNCH` | 🟡 Medium | `.vscode/launch.json` | Flags environment variable inclusions that leak sensitive details. |
| `BUILD_YAML_CUSTOM_BUILDER` | 🟡 Medium | `build.yaml` (Flutter) | Flags custom builder steps executing unverified compilation tasks. |
| `TERMINAL_ENV_ISOLATION` | 🟡 Medium | `.vscode/settings.json` | Flags modifications that alter the terminal environment variables. |

---

## 🛠️ Installation & Building

### Standard Installation (via VSIX)
1. Download the latest release `.vsix` file.
2. Inside VS Code, open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`) and choose:
   ```
   Extensions: Install from VSIX...
   ```
3. Locate the `guardian-virus-scan-1.0.0.vsix` file and reload VS Code.

### Building from Source (Local Package)
```bash
# Clone the repository
git clone https://github.com/ankush-ppie/guardian-virus-scan.git
cd guardian-virus-scan

# Install dependencies and build compiler output
npm install
npm run compile

# Package the extension locally
npm install -g @vscode/vsce
vsce package
```

---

## 💡 How it works (Under the hood)

Guardian never executes a git checkout. It interacts directly with the Git object store database using low-level plumbing commands:

```bash
git show <branch>:.vscode/tasks.json
git ls-tree -r --name-only <branch>
```

This prevents any risk of workspace modification or conflicts, making the scanning process completely transparent and lightning-fast.

---

## 📋 Roadmap

- [x] **v1.0.0** (Initial Release) — Real-time multi-branch scans, static threat detection ruleset, interactive webview dashboard.
- [ ] **v2.0.0** (In Progress) — One-click quarantine/removal of threat vectors, custom user signature scan rules.
- [ ] **v3.0.0** (Planned) — Remote branch check integrations and GitHub Actions CI pipelines runner.

---

## ⚖️ License

Distributed under the [MIT License](LICENSE).

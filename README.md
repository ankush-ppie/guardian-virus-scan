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

**Guardian** scans the current working tree plus every local and locally available remote-tracking Git ref for malicious `.vscode/` configurations, injected build configs, fake font files, and propagation scripts.

It never checks out a branch, modifies repository content, executes repository code, or contacts a remote. Keep VS Code Workspace Trust enabled: no extension can guarantee it activates before every built-in task or previously trusted workspace action.

---

## 🚀 Key Features

* **Working Tree + Multi-Ref Scanner**: Inspects ignored/untracked high-risk files and all local and remote-tracking refs using safe Git object reads.
* **Zero Workspace Disturbance**: The current branch, unstaged files, and working directory state are completely untouched during scanning.
* **Incident-Tested Signatures**: Detects both confirmed westackai injected-config families, the hidden fake-font task chain, and the commit-amend/force-push batch helper.
* **Shell-Safe Git Reads**: Git is invoked with argument arrays, so crafted branch or file names cannot become shell commands.
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
| `KNOWN_FAKE_FONT_AUTORUN_TASK` | 🔴 Critical | `.vscode/tasks.json` | Matches the confirmed hidden folder-open task that executes `fa-solid-400.woff2` with Node, including JSONC files. |
| `KNOWN_INJECTED_CONFIG_V1` | 🔴 Critical | PostCSS/Next/Tailwind config | Matches the padded `global['!']` + `rmcej%otb%` loader family. |
| `KNOWN_INJECTED_CONFIG_V2` | 🔴 Critical | PostCSS/Next/Tailwind config | Matches the padded require/network/process-spawn loader family. |
| `KNOWN_FAKE_FONT_PAYLOAD` | 🔴 Critical | `.woff2`, `.ttf`, `.otf`, `.woff` | Confirms a known JavaScript loader inside a file with a font extension. |
| `INVALID_FONT_MAGIC` | 🟠 High | Font assets | Flags a corrupt or disguised font for review without claiming confirmed malware. |
| `FORCE_PUSH_PROPAGATION_SCRIPT` | 🔴 Critical | `config.bat` | Detects backdating, commit amendment, hook bypass, and force-push propagation behavior. |
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
3. Locate the generated `guardian-virus-scan-1.2.0.vsix` file and reload VS Code.

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

Guardian never executes a checkout or repository file. It reads branch content directly from the Git object database and separately reads only high-risk working-tree candidates:

```bash
git show <branch>:.vscode/tasks.json
git ls-tree -r --name-only <branch>
```

Remote-tracking refs reflect the last local fetch; Guardian does not silently fetch from the network. Fetch normally, then rescan when you need the latest remote state.

---

## 📋 Roadmap

- [x] **v1.0.0** (Initial Release) — Real-time multi-branch scans, static threat detection ruleset, interactive webview dashboard.
- [x] **v1.1.0** — Working-tree and remote-ref coverage, confirmed incident signatures, shell-safe Git reads, and regression tests.
- [x] **v1.2.0** — False-positive whitelisting (Mark as Safe/Unsafe for Project & Global), footer status bar integration, branch overview quick copy, dual-dimension branch filtering, and sticky UI layering enhancements.
- [ ] **v2.0.0** (Planned) — Reviewed quarantine workflow and user-defined signature rules.
- [ ] **v3.0.0** (Planned) — Remote branch check integrations and GitHub Actions CI pipelines runner.

---

## ⚖️ License

Distributed under the [MIT License](LICENSE).

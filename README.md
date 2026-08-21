<p align="center">
  <img src="media/logo.png" width="160" height="160" alt="Guardian Logo" />
</p>

<h1 align="center">Guardian — Glassworm & Malware Scanner</h1>

<p align="center">
  <strong>Proactive Security, Glassworm Defense & Multi-Branch Git Threat Detection for VS Code Workspaces</strong>
</p>

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=ankushlokhande.guardian-virus-scan"><img src="https://img.shields.io/visual-studio-marketplace/v/ankushlokhande.guardian-virus-scan?style=flat-square&color=38bdf8" alt="Marketplace Version" /></a>
  <a href="https://marketplace.visualstudio.com/items?itemName=ankushlokhande.guardian-virus-scan"><img src="https://img.shields.io/visual-studio-marketplace/d/ankushlokhande.guardian-virus-scan?style=flat-square&color=f472b6" alt="Downloads" /></a>
  <img src="https://img.shields.io/github/license/ankush-ppie/guardian-virus-scan?style=flat-square&color=34d399" alt="License" />
  <img src="https://img.shields.io/badge/Glassworm-Protected-emerald?style=flat-square" alt="Glassworm Protected" />
</p>

---

## ⚡ What is Glassworm & Why Do You Need Guardian?

The **Glassworm** malware campaign and modern supply-chain attacks specifically target developer machines by embedding stealth backdoors directly into workspace configurations and repository files.

When you open an untrusted project or pull a branch, attackers exploit automated development workflows before you even run a single test:

* 🪱 **Hidden Autorun Tasks**: Injected `.vscode/tasks.json` triggers that execute invisibly on folder open (`runOn: folderOpen`).
* 🪱 **Fake Font Payloads**: Obfuscated JavaScript loaders disguised under font extensions like `fa-solid-400.woff2`, `.ttf`, or `.otf`.
* 🪱 **Injected Framework Configs**: Padded malicious code appended to `postcss.config.mjs`, `next.config.js`, or `tailwind.config.js`.
* 🪱 **Silent Git Propagation Scripts**: Batch helpers (`config.bat`) that backdate commits, amend histories, bypass hooks (`--no-verify`), and force-push malware to your remotes.

**Guardian** neutralizes this threat vector by scanning your active working tree and **every single local and remote-tracking Git branch** in the background — identifying threats before they can execute.

---

## 🚀 Quick Start (Zero Configuration Required)

1. **Auto-Scan on Open**: Guardian automatically runs a silent background scan whenever you open a project in VS Code.
2. **2-Tab Interactive Dashboard**:
   - **Tab 1: Glassworm & Security Report** — Git branch scans, threat breakdown matrix, whitelisted safe rules, and threat cards with quarantined code viewers.
   - **Tab 2: Extension Audit** — Scan installed extensions against 418+ malicious signatures and invisible-Unicode heuristics with one-click removal.
3. **Status Bar Access**: Look at the bottom status bar for the `🛡️ Guardian` shield indicator. Click it anytime to open the interactive security report.
4. **Manual Commands**: Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and run:
   ```
   Guardian: Scan for Glassworm & Workspace Threats
   Guardian: Open Glassworm & Security Report
   Guardian: Audit Installed Extensions for Malware
   ```
5. **Interactive Remediation**: Inspect threat details, remove malicious extensions with 1-click **"Remove All"** or 1-by-1 uninstallation, view quarantined snippets in read-only virtual tabs, or whitelist internal rules with **Mark as Safe**.

---

## 🛡️ Key Features

* 📑 **2-Tab Security Dashboard**: Cleanly separated views for **Glassworm & Security Report** (Tab 1) and **Extension Audit** (Tab 2) with active status badges and state persistence.
* 📦 **Supply-Chain Extension Auditor**: Audits all installed VS Code & editor extensions against a database of 418+ known malicious extension IDs and runs deep heuristic analysis (ForceMemo markers `lzcdrtfxyqiplpd`, invisible Unicode runs `U+FE00–U+FE0F`/`U+E0100–U+E01EF`, and decoder patterns).
* 🗑️ **One-Click Extension Remediation**: Remove all detected malicious extensions at once or uninstall them 1-by-1 directly from the report view with CLI fallback commands.
* 🔍 **Multi-Branch & Ref Scanner**: Inspects all local branches and remote-tracking refs directly via safe Git object database reads with automatic non-blocking remote ref updates (`git fetch --all --prune`).
* 🌳 **Working Tree & Untracked Coverage**: Detects ignored, untracked, and newly modified high-risk files in your active workspace.
* 🔒 **Zero Workspace Disturbance**: Never checks out branches, never alters your working tree files or index, and never executes untrusted code.
* 🎯 **Incident-Tested Glassworm Signatures**: Specific pattern recognition for confirmed Glassworm loader variants, fake font payloads, and amend/force-push propagation helpers.
* 🛡️ **False-Positive Whitelisting**: Mark benign custom rules as Safe for **This Project** or **All Projects** globally with instant UI reclassification.
* ⚡ **Shell-Safe Execution**: Git commands use strict argument arrays, preventing crafted branch or commit names from becoming shell injections.
* 📊 **Adaptive Project Detection**: Automatically optimizes threat rules for Flutter, Node.js, Next.js, Python, and Generic code repositories.

---

## 🛑 Threat Detection Matrix

Guardian defends against Glassworm campaign signatures, supply-chain vulnerabilities, and malicious workspace automation:

| Threat Rule | Severity | Category | Target File / Area | Threat Description |
| :--- | :--- | :--- | :--- | :--- |
| `KNOWN_FAKE_FONT_AUTORUN_TASK` | 🔴 Critical | **Glassworm** | `.vscode/tasks.json` | Confirmed hidden folder-open task executing `fa-solid-400.woff2` payload via Node. |
| `KNOWN_INJECTED_CONFIG_V1` | 🔴 Critical | **Glassworm** | PostCSS / Next / Tailwind config | Confirmed obfuscated loader appended after export (`global['!']` + `rmcej%otb%`). |
| `KNOWN_INJECTED_CONFIG_V2` | 🔴 Critical | **Glassworm** | PostCSS / Next / Tailwind config | Confirmed padded require/network/process-spawn loader appended to configuration. |
| `KNOWN_FAKE_FONT_PAYLOAD` | 🔴 Critical | **Glassworm** | `.woff2`, `.ttf`, `.otf`, `.woff` | Confirmed JavaScript loader hidden inside a file with a font extension. |
| `FORCE_PUSH_PROPAGATION_SCRIPT` | 🔴 Critical | **Glassworm** | `config.bat` / scripts | Backdates system time, amends commit, bypasses hooks, and force-pushes origin. |
| `AUTO_RUN_ON_OPEN` | 🔴 Critical | Workspace Security | `.vscode/tasks.json` | Flag automation tasks configured to run automatically upon folder open. |
| `STEALTH_TERMINAL` | 🔴 Critical | Workspace Security | `.vscode/tasks.json` | Detects hidden, background, or headless terminals designed for stealth execution. |
| `NODE_EXECUTES_BINARY` | 🔴 Critical | Workspace Security | `.vscode/tasks.json` | Identifies tasks attempting to execute binary files disguised as font or script files via Node. |
| `AUTO_TASKS_ENABLED` | 🔴 Critical | VS Code Settings | `.vscode/settings.json` | Flags configurations that automatically permit task execution without confirmation. |
| `OBFUSCATED_COMMAND` | 🟠 High | Malware Detection | `.vscode/tasks.json` | Detects base64 or obfuscated command payloads in tasks. |
| `NETWORK_DOWNLOAD_IN_TASK` | 🟠 High | Supply Chain | `.vscode/tasks.json` | Identifies curl, wget, or fetch commands downloading unverified remote scripts. |
| `INVALID_FONT_MAGIC` | 🟠 High | Asset Integrity | Font assets (`.woff2`, `.ttf`) | Flags corrupt or disguised font files with invalid magic header bytes. |
| `GITIGNORE_HIDES_ITSELF` | 🟠 High | Stealth Bypass | `.gitignore` | Warns if `.gitignore` attempts to hide itself or push scripts from tracking. |
| `GITIGNORE_HIDES_PUSH_SCRIPT` | 🟠 High | Stealth Bypass | `.gitignore` | Detects gitignore rules hiding `.sh` or `.bat` executable scripts. |
| `PUBSPEC_DEP_OVERRIDE` | 🟠 High | Flutter / Dart | `pubspec.yaml` | Flags dependency override manipulation pointing to untrusted sources. |
| `PUBSPEC_UNKNOWN_GIT_DEP` | 🟠 High | Flutter / Dart | `pubspec.yaml` | Warns against untrusted Git repository dependency configurations. |
| `GITIGNORE_HIDES_VSCODE` | 🟡 Medium | Stealth Bypass | `.gitignore` | Detects hiding `.vscode/` configurations from normal commit review. |
| `SENSITIVE_ENV_IN_LAUNCH` | 🟡 Medium | Credential Leak | `.vscode/launch.json` | Flags hardcoded secrets or environment variables in launch configs. |
| `BUILD_YAML_CUSTOM_BUILDER` | 🟡 Medium | Flutter / Dart | `build.yaml` | Flags custom builder steps executing unverified compilation tasks. |
| `TERMINAL_ENV_ISOLATION` | 🟡 Medium | VS Code Settings | `.vscode/settings.json` | Flags modifications that alter the terminal environment variables. |

---

## 🛠️ Installation

### From VS Code Marketplace
1. Open VS Code and press `Ctrl+Shift+X` / `Cmd+Shift+X` to open Extensions.
2. Search for **`Guardian`** or **`Glassworm`**.
3. Click **Install**.

### From VSIX
1. Download the latest release `.vsix` from [GitHub Releases](https://github.com/ankush-ppie/guardian-virus-scan/releases).
2. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`) and choose:
   ```
   Extensions: Install from VSIX...
   ```
3. Select the `.vsix` file and reload VS Code.

---

## 💡 How It Works Under the Hood

Guardian reads repository files directly from the Git object database without switching branches:

```bash
git show <branch>:.vscode/tasks.json
git ls-tree -r --name-only <branch>
```

* **No Branch Switching**: Your working tree, stashes, and current branch state remain 100% untouched.
* **Safe Read-Only Viewer**: When you click to inspect an infected file, Guardian opens a virtual, read-only document (`guardian-branch:/...`) so the malicious task cannot accidentally trigger.

---

## 📋 Changelog & Version History

See [CHANGELOG.md](CHANGELOG.md) for full release notes and feature history.

---

## ⚖️ License

Distributed under the [MIT License](LICENSE).

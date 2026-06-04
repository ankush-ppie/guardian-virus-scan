# Developer Guidelines — Guardian Virus Scan

This document outlines the setup, build, and versioning process for developers contributing to the Guardian Virus Scan extension.

---

## 💻 1. How to Run Locally

To set up your local development environment and run the extension:

1. **Clone and Install Dependencies**:
   ```bash
   git clone https://github.com/ankush-ppie/guardian-virus-scan.git
   cd guardian-virus-scan
   npm install
   ```

2. **Open in VS Code**:
   ```bash
   code .
   ```

3. **Launch the Extension Host**:
   - Press **`F5`** (or go to the **Run and Debug** panel in the sidebar and click **Run Extension**).
   - This opens a new window called **[Extension Development Host]** with the extension loaded.
   - Open any Git repository folder in this host window to automatically trigger the branch security scan.

4. **Debugging**:
   - You can view debugger logs and `console.log()` statements inside the original VS Code window's **Debug Console** tab.
   - Reload the host window (`Cmd+R` / `Ctrl+R`) at any time to reload your code changes.

---

## 🚀 2. How to Bump Version & Package a New Build

To package a production-ready `.vsix` installer for testing or distribution:

1. **Bump the Version**:
   Open [package.json](file:///Users/ankushlokhande/Projects/InHouse/guardian-virus-scan/package.json) and increment the version field, or use the npm utility:
   ```bash
   # Bumps patch version (e.g. from 1.0.1 to 1.0.2)
   npm version patch --no-git-tag-version
   ```

2. **Compile and Package**:
   Package the extension using `vsce`. The packaging script automatically triggers `npm run vscode:prepublish` which compiles TypeScript sources in `/src` to `/out`:
   ```bash
   npx @vscode/vsce package
   ```
   This will output a file named `guardian-virus-scan-[version].vsix` in the root folder.

3. **Test the Local VSIX**:
   - Open VS Code.
   - Open the Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
   - Run `Extensions: Install from VSIX...` and select your newly built `.vsix` file.

---

## 🔀 3. How to Raise a PR

Please follow this contribution workflow when submitting changes:

1. **Create a Feature Branch**:
   ```bash
   # Sync with main
   git checkout main
   git pull origin main

   # Create branch
   git checkout -b feature/your-feature-name
   # OR
   git checkout -b bugfix/your-bug-name
   ```

2. **Implement and Lint/Compile**:
   - Make your changes inside the `src/` directory.
   - Verify they compile cleanly:
     ```bash
     npm run compile
     ```
   - Ensure the new dashboard layout is fully compatible with light/dark themes by utilizing the VS Code theme variables (`var(--vscode-...)`).

3. **Commit Changes**:
   Stage and commit your changes with clear, descriptive messages:
   ```bash
   git add .
   git commit -m "Detailed explanation of what this commit adds or fixes"
   ```
   *Note: If your git configurations require GPG signing, follow the terminal passphrase prompts to sign the commit.*

4. **Push and Raise PR**:
   Push the branch to the remote repository:
   ```bash
   git push -u origin feature/your-feature-name
   ```
   Go to the repository on GitHub, click **Compare & pull request**, describe your changes clearly in the PR template, and submit it for review.

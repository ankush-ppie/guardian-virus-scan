import type * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

function getVscode(): typeof import('vscode') | undefined {
  try {
    return require('vscode');
  } catch {
    return undefined;
  }
}

export interface InterceptedThreat {
  taskLabel: string;
  command?: string;
  rule: string;
  detail: string;
  line?: number;
}

export interface EmergencyInterceptResult {
  workspacePath: string;
  tasksJsonPath: string;
  threats: InterceptedThreat[];
  tasksTerminatedCount: number;
  terminalsTerminatedCount: number;
}

/**
 * Strips single-line (//) and multi-line (/* ... *\/) comments from JSONC content.
 */
export function stripJsonComments(jsonc: string): string {
  return jsonc
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^\\:])\/\/.*$/gm, '$1');
}

/**
 * Finds the 1-indexed line number where a substring or regex occurs in content.
 */
export function findLineNumber(content: string, target: string | RegExp): number | undefined {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (typeof target === 'string') {
      if (lines[i].includes(target)) return i + 1;
    } else {
      if (target.test(lines[i])) return i + 1;
    }
  }
  return undefined;
}

/**
 * Pure function: Analyzes tasks.json content and identifies any harmful or stealth autorun tasks.
 */
export function detectHarmfulTasksFromContent(content: string): InterceptedThreat[] {
  const threats: InterceptedThreat[] = [];

  let parsed: any;
  try {
    const cleaned = stripJsonComments(content).trim();
    if (!cleaned) return [];
    parsed = JSON.parse(cleaned);
  } catch {
    return [];
  }

  const tasks: any[] = Array.isArray(parsed?.tasks) ? parsed.tasks : [];

  for (const task of tasks) {
    if (!task || typeof task !== 'object') continue;
    const label = String(task.label || task.taskName || 'Unnamed Task');
    const command = typeof task.command === 'string' ? task.command : '';
    const runOnFolderOpen = task.runOptions?.runOn === 'folderOpen';
    const isStealthPresentation =
      task.presentation?.reveal === 'never' &&
      (task.presentation?.close === true || task.presentation?.hide === true || task.presentation?.echo === false);

    // Rule 1: Confirmed Fake Font Autorun Task (Glassworm)
    if (runOnFolderOpen && /node\s+[^\s]+\.(woff2?|ttf|otf)/i.test(command)) {
      threats.push({
        taskLabel: label,
        command,
        rule: 'KNOWN_FAKE_FONT_AUTORUN_TASK',
        detail: `Malicious autorun task on folder open executing disguised font payload: "${command}"`,
        line: findLineNumber(content, 'folderOpen') || findLineNumber(content, label),
      });
      continue;
    }

    // Rule 2: Node executing binary or disguised asset
    if (/node\s+[^\s]+\.(woff2?|ttf|otf|png|jpg|svg|ico|bin|dat|mp3|mp4)/i.test(command)) {
      threats.push({
        taskLabel: label,
        command,
        rule: 'NODE_EXECUTES_BINARY',
        detail: `Task executes binary asset via Node.js: "${command}"`,
        line: findLineNumber(content, command.slice(0, 30)) || findLineNumber(content, label),
      });
      continue;
    }

    // Rule 3: Autorun task on folder open with dangerous command or stealth
    if (runOnFolderOpen) {
      const isHarmfulOrStealth =
        isStealthPresentation ||
        /\b(curl|wget|Invoke-WebRequest|iwr|fetch|powershell|cmd\.exe|bash|sh|python|perl|eval|exec)\b/i.test(command) ||
        /[A-Za-z0-9+/]{80,}={0,2}/.test(command);

      if (isHarmfulOrStealth) {
        threats.push({
          taskLabel: label,
          command,
          rule: 'AUTO_RUN_ON_OPEN',
          detail: `Automated task configured to run silently on folder open: "${command || label}"`,
          line: findLineNumber(content, 'folderOpen') || findLineNumber(content, label),
        });
        continue;
      }
    }

    // Rule 4: Headless stealth terminal
    if (isStealthPresentation && command) {
      threats.push({
        taskLabel: label,
        command,
        rule: 'STEALTH_TERMINAL',
        detail: `Stealth background task hiding terminal output (reveal:never): "${command}"`,
        line: findLineNumber(content, label),
      });
      continue;
    }

    // Rule 5: Network download inside task
    if (/\b(curl|wget|Invoke-WebRequest|iwr|DownloadString|DownloadFile)\b/i.test(command)) {
      threats.push({
        taskLabel: label,
        command,
        rule: 'NETWORK_DOWNLOAD_IN_TASK',
        detail: `Task downloads remote scripts/binaries from network: "${command}"`,
        line: findLineNumber(content, /\b(curl|wget|Invoke-WebRequest|iwr|DownloadString|DownloadFile)\b/i),
      });
      continue;
    }

    // Rule 6: Obfuscated payload command
    if (/[A-Za-z0-9+/]{80,}={0,2}/.test(command)) {
      threats.push({
        taskLabel: label,
        command,
        rule: 'OBFUSCATED_COMMAND',
        detail: `Obfuscated/base64 encoded command payload detected in task: "${label}"`,
        line: findLineNumber(content, label),
      });
    }
  }

  return threats;
}

/**
 * Checks a runtime vscode.Task object to determine if it is harmful and should be blocked.
 */
export function isTaskHarmful(task: vscode.Task): { isHarmful: boolean; threat?: InterceptedThreat } {
  const label = task.name || 'Unnamed Task';
  const execution = task.execution;

  let commandLine = '';
  if (execution && 'commandLine' in execution && typeof (execution as any).commandLine === 'string') {
    commandLine = (execution as any).commandLine;
  } else if (execution && 'command' in execution && typeof (execution as any).command === 'string') {
    commandLine = (execution as any).command;
  }

  if (!commandLine) return { isHarmful: false };

  // Check against harmful execution signatures
  if (/node\s+[^\s]+\.(woff2?|ttf|otf|png|jpg|svg|ico|bin|dat|mp3|mp4)/i.test(commandLine)) {
    return {
      isHarmful: true,
      threat: {
        taskLabel: label,
        command: commandLine,
        rule: 'NODE_EXECUTES_BINARY',
        detail: `Task executes binary asset via Node.js: "${commandLine}"`,
      },
    };
  }

  if (/\b(curl|wget|Invoke-WebRequest|iwr|DownloadString|DownloadFile)\b/i.test(commandLine) && /\b(sh|bash|node|python|cmd|powershell)\b/i.test(commandLine)) {
    return {
      isHarmful: true,
      threat: {
        taskLabel: label,
        command: commandLine,
        rule: 'NETWORK_DOWNLOAD_IN_TASK',
        detail: `Task downloads and executes remote script: "${commandLine}"`,
      },
    };
  }

  if (/[A-Za-z0-9+/]{80,}={0,2}/.test(commandLine)) {
    return {
      isHarmful: true,
      threat: {
        taskLabel: label,
        command: commandLine,
        rule: 'OBFUSCATED_COMMAND',
        detail: `Obfuscated command payload in task: "${label}"`,
      },
    };
  }

  return { isHarmful: false };
}

/**
 * Main Emergency Interceptor:
 * Synchronously checks .vscode/tasks.json on workspace startup, terminates active matching
 * task executions and terminals, and disables automatic task execution in workspace settings.
 */
export async function inspectAndTerminateHarmfulExecution(
  workspacePath: string
): Promise<EmergencyInterceptResult | null> {
  const tasksJsonPath = path.join(workspacePath, '.vscode', 'tasks.json');
  if (!fs.existsSync(tasksJsonPath)) {
    return null;
  }

  let content = '';
  try {
    content = fs.readFileSync(tasksJsonPath, 'utf8');
  } catch {
    return null;
  }

  const threats = detectHarmfulTasksFromContent(content);
  if (threats.length === 0) {
    return null;
  }

  let tasksTerminatedCount = 0;
  let terminalsTerminatedCount = 0;
  const threatLabels = new Set(threats.map(t => t.taskLabel.toLowerCase()));
  const vs = getVscode();

  if (vs) {
    // 1. Terminate any active task executions in VS Code
    try {
      for (const execution of vs.tasks.taskExecutions) {
        const execName = (execution.task?.name || '').toLowerCase();
        const isMatch = threatLabels.has(execName) || isTaskHarmful(execution.task).isHarmful;
        if (isMatch) {
          execution.terminate();
          tasksTerminatedCount++;
        }
      }
    } catch {
      // Non-blocking
    }

    // 2. Terminate matching background / stealth terminals
    try {
      for (const terminal of vs.window.terminals) {
        const termName = (terminal.name || '').toLowerCase();
        if (threatLabels.has(termName) || termName.includes('guardian-emergency') || termName.includes('stealth')) {
          terminal.dispose();
          terminalsTerminatedCount++;
        }
      }
    } catch {
      // Non-blocking
    }

    // 3. Disable automatic task execution in workspace configuration to prevent re-execution
    try {
      const taskConfig = vs.workspace.getConfiguration('task');
      await taskConfig.update('allowAutomaticTasks', 'off', vs.ConfigurationTarget.Workspace);
    } catch {
      // Non-blocking
    }
  }

  return {
    workspacePath,
    tasksJsonPath,
    threats,
    tasksTerminatedCount,
    terminalsTerminatedCount,
  };
}

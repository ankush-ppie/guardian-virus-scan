export interface SafeRuleEntry {
  rule: string;
  file?: string;
  scope: 'project' | 'global';
  addedAt: number;
}

export const WORKSPACE_SAFE_RULES_KEY = 'guardian.safeRules';
export const GLOBAL_SAFE_RULES_KEY = 'guardian.globalSafeRules';

/**
 * Minimal interface to abstract VS Code memento / state storage for easy testing
 */
export interface StateStorage {
  get<T>(key: string, defaultValue?: T): T;
  update(key: string, value: any): Thenable<void> | Promise<void>;
}

export function getAllSafeRules(
  workspaceState?: StateStorage,
  globalState?: StateStorage
): SafeRuleEntry[] {
  const projectRules: SafeRuleEntry[] = workspaceState
    ? (workspaceState.get<SafeRuleEntry[]>(WORKSPACE_SAFE_RULES_KEY, []) || []).map(r => ({ ...r, scope: 'project' as const }))
    : [];

  const globalRules: SafeRuleEntry[] = globalState
    ? (globalState.get<SafeRuleEntry[]>(GLOBAL_SAFE_RULES_KEY, []) || []).map(r => ({ ...r, scope: 'global' as const }))
    : [];

  return [...projectRules, ...globalRules];
}

export async function addSafeRule(
  rule: string,
  file: string | undefined,
  scope: 'project' | 'global',
  workspaceState?: StateStorage,
  globalState?: StateStorage
): Promise<void> {
  const entry: SafeRuleEntry = {
    rule,
    file,
    scope,
    addedAt: Date.now(),
  };

  const targetState = scope === 'project' ? workspaceState : globalState;
  const targetKey = scope === 'project' ? WORKSPACE_SAFE_RULES_KEY : GLOBAL_SAFE_RULES_KEY;

  if (!targetState) return;

  const current = targetState.get<SafeRuleEntry[]>(targetKey, []) || [];
  // Remove existing duplicate if any
  const filtered = current.filter(r => !(r.rule === rule && (r.file || '') === (file || '')));
  filtered.push(entry);
  await targetState.update(targetKey, filtered);
}

export async function removeSafeRule(
  rule: string,
  file: string | undefined,
  workspaceState?: StateStorage,
  globalState?: StateStorage
): Promise<void> {
  const normFile = file || '';

  if (workspaceState) {
    const currentProj = workspaceState.get<SafeRuleEntry[]>(WORKSPACE_SAFE_RULES_KEY, []) || [];
    const filteredProj = currentProj.filter(r => !(r.rule === rule && (r.file || '') === normFile));
    await workspaceState.update(WORKSPACE_SAFE_RULES_KEY, filteredProj);
  }

  if (globalState) {
    const currentGlobal = globalState.get<SafeRuleEntry[]>(GLOBAL_SAFE_RULES_KEY, []) || [];
    const filteredGlobal = currentGlobal.filter(r => !(r.rule === rule && (r.file || '') === normFile));
    await globalState.update(GLOBAL_SAFE_RULES_KEY, filteredGlobal);
  }
}

export function matchSafeRule(
  rule: string,
  filePath: string,
  safeRules: SafeRuleEntry[]
): SafeRuleEntry | undefined {
  const normFilePath = filePath.replace(/\\/g, '/');

  for (const entry of safeRules) {
    if (entry.rule !== rule) continue;

    if (!entry.file) {
      // Rule-level whitelist (applies to all files for this rule)
      return entry;
    }

    const normEntryFile = entry.file.replace(/\\/g, '/');
    if (normFilePath === normEntryFile || normFilePath.endsWith('/' + normEntryFile)) {
      return entry;
    }
  }

  return undefined;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GLOBAL_SAFE_RULES_KEY = exports.WORKSPACE_SAFE_RULES_KEY = void 0;
exports.getAllSafeRules = getAllSafeRules;
exports.addSafeRule = addSafeRule;
exports.removeSafeRule = removeSafeRule;
exports.matchSafeRule = matchSafeRule;
exports.WORKSPACE_SAFE_RULES_KEY = 'guardian.safeRules';
exports.GLOBAL_SAFE_RULES_KEY = 'guardian.globalSafeRules';
function getAllSafeRules(workspaceState, globalState) {
    const projectRules = workspaceState
        ? (workspaceState.get(exports.WORKSPACE_SAFE_RULES_KEY, []) || []).map(r => ({ ...r, scope: 'project' }))
        : [];
    const globalRules = globalState
        ? (globalState.get(exports.GLOBAL_SAFE_RULES_KEY, []) || []).map(r => ({ ...r, scope: 'global' }))
        : [];
    return [...projectRules, ...globalRules];
}
async function addSafeRule(rule, file, scope, workspaceState, globalState) {
    const entry = {
        rule,
        file,
        scope,
        addedAt: Date.now(),
    };
    const targetState = scope === 'project' ? workspaceState : globalState;
    const targetKey = scope === 'project' ? exports.WORKSPACE_SAFE_RULES_KEY : exports.GLOBAL_SAFE_RULES_KEY;
    if (!targetState)
        return;
    const current = targetState.get(targetKey, []) || [];
    // Remove existing duplicate if any
    const filtered = current.filter(r => !(r.rule === rule && (r.file || '') === (file || '')));
    filtered.push(entry);
    await targetState.update(targetKey, filtered);
}
async function removeSafeRule(rule, file, workspaceState, globalState) {
    const normFile = file || '';
    if (workspaceState) {
        const currentProj = workspaceState.get(exports.WORKSPACE_SAFE_RULES_KEY, []) || [];
        const filteredProj = currentProj.filter(r => !(r.rule === rule && (r.file || '') === normFile));
        await workspaceState.update(exports.WORKSPACE_SAFE_RULES_KEY, filteredProj);
    }
    if (globalState) {
        const currentGlobal = globalState.get(exports.GLOBAL_SAFE_RULES_KEY, []) || [];
        const filteredGlobal = currentGlobal.filter(r => !(r.rule === rule && (r.file || '') === normFile));
        await globalState.update(exports.GLOBAL_SAFE_RULES_KEY, filteredGlobal);
    }
}
function matchSafeRule(rule, filePath, safeRules) {
    const normFilePath = filePath.replace(/\\/g, '/');
    for (const entry of safeRules) {
        if (entry.rule !== rule)
            continue;
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

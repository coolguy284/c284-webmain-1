function loadFromLocalStorage() {
  let data = localStorage[LOCALSTORAGE_KEY] ?? '{}';
  let stateFromSave = JSON.parse(data, mathCtx.reviver);
  state.commandHistory = stateFromSave.commandHistory ?? [];
  state.resultHistory = stateFromSave.resultHistory ?? [];
  state.cfg = {};
  state.cfg.precision = stateFromSave.cfg?.precision ?? DEFAULT_PRECISION;
  setting_save_history.checked = stateFromSave.cfg?.saveHistory ?? DEFAULT_SAVE_HISTORY;
  setting_save_results.checked = stateFromSave.cfg?.saveResults ?? DEFAULT_SAVE_RESULTS;
  setting_save_variables.checked = stateFromSave.cfg?.saveVariables ?? DEFAULT_SAVE_VARIABLES;
  stateSetVars(stateFromSave.vars ?? []);
  setViewMode(stateFromSave.ui?.viewMode ?? DEFAULT_VIEW_MODE);
}

function saveToLocalStorage() {
  let stateToSave = {
    commandHistory: setting_save_history.checked ? state.commandHistory : null,
    resultHistory: setting_save_results.checked ? state.resultHistory : null,
    cfg: {
      ...state.cfg,
      saveHistory: setting_save_history.checked,
      saveResults: setting_save_results.checked,
      saveVariables: setting_save_variables.checked,
    },
    vars: setting_save_variables.checked ? stateGetVars() : null,
    ui: {
      viewMode: getViewMode(),
    },
  };
  let data = JSON.stringify(stateToSave, mathCtx.replacer);
  localStorage[LOCALSTORAGE_KEY] = data;
}

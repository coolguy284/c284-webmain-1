function loadFromLocalStorage() {
  let data = localStorage[LOCALSTORAGE_KEY] ?? '{}';
  let stateFromSave = JSON.parse(data, mathCtx.reviver);
  state.commandHistory = stateFromSave.commandHistory ?? [];
  state.resultHistory = stateFromSave.resultHistory ?? [];
  state.cfg = {};
  state.cfg.precision = stateFromSave.cfg?.precision ?? DEFAULT_PRECISION;
  stateSetVars(stateFromSave.vars ?? []);
  setViewMode(stateFromSave.ui?.viewMode ?? DEFAULT_VIEW_MODE);
}

function saveToLocalStorage() {
  let stateToSave = {
    ...state,
    vars: stateGetVars(),
    ui: {
      viewMode: getViewMode(),
    },
  };
  let data = JSON.stringify(stateToSave, mathCtx.replacer);
  localStorage[LOCALSTORAGE_KEY] = data;
}

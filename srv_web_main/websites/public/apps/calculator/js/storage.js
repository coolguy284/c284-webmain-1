function loadFromLocalStorage() {
  let data = localStorage[LOCALSTORAGE_KEY] ?? '{}';
  let stateFromSave = JSON.parse(data, mathCtx.reviver);
  state.commandHistory = stateFromSave.commandHistory ?? [];
  state.resultHistory = stateFromSave.resultHistory ?? [];
  state.cfg = {};
  state.cfg.precision = stateFromSave.cfg?.precision ?? DEFAULT_PRECISION;
  stateSetVars(stateFromSave.vars ?? []);
}

function saveToLocalStorage() {
  let stateToSave = {
    ...state,
    vars: stateGetVars(),
  };
  let data = JSON.stringify(stateToSave, mathCtx.replacer);
  localStorage[LOCALSTORAGE_KEY] = data;
}

function init() {
  loadFromLocalStorage();
  updateResultHistory();
  updateVariablesList();
  setting_mathjs_precision.value = state.cfg.precision;
  mathCtx.config({ precision: state.cfg.precision });
  calculator_input.focus();
}

init();

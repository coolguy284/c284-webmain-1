setting_mathjs_precision.addEventListener('change', () => {
  if (setting_mathjs_precision.value == '') {
    setting_mathjs_precision.value = DEFAULT_PRECISION;
  }
  state.cfg.precision = Number(setting_mathjs_precision.value);
  stateUpdated = true;
  mathCtx.config({ precision: state.cfg.precision });
});

calculator_input.addEventListener('keydown', evt => {
  if (evt.code == 'Enter') {
    let commandStr = calculator_input.value;
    let resultStr = calculate(commandStr);
    calculator_input.value = '';
    state.commandHistory.push(commandStr);
    state.resultHistory.push(`-> ${commandStr}`);
    state.resultHistory.push(`<- ${resultStr}`);
    stateUpdated = true;
    appendUpdateResultHistory(2);
    updateVariablesList();
    commandHistoryIndex = null;
    currentCommandText = null;
    evt.preventDefault();
  } else if (evt.code == 'ArrowUp') {
    if (state.commandHistory.length > 0) {
      if (commandHistoryIndex == null) {
        commandHistoryIndex = state.commandHistory.length - 1;
        currentCommandText = calculator_input.value;
        calculator_input.value = state.commandHistory[commandHistoryIndex];
      } else {
        if (commandHistoryIndex > 0) {
          commandHistoryIndex--;
          calculator_input.value = state.commandHistory[commandHistoryIndex];
        }
      }
    }
    evt.preventDefault();
  } else if (evt.code == 'ArrowDown') {
    if (state.commandHistory.length > 0) {
      if (commandHistoryIndex != null) {
        if (commandHistoryIndex >= state.commandHistory.length - 1) {
          commandHistoryIndex = null;
          if (currentCommandText != null) {
            calculator_input.value = currentCommandText;
          } else {
            calculator_input.value = '';
          }
          currentCommandText = null;
        } else {
          commandHistoryIndex++;
          calculator_input.value = state.commandHistory[commandHistoryIndex];
        }
      }
    }
    evt.preventDefault();
  } else {
    commandHistoryIndex = null;
    currentCommandText = null;
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState == 'hidden' && stateUpdated) {
    saveToLocalStorage();
    stateUpdated = false;
  }
});

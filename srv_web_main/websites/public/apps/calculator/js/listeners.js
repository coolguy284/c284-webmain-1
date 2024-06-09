function createNumberListener(elem, configName, defaultValue, afterAction) {
  elem.addEventListener('change', () => {
    if (elem.value == '') {
      elem.value = defaultValue;
    }
    state.cfg[configName] = Number(elem.value);
    stateUpdated = true;
    if (afterAction != null) {
      afterAction(state.cfg[configName]);
    }
  });
}

createNumberListener(
  setting_mathjs_precision,
  'precision',
  DEFAULT_PRECISION,
  val => mathCtx.config({ precision: val })
);

createNumberListener(
  setting_max_command_history,
  'maxCommandHistory',
  DEFAULT_MAX_COMMAND_HISTORY
);

createNumberListener(
  setting_max_result_history,
  'maxResultHistory',
  DEFAULT_MAX_RESULT_HISTORY
);

calculator_input.addEventListener('keydown', evt => {
  if (evt.key == 'Enter') {
    let commandStr = calculator_input.value;
    let resultStr = calculate(commandStr);
    stateUpdated = true;
    calculator_input.value = '';
    if (state.commandHistory.length == 0 || state.commandHistory.at(-1) != commandStr) {
      state.commandHistory.push(commandStr);
      if (state.commandHistory.length > state.cfg.maxCommandHistory) {
        state.commandHistory.splice(0, state.commandHistory.length - state.cfg.maxCommandHistory);
      }
    }
    if (resultStr != null) {
      state.resultHistory.push(`-> ${commandStr}`);
      state.resultHistory.push(`<- ${resultStr}`);
      if (state.resultHistory.length > state.cfg.maxResultHistory) {
        state.resultHistory.splice(0, state.resultHistory.length - state.cfg.maxResultHistory);
        updateResultHistory();
      } else {
        appendUpdateResultHistory(2);
      }
    } else {
      updateResultHistory();
    }
    updateVariablesList();
    commandHistoryIndex = null;
    currentCommandText = null;
    evt.preventDefault();
    // scroll to bottom of command history
    calculator_output.scrollTop = calculator_output.scrollHeight;
  } else if (evt.key == 'ArrowUp') {
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
  } else if (evt.key == 'ArrowDown') {
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
    // clear command history if a normal input is typed (cut / paste handled seperately)
    if (
      !(evt.altKey || evt.ctrlKey || evt.metaKey || evt.shiftKey) &&
      (evt.key.length <= 2 || evt.key == 'Backspace' || evt.key == 'Delete')
    ) {
      resetCommandHistoryPosition();
    }
  }
});

calculator_input.addEventListener('paste', resetCommandHistoryPosition);
calculator_input.addEventListener('cut', resetCommandHistoryPosition);

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState == 'hidden' && stateUpdated) {
    saveToLocalStorage();
    stateUpdated = false;
  }
});

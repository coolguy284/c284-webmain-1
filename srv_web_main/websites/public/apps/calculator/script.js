let MAX_COMMAND_HISTORY = 1000;
let MAX_RESULT_HISTORY = 2000;
let DEFAULT_PRECISION = 64;

let state = {
  commandHistory: [],
  resultHistory: [],
  cfg: {
    precision: DEFAULT_PRECISION,
  },
};
let stateGetVars = () => Array.from(calcParser.getAllAsMap());
let stateSetVars = vars => {
  calcParser.clear();
  for (let [ key, value ] of vars) {
    calcParser.set(key, value);
  }
};

let commandHistoryIndex = null;
let currentCommandText = null;

let mathCtx = math.create({
  number: 'BigNumber',
  precision: state.cfg.precision,
});
let calcParser = mathCtx.parser();

function toggleElem(elem) {
  if (elem.style.display == 'none') {
    elem.style.display = '';
  } else {
    elem.style.display = 'none';
  }
}

function toggleSettings() {
  toggleElem(settings_div);
}

function toggleHelp() {
  toggleElem(help_div);
}

function mathObjToString(obj) {
  if (obj === undefined) {
    return 'undefined';
  } else if (obj === null) {
    return 'null';
  } else {
    return obj.toString();
  }
}

function calculate(string) {
  try {
    let result = calcParser.evaluate(string);
    calcParser.set('ans', result);
    return mathObjToString(result);
  } catch (err) {
    return err.toString();
  }
}

function getVariables() {
  return Array.from(calcParser.getAllAsMap()).map(([name, value]) => `${name} = ${mathObjToString(value)}`);
}

function updateResultHistory() {
  calculator_output.innerText = state.resultHistory.join('\n');
}

function appendUpdateResultHistory(number) {
  calculator_output.innerText += '\n' + state.resultHistory.slice(-number).join('\n');
}

function updateVariablesList() {
  let vars = getVariables();
  if (vars.length == 0) {
    vars_list.innerHTML = '<em>Empty</em>';
  } else {
    vars_list.innerText = vars.join('\n');
  }
}

setting_mathjs_precision.addEventListener('change', () => {
  if (setting_mathjs_precision.value == '') {
    setting_mathjs_precision.value = DEFAULT_PRECISION;
  }
  state.cfg.precision = Number(setting_mathjs_precision.value);
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

function init() {
  updateResultHistory();
  updateVariablesList();
  calculator_input.focus();
}

init();

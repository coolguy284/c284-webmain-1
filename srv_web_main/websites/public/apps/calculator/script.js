let MAX_COMMAND_HISTORY = 1000;
let MAX_RESULT_HISTORY = 2000;
let DEFAULT_PRECISION = 64;
let LOCALSTORAGE_KEY = 'calculator_storage';

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
let stateUpdated = false;

let commandHistoryIndex = null;
let currentCommandText = null;
let calculatorOutput = '';

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
    stateUpdated = true;
    return mathObjToString(result);
  } catch (err) {
    return err.toString();
  }
}

function getVariables() {
  return Array.from(calcParser.getAllAsMap()).map(([name, value]) => `${name} = ${mathObjToString(value)}`);
}

function updateResultHistory() {
  calculatorOutput = state.resultHistory.join('\n');
  calculator_output.innerText = calculatorOutput;
}

function appendUpdateResultHistory(number) {
  let additional = state.resultHistory.slice(-number).join('\n');
  if (calculatorOutput.length != 0) {
    calculatorOutput += '\n' + additional;
  } else {
    calculatorOutput = additional;
  }
  calculator_output.innerText = calculatorOutput;
}

function updateVariablesList() {
  let vars = getVariables();
  if (vars.length == 0) {
    vars_list.innerHTML = '<em>Empty</em>';
  } else {
    vars_list.innerText = vars.join('\n');
  }
}

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

function init() {
  loadFromLocalStorage();
  updateResultHistory();
  updateVariablesList();
  calculator_input.focus();
}

init();

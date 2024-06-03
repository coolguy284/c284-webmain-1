let MAX_COMMAND_HISTORY = 1000;
let MAX_RESULT_HISTORY = 2000;

let commandHistory = [];
let resultHistory = [];
let mathCtx = math.create({
  number: 'BigNumber',
  precision: 64,
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
  calculator_output.innerText = resultHistory.join('\n');
}

function appendUpdateResultHistory(number) {
  updateResultHistory();
}

function updateVariablesList() {
  let vars = getVariables();
  if (vars.length == 0) {
    vars_list.innerHTML = '<em>Empty</em>';
  } else {
    vars_list.innerText = vars.join('\n');
  }
}

setting_mathjs_precision.addEventListener('change', evt => {
  if (setting_mathjs_precision.value == '') {
    setting_mathjs_precision.value = 64;
  }
});

calculator_input.addEventListener('keypress', evt => {
  if (evt.code == 'Enter') {
    let commandStr = calculator_input.value;
    let resultStr = calculate(commandStr);
    calculator_input.value = '';
    commandHistory.push(commandStr);
    resultHistory.push(`-> ${commandStr}`);
    resultHistory.push(`<- ${resultStr}`);
    appendUpdateResultHistory(2);
    updateVariablesList();
  }
});

function init() {
  updateResultHistory();
  updateVariablesList();
  calculator_input.focus();
}

init();

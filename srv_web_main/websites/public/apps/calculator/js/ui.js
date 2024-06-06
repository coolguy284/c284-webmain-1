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

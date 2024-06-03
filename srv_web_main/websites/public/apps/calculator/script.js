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

function calculate(string) {
  return string;
}

setting_mathjs_precision.addEventListener('change', evt => {
  if (setting_mathjs_precision.value == '') {
    setting_mathjs_precision.value = 64;
  }
});

calculator_input.addEventListener('keypress', evt => {
  if (evt.code == 'Enter') {
    calculate(calculator_input.value);
    calculator_input.value = '';
  }
});

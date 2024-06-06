async function init() {
  loadFromLocalStorage();
  updateResultHistory();
  updateVariablesList();
  setting_mathjs_precision.value = state.cfg.precision;
  mathCtx.config({ precision: state.cfg.precision });
  calculator_input.focus();
  
  let wordsText = (await (await fetch('/data/words.txt')).text()).trim();
  ENGLISH_WORDS = wordsText.split(/\n|\r\n/);
  ENGLISH_WORDS_ALPHA = ENGLISH_WORDS.filter(x => /^[a-zA-Z]+$/.test(x));
}

init();

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

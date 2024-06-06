function mathObjToString(obj) {
  return mathCtx.format(obj);
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

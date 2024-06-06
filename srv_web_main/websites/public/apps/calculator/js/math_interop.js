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

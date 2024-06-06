function mathObjToString(obj, suppressError) {
  if (suppressError) {
    try {
      return mathCtx.format(obj);
    } catch (err) {
      return `[${err.toString()}]`;
    }
  } else {
    return mathCtx.format(obj);
  }
}

function calculate(string) {
  try {
    switch (string) {
      case 'clear':
      case 'cls':
        mathCtx.clearAll();
        break;
      
      case 'clear vars':
        mathCtx.clear();
        break;
      
      case 'clear history':
        mathCtx.clearHistory();
        break;
      
      default: {
        let result = calcParser.evaluate(string);
        calcParser.set('ans', result);
        stateUpdated = true;
        return mathObjToString(result);
      }
    }
  } catch (err) {
    return err.toString();
  }
}

function getVariables() {
  return Array.from(calcParser.getAllAsMap()).map(([name, value]) => `${name} = ${mathObjToString(value, true)}`);
}

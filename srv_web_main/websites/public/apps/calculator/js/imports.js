mathCtx.import({
  has: (obj, prop) => {
    if (prop == null) {
      prop = obj;
      return calcParser.scope.has(prop);
    } else {
      return prop in obj;
    }
  },
  get: (obj, prop) => {
    if (prop == null) {
      prop = obj;
      return calcParser.get(prop);
    } else {
      return obj[prop];
    }
  },
  set: (obj, prop, value) => {
    if (prop == null) {
      value = prop;
      prop = obj;
      return calcParser.set(prop, value);
    } else {
      Object.defineProperty(obj, prop, {
        value,
        writable: true,
        configurable: true,
        enumerable: true,
      });
    }
  },
  remove: (obj, prop) => {
    if (prop == null) {
      prop = obj;
      return calcParser.remove(prop);
    } else {
      delete obj[prop];
    }
  },
  getKeys: obj => {
    if (obj == null) {
      return Array.from(calcParser.getAllAsMap().keys());
    } else {
      return Object.keys(obj);
    }
  },
  clear: obj => {
    if (obj == null) {
      calcParser.clear();
    } else {
      for (let key in obj) {
        delete obj[key];
      }
    }
  },
  
  clearHistory: () => {
    state.commandHistory.splice(0);
    state.resultHistory.splice(0);
    updateResultHistory();
  },
  
  clearAll: () => {
    mathCtx.clear();
    mathCtx.clearHistory();
  },
  
  englishWords: () => {
    if (ENGLISH_WORDS == null) {
      throw new Error('Words list not initialized yet');
    }
    return ENGLISH_WORDS;
  },
  
  englishWordsAlpha: () => {
    if (ENGLISH_WORDS == null) {
      throw new Error('Words list not initialized yet');
    }
    return ENGLISH_WORDS_ALPHA;
  },
  
  wordSearchBasic: (query, includeNonAlphanumeric) => {
    return mathCtx.wordSearchRegex('^' + query.replaceAll('*', '.') + '$', includeNonAlphanumeric);
  },
  
  wordSearchRegex: (queryRegex, includeNonAlphanumeric) => {
    if (ENGLISH_WORDS == null) {
      throw new Error('Words list not initialized yet');
    }
    let wordList = includeNonAlphanumeric ? ENGLISH_WORDS : ENGLISH_WORDS_ALPHA;
    queryRegex = new RegExp(queryRegex);
    return wordList.filter(word => queryRegex.test(word));
  },
});

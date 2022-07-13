var fs = require('fs');
var path = require('path');

module.exports = {
  fsGetterFuncGen: function fsGetterFuncGen(rootPath, extraSites) {
    if (!extraSites) extraSites = new Set();
    return async filePath => {
      let properFilePath = new URL('http:/e/' + encodeURI(filePath.startsWith('/') ? filePath.slice(1) : filePath)).pathname;
      let fullPath = path.join(rootPath, decodeURI(properFilePath));
      if (path.sep == '\\') fullPath = fullPath.replaceAll('\\', '/');
      try {
        return await fs.promises.readFile(fullPath);
      } catch (e) {
        if (extraSites.has(properFilePath)) {
          return null; // null is special value for site that doesn't actually exist but is in extraSites
        } else {
          return undefined;
        }
      }
    };
  },
  
  crawl: async function crawl(rootPath, getterFunc) {
    var paths = new Map([[rootPath, 0]]), newPaths = [[rootPath, await getterFunc(rootPath)]];
    
    for (var depth = 1; newPaths.length > 0 && depth < 10; depth++) {
      newPaths = (await Promise.all(
        newPaths.map(filePath => {
          if (filePath[1] == null) return [];
          let matched = filePath[1].toString().match(/(?<=<a.*href\s*=\s*['"]).*?(?=['"]>)/g) ?? [];
          return matched.map(subFilePath => {
            subFilePath = decodeURI(subFilePath);
            subFilePath = subFilePath.endsWith('/') ? subFilePath + 'index.html' : subFilePath;
            return subFilePath.startsWith('/') ? subFilePath : path.join(filePath[0], '../' + subFilePath).split(path.sep).join(path.posix.sep);
          });
        })
        .reduce((a, c) => (c.forEach(x => a.push(x)), a), [])
        .filter(filePath => !paths.has(filePath))
        .map(async filePath => [filePath, await getterFunc(filePath)])
      ))
      .filter(filePath => filePath[1] !== undefined);
      
      newPaths.forEach(filePath => paths.set(filePath[0], depth));
    }
    
    return paths;
  },
};

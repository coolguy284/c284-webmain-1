var fs = require('fs');

function recursiveReaddirInternal(path, excludeDirs) {
  try {
    if (!excludeDirs) excludeDirs = [];
    
    var currentExcludeDirs = excludeDirs.filter(x => !x.includes('/'));
    
    var contents = fs.readdirSync(path, { withFileTypes: true }).filter(x => !currentExcludeDirs.includes(x.name));
    
    var folders = [], files = [];
    
    contents.forEach(x => x.isDirectory() ? folders.push(x) : files.push(x));
    
    return [...folders.map(x => recursiveReaddirInternal(path + '/' + x.name, excludeDirs.filter(x => x.startsWith(x)).map(x => x.split('/').slice(1).join('/'))).map(y => x.name + '/' + y)).reduce((a, c) => (a.push(...c), a), []), ...files.map(x => x.name)];
  } catch (e) {
    console.error(e);
    return [];
  }
}

// keep track of past 10 unique recursive readdir calls to speed up repeated function calls
var prevReaddirs = new Map();

function recursiveReaddir(path, excludeDirs) {
  var args = JSON.stringify([path, excludeDirs]);
  
  var prevCall = prevReaddirs.get(args);
  if (prevCall)
    return prevCall;
  
  var newCall = recursiveReaddirInternal(path, excludeDirs);
  
  prevReaddirs.set(args, newCall);
  
  if (prevReaddirs.size > 10)
    prevReaddirs.delete(prevReaddirs.keys().next().value);
  
  return newCall;
}

module.exports = recursiveReaddirInternal;

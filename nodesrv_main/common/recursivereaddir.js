var fs = require('fs');

module.exports = function recursiveReaddir(path, excludeDirs) {
  try {
    if (!excludeDirs) excludeDirs = [];
    
    var currentExcludeDirs = excludeDirs.filter(x => !x.includes('/'));
    
    var contents = fs.readdirSync(path, { withFileTypes: true }).filter(x => !currentExcludeDirs.includes(x.name));
    
    var folders = [], files = [];
    
    contents.forEach(x => x.isDirectory() ? folders.push(x) : files.push(x));
    
    return [...folders.map(x => recursiveReaddir(path + '/' + x.name, excludeDirs.filter(x => x.startsWith(x)).map(x => x.split('/').slice(1).join('/'))).map(y => x.name + '/' + y)).reduce((a, c) => (a.push(...c), a), []), ...files.map(x => x.name)];
  } catch (e) {
    console.error(e);
    return [];
  }
};

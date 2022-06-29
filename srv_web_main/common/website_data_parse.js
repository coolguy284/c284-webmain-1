var fs = require('fs');

module.exports = function parseWebsiteData() {
  let files = require('./recursive_readdir')('websites/public');
  
  let filesObject = Object.fromEntries(files.map(path => [path, 0]));
  
  let entries = fs.readFileSync('websites/website_data.txt').toString().split('\n').filter(entry => entry && !entry.startsWith('#'));
  
  entries.forEach(entry => {
    let [ path, val ] = entry.split(':').map(part => part.trim()); val = parseInt(val);
    if (!val) return;
    
    let match;
    if (match = /^(.*)\/\*$/.exec(path)) {
      files.filter(path => path.startsWith(match[1])).forEach(path => val >= 0 ? (filesObject[path] |= val) : (filesObject[path] &= ~-val));
    } else if (match = /^\*\.([^/]+)$/.exec(path)) {
      files.filter(path => path.endsWith('.' + match[1])).forEach(path => val >= 0 ? (filesObject[path] |= val) : (filesObject[path] &= ~-val));
    } else {
      if (path in filesObject) val >= 0 ? (filesObject[path] |= val) : (filesObject[path] &= ~-val);
    }
  });
  
  return filesObject;
};

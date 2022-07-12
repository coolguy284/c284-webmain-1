var fs = require('fs');
var path = require('path');

var common = {
  isSubDir: (parent, dir) => {
    var relativePath = path.relative(parent, dir);
    return relativePath && relativePath != '..' && !relativePath.startsWith('..' + path.sep) && !path.isAbsolute(relativePath);
  },
  
  getPublicPath: pathName => {
    if (pathName.endsWith('/') || !pathName)
      pathName += 'index.html';
    
    try {
      pathName = decodeURI(pathName);
    } catch (err) { /* empty */ }
    
    return 'websites/public' + (pathName.startsWith('/') ? pathName : '/' + pathName);
  },
};

module.exports = async function isValidUrl(url) {
  var publicPath = common.getPublicPath(url);
  
  if (!common.isSubDir('websites/public', publicPath))
    return false;
  
  if (/\/\/+/.test(publicPath))
    return false;
  
  let match;
  
  if (url.startsWith('/misc/unicode/') && (match = /^\/misc\/unicode\/([Uu])\+((?:|0?[0-9A-Fa-f]|10)[0-9A-Fa-f]{4})$/.exec(url))) {
    let fancyCodePoint = parseInt(match[2], 16).toString(16).toUpperCase().padStart(4, '0');
    if (match[1] == 'u' || fancyCodePoint != match[2])
      return false;
    else
      return true;
  }
  
  try {
    let stats = await fs.promises.stat(__dirname + '/../' + publicPath);
        
    if (stats.isDirectory())
      return false;
    
    return true;
  } catch (err) {
    if (err.code == 'ENOENT' || err.code == 'ENOTDIR' || err.code == 'EISDIR')
      return false;
    else
      throw err;
  }
};

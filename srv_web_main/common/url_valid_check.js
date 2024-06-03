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

var _statErrorCodes = new Set(['ENOENT', 'ENOTDIR', 'EISDIR', 'ERR_INVALID_ARG_VALUE']);

var doCaching = true;

async function isValidUrl(url) {
  var publicPath = common.getPublicPath(url);
  
  if (!common.isSubDir('websites/public', publicPath))
    return false;
  
  if (/\/\/+/.test(publicPath))
    return false;
  
  let match;
  
  if (url.startsWith('/old/') || url.startsWith('/old2/') || url.startsWith('/oldg/')) return true;
  
  if (url.startsWith('/unicode/') && (match = /^\/unicode\/([Uu])\+((?:|0?[0-9A-Fa-f]|10)[0-9A-Fa-f]{4})$/.exec(url))) {
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
    if (_statErrorCodes.has(err.code))
      return false;
    else
      throw err;
  }
}

var urlCache = new Map();
var urlCurrentAwaits = new Map();

module.exports = exports = async function isValidUrlCache(url) {
  if (!doCaching) return await isValidUrl(url);
  
  let cachedResponse = urlCache.get(url);
  if (cachedResponse != null) return cachedResponse;
  
  let currentAwait = urlCurrentAwaits.get(url);
  if (currentAwait)
    return await new Promise(r => {
      currentAwait.push(r);
    });
  
  let responseAwait = isValidUrl(url);
  
  currentAwait = [];
  urlCurrentAwaits.set(url, currentAwait);
  
  let response = await responseAwait;
  
  urlCache.set(url, response);
  
  new Promise(r => {
    currentAwait.forEach(x => x(response));
    urlCurrentAwaits.delete(url);
    r();
  });
  
  return response;
};

exports._statErrorCodes = _statErrorCodes;
exports.isValidUrl = isValidUrl;
exports.urlCache = urlCache;
Object.defineProperty(exports, 'doCaching', {
  configurable: true,
  enumerable: true,
  get: () => doCaching,
  set: v => { doCaching = v; },
});

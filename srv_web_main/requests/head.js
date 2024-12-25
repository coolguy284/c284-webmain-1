var fs = require('fs');
var { getPublicPath } = require('../common/get_request_misc');
var { isSubDir } = require('../common/misc');
var resp = require('../common/resp');
var unicode = require('../common/unicode');

module.exports = async function headMethod(requestProps) {
  var publicPath = getPublicPath(requestProps.url.pathname);
  
  var match;
  
  if (!isSubDir('websites/public', publicPath)) {
    await resp.s404(requestProps, true);
    return;
  }
  
  if (requestProps.url.pathname.startsWith('/api/')) {
    if (requestProps.url.pathname == '/api/null') {
      await resp.headers(requestProps, 204);
      await resp.end(requestProps);
    } else {
      await resp.headers(requestProps, 400);
      await resp.end(requestProps);
    }
  }
  
  else if (requestProps.url.pathname == '/r') {
    if (requestProps.url.search.startsWith('?uh=')) {
      await resp.headers(requestProps, 303, { 'location': decodeURIComponent(requestProps.url.search.slice(4)) });
      await resp.end(requestProps);
    } else if (requestProps.url.search.startsWith('?eh=')) {
      await resp.headers(requestProps, 303, { 'location': Buffer.from(requestProps.url.search.slice(3), 'base64').toString() });
      await resp.end(requestProps);
    } else {
      await resp.headers(requestProps, 400);
      await resp.end(requestProps);
    }
  }
  
  else if (requestProps.url.pathname == '/misc/no_source.html') {
    await resp.fileFull(
      requestProps, 'websites/public/misc/no_source.html', true,
      { 'link': '<no_source.css>; rel="stylesheet"' }
    );
  }
  
  else if (requestProps.url.pathname.startsWith('/unicode/') && (match = /^\/unicode\/([Uu])\+((?:|0?[0-9A-Fa-f]|10)[0-9A-Fa-f]{4})$/.exec(requestProps.url.pathname))) {
    let fancyCodePoint = parseInt(match[2], 16).toString(16).toUpperCase().padStart(4, '0');
    if (match[1] == 'u' || fancyCodePoint != match[2]) {
      let newURL = new URL(requestProps.url);
      newURL.pathname = '/unicode/U+' + fancyCodePoint;
      newURL = newURL.href;
      
      await resp.headers(requestProps, 308, { 'location': newURL });
      await resp.end(requestProps);
    } else {
      let codePoint = match[2].toUpperCase();
      let unicodeChar = unicode.getEntry(codePoint);
      let fileLength = Buffer.from(
        (await fs.promises.readFile('websites/public/debug/templates/unicode.html')).toString()
          .replaceAll('{code_point}', codePoint)
          .replaceAll('{category}', unicodeChar[1] ? unicode.categoryAbbr[unicodeChar[1]] : 'N/A')
          .replaceAll('{name}', unicodeChar[0] || 'N/A')
          .replaceAll('{alias}', unicodeChar[9] || 'N/A')
          .replaceAll('{name_alias}', unicodeChar[9] || unicodeChar[0] || 'N/A')
      ).length;
      await resp.headers(requestProps, 200, resp.getBasicFileHeadersHead(requestProps, fileLength, 'text/html; charset=utf-8'));
      await resp.end(requestProps);
    }
  }
  
  else if (requestProps.url.pathname == '/yiyo.dev') {
    await resp.fileFull(
      requestProps, 'websites/public/yiyo.dev', true,
      { 'content-type': 'text/html; charset=utf-8' }
    );
  }
  
  else {
    await resp.fileFull(requestProps, publicPath, true);
  }
};

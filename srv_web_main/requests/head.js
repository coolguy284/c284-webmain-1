var fs = require('fs');
var common = require('../common');
var unicode = require('../common/unicode');

module.exports = async function headMethod(requestProps) {
  var publicPath = common.getPublicPath(requestProps.url.pathname);
  
  var match;
  
  if (!common.isSubDir('websites/public', publicPath)) {
    await common.resp.s404(requestProps, true);
    return;
  }
  
  if (requestProps.url.pathname.startsWith('/api/') || requestProps.url.pathname == '/r') {
    if (requestProps.url.pathname == '/api/null') {
      await common.resp.headers(requestProps, 204);
      await common.resp.end(requestProps);
    } else {
      await common.resp.headers(requestProps, 501);
      await common.resp.end(requestProps);
    }
  }
  
  else if (requestProps.url.pathname == '/misc/no_source.html') {
    await common.resp.fileFull(
      requestProps, 'websites/public/misc/no_source.html', true,
      { 'link': '<no_source.css>; rel="stylesheet"' }
    );
  }
  
  else if (requestProps.url.pathname.startsWith('/misc/unicode/') && (match = /^\/misc\/unicode\/([Uu])\+((?:0?[0-9A-Fa-f]|10|)[0-9A-Fa-f]{4})$/.exec(requestProps.url.pathname))) {
    let fancyCodePoint = parseInt(match[2], 16).toString(16).toUpperCase().padStart(4, '0');
    if (match[1] == 'u' || fancyCodePoint != match[2]) {
      let newURL = new URL(requestProps.url);
      newURL.pathname = '/unicode/U+' + fancyCodePoint;
      newURL = newURL.href;
      
      await common.resp.headers(requestProps, 308, { 'location': newURL });
      await common.resp.end(requestProps);
    } else {
      let codePoint = match[2].toUpperCase();
      let unicodeChar = unicode.getEntry(codePoint);
      let fileLength = Buffer.from(
        (await fs.promises.readFile('websites/public/misc/debug/templates/unicode.html')).toString()
          .replaceAll('{code_point}', codePoint)
          .replaceAll('{category}', unicodeChar[1] ? unicode.categoryAbbr[unicodeChar[1]] : 'N/A')
          .replaceAll('{name}', unicodeChar[0] || 'N/A')
          .replaceAll('{alias}', unicodeChar[9] || 'N/A')
          .replaceAll('{name_alias}', unicodeChar[9] || unicodeChar[0] || 'N/A')
      ).length;
      await common.resp.headers(requestProps, 200, common.resp.getBasicFileHeadersHead(fileLength, 'text/html; charset=utf-8'));
      await common.resp.end(requestProps);
    }
  }
  
  else if (requestProps.url.pathname == '/yiyo.dev') {
    await common.resp.fileFull(
      requestProps, 'websites/public/yiyo.dev', true,
      { 'content-type': 'text/html; charset=utf-8' }
    );
  }
  
  else {
    await common.resp.fileFull(requestProps, publicPath, true);
  }
};

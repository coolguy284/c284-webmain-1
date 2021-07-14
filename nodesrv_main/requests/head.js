var path = require('path');
var common = require('../common');
var unicode = require('../common/unicode');

module.exports = async function headMethod(requestProps) {
  var publicPath = path.join('websites/public', decodeURI(requestProps.url.pathname.endsWith('/') || !requestProps.url.pathname ? requestProps.url.pathname + 'index.html' : requestProps.url.pathname));
  
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
  
  else if (requestProps.url.pathname == '/no_source.html') {
    await common.resp.fileFull(
      requestProps, 'websites/public/no_source.html', true,
      { 'link': '<no_source.css>; rel="stylesheet"' }
    );
  }
  
  else if (requestProps.url.pathname.startsWith('/unicode/') && (match = /^\/unicode\/[Uu]\+((?:0?[0-9A-Fa-f]|10|)[0-9A-Fa-f]{4})$/.exec(requestProps.url.pathname))) {
    let code_point = match[1].toUpperCase();
    let unicodeChar = unicode.getEntry(code_point);
    let fileLength = Buffer.from(
      (await fs.promises.readFile('websites/public/debug/templates/unicode.html')).toString()
        .replaceAll('{code_point}', code_point)
        .replaceAll('{category}', unicodeChar[1] ? unicode.categoryAbbr[unicodeChar[1]] : 'N/A')
        .replaceAll('{name}', unicodeChar[0] || 'N/A')
        .replaceAll('{alias}', unicodeChar[9] || 'N/A')
        .replaceAll('{name_alias}', unicodeChar[9] || unicodeChar[0] || 'N/A')
    ).length;
    await common.resp.headers(requestProps, 200, common.resp.getBasicFileHeadersHead(fileLength, 'text/html; charset=utf-8'));
    await common.resp.end(requestProps);
  }
  
  await common.resp.fileFull(requestProps, publicPath, true);
};

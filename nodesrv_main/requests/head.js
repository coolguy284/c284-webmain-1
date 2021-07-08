var path = require('path');
var common = require('../common');

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
  
  await common.resp.fileFull(requestProps, publicPath, true);
};

var path = require('path');
var common = require('../common');

module.exports = async function getMethod(requestProps) {
  var publicPath = path.join('websites/public', decodeURI(requestProps.url.pathname.endsWith('/') || !requestProps.url.pathname ? requestProps.url.pathname + 'index.html' : requestProps.url.pathname));
  
  if (!common.isSubDir('websites/public', publicPath)) {
    await common.resp.s404(requestProps);
    return;
  }
  
  if (requestProps.url.pathname.startsWith('/api/')) {
    if (requestProps.url.pathname == '/api/own_eyes/v1') {
      let searchParams = new URL('https://null/?' + (await common.resp.getStreamBuffer(requestProps)).toString()).searchParams;
      if (common.vars.ownEyesCodes.has(searchParams.get('code'))) {
        await common.resp.headers(requestProps, 200, { 'content-type': 'text/plain; charset=utf-8' });
        await common.resp.end(requestProps, '<span><span><span>ｈ</span><span>ｅ</span>ｌ</span>ｏ</span>');
        common.vars.ownEyesCodes.delete(decodeURIComponent(searchParams.get('code')));
      } else {
        await common.resp.headers(requestProps, 404, { 'content-type': 'text/plain; charset=utf-8' });
        await common.resp.end(requestProps, '');
      }
    }
    
    else if (requestProps.url.pathname == '/api/null') {
      await common.resp.headers(requestProps, 204);
      await common.resp.end(requestProps);
    }
    
    else {
      await common.resp.headers(requestProps, 500, { 'content-type': 'text/plain; charset=utf-8' });
      await common.resp.end(requestProps, 'Error: invalid API endpoint');
    }
  }
  
  else {
    await common.resp.headers(requestProps, 501);
    await common.resp.end(requestProps);
  }
};

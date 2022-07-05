var common = require('../common');
var resp = require('../common/resp');

module.exports = async function postMethod(requestProps) {
  var publicPath = common.getPublicPath(requestProps.url.pathname);
  
  if (!common.isSubDir('websites/public', publicPath)) {
    await resp.s404(requestProps);
    return;
  }
  
  if (requestProps.url.pathname.startsWith('/api/')) {
    if (requestProps.url.pathname == '/api/own_eyes/v1') {
      let searchParams = new URL('https://null/?' + (await resp.getStreamBuffer(requestProps)).toString()).searchParams;
      if (common.vars.ownEyesCodes.has(searchParams.get('code'))) {
        await resp.headers(requestProps, 200, { 'content-type': 'text/plain; charset=utf-8' });
        await resp.end(requestProps, '<span><span><span>ｈ</span><span>ｅ</span>ｌ</span>ｏ</span>');
        common.vars.ownEyesCodes.delete(decodeURIComponent(searchParams.get('code')));
      } else {
        await resp.headers(requestProps, 404, { 'content-type': 'text/plain; charset=utf-8' });
        await resp.end(requestProps, '');
      }
    }
    
    else if (requestProps.url.pathname == '/api/null') {
      await resp.headers(requestProps, 204);
      await resp.end(requestProps);
    }
    
    else {
      await resp.headers(requestProps, 500, { 'content-type': 'text/plain; charset=utf-8' });
      await resp.end(requestProps, 'Error: invalid API endpoint');
    }
  }
  
  else {
    await resp.headers(requestProps, 501);
    await resp.end(requestProps);
  }
};

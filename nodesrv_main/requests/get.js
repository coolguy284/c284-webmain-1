var path = require('path');
var common = require('../common');

module.exports = async function getMethod(requestProps) {
  var publicPath = path.join('websites/public', decodeURI(requestProps.url.pathname.endsWith('/') || !requestProps.url.pathname ? requestProps.url.pathname + 'index.html' : requestProps.url.pathname));
  
  if (!common.isSubDir('websites/public', publicPath)) {
    await common.resp.s404(requestProps);
    return;
  }
  
  if (requestProps.url.pathname == '/api/own_eyes/v1') {
    if (common.vars.ownEyesCodes.has(requestProps.url.searchParams.get('code'))) {
      await common.resp.headers(requestProps, 200, { 'content-type': 'text/plain; charset=utf-8' });
      await common.resp.end(requestProps, '<span><span><span>ｈ</span><span>ｅ</span>ｌ</span>ｏ</span>');
      common.vars.ownEyesCodes.delete(decodeURIComponent(requestProps.url.searchParams.get('code')));
    } else {
      await common.resp.headers(requestProps, 404, { 'content-type': 'text/plain; charset=utf-8' });
      await common.resp.end(requestProps, '');
    }
  }
  
  else if (requestProps.url.pathname == '/own_eyes.html') {
    let code = crypto.randomBytes(16).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    let file = Buffer.from((await fs.promises.readFile('websites/public/own_eyes.html')).toString().replace('{code}', code));
    await common.resp.headers(requestProps, 200, common.resp.getBasicFileHeaders(file, 'text/html; charset=utf-8'));
    await common.resp.end(requestProps, file);
    common.vars.ownEyesCodes.set(code, Date.now());
  }
  
  else if (requestProps.url.pathname == '/no_source.html') {
    await common.resp.fileFull(
      requestProps, 'websites/public/no_source.html', null,
      { 'link': '<no_source.css>; rel="stylesheet"' }
    );
  }
  
  else {
    await common.resp.fileFull(requestProps, publicPath);
  }
};

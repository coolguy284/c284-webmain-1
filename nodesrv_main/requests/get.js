var path = require('path');
var common = require('../common');

module.exports = async function getMethod(requestProps) {
  if (requestProps.url.pathname == '/') {
    await common.resp.fileFull(requestProps, 'websites/public/index.html');
    return;
  }
  
  var publicPath = path.join('websites/public', decodeURIComponent(requestProps.url.pathname));
  
  if (!common.isSubDir('websites/public', publicPath)) {
    await common.resp.s404(requestProps);
    return;
  }
  
  await common.resp.fileFull(requestProps, publicPath);
};

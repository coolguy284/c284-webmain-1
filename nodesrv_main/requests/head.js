var path = require('path');
var common = require('../common');

module.exports = async function headMethod(requestProps) {
  if (requestProps.url.pathname == '/') {
    await common.resp.fileFull(requestProps, 'websites/public/index.html', true);
    return;
  }
  
  var publicPath = path.join('websites/public', requestProps.url.pathname);
  
  if (!common.isSubDir('websites/public', publicPath)) {
    await common.resp.s404(requestProps, true);
    return;
  }
  
  await common.resp.fileFull(requestProps, publicPath, true);
};

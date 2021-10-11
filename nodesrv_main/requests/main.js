var logger = require('../logutils.js')('requests/main');

var common = require('../common');
var redirects = require('../common/redirects');

var methods = {
  options: require('./options'),
  get: require('./get'),
  head: require('./head'),
  post: require('./post'),
  connect: require('./connect'),
};

// args.length == 2 is req, res (http1.1), while args.length == 4 is stream, headers, flags, rawHeaders (http2)
module.exports = async function main(httpVersion, ...args) {
  try {
    if (httpVersion == 2 && args[1][':scheme'] != 'https') {
      args[0].close();
      return;
    }
    
    var requestProps = common.getRequestProps(httpVersion, ...args, 'main');
    
    if (!requestProps.url.pathname.startsWith('/api/')) logger.info(common.getReqLogStr(requestProps));
    
    if (requestProps.proto == 'http' || requestProps.host == 'www.coolguy284.com') {
      let newURL = new URL(requestProps.url);
      if (requestProps.proto == 'http') newURL.protocol = 'https:';
      if (requestProps.host == 'www.coolguy284.com') newURL.host = 'coolguy284.com';
      await common.resp.headers(requestProps, 307, { 'location': newURL.href });
      await common.resp.end(requestProps);
      return;
    }
    
    if (requestProps.url.pathname in redirects.redirects) {
      let redirectInfo = redirects.redirects[requestProps.url.pathname], newURL;
      if (redirectInfo[0].startsWith('http://') || redirectInfo[0].startsWith('https://')) {
        newURL = redirectInfo[0];
      } else {
        newURL = new URL(requestProps.url);
        newURL.pathname = redirectInfo[0];
        newURL = newURL.href;
      }
      await common.resp.headers(requestProps, redirects.mapping[redirectInfo[1]], { 'location': newURL });
      await common.resp.end(requestProps);
      return;
    }
    
    if (!(requestProps.method in methods && methods[requestProps.method](requestProps) != 1)) {
      await common.resp.headers(requestProps, 501);
      await common.resp.end(requestProps);
    }
  } catch (err) {
    logger.error(err);
    try {
      await common.resp.s500(requestProps);
    } catch (err2) {
      logger.error(err2);
    }
  }
};

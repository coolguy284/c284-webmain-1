var logger = require('../logutils.js')('requests/main');

var common = require('../common');
var redirects = require('../common/redirects');

var methods = {
  //options: require('./options'),
  get: require('./get'),
  head: require('./head'),
  //post: require('./post'),
  //put: require('./put'),
  //patch: require('./patch'),
  //delete: require('./delete'),
  connect: require('./connect'),
};

// args.length == 2 is req, res (http1.1), while args.length == 4 is stream, headers, flags, rawHeaders (http2)
module.exports = async function main(...args) {
  try {
    if (args.length == 4 && args[1][':scheme'] != 'https') {
      args[0].close();
      return;
    }
    
    var requestProps = common.getRequestProps(...args, 'main');
    
    if (!requestProps.url.pathname.startsWith('/api/')) logger.info(common.getReqLogStr(requestProps));
    
    if (requestProps.proto == 'http') {
      let newURL = new URL(requestProps.url);
      newURL.protocol = 'https:';
      common.resp.headers(requestProps, 307, { 'location': newURL.href });
      common.resp.end(requestProps);
      return;
    }
    
    if (requestProps.url.pathname in redirects.redirects) {
      let redirectInfo = redirects.redirects[requestProps.url.pathname];
      let newURL = new URL(requestProps.url);
      newURL.pathname = redirectInfo[0];
      common.resp.headers(requestProps, redirects.mapping[redirectInfo[1]], { 'location': newURL.href });
      common.resp.end(requestProps);
      return;
    }
    
    if (!(requestProps.method in methods && methods[requestProps.method](requestProps) != 1)) {
      common.resp.headers(requestProps, 501);
      common.resp.end(requestProps);
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

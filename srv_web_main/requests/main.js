var logger = require('../log_utils.js')('requests/main');

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
    
    if (!requestProps.url.pathname.startsWith('/api/') &&
      !(requestProps.host == 'old.coolguy284.com' && (
        common.constVars.oldServerNoLogURLs.has(requestProps.url.path) &&
        !common.constVars.oldServerNoLogURLStarts.some(x => requestProps.url.path.startsWith(x))
      ) || requestProps.url.path.startsWith('/old') && (
        common.constVars.oldServerNoLogURLs.has(requestProps.url.path.slice(4)) &&
        !common.constVars.oldServerNoLogURLStarts.some(x => requestProps.url.path.slice(4).startsWith(x))
      )))
      logger.info(common.getReqLogStr(requestProps));
    
    // redirect main page to https
    if (requestProps.proto == 'http' && requestProps.host != 'old.coolguy284.com' || requestProps.host == 'www.coolguy284.com') {
      let newURL = new URL(requestProps.url);
      if (requestProps.proto == 'http') newURL.protocol = 'https:';
      if (requestProps.host == 'www.coolguy284.com') newURL.host = 'coolguy284.com';
      await common.resp.headers(requestProps, 307, { 'location': newURL.href });
      await common.resp.end(requestProps);
      return;
    }
    
    let isOldServer = requestProps.host == 'old.coolguy284.com' || requestProps.url.pathname.startsWith('/old/');
    let isHttp2Connect = requestProps.httpVersion == 2 && requestProps.method == 'connect';
    if (isOldServer && !isHttp2Connect) {
      // old server proxying
      let sendURL = requestProps.url.pathname.startsWith('/old/') ? requestProps.url.path.slice(4) : requestProps.url.path;
      let sendHeaders = {
        ...(':authority' in requestProps.headers ? { host: requestProps.headers[':authority'] } : null),
        ...Object.fromEntries(Object.entries(requestProps.headers).filter(x => !x[0].startsWith(':') && x[0].toLowerCase() != 'content-length')),
        'x-forwarded-for': requestProps.ip,
        'x-forwarded-proto': 'https',
      };
      let srvReq = http.request({
        host: 'srv_web_old',
        port: 8080,
        method: requestProps.method,
        path: sendURL,
        headers: sendHeaders,
        setHost: false,
        timeout: 10000,
      }, async res => {
        await common.resp.headers(requestProps, res.statusCode, {
          ...Object.fromEntries(Object.entries(res.headers).filter(x => x[0].toLowerCase() != 'connection')),
          'x-robots-tag': 'noindex',
        });
        await common.resp.stream(requestProps, res);
      });
      httpServerProxyConns.add(srvReq);
      srvReq.on('close', () => { httpServerProxyConns.delete(srvReq); });
      srvReq.on('error', x => logger.error(x));
      common.resp.getStream(requestProps).pipe(srvReq);
    } else {
      // main server processing
      if (!isOldServer) {
        let potentialRedirect = redirects.followRedirects(requestProps.url);
        
        if (potentialRedirect[0]) {
          await common.resp.headers(requestProps, potentialRedirect[1], { 'location': potentialRedirect[2] });
          await common.resp.end(requestProps);
          return;
        }
      }
      
      let methodRun;
      if (requestProps.method in methods) methodRun = methods[requestProps.method](requestProps) != 1;
      if (!methodRun) {
        await common.resp.headers(requestProps, 501);
        await common.resp.end(requestProps);
      }
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

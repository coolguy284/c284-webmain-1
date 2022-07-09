var logger = require('../log_utils')('requests/main');

var http = require('http');
var common = require('../common');
var redirects = require('../common/redirects');
var resp = require('../common/resp');
var commonVars = require('../common').vars;

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
    
    if (requestProps.doLog)
      logger.info(common.getReqLogStr(requestProps));
    
    // redirect main page to https
    if (requestProps.proto == 'http' && !requestProps.otherServer?.isHost || requestProps.host == 'www.coolguy284.com') {
      let newURL = new URL(requestProps.url);
      if (requestProps.proto == 'http') newURL.protocol = 'https:';
      if (requestProps.host == 'www.coolguy284.com') newURL.host = 'coolguy284.com';
      await resp.headers(requestProps, 307, { 'location': newURL.href });
      await resp.end(requestProps);
      return;
    }
    
    let isHttp2Connect = requestProps.httpVersion == 2 && requestProps.method == 'connect';
    
    if (requestProps.otherServer && !isHttp2Connect) {
      // server proxying
      let sendHeaders = {
        ...(':authority' in requestProps.headers ? { host: requestProps.headers[':authority'] } : null),
        ...Object.fromEntries(Object.entries(requestProps.headers).filter(x => !x[0].startsWith(':') && x[0].toLowerCase() != 'content-length')),
        'x-forwarded-for': requestProps.ip,
        'x-forwarded-proto': 'https',
      };
      let srvReq = http.request({
        host: requestProps.otherServer.host,
        port: requestProps.otherServer.port,
        method: requestProps.method,
        path: requestProps.otherServer.slicedPath,
        headers: sendHeaders,
        setHost: false,
        timeout: 10000,
      }, async res => {
        await resp.headers(requestProps, res.statusCode, {
          ...Object.fromEntries(Object.entries(res.headers).filter(x => x[0].toLowerCase() != 'connection')),
        });
        await resp.stream(requestProps, res);
      });
      commonVars.httpServerProxyConns.add(srvReq);
      srvReq.on('close', () => { commonVars.httpServerProxyConns.delete(srvReq); });
      srvReq.on('error', x => logger.error(x));
      resp.getStream(requestProps).pipe(srvReq);
    } else {
      // main server processing
      if (!requestProps.otherServer) {
        let potentialRedirect = redirects.followRedirects(requestProps.url);
        
        if (potentialRedirect[0]) {
          await resp.headers(requestProps, potentialRedirect[1], { 'location': potentialRedirect[2] });
          await resp.end(requestProps);
          return;
        }
      }
      
      let methodRun;
      if (requestProps.method in methods) methodRun = methods[requestProps.method](requestProps) != 1;
      if (!methodRun) {
        await resp.headers(requestProps, 501);
        await resp.end(requestProps);
      }
    }
  } catch (err) {
    logger.error(err);
    try {
      await resp.s500(requestProps);
    } catch (err2) {
      logger.error(err2);
    }
  }
};

var logger = require('../log_utils')('requests/main');

var http = require('http');
var { env } = require('../common/env');
var { getReqLogStr } = require('../common/get_request_misc');
var getRequestProps = require('../common/get_request_props');
var redirects = require('../common/redirects');
var resp = require('../common/resp');
var { vars: commonVars } = require('../common/vars');

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
    
    var requestProps = getRequestProps(httpVersion, ...args, 'main');
    
    if (requestProps.doLog)
      logger.info(getReqLogStr(requestProps));
    
    // redirect http to https (if https enforce enabled) and www.coolguy284.com to coolguy284.com
    let doPreRedirect = false, preRedirNewURL;
    if (env.SRV_WEB_MAIN_HTTPS_ENFORCE) {
      if (requestProps.proto == 'http' && !requestProps.otherServer?.isHost ||
          requestProps.host == 'www.coolguy284.com') {
        doPreRedirect = true;
        preRedirNewURL = new URL(requestProps.url);
        if (requestProps.proto == 'http') preRedirNewURL.protocol = 'https:';
        if (requestProps.host == 'www.coolguy284.com') preRedirNewURL.host = 'coolguy284.com';
      }
    } else {
      if (requestProps.host == 'www.coolguy284.com') {
        doPreRedirect = true;
        preRedirNewURL = new URL(requestProps.url);
        if (requestProps.host == 'www.coolguy284.com') preRedirNewURL.host = 'coolguy284.com';
      }
    }
    if (doPreRedirect) {
      await resp.headers(requestProps, 307, { 'location': preRedirNewURL.href });
      await resp.end(requestProps);
      return;
    }
    
    let isHttp2Connect = requestProps.httpVersion == 2 && requestProps.method == 'connect';
    
    if (requestProps.otherServerOnline && !isHttp2Connect) {
      if (requestProps.proto == 'http' && requestProps.otherServer.forceHttps) {
        // redirect server request to https
        let newURL = new URL(requestProps.url);
        newURL.protocol = 'https:';
        await resp.headers(requestProps, 307, { 'location': newURL.href });
        await resp.end(requestProps);
      } else {
        // server proxying
        let sendHeaders = {
          ...(':authority' in requestProps.headers ? { host: requestProps.headers[':authority'] } : null),
          ...Object.fromEntries(Object.entries(requestProps.headers).filter(x => !x[0].startsWith(':') && x[0].toLowerCase() != 'content-length')),
          'x-forwarded-for': requestProps.otherServer.castIPv4to6 ? requestProps.ipv6Cast : requestProps.ip,
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
            ...(
              requestProps.httpVersion == 1 ?
                res.headers :
                Object.fromEntries(
                  Object.entries(res.headers)
                    .filter(x => !resp._httpInvalidHttp2Headers.has(x[0].toLowerCase()))
                )
            ),
          });
          await resp.stream(requestProps, res);
        });
        commonVars.httpServerProxyConns.add(srvReq);
        srvReq.on('close', () => { commonVars.httpServerProxyConns.delete(srvReq); });
        srvReq.on('error', x => logger.error(x));
        resp.getStream(requestProps).pipe(srvReq);
      }
    } else {
      // main server processing
      
      if (!requestProps.otherServerOnline) {
        // if server is offline but a request is sent to it show an error message
        if (requestProps.otherServer) {
          await resp.s502_subsrv_offline(requestProps);
          return;
        }
        
        // follow redirects if request is not sent to a server
        let potentialRedirect = redirects.followRedirects(requestProps.url);
        
        if (potentialRedirect[0]) {
          await resp.headers(requestProps, potentialRedirect[1], { 'location': potentialRedirect[2] });
          await resp.end(requestProps);
          return;
        }
      }
      
      // run appropriate method handler function if request not sent to a server or the request is a http2 connect request that will be proxied to a server
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

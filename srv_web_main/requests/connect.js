var logger = require('../log_utils')('requests/connect');

var http = require('http');
var common = require('../common');

module.exports = async function connectMethod(requestProps) {
  // this is exclusively for http2
  if (requestProps.httpVersion == 1) return 1;
  
  let isOldServerHost = common.constVars.otherServerHosts.has(requestProps.host),
      oldServerURLStart = common.constVars.otherServerURLStarts.find(x => requestProps.url.pathname.startsWith(x));
  
  if (isOldServerHost || oldServerURLStart) {
    // old server proxying
    let sendURL = isOldServerHost ? requestProps.url.path : '/' + requestProps.url.path.slice(oldServerURLStart.length);
    let sendHeaders = {
      ...(':authority' in requestProps.headers ? { host: requestProps.headers[':authority'] } : null),
      ...Object.fromEntries(Object.entries(requestProps.headers).filter(x => !x[0].startsWith(':') && x[0].toLowerCase() != 'content-length')),
      'sec-websocket-key': 'aaaaaaaaaaaaaaaaaaaaaa==',
      'connection': 'keep-alive, Upgrade',
      ...(':protocol' in requestProps.headers ? { upgrade: requestProps.headers[':protocol'] } : null),
      'x-forwarded-for': requestProps.ip,
      'x-forwarded-proto': 'https',
    };
    let srvReq = http.request({
      host: isOldServerHost ? common.constVars.otherServerHostsMap.get(requestProps.host) : common.constVars.otherServerURLStartsMap.get(oldServerURLStart),
      port: 8080,
      method: requestProps.method,
      path: sendURL,
      headers: sendHeaders,
      setHost: false,
      timeout: 10000,
    }, async res => {
      await common.resp.headers(requestProps, res.statusCode, {
        ...Object.fromEntries(Object.entries(res.headers).filter(x => x[0].toLowerCase() != 'connection')),
      });
      await common.resp.stream(requestProps, res);
    });
    httpServerProxyConns.add(srvReq);
    srvReq.on('close', () => { httpServerProxyConns.delete(srvReq); });
    srvReq.on('error', x => logger.error(x));
    srvReq.on('upgrade', (res, srvSocket, srvHead) => {
      let stream = common.resp.getStream(requestProps);
      stream.write(srvHead);
      stream.pipe(srvSocket);
      srvSocket.pipe(stream);
    });
    srvReq.on('connect', (res, srvSocket, srvHead) => {
      let stream = common.resp.getStream(requestProps);
      stream.write(srvHead);
      stream.pipe(srvSocket);
      srvSocket.pipe(stream);
    });
  } else {
    // main server processing
    if (requestProps.headers[':protocol'] == 'websocket') {
      if (requestProps.url.pathname == '/echo_ws') {
        common.resp.ws(echoWSServer, requestProps);
      } else if (requestProps.url.pathname == '/chat/ws') {
        common.resp.ws(chatWSServer, requestProps);
      } else if (requestProps.url.pathname == '/api/status_ws') {
        common.resp.ws(statusWSServer, requestProps);
      } else {
        await common.resp.s404(requestProps);
      }
    } else {
      await common.resp.s404(requestProps);
    }
  }
};

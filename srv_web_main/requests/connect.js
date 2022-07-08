var logger = require('../log_utils')('requests/connect');

var http = require('http');
var common = require('../common');
var resp = require('../common/resp');
var commonVars = require('../common').vars;

module.exports = async function connectMethod(requestProps) {
  // this is exclusively for http2
  if (requestProps.httpVersion == 1) return 1;
  
  if (requestProps.otherServer) {
    // old server proxying
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
      host: requestProps.otherServer.host,
      port: requestProps.otherServer.host,
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
    srvReq.on('upgrade', (res, srvSocket, srvHead) => {
      let stream = resp.getStream(requestProps);
      stream.write(srvHead);
      stream.pipe(srvSocket);
      srvSocket.pipe(stream);
    });
    srvReq.on('connect', (res, srvSocket, srvHead) => {
      let stream = resp.getStream(requestProps);
      stream.write(srvHead);
      stream.pipe(srvSocket);
      srvSocket.pipe(stream);
    });
  } else {
    // main server processing
    if (requestProps.headers[':protocol'] == 'websocket') {
      if (requestProps.url.pathname == '/echo_ws') {
        resp.ws(commonVars.echoWSServer, requestProps);
      } else if (requestProps.url.pathname == '/chat/ws') {
        resp.ws(commonVars.chatWSServer, requestProps);
      } else if (requestProps.url.pathname == '/api/status_ws') {
        resp.ws(commonVars.statusWSServer, requestProps);
      } else {
        await resp.s404(requestProps);
      }
    } else {
      await resp.s404(requestProps);
    }
  }
};

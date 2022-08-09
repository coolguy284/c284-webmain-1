var logger = require('../log_utils')('requests/connect');

var http = require('http');
var resp = require('../common/resp');
var { vars: commonVars } = require('../common/vars');

module.exports = async function connectMethod(requestProps) {
  // this is exclusively for http2
  if (requestProps.httpVersion == 1) return 1;
  
  if (requestProps.otherServerOnline) {
    // old server proxying
    let sendHeaders = {
      ...(':authority' in requestProps.headers ? { host: requestProps.headers[':authority'] } : null),
      ...Object.fromEntries(Object.entries(requestProps.headers).filter(x => !x[0].startsWith(':') && x[0].toLowerCase() != 'content-length' && x[0].toLowerCase() != 'x-c284-nolog')),
      'sec-websocket-key': 'aaaaaaaaaaaaaaaaaaaaaa==',
      'connection': 'keep-alive, Upgrade',
      ...(':protocol' in requestProps.headers ? { upgrade: requestProps.headers[':protocol'] } : null),
      'x-forwarded-for': requestProps.otherServer.castIPv4to6 ? requestProps.ipv6Cast : requestProps.ip,
      'x-forwarded-proto': requestProps.otherServer.forwardSimpleProto ? (requestProps.proto == 'http' ? 'http' : 'https') : requestProps.proto,
      ...(requestProps.doLogNotPriv ? {} : { 'x-c284-nolog': '1' }),
    };
    let srvReq = http.request({
      host: requestProps.otherServer.host,
      port: requestProps.otherServer.port,
      method: 'get',
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
      let rawHeaderLines = [];
      for (var i = 0; i < res.rawHeaders.length / 2; i++)
        rawHeaderLines.push([res.rawHeaders[i * 2], res.rawHeaders[i * 2 + 1]]);
      let sendHeaders = Object.fromEntries(
        rawHeaderLines.filter(x => !resp._wsInvalidHttp2Headers.has(x[0].toLowerCase()))
      );
      requestProps.stream.respond({
        ':status': 200,
        ...sendHeaders,
      });
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
    srvReq.end();
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

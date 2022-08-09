var logger = require('../log_utils')('requests/connect_http1');

var http = require('http');
var { getReqLogStr } = require('../common/get_request_misc');
var getRequestProps = require('../common/get_request_props');
var resp = require('../common/resp');
var { constVars: { _otherServerInvalidHeaders }, vars: commonVars } = require('../common/vars');

module.exports = function serverConnectFunc(req, socket, head) {
  try {
    var requestProps = getRequestProps(1, req, null, 'connect');
    
    if (requestProps.doLog)
      logger.info(getReqLogStr(requestProps));
    
    if (requestProps.otherServerOnline) {
      // old server proxying
      let sendHeaders = {
        ...(':authority' in requestProps.headers ? { host: requestProps.headers[':authority'] } : null),
        ...Object.fromEntries(Object.entries(requestProps.headers).filter(x => !x[0].startsWith(':') && !_otherServerInvalidHeaders.has(x[0].toLowerCase()))),
        'x-forwarded-for': requestProps.otherServer.castIPv4to6 ? requestProps.ipv6Cast : requestProps.ip,
        'x-forwarded-proto': requestProps.otherServer.forwardSimpleProto ? (requestProps.proto == 'http' ? 'http' : 'https') : requestProps.proto,
        ...(requestProps.doLogNotPriv ? {} : { 'x-c284-nolog': '1' }),
      };
      let srvReq = http.request({
        host: requestProps.otherServer.host,
        port: requestProps.otherServer.port,
        method: requestProps.method,
        path: requestProps.otherServer.slicedPath,
        headers: sendHeaders,
        setHost: false,
        timeout: 10000,
      });
      commonVars.httpServerProxyConns.add(srvReq);
      srvReq.on('close', () => { commonVars.httpServerProxyConns.delete(srvReq); });
      srvReq.on('error', x => logger.error(x));
      srvReq.on('connect', (res, srvSocket, srvHead) => {
        srvSocket.write(head);
        socket.write(srvHead);
        socket.pipe(srvSocket);
        srvSocket.pipe(socket);
      });
      srvReq.end();
    } else {
      // main server processing
      resp.manual404(req, socket);
    }
  } catch (err) {
    logger.error(err);
  }
};

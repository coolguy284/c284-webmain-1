var logger = require('../log_utils')('requests/connect_http1');

var http = require('http');
var common = require('../common');

module.exports = function serverConnectFunc(req, socket, head) {
  try {
    var requestProps = common.getRequestProps(1, req, null, 'connect');
    
    logger.info(common.getReqLogStr(requestProps));
    
    let isOldServerHost = common.constVars.otherServerHosts.has(requestProps.host),
      oldServerURLStart = common.constVars.otherServerURLStarts.find(x => requestProps.url.pathname.startsWith(x));
    
    if (isOldServerHost || oldServerURLStart) {
      // old server proxying
      let sendURL = isOldServerHost ? requestProps.url.path : '/' + requestProps.url.path.slice(oldServerURLStart.length);
      let sendHeaders = {
        ...(':authority' in requestProps.headers ? { host: requestProps.headers[':authority'] } : null),
        ...Object.fromEntries(Object.entries(requestProps.headers).filter(x => !x[0].startsWith(':') && x[0].toLowerCase() != 'content-length')),
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
      });
      httpServerProxyConns.add(srvReq);
      srvReq.on('close', () => { httpServerProxyConns.delete(srvReq); });
      srvReq.on('error', x => logger.error(x));
      srvReq.on('connect', (res, srvSocket, srvHead) => {
        srvSocket.write(head);
        socket.write(srvHead);
        socket.pipe(srvSocket);
        srvSocket.pipe(socket);
      });
    } else {
      // main server processing
      common.resp.manual404(req, socket);
    }
  } catch (err) {
    logger.error(err);
  }
};

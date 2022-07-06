var logger = require('../log_utils')('requests/upgrade');

var http = require('http');
var common = require('../common');
var resp = require('../common/resp');
var commonVars = require('../common').vars;

module.exports = function serverUpgradeFunc(req, socket, head) {
  try {
    var requestProps = common.getRequestProps(1, req, null, 'upgrade');
    
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
      commonVars.httpServerProxyConns.add(srvReq);
      srvReq.on('close', () => { commonVars.httpServerProxyConns.delete(srvReq); });
      srvReq.on('error', x => logger.error(x));
      srvReq.on('upgrade', (res, srvSocket, srvHead) => {
        srvSocket.write(head);
        socket.write(srvHead);
        socket.pipe(srvSocket);
        srvSocket.pipe(socket);
      });
    } else {
      // main server processing
      if (requestProps.headers.upgrade.toLowerCase() == 'websocket') {
        if (requestProps.url.pathname == '/echo_ws') {
          resp.ws(commonVars.echoWSServer, requestProps, req, socket, head);
        } else if (requestProps.url.pathname == '/chat/ws') {
          resp.ws(commonVars.chatWSServer, requestProps, req, socket, head);
        } else if (requestProps.url.pathname == '/api/status_ws') {
          resp.ws(commonVars.statusWSServer, requestProps, req, socket, head);
        } else {
          resp.manual404(req, socket);
        }
      } else {
        resp.manual404(req, socket);
      }
    }
  } catch (err) {
    logger.error(err);
  }
};

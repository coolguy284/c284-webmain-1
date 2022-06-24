var logger = require('../log_utils.js')('requests/upgrade');

var common = require('../common');

module.exports = function serverUpgradeFunc(req, socket, head) {
  try {
    var requestProps = common.getRequestProps(1, req, null, 'upgrade');
    
    logger.info(common.getReqLogStr(requestProps));
    
    if (requestProps.host == 'old.coolguy284.com' || requestProps.url.pathname.startsWith('/old/')) {
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
      });
      httpServerProxyConns.add(srvReq);
      srvReq.on('close', () => { httpServerProxyConns.delete(srvReq); });
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
          common.resp.ws(echoWSServer, requestProps, req, socket, head);
        } else if (requestProps.url.pathname == '/chat/ws') {
          common.resp.ws(chatWSServer, requestProps, req, socket, head);
        } else if (requestProps.url.pathname == '/api/status_ws') {
          common.resp.ws(statusWSServer, requestProps, req, socket, head);
        } else {
          common.resp.manual404(req, socket);
        }
      } else {
        common.resp.manual404(req, socket);
      }
    }
  } catch (err) {
    logger.error(err);
  }
};

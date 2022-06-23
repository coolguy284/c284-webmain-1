var logger = require('../log_utils.js')('requests/connect_http1');

var common = require('../common');

module.exports = function serverConnectFunc(req, socket, head) {
  try {
    var requestProps = common.getRequestProps(1, req, null, 'connect');
    
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
      srvReq.on('error', logger.error);
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

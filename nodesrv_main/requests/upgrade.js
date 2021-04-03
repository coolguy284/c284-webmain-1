var logger = require('../logutils.js')('requests/upgrade');

var common = require('../common');

module.exports = function serverUpgradeFunc(req, socket, head) {
  try {
    var requestProps = common.getRequestProps(req, null, 'upgrade');
    
    logger.info(common.getReqLogStr(requestProps));
    
    if (requestProps.headers.upgrade.toLowerCase() == 'websocket') {
      if (requestProps.url.pathname == '/echows') {
        common.resp.ws(echoWSServer, req, socket, head, requestProps);
      } else {
        socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
        socket.end();
      }
    } else {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.end();
    }
  } catch (err) {
    logger.error(err);
  }
};

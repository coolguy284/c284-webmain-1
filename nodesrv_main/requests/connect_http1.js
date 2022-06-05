var logger = require('../log_utils.js')('requests/connect_http1');

var common = require('../common');

module.exports = function serverConnectFunc(req, socket, head) {
  try {
    var requestProps = common.getRequestProps(1, req, null, 'connect');
    
    logger.info(common.getReqLogStr(requestProps));
    
    socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
    socket.end();
  } catch (err) {
    logger.error(err);
  }
};

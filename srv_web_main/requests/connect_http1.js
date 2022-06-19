var logger = require('../log_utils.js')('requests/connect_http1');

var common = require('../common');

module.exports = function serverConnectFunc(req, socket, head) {
  try {
    var requestProps = common.getRequestProps(1, req, null, 'connect');
    
    logger.info(common.getReqLogStr(requestProps));
    
    common.resp.manual404(req, socket);
  } catch (err) {
    logger.error(err);
  }
};

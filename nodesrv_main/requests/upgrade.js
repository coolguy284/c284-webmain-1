var logger = require('../log_utils.js')('requests/upgrade');

var common = require('../common');

module.exports = function serverUpgradeFunc(req, socket, head) {
  try {
    var requestProps = common.getRequestProps(1, req, null, 'upgrade');
    
    logger.info(common.getReqLogStr(requestProps));
    
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
  } catch (err) {
    logger.error(err);
  }
};

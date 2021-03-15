var logger = require('../logutils.js')('requests/main');

var common = require('../common');

var methods = {
  //options: require('./options'),
  get: require('./get'),
  head: require('./head'),
  //post: require('./post'),
  //put: require('./put'),
  //patch: require('./patch'),
  //delete: require('./delete'),
};

module.exports = async function main(req, res) {
  try {
    var requestProps = common.getRequestProps(req, res, 'main');

    logger.info(common.getReqLogStr(requestProps));
    
    var method = req.method.toLowerCase();
    
    if (method in methods) {
      methods[method](requestProps);
    } else {
      res.writeHead(501);
      res.end();
    }
  } catch (err) {
    logger.error(err);
    try {
      await common.resp.s500(requestProps);
    } catch (err2) {
      logger.error(err2);
    }
  }
};

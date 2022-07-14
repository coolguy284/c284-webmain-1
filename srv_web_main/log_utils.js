var util = require('util');
var winston = require('winston');

var toBool = (str, defaultBool) => {
  if (str == null || str == '')
    return defaultBool ?? false;
  else
    return str == 'false' || str == '0' ? false : true;
};

module.exports = function createLoggerWrapper(name) {
  return winston.createLogger({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(info => `[${new Date().toISOString()}] [${name}] ${info.level}: ${info instanceof Error ? util.inspect(info) : typeof info.message == 'string' ? info.message : util.inspect(info.message)}`)
    ),
    transports: [new winston.transports.Console({ level: toBool(process.env.SRV_WEB_MAIN_LOG_DEBUG) ? 'debug' : 'info' })]
  });
};

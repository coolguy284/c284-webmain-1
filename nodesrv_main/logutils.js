var util = require('util');
var winston = require('winston');

module.exports = function createLoggerWrapper(name) {
  return winston.createLogger({
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.printf(info => `[${new Date().toISOString()}] [${name}] ${info.level}: ${typeof info.message == 'string' ? info.message : info.message instanceof Error ? info.message.stack : util.inspect(info.message)}`)
    ),
    transports: [new winston.transports.Console({ level: 'info' })]
  });
};

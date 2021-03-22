global.logger = require('./logutils.js')('main');

logger.info('Starting node-server');

var fs = require('fs');
var http = require('http');
var https = require('https');
var crypto = require('crypto');
var ws = require('ws');

var common = require('./common');


// initalize mongo client
var mongodb = require('mongodb');

global.mongoServer = mongodb.MongoClient('mongodb://localhost', { useUnifiedTopology: true });


// servers
global.currentRequestID = 0;

if (process.env.NODESRVMAIN_HTTP_IP) {
  global.httpServer = http.createServer(require('./requests/main'));
  httpServer.on('upgrade', require('./requests/upgrade'));
  
  httpServer.listen(process.env.NODESRVMAIN_HTTP_PORT, process.env.NODESRVMAIN_HTTP_IP, () => {
    logger.info(`HTTP server listening on ${process.env.NODESRVMAIN_HTTP_IP}:${process.env.NODESRVMAIN_HTTP_PORT}`);
  });
}

if (process.env.NODESRVMAIN_HTTPS_IP) {
  global.httpsServer = https.createServer({
    secureOptions: crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1,
    key: fs.readFileSync(process.env.NODESRVMAIN_TLS_KEY_FILE),
    cert: fs.readFileSync(process.env.NODESRVMAIN_TLS_CERT_FILE),
  }, require('./requests/main'));
  httpsServer.on('upgrade', require('./requests/upgrade'));
  
  httpsServer.listen(process.env.NODESRVMAIN_HTTPS_PORT, process.env.NODESRVMAIN_HTTPS_IP, () => {
    logger.info(`HTTPS server listening on ${process.env.NODESRVMAIN_HTTPS_IP}:${process.env.NODESRVMAIN_HTTPS_PORT}`);
  });
}

if (process.env.NODESRVMAIN_HTTP_IP || process.env.NODESRVMAIN_HTTPS_IP) {
  global.echoWSServer = new ws.Server({ noServer: true, maxPayload: 2 ** 20 });
  echoWSServer.on('connection', function echoWSFunc(ws, req, requestProps) {
    ws.on('message', msg => ws.send(msg));
  });
}


// responding to pings from main process
process.on('message', msg => {
  switch (msg.type) {
    case 'ping':
      process.send({ type: 'pong' });
      break;
  }
});


// so server doesnt go down for an error
process.on('uncaughtException', err => {
  logger.error('UncaughtException');
  logger.error(err);
});

process.on('unhandledRejection', err => {
  logger.error('UnhandledRejection');
  logger.error(err);
});


// simple repl for executing
require('repl').start({
  prompt: '',
  terminal: true,
  useColors: true,
  useGlobal: true,
  preview: false,
  breakEvalOnSigint: true,
});

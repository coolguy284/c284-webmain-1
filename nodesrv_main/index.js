global.logger = require('./logutils.js')('main');

logger.info('Starting c284-webmain-1/nodesrv_main');

var fs = require('fs');
var net = require('net');
var tls = require('tls');
var http = require('http');
var https = require('https');
var http2 = require('http2');
var crypto = require('crypto');
var ws = require('ws');

var common = require('./common');


// initalize mongo client
var mongodb = require('mongodb');

global.mongoServer = mongodb.MongoClient('mongodb://localhost', { useUnifiedTopology: true });


// servers
global.currentRequestID = 0;

if (process.env.NODESRVMAIN_HTTP_IP) {
  global.tcpServer = net.createServer(conn => {
    if (process.env.NODESRVMAIN_LOG_DEBUG == 'true') {
      logger.debug(`TCP open ${conn.remoteAddress}:${conn.remotePort}`);
      conn.on('close', hadError => logger.debug(`TCP close ${conn.remoteAddress}:${conn.remotePort} ${hadError ? 'error' : 'normal'}`));
    }
    
    httpServer.emit('connection', conn);
  });
  
  
  tcpServer.listen({ host: process.env.NODESRVMAIN_HTTP_IP, port: process.env.NODESRVMAIN_HTTP_PORT }, () => {
    logger.info(`HTTP server listening on ${common.mergeIPPort(process.env.NODESRVMAIN_HTTP_IP, process.env.NODESRVMAIN_HTTP_PORT)}`);
  });
  
  global.httpServer = http.createServer(require('./requests/main'));
  httpServer.on('upgrade', require('./requests/upgrade'));
}

if (process.env.NODESRVMAIN_HTTPS_IP) {
  global.tlsServer = tls.createServer({
    secureOptions: crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1,
    key: fs.readFileSync(process.env.NODESRVMAIN_TLS_KEY_FILE),
    cert: fs.readFileSync(process.env.NODESRVMAIN_TLS_CERT_FILE),
    
    ALPNProtocols: ['h2', 'http/1.1'],
  }, conn => {
    if (process.env.NODESRVMAIN_LOG_DEBUG == 'true') {
      logger.debug(`TLS open ${conn.remoteAddress}:${conn.remotePort} ${conn.servername} ${conn.alpnProtocol} ${conn.authorized}`);
      conn.on('close', hadError => logger.debug(`TLS close ${conn.remoteAddress}:${conn.remotePort} ${hadError ? 'error' : 'normal'}`));
    }
    
    if (conn.alpnProtocol == false || conn.alpnProtocol == 'http/1.1')
      httpsServer.emit('secureConnection', conn);
    else if (conn.alpnProtocol == 'h2')
      http2Server.emit('secureConnection', conn);
  });
  
  tlsServer.listen({ host: process.env.NODESRVMAIN_HTTPS_IP, port: process.env.NODESRVMAIN_HTTPS_PORT }, () => {
    logger.info(`HTTPS/H2 server listening on ${common.mergeIPPort(process.env.NODESRVMAIN_HTTPS_IP, process.env.NODESRVMAIN_HTTPS_PORT)}`);
  });
  
  global.httpsServer = https.createServer(require('./requests/main'));
  httpsServer.on('upgrade', require('./requests/upgrade'));
  
  global.http2Server = http2.createSecureServer({ settings: { enableConnectProtocol: true } });
  http2Server.on('stream', require('./requests/main'));
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

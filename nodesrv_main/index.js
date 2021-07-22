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


if (!process.env.DISABLE_MONGODB || process.env.DISABLE_MONGODB == 'false') {
  (async () => {
    // initalize mongo client
    var mongodb = require('mongodb');

    global.mongoClient = mongodb.MongoClient('mongodb://127.0.0.1', { useUnifiedTopology: true });
    
    await mongoClient.connect();
    logger.info('Connected to mongodb server');
    
    try {
      await mongoClient.db().admin().command({ replSetGetStatus: {} });
      logger.info('Replica set already created');
    } catch (e) {
      await mongoClient.db().admin().command({ replSetInitiate: {} });
      logger.info('Initialized replica set');
    }
    
    require('./requests/chatws').mongoClientOnConnect();
  })();
}


// servers
global.currentRequestID = 0;

if (process.env.NODESRVMAIN_HTTP_IP) {
  global.tcpServer = net.createServer(conn => {
    if (process.env.NODESRVMAIN_LOG_DEBUG == 'true') {
      logger.debug(`TCP open ${common.mergeIPPort(conn.remoteAddress, conn.remotePort)}`);
      conn.on('close', hadError => logger.debug(`TCP close ${common.mergeIPPort(conn.remoteAddress, conn.remotePort)} ${hadError ? 'error' : 'normal'}`));
    }
    
    conn.setNoDelay(true);
    
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
    //ciphers: crypto.constants.defaultCoreCipherList + ':!TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256:!TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384:!TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:!TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:!TLS_RSA_WITH_AES_256_GCM_SHA384:!TLS_RSA_WITH_AES_256_CCM_8:!TLS_RSA_WITH_AES_256_CCM:!TLS_RSA_WITH_ARIA_256_GCM_SHA384:!TLS_RSA_WITH_AES_128_GCM_SHA256:!TLS_RSA_WITH_AES_128_CCM_8:!TLS_RSA_WITH_AES_128_CCM:!TLS_RSA_WITH_ARIA_128_GCM_SHA256:!TLS_RSA_WITH_AES_256_CBC_SHA256:!TLS_RSA_WITH_AES_128_CBC_SHA256:!TLS_RSA_WITH_AES_256_CBC_SHA:!TLS_RSA_WITH_AES_128_CBC_SHA:@STRENGTH',
    ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_ARIA_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_ARIA_128_GCM_SHA256:@STRENGTH',
    key: fs.readFileSync(process.env.NODESRVMAIN_TLS_KEY_FILE),
    cert: fs.readFileSync(process.env.NODESRVMAIN_TLS_CERT_FILE),
    
    ALPNProtocols: ['h2', 'http/1.1'],
  }, conn => {
    if (process.env.NODESRVMAIN_LOG_DEBUG == 'true') {
      logger.debug(`TLS open ${common.mergeIPPort(conn.remoteAddress, conn.remotePort)} ${conn.servername} ${conn.alpnProtocol} ${conn.authorized}`);
      conn.on('close', hadError => logger.debug(`TLS close ${common.mergeIPPort(conn.remoteAddress, conn.remotePort)} ${hadError ? 'error' : 'normal'}`));
    }
    
    conn.setNoDelay(true);
    
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
  
  global.chatWSServer = new ws.Server({ noServer: true, maxPayload: 8 * 2 ** 20 });
  chatWSServer.on('connection', require('./requests/chatws').chatWSFunc);
  global.chatWSServerMap = new WeakMap();
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


// server tick function
global.ticks = 0;
global.tickFunc = () => {
  let limitTime = Date.now() - 5000;
  for (var i of common.vars.ownEyesCodes.keys()) {
    if (common.vars.ownEyesCodes.get(i) < limitTime)
      common.vars.ownEyesCodes.delete(i);
  }
  
  if (Number(process.env.NODESRVMAIN_CHAT_IDLE_TIMEOUT) && ticks % Number(process.env.NODESRVMAIN_CHAT_IDLE_TIMEOUT) == 0) {
    for (var ws2 of chatWSServer.clients) {
      if (ws2.isAlive === false) return ws2.terminate();
      
      ws2.isAlive = false;
      ws2.ping();
    }
  }
  
  global.ticks++;
};
global.tickInt = setInterval(tickFunc, 1000);


// website cache
if (process.env.NODESRVMAIN_CACHE_MODE == '1') {
  global.filesCache = {};
  require('./common/recursivereaddir')('websites/public').forEach(filename => {
    filename = 'websites/public/' + filename;
    global.filesCache[filename] = {
      stats: { mtime: fs.statSync(filename).mtime },
      file: fs.readFileSync(filename),
    };
  });
}


// simple repl for executing commands
require('repl').start({
  prompt: '',
  terminal: true,
  useColors: true,
  useGlobal: true,
  preview: false,
  breakEvalOnSigint: true,
});

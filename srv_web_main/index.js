global.logger = require('./log_utils.js')('main');

logger.info('Starting c284-webmain-1/srv_web_main');

var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var https = require('https');
var http2 = require('http2');
var net = require('net');
var tls = require('tls');
var ws = require('ws');

var common = require('./common');


if (!process.env.PROC_MONGODB_DISABLED || process.env.PROC_MONGODB_DISABLED == 'false') {
  (async () => {
    // start reverse proxy
    global.mongoProxyServer = net.createServer(conn => {
      if (conn.remoteAddress != '::ffff:127.0.0.1') {
        logger.debug(`Mongodb proxy connection invalid, ${conn.remoteAddress}:${conn.remotePort} is not permitted to connect to the proxy`);
        conn.destroy();
        return;
      }
      logger.debug(`Mongodb proxy new connection from localhost:${conn.remotePort}`);
      var proxyConn = net.connect(27016, 'proc_mongodb');
      conn.pipe(proxyConn);
      proxyConn.pipe(conn);
      conn.on('error', err => logger.error(`localhost:${conn.remotePort} conn ` + err));
      proxyConn.on('error', err => logger.error(`localhost:${conn.remotePort} proxyConn ` + err));
      conn.on('close', hadError => logger.debug(`Mongodb proxy connection from localhost:${conn.remotePort} closed ${hadError ? 'with' : 'without'} error`));
    });
    mongoProxyServer.on('error', err => logger.error('Proxy ' + err.toString()));

    mongoProxyServer.listen(27017, () => logger.info('Mongodb proxy server listening'));
    
    // initalize mongo client
    var mongodb = require('mongodb');
    
    global.mongoClient = new mongodb.MongoClient('mongodb://127.0.0.1', { useUnifiedTopology: true });
    
    await new Promise(r => setTimeout(r, 3000));
    await mongoClient.connect();
    logger.info('Connected to mongodb server');
    
    try {
      await mongoClient.db().admin().command({ replSetGetStatus: {} });
      logger.info('Replica set already created');
    } catch (e) {
      await mongoClient.db().admin().command({ replSetInitiate: {} });
      logger.info('Initialized replica set');
    }
    
    require('./requests/chat_ws').mongoClientOnConnect();
  })();
}


// servers
global.currentRequestID = 0;

if (process.env.SRV_WEB_MAIN_HTTP_IP) {
  global.tcpServer = net.createServer(conn => {
    if (conn.destroyed) {
      if (process.env.SRV_WEB_MAIN_LOG_DEBUG == 'true')
        logger.debug(`TCP open-instaclose ${conn.remoteAddress}, ${conn.remotePort}`);
      return;
    }
    
    if (process.env.SRV_WEB_MAIN_LOG_DEBUG == 'true') {
      logger.debug(`TCP open ${common.mergeIPPort(conn.remoteAddress, conn.remotePort)}`);
      conn.on('close', hadError => logger.debug(`TCP close ${common.mergeIPPort(conn.remoteAddress, conn.remotePort)} ${hadError ? 'error' : 'normal'}`));
    }
    
    conn.setNoDelay(true);
    
    httpServer.emit('connection', conn);
  });
  
  tcpServer.listen({ host: process.env.SRV_WEB_MAIN_HTTP_IP, port: process.env.SRV_WEB_MAIN_HTTP_PORT }, () => {
    logger.info(`HTTP server listening on ${common.mergeIPPort(process.env.SRV_WEB_MAIN_HTTP_IP, process.env.SRV_WEB_MAIN_HTTP_PORT)}`);
  });
  
  global.httpServer = http.createServer(require('./requests/main').bind(null, 1));
  httpServer.on('upgrade', require('./requests/upgrade'));
  httpServer.on('connect', require('./requests/connect_http1'));
}

if (process.env.SRV_WEB_MAIN_HTTPS_IP) {
  global.tlsServer = tls.createServer({
    secureOptions: crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1,
    //ciphers: crypto.constants.defaultCoreCipherList + ':!TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256:!TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384:!TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:!TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:!TLS_RSA_WITH_AES_256_GCM_SHA384:!TLS_RSA_WITH_AES_256_CCM_8:!TLS_RSA_WITH_AES_256_CCM:!TLS_RSA_WITH_ARIA_256_GCM_SHA384:!TLS_RSA_WITH_AES_128_GCM_SHA256:!TLS_RSA_WITH_AES_128_CCM_8:!TLS_RSA_WITH_AES_128_CCM:!TLS_RSA_WITH_ARIA_128_GCM_SHA256:!TLS_RSA_WITH_AES_256_CBC_SHA256:!TLS_RSA_WITH_AES_128_CBC_SHA256:!TLS_RSA_WITH_AES_256_CBC_SHA:!TLS_RSA_WITH_AES_128_CBC_SHA:@STRENGTH',
    ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_ARIA_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_ARIA_128_GCM_SHA256:@STRENGTH',
    key: fs.readFileSync(process.env.SRV_WEB_MAIN_TLS_KEY_FILE),
    cert: fs.readFileSync(process.env.SRV_WEB_MAIN_TLS_CERT_FILE) + fs.readFileSync(process.env.SRV_WEB_MAIN_TLS_CERT_ROOT_FILE),
    
    ALPNProtocols: ['h2', 'http/1.1'],
  }, conn => {
    if (conn.destroyed) {
      if (process.env.SRV_WEB_MAIN_LOG_DEBUG == 'true')
        logger.debug(`TLS open-instaclose ${conn.remoteAddress}, ${conn.remotePort}`);
      return;
    }
    
    if (process.env.SRV_WEB_MAIN_LOG_DEBUG == 'true') {
      logger.debug(`TLS open ${common.mergeIPPort(conn.remoteAddress, conn.remotePort)} ${conn.servername} ${conn.alpnProtocol} ${conn.authorized}`);
      conn.on('close', hadError => logger.debug(`TLS close ${common.mergeIPPort(conn.remoteAddress, conn.remotePort)} ${hadError ? 'error' : 'normal'}`));
    }
    
    conn.setNoDelay(true);
    
    if (conn.alpnProtocol == false || conn.alpnProtocol == 'http/1.1')
      httpsServer.emit('secureConnection', conn);
    else if (conn.alpnProtocol == 'h2')
      http2Server.emit('secureConnection', conn);
  });
  
  global.tlsSessionStore = new Map();
  
  tlsServer.on('newSession', (id, data, cb) => {
    tlsSessionStore.set(id.toString('base64'), [data, Date.now()]);
    cb();
  });
  
  tlsServer.on('resumeSession', (id, cb) => {
    cb(null, tlsSessionStore.get(id.toString('base64'))?.[0] || null);
  });
  
  tlsServer.listen({ host: process.env.SRV_WEB_MAIN_HTTPS_IP, port: process.env.SRV_WEB_MAIN_HTTPS_PORT }, () => {
    logger.info(`HTTPS/H2 server listening on ${common.mergeIPPort(process.env.SRV_WEB_MAIN_HTTPS_IP, process.env.SRV_WEB_MAIN_HTTPS_PORT)}`);
  });
  
  global.httpsServer = https.createServer(require('./requests/main').bind(null, 1));
  httpsServer.on('upgrade', require('./requests/upgrade'));
  httpsServer.on('connect', require('./requests/connect_http1'));
  
  global.http2Server = http2.createSecureServer({ settings: { enableConnectProtocol: true } });
  global.http2ServerSessions = new Set();
  global.http2ServerStreams = new Set();
  http2Server.on('session', session => {
    http2ServerSessions.add(session);
    session.on('stream', stream => {
      http2ServerStreams.add(stream);
      stream.on('close', () => { http2ServerStreams.delete(stream); });
    });
    session.on('close', () => { http2ServerSessions.delete(session); });
  });
  http2Server.on('stream', require('./requests/main').bind(null, 2));
}

if (process.env.SRV_WEB_MAIN_HTTP_IP || process.env.SRV_WEB_MAIN_HTTPS_IP) {
  global.echoWSServer = new ws.Server({ noServer: true, maxPayload: 2 ** 20 });
  echoWSServer.on('connection', function echoWSFunc(ws, req, requestProps) {
    ws.on('message', msg => ws.send(msg));
  });
  
  global.chatWSServer = new ws.Server({ noServer: true, maxPayload: 8 * 2 ** 20 });
  chatWSServer.on('connection', require('./requests/chat_ws').chatWSFunc);
  global.chatWSServerMap = new WeakMap();
  
  global.statusWSServer = new ws.Server({ noServer: true, maxPayload: 2 ** 20 });
  statusWSServer.on('connection', require('./requests/status_ws').statusWSFunc);
}


// responding to pings from main process
process.on('message', msg => {
  switch (msg.type) {
    case 'ping':
      process.send({ type: 'pong' });
      break;
  }
});


// website cache
if (process.env.SRV_WEB_MAIN_CACHE_MODE == '1') {
  global.filesCache = {};
  require('./common/recursive_readdir')('websites/public').forEach(filename => {
    filename = 'websites/public/' + filename;
    global.filesCache[filename] = {
      stats: { mtime: fs.statSync(filename).mtime },
      file: fs.readFileSync(filename),
    };
  });
}


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
global.tickIntMS = Number(process.env.SRV_WEB_MAIN_TICK_INTERVAL) || 5000;
global.ticks = 0;
global.tickFunc = () => {
  // for removing old cached TLS sessions
  let tlsSessionLimitTime = Date.now() - 300000;
  if (process.env.SRV_WEB_MAIN_HTTPS_IP && ticks % (300000 / tickIntMS)) {
    for (var i of tlsSessionStore.keys()) {
      if (tlsSessionStore.get(i)[1] < tlsSessionLimitTime)
        tlsSessionStore.delete(i);
    }
  }
  
  // for removing old ownEyes tokens
  let ownEyesLimitTime = Date.now() - 5000;
  for (var i of common.vars.ownEyesCodes.keys()) {
    if (common.vars.ownEyesCodes.get(i) < ownEyesLimitTime)
      common.vars.ownEyesCodes.delete(i);
  }
  
  // for disconnecting chat members more quickly if their internet has cut out
  let chatIdleTimeout = Number(process.env.SRV_WEB_MAIN_CHAT_IDLE_TIMEOUT);
  if (chatIdleTimeout && ticks % chatIdleTimeout == 0) {
    for (var ws2 of chatWSServer.clients) {
      if (ws2.isAlive === false) return ws2.terminate();
      
      ws2.isAlive = false;
      ws2.ping();
    }
  }
  
  global.ticks++;
};
global.tickInt = setInterval(tickFunc, tickIntMS);

// handle a shutdown signal
async function exitHandler() {
  logger.info('Shutting down');
  
  if (global.replServer) replServer.close();
  
  if (global.tcpServer) {
    tcpServer.close(() => {
      logger.info('HTTP server closed');
    });
    httpServer.close();
    setTimeout(() => {
      logger.info('Forcibly closing all HTTP connections');
      httpServer.closeAllConnections();
    }, 10000).unref();
  }
  
  if (global.tlsServer) {
    tlsServer.close(() => {
      logger.info('HTTPS/H2 server closed');
    });
    httpsServer.close();
    http2Server.close();
    for (var session of http2ServerSessions) { session.close(); }
    setTimeout(() => {
      logger.info('Forcibly closing all HTTPS/H2 connections');
      httpsServer.closeAllConnections();
      for (var stream of http2ServerStreams) { stream.close(); }
    }, 10000).unref();
  }
  
  if (global.tcpServer || global.tlsServer) {
    echoWSServer.close();
    chatWSServer.close();
    statusWSServer.close();
  }
  
  process.removeAllListeners('message');
  
  clearInterval(tickInt);
  
  if (global.mongoClient) {
    require('./requests/chat_ws').mongoClientOnClose();
    await mongoClient.close();
    mongoProxyServer.close();
  }
  
  setTimeout(() => {
    logger.info('Forcibly shutting down');
    process.exit();
  }, 20000).unref();
}

process.on('SIGINT', exitHandler);


// simple repl for executing commands
global.replServer = require('repl').start({
  prompt: '',
  terminal: false,
  useColors: true,
  useGlobal: true,
  preview: false,
  breakEvalOnSigint: false,
});

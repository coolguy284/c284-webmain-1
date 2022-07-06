var logger = require('./log_utils')('main');

logger.info('Starting c284-webmain-1/srv_web_main');

var crypto = require('crypto');
var fs = require('fs');
var http = require('http');
var https = require('https');
var http2 = require('http2');
var net = require('net');
var repl = require('repl');
var tls = require('tls');
var util = require('util');
var ws = require('ws');

var common = require('./common');


if (!process.env.PROC_MONGODB_DISABLED || process.env.PROC_MONGODB_DISABLED == 'false') {
  (async () => {
    // start reverse proxy
    common.vars.mongoProxyServer = net.createServer(conn => {
      if (conn.remoteAddress != '::ffff:127.0.0.1') {
        logger.debug(`Mongodb proxy connection invalid, ${conn.remoteAddress}:${conn.remotePort} is not permitted to connect to the proxy`);
        conn.destroy();
        return;
      }
      common.vars.mongoProxyServerConns.add(conn);
      logger.debug(`Mongodb proxy new connection from localhost:${conn.remotePort}`);
      var proxyConn = net.connect(27016, 'proc_mongodb');
      common.vars.mongoProxyServerConns.add(proxyConn);
      conn.pipe(proxyConn);
      proxyConn.pipe(conn);
      conn.on('error', err => logger.error(`localhost:${conn.remotePort} conn ` + err));
      proxyConn.on('error', err => logger.error(`localhost:${conn.remotePort} proxyConn ` + err));
      conn.on('close', hadError => {
        common.vars.mongoProxyServerConns.delete(conn);
        common.vars.mongoProxyServerConns.delete(proxyConn);
        logger.debug(`Mongodb proxy connection from localhost:${conn.remotePort} closed ${hadError ? 'with' : 'without'} error`);
      });
    });
    common.vars.mongoProxyServerConns = new Set();
    common.vars.mongoProxyServer.on('error', err => logger.error('Proxy ' + err.toString()));

    common.vars.mongoProxyServer.listen(27017, () => logger.info('Mongodb proxy server listening'));
    
    // initalize mongo client
    var mongodb = require('mongodb');
    
    common.vars.mongoClient = new mongodb.MongoClient('mongodb://127.0.0.1', { useUnifiedTopology: true });
    
    await new Promise(r => setTimeout(r, 3000));
    await common.vars.mongoClient.connect();
    logger.info('Connected to mongodb server');
    
    try {
      await common.vars.mongoClient.db().admin().command({ replSetGetStatus: {} });
      logger.info('Replica set already created');
    } catch (e) {
      await common.vars.mongoClient.db().admin().command({ replSetInitiate: {} });
      logger.info('Initialized replica set');
    }
    
    require('./requests/chat_ws').mongoClientOnConnect();
  })();
}


// servers
if (process.env.SRV_WEB_MAIN_HTTP_IP) {
  common.vars.tcpServer = net.createServer(conn => {
    if (conn.destroyed) {
      if (process.env.SRV_WEB_MAIN_LOG_DEBUG == 'true')
        logger.debug(`TCP open-instaclose ${conn.remoteAddress}, ${conn.remotePort}`);
      return;
    }
    
    if (process.env.SRV_WEB_MAIN_LOG_DEBUG == 'true') {
      logger.debug(`TCP open ${common.mergeIPPort(conn.remoteAddress, conn.remotePort)}`);
      conn.on('close', hadError => {
        logger.debug(`TCP close ${common.mergeIPPort(conn.remoteAddress, conn.remotePort)} ${hadError ? 'error' : 'normal'}`);
      });
    }
    
    conn.setNoDelay(true);
    
    common.vars.httpServer.emit('connection', conn);
  });
  
  common.vars.tcpServer.listen({ host: process.env.SRV_WEB_MAIN_HTTP_IP, port: process.env.SRV_WEB_MAIN_HTTP_PORT }, () => {
    logger.info(`HTTP server listening on ${common.mergeIPPort(process.env.SRV_WEB_MAIN_HTTP_IP, process.env.SRV_WEB_MAIN_HTTP_PORT)}`);
  });
  
  common.vars.httpServer = http.createServer(require('./requests/main').bind(null, 1));
  common.vars.httpServerConns = new Set();
  common.vars.httpServer.on('connection', socket => {
    common.vars.httpServerConns.add(socket);
    socket.on('close', () => { common.vars.httpServerConns.delete(socket); });
  });
  common.vars.httpServer.on('upgrade', require('./requests/upgrade'));
  common.vars.httpServer.on('connect', require('./requests/connect_http1'));
}

if (process.env.SRV_WEB_MAIN_HTTPS_IP) {
  common.vars.tlsServer = tls.createServer({
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
      conn.on('close', hadError => {
        logger.debug(`TLS close ${common.mergeIPPort(conn.remoteAddress, conn.remotePort)} ${hadError ? 'error' : 'normal'}`);
      });
    }
    
    conn.setNoDelay(true);
    
    if (conn.alpnProtocol == false || conn.alpnProtocol == 'http/1.1')
      common.vars.httpsServer.emit('secureConnection', conn);
    else if (conn.alpnProtocol == 'h2')
      common.vars.http2Server.emit('secureConnection', conn);
  });
  
  common.vars.tlsSessionStore = new Map();
  
  common.vars.tlsServer.on('newSession', (id, data, cb) => {
    common.vars.tlsSessionStore.set(id.toString('base64'), [data, Date.now()]);
    cb();
  });
  
  common.vars.tlsServer.on('resumeSession', (id, cb) => {
    cb(null, common.vars.tlsSessionStore.get(id.toString('base64'))?.[0] || null);
  });
  
  common.vars.tlsServer.listen({ host: process.env.SRV_WEB_MAIN_HTTPS_IP, port: process.env.SRV_WEB_MAIN_HTTPS_PORT }, () => {
    logger.info(`HTTPS/H2 server listening on ${common.mergeIPPort(process.env.SRV_WEB_MAIN_HTTPS_IP, process.env.SRV_WEB_MAIN_HTTPS_PORT)}`);
  });
  
  common.vars.httpsServer = https.createServer(require('./requests/main').bind(null, 1));
  common.vars.httpsServerConns = new Set();
  common.vars.httpsServer.on('secureConnection', socket => {
    common.vars.httpsServerConns.add(socket);
    socket.on('close', () => { common.vars.httpsServerConns.delete(socket); });
  });
  common.vars.httpsServer.on('upgrade', require('./requests/upgrade'));
  common.vars.httpsServer.on('connect', require('./requests/connect_http1'));
  
  common.vars.http2Server = http2.createSecureServer({ settings: { enableConnectProtocol: true } });
  common.vars.http2ServerSessions = new Set();
  common.vars.http2ServerStreams = new Set();
  common.vars.http2Server.on('session', session => {
    common.vars.http2ServerSessions.add(session);
    session.on('stream', stream => {
      common.vars.http2ServerStreams.add(stream);
      stream.on('close', () => { common.vars.http2ServerStreams.delete(stream); });
    });
    session.on('close', () => { common.vars.http2ServerSessions.delete(session); });
  });
  common.vars.http2Server.on('stream', require('./requests/main').bind(null, 2));
}

if (process.env.SRV_WEB_MAIN_HTTP_IP || process.env.SRV_WEB_MAIN_HTTPS_IP) {
  common.vars.httpServerProxyConns = new Set();
  
  common.vars.echoWSServer = new ws.Server({ noServer: true, clientTracking: true, maxPayload: 2 ** 20 });
  common.vars.echoWSServer.on('connection', function echoWSFunc(ws, req, requestProps) {
    ws.on('message', msg => ws.send(msg));
  });
  
  common.vars.chatWSServer = new ws.Server({ noServer: true, clientTracking: true, maxPayload: 8 * 2 ** 20 });
  common.vars.chatWSServer.on('connection', require('./requests/chat_ws').chatWSFunc);
  common.vars.chatWSServerMap = new WeakMap();
  
  common.vars.statusWSServer = new ws.Server({ noServer: true, clientTracking: true, maxPayload: 2 ** 20 });
  common.vars.statusWSServer.on('connection', require('./requests/status_ws').statusWSFunc);
}


// website cache
if (process.env.SRV_WEB_MAIN_CACHE_MODE == '1') {
  common.vars.filesCache = {};
  require('./common/recursive_readdir')('websites/public').forEach(filename => {
    filename = 'websites/public/' + filename;
    common.vars.filesCache[filename] = {
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
common.vars.tickIntMs = Number(process.env.SRV_WEB_MAIN_TICK_INTERVAL) || 5000;
common.vars.ticks = 0;
common.vars.tickFunc = () => {
  var i;
  
  // for removing old cached TLS sessions
  let tlsSessionLimitTime = Date.now() - 300000;
  if (process.env.SRV_WEB_MAIN_HTTPS_IP && common.vars.ticks % (300000 / common.vars.tickIntMs)) {
    for (i of common.vars.tlsSessionStore.keys()) {
      if (common.vars.tlsSessionStore.get(i)[1] < tlsSessionLimitTime)
      common.vars.tlsSessionStore.delete(i);
    }
  }
  
  // for removing old ownEyes tokens
  let ownEyesLimitTime = Date.now() - 5000;
  for (i of common.vars.ownEyesCodes.keys()) {
    if (common.vars.ownEyesCodes.get(i) < ownEyesLimitTime)
      common.vars.ownEyesCodes.delete(i);
  }
  
  // for disconnecting chat members more quickly if their internet has cut out
  let chatIdleTimeout = Number(process.env.SRV_WEB_MAIN_CHAT_IDLE_TIMEOUT);
  if (chatIdleTimeout && common.vars.ticks % chatIdleTimeout == 0) {
    for (var ws2 of common.vars.chatWSServer.clients) {
      if (ws2.isAlive === false) return ws2.terminate();
      
      ws2.isAlive = false;
      ws2.ping();
    }
  }
  
  common.vars.ticks++;
};
common.vars.tickInt = setInterval(common.vars.tickFunc, common.vars.tickIntMs);

// handle a shutdown signal
common.vars.exitHandlerCalled = false;

async function exitHandler() {
  if (common.vars.exitHandlerCalled) return;
  common.vars.exitHandlerCalled = true;
  
  logger.info('Shutting down');
  
  if (common.vars.replServer) common.vars.replServer.close();
  
  if (common.vars.tcpServer) {
    common.vars.tcpServer.close(() => {
      logger.info('HTTP server closed');
    });
    common.vars.httpServer.close();
    setTimeout(() => {
      if (!common.vars.httpServerConns.size) return;
      logger.warn('Forcibly closing all HTTP connections');
      common.vars.httpServer.closeAllConnections();
      for (var socket of common.vars.httpServerConns) socket.destroy();
    }, 10000).unref();
  }
  
  if (common.vars.tlsServer) {
    common.vars.tlsServer.close(() => {
      logger.info('HTTPS/H2 server closed');
    });
    common.vars.httpsServer.close();
    common.vars.http2Server.close();
    for (var session of common.vars.http2ServerSessions) session.close();
    setTimeout(() => {
      if (!common.vars.httpsServerConns.size && !common.vars.http2ServerStreams.size) return;
      logger.warn('Forcibly closing all HTTPS/H2 connections');
      if (common.vars.httpsServerConns.size) {
        common.vars.httpsServer.closeAllConnections();
        for (var socket of common.vars.httpsServerConns) socket.destroy();
      }
      if (common.vars.http2ServerStreams.size) {
        for (var stream of common.vars.http2ServerStreams) stream.close();
      }
    }, 10000).unref();
  }
  
  if (common.vars.tcpServer || common.vars.tlsServer) {
    common.vars.echoWSServer.close();
    common.vars.chatWSServer.close();
    common.vars.statusWSServer.close();
    
    setTimeout(() => {
      if (!common.vars.echoWSServer.clients.size && !common.vars.chatWSServer.clients.size && !common.vars.statusWSServer.clients.size) return;
      logger.warn('Forcibly closing all WebSocket connections');
      var ws;
      if (common.vars.echoWSServer.clients.size) {
        for (ws of common.vars.echoWSServer.clients) ws.close();
      }
      if (common.vars.chatWSServer.clients.size) {
        for (ws of common.vars.chatWSServer.clients) ws.close();
      }
      if (common.vars.statusWSServer.clients.size) {
        for (ws of common.vars.statusWSServer.clients) ws.close();
      }
    }, 8000).unref();
    
    setTimeout(() => {
      if (!common.vars.httpServerProxyConns.size) return;
      logger.warn('Forcibly closing all http server proxy connections');
      for (var httpReq of common.vars.httpServerProxyConns) httpReq.destroy();
    }, 8000).unref();
  }
  
  try { clearInterval(common.vars.tickInt); } catch (e) { logger.error(e); }
  
  if (common.vars.mongoClient) {
    try { require('./requests/chat_ws').mongoClientOnClose(); } catch (e) { logger.error(e); }
    try { await common.vars.mongoClient.close(); } catch (e) { logger.error(e); }
    try { common.vars.mongoProxyServer.close(); } catch (e) { logger.error(e); }
    
    setTimeout(() => {
      if (!common.vars.mongoProxyServerConns.size) return;
      logger.warn('Forcibly closing all mongodb connections');
      for (var socket in common.vars.mongoProxyServerConns) socket.destroy();
    }, 10000).unref();
  }
  
  setTimeout(() => {
    logger.warn('Forcibly shutting down');
    process.exit();
  }, 12000).unref();
}

process.on('SIGINT', exitHandler);


// simple repl for executing commands
common.vars.replServer = repl.start({
  prompt: '',
  terminal: false,
  preview: false,
  // declaring eval explicitly so code is evaluated in the context of index.js
  eval: msg => {
    try {
      console.log(util.inspect(eval(msg), { colors: true, showProxy: true }));
    } catch (err) {
      console.error(err.stack);
    }
  },
});

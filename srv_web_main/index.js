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

var { env } = require('./common/env');
var { mergeIPPort } = require('./common/misc');
var { vars } = require('./common/vars');


if (env.PROC_MONGODB_ENABLED) {
  (async () => {
    // start reverse proxy
    vars.mongoProxyServerConns = new Set();
    vars.mongoProxyServer = net.createServer(conn => {
      if (conn.remoteAddress != '::ffff:127.0.0.1') {
        logger.debug(`Mongodb proxy connection invalid, ${conn.remoteAddress}:${conn.remotePort} is not permitted to connect to the proxy`);
        conn.destroy();
        return;
      }
      vars.mongoProxyServerConns.add(conn);
      logger.debug(`Mongodb proxy new connection from localhost:${conn.remotePort}`);
      var proxyConn = net.connect(27016, 'proc_mongodb');
      vars.mongoProxyServerConns.add(proxyConn);
      conn.pipe(proxyConn);
      proxyConn.pipe(conn);
      conn.on('error', err => logger.error(`localhost:${conn.remotePort} conn ` + err));
      proxyConn.on('error', err => logger.error(`localhost:${conn.remotePort} proxyConn ` + err));
      conn.on('close', hadError => {
        vars.mongoProxyServerConns.delete(conn);
        vars.mongoProxyServerConns.delete(proxyConn);
        logger.debug(`Mongodb proxy connection from localhost:${conn.remotePort} closed ${hadError ? 'with' : 'without'} error`);
      });
    });
    vars.mongoProxyServer.on('error', err => logger.error('Proxy ' + err.toString()));
    
    vars.mongoProxyServer.listen(27017, () => logger.info('Mongodb proxy server listening'));
    
    // initalize mongo client
    var mongodb = require('mongodb');
    
    vars.mongoClient = new mongodb.MongoClient('mongodb://127.0.0.1', { useUnifiedTopology: true });
    
    await new Promise(r => setTimeout(r, 3000));
    await vars.mongoClient.connect();
    logger.info('Connected to mongodb server');
    
    try {
      await vars.mongoClient.db().admin().command({ replSetGetStatus: {} });
      logger.info('Replica set already created');
    } catch (e) {
      await vars.mongoClient.db().admin().command({ replSetInitiate: {} });
      logger.info('Initialized replica set');
    }
    
    require('./requests/chat_ws').mongoClientOnConnect();
  })();
}


// servers
if (env.SRV_WEB_MAIN_HTTP_IP) {
  vars.tcpServer = net.createServer(conn => {
    if (conn.destroyed) {
      if (env.SRV_WEB_MAIN_LOG_DEBUG)
        logger.debug(`TCP open-instaclose ${conn.remoteAddress}, ${conn.remotePort}`);
      return;
    }
    
    if (env.SRV_WEB_MAIN_LOG_DEBUG) {
      logger.debug(`TCP open ${mergeIPPort(conn.remoteAddress, conn.remotePort)}`);
      conn.on('close', hadError => {
        logger.debug(`TCP close ${mergeIPPort(conn.remoteAddress, conn.remotePort)} ${hadError ? 'error' : 'normal'}`);
      });
    }
    
    conn.setNoDelay(true);
    
    vars.httpServer.emit('connection', conn);
  });
  
  vars.tcpServer.listen({ host: env.SRV_WEB_MAIN_HTTP_IP, port: env.SRV_WEB_MAIN_HTTP_PORT }, () => {
    logger.info(`HTTP server listening on ${mergeIPPort(env.SRV_WEB_MAIN_HTTP_IP, env.SRV_WEB_MAIN_HTTP_PORT)}`);
  });
  
  vars.httpServerConns = new Set();
  vars.httpServer = http.createServer(require('./requests/main').bind(null, 1));
  vars.httpServer.on('connection', socket => {
    vars.httpServerConns.add(socket);
    socket.on('close', () => { vars.httpServerConns.delete(socket); });
  });
  vars.httpServer.on('upgrade', require('./requests/upgrade'));
  vars.httpServer.on('connect', require('./requests/connect_http1'));
}

if (env.SRV_WEB_MAIN_HTTPS_IP) {
  vars.tlsServer = tls.createServer({
    secureOptions: crypto.constants.SSL_OP_NO_SSLv2 | crypto.constants.SSL_OP_NO_SSLv3 | crypto.constants.SSL_OP_NO_TLSv1 | crypto.constants.SSL_OP_NO_TLSv1_1,
    //ciphers: crypto.constants.defaultCoreCipherList + ':!TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256:!TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384:!TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA:!TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA:!TLS_RSA_WITH_AES_256_GCM_SHA384:!TLS_RSA_WITH_AES_256_CCM_8:!TLS_RSA_WITH_AES_256_CCM:!TLS_RSA_WITH_ARIA_256_GCM_SHA384:!TLS_RSA_WITH_AES_128_GCM_SHA256:!TLS_RSA_WITH_AES_128_CCM_8:!TLS_RSA_WITH_AES_128_CCM:!TLS_RSA_WITH_ARIA_128_GCM_SHA256:!TLS_RSA_WITH_AES_256_CBC_SHA256:!TLS_RSA_WITH_AES_128_CBC_SHA256:!TLS_RSA_WITH_AES_256_CBC_SHA:!TLS_RSA_WITH_AES_128_CBC_SHA:@STRENGTH',
    ciphers: 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256:TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_CHACHA20_POLY1305_SHA256:TLS_ECDHE_RSA_WITH_ARIA_256_GCM_SHA384:TLS_ECDHE_RSA_WITH_ARIA_128_GCM_SHA256:@STRENGTH',
    key: fs.readFileSync(env.SRV_WEB_MAIN_TLS_KEY_FILE),
    cert: fs.readFileSync(env.SRV_WEB_MAIN_TLS_CERT_FILE) + fs.readFileSync(env.SRV_WEB_MAIN_TLS_CERT_ROOT_FILE),
    
    ALPNProtocols: ['h2', 'http/1.1'],
  }, conn => {
    if (conn.destroyed) {
      if (env.SRV_WEB_MAIN_LOG_DEBUG)
        logger.debug(`TLS open-instaclose ${conn.remoteAddress}, ${conn.remotePort}`);
      return;
    }
    
    if (env.SRV_WEB_MAIN_LOG_DEBUG) {
      logger.debug(`TLS open ${mergeIPPort(conn.remoteAddress, conn.remotePort)} ${conn.servername} ${conn.alpnProtocol} ${conn.authorized}`);
      conn.on('close', hadError => {
        logger.debug(`TLS close ${mergeIPPort(conn.remoteAddress, conn.remotePort)} ${hadError ? 'error' : 'normal'}`);
      });
    }
    
    conn.setNoDelay(true);
    
    if (conn.alpnProtocol == false || conn.alpnProtocol == 'http/1.1')
      vars.httpsServer.emit('secureConnection', conn);
    else if (conn.alpnProtocol == 'h2')
      vars.http2Server.emit('secureConnection', conn);
  });
  
  vars.tlsSessionStore = new Map();
  
  vars.tlsServer.on('newSession', (id, data, cb) => {
    vars.tlsSessionStore.set(id.toString('base64'), [data, Date.now()]);
    cb();
  });
  
  vars.tlsServer.on('resumeSession', (id, cb) => {
    cb(null, vars.tlsSessionStore.get(id.toString('base64'))?.[0] || null);
  });
  
  vars.tlsServer.listen({ host: env.SRV_WEB_MAIN_HTTPS_IP, port: env.SRV_WEB_MAIN_HTTPS_PORT }, () => {
    logger.info(`HTTPS/H2 server listening on ${mergeIPPort(env.SRV_WEB_MAIN_HTTPS_IP, env.SRV_WEB_MAIN_HTTPS_PORT)}`);
  });
  
  vars.httpsServerConns = new Set();
  vars.httpsServer = https.createServer(require('./requests/main').bind(null, 1));
  vars.httpsServer.on('secureConnection', socket => {
    vars.httpsServerConns.add(socket);
    socket.on('close', () => { vars.httpsServerConns.delete(socket); });
  });
  vars.httpsServer.on('upgrade', require('./requests/upgrade'));
  vars.httpsServer.on('connect', require('./requests/connect_http1'));
  
  vars.http2ServerSessions = new Set();
  vars.http2ServerStreams = new Set();
  vars.http2Server = http2.createSecureServer({ settings: { enableConnectProtocol: true } });
  vars.http2Server.on('session', session => {
    vars.http2ServerSessions.add(session);
    session.on('stream', stream => {
      vars.http2ServerStreams.add(stream);
      stream.on('close', () => { vars.http2ServerStreams.delete(stream); });
    });
    session.on('close', () => { vars.http2ServerSessions.delete(session); });
  });
  vars.http2Server.on('stream', require('./requests/main').bind(null, 2));
}

if (env.SRV_WEB_MAIN_HTTP_IP || env.SRV_WEB_MAIN_HTTPS_IP) {
  vars.httpServerProxyConns = new Set();
  
  vars.echoWSServer = new ws.Server({ noServer: true, clientTracking: true, maxPayload: 2 ** 20 });
  vars.echoWSServer.on('connection', function echoWSFunc(ws, req, requestProps) {
    ws.on('message', msg => ws.send(msg));
  });
  
  vars.chatWSServer = new ws.Server({ noServer: true, clientTracking: true, maxPayload: 8 * 2 ** 20 });
  vars.chatWSServer.on('connection', require('./requests/chat_ws').chatWSFunc);
  vars.chatWSServerMap = new WeakMap();
  
  vars.statusWSServer = new ws.Server({ noServer: true, clientTracking: true, maxPayload: 2 ** 20 });
  vars.statusWSServer.on('connection', require('./requests/status_ws').statusWSFunc);
}


// website cache
if (env.SRV_WEB_MAIN_CACHE_MODE == 1) {
  vars.filesCache = {};
  require('./common/recursive_readdir')('websites/public').forEach(filename => {
    filename = 'websites/public/' + filename;
    vars.filesCache[filename] = {
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
vars.tickIntMs = env.SRV_WEB_MAIN_TICK_INTERVAL || 5000;
vars.ticks = 0;
vars.tickFunc = () => {
  var i;
  
  // for removing old cached TLS sessions
  let tlsSessionLimitTime = Date.now() - 300000;
  if (env.SRV_WEB_MAIN_HTTPS_IP && vars.ticks % (300000 / vars.tickIntMs)) {
    for (i of vars.tlsSessionStore.keys()) {
      if (vars.tlsSessionStore.get(i)[1] < tlsSessionLimitTime)
        vars.tlsSessionStore.delete(i);
    }
  }
  
  // for removing old ownEyes tokens
  let ownEyesLimitTime = Date.now() - 5000;
  for (i of vars.ownEyesCodes.keys()) {
    if (vars.ownEyesCodes.get(i) < ownEyesLimitTime)
      vars.ownEyesCodes.delete(i);
  }
  
  // for disconnecting chat members more quickly if their internet has cut out
  let chatIdleTimeout = env.SRV_WEB_MAIN_CHAT_IDLE_TIMEOUT;
  if (chatIdleTimeout && vars.ticks % chatIdleTimeout == 0) {
    for (var ws2 of vars.chatWSServer.clients) {
      if (ws2.isAlive === false) return ws2.terminate();
      
      ws2.isAlive = false;
      ws2.ping();
    }
  }
  
  vars.ticks++;
};
vars.tickInt = setInterval(vars.tickFunc, vars.tickIntMs);

// handle a shutdown signal
vars.exitHandlerCalled = false;

async function exitHandler() {
  if (vars.exitHandlerCalled) return;
  vars.exitHandlerCalled = true;
  
  logger.info('Shutting down');
  
  if (vars.replServer) vars.replServer.close();
  
  if (vars.tcpServer) {
    vars.tcpServer.close(() => {
      logger.info('HTTP server closed');
    });
    vars.httpServer.close();
    vars.httpServer.closeIdleConnections();
    setTimeout(() => {
      if (!vars.httpServerConns.size) return;
      logger.warn('Forcibly closing all HTTP connections');
      vars.httpServer.closeAllConnections();
      for (var socket of vars.httpServerConns) socket.destroy();
    }, 10000).unref();
  }
  
  if (vars.tlsServer) {
    vars.tlsServer.close(() => {
      logger.info('HTTPS/H2 server closed');
    });
    vars.httpsServer.close();
    vars.httpsServer.closeIdleConnections();
    vars.http2Server.close();
    for (var session of vars.http2ServerSessions) session.close();
    setTimeout(() => {
      if (!vars.httpsServerConns.size && !vars.http2ServerStreams.size) return;
      logger.warn('Forcibly closing all HTTPS/H2 connections');
      if (vars.httpsServerConns.size) {
        vars.httpsServer.closeAllConnections();
        for (var socket of vars.httpsServerConns) socket.destroy();
      }
      if (vars.http2ServerStreams.size) {
        for (var stream of vars.http2ServerStreams) stream.close();
      }
    }, 10000).unref();
  }
  
  if (vars.tcpServer || vars.tlsServer) {
    vars.echoWSServer.close();
    vars.chatWSServer.close();
    vars.statusWSServer.close();
    
    setTimeout(() => {
      if (!vars.echoWSServer.clients.size && !vars.chatWSServer.clients.size && !vars.statusWSServer.clients.size) return;
      logger.warn('Forcibly closing all WebSocket connections');
      var ws;
      if (vars.echoWSServer.clients.size) {
        for (ws of vars.echoWSServer.clients) ws.close();
      }
      if (vars.chatWSServer.clients.size) {
        for (ws of vars.chatWSServer.clients) ws.close();
      }
      if (vars.statusWSServer.clients.size) {
        for (ws of vars.statusWSServer.clients) ws.close();
      }
    }, 8000).unref();
    
    setTimeout(() => {
      if (!vars.httpServerProxyConns.size) return;
      logger.warn('Forcibly closing all http server proxy connections');
      for (var httpReq of vars.httpServerProxyConns) httpReq.destroy();
    }, 8000).unref();
  }
  
  try { clearInterval(vars.tickInt); } catch (e) { logger.error(e); }
  
  if (vars.mongoClient) {
    try { require('./requests/chat_ws').mongoClientOnClose(); } catch (e) { logger.error(e); }
    try { await vars.mongoClient.close(); } catch (e) { logger.error(e); }
    try { vars.mongoProxyServer.close(); } catch (e) { logger.error(e); }
    
    setTimeout(() => {
      if (!vars.mongoProxyServerConns.size) return;
      logger.warn('Forcibly closing all mongodb connections');
      for (var socket in vars.mongoProxyServerConns) socket.destroy();
    }, 10000).unref();
  }
  
  setTimeout(() => {
    logger.warn('Forcibly shutting down');
    process.exit();
  }, 12000).unref();
}

process.on('SIGINT', exitHandler);


// simple repl for executing commands
vars.replServer = repl.start({
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

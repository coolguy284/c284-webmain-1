(async () => {
  var cp = require('child_process');
  var dns = require('dns');
  var net = require('net');
  
  // start mongodb server and register hooks
  var proc_mongodb = cp.spawn('mongod', [
    '--dbpath', 'mongodb', '--bind_ip', '127.0.0.1', '--port', '27017', '--replSet', 'c284wm1_1'
  ], { stdio: ['pipe', 'pipe', 'pipe'] });
  
  process.stdin.pipe(proc_mongodb.stdin);
  proc_mongodb.stdout.pipe(process.stdout);
  proc_mongodb.stderr.pipe(process.stderr);
  
  process.on('SIGINT', () => {
    proc_mongodb.kill('SIGINT');
  });
  
  proc_mongodb.on('exit', () => {
    server.close();
    for (var conn of serverConns) conn.destroy();
    setTimeout(() => process.exit(), 5000).unref();
  });
  
  
  // start reverse proxy
  var srv_web_main_addrs = null;
  var serverConns = new Set();
  var server = net.createServer(async conn => {
    if (srv_web_main_addrs == null) {
      srv_web_main_addrs = new Set((await dns.promises.lookup('srv_web_main', { all: true })).map(x => x.family == 4 ? '::ffff:' + x.address : x.address));
    }
    if (!srv_web_main_addrs.has(conn.remoteAddress)) {
      console.log(`{"t":{"$date":"${new Date().toISOString().slice(0, -1)}+00:00"},"ctx":"c284-node","c":"MAIN","msg":"Error: Invalid connection, ${conn.remoteAddress}:${conn.remotePort} is not permitted to connect to the reverse proxy."}`);
      conn.destroy();
      return;
    }
    serverConns.add(conn);
    console.log(`{"t":{"$date":"${new Date().toISOString().slice(0, -1)}+00:00"},"ctx":"c284-node","c":"MAIN","msg":"New connection from srv_web_main:${conn.remotePort}"}`);
    var proxyConn = net.connect(27017, '127.0.0.1');
    conn.pipe(proxyConn);
    proxyConn.pipe(conn);
    conn.on('error', err => {
      console.log(`{"t":{"$date":"${new Date().toISOString().slice(0, -1)}+00:00"},"ctx":"c284-node","c":"MAIN","msg":"srv_web_main:${conn.remotePort} conn ${err.toString()}"}`);
    });
    proxyConn.on('error', err => {
      console.log(`{"t":{"$date":"${new Date().toISOString().slice(0, -1)}+00:00"},"ctx":"c284-node","c":"MAIN","msg":"srv_web_main:${conn.remotePort} proxyConn ${err.toString()}"}`);
    });
    conn.on('close', hadError => {
      serverConns.delete(conn);
      console.log(`{"t":{"$date":"${new Date().toISOString().slice(0, -1)}+00:00"},"ctx":"c284-node","c":"MAIN","msg":"Connection from srv_web_main:${conn.remotePort} closed ${hadError ? 'with' : 'without'} error"}`);
    });
  });
  
  server.on('error', err => {
    console.log(`{"t":{"$date":"${new Date().toISOString().slice(0, -1)}+00:00"},"ctx":"c284-node","c":"MAIN","msg":"Reverse Proxy ${err.toString()}"}`);
  });
  
  server.listen(27016, () => {
    console.log(`{"t":{"$date":"${new Date().toISOString().slice(0, -1)}+00:00"},"ctx":"c284-node","c":"MAIN","msg":"Mongodb reverse proxy server listening"}`);
  });
  
  
  process.on('uncaughtException', err => {
    console.log(`{"t":{"$date":"${new Date().toISOString().slice(0, -1)}+00:00"},"ctx":"c284-node","c":"MAIN","msg":"uncaughtException ${err.toString()}"}`);
  });
  
  process.on('unhandledRejection', err => {
    console.log(`{"t":{"$date":"${new Date().toISOString().slice(0, -1)}+00:00"},"ctx":"c284-node","c":"MAIN","msg":"unhandledRejection ${err.toString()}"}`);
  });
})();

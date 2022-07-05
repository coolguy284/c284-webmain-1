var path = require('path');

module.exports = exports = {
  toBool: (str, defaultBool) => {
    if (str == null || str == '') return defaultBool;
    else {
      str = str == 'false' || str == '0' ? false : true;
    }
  },
  
  formatIP: ip => {
    if (typeof ip != 'string') return '';
    if (/^::ffff:[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(ip))
      return '::ffff:' + ip.slice(7, Infinity).split('.').map(x => x.padStart(3, '-')).join('.');
    else if (/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(ip))
      return ip.split('.').map(x => x.padStart(3, '-')).join('.');
    else
      return ip;
  },
  
  mergeIPPort: (ip, port) =>
    ip.includes(':') ? `[${ip}]:${port}` : `${ip}:${port}`,
  
  IPv6ToHex: ip => {
    ip = ip.split(':');
    if (ip[0] == '') ip.splice(0, 1);
    if (ip[ip.length - 1] == '') ip.splice(-1, 1);
    let emptyIndex = ip.indexOf('');
    if (emptyIndex > -1) ip.splice(emptyIndex, 1, ...new Array(9 - ip.length).fill('0'));
    return ip.map(x => x.padStart(4, '0')).join('');
  },
  
  isSubDir: (parent, dir) => {
    var relativePath = path.relative(parent, dir);
    return relativePath && relativePath != '..' && !relativePath.startsWith('..' + path.sep) && !path.isAbsolute(relativePath);
  },
  
  getRequestProps: (httpVersion, ...args) => {
    let requestProps;
    
    switch (httpVersion) {
      case 1: {
        let [ req, res, type ] = args;
        
        requestProps = {
          httpVersion: 1,
          type,
          req, res, headers: req.headers,
          ip: req.socket.remoteAddress,
          port: req.socket.remotePort,
          proto: req.socket.encrypted ? 'https' : 'http',
          host: null,
          method: req.method.toLowerCase(),
          rawUrl: req.url,
          urlString: null,
          url: null,
          timestamp: new Date(),
          id: exports.vars.currentRequestID++,
        };
        
        if ('host' in req.headers) {
          if (/[a-z0-9-.]+/.test(req.headers.host))
            requestProps.host = req.headers.host;
          else
            requestProps.host = 'INVALID';
        } else {
          requestProps.host = 'NULL';
        }
        
        requestProps.urlString = req.url.replace(/[@:]+/g, '');
        
        if (!requestProps.urlString.startsWith('/'))
          requestProps.urlString = '/' + requestProps.urlString;
        
        try {
          requestProps.url = new URL(`${requestProps.proto == 'http' ? 'http' : 'https'}://${requestProps.host}${requestProps.urlString}`);
        } catch (err) {
          try {
            requestProps.url = new URL(`${requestProps.proto == 'http' ? 'http' : 'https'}://[${requestProps.host}]:${requestProps.proto == 'http' ? process.env.SRV_WEB_MAIN_HTTP_PORT : process.env.SRV_WEB_MAIN_HTTPS_PORT}${requestProps.urlString}`);
          } catch (err2) {
            console.error(err2);
            console.log([requestProps.proto, requestProps.host, requestProps.urlString]);
            requestProps.url = new URL(`${requestProps.proto == 'http' ? 'http' : 'https'}://NULL/null`);
          }
        }
        break;
      }
      
      case 2: {
        let [ stream, headers, flags, rawHeaders, type ] = args;
        
        requestProps = {
          httpVersion: 2,
          type,
          stream, headers, flags, rawHeaders,
          ip: stream.session.socket.remoteAddress,
          port: stream.session.socket.remotePort,
          proto: 'http2',
          host: null,
          method: headers[':method'].toLowerCase(),
          rawUrl: headers[':path'],
          urlString: null,
          url: null,
          timestamp: new Date(),
          id: exports.vars.currentRequestID++,
        };
        
        let hostHeader = ':authority' in headers ? headers[':authority'] : 'host' in headers ? headers.host : null;
        if (hostHeader != null) {
          if (/[a-z0-9-.]+/.test(hostHeader))
            requestProps.host = hostHeader;
          else
            requestProps.host = 'INVALID';
        } else {
          requestProps.host = 'NULL';
        }
        
        requestProps.urlString = headers[':path'].replace(/[@:]+/g, '');
        
        if (!requestProps.urlString.startsWith('/'))
          requestProps.urlString = '/' + requestProps.urlString;
        
        try {
          requestProps.url = new URL(`https://${requestProps.host}${requestProps.urlString}`);
        } catch (err) {
          try {
            requestProps.url = new URL(`https://[${requestProps.host}]:${process.env.SRV_WEB_MAIN_HTTPS_PORT}${requestProps.urlString}`);
          } catch (err2) {
            console.error(err2);
            console.log([requestProps.proto, requestProps.host, requestProps.urlString]);
            requestProps.url = new URL('https://NULL/null');
          }
        }
        break;
      }
      
      default:
        console.log('not possible');
        console.log(httpVersion);
        throw new Error('NotPossibleError');
    }
    
    requestProps.url.path = requestProps.url.href.slice(requestProps.url.origin.length);
    
    return requestProps;
  },
  
  getReqLogStr: requestProps => {
    if (requestProps.httpVersion == 1) {
      if (requestProps.type == 'main')
        return `${requestProps.id.toString().padStart(5, '0')} ${requestProps.ip} ${requestProps.proto.padEnd(5, ' ')} ${requestProps.host} ${requestProps.method} ${requestProps.rawUrl}`;
      else
        return `${requestProps.id.toString().padStart(5, '0')} ${requestProps.ip} ${requestProps.proto.padEnd(5, ' ')} ${requestProps.host} upgrade:${requestProps.headers.upgrade} ${requestProps.method} ${requestProps.rawUrl}`;
    } else {
      if (requestProps.method != 'connect')
        return `${requestProps.id.toString().padStart(5, '0')} ${requestProps.ip} ${requestProps.proto.padEnd(5, ' ')} ${requestProps.host} ${requestProps.method} ${requestProps.rawUrl}`;
      else
        return `${requestProps.id.toString().padStart(5, '0')} ${requestProps.ip} ${requestProps.proto.padEnd(5, ' ')} ${requestProps.host} connect:${requestProps.headers[':protocol']} ${requestProps.rawUrl}`;
    }
  },
  
  getPublicPath: (pathName) => {
    if (pathName.endsWith('/') || !pathName)
      pathName += 'index.html';
    
    try {
      pathName = decodeURI(pathName);
    } catch (err) { /* empty */ }
    
    return path.join('websites/public', pathName);
  },
  
  resp: require('./resp'),
  
  vars: {
    mongoProxyServer: null,
    mongoProxyServerConns: null,
    mongoClient: null,
    
    currentRequestID: 0,
    
    tcpServer: null,
    httpServer: null,
    httpServerConns: null,
    
    tlsServer: null,
    tlsSessionStore: null,
    httpsServer: null,
    httpsServerConns: null,
    http2Server: null,
    http2ServerSessions: null,
    http2ServerStreams: null,
    
    httpServerProxyConns: null,
    
    echoWSServer: null,
    chatWSServer: null,
    chatWSServerMap: null,
    statusWSServer: null,
    
    filesCache: null,
    
    tickIntMs: null,
    ticks: null,
    tickFunc: null,
    
    exitHandlerCalled: null,
    
    replServer: null,
    
    ownEyesCodes: new Map(),
  },
  
  constVars: {
    otherServerHosts: new Set(['old.coolguy284.com', 'old2.coolguy284.com', 'oldg.coolguy284.com', 'test.coolguy284.com']),
    otherServerURLStarts: ['/old/', '/old2/', '/oldg/'],
    otherServerHostsMap: new Map([
      ['old.coolguy284.com', 'srv_web_old'],
      ['old2.coolguy284.com', 'srv_web_old2'],
      ['oldg.coolguy284.com', 'srv_web_oldg'],
      ['test.coolguy284.com', 'srv_web_old'],
    ]),
    otherServerURLStartsMap: new Map([
      ['/old/', 'srv_web_old'],
      ['/old2/', 'srv_web_old2'],
      ['/oldg/', 'srv_web_oldg'],
    ]),
    
    oldServerNoLogURLs: new Set(['/livechat.dat', '/liverchat.json', '/liveviews.dat', '/comms.json', '/colog.dat', '/cologd.dat', '/livechathere.dat', '/livechattyp.dat', '/livechatkick.dat', '/pkey.log', '/lat.log']),
    oldServerNoLogURLStarts: ['/s?her=', '/s?typ=', '/m?cnl=', '/a?co=', '/a?cd=', '/a?ccp=', '/a?rc=', '/a?fstyp=', '/a?fsdir=', '/a?fstex='],
  },
};

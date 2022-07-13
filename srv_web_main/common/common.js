var logger = require('../log_utils')('common/common');

var path = require('path');

module.exports = exports = {
  toBool: (str, defaultBool) => {
    if (str == null || str == '')
      return defaultBool ?? false;
    else
      return str == 'false' || str == '0' ? false : true;
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
    ip != null && ip.includes(':') ? `[${ip}]:${port}` : `${ip}:${port}`,
  
  IPv6ToHex: ip => {
    ip = ip.split(':');
    if (ip[0] == '') ip.splice(0, 1);
    if (ip[ip.length - 1] == '') ip.splice(-1, 1);
    let emptyIndex = ip.indexOf('');
    if (emptyIndex > -1) ip.splice(emptyIndex, 1, ...new Array(9 - ip.length).fill('0'));
    return ip.map(x => x.padStart(4, '0')).join('');
  },
  
  uncastIPv6: ip => {
    if (ip.startsWith('::ffff:')) return ip.slice(7);
    else return ip;
  },
  
  isSubDir: (parent, dir) => {
    var relativePath = path.relative(parent, dir);
    return relativePath && relativePath != '..' && !relativePath.startsWith('..' + path.sep) && !path.isAbsolute(relativePath);
  },
  
  getRequestProps: (httpVersion, ...args) => {
    let requestProps = {
      httpVersion: null,
      type: null,
      req: null, res: null,
      stream: null, flags: null, rawHeaders: null,
      headers: null,
      ip: null,
      ipv6Cast: null,
      port: null,
      proto: null,
      trueHost: null,
      host: null,
      method: null,
      rawUrl: null,
      urlString: null,
      url: null,
      timestamp: new Date(),
      id: exports.vars.currentRequestID++,
      doLog: null,
      otherServer: null,
      otherServerOnline: null,
    };
    
    switch (httpVersion) {
      case 1: {
        let [ req, res, type ] = args;
        
        requestProps.httpVersion = 1;
        requestProps.type = type;
        requestProps.req = req;
        requestProps.res = res;
        requestProps.headers = req.headers;
        requestProps.ip = exports.uncastIPv6(req.socket.remoteAddress);
        requestProps.ipv6Cast = req.socket.remoteAddress;
        requestProps.port = req.socket.remotePort;
        requestProps.proto = req.socket.encrypted ? 'https' : 'http';
        requestProps.method = req.method.toLowerCase();
        requestProps.rawUrl = req.url;
        
        if ('host' in req.headers)
          requestProps.rawHost = req.headers.host;
        
        requestProps.urlString = req.url;
        break;
      }
      
      case 2: {
        let [ stream, headers, flags, rawHeaders, type ] = args;
        
        requestProps.httpVersion = 2;
        requestProps.type = type;
        requestProps.stream = stream;
        requestProps.flags = flags;
        requestProps.rawHeaders = rawHeaders;
        requestProps.headers = headers;
        requestProps.ip = exports.uncastIPv6(stream.session.socket.remoteAddress);
        requestProps.ipv6Cast = stream.session.socket.remoteAddress;
        requestProps.port = stream.session.socket.remotePort;
        requestProps.proto = 'http2';
        requestProps.method = headers[':method'].toLowerCase();
        requestProps.rawUrl = headers[':path'];
        
        requestProps.rawHost = ':authority' in headers ? headers[':authority'] : 'host' in headers ? headers.host : null;
        
        requestProps.urlString = headers[':path'];
        break;
      }
      
      default:
        logger.error('not possible');
        logger.error(httpVersion);
        throw new Error('NotPossibleError');
    }
    
    if (requestProps.rawHost != null) {
      if (/^(?:[a-zA-Z0-9-.]+|(?:[a-fA-F0-9]{0,4}:){1,8}[a-fA-F0-9]{0,4}|\[(?:[a-fA-F0-9]{0,4}:){1,8}[a-fA-F0-9]{0,4}\]:[0-9]+)$/.test(requestProps.rawHost))
        requestProps.host = requestProps.rawHost;
      else
        requestProps.host = 'INVALID';
    } else {
      requestProps.host = 'NULL';
    }
    
    requestProps.urlString = requestProps.urlString.replace(/[@:]+/g, '');
    
    if (!requestProps.urlString.startsWith('/'))
      requestProps.urlString = '/' + requestProps.urlString;
    
    let urlProto = requestProps.proto == 'http' ? 'http' : 'https';
    
    try {
      if (requestProps.host.includes(':'))
        requestProps.url = new URL(`${urlProto}://[${requestProps.host}]:${requestProps.proto == 'http' ? process.env.SRV_WEB_MAIN_HTTP_PORT : process.env.SRV_WEB_MAIN_HTTPS_PORT}${requestProps.urlString}`);
      else
        requestProps.url = new URL(`${urlProto}://${requestProps.host}${requestProps.urlString}`);
    } catch (err) {
      logger.warn('Error parsing url');
      logger.warn([requestProps.proto, requestProps.host, requestProps.urlString]);
      logger.warn(err);
      requestProps.url = new URL(`${urlProto}://NULL/null`);
    }
    
    requestProps.url.path = requestProps.url.href.slice(requestProps.url.origin.length);
    
    let otherServerHostSrvName = exports.constVars.otherServerHosts.get(requestProps.url.host);
    let otherServerURLStartStr = exports.constVars.otherServerURLStartsArr.find(x => requestProps.url.pathname.startsWith(x));
    let otherServerURLStartSrvName = otherServerURLStartStr ? exports.constVars.otherServerURLStarts.get(otherServerURLStartStr) : null;
    
    let isHost = Boolean(otherServerHostSrvName), isPrefix = Boolean(otherServerURLStartSrvName);
    
    let otherServerBool = isHost || isPrefix;
    
    let otherServer, slicedPath;
    if (otherServerBool) {
      let otherServerName = otherServerHostSrvName ?? otherServerURLStartSrvName;
      let otherServerInfo = exports.constVars.otherServers.get(otherServerName);
      
      slicedPath = isPrefix ? '/' + requestProps.url.path.slice(otherServerURLStartStr.length) : requestProps.url.path;
      
      requestProps.otherServer = otherServer = {
        name: otherServerName,
        type: isHost ? 'host' : 'prefix',
        isHost,
        isPrefix,
        host: otherServerInfo.host,
        port: otherServerInfo.port,
        forceHttps: otherServerInfo.forceHttps,
        castIPv4to6: otherServerInfo.castIPv4to6,
        noLogURLs: otherServerInfo.noLogURLs,
        noLogUrlStarts: otherServerInfo.noLogUrlStarts,
        slicedPath,
      };
      requestProps.otherServerOnline = exports.toBool(process.env[otherServerName.toUpperCase() + '_ENABLED']);
    } else {
      slicedPath = requestProps.url.path;
    }
    
    requestProps.doLog = exports.toBool(process.env.SRV_WEB_MAIN_LOG_REQUESTS) &&
      !requestProps.url.pathname.startsWith('/api/') &&
      !(otherServerBool && (
        otherServer.noLogURLs.has(slicedPath) ||
        otherServer.noLogUrlStarts.some(x => slicedPath.startsWith(x))
      ));
    
    return requestProps;
  },
  
  getReqLogStr: requestProps => {
    if (requestProps.httpVersion == 1) {
      if (requestProps.type == 'main')
        return `${requestProps.id.toString().padStart(5, '0')} ${requestProps.ip} ${requestProps.proto.padEnd(5, ' ')} ${requestProps.rawHost ?? 'NULL'} ${requestProps.method} ${requestProps.rawUrl}`;
      else
        return `${requestProps.id.toString().padStart(5, '0')} ${requestProps.ip} ${requestProps.proto.padEnd(5, ' ')} ${requestProps.rawHost ?? 'NULL'} upgrade:${requestProps.headers.upgrade} ${requestProps.method} ${requestProps.rawUrl}`;
    } else {
      if (requestProps.method != 'connect')
        return `${requestProps.id.toString().padStart(5, '0')} ${requestProps.ip} ${requestProps.proto.padEnd(5, ' ')} ${requestProps.rawHost ?? 'NULL'} ${requestProps.method} ${requestProps.rawUrl}`;
      else
        return `${requestProps.id.toString().padStart(5, '0')} ${requestProps.ip} ${requestProps.proto.padEnd(5, ' ')} ${requestProps.rawHost ?? 'NULL'} connect:${requestProps.headers[':protocol']} ${requestProps.rawUrl}`;
    }
  },
  
  getPublicPath: pathName => {
    if (pathName.endsWith('/') || !pathName)
      pathName += 'index.html';
    
    try {
      pathName = decodeURI(pathName);
    } catch (err) { /* empty */ }
    
    return 'websites/public' + (pathName.startsWith('/') ? pathName : '/' + pathName);
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
    otherServers: new Map([
      ['srv_web_old', {
        host: 'srv_web_old',
        port: 8080,
        forceHttps: false,
        castIPv4to6: true,
        noLogURLs: new Set(['/livechat.dat', '/liverchat.json', '/liveviews.dat', '/comms.json', '/colog.dat', '/cologd.dat', '/livechathere.dat', '/livechattyp.dat', '/livechatkick.dat', '/pkey.log', '/lat.log']),
        noLogUrlStarts: ['/s?her=', '/s?typ=', '/m?cnl=', '/a?co=', '/a?cd=', '/a?ccp=', '/a?rc=', '/a?fstyp=', '/a?fsdir=', '/a?fstex='],
      }],
      ['srv_web_old2', {
        host: 'srv_web_old2',
        port: 8080,
        forceHttps: false,
        castIPv4to6: true,
        noLogURLs: new Set(),
        noLogUrlStarts: [],
      }],
      ['srv_web_oldg', {
        host: 'srv_web_oldg',
        port: 8080,
        forceHttps: false,
        castIPv4to6: false,
        noLogURLs: new Set(),
        noLogUrlStarts: [],
      }],
    ]),
    
    otherServerHosts: new Map([
      ['old.coolguy284.com', 'srv_web_old'],
      ['old2.coolguy284.com', 'srv_web_old2'],
      ['oldg.coolguy284.com', 'srv_web_oldg'],
    ]),
    otherServerURLStarts: new Map([
      ['/old/', 'srv_web_old'],
      ['/old2/', 'srv_web_old2'],
      ['/oldg/', 'srv_web_oldg'],
    ]),
    
    otherServerHostsSet: null,
    otherServerURLStartsArr: null,
  },
};

exports.constVars.otherServerHostsSet = new Set(exports.constVars.otherServerHosts.keys());
exports.constVars.otherServerURLStartsArr = Array.from(exports.constVars.otherServerURLStarts.keys());

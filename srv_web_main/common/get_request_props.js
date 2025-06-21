var logger = require('../log_utils')('common/get_request_props');

var { env } = require('./env');
var { uncastIPv6 } = require('./misc');
var { vars, constVars } = require('./vars');

module.exports = (httpVersion, ...args) => {
  let requestProps = {
    httpVersion: null,
    type: null,
    req: null, res: null,
    stream: null, flags: null, rawHeaders: null,
    headers: null,
    cookie: null,
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
    id: vars.currentRequestID++,
    rawDoLogNotPriv: null,
    rawDoLog: null,
    doLogNotPriv: null,
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
      requestProps.ip = uncastIPv6(req.socket.remoteAddress);
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
      requestProps.ip = uncastIPv6(stream.session.socket.remoteAddress);
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
  
  requestProps.cookie = requestProps.headers.cookie ? Object.fromEntries(requestProps.headers.cookie.split('; ').map(x => x.split('=')).filter(x => x.length == 2)) : {};
  
  if (requestProps.rawHost != null) {
    if (/^(?:[a-zA-Z0-9-.]+|[a-zA-Z0-9-.]+:[0-9]{1,5}|(?:[a-fA-F0-9]{0,4}:){1,8}[a-fA-F0-9]{0,4}|\[(?:[a-fA-F0-9]{0,4}:){1,8}[a-fA-F0-9]{0,4}\]:[0-9]{1,5})$/.test(requestProps.rawHost))
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
    requestProps.url = new URL(`${urlProto}://${requestProps.host}${requestProps.urlString}`);
  } catch (err) {
    logger.warn('Error parsing url');
    logger.warn([requestProps.proto, requestProps.host, requestProps.urlString, `${urlProto}://${requestProps.host}${requestProps.urlString}`, requestProps.rawHost, requestProps.url]);
    logger.warn(err);
    requestProps.url = new URL(`${urlProto}://NULL/null`);
  }
  
  requestProps.url.path = requestProps.url.href.slice(requestProps.url.origin.length);
  
  let otherServerHostSrvName = constVars.otherServerHosts.get(requestProps.url.host);
  let isHost = Boolean(otherServerHostSrvName), isPrefix, otherServerBool;
  
  let otherServerURLStartStr, otherServerURLStartSrvName;
  if (!isHost) {
    otherServerURLStartStr = constVars.otherServerURLStartsArr.find(x => requestProps.url.pathname.startsWith(x));
    otherServerURLStartSrvName = otherServerURLStartStr ? constVars.otherServerURLStarts.get(otherServerURLStartStr) : null;
    isPrefix = Boolean(otherServerURLStartSrvName);
    otherServerBool = isPrefix;
  } else {
    otherServerBool = true;
  }
  
  let otherServer, slicedPath;
  if (otherServerBool) {
    let otherServerName = otherServerHostSrvName ?? otherServerURLStartSrvName;
    let otherServerInfo = constVars.otherServers.get(otherServerName);
    
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
      forwardSimpleProto: otherServerInfo.forwardSimpleProto,
      noLogURLs: otherServerInfo.noLogURLs,
      noLogUrlStarts: otherServerInfo.noLogUrlStarts,
      slicedPath,
    };
    requestProps.otherServerOnline = env[otherServerName.toUpperCase() + '_ENABLED'];
  } else {
    slicedPath = requestProps.url.path;
  }
  
  if (env.SRV_WEB_MAIN_LOG_REQUESTS) {
    requestProps.rawDoLogNotPriv =
      !constVars.noLogHosts.has(requestProps.host) &&
      requestProps.headers.dnt != '1' &&
      requestProps.headers['Sec-GPC'] != '1' &&
      requestProps.cookie.dnt != '1' &&
      requestProps.headers['x-c284-nolog'] != '1';
    
    if (!env.SRV_WEB_MAIN_LOG_REQUESTS_ALWAYS) {
      requestProps.rawDoLog =
        requestProps.rawDoLogNotPriv &&
        !requestProps.url.pathname.startsWith('/api/') &&
        !(otherServerBool && (
          otherServer.noLogURLs.has(slicedPath) ||
          otherServer.noLogUrlStarts.some(x => slicedPath.startsWith(x))
        ));
      
      requestProps.doLogNotPriv = requestProps.rawDoLogNotPriv;
      requestProps.doLog = requestProps.rawDoLog;
    } else {
      requestProps.rawDoLog =
        !requestProps.url.pathname.startsWith('/api/') &&
        !(otherServerBool && (
          otherServer.noLogURLs.has(slicedPath) ||
          otherServer.noLogUrlStarts.some(x => slicedPath.startsWith(x))
        ));
      
      requestProps.doLogNotPriv = true;
      requestProps.doLog = true;
    }
  } else {
    requestProps.rawDoLogNotPriv = false;
    requestProps.rawDoLog = false;
    requestProps.doLogNotPriv = false;
    requestProps.doLog = false;
  }
  
  return requestProps;
};

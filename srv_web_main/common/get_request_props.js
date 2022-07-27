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
      requestProps.url = new URL(`${urlProto}://[${requestProps.host}]:${requestProps.proto == 'http' ? env.SRV_WEB_MAIN_HTTP_PORT : env.SRV_WEB_MAIN_HTTPS_PORT}${requestProps.urlString}`);
    else
      requestProps.url = new URL(`${urlProto}://${requestProps.host}${requestProps.urlString}`);
  } catch (err) {
    logger.warn('Error parsing url');
    logger.warn([requestProps.proto, requestProps.host, requestProps.urlString]);
    logger.warn(err);
    requestProps.url = new URL(`${urlProto}://NULL/null`);
  }
  
  requestProps.url.path = requestProps.url.href.slice(requestProps.url.origin.length);
  
  let otherServerHostSrvName = constVars.otherServerHosts.get(requestProps.url.host);
  let otherServerURLStartStr = constVars.otherServerURLStartsArr.find(x => requestProps.url.pathname.startsWith(x));
  let otherServerURLStartSrvName = otherServerURLStartStr ? constVars.otherServerURLStarts.get(otherServerURLStartStr) : null;
  
  let isHost = Boolean(otherServerHostSrvName), isPrefix = Boolean(otherServerURLStartSrvName);
  
  let otherServerBool = isHost || isPrefix;
  
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
      noLogURLs: otherServerInfo.noLogURLs,
      noLogUrlStarts: otherServerInfo.noLogUrlStarts,
      slicedPath,
    };
    requestProps.otherServerOnline = env[otherServerName.toUpperCase() + '_ENABLED'];
  } else {
    slicedPath = requestProps.url.path;
  }
  
  requestProps.doLog = env.SRV_WEB_MAIN_LOG_REQUESTS &&
    !requestProps.url.pathname.startsWith('/api/') &&
    !(otherServerBool && (
      otherServer.noLogURLs.has(slicedPath) ||
      otherServer.noLogUrlStarts.some(x => slicedPath.startsWith(x))
    ));
  
  return requestProps;
};
module.exports = {
  getPublicPath: pathName => {
    if (pathName.endsWith('/') || !pathName)
      pathName += 'index.html';
    
    try {
      pathName = decodeURI(pathName);
    } catch (err) { /* empty */ }
    
    return 'websites/public' + (pathName.startsWith('/') ? pathName : '/' + pathName);
  },
  
  getReqLogStr: requestProps => {
    let id = requestProps.id.toString().padStart(5, '0'),
      ip = requestProps.ip,
      proto = requestProps.proto.padEnd(5, ' '),
      logStatus = (requestProps.rawDoLogNotPriv ? '' : ' PRIVATE') + (requestProps.rawDoLog ? '' : ' NOLOG'),
      host = requestProps.rawHost ?? 'NULL',
      method = requestProps.method,
      url = requestProps.rawUrl;
    
    if (requestProps.httpVersion == 1) {
      if (method != 'upgrade')
        return `${id} ${ip} ${proto}${logStatus} ${host} ${method} ${url}`;
      else
        return `${id} ${ip} ${proto}${logStatus} ${host} upgrade:${requestProps.headers.upgrade} ${method} ${url}`;
    } else {
      if (method != 'connect')
        return `${id} ${ip} ${proto}${logStatus} ${host} ${method} ${url}`;
      else
        return `${id} ${ip} ${proto}${logStatus} ${host} connect:${requestProps.headers[':protocol']} ${url}`;
    }
  },
};

var path = require('path');

module.exports = exports = {
  formatIP: ip => {
    if (typeof ip != 'string') return '';
    if (/^::ffff:[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(ip))
      return '::ffff:' + ip.slice(7, Infinity).split('.').map(x => x.padStart('-', 3)).join('.');
    else if (/^[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}$/.test(ip))
      return ip.split('.').map(x => x.padStart('-', 3)).join('.');
    else
      return ip;
  },
  
  isSubDir: (parent, dir) => {
    var relativePath = path.relative(parent, dir);
    return relativePath && relativePath != '..' && !relativePath.startsWith('../');
  },
  
  getRequestProps: (req, res, type) => {
    var requestProps = {
      type,
      req, res,
      ip: req.socket.remoteAddress,
      proto: req.socket.encrypted ? 'https' : 'http',
      host: null,
      urlString: null,
      url: null,
      timestamp: new Date(),
      id: currentRequestID++,
    };
    
    if ('host' in req.headers) {
      if (/[a-z0-9-]+/.test(req.headers.host))
        requestProps.host = req.headers.host;
      else
        requestProps.host = 'INVALID';
    } else {
      requestProps.host = 'NULL';
    }
    
    requestProps.urlString = req.url.replace(/[@:]+/g, '');
    
    if (!requestProps.urlString.startsWith('/'))
      requestProps.urlString = '/' + requestProps.urlString;
    
    requestProps.url = new URL(`${requestProps.proto == 'http' ? 'http' : 'https'}://${requestProps.host}${requestProps.urlString}`);
    
    return requestProps;
  },
  
  getReqLogStr: requestProps =>
    `${requestProps.id.toString().padStart(5, '0')} ${exports.formatIP(requestProps.ip)} ${requestProps.proto.padEnd(5, ' ')} ${requestProps.req.method} ${requestProps.req.url}`,
  
  resp: require('./resp'),
};

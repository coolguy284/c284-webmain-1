var path = require('path');

module.exports = {
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
  
  ipv6ToHex: ip => {
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
};

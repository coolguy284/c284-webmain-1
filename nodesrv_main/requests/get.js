var path = require('path');
var common = require('../common');
var unicode = require('../common/unicode');

module.exports = async function getMethod(requestProps) {
  var publicPath = path.join('websites/public', decodeURI(requestProps.url.pathname.endsWith('/') || !requestProps.url.pathname ? requestProps.url.pathname + 'index.html' : requestProps.url.pathname));
  
  if (!common.isSubDir('websites/public', publicPath)) {
    await common.resp.s404(requestProps);
    return;
  }
  
  let match;
  
  if (requestProps.url.pathname.startsWith('/api/')) {
    if (requestProps.url.pathname == '/api/echo/ip') {
      let sendPort = requestProps.url.searchParams.get('port');
      sendPort = sendPort && sendPort != 'false' && sendPort != '0';
      await common.resp.headers(requestProps, 200, { 'content-type': 'text/plain; charset=utf-8' });
      await common.resp.end(requestProps, sendPort ? common.mergeIPPort(requestProps.ip, requestProps.port) : requestProps.ip);
    }
    
    else if (requestProps.url.pathname == '/api/echo/ipv4') {
      let sendPort = requestProps.url.searchParams.get('port');
      sendPort = sendPort && sendPort != 'false' && sendPort != '0';
      if (/^(?:::ffff:)?(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(requestProps.ip)) {
        let ip = requestProps.ip.replace('::ffff:', '');
        await common.resp.headers(requestProps, 200, { 'content-type': 'text/plain; charset=utf-8' });
        await common.resp.end(requestProps, sendPort ? common.mergeIPPort(ip, requestProps.port) : ip);
      } else {
        await common.resp.headers(requestProps, 500, { 'content-type': 'text/plain; charset=utf-8' });
        await common.resp.end(requestProps, 'Error: client address not IPv4');
      }
    }
    
    else if (requestProps.url.pathname == '/api/echo/ipv6') {
      let sendPort = requestProps.url.searchParams.get('port');
      sendPort = sendPort && sendPort != 'false' && sendPort != '0';
      if (/^::ffff:?(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(requestProps.ip)) {
        let ip = requestProps.ip.slice(7).split('.').map((x, i, a) => i % 2 && a[i - 1] != '0' ? parseInt(x).toString(16).padStart(2, '0') : parseInt(x).toString(16));
        ip = '::ffff:' + ip[0] + ip[1] + ':' + ip[2] + ip[3];
        await common.resp.headers(requestProps, 200, { 'content-type': 'text/plain; charset=utf-8' });
        await common.resp.end(requestProps, sendPort ? common.mergeIPPort(ip, requestProps.port) : ip);
      } else if (/^(?:[0-9a-f]{0,4}:){1,8}[0-9a-f]{0,4}$/.test(requestProps.ip)) {
        await common.resp.headers(requestProps, 200, { 'content-type': 'text/plain; charset=utf-8' });
        await common.resp.end(requestProps, sendPort ? common.mergeIPPort(ip, requestProps.port) : ip);
      } else {
        await common.resp.headers(requestProps, 500, { 'content-type': 'text/plain; charset=utf-8' });
        await common.resp.end(requestProps, 'Error: client address not IPv6');
      }
    }
    
    else if (requestProps.url.pathname == '/api/own_eyes/v1') {
      if (common.vars.ownEyesCodes.has(requestProps.url.searchParams.get('code'))) {
        await common.resp.headers(requestProps, 200, { 'content-type': 'text/plain; charset=utf-8' });
        await common.resp.end(requestProps, '<span><span><span>ｈ</span><span>ｅ</span>ｌ</span>ｏ</span>');
        common.vars.ownEyesCodes.delete(decodeURIComponent(requestProps.url.searchParams.get('code')));
      } else {
        await common.resp.headers(requestProps, 404, { 'content-type': 'text/plain; charset=utf-8' });
        await common.resp.end(requestProps, '');
      }
    }
    
    else if (requestProps.url.pathname == '/api/null') {
      await common.resp.headers(requestProps, 204);
      await common.resp.end(requestProps);
    }
    
    else {
      await common.resp.headers(requestProps, 500, { 'content-type': 'text/plain; charset=utf-8' });
      await common.resp.end(requestProps, 'Error: invalid API endpoint');
    }
  }
  
  else if (requestProps.url.pathname == '/r') {
    if (requestProps.url.search.startsWith('?u=')) {
      let file = Buffer.from((await fs.promises.readFile('websites/public/debug/templates/meta_redirect.html')).toString().replace('{redirect-url}', decodeURIComponent(requestProps.url.search.slice(3))));
      await common.resp.headers(requestProps, 200, common.resp.getBasicFileHeaders(file, 'text/html; charset=utf-8'));
      await common.resp.end(requestProps, file);
    } else if (requestProps.url.search.startsWith('?uh=')) {
      await common.resp.headers(requestProps, 303, { 'location': decodeURIComponent(requestProps.url.search.slice(4)) });
      await common.resp.end(requestProps);
    } else if (requestProps.url.search.startsWith('?e=')) {
      let file = Buffer.from((await fs.promises.readFile('websites/public/debug/templates/meta_redirect.html')).toString().replace('{redirect-url}', Buffer.from(requestProps.url.search.slice(3), 'base64').toString()));
      await common.resp.headers(requestProps, 200, common.resp.getBasicFileHeaders(file, 'text/html; charset=utf-8'));
      await common.resp.end(requestProps, file);
    } else if (requestProps.url.search.startsWith('?eh=')) {
      await common.resp.headers(requestProps, 303, { 'location': Buffer.from(requestProps.url.search.slice(3), 'base64').toString() });
      await common.resp.end(requestProps);
    }
  }
  
  else if (requestProps.url.pathname == '/no_source.html') {
    await common.resp.fileFull(
      requestProps, 'websites/public/no_source.html', null,
      { 'link': '<no_source.css>; rel="stylesheet"' }
    );
  }
  
  else if (requestProps.url.pathname == '/own_eyes.html') {
    let code = crypto.randomBytes(16).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    let file = Buffer.from((await fs.promises.readFile('websites/public/own_eyes.html')).toString().replace('{code}', code));
    await common.resp.headers(requestProps, 200, common.resp.getBasicFileHeaders(file, 'text/html; charset=utf-8'));
    await common.resp.end(requestProps, file);
    common.vars.ownEyesCodes.set(code, Date.now());
  }
  
  else if (requestProps.url.pathname.startsWith('/unicode/') && (match = /^\/unicode\/([Uu])\+((?:0?[0-9A-Fa-f]|10|)[0-9A-Fa-f]{4})$/.exec(requestProps.url.pathname))) {
    let fancyCodePoint = parseInt(match[2], 16).toString(16).toUpperCase().padStart(4, '0');
    if (match[1] == 'u' || fancyCodePoint != match[2]) {
      let newURL = new URL(requestProps.url);
      newURL.pathname = '/unicode/U+' + fancyCodePoint;
      newURL = newURL.href;
      
      await common.resp.headers(requestProps, 308, { 'location': newURL });
      await common.resp.end(requestProps);
    } else {
      let codePoint = match[2].toUpperCase();
      let unicodeChar = unicode.getEntry(codePoint);
      let file = Buffer.from(
        (await fs.promises.readFile('websites/public/debug/templates/unicode.html')).toString()
          .replaceAll('{code_point}', codePoint)
          .replaceAll('{category}', unicodeChar[1] ? unicode.categoryAbbr[unicodeChar[1]] : 'N/A')
          .replaceAll('{name}', unicodeChar[0] || 'N/A')
          .replaceAll('{alias}', unicodeChar[9] || 'N/A')
          .replaceAll('{name_alias}', unicodeChar[9] || unicodeChar[0] || 'N/A')
      );
      await common.resp.headers(requestProps, 200, common.resp.getBasicFileHeaders(file, 'text/html; charset=utf-8'));
      await common.resp.end(requestProps, file);
    }
  }
  
  else {
    await common.resp.fileFull(requestProps, publicPath);
  }
};

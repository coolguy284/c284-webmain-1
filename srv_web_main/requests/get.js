var common = require('../common');
var unicode = require('../common/unicode');

module.exports = async function getMethod(requestProps) {
  var publicPath = common.getPublicPath(requestProps.url.pathname);
  
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
      let sendPort = common.toBool(requestProps.url.searchParams.get('port'));
      let form = requestProps.url.searchParams.get('form');
      
      if (/^(?:::ffff:)?(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(requestProps.ip)) {
        let ip = requestProps.ip.replace('::ffff:', '');
        switch (form) {
          case 'bytes':
            await common.resp.data(
              requestProps,
              200,
              sendPort ?
                Buffer.from([ ...ip.split('.').map(x => Number(x)), Math.floor(requestProps.port / 256), requestProps.port % 256 ]) :
                Buffer.from([ ...ip.split('.').map(x => Number(x)) ]),
              { 'content-type': 'application/octet-stream' }
            );
            break;
          
          case 'hex':            
            await common.resp.data(
              requestProps,
              200,
              sendPort ?
                ip.split('.').map(x => Number(x).toString(16).padStart(2, '0')).join('') + requestProps.port.toString(16).padStart(4, '0') :
                ip.split('.').map(x => Number(x).toString(16).padStart(2, '0')).join('')
            );
            break;
          
          default:
            await common.resp.data(
              requestProps,
              200,
              sendPort ?
                common.mergeIPPort(ip, requestProps.port) :
                ip
            );
            break;
        }
      } else {
        await common.resp.data(requestProps, 500, 'Error: client address not IPv4');
      }
    }
    
    else if (requestProps.url.pathname == '/api/echo/ipv6') {
      let sendPort = common.toBool(requestProps.url.searchParams.get('port'));
      let form = requestProps.url.searchParams.get('form');
      
      let ip;
      if (/^::ffff:?(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(requestProps.ip)) {
        ip = requestProps.ip.slice(7).split('.').map(x => Number(x));
        ip = '::ffff:' + (ip[0] * 256 + ip[1]).toString(16) + ':' + (ip[2] * 256 + ip[3]).toString(16);;
      } else if (/^(?:[0-9a-f]{0,4}:){1,8}[0-9a-f]{0,4}$/.test(requestProps.ip)) {
        ip = requestProps.ip;
      } else {
        ip = null;
      }
      
      if (ip != null) {
        switch (form) {
          case 'bytes':
            await common.resp.data(
              requestProps,
              200,
              Buffer.from(
                sendPort ?
                  common.IPv6ToHex(requestProps.ip) + requestProps.port.toString(16).padStart(4, '0') :
                  common.IPv6ToHex(requestProps.ip),
                'hex'
              ),
              { 'content-type': 'application/octet-stream' }
            );
            break;
          
          case 'hex':
            await common.resp.data(
              requestProps,
              200,
              sendPort ?
                common.IPv6ToHex(requestProps.ip) + requestProps.port.toString(16).padStart(4, '0') :
                common.IPv6ToHex(requestProps.ip)
            );
            break;
          
          default:
            await common.resp.data(
              requestProps,
              200,
              sendPort ?
                common.mergeIPPort(requestProps.ip, requestProps.port) :
                requestProps.ip
            );
            break;
        }
      } else {
        await common.resp.data(requestProps, 500, 'Error: client address not IPv6');
      }
    }
    
    else if (requestProps.url.pathname == '/api/echo/headers') {
      let form = requestProps.url.searchParams.get('form');
      switch (form) {
        case 'json':
          await common.resp.data(
            requestProps,
            200,
            JSON.stringify(requestProps.headers),
            { 'content-type': 'application/json; charset=utf-8' }
          );
          break;
        
        default:
          await common.resp.data(
            requestProps,
            200,
            Object.entries(requestProps.headers)
              .map(x => `${x[0]}: ${x[1]}`)
              .join('\n')
          );
          break;
      }
    }
    
    else if (requestProps.url.pathname == '/api/query/current_time') {
      // hardcoded subtraction of 1ms due to observed delay from beginning of request processing to this statement
      let form = requestProps.url.searchParams.get('form');
      switch (form) {
        case 'number':
          await common.resp.data(requestProps, 200, Date.now() + '');
          break;
        
        default:
          await common.resp.data(requestProps, 200, new Date().toISOString());
          break;
      }
    }
    
    else if (requestProps.url.pathname == '/api/null') {
      await common.resp.data(requestProps, 204);
    }
    
    else {
      await common.resp.data(requestProps, 500, 'Error: invalid API endpoint');
    }
  }
  
  else if (requestProps.url.pathname == '/r') {
    if (requestProps.url.search.startsWith('?u=')) {
      let file = Buffer.from((process.env.SRV_WEB_MAIN_CACHE_MODE == '1' ? global.filesCache['websites/public/misc/debug/templates/meta_redirect.html'] : (await fs.promises.readFile('websites/public/misc/debug/templates/meta_redirect.html'))).toString().replace('{redirect-url}', decodeURIComponent(requestProps.url.search.slice(3))));
      await common.resp.headers(requestProps, 200, common.resp.getBasicFileHeaders(file, 'text/html; charset=utf-8'));
      await common.resp.end(requestProps, file);
    } else if (requestProps.url.search.startsWith('?uh=')) {
      await common.resp.headers(requestProps, 303, { 'location': decodeURIComponent(requestProps.url.search.slice(4)) });
      await common.resp.end(requestProps);
    } else if (requestProps.url.search.startsWith('?e=')) {
      let file = Buffer.from((process.env.SRV_WEB_MAIN_CACHE_MODE == '1' ? global.filesCache['websites/public/misc/debug/templates/meta_redirect.html'] : (await fs.promises.readFile('websites/public/misc/debug/templates/meta_redirect.html'))).toString().replace('{redirect-url}', Buffer.from(requestProps.url.search.slice(3), 'base64').toString()));
      await common.resp.headers(requestProps, 200, common.resp.getBasicFileHeaders(file, 'text/html; charset=utf-8'));
      await common.resp.end(requestProps, file);
    } else if (requestProps.url.search.startsWith('?eh=')) {
      await common.resp.headers(requestProps, 303, { 'location': Buffer.from(requestProps.url.search.slice(3), 'base64').toString() });
      await common.resp.end(requestProps);
    }
  }
  
  else if (requestProps.url.pathname == '/misc/no_source.html') {
    await common.resp.fileFull(
      requestProps, 'websites/public/misc/no_source.html', null,
      { 'link': '<no_source.css>; rel="stylesheet"' }
    );
  }
  
  else if (requestProps.url.pathname == '/misc/own_eyes.html') {
    let code = crypto.randomBytes(16).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    let file = process.env.SRV_WEB_MAIN_CACHE_MODE == '1' ? global.filesCache['websites/public/misc/own_eyes.html'] : (await fs.promises.readFile('websites/public/misc/own_eyes.html')).toString().replace('{code}', code);
    await common.resp.headers(requestProps, 200, common.resp.getBasicFileHeaders(file, 'text/html; charset=utf-8'));
    await common.resp.end(requestProps, file);
    common.vars.ownEyesCodes.set(code, Date.now());
  }
  
  else if (requestProps.url.pathname.startsWith('/misc/unicode/') && (match = /^\/misc\/unicode\/([Uu])\+((?:0?[0-9A-Fa-f]|10|)[0-9A-Fa-f]{4})$/.exec(requestProps.url.pathname))) {
    let fancyCodePoint = parseInt(match[2], 16).toString(16).toUpperCase().padStart(4, '0');
    if (match[1] == 'u' || fancyCodePoint != match[2]) {
      let newURL = new URL(requestProps.url);
      newURL.pathname = '/misc/unicode/U+' + fancyCodePoint;
      newURL = newURL.href;
      
      await common.resp.headers(requestProps, 308, { 'location': newURL });
      await common.resp.end(requestProps);
    } else {
      let codePoint = match[2].toUpperCase();
      let unicodeChar = unicode.getEntry(codePoint);
      let file = Buffer.from(
        (process.env.SRV_WEB_MAIN_CACHE_MODE == '1' ? global.filesCache['websites/public/misc/debug/templates/unicode.html'] : (await fs.promises.readFile('websites/public/misc/debug/templates/unicode.html'))).toString()
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
  
  else if (requestProps.url.pathname == '/yiyo.dev') {
    await common.resp.fileFull(
      requestProps, 'websites/public/yiyo.dev', null,
      { 'content-type': 'text/html; charset=utf-8' }
    );
  }
  
  else {
    await common.resp.fileFull(requestProps, publicPath);
  }
};
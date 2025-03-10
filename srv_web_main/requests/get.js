var crypto = require('crypto');
var fs = require('fs');
var canvas = require('canvas');
var { toBool, env } = require('../common/env');
var { getPublicPath } = require('../common/get_request_misc');
var { mergeIPPort, ipv6ToHex, isSubDir } = require('../common/misc');
var resp = require('../common/resp');
var unicode = require('../common/unicode');
var { vars: { ownEyesCodes } } = require('../common/vars');

module.exports = async function getMethod(requestProps) {
  var publicPath = getPublicPath(requestProps.url.pathname);
  
  if (!isSubDir('websites/public', publicPath)) {
    await resp.s404(requestProps);
    return;
  }
  
  let match;
  
  if (requestProps.url.pathname.startsWith('/api/')) {
    if (requestProps.url.pathname == '/api/echo/ip') {
      let sendPort = requestProps.url.searchParams.get('port');
      sendPort = sendPort && sendPort != 'false' && sendPort != '0';
      await resp.headers(requestProps, 200, { 'content-type': 'text/plain; charset=utf-8' });
      await resp.end(requestProps, sendPort ? mergeIPPort(requestProps.ipv6Cast, requestProps.port) : requestProps.ipv6Cast);
    }
    
    else if (requestProps.url.pathname == '/api/echo/ipv4') {
      let sendPort = toBool(requestProps.url.searchParams.get('port'));
      let form = requestProps.url.searchParams.get('form');
      
      if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(requestProps.ip)) {
        switch (form) {
          case 'bytes':
            await resp.data(
              requestProps,
              200,
              sendPort ?
                Buffer.from([ ...requestProps.ip.split('.').map(x => Number(x)), Math.floor(requestProps.port / 256), requestProps.port % 256 ]) :
                Buffer.from([ ...requestProps.ip.split('.').map(x => Number(x)) ]),
              { 'content-type': 'application/octet-stream' }
            );
            break;
          
          case 'hex':
            await resp.data(
              requestProps,
              200,
              sendPort ?
                requestProps.ip.split('.').map(x => Number(x).toString(16).padStart(2, '0')).join('') + requestProps.port.toString(16).padStart(4, '0') :
                requestProps.ip.split('.').map(x => Number(x).toString(16).padStart(2, '0')).join('')
            );
            break;
          
          default:
            await resp.data(
              requestProps,
              200,
              sendPort ?
                mergeIPPort(requestProps.ip, requestProps.port) :
                requestProps.ip
            );
            break;
        }
      } else {
        await resp.data(requestProps, 500, 'Error: client address not IPv4');
      }
    }
    
    else if (requestProps.url.pathname == '/api/echo/ipv6') {
      let sendPort = toBool(requestProps.url.searchParams.get('port'));
      let form = requestProps.url.searchParams.get('form');
      
      let ip;
      if (/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(requestProps.ip)) {
        ip = requestProps.ip.split('.').map(x => Number(x));
        ip = '::ffff:' + (ip[0] * 256 + ip[1]).toString(16) + ':' + (ip[2] * 256 + ip[3]).toString(16);
      } else if (/^(?:[0-9a-f]{0,4}:){1,8}[0-9a-f]{0,4}$/.test(requestProps.ip)) {
        ip = requestProps.ip;
      } else {
        ip = null;
      }
      
      if (ip != null) {
        switch (form) {
          case 'bytes':
            await resp.data(
              requestProps,
              200,
              Buffer.from(
                sendPort ?
                  ipv6ToHex(ip) + requestProps.port.toString(16).padStart(4, '0') :
                  ipv6ToHex(ip),
                'hex'
              ),
              { 'content-type': 'application/octet-stream' }
            );
            break;
          
          case 'hex':
            await resp.data(
              requestProps,
              200,
              sendPort ?
                ipv6ToHex(ip) + requestProps.port.toString(16).padStart(4, '0') :
                ipv6ToHex(ip)
            );
            break;
          
          default:
            await resp.data(
              requestProps,
              200,
              sendPort ?
                mergeIPPort(ip, requestProps.port) :
                ip
            );
            break;
        }
      } else {
        await resp.data(requestProps, 500, 'Error: client address not IPv6');
      }
    }
    
    else if (requestProps.url.pathname == '/api/echo/headers') {
      let form = requestProps.url.searchParams.get('form');
      switch (form) {
        case 'json':
          await resp.data(
            requestProps,
            200,
            JSON.stringify(requestProps.headers),
            { 'content-type': 'application/json; charset=utf-8' }
          );
          break;
        
        default:
          await resp.data(
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
          await resp.data(requestProps, 200, Date.now() + '');
          break;
        
        default:
          await resp.data(requestProps, 200, new Date().toISOString());
          break;
      }
    }
    
    else if (requestProps.url.pathname == '/api/current-time.png') {
      let imgCanvas = canvas.createCanvas(400, 400);
      let ctx = imgCanvas.getContext('2d');
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 400, 400);
      let date;
      let offset = requestProps.url.searchParams.get('offsetmins');
      if (offset == null) {
        date = new Date();
      } else {
        offset = Number(offset);
        if (Number.isFinite(offset)) {
          date = new Date(Date.now() + offset * 60_000);
        } else {
          date = null;
        }
      }
      ctx.fillStyle = 'black';
      ctx.font = '24px Liberation Sans';
      if (date != null) {
        ctx.fillText(
          'It is currently ' +
          ((date.getUTCHours() + 11) % 12 + 1 + '').padStart(2, '0') + ':' +
          (date.getUTCMinutes() + '').padStart(2, '0') + ':' +
          (date.getUTCSeconds() + '').padStart(2, '0') + ' ' +
          (date.getUTCHours() >= 12 ? 'PM' : 'AM'),
          50, 206
        );
      } else {
        ctx.fillText(
          'Timezone offset invalid',
          50, 206
        );
      }
      await resp.headers(requestProps, 200, {
        'content-type': 'image/png' ,
        'cache-control': 'no-cache'
      });
      await resp.stream(requestProps, imgCanvas.createPNGStream({ compressionLevel: 4 }));
    }
    
    else if (requestProps.url.pathname == '/api/null') {
      await resp.data(requestProps, 204);
    }
    
    else {
      await resp.data(requestProps, 400, 'Error: invalid API endpoint');
    }
  }
  
  else if (requestProps.url.pathname == '/r') {
    if (requestProps.url.search.startsWith('?u=')) {
      let file = Buffer.from((env.SRV_WEB_MAIN_CACHE_MODE == 1 ? global.filesCache['websites/public/debug/templates/meta_redirect.html'] : (await fs.promises.readFile('websites/public/debug/templates/meta_redirect.html'))).toString().replace('{redirect-url}', decodeURIComponent(requestProps.url.search.slice(3))));
      await resp.headers(requestProps, 200, resp.getBasicFileHeaders(requestProps, file, 'text/html; charset=utf-8'));
      await resp.end(requestProps, file);
    } else if (requestProps.url.search.startsWith('?uh=')) {
      await resp.headers(requestProps, 303, { 'location': decodeURIComponent(requestProps.url.search.slice(4)) });
      await resp.end(requestProps);
    } else if (requestProps.url.search.startsWith('?e=')) {
      let file = Buffer.from((env.SRV_WEB_MAIN_CACHE_MODE == 1 ? global.filesCache['websites/public/debug/templates/meta_redirect.html'] : (await fs.promises.readFile('websites/public/debug/templates/meta_redirect.html'))).toString().replace('{redirect-url}', Buffer.from(requestProps.url.search.slice(3), 'base64').toString()));
      await resp.headers(requestProps, 200, resp.getBasicFileHeaders(requestProps, file, 'text/html; charset=utf-8'));
      await resp.end(requestProps, file);
    } else if (requestProps.url.search.startsWith('?eh=')) {
      await resp.headers(requestProps, 303, { 'location': Buffer.from(requestProps.url.search.slice(3), 'base64').toString() });
      await resp.end(requestProps);
    } else {
      await resp.data(requestProps, 400, 'Error: invalid API endpoint');
    }
  }
  
  else if (requestProps.url.pathname == '/misc/no_source.html') {
    await resp.fileFull(
      requestProps, 'websites/public/misc/no_source.html', null,
      { 'link': '<no_source.css>; rel="stylesheet"' }
    );
  }
  
  else if (requestProps.url.pathname == '/misc/own_eyes.html') {
    let code = crypto.randomBytes(16).toString('base64').replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
    let file = env.SRV_WEB_MAIN_CACHE_MODE == 1 ? global.filesCache['websites/public/misc/own_eyes.html'] : (await fs.promises.readFile('websites/public/misc/own_eyes.html')).toString().replace('{code}', code);
    await resp.headers(requestProps, 200, resp.getBasicFileHeaders(requestProps, file, 'text/html; charset=utf-8'));
    await resp.end(requestProps, file);
    ownEyesCodes.set(code, Date.now());
  }
  
  else if (requestProps.url.pathname.startsWith('/unicode/') && (match = /^\/unicode\/(?:U\+((?:[0-9A-F]|10)?[0-9A-F]{4})|random)$/.exec(requestProps.url.pathname))) {
    if (!match[1]) {
      let codePoint = unicode.validNonRangeChars[Math.floor(Math.random() * unicode.validNonRangeChars.length)].toString(16).toUpperCase().padStart(4, '0');
      let newURL = new URL(requestProps.url);
      newURL.pathname = '/unicode/U+' + codePoint;
      newURL = newURL.href;
      
      await resp.headers(requestProps, 307, { 'location': newURL });
      await resp.end(requestProps);
    } else {
      let codePoint = match[1];
      let unicodeChar = unicode.getEntry(codePoint);
      let file = Buffer.from(
        (env.SRV_WEB_MAIN_CACHE_MODE == 1 ? global.filesCache['websites/public/debug/templates/unicode.html'] : (await fs.promises.readFile('websites/public/debug/templates/unicode.html'))).toString()
          .replaceAll('{code_point}', codePoint)
          .replaceAll('{category}', unicodeChar[1] ? unicode.categoryAbbr[unicodeChar[1]] : 'N/A')
          .replaceAll('{name}', unicodeChar[0] || 'N/A')
          .replaceAll('{alias}', unicodeChar[9] || 'N/A')
          .replaceAll('{name_alias}', unicodeChar[9] || unicodeChar[0] || 'N/A')
      );
      await resp.headers(requestProps, 200, resp.getBasicFileHeaders(requestProps, file, 'text/html; charset=utf-8'));
      await resp.end(requestProps, file);
    }
  }
  
  else if (requestProps.url.pathname == '/yiyo.dev') {
    await resp.fileFull(
      requestProps, 'websites/public/yiyo.dev', null,
      { 'content-type': 'text/html; charset=utf-8' }
    );
  }
  
  else {
    await resp.fileFull(requestProps, publicPath);
  }
};

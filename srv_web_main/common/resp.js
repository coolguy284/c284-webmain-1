var logger = require('../log_utils')('common/resp');

var fs = require('fs');
var mime = require('mime');
var env = require('./env').env;
var websiteData = require('./website_data');
var etags; try { etags = require('../websites/etags.json'); } catch (e) { etags = {}; }
var modtimes; try { modtimes = require('../websites/modtimes.json'); } catch (e) { modtimes = {}; }

module.exports = exports = {
  getBasicFileHeaders: (file, mimeType) => {
    return {
      'content-type': mimeType || 'text/plain; charset=utf-8',
      'content-length': file.length,
      'last-modified': new Date().toUTCString(),
      'cache-control': 'no-cache',
      'accept-ranges': 'none',
      'x-content-type-options': 'nosniff',
      'strict-transport-security': 'max-age=31536000; preload',
    };
  },
  
  getBasicFileHeadersHead: (fileLength, mimeType) => {
    return {
      'content-type': mimeType || 'text/plain; charset=utf-8',
      'content-length': fileLength,
      'last-modified': new Date().toUTCString(),
      'cache-control': 'no-cache',
      'accept-ranges': 'none',
      'x-content-type-options': 'nosniff',
      'strict-transport-security': 'max-age=31536000; preload',
    };
  },
  
  _wsInvalidHttp2Headers: new Set(['upgrade', 'connection']),
  
  // http1.1: (WSServer, requestProps, req, socket, head)
  // http2: (WSServer, requestProps)
  ws: (WSServer, requestProps, ...args) => {
    switch (requestProps.httpVersion) {
      case 1: {
        let [ req, socket, head ] = args;
        WSServer.handleUpgrade(req, socket, head, ws => {
          WSServer.emit('connection', ws, req, requestProps);
        });
        break;
      }
      
      case 2: {
        let req = {
          method: 'GET',
          headers: { ...requestProps.headers, 'sec-websocket-key': 'aaaaaaaaaaaaaaaaaaaaaa==', upgrade: 'websocket' },
        };
        
        let streamWrite = requestProps.stream.write;
        requestProps.stream.write = msg => {
          let wsHeaders = Object.fromEntries(
            msg
              .split('\r\n')
              .slice(1, -2)
              .map(x => (/^([^:]*): (.*)$/.exec(x) ?? []).slice(1))
              .filter(x => x.length > 0 && !exports._wsInvalidHttp2Headers.has(x[0].toLowerCase()))
          );
          requestProps.stream.respond({
            ':status': 200,
            ...wsHeaders,
          });
          requestProps.stream.write = streamWrite;
        };
        
        requestProps.stream.setNoDelay = () => {};
        
        WSServer.handleUpgrade(req, requestProps.stream, Buffer.alloc(0), ws => {
          WSServer.emit('connection', ws, req, requestProps);
        });
        break;
      }
    }
  },
  
  // http 1.1 only
  manual404: (req, socket) => {
    socket.write(`HTTP/${req.httpVersion} 404 Not Found\r\n\r\n`);
    socket.end();
  },
  
  _httpInvalidHttp2Headers: new Set(['connection', 'transfer-encoding']),
  
  headers: async (requestProps, statusCode, headers) => {
    try {
      if (requestProps.httpVersion == 1)
        requestProps.res.writeHead(statusCode, headers);
      else if (requestProps.httpVersion == 2)
        requestProps.stream.respond({ ':status': statusCode, ...headers });
    } catch (err) {
      if (err.code == 'ERR_HTTP2_INVALID_STREAM') {
        logger.warn('http2 stream unexpectedly closed');
      }
    }
  },
  
  end: async (requestProps, str) => {
    try {
      if (requestProps.httpVersion == 1)
        requestProps.res.end(str);
      else if (requestProps.httpVersion == 2)
        requestProps.stream.end(str);
    } catch (err) {
      if (err.code == 'ERR_HTTP2_INVALID_STREAM') {
        logger.warn('http2 stream unexpectedly closed');
      }
    }
  },
  
  stream: async (requestProps, stream) => {
    try {
      if (requestProps.httpVersion == 1)
        stream.pipe(requestProps.res);
      else if (requestProps.httpVersion == 2)
        stream.pipe(requestProps.stream);
    } catch (err) {
      if (err.code == 'ERR_HTTP2_INVALID_STREAM') {
        logger.warn('http2 stream unexpectedly closed');
      }
    }
  },
  
  getStream: (requestProps) => {
    if (requestProps.httpVersion == 1)
      return requestProps.req;
    else if (requestProps.httpVersion == 2)
      return requestProps.stream;
  },
  
  getStreamBuffer: async (requestProps) => {
    let stream = exports.getStream(requestProps);
    
    let chunks = [];
    
    stream.on('data', chunk => chunks.push(chunk));
    
    return await new Promise((resolve, reject) => {
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', err => reject(err));
    });
  },
  
  _fileModSinceCheck: (requestProps, statusCode, shortPath, mtime) => {
    if (statusCode) return true;
    
    let noneMatchHeader = requestProps.headers['if-none-match'], pageEtag;
    if (noneMatchHeader && (pageEtag = etags[shortPath]) != null)
      return !noneMatchHeader.split(', ').some(x => x == pageEtag);
    
    let modifiedSinceHeader = requestProps.headers['if-modified-since'];
    if (!modifiedSinceHeader) return true;
    
    let fileMtimeFloor = Math.floor(mtime.getTime() / 1000);
    let headerMtimeFloor = Math.floor(new Date(modifiedSinceHeader).getTime() / 1000);
    
    if (Object.is(fileMtimeFloor, NaN) || Object.is(headerMtimeFloor, NaN)) return true;
    
    return fileMtimeFloor > headerMtimeFloor;
  },
  
  file: async (requestProps, filename, statusCode, headOnly, headers) => {
    var shortPath = filename.replace(/\\/g, '/').replace('websites/public/', '') || 'index.html';
    
    var stats, size, mtime;
    
    // throw enoent if path has extra slashes
    if (/\/\/+/.test(filename)) {
      let error = new Error('ENOENT'); error.code = 'ENOENT';
      throw error;
    }
    
    // this is supposed to throw on purpose unless filename is a file so functions like fileFull know when to send a 404
    if (env.SRV_WEB_MAIN_CACHE_MODE == 1) {
      if (!(filename in global.filesCache)) {
        let error = new Error('ENOENT'); error.code = 'ENOENT';
        throw error;
      }
      
      var fileEntry = global.filesCache[filename];
      
      stats = fileEntry.stats;
      size = fileEntry.file.length;
      mtime = modtimes[shortPath] ? new Date(modtimes[shortPath]) : fileEntry.stats.mtime;
    } else {
      stats = await fs.promises.stat(filename);
      
      if (stats.isDirectory()) {
        let error = new Error('EISDIR'); error.code = 'EISDIR';
        throw error;
      }
      
      size = stats.size;
      mtime = modtimes[shortPath] ? new Date(modtimes[shortPath]) : stats.mtime;
    }
    
    var mimeType = mime.getType(filename);
    mimeType = mimeType ? `${mimeType}${mimeType.split('/')[0] == 'text' || mimeType == 'application/javascript' ? '; charset=utf-8' : ''}` : null;
    
    // range headers
    if (requestProps.headers.range && !statusCode && !headers) {
      // check if it matches bytes=xxxx-xxxx form (multipart not supported yet)
      if (/^bytes=[0-9]*-[0-9]*$/.test(requestProps.headers.range)) {
        let [ start, end ] = requestProps.headers.range.slice(6).split('-');
        
        if (!start && !end) {
          // bytes=- is invalid
          await exports.headers(requestProps, 416, { 'content-range': `*/${size}` });
          await exports.end(requestProps);
        } else {
          if (!start && end) {
            // bytes=-xxxx is not from beginning to point, it is a certain number of bytes from the end
            start = size - Number(end);
            end = size - 1;
          } else if (start && !end) {
            // bytes=xxxx- goes from a point to the end
            start = Number(start);
            end = size - 1;
          } else {
            // bytes=xxxx-xxxx for a range
            start = Number(start);
            end = Number(end);
          }
          
          // check for range parts not being an int, start or end being out of bounds, or end being less than start
          if (!Number.isSafeInteger(start) || start < 0 || start > size ||
            !Number.isSafeInteger(end) || end < 0 || end > size || end < start) {
            await exports.headers(requestProps, 416, { 'content-range': `*/${size}` });
            await exports.end(requestProps);
          } else {
            // everything is correct
            
            // check for etag or modified since and no statusCode var set
            let modifiedSince = exports._fileModSinceCheck(requestProps, statusCode, shortPath, mtime);
            
            let flags = websiteData[filename.replace(/\\/g, '/').replace('websites/public/', '')];
            
            if (modifiedSince) {
              // modified since
              await exports.headers(requestProps, 206, {
                ...(mimeType ? { 'content-type': mimeType } : null),
                'content-length': end - start + 1,
                'content-range': `bytes ${start}-${end}/${size}`,
                'last-modified': mtime.toUTCString(),
                ...(etags[shortPath] ? { 'etag': etags[shortPath] } : {}),
                'cache-control': flags & 1 ? 'public, max-age=604800, immutable' : 'no-cache',
                'x-content-type-options': 'nosniff',
                'strict-transport-security': 'max-age=31536000; preload',
              });
              
              if (headOnly) {
                await exports.end(requestProps);
              } else {
                if (env.SRV_WEB_MAIN_CACHE_MODE == 1) {
                  await exports.end(requestProps, fileEntry.file.slice(start, end));
                } else {
                  let readStream = fs.createReadStream(filename, { start, end });
                  await exports.stream(requestProps, readStream);
                  readStream.on('error', x => logger.error(x));
                }
              }
            } else {
              // not modified since
              
              await exports.headers(requestProps, 304, {
                ...(etags[shortPath] ? { 'etag': etags[shortPath] } : {}),
                'cache-control': flags & 1 ? 'public, max-age=604800, immutable' : 'no-cache',
                'strict-transport-security': 'max-age=31536000; preload',
                ...headers,
              });
              await exports.end(requestProps);
            }
          }
        }
      } else {
        await exports.headers(requestProps, 416, {
          'content-range': `*/${size}`,
          'strict-transport-security': 'max-age=31536000; preload',
        });
        await exports.end(requestProps);
      }
    } else {
      // normal request
      
      // check for etag or modified since and no statusCode var set
      let modifiedSince = exports._fileModSinceCheck(requestProps, statusCode, shortPath, mtime);
      
      if (modifiedSince) {
        // modified since
        let encodings;
        if (requestProps.headers['accept-encoding'])
          encodings = new Set(requestProps.headers['accept-encoding'].split(', ').map(x => x.split(';')[0]));
        else
          encodings = new Set();
        
        let flags = websiteData[shortPath];
        
        let hasVal = 0, stat;
        if (encodings.has('br') || encodings.has('*')) {
          if (env.SRV_WEB_MAIN_CACHE_MODE == 1) {
            stat = global.filesCache[filename + '.br'];
            stat ? (size = stat.file.length, filename += '.br') : hasVal++;
          } else {
            try {
              stat = await fs.promises.stat(filename + '.br');
              stat.isDirectory() ? hasVal++ : (size = stat.size, filename += '.br');
            } catch (e) { hasVal++; }
          }
        } else hasVal++;
        if (hasVal == 1) {
          if (encodings.has('gzip')) {
            if (env.SRV_WEB_MAIN_CACHE_MODE == 1) {
              stat = global.filesCache[filename + '.gz'];
              stat ? (size = stat.file.length, filename += '.gz') : hasVal++;
            } else {
              try {
                stat = await fs.promises.stat(filename + '.gz');
                stat.isDirectory() ? hasVal++ : (size = stat.size, filename += '.gz');
              } catch (e) { hasVal++; }
            }
          } else hasVal++;
        }
        
        await exports.headers(requestProps, statusCode || 200, {
          ...(mimeType ? { 'content-type': mimeType } : null),
          'content-length': size,
          ...(hasVal < 2 ? { 'content-encoding': hasVal == 0 ? 'br' : 'gzip' } : {}),
          'last-modified': mtime.toUTCString(),
          ...(etags[shortPath] ? { 'etag': etags[shortPath] } : {}),
          'cache-control': flags & 1 ? 'public, max-age=604800, immutable' : 'no-cache',
          'accept-ranges': 'bytes',
          'x-content-type-options': 'nosniff',
          'strict-transport-security': 'max-age=31536000; preload',
          ...headers,
        });
        
        if (headOnly) {
          await exports.end(requestProps);
        } else {
          if (env.SRV_WEB_MAIN_CACHE_MODE == 1) {
            await exports.end(requestProps, fileEntry.file);
          } else {
            let readStream = fs.createReadStream(filename);
            await exports.stream(requestProps, readStream);
            readStream.on('error', x => logger.error(x));
          }
        }
      } else {
        // not modified since
        let flags = websiteData[filename.replace(/\\/g, '/').replace('websites/public/', '')];
        
        await exports.headers(requestProps, 304, {
          ...(etags[shortPath] ? { 'etag': etags[shortPath] } : {}),
          'cache-control': flags & 1 ? 'public, max-age=604800, immutable' : 'no-cache',
          'strict-transport-security': 'max-age=31536000; preload',
          ...headers,
        });
        await exports.end(requestProps);
      }
    }
  },
  
  s404: async (requestProps, headOnly) => {
    try {
      await exports.file(requestProps, 'websites/public/misc/debug/templates/404.html', 404, headOnly);
    } catch (err) {
      if (err.code == 'ERR_HTTP2_INVALID_STREAM') {
        logger.warn('http2 stream unexpectedly closed');
      } else {
        await exports.headers(requestProps, 404, { 'content-type': 'text/plain; charset=utf-8' });
        if (headOnly)
          await exports.end(requestProps);
        else
          await exports.end(requestProps, '404 Not Found');
      }
    }
  },
  
  s500: async (requestProps, headOnly) => {
    try {
      await exports.file(requestProps, 'websites/public/misc/debug/templates/500.html', 500, headOnly);
    } catch (err) {
      if (err.code == 'ERR_HTTP2_INVALID_STREAM') {
        logger.warn('http2 stream unexpectedly closed');
      } else {
        await exports.headers(requestProps, 500, { 'content-type': 'text/plain; charset=utf-8' });
        if (headOnly)
          await exports.end(requestProps);
        else
          await exports.end(requestProps, '500 Internal Server Error');
      }
    }
  },
  
  s502_subsrv_offline: async requestProps => {
    try {
      await exports.file(requestProps, 'websites/public/misc/debug/templates/502_subsrv_offline.html', 502);
    } catch (err) {
      if (err.code == 'ERR_HTTP2_INVALID_STREAM') {
        logger.warn('http2 stream unexpectedly closed');
      } else {
        await exports.headers(requestProps, 502, { 'content-type': 'text/plain; charset=utf-8' });
        await exports.end(requestProps, '502 Bad Gateway (Subserver Offline)');
      }
    }
  },
  
  fileFull: async (requestProps, filename, headOnly, headers) => {
    try {
      await exports.file(requestProps, process.platform.startsWith('win') ? filename.replaceAll('\\', '/') : filename, null, headOnly, headers);
    } catch (err) {
      if (err.code == 'ENOENT' || err.code == 'ENOTDIR' || err.code == 'EISDIR') {
        await exports.s404(requestProps, headOnly);
      } else if (err.code == 'ERR_HTTP2_INVALID_STREAM') {
        logger.warn('http2 stream unexpectedly closed');
      } else {
        logger.error(err);
        await exports.s500(requestProps, headOnly);
      }
    }
  },
  
  data: async (requestProps, statusCode, data, headers) => {
    await exports.headers(requestProps, statusCode, { 'content-type': 'text/plain; charset=utf-8', ...headers });
    await exports.end(requestProps, data);
  },
};

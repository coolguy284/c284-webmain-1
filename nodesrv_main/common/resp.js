var fs = require('fs');
var mime = require('mime');
var websiteData = require('./websitedata');
try { var etags = require('../websites/etags.json'); } catch (e) { var etags = {}; }

var logger = require('../logutils.js')('common/resp');

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
  
  // http1.1: (WSServer, req, socket, head, requestProps)
  // http2: (WSServer, requestProps)
  ws: (WSServer, ...args) => {
    if (args.length == 4) {
      let [ req, socket, head, requestProps ] = args;
      WSServer.handleUpgrade(req, socket, head, ws => {
        WSServer.emit('connection', ws, req, requestProps);
      });
    } else {
      let [ requestProps ] = args;
      
      let req = {
        method: 'GET',
        headers: { ...requestProps.headers, 'sec-websocket-key': 'aaaaaaaaaaaaaaaaaaaaaa==', upgrade: 'websocket' },
      };
      
      let streamWrite = requestProps.stream.write;
      requestProps.stream.write = v => {
        requestProps.stream.respond({ ':status': 200 });
        requestProps.stream.write = streamWrite;
      };
      
      requestProps.stream.setNoDelay = () => {};
      
      WSServer.handleUpgrade(req, requestProps.stream, Buffer.alloc(0), ws => {
        WSServer.emit('connection', ws, req, requestProps);
      });
    }
  },
  
  headers: async (requestProps, statusCode, headers) => {
    if (requestProps.httpVersion == 1)
      requestProps.res.writeHead(statusCode, headers);
    else if (requestProps.httpVersion == 2)
      requestProps.stream.respond({ ':status': statusCode, ...headers });
  },
  
  end: async (requestProps, str) => {
    if (requestProps.httpVersion == 1)
      requestProps.res.end(str);
    else if (requestProps.httpVersion == 2)
      requestProps.stream.end(str);
  },
  
  stream: async (requestProps, stream) => {
    if (requestProps.httpVersion == 1)
      stream.pipe(requestProps.res);
    else if (requestProps.httpVersion == 2)
      stream.pipe(requestProps.stream);
  },
  
  file: async (requestProps, filename, statusCode, headOnly, headers) => {
    // this is supposed to throw on purpose unless filename is a file so functions like fileFull know when to send a 404
    var stats = await fs.promises.stat(filename);
    if (stats.isDirectory()) {
      let error = new Error('EISDIR'); error.code = 'ENOENT';
      throw error;
    }
    
    var size = stats.size;
    
    var mimeType = mime.getType(filename);
    mimeType = mimeType ? `${mimeType}${mimeType.split('/')[0] == 'text' ? '; charset=utf-8' : ''}` : 'application/octet-stream';
    
    // range headers
    if (requestProps.headers.range && !statusCode && !headers) {
      // check if it matches bytes=xxxx-xxxx form (multipart not supported yet)
      if (/^bytes=[0-9]*-[0-9]*$/.test(requestProps.headers.range)) {
        var [ start, end ] = requestProps.headers.range.slice(6).split('-');
        
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
            await exports.headers(requestProps, 206, {
              'content-type': mimeType,
              'content-length': end - start + 1,
              'content-range': `bytes ${start}-${end}/${size}`,
              'last-modified': stats.mtime.toUTCString(),
              'x-content-type-options': 'nosniff',
              'strict-transport-security': 'max-age=31536000; preload',
            });
            
            if (headOnly) {
              await exports.end(requestProps);
            } else {
              var readStream = fs.createReadStream(filename, { start, end });
              await exports.stream(requestProps, readStream);
              readStream.on('error', logger.error);
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
      let shortPath = filename.replace(/\\/g, '/').replace('websites/public/', '') || 'index.html';
      
      // check for etag or modified since and no statusCode var set
      if (statusCode ||
        requestProps.headers['if-none-match'] && shortPath in etags ?
          (!requestProps.headers['if-none-match'].split(', ').some(x => x == etags[shortPath])) :
          (!requestProps.headers['if-modified-since'] || Math.floor(stats.mtime.getTime() / 1000) > Math.floor(new Date(requestProps.headers['if-modified-since']).getTime() / 1000))) {
        // modified since
        let encodings;
        if (requestProps.headers['accept-encoding'])
          encodings = new Set(requestProps.headers['accept-encoding'].split(', ').map(x => x.split(';')[0]));
        else
          encodings = new Set();
        
        let flags = websiteData[shortPath];
        
        let hasVal = 0, stat;
        if (encodings.has('br') || encodings.has('*')) {
          try {
            stat = await fs.promises.stat(filename + '.br');
            stat.isDirectory() ? hasVal++ : (size = stat.size, filename += '.br');
          } catch (e) { hasVal++; }
        } else hasVal++;
        if (hasVal == 1) {
          if (encodings.has('gzip')) {
            try {
              stat = await fs.promises.stat(filename + '.gz');
              stat.isDirectory() ? hasVal++ : (size = stat.size, filename += '.gz');
            } catch (e) { hasVal++; }
          } else hasVal++;
        }
        
        await exports.headers(requestProps, statusCode || 200, {
          'content-type': mimeType,
          'content-length': size,
          ...(hasVal < 2 ? { 'content-encoding': hasVal == 0 ? 'br' : 'gzip' } : {}),
          'last-modified': stats.mtime.toUTCString(),
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
          var readStream = fs.createReadStream(filename);
          await exports.stream(requestProps, readStream);
          readStream.on('error', logger.error);
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
      await exports.file(requestProps, 'websites/public/errors/404.html', 404, headOnly);
    } catch (err) {
      await exports.headers(requestProps, 404, { 'content-type': 'text/plain; charset=utf-8' });
      if (headOnly)
        await exports.end(requestProps);
      else
        await exports.end(requestProps, '404 Not Found');
    }
  },
  
  s500: async (requestProps, headOnly) => {
    try {
      await exports.file(requestProps, 'websites/public/errors/500.html', 500, headOnly);
    } catch (err) {
      await exports.headers(requestProps, 500, { 'content-type': 'text/plain; charset=utf-8' });
      if (headOnly)
        await exports.end(requestProps);
      else
        await exports.end(requestProps, '500 Internal Server Error');
    }
  },
  
  fileFull: async (requestProps, filename, headOnly, headers) => {
    try {
      await exports.file(requestProps, filename, null, headOnly, headers);
    } catch (err) {
      if (err.code == 'ENOENT') {
        await exports.s404(requestProps, headOnly);
      } else if (err.code != 'ERR_HTTP2_INVALID_STREAM') {
        logger.error(err);
        await exports.s500(requestProps, headOnly);
      } else logger.warn('http2 stream unexpectedly closed');
    }
  },
};

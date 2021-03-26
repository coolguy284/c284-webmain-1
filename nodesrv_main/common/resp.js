var fs = require('fs');
var mime = require('mime');

var logger = require('../logutils.js')('common/send');

module.exports = exports = {
  ws: (WSServer, req, socket, head, requestProps) =>
    WSServer.handleUpgrade(req, socket, head, ws => {
      WSServer.emit('connection', ws, req, requestProps);
    }),
  
  headers: async (requestProps, statusCode, headers) => {
    if (requestProps.httpVersion == 1) {
      requestProps.res.writeHead(statusCode, headers);
    } else if (requestProps.httpVersion == 2) {
      requestProps.stream.respond({ ':status': statusCode, ...headers });
    }
  },
  
  end: async (requestProps, str) => {
    if (requestProps.httpVersion == 1) {
      requestProps.res.end(str);
    } else if (requestProps.httpVersion == 2) {
      requestProps.stream.end(str);
    }
  },
  
  stream: async (requestProps, stream) => {
    if (requestProps.httpVersion == 1) {
      stream.pipe(requestProps.res);
    } else if (requestProps.httpVersion == 2) {
      stream.pipe(requestProps.stream);
    }
  },
  
  file: async (requestProps, filename, statusCode, headOnly) => {
    var stats = await fs.promises.stat(filename);
    var size = stats.size;
    var mimeType = mime.getType(filename);
    
    // range headers
    if (requestProps.headers.range && !statusCode) {
      // check if it matches bytes=xxxx-xxxx form (multipart not supported yet), and file is not directory
      if (!stats.isDirectory() && /^bytes=[0-9]*-[0-9]*$/.test(requestProps.headers.range)) {
        var [ start, end ] = requestProps.headers.range.slice(6).split('-');
        
        if (!start && !end) {
          // bytes=- is invalid
          exports.headers(requestProps, 416, { 'content-range': `*/${size}` });
          exports.end(requestProps);
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
            exports.headers(requestProps, { 'content-range': `*/${size}` });
            exports.end(requestProps);
          } else {
            // everything is correct
            exports.headers(requestProps, {
              'content-type': `${mimeType}${mimeType.split('/')[0] == 'text' ? '; charset=utf-8' : ''}`,
              'content-length': end - start + 1,
              'content-range': `bytes ${start}-${end}/${size}`,
              'last-modified': stats.mtime.toUTCString(),
            });
            
            if (headOnly) {
              exports.end(requestProps);
            } else {
              var readStream = fs.createReadStream(filename, { start, end });
              exports.stream(requestProps, readStream);
              readStream.on('error', logger.error);
            }
          }
        }
      } else {
        exports.headers(requestProps, { 'content-range': `*/${size}` });
        exports.end(requestProps);
      }
    } else {
      // normal request, check for modified since and no statusCode var set
      if (statusCode || !requestProps.headers['if-modified-since'] || Math.floor(stats.mtime.getTime() / 1000) > Math.floor(new Date(requestProps.headers['if-modified-since']).getTime() / 1000)) {
        // modified since
        exports.headers(requestProps, statusCode || 200, {
          'content-type': `${mimeType}${mimeType.split('/')[0] == 'text' ? '; charset=utf-8' : ''}`,
          'content-length': size,
          'last-modified': stats.mtime.toUTCString(),
          'accept-ranges': 'bytes',
        });
        
        if (headOnly) {
          exports.end(requestProps);
        } else {
          var readStream = fs.createReadStream(filename);
          exports.stream(requestProps, readStream);
          readStream.on('error', logger.error);
        }
      } else {
        // not modified since
        exports.headers(requestProps, 304);
        exports.end(requestProps);
      }
    }
  },
  
  s404: async (requestProps, headOnly) => {
    try {
      await exports.file(requestProps, 'websites/public/errors/404.html', 404, headOnly);
    } catch (err) {
      exports.headers(requestProps, 404, { 'content-type': 'text/plain; charset=utf-8' });
      if (headOnly)
        exports.end(requestProps);
      else
        exports.end(requestProps, '404 Not Found');
    }
  },
  
  s500: async (requestProps, headOnly) => {
    try {
      await exports.file(requestProps, 'websites/public/errors/500.html', 500, headOnly);
    } catch (err) {
      exports.headers(requestProps, 500, { 'content-type': 'text/plain; charset=utf-8' });
      if (headOnly)
        exports.end(requestProps);
      else
        exports.end(requestProps, '500 Internal Server Error');
    }
  },
  
  fileFull: async (requestProps, filename, headOnly) => {
    try {
      await exports.file(requestProps, filename, null, headOnly);
    } catch (err) {
      if (err.code == 'ENOENT') {
        await exports.s404(requestProps, headOnly);
      } else {
        logger.error(err);
        await exports.s500(requestProps, headOnly);
      }
    }
  },
};

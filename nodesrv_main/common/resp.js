var fs = require('fs');
var mime = require('mime');

var logger = require('../logutils.js')('common/send');

module.exports = exports = {
  ws: (WSServer, req, socket, head, requestProps) =>
    WSServer.handleUpgrade(req, socket, head, ws => {
      WSServer.emit('connection', ws, req, requestProps);
    }),
  
  file: async (requestProps, filename, statusCode, headOnly) => {
    var stats = await fs.promises.stat(filename);
    var size = stats.size;
    var mimeType = mime.getType(filename);
    
    // range headers
    if (requestProps.req.headers.range && !statusCode) {
      // check if it matches bytes=xxxx-xxxx form (multipart not supported yet), and file is not directory
      if (!stats.isDirectory() && /^bytes=[0-9]*-[0-9]*$/.test(requestProps.req.headers.range)) {
        var [ start, end ] = requestProps.req.headers.range.slice(6).split('-');
        
        if (!start && !end) {
          // bytes=- is invalid
          requestProps.res.writeHead(416, { 'content-range': `*/${size}` });
          requestProps.res.end();
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
            requestProps.res.writeHead(416, { 'content-range': `*/${size}` });
            requestProps.res.end();
          } else {
            // everything is correct
            requestProps.res.writeHead(206, {
              'content-type': `${mimeType}${mimeType.split('/')[0] == 'text' ? '; charset=utf-8' : ''}`,
              'content-length': end - start + 1,
              'content-range': `bytes ${start}-${end}/${size}`,
              'last-modified': stats.mtime.toUTCString(),
            });
            
            if (headOnly) {
              requestProps.res.end();
            } else {
              var readStream = fs.createReadStream(filename, { start, end });
              readStream.pipe(requestProps.res);
              readStream.on('error', logger.error);
            }
          }
        }
      } else {
        requestProps.res.writeHead(416, { 'content-range': `*/${size}` });
        requestProps.res.end();
      }
    } else {
      // normal request, check for modified since and no statusCode var set
      if (statusCode || !requestProps.req.headers['if-modified-since'] || Math.floor(stats.mtime.getTime() / 1000) > Math.floor(new Date(requestProps.req.headers['if-modified-since']).getTime() / 1000)) {
        // modified since
        requestProps.res.writeHead(statusCode || 200, {
          'content-type': `${mimeType}${mimeType.split('/')[0] == 'text' ? '; charset=utf-8' : ''}`,
          'content-length': size,
          'last-modified': stats.mtime.toUTCString(),
          'accept-ranges': 'bytes',
        });
        
        if (headOnly) {
          requestProps.res.end();
        } else {
          var readStream = fs.createReadStream(filename);
          readStream.pipe(requestProps.res);
          readStream.on('error', logger.error);
        }
      } else {
        // not modified since
        requestProps.res.writeHead(304);
        requestProps.res.end();
      }
    }
  },
  
  s404: async (requestProps, headOnly) => {
    try {
      await exports.file(requestProps, 'websites/public/errors/404.html', 404, headOnly);
    } catch (err) {
      requestProps.res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      if (headOnly)
        requestProps.res.end();
      else
        requestProps.res.end('404 Not Found');
    }
  },
  
  s500: async (requestProps, headOnly) => {
    try {
      await exports.file(requestProps, 'websites/public/errors/500.html', 500, headOnly);
    } catch (err) {
      requestProps.res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
      if (headOnly)
        requestProps.res.end();
      else
        requestProps.res.end('500 Internal Server Error');
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

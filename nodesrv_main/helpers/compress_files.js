var fs = require('fs');
var zlib = require('zlib');

let websiteData = require('../common/websitedataparse')();

Object.keys(websiteData).filter(x => websiteData[x] & 2).forEach(path => {
  path = 'websites/public/' + path;
  fs.writeFileSync(path + '.gz', zlib.gzipSync(fs.readFileSync(path)));
  fs.writeFileSync(path + '.br', zlib.brotliCompressSync(fs.readFileSync(path)));
});

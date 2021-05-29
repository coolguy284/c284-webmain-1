var fs = require('fs');
var zlib = require('zlib');
var crypto = require('crypto');

let websiteData = require('../common/websitedataparse')();

let prevEtags;
try { prevEtags = JSON.parse(fs.readFileSync('websites/etags.json').toString()); } catch (e) { prevEtags = {}; }

let etags = {};

Object.keys(websiteData).map(path => {
  if (websiteData[path] & 2) {
    let fullPath = 'websites/public/' + path;
    let bytes = fs.readFileSync(fullPath);
    etags[path] = crypto.createHash('sha256').update(bytes).digest('base64');
    if (!fs.existsSync(fullPath + '.gz') || prevEtags[path] != etags[path]) {
      let zlibBytes = zlib.gzipSync(bytes);
      fs.writeFileSync(fullPath + '.gz', zlibBytes);
      etags[path + '.gz'] = crypto.createHash('sha256').update(zlibBytes).digest('base64');
    }
    if (!fs.existsSync(fullPath + '.br') || prevEtags[path] != etags[path]) {
      let zlibBytes = zlib.brotliCompressSync(bytes);
      fs.writeFileSync(fullPath + '.br', zlibBytes);
      etags[path + '.br'] = crypto.createHash('sha256').update(zlibBytes).digest('base64');
    }
  } else {
    etags[path] = crypto.createHash('sha256').update(fs.readFileSync('websites/public/' + path)).digest('base64');
  }
});

fs.writeFileSync('websites/etags.json', JSON.stringify(etags));

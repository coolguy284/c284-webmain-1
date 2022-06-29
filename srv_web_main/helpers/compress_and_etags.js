var DEBUG = false;

var fs = require('fs');
var zlib = require('zlib');
var crypto = require('crypto');

async function compressAndEtags(...params) {
  let websiteData = require('../common/website_data_parse')();
  
  let prevEtags;
  try { prevEtags = JSON.parse(fs.readFileSync('websites/etags.json').toString()); } catch (e) { prevEtags = {}; }
  
  let etags = Object.fromEntries(Object.entries(prevEtags));
  
  let paths = Object.keys(websiteData);
  
  var exceptMode; // except mode is only true for the last compress_and_etags call of the build
  if (params[0] == '--only') {
    let toAdd = params.slice(1).map(x => new RegExp(x));
    paths = paths.filter(x => toAdd.every(y => y.test(x)));
  } else if (params[0] == '--except') {
    exceptMode = true;
    let toRemove = params.slice(1).map(x => new RegExp(x));
    paths = paths.filter(x => !toRemove.some(y => y.test(x)));
  }
  
  for (var path of paths) {
    if (DEBUG) console.debug(`processing ${path}`);
    
    let fullPath = 'websites/public/' + path;
    
    // to avoid reading file twice for small files
    if (fs.statSync(fullPath).size < 2 * 2 ** 20) {
      if (DEBUG) console.debug(`small ${path}`);
      
      if (websiteData[path] & 2) {
        let bytes = fs.readFileSync(fullPath);
        etags[path] = crypto.createHash('sha256').update(bytes).digest('base64');
        
        if (!fs.existsSync(fullPath + '.gz') || prevEtags[path] != etags[path]) {
          if (DEBUG) console.debug(`gzip ${path}`);
          
          let zlibBytes = zlib.gzipSync(bytes);
          fs.writeFileSync(fullPath + '.gz', zlibBytes);
          etags[path + '.gz'] = crypto.createHash('sha256').update(zlibBytes).digest('base64');
          
          if (DEBUG) console.debug(`gzip finish ${path}`);
        }
        
        if (!fs.existsSync(fullPath + '.br') || prevEtags[path] != etags[path]) {
          if (DEBUG) console.debug(`br ${path}`);
          
          let zlibBytes = zlib.brotliCompressSync(bytes);
          fs.writeFileSync(fullPath + '.br', zlibBytes);
          etags[path + '.br'] = crypto.createHash('sha256').update(zlibBytes).digest('base64');
          
          if (DEBUG) console.debug(`br finish ${path}`);
        }
      } else {
        etags[path] = crypto.createHash('sha256').update(fs.readFileSync(fullPath)).digest('base64');
      }
    } else {
      if (DEBUG) console.debug(`large ${path}`);
      
      if (websiteData[path] & 2) {
        let stream = fs.createReadStream(fullPath);
        
        await new Promise((resolve, reject) => {
          let hash = crypto.createHash('sha256');
          
          stream.pipe(hash);
          
          hash.on('finish', () => {
            etags[path] = hash.read().toString('base64');
            resolve();
          });
          
          hash.on('error', err => reject(err));
        });
        
        let bool1 = !fs.existsSync(fullPath + '.gz') || prevEtags[path] != etags[path],
          bool2 = !fs.existsSync(fullPath + '.br') || prevEtags[path] != etags[path];
        
        let compressStream;
        if (bool1 || bool2) {
          compressStream = fs.createReadStream(fullPath);
        }
        
        if (bool1) {
          if (DEBUG) console.debug(`gzip ${path}`);
          
          let gzipStream = zlib.createGzip();
          
          compressStream.pipe(gzipStream);
          gzipStream.pipe(fs.createWriteStream(fullPath + '.gz'));
          
          let gzipHash = crypto.createHash('sha256');
          
          gzipStream.pipe(gzipHash);
          
          bool1 = new Promise((resolve, reject) => {
            gzipHash.on('finish', () => {
              etags[path + '.gz'] = gzipHash.read().toString('base64');
              
              resolve();
              
              if (DEBUG) console.debug(`gzip finish ${path}`);
            });
            
            gzipHash.on('error', err => reject(err));
          });
        }
        
        if (bool2) {
          if (DEBUG) console.debug(`br ${path}`);
          
          let brotliStream = zlib.createBrotliCompress();
          
          compressStream.pipe(brotliStream);
          brotliStream.pipe(fs.createWriteStream(fullPath + '.br'));
          
          let brotliHash = crypto.createHash('sha256');
          
          brotliStream.pipe(brotliHash);
          
          bool2 = new Promise((resolve, reject) => {
            brotliHash.on('finish', () => {
              etags[path + '.br'] = brotliHash.read().toString('base64');
              
              resolve();
              
              if (DEBUG) console.debug(`br finish ${path}`);
            });
            
            brotliHash.on('error', err => reject(err));
          });
        }
        
        await Promise.all([bool1, bool2]);
      } else {
        let stream = fs.createReadStream(fullPath);
        
        await new Promise((resolve, reject) => {
          let hash = crypto.createHash('sha256');
          
          stream.pipe(hash);
          
          hash.on('finish', () => {
            etags[path] = hash.read().toString('base64');
            resolve();
          });
          
          hash.on('error', err => reject(err));
        });
      }
    }
  }
  
  let etagsBuf = Buffer.from(JSON.stringify(etags, null, 2));
  
  if (exceptMode) {
    if (DEBUG) console.log('selfreferential etag');
    
    let path = 'misc/debug/config/etags.json';
    let fullPath = 'websites/public/' + path;
    
    let etagsBufHash = crypto.createHash('sha256').update(etagsBuf).digest('base64');
    
    if (prevEtags[path] != etagsBufHash) {
      let etagsBufGzip = zlib.gzipSync(etagsBuf);
      let etagsBufBr = zlib.brotliCompressSync(etagsBuf);
      
      etags[path] = etagsBufHash;
      etags[path + '.gz'] = crypto.createHash('sha256').update(etagsBufGzip).digest('base64');
      etags[path + '.br'] = crypto.createHash('sha256').update(etagsBufBr).digest('base64');
      
      let newEtagsBuf = Buffer.from(JSON.stringify(etags, null, 2));
      
      fs.writeFileSync('websites/etags.json', newEtagsBuf);
      fs.writeFileSync(fullPath, newEtagsBuf);
      fs.writeFileSync(fullPath + '.gz', zlib.gzipSync(newEtagsBuf));
      fs.writeFileSync(fullPath + '.br', zlib.brotliCompressSync(newEtagsBuf));
    }
  } else {
    fs.writeFileSync('websites/etags.json', etagsBuf);
  }
}

if (require.main == module) {
  compressAndEtags(...process.argv.slice(2));
} else {
  module.exports = compressAndEtags;
}

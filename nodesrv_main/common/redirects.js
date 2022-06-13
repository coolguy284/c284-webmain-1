var fs = require('fs');

var parseArgString = require('./arg_string_parse');

var serverTypeMapping = { 'F': 0, 'D': 1, 'R': 2 };
var sendTypeMapping = { 'TS': 307, 'TG': 303, 'T-': 302, 'PS': 308, 'P-': 301 };

var fileRedirects = [], folderRedirects = [], regexRedirects = [];

// parse redirect array
fs.readFileSync('websites/redirects.txt').toString()
  .split('\n')
  .filter(entry => entry && !entry.startsWith('#'))
  .map(parseArgString)
  .filter(x => x.length >= 3)
  .forEach(x => {
    let serverTypeStr = x[0][0], sendTypeStr = x[0].slice(1);
    
    if (!(serverTypeStr in serverTypeMapping))
      throw new Error(`redirect serverType ${serverType} is invalid`);
    
    if (!(sendTypeStr in sendTypeMapping))
      throw new Error(`redirect sendType ${sendType} is invalid`);
    
    let serverType = serverTypeMapping[serverTypeStr], sendType = sendTypeMapping[sendTypeStr];
    
    switch (serverType) {
      case 0: fileRedirects.push([x[1], [x[2], sendType]]); break;
      case 1: folderRedirects.push([x[1], x[2], sendType]); break;
      case 2: regexRedirects.push([new RegExp(x[1]), x[2], sendType]); break;
    }
  });

fileRedirects = Object.fromEntries(fileRedirects);

// takes in a url object and returns [false] if no redirects, else returns [true, statusCode, locationString]
function followRedirects(url) {
  let urlString = url.pathname;
  
  let didRedirect = false, redirectStatus;
  
  // regexs first
  for (var regexRedirect of regexRedirects) {
    let replacedURL = urlString.replace(regexRedirect[0], regexRedirect[1]);
    if (urlString != replacedURL) {
      didRedirect = true;
      redirectStatus = regexRedirect[2];
      urlString = replacedURL;
    }
  }
  
  // folders next
  for (var folderRedirect of folderRedirects) {
    if (urlString.startsWith(folderRedirect[0])) {
      didRedirect = true;
      redirectStatus = folderRedirect[2];
      urlString = folderRedirect[1] + urlString.slice(folderRedirect[0].length);
    }
  }
  
  // files last
  if (urlString in fileRedirects) {
    let fileRedirect = fileRedirects[urlString];
    didRedirect = true;
    redirectStatus = fileRedirect[1];
    urlString = fileRedirect[0];
  }
  
  // return appropriate url
  if (didRedirect) {
    if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
      return [true, redirectStatus, urlString];
    } else {
      let newURL = new URL(url);
      newURL.pathname = urlString;
      return [true, redirectStatus, newURL.href];
    }
  } else {
    return [false];
  }
}

module.exports = exports = {
  followRedirects,
  fileRedirects,
  folderRedirects,
  regexRedirects,
  serverTypeMapping,
  sendTypeMapping,
};

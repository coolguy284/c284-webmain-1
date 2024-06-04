var fs = require('fs');
var parseArgString = require('./arg_string_parse');

var serverTypeMapping = { 'F': 'file', 'D': 'directory', 'R': 'regex', 'C': 'custom' };
var sendStatusCodeMapping = { 'TS': 307, 'TG': 303, 'T-': 302, 'PS': 308, 'P-': 301 };

var redirects = [];

// parse redirect array
fs.readFileSync('websites/redirects.txt').toString()
  .split('\n')
  .filter(entry => entry && !entry.startsWith('#'))
  .map(parseArgString)
  .filter(x => x.length >= 2)
  .forEach(x => {
    let serverTypeStr = x[0][0], sendStatusCodeStr = x[0].slice(1);
    
    if (!(serverTypeStr in serverTypeMapping))
      throw new Error(`redirect serverType ${serverType} is invalid`);
    
    if (!(sendStatusCodeStr in sendStatusCodeMapping))
      throw new Error(`redirect sendStatusCode ${sendStatusCode} is invalid`);
    
    let serverType = serverTypeMapping[serverTypeStr], sendStatusCode = sendStatusCodeMapping[sendStatusCodeStr];
    
    switch (serverType) {
      case 'file': {
        if (x.length < 3) return;
        let prevRedirect = redirects[redirects.length - 1];
        if (prevRedirect?.type == 'file')
          prevRedirect.redirects.push([x[1], { to: x[2], statusCode: sendStatusCode }]);
        else
          redirects.push({ type: serverType, redirects: [[x[1], { to: x[2], statusCode: sendStatusCode } ]] });
        break;
      }
      case 'directory':
        if (x.length < 3) return;
        redirects.push({ type: serverType, from: x[1], to: x[2], statusCode: sendStatusCode });
        break;
      case 'regex':
        if (x.length < 3) return;
        redirects.push({ type: serverType, from: new RegExp(x[1]), to: x[2], statusCode: sendStatusCode });
        break;
      case 'custom':
        if (x.length < 2) return;
        redirects.push({ type: serverType, name: x[1] });
        break;
    }
  });

for (var redirect of redirects) {
  if (redirect.type == 'file') {
    let redirects = new Map(redirect.redirects);
    let newRedirects = new Map();
    
    for (let [ from, to ] of redirects) {
      if (newRedirects.has(from)) continue;
      if (redirects.has(to.to)) {
        let chain = [from];
        while (redirects.has(to.to)) {
          let newTo = redirects.get(to.to);
          if (to.to == newTo.to) throw new Error(`Circular or self referential redirect detected: ${chain.join(', ') + ', ' + to.to}`);
          chain.push(to.to);
          to = newTo;
        }
        chain.slice(0, -1).forEach(x => newRedirects.set(x, to));
      } else {
        newRedirects.set(from, to);
      }
    }
    
    redirect.redirects = newRedirects;
  }
  
  // to check: Object.entries(require('./common/redirects').redirects.at(-2).redirects).slice(0, 30)
}

// takes in a url object and returns [false] if no redirects, else returns [true, statusCode, locationString]
function followRedirects(url) {
  let urlString = url.pathname;
  
  let didRedirect = false, statusCode;
  
  // process redirects one at a time in same order as redirects file, except every file redirect in a row is processed at once
  for (var redirect of redirects) {
    switch (redirect.type) {
      case 'file': {
        let fileRedirect = redirect.redirects.get(urlString);
        if (fileRedirect != null) {
          didRedirect = true;
          statusCode = fileRedirect.statusCode;
          urlString = fileRedirect.to;
        }
        break;
      }
      case 'directory': {
        if (urlString.startsWith(redirect.from)) {
          didRedirect = true;
          statusCode = redirect.statusCode;
          urlString = redirect.to + urlString.slice(redirect.from.length);
        }
        break;
      }
      case 'regex': {
        let replacedURL = urlString.replace(redirect.from, redirect.to);
        if (urlString != replacedURL) {
          didRedirect = true;
          statusCode = redirect.statusCode;
          urlString = replacedURL;
        }
        break;
      }
      case 'custom':
        switch (redirect.name) {
          case 'unicode': {
            if (urlString == '/unicode/U+0NAN') {
              didRedirect = true;
              statusCode = redirect.statusCode;
              urlString = '/unicode/U+';
            }
            
            let match;
            if (urlString.startsWith('/unicode/') && (match = /^\/unicode\/(?:([Uu])\+(0{0,2}(?:0?[0-9A-Fa-f]|10)?[0-9A-Fa-f]{0,4}))$/.exec(urlString))) {
              let fancyCodePoint = match[2] ? parseInt(match[2], 16).toString(16).toUpperCase().padStart(4, '0') : '0000';
              if (match[1] == 'u' || fancyCodePoint != match[2]) {
                didRedirect = true;
                statusCode = redirect.statusCode;
                urlString = '/unicode/U+' + fancyCodePoint;
              }
            }
            break;
          }
        }
        break;
    }
  }
  
  // return appropriate url
  if (didRedirect) {
    if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
      return [true, statusCode, urlString];
    } else {
      let newURL = new URL(url);
      newURL.pathname = urlString;
      return [true, statusCode, newURL.href];
    }
  } else {
    return [false];
  }
}

module.exports = exports = {
  followRedirects,
  redirects,
  serverTypeMapping,
  sendStatusCodeMapping,
};

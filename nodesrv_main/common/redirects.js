var fs = require('fs');

var parseArgString = require('./argstringparse');

var redirectArr = fs.readFileSync('websites/redirects.txt').toString().split('\n').filter(entry => entry && !entry.startsWith('#'));

module.exports = {
  redirects: Object.fromEntries(redirectArr.map(parseArgString).filter(x => x.length >= 3).map(x => [x[1], [x[2], x[0]]])),
  mapping: { 'TS': 307, 'TG': 303, 'T-': 302, 'PS': 308, 'P-': 301 },
};

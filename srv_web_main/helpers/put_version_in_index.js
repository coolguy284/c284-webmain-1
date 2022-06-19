var fs = require('fs');

fs.writeFileSync('websites/public/index.html', fs.readFileSync('websites/public/index.html').toString().replace('{version}', require('../package.json').version));

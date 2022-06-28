var cp = require('child_process');
var fs = require('fs');

// load environment variables from .dockerenv file
fs.readFileSync('dockerenv.list').toString().split(/\r?\n/g).forEach(entry => {
  if (entry[0] == '#') return;
  let split = entry.split('=');
  if (split.length < 2) return;
  let key = split[0].trim();
  let value = split.slice(1).join(':').trim();
  process.env[key] = value;
});

(async () => {
  // get current file mtimes
  var crawler = require('../common/sitemap_crawler.js');
  
  var sites = await crawler.crawl('/index.html', crawler.fsGetterFuncGen('websites/public', new Set(['/sitemap.xml'])));
  
  var siteNames = Array.from(sites.keys());
  var siteFullNames = siteNames.map(x => 'websites/public' + x);
  
  var siteModTimes = await Promise.all(siteFullNames.map(async x => {
    try {
      return (await fs.promises.stat(x)).mtime;
    } catch (e) {
      return null;
    }
  }));
  
  
  // put version in index.html
  
  await fs.promises.writeFile(
    'websites/public/index.html',
    (await fs.promises.readFile('websites/public/index.html'))
      .toString()
      .replace('{version}', require('../package.json').version)
  );
  
  
  // set contact info from dockerenv.list
  
  await fs.promises.writeFile(
    'websites/public/misc/contact.html',
    (await fs.promises.readFile('websites/public/misc/contact.html'))
      .toString()
      .replace('{email}', Buffer.from(process.env.SRV_WEB_MAIN_CONTACT_EMAIL).toString('hex'))
      .replace('{discord}', Buffer.from(process.env.SRV_WEB_MAIN_CONTACT_DISCORD).toString('hex'))
  );
  
  
  // reset current file mtimes
  
  await Promise.all(siteFullNames.map(async (x, i) => {
    let date = siteModTimes[i];
    if (date)
      return await fs.promises.utimes(x, date, date);
  }));
  
  
  // create sitemap
  
  var siteModTimesObj = Object.fromEntries(siteNames.map((x, i) => [x, siteModTimes[i]]));
  siteModTimesObj['/sitemap.xml'] = siteModTimes.reduce((a, c) => c > a ? c : a, siteModTimes[0]);
  
  await require('./create_sitemap')(sites, siteModTimesObj);
  
  
  // compress files and create etags
  
  await require('./compress_and_etags')('--except', '^data/UnicodeData\.txt(?:\.gz|\.br)?$', '^libs/.*$');
})();

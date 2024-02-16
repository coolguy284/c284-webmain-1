var fs = require('fs');

var crawler = require('../common/sitemap_crawler');

async function createSitemap(sites, siteModTimesObj) {
  if (sites == null) {
    sites = await crawler.crawl('/index.html', crawler.fsGetterFuncGen('websites/public', new Set(['/sitemap.xml'])));
  }
  
  var websiteData = require('../common/website_data_parse')();
  websiteData['sitemap.xml'] = 0;
  
  await fs.promises.writeFile(
    'websites/public/sitemap.xml',
    '<?xml version = \'1.0\' encoding = \'utf-8\'?>\n' +
    '<urlset xmlns = \'https://www.sitemaps.org/schemas/sitemap/0.9\'>\n' +
    (await Promise.all(
      Array.from(sites.entries()).map(async site => {
        let rawURL = `https://coolguy284.com${site[0].endsWith('index.html') ? site[0].slice(0, -10) : site[0]}`;
        let escapedURL = rawURL.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\r/g,'&#13;');
        
        let lastModDateObj = siteModTimesObj ? siteModTimesObj[site[0].slice(1)] : (await fs.promises.stat('websites/public' + site[0])).mtime;
        let lastModDate = lastModDateObj.toISOString().slice(0, -1);
        
        let changeFreq;
        if (websiteData[site[0].slice(1)] & 1) {
          // file is library file
          changeFreq = 'yearly';
        } else {
          // file is normal file
          let daysAgo = (Date.now() - lastModDateObj.getTime()) / 1000 / 3600 / 24;
          
          if (daysAgo < 3) {
            changeFreq = 'daily';
          } else if (daysAgo < 4 * 7) {
            changeFreq = 'weekly';
          } else if (daysAgo < 3 * 30) {
            changeFreq = 'monthly';
          } else {
            changeFreq = 'yearly';
          }
        }
        
        let priority = (site[0].startsWith('/debug') || site[0].startsWith('/errors') ? 0.0 : 1.0 - site[1] * 0.25).toFixed(1);
        
        return '  <url>\n' +
          `    <loc>${escapedURL}</loc>\n` +
          `    <lastmod>${lastModDate}+00:00</lastmod>\n` +
          `    <changefreq>${changeFreq}</changefreq>\n` +
          `    <priority>${priority}</priority>\n` +
          '  </url>';
      })
    )).join('\n  \n') + '\n' +
    '</urlset>\n'
  );
}

if (require.main == module) {
  (async () => {
    var sites = await crawler.crawl('/index.html', crawler.fsGetterFuncGen('websites/public', new Set(['/sitemap.xml'])));
    createSitemap(sites);
  })();
} else {
  module.exports = createSitemap;
}

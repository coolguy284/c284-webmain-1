let fs = require('fs');

let crawler = require('../common/sitemap_crawler');

async function createSitemap(sites, siteModTimesObj) {
  if (sites == null) {
    sites = Array.from(
      (
        await crawler.crawl(
          '/index.html',
          crawler.fsGetterFuncGen('websites/public', new Set(['/sitemap.xml']))
        )
      )
      .keys()
    );
  }
  
  let websiteData = require('../common/website_data_parse')();
  websiteData['sitemap.xml'] = 0;
  
  let pagePriority = {
    // category pages
    'index.html': 1.0,
    
    'apps/index.html': 0.9,
    'misc/tools/index.html': 0.9,
    'misc/debug/index.html': 0.9,
    
    // apps
    'apps/3d-gravity/index.html': 0.7,
    'apps/3d-raymarcher/index.html': 0.7,
    'apps/html5-fancy-clock/index.html': 0.7,
    'apps/mandel-viewer-v2/index.html': 0.7,
    'apps/special-relativity-sim/index.html': 0.7,
    'chat/index.html': 0.7,
    'misc/old/tools/advancedtime.html': 0.7,
    'misc/old/tools/calculator.html': 0.7,
    'misc/tools/base64.html': 0.7,
    'misc/tools/hex.html': 0.7,
    'misc/tools/morse_code.html': 0.7,
    'misc/tools/qr_code_gen.html': 0.7,
    'misc/tools/unit_converter.html': 0.7,
    'misc/tools/wide_latin.html': 0.7,
    'misc/contact.html': 0.7,
    
    'misc/strange/halloween_name_gen.html': 0.6,
    'apps/html5-time-tracker/index.html': 0.6,
    'apps/html5-temporal-conways-life/index.html': 0.6,
    
    'misc/debug/solid_color.html': 0.5,
    'misc/old/tools/enigma.html': 0.5,
    'misc/old/tools/systemdata.html': 0.5,
    'misc/tools/aes.html': 0.5,
    'misc/tools/aes_new.html': 0.5,
    'misc/tools/base64_url.html': 0.5,
    'misc/tools/data_url.html': 0.5,
    'misc/tools/encode_decode.html': 0.5,
    'misc/tools/file_downloader.html': 0.5,
    'misc/tools/html_escape.html': 0.5,
    'misc/tools/rsa.html': 0.5,
    'misc/tools/rsa_new.html': 0.5,
    'misc/tools/sha.html': 0.5,
    'misc/tools/uri.html': 0.5,
    'misc/tools/uri_comp.html': 0.5,
    'misc/status.html': 0.5,
    'misc/rectangles.html': 0.5,
    
    'misc/debug/big_scroll_area.html': 0.4,
    'misc/own_eyes.html': 0.4,
    'misc/no_source.html': 0.4,
    
    // low priority
    'misc/old/tools/coderunner.html': 0.3,
    
    'misc/debug/screen_resolutions.html': 0.2,
    
    'misc/debug/latency_test.html': 0.1,
    'misc/debug/localstorage_editor.html': 0.1,
    'misc/debug/simple_page.html': 0.1,
    'misc/debug/time_syncer.html': 0.1,
    
    'misc/debug/templates/404.html': 0.0,
    'misc/debug/templates/500.html': 0.0,
    'misc/debug/templates/502_subsrv_offline.html': 0.0,
    'misc/debug/templates/unicode.html': 0.0,
    'misc/debug/space_lengths.html': 0.0,
    'misc/debug/useful_characters.html': 0.0,
    'misc/unicode/index.html': 0.0,
    'user/login.html': 0.0,
  };
  
  await fs.promises.writeFile(
    'websites/public/sitemap.xml',
    '<?xml version = \'1.0\' encoding = \'utf-8\'?>\n' +
    '<urlset xmlns = \'https://www.sitemaps.org/schemas/sitemap/0.9\'>\n' +
    (
      (await Promise.all(
        sites.map(async (site, _, a) => {
          let relativeURL = site;
          let relativeURLShort = site.slice(1);
          
          let rawURL = `https://coolguy284.com${relativeURL.endsWith('index.html') ? relativeURL.slice(0, -10) : relativeURL}`;
          let escapedURL = rawURL.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/\r/g,'&#13;');
          
          let lastModDateObj = siteModTimesObj ? siteModTimesObj[relativeURLShort] : (await fs.promises.stat('websites/public' + relativeURL)).mtime;
          let lastModDateMS = lastModDateObj.getTime();
          let lastModDate = lastModDateObj.toISOString().slice(0, -1);
          
          let changeFreq;
          if (websiteData[relativeURLShort] & 1) {
            // file is library file
            changeFreq = 'yearly';
          } else {
            // file is normal file
            let daysAgo = (Date.now() - lastModDateMS) / 1000 / 3600 / 24;
            
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
          
          let priorityEntry = pagePriority[relativeURLShort];
          
          if (priorityEntry == null) {
            let missingPages = a.map(site => {
              let relativeURLShort = site.slice(1);
              
              return relativeURLShort;
            }).filter(url => !(url in pagePriority));
            
            throw new Error(`${relativeURLShort} not in pagePriority\nmissing pages:\n${missingPages.join('\n')}`);
          }
          
          let priority = pagePriority[relativeURLShort].toFixed(1);
          
          return {
            lastModDateMS,
            
            escapedURL,
            lastModDate,
            changeFreq,
            priority,
          };
        })
      ))
      .sort((a, b) => {
        let priorityFactor = b.priority - a.priority;
        if (priorityFactor != 0) return priorityFactor;
        
        let dateFactor = b.lastModDateMS - a.lastModDateMS;
        if (dateFactor != 0) return priorityFactor;
        
        return 0;
      })
      .map(({
        escapedURL,
        lastModDate,
        changeFreq,
        priority,
      }) => {
        return '  <url>\n' +
          `    <loc>${escapedURL}</loc>\n` +
          `    <lastmod>${lastModDate}+00:00</lastmod>\n` +
          `    <changefreq>${changeFreq}</changefreq>\n` +
          `    <priority>${priority}</priority>\n` +
          '  </url>';
      })
      .join('\n  \n')
    ) + '\n' +
    '</urlset>\n'
  );
}

if (require.main == module) {
  (async () => {
    createSitemap();
  })();
} else {
  module.exports = createSitemap;
}

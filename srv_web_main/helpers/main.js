var cp = require('child_process');
var fs = require('fs');

var crawler = require('../common/sitemap_crawler');

let webmainPath = 'srv_web_main/';
let websitePath = 'websites/public/';

let gitSubrepos = [
  'apps/mandel-viewer-v2/',
  'apps/special-relativity-sim/',
  'apps/3d-gravity/',
  'apps/html5-fancy-clock/',
  'apps/html5-temporal-conways-life/',
  'apps/3d-raymarcher/',
  'apps/html5-time-tracker/',
];

// load environment variables from .dockerenv file
fs.readFileSync('dockerenv.list').toString().split(/\r?\n/g).forEach(entry => {
  if (entry[0] == '#') return;
  let split = entry.split('=');
  if (split.length < 2) return;
  let key = split[0].trim();
  let value = split.slice(1).join(':').trim();
  process.env[key] = value;
});

function getSubRepoPath(baseRepoPath, subRepos, filePath) {
  for (let subRepo of subRepos) {
    let subRepoFullPath = webmainPath + websitePath + subRepo;
    if (filePath.startsWith(subRepoFullPath)) {
      return [subRepoFullPath.slice(0, -1), filePath.slice(subRepoFullPath.length)];
    }
  }
  
  return [baseRepoPath, filePath];
}

function getGitModDate(repoPath, filePath) {
  [ repoPath, filePath ] = getSubRepoPath(repoPath, gitSubrepos, filePath);
  
  return new Promise((resolve, reject) => {
    var proc = cp.spawn(
      'git',
      ['log', '-1', '--pretty="format:%cI"', filePath],
      { cwd: repoPath, stdio: 'pipe', timeout: 60000 }
    );
    var outputBufs = [], errorBufs = [];
    proc.stdout.on('data', c => outputBufs.push(c));
    proc.stderr.on('data', c => errorBufs.push(c));
    proc.on('close', code => {
      switch (code) {
        case 0:
          var output = Buffer.concat(outputBufs).toString();
          if (output == '')
            resolve(null);
          else
            resolve(new Date(JSON.parse(output).slice(7)));
          break;
        
        case 128:
          resolve(null);
          break;
        
        default:
          reject(new Error(Buffer.concat(errorBufs).toString().trim()));
          break;
      }
    });
  });
}

(async () => {
  // puts modtimes of all webpages in websites/modtimes.json
  
  var recursiveReaddir = require('../common/recursive_readdir');
  
  var pageNames = recursiveReaddir('websites/public');
  pageNames = pageNames.filter(x => {
    if (x.endsWith('.br') || x.endsWith('.gz')) return false;
    
    for (let subRepo of gitSubrepos) {
      if (x.startsWith(subRepo + '.git/')) {
        return false;
      }
    }
    
    return true;
  });
  
  var pageNamesFiltered = pageNames.filter(x => !x.includes('/'));
  var pageNamesFilteredAddIndex = pageNames.indexOf(pageNamesFiltered[0]);
  pageNamesFiltered.push('sitemap.xml');
  pageNamesFiltered.sort();
  pageNames.splice(pageNamesFilteredAddIndex, pageNamesFiltered.length - 1, ...pageNamesFiltered);
  
  var pageNamesFiltered2 = pageNames.filter(x => x.startsWith('misc/debug/config/'));
  var pageNamesFiltered2AddIndex = pageNames.indexOf(pageNamesFiltered2[0]);
  pageNamesFiltered2.push('misc/debug/config/modtimes.json');
  pageNamesFiltered2.push('misc/debug/config/etags.json');
  pageNamesFiltered2.sort();
  pageNames.splice(pageNamesFiltered2AddIndex, pageNamesFiltered2.length - 2, ...pageNamesFiltered2);
  
  var pageModTimeExtraEntries = new Set(['sitemap.xml', 'misc/debug/config/modtimes.json', 'misc/debug/config/etags.json']);
  
  var pageModTimeEntries = (await Promise.all(pageNames.map(async pageName => {
    var pagePath;
    if (pageName.startsWith('misc/debug/config/'))
      pagePath = 'websites/' + pageName.slice(18);
    else
      pagePath = 'websites/public/' + pageName;
    
    var pageGitModTime = await getGitModDate('.', webmainPath + pagePath);
    
    if (pageGitModTime)
      return [pageName, pageGitModTime];
    
    if (pageModTimeExtraEntries.has(pageName))
      return [pageName, null];
    
    try {
      var pageModTime = (await fs.promises.stat(pagePath)).mtime;
      return [pageName, pageModTime];
    } catch (e) {
      return null;
    }
  }))).filter(x => x);
  
  // remove all subrepo git repositories
  await Promise.all(gitSubrepos.map(async subRepo => {
    return fs.promises.rm(websitePath + subRepo + '.git', { recursive: true });
  }));
  
  var pageModTimes = Object.fromEntries(pageModTimeEntries);
  
  var pageModTimeValues = pageModTimeEntries.map(x => x[1]).filter(x => x);
  var latestModTime = pageModTimeValues.reduce((a, c) => c > a ? c : a, pageModTimeValues[0]);
  
  var sites = Array.from(
    (
      await crawler.crawl(
        '/index.html',
        crawler.fsGetterFuncGen('websites/public', new Set(['/sitemap.xml']))
      )
    )
    .keys()
  );
  var validSites = new Set(sites.map(x => x.slice(1)));
  var crawledPageModTimeValues = pageModTimeEntries.filter(x => validSites.has(x[0])).map(x => x[1]).filter(x => x);
  var latestSitemapModTime = crawledPageModTimeValues.reduce((a, c) => c > a ? c : a, crawledPageModTimeValues[0]);
  
  pageModTimes['sitemap.xml'] = latestSitemapModTime;
  pageModTimes['misc/debug/config/modtimes.json'] = latestModTime;
  pageModTimes['misc/debug/config/etags.json'] = latestModTime;
  
  var pageModTimeKeys = [];
  pageModTimes = Object.entries(pageModTimes).reduce((a, c) => {
    pageModTimeKeys.push(c[0], c[0] + '.br', c[0] + '.gz');
    a[c[0]] = c[1];
    a[c[0] + '.br'] = c[1];
    a[c[0] + '.gz'] = c[1];
    return a;
  }, {});
  
  var pageModTimeStrings = {};
  pageModTimeKeys
    .forEach(pageName => pageModTimeStrings[pageName] = pageModTimes[pageName].toISOString());
  
  await fs.promises.writeFile('websites/modtimes.json', JSON.stringify(pageModTimeStrings, null, 2));
  
  
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
  
  
  // create sitemap
  
  await require('./create_sitemap')(sites, pageModTimes);
  
  
  // copy file in preperation for etag creation
  
  await fs.promises.copyFile('websites/modtimes.json', 'websites/public/misc/debug/config/modtimes.json');
  
  
  // compress files and create etags
  
  await require('./compress_and_etags')('--except', '^data/UnicodeData\\.txt(?:\\.br|\\.gz)?$', '^libs/.*$');
})();

importScripts('/libs/service_worker.js');

let SERVICE_WORKER_CONFIG_PAGES = new Set([
  '/misc/service_worker.html',
  '/libs/service_worker.js',
]);

let currentServiceWorkerHash = '{currentServiceWorkerHash}';

let settings = null;
let cachedPagesCount = 0;

addEventListener('message', evt => {
  let data = evt.data;
  
  if (typeof data != 'object') {
    console.error(`Invalid message: ${data}`);
  } else {
    switch (data.type) {
      case 'getStatus':
        evt.source.postMessage({
          type: 'status',
          data: {
            currentServiceWorkerHash,
            cachedPages: [],
          },
        });
        break;
      
      case 'removeCacheEntry':
        break;
      
      case 'removeAllCacheEntries':
        break;
      
      case 'addCacheEntry':
        break;
      
      case 'settingsUpdate':
        mergeSettingsObject(settings, data);
        break;
      
      default:
        console.error(`Invalid message type: ${data.type}`);
    }
  }
});

async function serviceWorkerInitFunc() {
  // load settings
  settings = await loadSettingsFromStorage();
  
  // claim clients
  await clients.claim();
  
  // delete old caches
  let cacheSet = new Set(await caches.keys());
  cacheSet.remove(currentServiceWorkerHash);
  
  await Promise.allSettled(Array.from(cacheSet).map(x => caches.delete(x)));
  
  // set cache counter
  let cache = await caches.open(currentServiceWorkerHash);
  cachedPagesCount = (await cache.keys()).length;
}

addEventListener('activate', evt => {
  evt.waitUntil(serviceWorkerInitFunc());
});

async function putInCache(request, response) {
  let cache = await caches.open(currentServiceWorkerHash);
  await cache.put(request, response);
}

let offlineIndicatorResponse = null;

function getOfflineIndicatorResponse() {
  if (offlineIndicatorResponse == null) {
    offlineIndicatorResponse = new Response(
      'This device is currently offline, and no cached version of this page exists.',
      {
        status: 408,
        headers: {
          'content-type': 'text/plain; charset=utf-8',
        },
      }
    );
  }
  
  return offlineIndicatorResponse;
}

async function fetchProcessing(request) {
  let result = null;
  
  let url = new URL(request.url);
  
  if (navigator.onLine) {
    if (SERVICE_WORKER_CONFIG_PAGES.has(url.pathname)) {
      let response = await caches.match(request);
      if (response) {
        if (settings.sendCacheBeforeFetch) {
          result = response;
          (async () => {
            putInCache(request, await fetch(request));
          })(); // intentionally not awaited
        } else {
          result = await fetch(request);
          putInCache(request, result); // intentionally not awaited
        }
      } else {
        if ((settings.serviceWorkerPageAlwaysAccessible || settings.autoAddNewPagesToCache) && cachedPagesCount < settings.maxCacheSize) {
          result = await fetch(request);
          putInCache(request, result); // intentionally not awaited
          cachedPagesCount++;
        } else {
          result = await fetch(request);
        }
      }
    } else {
      let response = await caches.match(request);
      if (response) {
        if (settings.sendCacheBeforeFetch) {
          result = response;
          (async () => {
            putInCache(request, await fetch(request));
          })(); // intentionally not awaited
        } else {
          result = await fetch(request);
          putInCache(request, result);
        }
      } else {
        if (settings.autoAddNewPagesToCache && cachedPagesCount < settings.maxCacheSize) {
          result = await fetch(request);
          putInCache(request, result); // intentionally not awaited
          cachedPagesCount++;
        } else {
          result = await fetch(request);
        }
      }
    }
  } else {
    if (SERVICE_WORKER_CONFIG_PAGES.has(url.pathname)) {
      let response = await caches.match(request);
      if (response) {
        if (settings.serviceWorkerPageAlwaysAccessible || settings.sendCachedPagesWhenOffline) {
          result = response;
        } else {
          // emulate default browser action
          return await fetch(request);
        }
      } else {
        if (settings.sendOfflineIndicatorForNonCachedPagesWhenOffline) {
          result = getOfflineIndicatorResponse();
        } else {
          // emulate default browser action
          return await fetch(request);
        }
      }
    } else {
      let response = await caches.match(request);
      if (response) {
        if (settings.sendCachedPagesWhenOffline) {
          result = response;
        } else {
          // emulate default browser action
          return await fetch(request);
        }
      } else {
        if (settings.sendOfflineIndicatorForNonCachedPagesWhenOffline) {
          result = getOfflineIndicatorResponse();
        } else {
          // emulate default browser action
          return await fetch(request);
        }
      }
    }
  }
  
  return result;
}

addEventListener('fetch', evt => {
  if (settings.enabled) {
    evt.respondWith(fetchProcessing(evt.request));
  }
});

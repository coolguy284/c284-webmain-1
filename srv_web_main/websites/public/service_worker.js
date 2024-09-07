importScripts('/libs/service_worker.js');

let SERVICE_WORKER_CONFIG_PAGES = new Set([
  '/misc/service_worker.html',
  '/libs/service_worker.js',
]);

let NON_CACHED_MIME_TYPES = new Set([
  'text/event-stream',
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

async function putInCache(request, response, filterInvalidMimeTypes) {
  if (!(filterInvalidMimeTypes && NON_CACHED_MIME_TYPES.has(response.headers.get('content-type').split('; ')[0]))) {
    let cache = await caches.open(currentServiceWorkerHash);
    await cache.put(request, response);
    return true;
  } else {
    return false;
  }
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
          cachedPagesCount++;
          (async () => {
            let success = await putInCache(request, result, true);
            if (!success) cachedPagesCount--;
          })(); // intentionally not awaited
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
          putInCache(request, result); // intentionally not awaited
        }
      } else {
        if (settings.autoAddNewPagesToCache && cachedPagesCount < settings.maxCacheSize) {
          result = await fetch(request);
          cachedPagesCount++;
          (async () => {
            let success = await putInCache(request, result, true);
            if (!success) cachedPagesCount--;
          })(); // intentionally not awaited
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

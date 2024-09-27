importScripts('/libs/service_worker.js');

let SERVICE_WORKER_CONFIG_PAGE_REQUIREMENTS = new Set([
  '/libs/extern/bootstrap_5.0.0.min.css',
  '/libs/service_worker.js',
  '/misc/service_worker.html',
  '/favicon.ico',
]);
let SERVICE_WORKER_CONFIG_PAGE = '/misc/service_worker.html';

let NON_CACHED_MIME_TYPES = new Set([
  'text/event-stream',
]);

let currentServiceWorkerHash = '{currentServiceWorkerHash}';

let settings = null;
let cachedPagesCount = 0;

async function getStatusMessage() {
  return {
    type: 'status',
    data: {
      currentServiceWorkerHash,
      cachedPages: await getCacheEntries(),
    },
  };
}

async function postStatusMessage(source) {
  if (source == null) {
    let clientsList = await clients.matchAll();
    if (clientsList.length > 0) {
      let statusMsg = await getStatusMessage();
      await Promise.allSettled(clientsList.map(x => {
        let pathname = new URL(x.url).pathname;
        if (pathname == SERVICE_WORKER_CONFIG_PAGE) {
          x.postMessage(statusMsg);
        }
      }));
    }
  } else {
    source.postMessage(await getStatusMessage());
  }
}

addEventListener('message', async evt => {
  let data = evt.data;
  
  if (typeof data != 'object') {
    console.error(`Invalid message: ${data}`);
  } else {
    switch (data.type) {
      case 'getStatus':
        await postStatusMessage(evt.source);
        break;
      
      case 'removeCacheEntry':
        await removeCacheEntry(data.data);
        // TODO do this more efficiently
        await postStatusMessage();
        break;
      
      case 'removeAllCacheEntries':
        await removeAllCacheEntries();
        // TODO do this more efficiently
        await postStatusMessage();
        break;
      
      case 'addCacheEntry':
        await addCacheEntry(data.data);
        // TODO do this more efficiently
        await postStatusMessage();
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
  
  // add config page requirements to cache if service worker page always accessible
  if (settings.serviceWorkerPageAlwaysAccessible) {
    await addConfigPageRequirementsToCache();
  }
}

addEventListener('activate', evt => {
  evt.waitUntil(serviceWorkerInitFunc());
});

async function putInCache(request, response, filterInvalidMimeTypes) {
  if (!(filterInvalidMimeTypes && NON_CACHED_MIME_TYPES.has(response.headers.get('content-type').split('; ')[0]))) {
    let cache = await caches.open(currentServiceWorkerHash);
    await cache.put(request, response);
    if (filterInvalidMimeTypes) {
      // this code path triggered if something is intended to be added to cache
      await postStatusMessage();
    }
    return true;
  } else {
    return false;
  }
}

async function getCacheEntries() {
  let cache = await caches.open(currentServiceWorkerHash);
  let requests = await cache.keys();
  return requests.map(x => new URL(x.url).pathname);
}

async function removeCacheEntry(url) {
  let cache = await caches.open(currentServiceWorkerHash);
  await cache.delete(url);
}

async function removeAllCacheEntries() {
  let cache = await caches.open(currentServiceWorkerHash);
  let requests = await cache.keys();
  await Promise.allSettled(requests.map(x => cache.delete(x)));
}

async function addCacheEntry(url) {
  let cache = await caches.open(currentServiceWorkerHash);
  await cache.add(url);
}

async function addConfigPageRequirementsToCache() {
  let cache = await caches.open(currentServiceWorkerHash);
  let result = await Promise.allSettled(Array.from(SERVICE_WORKER_CONFIG_PAGE_REQUIREMENTS).map(x => cache.add(x)));
  for (let resultPart of result) {
    if (resultPart instanceof Error) {
      throw resultPart;
    }
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
    if (SERVICE_WORKER_CONFIG_PAGE_REQUIREMENTS.has(url.pathname)) {
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
    if (SERVICE_WORKER_CONFIG_PAGE_REQUIREMENTS.has(url.pathname)) {
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

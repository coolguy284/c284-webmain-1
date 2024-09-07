importScripts('/libs/service_worker.js');

let currentServiceWorkerHash = '{currentServiceWorkerHash}';

let settings = null;

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
}

addEventListener('activate', evt => {
  evt.waitUntil(serviceWorkerInitFunc());
});

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
      
      default:
        console.error(`Invalid message type: ${data.type}`);
    }
  }
});

async function serviceWorkerInitFunc() {
  settings = await loadSettingsFromStorage();
}

addEventListener('activate', evt => {
  evt.waitUntil(serviceWorkerInitFunc());
});

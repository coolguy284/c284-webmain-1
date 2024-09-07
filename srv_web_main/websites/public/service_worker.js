importScripts('/libs/service_worker.js');

let currentServiceWorkerHash = '{currentServiceWorkerHash}';

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
      
      default:
        console.error(`Invalid message type: ${data.type}`);
    }
  }
});

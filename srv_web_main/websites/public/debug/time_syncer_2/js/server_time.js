async function getServerTime() {
  return await new Promise((r, j) => {
    if (DUMMY_MODE) {
      setTimeout(() => {
        let error = false;
        if (DUMMY_ERROR_PROBABILITY > 0) {
          if (DUMMY_ERROR_PROBABILITY >= 1) {
            error = true;
          } else {
            error = Math.random() <= DUMMY_ERROR_PROBABILITY;
          }
        }
        if (error) {
          j(new Error('XHR Dummy Error'));
        } else {
          r({
            roundTripMS: DUMMY_LATENCY,
            clientDiffMS: DUMMY_OFFSET + (Date.now() - window.startTime) / 1000 * DUMMY_OFFSET_SLEW,
          });
        }
      }, DUMMY_LATENCY);
    } else {
      let requestStartClientTimeMS = Date.now();
      
      if (ARTIFICIAL_LATENCY > 0) {
        setTimeout(() => {
          getServerTimeStartProcessing(r, j, requestStartClientTimeMS);
        }, ARTIFICIAL_LATENCY);
      } else {
        getServerTimeStartProcessing(r, j, requestStartClientTimeMS);
      }
    }
  });
}

function getServerTimeStartProcessing(r, j, requestStartClientTimeMS) {
  let request = new XMLHttpRequest();
  request.open('GET', TIME_PING_URL);
  request.send();
  request.addEventListener('load', () => {
    if (ARTIFICIAL_LATENCY > 0) {
      setTimeout(() => {
        getServerTimeEndProcessing(r, requestStartClientTimeMS, request);
      }, ARTIFICIAL_LATENCY);
    } else {
      getServerTimeEndProcessing(r, requestStartClientTimeMS, request);
    }
  }, true);
  request.addEventListener('error', () => {
    j(new Error('XHR Error'));
  });
  request.addEventListener('abort', () => {
    j(new Error('XHR Abort'));
  });
  request.addEventListener('timeout', () => {
    j(new Error('XHR Timeout'));
  });
}

function getServerTimeEndProcessing(r, requestStartClientTimeMS, request) {
  let requestEndClientTimeMS = Date.now();
  let requestMiddleClientTimeMS = (requestEndClientTimeMS + requestStartClientTimeMS) / 2;
  let requestMiddleServerTimeMS = Number(request.responseText);
  
  let roundTripMS = requestEndClientTimeMS - requestStartClientTimeMS;
  let clientDiffMS = requestMiddleClientTimeMS - requestMiddleServerTimeMS;
  
  r({
    roundTripMS,
    clientDiffMS,
  });
}

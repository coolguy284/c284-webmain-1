var common = require('../common');

module.exports = async function connectMethod(requestProps) {
  // this is exclusively for http2
  if (requestProps.httpVersion == 1) return 1;
  
  if (requestProps.headers[':protocol'] == 'websocket') {
    if (requestProps.url.pathname == '/echows') {
      let req = {
        method: 'GET',
        headers: { ...requestProps.headers, 'sec-websocket-key': 'aaaaaaaaaaaaaaaaaaaaaa==', upgrade: 'websocket' },
      };
      
      let streamWrite = requestProps.stream.write;
      requestProps.stream.write = v => {
        requestProps.stream.respond({ ':status': 200 });
        requestProps.stream.write = streamWrite;
      };
      
      requestProps.stream.setNoDelay = () => {};
      
      common.resp.ws(echoWSServer, req, requestProps.stream, Buffer.alloc(0), requestProps);
    } else {
      await common.resp.s404(requestProps);
    }
  } else {
    await common.resp.s404(requestProps);
  }
};

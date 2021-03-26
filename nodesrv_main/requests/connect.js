//var WebSocket = require('ws');

module.exports = async function connectMethod(requestProps) {
  // this is pretty much exclusively for websockets
  if (requestProps.httpVersion == 1) return 1;
  
  // this code definitely doesnt work so its disabled for now
  /*if (requestProps.headers[':protocol'] == 'websocket') {
    if (requestProps.url.pathname == '/echows') {
      var ws = new WebSocket(null);
      ws.setSocket(requestProps.stream, Buffer.alloc(0), echoWSServer.options.maxPayload);
    } else {
      await common.resp.s404(requestProps);
    }
  }*/
  requestProps.stream.close();
};

var common = require('../common');

module.exports = async function connectMethod(requestProps) {
  // this is exclusively for http2
  if (requestProps.httpVersion == 1) return 1;
  
  if (requestProps.headers[':protocol'] == 'websocket') {
    if (requestProps.url.pathname == '/echows') {
      common.resp.ws(echoWSServer, requestProps);
    } else if (requestProps.url.pathname == '/chat/ws') {
      common.resp.ws(chatWSServer, requestProps);
    } else {
      await common.resp.s404(requestProps);
    }
  } else {
    await common.resp.s404(requestProps);
  }
};

var { getPublicPath } = require('../common/get_request_misc');
var { isSubDir } = require('../common/misc');
var resp = require('../common/resp');

module.exports = async function optionsMethod(requestProps) {
  var publicPath = getPublicPath(requestProps.url.pathname);
  
  if (!isSubDir('websites/public', publicPath)) {
    await resp.headers(requestProps, 204, { 'allow': 'options, get, head' });
    await resp.end(requestProps);
    return;
  }
  
  if (requestProps.url.pathname.startsWith('/api/')) {
    if (requestProps.url.pathname == '/api/echo/ip') {
      await resp.headers(requestProps, 204, { 'allow': 'options, get' });
      await resp.end(requestProps);
    }
    
    else if (requestProps.url.pathname == '/api/echo/ipv4') {
      await resp.headers(requestProps, 204, { 'allow': 'options, get' });
      await resp.end(requestProps);
    }
    
    else if (requestProps.url.pathname == '/api/echo/ipv6') {
      await resp.headers(requestProps, 204, { 'allow': 'options, get' });
      await resp.end(requestProps);
    }
    
    else if (requestProps.url.pathname == '/api/echo/headers') {
      await resp.headers(requestProps, 204, { 'allow': 'options, get' });
      await resp.end(requestProps);
    }
    
    else if (requestProps.url.pathname == '/api/query/current_time') {
      await resp.headers(requestProps, 204, { 'allow': 'options, get' });
      await resp.end(requestProps);
    }
    
    else if (requestProps.url.pathname == '/api/own_eyes/v1') {
      await resp.headers(requestProps, 204, { 'allow': 'options, get, post' });
      await resp.end(requestProps);
    }
    
    else if (requestProps.url.pathname == '/api/null') {
      await resp.headers(requestProps, 204, { 'allow': 'options, get, head, post' });
      await resp.end(requestProps);
    }
    
    else {
      await resp.headers(requestProps, 204, { 'allow': 'options' });
      await resp.end(requestProps);
    }
  }
  
  else if (requestProps.url.pathname == '/r') {
    if (requestProps.url.search.startsWith('?u=') || requestProps.url.search.startsWith('?uh=') || requestProps.url.search.startsWith('?e=') || requestProps.url.search.startsWith('?eh=')) {
      await resp.headers(requestProps, 204, { 'allow': 'options, get' });
      await resp.end(requestProps);
    } else {
      await resp.headers(requestProps, 204, { 'allow': 'options' });
      await resp.end(requestProps);
    }
  }
  
  else {
    await resp.headers(requestProps, 204, { 'allow': 'options, get, head' });
    await resp.end(requestProps);
  }
};

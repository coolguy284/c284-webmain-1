var common = require('../common');

module.exports = async function optionsMethod(requestProps) {
  var publicPath = common.getPublicPath(requestProps.url.pathname);
  
  if (!common.isSubDir('websites/public', publicPath)) {
    await common.resp.headers(requestProps, 204, { 'allow': 'options, get, head' });
    await common.resp.end(requestProps);
    return;
  }
  
  if (requestProps.url.pathname.startsWith('/api/')) {
    if (requestProps.url.pathname == '/api/echo/ip') {
      await common.resp.headers(requestProps, 204, { 'allow': 'options, get' });
      await common.resp.end(requestProps);
    }
    
    else if (requestProps.url.pathname == '/api/echo/ipv4') {
      await common.resp.headers(requestProps, 204, { 'allow': 'options, get' });
      await common.resp.end(requestProps);
    }
    
    else if (requestProps.url.pathname == '/api/echo/ipv6') {
      await common.resp.headers(requestProps, 204, { 'allow': 'options, get' });
      await common.resp.end(requestProps);
    }
    
    else if (requestProps.url.pathname == '/api/own_eyes/v1') {
      await common.resp.headers(requestProps, 204, { 'allow': 'options, get, post' });
      await common.resp.end(requestProps);
    }
    
    else if (requestProps.url.pathname == '/api/null') {
      await common.resp.headers(requestProps, 204, { 'allow': 'options, get, head, post' });
      await common.resp.end(requestProps);
    }
    
    else {
      await common.resp.headers(requestProps, 204, { 'allow': 'options, get' });
      await common.resp.end(requestProps);
    }
  }
  
  else if (requestProps.url.pathname == '/r') {
    if (requestProps.url.search.startsWith('?u=') && requestProps.url.search.startsWith('?uh=') && requestProps.url.search.startsWith('?e=') && requestProps.url.search.startsWith('?eh=')) {
      await common.resp.headers(requestProps, 204, { 'allow': 'options, get' });
      await common.resp.end(requestProps);
    }
  }
  
  else {
    await common.resp.headers(requestProps, 204, { 'allow': 'options, get, head' });
    await common.resp.end(requestProps);
  }
};

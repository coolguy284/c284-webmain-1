module.exports = exports = {
  constVars: {
    hstsHosts: new Set(['coolguy284.com', 'priv.coolguy284.com']),
    noLogHosts: new Set(['priv.coolguy284.com']),
    
    otherServers: new Map([
      ['srv_web_old', {
        host: 'srv_web_old',
        port: 8080,
        forceHttps: false,
        castIPv4to6: false,
        forwardSimpleProto: false,
        noLogURLs: new Set(['/livechat.dat', '/liverchat.json', '/liveviews.dat', '/comms.json', '/colog.dat', '/cologd.dat', '/livechathere.dat', '/livechattyp.dat', '/livechatkick.dat', '/pkey.log', '/lat.log']),
        noLogUrlStarts: ['/s?her=', '/s?typ=', '/s?typnew=', '/m?cnl=', '/a?co=', '/a?cd=', '/a?ccp=', '/a?rc=', '/a?fstyp=', '/a?fsdir=', '/a?fstex='],
      }],
      ['srv_web_old2', {
        host: 'srv_web_old2',
        port: 8080,
        forceHttps: false,
        castIPv4to6: false,
        forwardSimpleProto: false,
        noLogURLs: new Set(),
        noLogUrlStarts: [],
      }],
      ['srv_web_oldg', {
        host: 'srv_web_oldg',
        port: 8080,
        forceHttps: false,
        castIPv4to6: false,
        forwardSimpleProto: false,
        noLogURLs: new Set(),
        noLogUrlStarts: [],
      }],
      /*['srv_web_main', {
        host: 'localhost',
        port: 8080,
        forceHttps: false,
        castIPv4to6: false,
        forwardSimpleProto: false,
        noLogURLs: new Set([]),
        noLogUrlStarts: ['/api'],
      }],*/
    ]),
    
    otherServerHosts: new Map([
      ['old.coolguy284.com', 'srv_web_old'],
      ['old2.coolguy284.com', 'srv_web_old2'],
      ['oldg.coolguy284.com', 'srv_web_oldg'],
    ]),
    otherServerURLStarts: new Map([
      ['/old/', 'srv_web_old'],
      ['/old2/', 'srv_web_old2'],
      ['/oldg/', 'srv_web_oldg'],
      //['/main/', 'srv_web_main'],
    ]),
    
    otherServerHostsSet: null,
    otherServerURLStartsArr: null,
    
    _otherServerInvalidHeaders: new Set(['content-length', 'x-c284-nolog']),
  },
  
  vars: {
    mongoProxyServer: null,
    mongoProxyServerConns: null,
    mongoClient: null,
    
    currentRequestID: 0,
    
    tcpServer: null,
    httpServer: null,
    httpServerConns: null,
    
    tlsServer: null,
    tlsSessionStore: null,
    httpsServer: null,
    httpsServerConns: null,
    http2Server: null,
    http2ServerSessions: null,
    http2ServerStreams: null,
    
    httpServerProxyConns: null,
    
    echoWSServer: null,
    chatWSServer: null,
    chatWSServerMap: null,
    statusWSServer: null,
    
    filesCache: null,
    
    tickIntMs: null,
    ticks: null,
    tickFunc: null,
    tickInt: null,
    
    exitHandlerCalled: null,
    
    replServer: null,
    
    ownEyesCodes: new Map(),
  },
};

exports.constVars.otherServerHostsSet = new Set(exports.constVars.otherServerHosts.keys());
exports.constVars.otherServerURLStartsArr = Array.from(exports.constVars.otherServerURLStarts.keys());

function toBool(str, defaultBool) {
  if (str == null || str == '')
    return defaultBool ?? false;
  else
    return str == 'false' || str == '0' ? false : true;
}

var envTypeConverts = new Map([
  ['PROC_MONGODB_ENABLED', toBool],
  ['PROC_MONGODB_LOG_CONS', toBool],
  
  ['SRV_WEB_MAIN_LOG_REQUESTS', toBool],
  ['SRV_WEB_MAIN_LOG_DEBUG', toBool],
  ['SRV_WEB_MAIN_TLS_KEY_FILE', null],
  ['SRV_WEB_MAIN_TLS_CERT_FILE', null],
  ['SRV_WEB_MAIN_TLS_CERT_ROOT_FILE', null],
  ['SRV_WEB_MAIN_HTTP_IP', null],
  ['SRV_WEB_MAIN_HTTP_PORT', parseInt],
  ['SRV_WEB_MAIN_HTTPS_IP', null],
  ['SRV_WEB_MAIN_HTTPS_PORT', parseInt],
  ['SRV_WEB_MAIN_TICK_INTERVAL', Number],
  ['SRV_WEB_MAIN_CACHE_MODE', parseInt],
  ['SRV_WEB_MAIN_SERVER_ID', parseInt],
  ['SRV_WEB_MAIN_CHAT_IDLE_TIMEOUT', parseInt],
  
  ['SRV_WEB_OLD_ENABLED', toBool],
  ['SRV_WEB_OLD2_ENABLED', toBool],
  ['SRV_WEB_OLDG_ENABLED', toBool],
]);

var env = Object.fromEntries(Array.from(envTypeConverts.entries()).map(([key, convertFunc]) => {
  var envVar = process.env[key], envVarConverted;
  if (convertFunc && envVar) {
    try {
      envVarConverted = convertFunc(envVar);
      if (Object.is(envVarConverted, NaN))
        envVarConverted = null;
    } catch (e) {
      envVarConverted = null;
    }
  } else {
    envVarConverted = envVar == '' ? null : envVar;
  }
  return [key, envVarConverted];
}));

module.exports = {
  toBool, envTypeConverts, env,
};

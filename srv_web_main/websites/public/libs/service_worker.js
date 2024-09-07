let SERVICE_WORKER_OPFS_MAIN_FOLDER = 'service_worker';
let SERVICE_WORKER_OPFS_MAIN_STORAGE_FILE = 'settings';
let SERVICE_WORKER_SETTING_DEFAULTS = {
  enabled: true,
  serviceWorkerPageAlwaysAccessible: true,
  sendCacheBeforeFetch: false,
  autoAddNewPagesToCache: true,
  sendCachedPagesWhenOffline: true,
  sendOfflineIndicatorForNonCachedPagesWhenOffline: false,
  maxCacheSize: 4000,
};

async function loadSettingsFromStorage() {
  let baseDir = await navigator.storage.getDirectory();
  let fileContents = null;
  try {
    let mainFolder = await baseDir.getDirectoryHandle(SERVICE_WORKER_OPFS_MAIN_FOLDER);
    let mainFile = await mainFolder.getFileHandle(SERVICE_WORKER_OPFS_MAIN_STORAGE_FILE);
    let fileText = await (await mainFile.getFile()).text();
    let workingFileContents = JSON.parse(fileText);
    if (typeof workingFileContents == 'object') {
      fileContents = workingFileContents;
    }
  } catch { /* empty */ }
  
  return {
    enabled:
      typeof fileContents?.enabled == 'boolean' ?
      fileContents?.enabled :
      SERVICE_WORKER_SETTING_DEFAULTS.enabled,
    
    serviceWorkerPageAlwaysAccessible:
      typeof fileContents?.enabled == 'boolean' ?
      fileContents?.serviceWorkerPageAlwaysAccessible :
      SERVICE_WORKER_SETTING_DEFAULTS.serviceWorkerPageAlwaysAccessible,
    
    sendCacheBeforeFetch:
      typeof fileContents?.enabled == 'boolean' ?
      fileContents?.sendCacheBeforeFetch :
      SERVICE_WORKER_SETTING_DEFAULTS.sendCacheBeforeFetch,
    
    autoAddNewPagesToCache:
      typeof fileContents?.enabled == 'boolean' ?
      fileContents?.autoAddNewPagesToCache :
      SERVICE_WORKER_SETTING_DEFAULTS.autoAddNewPagesToCache,
    
    sendCachedPagesWhenOffline:
      typeof fileContents?.enabled == 'boolean' ?
      fileContents?.sendCachedPagesWhenOffline :
      SERVICE_WORKER_SETTING_DEFAULTS.sendCachedPagesWhenOffline,
    
    sendOfflineIndicatorForNonCachedPagesWhenOffline:
      typeof fileContents?.enabled == 'boolean' ?
      fileContents?.sendOfflineIndicatorForNonCachedPagesWhenOffline :
      SERVICE_WORKER_SETTING_DEFAULTS.sendOfflineIndicatorForNonCachedPagesWhenOffline,
    
    maxCacheSize:
      Number.isSafeInteger(fileContents?.maxCacheSize) && fileContents?.maxCacheSize >= 0 ||
        fileContents?.maxCacheSize == Infinity ?
      fileContents?.maxCacheSize :
      SERVICE_WORKER_SETTING_DEFAULTS.maxCacheSize,
  };
}

async function saveSettingsToStorage(settings) {
  if (typeof settings != 'object') {
    throw new Error('settings object invalid');
  }
  
  let baseDir = await navigator.storage.getDirectory();
  let mainFolder = await baseDir.getDirectoryHandle(SERVICE_WORKER_OPFS_MAIN_FOLDER, { create: true });
  let mainFile = await mainFolder.getFileHandle(SERVICE_WORKER_OPFS_MAIN_STORAGE_FILE, { create: true });
  let writeHandle = await mainFile.createWritable();
  await writeHandle.write(JSON.stringify(settings));
  await writeHandle.close();
}

// Updates settings with newsettings
function mergeSettingsObject(settings, newSettings) {
  Object.assign(settings, {
    enabled:
      typeof newSettings?.enabled == 'boolean' ?
      newSettings?.enabled :
      settings.enabled,
    
    serviceWorkerPageAlwaysAccessible:
      typeof newSettings?.enabled == 'boolean' ?
      newSettings?.serviceWorkerPageAlwaysAccessible :
      settings.serviceWorkerPageAlwaysAccessible,
    
    sendCacheBeforeFetch:
      typeof newSettings?.enabled == 'boolean' ?
      newSettings?.sendCacheBeforeFetch :
      settings.sendCacheBeforeFetch,
    
    autoAddNewPagesToCache:
      typeof newSettings?.enabled == 'boolean' ?
      newSettings?.autoAddNewPagesToCache :
      settings.autoAddNewPagesToCache,
    
    sendCachedPagesWhenOffline:
      typeof newSettings?.enabled == 'boolean' ?
      newSettings?.sendCachedPagesWhenOffline :
      settings.sendCachedPagesWhenOffline,
    
    sendOfflineIndicatorForNonCachedPagesWhenOffline:
      typeof newSettings?.enabled == 'boolean' ?
      newSettings?.sendOfflineIndicatorForNonCachedPagesWhenOffline :
      settings.sendOfflineIndicatorForNonCachedPagesWhenOffline,
    
    maxCacheSize:
      Number.isSafeInteger(newSettings?.maxCacheSize) && newSettings?.maxCacheSize >= 0 ||
        newSettings?.maxCacheSize == Infinity ?
      newSettings?.maxCacheSize :
      settings.maxCacheSize,
  });
}

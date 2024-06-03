function dateToString(date) {
  let str = date.toString();
  
  let [ timeStr, utcOffsetStr ] = str.split(' GMT');
  
  return `${timeStr}.${(date.getMilliseconds() + '').padStart(3, '0')} GMT${utcOffsetStr}`;
}

function msToString(ms) {
  let prefix = ms < 0 ? '-' : '+';
  
  ms = Math.abs(ms);
  
  let [ int, frac ] = ms.toFixed(3).split('.');
  
  return `${prefix}${int}.${frac}`;
}

function hmsToString(secs) {
  if (secs < 0) {
    return `-${hmsToString(-secs)}`;
  } else {
    return `${Math.floor(secs / 3600)}h ${Math.floor(secs / 60 % 60)}m ${Math.floor(secs % 60)}s`;
  }
}

module.exports = function parseArgString(str) {
  let args = [];
  
  let part = '', mode = 0, escape = 0, escapechr = '';
  for (var i = 0, chr; i < str.length; i++) {
    chr = str[i];
    switch (mode) {
      case 0: // normal chars
        if (chr == '"') {
          if (!part.length) mode = 1;
          else part += chr;
        } else if (chr == '\'') {
          if (!part.length) mode = 2;
          else part += chr;
        } else if (chr == ' ' || chr == '\n') {
          if (part) { args.push(part); part = ''; }
        } else { part += chr; }
        break;
      
      case 1: // double quotes
        switch (escape) {
          case 0:
            if (chr == '"') { args.push(part); part = ''; mode = 0; }
            else if (chr == '\\') { escape = 1; }
            else { part += chr; }
            break;
          
          case 1: // escape
            if (chr == 'n') { part += '\n'; escape = 0; }
            else if (chr == 'r') { part += '\r'; escape = 0; }
            else if (chr == 't') { part += '\t'; escape = 0; }
            else if (chr == 'b') { part += '\b'; escape = 0; }
            else if (chr == 'x') { escape = 2; }
            else if (chr == 'u') { escape = 4; }
            else { part += chr; escape = 0; }
            break;
          
          case 2: // x escape sequence
          case 3:
            if (/^[0-9a-f]$/.test(chr.toLowerCase())) escapechr += chr.toLowerCase();
            else escapechr += '0';
            if (escape != 3) escape++;
            else { part += String.fromCharCode(parseInt(escapechr, 16)); escapechr = ''; escape = 0; }
            break;
          
          case 4: // u escape sequence
          case 5:
          case 6:
          case 7:
            if (/^[0-9a-f]$/.test(chr.toLowerCase())) escapechr += chr.toLowerCase();
            else escapechr += '0';
            if (escape != 7) escape++;
            else { part += String.fromCharCode(parseInt(escapechr, 16)); escapechr = ''; escape = 0; }
            break;
        }
        break;
      
      case 2: // single quotes
        switch (escape) {
          case 0:
            if (chr == '\'') { args.push(part); part = ''; mode = 0; }
            else if (chr == '\\') { escape = 1; }
            else { part += chr; }
            break;
          
          case 1: // escape
            if (chr == 'n') { part += '\n'; escape = 0; }
            else if (chr == 'r') { part += '\r'; escape = 0; }
            else if (chr == 't') { part += '\t'; escape = 0; }
            else if (chr == 'b') { part += '\b'; escape = 0; }
            else if (chr == 'x') { escape = 2; }
            else if (chr == 'u') { escape = 4; }
            else { part += chr; escape = 0; }
            break;
          
          case 2: // x escape sequence
          case 3:
            if (/^[0-9a-f]$/.test(chr.toLowerCase())) escapechr += chr.toLowerCase();
            else escapechr += '0';
            if (escape != 3) escape++;
            else { part += String.fromCharCode(parseInt(escapechr, 16)); escapechr = ''; escape = 0; }
            break;
          
          case 4: // u escape sequence
          case 5:
          case 6:
          case 7:
            if (/^[0-9a-f]$/.test(chr.toLowerCase())) escapechr += chr.toLowerCase();
            else escapechr += '0';
            if (escape != 7) escape++;
            else { part += String.fromCharCode(parseInt(escapechr, 16)); escapechr = ''; escape = 0; }
            break;
        }
        break;
    }
  }
  
  if (part) args.push(part);
  
  return args;
};

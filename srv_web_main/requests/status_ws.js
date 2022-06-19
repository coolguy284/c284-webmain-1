var logger = require('../log_utils.js')('requests/status_ws');

var BSON = require('bson');
var statusUilts = require('../common/status_utils');

function statusWSFunc(ws, req, requestProps) {
  switch (requestProps.url.searchParams.get('version')) {
    case '1':
      let wsInfo = { incID: 0 };
      
      ws.on('message', msg => {
        try { msg = BSON.deserialize(msg); } catch (e) {
          ws.send(BSON.serialize({
            type: 'error',
            code: 'wsmsg_invalid_bson',
            description: 'WebSocket message BSON is invalid.',
            addl_data: {
              original_msg: msg,
            },
          }));
          return;
        }
        
        try { msg = statusUilts.validateVer1WSMsg(msg); } catch (e) {
          ws.send(BSON.serialize({
            id: Number.isSafeInteger(msg.id) ? msg.id : null,
            type: 'error',
            code: 'wsmsg_invalid_structure',
            description: 'WebSocket message object structure is invalid' +
              (e instanceof statusUilts.ValidationError ? ': ' + e.message : '') + '.',
          }));
          return;
        }
        
        switch (msg.type) {
          case 'status_update_request':
            ws.send(BSON.serialize({
              id: wsInfo.incID++,
              type: 'status_update',
              update_info: msg.fields ? Object.fromEntries(msg.fields.map(x => {
                switch (x) {
                  case 'os_type': return [x, process.platform];
                  case 'nodejs_version': return [x, process.version];
                }
              }).filter(x => x != null)) : {
                os_type: process.platform,
                node_ver: process.version,
              },
            }));
            break;
        }
      });
      
      ws.send(BSON.serialize({
        id: wsInfo.incID++,
        type: 'status_update',
        update_info: {
          os_type: process.platform,
          nodejs_version: process.version,
        },
      }));
      break;
  }
}

module.exports = {
  statusWSFunc,
};

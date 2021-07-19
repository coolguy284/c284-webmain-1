var logger = require('../logutils.js')('requests/chatws');

var BSON = require('bson');
var chatDBUilts = require('../common/chatdbutils');

function chatWSFunc(ws, req, requestProps) {
  let wsInfo;
  switch (requestProps.url.searchParams.get('version')) {
    case '1':
      chatWSServerMap.set(ws, wsInfo = { chatID: 1, username: null });
      ws.on('message', async msg => {
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
        
        try { msg = chatDBUilts.validateVer1WSMsg(msg); } catch (e) {
          ws.send(BSON.serialize({
            id: Number.isSafeInteger(msg.id) ? msg.id : null,
            type: 'error',
            code: 'wsmsg_invalid_structure',
            description: 'WebSocket message object structure is invalid' +
              (e instanceof chatDBUilts.ValidationError ? ': ' + e.message : '') + '.',
          }));
          return;
        }
        
        switch (msg.type) {
          case 'auth':
            if (msg.username && msg.username.length > 128) {
              ws.send(BSON.serialize({
                id: msg.id,
                type: 'error',
                code: 'username_too_long',
                description: 'Username must be 128 characters or less.',
              }));
            } else {
              ws.send(BSON.serialize({
                id: msg.id,
                type: 'auth_ack',
              }));
              wsInfo.username = msg.username;
            }
            break;
          
          case 'read_messages':
            ws.send(BSON.serialize({
              id: msg.id,
              type: 'read_messages_resp',
              messages: (await mongoClient.db('channels').collection('AQAAAXq7jAfzAQABZ_dDUQ').find().toArray()).map(chatDBUilts.ver1MongoMsgToMsg),
            }));
            break;
          
          case 'send_message':
            if (wsInfo.username == null) {
              ws.send(BSON.serialize({
                id: msg.id,
                type: 'error',
                code: 'not_authed',
                description: 'Message cannot be sent as no username was provided.',
              }));
            } else if (msg.content.length > 65536) {
              ws.send(BSON.serialize({
                id: msg.id,
                type: 'error',
                code: 'message_too_long',
                description: 'Message content must be 65536 characters or less.',
              }));
            } else {
              let msgObj = chatDBUilts.ver1MsgToMongoMsg(chatDBUilts.validateVer1Msg({ author: wsInfo.username, content: msg.content }));
              
              let collection = mongoClient.db('channels').collection('AQAAAXq7jAfzAQABZ_dDUQ');
              await collection.insertOne(msgObj);
              
              if (await collection.countDocuments() > 1024)
                await collection.deleteOne();
              
              ws.send(BSON.serialize({
                id: msg.id,
                type: 'send_message_ack',
              }));
            }
            break;
        }
      });
      break;
    
    default:
      // this has to use a short string instead of a buffer
      ws.close(4001, 'Error: invalid_chat_protocol_version: Chat version number must be 1.');
      break;
  }
}

var chatStream;
function mongoClientOnConnect() {
  chatStream = mongoClient.db('channels').collection('AQAAAXq7jAfzAQABZ_dDUQ').watch();
  
  chatStream.on('change', changeEvent => {
    //if (changeEvent.operationType != 'insert') console.log(changeEvent);
    if (changeEvent.operationType == 'insert') {
      for (var ws of chatWSServer.clients) {
        if (ws.readyState == 1 && chatWSServerMap.get(ws).username != null) {
          ws.send(BSON.serialize({
            id: chatWSServerMap.get(ws).chatID++,
            type: 'message',
            message: chatDBUilts.ver1MongoMsgToMsg(changeEvent.fullDocument),
          }));
        }
      }
    }
  });
}

module.exports = {
  chatWSFunc, chatStream, mongoClientOnConnect,
};

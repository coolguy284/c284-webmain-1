var BSON = require('bson');
var chatDBUilts = require('../common/chat_db_utils');
var { env } = require('../common/env');
var { vars: commonVars } = require('../common/vars');

function chatWSFunc(ws, req, requestProps) {
  if (env.PROC_MONGODB_ENABLED) {
    let wsInfo;
    switch (requestProps.url.searchParams.get('version')) {
      case '1':
        commonVars.chatWSServerMap.set(ws, wsInfo = { incID: 1, username: null, typing: false });
        
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
                if (wsInfo.username != msg.username) {
                  if (wsInfo.username != null) {
                    let ws2;
                    for (ws2 of commonVars.chatWSServer.clients) {
                      let obj;
                      if (ws2.readyState == 1 && (obj = commonVars.chatWSServerMap.get(ws2)).username != null) {
                        ws2.send(BSON.serialize({
                          id: obj.incID++,
                          type: 'user_leave',
                          username: wsInfo.username,
                        }));
                      }
                    }
                  }
                  
                  wsInfo.username = msg.username;
                  
                  if (wsInfo.username != null) {
                    let ws2;
                    for (ws2 of commonVars.chatWSServer.clients) {
                      let obj;
                      if (ws2.readyState == 1 && (obj = commonVars.chatWSServerMap.get(ws2)).username != null) {
                        ws2.send(BSON.serialize({
                          id: obj.incID++,
                          type: 'user_join',
                          username: wsInfo.username,
                        }));
                      }
                    }
                  }
                }
                
                ws.send(BSON.serialize({
                  id: msg.id,
                  type: 'auth_ack',
                }));
              }
              break;
            
            case 'get_users':
              if (wsInfo.username == null) {
                ws.send(BSON.serialize({
                  id: msg.id,
                  type: 'error',
                  code: 'not_authed',
                  description: 'Cannot get users until a username is provided.',
                }));
              } else {
                ws.send(BSON.serialize({
                  id: msg.id,
                  type: 'get_users_resp',
                  users: Array.from(commonVars.chatWSServer.clients)
                    .map(x => {
                      let obj = commonVars.chatWSServerMap.get(x);
                      return obj && obj.username;
                    }).filter(x => x != null),
                }));
              }
              break;
            
            case 'get_typings':
              if (wsInfo.username == null) {
                ws.send(BSON.serialize({
                  id: msg.id,
                  type: 'error',
                  code: 'not_authed',
                  description: 'Cannot get typings until a username is provided.',
                }));
              } else {
                ws.send(BSON.serialize({
                  id: msg.id,
                  type: 'get_typings_resp',
                  users: Array.from(commonVars.chatWSServer.clients)
                    .map(x => {
                      let obj = commonVars.chatWSServerMap.get(x);
                      return obj && obj.username != null && obj.typing ? obj.username : null;
                    }).filter(x => x != null),
                }));
              }
              break;
            
            case 'read_messages':
              if (wsInfo.username == null) {
                ws.send(BSON.serialize({
                  id: msg.id,
                  type: 'error',
                  code: 'not_authed',
                  description: 'Cannot read messages until a username is provided.',
                }));
              } else {
                ws.send(BSON.serialize({
                  id: msg.id,
                  type: 'read_messages_resp',
                  messages: (await commonVars.mongoClient.db('channels').collection('AQAAAXq7jAfzAQABZ_dDUQ').find().toArray()).map(chatDBUilts.ver1MongoMsgToMsg),
                }));
              }
              break;
            
            case 'set_typing':
              if (wsInfo.username == null) {
                ws.send(BSON.serialize({
                  id: msg.id,
                  type: 'error',
                  code: 'not_authed',
                  description: 'Cannot set typings until a username is provided.',
                }));
              } else if (wsInfo.typing != msg.typing) {
                wsInfo.typing = msg.typing;
                let ws2;
                for (ws2 of commonVars.chatWSServer.clients) {
                  let obj;
                  if (ws2.readyState == 1 && (obj = commonVars.chatWSServerMap.get(ws2)).username != null) {
                    ws2.send(BSON.serialize({
                      id: obj.incID++,
                      type: 'typing_update',
                      username: wsInfo.username,
                      typing: wsInfo.typing,
                    }));
                  }
                }
                
                ws.send(BSON.serialize({
                  id: msg.id,
                  type: 'set_typing_ack',
                }));
              }
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
                
                let collection = commonVars.mongoClient.db('channels').collection('AQAAAXq7jAfzAQABZ_dDUQ');
                await collection.insertOne(msgObj);
                
                if (await collection.countDocuments() > 1024)
                  await collection.deleteOne();
                
                ws.send(BSON.serialize({
                  id: msg.id,
                  type: 'send_message_ack',
                  message_id: msgObj._id,
                }));
              }
              break;
            
            case 'send_message_edit':
              if (wsInfo.username == null) {
                ws.send(BSON.serialize({
                  id: msg.id,
                  type: 'error',
                  code: 'not_authed',
                  description: 'Message cannot be deleted as no username was provided.',
                }));
              } else {
                let collection = commonVars.mongoClient.db('channels').collection('AQAAAXq7jAfzAQABZ_dDUQ');
                
                let msgObj = await collection.findOne({ '_id': msg.message.id });
                
                if (msgObj == null || msgObj.author != wsInfo.username) {
                  ws.send(BSON.serialize({
                    id: msg.id,
                    type: 'error',
                    code: 'message_not_found',
                    description: 'Message cannot be found or is not authored by the current user.',
                  }));
                } else {
                  await collection.updateOne(
                    { '_id': msg.message.id },
                    { $set: {
                      content: msg.message.content,
                    } }
                  );
                
                  ws.send(BSON.serialize({
                    id: msg.id,
                    type: 'send_message_edit_ack',
                  }));
                }
              }
              break;
            
            case 'send_message_delete':
              if (wsInfo.username == null) {
                ws.send(BSON.serialize({
                  id: msg.id,
                  type: 'error',
                  code: 'not_authed',
                  description: 'Message cannot be deleted as no username was provided.',
                }));
              } else {
                let collection = commonVars.mongoClient.db('channels').collection('AQAAAXq7jAfzAQABZ_dDUQ');
                
                let msgObj = await collection.findOne({ '_id': msg.message_id });
                
                if (msgObj == null || msgObj.author != wsInfo.username) {
                  ws.send(BSON.serialize({
                    id: msg.id,
                    type: 'error',
                    code: 'message_not_found',
                    description: 'Message cannot be found or is not authored by the current user.',
                  }));
                } else {
                  await collection.deleteOne({ '_id': msg.message_id });
                
                  ws.send(BSON.serialize({
                    id: msg.id,
                    type: 'send_message_delete_ack',
                  }));
                }
              }
              break;
          }
        });
        
        ws.on('close', () => {
          if (wsInfo.username != null) {
            let ws2;
            
            if (wsInfo.typing) {
              wsInfo.typing = false;
              for (ws2 of commonVars.chatWSServer.clients) {
                let obj;
                if (ws2.readyState == 1 && (obj = commonVars.chatWSServerMap.get(ws2)).username != null) {
                  ws2.send(BSON.serialize({
                    id: obj.incID++,
                    type: 'typing_update',
                    username: wsInfo.username,
                    typing: wsInfo.typing,
                  }));
                }
              }
            }
            
            for (ws2 of commonVars.chatWSServer.clients) {
              let obj;
              if (ws2.readyState == 1 && (obj = commonVars.chatWSServerMap.get(ws2)).username != null) {
                ws2.send(BSON.serialize({
                  id: obj.incID++,
                  type: 'user_leave',
                  username: wsInfo.username,
                }));
              }
            }
          }
        });
        break;
      
      default:
        // this has to use a short string instead of a buffer
        ws.close(4001, 'Error: invalid_chat_protocol_version: Chat version number must be 1.');
        break;
    }
    
    if (env.SRV_WEB_MAIN_CHAT_IDLE_TIMEOUT)
      ws.on('pong', function heartbeat() { this.isAlive = true; });
  } else {
    ws.close(4001, 'Error: mongodb_offline: MongoDB server is offline.');
  }
}

var chatStream;
function mongoClientOnConnect() {
  chatStream = commonVars.mongoClient.db('channels').collection('AQAAAXq7jAfzAQABZ_dDUQ').watch();
  
  chatStream.on('change', changeEvent => {
    switch (changeEvent.operationType) {
      case 'insert':
        for (var ws2 of commonVars.chatWSServer.clients) {
          let obj;
          if (ws2.readyState == 1 && (obj = commonVars.chatWSServerMap.get(ws2)).username != null) {
            ws2.send(BSON.serialize({
              id: obj.incID++,
              type: 'message',
              message: chatDBUilts.ver1MongoMsgToMsg(changeEvent.fullDocument),
            }));
          }
        }
        break;
      
      case 'update':
        if (typeof changeEvent.updateDescription.updatedFields.content == 'string') {
          let ws2;
          for (ws2 of commonVars.chatWSServer.clients) {
            let obj;
            if (ws2.readyState == 1 && (obj = commonVars.chatWSServerMap.get(ws2)).username != null) {
              ws2.send(BSON.serialize({
                id: obj.incID++,
                type: 'message_edit',
                message: {
                  id: changeEvent.documentKey._id,
                  content: changeEvent.updateDescription.updatedFields.content,
                },
              }));
            }
          }
        }
        break;
      
      case 'delete': {
        let ws2;
        for (ws2 of commonVars.chatWSServer.clients) {
          let obj;
          if (ws2.readyState == 1 && (obj = commonVars.chatWSServerMap.get(ws2)).username != null) {
            ws2.send(BSON.serialize({
              id: obj.incID++,
              type: 'message_delete',
              message_id: changeEvent.documentKey._id,
            }));
          }
        }
        break;
      }
    }
  });
}

function mongoClientOnClose() {
  if (chatStream) chatStream.close();
}

module.exports = {
  chatWSFunc, chatStream, mongoClientOnConnect, mongoClientOnClose,
};

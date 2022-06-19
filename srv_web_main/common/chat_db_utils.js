module.exports = exports = {
  ValidationError: require('./utils_common').ValidationError,
  
  entityID: 0,
  entityTimestamp: 0n,
  
  parseID: id => {
    if (typeof id == 'string')
      id = Buffer.from(id, 'base64');
    
    return {
      version: id.readUInt8(0),
      timestamp: id.readBigUInt64BE(1),
      serverID: id.readUInt8(9),
      entityID: id.readUInt16BE(10),
      random: id.readUInt32BE(12),
    };
  },

  serializeID: parsedObj => {
    var id = Buffer.alloc(16);
    
    id.writeUInt8(parsedObj.version, 0);
    id.writeBigUInt64BE(parsedObj.timestamp, 1);
    id.writeUInt8(parsedObj.serverID, 9);
    id.writeUInt16BE(parsedObj.entityID, 10);
    id.writeUInt32BE(parsedObj.random, 12);
    
    return id;
  },

  stringifyID: parsedObj => (Buffer.isBuffer(parsedObj) ? parsedObj : exports.serializeID(parsedObj)).toString('base64url'),

  generateID: function generateID() {
    var id = Buffer.alloc(16), timestamp = BigInt(Date.now());

    id.writeUInt8(1, 0);
    id.writeBigUInt64BE(timestamp, 1);
    id.writeUInt8(parseInt(process.env.SRV_WEB_MAIN_SERVER_ID), 9);
    if (timestamp > exports.entityTimestamp)
      if (exports.entityID != 0) exports.entityID = 0;
    else
      exports.entityID++;
    id.writeUInt16BE(exports.entityID, 10);
    crypto.randomBytes(4).copy(id, 12);

    return id;
  },
  
  generateIDString: function generateIDString() {
    return exports.stringifyID(exports.generateID());
  },
  
  validateVer1Msg: function validateVer1Msg(msg) {
    let msgIsObject = typeof msg == 'object';
    
    return {
      version: 1,
      id: msgIsObject && typeof msg.id == 'object' ? (Buffer.isBuffer(msg.id) ? msg.id : Buffer.isBuffer(msg.id.buffer) ? msg.id.buffer : exports.generateID()) : exports.generateID(),
      author: msgIsObject && typeof msg.author == 'string' ? msg.author : null,
      content: msgIsObject && typeof msg.content == 'string' ? msg.content : '',
    };
  },
  
  ver1MsgToMongoMsg: function ver1MsgToMongoMsg(msg) {
    return {
      _id: msg.id,
      version: msg.version,
      author: msg.author,
      content: msg.content,
    };
  },
  
  ver1MongoMsgToMsg: function ver1MongoMsgToMsg(msg) {
    return {
      version: msg.version,
      id: msg._id,
      author: msg.author,
      content: msg.content,
    };
  },
  
  validateVer1WSMsg: function validateVersion1WSMsg(msg) {
    if (typeof msg != 'object') throw new exports.ValidationError('wsmsg not object');
    if (!Number.isSafeInteger(msg.id)) throw new exports.ValidationError('wsmsg.id not safe integer');
    if (typeof msg.type != 'string') throw new exports.ValidationError('wsmsg.type not string');
    
    switch (msg.type) {
      case 'error':
        return {
          id: msg.id,
          type: msg.type,
          code: typeof msg.code == 'string' ? msg.code : 'error',
          description: typeof msg.description ? msg.description : 'An error occured.',
          ...(typeof msg.addl_data == 'object' ? { addl_data : {
            ...(Buffer.isBuffer(msg.addl_data.original_msg) ? { original_msg: msg.addl_data.original_msg } : {}),
          } } : {}),
        };
      
      case 'auth':
        if (typeof msg.username != 'string' && msg.username != null) throw new exports.ValidationError('wsmsg.username not string or null');
        return {
          id: msg.id,
          type: msg.type,
          username: msg.username,
        };
      
      case 'auth_ack':
        return {
          id: msg.id,
          type: msg.type,
        };
      
      case 'get_users':
        return {
          id: msg.id,
          type: msg.type,
        };
      
      case 'get_users_resp':
        return {
          id: msg.id,
          type: msg.type,
          users: Array.isArray(msg.users) ? msg.users.filter(x => typeof x == 'string') : [],
        };
      
      case 'get_typings':
        return {
          id: msg.id,
          type: msg.type,
        };
      
      case 'get_typings_resp':
        return {
          id: msg.id,
          type: msg.type,
          users: Array.isArray(msg.users) ? msg.users.filter(x => typeof x == 'string') : [],
        };
      
      case 'read_messages':
        return {
          id: msg.id,
          type: msg.type,
        };
      
      case 'read_messages_resp':
        return {
          id: msg.id,
          type: msg.type,
          messages: Array.isArray(msg.messages) ? msg.messages.map(exports.validateVer1Msg).filter(x => x.author != null) : [],
        };
      
      case 'user_join':
        if (typeof msg.username != 'string') throw new exports.ValidationError('wsmsg.username not string');
        return {
          id: msg.id,
          type: msg.type,
          username: msg.username,
        };
      
      case 'user_leave':
        if (typeof msg.username != 'string') throw new exports.ValidationError('wsmsg.username not string');
        return {
          id: msg.id,
          type: msg.type,
          username: msg.username,
        };
      
      case 'typing_update':
        if (typeof msg.username != 'string') throw new exports.ValidationError('wsmsg.username not string');
        if (typeof msg.typing != 'boolean') throw new exports.ValidationError('wsmsg.typing not boolean');
        return {
          id: msg.id,
          type: msg.type,
          username: msg.username,
          typing: msg.typing,
        };
      
      case 'message':
        let msgObj = exports.validateVer1Msg(msg.message);
        if (msgObj.author == null) throw new exports.ValidationError('wsmsg.message.author is null');
        return {
          id: msg.id,
          type: msg.type,
          message: msgObj,
        };
      
      case 'message_edit':
        let msgObj2 = exports.validateVer1Msg(msg.message);
        if (msgObj2.author == null) throw new exports.ValidationError('wsmsg.message.author is null');
        return {
          id: msg.id,
          type: msg.type,
          message: msgObj2,
        };
      
      case 'message_delete':
        if (!Buffer.isBuffer(msg.message_id)) throw new exports.ValidationError('wsmsg.message_id is invalid');
        return {
          id: msg.id,
          type: msg.type,
          message_id: msg.message_id,
        };
      
      case 'set_typing':
        return {
          id: msg.id,
          type: msg.type,
          typing: Boolean(msg.typing),
        };
      
      case 'send_message':
        if (typeof msg.content != 'string') throw new exports.ValidationError('wsmsg.content not string');
        return {
          id: msg.id,
          type: msg.type,
          content: msg.content,
        };
      
      case 'send_message_edit':
        let msgObj3 = exports.validateVer1Msg(msg.message);
        return {
          id: msg.id,
          type: msg.type,
          message: msgObj3,
        };
      
      case 'send_message_delete':
        let messageID = typeof msg.message_id == 'object' ? (Buffer.isBuffer(msg.message_id) ? msg.message_id : Buffer.isBuffer(msg.message_id.buffer) ? msg.message_id.buffer : null) : null;
        if (!messageID) throw new exports.ValidationError('wsmsg.message_id is invalid');
        return {
          id: msg.id,
          type: msg.type,
          message_id: messageID,
        };
      
      case 'set_typing_ack':
        return {
          id: msg.id,
          type: msg.type,
        };
      
      case 'send_message_ack':
        if (!Buffer.isBuffer(msg.message_id)) throw new exports.ValidationError('wsmsg.message_id is invalid');
        return {
          id: msg.id,
          type: msg.type,
          message_id: msg.message_id,
        };
      
      case 'send_message_edit_ack':
        return {
          id: msg.id,
          type: msg.type,
        };
      
      case 'send_message_delete_ack':
        return {
          id: msg.id,
          type: msg.type,
        };
      
      default:
        throw new exports.ValidationError(`wsmsg.type of ${JSON.stringify(msg.type)} is unknown`);
    }
  },
};

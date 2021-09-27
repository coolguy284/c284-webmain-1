module.exports = {
  ValidationError: require('./utilscommon').ValidationError,
  
  validateVer1Msg: function validateVer1Msg(msg) {
    let msgIsObject = typeof msg == 'object';
    
    return {
      version: 1,
      id: msgIsObject && typeof msg.id == 'object' ? (Buffer.isBuffer(msg.id) ? msg.id : Buffer.isBuffer(msg.id.buffer) ? msg.id.buffer : exports.generateID()) : exports.generateID(),
      author: msgIsObject && typeof msg.author == 'string' ? msg.author : null,
      content: msgIsObject && typeof msg.content == 'string' ? msg.content : '',
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
        };
      
      case 'status_update_request':
        return {
          id: msg.id,
          type: msg.type,
          ...(Array.isArray(msg.fields) ? { fields: msg.fields.filter(x => typeof x == 'string') } : {}),
        };
      
      case 'status_update':
        return {
          id: msg.id,
          type: msg.type,
          updated_info: typeof msg.updated_info == 'object' ? {
            ...(typeof msg.updated_info.os_type == 'string' ? { os_type: msg.updated_info.os_type } : {}),
            ...(typeof msg.updated_info.nodejs_version == 'string' ? { node_ver: msg.updated_info.nodejs_version } : {}),
          } : {},
        };
      
      default:
        throw new exports.ValidationError(`wsmsg.type of ${JSON.stringify(msg.type)} is unknown`);
    }
  },
};

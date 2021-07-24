# Chat v1.0 API Documentation

## Endpoint

The chat endpoint is a WebSocket server located at /chat/ws. Connect to it to use the API. All messages are serialized with BSON.

## Objects

### ID

```
format for id (shown with letters for each bit):
  aaaaaaaabbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb
  bbbbbbbbccccccccddddddddddddddddeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
  a - u8 version (set to 1)
  b - u64be unix millisecond timestamp
  c - u8 bit server id (always 1 for now)
  d - u16be entity id (incremented, starting with 0, resets when timestamp increases)
  e - u32be random number
```

### Message

```
format for message (shown as an object to be serialized with BSON):
  {
    version: 1,
    id: <ID as Buffer>,
    author: <string or null>,
    content: <string>,
  }
```

## WebSocket Messages

The ID in a WebSocket message is used to link a response message to a request message.

### Error

```
{
  id: <integer>,
  type: 'error',
  code: <string>,
  description: <string> (human readable description),
}
```

### Authorization / Joining Room

```
{
  id: <integer>,
  type: 'auth',
  username: <string or null>,
}
```

### Authorization Ack

```
{
  id: <integer>,
  type: 'auth_ack',
}
```

### Reading State

```
{
  id: <integer>,
  type: 'get_users',
}
```

```
{
  id: <integer>,
  type: 'get_users_resp',
  users: <array> [<string>, ...],
}
```

```
{
  id: <integer>,
  type: 'get_typings',
}
```

```
{
  id: <integer>,
  type: 'get_typings_resp',
  users: <array> [<string>, ...],
}
```

```
{
  id: <integer>,
  type: 'read_messages',
}
```

```
{
  id: <integer>,
  type: 'read_messages_resp',
  messages: <array> [<message>],
}
```

### Recieving Server Pushed Information

```
{
  id: <integer>,
  type: 'user_join',
  username: <string>,
}
```

```
{
  id: <integer>,
  type: 'user_leave',
  username: <string>,
}
```

```
{
  id: <integer>,
  type: 'typing_update',
  username: <string>,
  typing: <boolean>,
}
```

```
{
  id: <integer>,
  type: 'message',
  message: <message>,
}
```

```
{
  id: <integer>,
  type: 'message_edit',
  message: <message>,
}
```

```
{
  id: <integer>,
  type: 'message_delete',
  message_id: <id>,
}
```

### Changing State

```
{
  id: <integer>,
  type: 'set_typing',
  typing: <boolean>,
}
```

```
{
  id: <integer>,
  type: 'send_message',
  content: <string>,
}
```

```
{
  id: <integer>,
  type: 'send_message_edit',
  message: {
    id: <id>,
    content: <string>,
  },
}
```

```
{
  id: <integer>,
  type: 'send_message_delete',
  message_id: <id>,
}
```

### Changing State Acks

```
{
  id: <integer>,
  type: 'set_typing_ack',
}
```

```
{
  id: <integer>,
  type: 'send_message_ack',
  message_id: <id>,
}
```

```
{
  id: <integer>,
  type: 'send_message_edit_ack',
}
```

```
{
  id: <integer>,
  type: 'send_message_delete_ack',
}
```

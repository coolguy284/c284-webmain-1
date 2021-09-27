# Status v1.0 API Documentation

## Endpoint

The status endpoint is a WebSocket server located at /api/status_ws. Connect to it to use the API. All messages are serialized with BSON.

## WebSocket Messages

### Error

```
{
  id: <integer>,
  type: 'error',
  code: <string>,
  description: <string> (human readable description),
}
```

### Status Update Request

```
{
  id: <integer>,
  type: 'status_update_request',
  [optional] fields: [<string> ...],
}
```

### Status Update

```
{
  id: <integer>,
  type: 'status_update',
  updated_info: {
    [optional] os_type: <string>,
    [optional] nodejs_version: <string>,
  },
}
```

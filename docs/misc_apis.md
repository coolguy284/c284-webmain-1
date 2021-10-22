# Server Misc API Documentation

The common path prefix for all listed paths is `/api`.

# IP echo

|      path      | description |
| -------------- | ---- |
| get /echo/ip   | Echoes raw ip of connection. `port=true|false` for whether to send port. |
| -------------- | ---- |
| get /echo/ipv4 | Echoes ip of connection if IPv4, error otherwise. `port=true|false` for whether to send port, `mode=<anything>|hex|bytes` for the form to return the ip in, with anything being for default text format. |
| -------------- | ---- |
| get /echo/ipv6 | Echoes IPv6 of connection (all ips can be coerced to ipv6). `port=true|false` for whether to send port, `mode=<anything>|hex|bytes` for the form to return the ip in, with anything being for default text format. |

# Header echo

## Path

`get /echo/headers`

## Description

Echoes the headers sent with the request. `form=<anything>|json` for form to return headers in, with anything for the format of lines of `header name: header value`.

# Null endpoint

## Path

`get /null`

## Description

Returns a 204 status code response no matter what.

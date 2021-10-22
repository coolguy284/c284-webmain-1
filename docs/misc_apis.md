# Server Misc API Documentation

# IP echo

|        path        | description |
| ------------------ | ----------- |
| get /api/echo/ip   | Echoes raw ip of connection. `port=true|false` for whether to send port. |
| get /api/echo/ipv4 | Echoes ip of connection if IPv4, error otherwise. `port=true|false` for whether to send port, `mode=<anything>|hex|bytes` for the form to return the ip in, with `<anything>` being for default text format. |
| get /api/echo/ipv6 | Echoes IPv6 of connection (all ips can be coerced to ipv6). `port=true|false` for whether to send port, `mode=<anything>|hex|bytes` for the form to return the ip in, with `<anything>` being for default text format. |

# Header echo

## Path

`get /api/echo/headers`

## Description

Echoes the headers sent with the request. `form=<anything>|json` for form to return headers in, with `<anything>` for the format of lines of `header name: header value`.

# Time query

## Path

`get /api/query/current_time`

## Description

Sends the current server time. `form=<anything>|number` for form to return time in, with `<anything>` being standard ISO date format.

# Null endpoint

## Path

`get /api/null`

## Description

Returns a 204 status code response no matter what.

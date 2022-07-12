var tls = require('tls');

/*
var conn = tls.connect(443, 'canary.coolguy284.com', { rejectUnauthorized: false });
setTimeout(() => {
  conn.end('GET / HTTP/1.1\r\nHost: ban\r\n\r\n');
  conn.on('data', c => console.log(c.toString()));
  conn.on('end', _ => console.log('end'));
}, 500);
*/

var conn = tls.connect({
  host: 'canary.coolguy284.com',
  port: 443,
  rejectUnauthorized: false,
}, () => {
  console.log(conn.alpnProtocol, conn.servername);
  conn.end('GET / HTTP/1.1\r\nHost: canary.coolguy284.com\r\n\r\n');
  let chunks = [];
  conn.on('data', c => chunks.push(c));
  conn.on('end', () => {
    console.log(Buffer.concat(chunks).toString());
  });
});

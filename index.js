// this file is for running bare bones version of webserver without docker

var cp = require('child_process');
var fs = require('fs');

try {
  fs.readFileSync('../c284-webmain-1_s/env.list').toString().split(/\r?\n/g).forEach(entry => {
    if (entry[0] == '#') return;
    let split = entry.split('=');
    if (split.length < 2) return;
    let key = split[0].trim();
    let value = split.slice(1).join(':').trim();
    process.env[key] = value;
  });
} catch (e) {
  console.error('Error parsing .env');
  console.error(e);
}

var srv_web_main = cp.spawn('node', ['index.js'], { cwd: 'srv_web_main', stdio: ['pipe', 'pipe', 'pipe'] });

process.stdin.pipe(srv_web_main.stdin);
srv_web_main.stdout.pipe(process.stdout);
srv_web_main.stderr.pipe(process.stderr);

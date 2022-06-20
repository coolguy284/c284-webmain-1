var NETWORK_NAME = process.argv[2];

var cp = require('child_process');
var fs = require('fs');
var ReadlineStream = require('readline-stream');

// load environment variables from .env file
try {
  fs.readFileSync('c284-webmain-1_s/env.list').toString().split(/\r?\n/g).forEach(entry => {
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


// because Boolean is useless on strings 'true' and 'false'
function toBool(str) {
  return str == 'false' || str == '0' ? false : Boolean(str);
}


if (!toBool(process.env.PROC_MONGODB_DISABLED)) {
  // complicated mongodb log file naming process
  var date = new Date();
  var datePart = date.toUTCString().replace(',', '').split(' ').slice(0, 3);
  var mongoLogFile = 'c284-webmain-1_s/logs_mongodb/' +
    `${date.getUTCFullYear()}_${(date.getUTCMonth() + 1 + '').padStart(2, '0')}_${(date.getUTCDate() + '').padStart(2, '0')} ` +
    `${(date.getUTCHours() + '').padStart(2, '0')}_${(date.getUTCMinutes() + '').padStart(2, '0')}_${(date.getUTCSeconds() + '').padStart(2, '0')} ` +
    `${[datePart[0], datePart[2], datePart[1]].join(' ')} ` +
    `${((date.getUTCHours() % 12 + 11) % 12 + 1 + '').padStart(2, '0')}_${(date.getUTCMinutes() + '').padStart(2, '0')}_${(date.getUTCSeconds() + '').padStart(2, '0')} ` +
    `${date.getUTCHours() < 12 ? 'AM' : 'PM'} ` +
    'UTC.log';
  
  // mongodb server for database of server
  var logMongodb = toBool(process.env.PROC_MONGODB_LOG_CONS);
  
  var proc_mongodb = cp.spawn('docker', [
    'run', '--rm', '-i', '--name', 'c284-webmain-1_proc_mongodb', '--network', NETWORK_NAME, '--network-alias', 'proc_mongodb',
    '--mount', 'type=bind,source=/home/webmain/c284-webmain-1_s/mongodb,target=/home/webmain/mongodb',
    'c284-webmain-1_proc_mongodb'
  ], { stdio: ['ignore', 'pipe', 'pipe'] });
  
  // takes mongodb's fancy JSON logging and makes it pretty for printing to console
  var logMongodJSON = function logMongodJSON(logElem) {
    fs.appendFile(mongoLogFile, logElem.endsWith('\n') ? logElem : logElem + '\n', err => { if (err) console.error(err); });
    if (logMongodb) {
      try {
        let logElemJSON = JSON.parse(logElem);
        let logString = `[${logElemJSON.t.$date.split('+')[0]}Z] [MONGODB:${logElemJSON.ctx}] ${logElemJSON.c}: ${logElemJSON.msg}`;
        if (logElemJSON.attr && logElemJSON.attr.error) {
          if (typeof logElemJSON.attr.error == 'string')
            logString += `\n  Error: ${logElemJSON.attr.error}`;
          else if (typeof logElemJSON.attr.error == 'object')
            logString += `\n  Error: ${logElemJSON.attr.error.codeName} (${logElemJSON.attr.error.code}): ${logElemJSON.attr.error.errmsg}`;
          else if (typeof logElemJSON.attr.error == 'number')
            logString += `\n  Error: ${logElemJSON.attr.message}`;
        }
        console.log(logString);
      } catch (e) {
        console.log(logElem.trim());
      }
    }
  };
  
  // stdout and stderr of mongodb piped thru readlinestream so it can be parsed with logMongodJSON for pretty printing
  var mongod_stdout = new ReadlineStream({});
  proc_mongodb.stdout.pipe(mongod_stdout);
  mongod_stdout.on('data', logMongodJSON);
  
  var mongod_stderr = new ReadlineStream({});
  proc_mongodb.stderr.pipe(mongod_stderr);
  mongod_stderr.on('data', logMongodJSON);
}


// main nodejs server for website
var srv_web_main = cp.spawn('docker', [
  'run', '--rm', '-i', '--name', 'c284-webmain-1_srv_web_main', '--network', NETWORK_NAME, '--network-alias', 'srv_web_main',
  '--env-file', '/home/webmain/c284-webmain-1_s/env.list',
  '--mount', 'type=bind,source=/home/webmain/c284-webmain-1_s/cert,target=/home/webmain/cert,readonly',
  ...(process.argv[3] ? ['--mount', 'type=bind,source=/home/webmain/c284-webmain-1/srv_web_main/websites,target=/home/webmain/srv_web_main/websites,readonly'] : []),
  '-p', '80:8080', '-p', '443:8443',
  'c284-webmain-1_srv_web_main'
], { stdio: ['pipe', 'pipe', 'pipe'] });

process.stdin.pipe(srv_web_main.stdin);
srv_web_main.stdout.pipe(process.stdout);
srv_web_main.stderr.pipe(process.stderr);


// servers have soft and then hard shutdown
async function exitHandler() {
  // stop srv_web_main
  let srv_web_main_exit_promise_r;
  let srv_web_main_exit_promise_r_called = false;
  let srv_web_main_exit_promise_r_call = () => {
    if (srv_web_main_exit_promise_r_called) return;
    srv_web_main_exit_promise_r_called = true;
    srv_web_main_exit_promise_r();
  };
  let srv_web_main_exit_promise = new Promise(r => srv_web_main_exit_promise_r = r);
  
  if (!srv_web_main) {
    console.log('srv_web_main not run');
  } else if (srv_web_main.exitCode) {
    console.log('srv_web_main already shutdown');
  } else {
    console.log('Killing srv_web_main');
    srv_web_main.kill('SIGINT');
    srv_web_main.kill('SIGINT');
    var timeout = setTimeout(() => {
      // srv_web_main not explicitly killed, instead implicitly killed by closing docker container as main nodejs process exits
      console.log('Forcibly killing srv_web_main');
      srv_web_main.removeAllListeners('exit');
      srv_web_main_exit_promise_r_call();
    }, 10000);
    srv_web_main.on('exit', () => clearTimeout(timeout));
  }
  
  await srv_web_main_exit_promise;
  
  // stop proc_mongodb
  if (!proc_mongodb) {
    console.log('proc_mongodb not run');
  } else if (proc_mongodb.exitCode) {
    console.log('proc_mongodb already shutdown');
  } else {
    console.log('Killing proc_mongodb');
    proc_mongodb.kill('SIGINT');
    var timeout = setTimeout(() => {
      // proc_mongodb not explicitly killed, instead implicitly killed by closing docker container as main nodejs process exits
      console.log('Forcibly killing proc_mongodb');
      proc_mongodb.removeAllListeners('exit');
    }, 10000);
    proc_mongodb.on('exit', () => clearTimeout(timeout));
  }
}

if (srv_web_main) srv_web_main.on('exit', () => exitHandler);
process.on('SIGINT', () => exitHandler);

// so server doesnt go down for an error
process.on('uncaughtException', err => {
  console.error('UncaughtException');
  console.error(err);
});

process.on('unhandledRejection', err => {
  console.error('UnhandledRejection');
  console.error(err);
});

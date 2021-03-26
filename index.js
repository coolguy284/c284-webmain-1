var fs = require('fs');
var cp = require('child_process');
var ReadlineStream = require('readline-stream');


// load environment variables from .env file
try {
  fs.readFileSync('.env').toString().split(/\r?\n/g).forEach(entry => {
    if (entry[0] == '#') return;
    let split = entry.split(':');
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
  return str == 'false' ? false : Boolean(str);
}


// complicated mongodb log file naming process
var date = new Date();
var datePart = date.toUTCString().replace(',', '').split(' ').slice(0, 3);
var mongoLogFile = `logs-mongodb/` +
  `${date.getUTCFullYear()}_${(date.getUTCMonth() + 1 + '').padStart(2, '0')}_${(date.getUTCDate() + '').padStart(2, '0')} ` +
  `${(date.getUTCHours() + '').padStart(2, '0')}_${(date.getUTCMinutes() + '').padStart(2, '0')}_${(date.getUTCSeconds() + '').padStart(2, '0')} ` +
  `${[datePart[0], datePart[2], datePart[1]].join(' ')} ` +
  `${((date.getUTCHours() % 12 + 11) % 12 + 1 + '').padStart(2, '0')}_${(date.getUTCMinutes() + '').padStart(2, '0')}_${(date.getUTCSeconds() + '').padStart(2, '0')} ` +
  `${date.getUTCHours() < 12 ? 'AM' : 'PM'} ` +
  `UTC.log`;

// mongodb server for database of server
var logMongodb = toBool(process.env.MONGODB_LOG_CONS);

var mongod = cp.spawn('mongod', ['--dbpath', 'mongodb' , '--bind_ip', '127.0.0.1'], { stdio: ['ignore', logMongodb ? 'pipe' : 'ignore', logMongodb ? 'pipe' : 'ignore'] });

if (logMongodb) {
  // takes mongodb's fancy JSON logging and makes it pretty for printing to console
  var logMongodJSON = function logMongodJSON(logElem) {
    fs.appendFile(mongoLogFile, logElem.endsWith('\n') ? logElem : logElem + '\n', err => { if (err) console.error(err); });
    try {
      let logElemJSON = JSON.parse(logElem);
      let logString = `[${logElemJSON.t['$date'].split('+')[0]}Z] [MONGODB:${logElemJSON.ctx}] ${logElemJSON.c}: ${logElemJSON.msg}`;
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
      console.log(c);
    }
  }

  // stdout and stderr of mongodb piped thru readlinestream so it can be parsed with logMongodJSON for pretty printing
  var mongod_stdout = new ReadlineStream({});
  mongod.stdout.pipe(mongod_stdout);
  mongod_stdout.on('data', logMongodJSON);

  var mongod_stderr = new ReadlineStream({});
  mongod.stderr.pipe(mongod_stderr);
  mongod_stderr.on('data', logMongodJSON);
}


// main nodejs server for website
var nodesrv_main = cp.fork('index.js', { cwd: 'nodesrv_main' });


// ping server every second for response, if unresponsive for 5 responses kill it
var missedAcks = 0;
var tickInt = setInterval(() => {
  if (missedAcks >= 5) {
    nodesrv_main.kill();
    clearInterval(tickInt);
  }
  nodesrv_main.send({ type: 'ping' });
  missedAcks++;
}, 1000);

nodesrv_main.on('message', msg => {
  switch (msg.type) {
    case 'pong':
      missedAcks = 0;
      break;
  }
});


// if main server exits mongodb server has soft and then hard shutdown
nodesrv_main.on('exit', () => {
  clearInterval(tickInt);
  if (mongod.exitCode) {
    console.log('Mongod already shutdown');
  } else {
    console.log('Killing mongod');
    mongod.kill();
    var timeout = setTimeout(() => {
      // mongodb not explicitly killed, instead implicitly killed by closing docker container as main nodejs process exits
      console.log('Forcibly killing mongod');
      mongod.removeAllListeners('exit');
    }, 10000);
    mongod.on('exit', () => clearTimeout(timeout));
  }
});


// so server doesnt go down for an error
process.on('uncaughtException', err => {
  console.error('UncaughtException');
  console.error(err);
});

process.on('unhandledRejection', err => {
  console.error('UnhandledRejection');
  console.error(err);
});

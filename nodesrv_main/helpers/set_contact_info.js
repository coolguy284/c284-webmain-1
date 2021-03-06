var fs = require('fs');

// load environment variables from .dockerenv file
fs.readFileSync('../.dockerenv').toString().split(/\r?\n/g).forEach(entry => {
  if (entry[0] == '#') return;
  let split = entry.split(':');
  if (split.length < 2) return;
  let key = split[0].trim();
  let value = split.slice(1).join(':').trim();
  process.env[key] = value;
});

fs.writeFileSync('websites/public/contact.html',
  fs.readFileSync('websites/public/contact.html').toString()
    .replace('{email}', Buffer.from(process.env.NODESRVMAIN_CONTACT_EMAIL).toString('hex'))
    .replace('{discord}', Buffer.from(process.env.NODESRVMAIN_CONTACT_DISCORD).toString('hex'))
);

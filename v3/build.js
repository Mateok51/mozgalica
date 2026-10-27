'use strict';
const fs = require('fs');
const dir = __dirname;
const data = JSON.stringify(JSON.parse(fs.readFileSync(dir + '/data.json', 'utf8'))).replace(/</g, '\\u003c');
const engine = fs.readFileSync(dir + '/engine.js', 'utf8').replace('__DATA__', () => data);
let html = fs.readFileSync(dir + '/page.html', 'utf8')
  .replace('__ENGINE__', () => engine)
  .replace('__JOIN_URL__', () => (process.env.JOIN_URL || ''));
fs.writeFileSync(process.argv[2] || dir + '/out.html', html);
console.log('OK', Buffer.byteLength(html), 'B');

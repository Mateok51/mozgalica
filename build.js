'use strict';
// Sastavlja mozgalica.html iz predloška, banke pitanja i (neobavezno) JOIN_URL-a.
const fs = require('fs');
const dir = __dirname;
const questions = JSON.parse(fs.readFileSync('/home/claude/mozgalica/questions.json', 'utf8'));
let html = fs.readFileSync(dir + '/template.html', 'utf8');
// "</" u JSON-u bi mogao zatvoriti <script>; pitanja ga ne sadrže, ali osiguravamo se.
const qjson = JSON.stringify(questions).replace(/</g, '\\u003c');
html = html.replace('__QUESTIONS__', () => qjson).replace('__JOIN_URL__', () => (process.env.JOIN_URL || '').replace(/'/g, ''));
fs.writeFileSync(dir + '/mozgalica.html', html);
console.log('OK', html.length, 'bajtova');

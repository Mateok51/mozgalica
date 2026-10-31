// Jednodatotečna verzija stranice za testove koji ubacuju kod u skriptu ili režu izvor aplikacije.
// index.html je sada samo kostur (styles.css, app.js, sw-register.js); ovdje se ti dijelovi ugrađuju natrag,
// a politika dobiva po jedno mjesto za hash svake ugrađene skripte jer ih testovi iznova računaju.
// Stvarno učitavanje razdvojene stranice (vanjske datoteke pod CSP-om 'self') pokrivaju browser-multiplayer i browser-recovery.
const fs = require('node:fs'), path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
let html = read('index.html');
const swap = (tag, body) => { if (!html.includes(tag)) throw new Error('index.html ne sadrži ' + tag); html = html.replace(tag, () => body); };
swap('<link rel="stylesheet" href="styles.css">', '<style>\n' + read('styles.css') + '</style>');
swap('<script src="app.js"></script>', '<script>\n' + read('app.js') + '</script>');
swap('<script src="sw-register.js"></script>', '<script>\n' + read('sw-register.js') + '</script>');
swap("script-src 'self'", "script-src 'self' 'sha256-PLACEHOLDERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=' 'sha256-PLACEHOLDERBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB='");
module.exports = html;

const fs = require('fs'), SP = __dirname + '/..';
const data = JSON.stringify(JSON.parse(fs.readFileSync(SP + '/v3/data.json', 'utf8'))).replace(/</g, '\\u003c');
const engine = fs.readFileSync(SP + '/v3/engine.js', 'utf8').replace('__DATA__', () => data);
const html = fs.readFileSync(SP + '/v4/page.html', 'utf8').replace('__ENGINE__', () => engine).replace('__JOIN_URL__', '').replace('<title>Mozgalica</title>', '<title>Trivia Tavern</title>').split('MOZGALICA').join('<span class="lt">Trivia</span><span class="lt">Tavern</span>');
fs.writeFileSync(SP + '/v3/out.html', '<meta charset="utf-8">\n' + html); console.log('out.html', html.length);

require('child_process').execSync('rm -rf ' + SP + '/v3/ui && cp -r ' + SP + '/ui ' + SP + '/v3/ui');
require('child_process').execSync('rm -rf ' + SP + '/v3/chars && cp -r ' + SP + '/chars ' + SP + '/v3/chars');

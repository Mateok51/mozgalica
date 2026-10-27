const fs = require('fs');
const src = fs.readFileSync(__dirname + '/engine.js', 'utf8').replace('__DATA__', fs.readFileSync(__dirname + '/data.json', 'utf8')).replace('sf: { on: true,', 'sf: { on: false,')   /* pravila v28 (bez Social Flowa); Social Flow testira sf-test.js */;
const { createGame } = new Function(src + '; return { createGame };')();
const assert = require('assert');
const g = createGame({ code: 'T', onChange: () => {} });
const V = () => g.view().P;
g.addPlayer('h1', 'Mateo', 0, false);
g.setBots(3); assert.strictEqual(V().filter(p => p.b).length, 3, '3 bota');
assert.strictEqual(new Set(V().map(p => p.a)).size, 4, 'jedinstveni likovi');
g.setBots(99); assert.strictEqual(V().length, 6, 'max 6');
g.setBots(2); assert.strictEqual(V().filter(p => p.b).length, 2);
// čovjek uzima lika bota
const botAv = V().find(p => p.b).a;
g.addPlayer('h2', 'Ivo', botAv, false);
assert.strictEqual(V().find(p => p.id === 'h2').a, botAv, 'čovjek dobiva lika bota');
assert.strictEqual(new Set(V().map(p => p.a)).size, V().length, 'bot premješten');
// setAvatar na bota
const b2 = V().find(p => p.b).a; g.setAvatar('h1', b2);
assert.strictEqual(V().find(p => p.id === 'h1').a, b2); assert.strictEqual(new Set(V().map(p => p.a)).size, V().length);
// puna soba: čovjek istiskuje bota
g.setBots(4); assert.strictEqual(V().length, 6);
g.addPlayer('h3', 'Ana', 1, false);
assert.ok(V().some(p => p.id === 'h3'), 'čovjek ušao u punu sobu'); assert.strictEqual(V().length, 6); assert.strictEqual(V().filter(p => p.b).length, 3);
// bot imena ne sudaraju se s ljudima
assert.strictEqual(new Set(V().map(p => p.n.toLowerCase())).size, 6, 'jedinstvena imena');
// soba puna samo ljudi → bez botova
const g2 = createGame({ code: 'U', onChange: () => {} });
for (let i = 0; i < 6; i++) g2.addPlayer('x' + i, 'P' + i, i, false);
g2.setBots(2); assert.strictEqual(g2.view().P.filter(p => p.b).length, 0);
assert.strictEqual(g2.addPlayer('x9', 'Z', 7, false), null, 'puna soba ljudi');
g.stop(); g2.stop();
const g3 = createGame({ code: 'W', onChange: () => {} });
g3.addPlayer('m', 'Mateo', 0, false); g3.setBots(1);
assert.strictEqual(g3.view().P.find(p => p.b).n, 'Ana');
g3.addPlayer('a', 'Ana', 3, false);
assert.strictEqual(g3.view().P.find(p => p.id === 'a').n, 'Ana', 'čovjek zadržava ime');
assert.notStrictEqual(g3.view().P.find(p => p.b).n, 'Ana', 'bot preimenovan');
g3.stop();
console.log('BOT TESTOVI OK');

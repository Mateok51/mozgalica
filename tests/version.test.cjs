const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('the version shown in the game matches the service worker cache version', () => {
  const cache = read('sw.js').match(/const CACHE = 'mozgalica-v(\d+)'/);
  const shown = read('app.js').match(/<span class="home-ver">v(\d+)<\/span>/);
  assert.ok(cache, 'sw.js must define CACHE as mozgalica-vN');
  assert.ok(shown, 'app.js must show the version in .home-ver');
  assert.equal(shown[1], cache[1], 'Raise both together: CACHE in sw.js and .home-ver in app.js');
});

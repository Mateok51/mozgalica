const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const list = (name) => [...sw.split('const ' + name + ' = [')[1].split('];')[0].matchAll(/'(\.\/[^']*)'/g)].map((m) => m[1]);
const CORE = list('CORE'), EXTRA = list('EXTRA');
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir + '/' + e.name) : [dir + '/' + e.name]));

test('every game asset is cached for offline play, and every listed file exists', () => {
  const assets = [...walk('chars'), ...walk('ui'), ...walk('fonts'), ...walk('data'), ...walk('vendor'), ...walk('audio')].filter((f) => /\.(webp|png|jpg|svg|mp3|woff2|js)$/.test(f)).map((f) => './' + f);
  const known = new Set([...CORE, ...EXTRA]);
  const missing = assets.filter((f) => !known.has(f));
  assert.deepEqual(missing, [], 'add these files to CORE or EXTRA in sw.js');
  for (const f of known) if (f !== './') assert.ok(fs.existsSync(path.join(root, f)), 'sw.js lists a missing file: ' + f);
  assert.equal(new Set([...CORE, ...EXTRA]).size, CORE.length + EXTRA.length, 'a file is listed twice');
});

// Lažni Cache/fetch: provjera da pozadinsko spremanje dohvaća samo ono što nedostaje i da jedna pogreška ne prekida ostatak.
function runWorker({ cached = [], failing = [] } = {}) {
  const store = new Map(cached.map((u) => [u, 1])), fetched = [], handlers = {};
  const cache = { match: async (u) => store.get(u), put: async (u, r) => { store.set(u, r); }, addAll: async () => {} };
  const ctx = vm.createContext({
    self: { addEventListener: (n, f) => { handlers[n] = f; }, location: { origin: 'https://example.test' }, skipWaiting() {}, clients: { claim() {} } },
    caches: { open: async () => cache, keys: async () => [], match: async () => undefined, delete: async () => true },
    fetch: async (u) => { fetched.push(u); if (failing.includes(u)) throw new Error('offline'); return { ok: true }; },
    URL, Promise, console,
  });
  vm.runInContext(sw, ctx);
  return { store, fetched, handlers };
}
const send = (h, data) => { let p = Promise.resolve(); h.message({ data, waitUntil: (x) => { p = x; } }); return p; };

test('background precache stores every extra file and skips the ones already cached', async () => {
  const already = EXTRA.slice(0, 10);
  const w = runWorker({ cached: already });
  await send(w.handlers, { t: 'precache' });
  assert.equal(w.fetched.length, EXTRA.length - already.length);
  assert.ok(already.every((u) => !w.fetched.includes(u)), 'cached files are not downloaded again');
  assert.ok(EXTRA.every((u) => w.store.has(u)), 'every extra file ends up in the cache');
});

test('one failed download does not stop the rest, and unrelated messages do nothing', async () => {
  const w = runWorker({ failing: [EXTRA[3]] });
  await send(w.handlers, { t: 'something-else' });
  assert.equal(w.fetched.length, 0);
  await send(w.handlers, { t: 'precache' });
  assert.ok(!w.store.has(EXTRA[3]));
  assert.equal(EXTRA.filter((u) => w.store.has(u)).length, EXTRA.length - 1);
});

test('the page asks for the background precache only on a good connection', () => {
  const src = fs.readFileSync(path.join(root, 'sw-register.js'), 'utf8');
  const run = (connection) => {
    const posted = []; let onload;
    const reg = { active: { postMessage: (m) => posted.push(m) } };
    const ctx = vm.createContext({
      navigator: { serviceWorker: { register: () => Promise.resolve(reg), ready: { then: (f) => { f(reg); return { catch() {} }; } } }, connection },
      location: { protocol: 'https:' }, window: { addEventListener: (n, f) => { onload = f; } }, setTimeout: (f) => f(),
    });
    vm.runInContext(src, ctx); onload();
    return posted;
  };
  assert.deepEqual(run(undefined).map((m) => m.t), ['precache']);
  assert.deepEqual(run({ effectiveType: '4g' }).map((m) => m.t), ['precache']);
  assert.deepEqual(run({ saveData: true }), []);
  assert.deepEqual(run({ effectiveType: 'slow-2g' }), []);
  assert.deepEqual(run({ effectiveType: '2g' }), []);
});

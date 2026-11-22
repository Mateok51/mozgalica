const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const list = (name) => [...sw.split('const ' + name + ' = [')[1].split('];')[0].matchAll(/'(\.\/[^']*)'/g)].map((m) => m[1]);
const CORE = list('CORE'), EXTRA = list('EXTRA'), LAZY = list('LAZY');
const walk = (dir) => fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(dir + '/' + e.name) : [dir + '/' + e.name]));

test('every game asset is cached for offline play, and every listed file exists', () => {
  const assets = [...walk('chars'), ...walk('ui'), ...walk('fonts'), ...walk('data'), ...walk('vendor'), ...walk('audio')].filter((f) => /\.(webp|png|jpg|svg|mp3|woff2|js)$/.test(f)).map((f) => './' + f);
  const known = new Set([...CORE, ...EXTRA, ...LAZY]);
  const missing = assets.filter((f) => !known.has(f));
  assert.deepEqual(missing, [], 'add these files to CORE, EXTRA or LAZY in sw.js');
  for (const f of known) if (f !== './') assert.ok(fs.existsSync(path.join(root, f)), 'sw.js lists a missing file: ' + f);
  assert.equal(new Set([...CORE, ...EXTRA, ...LAZY]).size, CORE.length + EXTRA.length + LAZY.length, 'a file is listed twice');
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

test('questions are loaded on demand: not downloaded at install or by the guest background precache', () => {
  assert.deepEqual(LAZY, ['./data/questions.js']);
  assert.ok(!CORE.includes('./data/questions.js') && !EXTRA.includes('./data/questions.js'));
});

// fetch rukovatelj: lažni Cache i mreža; provjerava redoslijed (predmemorija ili mreža) i što se sprema.
function runFetch({ cached = {}, network = {} } = {}) {
  const store = new Map(Object.entries(cached)), calls = [], handlers = {};
  const cache = { match: async (u) => store.get(u), put: async (u, r) => { store.set(typeof u === 'string' ? u : u.url, r); }, addAll: async () => {} };
  const ctx = vm.createContext({
    self: { addEventListener: (n, f) => { handlers[n] = f; }, location: { origin: 'https://example.test' }, skipWaiting() {}, clients: { claim() {} } },
    caches: { open: async () => cache, keys: async () => [], match: async (r) => store.get(typeof r === 'string' ? r : r.url), delete: async () => true },
    fetch: async (r, opts) => { const u = typeof r === 'string' ? r : r.url; calls.push({ u, cache: opts && opts.cache }); const n = network[u]; if (!n || n instanceof Error) throw n || new Error('offline'); return n; },
    URL, Promise, console,
  });
  vm.runInContext(sw, ctx);
  const res = (body, status = 200) => ({ ok: status >= 200 && status < 300, status, body, type: 'basic', clone() { return this; } });
  const request = (path, extra = {}) => ({ method: 'GET', url: 'https://example.test' + path, mode: 'no-cors', headers: { has: (h) => (extra.range && h === 'range') }, ...extra.req });
  const dispatch = async (req) => {
    let responded, pending = [];
    handlers.fetch({ request: req, respondWith: (p) => { responded = Promise.resolve(p); }, waitUntil: (p) => pending.push(p) });
    const out = responded ? await responded : 'NOT-HANDLED';
    await Promise.all(pending); await new Promise((r) => setImmediate(r));
    return out;
  };
  return { store, calls, res, request, dispatch };
}

test('media from the cache is served at once, then refreshed quietly in the background', async () => {
  const url = 'https://example.test/ui/logo.webp', old = { body: 'old', ok: true, status: 200 };
  const w = runFetch({ cached: { [url]: old }, network: { [url]: runFetch().res('new') } });
  const out = await w.dispatch(w.request('/ui/logo.webp'));
  assert.equal(out.body, 'old', 'the cached copy is returned, not the network one');
  assert.deepEqual(w.calls.map((c) => c.cache), ['no-cache'], 'the background refresh revalidates');
  assert.equal(w.store.get(url).body, 'new', 'the cache is updated for the next visit');
  const offline = runFetch({ cached: { [url]: old } });   // bez mreže iz predmemorije i dalje radi
  assert.equal((await offline.dispatch(offline.request('/ui/logo.webp'))).body, 'old');
});

test('media that is not cached yet comes from the network and is stored; offline and uncached gives nothing', async () => {
  const url = 'https://example.test/chars/a/idle.webp', w = runFetch();
  const online = runFetch({ network: { [url]: w.res('png') } });
  assert.equal((await online.dispatch(online.request('/chars/a/idle.webp'))).body, 'png');
  assert.equal(online.store.get(url).body, 'png', 'a first visit stores the file');
  const offline = runFetch();
  assert.equal(await offline.dispatch(offline.request('/audio/music.mp3')), undefined, 'offline and not cached: a network error, not a crash');
});

test('partial (range) and non-200 media responses are never stored or intercepted', async () => {
  const w = runFetch({ network: { 'https://example.test/audio/music.mp3': { ok: true, status: 206, body: 'part', clone() { return this; } } } });
  assert.equal(await w.dispatch(w.request('/audio/music.mp3', { range: true })), 'NOT-HANDLED', 'range requests go straight to the network');
  const r206 = await w.dispatch(w.request('/audio/music.mp3'));
  assert.equal(r206.status, 206);
  assert.ok(!w.store.has('https://example.test/audio/music.mp3'), 'a 206 must not be put in the cache');
});

test('game code stays network-first: fresh from the network, cached copy only when offline', async () => {
  const url = 'https://example.test/app.js', stale = { ok: true, status: 200, body: 'stale' };
  const online = runFetch({ cached: { [url]: stale }, network: { [url]: { ok: true, status: 200, body: 'fresh', type: 'basic', clone() { return this; } } } });
  assert.equal((await online.dispatch(online.request('/app.js'))).body, 'fresh', 'the network wins over an older cached copy');
  assert.equal(online.calls[0].cache, 'no-cache');
  const offline = runFetch({ cached: { [url]: stale } });
  assert.equal((await offline.dispatch(offline.request('/app.js'))).body, 'stale', 'offline falls back to the cached copy');
  const nav = runFetch({ cached: { './index.html': { body: 'home' } } });
  assert.equal((await nav.dispatch(nav.request('/room/abc', { req: { mode: 'navigate' } }))).body, 'home', 'an unknown page offline shows the home page');
});

test('requests to other origins and non-GET requests are left alone', async () => {
  const w = runFetch();
  assert.equal(await w.dispatch({ ...w.request('/x.webp'), url: 'https://other.example/x.webp' }), 'NOT-HANDLED');
  assert.equal(await w.dispatch({ ...w.request('/x.webp'), method: 'POST' }), 'NOT-HANDLED');
});

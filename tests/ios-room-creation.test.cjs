// Actual app creation/recovery adapters and actual cloud transport, with an HTTP
// 200 response and controlled WebSocket/timer seams. No iPhone device claim.
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '..'), app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const transport = fs.readFileSync(path.join(root, 'cloud-transport.js'), 'utf8');
const secret = 'a'.repeat(22), key = 'mz_cloud_resume_v1';
function fixture(storage = new Map(), options = {}) {
  const requests = [], sockets = [], jobs = new Map(), bindings = new Map(), elements = new Map([['hname', { value: 'Ana' }], ['hform', {}]]);
  const screen = { className: '', innerHTML: '' }; let sequence = 0;
  class WS {
    constructor(url) { this.url = url; this.readyState = 0; this.sent = []; sockets.push(this); }
    send(value) { this.sent.push(JSON.parse(value)); }
    close() { this.readyState = 3; }
    open() { this.readyState = 1; this.onopen(); }
  }
  const context = vm.createContext({ URL, AbortController, Date, WebSocket: WS,
    fetch: async (url, request) => {
      requests.push({ url, owner: JSON.parse(request.body) });
      if (options.waitForResponse) await options.waitForResponse;
      return { ok: options.ok !== false, text: async () => JSON.stringify(options.response || { code: requests.length === 1 ? 'ABCD' : 'WXYZ', secret: requests.length === 1 ? secret : 'b'.repeat(22) }) };
    },
    setTimeout: (fn, ms) => { const id = ++sequence; jobs.set(id, { fn, ms }); return id; }, clearTimeout: id => jobs.delete(id),
    setInterval: (fn, ms) => { const id = ++sequence; jobs.set(id, { fn, ms }); return id; }, clearInterval: id => jobs.delete(id),
    PID: 'ana', SK: 'f'.repeat(32), myAv: 0, mode: 'home', S: null, PV: null, L: { s: -1 },
    cloudSession: null, cloudCredentials: null, cloudView: null, cloudAttempt: 0, cloudTvSig: '', cloudResend: false, cloudRetry: null, cloudTakeover: null,
    pcode: '', pname: '', netNote: '', connectionWasLost: false, game: null, HOST_RS: null, PLAYER_RS: null, lastSig: '', hostErr: '',
    ppeer: null, pconn: null, TAVERN_CLOUD: { apiOrigin: 'https://game.test' }, CLOUD_RECOVERY_KEY: key,
    localStorage: { getItem: name => storage.get(name) || null, setItem: (name, value) => storage.set(name, value), removeItem: name => storage.delete(name) },
    location: { hash: '' }, document: { hidden: false, documentElement: { dataset: {} }, getElementById: name => elements.get(name) },
    $app: screen, bind: (name, callback) => bindings.set(name, callback), esc: String,
    store: { get: name => name === 'mz_name' ? 'Ana' : storage.get(name), set: (name, value) => storage.set(name, value) },
    cloudEnabled: () => true, okRS: value => typeof value === 'string' && /^[A-Za-z0-9_-]{22}$/.test(value),
    freshLocal: s => ({ s }), rememberRS() {}, render() {}, keepAwake() {}, phoneShown: () => false,
    reset() { throw Error('This flow must use the explicit retry/new-room actions'); },
    clearInputBindings() {}, stopFxTimer() {}, checkConnection() {}, directReady: () => false, retrySoon() {}, toolNotice() {},
    failJoin() { context.mode = 'join'; }, applyState(d) { context.S = d; context.L.s = d.s; }, meOf: d => d.P.find(p => p.id === 'ana'),
  });
  const cloud = app.slice(app.indexOf('  function clearCloudRecovery()'), app.indexOf('  function diagnostic('));
  const resume = app.slice(app.indexOf('  function resumeConnection()'), app.indexOf('  let recoveryTimer ='));
  const hostStart = app.slice(app.indexOf('  function startHost()'), app.indexOf('  // Pitanja (data/questions.js)'));
  const phoneForm = app.slice(app.indexOf('  function hostFormV()'), app.indexOf('  // ---------- demo:'));
  const tvForm = app.slice(app.indexOf('  function hostV()'), app.indexOf('  // ---------- prijelazi scena'));
  vm.runInContext(transport + '\n' + cloud + '\n' + resume + '\n' + hostStart + '\n' + phoneForm + '\n' + tvForm, context);
  return { context, requests, sockets, jobs, storage, bindings, elements, screen };
}
test('HTTP-confirmed new phone and TV rooms are recoverable before their first WebSocket state', async () => {
  for (const noTv of [true, false]) {
    const f = fixture(); await f.context.startCloudRoom(noTv, 'Ana');
    assert.equal(f.requests.length, 1, 'The server successfully created exactly one room');
    assert.equal(f.sockets.length, 1, 'Admission has started but no WebSocket state was received');
    const saved = f.storage.get(key);
    assert(saved, 'HTTP 200 room credentials must be persisted before awaiting the first WebSocket state');
    const record = JSON.parse(saved);
    assert.deepEqual({ code: record.code, role: record.role, pid: record.pid, noTv: record.noTv, name: record.name, secret: record.secret },
      { code: 'ABCD', role: 'host', pid: 'ana', noTv, name: 'Ana', secret });
  }
});
test('reload during initial admission resumes the HTTP-created room without another create POST', async () => {
  const first = fixture(); await first.context.startCloudRoom(true, 'Ana');
  const reloaded = fixture(first.storage); reloaded.context.restoreCloudRecovery();
  assert.equal(reloaded.requests.length, 0);
  assert.equal(reloaded.sockets.length, 1, 'Reload must reconnect to the already-created room');
  assert.equal(reloaded.sockets[0].url, 'wss://game.test/api/rooms/ABCD');
  reloaded.sockets[0].open();
  assert.equal(reloaded.sockets[0].sent[0].secret, secret);
  assert.equal(reloaded.sockets[0].sent[0].pid, first.requests[0].owner.pid);
});
test('initial admission timeout retries the created room on resume instead of losing its owner credentials', async () => {
  for (const noTv of [true, false]) {
    const f = fixture(); await f.context.startCloudRoom(noTv, 'Ana');
    [...f.jobs.values()].find(job => job.ms === 30000).fn();
    assert.equal(f.context.mode, noTv ? 'hostform' : 'host');
    f.context.resumeConnection();
    assert.equal(f.requests.length, 1, 'Retry must not consume another room creation');
    assert.equal(f.sockets.length, 2, 'A server-confirmed new owner must retry its original room even before first WS admission');
    assert.equal(f.sockets[1].url, 'wss://game.test/api/rooms/ABCD');
  }
});
test('failed or malformed creation responses never become resumable owner receipts', async () => {
  for (const options of [{ ok: false, response: { message: 'Unavailable' } }, { response: { code: 'ABCD', secret: 'bad' } }, { response: { code: 'wrong', secret } }]) {
    const f = fixture(new Map(), options); await f.context.startCloudRoom(true, 'Ana');
    assert.equal(f.requests.length, 1);
    assert.equal(f.sockets.length, 0);
    assert.equal(f.storage.has(key), false, 'An unconfirmed HTTP response cannot create recovery credentials');
    f.context.resumeConnection(); assert.equal(f.sockets.length, 0);
  }
});
test('deliberately leaving while create HTTP is pending cannot later replace the recovery target', async () => {
  let release;
  const waitForResponse = new Promise(resolve => { release = resolve; });
  const f = fixture(new Map(), { waitForResponse }), pending = f.context.startCloudRoom(true, 'Ana');
  assert.equal(f.requests.length, 1);
  f.context.closeCloud(); f.context.mode = 'home';
  release(); await pending;
  assert.equal(f.sockets.length, 0);
  assert.equal(f.storage.has(key), false, 'A late HTTP response after deliberate cancellation must remain ignored');
});
test('an authoritative initial auth rejection still removes a creation receipt', async () => {
  const f = fixture(); await f.context.startCloudRoom(true, 'Ana');
  const socket = f.sockets[0]; socket.open(); socket.onmessage({ data: JSON.stringify({ t: 'error', reason: 'auth' }) });
  assert.equal(f.storage.has(key), false);
  f.context.resumeConnection(); assert.equal(f.sockets.length, 1, 'Definitive rejection must not retry saved owner credentials');
});
test('the phone and TV retry-screen action reconnects the HTTP-confirmed room without another POST', async () => {
  for (const noTv of [true, false]) {
    const f = fixture(); await f.context.startCloudRoom(noTv, 'Ana');
    [...f.jobs.values()].find(job => job.ms === 30000).fn();
    if (noTv) f.context.hostFormV(); else f.context.hostV();
    assert(f.bindings.has('retryRoom'), 'The timeout screen must expose the existing-room retry action');
    assert(f.bindings.has('retryNew'), 'Opening another room must be a separate explicit action');
    const oldRetryRoom = f.bindings.get('retryRoom'), oldRetryNew = f.bindings.get('retryNew');
    assert(f.context.hostErr, 'The original admission failure must actually be present before retry');
    oldRetryRoom();
    assert.equal(f.context.hostErr, '', 'Retry must clear the old phone/TV error before rendering the resumed session');
    assert.equal(f.requests.length, 1, 'Clicking retry must not create another room');
    assert.equal(f.sockets.length, 2);
    f.sockets[1].open();
    assert.equal(f.sockets[1].sent[0].secret, secret);
    assert.equal(f.sockets[1].sent[0].pid, 'ana');
    assert.equal(f.sockets[1].sent[0].role, noTv ? 'player' : 'host', 'Retry must preserve phone-owner versus TV-owner admission');
    assert.equal(JSON.parse(f.storage.get(key)).code, 'ABCD');
    oldRetryRoom(); oldRetryNew();
    assert.equal(f.requests.length, 1, 'Stale callbacks cannot create another room after resume');
    assert.equal(f.sockets.length, 2);
    assert.equal(JSON.parse(f.storage.get(key)).code, 'ABCD');
    // A second timeout has a new retry identity. The earlier screen must not
    // operate on that later retry, even though its room code is still the same.
    [...f.jobs.values()].find(job => job.ms === 30000).fn();
    const nextRetry = f.context.cloudRetry;
    assert(nextRetry);
    oldRetryRoom(); oldRetryNew();
    assert.equal(f.context.cloudRetry, nextRetry, 'Stale callbacks cannot consume or clear a later retry marker');
    assert.equal(f.requests.length, 1);
    assert.equal(f.sockets.length, 2, 'The stale retry-room callback cannot reconnect a later timeout');
    assert.equal(JSON.parse(f.storage.get(key)).code, 'ABCD');
  }
});
test('only the separate new-game action discards the failed receipt and allows another room POST', async () => {
  for (const noTv of [true, false]) {
    const f = fixture(); await f.context.startCloudRoom(noTv, 'Ana');
    [...f.jobs.values()].find(job => job.ms === 30000).fn();
    if (noTv) f.context.hostFormV(); else f.context.hostV();
    assert(f.bindings.has('retryNew'));
    const oldRetryRoom = f.bindings.get('retryRoom'), oldRetryNew = f.bindings.get('retryNew');
    oldRetryNew();
    if (noTv) {
      assert.equal(f.requests.length, 1, 'Phone owner first returns to the explicit new-room form');
      assert.equal(f.storage.has(key), false);
      assert.equal(f.context.cloudRetry, null);
      f.context.resumeConnection(); assert.equal(f.sockets.length, 1, 'Cancelled old-room retry cannot resume behind the new-room form');
      f.context.hostFormV();
      f.elements.get('hform').onsubmit({ preventDefault() {} });
    }
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.requests.length, 2, 'Only the explicit new-game path may send the second create request');
    assert.equal(f.sockets.length, 2);
    assert.equal(f.sockets[1].url, 'wss://game.test/api/rooms/WXYZ');
    assert.equal(JSON.parse(f.storage.get(key)).code, 'WXYZ', 'New creation must replace, rather than silently reuse, the former recovery target');
    oldRetryRoom(); oldRetryNew();
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(f.requests.length, 2, 'Stale old-room controls cannot open a third room');
    assert.equal(f.sockets.length, 2);
    assert.equal(JSON.parse(f.storage.get(key)).code, 'WXYZ', 'Stale controls cannot erase the new room receipt');
  }
});

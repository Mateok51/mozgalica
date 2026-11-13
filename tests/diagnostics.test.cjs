const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'diagnostics.js'), 'utf8');
function session() {
  let time = 1000, online = true;
  const forbidden = () => { throw Error('private data or side effect accessed'); };
  const navigator = { get onLine() { return online; }, get userAgent() { return forbidden(); } };
  const context = vm.createContext({ performance: { now: () => time }, navigator,
    fetch: forbidden, XMLHttpRequest: forbidden, localStorage: new Proxy({}, { get: forbidden }),
    sessionStorage: new Proxy({}, { get: forbidden }), location: new Proxy({}, { get: forbidden }),
    document: new Proxy({}, { get: forbidden }), Date: { now: forbidden },
  });
  vm.runInContext(source, context);
  return { diag: context.TAVERN_DIAGNOSTICS, context, time: n => { time = n; }, online: value => { online = value; } };
}
const plain = value => JSON.parse(JSON.stringify(value));

test('diagnostics records only recognized events and phases, discarding supplied private data', () => {
  const s = session();
  const secret = 'ROOM-SECRET-Ana-answer-Zagreb-https://example.invalid/#TOKEN';
  assert.equal(s.diag.add('joined', 'lobby', { code: secret }), true);
  assert.equal(s.diag.add(secret, 'lobby'), false);
  assert.equal(s.diag.add('answer_sent', secret), true);
  const hostile = { toString() { throw Error('must not inspect or stringify caller objects'); } };
  assert.equal(s.diag.add(hostile, 'question'), false);
  assert.equal(s.diag.add('connection_lost', hostile), true);
  const text = s.diag.exportText();
  assert.equal(text.includes(secret), false);
  const report = JSON.parse(text);
  assert.deepEqual(Object.keys(report), ['format', 'webVersion', 'environment', 'online', 'events']);
  assert.deepEqual(report.events.map(e => Object.keys(e)), [
    ['elapsedMs', 'type', 'phase'], ['elapsedMs', 'type'], ['elapsedMs', 'type'], ['elapsedMs', 'type'],
  ]);
});
test('retained history is bounded during a long reconnect storm and remains chronological', () => {
  const s = session();
  for (let i = 0; i < 10000; i++) { s.time(1000 + i); s.diag.add(i % 2 ? 'connection_restored' : 'connection_lost', 'question'); }
  const report = plain(s.diag.snapshot());
  assert.equal(report.events.length, 80);
  assert.equal(report.events[0].elapsedMs, 9920);
  assert.equal(report.events.at(-1).elapsedMs, 9999);
  assert.ok(Buffer.byteLength(s.diag.exportText(), 'utf8') < 32768);
});
test('elapsed timestamps cannot go backwards or become nonfinite if the clock fails', () => {
  const s = session();
  for (const time of [1500, 1200, NaN, Infinity, -100, Number.MAX_VALUE]) {
    s.time(time); s.diag.add('app_resume');
  }
  const times = plain(s.diag.snapshot()).events.map(e => e.elapsedMs);
  assert.deepEqual(times.slice(0, 5), [500, 500, 500, 500, 500]);
  assert.equal(times.at(-1), Number.MAX_SAFE_INTEGER);
  assert.ok(times.every(Number.isSafeInteger));
});
test('snapshots are detached from the private ring and do not implicitly record or export', () => {
  const s = session(); s.diag.add('joined', 'lobby');
  const report = s.diag.snapshot(); report.events[0].type = 'private data'; report.events.push({ type: 'spoof' });
  const fresh = plain(s.diag.snapshot());
  assert.equal(fresh.events.length, 1); assert.equal(fresh.events[0].type, 'joined');
  assert.equal(s.diag.snapshot().events.length, 1);
});
test('only explicit native activation changes environment and online is a boolean', () => {
  const s = session();
  assert.equal(s.diag.snapshot().environment, 'web');
  s.online(false); assert.equal(s.diag.snapshot().online, false);
  s.diag.setNative(); assert.equal(s.diag.snapshot().environment, 'android');
  s.online('private value'); assert.equal(s.diag.snapshot().online, true);
});
test('restricted and missing browser APIs cannot break local diagnostic export', () => {
  const context = vm.createContext({});
  vm.runInContext(source, context);
  const d = context.TAVERN_DIAGNOSTICS;
  assert.doesNotThrow(() => d.add('join_failed', 'lobby'));
  assert.equal(JSON.parse(d.exportText()).events[0].elapsedMs, 0);
  assert.equal(d.snapshot().online, true);
});

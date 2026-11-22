// Execute the real Wake Lock lifecycle with controlled API promises; these are
// simulated browser API states, not measurements of an iPhone display.
const { test } = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const begin = app.indexOf('  let wake = null'), end = app.indexOf('  // ---------- navigacija', begin);
assert(begin >= 0 && end > begin);
function fixture() {
  const requests = [], listeners = new Map();
  const c = vm.createContext({ mode: 'player', Promise,
    navigator: { wakeLock: { request() { let resolve; const promise = new Promise(r => { resolve = r; }); requests.push({ promise, resolve }); return promise; } } },
    document: { visibilityState: 'visible', addEventListener: (type, callback) => listeners.set(type, callback) },
  });
  vm.runInContext(app.slice(begin, end) + ';this.keep=keepAwake;this.held=()=>wake;this.release=typeof releaseWake===\'function\'?releaseWake:null;', c);
  // Native release events can be delivered after the request promise. Keep
  // their delivery explicit rather than firing them synchronously twice.
  const sentinel = () => { const callbacks = []; return { releases: 0, addEventListener(type, cb) { if (type === 'release') callbacks.push(cb); }, release() { this.releases++; return Promise.resolve(); }, externalRelease() { callbacks.forEach(cb => cb()); } }; };
  return { c, requests, listeners, sentinel };
}
test('concurrent active requests share one pending screen lock', async () => {
  const f = fixture(), first = f.c.keep(), second = f.c.keep();
  assert.equal(f.requests.length, 1, 'Join and visibility callbacks cannot acquire duplicate locks');
  const lock = f.sentinel(); f.requests[0].resolve(lock); await Promise.all([first, second]);
  assert.equal(f.c.held(), lock);
});
test('a screen lock resolving after leaving the game is immediately released', async () => {
  const f = fixture(), pending = f.c.keep();
  f.c.mode = 'home'; const lock = f.sentinel(); f.requests[0].resolve(lock); await pending;
  assert.equal(lock.releases, 1, 'Home must not keep the iPhone screen awake');
  assert.equal(f.c.held(), null);
});
test('a late release from an old lock cannot clear the new lock after background recovery', async () => {
  const f = fixture(), a = f.c.keep(), old = f.sentinel(); f.requests[0].resolve(old); await a;
  f.c.document.visibilityState = 'hidden'; f.listeners.get('visibilitychange')();
  f.c.document.visibilityState = 'visible'; f.listeners.get('visibilitychange')();
  assert.equal(f.requests.length, 2, 'Returning to the visible game must acquire its current lock');
  const current = f.sentinel(); f.requests[1].resolve(current); await new Promise(setImmediate);
  assert.equal(f.c.held(), current, 'The new acquisition must finish before the old event is delivered');
  old.externalRelease();
  assert.equal(f.c.held(), current, 'Only the current sentinel may clear the held lock');
});
test('inactive screens and hidden documents never request a screen lock', async () => {
  const f = fixture(); f.c.mode = 'home'; await f.c.keep();
  f.c.mode = 'player'; f.c.document.visibilityState = 'hidden'; await f.c.keep();
  assert.equal(f.requests.length, 0);
});
test('a cancelled pending acquisition cannot overwrite a new game lock', async () => {
  const f = fixture(), first = f.c.keep();
  f.c.mode = 'home'; f.c.release(); f.c.mode = 'player';
  const second = f.c.keep(), current = f.sentinel(); f.requests[1].resolve(current); await second;
  const stale = f.sentinel(); f.requests[0].resolve(stale); await first;
  assert.equal(stale.releases, 1);
  assert.equal(f.c.held(), current);
  f.c.mode = 'home'; f.c.release();
  assert.equal(current.releases, 1);
  assert.equal(f.c.held(), null);
});

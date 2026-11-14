const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('  const ANDROID =');
const end = source.indexOf('  // ---------- glazba u pozadini', start);
assert(start >= 0 && end > start, 'native adapter section must exist');

function fixture(preference = 'normal') {
  const listeners = new Map(), vibrations = [], posted = [], calls = { resume: 0, checkpoint: 0, save: 0, flush: 0, reload: 0 };
  const configs = [], saved = new Map(preference === null ? [] : [['mz_haptic_level', preference]]);
  const window = { addEventListener: (type, fn) => listeners.set(type, fn) };
  const context = vm.createContext({ window, location: { origin: 'https://game.test', reload: () => calls.reload++ },
    navigator: { vibrate: value => vibrations.push(JSON.parse(JSON.stringify(value))) },
    store: { get: key => saved.get(key), set: (key, value) => saved.set(key, value) },
    diagnostic: () => {}, toolNotice: () => {},
    checkConnection: () => calls.resume++, saveRecovery: () => calls.save++, flushRecovery: () => calls.flush++,
    game: { checkpoint: () => { calls.checkpoint++; return { events: [] }; } }, mode: 'hostp' });
  vm.runInContext(source.slice(start, end) + ';this.haptic=HAPTIC;this.android=ANDROID;', context);
  const port = { postMessage: value => { if (typeof value === 'string' && value.startsWith('haptic-level:')) configs.push(value); else posted.push(value); }, start() { this.started = true; } };
  return { context, window, calls, vibrations, posted, configs, saved, port,
    connect(overrides = {}) { listeners.get('message')({ data: 'trivia-native-connect', source: null, origin: '', ports: [port], ...overrides }); },
    lifecycle(data) { port.onmessage({ data }); } };
}
const patterns = { tap: 12, confirm: 20, error: [25, 60, 25], impact: 50, bomb: [80, 40, 120], step: 15, victory: [30, 70, 30, 70, 110] };

test('ordinary browsers preserve all existing vibration patterns without a native port', () => {
  const f = fixture(); for (const key of Object.keys(patterns)) f.context.haptic[key]();
  assert.deepEqual(f.vibrations, Object.values(patterns)); assert.deepEqual(f.posted, []);
});
test('a trusted native port receives only fixed haptic names and suppresses duplicate web vibration', () => {
  const f = fixture(); f.connect(); assert.equal(f.port.started, true);
  for (const key of Object.keys(patterns)) f.context.haptic[key]();
  assert.deepEqual(f.posted, Object.keys(patterns)); assert.deepEqual(f.vibrations, []);
  assert.equal(f.context.android.haptic('open-file'), false); assert.equal(f.context.android.haptic({ kind: 'tap' }), false);
  assert.equal(f.posted.length, 7);
});
test('foreign origins, frames, unknown handshakes and extra ports cannot replace the browser path', () => {
  for (const overrides of [{ origin: 'https://evil.test' }, { source: {} }, { data: 'unknown' }, { ports: [] }, { ports: [{}, {}] }, { ports: [{}] }]) {
    const f = fixture(); f.connect(overrides); f.context.haptic.tap();
    assert.deepEqual(f.vibrations, [12]); assert.deepEqual(f.posted, []);
  }
});
test('an opaque native sender can transfer its restricted port', () => {
  const f = fixture(); f.connect({ origin: 'null', source: null }); f.context.haptic.tap();
  assert.deepEqual(f.posted, ['tap']); assert.deepEqual(f.vibrations, []);
});
test('same-origin window handshake is supported and a second port cannot take over', () => {
  const f = fixture(); f.connect({ source: f.window, origin: 'https://game.test' });
  const second = []; f.connect({ ports: [{ postMessage: value => second.push(value) }] }); f.context.haptic.confirm();
  assert.deepEqual(f.posted, ['confirm']); assert.deepEqual(second, []);
});
test('native resume checks the live connection without reloading or resetting the game', () => {
  const f = fixture(); f.connect(); f.lifecycle('resume'); f.lifecycle('unexpected'); f.lifecycle({ method: 'reload' });
  assert.deepEqual(f.calls, { resume: 1, checkpoint: 0, save: 0, flush: 0, reload: 0 });
});
test('native pause immediately checkpoints hosts while guests do not write host state', () => {
  const f = fixture(); f.connect(); f.lifecycle('pause');
  assert.deepEqual(f.calls, { resume: 0, checkpoint: 1, save: 1, flush: 1, reload: 0 });
  f.context.mode = 'player'; f.lifecycle('pause'); assert.equal(f.calls.checkpoint, 1);
  f.context.mode = 'host'; f.context.game = null; assert.doesNotThrow(() => f.lifecycle('pause'));
});
test('a closed native port falls back safely and missing browser vibration is harmless', () => {
  const f = fixture(); f.connect(); f.port.postMessage = () => { throw Error('closed'); }; f.context.haptic.error();
  assert.deepEqual(f.vibrations, [[25, 60, 25]]);
  delete f.context.navigator.vibrate; assert.doesNotThrow(() => f.context.haptic.tap());
});

 test('native commands are explicit, bounded and do not expose arbitrary native methods', () => {
  const f=fixture(); f.connect();
  assert.equal(f.context.android.command('share-invite','https://mateok51.github.io/mozgalica/#ABCD-'+'a'.repeat(22)),true);
  assert.equal(JSON.parse(f.posted[0]).type,'share-invite');
  assert.equal(f.context.android.command('share-invite','https://trivia-tavern.chaos-ballad.workers.dev/#ABCD-'+'a'.repeat(22)),true);
  for(const url of ['https://other.workers.dev/#ABCD','https://trivia-tavern.chaos-ballad.workers.dev.evil.test/#ABCD','https://trivia-tavern.chaos-ballad.workers.dev/?next=evil#ABCD']) assert.equal(f.context.android.command('share-invite',url),false);
  assert.equal(f.context.android.command('share-invite','https://evil.test/#ABCD'),false);
  assert.equal(f.context.android.command('export-diagnostics',JSON.stringify({format:1,events:[]})),true);
  assert.equal(f.context.android.command('export-diagnostics','x'.repeat(32769)),false);
  assert.equal(f.context.android.command('export-diagnostics',{}),false);
  assert.equal(f.context.android.command('open-file','/private/file'),false);
});


test('fresh installs default to mild and sync that setting on native handshake', () => {
  const f = fixture(null); assert.equal(f.context.haptic.level, 'mild');
  f.context.haptic.tap(); assert.deepEqual(f.vibrations, [8]);
  f.connect(); assert.deepEqual(f.configs, ['haptic-level:mild']);
});
test('vibration setting persists, validates input, and off suppresses all effects', () => {
  const f = fixture(); f.connect();
  assert.equal(f.context.haptic.setLevel('off'), true);
  assert.equal(f.saved.get('mz_haptic_level'), 'off');
  for (const kind of Object.keys(patterns)) f.context.haptic[kind]();
  assert.deepEqual(f.posted, []); assert.deepEqual(f.vibrations, [0]);
  assert.equal(f.context.haptic.setLevel('very-strong'), false);
  assert.equal(f.context.haptic.level, 'off');
  f.context.haptic.setLevel('mild'); f.context.haptic.confirm();
  assert.deepEqual(f.configs, ['haptic-level:normal', 'haptic-level:off', 'haptic-level:mild']);
  assert.deepEqual(f.posted, ['confirm']);
});

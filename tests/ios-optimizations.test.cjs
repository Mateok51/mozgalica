// iPhone prilagodbe: prepoznavanje iOS-a, zvuk uz utišani prekidač i dodirne geste.
// Izvršava stvarne isječke iz app.js s lažnim preglednikom. Ovo NIJE dokaz da radi na pravom
// iPhoneu (prekidač zvona, zumiranje dvostrukim dodirom, izbornik dugog pritiska).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const app = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../styles.css'), 'utf8');

const slice = (start, end) => {
  const begin = app.indexOf(start), finish = app.indexOf(end, begin);
  assert.ok(begin >= 0 && finish > begin, 'Isječak postoji: ' + start);
  return app.slice(begin, finish);
};

function detect(nav) {
  const classes = new Set();
  const context = vm.createContext({
    navigator: nav,
    document: { documentElement: { classList: { add: (c) => classes.add(c) } } },
  });
  vm.runInContext(slice('  const IS_IOS = (() =>', '\n\n  // ---------- likovi') + '\nthis.isIos = IS_IOS;', context);
  return { isIos: context.isIos, classes };
}

test('iPhone, iPod i iPad se prepoznaju, a klasa ios se dodaje samo na njima', () => {
  const iphone = detect({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1', platform: 'iPhone', maxTouchPoints: 5 });
  assert.equal(iphone.isIos, true);
  assert.ok(iphone.classes.has('ios'));
  assert.equal(detect({ userAgent: 'Mozilla/5.0 (iPod touch; CPU iPhone OS 15_0 like Mac OS X)', platform: 'iPod', maxTouchPoints: 5 }).isIos, true);
  assert.equal(detect({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X)', platform: 'iPad', maxTouchPoints: 5 }).isIos, true);
  // iPadOS 13+ u zadanom načinu predstavlja se kao Mac; razlikuje ga dodirni zaslon.
  assert.equal(detect({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 5 }).isIos, true);
});

test('Android, Mac i Windows se ne prepoznaju kao iOS i ne dobivaju klasu', () => {
  for (const nav of [
    { userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S911B) AppleWebKit/537.36 Chrome/124.0 Mobile Safari/537.36', platform: 'Linux armv8l', maxTouchPoints: 5 },
    { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15', platform: 'MacIntel', maxTouchPoints: 0 },
    { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0', platform: 'Win32', maxTouchPoints: 0 },
  ]) {
    const r = detect(nav);
    assert.equal(r.isIos, false, nav.platform);
    assert.equal(r.classes.size, 0);
  }
});

test('prepoznavanje ne ruši igru kad navigator nedostaje ili baci grešku', () => {
  assert.equal(detect(undefined).isIos, false);
  const throwing = { get userAgent() { throw new Error('blokirano'); } };
  assert.equal(detect(throwing).isIos, false);
});

function makeAudio(nav) {
  let created = 0;
  class AudioContext { constructor() { created++; this.state = 'running'; } resume() { return Promise.resolve(); } }
  const context = vm.createContext({
    store: { get() { return null; }, set() {} },
    window: { AudioContext }, navigator: nav, location: { protocol: 'file:' },
  });
  vm.runInContext(slice('  const SFX = (() => {', '  const AUDIO = SFX;') + '\nthis.audio=SFX;', context);
  return { audio: context.audio, created: () => created };
}

test('zvuk se prebacuje na "playback" da se čuje i kad je bočni prekidač iPhonea na tiho', () => {
  const session = { type: 'auto' };
  const { audio } = makeAudio({ audioSession: session });
  assert.equal(session.type, 'auto', 'ništa se ne mijenja prije prvog zvuka');
  audio.unlock();
  assert.equal(session.type, 'playback');
});

test('bez audioSession (Android, stariji iOS) ili uz grešku zvuk i dalje radi', () => {
  for (const nav of [
    {},
    undefined,
    { audioSession: { set type(v) { throw new Error('nije dopušteno'); }, get type() { return 'auto'; } } },
  ]) {
    const { audio, created } = makeAudio(nav);
    assert.doesNotThrow(() => audio.unlock());
    assert.equal(created(), 1, 'audio kontekst se i dalje stvara');
  }
});

test('dodir: bez zumiranja dvostrukim dodirom i bez izbornika dugog pritiska', () => {
  const rule = (selectorPart, prop) => new RegExp(selectorPart + '[^{}]*\\{[^}]*' + prop).test(css);
  assert.ok(rule('html, body, button', 'touch-action: manipulation'), 'touch-action: manipulation na stranici i gumbima');
  assert.ok(rule('button, \\[role="button"\\], img', '-webkit-touch-callout: none'), 'bez izbornika dugog pritiska na gumbima i slikama');
  assert.ok(rule('button, \\[role="button"\\]', 'user-select: none'), 'tekst gumba se ne označava');
  assert.ok(!/touch-action:\s*none[^}]*\}[^{]*html|html[^{}]*\{[^}]*touch-action:\s*none/.test(css), 'stranica kao cjelina ne smije blokirati dodir');
});

test('polja za unos zadržavaju označavanje teksta (ime, kod sobe)', () => {
  const blocks = css.match(/[^{}]*\{[^{}]*\}/g) || [];
  for (const b of blocks) {
    const sel = b.split('{')[0];
    if (/\binput\b|textarea/.test(sel)) assert.ok(!/user-select:\s*none|touch-callout:\s*none/.test(b), 'Pravilo za polje ne smije isključiti označavanje: ' + sel.trim().slice(0, 60));
  }
});

// Čuva dogovor: upute su kratke, a svaka odluka ima dovoljno vremena da je netko tko igra prvi put pročita i odabere.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({ setTimeout, clearTimeout, console });
vm.runInContext(require('./engine-source.cjs') + '\nthis.CFG = CFG; this.HOWTO = HOWTO; this.DATA = DATA; this.readSecs = readSecs;', context);
const { CFG, HOWTO, DATA } = context;
const app = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const words = (s) => String(s).trim().split(/\s+/).length;

test('every mini-game is explained in at most three short lines', () => {
  for (const [key, h] of Object.entries(HOWTO)) {
    assert.ok(h.r.length >= 2 && h.r.length <= 3, key + ': ' + h.r.length + ' lines');
    for (const line of h.r) assert.ok(line.length <= 56 && words(line) <= 9, key + ': line too long: ' + line);
    assert.ok(h.r.reduce((a, l) => a + words(l), 0) <= 20, key + ': more than 20 words in total');
  }
});

test('each power is described in one short line that fits a card on a small phone', () => {
  const src = app.match(/const PW_SHORT = (\{[^;]*\});/);
  assert.ok(src, 'PW_SHORT not found in app.js');
  const short = vm.runInNewContext('(' + src[1] + ')');
  for (const key of ['led', 'sluz', 'grick', 'bomba', 'dupli', 'pola', 'stit', 'oklada', 'utjeha']) {
    assert.ok(short[key], key + ' has no short description');
    assert.ok(short[key].length <= 32, key + ' is ' + short[key].length + ' characters: ' + short[key]);
  }
});

test('decisions give a first-time player enough time to read and choose', () => {
  const least = { vote: 15, power: 18, fpower: 12, bet: 20, trisk: 18, maj: 14, ulj: 25, uljVote: 20, secret: 12, secret2: 10 };
  for (const [key, min] of Object.entries(least)) assert.ok(CFG[key] >= min, key + ' is ' + CFG[key] + ' s, expected at least ' + min + ' s');
  assert.ok(CFG.kr.chWait >= 16, 'challenge decision time');
});

test('a longer pyramid statement gets more reading time, a short one keeps the base time', () => {
  const lens = DATA.tf.map((x) => words(x[0]));
  const longest = DATA.tf[lens.indexOf(Math.max(...lens))][0], shortest = DATA.tf[lens.indexOf(Math.min(...lens))][0];
  const timeFor = (text) => context.readSecs(CFG.fq, text);
  assert.equal(timeFor(shortest), CFG.fq);
  const t = timeFor(longest);
  assert.ok(t > CFG.fq && t <= CFG.fq + 6, 'longest statement (' + words(longest) + ' words) got ' + t + ' s');
  assert.ok(words(longest) / t <= 1.5, 'reading speed needed for the longest statement: ' + (words(longest) / t).toFixed(2) + ' words/s');
});

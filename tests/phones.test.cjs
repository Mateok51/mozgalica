// Čuva ono što čini izgled jednakim na iPhoneu, Samsungu i Xiaomiju (provjere izvornog koda; prikaz provjerava browser-phones.cjs).
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (f) => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const css = read('styles.css');

test('Nunito is declared as three single weights, exactly as Google Fonts serves it', () => {
  const faces = [...css.matchAll(/@font-face \{ font-family: "Nunito";[^}]*font-weight: ([^;]+);[^}]*url\("(fonts\/[^"]+)"\)/g)].map((m) => m[1] + ' ' + m[2]);
  assert.deepEqual(faces.map((f) => f.split(' ')[0]).sort(), ['600', '600', '800', '800', '900', '900'], 'a weight range lets browsers disagree on weights 400 and 700');
  assert.ok(!/font-weight: \d+ \d+;/.test(css.split('/* Smjer')[0]), 'no weight ranges in @font-face');
});

test('the browser is not allowed to inflate text on its own', () => {
  assert.match(css, /html \{[^}]*-webkit-text-size-adjust: 100%;[^}]*text-size-adjust: 100%;/);
});

test('symbols that double as emoji carry the text selector, so iPhones do not draw them as colour emoji', () => {
  for (const file of ['app.js', 'engine.js']) {
    const src = read(file);
    for (const ch of ['▶', '◀', '✔', '⬆', '✖']) {
      const bare = [...src.matchAll(new RegExp(ch + '(?![\\uFE0E\\uFE0F])', 'g'))].length;
      assert.equal(bare, 0, file + ': ' + bare + '× "' + ch + '" without U+FE0E (text) or U+FE0F (emoji)');
    }
  }
});

test('short screens are compacted at the heights real phones show in a browser', () => {
  for (const h of [780, 700, 600]) assert.ok(new RegExp('@media \\(max-height: ' + h + 'px\\) and \\(orientation: portrait\\)').test(css), 'missing the ' + h + 'px tier');
});

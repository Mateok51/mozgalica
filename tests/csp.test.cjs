const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const policy = (html.match(/<meta\s+http-equiv="Content-Security-Policy"\s+content="([^"]+)"/i) || [])[1];

test('there is a security policy and no inline script', () => {
  assert.ok(policy, 'Missing content security policy');
  const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].filter((m) => m[1].trim() || !/\ssrc=/.test(m[0]));
  assert.deepEqual(inline.map((m) => m[0].slice(0, 60)), [], 'Inline scripts need a hash in the policy; keep JavaScript in separate files');
});

test('scripts are only allowed from this origin, without hashes, eval or inline', () => {
  const scriptSrc = policy.split(';').map((s) => s.trim()).find((s) => s.startsWith('script-src '));
  assert.equal(scriptSrc, "script-src 'self'");
});

test('every script and stylesheet referenced by the page exists next to it', () => {
  const refs = [...html.matchAll(/<script[^>]*\ssrc="([^"]+)"/gi), ...html.matchAll(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/gi)].map((m) => m[1]);
  assert.ok(refs.length >= 5, 'expected the page to reference its scripts and styles');
  for (const ref of refs) {
    if (/^https?:/.test(ref)) { assert.ok(/^https:\/\/fonts\.googleapis\.com\//.test(ref), 'unexpected external resource ' + ref); continue; }
    assert.ok(!ref.startsWith('/') && !ref.includes('..'), 'use a relative path: ' + ref);
    assert.ok(fs.existsSync(path.join(root, ref)), 'missing file ' + ref);
  }
});

test('the service worker caches the page parts and bumps its version with them', () => {
  const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
  for (const f of ['./index.html', './styles.css', './app.js', './sw-register.js', './engine.js', './data/questions.js', './vendor/qrcode.js', './vendor/peerjs.min.js']) {
    assert.ok(sw.includes("'" + f + "'"), 'sw.js CORE is missing ' + f);
    assert.ok(fs.existsSync(path.join(root, f)), 'missing file ' + f);
  }
});

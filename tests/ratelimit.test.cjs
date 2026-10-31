const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('  function allowHostMessage(conn, now) {');
const end = html.indexOf('  function onHostData(conn, m) {');
assert.ok(start > 0 && end > start, 'allowHostMessage must exist in index.html');
const ctx = vm.createContext({});
vm.runInContext('const connRate = new WeakMap();\n' + html.slice(start, end) + '\nthis.allow = allowHostMessage;', ctx);

test('a burst of 30 messages is allowed, the 31st is rejected', () => {
  const conn = {};
  for (let i = 0; i < 30; i++) assert.equal(ctx.allow(conn, 1000), true, 'message ' + (i + 1));
  assert.equal(ctx.allow(conn, 1000), false);
});

test('tokens refill at 20 per second', () => {
  const conn = {};
  for (let i = 0; i < 30; i++) ctx.allow(conn, 0);
  assert.equal(ctx.allow(conn, 0), false);
  assert.equal(ctx.allow(conn, 100), true);    // +2 tokens
  assert.equal(ctx.allow(conn, 100), true);
  assert.equal(ctx.allow(conn, 100), false);
  assert.equal(ctx.allow(conn, 5000), true);   // refilled, capped at 30
  let ok = 0; for (let i = 0; i < 40; i++) if (ctx.allow(conn, 5000)) ok++;
  assert.equal(ok, 29);
});

test('a flooding connection does not affect another one', () => {
  const a = {}, b = {};
  for (let i = 0; i < 100; i++) ctx.allow(a, 0);
  assert.equal(ctx.allow(a, 0), false);
  assert.equal(ctx.allow(b, 0), true);
});

test('a clock that goes backwards does not grant extra tokens', () => {
  const conn = {};
  for (let i = 0; i < 30; i++) ctx.allow(conn, 10000);
  assert.equal(ctx.allow(conn, 5000), false);
});

test('ordinary play (a few messages per second) is never limited', () => {
  const conn = {};
  for (let i = 0; i < 600; i++) assert.equal(ctx.allow(conn, i * 250), true);
});

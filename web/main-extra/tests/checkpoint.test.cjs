const { test } = require('node:test');
const assert = require('node:assert/strict');
const { encode, decode } = require('../src/checkpoint.cjs');
test('checkpoint preserves nested maps and sets through JSON', () => {
  const original = { used: new Set([1, 4]), players: new Map([['ana', { score: 42 }]]) };
  assert.deepEqual(decode(JSON.parse(JSON.stringify(encode(original)))), original);
});
test('checkpoint rejects malformed data and prototype manipulation', () => {
  assert.throws(() => decode({ type: 'object', value: [['__proto__', null]] }), TypeError);
  assert.throws(() => decode({ type: 'map', value: [['broken']] }), TypeError);
  assert.throws(() => encode(() => {}), TypeError);
});

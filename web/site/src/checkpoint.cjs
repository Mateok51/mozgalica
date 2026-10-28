'use strict';

// Internal checkpoint format: JSON data plus explicit representations of Map and Set.
function encode(value) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return value;
  if (Array.isArray(value)) return { type: 'array', value: value.map(encode) };
  if (value instanceof Map) return { type: 'map', value: Array.from(value, ([k, v]) => [encode(k), encode(v)]) };
  if (value instanceof Set) return { type: 'set', value: Array.from(value, encode) };
  if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) return { type: 'object', value: Object.entries(value).map(([k, v]) => [k, encode(v)]) };
  throw new TypeError('Unsupported checkpoint value');
}
function decode(node) {
  if (node === null || typeof node === 'string' || typeof node === 'boolean' || (typeof node === 'number' && Number.isFinite(node))) return node;
  if (!node || typeof node !== 'object' || !Array.isArray(node.value)) throw new TypeError('Invalid checkpoint');
  switch (node.type) {
    case 'array': return node.value.map(decode);
    case 'set': return new Set(node.value.map(decode));
    case 'map': return new Map(node.value.map(pair => { if (!Array.isArray(pair) || pair.length !== 2) throw new TypeError('Invalid map entry'); return [decode(pair[0]), decode(pair[1])]; }));
    case 'object': {
      const result = {};
      for (const pair of node.value) {
        if (!Array.isArray(pair) || pair.length !== 2 || typeof pair[0] !== 'string' || ['__proto__', 'constructor', 'prototype'].includes(pair[0]) || Object.hasOwn(result, pair[0])) throw new TypeError('Invalid object entry');
        Object.defineProperty(result, pair[0], { value: decode(pair[1]), enumerable: true, writable: true, configurable: true });
      }
      return result;
    }
    default: throw new TypeError('Invalid checkpoint type');
  }
}
module.exports = { encode, decode };

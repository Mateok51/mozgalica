const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const html = require('./page-source.cjs');
const connect = html.slice(html.indexOf('  function connectHost() {'), html.indexOf('  function retrySoon() {'));

test('signalizacija koja se ponovno spojila ne stvara novu vezu dok je stara otvorena', () => {
  let calls = 0;
  const context = vm.createContext({ ppeer: { destroyed: false, connect() { calls++; } }, pconn: { open: true } });
  vm.runInContext(connect + '\nconnectHost();', context);
  assert.equal(calls, 0);
});

test('after reconnect the player identifies itself and resends its saved answer', () => {
  const handlers = {}, sent = [];
  const conn = { open: false, on(event, fn) { handlers[event] = fn; }, send(m) { sent.push(m); } };
  const ctx = vm.createContext({
    ppeer: { destroyed: false, connect() { return conn; } }, pconn: null,
    PEER_PREFIX: 'room-', pcode: 'TEST', mode: 'player', joinTries: 0,
    PID: 'player', SK: 'key', pname: 'Ana', myAv: 1, L: { sent: { s: 3, c: 1 } },
    S: {}, netNote: '', relayTimer: null, setTimeout() { return 1; }, clearTimeout() {},
    stopPlayerRelay() {}, phoneRender() {}, applyState() {}, retrySoon() {}
  });
  vm.runInContext(connect + '\nconnectHost();', ctx);
  conn.open = true; handlers.open();
  assert.equal(sent.length, 2);
  assert.equal(sent[0].t, 'hello');
  assert.equal(sent[0].pid, 'player');
  assert.equal(sent[1].t, 'in');
  assert.equal(sent[1].in.s, 3);
  assert.equal(sent[1].in.c, 1);
});
test('a silent broken connection is closed and a reconnect is requested', () => {
 let closed=0, retries=0;
 const watchdog=html.slice(html.indexOf('  function checkConnection() {'),html.indexOf("  window.addEventListener('online', checkConnection)"));
 const ctx=vm.createContext({hostPeer:null,mode:'player',S:{},document:{visibilityState:'visible'},lastStateAt:1,pconn:{close(){closed++;}},retrySoon(){retries++;},Date:{now(){return 20000;}}});
 vm.runInContext(watchdog+'\ncheckConnection();',ctx);
 assert.equal(closed,1);assert.equal(retries,1);assert.equal(ctx.pconn,null);
});

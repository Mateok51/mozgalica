const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const box = vm.createContext({ setTimeout, clearTimeout });
vm.runInContext(require('./engine-source.cjs') + ';this.createGame=createGame;', box);
const guest = n => ({ pid: 'p'+n, name: 'Guest '+n, av: 0 });
test('all six human seats admit unique avatars, and a seventh cannot displace anyone', () => {
 const g=box.createGame({code:'TEST'});
 try { g.addPlayer('host','Host',0,false,true); g.syncPeers([1,2,3,4,5].map(guest));
  assert.equal(g.view().P.length,6); assert.equal(new Set(g.view().P.map(p=>p.a)).size,6);
  g.syncPeers([1,2,3,4,5,6].map(guest)); assert.equal(g.view().P.length,6);assert.equal(g._p('p6'),undefined);
 }finally{g.stop();}
});
test('a replacement takes the released sixth seat in the same peer snapshot', () => {
 const g=box.createGame({code:'TEST'});
 try {g.addPlayer('host','Host',0,false,true);g.syncPeers([1,2,3,4,5].map(guest));
  g.syncPeers([1,2,3,4,6].map(guest));assert.equal(g.view().P.length,6);assert.ok(g._p('p6'));assert.equal(g._p('p5'),undefined);
 }finally{g.stop();}
});
test('a human sixth player replaces a bot rather than being rejected', () => {
 const g=box.createGame({code:'TEST'});
 try {g.addPlayer('host','Host',0,false,true);g.setBots(5);g.syncPeers([1,2,3,4,5].map(guest));
  assert.equal(g.view().P.length,6);assert.equal(g.view().P.filter(p=>p.b).length,0);
 }finally{g.stop();}
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const ctx = vm.createContext({ crypto: require('node:crypto').webcrypto, setTimeout, clearTimeout });
vm.runInContext(require('./engine-source.cjs') + ';this.recover=createRecoverableGame;', ctx);

test('ten thousand empty-offer heartbeats do not grow the recovery journal or trigger saves', () => {
 let saves = 0;
 const game = ctx.recover({ code: 'TEST', onCheckpoint: () => saves++ });
 try {
  game.addPlayer('one', 'Ana', 0, false, true);
  const before = game.checkpoint().events.length, savedBefore = saves;
  for(let i=0;i<10000;i++) game.refresh();
  assert.equal(game.checkpoint().events.length, before);
  assert.equal(saves, savedBefore);
  assert.equal(game.view().P.length, 1);
 } finally {game.stop();}
});

test('offer cleanup that can change state remains journaled', () => {
 let saves = 0;
 const game = ctx.recover({ code:'TEST', onCheckpoint:()=>saves++ });
 try {
  game.addPlayer('one', 'Ana', 0, false, true);
  // An expired offer is a focused fixture for the nonempty cleanup branch.
  game._G.rc.offers.push({f:'one', t:'absent', until:0});
  const before=game.checkpoint().events.length, savedBefore=saves;
  game.refresh();
  assert.equal(game._G.rc.offers.length,0);
  assert.equal(game.checkpoint().events.length,before+1);
  assert.equal(game.checkpoint().events.at(-1).method,'refresh');
  assert.equal(saves,savedBefore+1);
 } finally {game.stop();}
});

test('legacy journal entries for no-op refresh still replay successfully', () => {
 const game=ctx.recover({code:'TEST'});let restored;
 try {
  game.addPlayer('one','Ana',0,false,true);
  const saved=JSON.parse(JSON.stringify(game.checkpoint()));
  saved.events.push({method:'refresh',args:[],at:saved.time});
  restored=ctx.recover({code:'TEST'},saved);
  assert.equal(restored.view().P.length,1);
  assert.equal(restored.view().P[0].n,'Ana');
 } finally {game.stop();if(restored)restored.stop();}
});

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
const source = require('./engine-source.cjs');
const ctx = vm.createContext({ console, crypto: require('node:crypto').webcrypto, setTimeout, clearTimeout });
vm.runInContext(source + '\nthis.recover = createRecoverableGame', ctx);
test('journal restores players, bot choices, phase and scores', () => {
 const game = ctx.recover({code:'TEST'});
 let restored;
 try {
  game.addPlayer('one','Ana',0,false,true); game.setBots(2); game.start();
  const save = JSON.parse(JSON.stringify(game.checkpoint()));
  restored = ctx.recover({code:'TEST'},save);
  const a=JSON.parse(JSON.stringify(game.view())), b=JSON.parse(JSON.stringify(restored.view()));
  delete a.ms; delete b.ms;
  assert.deepEqual(b,a);
 } finally {game.stop(); if(restored) restored.stop();}
});
test('recovery survives timed transitions throughout a complete bot game', () => {
 let clock=1000000, id=0; const jobs=new Map();
 const sandbox=vm.createContext({ console, crypto: require('node:crypto').webcrypto,
 Date: class extends Date { static now(){return clock;} },
 setTimeout(fn,ms){const key=++id;jobs.set(key,{fn,at:clock+Math.max(0,ms)});return key;},
 clearTimeout(key){jobs.delete(key);}
 });
 vm.runInContext(source+'\nthis.recover = createRecoverableGame',sandbox);
 const game=sandbox.recover({code:'TEST'});
 try {
 game.setBots(3);game.start();
 const phases=new Set(); let count=0;
 while(game.view().ph!=='final' && count++<3000){
  phases.add(game.view().ph);
  const next=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0];
  assert.ok(next,'expected a pending event');jobs.delete(next[0]);clock=next[1].at;next[1].fn();
  if(count%7===0){
   game.refresh();
   const save=JSON.parse(JSON.stringify(game.checkpoint()));
   const restored=sandbox.recover({code:'TEST'},save);
   try {
    assert.equal(JSON.stringify(restored.view()),JSON.stringify(game.view()));
    assert.equal(JSON.stringify(restored._td()),JSON.stringify(game._td()));
   } finally {restored.stop();}
  }
 }
 assert.equal(game.view().ph,'final');assert.ok(phases.size>5);
 } finally {game.stop();}
});
test('invalid and out of order journals are rejected', () => {
 assert.throws(()=>ctx.recover({code:'TEST'},{version:99,events:[]}));
 assert.throws(()=>ctx.recover({code:'TEST'},{version:1,seed:1,created:10,time:20,events:[{at:21,method:'start',args:[]}]}));
 assert.throws(()=>ctx.recover({code:'TEST'},{version:1,seed:1,created:10,time:20,events:[{at:12,method:'__proto__',args:[]}]}));
});

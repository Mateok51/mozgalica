const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'..','app.js'),'utf8');
const validation=app.slice(app.indexOf('  function validGamePayload('),app.indexOf('  function onHostData('));
const recovery=app.slice(app.indexOf('  let recoveryTimer ='),app.indexOf('  function openRoom('));
assert(validation.includes('function validGamePayload'));assert(recovery.includes('function flushRecovery'));

function harness(){
 let clock=0,id=0;const jobs=new Map(),writes=[],removals=[];let broken=false;
 const listeners=new Map();
 const ctx=vm.createContext({
  Date:class extends Date{static now(){return clock;}},
  setTimeout(fn,ms){const key=++id;jobs.set(key,{fn,at:clock+ms});return key;},clearTimeout(key){jobs.delete(key);},
  sessionStorage:{setItem(k,v){if(broken)throw Error('quota');writes.push([k,JSON.parse(v)]);},removeItem(k){removals.push(k);}},
  window:{addEventListener(name,fn){listeners.set(name,fn);}},
 });
 vm.runInContext(`let game={view:()=>({ph:'question',code:'TEST'}),checkpoint:()=>({events:[{method:'pagehide-latest'}]})};let mode='hostp';const hostKeys=new Map([['one','test-key']]);const HOST_RS='room-key';const pconn=null;function stopPlayerRelay(){}\n`+validation+recovery+`\nthis.save=saveRecovery;this.flush=flushRecovery;this.valid=validGamePayload;this.replaceGame=()=>{game={view:()=>({ph:'lobby',code:'NEW'})}};this.setMode=x=>{mode=x};this.endGame=()=>{game.view=()=>({ph:'final',code:'TEST'})};`,ctx);
 const pagehide=app.split('\n').find(line=>line.includes("window.addEventListener('pagehide'"));assert(pagehide);vm.runInContext(pagehide,ctx);
 return {ctx,writes,removals,jobs,breakStorage(){broken=true;},hide(){listeners.get('pagehide')();},advance(ms){const until=clock+ms;for(;;){const next=[...jobs].filter(([,x])=>x.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;jobs.delete(next[0]);clock=next[1].at;next[1].fn();}clock=until;}};
}

test('a burst of 100 checkpoints produces one deferred write containing the latest journal',()=>{
 const h=harness();for(let i=0;i<100;i++)h.ctx.save({events:[{n:i}]});assert.equal(h.jobs.size,1);assert.equal(h.writes.length,0);
 h.advance(999);assert.equal(h.writes.length,0);h.advance(1);assert.equal(h.writes.length,1);assert.equal(h.writes[0][1].journal.events[0].n,99);
 assert.equal(h.writes[0][1].noTv,true);h.advance(1000);assert.equal(h.writes.length,1);
 h.ctx.save({events:[{n:100}]});h.advance(1000);assert.equal(h.writes.length,2);
});
test('the actual pagehide listener flushes the newest checkpoint immediately',()=>{
 const h=harness();h.ctx.save({events:[{method:'old'}]});h.hide();assert.equal(h.writes.length,1);assert.equal(h.writes[0][1].journal.events[0].method,'pagehide-latest');assert.equal(h.jobs.size,0);h.advance(2000);assert.equal(h.writes.length,1);
});
test('storage errors do not escape into live game processing',()=>{
 const h=harness();h.breakStorage();h.ctx.save({events:[]});assert.doesNotThrow(()=>h.advance(1000));assert.doesNotThrow(()=>h.hide());
});
test('a pending checkpoint from an old game is not written over a replacement game',()=>{
 const h=harness();h.ctx.save({events:[{old:true}]});h.ctx.replaceGame();h.advance(1000);assert.equal(h.writes.length,0);
});
test('leaving host mode cancels the effect of a pending write and final games clear recovery',()=>{
 const h=harness();h.ctx.save({events:[]});h.ctx.setMode('home');h.advance(1000);assert.equal(h.writes.length,0);
 const f=harness();f.ctx.save({events:[]});f.ctx.endGame();f.advance(1000);assert.deepEqual(f.removals,['mz_recovery_v1']);assert.equal(f.writes.length,0);
});
test('normal game input shapes for six players remain accepted',()=>{
 const {ctx}=harness();for(let i=0;i<6;i++)for(const payload of [{s:123,c:i%4,t:1500},{s:123,p:'led',t:'player-'+i},{s:123,r:[0,-1,1,-1],p:1},{s:123,r:Array(40).fill(0)},{k:'krCh',yes:true}])assert.equal(ctx.valid(payload),true);
});
test('oversized, deep, nonfinite, cyclic and forbidden-key payloads are rejected',()=>{
 const {ctx}=harness();let deep={};for(let i=0;i<8;i++)deep={a:deep};const cyclic={};cyclic.self=cyclic;
 for(const bad of [{x:'x'.repeat(4001)},Array(300).fill(0),deep,{v:NaN},{v:Infinity},cyclic,JSON.parse('{"__proto__":{"polluted":true}}'),{constructor:'bad'},{prototype:'bad'}])assert.equal(ctx.valid(bad),false);
});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {Miniflare,convertV4MiniflareOptions} from 'miniflare';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {build as buildEngine} from '../build.mjs';
import {ROOM_TTL,controlAllowed} from '../policy.mjs';
await buildEngine();
const bundle=await build({entryPoints:[new URL('../worker.mjs',import.meta.url).pathname],bundle:true,write:false,format:'esm',platform:'browser'});
function runtime(persist) {return new Miniflare(convertV4MiniflareOptions({modules:true,script:bundle.outputFiles[0].text,compatibilityDate:'2026-11-01',durableObjects:{DIRECTORY:{className:'RoomDirectory',useSQLite:true},ROOMS:{className:'GameRoom',useSQLite:true}},resourcePersistencePath:persist}));}
const identity=(n)=>({pid:'p'+n,sk:n.toString(16).padStart(32,'0'),name:'Igrac'+n,av:n%8});
async function create(mf,noTv=true,n=1) {
 const r=await mf.dispatchFetch('http://localhost/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...identity(n),noTv})});
 assert.equal(r.status,200);return r.json();
}
async function connect(mf,room,id,role='player',secret=room.secret) {
 const response=await mf.dispatchFetch('http://localhost/api/rooms/'+room.code,{headers:{Upgrade:'websocket'}});
 assert.equal(response.status,101);const ws=response.webSocket;ws.accept();
 const messages=[],waiters=[];
 ws.addEventListener('message',e=>{const value=JSON.parse(e.data);messages.push(value);for(const w of [...waiters])if(w.pred(value)){waiters.splice(waiters.indexOf(w),1);clearTimeout(w.timer);w.resolve(value);}});
 const wait=(pred,timeout=9000)=>{const value=messages.find(pred);if(value)return Promise.resolve(value);return new Promise((resolve,reject)=>{const w={pred,resolve,timer:setTimeout(()=>{waiters.splice(waiters.indexOf(w),1);reject(Error('Timed out waiting for '+pred+'; got '+JSON.stringify(messages.slice(-2))));},timeout)};waiters.push(w);});};
 ws.send(JSON.stringify({t:'hello',...id,role,secret}));
 return {ws,messages,wait,send:value=>ws.send(JSON.stringify(value)),close:()=>{try{ws.close();}catch{}}};
}
test('authoritative six-player room survives owner disconnect and restores persisted journal',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'trivia-server-'));let mf=runtime(persist);const all=[];
 try {
 const room=await create(mf);assert.match(room.code,/^[A-Z]{4}$/);assert.match(room.secret,/^[A-Za-z0-9_-]{22}$/);
 const owner=await connect(mf,room,identity(1));all.push(owner);let first=await owner.wait(x=>x.P);assert.equal(first.P.length,1);assert.equal(first.cloud.owner,true);
 const guests=[];for(let n=2;n<=6;n++){const c=await connect(mf,room,identity(n));all.push(c);guests.push(c);await c.wait(x=>x.P?.some(p=>p.id==='p'+n));}
 const six=await guests.at(-1).wait(x=>x.P?.length===6);assert.equal(six.cloud.owner,false);assert(!JSON.stringify(six).includes(room.secret));assert(!JSON.stringify(six).includes(identity(1).sk));
 const seventh=await connect(mf,room,identity(7));all.push(seventh);assert.equal((await seventh.wait(x=>x.t==='error')).reason,'full');
 const bad=await connect(mf,room,identity(8),'player','b'.repeat(22));all.push(bad);assert.equal((await bad.wait(x=>x.t==='error')).reason,'auth');
 const stolen=await connect(mf,room,{...identity(1),sk:'f'.repeat(32)});all.push(stolen);assert.equal((await stolen.wait(x=>x.t==='error')).reason,'auth');
 guests[0].send({t:'control',method:'start',args:[]});assert.equal((await guests[0].wait(x=>x.t==='error')).reason,'forbidden');
 owner.send({t:'control',method:'setOpt',args:['len','brza']});await owner.wait(x=>x.len==='brza');
 owner.send({t:'control',method:'start',args:[]});await owner.wait(x=>x.ph==='intro');owner.close();
 const running=await guests[0].wait(x=>x.ph==='vote');assert(running.P.some(p=>p.id==='p1'&&!p.c));assert(!Object.hasOwn(running,'cor'));
 const recoveredOwner=await connect(mf,room,identity(1));all.push(recoveredOwner);await recoveredOwner.wait(x=>x.ph==='vote'&&x.P.some(p=>p.id==='p1'&&p.c));
 for(const c of all)c.close();await new Promise(r=>setTimeout(r,100));await mf.dispose();
 mf=runtime(persist);const rejoined=await connect(mf,room,identity(1));all.push(rejoined);const state=await rejoined.wait(x=>x.P);assert.equal(state.code,room.code);assert.equal(state.len,'brza');assert.notEqual(state.ph,'lobby');assert.equal(state.cloud.owner,true);
 } finally {for(const c of all)c.close();await mf.dispose();await rm(persist,{recursive:true,force:true});}
});
test('code-only players join without exposing the invitation secret or weakening identity and host authentication',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'trivia-server-code-auth-')),mf=runtime(persist),all=[];
 const add=async(...args)=>{const client=await connect(mf,...args);all.push(client);return client;};
 const rejected=async(id,role,secret,expected='auth')=>{
  const client=await add(room,id,role,secret);
  assert.equal((await client.wait(x=>x.t==='error')).reason,expected);
  assert(!client.messages.some(x=>x.P),'Rejected clients must not receive game state');
 };
 let room;
 try {
  room=await create(mf,false,60);
  await rejected(identity(60),'host',null);
  const missingHostSecret=await add({code:room.code},identity(60),'host');
  assert.equal((await missingHostSecret.wait(x=>x.t==='error')).reason,'auth');
  const owner=await add(room,identity(60),'host');await owner.wait(x=>x.P);
  // A room object containing only the code makes the helper omit secret entirely.
  const omitted=await add({code:room.code},identity(61));
  const first=await omitted.wait(x=>x.P?.some(p=>p.id==='p61'));
  assert.equal(first.cloud.owner,false);
  const nullable=await add(room,identity(62),'player',null);
  const state=await nullable.wait(x=>x.P?.length===2);
  assert(!JSON.stringify(state).includes(room.secret));
  for(const n of [60,61,62])assert(!JSON.stringify(state).includes(identity(n).sk));
  for(const secret of ['',42,'bad','b'.repeat(22)])await rejected(identity(63),'player',secret);
  await rejected({...identity(61),sk:'f'.repeat(32)},'player',null);
  await rejected({...identity(60),sk:'f'.repeat(32)},'player',null);
  await rejected({...identity(60),sk:'f'.repeat(32)},'host',room.secret);
  await rejected(identity(61),'host',room.secret);
  omitted.send({t:'control',method:'start',args:[]});
  assert.equal((await omitted.wait(x=>x.reason==='forbidden')).reason,'forbidden');
  owner.send({t:'control',method:'setOpt',args:['len','brza']});
  await nullable.wait(x=>x.len==='brza');
 }finally{for(const c of all)c.close();await mf.dispose();await rm(persist,{recursive:true,force:true});}
});
test('code-only admission keeps seat and start limits while an existing identity can reconnect',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'trivia-server-code-rejoin-')),mf=runtime(persist),all=[];
 const add=async(...args)=>{const client=await connect(mf,...args);all.push(client);return client;};
 try {
  const room=await create(mf,true,70),owner=await add(room,identity(70));await owner.wait(x=>x.P);
  for(let n=71;n<=75;n++){
   const guest=await add(room,identity(n),'player',null);
   await guest.wait(x=>x.P?.some(p=>p.id==='p'+n));
  }
  const full=await add(room,identity(76),'player',null);
  assert.equal((await full.wait(x=>x.t==='error')).reason,'full');
  owner.send({t:'control',method:'start',args:[]});await owner.wait(x=>x.ph==='intro');
  const late=await add({code:room.code},identity(77));
  assert.equal((await late.wait(x=>x.t==='error')).reason,'started');
  const returning=await add({code:room.code},identity(71));
  const state=await returning.wait(x=>x.P?.some(p=>p.id==='p71')&&x.ph!=='lobby');
  assert.equal(state.P.length,6);
  assert.equal(state.P.filter(p=>p.id==='p71').length,1);
  assert.equal(state.cloud.owner,false);
  assert(!JSON.stringify(state).includes(room.secret));
 }finally{for(const c of all)c.close();await mf.dispose();await rm(persist,{recursive:true,force:true});}
});
test('TV owner is spectator and guests retain six seats; input and packet policies reject malformed traffic',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'trivia-server-tv-')),mf=runtime(persist),all=[];
 try {const room=await create(mf,false,9);const owner=await connect(mf,room,identity(9),'host');all.push(owner);const view=await owner.wait(x=>x.P);assert.equal(view.P.length,0);assert.equal(view.pv,null);
 for(let n=10;n<16;n++){const c=await connect(mf,room,identity(n));all.push(c);const v=await c.wait(x=>x.P?.some(p=>p.id==='p'+n));assert.equal(v.P.length,n-9);}
 const guest=all[1];guest.send({t:'control',method:'setBots',args:[6]});assert.equal((await guest.wait(x=>x.t==='error')).reason,'forbidden');
 guest.send({t:'in',in:{s:0,c:0,text:'x'.repeat(9000)}});assert.equal((await guest.wait(x=>x.reason==='invalid')).reason,'invalid');
 const others=all.at(-1);others.send({t:'ping'});assert.equal((await others.wait(x=>x.P?.length===6)).P.length,6);
 }finally{for(const c of all)c.close();await mf.dispose();await rm(persist,{recursive:true,force:true});}
});
test('rolling free-tier room cap persists and lifetime is bounded',async()=>{
 const persist=await mkdtemp(join(tmpdir(),'trivia-server-cap-'));let mf=runtime(persist);
 try{assert.equal(ROOM_TTL,2*60*60*1000);for(let i=0;i<12;i++)await create(mf,true,20+i);await mf.dispose();mf=runtime(persist);
 const r=await mf.dispatchFetch('http://localhost/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...identity(50),noTv:true})});assert.equal(r.status,429);assert.equal((await r.json()).reason,'capacity');
 assert(controlAllowed('setOpt',['len','brza']));assert(controlAllowed('setOpt',['len','duga']));assert(!controlAllowed('setOpt',['len','short']));assert(!controlAllowed('_score',['p1',99999]));
 }finally{await mf.dispose();await rm(persist,{recursive:true,force:true});}
});
test('canonical game payload rejects padding without removing valid partial answers',async()=>{
 const {gamePayload}=await import('../policy.mjs');
 assert.equal(gamePayload({s:1,r:[0,-1,1,-1],p:1,filler:'x'.repeat(3000)}),null);
 assert.deepEqual(gamePayload({s:1,r:[0,-1,1,-1],p:1}),{s:1,r:[0,-1,1,-1],p:1});
 assert.equal(gamePayload({k:'krOff',yes:true,filler:'x'.repeat(3000)},true),null);
 assert.deepEqual(gamePayload({k:'krOff',yes:true},true),{k:'krOff',yes:true});
});

const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../cloud-transport.js'),'utf8');
function fixture(){let seq=0,now=10000;const jobs=new Map(),sockets=[],states=[],statuses=[],errors=[];class WS{constructor(url){this.url=url;this.readyState=0;this.sent=[];sockets.push(this);}send(text){this.sent.push(JSON.parse(text));}close(){this.readyState=3;}open(){this.readyState=1;this.onopen();}message(data){this.onmessage({data:JSON.stringify(data)});}}const c=vm.createContext({URL,WebSocket:WS,Date:{now:()=>now},AbortController,setTimeout:(fn,ms)=>{const id=++seq;jobs.set(id,{fn,ms,kind:'timeout'});return id;},clearTimeout:id=>jobs.delete(id),setInterval:(fn,ms)=>{const id=++seq;jobs.set(id,{fn,ms,kind:'interval'});return id;},clearInterval:id=>jobs.delete(id)});vm.runInContext(source,c);const client=c.TAVERN_CLOUD_TRANSPORT.create({apiOrigin:'https://tavern.workers.dev',onState:x=>states.push(x),onStatus:x=>statuses.push(x),onError:x=>errors.push(x)});return{c,client,jobs,sockets,states,statuses,errors,advance:ms=>{now+=ms;}};}
const credentials={code:'ABCD',secret:'a'.repeat(22),pid:'one',sk:'f'.repeat(32),name:'Ana',av:0,role:'player'};
const state=()=>({code:'ABCD',P:[{id:'one'}],ph:'lobby',s:1,ms:0,dur:0,cloud:{owner:false,noTv:true}});
test('cloud origin validation rejects non-HTTPS foreign schemes and credentials',()=>{const f=fixture();for(const u of ['javascript:alert(1)','http://evil.test','https://user:password@host.test','https://host.test?query','https://host.test#secret'])assert.equal(f.c.TAVERN_CLOUD_TRANSPORT.origin(u),null);assert.equal(f.c.TAVERN_CLOUD_TRANSPORT.origin('http://127.0.0.1:8787'),'http://127.0.0.1:8787');});
test('input is sent only after authenticated authoritative state includes player',()=>{const f=fixture();f.client.connect(credentials);const ws=f.sockets[0];assert.equal(ws.url,'wss://tavern.workers.dev/api/rooms/ABCD');assert.equal(f.client.send({t:'in',in:{c:0}}),false);ws.open();assert.equal(ws.sent[0].secret,credentials.secret);ws.message({...state(),P:[]});assert.equal(f.client.connected,false);ws.message(state());assert.equal(f.client.connected,true);assert.equal(f.client.send({t:'in',in:{c:0}}),true);assert.equal(f.states.length,1);});
test('players can join by code without exposing or inventing a room secret',()=>{
 for(const secret of [null,undefined]){const f=fixture();f.client.connect({...credentials,secret});const ws=f.sockets[0];ws.open();assert.equal(ws.sent[0].secret,secret);assert.equal(ws.sent[0].role,'player');ws.message(state());assert.equal(f.client.connected,true);ws.onclose();[...f.jobs.values()].find(j=>j.ms===500).fn();f.sockets[1].open();assert.equal(f.sockets[1].sent[0].secret,secret);}
});
test('hosts need invitation secrets and malformed explicit player secrets are rejected',()=>{
 for(const value of [{...credentials,role:'host',secret:null},{...credentials,role:'host',secret:undefined},...['','bad',123].map(secret=>({...credentials,secret}))]){const f=fixture();assert.throws(()=>f.client.connect(value));assert.equal(f.sockets.length,0);}
});
test('disconnect schedules one bounded reconnect and reuses identity',()=>{const f=fixture();f.client.connect(credentials);const ws=f.sockets[0];ws.open();ws.message(state());ws.onclose();ws.onerror();const retry=[...f.jobs.values()].filter(j=>j.kind==='timeout'&&j.ms<30000);assert.equal(retry.length,1);assert.equal(retry[0].ms,500);retry[0].fn();const next=f.sockets[1];next.open();assert.deepEqual(JSON.parse(JSON.stringify(next.sent[0])),{t:'hello',pid:'one',sk:'f'.repeat(32),name:'Ana',av:0,secret:'a'.repeat(22),role:'player'});});
test('leave invalidates stale callbacks and cannot resurrect old room',()=>{const f=fixture();f.client.connect(credentials);const ws=f.sockets[0];ws.open();f.client.close();ws.onclose();ws.message(state());assert.equal(f.jobs.size,0);assert.equal(f.states.length,0);assert.equal(f.client.connected,false);});
test('terminal auth rejection stops retries without leaking server data',()=>{const f=fixture();f.client.connect(credentials);const ws=f.sockets[0];ws.open();ws.message({t:'error',reason:'auth'});assert.equal(f.jobs.size,0);assert.equal(f.client.connected,false);assert.equal(f.errors[0].reason,'auth');});
test('host spectator accepts owner state without being added as a player',()=>{const f=fixture();f.client.connect({...credentials,role:'host'});const ws=f.sockets[0];ws.open();ws.message({...state(),P:[],cloud:{owner:true,noTv:false}});assert.equal(f.states.length,1);});

test('failed initial WebSocket upgrades have a bounded admission deadline',()=>{const f=fixture();f.client.connect(credentials);const deadline=[...f.jobs.values()].find(j=>j.ms===30000);f.sockets[0].onerror();deadline.fn();assert.equal(f.errors[0].reason,'unavailable');assert.equal(f.jobs.size,0);assert.equal(f.client.connected,false);});

test('periodic checks preserve in-flight connections and retry backoff',()=>{const f=fixture();f.client.connect(credentials);f.client.check();assert.equal(f.sockets.length,1);const ws=f.sockets[0];ws.open();ws.onclose();f.client.check();assert.equal(f.sockets.length,1);f.client.check(true);assert.equal(f.sockets.length,2);});

test('a reconnect WebSocket that never upgrades has its own deadline after admission',()=>{
 const f=fixture();f.client.connect(credentials);const first=f.sockets[0];first.open();first.message(state());first.onclose();
 [...f.jobs.values()].find(job=>job.ms===500).fn();
 assert.equal(f.sockets[1].readyState,0);
 const deadline=[...f.jobs.values()].find(job=>job.ms===12000);
 assert(deadline,'Every attempt needs a deadline even before onopen');
 deadline.fn();
 assert.equal(f.sockets[1].readyState,3);
 assert.equal(f.client.connected,false);
 assert.equal(f.errors.length,0,'A temporary failed reconnect must not invalidate the saved identity');
});

test('a Safari resume rescues an overdue CONNECTING socket even before frozen timers run',()=>{
 const f=fixture();f.client.connect(credentials);const first=f.sockets[0];first.open();first.message(state());first.onclose();
 [...f.jobs.values()].find(job=>job.ms===500).fn();
 const stale=f.sockets[1];f.advance(12001);f.client.check(true);
 assert.equal(stale.readyState,3);
 assert.equal(f.sockets.length,3);
 const next=f.sockets[2];next.open();assert.equal(next.sent[0].pid,credentials.pid);assert.equal(next.sent[0].sk,credentials.sk);
 stale.open();stale.message(state());assert.equal(f.states.length,1,'Late callbacks cannot admit an abandoned socket');
});

test('a resumed OPEN connection must answer its probe or reconnect without waiting a whole heartbeat window',()=>{
 const f=fixture();f.client.connect(credentials);const ws=f.sockets[0];ws.open();ws.message(state());
 f.client.check(true);assert.equal(f.sockets.length,1);
 const probe=[...f.jobs.values()].find(job=>job.ms===4000);
 assert(probe,'The OPEN readyState is not proof Safari retained a working channel');
 probe.fn();assert.equal(ws.readyState,3);assert.equal(f.client.connected,false);
 assert.equal(f.errors.length,0);
});

test('a healthy forced probe preserves the socket and clears its deadline on response',()=>{
 const f=fixture();f.client.connect(credentials);const ws=f.sockets[0];ws.open();ws.message(state());
 f.client.check(true);const probes=[...f.jobs.entries()].filter(([,job])=>job.ms===4000);assert.equal(probes.length,1);
 ws.message(state());assert(!f.jobs.has(probes[0][0]));assert.equal(f.client.connected,true);assert.equal(f.sockets.length,1);
});

test('a closing WebSocket during hello does not leave admission without an error handler',()=>{
 const f=fixture();f.client.connect(credentials);const ws=f.sockets[0];ws.send=()=>{throw Error('socket closed while Safari resumed');};
 assert.doesNotThrow(()=>ws.open());assert.equal(ws.readyState,3);
 assert(f.statuses.includes('reconnecting'));assert.equal(f.client.connected,false);
});

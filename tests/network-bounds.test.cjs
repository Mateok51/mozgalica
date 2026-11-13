const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs'), path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
function fixture() {
 const calls = { encrypt: 0, decrypt: 0, delivered: [] }, sockets = [];
 class Socket {
  constructor() { this.readyState=1; this.bufferedAmount=0; this.sent=[]; sockets.push(this); }
  send(b) { this.sent.push(Array.from(b)); }
  close() { this.readyState=3; this.closed=true; }
 }
 const box=vm.createContext({ TextEncoder, TextDecoder, WebSocket: Socket, setTimeout:()=>1, setInterval:()=>1, clearInterval(){},
  btoa:s=>Buffer.from(s,'binary').toString('base64'),atob:s=>Buffer.from(s,'base64').toString('binary'),
  crypto:{getRandomValues:a=>a,subtle:{encrypt:async()=>{calls.encrypt++;return new Uint8Array(24).buffer;},decrypt:async()=>{calls.decrypt++;return new TextEncoder().encode('{"ok":true}').buffer;}}},
  deliver:(topic,msg)=>calls.delivered.push({topic,msg}) });
 vm.runInContext(source.slice(source.indexOf('  const b64u ='), source.indexOf('  const newRoomSecret =')) +
  source.slice(source.indexOf('  const NET_LIMIT ='),source.indexOf('  function relayReachable()')) +
  '\nthis.client=mqttClient("wss://test.invalid",deliver,()=>{});this.socket=undefined;this.exports={rOn,rDec,rPub};',box);
 box.socket=sockets[0];
 const receive=bytes=>{box.incoming=bytes;vm.runInContext('socket.onmessage({data:new Uint8Array(incoming).buffer})',box);};
 return {box,calls,socket:sockets[0],receive};
}
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(r=>setImmediate(r));};

test('MQTT accepts fragmented normal packets and preserves JSON delivery',()=>{
 const f=fixture(),data=Buffer.from('{"ok":true}'); const packet=[0x30,data.length+3,0,1,116,...data];
 f.receive(packet.slice(0,4));assert.equal(f.calls.delivered.length,0);f.receive(packet.slice(4));
 assert.equal(f.calls.delivered[0].topic,'t');assert.equal(f.calls.delivered[0].msg.ok,true);assert.equal(f.socket.closed,undefined);
});
test('oversized raw frames and oversized declared packets close only that relay',()=>{
 for(const bytes of [new Array(1048577).fill(0),[0x30,0xff,0xff,0x7f],[0x30,0x80,0x80,0x80,0x80]]) {
  const f=fixture();f.receive(bytes);assert.equal(f.box.client.dead,true);assert.equal(f.socket.closed,true);assert.equal(f.calls.delivered.length,0);
 }
 const normal=fixture();normal.receive([0x20,2,0,0]);assert.equal(normal.box.client.ready,true);
});
test('a single frame cannot schedule an unbounded number of MQTT packets',()=>{
 const f=fixture();f.receive(Array.from({length:257},()=>[0xd0,0]).flat());assert.equal(f.box.client.dead,true);
});
test('pending MQTT publishes are bounded before broker acknowledgment',()=>{
 const f=fixture();for(let i=0;i<32;i++)f.box.client.publish('t',{n:i});assert.equal(f.box.client.dead,false);
 f.box.client.publish('t',{n:33});assert.equal(f.box.client.dead,true);
 f.receive([0x20,2,0,0]);assert.equal(f.socket.sent.length,0,'closed clients never flush their old queue');
});
test('slow websocket output is disconnected rather than retained without bound',()=>{
 const f=fixture();f.receive([0x20,2,0,0]);f.socket.bufferedAmount=1048576;f.box.client.publish('t',{ok:true});assert.equal(f.box.client.dead,true);
});
test('decryption validates envelope sizes and bounds queued work before crypto',async()=>{
 const f=fixture();f.box.exports.rOn({},()=>{})('t',{v:2,i:'A'.repeat(16),c:'x'.repeat(700001)});
 await f.box.exports.rDec({}, {v:2,i:'invalid',c:'data'});assert.equal(f.calls.decrypt,0);
 const on=f.box.exports.rOn({},()=>{});for(let i=0;i<200;i++)on('t',{v:2,i:'A'.repeat(16),c:'data'});
 await flush();assert.equal(f.calls.decrypt,64);
});
test('outgoing crypto queue closes a saturated client and normal ordered sends still work',async()=>{
 const f=fixture(),sent=[],client={dead:false,publish:(topic,m)=>sent.push(topic),close(){this.dead=true;}};
 for(let i=0;i<3;i++)f.box.exports.rPub(client,{},String(i),{ok:true});await flush();assert.deepEqual(sent,['0','1','2']);
 const overloaded={dead:false,publish(){throw Error('overloaded queue must not publish');},close(){this.dead=true;}};
 for(let i=0;i<100;i++)f.box.exports.rPub(overloaded,{},'t',{ok:true});await flush();
 assert.equal(overloaded.dead,true);assert.equal(overloaded.pendingEncrypt,0);
});

function reconnectFixture() {
 const clients=[],timers=new Map(),delays=[];let seq=0,current=true,delivered=0;
 const box=vm.createContext({clearTimeout:id=>timers.delete(id),setTimeout:(fn,ms)=>{const id=++seq;timers.set(id,fn);delays.push(ms);return id;},
  rOn:(_ctx,fn)=>fn,rTopic:()=> 'room/h',onRelayHost:()=>delivered++,
  mqttClient:(_url,onMsg,onDown)=>{let resolve;const c={dead:false,onMsg,onDown,subscribe(){},whenReady:()=>new Promise(r=>resolve=r),readyResult:v=>resolve(v),close(){this.dead=true;},fail(){this.dead=true;onDown();}};clients.push(c);return c;}});
 vm.runInContext(source.slice(source.indexOf('  function reconnectingRelay('),source.indexOf('  async function startHostRelay('))+';this.reconnectingRelay=reconnectingRelay;',box);
 const slot=box.reconnectingRelay('wss://example.invalid',{},()=>current);
 return {clients,timers,delays,slot,get delivered(){return delivered;},stopGeneration(){current=false;},run(){const [id,fn]=timers.entries().next().value;timers.delete(id);fn();}};
}
test('each failed host broker has one retry timer with capped backoff',()=>{
 const f=reconnectFixture();
 for(let n=0;n<8;n++){const c=f.clients.at(-1);c.fail();c.onDown();assert.equal(f.timers.size,1);f.run();}
 assert.deepEqual(f.delays,[1000,2000,4000,8000,16000,30000,30000,30000]);assert.equal(f.clients.length,9);
 f.slot.close();assert.equal(f.clients.at(-1).dead,true);
});
test('stopping a room or changing generation prevents stale broker callbacks from reconnecting',()=>{
 const f=reconnectFixture();f.clients[0].fail();f.slot.close();assert.equal(f.timers.size,0);
 f.clients[0].onDown();f.clients[0].onMsg('room/h',{hello:true});assert.equal(f.timers.size,0);assert.equal(f.delivered,0);
 const g=reconnectFixture();g.clients[0].fail();g.stopGeneration();g.run();assert.equal(g.clients.length,1);g.clients[0].onMsg('room/h',{hello:true});assert.equal(g.delivered,0);
});
test('successful broker acknowledgment resets backoff, delayed timeout cannot revive a stopped room',async()=>{
 const f=reconnectFixture();f.clients[0].fail();f.run();f.clients[1].readyResult(true);await flush();
 f.clients[1].fail();assert.equal(f.delays.at(-1),1000);
 f.slot.close();f.clients[1].readyResult(false);await flush();assert.equal(f.timers.size,0);
});

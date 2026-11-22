const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const source=app.slice(app.indexOf('  function restoreCloudRecovery()'),app.indexOf('  function diagnostic('));
const secret='a'.repeat(22);
const saved=(role='player',value=null)=>({version:1,pid:'one',savedAt:Date.now()-100,code:'ABCD',secret:value,role,name:'Ana',noTv:true});
function restore(record,hash=''){
 const calls=[],data=new Map([['resume',JSON.stringify(record)]]);
 const c=vm.createContext({Date,PID:'one',cloudRecoveryDismissed:false,cloudSession:null,mode:hash?'join':'home',CLOUD_RECOVERY_KEY:'resume',
  location:{hash},localStorage:{getItem:key=>data.get(key),removeItem:key=>data.delete(key)},cloudEnabled:()=>true,
  okRS:value=>typeof value==='string'&&/^[A-Za-z0-9_-]{22}$/.test(value),
  clearCloudRecovery:()=>data.clear(),connectCloud:(value,noTv)=>calls.push({value:JSON.parse(JSON.stringify(value)),noTv})});
 vm.runInContext(source+';restoreCloudRecovery();',c);return{calls,data};
}
test('code-only cloud player restores after process recreation without a room secret',()=>{
 for(const hash of ['','#ABCD']){const f=restore(saved(),hash);assert.deepEqual(f.calls,[{value:{code:'ABCD',secret:null,role:'player',name:'Ana'},noTv:true}]);assert.equal(f.data.size,1);}
});
test('cloud hosts require a secret in recovery while full player and host records remain valid',()=>{
 for(const role of ['player','host']){assert.equal(restore(saved(role,secret)).calls.length,1);}
 const f=restore(saved('host'));assert.deepEqual(f.calls,[]);assert.equal(f.data.size,0);
 assert.equal(restore(saved('player',secret),'#ABCD-'+secret).calls.length,1);
});
test('corrupt explicit secrets, expired records and another identity are discarded',()=>{
 const cases=[saved('player','bad'),saved('player',''),{...saved(),pid:'other'},{...saved(),savedAt:Date.now()-21600001}];
 for(const record of cases){const f=restore(record);assert.deepEqual(f.calls,[]);assert.equal(f.data.size,0);}
});
test('new invitations take precedence over a saved code-only session',()=>{
 for(const hash of ['#WXYZ','#WXYZ-'+secret,'#ABCD-'+secret]){const f=restore(saved(),hash);assert.deepEqual(f.calls,[]);assert.equal(f.data.size,1);}
});

test('returning QR invitations canonicalize only room-code case',()=>{
 for(const hash of ['#abcd','#aBcD'])assert.equal(restore(saved(),hash).calls.length,1);
 const mixed='A'+'a'.repeat(21);
 assert.equal(restore(saved('player',mixed),'#abcd-'+mixed).calls.length,1);
 for(const hash of ['#abcd-'+mixed.toLowerCase(),'#abcd','#WXYZ-'+mixed]){
  const f=restore(saved('player',mixed),hash);assert.equal(f.calls.length,0,'The secret and explicit invitation must still match exactly');assert.equal(f.data.size,1);
 }
});

// Execute the actual app connection/error and lifecycle adapters with a
// transport seam. No game state or authentication is forged by the client.
function reconnectFixture(record=saved('player',secret)){
 const data=new Map([['resume',JSON.stringify(record)]]),sessions=[],events=new Map(),documentEvents=new Map();
 const c=vm.createContext({Date,PID:'one',SK:'f'.repeat(32),myAv:0,mode:'join',S:null,PV:null,L:{s:1},
  cloudRecoveryDismissed:false,cloudSession:null,cloudCredentials:null,cloudView:null,cloudAttempt:0,cloudTvSig:'',cloudResend:false,cloudRetry:null,
  pcode:'',pname:'',netNote:'',connectionWasLost:false,game:null,HOST_RS:null,PLAYER_RS:null,
  hostPeer:null,ppeer:null,pconn:null,CLOUD_RECOVERY_KEY:'resume',TAVERN_CLOUD:{apiOrigin:'https://cloud.test'},
  location:{hash:record.role==='host'?'':'#ABCD-'+secret},localStorage:{getItem:key=>data.get(key),removeItem:key=>data.delete(key)},
  cloudEnabled:()=>true,okRS:value=>typeof value==='string'&&/^[A-Za-z0-9_-]{22}$/.test(value),
  rememberRS:()=>{},render:()=>{},keepAwake:()=>{},clearInputBindings:()=>{},phoneShown:()=>false,checkConnection:()=>{},retrySoon:()=>{},directReady:()=>false,
  failJoin:()=>{c.mode='join';},toolNotice:()=>{},clearTimeout:()=>{},
  window:{addEventListener:(event,callback)=>events.set(event,callback)},
  document:{visibilityState:'visible',addEventListener:(event,callback)=>documentEvents.set(event,callback)},
  TAVERN_CLOUD_TRANSPORT:{create(options){const session={options,credentials:null,closed:false,connect(value){this.credentials=JSON.parse(JSON.stringify(value));},close(){this.closed=true;},check(){}};sessions.push(session);return session;}}
 });
 const clear=app.slice(app.indexOf('  function clearCloudRecovery('),app.indexOf('  function saveCloudRecovery()'));
 const close=app.slice(app.indexOf('  function closeCloud()'),app.indexOf('  function cloudProxy()'));
 const connect=app.slice(app.indexOf('  function connectCloud('),app.indexOf('  async function startCloudRoom('));
 const resume=app.slice(app.indexOf('  function resumeConnection()'),app.indexOf('  let recoveryTimer ='));
 const visibleStart=app.indexOf("  document.addEventListener('visibilitychange'",app.indexOf('  function hostKeepAlive('));
 const visible=app.slice(visibleStart,app.indexOf('  // ---------- igra bez TV',visibleStart));
 const online=app.match(/  window\.addEventListener\('online', [^\n]+\);/)[0];
 const pageshow=app.match(/  window\.addEventListener\('pageshow', [^\n]+\);/)[0];
 vm.runInContext(clear+close+connect+source+resume+visible+online+pageshow+';restoreCloudRecovery();',c);
 return{c,data,sessions,events,documentEvents};
}

test('an unavailable restore keeps its previously authenticated recovery record',()=>{
 const f=reconnectFixture(),before=f.data.get('resume');
 assert.equal(f.sessions.length,1);f.sessions[0].options.onError({reason:'unavailable'});
 assert.equal(f.sessions[0].closed,true);assert.equal(f.data.get('resume'),before);assert.equal(f.c.mode,'join');
});

test('online, pageshow and visible lifecycle recover the retained identity after unavailable',()=>{
 for(const event of ['online','pageshow','visibilitychange']){
  const f=reconnectFixture(),before=f.sessions[0].credentials;
  f.sessions[0].options.onError({reason:'unavailable'});
  if(event==='visibilitychange'){
   f.c.document.visibilityState='hidden';f.documentEvents.get(event)();assert.equal(f.sessions.length,1);
   f.c.document.visibilityState='visible';f.documentEvents.get(event)();
  }else f.events.get(event)();
  assert.equal(f.sessions.length,2,event+' must retry the saved session, not wait on a new join');
  assert.deepEqual(f.sessions[1].credentials,before,event+' preserves the complete authenticated identity');
  assert.equal(f.data.size,1);
 }
});

test('authoritative auth and expiry errors still discard recovery and cannot silently retry',()=>{
 for(const reason of ['auth','expired','not_found','invalid']){
  const f=reconnectFixture();f.sessions[0].options.onError({reason});
  assert.equal(f.data.size,0,reason);f.events.get('online')();assert.equal(f.sessions.length,1,reason);
 }
});

test('confirmed phone and TV owners resume the same session after an unavailable restore',()=>{
 for(const noTv of [true,false]){
  const f=reconnectFixture({...saved('host',secret),noTv}),before=f.sessions[0].credentials;
  f.sessions[0].options.onError({reason:'unavailable'});
  assert.equal(f.c.mode,noTv?'hostform':'host');
  f.events.get('online')();assert.equal(f.sessions.length,2);
  assert.deepEqual(f.sessions[1].credentials,before);
  f.sessions[1].options.onError({reason:'unavailable'});
  f.events.get('pageshow')();assert.equal(f.sessions.length,3,'Repeated timeouts preserve the same retry identity');
  assert.deepEqual(f.sessions[2].credentials,before);
 }
});

test('deliberate new-room action cancels a pending owner retry',()=>{
 const f=reconnectFixture(saved('host',secret));
 f.sessions[0].options.onError({reason:'unavailable'});
 f.c.closeCloud();f.c.mode='hostform';f.events.get('online')();
 assert.equal(f.sessions.length,1,'Do not interrupt an intentional new-room form');
 assert.equal(f.data.size,1);
});

test('an owner error screen cannot resume a different saved room',()=>{
 const f=reconnectFixture(saved('host',secret));
 f.sessions[0].options.onError({reason:'unavailable'});
 const other={...saved('host','b'.repeat(22)),code:'WXYZ'};
 f.data.set('resume',JSON.stringify(other));f.events.get('online')();
 assert.equal(f.sessions.length,1);assert.equal(f.data.get('resume'),JSON.stringify(other));
});

const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8');
const start=source.indexOf('  const NATIVE_RECOVERY_KEY =');
const end=source.indexOf('  let recoveryTimer =',start);
function fixture(record,overrides={}) {
 const data=new Map(record?[['mz_native_resume_v1',typeof record==='string'?record:JSON.stringify(record)]]:[]),calls=[];
 const c=vm.createContext({PID:'pid',localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)},mode:'home',location:{hash:''},game:null,S:null,pcode:'ABCD',pname:'Ana',PLAYER_RS:'a'.repeat(22),
  okRS:x=>typeof x==='string'&&/^[A-Za-z0-9_-]{22}$/.test(x),okKey:x=>/^[a-f0-9]{32}$/.test(x),hasPeer:()=>true,
  rememberRS:(...a)=>calls.push(['secret',...a]),joinGame:(...a)=>calls.push(['join',...a]),openHostPeer:(...a)=>calls.push(['host',...a]),render:()=>{},keepAwake:()=>{},saveRecovery:()=>{},flushRecovery:()=>{},checkConnection:()=>calls.push(['check']),directReady:()=>false,retrySoon:()=>calls.push(['retry']),...overrides});
 vm.runInContext(source.slice(start,end)+';this.ready=nativeRecoveryReady;this.pause=nativeRecoveryPause;this.clear=clearNativeRecovery;this.resume=resumeConnection;this.save=saveGuestRecovery;',c);
 return {c,data,calls};
}
const guest=()=>({version:1,pid:'pid',kind:'guest',saved:{savedAt:Date.now()-1000,code:'ABCD',name:'Ana',rs:'a'.repeat(22)}});
test('native handshake restores same guest and room secret once',()=>{const f=fixture(guest());f.c.ready();f.c.ready();assert.deepEqual(f.calls,[['secret','ABCD','a'.repeat(22)],['join','ABCD','Ana']]);});
test('new invitation and active screen take precedence',()=>{for(const overrides of [{location:{hash:'#WXYZ-'+ 'b'.repeat(22)}},{mode:'join'},{mode:'hostform'}]){const f=fixture(guest(),overrides);f.c.ready();assert.deepEqual(f.calls,[]);}});
test('corrupt, expired, oversized, foreign identity and malformed records are discarded',()=>{const cases=['bad','x'.repeat(2097153)];for(const change of [r=>r.pid='other',r=>r.saved.savedAt=Date.now()-21600001,r=>r.saved.savedAt=Date.now()+60000,r=>r.saved.rs='bad',r=>r.saved.name='a'.repeat(13),r=>r.saved.code='<bad>']){const r=guest();change(r);cases.push(r);}for(const record of cases){const f=fixture(record);f.c.ready();assert.equal(f.calls.length,0);assert.equal(f.data.size,0);}});
test('browser never persists native recovery before handshake',()=>{const f=fixture(null,{mode:'player',S:{ph:'question'}});f.c.pause();assert.equal(f.data.size,0);});
test('native guest checkpoint clears on final and explicit leave',()=>{const f=fixture(null,{mode:'player',S:{ph:'question'}});f.c.ready();assert.equal(f.data.size,1);f.c.S={ph:'final'};f.c.pause();assert.equal(f.data.size,0);f.c.S={ph:'question'};f.c.pause();assert.equal(f.data.size,1);f.c.clear();assert.equal(f.data.size,0);});
test('valid host snapshot resumes room instead of creating a new one',()=>{const r=guest();r.kind='host';r.saved={...r.saved,noTv:true,keys:[['pid','a'.repeat(32)]],journal:{version:1,events:[]}};const f=fixture(r);f.c.ready();assert.equal(f.c.mode,'hostp');assert.equal(f.calls[0][0],'host');assert.equal(f.calls[0][2].recovery.code,'ABCD');});
test('resume retries closed guest connection immediately',()=>{const f=fixture(null,{mode:'player',S:{ph:'question'}});f.c.resume();assert.deepEqual(f.calls,[['check'],['retry']]);});

test('same previously admitted guest invitation resumes after Activity recreation',()=>{const r=guest();const f=fixture(r,{mode:'join',location:{hash:'#ABCD-'+r.saved.rs}});f.c.ready();assert.equal(f.calls[1][0],'join');});

test('native capability handshake tolerates a host without local checkpoint support',()=>{const f=fixture(null,{mode:'hostp',game:{view:()=>({ph:'lobby'})}});assert.doesNotThrow(()=>f.c.ready());assert.equal(f.data.size,0);});

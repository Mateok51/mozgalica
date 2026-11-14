const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const app=fs.readFileSync(path.join(__dirname,'../app.js'),'utf8');
const source=app.slice(app.indexOf('  function restoreCloudRecovery()'),app.indexOf('  function diagnostic('));
const secret='a'.repeat(22);
const saved=(role='player',value=null)=>({version:1,pid:'one',savedAt:Date.now()-100,code:'ABCD',secret:value,role,name:'Ana',noTv:true});
function restore(record,hash=''){
 const calls=[],data=new Map([['resume',JSON.stringify(record)]]);
 const c=vm.createContext({Date,PID:'one',cloudSession:null,mode:hash?'join':'home',CLOUD_RECOVERY_KEY:'resume',
  location:{hash},localStorage:{getItem:key=>data.get(key)},cloudEnabled:()=>true,
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

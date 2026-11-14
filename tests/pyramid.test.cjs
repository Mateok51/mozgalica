const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const source=require('./engine-source.cjs');
const context=vm.createContext({setTimeout,clearTimeout,crypto:require('node:crypto').webcrypto});
vm.runInContext(source+';this.make=createGame;',context);

test('six distinct scores have distinct starts, ties share a step, and larger score gaps retain more distance',()=>{
 const g=context.make({code:'TEST'});
 try {
  const starts=sc=>Array.from(g._pyrUnits(sc));
  assert.deepEqual(starts([10000,9900,9800,9700,9600,9500]),[6,5,4,3,2,1]);
  assert.deepEqual(starts([10000,10000,9000,9000,0,0]),[6,6,5,5,0,0]);
  assert.deepEqual(starts([0,0,0]),[0,0,0]);
  assert.deepEqual(starts([10000,9000]),[6,5]);
  assert.deepEqual(starts([10000,1000]),[6,1]);
  // Every supported party size: no hidden dependence on join order or score scale.
  for(let n=1;n<=6;n++)for(let seed=1;seed<=40;seed++){
   const sc=Array.from({length:n},(_,i)=>i*(seed+1)+seed),out=starts(sc);
   assert.equal(new Set(out).size,n);
   assert(out.every(x=>Number.isInteger(x)&&x>=0&&x<=6));
   assert.deepEqual(starts(sc.map(x=>x*10)),out);
   assert.deepEqual(starts(sc.slice().reverse()),out.slice().reverse());
   for(let i=1;i<n;i++)assert(out[i]>out[i-1]);
  }
  assert(starts(Array.from({length:12},(_,i)=>i)).every(x=>Number.isInteger(x)&&x>=0&&x<=6));
 } finally {g.stop();}
});

function session(scores=[0,0,0,0],options={}){
 let clock=1000000,seq=0;const jobs=new Map(),ids=scores.map((_,i)=>'p'+i);
 const g=context.make({code:'TEST',plan:[{t:'intro',title:'Test',sub:''},{t:'finale'}],cfg:{cast:0},
  now:()=>clock,schedule(fn,ms){const id=++seq;jobs.set(id,{fn,at:clock+ms});return id;},cancel:id=>jobs.delete(id),...options});
 ids.forEach((id,i)=>g.addPlayer(id,id,i,false));g.start();
 scores.forEach((sc,i)=>g._score(ids[i],sc));g.skip();
 const input=(id,value)=>g.setInput(id,{s:g._G.s,...value});
 const advance=ms=>{const until=clock+ms;for(;;){const next=[...jobs].filter(([,j])=>j.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;jobs.delete(next[0]);clock=next[1].at;next[1].fn();}clock=until;};
 const ready=()=>{ids.forEach(id=>input(id,{ok:1}));};
 const question=()=>{ids.forEach(id=>input(id,{p:''}));advance(0);assert.equal(g.view().ph,'fq');};
 return{g,ids,input,advance,ready,question,timeout(){advance(Math.max(0,g._G.endsAt-clock)+400);}};
}

test('initial positions use the expanded twelve-step board and display every distinct score separately',()=>{
 const s=session([10000,9900,9800,9700,9600,9500]);
 try {
  const v=s.g.view();assert.equal(v.ph,'fstart');assert.equal(v.pyrRules,2);
  assert.equal(v.ftop,12);assert.equal(v.steps,13);assert.equal(v.req.length,12);assert(v.req.every(x=>x===1));
  assert.deepEqual(Array.from(v.P,p=>p.st),[6,5,4,3,2,1]);
  assert.deepEqual(Array.from(v.P,p=>p.fsc),[10000,9900,9800,9700,9600,9500]);
 }finally{s.g.stop();}
});

test('a correct answer always climbs one step, dupli climbs two, and wrong or missing answers stay put',()=>{
 const s=session();
 try {
  s.ready();s.question();const answer=s.g._G.q.a;
  s.g._p('p0').fstr=2;s.g._p('p1').dbl=true;
  s.advance(100);s.input('p0',{c:answer,t:100});
  s.advance(600);s.input('p1',{c:answer,t:700});
  s.input('p2',{c:1-answer,t:700});
  s.timeout();
  const v=s.g.view();assert.equal(v.ph,'fr');
  assert.deepEqual(Array.from(v.P,p=>p.st),[1,2,0,0]);
  assert.deepEqual(Array.from(v.P,p=>p.ug),[1,2,0,0]);
  assert.equal(v.P[0].fb,undefined);assert.equal(v.P[0].sk,undefined);
  assert.equal(v.P[1].fb,'d');assert.equal(v.P[3].ch,-1);
 }finally{s.g.stop();}
});

test('climbing caps at step twelve, reports actual movement and still requires a separate crown answer',()=>{
 const s=session([0,0]);
 try {
  s.ready();s.question();
  const p=s.g._p('p0');Object.assign(p,{fu:11,fstep:11,dbl:true});
  const answer=s.g._G.q.a;s.input('p0',{c:answer,t:0});s.input('p1',{c:1-answer,t:0});
  let v=s.g.view();assert.equal(v.ph,'fr');assert.equal(v.P[0].st,12);assert.equal(v.P[0].ug,1);assert.equal(v.P[0].fb,'d');assert.equal(v.P[0].top,1);assert.equal(v.win,undefined);
  s.g.skip();s.question();assert.equal(s.g.view().crown,1);
  s.input('p0',{c:s.g._G.q.a,t:0});s.input('p1',{c:s.g._G.q.a,t:0});
  assert.equal(s.g.view().P[0].st,13);s.g.skip();v=s.g.view();assert.equal(v.ph,'final');assert.equal(v.win,'p0');
 }finally{s.g.stop();}
});

test('new journals pin new rules while unversioned legacy journals replay the original pyramid exactly',()=>{
 let clock=1000000,seq=0;const jobs=new Map();
 const c=vm.createContext({crypto:require('node:crypto').webcrypto,Date:class extends Date{static now(){return clock;}},
  setTimeout(fn,ms){const id=++seq;jobs.set(id,{fn,at:clock+ms});return id;},clearTimeout:id=>jobs.delete(id)});
 vm.runInContext(source+';this.recover=createRecoverableGame;',c);
 const advance=ms=>{const until=clock+ms;for(;;){const next=[...jobs].filter(([,j])=>j.at<=until).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;jobs.delete(next[0]);clock=next[1].at;next[1].fn();}clock=until;};
 const options={code:'TEST',plan:[{t:'finale'}],cfg:{cast:0}};
 const fresh=c.recover(options),legacy=c.recover({...options,pyramidRules:1});let restored;
 try {
  assert.equal(fresh.checkpoint().pyramidRules,2);
  legacy.addPlayer('one','Ana',0,false);legacy.addPlayer('two','Ivo',1,false);legacy.start();
  for(const id of ['one','two'])legacy.setInput(id,{s:legacy._G.s,ok:1});
  for(const id of ['one','two'])legacy.setInput(id,{s:legacy._G.s,p:''});advance(0);
  legacy.setInput('one',{s:legacy._G.s,c:legacy._G.q.a,t:0});advance(500);legacy.setInput('two',{s:legacy._G.s,c:legacy._G.q.a,t:500});
  assert.equal(legacy.view().P[0].ug,2,'Legacy speed bonus stays in legacy sessions');
  const saved=JSON.parse(JSON.stringify(legacy.checkpoint()));delete saved.pyramidRules;
  restored=c.recover(options,saved);
  assert.equal(JSON.stringify(restored.view()),JSON.stringify(legacy.view()));
  assert.equal(restored.view().pyrRules,1);assert.equal(restored.view().steps,8);
  assert.equal(restored.checkpoint().pyramidRules,1);
  assert.throws(()=>c.recover(options,{...saved,pyramidRules:3}));
 }finally{fresh.stop();legacy.stop();if(restored)restored.stop();}
});

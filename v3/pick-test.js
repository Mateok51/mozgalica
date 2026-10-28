// Kratka provjera power picka (motor): bira kategoriju, prvi pobjeđuje, ostali zadržavaju pick, jedan po partiji. Pokretanje: node v3/pick-test.js
const fs=require('fs');const src=fs.readFileSync(__dirname+'/engine.js','utf8').replace('__DATA__',fs.readFileSync(__dirname+'/data.json','utf8'));
const E=new Function(src+';return {createGame,CFG};')();
const P0={n:{w:1,s:1,t:0.05},t:{w:1,s:1,t:0.05},d:{w:1,s:1,t:0.05}};
const FAST={intro:0.03,vote:0.6,voteShow:0.05,roul:0.03,power:0.2,bet:0.2,cast:0.02,q:0.4,pace:P0,paceMo:0.01,moment:0.03,howto:0.03,howtoMax:0.2,howtoShort:0.03,sort:0.3,link:0.3,order:0.3,hilo:0.3,blitz:0.3,maj:0.2};
let fails=0;const ok=(c,m)=>{console.log((c?'  ✔ ':'  ✘ ')+m);if(!c)fails++};
const holds=[],quick=[];let vStart=0,vS=-1,vrS=0;const r={votes:0,picked:0,mismatch:0,keptOk:true,pkPublic:0,twice:0,leakCat:0};
const used={h0:0,h1:0};let lastS=-1;
const g=E.createGame({code:'PK',cfg:FAST,pacts:false,bs:false,onChange:()=>{
 const G=g._G,v=g.view();
 if(G.ph==='vote'&&G.s!==vS){vS=G.s;vStart=Date.now();}
 if(vrS&&G.ph!=='voteResult'){holds.push(Date.now()-vrS);vrS=0;}
 if(G.ph==='voteResult'&&G.ppw&&!vrS){vrS=Date.now();quick.push(vrS-vStart);}
 if(G.ph==='voteResult'&&G.s!==lastS){lastS=G.s;r.votes++;
  const pk=v.P.filter(p=>p.pk);
  if(G.ppw){r.picked++; if(pk.length!==1)r.mismatch++; if(G.cw!==G.ppv.c)r.mismatch++; r.pkPublic+=pk.length;}
  else if(pk.length)r.mismatch++;}
 if(G.ph==='reveal')for(const id of['h0','h1'])g.setInput(id,{s:G.s,ok:1});
 if(G.ph==='final'||r.votes>=6)fin();}});
let fin=()=>{clearInterval(t);g.stop();
 ok(r.votes>=2,'odigrano glasanja: '+r.votes);
 ok(r.picked>=1&&r.mismatch===0,'power pick bira kategoriju i javno je označen (iskorišteno '+r.picked+', neslaganja '+r.mismatch+')');
 ok(quick.length>0&&Math.max(...quick)<450,'kategorija se odabire odmah nakon picka (najdulje '+Math.max(...quick)+' ms)');
 ok(holds.length>0&&Math.min(...holds)>=2300,'rezultat ostaje vidljiv dovoljno dugo (najkraće '+Math.min(...holds)+' ms)');
 ok(used.h0<=1&&used.h1<=1,'najviše jedan iskorišten po igraču ('+JSON.stringify(used)+')');
 console.log(fails?'NEUSPJEH':'SVE OK');process.exit(fails?1:0)};
g.addPlayer('h0','A',0,false);g.addPlayer('h1','B',1,false);g.syncPeers([{pid:'h0',name:'A',av:0},{pid:'h1',name:'B',av:1}]);g.start();
let t=setInterval(()=>{const G=g._G;
 if(G.ph==='vote'){
  // oba pokušavaju pick; h1 nešto kasnije (prvi pobjeđuje)
  for(const id of['h0','h1']){const p=g._p(id);const before=p.pp;const c=id==='h0'?1:2;const ok1=g.setInput(id,{s:G.s,v:c,pp:1});
   if(before!==0&&p.pp===0)used[id]++;}
 }
 if(G.ph==='question')for(const id of['h0','h1'])g.setInput(id,{s:G.s,c:G.q.a,t:500});
 if(G.ph==='power')for(const id of['h0','h1'])g.setInput(id,{s:G.s,p:''});},50);
setTimeout(()=>fin(),30000);

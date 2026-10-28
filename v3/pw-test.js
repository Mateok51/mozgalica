// Kratka provjera: nema faze moći prije prvog pitanja; Oklada se ne nudi u dvije uzastopne ponude. Pokretanje: node v3/pw-test.js
const fs=require('fs');const src=fs.readFileSync(__dirname+'/engine.js','utf8').replace('__DATA__',fs.readFileSync(__dirname+'/data.json','utf8'));
const E=new Function(src+';return {createGame,CFG};')();
const P0={n:{w:1,s:1,t:0.05},t:{w:1,s:1,t:0.05},d:{w:1,s:1,t:0.05}};
const FAST={intro:0.03,vote:0.2,voteShow:0.03,roul:0.03,power:0.25,bet:0.2,cast:0.02,q:0.5,pace:P0,paceMo:0.01,moment:0.03,howto:0.03,howtoMax:0.2,howtoShort:0.03,sort:0.3,link:0.3,order:0.3,hilo:0.3,blitz:0.3,maj:0.2};
const res={firstPower:0,powerRounds:0,okladaTwice:0,qs:0};
(async()=>{for(let i=0;i<6;i++){await new Promise((done)=>{
 let t,fin=false,seenQ=false;const last={};let lastS=-1;
 const g=E.createGame({code:'P'+i,cfg:Object.assign({},FAST),pacts:false,bs:false,onChange:()=>{const G=g._G;
  if(G.ph==='power'&&G.s!==lastS){ lastS=G.s; if(!seenQ) res.firstPower++; res.powerRounds++; for(const id of ['h0','h1']){const o=(g._p(id).offers)||[];if(o.includes('oklada')&&last[id]&&last[id].includes('oklada'))res.okladaTwice++;last[id]=o.slice();} }
  if(G.ph==='question'){seenQ=true;}
  if(G.ph==='reveal'){for(const id of ['h0','h1'])g.setInput(id,{s:G.s,ok:1});}
  if(G.ph==='reveal') res.qs++;
  if(G.ph==='final'||res.qs>=(i+1)*7)finish();}});
 const finish=()=>{if(fin)return;fin=true;clearInterval(t);g.stop();done()};
 g.addPlayer('h0','A',0,false);g.addPlayer('h1','B',1,false);g.setBots(1);g.syncPeers([{pid:'h0',name:'A',av:0},{pid:'h1',name:'B',av:1}]);g.start();
 t=setInterval(()=>{const G=g._G;for(const id of ['h0','h1']){
  if(G.ph==='power'){const o=g._p(id).offers||[];const k=o[0];if(k)g.setInput(id,{s:G.s,p:k,t:POWERS_TG(k)?(id==='h0'?'h1':'h0'):undefined});}
  if(G.ph==='question')g.setInput(id,{s:G.s,c:Math.random()<0.6?G.q.a:(G.q.a+1)%4,t:500});}},40);
 setTimeout(finish,20000);});}
console.log(res, res.firstPower===0&&res.okladaTwice===0&&res.powerRounds>0?'OK':'PROVJERI');process.exit(0)})();
function POWERS_TG(k){return ['led','sluz','grick','bomba','oklada'].includes(k)}

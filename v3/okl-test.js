const fs=require('fs');const src=fs.readFileSync(''+__dirname+'/engine.js','utf8').replace('__DATA__',fs.readFileSync(''+__dirname+'/data.json','utf8'));
const E=new Function(src+';return {createGame,CFG};')();
const P0={n:{w:1,s:1,t:0.05},t:{w:1,s:1,t:0.05},d:{w:1,s:1,t:0.05}};
const FAST={intro:0.03,vote:0.25,voteShow:0.03,roul:0.03,power:0.3,bet:0.2,cast:0.02,q:0.6,pace:P0,paceMo:0.01,moment:0.03,howto:0.03,howtoMax:0.2,howtoShort:0.03,sort:0.3,link:0.3,order:0.3,hilo:0.3,blitz:0.3,maj:0.2,majReveal:0.03,chReveal:0.03,fstart:0.05,fpower:0.2,fq:0.3,fr:0.03,duelIntro:0.05,duel:0.4,duelRes:0.05,secret:0.2,secret2:0.2,betrayShow:0.05,loyalShow:0.05,kr:Object.assign({},E.CFG.kr,{wait:0.3,pactChance:0,offChance:0,chFrom:99})};
const out={win:0,me:0,x:0,leak:0,priv:0};
(async()=>{for(let i=0;i<6;i++){await new Promise(res=>{
 let t,done=false;const g=E.createGame({code:'O'+i,cfg:FAST,pacts:false,bs:false,onChange:()=>{
  const v=g.view(); if(v.ph==='reveal'){const G=g._G;for(const p of v.P){if(p.okr||'okl' in p)out.leak++; if(p.oq===1&&!p.ob)out.leak++;}
   for(const id of ['h0','h1']){const pv=g.priv(id)||{};if(pv.okr){out.priv++;const w=pv.okr.why;out[w===''?'win':w]++;}}
   for(const id of ['h0','h1']) g.setInput(id,{s:G.s,ok:1});}
  if(v.ph==='final'||out.priv>=(i+1)*2)finish();}});
 const finish=()=>{if(done)return;done=true;clearInterval(t);g.stop();res()};
 g.addPlayer('h0','A',0,false);g.addPlayer('h1','B',1,false);g.setBots(1);g.syncPeers([{pid:'h0',name:'A',av:0},{pid:'h1',name:'B',av:1}]);g.start();
 t=setInterval(()=>{const G=g._G;for(const id of ['h0','h1']){const p=g._p(id);
  if(G.ph==='power'){g.setInput(id,{s:G.s,p:'oklada',t:id==='h0'?'h1':'h0'});}
  if(G.ph==='question')g.setInput(id,{s:G.s,c:Math.random()<0.6?G.q.a:(G.q.a+1)%4,t:500});}},40);
 setTimeout(finish,25000);});}
console.log(out);process.exit(0)})();

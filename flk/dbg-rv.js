const fs=require('fs');const src=fs.readFileSync('v3/engine.js','utf8').replace('__DATA__',fs.readFileSync('v3/data.json','utf8'));
const E=new Function(src+'; return { createGame };')();
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
(async()=>{const P0={n:{w:1,s:1,t:0.02},t:{w:1,s:1,t:0.02},d:{w:1,s:1,t:0.02}};
const g=E.createGame({code:'X',cfg:{intro:0.02,vote:2,voteShow:0.02,roul:0.02,power:2,cast:0.02,q:3,pace:P0,paceMo:0.01,moment:0.02,betEvents:[0,0],qv:{who:0,emoji:0}},flags:{ENABLE_DUELS:false,ENABLE_SECRET_EVENTS:false},plan:[{t:'intro',title:'R',sub:''}].concat(Array.from({length:6},()=>({t:'battle'}))),pacts:false});
['A','B','C','D'].forEach((n,i)=>g.addPlayer('p'+i,n,i,false));g.start();g._G.qvAt=new Map();g._G.betAt=new Set();g._score('p0',1000);g._score('p1',950);
const G=g._G;let last=-1;while(G.ph!=='final'&&G.qn<7){if(G.s!==last){last=G.s;const s=G.s;if(G.ph==='vote')for(const p of g.view().P)g.setInput(p.id,{s,v:0});if(G.ph==='power')for(const p of g.view().P)g.setInput(p.id,{s,p:''});if(G.ph==='question'){const q=G.qn;const a={p0:q%2===1,p1:q%2===0,p2:false,p3:false};for(const[id,r]of Object.entries(a))g.setInput(id,{s,c:r?G.q.a:(G.q.a+1)%4,t:60});}if(G.ph==='reveal'){console.log(G.qn,g.view().P.map(p=>p.sc).join(','),JSON.stringify(g._td().pairs['p0|p1']),JSON.stringify(g._td().prevRank));}}await sleep(2);}g.stop();})();

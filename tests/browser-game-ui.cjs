const {chromium}=require('playwright');const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
const root=path.join(__dirname,'..');
let html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const box=vm.createContext({setTimeout,clearTimeout});vm.runInContext(fs.readFileSync(path.join(root,'engine.js'),'utf8')+'\nthis.game=createGame({code:"TEST"});',box);
box.game.addPlayer('one','Igrac',0,false);box.game.addPlayer('two','Suigrac',1,false);box.game._p('one').offers=['led','stit','dupli'];Object.assign(box.game._G,{s:5,q:{c:'Kategorija',t:'Koji je od ponuđenih odgovora točan u ovom pitanju s duljim tekstom?',o:['Kratak odgovor','Nešto dulji ponuđeni odgovor koji se mora moći pročitati u cijelosti','Još jedan mogući odgovor','Posljednji odgovor'],a:1},dur:20000,endsAt:Date.now()+20000,ev:[]});
Object.assign(box.game._G,{so:{a:'Voće',b:'Povrće',items:['Jabuka','Mrkva','Kruška','Kupus','Banana','Brokula'],key:[0,1,0,1,0,1]},li:{t:'Spoji pojmove i njihova značenja',L:['Prvi pojam','Drugi dulji pojam','Treći pojam','Četvrti pojam'],R:['Prvo značenje','Drugo značenje','Treće dulje značenje','Četvrto značenje'],key:[0,1,2,3]}});
Object.assign(box.game._G,{or:{t:'Poredaj pojmove',lo:'Prvi',hi:'Posljednji',items:['Prvi pojam','Drugi pojam','Treći pojam','Četvrti pojam'],key:[0,1,2,3]},hl:{list:[{q:'Koji broj je veći?',a:['Deset','Pet'],w:0}]},bz:{list:[['Dva i dva su četiri.',1],['Tri je veće od pet.',0]]}});
for(let i=3;i<=6;i++)box.game.addPlayer('p'+i,'DuljeIme123'+i,i,false);
Object.assign(box.game._G,{cats:['Geografija','Film i televizija','Znanost i tehnologija'],cw:0,win:'one',fact:'Čestitamo pobjedniku!'});
box.game._p('one').ch=1;box.game._p('two').ch=3;
html=html.replace('  setInterval(tick, 100);','  setInterval(tick, 100); window.testUI=(d,tv)=>{if(tv){mode="host";tvV(d);}else{mode="player";applyState(d);}};');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(x=>x.trim());const hashes=html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g);hashes.forEach((h,i)=>html=html.replace(h,'sha256-'+crypto.createHash('sha256').update(scripts[i]).digest('base64')));
(async()=>{const b=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{for(const [w,h,tv] of [[320,568,false],[390,844,false],[1280,720,true]]){const p=await b.newPage({viewport:{width:w,height:h}});p.on('pageerror',e=>{throw e;});await p.addInitScript(()=>localStorage.setItem('mz_pid','one'));await p.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='game.test')return r.abort();const f=path.join(root,u.pathname.slice(1));return u.pathname==='/'?r.fulfill({body:html,contentType:'text/html'}):fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f)}):r.abort();});await p.goto('http://game.test/');let questionZoom;for(const ph of ['power','question','reveal','sort','link','lobby','order','hilo','blitz','vote','voteResult','target','fq','final']){box.game._G.ph=ph==='target'?'power':ph;box.game._G.inFinale=ph==='fq'||ph==='final';if(ph==='fq'){box.game._G.q.crown=true;}else box.game._G.q.crown=false;box.game._G.s++;const d=JSON.parse(JSON.stringify(box.game.view()));await p.evaluate(([d,tv])=>testUI(d,tv),[d,tv]);await p.waitForTimeout(ph==='final'?1800:300);if(!tv&&ph==='target'){await p.locator('[data-p="led"]').click();await p.waitForTimeout(200);if(await p.locator('[data-t]').count()!==5)throw Error('Missing targets');const tooSmall=await p.locator('[data-t]').evaluateAll(es=>es.some(e=>e.getBoundingClientRect().height<44||e.getBoundingClientRect().width<44));if(tooSmall)throw Error('Target touch surface too small');}
const result=await p.evaluate(()=>{const rect=e=>e.getBoundingClientRect();const controls=[document.querySelector('#mute'),document.querySelector('#music')].map(rect);return {offscreen:[...document.querySelectorAll('#app button, #app [role=button]')].filter(e=>{const r=rect(e);return r.width>0&&(r.bottom>innerHeight+1||r.top< -1)}).map(e=>e.id||e.className),overflow:document.documentElement.scrollWidth>innerWidth,overlap:[...document.querySelectorAll('#app button, #app [role=button]')].filter(e=>controls.some(c=>{const r=rect(e);return r.width>0&&r.left<c.right&&r.right>c.left&&r.top<c.bottom&&r.bottom>c.top})).map(e=>e.id||e.className)};});if(result.overflow||result.overlap.length||result.offscreen.length)throw Error(JSON.stringify({w,ph,...result}));if(!tv && ph==='link') {
 await p.locator('[data-ll="0"]').click();await p.locator('[data-lr="0"]').click();
 await p.waitForTimeout(150);
 const aligned=await p.evaluate(()=>{const l=document.querySelector('[data-ll="0"]'),circle=document.querySelector('.lnk-board svg circle');if(!circle||!l.classList.contains('paired'))return false;const a=l.getBoundingClientRect(),c=circle.getBoundingClientRect();return Math.abs((c.left+c.right)/2-a.right)<3;});
 if(!aligned)throw Error('Link line not aligned after scaling');
 }
 if(!tv && ph==='sort') {
 await p.locator('[data-go="0"]').click();await p.waitForTimeout(300);
 await p.locator('#swpUndo:not([disabled])').waitFor();await p.locator('#swpUndo').click();
 if(!(await p.locator('.swp-card[data-si="0"]').count()))throw Error('Undo did not restore card');
 await p.waitForTimeout(500);
 const card=await p.locator('.swp-card[data-si="0"]').boundingBox(),stage=await p.locator('.swp-stage').boundingBox();
 await p.mouse.move(card.x+card.width/2,card.y+card.height/2);await p.mouse.down();
 await p.mouse.move(card.x+card.width/2+stage.width*0.4,card.y+card.height/2,{steps:10});await p.mouse.up();
 await p.waitForTimeout(350);
 if(!(await p.locator('.swp-card[data-si="1"]').count()))throw Error('Scaled drag did not sort the card');

 }
 if(!tv && ph==='lobby'){if(await p.locator('.lob-players .lob-row').count()!==6)throw Error('Missing lobby players');const outside=await p.locator('.lob-players').evaluate(e=>e.getBoundingClientRect().bottom>innerHeight);if(outside)throw Error('Player list is clipped');}
 if(!tv && ph==='question')questionZoom=await p.locator('#app').evaluate(e=>e.style.zoom);
 if(!tv && ph==='reveal') {
  const first=await p.locator('#app').evaluate(e=>e.style.zoom);
  if(first!==questionZoom)throw Error('Reveal changed screen scale');
  await p.waitForTimeout(6000);await p.evaluate(()=>dispatchEvent(new Event('resize')));await p.waitForTimeout(200);
  if(await p.locator('#app').evaluate(e=>e.style.zoom)!==questionZoom)throw Error('Score phase changed screen scale');
 }
 console.log(w,ph,'layout OK');await p.screenshot({path:'/tmp/ui-'+w+'-'+ph+'.png'});}await p.close();}}finally{await b.close();box.game.stop();}})();

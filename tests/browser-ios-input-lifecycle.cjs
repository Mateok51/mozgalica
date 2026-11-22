// Real application callbacks, controlled stale delivery; this is not physical iPhone input.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const pw=require('playwright'),engine=process.env.BROWSER||'chromium',root=path.join(__dirname,'..');
let html=require('./page-source.cjs');
if(process.env.IOS_INPUT_APP_SOURCE)html=html.replace(fs.readFileSync(path.join(root,'app.js'),'utf8'),()=>fs.readFileSync(process.env.IOS_INPUT_APP_SOURCE,'utf8'));
const marker='  setInterval(tick, 100);';assert(html.includes(marker));
html=html.replace(marker,marker+`window.inputUI={apply(d){mode='player';applyState(d);},render(){phoneRender(true);},local(){return JSON.parse(JSON.stringify({s:L.s,sent:L.sent,partial:L.partial,ord:L.ord,hl:L.hl,bz:L.bz,rp:L.rp,ul:L.ulSel,pw:L.pw}));}};`);
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
(html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g)||[]).forEach((hash,i)=>html=html.replace(hash,'sha256-'+crypto.createHash('sha256').update(scripts[i]).digest('base64')));
const box=vm.createContext({setTimeout,clearTimeout});vm.runInContext(require('./engine-source.cjs')+';this.game=createGame({code:"TEST",noTv:true});',box);
box.game.addPlayer('one','Ana',0,false);box.game.addPlayer('two','Iva',1,false);box.game._p('one').offers=['led','stit','dupli'];
let step=900;
function state(ph){
 Object.assign(box.game._G,{ph,s:++step,dur:120000,endsAt:Date.now()+120000,
  q:{c:'Brojevi',t:'Koji je broj veći?',o:['Deset','Pet','Dva','Jedan'],a:0},ev:[],
  or:{t:'Poredaj brojeve',lo:'Najmanji',hi:'Najveći',items:['Jedan','Dva','Tri','Četiri'],key:[0,1,2,3]},
  hl:{list:[{q:'Prvo pitanje',a:['Točno','Netočno'],w:0},{q:'Drugo pitanje',a:['Točno','Netočno'],w:0},{q:'Treće pitanje',a:['Točno','Netočno'],w:0}]},
  bz:{list:[['Prva tvrdnja',1],['Druga tvrdnja',0],['Treća tvrdnja',1]]},
  rp:{list:[['Prvi konop',1],['Drugi konop',0],['Treći konop',1]],pa:0,pb:0,m:7},
  du:{a:'one',b:'two',bonus:200,sa:100,sb:100},
  ul:{th:'Brojevi',terms:[{w:'Jedan',ok:1},{w:'Dva',ok:1},{w:'Crveno',ok:0},{w:'Zeleno',ok:0}],imp:'two',cnt:{},caught:false}});
 const d=JSON.parse(JSON.stringify(box.game.view()));d.ms=d.dur=120000;d.P.forEach(p=>{p.ok=false;p.c=true;});return d;
}
(async()=>{
 const browser=await pw[engine].launch(engine==='chromium'?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}:{}),failures=[];
 try{
  for(const [width,height] of [[375,553],[390,664]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('mz_pid','one'));
   await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='game.test')return route.abort();const file=path.join(root,u.pathname.slice(1));return u.pathname==='/'?route.fulfill({body:html,contentType:'text/html'}):fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({body:fs.readFileSync(file)}):route.abort();});
   await page.goto('http://game.test/');await page.evaluate(()=>document.fonts.ready);
   const show=async ph=>{await page.evaluate(d=>inputUI.apply(d),state(ph));await page.waitForTimeout(40);};
   const check=async(name,run)=>{try{await run();console.log('PASS',engine,width,name);}catch(e){failures.push(engine+' '+width+' '+name+': '+e.message);console.log('FAIL',engine,width,name,e.message);}};
   for(const [ph,selector,field]of [['hilo','[data-hl="0"]','hl'],['blitz','[data-bz="1"]','bz'],['rope','[data-rpv="1"]','rp']]){
    await check(ph+' stale callback cannot consume the next subquestion',async()=>{
     await show(ph);const r=await page.evaluate(selector=>{const b=document.querySelector(selector),click=b.onclick;click(new MouseEvent('click',{detail:1}));const before=inputUI.local();click(new MouseEvent('click',{detail:1}));return{detached:!b.isConnected,before,after:inputUI.local()};},selector);
     assert.equal(r.detached,true);assert.equal(r.before[field].i,1);assert.deepEqual(r.after,r.before,'A repeated callback belonging to the previous statement must not answer the next one');
    });
    await check(ph+' new controls accept two rapid intentional answers',async()=>{
     await show(ph);await page.locator(selector).tap();const second=ph==='hilo'?'[data-hl="0"]':ph==='blitz'?'[data-bz="0"]':'[data-rpv="0"]';await page.locator(second).tap();
     const r=await page.evaluate(()=>inputUI.local());assert.equal(r[field].i,2);assert.equal(r[field].r.length,2);assert.equal(r.partial.r.length,2);
    });
   }
   for(const [ph,selector]of [['order','[data-or="1"]'],['uljez','[data-ul="1"]'],['power','#nopw'],['duel','[data-c="0"]']]){
    await check(ph+' previous binding cannot answer a new phase',async()=>{
     await show(ph);await page.evaluate(selector=>{const b=document.querySelector(selector);b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:7,pointerType:'touch',bubbles:true}));window.oldInput={b,click:b.onclick};},selector);
     await show(ph==='order'||ph==='uljez'?ph:'question');
     const r=await page.evaluate(()=>{const before=inputUI.local();oldInput.click(new MouseEvent('click',{detail:1}));return{detached:!oldInput.b.isConnected,before,after:inputUI.local()};});
     assert.deepEqual(r.after,r.before,'A callback from an old phase must not mutate or submit the new phase answer, including an outgoing scene ghost');
    });
   }
   await check('duel scene ghost cannot deliver a queued click to the next question',async()=>{
    await show('duel');await page.evaluate(()=>{const b=document.querySelector('[data-c="0"]');b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:8,pointerType:'touch',bubbles:true}));window.downBeforePhase=b;});
    const r=await page.evaluate(d=>{inputUI.apply(d);const before=inputUI.local(),same=document.querySelector('[data-c="0"]')===downBeforePhase,ghost=downBeforePhase.closest('.scene-ghost')!==null;downBeforePhase.dispatchEvent(new MouseEvent('click',{detail:1,bubbles:true,cancelable:true}));return {same,ghost,before,after:inputUI.local()};},state('question'));
    assert.equal(r.same,false,'Phase replacement creates a new answer button');assert.equal(r.ghost,true,'The outgoing scene remains connected briefly');
    assert.deepEqual(r.after,r.before,'A click whose pointerdown happened in the previous phase cannot answer a new question through its outgoing scene');
   });
   await check('same-question roster redraw leaves fresh presses immediately usable',async()=>{
    const d=state('question');await page.evaluate(d=>inputUI.apply(d),d);await page.waitForTimeout(40);
    await page.evaluate(()=>{const b=document.querySelector('[data-c="0"]');b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:9,pointerType:'touch',bubbles:true}));window.heldAnswer=b;});
    d.P.find(p=>p.id==='two').ok=true;await page.evaluate(d=>inputUI.apply(d),d);
    const r=await page.evaluate(()=>{const b=document.querySelector('[data-c="0"]'),same=b===heldAnswer;b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:11,pointerType:'touch',bubbles:true}));b.dispatchEvent(new MouseEvent('click',{detail:1,bubbles:true,cancelable:true}));return{same,local:inputUI.local()};});
    assert.equal(r.same,false,'Roster redraw replaces the retired answer control');assert.equal(r.local.sent.c,0);assert.equal(r.local.sent.s,d.s);
   });
   await check('hidden and resume invalidate an earlier answer press',async()=>{
    await show('question');const r=await page.evaluate(()=>{
     const b=document.querySelector('[data-c="0"]');b.dispatchEvent(new PointerEvent('pointerdown',{pointerId:10,pointerType:'touch',bubbles:true}));
     Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));
     Object.defineProperty(document,'hidden',{configurable:true,value:false});Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));
     const before=inputUI.local();document.querySelector('[data-c="0"]').dispatchEvent(new MouseEvent('click',{detail:1,bubbles:true,cancelable:true}));return{before,after:inputUI.local()};
    });assert.deepEqual(r.after,r.before,'A press from before suspension must not authorize an answer after resuming');
   });
   await check('order two current controls preserve rapid intended ranking',async()=>{await show('order');await page.locator('[data-or="0"]').tap();await page.locator('[data-or="1"]').tap();assert.deepEqual((await page.evaluate(()=>inputUI.local())).ord,[0,1]);});
   await check('uljez two current controls preserve rapid intended selection',async()=>{await show('uljez');await page.locator('[data-ul="0"]').tap();await page.locator('[data-ul="1"]').tap();assert.deepEqual((await page.evaluate(()=>inputUI.local())).ul,[0,1]);});
   assert.deepEqual(errors,[],'No browser page errors');await context.close();
  }
  if(failures.length)throw Error(failures.join('\n'));
 }finally{await browser.close();box.game.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});

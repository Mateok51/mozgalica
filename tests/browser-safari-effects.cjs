// Execute the actual phone effect handlers in Chromium/WebKit. This does not
// emulate iOS Safari's process suspension, compositor or real touch hardware.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
let pw;try{pw=require('playwright');}catch{pw=require('/workspace/trivia-browsers/node_modules/playwright');}
const root=path.join(__dirname,'..'),engine=process.env.BROWSER||'chromium';
let html=require('./page-source.cjs');
if(process.env.SAFARI_EFFECT_APP_SOURCE){const current=fs.readFileSync(path.join(root,'app.js'),'utf8');html=html.replace(current,()=>fs.readFileSync(process.env.SAFARI_EFFECT_APP_SOURCE,'utf8'));}
const marker='  setInterval(tick, 100);';assert(html.includes(marker));
html=html.replace(marker,marker+'window.effectUI={apply(d,resuming=false){mode="player";applyState(d,resuming);},local(){return {s:L.s,fx:L.fx?L.fx.k:null,left:L.fx?L.fx.left:null,queue:L.fxq.slice(),sent:L.sent};}};');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
(html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g)||[]).forEach((h,i)=>{html=html.replace(h,'sha256-'+crypto.createHash('sha256').update(scripts[i]).digest('base64'));});
const box=vm.createContext({setTimeout,clearTimeout});vm.runInContext(require('./engine-source.cjs')+';this.game=createGame({code:"TEST",noTv:true});',box);
box.game.addPlayer('one','Igrač',0,false);box.game.addPlayer('two','Suigrač',1,false);
let seq=800;
function state(ph='fq',effects=['sluz']){
 Object.assign(box.game._G,{ph,s:++seq,inFinale:ph==='fq'||ph==='fr',q:{c:'Piramida',t:'Mjesec odbija Sunčevu svjetlost.',o:['Točno','Netočno'],a:0},dur:20000,endsAt:Date.now()+20000,ev:[]});
 const d=JSON.parse(JSON.stringify(box.game.view()));d.ms=20000;d.dur=20000;d.fin=ph==='fq'||ph==='fr'?1:0;d.pyrRules=2;d.steps=13;d.req=Array(12).fill(1);d.ftop=12;
 d.P.forEach((p,i)=>Object.assign(p,{st:i+1,fs:i+1,fu:i+1,fr:1,fp:0,mv:0,sc:10000+i*1000,fsc:10000+i*1000,ok:false,c:true,ch:0,ug:1,fx:i===0?effects:[]}));return d;
}
(async()=>{
 const browser=await pw[engine].launch(engine==='chromium'?{executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']}:{});
 try{
  for(const [width,height]of[[375,553],[390,664]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',error=>errors.push(error.message));
   await page.addInitScript(()=>localStorage.setItem('mz_pid','one'));
   await page.route('**/*',route=>{const url=new URL(route.request().url());if(url.hostname!=='game.test')return route.abort();const file=path.join(root,url.pathname.slice(1));return url.pathname==='/'?route.fulfill({body:html,contentType:'text/html'}):fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({body:fs.readFileSync(file)}):route.abort();});
   await page.goto('http://game.test/');await page.evaluate(()=>document.fonts.ready);
   const show=async d=>{await page.evaluate(d=>effectUI.apply(d),d);await page.waitForTimeout(80);};
   // Another player's state update legitimately replaces #app during a swipe.
   const initial=state();await show(initial);assert.equal(await page.locator('#app #fx.fx-sluz').count(),1);
   const stale=await page.evaluate(d=>{
    const old=document.querySelector('#app #fx'),r=old.getBoundingClientRect(),id=13;
    old.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,pointerType:'touch',clientX:r.left+r.width*.2,clientY:r.top+r.height*.2,bubbles:true,cancelable:true}));
    d.P.find(p=>p.id==='two').ok=true;effectUI.apply(d);
    const replacement=document.querySelector('#app #fx');let unsafe=0;
    // The original unbounded loop uses n=Infinity on a detached zero-size
    // captured target. Throw before that loop so the regression never hangs.
    const hypot=Math.hypot;Math.hypot=(...values)=>{if(values.some(v=>!Number.isFinite(v))){unsafe++;throw Error('Detached slime handler used non-finite coordinates');}return hypot(...values);};
    try{old.dispatchEvent(new PointerEvent('pointermove',{pointerId:id,pointerType:'touch',clientX:250,clientY:400,bubbles:true,cancelable:true}));}finally{Math.hypot=hypot;}
    return{detached:!old.isConnected,replaced:old!==replacement,unsafe,fx:effectUI.local()};
   },JSON.parse(JSON.stringify(initial)));
   assert(stale.detached&&stale.replaced,'Fixture must exercise a real same-question roster rerender');
   assert.equal(stale.unsafe,0,'A stale captured slime handler must not calculate Infinity or loop forever');
   assert.deepEqual(errors,[],'Stale handlers must not throw in the browser');
   // Normal bounded swipes still clear the original visual effect and unlock
   // answers only after the existing short anti-click-through period.
   await page.evaluate(()=>{
    const el=document.querySelector('#app #fx'),r=el.getBoundingClientRect(),id=14;
    el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,pointerType:'touch',clientX:r.left+r.width*.1,clientY:r.top+r.height*.1,bubbles:true,cancelable:true}));
    for(let y=0;y<8&&el.isConnected;y++)for(let x=0;x<6&&el.isConnected;x++)el.dispatchEvent(new PointerEvent('pointermove',{pointerId:id,pointerType:'touch',clientX:r.left+r.width*(x+.5)/6,clientY:r.top+r.height*(y+.5)/8,bubbles:true,cancelable:true}));
    el.dispatchEvent(new PointerEvent('pointerup',{pointerId:id,pointerType:'touch',bubbles:true,cancelable:true}));
   });
   await page.waitForTimeout(500);assert.equal(await page.locator('#app #fx').count(),0,'Cleared slime must not leave a transparent touch blocker');
   assert.equal((await page.evaluate(()=>effectUI.local())).fx,null);
   const button=page.locator('#app [data-c="0"]');assert(await button.isEnabled());
   const hit=await button.evaluate(el=>{const r=el.getBoundingClientRect(),at=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return el===at||el.contains(at);});assert(hit,'The answer must be hit-testable after wiping');
   // Cancelled gestures cannot continue clearing slime until a new pointerdown.
   await show(state());const cancel=await page.evaluate(()=>{
    const el=document.querySelector('#app #fx'),r=el.getBoundingClientRect(),id=15;
    const event=(type,x,y)=>new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:r.left+r.width*x,clientY:r.top+r.height*y,bubbles:true,cancelable:true});
    el.dispatchEvent(event('pointerdown',.1,.1));el.dispatchEvent(event('pointercancel',.1,.1));const before=effectUI.local().left;
    el.dispatchEvent(event('pointermove',.8,.8));return{before,after:effectUI.local().left};
   });assert.equal(cancel.after,cancel.before,'Cancellation ends the wiping gesture');
   const lost=await page.evaluate(()=>{
    const el=document.querySelector('#app #fx'),r=el.getBoundingClientRect(),id=17;
    const event=(type,pointerId,x,y)=>new PointerEvent(type,{pointerId,pointerType:'touch',clientX:r.left+r.width*x,clientY:r.top+r.height*y,bubbles:true,cancelable:true});
    el.dispatchEvent(event('pointerdown',id,.1,.1));const first=effectUI.local().left;
    el.dispatchEvent(event('pointermove',id+1,.8,.8));const other=effectUI.local().left;
    el.dispatchEvent(event('lostpointercapture',id,.1,.1));
    el.dispatchEvent(event('pointermove',id,.8,.8));return{first,other,after:effectUI.local().left};
   });assert.equal(lost.other,lost.first,'Another finger cannot hijack a captured swipe');assert.equal(lost.after,lost.first,'Lost capture ends the wiping gesture');
   const outside=await page.evaluate(()=>{
    const el=document.querySelector('#app #fx'),r=el.getBoundingClientRect(),id=19;let unbounded=0;
    el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,pointerType:'touch',clientX:r.left+10,clientY:r.top+10,bubbles:true,cancelable:true}));
    const hypot=Math.hypot;Math.hypot=(...values)=>{if(values.some(v=>!Number.isFinite(v)||Math.abs(v)>20)){unbounded++;throw Error('Unbounded slime interpolation outside surface');}return hypot(...values);};
    try{el.dispatchEvent(new PointerEvent('pointermove',{pointerId:id,pointerType:'touch',clientX:1e200,clientY:1e200,bubbles:true,cancelable:true}));}finally{Math.hypot=hypot;}
    el.dispatchEvent(new PointerEvent('pointerup',{pointerId:id,pointerType:'touch',bubbles:true}));return unbounded;
   });assert.equal(outside,0,'A captured pointer outside the surface must use bounded interpolation');
   await show(state());const background=await page.evaluate(()=>{
    const el=document.querySelector('#app #fx'),r=el.getBoundingClientRect();
    el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:25,pointerType:'touch',clientX:r.left+r.width*.1,clientY:r.top+r.height*.1,bubbles:true,cancelable:true}));const before=effectUI.local().left;
    Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
    Object.defineProperty(document,'hidden',{configurable:true,value:false});Object.defineProperty(document,'visibilityState',{configurable:true,value:'visible'});document.dispatchEvent(new Event('visibilitychange'));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));
    delete document.hidden;delete document.visibilityState;
    const current=document.querySelector('#app #fx'),rr=current.getBoundingClientRect(),preserved=effectUI.local().left;
    current.dispatchEvent(new PointerEvent('pointerdown',{pointerId:26,pointerType:'touch',clientX:rr.left+rr.width*.8,clientY:rr.top+rr.height*.8,bubbles:true,cancelable:true}));current.dispatchEvent(new PointerEvent('pointerup',{pointerId:26,pointerType:'touch',bubbles:true,cancelable:true}));
    return{before,preserved,after:effectUI.local().left,sent:effectUI.local().sent};
   });assert.equal(background.preserved,background.before,'Synthetic suspension/resume preserves wiped cells');assert(background.after<background.before,'A new pointer must work after suspension without an up/cancel event');assert.equal(background.sent,null);
   // A late handler from a finished surface must not consume the next queued
   // effect (slime -> ice). Replacing the DOM alone is not an idempotence guard.
   await show(state('fq',['sluz','led']));const queue=await page.evaluate(()=>{
    const old=document.querySelector('#app #fx'),r=old.getBoundingClientRect(),id=18;
    const event=(type,x,y)=>new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:r.left+r.width*x,clientY:r.top+r.height*y,bubbles:true,cancelable:true});
    old.dispatchEvent(event('pointerdown',.1,.1));
    for(let y=0;y<8&&old.isConnected;y++)for(let x=0;x<6&&old.isConnected;x++)old.dispatchEvent(event('pointermove',(x+.5)/6,(y+.5)/8));
    const first=effectUI.local().fx;old.dispatchEvent(event('pointerdown',.5,.5));return{first,after:effectUI.local().fx};
   });assert.equal(queue.first,'led');assert.equal(queue.after,'led','The stale completion callback cannot skip the next ice effect');
   // Outgoing gestures/queued events must not affect the next phase or round.
   await show(state());
   const after=state('fr',[]);const phase=await page.evaluate(d=>{
    const old=document.querySelector('#app #fx'),r=old.getBoundingClientRect(),id=16;
    old.dispatchEvent(new PointerEvent('pointerdown',{pointerId:id,pointerType:'touch',clientX:r.left+10,clientY:r.top+10,bubbles:true,cancelable:true}));
    effectUI.apply(d);old.dispatchEvent(new PointerEvent('pointerup',{pointerId:id,pointerType:'touch',bubbles:true}));
    return effectUI.local();
   },after);assert.equal(phase.fx,null);assert.equal(await page.locator('#app #fx,#app .boom-cover,#app #bombs').count(),0,'Phase transition removes effect blockers');
   const following=state('question',[]);following.q.o=['Jedan','Dva','Tri','Četiri'];await show(following);assert.equal(await page.locator('#app #fx,#app .boom-cover,#app #bombs').count(),0);
   // Local expiry clears presentation blockers without fabricating a receipt
   // or dropping unfinished effect state. A fresh authoritative same-phase
   // snapshot after resume can restore the remaining interaction time.
   const expiry=state('fq',['sluz']);expiry.ms=120;await show(expiry);
   // Wait for the presentation tick, rather than assuming a 300ms wall-clock
   // sleep guarantees timer delivery while other browser suites use the CPU.
   await page.waitForFunction(()=>document.querySelectorAll('#app #fx,#app .boom-cover,#app #bombs').length===0,{},{timeout:3000});
   assert.equal(await page.locator('#app #fx,#app .boom-cover,#app #bombs').count(),0,'A local deadline removes touch-blocking presentation');
   assert(await page.locator('#app [data-c]').evaluateAll(es=>es.every(el=>el.disabled)),'Expired answers stay disabled');
   const expired=await page.evaluate(()=>effectUI.local());assert.equal(expired.s,expiry.s);assert.equal(expired.sent,null,'Expiry cannot fabricate an answer receipt');assert.equal(expired.fx,'sluz','Expiry preserves unfinished effect state until an authoritative update');
   const resumed=JSON.parse(JSON.stringify(expiry));resumed.ms=5000;
   await page.evaluate(d=>effectUI.apply(d,true),resumed);await page.waitForTimeout(80);
   assert.equal(await page.locator('#app #fx.fx-sluz').count(),1,'Authoritative same-step resume restores the effect with remaining time');
   assert(await page.locator('#app [data-c]').evaluateAll(es=>es.every(el=>!el.disabled)),'Restored questions must not retain the expired disabled state');
   const restored=await page.evaluate(()=>{const el=document.querySelector('#app #fx'),r=el.getBoundingClientRect();el.dispatchEvent(new PointerEvent('pointerdown',{pointerId:21,pointerType:'touch',clientX:r.left+r.width*.2,clientY:r.top+r.height*.2,bubbles:true,cancelable:true}));el.dispatchEvent(new PointerEvent('pointerup',{pointerId:21,pointerType:'touch',bubbles:true,cancelable:true}));return effectUI.local();});assert(restored.left<48,'Restored slime remains interactive');assert.equal(restored.sent,null);
   await show(state('fr',[]));assert.equal(await page.locator('#app #fx,#app .boom-cover,#app #bombs').count(),0);
   assert.deepEqual(errors,[]);console.log(engine,`${width}x${height}: stale capture, bounded wipe, hit testing, pointer/cancel cleanup, queued effects, phase/round cleanup and expiry/resume`);await context.close();
  }
 }finally{await browser.close();box.game.stop();}
})().catch(error=>{console.error(error);process.exitCode=1;});

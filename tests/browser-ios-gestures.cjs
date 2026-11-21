// Run actual mini-game pointer handlers in a browser engine. Synthetic events
// model cancelled/captured/multi-touch delivery; they are not physical iOS input.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const pw = require('playwright');
const engine = process.env.BROWSER || 'chromium';
const root = path.join(__dirname, '..');
let html = require('./page-source.cjs');
if (process.env.IOS_GESTURE_APP_SOURCE) {
  html = html.replace(fs.readFileSync(path.join(root, 'app.js'), 'utf8'),
    () => fs.readFileSync(process.env.IOS_GESTURE_APP_SOURCE, 'utf8'));
}
const marker = '  setInterval(tick, 100);';
assert(html.includes(marker));
html = html.replace(marker, marker + 'window.gestureUI={apply(d){mode="player";applyState(d);},render(){phoneRender(true);},local(){return {s:L.s,sort:L.sortP&&L.sortP.slice(),link:L.linkP&&L.linkP.slice(),live:L.lnkLive||null,sent:L.sent,partial:L.partial?JSON.parse(JSON.stringify(L.partial)):null};}};');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
(html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g) || []).forEach((hash, i) => {
  html = html.replace(hash, 'sha256-' + crypto.createHash('sha256').update(scripts[i]).digest('base64'));
});
const box = vm.createContext({setTimeout, clearTimeout});
vm.runInContext(require('./engine-source.cjs') + ';this.game=createGame({code:"TEST",noTv:true});', box);
box.game.addPlayer('one', 'Ana', 0, false);
box.game.addPlayer('two', 'Iva', 1, false);
let step = 800;
function state(ph) {
  Object.assign(box.game._G, {ph, s: ++step, dur: 30000, endsAt: Date.now() + 30000,
    so: {a:'Voće',b:'Povrće',items:['Jabuka','Mrkva','Kruška','Kupus'],key:[0,1,0,1]},
    li: {t:'Spoji pojmove',L:['Lijevo jedan','Lijevo dva','Lijevo tri'],R:['Desno jedan','Desno dva','Desno tri'],key:[0,1,2]}});
  const d = JSON.parse(JSON.stringify(box.game.view()));
  d.ms = d.dur = 30000;
  d.P.forEach(p => {p.ok = false;p.c = true;});
  return d;
}
(async () => {
  const browser = await pw[engine].launch(engine === 'chromium' ? {executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']} : {});
  const failures = [];
  try {
    for (const [width,height] of [[375,553],[390,664]]) {
      const context = await browser.newContext({viewport:{width,height},hasTouch:true});
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.addInitScript(() => localStorage.setItem('mz_pid','one'));
      await page.route('**/*', route => {
        const u = new URL(route.request().url());if(u.hostname !== 'game.test')return route.abort();
        const file = path.join(root,u.pathname.slice(1));
        return u.pathname === '/' ? route.fulfill({body:html,contentType:'text/html'}) :
          fs.existsSync(file)&&fs.statSync(file).isFile() ? route.fulfill({body:fs.readFileSync(file)}) : route.abort();
      });
      await page.goto('http://game.test/');await page.evaluate(() => document.fonts.ready);
      const show = async ph => {await page.evaluate(d=>gestureUI.apply(d),state(ph));await page.waitForTimeout(100);};
      const check = async (name, run) => {
        try {await run();console.log('PASS',engine,width,name);} catch(error) {failures.push(`${engine} ${width} ${name}: ${error.message}`);console.log('FAIL',engine,width,name,error.message);}
      };
      await check('link rejects release from another finger',async()=>{
        await show('link');
        const result = await page.evaluate(()=>{
          const board=document.querySelector('.lnk-board'),left=board.querySelector('[data-ll="0"]'),right=board.querySelector('[data-lr="0"]');
          const a=left.getBoundingClientRect(),b=right.getBoundingClientRect();
          const event=(type,id,x,y)=>new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true});
          left.dispatchEvent(event('pointerdown',11,a.x+a.width/2,a.y+a.height/2));
          board.dispatchEvent(event('pointermove',11,b.x+b.width/2,b.y+b.height/2));
          board.dispatchEvent(event('pointerup',12,b.x+b.width/2,b.y+b.height/2));
          const afterOther=gestureUI.local().link;
          board.dispatchEvent(event('pointerup',11,b.x+b.width/2,b.y+b.height/2));
          return {afterOther,afterOwner:gestureUI.local().link};
        });
        assert.deepEqual(result.afterOther,[-1,-1,-1],'An unrelated pointerup must not commit an active drag');
        assert.equal(result.afterOwner[0],0,'The owning finger still completes its intended pair');
      });
      await check('link lost capture cancels the live rope',async()=>{
        await show('link');
        const result = await page.evaluate(()=>{
          const board=document.querySelector('.lnk-board'),left=board.querySelector('[data-ll="0"]'),right=board.querySelector('[data-lr="0"]');
          const a=left.getBoundingClientRect(),b=right.getBoundingClientRect();
          const event=(type,x,y)=>new PointerEvent(type,{pointerId:21,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true});
          left.dispatchEvent(event('pointerdown',a.x+a.width/2,a.y+a.height/2));board.dispatchEvent(event('pointermove',b.x+b.width/2,b.y+b.height/2));
          board.dispatchEvent(event('lostpointercapture',b.x+b.width/2,b.y+b.height/2));
          const live=gestureUI.local().live,dragging=board.classList.contains('dragging');
          board.dispatchEvent(event('pointerup',b.x+b.width/2,b.y+b.height/2));
          return {live,dragging,link:gestureUI.local().link};
        });
        assert.equal(result.live,null,'Lost capture must remove a live uncommitted rope');assert.equal(result.dragging,false);
        assert.deepEqual(result.link,[-1,-1,-1],'A queued up event after lost capture must not create a pair');
      });
      await check('link stale board cannot mutate a following round',async()=>{
        await show('link');
        const result = await page.evaluate(d=>{
          const board=document.querySelector('.lnk-board'),left=board.querySelector('[data-ll="0"]'),right=board.querySelector('[data-lr="0"]');
          const a=left.getBoundingClientRect(),b=right.getBoundingClientRect();
          const event=(type)=>new PointerEvent(type,{pointerId:31,pointerType:'touch',clientX:b.x+b.width/2,clientY:b.y+b.height/2,bubbles:true,cancelable:true});
          left.dispatchEvent(new PointerEvent('pointerdown',{pointerId:31,pointerType:'touch',clientX:a.x+a.width/2,clientY:a.y+a.height/2,bubbles:true,cancelable:true}));
          board.dispatchEvent(event('pointermove'));const end=board.onpointerup;
          gestureUI.apply(d);const before=gestureUI.local();
          if(end)end(event('pointerup'));return {detached:!board.isConnected,before,after:gestureUI.local()};
        },state('link'));
        assert.equal(result.detached,true);assert.deepEqual(result.after,result.before,'An old completed drag cannot write into a fresh phase-local answer');
      });
      await check('link stale board cannot submit after a same-phase redraw',async()=>{
        await show('link');
        const result = await page.evaluate(()=>{
          const board=document.querySelector('.lnk-board'),left=board.querySelector('[data-ll="0"]'),right=board.querySelector('[data-lr="0"]');
          const a=left.getBoundingClientRect(),b=right.getBoundingClientRect();
          const event=type=>new PointerEvent(type,{pointerId:35,pointerType:'touch',clientX:b.x+b.width/2,clientY:b.y+b.height/2,bubbles:true,cancelable:true});
          left.dispatchEvent(new PointerEvent('pointerdown',{pointerId:35,pointerType:'touch',clientX:a.x+a.width/2,clientY:a.y+a.height/2,bubbles:true,cancelable:true}));
          board.dispatchEvent(event('pointermove'));const end=board.onpointerup;
          gestureUI.render();const before=gestureUI.local();if(end)end(event('pointerup'));
          return {detached:!board.isConnected,before,after:gestureUI.local()};
        });
        assert.equal(result.detached,true);assert.deepEqual(result.after,result.before,'A detached board cannot create a pair or save partial progress after redraw');
      });
      await check('sort lost capture permits a fresh finger',async()=>{
        await show('sort');
        const result = await page.evaluate(()=>{
          const card=document.querySelector('.swp-card[data-si]'),r=card.getBoundingClientRect();
          const event=(type,id,dx)=>new PointerEvent(type,{pointerId:id,pointerType:'touch',clientX:r.x+r.width/2+dx,clientY:r.y+r.height/2,bubbles:true,cancelable:true});
          card.dispatchEvent(event('pointerdown',41,0));card.dispatchEvent(event('pointermove',41,35));card.dispatchEvent(event('lostpointercapture',41,35));
          const dragging=card.classList.contains('drag');
          card.dispatchEvent(event('pointerdown',42,0));card.dispatchEvent(event('pointermove',42,190));card.dispatchEvent(event('pointerup',42,190));
          return {dragging,sort:gestureUI.local().sort};
        });
        assert.equal(result.dragging,false,'Lost capture must reset drag styles and pointer ownership');
        assert.equal(result.sort[0],1,'A new gesture must sort after the previous capture was lost');
      });
      await check('sort stale card cannot submit after a same-phase redraw',async()=>{
        await show('sort');
        const result = await page.evaluate(()=>{
          const card=document.querySelector('.swp-card[data-si]'),r=card.getBoundingClientRect();
          const event=type=>new PointerEvent(type,{pointerId:51,pointerType:'touch',clientX:r.x+r.width/2+190,clientY:r.y+r.height/2,bubbles:true,cancelable:true});
          card.dispatchEvent(new PointerEvent('pointerdown',{pointerId:51,pointerType:'touch',clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true,cancelable:true}));card.dispatchEvent(event('pointermove'));
          const end=card.onpointerup;gestureUI.render();const before=gestureUI.local();if(end)end(event('pointerup'));
          return {detached:!card.isConnected,before,after:gestureUI.local()};
        });
        assert.equal(result.detached,true);assert.deepEqual(result.after,result.before,'A detached card cannot classify a term on behalf of a new surface');
      });
      await check('sort keyboard and category touch still save partial answers',async()=>{
        await show('sort');
        await page.locator('.swp-card[data-si]').press('ArrowLeft');
        let local=await page.evaluate(()=>gestureUI.local());
        assert.equal(local.sort[0],0);assert.equal(local.partial.r[0],0);assert.equal(local.partial.s,local.s);
        await page.waitForTimeout(450); // wait through the intentional 380 ms sort button cooldown
        await page.locator('.swp-side[data-go="1"]').tap();
        local=await page.evaluate(()=>gestureUI.local());
        assert.deepEqual(local.sort,[0,1,-1,-1]);assert.deepEqual(local.partial.r,[0,1,-1,-1]);
      });
      await check('link real touch taps and keyboard still create pairs',async()=>{
        await show('link');
        await page.locator('[data-ll="0"]').tap();await page.locator('[data-lr="1"]').tap();
        let local=await page.evaluate(()=>gestureUI.local());
        assert.deepEqual(local.link,[1,-1,-1]);assert.deepEqual(local.partial.r,[1,-1,-1]);assert.equal(local.partial.s,local.s);
        await page.locator('[data-ll="2"]').press('Enter');await page.locator('[data-lr="2"]').press(' ');
        local=await page.evaluate(()=>gestureUI.local());
        assert.deepEqual(local.link,[1,-1,2]);assert.deepEqual(local.partial.r,[1,-1,2]);
      });
      for(const phase of ['sort','link']) await check(phase+' pagehide cancels an unfinished gesture',async()=>{
        await show(phase);
        const result=await page.evaluate(phase=>{
          const card=phase==='sort'?document.querySelector('.swp-card[data-si]'):document.querySelector('[data-ll="0"]');
          const surface=phase==='sort'?card:document.querySelector('.lnk-board');
          const a=card.getBoundingClientRect(),b=phase==='sort'?a:document.querySelector('[data-lr="0"]').getBoundingClientRect();
          const x=phase==='sort'?a.x+a.width/2+190:b.x+b.width/2,y=b.y+b.height/2;
          const event=type=>new PointerEvent(type,{pointerId:61,pointerType:'touch',clientX:x,clientY:y,bubbles:true,cancelable:true});
          card.dispatchEvent(new PointerEvent('pointerdown',{pointerId:61,pointerType:'touch',clientX:a.x+a.width/2,clientY:a.y+a.height/2,bubbles:true,cancelable:true}));
          surface.dispatchEvent(event('pointermove'));const end=surface.onpointerup;
          window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));
          const before=gestureUI.local();if(end)end(event('pointerup'));
          return {before,after:gestureUI.local(),dragging:surface.classList.contains(phase==='sort'?'drag':'dragging')};
        },phase);
        assert.equal(result.dragging,false,'Suspension must reset active gesture styles');
        assert.equal(result.after.live,null,'Suspension must discard an uncommitted live rope');
        assert.deepEqual(result.after,result.before,'A pointer release queued before pagehide cannot commit a partial answer while suspended');
      });
      assert.deepEqual(errors,[],'No browser page errors');await context.close();
    }
    if(failures.length)throw Error(failures.join('\n'));
  } finally {await browser.close();box.game.stop();}
})().catch(error=>{console.error(error);process.exitCode=1;});

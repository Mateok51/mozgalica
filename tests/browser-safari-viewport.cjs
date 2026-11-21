// Safari engine regressions for a transient visible-area change without a
// layout-viewport resize. This models browser chrome/keyboard events; it does
// not emulate real iOS keyboard animation, QR Camera handoff, or device Safari.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const pw = require('playwright');
const root = path.join(__dirname, '..');
const engine = process.env.BROWSER || 'chromium';
let html = require('./page-source.cjs');
const anchor = '  setInterval(tick, 100);';
assert.ok(html.includes(anchor));
html = html.replace(anchor, anchor + ' window.testUI=(d)=>{mode="player";applyState(d);};');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
(html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g) || []).forEach((h, i) => {
  html = html.replace(h, 'sha256-' + crypto.createHash('sha256').update(scripts[i]).digest('base64'));
});
function state(ph) {
  const context = vm.createContext({setTimeout, clearTimeout});
  vm.runInContext(require('./engine-source.cjs') + '\nthis.game=createGame({code:"TEST",noTv:true});', context);
  const game = context.game;
  [['one','Mateo'],['two','Ana'],['three','Iva']].forEach(([id,name], i) => game.addPlayer(id,name,i,false,i===0));
  Object.assign(game._G, {ph,s:5,inFinale:ph==='fq',q:{n:1,c:'Povijest',
    t:ph==='fq'?'Mjesec odbija Sunčevu svjetlost.':'Koja se osoba prva uputila na dugo putovanje automobilom?',
    o:ph==='fq'?['Točno','Netočno']:['Karl Benz','Henry Ford','Bertha Benz','Gottlieb Daimler'],a:2},
    dur:20000,startedAt:Date.now(),endsAt:Date.now()+20000,ev:[]});
  const result = JSON.parse(JSON.stringify(game.view())); game.stop(); return result;
}
(async () => {
  const browser = await pw[engine].launch(engine === 'chromium' ? {
    executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']
  } : {});
  try {
    for(const ph of ['question','fq']) {
      const context=await browser.newContext({viewport:{width:390,height:664},deviceScaleFactor:3,
        isMobile:true,hasTouch:true,userAgent:pw.devices['iPhone 13'].userAgent});
      const page=await context.newPage(), errors=[];
      page.on('pageerror',error=>errors.push(error.message));
      await page.addInitScript(()=>localStorage.setItem('mz_pid','one'));
      await context.route('**/*',route=>{
        const u=new URL(route.request().url());if(u.hostname!=='game.test')return route.abort();
        const file=path.join(root,u.pathname.slice(1));
        return u.pathname==='/'?route.fulfill({body:html,contentType:'text/html'}):
          fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file)}):route.abort();
      });
      await page.goto('http://game.test/');
      await page.evaluate(async d=>{await document.fonts.ready;testUI(d);},state(ph));
      await page.waitForTimeout(650);
      const measure=()=>page.evaluate(()=>({zoom:+document.querySelector('#app').style.zoom||1,
        width:innerWidth,height:innerHeight,buttons:[...document.querySelectorAll('.p-opt')].map(b=>{
          const r=b.getBoundingClientRect();return {height:r.height,top:r.top,bottom:r.bottom};
        })}));
      const baseline=await measure();
      assert.ok(baseline.zoom>=0.98,`${engine} ${ph}: baseline is unexpectedly shrunk`);
      // On Safari, toolbar/keyboard transitions can change the visible space
      // while innerWidth/innerHeight remain stable. Move the existing fixed
      // control to supply that changed available-height measurement.
      await page.evaluate(()=>{
        const controls=document.querySelector('.audio-controls');
        controls.style.bottom='420px';
        window.dispatchEvent(new Event('resize'));
      });
      await page.waitForTimeout(300);
      const compressed=await measure();
      assert.ok(compressed.zoom<baseline.zoom-0.1,`${engine} ${ph}: fixture must create a real transient small fit (${compressed.zoom})`);
      assert.equal(compressed.width,baseline.width);assert.equal(compressed.height,baseline.height);
      await page.evaluate(()=>{
        document.querySelector('.audio-controls').style.bottom='';
        // No window resize here: this is the event missing in the old code.
        window.visualViewport.dispatchEvent(new Event('resize'));
      });
      await page.waitForTimeout(500);
      const recovered=await measure();
      assert.ok(recovered.zoom>=baseline.zoom-0.015,
        `${engine} ${ph}: same phase stayed compressed after a visualViewport-only recovery (${compressed.zoom} -> ${recovered.zoom}, baseline ${baseline.zoom})`);
      for(const b of recovered.buttons)assert.ok(b.height>=40&&b.top>=0&&b.bottom<=664,`${engine} ${ph}: restored answer target is clipped`);

      // Editable focus is transient browser UI, not a new lasting game layout.
      // This is a controlled focus event, not an emulated iOS keyboard.
      await page.evaluate(()=>{
        const input=document.createElement('input');input.id='viewport-focus-fixture';
        input.style.cssText='position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;font-size:16px';
        document.body.append(input);input.focus();
        document.querySelector('.audio-controls').style.bottom='420px';
        window.dispatchEvent(new Event('resize'));
        window.visualViewport.dispatchEvent(new Event('resize'));
      });
      await page.waitForTimeout(250);
      assert.ok((await measure()).zoom>=baseline.zoom-0.015,`${engine} ${ph}: editable focus cached a keyboard-sized scale`);
      await page.evaluate(()=>{
        const input=document.querySelector('#viewport-focus-fixture');input.blur();input.remove();
        document.querySelector('.audio-controls').style.bottom='';
        window.visualViewport.dispatchEvent(new Event('resize'));
      });
      await page.waitForTimeout(550);
      assert.ok((await measure()).zoom>=baseline.zoom-0.015,`${engine} ${ph}: focusout did not restore the playable layout`);

      // A pinch changes visualViewport.scale; fitting that narrowed frame would
      // fight the user's zoom. Preserve the game scale until the pinch ends.
      await page.evaluate(()=>{
        Object.defineProperty(window.visualViewport,'scale',{configurable:true,get:()=>1.5});
        document.querySelector('.audio-controls').style.bottom='420px';
        window.visualViewport.dispatchEvent(new Event('resize'));
      });
      await page.waitForTimeout(250);
      assert.ok((await measure()).zoom>=baseline.zoom-0.015,`${engine} ${ph}: pinch frame changed game scaling`);
      await page.evaluate(()=>{
        delete window.visualViewport.scale;
        document.querySelector('.audio-controls').style.bottom='';
        window.visualViewport.dispatchEvent(new Event('resize'));
      });
      await page.waitForTimeout(550);
      assert.ok((await measure()).zoom>=baseline.zoom-0.015,`${engine} ${ph}: pinch completion left stale game scaling`);
      assert.deepEqual(errors,[],`${engine} ${ph}: page errors`);
      console.log(engine,ph,'visual viewport recovery',compressed.zoom,'->',recovered.zoom);
      await context.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});

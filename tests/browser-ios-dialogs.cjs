// Browser-only dialog lifecycle checks. No physical iPhone keyboard is emulated.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const pw=require('playwright'),engine=process.env.BROWSER||'chromium',root=path.join(__dirname,'..');
let html=require('./page-source.cjs');
if(process.env.IOS_DIALOG_APP_SOURCE)html=html.replace(fs.readFileSync(path.join(root,'app.js'),'utf8'),()=>fs.readFileSync(process.env.IOS_DIALOG_APP_SOURCE,'utf8'));
const marker='  setInterval(tick, 100);';assert(html.includes(marker));
// A test-only reset endpoint exercises the same normal navigation cleanup path.
html=html.replace(marker,marker+'window.dialogUI={reset(){reset();}};');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
(html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g)||[]).forEach((hash,i)=>html=html.replace(hash,'sha256-'+crypto.createHash('sha256').update(scripts[i]).digest('base64')));
(async()=>{
 const browser=await pw[engine].launch(engine==='chromium'?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}:{}),failures=[];
 try{
  for(const [width,height] of [[375,553],[390,664]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>{
    window.__wakeStats={requests:0,releases:0};
    Object.defineProperty(navigator,'wakeLock',{configurable:true,value:{request:async()=>{
     window.__wakeStats.requests++;
     return {addEventListener(){},release(){window.__wakeStats.releases++;return Promise.resolve();}};
    }}});
   });
   await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='game.test')return route.abort();const file=path.join(root,u.pathname.slice(1));return u.pathname==='/'?route.fulfill({body:html,contentType:'text/html'}):fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({body:fs.readFileSync(file)}):route.abort();});
   const load=async()=>{await page.goto('http://game.test/');await page.evaluate(()=>document.fonts.ready);};
   const check=async(name,run)=>{try{await load();await run();console.log('PASS',engine,width,name);}catch(e){failures.push(engine+' '+width+' '+name+': '+e.message);console.log('FAIL',engine,width,name,e.message);}};
   const invite=async()=>{await page.evaluate(()=>location.hash='#ABCD-AAAAAAAAAAAAAAAAAAAAAA');await page.locator('#code').waitFor();};
   await check('new invitation removes old haptic dialog and exposes join inputs',async()=>{
    await page.locator('#homeHaptics').tap();await page.locator('#hapticModal').waitFor();await invite();
    const result=await page.evaluate(()=>{const input=document.querySelector('#code'),r=input.getBoundingClientRect(),hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{code:input.value,oldDialog:!!document.querySelector('#hapticModal'),hit:hit&&hit.id,blockedBy:hit&&hit.closest('#hapticModal')?'hapticModal':null};});
    assert.equal(result.code,'ABCD');assert.equal(result.oldDialog,false,'The haptic dialog belongs to the previous screen; it still blocks the invitation form: '+JSON.stringify(result));
    assert.equal(result.hit,'code','The new room-code input must receive touch hit testing');
   });
   await check('reset removes old haptic dialog from the home screen',async()=>{
    await page.locator('#homeHaptics').tap();await page.evaluate(()=>dialogUI.reset());
    assert.equal(await page.locator('#hapticModal').count(),0,'Reset cannot leave a full-screen dialog from a retired screen');
    const hit=await page.locator('#hostp').evaluate(el=>{const r=el.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,r.y+r.height/2)?.closest('#hostp')?.id;});assert.equal(hit,'hostp');
   });
   await check('diagnostics already closes on new invitation',async()=>{
    await page.locator('#homeDiagnostics').tap();await page.locator('#diagModal').waitFor();await invite();assert.equal(await page.locator('#diagModal').count(),0);assert.equal(await page.locator('#code').inputValue(),'ABCD');
   });
   await check('normal haptic close restores its keyboard focus',async()=>{
    await page.locator('#homeHaptics').focus();await page.keyboard.press('Enter');await page.locator('#hapticModal').waitFor();await page.locator('#hapticClose').click();
    assert.equal(await page.evaluate(()=>document.activeElement?.id),'homeHaptics');assert.equal(await page.locator('#hapticModal').count(),0);
   });
   await check('join inputs use readable sizes and retain current typed values',async()=>{
    await page.locator('#join').tap();await page.locator('#code').fill('ABCD');await page.locator('#name').fill('Ana');
    const result=await page.locator('#form input').evaluateAll(inputs=>inputs.map(el=>({id:el.id,value:el.value,font:parseFloat(getComputedStyle(el).fontSize)})));
    assert.deepEqual(result.map(x=>x.value),['ABCD','Ana']);assert(result.every(x=>x.font>=16),'Input fonts should not trigger small-text Safari zoom');
   });
   await check('leaving the demo releases its simulated screen lock',async()=>{
    await page.locator('#demo').tap();await page.locator('#leave').waitFor();
    await page.waitForFunction(()=>window.__wakeStats.requests===1);
    await page.locator('#leave').click();await page.locator('#homeHaptics').waitFor();
    await page.waitForFunction(()=>window.__wakeStats.releases===1);
    assert.equal(await page.evaluate(()=>window.__wakeStats.requests),1,'A single visible game must acquire only one lock');
   });
   assert.deepEqual(errors,[],'No browser page errors');await context.close();
  }
  if(failures.length)throw Error(failures.join('\n'));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

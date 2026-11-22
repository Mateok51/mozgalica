// Actual pact UI, engine-produced private offer, and controlled browser navigation.
// This does not emulate physical iPhone touch hardware or Safari process eviction.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),http=require('node:http');
const pw=require('playwright'),engine=process.env.BROWSER||'chromium',root=path.join(__dirname,'..');
let html=require('./page-source.cjs');
if(process.env.IOS_PACT_DIALOG_APP_SOURCE)html=html.replace(fs.readFileSync(path.join(root,'app.js'),'utf8'),()=>fs.readFileSync(process.env.IOS_PACT_DIALOG_APP_SOURCE,'utf8'));
const marker='  setInterval(tick, 100);';assert(html.includes(marker));
html=html.replace(marker,marker+'window.pactDialogUI={apply(d){mode="player";applyState(d);},redraw(){phoneRender(true);},reset(){reset();}};');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
(html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g)||[]).forEach((hash,i)=>html=html.replace(hash,'sha256-'+crypto.createHash('sha256').update(scripts[i]).digest('base64')));
const box=vm.createContext({setTimeout,clearTimeout});vm.runInContext(require('./engine-source.cjs')+';this.game=createGame({code:"TEST",noTv:true,pacts:true});',box);
for(const [id,name,av]of[['one','Ana',0],['two','Iva',1],['three','Luka',2]])box.game.addPlayer(id,name,av,false);
let step=1100;
function state(ph='reveal'){
 Object.assign(box.game._G,{ph,s:++step,dur:120000,startedAt:Date.now()-20000,endsAt:Date.now()+100000,
  q:{c:'Brojevi',t:'Koji je broj veći?',o:['Deset','Pet'],a:0},ev:[],revMin:ph==='reveal'?Date.now()-1000:0,
  kp:ph==='reveal'?{id:step,a:'one',b:'two',st:'o',ans:{}}:null});
 const d=JSON.parse(JSON.stringify(box.game.view()));d.pv=JSON.parse(JSON.stringify(box.game.priv('one')));d.P.forEach(p=>{p.ok=false;p.c=true;});return d;
}
(async()=>{
 // Real HTTP preserves normal asset caching across repeated navigations. A
 // route.fulfill test server can turn cancelled WebKit preloads into unrelated
 // access-control pageerrors when replacing this deliberately image-rich UI.
 const mime={'.js':'application/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json','.mp3':'audio/mpeg'};
 const server=http.createServer((request,response)=>{
  const u=new URL(request.url,'http://127.0.0.1');
  if(u.pathname==='/'){response.writeHead(200,{'Content-Type':'text/html','Cache-Control':'no-store'});return response.end(html);}
  const file=path.resolve(root,'.'+u.pathname);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){response.writeHead(404);return response.end();}
  response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'public,max-age=3600'});fs.createReadStream(file).pipe(response);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
 let browser;const failures=[];
 try{
  browser=await pw[engine].launch(engine==='chromium'?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}:{});
  for(const [width,height]of[[375,553],[390,664]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[];
   page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('mz_pid','one'));
   const navigate=async()=>{await page.waitForLoadState('networkidle');await page.goto(origin+'/');await page.evaluate(()=>document.fonts.ready);};
   const open=async()=>{await navigate();const d=state();await page.evaluate(d=>pactDialogUI.apply(d),d);await page.locator('#app [data-pactrules]').tap();await page.locator('#pactRulesModal').waitFor();return d;};
   const check=async(name,run)=>{try{await run();console.log('PASS',engine,width,name);}catch(e){failures.push(engine+' '+width+' '+name+': '+e.message);console.log('FAIL',engine,width,name,e.message);}};
   const hit=async selector=>page.locator(selector).evaluate(el=>{const r=el.getBoundingClientRect(),target=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return{blocked:!!target?.closest('#pactRulesModal'),hit:target?.id||target?.getAttribute('data-c')||target?.className};});
   await check('new QR invitation removes pact rules and exposes its form',async()=>{
    await open();await page.evaluate(()=>location.hash='#ABCD-AAAAAAAAAAAAAAAAAAAAAA');await page.locator('#code').waitFor();const target=await hit('#code');
    assert.equal(target.blocked,false,'Old pact rules intercept the new room-code input: '+JSON.stringify(target));assert.equal(await page.locator('#pactRulesModal').count(),0);assert.equal(target.hit,'code');
   });
   await check('reset removes pact rules and exposes home controls',async()=>{
    await open();await page.evaluate(()=>pactDialogUI.reset());const target=await hit('#hostp');
    assert.equal(target.blocked,false,'Reset leaves the previous pact dialog over the home controls: '+JSON.stringify(target));assert.equal(await page.locator('#pactRulesModal').count(),0);
   });
   await check('server question phase retires pact rules before answering',async()=>{
    await open();await page.evaluate(d=>pactDialogUI.apply(d),state('question'));const target=await hit('#app [data-c="0"]');
    assert.equal(target.blocked,false,'The timed question is still under rules from its preceding offer: '+JSON.stringify(target));assert.equal(await page.locator('#pactRulesModal').count(),0);
    await page.locator('#app [data-c="0"]').tap();assert.equal(await page.evaluate(()=>__dbg.L.sent?.c),0);
   });
   await check('same offer redraw keeps its intentionally open rules',async()=>{
    const d=await open();d.P.find(p=>p.id==='three').ok=true;await page.evaluate(d=>{pactDialogUI.apply(d);pactDialogUI.redraw();},d);
    assert.equal(await page.locator('#pactRulesModal').count(),1);assert.equal((await hit('#app [data-krp="1"]')).blocked,true,'An intentionally open dialog must continue to mask its current offer');
   });
   await check('normal close restores focus to the current offer button',async()=>{
    await navigate();await page.evaluate(d=>pactDialogUI.apply(d),state());
    await page.locator('#app [data-pactrules]').focus();await page.keyboard.press('Enter');await page.locator('#pactRulesModal button').click();
    assert.equal(await page.locator('#pactRulesModal').count(),0);assert.equal(await page.evaluate(()=>document.activeElement?.hasAttribute('data-pactrules')),true);assert.equal((await hit('#app [data-krp="1"]')).blocked,false);
   });
   await check('a queued close from old rules cannot dismiss a new offer dialog',async()=>{
    await open();await page.evaluate(()=>window.oldPactClose=document.querySelector('#pactRulesModal button').onclick);
    await page.evaluate(d=>pactDialogUI.apply(d),state('question'));
    await page.evaluate(d=>pactDialogUI.apply(d),state());await page.locator('#app [data-pactrules]').tap();
    await page.evaluate(()=>oldPactClose());
    assert.equal(await page.locator('#pactRulesModal').count(),1,'A stale callback can close only its own instance');
    await page.locator('#pactRulesModal button').click();assert.equal(await page.locator('#pactRulesModal').count(),0);
   });
   await page.waitForLoadState('networkidle');assert.deepEqual(errors,[],'No browser page errors');await context.close();
  }
  if(failures.length)throw Error(failures.join('\n'));
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));box.game.stop();}
})().catch(e=>{console.error(e);process.exitCode=1;});

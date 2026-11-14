// Chromium simulates the APK's bundled WebView origin and native message port.
// HTTP/WebSocket traffic is forwarded to the real local Workers runtime.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
const {WebSocket}=require('ws');
const root=path.join(__dirname,'../..'),home='https://mateok51.github.io/mozgalica/';
const service='https://trivia-tavern.chaos-ballad.workers.dev',local='http://127.0.0.1:8787';
(async()=>{
 const assets=await fs.mkdtemp(path.join(os.tmpdir(),'trivia-apk-assets-'));
 let browser;const upstreams=new Set();
 try {
  execFileSync('python3',['-c',"import importlib.util, pathlib, sys; root=pathlib.Path(sys.argv[1]); spec=importlib.util.spec_from_file_location('apk_build',root/'android/build.py'); module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module); module.prepare_assets(root,pathlib.Path(sys.argv[2]))",root,assets]);
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
  const errors=[],hellos=[],apiOrigins=[];
  async function apk(){
   const p=await browser.newPage({viewport:{width:390,height:844}});
   p.on('pageerror',e=>errors.push(e.message));
   p.on('popup',()=>errors.push('APK opened an external browser window'));
   await p.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin===service&&u.pathname.startsWith('/api/')){
     apiOrigins.push(route.request().headers().origin);
     return route.fulfill({response:await route.fetch({url:local+u.pathname})});
    }
    if(!u.href.startsWith(home))return route.abort();
    const rel=u.pathname.slice('/mozgalica/'.length)||'index.html';
    const file=path.join(assets,rel);
    if(!file.startsWith(assets+path.sep))return route.abort();
    try {return await route.fulfill({path:file});}catch{return route.abort();}
   });
   await p.routeWebSocket(service.replace('https:','wss:')+'/api/rooms/*',route=>{
    const upstream=new WebSocket(local.replace('http:','ws:')+new URL(route.url()).pathname,{origin:new URL(home).origin}),pending=[];
    upstreams.add(upstream);
    route.onMessage(raw=>{const m=JSON.parse(raw);if(m.t==='hello')hellos.push(m);if(upstream.readyState===1)upstream.send(raw);else pending.push(raw);});
    upstream.addEventListener('open',()=>{for(const raw of pending)upstream.send(raw);pending.length=0;});
    upstream.addEventListener('message',event=>route.send(event.data));
    upstream.addEventListener('error',()=>errors.push('Local Workers WebSocket failed'));
    upstream.addEventListener('close',()=>route.close({code:1000}));
    route.onClose(()=>upstream.close());
   });
   return p;
  }
  const host=await apk();await host.goto(home);
  await host.locator('#hostp').click();await host.locator('#hname').fill('Ana');
  await host.locator('#hform button[type=submit]').click();await host.locator('#dstart').waitFor();
  const room=await host.evaluate(()=>JSON.parse(localStorage.getItem('mz_cloud_resume_v1')));
  assert(room?.secret);assert(apiOrigins.includes(new URL(home).origin),'Bundled origin must reach the API with CORS');
  const guest=await apk();await guest.goto(home);
  assert.equal(await guest.evaluate(()=>sessionStorage.length),0,'No saved invitation');
  await guest.evaluate(()=>{
   const c=new MessageChannel();window.nativeCommands=[];window.nativeLifecycle=c.port1;
   c.port1.onmessage=e=>window.nativeCommands.push(e.data);c.port1.start();
   window.dispatchEvent(new MessageEvent('message',{data:'trivia-native-connect',ports:[c.port2]}));
  });
  await guest.locator('#join').click();await guest.locator('#code').fill(room.code.toLowerCase());
  await guest.locator('#name').fill('Mateo');await guest.locator('#form button[type=submit]').click();
  await guest.locator('.lob-row').nth(1).waitFor();
  assert.equal(guest.url(),home,'Join stays inside bundled APK page');
  assert(hellos.some(m=>m.name==='Mateo'&&m.secret==null),'Code join must send no invitation secret');
  assert.equal(await guest.evaluate(()=>JSON.parse(localStorage.getItem('mz_cloud_resume_v1')).secret),null);
  const stale=await apk();await stale.goto(home);
  await stale.evaluate(code=>sessionStorage.setItem('mz_rs_'+code,'b'.repeat(22)),room.code);
  await stale.locator('#join').click();await stale.locator('#code').fill(room.code);
  await stale.locator('#name').fill('StariKod');await stale.locator('#form button[type=submit]').click();
  await stale.locator('.lob-row').nth(2).waitFor();
  assert(hellos.some(m=>m.name==='StariKod'&&m.secret==null),'Typed code must ignore stale cached invite secrets');
  await guest.evaluate(()=>window.nativeLifecycle.postMessage('resume'));
  await host.locator('#dstart:not([disabled])').click();
  await guest.waitForFunction(()=>document.documentElement.dataset.ph==='intro');
  const pid=await guest.evaluate(()=>localStorage.getItem('mz_pid'));
  await guest.evaluate(()=>sessionStorage.clear());await guest.reload();
  await guest.waitForFunction(()=>['intro','vote'].includes(document.documentElement.dataset.ph));
  assert.equal(await guest.evaluate(()=>localStorage.getItem('mz_pid')),pid);
  assert.equal(guest.url(),home);
  // Full cloud invitations keep working in the same bundled WebView.
  const linked=await apk();await linked.goto(home+'#'+room.code+'-'+room.secret);
  await linked.locator('#name').fill('Kasni');await linked.locator('#form button[type=submit]').click();
  await linked.locator('.err').filter({hasText:'Igra je već počela'}).waitFor();
  assert(hellos.some(m=>m.name==='Kasni'&&m.secret===room.secret));
  assert.deepEqual(errors,[]);
  console.log('Bundled APK assets: fixed service/CSP/CORS, fresh code join, native resume, process recreation recovery, full invite, no external navigation');
 } finally {for(const ws of upstreams)ws.terminate();if(browser)await browser.close();await fs.rm(assets,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});

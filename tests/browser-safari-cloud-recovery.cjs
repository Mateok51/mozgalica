// Real app/transport in a browser engine; a deterministic authenticated server
// fixture simulates Safari retaining an OPEN but unresponsive WebSocket.
// This does not emulate iOS process suspension or its QR camera browser context.
const pw=require('playwright'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const browserName=process.env.BROWSER||'chromium',root=path.join(__dirname,'..');
const origin='http://127.0.0.1:8787',secret='a'.repeat(22),room='ABCD';
const box=vm.createContext({setTimeout,clearTimeout});vm.runInContext(require('./engine-source.cjs')+';this.make=createGame;',box);
const game=box.make({code:room,noTv:true});game.addPlayer('host','Domaćin',0,false,false);
const keys=new Map(),connections=[],errors=[];let joins=0, silentHandshakes=false;
function view(who){return{...game.view(),pv:game.priv(who.pid),cloud:{owner:false,noTv:true}};}
function push(){for(const c of connections)if(!c.silent&&c.who)try{c.socket.send(JSON.stringify(view(c.who)));}catch{}}
const wait=async(fn,message)=>{const end=Date.now()+12000;while(Date.now()<end){if(fn())return;await new Promise(r=>setTimeout(r,40));}throw Error(message);};
(async()=>{
 const browser=await pw[browserName].launch(browserName==='chromium'?{executablePath:process.env.CHROMIUM_PATH,args:['--no-sandbox']}:{});
 try{
  const context=await browser.newContext({viewport:{width:390,height:664},hasTouch:true});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  // Capture the real transport admission callback so temporary unavailability
  // can be tested deterministically without sleeping for 30 seconds.
  await page.addInitScript(()=>{
   const timer=window.setTimeout;
   window.setTimeout=function(fn,ms,...args){
    if(ms===30000)window.__fireCloudAdmission=()=>fn(...args);
    return timer(fn,ms,...args);
   };
  });
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());if(u.origin!==origin)return route.abort();
   if(u.pathname==='/runtime-config.js')return route.fulfill({body:'globalThis.TAVERN_CLOUD={apiOrigin:location.origin,publicUrl:location.origin+"/"};',contentType:'application/javascript'});
   if(u.pathname.endsWith('peerjs.min.js'))return route.abort();
   const file=path.join(root,u.pathname==='/'?'index.html':u.pathname.slice(1));
   return fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':undefined}):route.abort();
  });
  await page.routeWebSocket('**/api/rooms/ABCD',socket=>{
   const connection={socket,who:null,silent:false};connections.push(connection);
   socket.onMessage(raw=>{
    if(connection.silent)return;
    const m=JSON.parse(raw);
    if(m.t==='hello'){
     if(silentHandshakes)return;
     if(m.secret!==secret||(keys.has(m.pid)&&keys.get(m.pid)!==m.sk))return socket.send(JSON.stringify({t:'error',reason:'auth'}));
     if(!game._p(m.pid)&&game.view().ph!=='lobby')return socket.send(JSON.stringify({t:'error',reason:'started'}));
     keys.set(m.pid,m.sk);connection.who=m;joins++;
     if(!game._p(m.pid))game.addPlayer(m.pid,m.name,m.av,false,false);
     socket.send(JSON.stringify(view(m)));
    }else if(m.t==='ping'&&connection.who)socket.send(JSON.stringify(view(connection.who)));
   });
  });
  await page.goto(origin+'/#'+room+'-'+secret);
  await page.locator('#name').fill('Ana');await page.locator('#form button[type=submit]').click();
  await page.locator('.lob-row').nth(1).waitFor();
  const before=await page.evaluate(()=>({pid:localStorage.getItem('mz_pid'),sk:localStorage.getItem('mz_sk_v2'),saved:JSON.parse(localStorage.getItem('mz_cloud_resume_v1'))}));
  assert(before.saved&&before.saved.pid===before.pid);assert.equal(keys.get(before.pid),before.sk);
  Object.assign(game._G,{ph:'fq',s:100,inFinale:true,q:{c:'Piramida',t:'Mjesec odbija Sunčevu svjetlost.',o:['Točno','Netočno'],a:0},dur:30000,endsAt:Date.now()+30000,ev:[]});
  push();await page.waitForFunction(()=>document.documentElement.dataset.ph==='fq');
  const old=connections.at(-1);old.silent=true;const previousJoins=joins;
  await page.evaluate(()=>window.dispatchEvent(new Event('pageshow')));
  await wait(()=>joins>previousJoins,'A retained OPEN connection never recovered after the resume probe');
  await page.waitForFunction(()=>document.documentElement.dataset.ph==='fq'&&!document.body.innerText.includes('Ponovno se povezujem'));
  assert.equal(game.view().P.filter(p=>p.id===before.pid).length,1);assert.equal(keys.get(before.pid),before.sk);
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ph==='fq');
  const after=await page.evaluate(()=>({pid:localStorage.getItem('mz_pid'),sk:localStorage.getItem('mz_sk_v2'),saved:JSON.parse(localStorage.getItem('mz_cloud_resume_v1'))}));
  assert.equal(after.pid,before.pid);assert.equal(after.sk,before.sk);assert.equal(after.saved.code,room);assert.equal(game.view().P.length,2);
  silentHandshakes=true;for(const connection of connections)connection.silent=true;
  await page.reload();await page.waitForFunction(()=>typeof window.__fireCloudAdmission==='function');
  const confirmedRecord=await page.evaluate(()=>localStorage.getItem('mz_cloud_resume_v1'));
  await page.evaluate(()=>window.__fireCloudAdmission());
  await page.locator('.err').filter({hasText:'Ne mogu se spojiti'}).waitFor();
  assert.equal(await page.evaluate(()=>localStorage.getItem('mz_cloud_resume_v1')),confirmedRecord,
   'A temporary admission timeout must retain the last confirmed recovery record');
  silentHandshakes=false;await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await page.waitForFunction(()=>document.documentElement.dataset.ph==='fq');
  assert.equal(await page.evaluate(()=>localStorage.getItem('mz_pid')),before.pid);
  assert.equal(await page.evaluate(()=>localStorage.getItem('mz_sk_v2')),before.sk);
  assert.equal(game.view().P.length,2,'Restoring after unavailable must reuse the existing player');
  await page.evaluate(()=>history.replaceState(null,'',location.pathname+'#abcd-'+location.hash.slice(6)));
  await page.reload();await page.waitForFunction(()=>document.documentElement.dataset.ph==='fq');
  assert.equal(game.view().P.length,2,'QR code case cannot create another player');

  assert.equal(errors.length,0,errors.join('; '));
  console.log(`${browserName}: full QR invitation, lost OPEN channel resume, same-phase Pyramid state, reload identity, unavailable→online restore, lower-case invitation and no duplicate player passed (authenticated server fixture).`);
 }finally{game.stop();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});

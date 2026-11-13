// Browser checks for actual invite controls, pending receipt and privacy-safe export.
const {chromium}=require('playwright');
const fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
let html=require('./page-source.cjs');
html=html.replace('  setInterval(tick, 100);','  setInterval(tick, 100); window.testUI=d=>{mode="player";applyState(d);}; window.testHost=d=>{mode="hostp";HOST_RS="a".repeat(22);game={view:()=>d,setOpt(){},setBots(){},start(){}};applyState(d);};');
html=html.replace('function netSend(m) {','function netSend(m) { window.testPackets=(window.testPackets||[]).concat([m]);');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(x=>x.trim());
const hashes=html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g);
hashes.forEach((h,i)=>html=html.replace(h,'sha256-'+crypto.createHash('sha256').update(scripts[i]).digest('base64')));
function state(){
 const box=vm.createContext({setTimeout,clearTimeout});vm.runInContext(require('./engine-source.cjs')+';this.g=createGame({code:"SECR",noTv:true});',box);
 box.g.addPlayer('one','Private Name',0,false,true);box.g.addPlayer('two','Another Name',1,false);
 const d=JSON.parse(JSON.stringify(box.g.view()));box.g.stop();
 Object.assign(d,{ph:'question',s:5,ms:20000,dur:20000,q:{c:'Test',t:'Secret Question',o:['Secret Answer','B','C','D']},ev:[]});return d;
}
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
 const ctx=await browser.newContext({viewport:{width:360,height:668},hasTouch:true});const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{localStorage.setItem('mz_pid','one');Object.defineProperty(navigator,'share',{value:undefined,configurable:true});Object.defineProperty(navigator,'clipboard',{value:{writeText:async text=>{window.testClipboard=text;}},configurable:true});});
 await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='game.test')return r.abort();const f=path.join(root,u.pathname.slice(1));return u.pathname==='/'?r.fulfill({body:html,contentType:'text/html'}):fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f)}):r.abort();});

 async function checkDialog(selector, buttons, screenshot) {
  for (const [width,height] of [[375,553],[360,668]]) {
   await page.setViewportSize({width,height});await page.waitForTimeout(400);
   const modal=page.locator(selector),card=modal.locator('.inv-card');
   assert(await modal.isVisible(),selector+' is visible');
   const outer=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,w:innerWidth,h:innerHeight}));
   assert(outer.width<=outer.w+2,selector+' outer horizontal overflow');
   assert(outer.height<=outer.h+3,selector+' outer vertical overflow');
   const panel=await card.evaluate(e=>({height:e.clientHeight,scroll:e.scrollHeight,overflow:getComputedStyle(e).overflowY}));
   if(panel.scroll>panel.height+2)assert(['auto','scroll'].includes(panel.overflow),selector+' overflow must stay inside its card');
   for(const id of buttons){const button=page.locator(id);await button.scrollIntoViewIfNeeded();const b=await button.boundingBox();assert(b&&b.x>=0&&b.y>=0&&b.x+b.width<=width+1&&b.y+b.height<=height+1,id+' is reachable on '+width+'x'+height);}
   console.log('PASS dialog layout',selector,width+'x'+height,panel.scroll>panel.height+2?'inner scroll':'fits');
  }
  if(process.env.TRIVIA_SCREENSHOTS)await page.screenshot({path:screenshot});
 }
 await page.goto('http://game.test/');
 await page.locator('#homeDiagnostics').click();assert(await page.locator('#diagModal').isVisible());await checkDialog('#diagModal',['#diagExport','#diagClose'],'/tmp/trivia-v78-diag.png');await page.locator('#diagClose').click();
 const d=state();await page.evaluate(d=>testUI(d),d);await page.locator('[data-c="0"]').click();
 assert.equal(await page.locator('#answerReceipt').innerText(),'Šaljem odgovor…');
 await page.waitForTimeout(3300);assert.equal(await page.locator('#answerReceipt').innerText(),'Odgovor još nije potvrđen.');assert((await page.evaluate(()=>window.testPackets.length))>=2);
 d.P[0].ok=1;await page.evaluate(d=>testUI(d),d);assert.match(await page.locator('#answerReceipt').innerText(),/Odgovor zaprimljen/);
 await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.locator('#connectionDiagnostics').click();
 const download=page.waitForEvent('download');await page.locator('#diagExport').click();const file=await download;const text=fs.readFileSync(await file.path(),'utf8');
 const report=JSON.parse(text);assert(report.events.some(e=>e.type==='answer_sent'));assert(report.events.some(e=>e.type==='answer_confirmed'));
 for(const secret of ['SECR','Private Name','Secret Question','Secret Answer','mz_sk','mz_pid','https://'])assert(!text.includes(secret),secret+' leaked');
 await page.locator('#diagClose').click();
 d.ph='lobby';d.s=6;await page.evaluate(d=>testHost(d),d);await page.locator('#lobInv').click();await checkDialog('#invModal',['#shareInvite','#invClose'],'/tmp/trivia-v78-invite.png');await page.locator('#shareInvite').click();
 assert.match(await page.locator('#shareNotice').innerText(),/kopirana/);assert.equal(await page.evaluate(()=>window.testClipboard),'http://game.test/#SECR-'+'a'.repeat(22));
 await page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw Error('permission denied');};});
 await page.locator('#shareInvite').click();assert(await page.locator('#inviteLink').isVisible());assert.equal(await page.locator('#inviteLink').inputValue(),'http://game.test/#SECR-'+'a'.repeat(22));
 await page.locator('#invClose').click();
 await page.evaluate(()=>{const channel=new MessageChannel();window.nativeCommands=[];channel.port1.onmessage=e=>window.nativeCommands.push(e.data);window.postMessage('trivia-native-connect','*',[channel.port2]);});
 await page.locator('#lobSettings').click();await page.locator('#lobbyDiagnostics').click();await page.locator('#diagExport').click();
 await page.waitForFunction(()=>window.nativeCommands.some(s=>s.startsWith('{')));
 const command=await page.evaluate(()=>JSON.parse(window.nativeCommands.find(s=>s.startsWith('{'))));assert.equal(command.type,'export-diagnostics');assert.equal(typeof command.report,'string');assert.equal(JSON.parse(command.report).environment,'android');
 for(const secret of ['SECR','Private Name','Secret Question','Secret Answer','https://'])assert(!command.report.includes(secret));
 await page.locator('#diagClose').click();assert.deepEqual(errors,[]);
 console.log('PASS pending/confirmed receipts, bounded retry, diagnostics export privacy and invitation clipboard fallback');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
(async()=>{
const browser=await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
const page=await browser.newPage();
const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('dialog',d=>d.accept());
await page.route('**/*',async route=>{
 const u=new URL(route.request().url());
 if(u.hostname!=='game.test') return route.abort();
 const file=path.join(__dirname, '..')+'/'+(u.pathname==='/'?'index.html':u.pathname.slice(1));
 if(!fs.existsSync(file)) return route.abort();
 return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'text/javascript':'image/png'});
});
await page.addInitScript(()=>{ window.Peer=class {
 constructor(){this.handlers={};this.destroyed=false;this.disconnected=false;setTimeout(()=>this.handlers.open?.(),10);}
 on(e,fn){const old=this.handlers[e];this.handlers[e]=(...args)=>{old?.(...args);fn(...args);};} destroy(){this.destroyed=true;} reconnect(){} };
});
await page.goto('http://game.test/');
await page.locator('#hostp').click(); await page.locator('#hname').fill('Ana'); await page.locator('#hform button[type=submit]').click();
await page.waitForTimeout(400);
await page.locator('#lobSettings').click();
await page.locator('[data-bots="1"]').click();
await page.locator('#dstart').click();
await page.waitForTimeout(100);
const saved=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('mz_recovery_v1')));
if(!saved) throw Error('No saved game');
await page.reload();await page.waitForFunction(()=>!document.body.innerText.includes('Spajam se…'),null,{timeout:8000}).catch(()=>{});await page.waitForTimeout(200);
const after=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('mz_recovery_v1')));
if(after.code!==saved.code) throw Error('Room changed');
if(!after.journal.events.some(e=>e.method==='addPlayer' && e.args[1]==='Ana')) throw Error('Player missing');
if((await page.locator('body').innerText()).includes('Spajam se…')) throw Error('Stuck connecting');
if(!after.journal.events.some(e=>e.method==='start')) throw Error('Active game not restored');
if(errors.length) throw Error(errors.join('; '));
console.log('Browser reload recovered active game, room and player without script errors');await browser.close();
})();

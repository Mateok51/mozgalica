const { chromium } = require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();const page=await (await b.newContext({viewport:{width:390,height:844}})).newPage();
page.on('pageerror',e=>console.log('ERR',e.message));page.on('console',m=>{if(m.type()==='error')console.log('CON',m.text().slice(0,160))});
await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, r=>r.abort());
await page.goto('file://'+path.resolve('web/site/_out-fit-lobby.html'));await page.waitForTimeout(1500);
console.log(await page.evaluate(()=>document.body.innerText.slice(0,200)), !!document.getElementById('demo'));await b.close();})();

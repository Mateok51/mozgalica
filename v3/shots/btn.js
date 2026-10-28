const { chromium } = require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:360,height:420}});const page=await ctx.newPage();
await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, r=>r.abort());
await page.goto('file://'+path.resolve('v3/shots/out-tie.html'));await page.click('#demo');await page.waitForTimeout(250);
await page.evaluate(()=>{document.getElementById('app').innerHTML='<div style="padding:12px"><div class="sf-sec kr-ally"><div class="sf-ally"><span class="mini"></span><span>🍻 <b>Ana</b></span><span class="sf-tre">💰 <b>100</b></span></div><button class="sf-link sf-btask">🗡️ Pripremi izdaju</button></div></div>';});
await page.screenshot({path:'v3/shots/btn.png'});await b.close();})();

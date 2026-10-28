const { chromium } = require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:720}});const page=await ctx.newPage();
await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, r=>r.abort());
await page.goto('file://'+path.resolve('web/site/index.html'));await page.waitForTimeout(9000);
await page.screenshot({path:'v3/shots/amb-fire.png',clip:{x:0,y:120,width:420,height:480}});await b.close();})();

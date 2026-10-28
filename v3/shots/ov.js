const { chromium } = require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();const page=await (await b.newContext()).newPage();
await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, r=>r.abort());
await page.goto('file://'+path.resolve('web/site/index.html'));
console.log(await page.evaluate(()=>[getComputedStyle(document.documentElement).overscrollBehaviorY,getComputedStyle(document.body).overscrollBehaviorY]));await b.close();})();

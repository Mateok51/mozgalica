const { chromium } = require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:1280,height:720}});const page=await ctx.newPage();
await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, r=>r.abort());
await page.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});});await page.goto('file://'+path.resolve('web/site/index.html'));
for(const t of [3000,3000,3000]){await page.waitForTimeout(t);
const r=await page.evaluate(()=>{const c=document.getElementById('ambient'),g=c.getContext('2d'),W=c.width,H=c.height;const d=g.getImageData(0,0,Math.round(W*0.25),H).data;let n=0,mx=0;for(let i=0;i<d.length;i+=4){if(d[i]>150&&d[i+2]<110&&d[i+3]>60){n++;}}return {W,H,emberPx:n}});console.log(JSON.stringify(r));}
await b.close();})();

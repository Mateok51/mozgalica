const { chromium } = require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:360,height:740}});const page=await ctx.newPage();
await page.addInitScript(()=>{Object.defineProperty(navigator,'hardwareConcurrency',{get:()=>8});});
await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, r=>r.abort());
await page.goto('file://'+path.resolve('web/site/index.html'));
const samp=()=>page.evaluate(()=>{const c=document.getElementById('ambient'),g=c.getContext('2d'),W=c.width,H=c.height,d=g.getImageData(0,0,W,H).data;let sx=0,sy=0,n=0;for(let y=0;y<H;y+=4)for(let x=0;x<W;x+=4){const a=d[(y*W+x)*4+3];if(a>0&&a<40){sx+=x*a;sy+=y*a;n+=a;}}return [Math.round(sx/n),Math.round(sy/n),n]});
const a=await samp();await page.waitForTimeout(12000);const c=await samp();console.log(JSON.stringify(a),JSON.stringify(c));await b.close();})();

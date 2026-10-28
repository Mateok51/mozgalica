const { chromium } = require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();const page=await (await b.newContext({viewport:{width:360,height:780},hasTouch:true})).newPage();
await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, r=>r.abort());
let h=require('fs').readFileSync('v3/out.html','utf8');h=h.replace("let S = null, lastSig = '';","let S = null, lastSig = ''; window.__t={game:()=>game};");require('fs').writeFileSync('v3/shots/out-lob.html',h);
await page.goto('file://'+path.resolve('v3/shots/out-lob.html'));await page.click('#demo');await page.waitForTimeout(300);await page.click('[data-av]:not([disabled])');await page.waitForTimeout(200);
await page.evaluate(()=>window.__t.game().setBots(5));await page.waitForTimeout(600);
console.log(await page.evaluate(()=>{const o=[];const walk=(e,d)=>{if(d>3)return;for(const c of e.children){const r=c.getBoundingClientRect();o.push('  '.repeat(d)+c.tagName.toLowerCase()+'.'+String(c.className).slice(0,40)+' top='+Math.round(r.top)+' h='+Math.round(r.height));walk(c,d+1)}};walk(document.getElementById('app'),0);return o.join('\n')}));await b.close();})();

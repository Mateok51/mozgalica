const { chromium } = require('playwright'); const path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:360,height:740},hasTouch:true});const page=await ctx.newPage();
page.on('pageerror',e=>console.log('ERR',e.message));
await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, r=>r.abort());
await page.goto('file://'+path.resolve('v3/shots/out-pick.html'));await page.click('#demo');await page.waitForTimeout(250);await page.click('[data-av]:not([disabled])');await page.waitForTimeout(150);
const r=await page.evaluate(()=>{const g=__t.game(),v=g.view();return {pid:__t.pid(),ids:v.P.map(p=>[p.id,p.ok,p.pa,p.vt]),fin:v.fin,ph:v.ph}});
console.log(JSON.stringify(r));
await page.evaluate(()=>{window.__mode='free';const game=__t.game(),real=game.view.bind(game);game.view=()=>{const v=real();const P=v.P.map(p=>Object.assign({},p,{pa:1,vt:undefined}));return Object.assign(v,{ph:'vote',s:555,ntv:false,cats:['A','B','C','D'],P});};__t.S(game.view());__t.L(__t.fresh(555));__t.render();});
console.log(await page.evaluate(()=>document.getElementById('app').innerText.slice(0,200)), await page.evaluate(()=>!!document.getElementById('ppBtn')));await b.close();})();

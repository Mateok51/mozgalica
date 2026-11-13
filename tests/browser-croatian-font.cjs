// Real glyph raster regression: a Croatian crossbar must be in the letter, not an overbar.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try {
  const page=await browser.newPage({viewport:{width:360,height:780}});
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='game.test')return r.abort();const f=path.join(root,u.pathname==='/'?'index.html':u.pathname.slice(1));return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':undefined}):r.abort();});
  await page.goto('http://game.test/#TEST');
  const result=await page.evaluate(async()=>{
   await document.fonts.load('800 96px Cinzel','DdĐđČčĆćŠšŽž');await document.fonts.ready;
   const c=document.createElement('canvas');c.width=180;c.height=180;const ctx=c.getContext('2d');ctx.font='800 96px Cinzel';ctx.fillStyle='#fff';
   const pixels=ch=>{ctx.clearRect(0,0,180,180);ctx.fillText(ch,20,140);return Array.from(ctx.getImageData(0,0,180,180).data).filter((_,i)=>i%4===3);};
   const pairs=[];
   for(const [plain,croat] of [['D','Đ'],['d','đ']]){
    const a=ctx.measureText(plain),b=ctx.measureText(croat),p=pixels(plain),q=pixels(croat);let added=0,addedY=0;
    q.forEach((v,i)=>{if(v>p[i]+30){added++;addedY+=Math.floor(i/180);}});
    pairs.push({plain,croat,widthDelta:b.width-a.width,ascentDelta:b.actualBoundingBoxAscent-a.actualBoundingBoxAscent,added,meanAddedY:addedY/added,baseline:140,height:a.actualBoundingBoxAscent});
   }
   const accents=[];
   for(const [plain,accent] of [['C','Č'],['c','č'],['C','Ć'],['c','ć'],['S','Š'],['s','š'],['Z','Ž'],['z','ž']]){
    const a=pixels(plain),b=pixels(accent);accents.push({accent,difference:a.reduce((n,v,i)=>n+(Math.abs(v-b[i])>30?1:0),0)});
   }
   return {pairs,accents};
  });
  for(const p of result.pairs){
   assert(Math.abs(p.widthDelta)<.1,p.croat+' must preserve advance width');
   assert(Math.abs(p.ascentDelta)<=1,p.croat+' must not have an overbar above the letter');
   assert(p.added>4,p.croat+' must have visible extra stroke ink');
   const fromTop=(p.meanAddedY-(p.baseline-p.height))/p.height;
   assert(fromTop>.25&&fromTop<.75,p.croat+' extra ink must be a middle crossbar, got '+fromTop);
  }
  for(const a of result.accents)assert(a.difference>4,a.accent+' must retain its visible accent');
  console.log('PASS Croatian Đ/đ middle crossbars, preserved widths and all čćšž accents');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

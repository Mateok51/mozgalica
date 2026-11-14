// Real layout coverage for the expanded staircase, in Chromium and WebKit.
const pw=require('playwright'),fs=require('node:fs'),vm=require('node:vm');
const crypto=require('node:crypto'),path=require('node:path'),assert=require('node:assert/strict');
const ENGINE=process.env.BROWSER||'chromium',root=path.join(__dirname,'..');
let html=require('./page-source.cjs');
html=html.replace('  setInterval(tick, 100);','  setInterval(tick, 100);window.testPyramid=(d,tv)=>{if(tv){mode="host";S=d;tvV(d);}else{mode="player";applyState(d);}};');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(x=>x.trim());
(html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g)||[]).forEach((h,i)=>html=html.replace(h,'sha256-'+crypto.createHash('sha256').update(scripts[i]).digest('base64')));
const box=vm.createContext({setTimeout,clearTimeout});
vm.runInContext(require('./engine-source.cjs')+';this.game=createGame({code:"TEST",noTv:true});',box);
for(let i=0;i<6;i++)box.game.addPlayer('p'+i,'DugoIme123'+i,i,false);
let seq=100;
function state(ph,positions,{legacy=false,double=false,crown=false,tvPhone=false}={}){
 Object.assign(box.game._G,{ph,s:++seq,inFinale:true,q:{c:'Piramida',t:'Mjesec nema vlastitu svjetlost, nego odbija Sunčevu.',o:crown?['Prvi odgovor','Drugi odgovor','Treći odgovor','Četvrti odgovor']:['Točno','Netočno'],a:0,crown},dur:14000,endsAt:Date.now()+2000,ev:[]});
 const d=JSON.parse(JSON.stringify(box.game.view()));
 d.pyrRules=legacy?1:2;d.steps=legacy?8:13;d.req=legacy?[1,1,1,2,2,2,2]:Array(12).fill(1);d.ftop=legacy?11:12;
 d.readyIntro=ph==='fstart';d.fin=1;d.ms=ph==='fq'?20000:2000;d.dur=ph==='fq'?20000:14000;d.cor=0;
 if(tvPhone){d.ntv=0;d.tvq=1;}
 d.P.forEach((p,i)=>Object.assign(p,{st:positions[i],fs:positions[i],fu:positions[i],fr:1,fp:0,fsc:10000+i*1000,sc:10000+i*1000,mv:ph==='fr'?1:0,ch:0,ug:1,ok:false,top:positions[i]===d.steps-1?1:undefined,d:i===0&&double?1:0}));
 return d;
}
const screens=[['narrow',320,553,false],['SE',375,553,false],['iPhone',390,664,false],['Samsung',360,668,false],['Xiaomi',393,740,false],['small-TV',960,540,true],['TV',1280,720,true],['wide-TV',1920,1080,true]];
(async()=>{
 const browser=await pw[ENGINE].launch(ENGINE==='chromium'?{executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']}:{});
 try {
  for(const [name,width,height,tv]of screens.filter(s=>!process.env.PYRAMID_SCREEN||s[0]===process.env.PYRAMID_SCREEN)){
   const context=await browser.newContext({viewport:{width,height},hasTouch:!tv});
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>localStorage.setItem('mz_pid','p0'));
   await page.route('**/*',route=>{const u=new URL(route.request().url());if(u.hostname!=='game.test')return route.abort();const file=path.join(root,u.pathname.slice(1));return u.pathname==='/'?route.fulfill({body:html,contentType:'text/html'}):fs.existsSync(file)&&fs.statSync(file).isFile()?route.fulfill({body:fs.readFileSync(file)}):route.abort();});
   await page.goto('http://game.test/');await page.evaluate(()=>document.fonts.ready);
   let spriteSize;
   for(const [ph,positions,options]of [
    ['fstart',[1,2,3,4,5,6],{}],['fr',[5,6,7,8,9,10],{}],
    ['fstart',[6,6,6,6,6,6],{}],['fr',[12,12,12,12,12,12],{crown:true}],
    ['fr',[13,12,11,10,9,8],{crown:true}],
    ['fq',[1,2,3,4,5,6],{}],['fq',[1,2,3,4,5,6],{double:true}],
    ['fq',[12,11,10,9,8,7],{crown:true}],
    ...(tv?[['power',[1,2,3,4,5,6],{}]]:[]),
    ...(!tv?[['fr',[5,6,7,8,9,10],{tvPhone:true}]]:[]),
   ]){
    const d=state(ph,positions,options);await page.evaluate(([d,tv])=>testPyramid(d,tv),[d,tv]);await page.waitForTimeout(250);
    const m=await page.evaluate(()=>{
     const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};
     const pyramid=document.querySelector('#app .pyramid'),controls=[...document.querySelectorAll('#mute,#music')].map(rect);
     const buttons=[...document.querySelectorAll('#app button')].filter(e=>!e.closest('.q-area')&&e.getBoundingClientRect().width>0).map(rect);
     return{zoom:+document.querySelector('#app').style.zoom||1,scroll:document.documentElement.scrollHeight>innerHeight+1,wide:document.documentElement.scrollWidth>innerWidth+1,rows:pyramid?.querySelectorAll('.pstep').length,figures:pyramid?[...pyramid.querySelectorAll('.climber')].map(rect):[],controls,buttons,prog:document.querySelector('.fin-prog')?.textContent,note:document.querySelector('.fin-note')?.textContent,text:document.querySelector('#app').textContent};
    });
    assert(!m.scroll&&!m.wide,`${name} ${ph}: page overflow`);
    assert(!m.text.includes('13/12'),`${name} ${ph}: the won crown must not look like an extra numbered step`);
    if(m.zoom<.995){await page.screenshot({path:`/tmp/trivia-expanded-pyramid-${ENGINE}-${name}-overflow.png`});console.log(await page.evaluate(()=>{const a=document.querySelector('#app');a.style.zoom=1;const r=e=>({class:e.className,height:e.getBoundingClientRect().height,width:e.getBoundingClientRect().width});return{app:r(a),top:r(document.querySelector('#mute')),kids:[...a.children].map(r),mid:[...document.querySelectorAll('.tv-mid > *')].map(r)};}));}
    assert(m.zoom>=.995,`${name} ${ph}: entire screen shrank to ${m.zoom}`);
    for(const b of m.buttons){assert(b.y>=0&&b.bottom<=height+1,`${name} ${ph}: control off screen`);assert(!m.controls.some(c=>b.x<c.right&&b.right>c.x&&b.y<c.bottom&&b.bottom>c.y),`${name} ${ph}: control under audio`);}
    if((ph!=='fq'||tv)&&!options.tvPhone){
     assert.equal(m.rows,14,`${name} ${ph}: full twelve-step pyramid plus base/crown`);
     assert.equal(m.figures.length,6,`${name} ${ph}: every player is present`);
     for(const f of m.figures){assert(f.x>=-1&&f.right<=width+1&&f.y>=0&&f.bottom<=height+1,`${name} ${ph}: player is clipped`);assert(f.w>=37,`${name} ${ph}: character too small (${f.w})`);}
     for(let i=0;i<m.figures.length;i++)for(let j=i+1;j<m.figures.length;j++){
      const a=m.figures[i],b=m.figures[j],x=Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x)),y=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
      assert(x*y<Math.min(a.w*a.h,b.w*b.h)*.08,`${name} ${ph}: players overlap (${i},${j})`);
     }
     if(spriteSize===undefined)spriteSize=m.figures[0].w;
     assert(Math.abs(m.figures[0].w-spriteSize)<1,`${name} ${ph}: character size changed between phases`);
    }
    if(!tv&&ph==='fq'&&!options.crown)assert.match(m.prog,options.double?/Stepenica 1\/12 · točno \+2/:/Stepenica 1\/12 · točno \+1/);
    if(!tv&&ph==='fr'&&!options.crown){assert.match(m.note,/\+1 stepenica/);assert.match(m.note,/sada 5\. stepenica/);}
    if(options.tvPhone)assert.equal(await page.locator('#app .step-meter i:not(.crown)').count(),12,`${name}: all twelve TV-phone progress marks`);
    assert(!/najbrži \+1|svaki 3\. zaredom|Od 4\. stepenice/.test(m.text),`${name} ${ph}: old movement instructions`);
    if(tv&&ph==='power')assert(await page.locator('#app .pw-mini > div').evaluateAll(es=>es.every(e=>e.scrollHeight<=e.clientHeight+1)),`${name}: power descriptions are clipped`);
    if((ph==='fr'||ph==='fstart')&&!options.crown&&!options.tvPhone)await page.screenshot({path:`/tmp/trivia-expanded-pyramid-${ENGINE}-${name}-${ph}.png`});
    assert.deepEqual(errors,[],`${name} ${ph}: script errors`);
   }
   // Saved legacy rooms retain their old staircase and movement vocabulary.
   const legacy=state('fstart',[0,1,2,3,4,5],{legacy:true});
   await page.evaluate(([d,tv])=>testPyramid(d,tv),[legacy,tv]);await page.waitForTimeout(200);
   // The outgoing, aria-hidden transition snapshot can remain outside #app for 260ms.
   assert.equal(await page.locator('#app .pyramid .pstep').count(),9);
   assert.equal(await page.locator('#app .pyramid.expanded').count(),0);
   console.log(ENGINE,name,`${width}x${height}: expanded intro/question/result/crown, six-player spacing and legacy room`);
   await context.close();
  }
 }finally{await browser.close();box.game.stop();}
})().catch(error=>{console.error(error);process.exitCode=1;});

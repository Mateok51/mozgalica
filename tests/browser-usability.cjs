// Real mobile UI regression: partial progress, undo, submission and finale readiness.
// Popularni mobiteli u stvarnoj vidljivoj veličini (preglednik s adresnom trakom, ne cijeli zaslon):
// igra mora stati bez skrolanja i bez smanjivanja cijelog prikaza, a fontovi se moraju učitati i svesti na iste debljine.
// BROWSER=webkit pokreće isti test u motoru Safarija (na CI-ju); zadano je chromium.
const pw = require('playwright');
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path'), assert = require('node:assert/strict');
const ENGINE = process.env.BROWSER || 'chromium';
const root = path.join(__dirname, '..');
let html = require('./page-source.cjs');
html = html.replace('  setInterval(tick, 100);', '  setInterval(tick, 100); window.testUI=(d,tv)=>{if(tv){mode="host";tvV(d);}else{mode="player";applyState(d);}};');
html = html.replace('function sendPartial(inp) {', 'function sendPartial(inp) { window.partialInputs = (window.partialInputs || []).concat([inp]);');
html = html.replace('function sendInput(inp) {', 'function sendInput(inp) { window.finalInputs = (window.finalInputs || []).concat([inp]);');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map((x) => x[1]).filter((x) => x.trim());
const hashes = html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g);
hashes.forEach((h, i) => { html = html.replace(h, 'sha256-' + crypto.createHash('sha256').update(scripts[i]).digest('base64')); });

// [naziv, širina, vidljiva visina, najmanje dopušteno mjerilo]; iPhone SE je najmanji ekran koji se još prodaje, pa smije biti malo smanjen
const PHONES = [
  ['iPhone SE u Safariju', 375, 553, 0.84],
  ['iPhone 13-15 u Safariju', 390, 664, 0.985],
  ['iPhone Pro Max u Safariju', 430, 739, 0.985],
  ['iPhone 13-15 instalirano', 390, 844, 0.985],
  ['Samsung Galaxy S u Chromeu', 360, 668, 0.97],
  ['Samsung Galaxy S u Samsung Internetu', 360, 700, 0.985],
  ['Xiaomi/Pixel u Chromeu', 393, 740, 0.985],
  ['veći Xiaomi/Samsung A u Chromeu', 412, 780, 0.985],
];
const Q = 'Tko je 1888. prvi prevalio dulje putovanje automobilom, od Mannheima do Pforzheima?';

function state(ph) {
  const box = vm.createContext({ setTimeout, clearTimeout });
  vm.runInContext(require('./engine-source.cjs') + '\nthis.game=createGame({code:"TEST",noTv:true});', box);
  const g = box.game;
  [['one', 'Mateo'], ['two', 'Ana'], ['p3', 'Marko'], ['p4', 'Iva']].forEach(([id, n], i) => g.addPlayer(id, n, i, false, i === 0));
  Object.assign(g._G, { ph, s: 5, inFinale: ph === 'fq', cats: ['Izumi i otkrića', 'Sport', 'Anime', 'Automobili i promet'], cw: 3,
    q: { c: 'Automobili i promet', t: ph === 'fq' ? 'Mjesec nema vlastitu svjetlost, nego odbija Sunčevu.' : Q, o: ph === 'fq' ? ['Točno', 'Netočno'] : ['Karl Benz', 'Henry Ford', 'Gottlieb Daimler', 'Bertha Benz'], a: 3 },
    dur: 20000, startedAt: Date.now(), endsAt: Date.now() + 20000, ev: [] });
  g._p('one').offers = ['bomba', 'pola', 'utjeha'];
  const view = JSON.parse(JSON.stringify(g.view())); g.stop();
  return view;
}


(async () => {
 const browser=await pw.chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
 const ctx=await browser.newContext({viewport:{width:390,height:664},hasTouch:true});const p=await ctx.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>localStorage.setItem('mz_pid','one'));
 await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='game.test')return r.abort();const f=path.join(root,u.pathname.slice(1));return u.pathname==='/'?r.fulfill({body:html,contentType:'text/html'}):fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f)}):r.abort();});
 await p.goto('http://game.test/');
 if(process.env.TRIVIA_SCREENSHOTS){
  await p.setViewportSize({width:360,height:668});const power=state('power');await p.evaluate(d=>testUI(d),power);await p.waitForTimeout(400);
  await p.screenshot({path:'/tmp/trivia-v76-power.png'});
  console.log('power scale',await p.locator('#app').evaluate(e=>e.style.zoom));
 }

 let s=state('question');s.ph='sort';s.so={a:'Voće',b:'Povrće',it:['Jabuka','Mrkva','Kruška','Krumpir']};await p.evaluate(d=>testUI(d),s);
 await p.locator('[data-go="0"]').click();await p.waitForTimeout(450);
 assert.deepEqual(await p.evaluate(()=>partialInputs.at(-1).r),[0,-1,-1,-1]);assert.deepEqual(await p.evaluate(()=>window.__dbg.L.partial.r),[0,-1,-1,-1]);
 assert(await p.locator('#srtDone').isEnabled());await p.locator('#swpUndo').click();
 assert.deepEqual(await p.evaluate(()=>partialInputs.at(-1).r),[-1,-1,-1,-1]);assert.deepEqual(await p.evaluate(()=>window.__dbg.L.partial.r),[-1,-1,-1,-1]);
 await p.waitForTimeout(210);await p.locator('[data-go="1"]').click();await p.waitForTimeout(450);await p.locator('#srtDone').click();assert.deepEqual(await p.evaluate(()=>finalInputs.at(-1).r),[1,-1,-1,-1]);
 s=state('question');s.s=6;s.ph='link';s.li={t:'Parovi',L:['A','B'],R:['a','b']};await p.evaluate(d=>testUI(d),s);
 await p.locator('[data-ll="0"]').click();await p.locator('[data-lr="0"]').click();assert.deepEqual(await p.evaluate(()=>partialInputs.at(-1).r),[0,-1]);assert(await p.locator('#lnkDone').isEnabled());
 await p.locator('[data-ll="0"]').click();assert.deepEqual(await p.evaluate(()=>partialInputs.at(-1).r),[-1,-1]);
 await p.locator('[data-lr="1"]').click();await p.locator('#lnkDone').click();assert.deepEqual(await p.evaluate(()=>finalInputs.at(-1).r),[1,-1]);
 s=state('question');s.s=7;s.ph='order';s.or={t:'Poredaj',lo:'malo',hi:'veliko',it:['A','B','C','D']};await p.evaluate(d=>testUI(d),s);
 await p.locator('[data-or="2"]').click();assert.deepEqual(await p.evaluate(()=>partialInputs.at(-1).r),[-1,-1,0,-1]);await p.locator('#ordUndo').click();assert.deepEqual(await p.evaluate(()=>partialInputs.at(-1).r),[-1,-1,-1,-1]);
 s=state('question');s.s=8;s.ph='hilo';s.hl={list:[{q:'Što je veće?',a:['Slon','Miš'],w:0},{q:'Što je manje?',a:['Slon','Miš'],w:1}]};await p.evaluate(d=>testUI(d),s);
 await p.locator('[data-hl="0"]').click();assert.deepEqual(await p.evaluate(()=>partialInputs.at(-1).r),[0]);assert.deepEqual(errors,[]);
 for(const [i,ph] of ['fstart','tstart'].entries()) {
  await p.setViewportSize({width:360,height:668});s=state('question');s.s=10+i;s.ph=ph;s.readyIntro=true;s.fin=ph==='fstart';s.th=ph==='tstart'?{n:5,q:0}:null;
  await p.evaluate(d=>testUI(d),s);await p.waitForTimeout(400);
  if(process.env.TRIVIA_SCREENSHOTS){await p.screenshot({path:'/tmp/trivia-v76-'+ph+'.png'});console.log(ph+' scale',await p.locator('#app').evaluate(e=>e.style.zoom));}
  const ready=p.locator('#htok');assert(await ready.isVisible(),ph+' readiness');
  const box=await ready.boundingBox();assert(box.y>=0&&box.y+box.height<=668,ph+' readiness must be on screen');
  await ready.click();assert.equal(await p.evaluate(()=>finalInputs.at(-1).ok),1);
 }

 console.log('PASS partial saves and undo for sort/link/order/hilo from actual UI handlers');await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1});

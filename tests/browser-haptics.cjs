// Native port feedback from real enabled buttons; a richer action must not also tap.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.join(__dirname,'..');let html=require('./page-source.cjs');
html=html.replace('  setInterval(tick, 100);','  setInterval(tick, 100); window.testUI=d=>{mode="player";applyState(d);};');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x=>x[1]).filter(x=>x.trim());
html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g).forEach((h,i)=>html=html.replace(h,'sha256-'+crypto.createHash('sha256').update(scripts[i]).digest('base64')));
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox']});
 try{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('mz_pid','one'));
 await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='game.test')return r.abort();const f=path.join(root,u.pathname.slice(1));return u.pathname==='/'?r.fulfill({body:html,contentType:'text/html'}):fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f)}):r.abort();});
 await page.goto('http://game.test/');
 await page.evaluate(()=>{window.nativeEvents=[];const c=new MessageChannel();window.testPort=c.port2;c.port2.onmessage=e=>nativeEvents.push(e.data);window.postMessage('trivia-native-connect',location.origin,[c.port1]);});
 await page.waitForTimeout(50);await page.locator('#join').click();await page.waitForFunction(()=>nativeEvents.length===1);assert.deepEqual(await page.evaluate(()=>nativeEvents),['tap']);
 await page.locator('#back').click();await page.waitForFunction(()=>nativeEvents.length===2);assert.deepEqual(await page.evaluate(()=>nativeEvents),['tap','tap']);
 const box=vm.createContext({setTimeout,clearTimeout});vm.runInContext(require('./engine-source.cjs')+';this.g=createGame({code:"TEST",noTv:true});',box);box.g.addPlayer('one','Player',0,false,true);box.g.addPlayer('two','Other',1,false);
 const d=JSON.parse(JSON.stringify(box.g.view()));box.g.stop();Object.assign(d,{ph:'question',s:10,dur:20000,ms:20000,q:{c:'Test',t:'Question?',o:['A','B','C','D']},ev:[]});
 await page.evaluate(d=>testUI(d),d);await page.locator('[data-c="0"]').click();await page.waitForFunction(()=>nativeEvents.includes('confirm'));
 const events=await page.evaluate(()=>nativeEvents);assert.deepEqual(events,['tap','tap','confirm'],'answer gets only confirm, not generic tap plus confirm');
 await page.evaluate(()=>{const b=document.createElement('button');b.id='disabledTest';b.disabled=true;document.body.appendChild(b);b.click();});await page.waitForTimeout(70);assert.deepEqual(await page.evaluate(()=>nativeEvents),events);
 assert.deepEqual(errors,[]);console.log('PASS menu clicks vibrate, answer feedback is not doubled, disabled controls are silent');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});

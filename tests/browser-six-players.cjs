// Integration test with an in-process PeerJS transport; no external signaling required.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath: process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
 const peers=new Map(), links=new Map();let seq=0;const errors=[];
 try {
 async function makePage(){
  const ctx=await browser.newContext();
  await ctx.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='game.test'||u.pathname.endsWith('/peerjs.min.js'))return r.abort();const p=path.join(__dirname,'..',u.pathname==='/'?'index.html':u.pathname.slice(1));return fs.existsSync(p)?r.fulfill({body:fs.readFileSync(p),contentType:p.endsWith('.html')?'text/html':p.endsWith('.js')?'text/javascript':'image/png'}):r.abort();});
  const page=await ctx.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const deliver=async(p,m)=>{try{await p.evaluate(m=>window.receivePeer?.(m),m);}catch{}};
  await page.exposeBinding('peerBridge',async(_,m)=>{
   if(m.t==='register'){peers.set(m.id,page);return;}
   if(m.t==='connect'){
    const other=peers.get(m.to);if(!other)return deliver(page,{t:'error',error:'peer-unavailable'});
    const id=++seq;links.set(id,[page,other]);await deliver(other,{t:'incoming',id});await deliver(other,{t:'open',id});await deliver(page,{t:'connected',id,request:m.request});return;
   }
   if(m.t==='data' && m.data?.t==='hello'){page.__helloAttempts=(page.__helloAttempts||0)+1;if(page.__dropFirstHello){page.__dropFirstHello=false;return;}}
   const pair=links.get(m.id);if(pair){const other=pair[0]===page?pair[1]:pair[0];await deliver(other,m);if(m.t==='close')links.delete(m.id);}
  });
  await page.addInitScript(()=>{
   const conns=new Map(), requests=new Map();let peer,n=0;
   class E {constructor(){this.handlers={};}on(k,f){(this.handlers[k]??=[]).push(f);}emit(k,v){for(const f of this.handlers[k]||[])f(v);}}
   class C extends E {constructor(){super();this.open=false;}send(data){window.peerBridge({t:'data',id:this.id,data});}close(){this.open=false;this.emit('close');window.peerBridge({t:'close',id:this.id});}}
   window.Peer=class extends E {constructor(id){super();peer=this;this.destroyed=false;this.disconnected=false;this.id=typeof id==='string'?id:'test-'+Math.random().toString(36).slice(2);window.peerBridge({t:'register',id:this.id}).then(()=>this.emit('open',this.id));}connect(to){const c=new C(),request=++n;requests.set(request,c);window.peerBridge({t:'connect',to,request});return c;}destroy(){this.destroyed=true;}reconnect(){this.emit('open',this.id);}};
   window.receivePeer=m=>{if(m.t==='incoming'){const c=new C();c.id=m.id;conns.set(m.id,c);peer.emit('connection',c);}else if(m.t==='connected'){const c=requests.get(m.request);c.id=m.id;c.open=true;conns.set(m.id,c);c.emit('open');}else if(m.t==='open'){const c=conns.get(m.id);c.open=true;c.emit('open');}else if(m.t==='data')conns.get(m.id)?.emit('data',m.data);else if(m.t==='close'){const c=conns.get(m.id);if(c){c.open=false;c.emit('close');}}else if(m.t==='error')peer.emit('error',{type:m.error});};
  });
  return page;
 }
 for (const tv of [false,true]) {
 const host=await makePage(); const players=[];
 await host.goto('http://game.test/');
 if (tv) await host.locator('#host').click();
 else { await host.locator('#hostp').click();await host.locator('#hname').fill('Host');await host.locator('#hform button[type=submit]').click(); }
 await host.waitForFunction(()=>sessionStorage.getItem('mz_recovery_v1'));
 const code=await host.evaluate(()=>JSON.parse(sessionStorage.getItem('mz_recovery_v1')).code);
 for(let i=0;i<(tv?6:5);i++) {
  const p=await makePage();if(!tv&&i===4)p.__dropFirstHello=true;players.push(p); await p.goto('http://game.test/#'+code);
  await p.locator('#name').fill('Player'+i);await p.locator('#form button[type=submit]').click();
  await host.getByText('Player'+i,{exact:true}).waitFor({timeout:15000});
  if(!tv&&i===4)assert(p.__helloAttempts>=2,'an open silent channel retries admission after a dropped hello');
  await p.waitForFunction(()=>document.querySelector('.lob-players') || document.querySelector('.lob-row'));
 }
 for (const p of players) await p.waitForFunction(()=>document.querySelectorAll('.lob-row').length===6);
 const record=await host.evaluate(()=>JSON.parse(sessionStorage.getItem('mz_recovery_v1')));
 console.log(tv?'TV + six players joined':'Phone host + five guests joined', 'journal events',record.journal.events.length);
 // The seventh identity gets an actionable admission error, rather than an endless spinner.
 const extra=await makePage();await extra.goto('http://game.test/#'+code);await extra.locator('#name').fill('Seventh');await extra.locator('#form button[type=submit]').click();
 await extra.getByText(/Soba je puna/).waitFor();
 assert.equal(await host.getByText('Seventh',{exact:true}).count(),0,'rejected identity is not admitted');
 await extra.context().close();console.log('Seventh player explicitly rejected',tv?'TV':'phone');


 // Disconnect one real guest from a full lobby and replace it with a new identity.
 const gone=players[0];
 for(const [id,pair] of [...links]) if(pair.includes(gone)) {const other=pair[0]===gone?pair[1]:pair[0];links.delete(id);await other.evaluate(id=>window.receivePeer({t:'close',id}),id);}
 await gone.context().close();
 const replacement=await makePage();await replacement.goto('http://game.test/#'+code);await replacement.locator('#name').fill('Replacement');await replacement.locator('#form button[type=submit]').click();
 await host.getByText('Replacement',{exact:true}).waitFor();console.log('Disconnected seat was replaced',tv?'TV':'phone');
 await host.context().close();for(const p of players.slice(1))await p.context().close();await replacement.context().close();
 }
 assert.deepEqual(errors,[]);
 }finally{if(errors.length)console.error(errors);await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

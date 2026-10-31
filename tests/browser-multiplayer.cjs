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
    const id=++seq;links.set(id,[page,other]);await deliver(other,{t:'incoming',id});await deliver(page,{t:'connected',id,request:m.request});await deliver(other,{t:'open',id});return;
   }
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
 const host=await makePage(),player=await makePage();
 await host.goto('http://game.test/');await host.locator('#hostp').click();await host.locator('#hname').fill('Ana');await host.locator('#hform button[type=submit]').click();
 await host.waitForFunction(()=>sessionStorage.getItem('mz_recovery_v1'));
 const code=await host.evaluate(()=>JSON.parse(sessionStorage.getItem('mz_recovery_v1')).code);
 await player.goto('http://game.test/#'+code);await player.locator('#name').fill('Ivo');await player.locator('#form button[type=submit]').click();
 await host.getByText('Ivo',{exact:true}).waitFor();
 await host.locator('#dstart').click();await host.waitForTimeout(300);
 const before=await host.evaluate(()=>JSON.parse(sessionStorage.getItem('mz_recovery_v1')).journal.events.filter(e=>e.method==='syncPeers').length);
 // Closing the data channel models a real transport disconnect before refreshing the host.
 for(const [id,pair] of [...links])if(pair.includes(host)){await player.evaluate(id=>window.receivePeer({t:'close',id}),id);links.delete(id);}
 await host.reload();await host.waitForTimeout(4000);
 const record=await host.evaluate(()=>JSON.parse(sessionStorage.getItem('mz_recovery_v1')));
 assert.equal(record.code,code);assert.ok(record.journal.events.filter(e=>e.method==='syncPeers').length>before,'player must authenticate again after host refresh');assert.ok(record.journal.events.filter(e=>e.method==='syncPeers').some(e=>JSON.stringify(e.args).includes('Ivo')));
 assert.ok(!(await player.locator('body').innerText()).includes('Spajam se…'));
 assert.deepEqual(errors,[]);
 console.log('Two isolated browsers joined, started a game and reconnected after host refresh.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

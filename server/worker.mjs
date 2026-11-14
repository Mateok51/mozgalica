import { createRecoverableGame } from './generated/engine.mjs';
import { ROOM_TTL, IDLE_TTL, MAX_PACKET, MAX_JOURNAL, validCode, validIdentity, validSecret, validAvatar, bounded, randomSecret, randomCode, controlAllowed, gamePayload } from './policy.mjs';

const json = (value,status=200) => Response.json(value,{status,headers:{'Cache-Control':'no-store'}});
const failure = (reason,message,status=400) => json({t:'error',reason,message},status);
const internal = () => failure('server','Server trenutačno nije dostupan. Pokušaj ponovno.',503);
function allowedOrigin(request,env) {
  const origin = request.headers.get('Origin');
  if (!origin) return true; // Native clients still require room and identity secrets.
  return origin === new URL(request.url).origin ||
    (env.ALLOWED_ORIGINS || '').split(',').map(x=>x.trim()).filter(Boolean).includes(origin);
}
function cors(response,request) {
  const origin=request.headers.get('Origin');
  if (!origin || response.status===101) return response;
  const headers=new Headers(response.headers);headers.set('Access-Control-Allow-Origin',origin);
  headers.set('Vary','Origin');headers.set('Access-Control-Allow-Methods','POST,GET,OPTIONS');
  headers.set('Access-Control-Allow-Headers','Content-Type');
  return new Response(response.body,{status:response.status,headers});
}
async function bodyJson(request) {
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) return null;
  const reader=request.body?.getReader(); if (!reader) return null;
  let size=0;const chunks=[];
  for (;;) {const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX_PACKET){await reader.cancel();return null;}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  try {return JSON.parse(new TextDecoder().decode(bytes));} catch {return null;}
}

export default {
  async fetch(request,env) {
    const url=new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (!allowedOrigin(request,env)) return failure('origin','Nedopušten izvor zahtjeva.',403);
    if (request.method==='OPTIONS') return cors(new Response(null,{status:204}),request);
    try {
      if (url.pathname==='/api/health' && request.method==='GET') return cors(json({ok:true,protocol:1}),request);
      if (url.pathname==='/api/rooms' && request.method==='POST') {
        const value=await bodyJson(request);
        if (!validIdentity(value) || typeof value.noTv!=='boolean' || !bounded(value)) return cors(failure('invalid','Provjeri ime i podatke sobe.'),request);
        const directory=env.DIRECTORY.get(env.DIRECTORY.idFromName('rooms'));
        return cors(await directory.fetch('https://directory/create',{method:'POST',body:JSON.stringify(value)}),request);
      }
      const match=url.pathname.match(/^\/api\/rooms\/([A-Z]{4})$/);
      if (match && request.method==='GET' && request.headers.get('Upgrade')?.toLowerCase()==='websocket') {
        const room=env.ROOMS.get(env.ROOMS.idFromName(match[1]));
        // No secrets in the URL, logs or room directory lookup.
        return room.fetch(new Request('https://room/socket',{headers:{Upgrade:'websocket'}}));
      }
      return cors(failure('not_found','Soba nije pronađena.',404),request);
    } catch {return cors(internal(),request);}
  },
};

export class RoomDirectory {
  constructor(ctx,env) {
    this.ctx=ctx;this.env=env;this.record={created:[],rooms:{}};
    ctx.blockConcurrencyWhile(async()=>{this.record=await ctx.storage.get('directory') || this.record;});
  }
  async fetch(request) {
    if(request.method!=='POST'||new URL(request.url).pathname!=='/create')return failure('not_found','Nepostojeća radnja.',404);
    let value;try{value=await request.json();}catch{return failure('invalid','Neispravan zahtjev.');}
    if(!validIdentity(value)||typeof value.noTv!=='boolean')return failure('invalid','Neispravan zahtjev.');
    const now=Date.now(),r=this.record;
    for(const [code,expires] of Object.entries(r.rooms))if(expires<=now)delete r.rooms[code];
    r.created=(r.created||[]).filter(t=>t>now-24*60*60*1000);
    // Global ceilings keep the free deployment bounded. No device fingerprint/IP is stored.
    if(r.created.length>=12 || Object.keys(r.rooms).length>=12)return failure('capacity','Dnevni kapacitet soba je dosegnut. Pokušaj kasnije.',429);
    let code;for(let i=0;i<32;i++){const candidate=randomCode();if(!r.rooms[candidate]){code=candidate;break;}}
    if(!code)return internal();
    const secret=randomSecret();r.rooms[code]=now+ROOM_TTL;r.created.push(now);
    await this.ctx.storage.put('directory',r);
    const room=this.env.ROOMS.get(this.env.ROOMS.idFromName(code));
    const response=await room.fetch('https://room/init',{method:'POST',body:JSON.stringify({code,secret,owner:value,created:now,expires:now+ROOM_TTL})});
    if(!response.ok)return internal();
    return json({code,secret});
  }
}

export class GameRoom {
  constructor(ctx,env) {
    this.ctx=ctx;this.env=env;this.game=null;this.meta=null;this.sockets=new Map();this.keys=new Map();
    this.heartbeat=null;this.dirty=false;this.work=null;this.expired=false;
    ctx.blockConcurrencyWhile(async()=>{
      const saved=await ctx.storage.get('room');
      if(!saved)return;
      if(saved.meta.expires<=Date.now()){this.expired=true;for(const ws of ctx.getWebSockets())try{ws.close(1008,'Soba je istekla.');}catch{} await ctx.storage.deleteAll();await ctx.storage.deleteAlarm();return;}
      this.meta=saved.meta;this.keys=new Map(saved.keys);
      const chunks=await ctx.storage.get(Array.from({length:saved.journalChunks},(_,i)=>'journal:'+i));
      this.journalCache=Array.from({length:saved.journalChunks},(_,i)=>chunks.get('journal:'+i));
      const journal=JSON.parse(this.journalCache.join(''));
      this.journalChunks=saved.journalChunks;this.restore(journal);
      for(const ws of ctx.getWebSockets()) {
        const data=ws.deserializeAttachment();
        if(data?.authenticated && this.keys.has(data.pid))this.sockets.set(ws,{...data,bucket:Date.now(),count:0,bytes:0});
        else {try{ws.close(1008,'Rejoin');}catch{}}
      }
      this.sync();this.startHeartbeat();
    });
  }
  restore(journal) {
    this.game=createRecoverableGame({code:this.meta.code,noTv:this.meta.owner.noTv,discardRejected:true,
      onChange:()=>this.queue(),onCheckpoint:()=>this.queue()},journal);
  }
  async fetch(request) {
    const path=new URL(request.url).pathname;
    if(path==='/init'&&request.method==='POST') {
      if(this.meta && this.meta.expires>Date.now())return failure('exists','Soba postoji.',409);
      const value=await request.json();
      if(!validCode(value.code)||!validSecret(value.secret)||!validIdentity(value.owner)||typeof value.owner.noTv!=='boolean')return failure('invalid','Neispravna soba.');
      if(this.game)this.game.stop();this.meta=value;this.keys=new Map([[value.owner.pid,value.owner.sk]]);this.expired=false;
      this.meta.idleSince=Date.now();this.restore(null);
      if(value.owner.noTv)this.game.addPlayer(value.owner.pid,value.owner.name,value.owner.av,false,false);
      await this.commit();await this.ctx.storage.setAlarm(Math.min(value.expires,Date.now()+IDLE_TTL));return json({ok:true});
    }
    if(path!=='/socket'||request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return failure('not_found','Nepostojeća radnja.',404);
    if(!this.meta || this.meta.expires<=Date.now()||this.expired)return failure('not_found','Soba je istekla ili ne postoji.',404);
    if(this.ctx.getWebSockets().length>=24)return failure('capacity','Previše pokušaja povezivanja.',429);
    const pair=new WebSocketPair(),client=pair[0],server=pair[1];
    this.ctx.acceptWebSocket(server);
    const info={authenticated:false,accepted:Date.now(),bucket:Date.now(),count:0,bytes:0};
    this.sockets.set(server,info);server.serializeAttachment(info);
    // Bound unauthenticated resource retention; no game data is sent before hello.
    setTimeout(()=>{const i=this.sockets.get(server);if(i&&!i.authenticated)this.disconnect(server,1008,'Prijava je istekla.');},10000);
    return new Response(null,{status:101,webSocket:client});
  }
  error(ws,reason,message,close=false) {
    try{ws.send(JSON.stringify({t:'error',reason,message}));}catch{}
    if(close)this.disconnect(ws,1008,message);
  }
  disconnect(ws,code=1000,message='') {
    this.sockets.delete(ws);try{ws.close(code,message);}catch{}
  }
  queue() {
    this.dirty=true;
    if(this.work || !this.game)return;
    this.work=Promise.resolve().then(async()=>{
      while(this.dirty && !this.expired){this.dirty=false;await this.persist();}
      this.broadcast();
    }).catch(()=>{this.failRoom();}).finally(()=>{this.work=null;if(this.dirty&&!this.expired)this.queue();});
    this.ctx.waitUntil(this.work);
  }
  async commit() {this.queue();if(this.work)await this.work;}
  async persist() {
    if(this.expired || !this.meta || !this.game)return;
    const journal=this.game.checkpoint();
    const signature=JSON.stringify({meta:this.meta,keys:[...this.keys],events:journal.events.length});
    if(signature===this.persistedSignature)return;
    const text=JSON.stringify(journal);
    if(new TextEncoder().encode(text).length>MAX_JOURNAL)throw Error('Room journal budget exceeded');
    const chunks=[];for(let i=0;i<text.length;i+=16000)chunks.push(text.slice(i,i+16000));
    const previous=this.journalChunks||0;
    await this.ctx.storage.transaction(async tx=>{
      for(let i=0;i<chunks.length;i++)if(this.journalCache?.[i]!==chunks[i])await tx.put('journal:'+i,chunks[i]);
      for(let i=chunks.length;i<previous;i++)await tx.delete('journal:'+i);
      await tx.put('room',{meta:this.meta,keys:[...this.keys],journalChunks:chunks.length});
    });
    this.journalChunks=chunks.length;this.journalCache=chunks;this.persistedSignature=signature;
  }
  failRoom() {
    for(const ws of this.sockets.keys())this.error(ws,'server','Soba je zaustavljena zbog greške spremanja. Pokušaj ponovno.',true);
    this.expired=true;if(this.game)this.game.stop();clearInterval(this.heartbeat);this.heartbeat=null;
    this.ctx.waitUntil(this.ctx.storage.deleteAll());
  }
  sendState(ws,info) {
    if(!info.authenticated||!this.game)return;
    const view=this.game.view();
    view.pv=info.role==='player'?this.game.priv(info.pid):null;
    view.cloud={owner:info.pid===this.meta.owner.pid,noTv:this.meta.owner.noTv};
    try{ws.send(JSON.stringify(view));}catch{this.sockets.delete(ws);}
  }
  broadcast() {
    if(this.expired)return;
    const wait=1000-(Date.now()-(this.lastBroadcast||0));
    if(wait>0){if(!this.broadcastTimer)this.broadcastTimer=setTimeout(()=>{this.broadcastTimer=null;this.broadcast();},wait);return;}
    this.lastBroadcast=Date.now();for(const [ws,info] of this.sockets)this.sendState(ws,info);
  }
  peers() {
    const seen=new Map();
    for(const info of this.sockets.values())if(info.authenticated&&info.role==='player')seen.set(info.pid,{pid:info.pid,name:info.name,av:info.av});
    return [...seen.values()];
  }
  sync() {if(this.game)this.game.syncPeers(this.peers());}
  startHeartbeat() {
    if(this.heartbeat || !this.sockets.size)return;
    this.heartbeat=setInterval(()=>{
      if(!this.sockets.size){clearInterval(this.heartbeat);this.heartbeat=null;return;}
      if(Date.now()>=this.meta.expires){this.expire();return;}
      // Never write a journal for a plain heartbeat.
      this.game.refresh();this.broadcast();
    },5000);
  }
  async hello(ws,info,message) {
    // Sharing the short code admits players. Never disclose the invitation secret;
    // an explicit secret must still match, and host access always requires it.
    const hasSecret=validSecret(message.secret)&&message.secret===this.meta.secret;
    if(!validIdentity(message)||!['host','player'].includes(message.role)||
      (message.secret!=null&&!hasSecret)||(message.role==='host'&&!hasSecret))
      return this.error(ws,'auth','Provjeri kod sobe ili pozivnicu domaćina.',true);
    const owner=message.pid===this.meta.owner.pid;
    if((this.keys.has(message.pid)&&this.keys.get(message.pid)!==message.sk)||(message.role==='host'&&!owner))
      return this.error(ws,'auth','Prijava nije dopuštena.',true);
    const player=this.game._p(message.pid),view=this.game.view();
    if(message.role==='player'&&!player&&view.ph!=='lobby')return this.error(ws,'started','Igra je već počela. Pričekaj sljedeću partiju.',true);
    if(message.role==='player'&&!player&&view.P.filter(p=>!p.b).length>=6)return this.error(ws,'full','Soba je puna: najviše 6 igrača.',true);
    if(!this.keys.has(message.pid)&&this.keys.size>=24)return this.error(ws,'capacity','Dosegnut je broj prijava u ovoj sobi.',true);
    // One authenticated socket per identity. A stale connection cannot displace another player.
    for(const [previous,data] of this.sockets)if(previous!==ws&&data.authenticated&&data.pid===message.pid)this.disconnect(previous,1000,'Ponovno povezivanje');
    Object.assign(info,{authenticated:true,pid:message.pid,name:message.name,av:message.av,role:message.role});
    ws.serializeAttachment({authenticated:true,pid:info.pid,name:info.name,av:info.av,role:info.role});
    this.keys.set(message.pid,message.sk);this.meta.idleSince=null;
    if(message.role==='player'&&!player)this.game.addPlayer(message.pid,message.name,message.av,false,false);
    this.sync();await this.commit();this.sendState(ws,info);this.startHeartbeat();
    await this.ctx.storage.setAlarm(this.meta.expires);
  }
  async webSocketMessage(ws,raw) {
    const info=this.sockets.get(ws);
    if(!info||this.expired)return this.disconnect(ws,1008,'Soba nije dostupna.');
    if(Date.now()>=this.meta.expires)return this.expire();
    if(typeof raw!=='string'||raw.length>MAX_PACKET)return this.error(ws,'invalid','Prevelika poruka.',true);
    if(Date.now()-info.bucket>=1000){info.bucket=Date.now();info.count=0;info.bytes=0;}
    info.tokens=Math.min(40,(info.tokens??40)+(Date.now()-(info.tokenAt||Date.now()))/1000);info.tokenAt=Date.now();
    if(++info.count>30 || (info.bytes+=raw.length)>32768 || (info.tokens-=1)<0)return this.error(ws,'rate','Previše poruka. Ponovno se poveži.',true);
    let m;try{m=JSON.parse(raw);}catch{return this.error(ws,'invalid','Neispravna poruka.',true);}
    if(!bounded(m))return this.error(ws,'invalid','Neispravna poruka.',true);
    if(!info.authenticated)return m?.t==='hello'?this.hello(ws,info,m):this.error(ws,'auth','Potrebna je prijava.',true);
    if(m.t==='ping'){this.sendState(ws,info);return;}
    if(m.t==='hello')return this.sendState(ws,info);
    if(m.t==='control') {
      if(info.pid!==this.meta.owner.pid)return this.error(ws,'forbidden','Samo domaćin mijenja postavke.');
      if(!controlAllowed(m.method,m.args))return this.error(ws,'invalid','Neispravna radnja.');
      this.game[m.method](...m.args);
    } else if(m.t==='in'&&info.role==='player') {
      const p=this.game._p(info.pid);
      if(!p||p.done||!m.in||typeof m.in!=='object'||Array.isArray(m.in)||m.in.s!==this.game._G.s||!bounded(m.in))return;
      const input=gamePayload(m.in);if(!input)return;
      const signature=JSON.stringify(input);if(signature===info.lastInput)return;info.lastInput=signature;
      if(this.game.setInput(info.pid,input)===false)return;
    } else if(m.t==='av'&&info.role==='player'&&validAvatar(m.av)) {
      info.av=m.av;this.game.setAvatar(info.pid,m.av);ws.serializeAttachment({authenticated:true,pid:info.pid,name:info.name,av:info.av,role:info.role});
    } else if(m.t==='pa'&&info.role==='player'&&m.a&&typeof m.a==='object'&&!Array.isArray(m.a)&&bounded(m.a)) {
      const action=gamePayload(m.a,true);if(!action)return;
      if(this.game.pactAction(info.pid,action)===false)return;
    } else return this.error(ws,'invalid','Nepoznata radnja.');
    await this.commit();
  }
  async webSocketClose(ws) {this.sockets.delete(ws);if(this.expired||!this.meta||!this.game)return;this.sync();await this.commit();if(!this.sockets.size){this.meta.idleSince=Date.now();await this.persist();await this.ctx.storage.setAlarm(Math.min(this.meta.expires,Date.now()+IDLE_TTL));}}
  async webSocketError(ws) {this.disconnect(ws,1011,'Veza je prekinuta.');await this.webSocketClose(ws);}
  async expire() {
    this.expired=true;if(this.game)this.game.stop();clearInterval(this.heartbeat);this.heartbeat=null;clearTimeout(this.broadcastTimer);
    for(const ws of this.sockets.keys())this.error(ws,'expired','Soba je istekla. Otvori novu igru.',true);
    await this.ctx.storage.deleteAll();
  }
  async alarm() {
    if(!this.meta)return;
    if(Date.now()>=this.meta.expires || (this.meta.idleSince && Date.now()-this.meta.idleSince>=IDLE_TTL))return this.expire();
    await this.ctx.storage.setAlarm(this.meta.expires);
  }
}

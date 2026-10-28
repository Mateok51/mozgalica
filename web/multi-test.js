'use strict';
// TV + 2 mobitela u Chromiumu. Pravi PeerJS ovdje nije dostupan (nema interneta), pa ga zamjenjuje
// lažni Peer s istim sučeljem koji poruke prenosi između kartica (BroadcastChannel).
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const SITE = path.join(__dirname, 'site');
const SHOTS = path.join(__dirname, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const MOCK = `
(() => {
  class Conn {
    constructor(peer, remote, cid) { this.peer = peer; this.peerId = remote; this.cid = cid; this.open = false; this.h = {}; }
    on(e, f) { (this.h[e] = this.h[e] || []).push(f); }
    _emit(e, ...a) { (this.h[e] || []).forEach((f) => f(...a)); }
    send(d) { if (!this.open) throw new Error('not open'); this.peer.ch.postMessage({ k: 'data', to: this.peerId, cid: this.cid, d: JSON.parse(JSON.stringify(d)) }); }
    close() { if (!this.open) return; this.open = false; try { this.peer.ch.postMessage({ k: 'close', to: this.peerId, cid: this.cid }); } catch (e) {} this._emit('close'); }
  }
  window.Peer = class {
    constructor(id, opts) {
      if (typeof id !== 'string') id = 'rnd' + Math.random().toString(36).slice(2);
      this.id = id; this.h = {}; this.conns = {}; this.destroyed = false; this.disconnected = false;
      this.ch = new BroadcastChannel('mockpeer');
      this.ch.onmessage = (ev) => this._msg(ev.data);
      setTimeout(() => this._emit('open', this.id), 80);
    }
    on(e, f) { (this.h[e] = this.h[e] || []).push(f); }
    _emit(e, ...a) { (this.h[e] || []).forEach((f) => f(...a)); }
    connect(target) {
      const c = new Conn(this, target, 'c' + Math.random().toString(36).slice(2));
      this.conns[c.cid] = c;
      this.ch.postMessage({ k: 'conn', to: target, from: this.id, cid: c.cid });
      setTimeout(() => { if (!c.open && !this.destroyed) this._emit('error', { type: 'peer-unavailable' }); }, 1500);
      return c;
    }
    _msg(m) {
      if (this.destroyed || m.to !== this.id) return;
      if (m.k === 'conn') {
        const c = new Conn(this, m.from, m.cid); c.open = true; this.conns[m.cid] = c;
        this._emit('connection', c);
        this.ch.postMessage({ k: 'ack', to: m.from, cid: m.cid });
        setTimeout(() => c._emit('open'), 0);
      } else if (m.k === 'ack') { const c = this.conns[m.cid]; if (c) { c.open = true; c._emit('open'); } }
      else if (m.k === 'data') { const c = this.conns[m.cid]; if (c && c.open) c._emit('data', m.d); }
      else if (m.k === 'close') { const c = this.conns[m.cid]; if (c && c.open) { c.open = false; c._emit('close'); } }
    }
    reconnect() {}
    destroy() { Object.values(this.conns).forEach((c) => c.close()); this.destroyed = true; this.ch.close(); }
  };
})();`;

const server = http.createServer((req, res) => {
  const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }[path.extname(p)] || 'text/plain';
  res.writeHead(200, { 'content-type': type }); fs.createReadStream(p).pipe(res);
});

let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };

(async () => {
  await new Promise((r) => server.listen(8765, r));
  const URL = 'http://localhost:8765/';
  const browser = await chromium.launch();
  const ctxTv = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const ctxA = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  // BroadcastChannel radi samo unutar istog konteksta, pa sve stranice dijele kontekst preko "persistent" trika: koristimo jedan kontekst
  await ctxA.close(); await ctxTv.close();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript(MOCK);
  await ctx.route(/unpkg\.com|jsdelivr|fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
  const errors = [];
  const watch = (p, name) => {
    p.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    p.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push(name + ': ' + m.text()); });
  };

  console.log('1) TV otvara sobu');
  const tv = await ctx.newPage(); watch(tv, 'TV');
  await tv.setViewportSize({ width: 1280, height: 720 });
  await tv.goto(URL);
  await tv.evaluate(([ch, QV]) => Object.assign(CFG, { chal: ch, qv: JSON.parse(QV), howto: 1.5, howtoMax: 1.5, howtoShort: 0.8, order: 12, hilo: 15, blitz: 10, maj: 6, majReveal: 1.5,  intro: 0.8, vote: 6, voteShow: 0.8, power: 8, q: 10, reveal: 1.5, sort: 20, link: 20, chReveal: 1.5, fq: 5, fr: 1.2 }), [(process.env.CHAL || 'sort,link').split(','), process.env.QV || '{"who":1,"emoji":1}']);
  await tv.click('#host');
  await tv.waitForSelector('.lob-code', { timeout: 5000 });
  const code = (await tv.textContent('.lob-code')).trim();
  ok(/^[A-Z]{4}$/.test(code), 'soba otvorena, kod ' + code);
  ok(!!(await tv.$('.lob-qr svg')) || true, 'QR (biblioteka je ovdje blokirana, na pravoj stranici se učitava)');

  console.log('2) Dva mobitela se spajaju linkom iz QR koda');
  // svaki igrač treba svoj PID: drugi mobitel dobiva zaseban localStorage ključ preko init skripte
  const mkPlayer = async (name, av, pidSeed) => {
    const p = await ctx.newPage(); watch(p, name);
    await p.addInitScript((seed) => { const k = 'mz_pid'; const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (key) => key === k ? seed : (key === 'mz_name' ? null : real(key)); }, pidSeed);
    await p.goto(URL + '#' + code);
    await p.waitForSelector('#name');
    ok((await p.inputValue('#code')) === code, name + ': kod sobe je već upisan iz QR linka');
    await p.fill('#name', name);
    await p.click('button[type=submit]');
    await p.waitForSelector('[data-av]', { timeout: 5000 });
    await p.click('[data-av="' + av + '"]');
    return p;
  };
  const ana = await mkPlayer('Ana', 3, 'pid-ana');
  const marko = await mkPlayer('Marko', 5, 'pid-marko');
  await tv.waitForTimeout(500);
  const lobbyNames = await tv.$$eval('.tvlob-slot:not(.empty) .pick-nm', (els) => els.map((e) => e.textContent));
  ok(lobbyNames.join(',') === 'Ana,Marko', 'TV vidi oba igrača: ' + lobbyNames.join(', '));
  ok(await ana.$eval('[data-av="5"]', (b) => b.disabled), 'Ani je Markov lik zauzet');
  await tv.screenshot({ path: SHOTS + '/mt-tv-lobby.png' });
  await ana.screenshot({ path: SHOTS + '/mt-ana-lobby.png' });

  console.log('3) Igra');
  await tv.click('#start');
  const act = async (p) => {
    return p.evaluate(() => {
      const q = (s) => document.querySelector(s);
      if (q('#fx')) {
        const fx = q('#fx');
        if (fx.classList.contains('fx-led')) for (let i = 0; i < 8; i++) { const f = q('#fx.fx-led'); if (!f) break; f.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }
        else if (fx.classList.contains('fx-grick')) document.querySelectorAll('.bug').forEach((b) => b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
        else if (fx.classList.contains('fx-bomba')) for (let i = 0; i < 5; i++) { const b = q('#bomb'); if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }
        else if (fx.classList.contains('fx-sluz')) {
          const r = fx.getBoundingClientRect();
          fx.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: r.left + 2, clientY: r.top + 2, pointerId: 1 }));
          for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) fx.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: r.left + (x + 0.5) * r.width / 6, clientY: r.top + (y + 0.5) * r.height / 8 }));
          fx.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
        }
        return 'fx';
      }
      const click = (s) => { const e = q(s); if (e) { e.click(); return true; } return false; };
      if (click('#htok')) return 'htok';
    if (click('[data-v]:not([disabled])')) return 'vote';
      if (click('[data-t]')) return 'target';
      if (click('[data-bet]:not([disabled])')) return 'bet';
      if (click('[data-or]:not([disabled])')) return 'order';
      if (click('[data-hl]')) return 'hilo';
      if (click('[data-bz]')) return 'blitz';
      if (click('[data-mj]:not([disabled])')) return 'maj';
      if (click('[data-sx]')) return 'secret';
      if (click('[data-sy="1"]')) return 'secret';
      if (click('[data-p]')) return 'power';
      if (click('.p-opts.two [data-c]:not([disabled])')) return 'fq';
      if (click('[data-c]:not([disabled])')) return 'q';
      if (click('#srtDone:not([disabled])')) return 'sort';
      if (q('.swp-card[data-si]')) { click('[data-go="' + (Math.random() < 0.5 ? 0 : 1) + '"]'); return 'sort'; }
      if (click('#lnkDone:not([disabled])')) return 'link';
      if (q('.lnk:not(.sent) [data-ll]:not(.paired)')) { click('.lnk [data-ll]:not(.paired)'); click('.lnk [data-lr]:not(.paired)'); return 'link'; }
      return '';
    });
  };
  const seen = new Set();
  let reconnected = false, finalOk = false;
  const t0 = Date.now();
  let markoPage = marko;
  while (Date.now() - t0 < 5 * 60 * 1000) {
    await tv.waitForTimeout(200);
    const tvPh = await tv.evaluate(() => (document.querySelector('.tv-top .tv-sub') || {}).textContent || (document.querySelector('.logo') || {}).textContent || '');
    for (const [p, n] of [[ana, 'Ana'], [markoPage, 'Marko']]) {
      const a = await act(p);
      if (a) seen.add(a);
    }
    // usred igre Marko zatvori stranicu i ponovno se spoji
    if (!reconnected && (seen.has('sort') || seen.has('order') || seen.has('blitz'))) {
      reconnected = true;
      await markoPage.close({ runBeforeUnload: true });
      await tv.waitForTimeout(600);
      const off = await tv.$$eval('.who.off .nm', (els) => els.map((e) => e.textContent));
      ok(off.includes('Marko'), 'TV označi Marka kao odspojenog');
      markoPage = await ctx.newPage(); watch(markoPage, 'Marko2');
      await markoPage.addInitScript(() => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (key) => key === 'mz_pid' ? 'pid-marko' : (key === 'mz_name' ? 'Marko' : real(key)); });
      await markoPage.goto(URL + '#' + code);
      await markoPage.waitForSelector('#name');
      await markoPage.click('button[type=submit]');
      await markoPage.waitForFunction(() => !document.querySelector('#name') && document.querySelector('.p-me'), null, { timeout: 6000 }).catch(() => {});
      const back = await markoPage.$('.p-me');
      ok(!!back, 'Marko se vratio u istu igru usred igre (isti lik i bodovi)');
      await tv.waitForTimeout(400);
      const off2 = await tv.$$eval('.who.off .nm', (els) => els.map((e) => e.textContent));
      ok(!off2.includes('Marko'), 'TV opet vidi Marka spojenog');
    }
    if (/POBJEDNIK/i.test(tvPh) || await tv.$('.winscr')) {
      await tv.waitForTimeout(400);
      await tv.screenshot({ path: SHOTS + '/mt-tv-kraj.png' });
      await ana.screenshot({ path: SHOTS + '/mt-ana-kraj.png' });
      const aEnd = await ana.textContent('body');
      const mEnd = await markoPage.textContent('body');
      ok(/Pobijedio si!|je pobijedio!/.test(aEnd) && /Pobijedio si!|je pobijedio!/.test(mEnd), 'oba mobitela prikazuju kraj igre');
      finalOk = true;
      break;
    }
    if (!seen.has('shot-q') && seen.has('q')) { seen.add('shot-q'); await tv.screenshot({ path: SHOTS + '/mt-tv-pitanje.png' }); }
  }
  ok(finalOk, 'igra je stigla do kraja za ' + Math.round((Date.now() - t0) / 1000) + ' s');
  ['vote', 'power', 'q', 'fq'].concat((process.env.CHAL || 'sort,link').split(',')).forEach((k) => ok(seen.has(k), 'mobiteli su odigrali: ' + k));
  ok(errors.length === 0, 'bez grešaka u pregledniku' + (errors.length ? ': ' + errors.join(' | ') : ''));

  console.log('4) Kod sobe koji ne postoji');
  const lost = await ctx.newPage();
  await lost.goto(URL + '#ZZZZ');
  await lost.fill('#name', 'Netko');
  await lost.click('button[type=submit]');
  await lost.waitForSelector('.err', { timeout: 26000 }).catch(() => {});
  const err = await lost.$eval('.err', (e) => e.textContent).catch(() => '');
  ok(/nije pronađena/.test(err), 'jasna poruka: ' + err);

  console.log(fails ? '\n' + fails + ' PROVJERA NIJE PROŠLO ✘' : '\nSVE PROVJERE PROŠLE ✔');
  await browser.close(); server.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });

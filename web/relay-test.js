'use strict';
// Šifrirani rezervni relej (MQTT): domaćin na mobitelu ima izravnu signalizaciju (lažni Peer), igrač nema WebRTC pa ide preko releja.
// Provjera: igrač s poveznicom (#KOD-ključ) ulazi i igra; posrednik vidi samo šifrirani sadržaj; igrač s ručno upisanim kodom ne koristi relej.
// Pokretanje: node web/relay-test.js
const { chromium } = require('playwright'); const http = require('http'); const fs = require('fs'); const path = require('path');
const SITE = path.join(__dirname, 'site');
const src = fs.readFileSync(path.join(__dirname, 'multi-test.js'), 'utf8');
const MOCK = src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));
const page0 = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '')
  .replace("let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;", "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false; window.__t = { game: () => game };");
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
  if (u === '/' || u === '/index.html') { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(page0); }
  const p = path.join(SITE, u); if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': { '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res);
});
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const broker = await require('./tools/mini-mqtt.js').start(8791);
  await new Promise((r) => server.listen(8790, r));
  const URL = 'http://localhost:8790/', MQ = ['ws://localhost:8791/mqtt'];
  const browser = await chromium.launch(); const errors = [];
  try {
    const mk = async (withPeer, seed) => {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
      if (withPeer) await ctx.addInitScript(MOCK);
      await ctx.addInitScript((mq) => { window.__MQTT_URLS = mq; }, MQ);
      await ctx.addInitScript((sd) => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (k) => k === 'mz_pid' ? sd : (k === 'mz_name' ? null : real(k)); }, seed);
      await ctx.route(/unpkg\.com|jsdelivr|fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
      const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(e.message)); return p;
    };
    console.log('1) Domaćin otvara sobu (mobitel), relej s ključem sobe');
    const host = await mk(true, 'pid-mateo');
    await host.goto(URL); await host.click('#hostp'); await host.fill('#hname', 'Mateo'); await host.click('#hform button[type=submit]');
    await host.waitForSelector('.lob-code', { timeout: 8000 });
    const code = (await host.textContent('.lob-code')).trim();
    const rs = await host.evaluate(() => JSON.parse(sessionStorage.getItem('mz_recovery_v1')).rs);
    ok(/^[A-Z]{4}$/.test(code) && /^[A-Za-z0-9_-]{22}$/.test(rs), 'soba ' + code + ' ima ključ sobe');
    await host.click('#lobInv'); await host.waitForTimeout(200);
    const qrHas = await host.evaluate(() => !!document.querySelector('.inv-qr svg, .lob-qr svg'));
    ok(qrHas, 'pozivnica ima QR kod'); await host.click('#invClose').catch(() => {});
    console.log('2) Igrač bez WebRTC-a ulazi preko poveznice s ključem');
    const pl = await mk(false, 'pid-ana');
    await pl.goto(URL + '#' + code + '-' + rs); await pl.fill('#name', 'Ana'); await pl.click('button[type=submit]');
    await pl.waitForSelector('.lob-players', { timeout: 15000 }).catch(() => {});
    await host.waitForTimeout(800);
    const names = await host.evaluate(() => __t.game().view().P.map((p) => p.n));
    ok(names.includes('Ana'), 'domaćin vidi igrača preko releja: ' + names.join(', '));
    ok(await pl.$('.lob-players') !== null, 'igrač vidi predvorje (stanje stiže preko releja)');
    console.log('3) Igra preko releja');
    await host.click('#dstart');
    await pl.waitForSelector('.door-btn', { timeout: 20000 }).catch(() => {});
    ok(await pl.$('.door-btn') !== null, 'igrač vidi glasanje');
    await pl.click('.door-btn.o2', { force: true }).catch(() => {}); await host.waitForTimeout(1500);
    const vote = await host.evaluate(() => { const p = __t.game()._p('pid-ana'); return p ? p.vote : null; });
    ok(vote === 2, 'glas igrača stiže domaćinu (' + vote + ')');
    console.log('4) Posrednik vidi samo šifrirani sadržaj');
    const pays = broker.log;
    ok(pays.length > 5, 'poruka na posredniku: ' + pays.length);
    ok(pays.every((m) => /^\{"v":2,"i":"[A-Za-z0-9_-]+","c":"[A-Za-z0-9_-]+"\}$/.test(m.p)), 'sve poruke su šifrirane');
    ok(!pays.some((m) => /"sk"|"name"|hello|Mateo\b/.test(m.p)), 'u porukama nema otvorenih polja (sk, name, hello)');
    ok(pays.every((m) => !m.t.toLowerCase().includes(code.toLowerCase())), 'tema ne sadrži kod sobe');
    console.log('5) Ručno upisan kod (bez ključa): relej se ne koristi');
    const n0 = broker.log.length, topics0 = new Set(broker.log.map((m) => m.t));
    const p2 = await mk(false, 'pid-iva');
    await p2.goto(URL); await p2.click('#join').catch(() => {}); await p2.waitForSelector('#code', { timeout: 5000 }).catch(() => {});
    await p2.fill('#code', code); await p2.fill('#name', 'Iva'); await p2.click('button[type=submit]'); await p2.waitForTimeout(6000);
    const names2 = await host.evaluate(() => __t.game().view().P.map((p) => p.n));
    const fromIva = broker.log.slice(n0).filter((m) => !topics0.has(m.t) && /\/h$/.test(m.t));
    ok(!names2.includes('Iva') && fromIva.length === 0, 'bez ključa nema prometa preko releja (igra je u tijeku, igrač nije ušao)');
    ok(errors.length === 0, 'bez grešaka ' + errors.join(' | '));
  } finally { await browser.close(); server.close(); broker.close(); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

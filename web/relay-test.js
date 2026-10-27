'use strict';
// Oba uređaja na mobilnim podacima: izravna WebRTC veza se nikad ne otvori → igra mora ići preko MQTT releja.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site');
const src = fs.readFileSync(path.join(__dirname, 'multi-test.js'), 'utf8');
let MOCK = src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));
const MODE = process.env.MODE || 'nat';   // nat: WebRTC ne uspijeva; nopeer: ni PeerJS posrednik ne radi
if (MODE === 'nat') MOCK = MOCK.replace("if (m.k === 'conn') {", "if (m.k === 'conn') { return;").replace("setTimeout(() => { if (!c.open && !this.destroyed) this._emit('error', { type: 'peer-unavailable' }); }, 1500);", "");
if (MODE === 'nopeer') MOCK = MOCK.replace("setTimeout(() => this._emit('open', this.id), 80);", "setTimeout(() => this._emit('error', { type: 'server-error' }), 300);");
MOCK = "window.__MQTT_URLS = ['ws://localhost:8767/mqtt', 'ws://localhost:8768/mqtt'];\n" + MOCK;
const server = http.createServer((req, res) => { /* CSPFIX: testni MQTT na localhostu */ const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html')); if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); } if (p.endsWith('index.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(p, 'utf8').replace("connect-src 'self'", "connect-src 'self' ws://localhost:8767")); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const brokerA = require('./mini-broker').start(8767);  // drugi (8768) namjerno ne postoji: prvi u popisu ima prednost
  await new Promise((r) => server.listen(8766, r)); const URL = 'http://localhost:8766/';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(MOCK); await ctx.route(/unpkg\.com|jsdelivr|fonts\./, (r) => r.abort());
  const errors = [];
  const mk = async (name, seed) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(name + ': ' + e.message)); await p.addInitScript((sd) => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (k) => k === 'mz_pid' ? sd : (k === 'mz_name' ? null : real(k)); }, seed); return p; };
  const rows = (p) => p.$$eval('#app .lob-row .nm', (e) => e.map((x) => x.textContent.replace('♛', '').replace('Ti', '').trim()));
  console.log('Način:', MODE);
  const host = await mk('Mateo', 'pid-host'); await host.goto(URL);
  await host.evaluate(() => Object.assign(CFG, { chal: ['hilo', 'maj'], qv: { who: 0, emoji: 0 }, intro: 0.5, vote: 3, voteShow: 0.8, roul: 0.5, power: 4, q: 5, reveal: 1.2, howto: 0.8, howtoMax: 0.8, howtoShort: 0.5, hilo: 6, maj: 3, majReveal: 1, chReveal: 1, bet: 3, fq: 3, fr: 1, fstart: 1, fpower: 3, duel: 3, secret: 3 }));
  await host.click('#hostp'); await host.fill('#hname', 'Mateo'); await host.click('#hform button[type=submit]');
  const opened = await host.waitForSelector('.lob-code', { timeout: 15000 }).then(() => true, () => false);
  ok(opened, 'soba otvorena');
  const code = (await host.textContent('.lob-code')).trim();
  const players = [];
  for (const [n, seed] of [['Ana', 'pid-ana'], ['Iva', 'pid-iva']]) {
    const p = await mk(n, seed); const t0 = Date.now();
    await p.goto(URL + '#' + code); await p.fill('#name', n); await p.click('button[type=submit]');
    const j = await p.waitForSelector('[data-av]', { timeout: 20000 }).then(() => true, () => false);
    ok(j, n + ' se spojila preko releja za ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
    players.push(p);
  }
  await host.waitForTimeout(800);
  ok((await rows(host)).filter((x) => /Ana|Iva/.test(x)).length === 2, 'domaćin vidi obje igračice');
  await players[0].evaluate(() => { const b = document.querySelector('#app [data-av]:not([disabled])'); b.click(); });
  await host.evaluate(() => document.querySelector('#dstart').click());
  const seen = new Set();
  for (let t = 0; t < 600; t++) {
    for (const p of [host, ...players]) await p.evaluate(() => { const A = document.querySelector('#app'); const b = A && A.querySelector('[data-v]:not([disabled]), [data-p], [data-c]:not([disabled]), [data-bet]:not([disabled]), [data-hl], [data-mj], [data-sx], [data-du]'); if (b) b.click(); }).catch(() => {});
    const ph = await players[1].evaluate(() => (document.querySelector('#app .p-title, #app .ann-t, #app .mg-t') || {}).textContent || '').catch(() => '');
    if (ph) seen.add(ph.slice(0, 20));
    if (await players[1].$('#leave') && seen.size > 8 && /Pobjed|pobjed|Kraj/.test(ph)) break;
    if (/Pobjed|pobjed/.test(ph)) break;
    await host.waitForTimeout(250);
  }
  ok(seen.size >= 6, 'igra teče na mobitelu igračice (' + seen.size + ' različitih ekrana)');
  const st = brokerA.stats(); console.log('  relej: ' + st.pub + ' poruka, ' + Math.round(st.bytes / 1024) + ' KB, ' + st.conn + ' veza');
  ok(errors.length === 0, 'bez JS grešaka ' + errors.join(' | '));
  await b.close(); server.close(); await brokerA.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

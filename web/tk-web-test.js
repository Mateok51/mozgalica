'use strict';
// Krčmarove tajne ponude preko prave mreže (PeerJS mock ili MQTT relej): opcija u predvorju, privatni panel samo primatelju,
// ništa na tuđim uređajima ni na TV-u, zaključana oklada, javna kartica nakon otkrivanja, ponovno spajanje primatelja.
// Pokretanje (port 8766): node web/tk-web-test.js   ·   TV=1   ·   RELAY=1
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-tk'); fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(path.join(__dirname, 'multi-test.js'), 'utf8');
let MOCK = src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));
const RELAY = process.env.RELAY === '1', TV = process.env.TV === '1';
if (RELAY) MOCK = MOCK.replace("if (m.k === 'conn') {", "if (m.k === 'conn') { return;").replace("setTimeout(() => { if (!c.open && !this.destroyed) this._emit('error', { type: 'peer-unavailable' }); }, 1500);", "");
MOCK = MOCK.replace("else if (m.k === 'data') { const c = this.conns[m.cid]; if (c && c.open) c._emit('data', m.d); }", "else if (m.k === 'data') { const c = this.conns[m.cid]; if (c && c.open) { (window.__recv = window.__recv || []).push(JSON.stringify(m.d)); if (window.__recv.length > 600) window.__recv.shift(); c._emit('data', m.d); } }");
MOCK = "window.__MQTT_URLS = ['ws://localhost:8767/mqtt'];\n" + MOCK;
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html')); if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); } if (p.endsWith('index.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(p, 'utf8').replace("connect-src 'self'", "connect-src 'self' ws://localhost:8767")); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
// ponude od 2. pitanja, uvijek (chance 1) — samo za test; bez mini-igara i posebnih bitaka
const CFGX = { qv: { who: 0, emoji: 0 }, chal: ['sort', 'link'], betEvents: [0, 0], intro: 0.4, vote: 6, voteShow: 0.6, roul: 0.4, power: 2, q: 8, reveal: 10, howto: 0.5, howtoMax: 0.5, howtoShort: 0.3, sort: 3, link: 3, chReveal: 0.5, pactAfter: 99, rcAfter: 99, fstart: 1, fpower: 2, fq: 3, fr: 1,
  tk: { win: 150, loss: 0, after: 1, perGame: 2, offers: 2, chance: 1, gap: 1 } };
(async () => {
  const broker = require('./mini-broker').start(8767);
  await new Promise((r) => server.listen(8766, r)); const URL = 'http://localhost:8766/';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 360, height: 640 } });
  await ctx.addInitScript(MOCK); await ctx.route(/unpkg\.com|jsdelivr|fonts\./, (r) => r.abort());
  const errors = [];
  const mk = async (name, seed) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(name + ': ' + e.message)); await p.addInitScript((sd) => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (k) => k === 'mz_pid' ? sd : (k === 'mz_name' ? null : real(k)); }, seed); p.__n = name; p.__seed = seed; return p; };
  const join = async (p, code) => { await p.goto(URL + '#' + code); await p.fill('#name', p.__n); await p.click('button[type=submit]'); await p.waitForSelector('#app', { timeout: 20000 }); };
  console.log('Način:', TV ? 'TV + mobiteli' : 'samo mobiteli', RELAY ? '(relej)' : '(izravno)');
  let host, code;
  if (TV) {
    host = await mk('TV', 'pid-tv'); await host.setViewportSize({ width: 1280, height: 720 }); await host.goto(URL);
    await host.evaluate((c) => Object.assign(CFG, c), CFGX); await host.click('#host'); await host.waitForSelector('.lob-code'); code = (await host.textContent('.lob-code')).trim();
  } else {
    host = await mk('Mateo', 'pid-mateo'); await host.goto(URL);
    await host.evaluate((c) => Object.assign(CFG, c), CFGX);
    await host.click('#hostp'); await host.fill('#hname', 'Mateo'); await host.click('#hform button[type=submit]');
    await host.waitForSelector('.lob-code'); code = (await host.textContent('.lob-code')).trim();
  }
  const P = TV ? [] : [host];
  for (const [n, seed] of (TV ? [['Mateo', 'pid-mateo'], ['Ana', 'pid-ana'], ['Iva', 'pid-iva']] : [['Ana', 'pid-ana'], ['Iva', 'pid-iva']])) {
    const p = await mk(n, seed); await join(p, code);
    await p.waitForSelector('[data-av]', { timeout: 20000 });
    await p.evaluate(() => { const bb = document.querySelector('#app [data-av]:not([disabled])'); if (bb) bb.click(); });
    P.push(p);
  }
  await host.waitForTimeout(800);
  // predvorje: opcija postoji, isključena po zadanom, domaćin je uključuje
  const tg = await host.$('[data-tkopt="1"]');
  ok(!!tg && /Krčmarove tajne ponude/.test(await host.textContent('#app')), 'predvorje: „🍺 Krčmarove tajne ponude” isključeno po zadanom');
  if (TV) { await host.screenshot({ path: OUT + '/0-tv-predvorje.png' }); const bx = await host.evaluate(() => { const e = document.querySelector('[data-tkopt]').closest('.lob-opt').getBoundingClientRect(); return [Math.round(e.bottom), innerHeight]; }); ok(bx[0] <= bx[1], 'TV 1280×720: opcija je cijela vidljiva (dno ' + bx[0] + ' ≤ ' + bx[1] + ')'); }
  await host.evaluate(() => document.querySelector('[data-tkopt="1"]').click());
  await host.waitForSelector('[data-tkopt="0"]', { timeout: 3000 });
  const info = await P[P.length - 1].waitForFunction(() => [...document.querySelectorAll('#app .lob-info')].map((e) => e.textContent).join(' | ').includes('tajne ponude'), null, { timeout: 8000 }).then(() => P[P.length - 1].evaluate(() => [...document.querySelectorAll('#app .lob-info')].map((e) => e.textContent).join(' | ')), () => '');
  ok(/tajne ponude su uključene/.test(info), 'igrači vide da je uključeno');
  if (TV) await host.evaluate(() => document.querySelector('#start').click()); else await host.evaluate(() => document.querySelector('#dstart').click()).catch(() => {});
  const clickAll = (pp) => Promise.all(pp.map((p) => p.evaluate(() => { const A = document.getElementById('app'); if (!A) return; const bb = A.querySelector('[data-v]:not([disabled]), #nopw, [data-c]:not([disabled])'); if (bb) bb.click(); }).catch(() => {})));
  // čekaj ponudu: točno jedan mobitel smije imati panel
  let bettor = null;
  for (let t = 0; t < 500 && !bettor; t++) {
    await clickAll(P);
    for (const p of P) if (await p.$('#app .tk-inv')) bettor = p;
    if (!bettor) await host.waitForTimeout(120);
  }
  ok(!!bettor, 'ponuda je stigla: ' + (bettor ? bettor.__n : 'nitko'));
  if (!bettor) { await b.close(); server.close(); await broker.close(); process.exit(1); }
  await bettor.waitForTimeout(1500);
  const vis = await bettor.evaluate(() => { const e = document.querySelector('#app .tk-inv'); const r = e.getBoundingClientRect(); const top = document.elementFromPoint(r.left + r.width / 2, r.top + 20); return { ph: document.documentElement.dataset.ph, r: [r.top, r.bottom].map(Math.round), onTop: !!(top && e.contains(top)), cls: top ? top.className : '' }; });
  ok(vis.onTop, 'panel je vidljiv na vrhu (' + JSON.stringify(vis) + ')');
  await bettor.screenshot({ path: OUT + '/1-ponuda-' + bettor.__n + '.png' });
  const others = P.filter((p) => p !== bettor);
  const line = await bettor.textContent('#app .tk-inv .pk-inv-s');
  ok(/Ako .* pogriješi: \+150/.test(await bettor.textContent('#app .tk-inv')), 'panel: naslov, komentar, dobitak, gubitak, gumbi — ' + line.trim());
  const ph = await bettor.evaluate(() => document.documentElement.dataset.ph);
  ok(ph === 'vote', 'ponuda je u glasanju (prije otkrivanja kategorije i pitanja)');
  for (const p of others) ok(!(await p.$('#app .tk-inv')) && !(await p.$('#app .tk-tag')), p.__n + ' ne vidi tuđu ponudu');
  if (TV) ok(!(await host.$('#app .tk-inv')) && !/Tajna krčmarova/.test(await host.textContent('#app')), 'TV ne prikazuje ponudu');
  // mali ekran: panel stane, bez vodoravnog pomaka i bez smanjivanja
  const box = await bettor.evaluate(() => { const e = document.querySelector('#app .tk-inv').getBoundingClientRect(); return { l: e.left, r: e.right, w: innerWidth, sw: document.documentElement.scrollWidth, zoom: getComputedStyle(document.documentElement).zoom || '1', btn: [...document.querySelectorAll('#app .tk-inv button')].map((x) => x.getBoundingClientRect().height) }; });
  ok(box.l >= 0 && box.r <= box.w + 0.5 && box.sw <= box.w + 1, 'panel stane u 360 px (' + Math.round(box.l) + '–' + Math.round(box.r) + ', scrollWidth ' + box.sw + ')');
  ok(box.btn.every((h) => h >= 40) && (box.zoom === '1' || box.zoom === 'normal'), 'gumbi su dovoljno veliki (' + box.btn.map(Math.round).join(', ') + ' px), bez globalnog smanjivanja');
  // mreža: tuđi preglednici nikad ne primaju ponudu
  if (!RELAY) for (const p of others) { const rec = await p.evaluate(() => (window.__recv || []).join('\n')); ok(rec.length > 0 && !rec.includes(line.trim().slice(1, 25)) && !/"tk":\{/.test(rec), 'mreža: ' + p.__n + ' nikad ne prima tuđu ponudu'); }
  await bettor.evaluate(() => document.querySelector('#app [data-tk="tkAccept"]').click());
  const tag = await bettor.waitForSelector('#app .tk-tag', { timeout: 15000 }).then(() => true, () => false);
  ok(tag, 'prihvaćeno: primatelj vidi zaključanu okladu nakon glasanja');
  // ponovno spajanje primatelja tijekom zaključane oklade
  if (bettor !== host) {
    await bettor.close();
    const nb = await mk(bettor.__n, bettor.__seed); await join(nb, code);
    P[P.indexOf(bettor)] = nb; bettor = nb;
    const back = await nb.waitForSelector('#app .tk-tag, #app .tkx', { timeout: 20000 }).then(() => true, () => false);
    ok(back, 'nakon ponovnog spajanja primatelj dobiva ispravno privatno stanje oklade');
  }
  // tijekom pitanja: oznaka ne prekriva odgovore
  const qok = await bettor.waitForSelector('#app [data-c]', { timeout: 20000 }).then(() => true, () => false);
  if (qok) {
    const ov = await bettor.evaluate(() => { const t = document.querySelector('#app .tk-tag'); if (!t) return 'bez oznake'; const r = t.getBoundingClientRect(); return [...document.querySelectorAll('#app [data-c]')].some((x) => { const q = x.getBoundingClientRect(); return !(q.bottom <= r.top || q.top >= r.bottom || q.right <= r.left || q.left >= r.right); }) ? 'preklapa' : 'ok'; });
    ok(ov !== 'preklapa', 'tijekom pitanja oznaka ne prekriva odgovore (' + ov + ')');
    await bettor.screenshot({ path: OUT + '/2-pitanje-' + bettor.__n + '.png' });
  }
  // svi odgovaraju; na otkrivanju svi ekrani (i TV) dobiju istu javnu karticu
  for (let t = 0; t < 60; t++) { await clickAll(P); if (await P[0].$('#app .tkx')) break; await host.waitForTimeout(200); }
  const screens = TV ? [host, ...P] : P;
  const seen = await Promise.all(screens.map((p) => p.waitForSelector('#app .tkx', { timeout: 20000 }).then(() => p.textContent('#app .tkx'), () => '')));
  ok(seen.every((x) => x && x === seen[0]), 'svi ekrani' + (TV ? ' i TV' : '') + ' prikazuju isti ishod: ' + seen[0].trim());
  await Promise.all(screens.map((p) => p.evaluate(() => { const e = document.querySelector('#app .tkx'); if (e) e.scrollIntoView({ block: 'center' }); }).catch(() => {})));
  await Promise.all(screens.map((p) => p.waitForFunction(() => { const e = document.querySelector('#app .tkx'); const bx = e && e.closest('.rv-b'); return e && (!bx || +getComputedStyle(bx).opacity > 0.95); }, null, { timeout: 12000 }).catch(() => {})));
  await host.waitForTimeout(1200);
  await Promise.all(screens.map((p) => p.evaluate(() => { const e = document.querySelector('#app .tkx'); if (e) e.scrollIntoView({ block: 'center' }); }).catch(() => {})));
  await host.waitForTimeout(400);
  await Promise.all(screens.map((p) => p.screenshot({ path: OUT + '/3-ishod-' + p.__n + '.png' })));
  const mo = await Promise.all(screens.map((p) => p.evaluate(() => document.querySelectorAll('#app .tkx').length)));
  ok(mo.every((n) => n === 1), 'jedna kartica po ekranu (bez dupliciranja)');
  ok(errors.length === 0, 'bez JS grešaka ' + errors.join(' | '));
  await b.close(); server.close(); await broker.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

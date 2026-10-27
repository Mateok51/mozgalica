'use strict';
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-pact'); fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(path.join(__dirname, 'multi-test.js'), 'utf8');
let MOCK = src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));
const RELAY = process.env.RELAY === '1', TV = process.env.TV === '1';
if (RELAY) MOCK = MOCK.replace("if (m.k === 'conn') {", "if (m.k === 'conn') { return;").replace("setTimeout(() => { if (!c.open && !this.destroyed) this._emit('error', { type: 'peer-unavailable' }); }, 1500);", "");
MOCK = MOCK.replace("else if (m.k === 'data') { const c = this.conns[m.cid]; if (c && c.open) c._emit('data', m.d); }", "else if (m.k === 'data') { const c = this.conns[m.cid]; if (c && c.open) { (window.__recv = window.__recv || []).push(JSON.stringify(m.d)); if (window.__recv.length > 400) window.__recv.shift(); c._emit('data', m.d); } }");
MOCK = "window.__MQTT_URLS = ['ws://localhost:8767/mqtt'];\n" + MOCK;
const server = http.createServer((req, res) => { /* CSPFIX: testni MQTT na localhostu */ const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html')); if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); } if (p.endsWith('index.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(p, 'utf8').replace("connect-src 'self'", "connect-src 'self' ws://localhost:8767")); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const CFGX = process.env.LOYAL === '1' ? { qv: { who: 0, emoji: 0 }, chal: ['sort', 'link'], betEvents: [0, 0], intro: 0.3, vote: 1.2, voteShow: 0.4, roul: 0.3, power: 1.2, q: 2.5, reveal: 1, howto: 0.4, howtoMax: 0.4, howtoShort: 0.3, sort: 1.5, link: 1.5, chReveal: 0.4, pactAfter: 1, loyalShow: 6, fstart: 1, duel: 2, duelIntro: 0.5, duelRes: 0.5, secret: 2, secret2: 2, moment: 0.5 } : { qv: { who: 0, emoji: 0 }, chal: ['sort', 'link'], betEvents: [0, 0], intro: 0.4, vote: 2.5, voteShow: 0.6, roul: 0.4, power: 2.5, q: 9, reveal: 2, howto: 0.5, howtoMax: 0.5, howtoShort: 0.3, sort: 3, link: 3, chReveal: 0.5, pactAfter: 1, betrayShow: 6.5, fstart: 1, fpower: 2, fq: 3, fr: 1 };
(async () => {
  const broker = require('./mini-broker').start(8767);
  await new Promise((r) => server.listen(8766, r)); const URL = 'http://localhost:8766/';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 800 } });
  await ctx.addInitScript(MOCK); await ctx.route(/unpkg\.com|jsdelivr|fonts\./, (r) => r.abort());
  const errors = [], recv = {};
  const mk = async (name, seed) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(name + ': ' + e.message)); await p.addInitScript((sd) => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (k) => k === 'mz_pid' ? sd : (k === 'mz_name' ? null : real(k)); }, seed); p.__n = name; return p; };
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
  ok(await host.$('[data-popt]') !== null, 'domaćin vidi prekidač Tajni paktovi');
  const P = TV ? [] : [host];
  for (const [n, seed] of (TV ? [['Mateo', 'pid-mateo'], ['Ana', 'pid-ana'], ['Iva', 'pid-iva'], ['Luka', 'pid-luka']] : [['Ana', 'pid-ana'], ['Iva', 'pid-iva'], ['Luka', 'pid-luka']])) {
    const p = await mk(n, seed); await p.goto(URL + '#' + code); await p.fill('#name', n); await p.click('button[type=submit]');
    await p.waitForSelector('[data-av]', { timeout: 20000 });
    await p.evaluate(() => { const b = document.querySelector('#app [data-av]:not([disabled])'); if (b) b.click(); });
    P.push(p);
  }
  const by = (n) => P.find((p) => p.__n === n);
  const ana = by('Ana'), iva = by('Iva'), luka = by('Luka'), mateo = by('Mateo');
  // presretni sve što stiže igračima preko mreže (za provjeru privatnosti)
  await host.waitForTimeout(800);
  if (TV) await host.evaluate(() => document.querySelector('#start').click()); else await host.evaluate(() => document.querySelector('#dstart').click()).catch(() => {});
  const answerAll = async (fn) => { for (const p of P) await p.evaluate((f) => { const b = document.querySelector('#app [data-c]:not([disabled])'); if (b && !(window.__noAns)) b.click(); }).catch(() => {}); };
  const clickAll = () => Promise.all(P.map((p) => p.evaluate(() => { const A = document.getElementById('app'); const b = A.querySelector('[data-v]:not([disabled]), #nopw, [data-sx], [data-sy="1"]'); if (b) b.click(); }).catch(() => {})));
  // pričekaj da pakt postane dostupan (nakon 1. pitanja u ovom testu)
  let offered = false;
  for (let t = 0; t < 400 && !offered; t++) {
    await clickAll();
    if (await ana.$('#app [data-pkopen]')) { await ana.evaluate(() => document.querySelector('#app [data-pkopen]').click()); await ana.waitForTimeout(200);
      const ivaId = await iva.evaluate(() => 'pid-iva');
      offered = await ana.evaluate((id) => { const b = document.querySelector('#app [data-pk="offer"][data-to="' + id + '"]'); if (b) { b.click(); return true; } return false; }, ivaId);
    }
    await host.waitForTimeout(150);
  }
  ok(offered, 'Ana je ponudila pakt Ivi preko gumba „Tajni pakt”');
  const ivaInv = await iva.waitForSelector('#app .pk-inv', { timeout: 8000 }).then(() => true, () => false);
  ok(ivaInv, 'Iva vidi ponudu „Ana ti nudi tajni pakt!”');
  await iva.screenshot({ path: OUT + '/1-ponuda.png' });
  ok(!(await luka.$('#app .pk-inv')) && !(await luka.$('#app .pk-bar')), 'Luka ne vidi tuđu ponudu');
  await iva.evaluate(() => document.querySelector('#app .pk-inv [data-pk="accept"]').click());
  const both = await Promise.all([ana, iva].map((p) => p.waitForSelector('#app .pk-bar', { timeout: 8000 }).then(() => true, () => false)));
  ok(both[0] && both[1], 'Ana i Iva vide traku pakta s imenom saveznika');
  ok(!(await luka.$('#app .pk-bar')) && (!mateo || !(await mateo.$('#app .pk-bar'))), 'ostali ne vide pakt');
  const lukaHtml = await luka.evaluate(() => document.getElementById('app').innerHTML);
  ok(!/pk-tre|riznica:/i.test(lukaHtml), 'Luka nema podatke o riznici u DOM-u');
  // privatnost na razini mreže: Lukin preglednik nikad ne dobiva tuđi PV
  if (!RELAY) { const rec = await luka.evaluate(() => (window.__recv || []).join('\n')); ok(rec.length > 0 && !/"k":\{"m"/.test(rec) && !/"inv":\[\{/.test(rec), 'mreža: Luka nikad ne prima tuđi pakt, riznicu ni ponude'); }
  if (process.env.LOYAL === '1') {
    let seenL = false;
    const CF = { q: 2, vote: 1, power: 1, reveal: 0.6, sort: 1.5, link: 1.5 };
    for (let t = 0; t < 900 && !seenL; t++) {
      await Promise.all(P.map((p) => p.evaluate(() => { const A = document.getElementById('app'); const b = A.querySelector('[data-v]:not([disabled]), #nopw, [data-c]:not([disabled]), [data-sx], [data-sy="1"]'); if (b) b.click(); }).catch(() => {})));
      seenL = !!(await luka.$('#app .bt.ly'));
      await host.waitForTimeout(150);
    }
    ok(seenL, 'svi dočekaju „ODANOST DO KRAJA” prije finala');
    await host.waitForTimeout(2500);
    for (const p of [luka, ana]) await p.screenshot({ path: OUT + '/4-odanost-' + p.__n + '.png' });
    ok(errors.length === 0, 'bez JS grešaka ' + errors.join(' | '));
    await b.close(); server.close(); await broker.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
  }
  // šapat i izdaja u sljedećem pitanju
  let whisp = false, armed = false;
  for (let t = 0; t < 400 && !(whisp && armed); t++) {
    await clickAll();
    if (!whisp && await ana.$('#app [data-whopen]')) { await ana.evaluate(() => document.querySelector('#app [data-whopen]').click()); await ana.waitForTimeout(150); whisp = await ana.evaluate(() => { const b = document.querySelector('#app [data-wh="2"]'); if (b) { b.click(); return true; } return false; }); }
    if (whisp && !armed && await iva.$('#app [data-bt="1"]')) { await iva.evaluate(() => document.querySelector('#app [data-bt="1"]').click()); armed = true; }
    await host.waitForTimeout(150);
  }
  ok(whisp, 'Ana šapuće C');
  const whin = await iva.waitForSelector('#app .pk-whin', { timeout: 5000 }).then(() => iva.textContent('#app .pk-whin'), () => '');
  ok(/C/.test(whin), 'Iva vidi šapat: ' + whin.trim());
  ok(!(await luka.$('#app .pk-whin')), 'Luka ne vidi šapat');
  await iva.waitForSelector('#app .pk-bar.armed', { timeout: 4000 }).catch(() => {});
  ok(armed && await iva.$('#app .pk-bar.armed') !== null, 'Iva je pripremila izdaju');
  ok(!(await ana.$('#app .pk-bar.armed')) && !(await ana.$('#app .pk-note')), 'Ana ne vidi pripremljenu izdaju');
  await iva.screenshot({ path: OUT + '/2-pitanje-izdaja.png' });
  // svi odgovaraju; nakon otkrivanja svi moraju vidjeti izdaju
  for (let t = 0; t < 60; t++) { await answerAll(); if (await luka.$('#app .rv')) break; await host.waitForTimeout(200); }
  const screens = TV ? [host, ...P] : P;
  const seen = await Promise.all(screens.map((p) => p.waitForSelector('#app .bt', { timeout: 25000 }).then(() => true, () => false)));
  ok(seen.every(Boolean), 'svi ekrani (' + screens.length + ', uključujući domaćina' + (TV ? ' i TV' : '') + ') prikazuju „IZDAJA U KRČMI!”');
  await host.waitForTimeout(3000);
  const texts = await Promise.all(screens.map((p) => p.evaluate(() => [...document.querySelectorAll('#app .bt-row')].map((e) => { const n = e.querySelector('[data-to]'); return e.firstChild.textContent.trim() + ' ' + (n ? n.dataset.pre + n.dataset.to : (e.querySelector('b') || {}).textContent); }).join(' | ')).catch(() => '')));
  ok(texts.every((t) => t && t === texts[0]), 'svi vide iste iznose: ' + texts[0]);
  ok(/IVA.*ANA/.test(await luka.textContent('#app .bt-s')), 'naslov: Iva 🗡️ Ana (' + (await luka.textContent('#app .bt-s')).trim() + ')');
  for (const p of screens) await p.screenshot({ path: OUT + '/3-izdaja-' + p.__n + '.png' });
  await host.waitForTimeout(4500);
  ok(!(await ana.$('#app .pk-bar')) && !(await iva.$('#app .pk-bar')), 'pakt je prekinut kod oboje');
  ok(errors.length === 0, 'bez JS grešaka ' + errors.join(' | '));
  const st = broker.stats(); if (RELAY) console.log('  relej: ' + st.pub + ' poruka');
  await b.close(); server.close(); await broker.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

'use strict';
// Krčmar 2.0 uz TV: ploča (Spremno na TV-u, Nastavi na mobitelima), izazov vođi i konop na TV-u, ponovno spajanje igrača na ploči.
// Pokretanje (port 8766): node web/kr-tv-test.js   ·   RELAY=1
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-kr'); fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(path.join(__dirname, 'multi-test.js'), 'utf8');
let MOCK = src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));
const RELAY = process.env.RELAY === '1';
if (RELAY) MOCK = MOCK.replace("if (m.k === 'conn') {", "if (m.k === 'conn') { return;").replace("setTimeout(() => { if (!c.open && !this.destroyed) this._emit('error', { type: 'peer-unavailable' }); }, 1500);", "");
MOCK = "window.__MQTT_URLS = ['ws://localhost:8767/mqtt'];\n" + MOCK;
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html')); if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); } if (p.endsWith('index.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(p, 'utf8').replace("connect-src 'self'", "connect-src 'self' ws://localhost:8767")); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const CFGX = { kr: { wait: 45, pactOffers: 0, pactFrom: 99, pactChance: 0, pactMin: 3, offFrom: 99, offChance: 0, offMax: 0, chFrom: 2, chGap: 0, chWait: 12, chStakeA: 150, chStakeB: 300, chGuard: 150, rope: 10, ropeWin: 7, ropeN: 40 }, duelIntro: 2, qv: { who: 0, emoji: 0 }, chal: ['sort', 'link'], betEvents: [0, 0], intro: 0.4, vote: 3, voteShow: 0.5, roul: 0.3, power: 3, q: 8, reveal: 2, howto: 0.5, howtoMax: 0.5, howtoShort: 0.3, sort: 3, link: 3, chReveal: 0.5 };
(async () => {
  const broker = require('./mini-broker').start(8767);
  await new Promise((r) => server.listen(8766, r)); const URL = 'http://localhost:8766/';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true });
  await ctx.addInitScript(MOCK); await ctx.route(/unpkg\.com|jsdelivr|fonts\./, (r) => r.abort());
  const errors = [];
  const mk = async (name, seed) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(name + ': ' + e.message)); await p.addInitScript((sd) => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (k) => k === 'mz_pid' ? sd : (k === 'mz_name' ? null : real(k)); }, seed); p.__n = name; p.__seed = seed; return p; };
  const ph0 = (p) => p.evaluate(() => document.documentElement.dataset.ph).catch(() => '');
  const ph = (p) => ph0(p === tv ? P[0] : p);   // TV ne postavlja data-ph; faza se čita s mobitela
  const has = (p, s) => p.$(s).then((e) => !!e).catch(() => false);
  const click = (p, s) => p.evaluate((x) => { const e = document.querySelector(x); if (e) e.click(); return !!e; }, s).catch(() => false);
  const join = async (p, code) => { await p.goto(URL + '#' + code); await p.fill('#name', p.__n); await p.click('button[type=submit]'); await p.waitForSelector('#app', { timeout: 20000 }); };
  console.log('Način: TV + mobiteli', RELAY ? '(relej)' : '(izravno)');
  const tv = await mk('TV', 'pid-tv'); await tv.setViewportSize({ width: 1280, height: 720 }); await tv.goto(URL);
  await tv.evaluate((c) => Object.assign(CFG, c), CFGX); await tv.click('#host'); await tv.waitForSelector('.lob-code'); const code = (await tv.textContent('.lob-code')).trim();
  const P = [];
  for (const [n, seed] of [['Mateo', 'pid-mateo'], ['Ana', 'pid-ana'], ['Iva', 'pid-iva']]) {
    const p = await mk(n, seed); await join(p, code); await p.waitForSelector('[data-av]', { timeout: 20000 });
    await p.evaluate(() => { const x = document.querySelector('#app [data-av]:not([disabled])'); if (x) x.click(); }); P.push(p);
  }
  await tv.waitForTimeout(800); await click(tv, '#start');
  const auto = (pp) => Promise.all(pp.map((p) => p.evaluate(() => { const A = document.getElementById('app'); const x = A && A.querySelector('[data-v]:not([disabled]), #nopw, [data-c]:not([disabled])'); if (x) x.click(); }).catch(() => {})));
  let t0 = Date.now(); while (Date.now() - t0 < 90000 && (await ph(tv)) !== 'reveal') { await auto(P); await tv.waitForTimeout(150); }
  ok((await ph(tv)) === 'reveal', 'prvo otkrivanje na TV-u');
  const btns = await Promise.all(P.map((p) => p.waitForSelector('#app #krok', { timeout: 12000 }).then(() => true, () => false)));
  ok(btns.every(Boolean), 'svi mobiteli imaju „Nastavi”');
  const tvTxt = await tv.waitForSelector('#app .kr-wait.tv', { timeout: 6000 }).then(() => tv.textContent('#app .kr-wait.tv'), () => '');
  ok(/Spremno\s*0\/3/.test(tvTxt), 'TV: ' + tvTxt.trim());
  ok(!(await has(tv, '#app #krok')), 'TV nema gumb Nastavi');
  // ponovno spajanje usred ploče: Iva zatvori i ponovno otvori
  await P[2].close(); const iva = await mk('Iva', 'pid-iva'); await join(iva, code); P[2] = iva;
  ok(await iva.waitForSelector('#app #krok', { timeout: 20000 }).then(() => true, () => false), 'Iva se vratila usred ploče i opet ima „Nastavi”');
  await click(P[0], '#app #krok'); await click(P[1], '#app #krok'); await tv.waitForTimeout(1200);
  const tv2 = await tv.textContent('#app .kr-wait.tv').catch(() => '');
  ok(/2\/3/.test(tv2) && (await ph(tv)) === 'reveal', 'TV uživo: ' + tv2.trim() + ', igra čeka Ivu');
  await tv.screenshot({ path: OUT + '/tv1-ploca.png' });
  await click(iva, '#app #krok');
  await tv.waitForFunction(() => document.documentElement.dataset.ph !== 'reveal', null, { timeout: 5000 }).catch(() => {});
  ok((await ph(tv)) !== 'reveal', 'svi potvrdili → TV ide dalje');
  // izazov vođi na sljedećoj ploči (chFrom 2, chGap 0)
  t0 = Date.now(); while (Date.now() - t0 < 90000 && !(await has(tv, '#app .kr-ch'))) { await auto(P); await tv.waitForTimeout(150); }
  if (!(await has(tv, '#app .kr-ch'))) console.log('     dbg', await ph(P[0]), (await Promise.all(P.map((p) => has(p, '#app .kr-ch')))).join(','), (await tv.textContent('#app')).slice(0, 200));
  ok(await has(tv, '#app .kr-ch'), 'TV prikazuje krčmarovo pitanje: ' + (await tv.textContent('#app .kr-ch').catch(() => '')).trim().slice(0, 80));
  await tv.screenshot({ path: OUT + '/tv2-izazov.png' });
  let chal = null; for (const p of P) if (await has(p, '#app [data-krc="1"]')) chal = p;
  ok(!!chal, 'izazivač: ' + (chal && chal.__n));
  let acc = false;
  for (let t = 0; t < 20 && chal && !acc; t++) { await click(chal, '#app [data-krc="1"]'); acc = await tv.waitForFunction(() => /Izazov prihvaćen/.test((document.querySelector('#app .kr-ch') || {}).textContent || ''), null, { timeout: 500 }).then(() => true, () => false); }
  ok(acc, 'TV: „Izazov prihvaćen”');
  await tv.waitForTimeout(500); for (const p of P) await click(p, '#app #krok');
  const rope = await P[0].waitForFunction(() => document.documentElement.dataset.ph === 'rope', null, { timeout: 20000 }).then(() => true, () => false); await tv.waitForTimeout(500);
  ok(rope && await has(tv, '#app .rope'), 'TV prikazuje nadvlačenje konopa');
  if (chal) for (let k = 0; k < 3; k++) { await click(chal, '#app [data-rpv="1"]'); await chal.waitForTimeout(300); }
  await tv.waitForTimeout(800); await tv.screenshot({ path: OUT + '/tv3-konop.png' });
  { const rt = (await tv.textContent('#app .rope').catch(() => '')).replace(/\s+/g, ' '); const pt = (await P[0].textContent('#app .rope').catch(() => '')).replace(/\s+/g, ' '); console.log('     konop TV: ' + rt + ' | mobitel ' + P[0].__n + ': ' + pt + ' | izazivač ' + (chal && chal.__n)); ok(chal && rt.includes(chal.__n), 'konop na TV-u prikazuje izazivača (' + (chal && chal.__n) + ')'); }
  const res = await tv.waitForSelector('#app .du-res', { timeout: 20000 }).then(() => tv.textContent('#app .du-res'), () => '');
  ok(/ruši vođu|brani krunu|Neriješeno/.test(res), 'TV rezultat: ' + res.trim());
  await tv.screenshot({ path: OUT + '/tv4-rezultat.png' });
  ok(errors.length === 0, 'bez JS grešaka ' + errors.join(' | '));
  await b.close(); server.close(); await broker.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

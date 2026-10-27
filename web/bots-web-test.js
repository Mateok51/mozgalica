'use strict';
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), SHOTS = path.join(__dirname, 'shots-bots');
fs.mkdirSync(SHOTS, { recursive: true });
const src = fs.readFileSync(path.join(__dirname, 'multi-test.js'), 'utf8');
const MOCK = src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));
const server = http.createServer((req, res) => {
  const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain';
  res.writeHead(200, { 'content-type': type }); fs.createReadStream(p).pipe(res);
});
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  await new Promise((r) => server.listen(8766, r));
  const URL = 'http://localhost:8766/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  await ctx.addInitScript(MOCK);
  await ctx.route(/unpkg\.com|jsdelivr|fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
  const errors = [];
  const mk = async (name, seed, vp) => { const p = await ctx.newPage(); if (vp) await p.setViewportSize(vp); p.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    await p.addInitScript((sd) => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (k) => k === 'mz_pid' ? sd : (k === 'mz_name' ? null : real(k)); }, seed); return p; };
  const P = (pg) => pg.evaluate(() => [...document.querySelectorAll('#app .lob-row, #app .tvlob-slot[data-a]')].map((r) => ({ a: +r.dataset.a, b: !!r.dataset.bot, n: (r.querySelector('.nm, .pick-nm') || {}).textContent || '' })));
  const click = (pg, sel) => pg.evaluate((s) => { const b = document.querySelector(s); if (b) b.click(); return !!b; }, sel);

  console.log('1) Domaćin na mobitelu dodaje botove');
  const host = await mk('Mateo', 'pid-mateo');
  await host.goto(URL);
  await host.evaluate(() => Object.assign(CFG, { chal: ['hilo', 'maj'], intro: 0.8, vote: 4, voteShow: 1, power: 5, q: 6, reveal: 1.5, howto: 1, howtoShort: 0.5, hilo: 10, maj: 5, majReveal: 1, chReveal: 1.5, fq: 4, fr: 1.5 }));
  await host.click('#hostp'); await host.fill('#hname', 'Mateo'); await host.click('#hform button[type=submit]');
  await host.waitForSelector('.lob-bots', { timeout: 6000 });
  const code = (await host.textContent('.lob-code')).trim();
  ok(await host.$eval('#dstart', (b) => b.disabled), 'bez botova i igrača početak onemogućen');
  await click(host, '[data-bots="1"]'); await click(host, '[data-bots="1"]'); await host.waitForTimeout(200);
  let ps = await P(host);
  ok(ps.filter((p) => p.b).length === 2, '2 bota dodana');
  ok(!(await host.$eval('#dstart', (b) => b.disabled)), 'početak omogućen s botovima');
  await host.screenshot({ path: SHOTS + '/1-mobitel-botovi.png', fullPage: true });

  console.log('2) Igračica uzima lika kojeg drži bot');
  const botAv = ps.find((p) => p.b).a;
  const ana = await mk('Ana', 'pid-ana');
  await ana.goto(URL + '#' + code); await ana.fill('#name', 'Ana'); await ana.click('button[type=submit]');
  await ana.waitForSelector('[data-av]', { timeout: 6000 });
  ok(!(await ana.$eval('[data-av="' + botAv + '"]', (b) => b.disabled)), 'lik bota nije zaključan za pravog igrača');
  await click(ana, '[data-av="' + botAv + '"]'); await ana.waitForTimeout(500);
  ps = await P(host);
  const anaP = ps.find((p) => !p.b && p.n.startsWith('Ana'));
  ok(anaP && anaP.a === botAv, 'Ana dobila lika bota ' + botAv + ' ' + JSON.stringify(ps));
  ok(new Set(ps.map((p) => p.a)).size === ps.length, 'bot premješten na drugi lik');
  await ana.screenshot({ path: SHOTS + '/2-igrac-predvorje.png', fullPage: true });

  console.log('3) Max botova i igra');
  for (let i = 0; i < 6; i++) await click(host, '[data-bots="1"]');
  ps = await P(host); ok(ps.length === 6 && ps.filter((p) => p.b).length === 4, 'soba puna: 2 čovjeka + 4 bota');
  ok(await host.$eval('[data-bots="1"]', (b) => b.disabled), '+ onemogućen kad je soba puna');
  await click(host, '[data-bots="-1"]'); await host.waitForTimeout(200);
  ps = await P(host); ok(ps.filter((p) => p.b).length === 3, 'bot uklonjen');
  await click(host, '#dstart');
  const seen = new Set();
  for (let t = 0; t < 120; t++) {
    const ph = await host.evaluate(() => (document.querySelector('#app') || {}).className + ' ' + ((document.querySelector('#app .p-title, #app .whoq-k, #app .ann-t') || {}).textContent || '')); seen.add(ph.slice(0, 60));
    for (const pg of [host, ana]) await pg.evaluate(() => { const b = document.querySelector('#app [data-v]:not([disabled]), #app [data-c]:not([disabled]), #app [data-hl], #app [data-mj], #app [data-bet]:not([disabled]), #app [data-sx]'); if (b) b.click(); });
    if (seen.size > 8) break;
    await host.waitForTimeout(500);
  }
  ok(seen.size > 4, 'igra s botovima teče (' + seen.size + ' ekrana)');
  await host.close(); await ana.close();

  console.log('4) TV predvorje s botovima');
  const tv = await mk('TV', 'pid-tv', { width: 1280, height: 720 });
  await tv.goto(URL); await tv.click('#host');
  await tv.waitForSelector('.lob-bots', { timeout: 6000 });
  await click(tv, '[data-bots="1"]'); await click(tv, '[data-bots="1"]'); await click(tv, '[data-bots="1"]'); await tv.waitForTimeout(400);
  ok((await P(tv)).filter((p) => p.b).length === 3, 'TV: 3 bota');
  ok(await tv.$eval('#start', (b) => b.disabled), 'TV: bez pravog igrača ne može početi');
  await tv.screenshot({ path: SHOTS + '/3-tv-predvorje.png' });

  ok(errors.length === 0, 'bez JS grešaka ' + errors.join(' | '));
  await browser.close(); server.close();
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

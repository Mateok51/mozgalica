'use strict';
// Način bez TV-a: domaćin igra s mobitela + 2 igrača. Veza simulirana istim lažnim Peerom kao multi-test.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const SITE = path.join(__dirname, 'site');
const SHOTS = path.join(__dirname, 'shots-notv');
fs.mkdirSync(SHOTS, { recursive: true });
const src = fs.readFileSync(path.join(__dirname, 'multi-test.js'), 'utf8');
const MOCK = src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));

const server = http.createServer((req, res) => {
  const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain';
  res.writeHead(200, { 'content-type': type }); fs.createReadStream(p).pipe(res);
});
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };

(async () => {
  await new Promise((r) => server.listen(8767, r));
  const URL = 'http://localhost:8767/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  await ctx.addInitScript(MOCK);
  await ctx.route(/unpkg\.com|jsdelivr|fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
  const errors = [];
  const mk = async (name, seed) => {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    await p.addInitScript((sd) => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (k) => k === 'mz_pid' ? sd : (k === 'mz_name' ? null : real(k)); }, seed);
    return p;
  };

  console.log('1) Domaćin otvara sobu na mobitelu');
  const host = await mk('Mateo', 'pid-mateo');
  await host.goto(URL);
  await host.evaluate(([ch, QV]) => Object.assign(CFG, { chal: ch, qv: JSON.parse(QV), howto: 1.5, howtoMax: 1.5, howtoShort: 0.8, order: 12, hilo: 15, blitz: 10, maj: 6, majReveal: 1.5,  intro: 0.8, vote: 6, voteShow: 1.2, power: 8, q: 10, reveal: 2.5, sort: 20, link: 20, chReveal: 2.5, fq: 5, fr: 2 }), [(process.env.CHAL || 'sort,link').split(','), process.env.QV || '{"who":1,"emoji":1}']);
  if (process.env.PACE) await host.evaluate(() => { CFG.reveal = null; });
  await host.click('#hostp');
  await host.fill('#hname', 'Mateo');
  await host.click('#hform button[type=submit]');
  await host.waitForSelector('.lob-code', { timeout: 6000 });
  const code = (await host.textContent('.lob-code')).trim();
  ok(/^[A-Z]{4}$/.test(code), 'soba otvorena na mobitelu, kod ' + code);
  ok(await host.$eval('#dstart', (b) => b.disabled), 'početak je onemogućen dok nema drugih igrača');
  await host.click('[data-av="5"]');
  await host.screenshot({ path: SHOTS + '/1-domacin-predvorje.png' });

  console.log('2) Igrači se pridružuju');
  const players = [];
  for (const [n, seed, av] of [['Ana', 'pid-ana', 3], ['Iva', 'pid-iva', 6]]) {
    const p = await mk(n, seed);
    await p.goto(URL + '#' + code);
    await p.fill('#name', n);
    await p.click('button[type=submit]');
    await p.waitForSelector('[data-av]', { timeout: 6000 });
    await p.click('[data-av="' + av + '"]');
    players.push(p);
  }
  await host.waitForTimeout(500);
  const takenOnHost = await host.$$eval('.lob-row .nm', (els) => els.map((e) => e.textContent));
  ok(takenOnHost.includes('Ana') && takenOnHost.includes('Iva'), 'domaćin vidi oba igrača: ' + takenOnHost.join(', '));
  ok(!(await host.$eval('#dstart', (b) => b.disabled)), 'početak je sada omogućen');
  await host.click('#dstart');

  console.log('3) Prvo glasanje: ima li Power pick na svakom mobitelu?');
  const all = [host, ...players];
  for (let k = 0; k < 2; k++) {
    await Promise.all(all.map((p) => p.waitForSelector('.door-btn', { timeout: 20000 }).catch(() => null)));
    await host.waitForTimeout(300);
    for (const [i, p] of all.entries()) {
      const r = await p.evaluate(() => ({ btn: !!document.getElementById('ppBtn'), doors: document.querySelectorAll('.door-btn').length, me: (window.__dbg || null) }));
      ok(r.btn, 'glasanje ' + (k + 1) + ', mobitel ' + i + ': gumb Power pick ' + (r.btn ? 'postoji' : 'NEDOSTAJE') + ' (vrata ' + r.doors + ')');
      await p.screenshot({ path: SHOTS + '/pp-' + k + '-' + i + '.png' });
    }
    // svi glasaju, pa preskoči do sljedećeg glasanja
    for (const p of all) await p.click('.door-btn.o0').catch(() => {});
    await host.waitForTimeout(500);
    const t0 = Date.now();
    while (Date.now() - t0 < 60000) {
      for (const p of all) await p.evaluate(() => { const q = (s) => document.querySelector(s); const b = q('[data-c]:not([disabled])') || q('#ok:not([disabled])') || q('.btn-go:not([disabled])') || q('[data-pw=""]') || q('#skipPw') || q('#rvok') || q('#nastavi'); if (b) b.click(); }).catch(() => {});
      if (await host.$('.door-btn:not([disabled])')) break;
      await host.waitForTimeout(400);
    }
  }
  console.log(errors.length ? 'GREŠKE: ' + errors.join(' | ') : '');
  await browser.close(); server.close();
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

'use strict';
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-lob'); fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(path.join(__dirname, 'multi-test.js'), 'utf8');
const MOCK = "window.qrcode = () => ({ addData() {}, make() {}, getModuleCount: () => 25, isDark: (r, c) => (r * 7 + c * 3) % 5 < 2 });\nwindow.__MQTT_URLS = ['ws://localhost:1/x'];\n" + src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));
const server = http.createServer((req, res) => { /* CSPFIX: testni MQTT na localhostu */ const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html')); if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); } if (p.endsWith('index.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(p, 'utf8').replace("connect-src 'self'", "connect-src 'self' ws://localhost:8767")); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const dims = (pg) => pg.evaluate(() => {
  const r = (s) => { const e = document.querySelector('#app ' + s); if (!e) return null; const b = e.getBoundingClientRect(); return Math.round(b.width) + 'x' + Math.round(b.height) + '@' + getComputedStyle(e).fontSize; };
  const lp = document.querySelector('#app .lob-players'), se = document.scrollingElement;
  return { title: r('.lob-title'), card: r('.av-pick'), nm: r('.av-pick .pick-nm'), inv: r('#lobInv'), bots: r('.lob-bots'), start: r('#dstart'), leave: r('#leave'), zoom: document.getElementById('app').style.zoom || '1',
    list: lp ? { ch: lp.clientHeight, sh: lp.scrollHeight, more: lp.classList.contains('more') } : null, page: { sh: se.scrollHeight, ih: innerHeight } };
});
const key = (d) => JSON.stringify([d.title, d.card, d.nm, d.inv, d.bots, d.start, d.leave, d.zoom]);
(async () => {
  await new Promise((r) => server.listen(8766, r)); const URL = 'http://localhost:8766/';
  const b = await chromium.launch();
  for (const [w, h] of [[412, 780], [360, 640]]) {
    console.log('== ' + w + 'x' + h);
    const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
    await ctx.addInitScript(MOCK); await ctx.route(/unpkg\.com|jsdelivr|fonts\./, (r) => r.abort());
    const pg = await ctx.newPage();
    await pg.goto(URL); await pg.click('#hostp'); await pg.fill('#hname', 'Mateo'); await pg.click('#hform button[type=submit]');
    await pg.waitForSelector('.lob-code');
    const click = (s) => pg.evaluate((x) => { const e = document.querySelector(x); if (e) e.click(); }, s);
    await click('[data-bots="1"]'); await click('[data-bots="1"]'); await pg.waitForTimeout(300);
    const B = await dims(pg); await pg.screenshot({ path: OUT + '/' + w + '-B-2boti.png' });
    await click('[data-bots="1"]'); await click('[data-bots="1"]'); await pg.waitForTimeout(300);
    const A = await dims(pg); await pg.screenshot({ path: OUT + '/' + w + '-A-4bota.png' });
    console.log('  B:', key(B), JSON.stringify(B.list), JSON.stringify(B.page));
    console.log('  A:', key(A), JSON.stringify(A.list), JSON.stringify(A.page));
    ok(key(A) === key(B), 'scenarij A/B: naslov, kartice, gumbi i botovi istih dimenzija s 2 i 4 bota');
    ok(A.zoom === '1', 'nema globalnog smanjivanja (zoom)');
    // scenarij C: više stvarnih igrača
    const p2 = await ctx.newPage(); await p2.goto(URL + '#' + (await pg.textContent('.lob-code')).trim()); await p2.fill('#name', 'Ana'); await p2.click('button[type=submit]'); await p2.waitForSelector('[data-av]', { timeout: 8000 });
    await pg.waitForTimeout(600); const C = await dims(pg);
    ok(key(C) === key(A), 'scenarij C: novi stvarni igrač ne mijenja dimenzije');
    if (A.list.sh > A.list.ch) {
      ok(A.list.more, 'popis se pomiče sam za sebe i pokazuje da ima još redova');
      await pg.evaluate(() => { const l = document.querySelector('#app .lob-players'); l.scrollTop = l.scrollHeight; }); await pg.waitForTimeout(250);
      await click('[data-bots="-1"]'); await pg.waitForTimeout(300);
      ok(await pg.evaluate(() => document.querySelector('#app .lob-players').scrollTop > 0), 'položaj pomicanja popisa ostaje nakon promjene');
    }
    // scenarij D: pozivnica
    await click('#lobInv'); await pg.waitForTimeout(400);
    const D = await dims(pg), qr = await pg.evaluate(() => { const q = document.querySelector('.inv-qr'); return q ? Math.round(q.getBoundingClientRect().width) : 0; });
    await pg.screenshot({ path: OUT + '/' + w + '-D-pozivnica.png' });
    ok(key(D) === key(C), 'scenarij D: otvorena pozivnica ne mijenja ostatak sučelja');
    ok(qr >= 200, 'QR kod dovoljno velik za skeniranje: ' + qr + ' px');
    await click('#invClose'); await pg.waitForTimeout(200);
    ok(!(await pg.$('#invModal')), 'pozivnica se zatvara');
    // scenarij E/F: start dohvatljiv (po potrebi pomicanjem stranice), veći font
    await pg.addStyleTag({ content: 'body { font-size: 20px !important; } html { font-size: 20px !important; }' }); await pg.waitForTimeout(300);
    const F = await dims(pg);
    const reach = await pg.evaluate(() => { const s = document.querySelector('#dstart'); s.scrollIntoView(); const r = s.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; });
    ok(F.zoom === '1' && reach, 'scenarij E/F: s većim fontom gumb „Započni igru” dohvatljiv, bez smanjivanja');
    await pg.screenshot({ path: OUT + '/' + w + '-F-font.png', fullPage: true });
    await ctx.close();
  }
  await b.close(); server.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

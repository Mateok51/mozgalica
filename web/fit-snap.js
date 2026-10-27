const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-ovf');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
const VP = (process.env.VP || '360x640').split('x').map(Number);
const WANT = { 'Odaberi moć': 'moc', 'Tko sam ja': 'who', 'Dvoboj!': 'duel', 'Odaberi lika': 'lobby', 'Kladionica': 'bet' };
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: VP[0], height: VP[1] }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  await pg.goto('http://localhost:8766/');
  await pg.evaluate(() => Object.assign(CFG, { chal: ['order', 'maj'], qv: { who: 2 }, intro: 0.6, vote: 2.5, voteShow: 1.5, power: 3, q: 4, reveal: 2, howto: 1, howtoShort: 1, bet: 3, order: 3, maj: 2, majReveal: 1.5, chReveal: 1.5, fq: 2, fr: 1, fstart: 1, fpower: 2 }));
  await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.waitForTimeout(300);
  const got = {};
  const snap = async () => { const k = await pg.evaluate(() => (document.querySelector('#app .p-title, #app .whoq-k, #app .bet-t, #app .du-k') || {}).textContent || ''); for (const w in WANT) if (k.startsWith(w) && !got[w]) { got[w] = 1; await pg.waitForTimeout(400); await pg.screenshot({ path: OUT + '/fit-' + WANT[w] + '.png' }); } };
  await snap();
  await pg.evaluate(() => document.querySelector('#dstart').click());
  for (let t = 0; t < 700 && Object.keys(got).length < 5; t++) { await snap(); if (t % 4 === 3) await pg.evaluate(() => { const A = document.querySelector('#app'); const b = A && A.querySelector('[data-v]:not([disabled]), [data-bet]:not([disabled]), [data-c]:not([disabled]), [data-sx], [data-mj], [data-or]'); if (b) b.click(); }); await pg.waitForTimeout(120); if (await pg.$('#dagain')) break; }
  console.log(Object.keys(got)); await b.close(); server.close(); })();

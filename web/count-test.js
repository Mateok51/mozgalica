const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  for (const view of ['phone', 'tv']) {
  const pg = await b.newPage({ viewport: view === 'tv' ? { width: 1280, height: 720 } : { width: 390, height: 844 } }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8766/');
  await pg.evaluate(() => Object.assign(CFG, { qv: { emoji: 0, who: 0 }, intro: 0.3, vote: 1, voteShow: 0.5, roul: 0.5, power: 1, q: 3, reveal: 5, bet: 1 }));
  await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.evaluate(() => document.querySelector('#dstart').click());
  if (view === 'tv') { await pg.waitForTimeout(200); await pg.evaluate(() => document.getElementById('toTv').click()); }
  for (let t = 0; t < 300; t++) {
    await pg.evaluate(() => { const b = document.querySelector('#app [data-c]:not([disabled])'); if (b) b.click(); });
    if (await pg.$('#app [data-cu]')) break; await pg.waitForTimeout(100);
  }
  const t0 = Date.now(); const seq = [];
  for (let k = 0; k < 14; k++) { seq.push(((Date.now() - t0) / 1000).toFixed(1) + 's:' + (await pg.evaluate(() => [...document.querySelectorAll('#app [data-cu]')].map((e) => e.textContent.trim() + '(' + e.dataset.cu + '→' + e.dataset.to + ')').join(' ')))); await pg.waitForTimeout(250); }
  console.log(view, '\n ' + seq.join('\n '), errs); await pg.close(); }
  await b.close(); server.close(); })();

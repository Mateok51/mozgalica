const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8766/');
  await pg.evaluate(() => Object.assign(CFG, { qv: { emoji: 6 }, chal: [], intro: 0.5, vote: 2, voteShow: 0.5, power: 3, q: 6, reveal: 1, howto: 0.8, howtoShort: 0.4, bet: 2 }));
  await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.evaluate(() => document.querySelector('#dstart').click());
  const seen = [];
  for (let t = 0; t < 120; t++) {
    const s = await pg.evaluate(() => { const A = document.querySelector('#app'); return A.className + ' | ' + A.innerText.replace(/\s+/g, ' ').slice(0, 70); });
    if (seen[seen.length - 1] !== s) seen.push(s);
    await pg.evaluate(() => { const A = document.querySelector('#app'); const b = A && A.querySelector('[data-p], [data-v]:not([disabled]), [data-bet]:not([disabled]), [data-c]:not([disabled]), [data-sx]'); if (b) b.click(); });
    await pg.waitForTimeout(300);
  }
  console.log(seen.slice(0, 40).join('\n')); console.log(errs);
  await b.close(); server.close(); })();

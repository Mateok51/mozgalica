const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-mo');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 412, height: 892 }, deviceScaleFactor: 2 }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  await pg.goto('http://localhost:8766/'); await pg.waitForTimeout(800); await pg.screenshot({ path: OUT + '/home.png' });
  await pg.evaluate(() => Object.assign(CFG, { qv: { emoji: 0, who: 0 }, intro: 0.3, vote: 1, voteShow: 0.5, roul: 0.3, power: 1, q: 9, bet: 1 }));
  await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.evaluate(() => document.querySelector('#dstart').click());
  for (let t = 0; t < 200; t++) { if (await pg.$('#app [data-c]')) break; await pg.waitForTimeout(100); }
  await pg.waitForTimeout(700); await pg.screenshot({ path: OUT + '/question.png' });
  await b.close(); server.close(); })();

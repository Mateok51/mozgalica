const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = process.env.SITE || path.join(__dirname, 'site');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  await pg.addInitScript(() => { window.__draws = 0; const o = CanvasRenderingContext2D.prototype.clearRect; CanvasRenderingContext2D.prototype.clearRect = function () { window.__draws++; return o.apply(this, arguments); }; });
  await pg.goto('http://localhost:8766/'); await pg.waitForTimeout(3000);
  console.log('crtanja po platnu u 3 s na početnom ekranu:', await pg.evaluate(() => window.__draws));
  await b.close(); server.close(); })();

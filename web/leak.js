const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  const cdp = await pg.context().newCDPSession(pg); await cdp.send('Performance.enable');
  await pg.goto('http://localhost:8766/');
  await pg.evaluate(() => Object.assign(CFG, { qv: { emoji: 2, who: 1 }, intro: 0.5, vote: 2, voteShow: 0.5, power: 3, q: 5, reveal: 1, howto: 0.8, howtoShort: 0.4, bet: 2, sort: 6, link: 6, order: 6, hilo: 6, blitz: 6, maj: 3, chReveal: 1, fq: 3, fr: 1 }));
  await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.evaluate(() => document.querySelector('#dstart').click());
  const t0 = Date.now();
  for (let k = 0; k < 10; k++) {
    for (let i = 0; i < 40; i++) { await pg.evaluate(() => { const A = document.querySelector('#app'); const b = A && A.querySelector('[data-p], [data-v]:not([disabled]), [data-bet]:not([disabled]), [data-c]:not([disabled]), [data-sx], [data-hl], [data-mj], [data-bz]'); if (b) b.click(); }); await pg.waitForTimeout(250); }
    await cdp.send('HeapProfiler.collectGarbage');
    const m = await cdp.send('Performance.getMetrics'); const g = (n) => (m.metrics.find((x) => x.name === n) || {}).value;
    console.log(Math.round((Date.now() - t0) / 1000) + 's', 'heapMB', (g('JSHeapUsedSize') / 1e6).toFixed(1), 'nodes', g('Nodes'), 'listeners', g('JSEventListeners'), 'docs', g('Documents'), await pg.evaluate(() => document.querySelector('#app').innerText.replace(/\s+/g, ' ').slice(0, 40)));
    if (await pg.$('#dagain')) break;
  }
  await b.close(); server.close(); })();

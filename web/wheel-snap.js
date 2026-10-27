const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-wheel'); fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
const TIMES = [300, 900, 1800, 2700, 3500, 4300, 6200];
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  for (const view of ['phone', 'tv']) {
    const pg = await b.newPage({ viewport: view === 'tv' ? { width: 1280, height: 720 } : { width: 412, height: 892 } }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
    const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto('http://localhost:8766/');
    await pg.evaluate(() => Object.assign(CFG, { qv: { emoji: 0, who: 0 }, intro: 0.3, vote: 1, voteShow: 0.5, roul: 0.3, power: 1, q: 6 }));
    await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.evaluate(() => document.querySelector('#dstart').click());
    for (let t = 0; t < 300; t++) { const c = await pg.$('#app [data-c]:not([disabled])'); if (c) { await pg.evaluate(() => document.querySelector('#app [data-c]:not([disabled])').click()); break; } await pg.waitForTimeout(100); }
    if (view === 'tv') await pg.evaluate(() => document.getElementById('toTv').click());
    for (let t = 0; t < 200; t++) { if (await pg.$('#app .rv.wheel')) break; await pg.waitForTimeout(30); }
    const t0 = Date.now();
    for (const ms of TIMES) { const w = ms - (Date.now() - t0); if (w > 0) await pg.waitForTimeout(w); await pg.screenshot({ path: OUT + '/' + view + '-' + ms + '.png' }); }
    console.log(view, 'greške', errs); await pg.close();
  }
  await b.close(); server.close(); })();

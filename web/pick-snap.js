const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-mo'); fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 390, height: 844 } }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8766/');
  await pg.evaluate(() => Object.assign(CFG, { qv: { emoji: 0, who: 0 }, intro: 0.3, vote: 6, voteShow: 0.6, roul: 0.5, power: 8, q: 8, reveal: 3, bet: 1 }));
  await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.evaluate(() => document.querySelector('#dstart').click());
  const shoot = async (sel, name) => {
    for (let t = 0; t < 200; t++) { if (await pg.$(sel)) break; await pg.waitForTimeout(100); }
    await pg.waitForTimeout(500);
    console.log(name, await pg.evaluate((s) => { document.querySelector(s).click(); return [...document.querySelectorAll('#app [data-bk]')].filter((e) => /dimIn|pickIn|subIn|bump/.test(e.className)).map((e) => e.dataset.bk + ':' + (e.className.match(/dimIn|pickIn|subIn|bump/) || [])[0] + ':' + getComputedStyle(e).filter.slice(0, 20)).join(' ') + ' | app-subIn=' + [...document.getElementById('app').children].filter((x) => x.classList.contains('subIn')).length; }, sel));
    const fr = [];
    for (const ms of [30, 140, 450]) { await pg.waitForTimeout(ms - (fr.length ? [30, 140][fr.length - 1] : 0)); const f = OUT + '/' + name + '-' + ms + '.png'; await pg.screenshot({ path: f }); fr.push(f); }
    return fr;
  };
  await shoot('#app [data-v]:not([disabled])', 'vote');
  await shoot('#app [data-p]', 'power');
  await shoot('#app [data-c]:not([disabled])', 'ans');
  console.log('greške', errs); await b.close(); server.close(); })();

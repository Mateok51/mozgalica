const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
const KIND = process.env.KIND || 'emoji';
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  for (let run = 0; run < +(process.env.RUNS || 4); run++) {
  const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message + ' @ ' + (e.stack || '').split('\n').slice(0, 4).join(' | '))); pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push('console: ' + m.text().slice(0, 200)); }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  await pg.goto('http://localhost:8766/');
  await pg.evaluate((k) => Object.assign(CFG, { qv: { [k]: 6 }, chal: [], intro: 0.5, vote: 3, voteShow: 0.8, power: 4, q: 5, reveal: 1.2, howto: 0.8, howtoShort: 0.4, chReveal: 1, fq: 3, fr: 1, bet: 3 }), KIND);
  await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.evaluate(() => document.querySelector('#dstart').click());
  let crashed = '';
  for (let t = 0; t < 140 && !crashed; t++) {
    await pg.evaluate((run) => { const A = document.querySelector('#app'); if (!A) return;
      const pw = [...A.querySelectorAll('[data-p]')]; if (pw.length) { const x = pw[run % pw.length]; x.click(); }
      const tg = A.querySelector('[data-t]'); if (tg) tg.click();
      const fx = document.querySelector('#fx'); if (fx) { fx.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, clientX: 150, clientY: 400 })); fx.click(); }
      if (Math.random() < 0.7 && A.querySelector('[data-c]')) return;
      const b = A.querySelector('[data-c]:not([disabled]), [data-v]:not([disabled]), [data-bet]:not([disabled]), [data-sx], [data-sy="1"], [data-du]'); if (b) b.click(); }, run + t);
    crashed = await pg.evaluate(() => { const e = document.querySelector('#app .err'); return e ? e.textContent : ''; });
    if (await pg.$('#dagain')) break;
    await pg.waitForTimeout(400);
  }
  console.log('run', run, 'crash:', crashed || 'ne', errs.slice(0, 3));
  await pg.close(); }
  await b.close(); server.close(); })();

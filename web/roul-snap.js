const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-roul'); fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  for (const view of ['phone']) {
    const pg = await b.newPage({ viewport: view === 'tv' ? { width: 1280, height: 720 } : { width: 390, height: 844 } }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
    const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto('http://localhost:8766/');
    await pg.evaluate(() => Object.assign(CFG, { qv: { emoji: 0, who: 0 }, intro: 0.3, vote: 1.2, voteShow: 2, power: 1, q: 1, reveal: 0.5, bet: 1 }));
    await pg.click('#demo'); await pg.waitForSelector('#dstart');
    await pg.evaluate(() => { document.querySelector('[data-bots="-1"]').click(); });
    await pg.waitForTimeout(100);
    await pg.evaluate(() => document.querySelector('#dstart').click());
    if (view === 'tv') { await pg.waitForTimeout(300); await pg.evaluate(() => { const t = document.getElementById('toTv'); if (t) t.click(); }); }
    let got = false;
    for (let t = 0; t < 600 && !got; t++) {
      if (await pg.$('#app .spot')) {
        got = true;
        for (let k = 0; k < 2; k++) { const info = await pg.evaluate(() => { const A = document.getElementById('app'); return { pel: A.style.getPropertyValue('--pel'), doors: [...A.querySelectorAll('.door, .door-btn')].map((e) => (e.className.replace(/door(-btn)? /, '').trim()) + ' spot=' + (e.querySelector('.spot') ? (+getComputedStyle(e.querySelector('.spot')).opacity).toFixed(1) : '-') + ' f=' + getComputedStyle(e).filter.slice(0, 30) + ' o=' + getComputedStyle(e).opacity + ' an=' + getComputedStyle(e).animationName + ' dl=' + getComputedStyle(e).animationDelay + ' rd=' + getComputedStyle(e).getPropertyValue('--rd')) }; }); console.log(JSON.stringify(info)); await pg.waitForTimeout(350); }
      }
      await pg.waitForTimeout(50);
    }
    console.log(view, got ? 'ruleta snimljena' : 'nije bilo neriješenog', errs);
    await pg.close();
  }
  await b.close(); server.close(); })();

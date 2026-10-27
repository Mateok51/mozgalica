const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  for (const view of ['phone', 'tv']) {
    const pg = await b.newPage({ viewport: view === 'tv' ? { width: 1280, height: 720 } : { width: 412, height: 892 } }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
    await pg.goto('http://localhost:8766/');
    await pg.evaluate(() => Object.assign(CFG, { qv: { emoji: 0, who: 0 }, intro: 0.3, vote: 3, voteShow: 3, roul: 1 }));
    await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.evaluate(() => document.querySelector('#dstart').click());
    if (view === 'tv') { await pg.waitForTimeout(200); await pg.evaluate(() => document.getElementById('toTv').click()); }
    const pos = () => pg.evaluate(() => { const d = document.querySelector('#app .door-btn, #app .door'); const t = document.querySelector('#app .timer'); if (!d) return null; const kids = [...document.querySelectorAll('#app > *, #app .vote-head > *, #app .tv-mid > *')].map((e) => (e.className || e.tagName).toString().split(' ')[0] + ':' + Math.round(e.getBoundingClientRect().height)).join(' '); return Math.round(d.getBoundingClientRect().top) + '/' + (t ? Math.round(t.getBoundingClientRect().top) : '-') + ' z=' + document.getElementById('app').style.zoom + ' [' + kids + ']'; });
    let a = null; for (let t = 0; t < 80 && !a; t++) { a = await pos(); await pg.waitForTimeout(100); }
    await pg.waitForTimeout(600); a = await pos();
    for (let t = 0; t < 60; t++) { if (await pg.$('#app .door.win, #app .door-btn.win')) break; await pg.waitForTimeout(100); }
    await pg.waitForTimeout(1500); const c = await pos();
    console.log(view, '\n glasanje:', a, '\n odabir:  ', c, '\n', (a && c && a.split(' ')[0] === c.split(' ')[0]) ? 'BEZ POMAKA' : 'POMAK');
    await pg.close();
  }
  await b.close(); server.close(); })();

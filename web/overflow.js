const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-ovf'); fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
const VP = (process.env.VP || '360x640').split('x').map(Number);
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: VP[0], height: VP[1] }, isMobile: true, hasTouch: true }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  await pg.goto('http://localhost:8766/');
  await pg.evaluate((ch) => Object.assign(CFG, { chal: ch, qv: { emoji: 1, who: 1 }, intro: 0.6, vote: 2.5, voteShow: 1.5, power: 2.5, q: 3, reveal: 2.5, howto: 1.5, howtoShort: 1, bet: 2.5, sort: 4, link: 4, order: 4, hilo: 4, blitz: 4, maj: 2.5, majReveal: 2, chReveal: 2.5, fq: 2.5, fr: 1.5, fstart: 1.5, fpower: 2.5 }), (process.env.CHAL || 'order,maj').split(','));
  const seen = {};
  const check = async (tag) => {
    const r = await pg.evaluate(() => { const se = document.scrollingElement; const A = document.getElementById('app'); return { sh: se.scrollHeight, z: A.style.zoom, ih: innerHeight, key: (A.querySelector('.p-title, .mg-t, .ht-t, .ann-t, .bet-t, .whoq-k, .du-k') || {}).textContent || A.className }; });
    const k = (tag + ' ' + r.key).slice(0, 50);
    if (r.z && !seen['z' + k]) { seen['z' + k] = 1; console.log('  smanjeno', k, r.z); }
    if (r.sh > r.ih + 2 && !seen[k]) { seen[k] = r.sh - r.ih; await pg.screenshot({ path: OUT + '/' + VP.join('x') + '-' + Object.keys(seen).length + '.png', fullPage: true }); console.log('PRELIJEVA', k, '+' + (r.sh - r.ih) + 'px', 'zoom', r.z); }
  };
  await pg.click('#demo'); await pg.waitForSelector('#dstart'); await check('lobby');
  await pg.evaluate(() => document.querySelector('#dstart').click());
  for (let t = 0; t < 900; t++) {
    const ph = await pg.evaluate(() => document.getElementById('app').className);
    await check('');
    if (await pg.$('#dagain')) { await check('kraj'); break; }
    if (t % 3 === 0) await pg.evaluate(() => { const A = document.querySelector('#app'); const b = A && A.querySelector('[data-p], [data-t], [data-v]:not([disabled]), [data-bet]:not([disabled]), [data-c]:not([disabled]), [data-sx], [data-hl], [data-mj], [data-bz], [data-or]'); if (b) b.click(); });
    await pg.waitForTimeout(150);
  }
  console.log('gotovo', VP.join('x'), Object.keys(seen).filter((x) => x[0] !== 'z').length, 'ekrana prelijeva');
  await b.close(); server.close(); })();

const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-pyr'); fs.mkdirSync(OUT, { recursive: true });
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
const VIEW = process.env.VIEW || 'phone';
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  const pg = await b.newPage({ viewport: VIEW === 'tv' ? { width: 1280, height: 720 } : { width: 400, height: 820 } }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8766/');
  await pg.evaluate(() => Object.assign(CFG, { qv: { who: 0, emoji: 0 }, chal: ['sort', 'link'], betEvents: [0, 0], intro: 0.2, vote: 0.8, voteShow: 0.3, roul: 0.2, power: 0.8, cast: 0.05, q: 1.2, reveal: 0.4, howto: 0.3, howtoShort: 0.2, sort: 1, link: 1, chReveal: 0.3, moment: 0.3, duel: 1, duelIntro: 0.3, duelRes: 0.3, secret: 1, secret2: 1, fpower: 1.5, fq: 4, fqCrown: 5, fr: 3 }));
  await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.evaluate(() => document.querySelector('#dstart').click());
  if (VIEW === 'tv') { await pg.waitForTimeout(300); await pg.evaluate(() => document.getElementById('toTv').click()); }
  const shot = async (n) => { await pg.screenshot({ path: OUT + '/' + VIEW + '-' + n + '.png' }); };
  // do uvoda u piramidu
  for (let t = 0; t < 1500; t++) { if (await pg.$('#app .fs-rows')) break; await pg.evaluate(() => { const A = document.getElementById('app'); const b = A.querySelector('[data-v]:not([disabled]), #nopw, [data-c]:not([disabled]), [data-sx], [data-sy="1"]'); if (b) b.click(); }); await pg.waitForTimeout(80); }
  const t0 = Date.now();
  for (const ms of [400, 1900, 3300, 4800, 6800]) { const w = ms - (Date.now() - t0); if (w > 0) await pg.waitForTimeout(w); await shot('fstart-' + ms); }
  const seen = {};
  for (let t = 0; t < 2500 && !(seen.crown && seen.final); t++) {
    const k = await pg.evaluate(() => { const A = document.getElementById('app'); if (A.querySelector('.winner, #dagain, .win')) return 'final'; if (A.querySelector('.crown-k')) return A.querySelector('.rv') ? 'crownfr' : 'crown'; if (A.querySelector('.fin-prog')) return 'fq'; if (A.querySelector('.rv .fin-note, .finale-q .opt.correct')) return 'fr'; return ''; });
    if (k && !seen[k]) { seen[k] = 1; await pg.waitForTimeout(k === 'fr' || k === 'crownfr' ? 2200 : 300); await shot(k); }
    await pg.evaluate(() => { const A = document.getElementById('app'); const b = A.querySelector('#nopw, [data-c]:not([disabled])'); if (b && Math.random() < 0.5) b.click(); });
    await pg.waitForTimeout(90);
  }
  console.log(VIEW, Object.keys(seen), 'greške', errs); await b.close(); server.close(); })();

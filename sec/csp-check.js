const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, '..', 'web', 'site');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.png': 'image/png', '.webmanifest': 'application/manifest+json' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const pg = await b.newPage({ viewport: { width: 400, height: 820 } });
  const v = [], errs = [];
  await pg.addInitScript(() => { window.__csp = []; document.addEventListener('securitypolicyviolation', (e) => window.__csp.push(e.violatedDirective + ' ' + (e.blockedURI || '') + ' ' + (e.sourceFile || '') + ':' + e.lineNumber)); });
  pg.on('console', (m) => { if (/Content Security Policy|Refused to/.test(m.text())) v.push(m.text().slice(0, 200)); });
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto('http://localhost:8766/');
  await pg.evaluate(() => Object.assign(CFG, { qv: { who: 1, emoji: 1 }, intro: 0.3, vote: 1, voteShow: 0.3, roul: 0.3, power: 1, q: 2, reveal: 1, howto: 0.4, howtoMax: 0.4, howtoShort: 0.3, sort: 1.5, link: 1.5, order: 1.5, hilo: 1.5, blitz: 1.5, maj: 1, majReveal: 0.5, chReveal: 0.5, fstart: 2, fpower: 1, fq: 1.5, fqCrown: 2, fr: 1 }));
  await pg.mouse.click(5, 5); await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.evaluate(() => document.querySelector('#dstart').click());
  for (let t = 0; t < 900; t++) { if (await pg.$('#dagain')) break; await pg.evaluate(() => { const A = document.getElementById('app'); const b = A.querySelector('[data-v]:not([disabled]), #nopw, [data-c]:not([disabled]), [data-sx], [data-sy="1"], [data-hl], [data-mj], [data-bz], [data-or], [data-bet]:not([disabled])'); if (b) b.click(); }); await pg.waitForTimeout(100); }
  await pg.evaluate(() => document.getElementById('toTv') && document.getElementById('toTv').click()); await pg.waitForTimeout(800);
  const csp = await pg.evaluate(() => window.__csp);
  console.log('do kraja igre:', !!(await pg.$('#dagain, #app .winner')) || 'ne', '| CSP povrede:', csp.length, csp.slice(0, 8), v.slice(0, 5), '| JS greške:', errs.slice(0, 3));
  await b.close(); server.close(); })();

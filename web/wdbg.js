const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 412, height: 892 } }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  await pg.goto('http://localhost:8766/');
  await pg.evaluate(() => Object.assign(CFG, { qv: { emoji: 0, who: 0 }, intro: 0.3, vote: 1, voteShow: 0.5, roul: 0.3, power: 1, q: 4 }));
  await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.evaluate(() => document.querySelector('#dstart').click());
  for (let t = 0; t < 300; t++) { if (await pg.$('#app .rv-who')) break; await pg.waitForTimeout(50); }
  console.log(await pg.evaluate(() => { const w = document.querySelector('#app .rv-who'), o = w.parentElement, cs = getComputedStyle(w); const r = w.getBoundingClientRect(), ro = o.getBoundingClientRect();
    const rules = []; for (const sh of document.styleSheets) { try { for (const ru of sh.cssRules) if (ru.selectorText && w.matches(ru.selectorText) && /position|left|right|transform/.test(ru.style.cssText)) rules.push(ru.selectorText + ' {' + ru.style.cssText.slice(0, 120) + '}'); } catch (e) {} }
    return { pos: cs.position, right: cs.right, left: cs.left, opt: [Math.round(ro.left), Math.round(ro.right)], who: [Math.round(r.left), Math.round(r.right)], optPos: getComputedStyle(o).position, rules }; }));
  await b.close(); server.close(); })();

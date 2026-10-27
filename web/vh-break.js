const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-lob');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
const VP = (process.env.VP || '412x780').split('x').map(Number);
const WANT = (process.env.WANT || 'question,power,duel,who').split(',');
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: VP[0], height: VP[1] }, isMobile: true, hasTouch: true }); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  await pg.goto('http://localhost:8766/');
  await pg.evaluate(() => Object.assign(CFG, { qv: { who: 3, emoji: 0 }, chal: ['order', 'maj'], intro: 0.3, vote: 1.5, voteShow: 0.5, roul: 0.3, power: 4, q: 5, reveal: 1, howto: 0.5, howtoShort: 0.3, order: 2, maj: 1, majReveal: 0.5, chReveal: 0.5, bet: 1, duel: 4, duelIntro: 0.5, duelRes: 0.5 }));
  await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.evaluate(() => document.querySelector('#dstart').click());
  const got = {};
  for (let t = 0; t < 900 && Object.keys(got).length < WANT.length; t++) {
    const k = await pg.evaluate(() => { const A = document.getElementById('app'); if (A.querySelector('.whoq') && A.querySelector('[data-c]')) return 'who'; if (A.querySelector('.du-k')) return 'duel'; if (A.querySelector('.pw-cards [data-p]')) return 'power'; if (A.querySelector('.p-opts [data-c]')) return 'question'; return ''; });
    if (k && WANT.includes(k) && !got[k]) {
      got[k] = 1; await pg.waitForTimeout(250);
      const info = await pg.evaluate(() => { const se = document.scrollingElement; return { over: se.scrollHeight - innerHeight, parts: [...document.querySelectorAll('#app > *, #app .q-area > *, #app .whoq > *')].map((e) => (e.className || e.tagName).toString().split(' ')[0] + ':' + Math.round(e.getBoundingClientRect().height)).join(' ') }; });
      console.log(k, '+' + info.over + 'px', info.parts);
      await pg.screenshot({ path: OUT + '/vh-' + k + '.png', fullPage: true });
    }
    if (t % 3 === 0) await pg.evaluate(() => { const A = document.getElementById('app'); const b = A.querySelector('[data-v]:not([disabled]), [data-bet]:not([disabled]), [data-mj], [data-or]'); if (b) b.click(); const s = A.querySelector('#nopw'); if (s && Math.random() < 0.5) s.click(); });
    if (await pg.$('#dagain')) break;
    await pg.waitForTimeout(120);
  }
  await b.close(); server.close(); })();

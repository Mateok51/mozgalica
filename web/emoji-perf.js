const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch();
  for (const kind of (process.env.K || 'emoji').split(',')) {
    const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
    pg.on('crash', () => console.log('!!! STRANICA SE SRUŠILA')); pg.on('pageerror', (e) => console.log('err', e.message));
    const cdp = await pg.context().newCDPSession(pg); await cdp.send('Performance.enable');
    await pg.goto('http://localhost:8766/');
    await pg.evaluate((k) => Object.assign(CFG, { qv: k === 'none' ? { emoji: 0, who: 0 } : { [k]: 6 }, chal: [], intro: 0.5, vote: 2, voteShow: 0.5, power: 3, q: 12, reveal: 1, howto: 0.8, howtoShort: 0.4, bet: 2 }), kind);
    await pg.click('#demo'); await pg.waitForSelector('#dstart');
    await pg.evaluate(() => { window.__mut = 0; new MutationObserver((m) => { window.__mut += m.length; }).observe(document.getElementById('app'), { childList: true, subtree: true }); document.querySelector('#dstart').click(); });
    let samples = 0;
    for (let t = 0; t < 400 && samples < 4; t++) {
      const st = await pg.evaluate(() => ({ emo: !!document.querySelector('#app .emo'), q: !!document.querySelector('#app [data-c]') }));
      if ((kind === 'emoji' ? st.emo : st.q) ) {
        await pg.evaluate(() => { window.__mut = 0; });
        await pg.waitForTimeout(2000);
        const m = await cdp.send('Performance.getMetrics'); const g = (n) => (m.metrics.find((x) => x.name === n) || {}).value;
        const mut = await pg.evaluate(() => window.__mut);
        console.log(kind, 'mutacija/2s', mut, 'heapMB', (g('JSHeapUsedSize') / 1e6).toFixed(1), 'nodes', g('Nodes'), 'layouts', g('LayoutCount'), 'recalc', g('RecalcStyleCount'));
        samples++;
        await pg.evaluate(() => { const b = document.querySelector('#app [data-c]:not([disabled])'); if (b) b.click(); });
      } else {
        await pg.evaluate(() => { const A = document.querySelector('#app'); const b = A && A.querySelector('[data-p], [data-v]:not([disabled]), [data-bet]:not([disabled]), [data-sx]'); if (b) b.click(); });
        await pg.waitForTimeout(250);
        if (t % 20 === 0) console.log(t, await pg.evaluate(() => document.querySelector('#app').innerText.replace(/\s+/g, ' ').slice(0, 60)).catch((e) => 'X ' + e.message.slice(0, 60)));
      }
    }
    await pg.close();
  }
  await b.close(); server.close(); })();

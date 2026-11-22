// Test "cijele večeri": odigra demo partiju s botovima u Chromiumu uz lažni sat (Playwright page.clock),
// pa svakih nekoliko simuliranih minuta mjeri JS slušatelje, DOM čvorove, JS hrpu (nakon GC-a) i pogreške.
// Cilj: otkriti curenje slušatelja/memorije i pogreške u dugoj sesiji bez čekanja pola sata.
//   CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/soak-game.cjs [simuliraneMinute=40] [sirina=390] [visina=664]
// Nije dio CI-ja. Ne dokazuje ponašanje na pravom iPhoneu (nema Safarijevih ograničenja memorije).
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path');

const MINUTES = +process.argv[2] || 40, W = +process.argv[3] || 390, H = +process.argv[4] || 664;
const SAMPLE_EVERY_S = 120, STEP_MS = 1000;
const root = path.join(__dirname, '..');
const mime = { '.js': 'text/javascript', '.css': 'text/css', '.html': 'text/html', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2', '.json': 'application/json', '.webmanifest': 'application/json', '.svg': 'image/svg+xml' };

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox', '--enable-precise-memory-info', '--js-flags=--expose-gc'] });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, hasTouch: true });
  await ctx.route('**/*', (r) => {
    const u = new URL(r.request().url());
    if (u.hostname !== 'game.test') return r.abort();
    const f = path.join(root, u.pathname === '/' ? 'index.html' : decodeURIComponent(u.pathname.slice(1)));
    if (!fs.existsSync(f) || !fs.statSync(f).isFile()) return r.fulfill({ status: 404, body: '' });
    return r.fulfill({ body: fs.readFileSync(f), contentType: mime[path.extname(f)] || 'application/octet-stream' });
  });
  const page = await ctx.newPage();
  const errors = [], logs = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e).slice(0, 160)));
  page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text().slice(0, 160)); });
  await page.clock.install({ time: 0 });
  await page.goto('http://game.test/');
  await page.waitForSelector('#demo');
  await page.locator('#demo').dispatchEvent('click');
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('HeapProfiler.enable'); await cdp.send('Runtime.enable');

  const sample = async (t) => {
    await cdp.send('HeapProfiler.collectGarbage');
    const c = await cdp.send('Memory.getDOMCounters'), h = await cdp.send('Runtime.getHeapUsage');
    const sig = await page.evaluate(() => { const a = document.querySelector('#app'); const f = a && a.firstElementChild; return (f ? f.className.split(' ')[0] : '-') + '|' + (document.querySelector('.final-rank, .podium, .fin-rank') ? 'KRAJ' : ''); });
    return { t, nodes: c.nodes, listeners: c.jsEventListeners, heapMB: +(h.usedSize / 1048576).toFixed(1), screen: sig };
  };

  const rows = [await sample(0)];
  const total = MINUTES * 60;
  let answered = 0;
  for (let s = 1; s <= total; s++) {
    await page.clock.runFor(STEP_MS);
    // igrač povremeno odgovori na pitanje i potvrdi upute, kao stvarna osoba (ostalo rješavaju istekli rokovi)
    if (s % 5 === 0) {
      answered += await page.evaluate(() => {
        const st = document.querySelector('#dstart:not([disabled]), #start:not([disabled])'); if (st) { st.click(); return 0; }
        const b = document.querySelector('[data-c]:not([disabled])'); if (b) { b.click(); return 1; }
        const ok = document.querySelector('#ready, [data-ready], .kr-go, .sf-ok, [data-kr="ok"]'); if (ok) ok.click(); return 0;
      });
    }
    if (s % SAMPLE_EVERY_S === 0) rows.push(await sample(s));
    if (errors.length > 25) break;
  }
  console.log('simulirano ' + MINUTES + ' min, ' + W + 'x' + H + ', odgovora igrača: ' + answered);
  console.log('t(min)  čvorovi  slušatelji  JS hrpa(MB)  ekran');
  for (const r of rows) console.log(String((r.t / 60).toFixed(0)).padStart(5), String(r.nodes).padStart(9), String(r.listeners).padStart(11), String(r.heapMB).padStart(12), '  ' + r.screen);
  const a = rows[Math.min(2, rows.length - 1)], z = rows[rows.length - 1];
  console.log('\nrast od ' + (a.t / 60) + '. do ' + (z.t / 60) + '. min: čvorovi ' + (z.nodes - a.nodes) + ', slušatelji ' + (z.listeners - a.listeners) + ', hrpa ' + (z.heapMB - a.heapMB).toFixed(1) + ' MB');
  console.log('pogreške stranice: ' + errors.length + (errors.length ? '\n  ' + [...new Set(errors)].slice(0, 5).join('\n  ') : ''));
  const uniqLogs = [...new Set(logs)]; console.log('console.error: ' + logs.length + (uniqLogs.length ? '\n  ' + uniqLogs.slice(0, 5).join('\n  ') : ''));
  await browser.close();
  process.exitCode = errors.length ? 1 : 0;
})().catch((e) => { console.error(e); process.exitCode = 2; });

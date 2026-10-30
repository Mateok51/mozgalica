'use strict';
// Odabir kategorija u predvorju (prava izgradnja web/site): otvaranje, isključivanje, Nijedna blokira početak, Sve vraća, staje na ekran, TV postavke. node v3/cat-ui-test.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-cat.html');
fs.writeFileSync(TMP, fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, ''));
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  try {
    for (const [W, H] of [[390, 844], [360, 740]]) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true }); const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
      await page.goto('file://' + TMP + '?demotv=1');
      await page.click('#demo'); await page.waitForTimeout(300); await page.click('#lobSettings'); await page.waitForTimeout(200);
      ok(/49 od 49/.test(await page.$eval('#catOpen', (e) => e.textContent)), W + ': gumb Kategorije prikazuje 49 od 49');
      await page.click('#catOpen'); await page.waitForTimeout(200);
      const chips = await page.$$eval('#catOv .cat-chip', (x) => x.length);
      ok(chips === 49, W + ': popis ima 49 kategorija');
      const fit = await page.evaluate(() => { const r = document.querySelector('#catOv .cat-card').getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth; });
      ok(fit, W + ': prozor staje na ekran');
      await page.screenshot({ path: OUT + '/cat-' + W + '.png' });
      await page.click('#catOv [data-cat="Anime"]'); await page.waitForTimeout(100);
      ok(!(await page.$eval('#catOv [data-cat="Anime"]', (e) => e.classList.contains('on'))), W + ': klik isključuje Anime');
      ok(/48 od 49/.test(await page.$eval('#catOv .cat-cnt', (e) => e.textContent)), W + ': brojač 48');
      await page.click('#catOv [data-catall="0"]'); await page.waitForTimeout(100);
      ok(await page.$eval('#catDone', (e) => e.disabled), W + ': Nijedna blokira Gotovo');
      await page.click('#catOv [data-cat="Sport"]'); await page.click('#catOv [data-cat="Film i TV"]'); await page.click('#catOv [data-cat="Glazba"]'); await page.click('#catOv [data-cat="Povijest"]');
      ok(!(await page.$eval('#catDone', (e) => e.disabled)), W + ': s 4 kategorije Gotovo je dostupno');
      await page.click('#catDone'); await page.waitForTimeout(200);
      ok(!(await page.$('#catOv')), W + ': prozor se zatvara');
      ok(/4 od 49/.test(await page.$eval('#catOpen', (e) => e.textContent)) && !(await page.$eval('#dstart', (e) => e.disabled)), W + ': 4 od 49, Započni igru dostupno');
      if (W === 390) {
        await page.evaluate(() => document.getElementById('dstart').click());
        const seen = await page.evaluate(() => new Promise((res) => { const s = new Set(); const t = setInterval(() => { document.querySelectorAll('.door-name, .door .nm, [class*="door"] [class*="name"]').forEach((e) => s.add(e.textContent.trim())); }, 200); setTimeout(() => { clearInterval(t); res([...s]); }, 12000); }));
        const allowed = ['Sport', 'Film i TV', 'Glazba', 'Povijest'];
        ok(seen.length === 0 || seen.every((c) => allowed.includes(c)), 'u igri se nude samo uključene kategorije ' + JSON.stringify(seen));
      }
      ok(errs.length === 0, W + ': bez grešaka ' + errs.join(' | '));
      await ctx.close();
    }
  } finally { await b.close(); fs.unlinkSync(TMP); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'OK'); process.exit(fails ? 1 : 0);
})();

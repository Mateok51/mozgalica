'use strict';
// Trajanje partije u predvorju (prava izgradnja web/site): kartice na 390x844, odabir, sve staje na ekran, TV prikaz, runde 1/N u igri.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-len.html');
fs.writeFileSync(TMP, fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, ''));
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  try {
    for (const [W, H] of [[390, 844], [412, 915], [360, 740]]) {
      const ctx = await b.newContext({ viewport: { width: W, height: H }, hasTouch: true }); const page = await ctx.newPage(); const errs = [];
      page.on('pageerror', (e) => errs.push(e.message));
      await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
      await page.goto('file://' + TMP);
      await page.click('#demo'); await page.waitForTimeout(300); await page.click('#lobSettings'); await page.waitForTimeout(200);
      const n = await page.$$eval('.len-c', (x) => x.length);
      ok(n === 3, W + 'x' + H + ': tri kartice trajanja');
      ok(await page.$eval('.len-c.on', (e) => e.dataset.len) === 'std', W + ': zadano je Standardna');
      await page.click('.len-c[data-len="brza"]'); await page.waitForTimeout(200);
      ok(await page.$eval('.len-c.on', (e) => e.dataset.len) === 'brza', W + ': odabir Brza je označen');
      const fit = await page.evaluate(() => { const se = document.scrollingElement || document.documentElement; const cs = [...document.querySelectorAll('.len-c')].map((e) => { const r = e.getBoundingClientRect(); return [r.width, r.height, e.scrollWidth <= e.clientWidth + 1]; });
        return { doc: se.scrollHeight, ih: innerHeight, over: document.getElementById('app').dataset.fitover || '', cs, cta: (() => { const r = document.querySelector('#dstart').getBoundingClientRect(); return r.bottom <= innerHeight; })() }; });
      ok(fit.doc <= fit.ih + 1 && fit.cta, W + ': predvorje staje na ekran, gumb Započni vidljiv (' + fit.doc + '/' + fit.ih + (fit.over === '1' ? ', unutarnji skrol' : '') + ')');
      ok(fit.cs.every((c) => c[2] && c[1] <= 64), W + ': kartice kompaktne, tekst ne izlazi (' + fit.cs.map((c) => Math.round(c[0]) + 'x' + Math.round(c[1])).join(' ') + ')');
      await page.screenshot({ path: OUT + '/len-' + W + '.png' });
      if (W === 390) {
        await page.click('#toTv'); await page.waitForTimeout(300);
        await page.setViewportSize({ width: 1920, height: 1080 }); await page.waitForTimeout(300); await page.click('#tvSettings'); await page.waitForTimeout(200);
        ok(await page.$eval('.tvlob .len-c.on', (e) => e.dataset.len).catch(() => '') === 'brza', 'TV predvorje prikazuje odabir (Brza)');
        await page.screenshot({ path: OUT + '/len-tv.png' });
        await page.click('.tvlob .len-c[data-len="duga"]'); await page.waitForTimeout(200);
        ok(await page.$eval('.tvlob .len-c.on', (e) => e.dataset.len) === 'duga', 'TV: domaćin mijenja na Duga');
        await page.click('.tvlob .len-c[data-len="brza"]'); await page.waitForTimeout(150);
        await page.setViewportSize({ width: W, height: H }); await page.click('#toPhone').catch(() => {}); await page.waitForTimeout(300);
        await page.evaluate(() => { const g = document.querySelector('#dstart'); g && g.click(); });
        const hud = await page.waitForFunction(() => { const t = document.body.innerText; const m = t.match(/Runda 1\/(\d)/); return m && m[1]; }, null, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => '');
        ok(hud === '2', 'u igri (demo s botovima): Runda 1/' + hud);
      }
      ok(errs.length === 0, W + ': bez grešaka ' + errs.join(' | '));
      await ctx.close();
    }
  } finally { await b.close(); fs.unlinkSync(TMP); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

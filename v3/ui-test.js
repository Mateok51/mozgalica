'use strict';
// Igra cijeli demo u pravom pregledniku (Chromium) kao igrač na mobitelu i snima zaslone.
const { chromium } = require('playwright');
const path = require('path');
const dir = __dirname;
const shots = path.join(dir, 'shots');
require('fs').mkdirSync(shots, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|net::ERR/.test(m.text())) errors.push('console: ' + m.text()); });
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
  await page.goto('file://' + path.join(dir, 'out.html'));
  await page.evaluate(() => Object.assign(CFG, { intro: 1, vote: 6, voteShow: 1, power: 8, q: 12, reveal: 2, sort: 25, link: 25, chReveal: 2, fq: 6, fr: 1.5 }));
  await page.screenshot({ path: shots + '/01-pocetna.png' });
  await page.click('#demo');
  await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])');
  await page.waitForTimeout(200);
  await page.screenshot({ path: shots + '/02-lobby-mobitel.png' });
  await page.click('#toTv');
  await page.waitForTimeout(200);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: shots + '/03-lobby-tv.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.click('#toPhone');
  await page.click('#dstart');

  const seen = {};
  const fxSeen = {};
  const tvShot = async (name) => {
    if (seen['tv-' + name]) return;
    seen['tv-' + name] = 1;
    await page.click('#toTv');
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.waitForTimeout(150);
    await page.screenshot({ path: shots + '/tv-' + name + '.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('#toPhone');
    await page.waitForTimeout(100);
  };
  const shot = async (name) => { if (seen[name]) return; seen[name] = 1; await page.screenshot({ path: shots + '/m-' + name + '.png' }); };

  const t0 = Date.now();
  let finalSeen = false;
  while (Date.now() - t0 < 9 * 60 * 1000) {
    await page.waitForTimeout(250);
    const st = await page.evaluate(() => ({
      vote: !!document.querySelector('[data-v]:not([disabled])'),
      pw: !!document.querySelector('[data-p]'),
      bet: !!document.querySelector('[data-bet]:not([disabled])'),
      tgt: !!document.querySelector('[data-t]'),
      fx: document.querySelector('#fx') ? document.querySelector('#fx').className : '',
      opt: !!document.querySelector('[data-c]:not([disabled])'),
      two: !!document.querySelector('.p-opts.two [data-c]:not([disabled])'),
      sort: !!document.querySelector('.srt-pool .srt-card, #srtDone:not([disabled])'),
      link: !!document.querySelector('.lnk:not(.sent) [data-ll]:not(.paired), #lnkDone:not([disabled])'),
      rvbet: !!document.querySelector('.rv-bet'),
      qbet: !!document.querySelector('.betag'),
      final: !!document.querySelector('#dagain'),
      title: (document.querySelector('.p-title') || {}).textContent || '',
      text: document.body.innerText.slice(0, 80),
    }));
    if (st.rvbet && !seen['otkrivanje-ulog']) { await page.waitForTimeout(2500); await shot('otkrivanje-ulog'); }
    if (st.qbet && !seen['pitanje-ulog']) { await shot('pitanje-ulog'); }
    if (st.final) { await shot('kraj'); await tvShot('kraj'); finalSeen = true; break; }
    if (st.vote) { await shot('glasanje'); await tvShot('glasanje'); await page.evaluate(() => { const b = document.querySelector('#app [data-v]:not([disabled])'); if (b) b.click(); }); continue; }
    if (st.bet) { await page.waitForTimeout(800); await shot('kladionica'); await tvShot('kladionica'); await page.evaluate(() => { const b = document.querySelector('#app [data-bet]:not([disabled])'); if (b) b.click(); }); continue; }
    if (await page.$('[data-sx], [data-sy]')) { await shot('tajno'); await page.evaluate(() => { const b = document.querySelector('#app [data-sx], #app [data-sy="1"]'); if (b) b.click(); }); continue; }
    if (await page.$('[data-or]:not([disabled]), [data-hl], [data-bz], [data-mj]:not([disabled])')) { const nm = await page.evaluate(() => (document.querySelector('.mg-t') || {}).textContent || 'igra'); await shot('mini-' + nm.replace(/[^a-zA-Z]/g, '').slice(0, 12)); await page.evaluate(() => { const b = document.querySelector('[data-or]:not([disabled]), [data-hl], [data-bz], [data-mj]:not([disabled])'); if (b) b.click(); }); continue; }
    if (st.tgt) { await shot('meta'); await page.evaluate(() => { const b = document.querySelector('#app [data-t]'); if (b) b.click(); }); continue; }
    if (st.pw) { await shot('moci'); await tvShot('moci'); await page.evaluate(() => { const b = document.querySelector('#app [data-p]'); if (b) b.click(); }); continue; }
    if (st.fx) {
      const k = st.fx.split(' ').find((c) => c.startsWith('fx-')).slice(3);
      if (!fxSeen[k]) { fxSeen[k] = 1; await page.screenshot({ path: shots + '/fx-' + k + '.png' }); }
      const box = await page.locator('#fx').boundingBox();
      if (k === 'led') { for (let i = 0; i < 8; i++) { if (!(await page.$('#fx.fx-led'))) break; await page.locator('#fx').click({ force: true }); } }
      else if (k === 'sluz') {
        for (let row = 0; row < 9; row++) {
          await page.mouse.move(box.x + 5, box.y + (row + 0.5) * box.height / 8.5);
          await page.mouse.down();
          await page.mouse.move(box.x + box.width - 5, box.y + (row + 0.5) * box.height / 8.5, { steps: 12 });
          await page.mouse.up();
          if (!(await page.$('#fx.fx-sluz'))) break;
        }
      } else if (k === 'grick') {
        for (let i = 0; i < 12; i++) { const b = await page.$('.bug'); if (!b) break; await b.dispatchEvent('pointerdown'); await page.waitForTimeout(50); }
      } else if (k === 'bomba') {
        for (let i = 0; i < 5; i++) { const b = await page.$('#bomb'); if (!b) break; await b.dispatchEvent('pointerdown'); }
      }
      continue;
    }
    if (st.two) { await shot('finale'); await tvShot('finale'); await page.evaluate(() => { const b = document.querySelector('#app .p-opts.two [data-c]:not([disabled])'); if (b) b.click(); }); continue; }
    if (st.opt) { await shot('pitanje'); await tvShot('pitanje'); await page.evaluate(() => { const b = document.querySelector('#app [data-c]:not([disabled])'); if (b) b.click(); }); continue; }
    if (st.sort) { await shot('razvrstavanje'); await tvShot('razvrstavanje'); await page.evaluate(() => { const d = document.querySelector('#srtDone:not([disabled])'); if (d) return d.click(); document.querySelector('.srt-pool .srt-card').click(); document.querySelector('.srt-zone').click(); }); continue; }
    if (st.link) { await shot('spajanje'); await tvShot('spajanje'); await page.evaluate(() => { const d = document.querySelector('#lnkDone:not([disabled])'); if (d) return d.click(); document.querySelector('.lnk [data-ll]:not(.paired)').click(); document.querySelector('.lnk [data-lr]:not(.paired)').click(); }); continue; }
    if (/Točno!|Netočno|isteklo/.test(st.title) && !seen.otkrivanje) { await shot('otkrivanje'); await tvShot('otkrivanje'); }
  }
  console.log('Došao do kraja igre:', finalSeen, 'za', Math.round((Date.now() - t0) / 1000), 's');
  console.log('Efekti koje je igrač doživio:', Object.keys(fxSeen).join(', ') || 'nijedan');
  console.log('Snimke:', Object.keys(seen).join(', '));
  console.log('Greške:', errors.length ? errors.join('\n') : 'nema');
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });

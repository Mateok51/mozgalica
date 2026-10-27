const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, acceptDownloads: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load|ERR_/.test(m.text())) errs.push(m.text()); });
  await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr|unpkg/, r => r.abort());
  await page.goto('http://localhost:8790/out.html');
  await page.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 1.5, voteShow: 0.5, power: 1.5, q: 2.5, bet: 1.5, fq: 3, fqCrown: 3, fpower: 1.5, fstart: 2, sort: 6, link: 6, order: 6, hilo: 6, blitz: 6, maj: 3, howto: 1, howtoMax: 1, howtoShort: 1, chReveal: 1.5, majReveal: 1, duel: 3, secret: 3, secret2: 3 }));
  await page.click('#demo'); await page.waitForTimeout(300);
  await page.click('[data-av]:not([disabled])'); await page.waitForTimeout(200);
  await page.click('#dstart');
  const t0 = Date.now();
  while (Date.now() - t0 < 600000) {
    await page.waitForTimeout(250);
    const done = await page.evaluate(() => { const q = (s) => document.querySelector(s); if (q('#legOpen')) return true; const c = q('#htok') || q('[data-v]:not([disabled])') || q('#nopw') || q('[data-c]:not([disabled])') || q('#srtDone:not([disabled])'); if (c) c.click(); return false; });
    if (done) break;
  }
  console.log('kraj igre za', Math.round((Date.now() - t0) / 1000), 's');
  await page.screenshot({ path: 'flk/lg/0-kraj.png' });
  await page.click('#legOpen'); await page.waitForTimeout(400);
  await page.screenshot({ path: 'flk/lg/1-otvaranje.png' });
  await page.waitForTimeout(2200);
  await page.screenshot({ path: 'flk/lg/2-mob.png' });
  const info = await page.evaluate(() => { const w = document.getElementById('legWrap'); const cards = [...document.querySelectorAll('.lg-card')].map((c) => c.innerText.replace(/\n+/g, ' / ')); return { cards, scroll: w.scrollHeight > w.clientHeight, story: document.querySelector('.lg-story').innerText, over: [...document.querySelectorAll('.lg-card *')].filter((e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflow !== 'visible').length }; });
  console.log(JSON.stringify(info, null, 1));
  await page.evaluate(() => { const w = document.getElementById('legWrap'); w.scrollTop = w.scrollHeight; }); await page.waitForTimeout(200);
  await page.screenshot({ path: 'flk/lg/3-mob-dno.png' });
  // spremanje: preuzimanje (preglednik bez dijeljenja)
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 15000 }).catch(async (e) => { console.log('NAPOMENA:', await page.textContent('.lg-note')); throw e; }), page.click('#legSave')]);
  const fp = 'flk/lg/kartica.png'; await dl.saveAs(fp);
  const buf = fs.readFileSync(fp); console.log('PNG', buf.length, 'B', buf.readUInt32BE(16) + 'x' + buf.readUInt32BE(20), 'obavijest:', await page.textContent('.lg-note'));
  // dijeljenje: simuliran sustav dijeljenja
  await page.evaluate(() => { window.__sh = null; navigator.canShare = (o) => !!(o && o.files); navigator.share = (o) => { window.__sh = o.files[0].name + ' ' + o.files[0].type + ' ' + o.files[0].size; return Promise.resolve(); }; });
  await page.click('#legSave'); await page.waitForTimeout(500);
  console.log('dijeljenje:', await page.evaluate(() => window.__sh), '·', await page.textContent('.lg-note'));
  // zatvori i ponovno otvori: isti sadržaj, bez ponovnih animacija
  const before = await page.evaluate(() => document.querySelector('.lg-list').innerText);
  await page.click('#legClose'); await page.waitForTimeout(200);
  const closed = await page.evaluate(() => !document.getElementById('legWrap') && !!document.querySelector('.winscr #legOpen'));
  await page.click('#legOpen'); await page.waitForTimeout(150);
  const again = await page.evaluate(() => ({ t: document.querySelector('.lg-list').innerText, inst: document.getElementById('legWrap').classList.contains('lg-instant') }));
  console.log('zatvori → završni ekran:', closed, '· ponovno otvaranje isto:', again.t === before, '· bez ponovne animacije:', again.inst);
  // TV
  await page.click('#legClose'); await page.click('#toTv'); await page.setViewportSize({ width: 1280, height: 720 }); await page.waitForTimeout(300);
  await page.click('#legOpen'); await page.waitForTimeout(2600); await page.screenshot({ path: 'flk/lg/4-tv.png' });
  // mali mobitel
  await page.click('#legClose'); await page.click('#toPhone'); await page.setViewportSize({ width: 360, height: 640 }); await page.waitForTimeout(300);
  await page.click('#legOpen'); await page.waitForTimeout(2600); await page.screenshot({ path: 'flk/lg/5-mali.png' });
  const small = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, btn: document.getElementById('legSave').getBoundingClientRect().height }));
  console.log('mali ekran: širina stranice', small.w, '· visina gumba', small.btn);
  // domaćin pokrene novu igru dok je pregled otvoren
  await page.evaluate(() => { const b = document.getElementById('dagain'); if (b) b.click(); });
  await page.waitForTimeout(400);
  console.log('nova igra dok je pregled otvoren → predvorje:', await page.evaluate(() => document.documentElement.dataset.ph + ' / pregled ' + (document.getElementById('legWrap') ? 'ostao' : 'zatvoren')));
  console.log(errs.length ? 'ERR ' + errs.join(' | ') : 'bez JS grešaka');
  await b.close();
})();

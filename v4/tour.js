const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const out = path.join(__dirname, 'tour'); fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(out);
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'v3/out.html'));
  await p.evaluate(() => Object.assign(CFG, { intro: 2, vote: 4, voteShow: 1.5, power: 4, cast: 0.8, q: 6, reveal: 2.5, sort: 3, link: 3, chReveal: 1.5, fstart: 2, fpower: 3, fq: 4, fr: 1.5 }));
  await p.waitForTimeout(700); await p.screenshot({ path: out + '/01-pocetna.png' });
  await p.click('#demo'); await p.waitForTimeout(500); await p.screenshot({ path: out + '/02-likovi.png' });
  await p.click('#dstart');
  const want = { vote: '03-glasanje', power: '04-moci', question: '05-pitanje', reveal: '06-otkrivanje', fq: '07-finale', final: '08-kraj' };
  const got = {}; const t0 = Date.now();
  while (Date.now() - t0 < 200000 && Object.keys(got).length < 6) {
    await p.waitForTimeout(200);
    const ph = await p.evaluate(() => { try { return S && S.ph; } catch (e) { return null; } }).catch(() => null)
      || await p.evaluate(() => document.querySelector('[data-v]') ? 'vote' : document.querySelector('.pw-card') ? 'power' : document.querySelector('.p-opts.two') ? 'fq' : document.querySelector('.p-opt') ? 'question' : document.querySelector('.result') ? 'reveal' : document.querySelector('#dagain') ? 'final' : '');
    if (want[ph] && !got[ph]) { await p.waitForTimeout(ph === 'final' ? 1500 : 900); got[ph] = 1; await p.screenshot({ path: out + '/' + want[ph] + '.png' });
      if (ph === 'question') { await p.setViewportSize({ width: 1280, height: 720 }); const tv = await p.$('#toTv'); if (tv) { await tv.click(); await p.waitForTimeout(700); await p.screenshot({ path: out + '/09-tv-pitanje.png' }); await p.click('#toPhone'); } await p.setViewportSize({ width: 390, height: 844 }); } }
  }
  console.log(Object.keys(got), errs); await b.close();
})();

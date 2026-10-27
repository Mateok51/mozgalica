const { chromium } = require('playwright'); const path = require('path');
const out = path.join(__dirname, 'cast-shots');
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.goto('file://' + path.join(__dirname, '..', 'v3/out.html'));
  await p.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 1, voteShow: 0.3, power: 2, cast: 0.15, q: 6, reveal: 0.5, sort: 1, link: 1, chReveal: 0.3, fstart: 0.5, fpower: 2, fq: 5, fr: 0.5 }));
  await p.click('#demo'); await p.waitForTimeout(300); await p.click('#dstart');
  const seen = {}; const t0 = Date.now();
  while (Date.now() - t0 < 240000 && !(seen.bite && seen.boom)) {
    await p.waitForTimeout(150);
    const st = await p.evaluate(() => ({ bite: !!document.querySelector('.bite'), bomb: !!document.querySelector('.fly-bomb'), boom: !!document.querySelector('.boom-cover'), fin: !!document.querySelector('.p-opts.two'), done: /Pobijedio|mjesto/.test(document.body.innerText) && !!document.querySelector('#dagain') }));
    if (st.done) { await p.click('#dagain'); await p.waitForTimeout(300); await p.click('#dstart'); continue; }
    if (st.bite && !seen.bite) { await p.waitForTimeout(900); seen.bite = 1; await p.screenshot({ path: out + '/x-bite' + (st.fin ? '-fin' : '') + '.png' }); }
    if (st.bomb && !seen.bomb) { seen.bomb = 1; await p.waitForTimeout(600); await p.screenshot({ path: out + '/x-bombs.png' }); const bb = await p.$('.fly-bomb'); const box = await bb.boundingBox(); await p.mouse.click(box.x + box.width / 2, box.y + box.height / 2); await p.waitForTimeout(250); await p.screenshot({ path: out + '/x-boom.png' }); seen.boom = !!(await p.$('.boom-cover')); await p.waitForTimeout(2300); seen.after = !(await p.$('.boom-cover')); }
  }
  console.log(JSON.stringify(seen), 'errors', errs); await b.close();
})();

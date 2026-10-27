// provjera da glazba i odbrojavanje stvarno sviraju (broji pozvane zvukove)
const { chromium } = require('playwright'); const path = require('path');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  await p.route(/fonts\.|jsdelivr|unpkg/, (r) => r.abort());
  await p.addInitScript(() => {
    window.__osc = 0; const O = window.AudioContext;
    window.AudioContext = function () { const c = new O(); const co = c.createOscillator.bind(c); c.createOscillator = () => { window.__osc++; return co(); }; return c; };
  });
  await p.goto('file://' + path.join(__dirname, '..', 'v3/out.html'));
  await p.evaluate(() => Object.assign(CFG, { intro: 0.3, vote: 7, voteShow: 0.3 }));
  await p.click('#demo'); await p.waitForTimeout(300);
  const a = await p.evaluate(() => window.__osc); await p.waitForTimeout(2000); const b2 = await p.evaluate(() => window.__osc);
  await p.click('#music'); await p.waitForTimeout(600); const c1 = await p.evaluate(() => window.__osc); await p.waitForTimeout(1500); const c2 = await p.evaluate(() => window.__osc);
  await p.click('#music'); await p.click('#dstart'); await p.waitForTimeout(3500);
  console.log('glazba svira:', b2 - a > 10, '| nakon isključivanja tiho:', c2 - c1 < 3, '| label:', await p.$eval('#music', (e) => e.getAttribute('aria-label')), errs);
  await b.close();
})();

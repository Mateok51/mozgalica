'use strict';
// Snimke s fontom Cinzel (lokalna kopija fonta, jer Google Fonts ovdje nije dostupan): početni, predvorje, glasanje, pitanje, otkrivanje, ploča.
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const OUT = process.env.OUT || '/tmp/claude-0/-home-claude/49734958-2839-5e3f-a778-4ec741c0b014/scratchpad/font'; fs.mkdirSync(OUT, { recursive: true });
const TMP = path.join(__dirname, '..', 'web', 'site', '_out-font.html');
{ let h = fs.readFileSync(path.join(__dirname, '..', 'web', 'site', 'index.html'), 'utf8').replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
  h = h.replace('</head>', '<style>@font-face { font-family: "Cinzel"; src: url("file://' + path.join(__dirname, '..', 'fonts', 'Cinzel-wght.ttf') + '"); font-weight: 800; }</style></head>');
  const a = "game = createGame({ code: 'DEMO', noTv: true,"; h = h.replace(a, a + " cfg: window.__FASTCFG || {},");
  const b = "let S = null, lastSig = '', lastStateAt = 0, connectionWasLost = false;"; h = h.replace(b, b + ' window.__t = { game: () => game, pid: () => PID };'); fs.writeFileSync(TMP, h); }
const FAST = { intro: 1, vote: 3, voteShow: 1, roul: 0.3, power: 3, cast: 0.3, q: 4, chal: [], qv: { who: 0, emoji: 0 }, betEvents: [0, 0], kr: Object.assign({}, { wait: 4, pactOffers: 0, offMax: 0, chFrom: 99, pactFrom: 99, offFrom: 99, pactChance: 0, offChance: 0, rope: 1, ropeWin: 7, ropeN: 10, chGap: 99999, chWait: 1, chStakeA: 150, chStakeB: 300, chGuard: 150, pactMin: 3, taskWin: 400, taskLoss: 200 }) };
(async () => {
  const b = await chromium.launch();
  try {
    const page = await (await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true })).newPage();
    await page.route(/fonts\.g|jsdelivr|unpkg/, (r) => r.abort()); await page.addInitScript((f) => { window.__FASTCFG = f; }, FAST);
    await page.goto('file://' + TMP); await page.waitForTimeout(600); await page.screenshot({ path: OUT + '/0-home.png' });
    await page.click('#demo'); await page.waitForTimeout(400); await page.screenshot({ path: OUT + '/1-lobby.png' });
    await page.click('#dstart');
    const want = ['intro', 'vote', 'power', 'question', 'reveal']; const done = new Set();
    const t0 = Date.now();
    while (done.size < want.length && Date.now() - t0 < 40000) {
      const ph = await page.evaluate(() => __t.game()._G.ph);
      if (want.includes(ph) && !done.has(ph)) { done.add(ph); await page.waitForTimeout(ph === 'reveal' ? 2500 : 700); await page.screenshot({ path: OUT + '/' + (done.size + 1) + '-' + ph + '.png' }); }
      await page.waitForTimeout(150);
    }
    const ff = await page.evaluate(() => getComputedStyle(document.querySelector('.p-top') || document.body).fontFamily + ' | ' + (document.fonts.check('800 20px Cinzel') ? 'Cinzel učitan' : 'Cinzel NIJE učitan'));
    console.log(ff);
  } finally { await b.close(); fs.unlinkSync(TMP); }
})();

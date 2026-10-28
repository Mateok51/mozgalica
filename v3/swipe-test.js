'use strict';
// Kratka provjera swipe-razvrstavanja (samo sučelje): lažni prikaz faze "sort" u demu. Pokretanje: node v3/swipe-test.js
const { chromium } = require('playwright'); const path = require('path'); const fs = require('fs');
const TMP = path.join(process.env.OUT || path.join(__dirname, 'shots'), 'out-test.html');
const OUT = process.env.OUT || path.join(__dirname, 'shots'); fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(path.dirname(TMP), { recursive: true });
{ const h = fs.readFileSync(path.join(__dirname, 'out.html'), 'utf8'), a = "let S = null, lastSig = '';"; if (!h.includes(a)) throw new Error('sidro'); fs.writeFileSync(TMP, h.replace(a, a + ' window.__t = { game: () => game, S: (v) => { S = v; }, L: (v) => { L = v; }, fresh: (s) => freshLocal(s), render: () => phoneRender(true), show: () => { phoneShown = () => true; } };')); }
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch();
  for (const W of [360, 320]) {
    console.log('— širina ' + W);
    const ctx = await b.newContext({ viewport: { width: W, height: 700 }, hasTouch: true });
    const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.route(/fonts\.googleapis|fonts\.gstatic|jsdelivr/, (r) => r.abort());
    await page.goto('file://' + TMP);
    await page.click('#demo'); await page.waitForTimeout(250); await page.click('[data-av]:not([disabled])');
    await page.evaluate(() => { const s = document.querySelector('#botPlus, [data-bot-add], .bot-stepper button:last-child'); if (s) s.click(); });
    await page.waitForTimeout(150);
    await page.evaluate(() => {
      window.__inp = [];
      const game = __t.game(), real = game.view.bind(game), items = ['Lav', 'Ris', 'Hrast', 'Bukva', 'Orao', 'Bor'], key = [0, 0, 1, 1, 0, 1];
      window.__key = key;
      game.view = () => Object.assign(real(), { ph: 'sort', s: 777, so: { a: 'Životinje', b: 'Biljke', it: items, key }, ntv: false });
      game.setInput = (id, inp) => { window.__inp.push(JSON.stringify(inp)); return true; };
      __t.S(game.view()); __t.L(__t.fresh(777)); __t.render();
    });
    const info = () => page.evaluate(() => ({ card: (document.querySelector('.swp-card[data-si]') || {}).textContent, pt: (document.querySelector('.swp-pt') || {}).textContent, done: (document.querySelector('#srtDone') || {}).textContent, dis: (document.querySelector('#srtDone') || {}).disabled, undo: (document.querySelector('#swpUndo') || {}).disabled, inp: window.__inp.length, sw: document.documentElement.scrollWidth, side: [...document.querySelectorAll('.swp-side b')].map((e) => e.textContent) }));
    let r = await info();
    ok(r.card === 'Lav' && /^1\/6/.test(r.pt) && r.side.join() === 'Životinje,Biljke', 'prva kartica, napredak ' + r.pt + ', kategorije ' + r.side);
    ok(r.sw <= W + 1, 'bez vodoravnog skrola (' + r.sw + ')');
    await page.screenshot({ path: OUT + '/swipe-' + W + '-a.png' });
    const drag = async (dx, dy = 0) => { const bx = await (await page.$('.swp-card[data-si]')).boundingBox(); const x = bx.x + bx.width / 2, y = bx.y + bx.height / 2; await page.mouse.move(x, y); await page.mouse.down(); for (let k = 1; k <= 6; k++) await page.mouse.move(x + dx * k / 6, y + dy * k / 6); return { up: () => page.mouse.up() }; };
    // mali povlak: vraća se
    let d = await drag(25); await page.screenshot({ path: OUT + '/swipe-' + W + '-b.png' }); await d.up(); await page.waitForTimeout(350);
    r = await info(); ok(r.card === 'Lav', 'kratki povlak ne preskače karticu');
    // dodir bez povlačenja
    await page.click('.swp-card[data-si]'); await page.waitForTimeout(350); r = await info(); ok(r.card === 'Lav', 'dodir ne razvrstava');
    // povlak ulijevo -> životinje (0)
    d = await drag(-130, 10); await page.screenshot({ path: OUT + '/swipe-' + W + '-c.png' });
    ok(await page.evaluate(() => { const c = document.querySelector('.swp-card[data-si]'); return /rotate\(-/.test(c.style.transform); }), 'kartica prati prst i naginje se'); await d.up(); await page.waitForTimeout(500);
    r = await info(); ok(r.card === 'Ris' && /^2\/6/.test(r.pt) && r.undo === false, 'povlak ulijevo → sljedeća kartica ' + r.pt);
    // dvostruki klik na gumb: samo jedna kartica
    await page.dblclick('[data-go="0"]'); await page.waitForTimeout(600); r = await info(); ok(r.card === 'Hrast', 'dvoklik na gumb bilježi samo jednu karticu (sada: ' + r.card + ')');
    // poništi
    await page.waitForTimeout(300); await page.click('#swpUndo'); await page.waitForTimeout(400); r = await info(); ok(r.card === 'Ris' && /^2\/6/.test(r.pt), 'poništi vraća posljednju karticu');
    await page.waitForTimeout(300); await page.click('[data-go="0"]'); await page.waitForTimeout(500);
    // ostalo: Hrast→1, Bukva→1, Orao→0, Bor→1 (gumbima i povlakom)
    for (const z of [1, 1, 0, 1]) { await page.waitForTimeout(420); if (z === 1 && Math.random() < 2) { d = await drag(140); await d.up(); } else await page.click('[data-go="' + z + '"]'); await page.waitForTimeout(450); }
    r = await info(); ok(/Gotovo/.test(r.done) && !r.dis && /6\/6/.test(r.pt), 'sve razvrstano → Gotovo (' + r.pt + ')');
    await page.screenshot({ path: OUT + '/swipe-' + W + '-d.png' });
    await page.dblclick('#srtDone'); await page.waitForTimeout(300);
    const inp = await page.evaluate(() => window.__inp); const sent = inp.length && JSON.parse(inp[0]);
    ok(inp.length === 1 && JSON.stringify(sent.r) === JSON.stringify([0, 0, 1, 1, 0, 1]), 'predaja jednom, odgovori ' + (sent && JSON.stringify(sent.r)));
    ok(errs.length === 0, 'bez grešaka u konzoli' + (errs.length ? ': ' + errs[0] : ''));
    await ctx.close();
  }
  await b.close(); console.log(fails ? '✘ neuspjeh: ' + fails : '✔ sve u redu'); process.exit(fails ? 1 : 0);
})();

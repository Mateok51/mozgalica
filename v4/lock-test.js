'use strict';
// Provjera: nakon razbijanja leda / brisanja sluzi dodiri ne smiju slučajno odabrati odgovor.
const { chromium } = require('playwright');
const path = require('path');
const FILE = 'file://' + path.join(__dirname, '..', 'web', 'site', 'index.html');
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };

async function run(kind) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  await page.goto(FILE);
  await page.evaluate((k) => {
    POWER_KEYS.splice(0, POWER_KEYS.length, k);
    Object.assign(CFG, { intro: 0.5, vote: 3, voteShow: 0.5, power: 3, q: 25, reveal: 1 });
  }, kind);
  await page.tap('#demo');
  await page.tap('#dstart');
  // čekaj dok neki bot ne baci efekt na nas (glasanje/moći preskačemo)
  let got = false;
  for (let i = 0; i < 400 && !got; i++) {
    await page.waitForTimeout(150);
    if (await page.$('#fx.fx-' + kind)) { got = true; break; }
    const v = await page.$('[data-v]:not([disabled])'); if (v) { await v.tap(); continue; }
    const p = await page.$('#nopw'); if (p) { await p.tap(); continue; }
    const c = await page.$('[data-c]:not([disabled])');
    if (c && !(await page.$('#fx'))) { await c.tap(); continue; } // pitanja bez efekta samo odgovori
  }
  ok(got, kind + ': efekt se pojavio');
  if (!got) { await browser.close(); return; }
  // točka iznad drugog odgovora
  const box = await page.locator('.p-opt.o1').boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  if (kind === 'led') {
    // tapka dok se sav led ne razbije (može ih biti više zaredom), pa nastavi još 5 puta istom brzinom
    for (let i = 0; i < 40 && (await page.$('#fx')); i++) await page.touchscreen.tap(x, y);
    for (let i = 0; i < 5; i++) await page.touchscreen.tap(x, y);
  } else {
    // briše sluz cik-cak potezima prstom i zadnji potez završava na odgovoru
    const fx = await page.locator('#fx').boundingBox();
    for (let row = 0; row < 40 && (await page.$('#fx')); row++) {
      if (!(await page.$('#fx.fx-sluz'))) { await page.touchscreen.tap(x, y); continue; }
      await page.mouse.move(fx.x + 4, fx.y + ((row % 9) + 0.5) * fx.height / 9);
      await page.mouse.down();
      await page.mouse.move(fx.x + fx.width - 4, fx.y + ((row % 9) + 0.5) * fx.height / 9, { steps: 10 });
      await page.mouse.move(x, y, { steps: 3 });
      await page.mouse.up();
    }
    await page.touchscreen.tap(x, y);
  }
  await page.waitForTimeout(150);
  const fxGone = !(await page.$('#fx'));
  const picked = await page.$('.p-opt.picked');
  const txt = await page.textContent('.waiting');
  ok(fxGone, kind + ': efekt je uklonjen');
  ok(!picked, kind + ': slučajni dodiri nakon uklanjanja NISU odabrali odgovor');
  ok(/otključavaju/.test(txt), kind + ': piše da se odgovori otključavaju ("' + txt.trim() + '")');
  await page.waitForTimeout(1000);
  ok(!(await page.$('.p-opt.locked')), kind + ': nakon pauze odgovori su otključani');
  await page.locator('.p-opt.o2').tap();
  await page.waitForTimeout(150);
  ok(!!(await page.$('.p-opt.o2.picked')), kind + ': namjerni dodir nakon toga odabire odgovor');
  ok(errors.length === 0, kind + ': bez grešaka' + (errors.length ? ': ' + errors.join(' | ') : ''));
  await browser.close();
}

(async () => {
  await run('led');
  await run('sluz');
  console.log(fails ? '\n' + fails + ' PROVJERA NIJE PROŠLO ✘' : '\nSVE PROVJERE PROŠLE ✔');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });

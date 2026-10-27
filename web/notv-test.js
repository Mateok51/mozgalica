'use strict';
// Način bez TV-a: domaćin igra s mobitela + 2 igrača. Veza simulirana istim lažnim Peerom kao multi-test.
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const SITE = path.join(__dirname, 'site');
const SHOTS = path.join(__dirname, 'shots-notv');
fs.mkdirSync(SHOTS, { recursive: true });
const src = fs.readFileSync(path.join(__dirname, 'multi-test.js'), 'utf8');
const MOCK = src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));

const server = http.createServer((req, res) => {
  const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html'));
  if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); }
  const type = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain';
  res.writeHead(200, { 'content-type': type }); fs.createReadStream(p).pipe(res);
});
let fails = 0;
const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };

(async () => {
  await new Promise((r) => server.listen(8766, r));
  const URL = 'http://localhost:8766/';
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true });
  await ctx.addInitScript(MOCK);
  await ctx.route(/unpkg\.com|jsdelivr|fonts\.googleapis|fonts\.gstatic/, (r) => r.abort());
  const errors = [];
  const mk = async (name, seed) => {
    const p = await ctx.newPage();
    p.on('pageerror', (e) => errors.push(name + ': ' + e.message));
    await p.addInitScript((sd) => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (k) => k === 'mz_pid' ? sd : (k === 'mz_name' ? null : real(k)); }, seed);
    return p;
  };

  console.log('1) Domaćin otvara sobu na mobitelu');
  const host = await mk('Mateo', 'pid-mateo');
  await host.goto(URL);
  await host.evaluate(([ch, QV]) => Object.assign(CFG, { chal: ch, qv: JSON.parse(QV), howto: 1.5, howtoShort: 0.8, order: 12, hilo: 15, blitz: 10, maj: 6, majReveal: 1.5,  intro: 0.8, vote: 6, voteShow: 1.2, power: 8, q: 10, reveal: 2.5, sort: 20, link: 20, chReveal: 2.5, fq: 5, fr: 2 }), [(process.env.CHAL || 'sort,link').split(','), process.env.QV || '{"who":1,"emoji":1}']);
  await host.click('#hostp');
  await host.fill('#hname', 'Mateo');
  await host.click('#hform button[type=submit]');
  await host.waitForSelector('.lob-code', { timeout: 6000 });
  const code = (await host.textContent('.lob-code')).trim();
  ok(/^[A-Z]{4}$/.test(code), 'soba otvorena na mobitelu, kod ' + code);
  ok(await host.$eval('#dstart', (b) => b.disabled), 'početak je onemogućen dok nema drugih igrača');
  await host.click('[data-av="5"]');
  await host.screenshot({ path: SHOTS + '/1-domacin-predvorje.png' });

  console.log('2) Igrači se pridružuju');
  const players = [];
  for (const [n, seed, av] of [['Ana', 'pid-ana', 3], ['Iva', 'pid-iva', 6]]) {
    const p = await mk(n, seed);
    await p.goto(URL + '#' + code);
    await p.fill('#name', n);
    await p.click('button[type=submit]');
    await p.waitForSelector('[data-av]', { timeout: 6000 });
    await p.click('[data-av="' + av + '"]');
    players.push(p);
  }
  await host.waitForTimeout(500);
  const takenOnHost = await host.$$eval('.lob-row .nm', (els) => els.map((e) => e.textContent));
  ok(takenOnHost.includes('Ana') && takenOnHost.includes('Iva'), 'domaćin vidi oba igrača: ' + takenOnHost.join(', '));
  ok(!(await host.$eval('#dstart', (b) => b.disabled)), 'početak je sada omogućen');
  await host.click('#dstart');

  console.log('3) Igra: svi na mobitelima');
  const all = [host, ...players];
  const seen = new Set();
  const act = (p) => p.evaluate(() => {
    const q = (s) => document.querySelector(s);
    if (q('#fx')) {
      const fx = q('#fx');
      if (fx.classList.contains('fx-led')) for (let i = 0; i < 8; i++) { const f = q('#fx.fx-led'); if (f) f.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }
      else if (fx.classList.contains('fx-grick')) document.querySelectorAll('.bug').forEach((b) => b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
      else if (fx.classList.contains('fx-bomba')) for (let i = 0; i < 5; i++) { const b = q('#bomb'); if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }
      else { const r = fx.getBoundingClientRect(); fx.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: r.left + 2, clientY: r.top + 2 }));
        for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) fx.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: r.left + (x + 0.5) * r.width / 6, clientY: r.top + (y + 0.5) * r.height / 8 }));
        fx.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); }
      return 'fx';
    }
    if (Date.now() < 0) return '';
    const click = (s) => { const e = q(s); if (e) { e.click(); return true; } return false; };
    if (click('[data-v]:not([disabled])')) return 'vote';
    if (click('[data-t]')) return 'target';
    if (click('[data-bet]:not([disabled])')) return 'bet';
    if (click('[data-or]:not([disabled])')) return 'order';
    if (click('[data-hl]')) return 'hilo';
    if (click('[data-bz]')) return 'blitz';
    if (click('[data-mj]:not([disabled])')) return 'maj';
    if (click('[data-sx]')) return 'secret';
    if (click('[data-sy="1"]')) return 'secret';
    if (click('[data-p]')) return 'power';
    if (click('.p-opts.two [data-c]:not([disabled])')) return 'fq';
    if (click('[data-c]:not([disabled]):not(.locked)')) return 'q';
    if (click('#srtDone:not([disabled])')) return 'sort';
      if (q('.srt-pool .srt-card')) { click('.srt-pool .srt-card'); click('.srt-zone'); return 'sort'; }
    if (click('#lnkDone:not([disabled])')) return 'link';
      if (q('.lnk:not(.sent) [data-ll]:not(.paired)')) { click('.lnk [data-ll]:not(.paired)'); click('.lnk [data-lr]:not(.paired)'); return 'link'; }
    if (q('.mboard') && (q('.result') || q('.rv'))) return q('.sort-cols') ? 'sortsol' : q('.pairs') ? 'linksol' : 'board';
    if (q('.phone-pyr')) return 'pyr';
    return '';
  });
  const t0 = Date.now();
  let done = false;
  while (Date.now() - t0 < 5 * 60 * 1000) {
    await host.waitForTimeout(200);
    for (const p of all) {
      const a = await act(p);
      if (a && !seen.has(a)) {
        seen.add(a);
        if (['board', 'sortsol', 'linksol', 'pyr', 'vote'].includes(a)) await p.screenshot({ path: SHOTS + '/m-' + a + '.png' });
      }
    }
    if (await host.$('#dagain')) { done = true; break; }
  }
  ok(done, 'igra je došla do kraja za ' + Math.round((Date.now() - t0) / 1000) + ' s');
  await host.waitForTimeout(600);
  for (const [p, n] of [[host, 'Mateo'], [players[0], 'Ana'], [players[1], 'Iva']]) {
    const rows = await p.$$eval('.mboard .rank-row .nm', (els) => els.map((e) => e.textContent));
    ok(rows.length === 3, n + ' vidi konačni poredak svih: ' + rows.join(', '));
  }
  await host.screenshot({ path: SHOTS + '/kraj-domacin.png' });
  await players[0].screenshot({ path: SHOTS + '/kraj-ana.png' });
  ok(seen.has('board'), 'nakon pitanja svi vide poredak s osvojenim bodovima');
  if (!process.env.CHAL) { ok(seen.has('sortsol'), 'nakon razvrstavanja vidi se rješenje'); ok(seen.has('linksol'), 'nakon spajanja vide se točni parovi'); }
  ok(seen.has('pyr'), 'u finalu se na mobitelu vidi piramida sa svim igračima');
  ok(!!(await host.$('#dagain')) && !(await players[0].$('#dagain')), 'samo domaćin može pokrenuti novu igru');
  // Legende ove krčme: isti pregled na svim mobitelima, i nakon ponovnog spajanja
  const legOf = async (p) => { await p.click('#legOpen'); await p.waitForSelector('.lg-list', { timeout: 4000 }); return p.evaluate(() => document.querySelector('.lg-story').textContent + '||' + [...document.querySelectorAll('.lg-card')].map((c) => c.textContent).join('|')); };
  const L = [];
  for (const p of all) L.push(await legOf(p));
  ok(L[0].length > 40 && L.every((x) => x === L[0]), 'svi mobiteli vide iste legende (' + (L[0].match(/\|/g) || []).length + ' dijelova)');
  console.log('     ' + L[0].split('||')[0]);
  await players[1].screenshot({ path: SHOTS + '/legende-iva.png' });
  await players[0].reload();
  await players[0].waitForSelector('#name', { timeout: 6000 }).catch(() => {});
  if (await players[0].$('#name')) { await players[0].fill('#name', 'Ana'); await players[0].click('button[type=submit]'); }
  await players[0].waitForSelector('#legOpen', { timeout: 8000 }).catch(() => {});
  ok(!!(await players[0].$('#legOpen')), 'Ana se ponovno spaja nakon kraja i dobiva završni ekran');
  ok(await legOf(players[0]) === L[0], 'nakon ponovnog spajanja isti pregled legendi');
  // Iva gleda legende dok domaćin pokreće novu igru
  ok(!!(await players[1].$('.lg-wrap')), 'Iva ima otvorene legende');
  await host.click('#legClose');
  await host.click('#dagain');
  await players[1].waitForFunction(() => document.documentElement.dataset.ph === 'lobby', null, { timeout: 6000 }).catch(() => {});
  await players[1].waitForTimeout(500);
  const ivaSt = await players[1].evaluate(() => document.documentElement.dataset.ph + ' / pregled ' + (document.querySelector('.lg-wrap') ? 'otvoren' : 'zatvoren') + ' / ' + (document.querySelector('#app') || {}).className);
  ok(/^lobby \/ pregled zatvoren/.test(ivaSt), 'nova igra dok Iva gleda legende: Iva prelazi u predvorje (' + ivaSt + ')');
  await host.waitForSelector('#dstart', { timeout: 4000 }).catch(() => {});
  ok(!!(await host.$('#dstart')), 'nova igra: domaćin je opet u predvorju');
  ok(errors.length === 0, 'bez grešaka u pregledniku' + (errors.length ? ': ' + errors.join(' | ') : ''));
  console.log(fails ? '\n' + fails + ' PROVJERA NIJE PROŠLO ✘' : '\nSVE PROVJERE PROŠLE ✔');
  await browser.close(); server.close();
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); server.close(); process.exit(1); });

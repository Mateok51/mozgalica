'use strict';
// Sluz: brzi potez prstom (malo točaka) briše dovoljno, efekt nestaje; odgovori se otključavaju za <= ~0,5 s. node v3/fx-wipe-test.js
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path'), crypto = require('crypto');
const root = path.join(__dirname, '..', 'web', 'site');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('  setInterval(tick, 100);', '  setInterval(tick, 100); window.testUI=(d)=>{mode="player";applyState(d);};');
html = html.replace(/<meta[^>]*Content-Security-Policy[^>]*>/i, '');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const p = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
    const errs = []; p.on('pageerror', (e) => errs.push(e.message));
    await p.addInitScript(() => localStorage.setItem('mz_pid', 'one'));
    await p.route('**/*', (r) => { const u = new URL(r.request().url()); if (u.hostname !== 'game.test') return r.abort(); const f = path.join(root, u.pathname.slice(1)); return u.pathname === '/' ? r.fulfill({ body: html, contentType: 'text/html' }) : fs.existsSync(f) ? r.fulfill({ body: fs.readFileSync(f) }) : r.abort(); });
    await p.goto('http://game.test/');
    const P = [{ id: 'one', n: 'Ana', a: 0, sc: 0, c: 1, fx: ['sluz'] }, { id: 'two', n: 'Marko', a: 1, sc: 0, c: 1 }];
    const d = { v: 3, code: 'TEST', ph: 'question', s: 40, ms: 20000, dur: 20000, ntv: 1, steps: 8, P, ev: [], cats: ['A', 'B', 'C', 'D'], cw: 0, q: { c: 'Kategorija', t: 'Pitanje?', o: ['Jedan', 'Dva', 'Tri', 'Četiri'] } };
    await p.evaluate((x) => testUI(x), d); await p.waitForTimeout(400);
    const fx = await p.$('#fx'); ok(!!fx && /fx-sluz/.test(await fx.getAttribute('class')), 'sluz je prikazan');
    const r = await fx.boundingBox();
    // dva brza okomita poteza s malo točaka (kao brz prst na mobitelu)
    const x1 = r.x + r.width * 0.3, x2 = r.x + r.width * 0.7;
    await p.mouse.move(x1, r.y + 5); await p.mouse.down();
    await p.mouse.move(x1, r.y + r.height - 5, { steps: 4 }); await p.mouse.move(x2, r.y + r.height - 5, { steps: 2 }); await p.mouse.move(x2, r.y + 5, { steps: 4 });
    await p.mouse.up(); await p.waitForTimeout(150);
    ok(!(await p.$('#fx')), 'dva brza poteza uklanjaju sluz');
    await p.waitForTimeout(100);
    ok(await p.$$eval('.p-opt', (es) => es.every((e) => e.classList.contains('locked'))) , 'odgovori su kratko zaključani odmah nakon brisanja');
    await p.waitForTimeout(500);
    ok(await p.$$eval('.p-opt', (es) => es.every((e) => !e.classList.contains('locked'))), 'odgovori su otključani unutar ~0,6 s');
    ok(errs.length === 0, 'bez grešaka ' + errs.join(' | '));
  } finally { await b.close(); }
  console.log(fails ? 'NEUSPJEH ' + fails : 'OK'); process.exit(fails ? 1 : 0);
})();

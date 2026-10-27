'use strict';
// Tavern Social Flow 2.0 u pravom pregledniku (mobitel 360×740).
// SOLO=1: domaćin + 3 bota u testnom načinu (Test A, B, C, G, H).  Inače: 3 prava igrača (Test I) — TV=1, RELAY=1.
// Pokretanje (port 8766): node web/sf-web-test.js   ·   SOLO=1   ·   TV=1   ·   RELAY=1
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-sf'); fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(path.join(__dirname, 'multi-test.js'), 'utf8');
let MOCK = src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));
const RELAY = process.env.RELAY === '1', TV = process.env.TV === '1', SOLO = process.env.SOLO === '1';
if (RELAY) MOCK = MOCK.replace("if (m.k === 'conn') {", "if (m.k === 'conn') { return;").replace("setTimeout(() => { if (!c.open && !this.destroyed) this._emit('error', { type: 'peer-unavailable' }); }, 1500);", "");
MOCK = MOCK.replace("else if (m.k === 'data') { const c = this.conns[m.cid]; if (c && c.open) c._emit('data', m.d); }", "else if (m.k === 'data') { const c = this.conns[m.cid]; if (c && c.open) { (window.__recv = window.__recv || []).push(JSON.stringify(m.d)); if (window.__recv.length > 800) window.__recv.shift(); c._emit('data', m.d); } }");
MOCK = "window.__MQTT_URLS = ['ws://localhost:8767/mqtt'];\n" + MOCK;
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html')); if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); } if (p.endsWith('index.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(p, 'utf8').replace("connect-src 'self'", "connect-src 'self' ws://localhost:8767")); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const CFGX = { qv: { who: 0, emoji: 0 }, chal: ['sort', 'link'], betEvents: [0, 0], intro: 0.4, vote: 3, voteShow: 0.6, roul: 0.4, power: 2.5, q: 9, reveal: 2.5, howto: 0.5, howtoMax: 0.5, howtoShort: 0.3, sort: 3, link: 3, chReveal: 0.5, pactAfter: 1, rcAfter: 99, betrayShow: 6.5, fstart: 1, fpower: 2, fq: 3, fr: 1 };
(async () => {
  const broker = require('./mini-broker').start(8767);
  await new Promise((r) => server.listen(8766, r)); const URL = 'http://localhost:8766/';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 360, height: 740 }, hasTouch: true });
  await ctx.addInitScript(MOCK); await ctx.route(/unpkg\.com|jsdelivr|fonts\./, (r) => r.abort());
  const errors = [];
  const mk = async (name, seed) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(name + ': ' + e.message)); await p.addInitScript((sd) => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (k) => k === 'mz_pid' ? sd : (k === 'mz_name' ? null : real(k)); }, seed); p.__n = name; return p; };
  const ph = (p) => p.evaluate(() => document.documentElement.dataset.ph).catch(() => '');
  const has = (p, s) => p.$(s).then((e) => !!e).catch(() => false);
  const click = (p, s) => p.evaluate((x) => { const e = document.querySelector(x); if (e) e.click(); return !!e; }, s).catch(() => false);
  const sf = SOLO ? { at: [1, 2, 3], atBot: [1, 2, 3, 4], soloMax: 600, dur: 30 } : {};   // višeigračka partija: stvarna pravila (bez Vremena za dogovore)
  if (SOLO) CFGX.q = 22;   // botovi pogođeni moćima odgovaraju sporije; test čeka njihov šapat prije vlastitog odgovora
  console.log('Način:', SOLO ? 'SOLO s 3 bota (testni način)' : (TV ? 'TV + mobiteli' : 'samo mobiteli') + (RELAY ? ' (relej)' : ' (izravno)'));
  let host, code;
  if (TV) {
    host = await mk('TV', 'pid-tv'); await host.setViewportSize({ width: 1280, height: 720 }); await host.goto(URL);
    await host.evaluate(([c, s]) => { Object.assign(CFG, c); CFG.sf = Object.assign({}, CFG.sf, s); }, [CFGX, sf]); await host.click('#host'); await host.waitForSelector('.lob-code'); code = (await host.textContent('.lob-code')).trim();
  } else {
    host = await mk('Mateo', 'pid-mateo'); await host.goto(URL);
    await host.evaluate(([c, s]) => { Object.assign(CFG, c); CFG.sf = Object.assign({}, CFG.sf, s); }, [CFGX, sf]);
    await host.click('#hostp'); await host.fill('#hname', 'Mateo'); await host.click('#hform button[type=submit]');
    await host.waitForSelector('.lob-code'); code = (await host.textContent('.lob-code')).trim();
  }
  const P = TV ? [] : [host];
  if (SOLO) {
    for (let i = 0; i < 3; i++) await click(host, '[data-bots="1"]');
    await host.waitForTimeout(300);
    ok(await has(host, '[data-bsopt="1"]'), 'predvorje: „🤖 Testiraj društvene mehanike s botovima” (isključeno po zadanom)');
    await host.evaluate(() => sessionStorage.setItem('mz_dev', '1'));   // skriveni razvojni izbornik (testni scenariji)
    await click(host, '[data-bsopt="1"]'); await host.waitForSelector('[data-bsopt="0"]', { timeout: 3000 });
    await host.screenshot({ path: OUT + '/0-predvorje-solo.png', fullPage: true });
  } else {
    for (const [n, seed] of (TV ? [['Mateo', 'pid-mateo'], ['Ana', 'pid-ana'], ['Iva', 'pid-iva']] : [['Ana', 'pid-ana'], ['Iva', 'pid-iva']])) {
      const p = await mk(n, seed); await p.goto(URL + '#' + code); await p.fill('#name', n); await p.click('button[type=submit]');
      await p.waitForSelector('[data-av]', { timeout: 20000 }); await p.evaluate(() => { const x = document.querySelector('#app [data-av]:not([disabled])'); if (x) x.click(); });
      P.push(p);
    }
    await host.waitForTimeout(800);
    ok(!(await has(host, '[data-bsopt="0"]')), 'obična partija: testni način s botovima je isključen');
  }
  if (TV) await click(host, '#start'); else await click(host, '#dstart');
  // automatsko igranje: glasanje, bez moći, odgovori (prvi ponuđeni)
  const auto = (pp, noAns) => Promise.all(pp.map((p) => p.evaluate((na) => { const A = document.getElementById('app'); if (!A) return; const x = A.querySelector('[data-v]:not([disabled]), #nopw' + (na ? '' : ', [data-c]:not([disabled])')); if (x) x.click(); }, noAns).catch(() => {})));
  const waitPh = async (pp, want, ms) => { const t = Date.now(); while (Date.now() - t < (ms || 60000)) { if ((await ph(pp[0])) === want) return true; await auto(pp, want === 'question'); await pp[0].waitForTimeout(120); } return false; };

  if (SOLO) {
    const me = host;
    console.log('Test G — Vrijeme za dogovore: botovi spremni, ja čitam bez odbrojavanja');
    ok(await waitPh([me], 'deal', 90000), 'otvorilo se Vrijeme za dogovore');
    await me.waitForTimeout(1500);
    ok(/VRIJEME ZA DOGOVORE/.test(await me.textContent('#app')) && !(await has(me, '#app #timer')), 'naslov, bez odbrojavanja u solo testu');
    ok(/Nastavi kada si spreman/.test(await me.textContent('#app')), 'gumb „Nastavi kada si spreman”');
    await me.screenshot({ path: OUT + '/1-dogovor-upute.png' });
    await click(me, '#app [data-sfintro]'); await me.waitForTimeout(300);
    console.log('Test B — bot šalje ponudu');
    await click(me, '#app [data-sfscnopen]'); await me.waitForTimeout(200);
    await me.screenshot({ path: OUT + '/2-scenariji.png' });
    await click(me, '#app [data-scn="offer"]');
    const card = await me.waitForSelector('#app .sf-card', { timeout: 6000 }).then(() => true, () => false);
    ok(card && /ti nudi tajni pakt/.test(await me.textContent('#app .sf-card')), 'ponuda bota je jasna kartica: ' + (card ? (await me.textContent('#app .sf-card .pk-inv-h')).trim() : '-'));
    await me.waitForTimeout(3000);
    ok(await ph(me) === 'deal', 'igra čeka (nema odbrojavanja) dok čitam');
    await me.screenshot({ path: OUT + '/3-ponuda-bota.png' });
    await click(me, '#app .sf-card [data-pk="accept"]');
    const ally = await me.waitForFunction(() => /💰/.test((document.querySelector('#app .sf-ally') || {}).textContent || ''), null, { timeout: 6000 }).then(() => true, () => false);
    ok(ally, 'Test A — pakt s botom sklopljen (vidim saveznika i riznicu)');
    await click(me, '#app [data-sfscnopen]'); await me.waitForTimeout(150); await click(me, '#app [data-scn="whisper"]'); await me.waitForTimeout(150);
    await me.screenshot({ path: OUT + '/4-savez.png' });
    const t0 = Date.now(); await click(me, '#sfready');
    await me.waitForFunction(() => document.documentElement.dataset.ph !== 'deal', null, { timeout: 4000 }).catch(() => {});
    ok(await ph(me) !== 'deal' && Date.now() - t0 < 3000, 'nakon „Nastavi” igra odmah nastavlja (' + (Date.now() - t0) + ' ms)');
    console.log('Test H / A — pitanje: šapat jednim dodirom, bot šapće svoj odgovor');
    ok(await waitPh([me], 'question', 30000), 'pitanje');
    await me.waitForSelector('#app [data-whi]', { timeout: 5000 }).catch(() => {});
    ok(await has(me, '#app [data-whi]') && !(await has(me, '#app .sf-qbar')), '🔮 na karticama odgovora, bez trake saveznika');
    ok(!(await has(me, '#sfbox .sf-key')), 'gumb Tajne skriven dok se odgovara');
    // moći botova (led, sluz, bube, bombe) mogu prekriti odgovore — očisti ih kao igrač
    for (let k = 0; k < 6; k++) { const fx = await me.evaluate(() => { const q = (x) => document.querySelector(x), fx = q('#fx'); if (!fx) return false;
      if (fx.classList.contains('fx-led')) for (let i = 0; i < 8; i++) { const f = q('#fx.fx-led'); if (f) f.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }
      else if (fx.classList.contains('fx-grick')) document.querySelectorAll('.bug').forEach((b) => b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })));
      else if (fx.classList.contains('fx-bomba')) for (let i = 0; i < 5; i++) { const b = q('#bomb'); if (b) b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }
      else { const r = fx.getBoundingClientRect(); fx.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1, clientX: r.left + 2, clientY: r.top + 2 }));
        for (let y = 0; y < 8; y++) for (let x = 0; x < 6; x++) fx.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerId: 1, clientX: r.left + (x + 0.5) * r.width / 6, clientY: r.top + (y + 0.5) * r.height / 8 }));
        fx.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 })); }
      return true; }); if (!fx) break; await me.waitForTimeout(700); }
    const whIn = await me.waitForSelector('#app .sf-whav', { timeout: 17000 }).then(() => me.evaluate(() => 'ABCD'[+document.querySelector('#app .sf-whav').closest('[data-c]').dataset.c]), () => '');
    ok(/[ABCD]/.test(whIn || ''), 'bot mi je šapnuo svoj odgovor (avatar na odgovoru ' + whIn + ')');
    await click(me, '#app [data-whi="1"]');
    ok(await me.waitForSelector('#app [data-c="1"] .sf-whi.sent', { timeout: 4000 }).then(() => true, () => false), 'moj 🔮 na B: šapat poslan bez zaključavanja odgovora');
    await me.screenshot({ path: OUT + '/5-pitanje-sapat.png' });
    for (let k = 0; k < 10 && !(await has(me, '#app .p-opt.picked')); k++) { await click(me, '#app [data-c="0"]'); await me.waitForTimeout(300); }
    // ako sam zadnji odgovorio, pitanje odmah završava (traka nestaje); dostava šapata jednim dodirom provjerava se i u testu s tri prava igrača
    const sent = await me.waitForSelector('#app .p-opt.picked', { timeout: 2500 }).then(() => 'odabrano', async () => (await ph(me)) !== 'question' ? 'pitanje je odmah završilo (zadnji odgovor)' : '');
    ok(!!sent, 'odgovor zaključan zasebnim dodirom: ' + sent);
    console.log('Test C — bot priprema izdaju (prije pitanja), izvrši se nakon pitanja');
    ok(await waitPh([me], 'deal', 60000), 'sljedeće Vrijeme za dogovore');
    await me.waitForTimeout(400);
    await click(me, '#app [data-sfscnopen]'); await me.waitForTimeout(150); await click(me, '#app [data-scn="betray"]'); await me.waitForTimeout(300);
    const st = await me.textContent('#app');
    ok(!/Izdaja pripremljena/.test(st), 'ne vidim da bot priprema izdaju');
    // moja strana: dvostupanjska potvrda (provjera sučelja), pa odustajem
    await click(me, '#app [data-sfbt="1"]'); await me.waitForTimeout(200);
    ok(/uzimaš riznicu/.test(await me.textContent('#app')), 'Test D (sučelje) — „🗡️ PRIPREMAŠ IZDAJU” s posljedicama i potvrdom');
    await me.screenshot({ path: OUT + '/6-izdaja-potvrda.png' });
    await click(me, '#app [data-sfbt="0"]'); await me.waitForTimeout(150);
    await click(me, '#sfready');
    let seenBt = false;
    for (let t = 0; t < 400 && !seenBt; t++) { await auto([me]); seenBt = await has(me, '#app .bt'); if (!seenBt) await me.waitForTimeout(120); }
    ok(seenBt, 'izdaja bota prikazana postojećom animacijom „IZDAJA”');
    if (seenBt) { await me.waitForTimeout(2500); await me.screenshot({ path: OUT + '/7-izdaja-bota.png' }); }
    console.log('Tajni kutak u mirnoj fazi');
    let key = false;
    for (let t = 0; t < 300 && !key; t++) { await auto([me], true); key = await has(me, '#sfbox .sf-key'); if (!key) await me.waitForTimeout(100); }
    ok(key, 'gumb „🗝️ Tajne” je vidljiv između pitanja');
    if (key) {
      const bx = await me.evaluate(() => { const r = document.querySelector('#sfbox .sf-key').getBoundingClientRect(); return [r.left, r.bottom, innerHeight, r.height]; });
      ok(bx[0] >= 0 && bx[1] <= bx[2] && bx[3] >= 44, 'dostupan palcem, unutar ekrana (' + bx.map(Math.round).join(', ') + ')');
      await click(me, '#sfbox .sf-key'); await me.waitForTimeout(300);
      ok(await has(me, '#sfbox .sf-sheet'), 'otvara se Tajni kutak');
      await me.screenshot({ path: OUT + '/8-tajni-kutak.png' });
      const ok2 = await waitPh([me], 'question', 30000);
      ok(ok2 && !(await has(me, '#sfbox .sf-sheet')), 'kad pitanje počne, kutak se sam zatvori');
    }
  } else {
    // par: Ana + partner (u načinu bez TV-a partner je domaćin), treći igrač je uvijek klijent — na njemu se provjerava mreža
    const [iva, ana, mateo] = TV ? [P[0], P[1], P[2]] : P;
    const ids = { Mateo: 'pid-mateo', Ana: 'pid-ana', Iva: 'pid-iva' };
    console.log('Test I — tri prava igrača');
    // ponuda iz Tajnog kutka (🗝️) između pitanja, prije prvog Vremena za dogovore
    let viaKey = false;
    for (let t = 0; t < 400 && !viaKey && (await ph(ana)) !== 'deal'; t++) {
      await auto(P, true);
      if (await has(ana, '#app [data-sfintro]')) await click(ana, '#app [data-sfintro]');
      if (!(await has(ana, '#sfbox .sf-sheet')) && await has(ana, '#sfbox .sf-key')) await click(ana, '#sfbox .sf-key');
      if (await has(ana, '#sfbox [data-sfintro]')) await click(ana, '#sfbox [data-sfintro]');
      if (await click(ana, '#sfbox [data-pk="offer"][data-to="' + ids[iva.__n] + '"]')) viaKey = true;
      await ana.waitForTimeout(100);
    }
    if (viaKey) { await ana.waitForTimeout(500); ok(/Ponuda poslana/.test(await ana.textContent('#sfbox')), 'Ana šalje ponudu iz Tajnog kutka (između pitanja): „Ponuda poslana”'); await ana.screenshot({ path: OUT + '/i0-kutak-ana.png' }); }
    ok(viaKey, 'ponuda poslana bez posebne faze');
    // Iva: obavijest + 🔴 na ključu, prihvaća u kutku između pitanja
    let ivaCard = '';
    for (let t = 0; t < 300 && !ivaCard; t++) {
      await auto(P, true);
      if (!(await has(iva, '#sfbox .sf-sheet')) && await has(iva, '#sfbox .sf-key.new')) { ok(true, iva.__n + ' vidi oznaku nepročitane ponude na 🗝️'); await click(iva, '#sfbox .sf-key'); }
      if (await has(iva, '#sfbox .sf-card')) ivaCard = await iva.textContent('#sfbox .sf-card .pk-inv-h');
      await iva.waitForTimeout(100);
    }
    ok(/Ana ti nudi tajni pakt/.test(ivaCard), iva.__n + ' vidi jasnu karticu: ' + ivaCard.trim());
    ok(!(await has(mateo, '.sf-card')), mateo.__n + ' ne vidi tuđu ponudu');
    await iva.screenshot({ path: OUT + '/i1-ponuda-iva.png' });
    if (!RELAY) { const rec = await mateo.evaluate(() => (window.__recv || []).join('\n')).catch(() => ''); ok(rec.length > 0 && !/"inv":\[\{"f":"pid-ana"/.test(rec), 'mreža: ' + mateo.__n + ' nikad ne prima tuđe ponude'); }
    await click(iva, '#sfbox .sf-card [data-pk="accept"]');
    ok(await ana.waitForFunction(() => /💰/.test(((document.querySelector('#sfbox .sf-ally') || {}).textContent) || '') || !!document.querySelector('#sfbox .sf-ally-dot'), null, { timeout: 8000 }).then(() => true, () => false), 'Ana vidi savez (🍻 na ključu ili u kutku)');
    ok(await waitPh(P, 'question', 30000), 'sljedeće pitanje');
    await ana.waitForSelector('#app [data-c]', { timeout: 5000 }).catch(() => {});
    ok(!(await has(ana, '#app [data-whi]')) && !(await has(ana, '#app .sf-qbar')), 'nema šaputanja ni trake saveznika na pitanju');
    await click(ana, '#app [data-c="0"]');
    await iva.screenshot({ path: OUT + '/i2-pitanje-iva.png' });
    // Iva priprema izdaju u kutku između pitanja (dvostupanjski), Ana ništa ne zna; zaključava se kad pitanje počne
    let armed = false;
    for (let t = 0; t < 300 && !armed; t++) {
      await auto(P, true);
      if (!(await has(iva, '#sfbox .sf-sheet')) && await has(iva, '#sfbox .sf-key')) await click(iva, '#sfbox .sf-key');
      if (await click(iva, '#sfbox [data-sfbt="1"]')) { await iva.waitForTimeout(250); await click(iva, '#sfbox [data-bt="1"]'); }
      armed = await has(iva, '#sfbox .sf-bt.on');
      await iva.waitForTimeout(100);
    }
    ok(armed && /Izdaja pripremljena/.test(await iva.textContent('#sfbox')), iva.__n + ': „Izdaja pripremljena” (u mirnoj fazi, bez posebne faze)');
    ok(!/Izdaja pripremljena/.test((await ana.textContent('#app')) + (await ana.textContent('#sfbox').catch(() => ''))), 'Ana ne vidi izdaju');
    await iva.screenshot({ path: OUT + '/i3-izdaja-iva.png' });
    const screens = TV ? [host, ...P] : P;
    let seen = false;
    for (let t = 0; t < 300 && !seen; t++) { await auto(P); seen = await has(P[0], '#app .bt'); if (!seen) await P[0].waitForTimeout(150); }
    const all = await Promise.all(screens.map((p) => p.waitForSelector('#app .bt', { timeout: 15000 }).then(() => true, () => false)));
    ok(all.every(Boolean), 'izdaja nakon pitanja na svim ekranima' + (TV ? ' i TV-u' : ''));
    await Promise.all(screens.map((p) => p.screenshot({ path: OUT + '/i4-izdaja-' + p.__n + '.png' })));
    if (!RELAY) { const rec = await mateo.evaluate(() => (window.__recv || []).join('\n')).catch(() => ''); ok(rec.length > 0 && !/"k":\{"m"/.test(rec) && !/"wh":/.test(rec) && !/"bt":1/.test(rec), 'mreža (cijela partija): ' + mateo.__n + ' nikad nije primio tuđi savez, šapat ni izdaju'); }
  }
  ok(errors.length === 0, 'bez JS grešaka ' + errors.join(' | '));
  await b.close(); server.close(); await broker.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

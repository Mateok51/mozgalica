'use strict';
// Krčmar 2.0 u pregledniku: ploča bodova s „Nastavi”. Pokretanje (port 8766): node web/kr-web-test.js
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site'), OUT = path.join(__dirname, 'shots-kr'); fs.mkdirSync(OUT, { recursive: true });
const src = fs.readFileSync(path.join(__dirname, 'multi-test.js'), 'utf8');
let MOCK = src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));
MOCK = MOCK.replace("else if (m.k === 'data') { const c = this.conns[m.cid]; if (c && c.open) c._emit('data', m.d); }", "else if (m.k === 'data') { const c = this.conns[m.cid]; if (c && c.open) { (window.__recv = window.__recv || []).push(JSON.stringify(m.d)); if (window.__recv.length > 800) window.__recv.shift(); c._emit('data', m.d); } }");
MOCK = "window.__MQTT_URLS = ['ws://localhost:8767/mqtt'];\n" + MOCK;
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html')); if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); } if (p.endsWith('index.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(p, 'utf8').replace("connect-src 'self'", "connect-src 'self' ws://localhost:8767")); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const CH = process.env.CH === '1', OKL = process.env.OKL === '1', SOLO = process.env.SOLO === '1';
const CFGX = { kr: OKL ? { wait: 45, pactOffers: 0, pactFrom: 99, pactChance: 0, pactMin: 3, offFrom: 99, offChance: 0, offMax: 0, chFrom: 99, chGap: 99999, chWait: 12, chStakeA: 150, chStakeB: 300, chGuard: 150, rope: 12, ropeWin: 7, ropeN: 40 } : CH ? { wait: 45, pactOffers: 0, pactFrom: 99, pactChance: 0, pactMin: 3, offFrom: 99, offChance: 0, offMax: 0, chFrom: 1, chGap: 0, chWait: 12, chStakeA: 150, chStakeB: 300, chGuard: 150, rope: 12, ropeWin: 7, ropeN: 40 } : { wait: 45, pactOffers: 2, pactFrom: 1, pactChance: 1, pactMin: 3 }, duelIntro: 2, qv: { who: 0, emoji: 0 }, chal: ['sort', 'link'], betEvents: [0, 0], intro: 0.4, vote: 3, voteShow: 0.5, roul: 0.3, power: 3, q: 8, reveal: 2, howto: 0.5, howtoMax: 0.5, howtoShort: 0.3, sort: 3, link: 3, chReveal: 0.5 };
(async () => {
  const broker = require('./mini-broker').start(8767);
  await new Promise((r) => server.listen(8766, r)); const URL = 'http://localhost:8766/';
  const b = await chromium.launch(); const VW = +process.env.W || 360, VH = +process.env.H || 740;
  const ctx = await b.newContext({ viewport: { width: VW, height: VH }, hasTouch: true });
  const fits = async (p, what) => { const r = await p.evaluate(() => [document.documentElement.scrollWidth, innerWidth, [...document.querySelectorAll('#app button')].filter((b) => { const q = b.getBoundingClientRect(); return q.width && !b.closest('.scene-ghost') && (q.right > innerWidth + 1 || q.left < -1); }).map((b) => b.className + ':' + b.textContent.trim().slice(0, 20) + '@' + Math.round(b.getBoundingClientRect().left) + '-' + Math.round(b.getBoundingClientRect().right))]); ok(r[0] <= r[1] + 1 && r[2].length === 0, what + ': stane u ' + r[1] + ' px (scrollWidth ' + r[0] + ', gumbi izvan: ' + (r[2].join(', ') || 0) + ')'); };
  await ctx.addInitScript(MOCK); await ctx.route(/unpkg\.com|jsdelivr|fonts\./, (r) => r.abort());
  const errors = [];
  const mk = async (name, seed) => { const p = await ctx.newPage(); p.on('pageerror', (e) => errors.push(name + ': ' + e.message)); await p.addInitScript((sd) => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (k) => k === 'mz_pid' ? sd : (k === 'mz_name' ? null : real(k)); }, seed); p.__n = name; return p; };
  const ph = (p) => p.evaluate(() => document.documentElement.dataset.ph).catch(() => '');
  const has = (p, s) => p.$(s).then((e) => !!e).catch(() => false);
  const click = (p, s) => p.evaluate((x) => { const e = document.querySelector(x); if (e) e.click(); return !!e; }, s).catch(() => false);
  const host = await mk('Mateo', 'pid-mateo'); await host.goto(URL);
  await host.evaluate((c) => Object.assign(CFG, c), CFGX);
  await host.click('#hostp'); await host.fill('#hname', 'Mateo'); await host.click('#hform button[type=submit]');
  await host.waitForSelector('.lob-code'); const code = (await host.textContent('.lob-code')).trim();
  if (SOLO) {
    // solo: domaćin + 3 bota u testnom načinu; skriveni izbornik otključan (#dev)
    await host.evaluate(() => sessionStorage.setItem('mz_dev', '1'));
    for (let i = 0; i < 3; i++) await click(host, '[data-bots="1"]');
    await host.waitForTimeout(300); await click(host, '[data-bsopt="1"]'); await host.waitForSelector('[data-bsopt="0"]', { timeout: 3000 });
    await click(host, '#dstart');
    const me = host, step = async () => { await me.evaluate(() => { const A = document.getElementById('app'); const x = A && A.querySelector('[data-v]:not([disabled]), #nopw, [data-c]:not([disabled]), #krok'); if (x) x.click(); }).catch(() => {}); await me.waitForTimeout(150); };
    const board = async () => { for (let t = 0; t < 600; t++) { if ((await ph(me)) === 'reveal' && await has(me, '#app .kr-box')) return true; await step(); } return false; };
    ok(await board(), 'prva ploča bodova');
    await click(me, '#app [data-sfscnopen]'); await me.waitForTimeout(200);
    ok(await has(me, '#app [data-scn="krpact"]'), 'skriveni izbornik na ploči: testni scenariji');
    await me.screenshot({ path: OUT + '/s1-scenariji.png' });
    await click(me, '#app [data-scn="krpact"]'); await me.waitForTimeout(300);
    let card = false;
    for (let t = 0; t < 600 && !card; t++) { card = await has(me, '#app .kr-card'); if (!card) await step(); }
    ok(card && /pakt s/.test(await me.textContent('#app .kr-card')), 'krčmar mi nudi pakt s botom: ' + (card ? (await me.textContent('#app .kr-card .pk-inv-h')).trim() : '-'));
    let ally = false;
    for (let t = 0; t < 20 && !ally; t++) { await click(me, '#app [data-krp="1"]'); ally = await me.waitForSelector('#app .kr-ally', { timeout: 500 }).then(() => true, () => false); }
    if (!ally) console.log('     dbg', await me.evaluate(() => (document.querySelector('#app .kr-box') || {}).innerHTML || 'nema').catch((e) => String(e)));
    ok(ally, 'bot je prihvatio — vidim savez i riznicu na ploči');
    await me.screenshot({ path: OUT + '/s2-savez-bot.png' });
    await click(me, '#app [data-sfscnopen]'); await me.waitForTimeout(150); await click(me, '#app [data-scn="betray"]'); await me.waitForTimeout(200);
    let bt = false;
    for (let t = 0; t < 1500 && !bt; t++) { bt = await has(me, '#app .bt'); if (!bt) await step(); }
    ok(bt, 'bot me izdao (postojeća animacija izdaje)');
    if (bt) { await me.waitForTimeout(2500); await me.screenshot({ path: OUT + '/s3-izdaja-bota.png' }); }
    ok(errors.length === 0, 'bez JS grešaka ' + errors.join(' | '));
    await b.close(); server.close(); await broker.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
  }
  const ana = await mk('Ana', 'pid-ana'); await ana.goto(URL + '#' + code); await ana.fill('#name', 'Ana'); await ana.click('button[type=submit]');
  await ana.waitForSelector('[data-av]', { timeout: 20000 }); await ana.evaluate(() => { const x = document.querySelector('#app [data-av]:not([disabled])'); if (x) x.click(); });
  const iva = await mk('Iva', 'pid-iva'); await iva.goto(URL + '#' + code); await iva.fill('#name', 'Iva'); await iva.click('button[type=submit]');
  await iva.waitForSelector('[data-av]', { timeout: 20000 }); await iva.evaluate(() => { const x = document.querySelector('#app [data-av]:not([disabled])'); if (x) x.click(); });
  await host.waitForTimeout(600);
  ok(!(await has(host, '[data-rcopt]')) && !(await has(host, '[data-tkopt]')), 'predvorje: nema opcija rivalskog obračuna ni krčmarovih oklada');
  await click(host, '#dstart');
  const P = [host, ana, iva];
  const auto = () => Promise.all(P.map((p) => p.evaluate(() => { const A = document.getElementById('app'); if (!A) return; const x = A.querySelector('[data-v]:not([disabled]), #nopw, [data-c]:not([disabled])'); if (x) x.click(); }).catch(() => {})));
  if (OKL) {
    let who = null;
    for (let t = 0; t < 1500 && !who; t++) {
      for (const p of P) if (await has(p, '#app [data-p="oklada"]')) { who = p; break; }
      if (who) break;
      await Promise.all(P.map((p) => p.evaluate(() => { const A = document.getElementById('app'); const x = A && A.querySelector('[data-v]:not([disabled]), #nopw, [data-c]:not([disabled]), #krok'); if (x) x.click(); }).catch(() => {})));
      await host.waitForTimeout(150);
    }
    ok(!!who, 'Oklada se pojavila među ponuđenim moćima');
    await who.screenshot({ path: OUT + '/o1-moci.png' });
    await click(who, '#app [data-p="oklada"]'); await who.waitForTimeout(400);
    ok(/Na koga se kladiš/.test(await who.textContent('#app')), 'odabir mete: „Na koga se kladiš?”');
    await who.screenshot({ path: OUT + '/o2-meta.png' });
    await click(who, '#app [data-t]');
    const tag = await who.waitForSelector('#app .tag', { timeout: 15000 }).then(() => who.textContent('#app .buffs'), () => '');
    ok(/Oklada/.test(tag), 'tijekom pitanja privatna oznaka: ' + tag.trim());
    const others = P.filter((p) => p !== who);
    ok(!(await Promise.all(others.map((p) => p.textContent('#app')))).some((t) => /Oklada:/.test(t)), 'ostali ne vide metu');
    ok(errors.length === 0, 'bez JS grešaka ' + errors.join(' | '));
    await b.close(); server.close(); await broker.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
  }
  let t0 = Date.now(); while (Date.now() - t0 < 90000 && (await ph(host)) !== 'reveal') { await auto(); await host.waitForTimeout(150); }
  ok((await ph(host)) === 'reveal', 'prvo otkrivanje');
  const btn = await host.waitForSelector('#app #krok, #app .kr-card', { timeout: 12000 }).then(() => true, () => false);
  ok(btn, 'nakon pribrajanja bodova pojavi se „Nastavi” (ili krčmarova ponuda)');
  await host.waitForFunction(() => { const b = document.querySelector('#app #krok'); const r = b && b.closest('.rv-b'); return r && +getComputedStyle(r).opacity > 0.95; }, null, { timeout: 15000 }).catch(() => {});
  await host.waitForTimeout(800);
  ok((await ph(host)) === 'reveal', 'ploča čeka (animacija je gotova, nitko nije potvrdio)');
  ok(!(await has(host, '#sfbox .sf-key')), 'nema tipke Tajni kutak');
  await host.screenshot({ path: OUT + '/1-ploca-nastavi.png' });
  if (CH) {
    await host.waitForTimeout(800);
    const chs = await Promise.all(P.map((p) => has(p, '#app [data-krc]')));
    ok(chs.filter(Boolean).length === 1, 'izazov vođi: samo zadnji ima gumbe (' + P.filter((_, i) => chs[i]).map((p) => p.__n).join(', ') + ')');
    const chal = P.find((_, i) => chs[i]);
    const others = P.filter((p) => p !== chal);
    ok((await Promise.all(others.map((p) => p.textContent('#app .kr-ch')))).every((t) => /odlučuje/.test(t)), 'ostali vide „… odlučuje…”');
    await chal.screenshot({ path: OUT + '/c1-izazov.png' }); await fits(chal, 'izazov vođi'); await others[0].screenshot({ path: OUT + '/c1-ostali.png' });
    await click(chal, '#app [data-krc="1"]'); await chal.waitForTimeout(400);
    for (const p of P) await click(p, '#app #krok');
    const rp = await chal.waitForFunction(() => document.documentElement.dataset.ph === 'rope', null, { timeout: 15000 }).then(() => true, () => false);
    ok(rp, 'kreće nadvlačenje konopa');
    await chal.waitForSelector('#app [data-rpv]', { timeout: 6000 }).catch(() => {}); await click(chal, '#app [data-rpv="1"]');
    await others[0].waitForFunction(() => { const k = document.querySelector('#app .rope-k'); return k && !/^-?0(\.0)?%$/.test(getComputedStyle(k).getPropertyValue('--x').trim()); }, null, { timeout: 4000 }).catch(() => {});
    const x = await others[0].evaluate(() => { const k = document.querySelector('#app .rope-k'); return k ? getComputedStyle(k).getPropertyValue('--x').trim() : 'nema'; });
    ok(x !== 'nema' && x !== '0.0%' && x !== '-0.0%', 'gledatelj vidi kako se konop pomiče (--x ' + x + ')');
    await chal.screenshot({ path: OUT + '/c2-konop-igrac.png' }); await fits(chal, 'konop (igrač)'); await fits(others[0], 'konop (gledatelj)'); await others[0].screenshot({ path: OUT + '/c2-konop-gledatelj.png' });
    const res = await chal.waitForSelector('#app .du-res', { timeout: 20000 }).then(() => chal.textContent('#app .du-res'), () => '');
    ok(/ruši vođu|brani krunu|Neriješeno/.test(res), 'rezultat: ' + res.trim());
    await chal.screenshot({ path: OUT + '/c3-rezultat.png' });
    ok(errors.length === 0, 'bez JS grešaka ' + errors.join(' | '));
    await b.close(); server.close(); await broker.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
  }
  // krčmar nudi pakt dvojici (ovdje od 1. pitanja, za test): kartica umjesto Nastavi, treći ne vidi ništa
  const cards = await Promise.all(P.map((p) => has(p, '#app .kr-card')));
  ok(cards.filter(Boolean).length === 2, 'ponudu pakta vide točno dvojica (' + P.filter((_, i) => cards[i]).map((p) => p.__n).join(', ') + ')');
  const pair = P.filter((_, i) => cards[i]), third = P.find((_, i) => !cards[i]);
  ok(pair.every(Boolean) && !(await has(pair[0], '#app #krok')), 'izabrani nemaju Nastavi dok ne odluče');
  ok(await has(third, '#app #krok') && !(await has(third, '#app .kr-card')), third.__n + ' vidi samo Nastavi');
  await pair[0].screenshot({ path: OUT + '/2-ponuda-pakta.png' }); await fits(pair[0], 'kartica pakta');
  if (third !== ana || true) { const rec = await third.evaluate(() => (window.__recv || []).join('\n')).catch(() => ''); ok(rec.length > 0 && !/"kp":\{/.test(rec), 'mreža: ' + third.__n + ' nikad ne prima tuđu ponudu'); }
  await click(third, '#app #krok'); await third.waitForTimeout(300);
  ok(/Čekamo ostale/.test(await third.textContent('#app')) && (await ph(third)) === 'reveal', third.__n + ' potvrdio: „Čekamo ostale”, igra čeka');
  { const t = await pair[0].evaluate(() => { const e = document.querySelector('#app .kr-cnt'); return e ? e.textContent : ''; }); ok(t === '' || /^1\//.test(t), 'broj spremnih se osvježio kod drugih: ' + (t || '(nema brojača dok odlučuje)')); }
  for (const p of pair) await click(p, '#app [data-krp="1"]');
  const both = await Promise.all(pair.map((p) => p.waitForSelector('#app .kr-ally', { timeout: 6000 }).then(() => true, () => false)));
  ok(both.every(Boolean), 'oboje prihvatili → oboje vide savez (🍻 + 💰) na ploči');
  await pair[0].screenshot({ path: OUT + '/3-savez.png' });
  await click(pair[0], '#app #krok');
  await pair[1].waitForTimeout(600);
  { const t = await pair[1].evaluate(() => { const e = document.querySelector('#app .kr-cnt'); return e ? e.textContent : '?'; }); ok(t === '2/3', 'broj spremnih uživo kod ' + pair[1].__n + ': ' + t); }
  const ta = Date.now(); await click(pair[1], '#app #krok');
  await host.waitForFunction(() => document.documentElement.dataset.ph !== 'reveal', null, { timeout: 4000 }).catch(() => {});
  ok((await ph(host)) !== 'reveal' && Date.now() - ta < 2500, 'svi potvrdili → igra odmah nastavlja (' + (Date.now() - ta) + ' ms)');
  ok(errors.length === 0, 'bez JS grešaka ' + errors.join(' | '));
  await b.close(); server.close(); await broker.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

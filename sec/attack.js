'use strict';
// Napadač glumi domaćina preko javnog releja i šalje žrtvi lažna stanja s HTML/JS kodom u svakom tekstu.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const WS = require('/opt/npm-tools/node_modules/ws');
const ROOT = path.join(__dirname, '..'), SITE = path.join(ROOT, 'web', 'site');
const src = fs.readFileSync(path.join(ROOT, 'web', 'multi-test.js'), 'utf8');
let MOCK = src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));
MOCK = MOCK.replace("if (m.k === 'conn') {", "if (m.k === 'conn') { return;").replace("setTimeout(() => { if (!c.open && !this.destroyed) this._emit('error', { type: 'peer-unavailable' }); }, 1500);", "");
MOCK = "window.__MQTT_URLS = ['ws://localhost:8767/mqtt'];\n" + MOCK;
const server = http.createServer((req, res) => { /* CSPFIX: testni MQTT na localhostu */ const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html')); if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); } if (p.endsWith('index.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(p, 'utf8').replace("connect-src 'self'", "connect-src 'self' ws://localhost:8767")); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
// minimalni MQTT klijent za napadača
function mqtt(url, onMsg) {
  const ws = new WS(url, ['mqtt']); let buf = Buffer.alloc(0);
  const str = (s) => { const b = Buffer.from(s); return Buffer.concat([Buffer.from([b.length >> 8, b.length & 255]), b]); };
  const len = (n) => { const o = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; o.push(d); } while (n > 0); return Buffer.from(o); };
  const pkt = (h, body) => Buffer.concat([Buffer.from([h]), len(body.length), body]);
  const ready = new Promise((r) => ws.on('open', () => { ws.send(pkt(0x10, Buffer.concat([str('MQTT'), Buffer.from([4, 2, 0, 60]), str('att' + Date.now())]))); setTimeout(r, 100); }));
  ws.on('message', (d) => { buf = Buffer.concat([buf, d]); for (;;) { if (buf.length < 2) return; let mul = 1, n = 0, i = 1, b; do { b = buf[i++]; n += (b & 127) * mul; mul *= 128; } while (b & 128); if (buf.length < i + n) return; const t = buf[0] >> 4, body = buf.subarray(i, i + n); buf = buf.subarray(i + n); if (t === 3) { const tl = body.readUInt16BE(0); onMsg(body.toString('utf8', 2, 2 + tl), body.toString('utf8', 2 + tl)); } } });
  return { ready, sub: (t) => ws.send(pkt(0x82, Buffer.concat([Buffer.from([0, 1]), str(t), Buffer.from([0])]))), pub: (t, o) => ws.send(pkt(0x30, Buffer.concat([str(t), Buffer.from(typeof o === 'string' ? o : JSON.stringify(o))]))), close: () => ws.close() };
}
const PAY = [
  '"><img src=x onerror="window.__x=(window.__x||0)+1">',
  "'><svg onload=window.__x=(window.__x||0)+1>",
  '<script>window.__x=(window.__x||0)+1</script>',
  '</style><img src=x onerror=window.__x=(window.__x||0)+1>',
  'javascript:window.__x=1',
];
const KEEP = new Set(['ph', 'code', 'id', 'k', 'p', 'pose', 'snd', 'f', 't', 'm', 'v', 'from', 'to', 'pid', 'e', 'b', 'w', 'du', 'cand', 'a']);
const P2 = (pay, path) => pay.replace(/window\.__x=\(window\.__x\|\|0\)\+1/, "(window.__h=window.__h||[]).push('" + path + "')");
function mutate(o, pay, mutIds, victim, path) {
  path = path || '';
  if (typeof o === 'string') return P2(pay, path);
  if (Array.isArray(o)) return o.map((x, i) => mutate(x, pay, mutIds, victim, path + '[]'));
  if (o && typeof o === 'object') { const r = {}; for (const k in o) {
    const v = o[k], pp = path + '.' + k;
    if (typeof v === 'string' && KEEP.has(k)) r[k] = mutIds && v !== victim && v !== 'ABCD' && k !== 'ph' && k !== 'p' && k !== 'k' && k !== 'pose' && k !== 'snd' ? P2(pay, pp) : v;
    else if (Array.isArray(v) && (k === 'a' || k === 'cand' || k === 'pose') && v.every((x) => typeof x === 'string')) r[k] = mutIds ? v.map((x) => (x === victim ? x : P2(pay, pp + '[]'))) : v;
    else r[k] = mutate(v, pay, mutIds, victim, pp);
  } return r; }
  return o;
}
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const broker = require(path.join(ROOT, 'web', 'mini-broker')).start(8767);
  await new Promise((r) => server.listen(8766, r));
  const views = JSON.parse(fs.readFileSync(path.join(__dirname, 'views.json')));
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 800 } });
  await ctx.addInitScript(MOCK); await ctx.route(/unpkg\.com|jsdelivr|fonts\./, (r) => r.abort());
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message)); pg.on('dialog', (d) => { errs.push('DIALOG ' + d.message()); d.dismiss(); });
  await pg.addInitScript(() => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (k) => k === 'mz_pid' ? 'pid-v' : (k === 'mz_name' ? null : real(k)); });
  let hello = null;
  const att = mqtt('ws://localhost:8767/mqtt', (topic, body) => { if (/\/h$/.test(topic)) { try { const m = JSON.parse(body); if (m.t === 'hello') hello = m; } catch (e) {} } });
  await att.ready; att.sub('mozgalica-kip/v1/abcd/h');
  await pg.goto('http://localhost:8766/#ABCD'); await pg.fill('#name', 'Vik'); await pg.click('button[type=submit]');
  for (let t = 0; t < 100 && !hello; t++) await pg.waitForTimeout(100);
  ok(!!hello, 'žrtva se spojila na lažnog domaćina preko releja');
  const hits = {}; let n = 0, crashes = 0;
  for (const mutIds of [false, true]) for (const pay of PAY) for (const it of views) {
    const v = mutate(it.v, pay, mutIds, 'pid-v', it.v.ph); v.code = 'ABCD'; v.s = 100000 + (n++);
    const pv = it.pv ? mutate(it.pv, pay, mutIds, 'pid-v', 'pv') : null;
    att.pub('mozgalica-kip/v1/abcd/all', v);
    if (pv) att.pub('mozgalica-kip/v1/abcd/p/pid-v/' + (hello.sk || '').slice(0, 16), { t: 'pv', code: 'ABCD', s: v.s, pv });
    if (n % 25 === 0) await pg.waitForTimeout(60); else await pg.waitForTimeout(12);
    const hs = await pg.evaluate(() => { const h = window.__h || []; window.__h = []; return h; }).catch(() => []);
    for (const h of hs) hits[h] = (hits[h] || 0) + 1;
    if (await pg.$('#app .err')) { crashes++; }
  }
  // Legende ove krčme: lažno završno stanje s kodom u svakom tekstu legendi, pa otvaranje pregleda
  const finals = JSON.parse(fs.readFileSync(path.join(__dirname, 'views-sort,link.json'))).filter((x) => x.v.ph === 'final' && x.v.lg);
  let lgOpened = 0;
  for (const mutIds of [false, true]) for (const pay of PAY) for (const it of finals) {
    const v = mutate(it.v, pay, mutIds, 'pid-v', 'final'); v.code = 'ABCD'; v.s = 100000 + (n++);
    att.pub('mozgalica-kip/v1/abcd/all', v);
    await pg.waitForTimeout(80);
    if (await pg.$('#legOpen')) { await pg.click('#legOpen').catch(() => {}); await pg.waitForTimeout(120); if (await pg.$('.lg-wrap')) lgOpened++; await pg.click('#legClose').catch(() => {}); }
    const hs = await pg.evaluate(() => { const h = window.__h || []; window.__h = []; return h; }).catch(() => []);
    for (const h of hs) hits[h] = (hits[h] || 0) + 1;
  }
  ok(finals.length > 0 && lgOpened > 0, 'legende otvorene na lažnim podacima (' + lgOpened + ' puta)');
  await pg.waitForTimeout(400);
  console.log('  poslano lažnih stanja:', n);
  ok(Object.keys(hits).length === 0, 'nijedan ubačeni kod se nije izvršio' + (Object.keys(hits).length ? ': ' + JSON.stringify(hits, null, 1) : ''));
  ok(!errs.some((e) => /DIALOG/.test(e)), 'nema iskočnih prozora');
  console.log('  JS iznimke na lažnim podacima:', errs.length, [...new Set(errs.map((e) => e.slice(0, 80)))].slice(0, 6));
  console.log('  ekrana s greškom (rušenje prikaza):', crashes);
  await b.close(); server.close(); await broker.close(); att.close();
  console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

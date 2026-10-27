'use strict';
// Domaćin na mobitelu: veza s posrednikom padne (npr. mobitel u pozadini dok šalje poziv) i vrati se.
const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = process.env.SITE || path.join(__dirname, 'site');
const src = fs.readFileSync(path.join(__dirname, 'multi-test.js'), 'utf8');
let MOCK = src.slice(src.indexOf('const MOCK = `') + 14, src.indexOf('`;', src.indexOf('const MOCK = `')));
// realističniji lažni Peer: reconnect ponovno javi 'open'; dok je "odspojen" s posrednikom, ne prima nove veze
MOCK = MOCK.replace("this.ch.onmessage = (ev) => this._msg(ev.data);", "this.ch.onmessage = (ev) => this._msg(ev.data); (window.__peers = window.__peers || []).push(this);")
  .replace("if (m.k === 'conn') {", "if (m.k === 'conn') { if (this.disconnected) return;")
  .replace("reconnect() {}", "reconnect() { if (this.destroyed || !this.disconnected || window.__noNet) return; setTimeout(() => { if (window.__noNet) return; this.disconnected = false; this._emit('open', this.id); }, 150); }");
const server = http.createServer((req, res) => { /* CSPFIX: testni MQTT na localhostu */ const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0].split('#')[0]).replace(/\/$/, '/index.html')); if (!p.startsWith(SITE) || !fs.existsSync(p)) { res.writeHead(404); return res.end(); } if (p.endsWith('index.html')) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(p, 'utf8').replace("connect-src 'self'", "connect-src 'self' ws://localhost:8767")); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  await new Promise((r) => server.listen(8766, r)); const URL = 'http://localhost:8766/';
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(MOCK); await ctx.route(/unpkg\.com|jsdelivr|fonts\./, (r) => r.abort());
  const mk = async (seed) => { const p = await ctx.newPage(); await p.addInitScript((sd) => { const real = localStorage.getItem.bind(localStorage); localStorage.getItem = (k) => k === 'mz_pid' ? sd : (k === 'mz_name' ? null : real(k)); }, seed); return p; };
  const join = async (name, seed, code) => { const p = await mk(seed); await p.goto(URL + '#' + code); await p.fill('#name', name); await p.click('button[type=submit]'); return p; };
  const rows = (p) => p.$$eval('#app .lob-row .nm', (e) => e.map((x) => x.textContent.replace('♛', '').replace('Ti', '').trim()));
  const host = await mk('pid-host'); await host.goto(URL);
  await host.click('#hostp'); await host.fill('#hname', 'Mateo'); await host.click('#hform button[type=submit]');
  await host.waitForSelector('.lob-code'); const code = (await host.textContent('.lob-code')).trim();
  const ana = await join('Ana', 'pid-ana', code); await ana.waitForSelector('[data-av]', { timeout: 8000 });
  ok((await rows(host)).includes('Ana'), 'Ana ušla');

  console.log('1) Domaćinova veza s posrednikom padne i vrati se');
  await host.evaluate(() => { const p = window.__peers.find((x) => !x.destroyed && /^mozgalica/.test(x.id)); p.disconnected = true; p._emit('disconnected'); });
  await host.waitForTimeout(1500);
  ok(await host.evaluate(() => window.__peers.some((x) => !x.destroyed && /^mozgalica/.test(x.id))), 'soba domaćina nije uništena nakon ponovnog spajanja');
  ok((await rows(host)).includes('Ana'), 'Ana je i dalje u sobi');
  const iva = await join('Iva', 'pid-iva', code);
  const ivaOk = await iva.waitForSelector('[data-av]', { timeout: 10000 }).then(() => true, () => false);
  ok(ivaOk && (await rows(host)).includes('Iva'), 'nova igračica se može spojiti nakon prekida');

  console.log('2) Igrač se spaja dok je domaćin privremeno nedostupan');
  await host.evaluate(() => { window.__noNet = true; const p = window.__peers.find((x) => !x.destroyed && /^mozgalica/.test(x.id)); p.disconnected = true; p._emit('disconnected'); setTimeout(() => { window.__noNet = false; p.reconnect(); }, 3500); });
  const luka = await join('Luka', 'pid-luka', code);
  const lukaOk = await luka.waitForSelector('[data-av]', { timeout: 20000 }).then(() => true, () => false);
  ok(lukaOk, 'igrač se spojio čim se domaćin vratio (bez poruke "soba nije pronađena")');
  ok((await rows(host)).includes('Luka'), 'Luka je u sobi');
  await b.close(); server.close(); console.log(fails ? 'NEUSPJEH ' + fails : 'SVE OK'); process.exit(fails ? 1 : 0);
})();

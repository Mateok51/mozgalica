const { chromium } = require('playwright'); const http = require('http'), fs = require('fs'), path = require('path');
const SITE = path.join(__dirname, 'site');
const server = http.createServer((req, res) => { const p = path.join(SITE, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html')); if (!fs.existsSync(p)) { res.writeHead(404); return res.end(); } res.writeHead(200, { 'content-type': { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' }[path.extname(p)] || 'text/plain' }); fs.createReadStream(p).pipe(res); });
(async () => { await new Promise((r) => server.listen(8766, r)); const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const pg = await b.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message)); await pg.route(/unpkg|jsdelivr|fonts\./, (r) => r.abort());
  const reqs = []; pg.on('request', (r) => { if (/audio\//.test(r.url())) reqs.push(r.url().split('/').pop()); });
  await pg.goto('http://localhost:8766/');
  const dec = await pg.evaluate(async () => {
    const names = ['beep','boom','confirm','correct','crack','fanfare','freeze','music','pop','score','splat','squish','step','stingDuel','stingRise','stingSmall','stingTension','stingUp','tap','tick','timeup','whoosh','wrong','zap'];
    const out = [];
    for (const n of names) { try { const ab = await (await fetch('audio/' + n + '.mp3')).arrayBuffer(); const c = new OfflineAudioContext(1, 44100, 44100); const bf = await c.decodeAudioData(ab); out.push(n + ':' + bf.duration.toFixed(2)); } catch (e) { out.push(n + ':GREŠKA'); } }
    return out.join(' ');
  });
  console.log(dec);
  await pg.mouse.click(10, 10); await pg.click('#demo'); await pg.waitForSelector('#dstart'); await pg.waitForTimeout(1500);
  console.log('učitano nakon dodira:', reqs.length, 'datoteka', reqs.includes('music.mp3') ? '(i glazba)' : '(bez glazbe)'); console.log('greške', errs);
  await b.close(); server.close(); })();

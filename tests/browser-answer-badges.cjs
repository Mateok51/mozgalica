// Svi igrači mogu odgovoriti, a kvačica ne smije prekriti lik ni promijeniti raspored.
const { chromium } = require('playwright');
const fs = require('fs'), vm = require('vm'), crypto = require('crypto'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const box = vm.createContext({ setTimeout, clearTimeout });
vm.runInContext(fs.readFileSync(path.join(root, 'engine.js'), 'utf8') + '\nthis.game=createGame({code:"TEST"});', box);
for (let i = 0; i < 6; i++) box.game.addPlayer('p' + i, 'Igrač ' + i, i === 0 ? 7 : i, false);
Object.assign(box.game._G, { ph: 'question', s: 2, q: { c: 'Kategorija', t: 'Primjer pitanja?', o: ['Prvi', 'Drugi', 'Treći', 'Četvrti'], a: 1 }, dur: 20000, endsAt: Date.now() + 20000, ev: [] });
html = html.replace('  setInterval(tick, 100);', '  setInterval(tick, 100); window.testUI=d=>{mode="player";applyState(d);};');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x => x[1]).filter(x => x.trim());
const hashes = html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g);
hashes.forEach((h, i) => html = html.replace(h, 'sha256-' + crypto.createHash('sha256').update(scripts[i]).digest('base64')));
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const [width, height] of [[320, 568], [360, 740], [390, 844]]) for (const reducedMotion of ['reduce', 'no-preference']) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion });
      await page.addInitScript(() => localStorage.setItem('mz_pid', 'p0'));
      await page.route('**/*', r => {
        const u = new URL(r.request().url()); if (u.hostname !== 'game.test') return r.abort();
        const f = path.join(root, u.pathname.slice(1));
        return u.pathname === '/' ? r.fulfill({ body: html, contentType: 'text/html' }) : fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ body: fs.readFileSync(f) }) : r.abort();
      });
      await page.goto('http://game.test/');
      const state = JSON.parse(JSON.stringify(box.game.view())); state.P.forEach(p => { p.ok = 0; });
      // Igra ulazi u pitanje iz prethodne faze, a odgovor odabire stvarnim klikom.
      const power = structuredClone(state); power.ph = 'power'; power.s = state.s - 1;
      await page.evaluate(d => testUI(d), power); await page.waitForTimeout(200);
      await page.evaluate(d => testUI(d), state);
      await page.locator('.bar-row .bw').first().waitFor();
      await page.waitForTimeout(350);
      const measure = () => {
        const rect = e => { const r = e.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height, x: r.x, y: r.y }; };
        const app = document.querySelector('#app'), q = document.querySelector('.p-q');
        const opts = [...document.querySelectorAll('.p-opts .p-opt')];
        return { zoom: parseFloat(app.style.zoom), question: rect(q), options: opts.map(e => ({ box: rect(e), text: rect(e.querySelector('.otxt')) })),
          players: [...document.querySelectorAll('.bar-row .bw')].map(e => ({ box: rect(e), avatar: rect(e.querySelector('.av')), badge: e.querySelector('.ok') ? rect(e.querySelector('.ok')) : null })),
          overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight };
      };
      const before = await page.evaluate(measure);
      await page.locator('[data-c="0"]').click();
      state.P.forEach(p => { p.ok = 1; });
      await page.evaluate(d => testUI(d), state); await page.waitForTimeout(900);
      const result = await page.evaluate(measure);
      if (result.players.length !== 6 || before.players.length !== 6 || result.overflow || before.overflow) throw Error(width + ': player count or screen overflow');
      if (result.options.length !== 4 || before.options.length !== 4 || result.question.height < 40 || Math.abs(result.zoom - before.zoom) > 0.01 || Math.abs(result.question.height - before.question.height) > 2) throw Error(width + ': question became unreadable or changed scale');
      for (let i = 0; i < 4; i++) {
        const a = result.options[i], b = before.options[i];
        if (a.box.height < 32 || a.text.height < 10 || Math.abs(a.box.height - b.box.height) > 3 || a.text.top < a.box.top - 2 || a.text.bottom > a.box.bottom + 2 || a.text.left < a.box.left - 2 || a.text.right > a.box.right + 2) throw Error(width + ': answer text became unreadable or was clipped');
      }
      for (let i = 0; i < 6; i++) {
        const { avatar, badge, box } = result.players[i], previous = before.players[i].box;
        if (Math.abs(box.width - previous.width) > 1 || Math.abs(box.height - previous.height) > 1 || Math.abs(box.x - previous.x) > 1 || Math.abs(box.y - previous.y) > 1) throw Error(width + ': avatar moved or resized after answering');
        if (badge.top < avatar.bottom - 1 || badge.left < 0 || badge.right > width || badge.bottom > height) throw Error(width + ': answer badge overlaps or leaves screen');
        if (i && result.players[i - 1].badge.right > badge.left + 1) throw Error(width + ': adjacent answer badges overlap');
      }
      console.log(width + ' ' + reducedMotion + ': readable question, answers and six visible avatars'); await page.close();
    }
  } finally { await browser.close(); box.game.stop(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

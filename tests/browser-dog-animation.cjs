const { chromium } = require('playwright');
const fs = require('fs'), crypto = require('crypto'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
html = html.replace('  setInterval(tick, 100);', '  setInterval(tick, 100); window.dogTest={avatar:avSvg};');
const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(x => x[1]).filter(x => x.trim());
const hashes = html.split('</head>')[0].match(/sha256-[A-Za-z0-9+/=]+/g);
hashes.forEach((h, i) => html = html.replace(h, 'sha256-' + crypto.createHash('sha256').update(scripts[i]).digest('base64')));
const poses = ['idle', 'happy', 'sad', 'shocked', 'attack', 'victory'];
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion });
      await page.route('**/*', r => {
        const u = new URL(r.request().url());
        if (u.hostname !== 'game.test' || u.pathname.endsWith('/attack-anim.webp')) return r.abort();
        const f = path.join(root, u.pathname.slice(1));
        return u.pathname === '/' ? r.fulfill({ body: html, contentType: 'text/html' }) :
          fs.existsSync(f) && fs.statSync(f).isFile() ? r.fulfill({ body: fs.readFileSync(f) }) : r.abort();
      });
      await page.goto('http://game.test/');
      await page.evaluate(poses => {
        const fixture = document.createElement('div'); fixture.id = 'dog-fixture';
        fixture.innerHTML = poses.map(p => '<div id="dog-' + p + '" style="width:150px">' + dogTest.avatar(7, p) + '</div>').join('') +
          '<div class="mini" style="width:40px;height:40px">' + dogTest.avatar(7, 'idle') + '</div>' +
          '<div class="lob"><div class="av-pick"><div class="pick-img" style="width:80px;height:80px">' + dogTest.avatar(7, 'happy') + '</div></div></div>';
        document.body.append(fixture);
      }, poses);
      if (reducedMotion === 'no-preference') {
        await page.waitForFunction(() => ['idle', 'happy', 'sad', 'shocked', 'victory'].every(p => document.documentElement.classList.contains('dog-ready-' + p)));
      }
      for (const pose of poses) {
        const full = page.locator('#dog-' + pose + ' .dog-avatar');
        const still = full.locator('.dog-still'), anim = full.locator('.dog-anim');
        const box = await full.evaluate(e => ({ width: e.offsetWidth, height: e.offsetHeight }));
        if (Math.abs(box.width - 150) > 1 || Math.abs(box.width - box.height) > 1) throw Error(pose + ': avatar size changed');
        const active = reducedMotion === 'no-preference' && pose !== 'attack';
        if (await still.evaluate(e => getComputedStyle(e).visibility) !== (active ? 'hidden' : 'visible') ||
            await anim.evaluate(e => getComputedStyle(e).display) !== (active ? 'block' : 'none')) throw Error(pose + ': incorrect animated or fallback state');
        if (active) {
          const positions = await anim.evaluate(e => {
            const a = e.getAnimations().find(x => x.animationName === 'dogIdleFrames');
            const duration = a.effect.getTiming().duration; a.pause();
            return [0, .26, .51, .76].map(t => { a.currentTime = duration * t; return getComputedStyle(e).backgroundPosition; });
          });
          if (new Set(positions).size !== 4) throw Error(pose + ': not all four frames are displayed');
        }
      }
      for (const target of [page.locator('.mini .dog-avatar'), page.locator('.lob .pick-img .dog-avatar')]) {
        if (await target.locator('.dog-still').evaluate(e => getComputedStyle(e).visibility) !== 'visible' ||
            await target.locator('.dog-anim').evaluate(e => getComputedStyle(e).display) !== 'none') throw Error('Small avatar must remain static');
      }
      console.log(reducedMotion + ': six poses, fallback, geometry and reduced motion OK');
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });

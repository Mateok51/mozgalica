const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
// Test uses the real demo game, switching its rendering to host mode for invitation controls.
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8')
  .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/, '')
  .replace('  setInterval(tick, 100);', '  setInterval(tick, 100); window.reviewHost=()=>{mode="hostp";phoneRender(true)};');
(async () => {
  const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    for (const [width, height] of [[320,568], [360,640], [390,844]]) {
      const p = await browser.newPage({ viewport: { width, height } });
      await p.route('**/*', r => {
        const u = new URL(r.request().url());
        if (u.hostname !== 'game.test') return r.abort();
        const f = path.join(root, u.pathname === '/' ? 'index.html' : u.pathname.slice(1));
        return fs.existsSync(f) ? r.fulfill({ body: u.pathname === '/' ? html : fs.readFileSync(f), contentType: u.pathname === '/' ? 'text/html' : undefined }) : r.abort();
      });
      await p.goto('http://game.test/'); await p.locator('#demo').click(); await p.waitForTimeout(300);
      await p.evaluate(() => reviewHost());
      await p.locator('#lobInv').click(); await p.locator('#invModal').waitFor(); await p.locator('#invClose').click();
      const base = await p.locator('#dstart').boundingBox();
      await p.locator('#lobSettings').click(); await p.waitForTimeout(350); const botIcon=p.locator('.lob-bots .tavern-bot');if(!(await botIcon.count())||!(await botIcon.evaluate(e=>e.complete&&e.naturalWidth>0)))throw Error('Bot icon missing');
      for (let i = 0; i < 3; i++) { const add = p.locator('[data-bots="1"]'); if (await add.isDisabled()) break; await add.click(); await p.waitForTimeout(100); }
      for (const label of await p.locator('.len-label').all()) {
        if (await label.evaluate(e => e.scrollWidth > e.clientWidth + 1)) throw Error('Duration label clipped');
      }
      for (const k of ['brza','std','duga']) { await p.locator(`[data-len="${k}"]`).scrollIntoViewIfNeeded(); await p.locator(`[data-len="${k}"]`).click(); if (await p.locator(`[data-len="${k}"]`).getAttribute('aria-checked') !== 'true') throw Error('Duration selection failed'); }
      for (const state of ['settings', 'avatar']) {
        if (state === 'avatar') { await p.locator('#lobAvatar').click(); await p.waitForTimeout(350); }
        if (state === 'avatar') {
          const portraits = await p.locator('.lob .av-pick .pick-img').evaluateAll(es => es.map(e => ({ width: e.offsetWidth, height: e.offsetHeight })));
          if (!portraits.length || portraits.some(r => Math.abs(r.width - r.height) > 1)) throw Error(`Avatar portrait distorted at ${width}: ${JSON.stringify(portraits)}`);
        }
        const data = await p.evaluate(() => {
          const rect = e => e.getBoundingClientRect(); const app = document.querySelector('#app');
          const controls = ['#lobInv','#lobAvatar','#lobSettings','#dstart','#leave'].map(s => rect(document.querySelector(s)));
          return { zoom: +app.style.zoom, controls: controls.map(r => [r.top,r.bottom]), viewport: innerHeight, page: document.documentElement.scrollHeight, soundTop: rect(document.querySelector('#mute')).top };
        });
        const start = await p.locator('#dstart').boundingBox();
        if (Math.abs(start.height - base.height) > 1.5 || data.zoom < .995) throw Error(`Lobby controls resized: ${width} ${state} ${JSON.stringify(data)}`);
        if (data.page > height || data.controls.some(([t,b]) => t < 0 || b > data.soundTop + 1)) throw Error(`Lobby controls offscreen: ${width} ${state}`);
      }
      console.log(width, 'lobby controls and invitation OK'); await p.close();
    }
  } finally { await browser.close(); }
})();

// Browser-engine regression for same-document invitation navigation. Safari can
// retain an already open tab; this does not assert how the iPhone camera opens it.
const pw = require('playwright'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), assert = require('node:assert/strict');
const browserName = process.env.BROWSER || 'chromium', root = path.join(__dirname, '..');
const origin = 'http://127.0.0.1:8787', first = 'a'.repeat(22), second = 'b'.repeat(22);
const box = vm.createContext({ setTimeout, clearTimeout });
vm.runInContext(require('./engine-source.cjs') + ';this.make=createGame;', box);
const games = new Map(['ABCD', 'WXYZ'].map(code => [code, box.make({ code, noTv: true })]));
(async () => {
  const browser = await pw[browserName].launch(browserName === 'chromium' ? { executablePath: process.env.CHROMIUM_PATH, args: ['--no-sandbox'] } : {});
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 664 }, hasTouch: true });
    const errors = [];
    const hellos = [], closed = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/*', async route => {
      const u = new URL(route.request().url()); if (u.origin !== origin) return route.abort();
      if (u.pathname === '/runtime-config.js') return route.fulfill({ body: 'globalThis.TAVERN_CLOUD={apiOrigin:location.origin,publicUrl:location.origin+"/"};', contentType: 'application/javascript' });
      if (u.pathname.endsWith('peerjs.min.js')) return route.abort();
      const file = path.join(root, u.pathname === '/' ? 'index.html' : u.pathname.slice(1));
      return fs.existsSync(file) && fs.statSync(file).isFile() ? route.fulfill({ body: fs.readFileSync(file), contentType: file.endsWith('.js') ? 'application/javascript' : file.endsWith('.html') ? 'text/html' : undefined }) : route.abort();
    });
    await page.routeWebSocket('**/api/rooms/*', socket => {
      const code = new URL(socket.url()).pathname.split('/').at(-1), game = games.get(code);
      socket.onClose(() => closed.push(code));
      socket.onMessage(raw => {
        const m = JSON.parse(raw);
        if (m.t !== 'hello') return;
        hellos.push({ code, ...m });
        if (!game || m.secret !== (code === 'ABCD' ? first : second)) return socket.send(JSON.stringify({ t: 'error', reason: 'auth' }));
        if (!game._p(m.pid)) game.addPlayer(m.pid, m.name, m.av, false, false);
        socket.send(JSON.stringify({ ...game.view(), pv: game.priv(m.pid), cloud: { owner: false, noTv: true } }));
      });
    });
    await page.goto(origin + '/#ABCD-' + first);
    await page.locator('#form').waitFor();
    assert.equal(await page.locator('#code').inputValue(), 'ABCD');
    await page.locator('#name').fill('Ana');
    await page.locator('#form button[type=submit]').click();
    await page.locator('.lob-row').waitFor();
    const pid = await page.evaluate(() => localStorage.getItem('mz_pid'));
    await page.goto(origin + '/#abcd-' + first);
    assert.equal(await page.locator('.lob-row').count(), 1, 'Room-code case must preserve the active session');
    await page.goto(origin + '/#ABCD');
    assert.equal(await page.locator('.lob-row').count(), 1, 'A code-only invitation to the same room must preserve the active session');
    await page.goto(origin + '/#ABCD-invalid');
    assert.equal(await page.locator('.lob-row').count(), 1, 'Malformed hashes cannot leave the active session');
    assert.equal(hellos.length, 1, 'Same-room and invalid fragment navigation must not reconnect');
    const response = await page.goto(origin + '/#WXYZ-' + second);
    assert.equal(response, null, 'Fixture must exercise fragment navigation, not reload');
    await page.waitForTimeout(100);
    assert.equal(await page.locator('#code').inputValue(), 'WXYZ', 'A new invitation in the existing tab must update the room instead of retaining the old QR code');
    assert.equal(await page.evaluate(() => localStorage.getItem('mz_cloud_resume_v1')), null, 'An explicit new room clears the former recovery target');
    assert(closed.includes('ABCD'), 'Changing rooms must close the old authenticated socket');
    await page.locator('#form button[type=submit]').click();
    await page.locator('.lob-row').waitFor();
    assert.equal(hellos.length, 2);
    assert.equal(hellos[1].code, 'WXYZ');
    assert.equal(hellos[1].secret, second, 'The new invitation must use its own secret');
    assert.equal(hellos[1].pid, pid, 'Changing invitations preserves the device identity');
    assert.equal(errors.length, 0, errors.join('; '));
    console.log(`${browserName}: replacing a full invitation in an existing tab updates the room (same-document navigation).`);
  } finally { for (const game of games.values()) game.stop(); await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

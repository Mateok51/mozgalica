// Real controls: setting persistence, bridge synchronization and small-screen dialog.
const { chromium } = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
 try {
  const page = await browser.newPage({viewport:{width:375,height:553}}), errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',r=>{const u=new URL(r.request().url());if(u.hostname!=='game.test')return r.abort();const f=path.join(root,u.pathname==='/'?'index.html':u.pathname.slice(1));return fs.existsSync(f)?r.fulfill({body:fs.readFileSync(f),contentType:f.endsWith('.html')?'text/html':f.endsWith('.js')?'text/javascript':f.endsWith('.css')?'text/css':undefined}):r.abort();});
  await page.goto('http://game.test/');
  async function connect() {
   await page.evaluate(()=>{window.nativeEvents=[];const c=new MessageChannel();window.testPort=c.port2;c.port2.onmessage=e=>nativeEvents.push(e.data);window.postMessage('trivia-native-connect',location.origin,[c.port1]);});
  }
  await connect(); await page.waitForFunction(()=>nativeEvents.includes('haptic-level:mild'));
  await page.locator('#homeHaptics').click();
  await page.locator('[data-haptic-level="off"]').click();
  await page.waitForFunction(()=>localStorage.getItem('mz_haptic_level')==='off');
  assert.equal(await page.locator('#hapticTest').isDisabled(),true);
  await page.locator('[data-haptic-level="normal"]').click();
  await page.waitForFunction(()=>nativeEvents.includes('haptic-level:normal'));
  await page.waitForTimeout(50); await page.evaluate(()=>nativeEvents=[]);
  await page.locator('#hapticTest').click(); await page.waitForTimeout(50);
  assert.deepEqual(await page.evaluate(()=>nativeEvents),['tap']);
  const bounds=await page.locator('#hapticModal .inv-card').boundingBox();
  assert(bounds.x>=0&&bounds.y>=0&&bounds.x+bounds.width<=375&&bounds.y+bounds.height<=553,'dialog must fit the small viewport');
  await page.keyboard.press('Escape'); assert.equal(await page.locator('#hapticModal').count(),0);
  await page.reload(); await connect(); await page.waitForFunction(()=>nativeEvents.includes('haptic-level:normal'));
  await page.locator('#homeHaptics').click();assert.equal(await page.locator('[data-haptic-level="normal"]').getAttribute('aria-pressed'),'true');
  assert.deepEqual(errors,[]); console.log('PASS vibration choice persists, default mild and native sync work, test emits one tap, dialog fits 375x553');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});

const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined,args:['--no-sandbox']});
 try {
  const page = await browser.newPage({viewport:{width:375,height:553}});
  const css = fs.readFileSync(path.join(__dirname,'../styles.css'),'utf8');
  const image = 'data:image/webp;base64,' + fs.readFileSync(path.join(__dirname,'../chars/macak/idle.webp')).toString('base64');
  const character = mood => `<span class="character-frame" data-effect="success" style="--reaction-elapsed:0ms"><img class="av spr spr-macak m-${mood}" src="${image}"></span>`;
  await page.setContent(`<style>${css}\n.fixture{position:relative;display:inline-block;width:60px;height:60px}.cact{width:60px;height:60px}</style><div class="fixture bob">${character('idle')}</div><div class="fixture cact"><div class="cfig lunge">${character('attack')}</div></div><div class="fixture walker"><span class="wbob">${character('happy')}</span></div><div class="fixture">${character('sad')}</div><div class="fixture">${character('shocked')}</div><div class="fixture">${character('victory')}</div>`);
  const inspect = () => page.evaluate(() => [...document.querySelectorAll('.av,.bob,.cfig,.wbob')].map(e=>({name:e.className,animation:getComputedStyle(e).animationName,transform:getComputedStyle(e).transform,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height})));
  const first = await inspect();
  for (const item of first) assert.equal(item.animation,'none',item.name+' must not animate the complete illustration');
  await page.waitForTimeout(350);
  assert.deepEqual(await inspect(),first,'artwork size and transforms remain fixed while surrounding aura animates');
  await page.waitForTimeout(650);
  assert.equal(await page.locator('.character-frame').first().evaluate(e=>getComputedStyle(e,'::after').opacity),'0','cue expires instead of looping');
  await page.emulateMedia({reducedMotion:'reduce'});
  assert.equal(await page.locator('.character-frame').first().evaluate(e=>getComputedStyle(e,'::after').animationName),'none');
  assert.equal(await page.locator('.character-frame').first().evaluate(e=>getComputedStyle(e,'::after').opacity),'0.22');
  console.log('PASS fixed 2D artwork in idle/attack/reveal states; one-shot aura and reduced-motion cue');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

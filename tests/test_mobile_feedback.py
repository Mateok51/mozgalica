"""Browser regression checks for mobile feedback. Run: python3 tests/test_mobile_feedback.py.
Requires Python Playwright and Chromium. No test hooks are added to the application:
the test instruments only the document response in its isolated browser context.
Set MOZGALICA_SCREENSHOTS to an output directory to capture the tested screens.
"""
import json
import functools
import os
import shutil
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.sync_api import sync_playwright
root = Path(__file__).resolve().parents[1]
s = (root / 'index.html').read_text()
html = s.replace('window.__dbg = {', 'window.__dbg = { get state() { return S; }, get pid() { return PID; }, setState: (d) => { game.stop(); applyState(d); },')

class QuietHandler(SimpleHTTPRequestHandler):

    def log_message(self, *args):
        pass
server = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(root)))
threading.Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}/'

def capture(name):
    if os.environ.get('MOZGALICA_SCREENSHOTS'):
        output = Path(os.environ['MOZGALICA_SCREENSHOTS'])
        output.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(output / name), full_page=True)
with sync_playwright() as p:
    launch = {'executable_path': os.environ.get('CHROMIUM_EXECUTABLE', shutil.which('chromium')), 'headless': True, 'args': ['--no-sandbox']}
    if os.environ.get('HTTPS_PROXY'):
        launch['proxy'] = {'server': os.environ['HTTPS_PROXY'], 'bypass': '127.0.0.1,localhost'}
    b = p.chromium.launch(**launch)
    page = b.new_page(viewport={'width': 390, 'height': 844}, has_touch=True, is_mobile=True)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    page.route(url, lambda r: r.fulfill(status=200, content_type='text/html', body=html))
    page.add_init_script("""(() => {
      window.__playedRates = [];
      const proto = (window.AudioContext || window.webkitAudioContext).prototype;
      const create = proto.createBufferSource;
      proto.createBufferSource = function(...args) {
        const source = create.apply(this, args), start = source.start;
        source.start = function(...values) { window.__playedRates.push(this.playbackRate.value); return start.apply(this, values); };
        return source;
      };
    })();""")
    page.goto(url, wait_until='load')
    page.locator('#demo').tap()
    pid = page.evaluate('window.__dbg.pid')
    base = page.evaluate('window.__dbg.state')
    counter = 100

    def show(ph, fx=None, elapsed=0, answer=0):
        global counter
        counter += 1
        d = json.loads(json.dumps(base))
        d.update(ph=ph, s=counter, rl='Runda 1', dur=20000, ms=20000 - elapsed, ntv=True, fin=False, ev=[], q={'c': 'Geografija', 't': 'Koji je glavni grad Hrvatske?', 'o': ['Zagreb', 'Split', 'Rijeka', 'Osijek']}, cor=0)
        for i, x in enumerate(d['P']):
            x.update(sc=400 - i * 100, ok=False, g=0, ch=-1)
        me = next((x for x in d['P'] if x['id'] == pid))
        if fx:
            me['fx'] = [fx]
        if ph == 'reveal':
            me.update(ch=answer, g=750 if answer == 0 else 0, sc=1150 if answer == 0 else 400)
        page.evaluate('(d)=>window.__dbg.setState(d)', d)
        page.wait_for_timeout(350)
        return d
    show('question')
    capture('mobile-round-question.png')
    assert not page.locator('.phone-round').count()
    for width in [320, 360, 390, 430]:
        page.set_viewport_size({'width': width, 'height': 844})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'), width
    page.set_viewport_size({'width': 390, 'height': 844})
    d = page.evaluate('window.__dbg.state')
    d['P'][1]['ok'] = True
    page.evaluate('(d)=>window.__dbg.setState(d)', d)
    assert page.locator('.bar-row .ok').count() == 1
    print('PASS original mobile layout and live readiness', flush=True)
    show('question', fx='led')
    assert page.locator('.fx-clear-progress').inner_text() == '0 / 7 dodira'
    page.locator('#fx').tap(position={'x': 25, 'y': 80})
    assert page.locator('.fx-clear-progress').inner_text() == '1 / 7 dodira'
    for _ in range(6):
        page.locator('#fx').tap(position={'x': 25, 'y': 80})
    assert not page.locator('#fx').count()
    page.locator('[data-c]').first.tap()
    assert not page.evaluate('Boolean(window.__dbg.L.sent)')
    page.wait_for_timeout(950)
    page.locator('[data-c]').first.tap()
    assert 'Odgovor zaprimljen ✔' in page.locator('[role="status"]').inner_text()
    assert 'Odabir A' in page.locator('.round-answer-detail').inner_text()
    assert 'Spremno 1/4' in page.locator('.round-answer-detail').inner_text()
    d = page.evaluate('window.__dbg.state')
    d['P'][1]['ok'] = True
    page.evaluate('(d)=>window.__dbg.setState(d)', d)
    assert 'Spremno 2/4' in page.locator('.round-answer-detail').inner_text()
    assert page.locator('[aria-pressed="true"]').count() == 1
    assert not page.locator('[data-c]:not(:disabled)').count()
    assert 'happy' in page.locator('.bar-row .bw.me img').get_attribute('src')
    print('PASS ice, input lock and answer confirmation', flush=True)
    # Fractures follow touches and survive roster redraws. Right-click is not a hit.
    d = show('question', fx='led')
    capture('ice-intact.png')
    page.locator('#fx').click(button='right', position={'x': 30, 'y': 90})
    assert page.evaluate('window.__dbg.L.fx.hits') == 0
    positions = [(30, 90), (180, 150), (90, 200), (230, 100), (120, 70), (260, 210)]
    for i, (x, y) in enumerate(positions):
        page.locator('#fx').tap(position={'x': x, 'y': y})
        assert page.evaluate('window.__dbg.L.fx.impacts.length') == i + 1
        if i == 2:
            capture('ice-cracked.png')
    assert page.locator('#fx .cracks path').count() == 6
    impacts = page.evaluate('window.__dbg.L.fx.impacts')
    assert impacts[0]['x'] != impacts[1]['x']
    d['P'][1]['ok'] = True
    page.evaluate('(d)=>window.__dbg.setState(d)', d)
    assert page.evaluate('window.__dbg.L.fx.impacts') == impacts
    page.locator('#fx').tap(position={'x': 170, 'y': 170})
    assert page.locator('.ice-release i').count() == 12
    assert page.locator('.ice-release').evaluate('(e)=>getComputedStyle(e).pointerEvents') == 'none'
    page.locator('[data-c]').first.tap()
    assert not page.evaluate('Boolean(window.__dbg.L.sent)')
    capture('ice-breaking.png')
    page.wait_for_timeout(700)
    assert not page.locator('.ice-release').count()
    assert page.evaluate('window.__playedRates.some(r=>Math.abs(r-.72)<.01)')
    print('PASS touch-local cracks, redraw persistence, bounded shatter and cleanup', flush=True)
    # Finishing ice must preserve the next queued power, including keyboard input.
    show('question', fx='led')
    page.evaluate("window.__dbg.L.fxq.push('sluz')")
    for _ in range(7):
        page.locator('#fx').press('Enter')
    assert page.evaluate('window.__dbg.L.fx.k') == 'sluz'
    assert not page.evaluate('window.__dbg.L.fxCleared')
    assert not page.evaluate('Boolean(window.__dbg.L.sent)')
    show('question')
    page.wait_for_timeout(700)
    assert not page.locator('.ice-release').count()
    page.emulate_media(reduced_motion='reduce')
    show('question', fx='led')
    for _ in range(7):
        page.locator('#fx').press('Space')
    assert page.locator('.ice-release i').evaluate_all("els=>els.every(e=>getComputedStyle(e).display==='none')")
    assert not page.evaluate('Boolean(window.__dbg.L.sent)')
    page.emulate_media(reduced_motion='no-preference')
    print('PASS stacked powers, keyboard input, phase changes and reduced motion', flush=True)
    show('question', fx='led')
    page.locator('#mute').click()
    count = page.evaluate('window.__playedRates.length')
    page.locator('#fx').tap(position={'x': 30, 'y': 90})
    assert page.evaluate('window.__playedRates.length') == count
    page.locator('#mute').click()
    print('PASS crack playback variation and mute', flush=True)
    show('question', fx='sluz')
    assert page.locator('.fx-clear-progress').inner_text() == '0% očišćeno'
    r = page.locator('#fx').bounding_box()
    page.mouse.move(r['x'] + r['width'] / 12, r['y'] + r['height'] / 16)
    page.mouse.down()
    assert page.locator('.fx-clear-progress').inner_text() != '0% očišćeno'
    for row in range(8):
        for col in range(6):
            page.mouse.move(r['x'] + (col + 0.5) * r['width'] / 6, r['y'] + (row + 0.5) * r['height'] / 8)
    page.mouse.up()
    assert not page.locator('#fx').count()
    assert page.evaluate('window.__dbg.L.fxCleared')
    print('PASS slime progress and clearing', flush=True)
    d = show('question')
    d['ev'] = [{'f': d['P'][1]['id'], 't': pid, 'p': 'led', 'b': True}]
    page.evaluate('(d)=>window.__dbg.setState(d)', d)
    assert 'štit odbija' in page.locator('.round-hit').inner_text()
    assert page.locator('.round-hit .mini img').count() == 1
    capture('mobile-round-attack.png')
    show('reveal')
    assert page.locator('.rv-b').evaluate('(e)=>Number(getComputedStyle(e).opacity)') == 0
    page.wait_for_timeout(6600)
    assert page.locator('.rv-b').evaluate('(e)=>Number(getComputedStyle(e).opacity)') == 1
    assert 'victory' in page.locator('.round-reaction img').get_attribute('src')
    assert 'Prednost pred' in page.locator('[data-round-recap]').inner_text()
    capture('mobile-round-result.png')
    for answer, expected in [(1, 'Netočno'), (-1, 'Vrijeme je isteklo')]:
        show('reveal', elapsed=7000, answer=answer)
        assert expected in page.locator('.rv-b .rv-sum').inner_text()
    page.emulate_media(reduced_motion='reduce')
    show('reveal')
    assert page.locator('.rv-b').evaluate('(e)=>Number(getComputedStyle(e).opacity)') == 0
    print('PASS timed reveal, ranking, wrong answer, timeout and reduced motion', flush=True)
    assert not errors, errors
    print('PAGE_ERRORS', errors, flush=True)
    b.close()
server.shutdown()

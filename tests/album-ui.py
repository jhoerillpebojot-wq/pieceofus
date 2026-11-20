"""Browser test for Our Little Album (needs python 'playwright' + 'Pillow'). Run from the project folder:  python3 tests/album-ui.py
   It works on a temporary COPY of the project with test photos, so your real files are never touched."""
import os, re, shutil, subprocess, sys, tempfile, time, json
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

TMP = tempfile.mkdtemp(); PROJ = TMP + '/p'
shutil.copytree(os.getcwd(), PROJ, ignore=shutil.ignore_patterns('__pycache__', '.git'))
def photo(path, w, h, color, fmt):
    im = Image.new('RGB', (w, h), color); d = ImageDraw.Draw(im); r = min(w, h) / 4
    d.ellipse([w / 2 - r, h / 2 - r, w / 2 + r, h / 2 + r], fill=(255, 255, 255)); im.save(path, fmt)
c1 = PROJ + '/assets/memories/chapter-1/'
photo(c1 + 'landscape.jpg', 1600, 900, (244, 170, 190), 'JPEG'); photo(c1 + 'portrait.png', 900, 1400, (190, 170, 235), 'PNG'); photo(c1 + 'square.webp', 800, 800, (170, 215, 190), 'WEBP')
photo(TMP + '/mine.png', 1200, 600, (250, 220, 150), 'PNG'); Image.new('RGB', (40, 40), (0, 0, 0)).save(TMP + '/bad.gif', 'GIF')
cfg_text = open(PROJ + '/js/album-config.js').read()
match = re.search(r'const CONFIG = (\{.*?\n\};)', cfg_text, re.S); assert match, 'album config JSON not found'
cfg = json.loads(match.group(1).rstrip(";"))
def setmem(mid, **kw):
    for ch in cfg['chapters']:
        for mem in ch['memories']:
            if mem['id'] == mid:
                mem.update(kw); return
    raise AssertionError(mid)
setmem('c1m1', photo='landscape.jpg', title='Test landscape', date='February 2024', message='A test note')
setmem('c1m2', photo='portrait.png', title='Test portrait')
setmem('c1m3', photo='square.webp', title='Test square')
setmem('c1m4', photo='missing.jpg', title='Missing file')
new_cfg = '/* Test fixture config. */\n(function (root) {\n  const CONFIG = ' + json.dumps(cfg, indent=2) + ";\n  CONFIG.photoPath = function (ch, m) { const p = String(m.photo || '').trim(); if (!p || /^[a-z][a-z0-9+.-]*:|^\\/\\//i.test(p)) return ''; if (p.startsWith('assets/')) return p; if (p.includes('/')) return 'assets/memories/' + p; return 'assets/memories/' + (ch.folder || ch.id) + '/' + p; };\n  CONFIG.allPhotoPaths = function () { return CONFIG.chapters.flatMap(ch => ch.memories.map(m => CONFIG.photoPath(ch, m))).filter(Boolean); };\n  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG; else root.AlbumConfig = CONFIG;\n})(typeof window !== 'undefined' ? window : globalThis);\n"
open(PROJ + '/js/album-config.js', 'w').write(new_cfg)

PORT = 8767
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1', '--directory', PROJ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8); URL = f'http://127.0.0.1:{PORT}/index.html'
ok = lambda m: print('PASS', m)
SEED = "if(!localStorage.getItem('alpou.save.v1'))localStorage.setItem('alpou.save.v1',JSON.stringify({levels:Object.fromEntries([1,2,3,4,5].map(n=>['L'+n,{stars:3}])),stars:15}))"
DONE = "() => [...document.querySelectorAll('#album-root img, #alb-viewer img')].every(i => i.complete && i.naturalWidth > 0)"
VIEW = "(w,h)=>{const r=document.querySelector('#alb-viewer .alb-card').getBoundingClientRect(), e=document.querySelector('#alb-viewer .alb-bigframe img'), i=e.getBoundingClientRect(); return {card:[r.left,r.top,r.right,r.bottom], img:[i.left,i.top,i.right,i.bottom], w:e.clientWidth, h:e.clientHeight, nw:document.querySelector('#alb-viewer .alb-bigframe img').naturalWidth, nh:document.querySelector('#alb-viewer .alb-bigframe img').naturalHeight}}"

try:
  with sync_playwright() as pw:
    br = pw.chromium.launch()
    def ctx_for(w=390, h=780):
        ctx = br.new_context(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=True, device_scale_factor=2); ctx.add_init_script(SEED)
        page = ctx.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e))); page.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'Failed to load resource' not in m.text else None)
        return ctx, page, errs
    def go_album(page, reload=True):
        if reload: page.goto(URL)
        page.click('#nav [data-go=album]'); page.wait_for_selector('#album-root .alb-page')
    def check_fit(page, w, h, label):
        v = page.evaluate(VIEW, [w, h]); ratio_img, ratio_nat = v['w'] / v['h'], v['nw'] / v['nh']
        assert abs(ratio_img - ratio_nat) / ratio_nat < 0.02, f'{label}: distorted {ratio_img:.3f} vs {ratio_nat:.3f}'
        assert v['card'][0] >= -1 and v['card'][2] <= w + 1 and v['card'][3] <= h + 1 and v['img'][2] <= w + 1, f'{label}: not inside the screen {v}'
        return v

    ctx, page, errs = ctx_for()
    page.goto(URL); page.evaluate("navigator.serviceWorker.ready"); page.wait_for_timeout(1200)
    cached = page.evaluate("""async () => { const name = (await caches.keys()).find(k => k.startsWith('alpou-static-')); const c = await caches.open(name); const out = []; for (const p of ['landscape.jpg','portrait.png','square.webp']) out.push(!!(await c.match('assets/memories/chapter-1/' + p))); return out; }""")
    assert cached == [True, True, True], cached; ok('service worker pre-cached the bundled photos listed in album-config.js (offline-ready)')

    # ---- overview ----
    go_album(page, reload=False)
    txt = page.inner_text('#album-root')
    assert '2 / 42' in txt and 'memories found' in txt; ok('overview shows total unlocked / available: 2 / 42')
    assert page.locator('.chap-card').count() == 7 and page.locator('.chap-card.locked').count() == 6; ok('7 chapters listed; 6 still locked after 5 levels')
    assert 'Opens after 10 levels (5 to go)' in page.inner_text('.chap-card[data-chapter=chapter-2]'); ok('locked chapter shows what is needed and how far away it is')
    assert '2 of 5 memories (40%)' in page.inner_text('.chap-card[data-chapter=chapter-1]'); ok('chapter completion percentage: 40%')
    assert not page.locator('#nav').is_hidden(); 

    # ---- chapter page ----
    page.click('.chap-card[data-chapter=chapter-1]'); page.wait_for_selector('.alb-page[data-chapter=chapter-1]')
    assert 'turn-next' in page.get_attribute('.alb-page', 'class'); ok('opening a chapter plays the page-turn animation')
    assert page.locator('.pol').count() == 5 and page.locator('.pol.locked').count() == 3 and page.locator('.pol .new').count() == 2; ok('5 polaroids: 2 unlocked (marked new), 3 locked previews')
    page.wait_for_function(DONE.replace('#alb-viewer img', '#album-root .pol:not(.locked) img'))
    fits = page.evaluate("[...document.querySelectorAll('.pol:not(.locked) .frame img')].map(i => getComputedStyle(i).objectFit)")
    assert fits == ['contain', 'contain'], fits; ok('landscape JPG and portrait PNG thumbnails load and use object-fit: contain (never stretched)')
    page.locator('.pol.locked').first.click(); page.wait_for_timeout(200)
    assert 'Opens after 8 levels (3 to go)' in page.inner_text('#toast'); ok('tapping a locked memory says exactly what unlocks it')

    # ---- viewer ----
    page.locator('.pol:not(.locked)').first.click(); page.wait_for_selector('#alb-viewer:not([hidden]) .alb-card'); page.wait_for_function(DONE)
    vt = page.inner_text('#alb-viewer')
    assert 'Test landscape' in vt and 'February 2024' in vt and 'short description' in vt and 'A little note' in vt and 'A test note' in vt; ok('viewer shows photo, title, date, description and personal message')
    v = check_fit(page, 390, 780, 'landscape'); ok('landscape photo in viewer: proportions kept (%dx%d shown as %.0fx%.0f) and fits the phone screen' % (v['nw'], v['nh'], v['w'], v['h']))
    page.click('#alb-viewer .alb-bigframe'); page.wait_for_selector('#alb-zoom:not([hidden]) img'); page.click('#alb-zoom'); assert page.locator('#alb-zoom').is_hidden(); ok('tap photo to zoom full-screen, tap again to close')
    page.click('#alb-viewer .alb-pagenav .pn:last-child'); page.wait_for_function(DONE); assert 'Test portrait' in page.inner_text('#alb-viewer')
    v = check_fit(page, 390, 780, 'portrait'); assert v['h'] <= 780 * 0.47; ok('portrait PNG in viewer: not distorted, height limited to fit the screen')
    seen = json.loads(page.evaluate("localStorage.getItem('alpou.save.v1')"))['album']['seen']; assert set(seen) == {'c1m1', 'c1m2'}; ok('opened memories are remembered as seen')
    page.click('#alb-viewer .alb-x'); assert page.locator('#alb-viewer').is_hidden() and page.locator('.pol .new').count() == 0; ok('closing the viewer works and the "new" stickers are gone')

    # ---- page turning between chapters ----
    page.click('.alb-pagenav .pn:last-child'); page.wait_for_selector('.alb-page[data-chapter=chapter-2]')
    assert 'turn-next' in page.get_attribute('.alb-page', 'class') and 'Opens after 10 levels' in page.inner_text('.alb-page') and page.locator('.pol.locked').count() == 9; ok('next-page button turns to a locked chapter that still shows its locked previews')
    cdp = ctx.new_cdp_session(page); box = page.locator('#album-root').bounding_box(); y = box['y'] + 300
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': 330, 'y': y}]}); cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': 200, 'y': y}]}); cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    page.wait_for_selector('.alb-page[data-chapter=chapter-3]'); ok('swiping left turns the page')
    page.click('.alb-pagenav .pn:first-child'); page.wait_for_selector('.alb-page[data-chapter=chapter-2]'); assert 'turn-prev' in page.get_attribute('.alb-page', 'class'); ok('previous-page button turns back')
    page.click('.alb-back'); page.wait_for_selector('.alb-page.cover'); ok('back to all chapters')

    # ---- progression integration + permanence ----
    r = page.evaluate("""() => { ['L6','L7','L8'].forEach(id => SaveStore.completeLevel(id, 3)); const res = Album.checkUnlocks(); return { ids: res.memories.map(m => m.id), text: Album.rewardText(res) }; }""")
    assert r['ids'] == ['c1m3'] and 'new memory' in r['text']; ok('finishing 8 levels unlocks the 3rd memory: "%s"' % r['text'])
    assert page.evaluate("Album.checkUnlocks().memories.length") == 0; ok('checking again never double-unlocks')
    page.evaluate("SaveStore.resetProgress()"); assert page.evaluate("Album.stats().unlocked") == 3; ok('"Start over" keeps the 3 unlocked memories')
    page.reload(); go_album(page, reload=False); assert '3 / 42' in page.inner_text('#album-root'); ok('after closing and reopening the game, 3 / 42 is still unlocked')
    assert page.evaluate("localStorage.getItem('alpou.save.v1')").count('data:image') == 0; ok('no photo data is kept in localStorage')
    page.click('.chap-card[data-chapter=chapter-1]'); page.wait_for_function(DONE.replace('#alb-viewer img', '#album-root .pol:not(.locked) img'))
    page.locator('.pol:not(.locked)').nth(2).click(); page.wait_for_function(DONE); check_fit(page, 390, 780, 'square'); ok('square WebP displays correctly')
    page.click('#alb-viewer .alb-x')

    # ---- missing photo file + optional import (IndexedDB) ----
    page.evaluate("for (let n = 1; n <= 18; n++) SaveStore.completeLevel('L' + n, 3); Album.checkUnlocks()"); page.wait_for_selector('#alb-celebrate:not([hidden]) .cele', timeout=4000)
    assert 'Our Beginning' in page.inner_text('#alb-celebrate'); ok('chapter 1 reached 5 of 5 memories, so its completion screen appeared'); page.click('#alb-celebrate .btn-primary'); page.wait_for_timeout(500)
    page.locator('.pol:not(.locked)').nth(3).click(); page.wait_for_selector('#alb-viewer .alb-ph'); ok('a missing photo file falls back to the placeholder instead of breaking')
    page.set_input_files('#alb-viewer input[type=file]', TMP + '/bad.gif'); page.wait_for_timeout(300)
    assert 'JPG, PNG or WebP' in page.inner_text('#toast') and page.locator('#alb-viewer .alb-ph').count() == 1; ok('unsupported file types are refused politely')
    page.set_input_files('#alb-viewer input[type=file]', TMP + '/mine.png'); page.wait_for_selector('#alb-viewer .alb-bigframe img'); page.wait_for_function(DONE)
    check_fit(page, 390, 780, 'imported'); ok('optional photo import works and keeps proportions')
    assert page.evaluate("AlbumDB.all().then(r => r.length)") == 1 and page.evaluate("localStorage.getItem('alpou.save.v1')").count('blob:') == 0; ok('imported photo is stored in IndexedDB, not localStorage')
    page.click('#alb-viewer .alb-x'); page.reload(); go_album(page, reload=False); page.click('.chap-card[data-chapter=chapter-1]'); page.locator('.pol:not(.locked)').nth(3).click(); page.wait_for_selector('#alb-viewer .alb-bigframe img'); ok('imported photo is still there after closing and reopening')
    page.click('text=Remove my photo'); page.wait_for_selector('#alb-viewer .alb-ph'); ok('imported photo can be removed')
    page.click('#alb-viewer .alb-x')

    # ---- chapter completion ----
    page.click('#nav [data-go=home]'); page.wait_for_timeout(300)   # leave the album first so the celebration can't cover the nav
    page.evaluate("for (let n = 1; n <= 30; n++) { SaveStore.completeLevel('L' + n, 3); SaveStore.completeMatchLevel('L' + n, 3); } Album.checkUnlocks()")
    page.click('#nav [data-go=album]'); page.wait_for_selector('#alb-celebrate:not([hidden]) .cele', timeout=4000)
    assert 'Chapter complete' in page.inner_text('#alb-celebrate') and 'Little Moments' in page.inner_text('#alb-celebrate'); ok('the next finished chapter shows its own completion screen')
    shown = 1
    for _ in range(8):
        page.click('#alb-celebrate .btn-primary'); page.wait_for_timeout(700)
        if page.locator('#alb-celebrate').is_hidden(): break
        shown += 1
    assert shown >= 6, shown; ok('the other 6 chapters each celebrate once, one after another (chapter 1 was not repeated)')
    page.reload(); go_album(page, reload=False); page.wait_for_timeout(1000); assert page.locator('#alb-celebrate').is_hidden(); ok('celebrations are not repeated after reopening')
    assert '42 / 42' in page.inner_text('#album-root') and page.locator('.chap-card.complete').count() == 7; ok('overview: 42 / 42 and every collection 100% complete')

    # ---- offline ----
    ctx.set_offline(True); page.reload(); go_album(page, reload=False); page.click('.chap-card[data-chapter=chapter-1]'); page.wait_for_function(DONE.replace('#alb-viewer img', '#album-root .pol:not(.locked) img'))
    ok('with the network off, the album and its photos still open'); ctx.set_offline(False)
    assert not errs, errs; ok('no console errors'); ctx.close()

    # ---- small phone ----
    ctx, page, errs = ctx_for(320, 568); go_album(page); page.click('.chap-card[data-chapter=chapter-1]'); page.locator('.pol:not(.locked)').first.click(); page.wait_for_function(DONE)
    check_fit(page, 320, 568, 'small phone'); assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth"); ok('small phone (320x568): photo fits, no sideways scrolling')
    page.wait_for_timeout(600); page.screenshot(path='/tmp/album-viewer.png'); page.click('#alb-viewer .alb-x'); page.screenshot(path='/tmp/album-chapter.png')
    br.close()
  print('ALL ALBUM CHECKS PASSED')
finally:
  srv.terminate(); shutil.rmtree(TMP, ignore_errors=True)

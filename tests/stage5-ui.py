"""Browser test for Letters, Secrets and Our Story (needs python 'playwright'). Run from the project folder:  python3 tests/stage5-ui.py"""
import json, subprocess, sys, time
from playwright.sync_api import sync_playwright

PORT = 8768
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8); URL = f'http://127.0.0.1:{PORT}/index.html'
ok = lambda m: print('PASS', m)
state = lambda page: page.evaluate("JSON.parse(localStorage.getItem('alpou.save.v1'))")
OVERFLOW = "document.documentElement.scrollWidth <= window.innerWidth && document.getElementById('screens').scrollWidth <= document.getElementById('screens').clientWidth + 1"

try:
  with sync_playwright() as pw:
    br = pw.chromium.launch()
    def ctx_for(w=390, h=780):
        ctx = br.new_context(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=True, device_scale_factor=2)
        page = ctx.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e))); page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        return ctx, page, errs
    def swipe(ctx, page, x1, x2, y):
        cdp = ctx.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': x1, 'y': y}]})
        for k in range(1, 6): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x1 + (x2 - x1) * k / 5, 'y': y}]}); time.sleep(0.02)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    def complete(page, word, match=0):
        page.evaluate("([w, m]) => { for (let n = 1; n <= w; n++) SaveStore.completeLevel('L' + n, 3); for (let n = 1; n <= m; n++) SaveStore.completeMatchLevel('L' + n, 3); }", [word, match])

    ctx, page, errs = ctx_for()
    page.goto(URL)
    assert page.locator('#nav button').count() == 6 and page.inner_text('#nav').split() == ['Home', 'Play', 'Album', 'Letters', 'Story', 'Garden']; ok('navigation bar now has Home, Play, Album, Letters, Story, Garden')
    assert page.locator('.home [data-go=story]').count() == 1; ok('home screen has an Our Story button')
    page.evaluate("navigator.serviceWorker.ready"); page.wait_for_timeout(800)

    # ---------- letters ----------
    assert page.locator('#nav [data-go=letters].has-new').count() == 1; ok('the Letters tab shows a small dot while there is an unread letter')
    page.click('#nav [data-go=letters]'); page.wait_for_selector('.ltr-card')
    assert '1 of 10 letters open' in page.inner_text('#letters-root') and page.locator('.ltr-card').count() == 10 and page.locator('.ltr-card.locked').count() == 9; ok('10 envelopes: 1 open, 9 sealed')
    assert 'Opens after you complete 3 levels (3 to go)' in page.inner_text('.ltr-card[data-letter=l-beside]'); ok('sealed envelopes say what opens them and how far away it is')
    page.click('.ltr-card[data-letter=l-beside]'); assert 'complete 3 levels' in page.inner_text('#toast'); ok('tapping a sealed envelope explains what unlocks it')
    page.click('.ltr-card[data-letter=l-hello]'); page.wait_for_selector('.ltr-card[data-letter=l-hello] .env.opening', timeout=1000); ok('tapping an open envelope plays the letter-opening animation')
    page.wait_for_selector('#ltr-reader:not([hidden]) .paper', timeout=3000); page.wait_for_timeout(450)
    assert 'A little hello' in page.inner_text('#ltr-reader') and 'a quiet corner' in page.inner_text('#ltr-reader'); ok('the full letter opens in a readable stationery view')
    page.click('#ltr-reader .rd-back'); assert page.locator('#ltr-reader').is_hidden() and page.locator('.ltr-card .new').count() == 0; ok('back button returns to the collection, and the "new" tag is gone')
    assert page.locator('#nav [data-go=letters].has-new').count() == 0; ok('the unread dot clears once everything is read')

    complete(page, 3); page.wait_for_timeout(400)
    assert 'new letter' in page.inner_text('#toast') and '2 of 10 letters open' in page.inner_text('#letters-root'); ok('finishing 3 levels unlocks the next letter and says so')
    page.click('.ltr-card[data-letter=l-beside]'); page.wait_for_selector('#ltr-reader:not([hidden]) .paper'); page.wait_for_timeout(450)
    assert 'beside you right now' in page.inner_text('#ltr-reader') and page.locator('#ltr-reader .pn:last-child').is_disabled() and page.locator('#ltr-reader .pn:first-child').is_enabled(); ok('letter 2 reads naturally; previous/next buttons work between open letters')
    page.click('#ltr-reader .pn:first-child'); assert 'A little hello' in page.inner_text('#ltr-reader'); page.click('#ltr-reader .rd-back')

    page.evaluate("SaveStore.resetProgress()"); page.wait_for_timeout(300)
    assert '2 of 10 letters open' in page.inner_text('#letters-root'); ok('"Start over" does not lock letters again')
    page.reload(); page.click('#nav [data-go=letters]'); page.wait_for_selector('.ltr-card')
    assert '2 of 10 letters open' in page.inner_text('#letters-root'); assert page.evaluate("SaveStore.get().levels") == {}; ok('opened letters stay open after closing and reopening, with no need to replay levels')

    # ---------- secrets ----------
    page.click('#letters-root .seg [data-tab=secrets]'); page.wait_for_selector('.sec-card')
    assert '0 of 8 discovered' in page.inner_text('#letters-root') and 'Hidden sparkles found: 0 of 2' in page.inner_text('#letters-root') and page.locator('.sec-card.locked').count() == 8; ok('secrets tab: 0 of 8 discovered, hidden sparkle counter shown')
    assert 'worth finding' in page.inner_text('.sec-card[data-secret=s-word]'); ok('hidden secrets can show an optional hint')
    page.click('#nav [data-go=home]'); page.click('.hidden-spark[data-collectible=home-sparkle]')
    page.wait_for_selector('#ltr-notice.show'); assert 'discovered a secret' in page.inner_text('#ltr-notice'); ok('tapping the hidden sparkle shows a small "secret discovered" notice')
    page.wait_for_selector('.hidden-spark[data-collectible=home-sparkle]', state='detached', timeout=2000); ok('a found sparkle disappears')
    s = state(page); assert 's-sparkle' in s['secrets']['found'] and 'l-found' in s['letters']['unlocked']; ok('the secret was saved, and it unlocked the letter that depends on it')
    page.wait_for_timeout(4200); page.click('#nav [data-go=letters]'); page.wait_for_selector('.sec-card')
    assert page.locator('#letters-root .seg .tabdot').count() == 1 and '1 of 8 discovered' in page.inner_text('#letters-root'); ok('new secrets are marked in the Secrets tab')
    page.click('.sec-card[data-secret=s-sparkle]'); page.wait_for_selector('#ltr-reader:not([hidden]) .paper.note')
    assert 'A tiny sparkle' in page.inner_text('#ltr-reader') and 'You spotted the sparkle' in page.inner_text('#ltr-reader'); ok('discovered secrets can be re-read from the collection'); page.click('#ltr-reader .rd-back')

    # Word Search: find the secret word by touch
    page.click('#nav [data-go=play]'); page.locator('#level-map .level.w button').first.click(); page.click('#sheet-panel .btn-primary'); page.wait_for_selector('#screen-game.active')
    info = page.evaluate("""() => { const n = Math.round(Math.sqrt(document.querySelectorAll('#ws-grid .ws-cell').length)), g = [...document.querySelectorAll('#ws-grid .ws-cell')].map(c => c.textContent), D = [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]], w = 'HONEY';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of D) { let ok = true; for (let i = 0; i < w.length; i++) { const rr = r + dr*i, cc = c + dc*i; if (rr < 0 || cc < 0 || rr >= n || cc >= n || g[rr*n+cc] !== w[i]) { ok = false; break; } } if (ok) return { n, r, c, dr, dc }; } }""")
    bb = page.locator('#ws-grid').bounding_box(); n = info['n']; cdp = ctx.new_cdp_session(page)
    pt = lambda i: (bb['x'] + (info['c'] + info['dc'] * i + 0.5) * bb['width'] / n, bb['y'] + (info['r'] + info['dr'] * i + 0.5) * bb['height'] / n)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': pt(0)[0], 'y': pt(0)[1]}]})
    for i in range(1, 5): cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': pt(i)[0], 'y': pt(i)[1]}]}); time.sleep(0.02)
    cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})
    page.wait_for_selector('#ltr-notice.show', timeout=3000); assert 's-word' in state(page)['secrets']['found'] and 'HONEY' in state(page)['secrets']['words']; ok('finding the word HONEY in a real Word Search puzzle discovers a secret')
    page.wait_for_timeout(4200); page.click('#screen-game [data-go=play]')

    # progress-based secrets and letters
    complete(page, 12, 6); page.evaluate("Album.checkUnlocks()"); page.wait_for_timeout(500)
    s = state(page)
    assert 's-match' in s['secrets']['found']; ok('finishing Match-3 level 5 discovers its secret')
    assert 'chapter-2' in s['album']['chapters'] and 's-chapter' in s['secrets']['found'] and 'l-apart' in s['letters']['unlocked']; ok('unlocking album chapter 2 discovers a secret and opens its letter')
    assert 's-words' in s['secrets']['found'] and 's-stars' in s['secrets']['found']; ok('wordLevel and stars rules work (10 Word Search levels, 50 stars)')
    assert 's-five' in s['secrets']['found']; ok('"discover 5 secrets" chains from the others')
    page.wait_for_timeout(1500)

    # ---------- Our Story ----------
    page.click('#nav [data-go=story]'); page.wait_for_selector('.bk-chap')
    assert '3 of 5 chapters open' in page.inner_text('#story-root')
    assert page.locator('.bk-chap').count() == 5 and 'Opens after you complete 28 levels (10 to go)' in page.inner_text('.bk-chap[data-chapter=st-4]'); ok('table of contents: 5 chapters, locked ones show what opens them')
    assert page.locator('.bk-chap.locked').count() == 2 and 'Start reading' in page.inner_text('.bk-chap[data-chapter=st-1]'); ok('18 completed levels opened chapters 1 to 3')
    page.click('.bk-chap[data-chapter=st-1]'); page.wait_for_selector('.bk-page')
    assert 'turn-next' in page.get_attribute('.bk-page', 'class') and 'Page 1 of 3' in page.inner_text('.bk-page') and 'How It Started' in page.inner_text('.bk-page'); ok('chapter opens as a book page with a page-turn animation')
    page.click('.bk-page .pn:last-child'); page.wait_for_function("document.querySelector('.bk-page').dataset.page === '1'"); assert 'Page 2 of 3' in page.inner_text('.bk-page'); assert state(page)['story']['page']['st-1'] == 1; ok('next button turns the page and remembers where she is')
    page.click('.bk-page .pn:first-child'); assert 'Page 1 of 3' in page.inner_text('.bk-page'); ok('previous button turns back')
    y = page.locator('.bk-page').bounding_box()['y'] + 200; swipe(ctx, page, 320, 140, y); page.wait_for_function("document.querySelector('.bk-page').dataset.page === '1'"); ok('swiping left turns the page')
    page.click('.bk-page .pn:last-child'); page.click('.bk-page .pn:last-child'); page.wait_for_selector('.bk-end'); assert 'The end of this chapter' in page.inner_text('.bk-page') and page.locator('.bk-end .btn-primary').count() == 1; ok('last page leads to an end-of-chapter card with a Next chapter button')
    page.wait_for_timeout(900); assert 'st-1' in state(page)['story']['finished']; ok('reaching the end marks the chapter finished')
    page.click('.bk-end .btn-primary'); page.wait_for_selector('.bk-page'); assert 'The Little Things' in page.inner_text('.bk-page'); ok('Next chapter opens chapter 2')
    page.click('.bk-page .pn:last-child'); page.wait_for_function("document.querySelector('.bk-page').dataset.page === '1'")
    page.reload(); page.click('#nav [data-go=story]'); page.wait_for_selector('.bk-chap')
    assert 'Finished' in page.inner_text('.bk-chap[data-chapter=st-1]') and 'Continue on page 2' in page.inner_text('.bk-chap[data-chapter=st-2]'); ok('after closing and reopening: chapter 1 shows Finished, chapter 2 offers to continue on page 2')
    page.click('.bk-chap[data-chapter=st-2]'); page.wait_for_selector('.bk-page'); assert 'Page 2 of 3' in page.inner_text('.bk-page'); ok('reading resumes on the saved page')
    page.evaluate("SaveStore.resetProgress()"); page.wait_for_timeout(300); page.click('.bk-page .pn:last-child'); assert 'Page 3 of 3' in page.inner_text('.bk-page'); ok('"Start over" keeps story chapters open')

    # ---------- offline ----------
    page.goto(URL); page.evaluate("navigator.serviceWorker.ready"); page.wait_for_timeout(1000); page.reload(); page.wait_for_timeout(800)
    ctx.set_offline(True); page.reload(); page.click('#nav [data-go=letters]'); page.click('.ltr-card[data-letter=l-hello]'); page.wait_for_selector('#ltr-reader:not([hidden]) .paper', timeout=3000)
    assert 'quiet corner' in page.inner_text('#ltr-reader'); page.click('#ltr-reader .rd-back'); page.click('#nav [data-go=story]'); page.click('.bk-chap[data-chapter=st-1]'); page.wait_for_selector('.bk-page'); ok('with the network off, letters and the story can still be read')
    ctx.set_offline(False)
    assert not [e for e in errs if 'Failed to load' not in e], errs; ok('no console errors'); ctx.close()

    # ---------- small phone layout ----------
    ctx, page, errs = ctx_for(320, 568)
    page.add_init_script("localStorage.getItem('alpou.save.v1') || localStorage.setItem('alpou.save.v1', JSON.stringify({levels:Object.fromEntries(Array.from({length:30},(_,i)=>['L'+(i+1),{stars:3}])),stars:90}))")
    page.goto(URL); page.wait_for_timeout(600)
    assert page.evaluate(OVERFLOW); ok('320px wide: home (now with 6 nav tabs) has no sideways scrolling')
    nav_ok = page.evaluate("[...document.querySelectorAll('#nav button')].every(b => { const r = b.getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 1 && b.scrollWidth <= b.clientWidth + 1 })"); assert nav_ok; ok('all 6 navigation tabs fit on a small phone')
    page.click('#nav [data-go=letters]'); page.wait_for_selector('.ltr-card'); assert page.evaluate(OVERFLOW) and page.locator('.ltr-card:not(.locked)').count() == 8; ok('letters grid fits a small phone')
    page.click('.ltr-card[data-letter=l-whenever]'); page.wait_for_selector('#ltr-reader:not([hidden]) .paper'); page.wait_for_timeout(450)
    box = page.locator('#ltr-reader .paper').bounding_box(); assert box['x'] >= 0 and box['x'] + box['width'] <= 320.5, box; assert page.evaluate("document.querySelector('#ltr-reader .rd-wrap').scrollWidth <= document.querySelector('#ltr-reader .rd-wrap').clientWidth + 1"); ok('letter paper fits a 320px screen and scrolls vertically')
    page.screenshot(path='/tmp/s5-reader.png'); page.click('#ltr-reader .rd-back'); page.screenshot(path='/tmp/s5-letters.png')
    page.click('#letters-root .seg [data-tab=secrets]'); assert page.evaluate(OVERFLOW); ok('secrets list fits')
    page.click('#nav [data-go=story]'); page.wait_for_selector('.bk-chap'); assert page.evaluate(OVERFLOW); page.screenshot(path='/tmp/s5-story.png')
    page.click('.bk-chap[data-chapter=st-4]'); page.wait_for_selector('.bk-page'); page.wait_for_timeout(600); assert page.evaluate(OVERFLOW) and 'Things I Want Us to Experience' in page.inner_text('.bk-page'); ok('story book page (long chapter title) fits')
    assert not errs, errs; ok('no console errors on the small phone')
    br.close()
  print('ALL LETTERS / SECRETS / STORY CHECKS PASSED')
finally:
  srv.terminate()

"""Browser test for the mixed Word Search / Match-3 play path. Run from the project folder: python3 tests/journey-ui.py"""
import subprocess, sys, time, json
from playwright.sync_api import sync_playwright
PORT = 8771
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8); URL = f'http://127.0.0.1:{PORT}/index.html'
ok = lambda m: print('PASS', m)
try:
  with sync_playwright() as pw:
    br = pw.chromium.launch()
    def new(w=390, h=844, save=None):
        ctx = br.new_context(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=True, device_scale_factor=2, reduced_motion='reduce')
        if save: ctx.add_init_script("if(!localStorage.getItem('alpou.save.v1'))localStorage.setItem('alpou.save.v1',JSON.stringify(%s))" % json.dumps(save))
        p = ctx.new_page(); errs = []
        p.on('pageerror', lambda e: errs.append(str(e))); p.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        return ctx, p, errs

    # fresh game: one mixed path, only step 1 open
    ctx, page, errs = new(); page.goto(URL); page.click('#nav [data-go=play]'); page.wait_for_selector('#level-map .level')
    assert page.locator('#play-tabs').count() == 0; ok('no separate game tabs any more: a single path')
    assert page.locator('#level-map .level').count() == 300; ok('the path has 300 steps across three games')
    kinds = page.evaluate("[...document.querySelectorAll('#level-map .level')].map(l=>l.classList.contains('m')?'M':'W').join('')")
    assert kinds == 'WMP' * 100, kinds; ok('steps cycle Word Search, Match-3, Coloring Studio, ...')
    assert page.locator('#level-map .level.current').count() == 1 and page.locator('#level-map .level:not(.locked)').count() == 1; ok('only step 1 (Word Search 1) is open at the start')
    labels = page.evaluate("[...document.querySelectorAll('#level-map .level button')].slice(0,3).map(b=>b.getAttribute('aria-label'))")
    assert labels == ['Word Search level 1', 'Match-3 level 1, locked', 'Word Search level 2, locked'], labels; ok('every step says which game it is: %s' % labels)
    assert page.locator('#level-map .level .tag').count() == 300; ok('every step shows a small game badge')
    page.locator('#level-map .level button').nth(1).click(); assert 'Finish the step before it first' in page.inner_text('#toast'); ok('tapping a locked step explains why')
    # play word search 1 via the app, finish it by solving, and check Next level goes to MATCH-3 level 1
    page.locator('#level-map .level button').first.click(); assert 'Word Search · Level 1' in page.inner_text('#sheet-panel'); page.click('#sheet-panel .btn-primary'); page.wait_for_selector('#screen-game.active')
    # solve by driving the engine: dispatch real pointer drags for each word using the known placements
    page.evaluate("""async () => {
      const g = document.getElementById('ws-grid'), r = g.getBoundingClientRect(), n = Math.round(Math.sqrt(g.children.length));
      const cells = [...g.children].map(c => c.textContent), words = [...document.querySelectorAll('#ws-words .ws-chip')].map(c => c.textContent);
      const D = [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
      const pt = (rr, cc) => ({ clientX: r.left + (cc + .5) * r.width / n, clientY: r.top + (rr + .5) * r.height / n, pointerId: 1, bubbles: true });
      for (const w of words) { let hit = null;
        for (let rr = 0; rr < n && !hit; rr++) for (let cc = 0; cc < n && !hit; cc++) for (const [dr, dc] of D) {
          let ok = true; for (let i = 0; i < w.length; i++) { const R = rr + dr * i, C = cc + dc * i; if (R < 0 || C < 0 || R >= n || C >= n || cells[R * n + C] !== w[i]) { ok = false; break; } }
          if (ok) { hit = [rr, cc, rr + dr * (w.length - 1), cc + dc * (w.length - 1)]; break; } }
        g.dispatchEvent(new PointerEvent('pointerdown', pt(hit[0], hit[1]))); g.dispatchEvent(new PointerEvent('pointermove', pt(hit[2], hit[3]))); g.dispatchEvent(new PointerEvent('pointerup', pt(hit[2], hit[3])));
        await new Promise(res => setTimeout(res, 30)); }
    }""")
    page.wait_for_selector('#sheet:not([hidden]) .ws-stars', timeout=8000)
    assert page.locator('#sheet-panel .btn-primary').inner_text() == 'Next level'; ok('finished Word Search 1: the sheet offers Next level')
    page.click('#sheet-panel .btn-primary'); page.wait_for_selector('#screen-match.active', timeout=5000)
    assert page.inner_text('#mt-title') == 'Level 1' and 'Match-3' in page.inner_text('#screen-match'); ok('Next level moved on to Match-3 level 1 (the games take turns)')
    page.evaluate("Nav.go('play')"); page.wait_for_selector('#level-map .level')
    st = page.evaluate("[...document.querySelectorAll('#level-map .level')].slice(0,3).map(l=>l.className.replace('level ','').trim())")
    assert st[0].endswith('done') and 'current' in st[1] and 'locked' in st[2], st; ok('map now shows: step 1 done, step 2 (Match-3 1) current, step 3 still locked: %s' % st)
    assert not errs, errs; ok('no console errors'); ctx.close()

    # a save from the old version (games progressed separately) still works
    ctx, page, errs = new(save={'levels': {'L%d' % n: {'stars': 3} for n in range(1, 11)}, 'match': {'levels': {'L1': {'stars': 2}}}, 'stars': 32})
    page.goto(URL); page.click('#nav [data-go=play]'); page.wait_for_selector('#level-map .level')
    done = page.locator('#level-map .level.done').count(); cur = page.evaluate("[...document.querySelectorAll('#level-map .level')].findIndex(l=>l.classList.contains('current'))")
    assert done == 11 and cur == 3, (done, cur); ok('old save (10 Word Search + 1 Match-3 done): all 11 show done, current step is #4 (Match-3 level 2)')
    scrolled = page.evaluate("(()=>{const c=document.querySelector('#level-map .level.current').getBoundingClientRect();return c.top>=0&&c.bottom<=innerHeight})()")
    assert scrolled; ok('opening Play scrolls so the current step is on screen'); assert not errs, errs; ctx.close()

    # small phone
    ctx, page, errs = new(320, 568); page.goto(URL); page.click('#nav [data-go=play]'); page.wait_for_selector('#level-map .level')
    assert not page.evaluate("document.documentElement.scrollWidth>innerWidth"); ok('320px phone: path fits, no sideways scrolling')
    badge = page.evaluate("(()=>{const b=document.querySelector('#level-map .level button').getBoundingClientRect(),t=document.querySelector('#level-map .tag').getBoundingClientRect();return t.right<=innerWidth&&t.left>=b.left&&t.width>=20})()")
    assert badge; ok('game badges are fully visible on a small phone'); assert not errs, errs
    br.close()
  print('ALL JOURNEY CHECKS PASSED')
finally:
  srv.terminate()

"""Browser test (needs python 'playwright' + Chromium). Plays both games with real touch input.
   Usage: python3 tests/ui-smoke.py   (run from the project folder)"""
import subprocess, time, json, sys
from playwright.sync_api import sync_playwright

PORT = 8765
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
URL = f'http://127.0.0.1:{PORT}/index.html'
ok = lambda m: print('PASS', m)

READ_GRID = """() => {
  const b = document.querySelector('#mt-board'), cols = +getComputedStyle(b).getPropertyValue('--cols'), rows = +getComputedStyle(b).getPropertyValue('--rows');
  const grid = Array.from({length: rows}, () => Array(cols).fill(null));
  document.querySelectorAll('#mt-tiles .mt').forEach(t => {
    const m = t.style.transform.match(/translate\\((-?[\\d.]+)%,\\s*(-?[\\d.]+)%\\)/), c = Math.round(m[1] / 100), r = Math.round(m[2] / 100);
    const id = t.querySelector('use').getAttribute('href'); if (r >= 0 && r < rows) grid[r][c] = id === '#p-spark' ? -1 : +id.slice(3);
  });
  return grid; }"""
# picks a valid swap (best = most pieces in the first clear; worst = an invalid one when kind='invalid')
PICK = """([grid, kind]) => {
  const E = MatchThree.Engine, rows = grid.length, cols = grid[0].length; let best = null, bv = -1, bad = null;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) for (const [dr, dc] of [[0, 1], [1, 0]]) {
    const r2 = r + dr, c2 = c + dc; if (r2 >= rows || c2 >= cols) continue;
    const b = E.fromGrid(grid.map(row => row.map(v => v < 0 ? 0 : v))), res = E.tryMove(b, r * cols + c, r2 * cols + c2, Math.random);
    if (!res.valid) { bad = bad || [r * cols + c, r2 * cols + c2]; continue; }
    const n = res.events.find(e => e.kind === 'clear').cleared.length; if (n > bv) { bv = n; best = [r * cols + c, r2 * cols + c2]; }
  }
  return kind === 'invalid' ? bad : best; }"""

try:
  with sync_playwright() as pw:
    br = pw.chromium.launch()

    def new_ctx(reduced, h=844, seed=False):
        ctx = br.new_context(viewport={'width': 390, 'height': h}, has_touch=True, is_mobile=True, device_scale_factor=2,
                             reduced_motion='reduce' if reduced else 'no-preference')
        if seed: ctx.add_init_script("if(!localStorage.getItem('alpou.save.v1'))localStorage.setItem('alpou.save.v1',JSON.stringify({levels:{L1:{stars:3},L2:{stars:3}},stars:6}))")
        page = ctx.new_page(); errs = []
        page.on('pageerror', lambda e: errs.append(str(e))); page.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
        return ctx, page, errs

    def drag(ctx, page, pts):
        cdp = ctx.new_cdp_session(page)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchStart', 'touchPoints': [{'x': pts[0][0], 'y': pts[0][1]}]})
        for x, y in pts[1:]:
            cdp.send('Input.dispatchTouchEvent', {'type': 'touchMove', 'touchPoints': [{'x': x, 'y': y}]}); time.sleep(0.02)
        cdp.send('Input.dispatchTouchEvent', {'type': 'touchEnd', 'touchPoints': []})

    def cell_xy(page, sel, idx, cols, rows):
        bb = page.locator(sel).bounding_box()
        return bb['x'] + (idx % cols + 0.5) * bb['width'] / cols, bb['y'] + (idx // cols + 0.5) * bb['height'] / rows

    def swap_by_drag(ctx, page, a, b, n):
        (x1, y1), (x2, y2) = cell_xy(page, '#mt-tiles', a, n, n), cell_xy(page, '#mt-tiles', b, n, n)
        drag(ctx, page, [(x1, y1), ((x1 + x2) / 2, (y1 + y2) / 2), (x2, y2)])

    def open_match(page, level=1):
        page.goto(URL); page.click('#nav [data-go=play]')
        page.locator('#level-map .level.m button').nth(level - 1).click(); page.click('#sheet-panel .btn-primary')
        page.wait_for_selector('#screen-match.active')

    # ---------- A. normal-motion phone: touch drag, tap-tap, invalid swap, scrolling ----------
    ctx, page, errs = new_ctx(False, h=560, seed=True)   # Word Search 1 done, so Match-3 level 1 is open on the path
    open_match(page)
    assert page.locator('#nav').is_hidden(), 'nav hidden while playing'
    assert page.locator('#mt-tiles .mt').count() == 49; ok('Match-3 level 1 opens with a 7x7 board of 49 pieces, nav hidden')
    grid = page.evaluate(READ_GRID); n = 7
    bad = page.evaluate(PICK, [grid, 'invalid'])
    before_tiles = page.locator('#mt-tiles .mt').count()
    ax, ay = cell_xy(page, '#mt-tiles', bad[0], n, n); bx, by = cell_xy(page, '#mt-tiles', bad[1], n, n)
    page.touchscreen.tap(ax, ay); assert page.locator('#mt-tiles .mt.sel').count() == 1; ok('tap selects a piece')
    page.touchscreen.tap(bx, by); page.wait_for_timeout(900)
    assert page.inner_text('#mt-moves') == '25', 'invalid swap must not use a move'
    assert page.evaluate(READ_GRID) == grid, 'invalid swap reverses'; ok('invalid swap (tap-tap) reverses and costs no move')
    best = page.evaluate(PICK, [grid, 'best']); scroll0 = page.evaluate("document.getElementById('screens').scrollTop")
    swap_by_drag(ctx, page, best[0], best[1], n); page.wait_for_timeout(2600)
    assert page.inner_text('#mt-moves') == '24' and int(page.inner_text('#mt-score')) >= 30; ok('touch drag swap: moves 25->24, score ' + page.inner_text('#mt-score'))
    grid2 = page.evaluate(READ_GRID); assert all(v is not None for row in grid2 for v in row); ok('board refilled after falling pieces and cascades')
    assert page.evaluate("document.getElementById('screens').scrollTop") == scroll0; ok('dragging on the board does not scroll the page')
    assert not errs, errs; ok('no console errors (normal motion)')
    ctx.close()

    # ---------- B. reduced-motion phone: full level win, fail/retry, memory unlock, persistence, offline ----------
    ctx, page, errs = new_ctx(True, seed=True)   # 2 Word Search levels already done, so Match-3 level 1 is the 3rd completed level
    open_match(page)
    for _ in range(40):
        if page.locator('#sheet:not([hidden])').count(): break
        mv = page.evaluate(PICK, [page.evaluate(READ_GRID), 'best'])
        swap_by_drag(ctx, page, mv[0], mv[1], 7); page.wait_for_timeout(450)
    page.wait_for_selector('#sheet:not([hidden]) .ws-stars', timeout=5000)
    assert 'Sweet success' in page.inner_text('#sheet-panel') and 'new memory' in page.inner_text('#sheet-panel'); ok('level 1 won by playing: completion sheet with stars shown')
    save = json.loads(page.evaluate("localStorage.getItem('alpou.save.v1')"))
    assert save['match']['levels']['L1']['stars'] >= 1 and save['stars'] >= 1; ok('result saved: ' + json.dumps(save['match']['levels']) + ', total stars ' + str(save['stars']))

    # level 2 with an easy goal -> unlocks memory M16
    page.evaluate("MatchData.levels[1].objectives=[{type:'score',target:40}]")
    page.click('#sheet-panel >> text=Back to levels'); page.wait_for_selector('#screen-play.active')   # the path's next step is Word Search 3, so open Match-3 level 2 from the map
    page.locator('#level-map .level.m button').nth(1).click(); page.click('#sheet-panel .btn-primary'); page.wait_for_timeout(300)
    for _ in range(10):
        if page.locator('#sheet:not([hidden])').count(): break
        mv = page.evaluate(PICK, [page.evaluate(READ_GRID), 'best']); swap_by_drag(ctx, page, mv[0], mv[1], 7); page.wait_for_timeout(450)
    page.wait_for_selector('#sheet:not([hidden]) .ws-stars')
    assert 'c1m1' in json.loads(page.evaluate("localStorage.getItem('alpou.save.v1')"))['memories']; ok('completing the 3rd level unlocked the first album memory and the sheet said so')

    # failure and instant retry; nothing is lost
    page.evaluate("MatchData.levels[1].moves=1; MatchData.levels[1].objectives=[{type:'score',target:99999}]")
    page.click('#sheet-panel >> text=Back to levels')
    page.wait_for_selector('#screen-play.active'); page.locator('#level-map .level.m button').nth(1).click(); page.click('#sheet-panel .btn-primary')
    page.wait_for_selector('#screen-match.active'); mv = page.evaluate(PICK, [page.evaluate(READ_GRID), 'best']); swap_by_drag(ctx, page, mv[0], mv[1], 7)
    page.wait_for_selector('#sheet:not([hidden]) :text("So close")', timeout=5000); ok('running out of moves shows the "So close" sheet')
    page.click('#sheet-panel .btn-primary'); page.wait_for_timeout(300)
    assert page.inner_text('#mt-moves') == '1' and page.locator('#sheet').is_hidden() and page.locator('#mt-tiles .mt').count() == 49; ok('Try again restarts instantly with a fresh board')
    s2 = json.loads(page.evaluate("localStorage.getItem('alpou.save.v1')")); assert 'c1m1' in s2['memories'] and s2['match']['levels']['L1']; ok('failing a level keeps stars and album memories')
    assert not errs, errs; ok('no console errors (win/fail flows)')

    # persistence + progress display + offline
    page.goto(URL); page.click('#nav [data-go=play]')
    assert page.locator('#level-map .level.m.done').count() == 2; ok('after reload, Match-3 progress (2 levels) is still there')
    page.click('#nav [data-go=album]'); assert '1 / 42' in page.inner_text('#album-root'); ok('Our Album shows 1 / 42 memories found')
    page.evaluate("navigator.serviceWorker.ready"); page.wait_for_timeout(800); page.reload(); page.wait_for_timeout(500)
    ctx.set_offline(True); page.reload(); page.wait_for_selector('#screen-home.active, .screen.active'); ok('app reloads with no connection (service worker cache)')
    ctx.set_offline(False)

    # ---------- C. Word Search regression with touch ----------
    page.goto(URL); page.click('#nav [data-go=play]'); page.locator('#level-map .level.w button').first.click(); page.click('#sheet-panel .btn-primary')
    page.wait_for_selector('#screen-game.active')
    info = page.evaluate("""() => { const n = Math.round(Math.sqrt(document.querySelectorAll('#ws-grid .ws-cell').length)), g = [...document.querySelectorAll('#ws-grid .ws-cell')].map(c => c.textContent);
      const words = [...document.querySelectorAll('#ws-words .ws-chip')].map(c => c.textContent), D = [[0,1],[1,0],[1,1],[-1,1],[0,-1],[-1,0],[-1,-1],[1,-1]];
      for (const w of words) for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) for (const [dr, dc] of D) {
        let ok = true; for (let i = 0; i < w.length; i++) { const rr = r + dr*i, cc = c + dc*i; if (rr < 0 || cc < 0 || rr >= n || cc >= n || g[rr*n+cc] !== w[i]) { ok = false; break; } }
        if (ok) return { n, w, r, c, dr, dc, len: w.length }; } }""")
    bb = page.locator('#ws-grid').bounding_box(); n = info['n']
    pt = lambda i: (bb['x'] + (info['c'] + info['dc'] * i + 0.5) * bb['width'] / n, bb['y'] + (info['r'] + info['dr'] * i + 0.5) * bb['height'] / n)
    drag(ctx, page, [pt(i) for i in range(info['len'])])
    page.wait_for_timeout(500)
    assert page.locator('#ws-words .ws-chip.found').count() == 1 and page.inner_text('#ws-count').startswith('1 of'); ok('Word Search still works: found "' + info['w'] + '" by touch drag')
    page.click('#screen-game [data-go=play]'); page.wait_for_selector('#screen-play.active'); ok('Word Search back button returns to the level list')
    br.close()
  print('ALL UI CHECKS PASSED')
finally:
  srv.terminate()

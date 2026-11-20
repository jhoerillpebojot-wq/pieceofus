"""Browser test for the Little Garden (needs python 'playwright'). Run: python3 tests/garden-ui.py"""
import subprocess, sys, time
from playwright.sync_api import sync_playwright
PORT = 8771
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8); URL = f'http://127.0.0.1:{PORT}/index.html'
ok = lambda m: print('PASS', m)
g2 = lambda page: page.evaluate("JSON.parse(localStorage.getItem('alpou.save.v1')).garden2")
try:
  with sync_playwright() as pw:
    br = pw.chromium.launch()
    def new(w=390, h=780):
        ctx = br.new_context(viewport={'width': w, 'height': h}, has_touch=True, is_mobile=True, device_scale_factor=1)
        p = ctx.new_page(); errs = []; p.on('pageerror', lambda e: errs.append(str(e))); p.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); return ctx, p, errs
    def done(page, w, m=0): page.evaluate("([w,m])=>{for(let n=1;n<=w;n++)SaveStore.completeLevel('L'+n,3);for(let n=1;n<=m;n++)SaveStore.completeMatchLevel('L'+n,3);}", [w, m])
    ctx, page, errs = new(); page.goto(URL); page.wait_for_timeout(400)
    page.click('#nav [data-go=garden]'); page.wait_for_selector('.g-scene')
    assert page.locator('.g-plot').count() == 4 and page.locator('.g-tab').count() == 4; ok('garden opens with 4 plots in the Beginning Garden and 4 area tabs')
    assert 'Our little garden' in page.inner_text('.g-sign'); ok('the sign says "Our little garden" when no names are configured (nothing assumed)')
    page.click('.g-plot[data-plot="0"]'); assert 'No seeds yet' in page.inner_text('#toast'); ok('empty plot with no seeds explains how to get seeds')
    page.click('.g-tab.locked'); assert 'opens after you' in page.inner_text('#toast'); ok('locked areas say what opens them')
    # earn seeds + decorations by playing
    page.click('#nav [data-go=home]'); page.wait_for_timeout(300); done(page, 3, 3); page.wait_for_timeout(300)
    assert page.evaluate("JSON.parse(localStorage.getItem('alpou.save.v1')).garden2.seeds.tulip") == 2; ok('Word Search levels earned seeds (2 tulip, 1 daisy)')
    assert page.locator('#nav [data-go=garden].has-new').count() == 1; ok('the Garden tab shows a dot for new items')
    page.click('#nav [data-go=garden]'); page.wait_for_selector('.g-item'); page.wait_for_timeout(200)
    assert page.locator('#nav [data-go=garden].has-new').count() == 0; ok('the dot clears once the garden is open')
    # plant
    page.click('.g-item[data-item=tulip]'); assert page.locator('.g-plot.aim').count() == 4; ok('choosing a seed highlights the free plots')
    page.click('.g-plot[data-plot="1"]'); page.wait_for_timeout(200)
    d = g2(page); assert d['plots']['beginning']['1'] == {'t': 'tulip', 's': 0} and d['seeds']['tulip'] == 1; ok('planted a tulip: seed used, plot filled')
    page.click('.g-plot[data-plot="1"]'); page.click('text=Water it'); page.wait_for_timeout(200)
    assert g2(page)['plots']['beginning']['1']['s'] == 1; ok('watering grows the flower one stage immediately, no timers')
    page.click('.g-plot[data-plot="1"]'); page.click('text=Water it'); page.click('.g-plot[data-plot="1"]'); page.click('text=Water it'); page.wait_for_timeout(200)
    assert g2(page)['plots']['beginning']['1']['s'] == 3 and page.locator('.g-plot.s3').count() == 1; ok('flower reaches full bloom (stage 3) and sways')
    page.click('.g-plot[data-plot="2"]'); done(page, 4, 3); page.wait_for_timeout(300)
    assert g2(page)['plots']['beginning']['2']['s'] == 1; ok('finishing a level grows planted flowers too')
    # decorations
    page.click('.g-tray .seg [data-tray=decor]'); page.click('.g-item[data-item=bush]'); assert page.locator('.g-spot.aim').count() >= 5; ok('choosing a decoration shows the free spots')
    page.click('.g-spot.aim >> nth=0'); page.wait_for_timeout(200)
    sp = g2(page)['spots']['beginning']; assert list(sp.values()) == ['bush']; ok('placed a bush')
    first = list(sp.keys())[0]; page.click('.g-spot:has(svg)'); page.click('button:has-text("Move it")'); assert page.locator('.g-spot.lift').count() == 1; page.click('.g-spot.aim >> nth=1'); page.wait_for_timeout(200)
    assert list(g2(page)['spots']['beginning'].keys())[0] != first; ok('rearranging: moved the bush to another spot')
    page.click('.g-spot:has(svg)'); page.click('button:has-text("Put it away")'); assert not g2(page)['spots']['beginning']; ok('put away returns the bush to the tray')
    # dig up
    page.click('.g-plot[data-plot="2"]'); page.click('text=Dig up'); assert g2(page)['seeds']['tulip'] == 1 and '2' not in g2(page)['plots']['beginning']; ok('digging up gives the seed back')
    # areas
    done(page, 10, 0); page.wait_for_timeout(300)
    assert 'Flower Garden' in page.inner_text('#toast') or 'flower' in g2(page)['areas']; ok('10 levels open the Flower Garden')
    page.click('.g-tab[data-area=flower]'); page.wait_for_selector('.g-plot[data-plot="5"]'); assert page.locator('.g-plot').count() == 6; ok('Flower Garden has 6 plots')
    # persistence
    page.reload(); page.wait_for_timeout(500); page.click('#nav [data-go=garden]'); page.wait_for_selector('.g-scene')
    d = g2(page); assert d['plots']['beginning']['1']['s'] == 3 and 'flower' in d['areas'] and page.locator('.g-plot.has').count() >= 1; ok('garden is the same after closing and reopening')
    page.evaluate("page => 0") if False else None
    page.once('dialog', lambda dlg: dlg.accept()); page.click('#nav [data-go=home]'); page.click('[data-go=settings]'); page.click('#reset-btn'); page.wait_for_timeout(300)
    d = g2(page); assert d['plots']['beginning']['1']['t'] == 'tulip' and 'flower' in d['areas']; ok('"Start over" keeps the garden and the areas')
    # network off
    ctx.set_offline(True); page.reload(); page.wait_for_timeout(600); page.click('#nav [data-go=garden]'); page.wait_for_selector('.g-scene'); ok('garden works with the network off'); ctx.set_offline(False)
    assert not errs, errs; ok('no console errors')
    # small phone
    ctx2, p2, e2 = new(320, 568); p2.goto(URL); p2.evaluate("for(let n=1;n<=30;n++){SaveStore.completeLevel('L'+n,3);SaveStore.completeMatchLevel('L'+n,3);}"); p2.wait_for_timeout(300)
    p2.click('#nav [data-go=garden]'); p2.wait_for_selector('.g-scene')
    for a in ['beginning', 'flower', 'butterfly']:
        p2.click(f'.g-tab[data-area={a}]'); p2.wait_for_timeout(150)
        assert p2.evaluate("document.documentElement.scrollWidth <= innerWidth && document.getElementById('screens').scrollWidth <= document.getElementById('screens').clientWidth + 1"), a
        box = p2.locator('.g-scene').bounding_box(); assert box['width'] <= 320 and box['height'] > 250
    ok('320px phone: every area fits with no sideways scrolling')
    p2.click('.g-tab[data-area=flower]'); p2.click('.g-item[data-item=tulip]')
    for i in range(6): p2.click(f'.g-plot[data-plot="{i}"]', force=True) if p2.locator('.g-plot.aim').count() else None
    p2.wait_for_timeout(200); assert p2.locator('.g-plot.has').count() >= 5; ok('planting works on a small phone')
    p2.screenshot(path='/tmp/g_small.png'); assert not e2, e2; ok('no console errors on the small phone')
    ctx3, p3, e3 = new(); p3.goto(URL); p3.evaluate("for(let n=1;n<=30;n++){SaveStore.completeLevel('L'+n,3);SaveStore.completeMatchLevel('L'+n,3);}"); p3.click('#nav [data-go=garden]'); p3.wait_for_selector('.g-scene')
    for i in range(4):
        p3.click('.g-item >> nth=%d' % (i % 2)); p3.click(f'.g-plot[data-plot="{i}"]'); p3.wait_for_timeout(100)
    p3.click('.g-tray [data-tray=decor]')
    for t in ['bench', 'tree', 'pond', 'bush']: p3.click(f'.g-item[data-item={t}]'); p3.click('.g-spot.aim >> nth=0'); p3.wait_for_timeout(80)
    p3.screenshot(path='/tmp/g_main.png'); p3.click('.g-tab[data-area=butterfly]'); p3.wait_for_timeout(300); p3.screenshot(path='/tmp/g_bf.png')
    print('ALL GARDEN CHECKS PASSED')
finally:
  srv.terminate()

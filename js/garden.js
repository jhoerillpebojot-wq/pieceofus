/* Little Garden: rules (testable in Node) and the screen. Everything saves through SaveStore.gardenEdit. */
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const U = isNode ? require('./unlocks.js') : root.Unlocks;
  const C = isNode ? require('./data/garden.js') : root.GardenConfig;
  const area = id => C.areas.find(a => a.id === id);
  const name = id => (C.flowers.concat(C.decor).find(x => x.id === id) || { name: id }).name;
  const used = (g, type) => Object.values(g.spots).reduce((n, a) => n + Object.values(a).filter(t => t === type).length, 0);
  const plantsIn = g => [].concat(...Object.values(g.plots).map(a => Object.values(a)));

  const Logic = {
    name,
    left(g, type) { return (g.decor[type] || 0) - used(g, type); },
    stats(st) { const g = st.garden2, p = plantsIn(g); return { planted: p.length, blooms: p.filter(x => x.s >= 3).length, seeds: Object.values(g.seeds).reduce((a, b) => a + b, 0), claimed: g.claimed.length, total: C.rewards.length, areas: g.areas.length }; },
    /* Opens areas, gives rewards (once each, kept forever) and grows flowers for newly finished levels. Returns what happened. */
    sync(st) {
      const g = st.garden2, out = { areas: [], items: [], grew: 0 };
      for (let guard = 0, again = true; again && guard < 6; guard++) {
        again = false;
        C.areas.forEach(a => { if (!g.areas.includes(a.id) && U.check(a.unlock, st)) { g.areas.push(a.id); out.areas.push(a); again = true; } });
        C.rewards.forEach(r => {
          if (g.claimed.includes(r.id) || !U.check(r.when, st)) return;
          g.claimed.push(r.id); again = true;
          ['seed', 'decor'].forEach(k => Object.entries(r.give[k] || {}).forEach(([t, n]) => { g[k === 'seed' ? 'seeds' : 'decor'][t] = (g[k === 'seed' ? 'seeds' : 'decor'][t] || 0) + n; out.items.push(n > 1 ? n + ' \u00d7 ' + name(t) : name(t)); g.seen += n; }));
        });
      }
      const total = Object.keys(st.levels).length + Object.keys(st.match.levels).length;
      // Passive growth is slower: every three completed puzzle levels advances a planted flower once.
      const growth = Math.max(0, Math.floor(total / 3) - Math.floor(g.progress / 3));
      if (growth) plantsIn(g).forEach(p => { if (p.s < 3) { const before = p.s; p.s = Math.min(3, p.s + growth); out.grew += p.s - before; } });
      g.progress = total;
      return out;
    },
    plant(st, a, i, type) {
      const g = st.garden2; g.plots[a] = g.plots[a] || {};
      if (!g.areas.includes(a) || !area(a) || !area(a).plots[i] || g.plots[a][i] || !(g.seeds[type] > 0)) return false;
      g.seeds[type]--; if (!g.seeds[type]) delete g.seeds[type]; g.plots[a][i] = { t: type, s: 0, lastWaterAt: 0 }; return true;
    },
    water(st, a, i) { const p = (st.garden2.plots[a] || {})[i]; if (!p || p.s >= 3) return false; const now = Date.now(); if (p.lastWaterAt && now - p.lastWaterAt < 5 * 60 * 1000) return false; p.s++; p.lastWaterAt = now; return true; },
    dig(st, a, i) { const g = st.garden2, p = (g.plots[a] || {})[i]; if (!p) return false; g.seeds[p.t] = (g.seeds[p.t] || 0) + 1; delete g.plots[a][i]; return true; },
    place(st, a, i, type) {
      const g = st.garden2; g.spots[a] = g.spots[a] || {};
      if (!g.areas.includes(a) || !area(a) || !area(a).spots[i] || g.spots[a][i] || Logic.left(g, type) < 1) return false;
      g.spots[a][i] = type; return true;
    },
    move(st, a, from, to) {            // empty spot: moves. occupied spot: swaps.
      const s = st.garden2.spots[a] || {}; if (!s[from] || from === to || !area(a).spots[to]) return false;
      const t = s[to]; s[to] = s[from]; if (t) s[from] = t; else delete s[from]; return true;
    },
    putAway(st, a, i) { const s = st.garden2.spots[a] || {}; if (!s[i]) return false; delete s[i]; return true; },
    problems() {
      const out = [], ids = new Set(); const fl = C.flowers.map(f => f.id), dc = C.decor.map(d => d.id);
      C.rewards.forEach(r => { if (ids.has(r.id)) out.push('duplicate reward id ' + r.id); ids.add(r.id); U.validate(r.when, 'reward ' + r.id).forEach(p => out.push(p));
        Object.keys((r.give || {}).seed || {}).forEach(t => { if (!fl.includes(t)) out.push('reward ' + r.id + ': unknown seed ' + t); });
        Object.keys((r.give || {}).decor || {}).forEach(t => { if (!dc.includes(t)) out.push('reward ' + r.id + ': unknown decoration ' + t); }); });
      C.areas.forEach(a => U.validate(a.unlock, 'area ' + a.id).forEach(p => out.push(p)));
      if (!C.areas.length || C.areas[0].unlock) out.push('the first area must have unlock: null');
      return out;
    }
  };
  if (isNode) module.exports = { Logic };
  if (typeof document === 'undefined') return;

  /* ================= SCREEN ================= */
  const Art = root.GardenArt, $ = s => document.querySelector(s), S = () => SaveStore.get(), G = () => S().garden2;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const toast = m => root.AppUI && root.AppUI.toast(m), tap = f => root.AppUI && root.AppUI.Fx.tap(f || 560);
  const chapterTitle = id => { const c = root.AlbumConfig && root.AlbumConfig.chapters.find(x => x.id === id); return c ? c.title : id; };
  const ui = { area: 'beginning', tray: 'seeds', sel: null, moving: null };
  const STAGES = ['A seed, just planted', 'A little sprout', 'A bud on the way', 'In full bloom'];
  let last = '', busy = false;
  const edit = fn => SaveStore.gardenEdit(fn, true);

  function sync(silent) {
    if (busy) return; busy = true; let out;
    try { edit(st => { out = Logic.sync(st); }); } finally { busy = false; }
    if (out.items.length) last = 'New in your garden: ' + out.items.join(', ') + '.';
    const gameOn = ['game', 'match'].includes(Nav.current());
    if (!silent && !gameOn) { if (out.areas.length) toast('A new garden area opened: ' + out.areas[0].title); else if (out.items.length) toast('New in your garden: ' + out.items.slice(0, 2).join(', ') + (out.items.length > 2 ? ' and more' : '')); }
    updateDot(); render();
  }
  function updateDot() { document.querySelectorAll('#nav [data-go=garden]').forEach(b => b.classList.toggle('has-new', G().seen > 0 && Nav.current() !== 'garden')); }
  function takeGainText() { const t = last; last = ''; return t; }

  function seedsOwned() { return C.flowers.filter(f => G().seeds[f.id] > 0); }
  function decorOwned() { return C.decor.filter(d => (G().decor[d.id] || 0) > 0); }

  function render() {
    const host = $('#garden-root'); if (!host) return;
    const st = S(), g = G(), st2 = Logic.stats(st), a = area(ui.area) || C.areas[0];
    host.innerHTML = '';
    const head = el('header', 'screen-head'); head.appendChild(el('h2', '', 'Little Garden'));
    head.appendChild(el('p', '', st2.blooms + ' in bloom \u00b7 ' + st2.planted + ' planted \u00b7 no rush, ever')); host.appendChild(head);

    const tabs = el('div', 'g-tabs'); tabs.setAttribute('role', 'tablist');
    C.areas.forEach(x => {
      const open = g.areas.includes(x.id), b = el('button', 'g-tab' + (x.id === a.id ? ' on' : '') + (open ? '' : ' locked'), x.title.replace(' Garden', '')); b.type = 'button'; b.dataset.area = x.id;
      b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(x.id === a.id));
      if (!open) b.insertAdjacentHTML('afterbegin', '<svg class="ic"><use href="#i-lock"/></svg>');
      b.onclick = () => { if (!open) return toast(x.title + ' opens after you ' + U.describe(x.unlock, S(), chapterTitle)); ui.area = x.id; ui.moving = null; tap(); render(); };
      tabs.appendChild(b);
    }); host.appendChild(tabs);
    host.appendChild(el('p', 'g-blurb', a.blurb));

    const hint = ui.moving !== null ? 'Tap a spot to move it there (tap it again to cancel)' : ui.sel ? (ui.sel.kind === 'seed' ? 'Tap a plot to plant your ' + name(ui.sel.type).toLowerCase() : 'Tap a free spot to place the ' + name(ui.sel.type).toLowerCase()) : '';
    const scene = el('div', 'g-scene g-' + a.theme); scene.innerHTML = Art.scene(a.theme);
    const sg = C.sign, sign = el('div', 'g-sign');
    if (sg.top) sign.appendChild(el('small', '', sg.top));
    sign.appendChild(el('b', '', sg.names || 'Our little garden'));
    if (sg.bottom) sign.appendChild(el('small', '', sg.bottom));
    scene.appendChild(sign);
    if (a.theme === 'butterfly') for (let i = 0; i < 3; i++) { const b = el('span', 'g-bf b' + i); b.innerHTML = Art.BUTTERFLY; scene.appendChild(b); }

    const pl = g.plots[a.id] || {}, sp = g.spots[a.id] || {};
    a.spots.forEach((xy, i) => {
      const t = sp[i], aim = ui.moving !== null ? i !== ui.moving : ui.sel && ui.sel.kind === 'decor' && !t;
      if (!t && !aim) return;
      const b = el('button', 'g-spot' + (aim ? ' aim' : '') + (ui.moving === i ? ' lift' : '')); b.type = 'button'; b.dataset.spot = i;
      b.style.left = xy[0] + '%'; b.style.top = xy[1] + '%';
      b.setAttribute('aria-label', t ? name(t) + ' (spot ' + (i + 1) + ')' : 'Free spot ' + (i + 1));
      if (t) b.innerHTML = Art.DECOR[t]; b.onclick = () => spotTap(a, i); scene.appendChild(b);
    });
    a.plots.forEach((xy, i) => {
      const p = pl[i], aim = !p && ui.sel && ui.sel.kind === 'seed';
      const b = el('button', 'g-plot' + (aim ? ' aim' : '') + (p ? ' has s' + p.s : '')); b.type = 'button'; b.dataset.plot = i;
      b.style.left = xy[0] + '%'; b.style.top = xy[1] + '%';
      b.setAttribute('aria-label', p ? name(p.t) + ', ' + STAGES[p.s].toLowerCase() + ' (plot ' + (i + 1) + ')' : 'Empty plot ' + (i + 1));
      b.innerHTML = Art.flower(p ? p.t : 'tulip', p ? p.s : -1);
      b.onclick = () => plotTap(a, i); scene.appendChild(b);
    });
    host.appendChild(scene);
    host.appendChild(el('p', 'g-hint' + (hint ? ' on' : ''), hint || ' '));

    /* tray */
    const tray = el('div', 'g-tray card'), seg = el('div', 'seg'); seg.setAttribute('role', 'tablist');
    [['seeds', 'Seeds'], ['decor', 'Decorations']].forEach(([k, t]) => { const b = el('button', '', t); b.type = 'button'; b.dataset.tray = k; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(ui.tray === k)); b.onclick = () => { ui.tray = k; ui.sel = null; ui.moving = null; tap(); render(); }; seg.appendChild(b); });
    tray.appendChild(seg);
    const row = el('div', 'g-items'), isSeed = ui.tray === 'seeds';
    const list = isSeed ? seedsOwned() : C.decor.filter(d => Logic.left(g, d.id) > 0);
    list.forEach(x => {
      const n = isSeed ? g.seeds[x.id] : Logic.left(g, x.id), on = ui.sel && ui.sel.type === x.id && ui.sel.kind === (isSeed ? 'seed' : 'decor');
      const b = el('button', 'g-item' + (on ? ' on' : '')); b.type = 'button'; b.dataset.item = x.id;
      b.innerHTML = '<i>' + (isSeed ? Art.flower(x.id, 3) : Art.DECOR[x.id]) + '</i><span></span><em></em>'; b.querySelector('span').textContent = x.name; b.querySelector('em').textContent = '\u00d7' + n;
      b.onclick = () => { ui.sel = on ? null : { kind: isSeed ? 'seed' : 'decor', type: x.id }; ui.moving = null; tap(); render(); }; row.appendChild(b);
    });
    if (!list.length) row.appendChild(el('p', 'g-empty', isSeed ? 'No seeds right now. Finish Word Search levels for more, or dig up a flower to get its seed back.' : 'Nothing waiting. Match-3 levels, secrets and achievements bring decorations.'));
    tray.appendChild(row); host.appendChild(tray);
    if (g.seen > 0 && Nav.current() === 'garden') edit(() => { g.seen = 0; }), updateDot();
  }

  function plotTap(a, i) {
    const p = (G().plots[a.id] || {})[i];
    if (!p) {
      if (ui.sel && ui.sel.kind === 'seed') {
        const t = ui.sel.type; edit(st => Logic.plant(st, a.id, i, t)); tap(700);
        if (!(G().seeds[t] > 0)) ui.sel = null; toast('Planted a ' + name(t).toLowerCase()); render();
      } else { ui.tray = 'seeds'; toast(seedsOwned().length ? 'Pick a seed below, then tap a plot' : 'No seeds yet. Word Search levels give them.'); render(); }
      return;
    }
    root.AppUI.openSheet(panel => {
      const row = el('div', 'g-stage'); for (let k = 0; k < 4; k++) row.appendChild(el('i', k <= p.s ? 'on' : ''));
      panel.appendChild(el('h3', '', name(p.t))); panel.appendChild(el('p', '', STAGES[p.s] + '.')); panel.appendChild(row);
      if (p.s < 3) { const wait = p.lastWaterAt ? Math.max(0, 5 * 60 * 1000 - (Date.now() - p.lastWaterAt)) : 0; const w = el('button', 'btn btn-primary', wait ? 'Resting · '+Math.ceil(wait/60000)+' min' : 'Water it'); w.type = 'button'; w.disabled = wait > 0; w.onclick = () => { const ok = edit(st => Logic.water(st, a.id, i)); root.AppUI.closeSheet(); if (ok !== false) { tap(740); toast('It grew a little'); } render(); }; panel.appendChild(w); if (wait) panel.appendChild(el('p','g-empty','Let this flower rest before watering it again. You can also grow it by completing puzzle levels.')); }
      else panel.appendChild(el('p', '', 'It\u2019s fully grown. Enjoy it.'));
      const d = el('button', 'btn btn-soft g-wide', 'Dig up (get the seed back)'); d.type = 'button'; d.onclick = () => { edit(st => Logic.dig(st, a.id, i)); root.AppUI.closeSheet(); toast('Seed back in your tray'); render(); }; panel.appendChild(d);
    });
  }
  function spotTap(a, i) {
    const t = (G().spots[a.id] || {})[i];
    if (ui.moving !== null) { const from = ui.moving; ui.moving = null; if (from !== i) { edit(st => Logic.move(st, a.id, from, i)); tap(700); } render(); return; }
    if (!t) { const ty = ui.sel.type; edit(st => Logic.place(st, a.id, i, ty)); tap(700); if (Logic.left(G(), ty) < 1) ui.sel = null; render(); return; }
    root.AppUI.openSheet(panel => {
      panel.appendChild(el('h3', '', name(t))); panel.appendChild(el('p', '', 'Move it somewhere else, or put it back in your tray.'));
      const m = el('button', 'btn btn-primary', 'Move it'); m.type = 'button'; m.onclick = () => { root.AppUI.closeSheet(); ui.moving = i; ui.sel = null; render(); }; panel.appendChild(m);
      const d = el('button', 'btn btn-soft g-wide', 'Put it away'); d.type = 'button'; d.onclick = () => { edit(st => Logic.putAway(st, a.id, i)); root.AppUI.closeSheet(); render(); }; panel.appendChild(d);
    });
  }

  function init() {
    const problems = Logic.problems(); if (problems.length) console.warn('data/garden.js problems:\n- ' + problems.join('\n- '));
    sync(true); SaveStore.subscribe(() => sync(false));
    Nav.onChange(name => { if (name === 'garden') render(); else { ui.sel = null; ui.moving = null; } updateDot(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && (ui.sel || ui.moving !== null)) { ui.sel = null; ui.moving = null; render(); } });
    render();
  }
  root.Garden = { init, render, sync, takeGainText, Logic, stats: () => Logic.stats(S()) };
})(typeof window !== 'undefined' ? window : globalThis);

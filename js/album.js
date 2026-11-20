/* Our Little Album: unlock rules (pure logic, testable in Node) + the scrapbook screen. */
(function (root) {
  /* ================= LOGIC ================= */
  const PROGRESS_MODES = ['total', 'word', 'match'];
  const memThreshold = (ch, m) => Math.max(ch.unlockAt || 0, m.unlockAt || 0);   // never earlier than its chapter

  const Logic = {
    memThreshold,
    completedCount(state, mode) {
      const w = Object.keys(state.levels || {}).length, m = Object.keys((state.match && state.match.levels) || {}).length;
      return mode === 'word' ? w : mode === 'match' ? m : w + m;
    },
    /* What SHOULD be unlocked now but is not yet saved. Never returns removals: unlocks are permanent. */
    computeUnlocks(cfg, state) {
      const progress = Logic.completedCount(state, cfg.settings.progressCounts);
      const have = new Set(state.memories || []), open = new Set((state.album && state.album.chapters) || []);
      const chapters = cfg.chapters.filter(c => progress >= (c.unlockAt || 0) && !open.has(c.id)).map(c => c.id);
      const memories = [];
      cfg.chapters.forEach(c => c.memories.forEach(m => { if (progress >= memThreshold(c, m) && !have.has(m.id)) memories.push(m.id); }));
      return { chapters, memories, progress };
    },
    stats(cfg, state) {
      const have = new Set(state.memories || []), open = new Set((state.album && state.album.chapters) || []);
      const chapters = cfg.chapters.map(c => {
        const total = c.memories.length, unlocked = c.memories.filter(m => have.has(m.id)).length;
        return { id: c.id, total, unlocked, pct: total ? Math.round(unlocked / total * 100) : 0, open: open.has(c.id), complete: total > 0 && unlocked === total };
      });
      const total = chapters.reduce((a, c) => a + c.total, 0), unlocked = chapters.reduce((a, c) => a + c.unlocked, 0);
      return { total, unlocked, pct: total ? Math.round(unlocked / total * 100) : 0, chapters, progress: Logic.completedCount(state, cfg.settings.progressCounts) };
    },
    /* The closest locked memory, so she can see how far away it is. */
    nextUnlock(cfg, state) {
      const have = new Set(state.memories || []), progress = Logic.completedCount(state, cfg.settings.progressCounts);
      let best = null;
      cfg.chapters.forEach(c => c.memories.forEach(m => {
        const t = memThreshold(c, m);
        if (!have.has(m.id) && (!best || t < best.at)) best = { memory: m, chapter: c, at: t, left: Math.max(0, t - progress) };
      }));
      return best;
    },
    /* Human-readable problems in album-config.js (empty list = fine). */
    validate(cfg) {
      const out = [], ids = new Set();
      if (!PROGRESS_MODES.includes(cfg.settings && cfg.settings.progressCounts)) out.push("settings.progressCounts must be 'total', 'word' or 'match'");
      if (!Array.isArray(cfg.chapters) || !cfg.chapters.length) out.push('no chapters defined');
      (cfg.chapters || []).forEach(c => {
        if (!c.id || ids.has(c.id)) out.push('duplicate or missing chapter id: ' + c.id); ids.add(c.id);
        if (!c.title) out.push('chapter ' + c.id + ' has no title');
        if (!Number.isFinite(c.unlockAt) || c.unlockAt < 0) out.push('chapter ' + c.id + ': unlockAt must be a number');
        (c.memories || []).forEach(m => {
          if (!m.id || ids.has(m.id)) out.push('duplicate or missing memory id: ' + m.id); ids.add(m.id);
          if (!m.title) out.push('memory ' + m.id + ' has no title');
          if (!Number.isFinite(m.unlockAt) || m.unlockAt < 0) out.push('memory ' + m.id + ': unlockAt must be a number');
          if (m.photo) {
            if (!cfg.photoPath(c, m)) out.push('memory ' + m.id + ': photo must be a local file, not a web address');
            else if (!/\.(jpe?g|png|webp)$/i.test(m.photo)) out.push('memory ' + m.id + ': photo must be .jpg, .jpeg, .png or .webp');
          }
        });
      });
      return out;
    }
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = { Logic };
  if (typeof document === 'undefined') return;

  /* ================= SCRAPBOOK SCREEN ================= */
  const CFG = root.AlbumConfig;
  const $ = s => document.querySelector(s);
  const S = () => SaveStore.get();
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const ic = (id, cls) => `<svg class="${cls || ''}" viewBox="0 0 64 64" aria-hidden="true"><use href="#${id}"/></svg>`;
  const lockIc = '<svg class="ic" aria-hidden="true"><use href="#i-lock"/></svg>';
  const chById = id => CFG.chapters.find(c => c.id === id);
  const memById = id => { for (const c of CFG.chapters) { const m = c.memories.find(x => x.id === id); if (m) return m; } return null; };
  const TAPES = ['t-pink', 't-lav', 't-sage', 't-butter'];
  const ui = { view: 'overview', chapterId: null, imported: new Map(), viewer: null, dirty: false };
  const toast = m => root.AppUI && root.AppUI.toast(m);
  const tap = () => root.AppUI && root.AppUI.Fx.tap(560);

  function installArt() {
    if (document.getElementById('album-art')) return;
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.id = 'album-art'; s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.setAttribute('style', 'position:absolute'); s.setAttribute('aria-hidden', 'true');
    s.innerHTML = '<defs>'
      + '<symbol id="s-flower" viewBox="0 0 64 64"><g fill="#f6c1cf"><circle cx="32" cy="16" r="11"/><circle cx="48" cy="28" r="11"/><circle cx="42" cy="47" r="11"/><circle cx="22" cy="47" r="11"/><circle cx="16" cy="28" r="11"/></g><circle cx="32" cy="32" r="9" fill="#ffd966"/></symbol>'
      + '<symbol id="s-leaf" viewBox="0 0 64 64"><path d="M10 54C8 28 26 10 54 10c0 28-16 46-44 44z" fill="#bcd6b3"/><path d="M12 52C26 38 38 28 50 14" stroke="#8fb487" stroke-width="3" fill="none" stroke-linecap="round"/></symbol>'
      + '<symbol id="s-star" viewBox="0 0 64 64"><path d="M32 5l8 18 19 2-14 13 5 19-18-10-18 10 5-19L5 25l19-2z" fill="#ffd35c" stroke="#f2b632" stroke-width="3" stroke-linejoin="round"/></symbol>'
      + '<symbol id="s-cam" viewBox="0 0 64 64"><rect x="8" y="20" width="48" height="32" rx="8" fill="none" stroke="currentColor" stroke-width="4"/><circle cx="32" cy="36" r="9" fill="none" stroke="currentColor" stroke-width="4"/><path d="M22 20l3-6h14l3 6" fill="none" stroke="currentColor" stroke-width="4" stroke-linejoin="round"/></symbol>'
      + '</defs>';
    document.body.appendChild(s);
  }

  /* ---------- unlocking ---------- */
  function checkUnlocks() {
    const r = Logic.computeUnlocks(CFG, S()), out = { memories: [], chapters: [] };
    r.chapters.forEach(id => { if (SaveStore.albumAdd('chapters', id)) out.chapters.push(chById(id)); });
    r.memories.forEach(id => { if (SaveStore.unlock('memories', id)) out.memories.push(memById(id)); });
    return out;
  }
  function rewardText(r) {
    if (!r) return '';
    const ch = r.chapters.length, mem = r.memories.length;
    if (ch && mem) return 'A new chapter and a new memory are waiting in Our Album.';
    if (ch) return 'A new chapter has opened in Our Album.';
    if (mem) return mem === 1 ? 'A new memory is waiting in Our Album.' : mem + ' new memories are waiting in Our Album.';
    return '';
  }
  const needText = (at, progress) => { const left = at - progress; return 'Opens after ' + at + ' level' + (at === 1 ? '' : 's') + (left > 0 ? ' (' + left + ' to go)' : ''); };

  /* ---------- photos ---------- */
  const photoSrc = (ch, m) => ui.imported.get(m.id) || CFG.photoPath(ch, m) || '';
  function placeholder() { const d = el('div', 'alb-ph'); d.innerHTML = ic('s-cam', 'ph-cam') + '<span>Photo goes here</span>'; return d; }
  function photoEl(ch, m) {
    const src = photoSrc(ch, m); if (!src) return placeholder();
    const img = new Image(); img.alt = m.title || 'Photo'; img.decoding = 'async'; img.src = src;
    img.onerror = () => img.replaceWith(placeholder());          // missing file: fall back gracefully
    return img;
  }
  async function shrink(file, max = 1600) {                       // keeps proportions; smaller storage
    try {
      const bmp = await createImageBitmap(file), k = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const c = document.createElement('canvas'); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
      c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
      return await new Promise((res, rej) => c.toBlob(b => b ? res(b) : rej(new Error('encode')), 'image/jpeg', 0.9));
    } catch (e) { if (file.size < 8e6) return file; throw e; }
  }
  function setImported(id, blob) { const old = ui.imported.get(id); if (old) URL.revokeObjectURL(old); ui.imported.set(id, URL.createObjectURL(blob)); }
  async function importPhoto(file) {
    const id = ui.viewer && ui.viewer.memId; if (!id) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { toast('Please choose a JPG, PNG or WebP photo'); return; }
    try { const blob = await shrink(file); await root.AlbumDB.put(id, blob); setImported(id, blob); toast('Photo saved on this device'); }
    catch (e) { console.error(e); toast('Could not save that photo'); }
    drawViewer(); render();
  }
  async function removeImported(id) {
    try { await root.AlbumDB.remove(id); } catch (e) { console.error(e); }
    const u = ui.imported.get(id); if (u) URL.revokeObjectURL(u); ui.imported.delete(id);
    drawViewer(); render();
  }

  /* ---------- pages ---------- */
  const bar = pct => { const b = el('div', 'bar'); b.setAttribute('role', 'progressbar'); b.setAttribute('aria-valuenow', pct); b.innerHTML = '<i style="width:' + pct + '%"></i>'; return b; };
  const newCount = ch => { const seen = new Set(S().album.seen), have = new Set(S().memories); return ch.memories.filter(m => have.has(m.id) && !seen.has(m.id)).length; };

  function renderOverview(host, dir) {
    const st = Logic.stats(CFG, S()), nx = Logic.nextUnlock(CFG, S());
    const page = el('div', 'alb-page cover' + (dir ? ' turn-' + dir : ''));
    page.innerHTML = '<i class="tape t-pink l"></i><i class="tape t-lav r"></i>' + ic('s-flower', 'stk stk-a') + ic('s-leaf', 'stk stk-b');
    page.appendChild(el('h2', 'alb-title', CFG.cover.title));
    page.appendChild(el('p', 'hand', CFG.cover.subtitle));
    const tot = el('div', 'alb-total'); tot.appendChild(el('b', '', st.unlocked + ' / ' + st.total)); tot.appendChild(el('span', '', 'memories found'));
    page.appendChild(tot); page.appendChild(bar(st.pct));
    page.appendChild(el('p', 'alb-next', nx ? 'Next memory: ' + (nx.left ? nx.left + ' more level' + (nx.left === 1 ? '' : 's') : 'ready now') : 'Every memory is unlocked.'));
    host.appendChild(page);

    const list = el('div', 'alb-chapters'); let n = 0;
    CFG.chapters.forEach((ch, i) => {
      const cs = st.chapters[i], label = ch.special ? 'Bonus collection' : 'Chapter ' + (++n), nw = newCount(ch);
      const b = el('button', 'chap-card' + (cs.open ? '' : ' locked') + (cs.complete ? ' complete' : ''));
      b.type = 'button'; b.dataset.chapter = ch.id;
      b.innerHTML = '<i class="tape ' + TAPES[i % 4] + ' top"></i>' + ic(ch.special ? 's-star' : 's-flower', 'chap-stk');
      const t = el('div', 'chap-text'); t.appendChild(el('span', 'hand', label)); t.appendChild(el('strong', '', ch.title));
      t.appendChild(el('small', '', cs.open ? cs.unlocked + ' of ' + cs.total + ' memories (' + cs.pct + '%)' + (cs.complete ? ', complete' : '') : needText(ch.unlockAt, st.progress)));
      if (cs.open) t.appendChild(bar(cs.pct));
      b.appendChild(t);
      if (!cs.open) b.insertAdjacentHTML('beforeend', '<span class="chap-lock">' + lockIc + '</span>');
      if (nw) b.appendChild(el('span', 'new', nw + ' new'));
      b.onclick = () => { tap(); openChapter(ch.id, 'next'); };
      list.appendChild(b);
    });
    host.appendChild(list);
  }

  function renderChapter(host, dir) {
    const idx = CFG.chapters.findIndex(c => c.id === ui.chapterId), ch = CFG.chapters[idx];
    const st = Logic.stats(CFG, S()), cs = st.chapters[idx], have = new Set(S().memories), seen = new Set(S().album.seen);
    const back = el('button', 'alb-back', '‹ All chapters'); back.type = 'button';
    back.onclick = () => { tap(); ui.view = 'overview'; render('prev'); $('#screens').scrollTop = 0; };
    host.appendChild(back);

    const page = el('div', 'alb-page' + (dir ? ' turn-' + dir : '')); page.dataset.chapter = ch.id;
    page.innerHTML = '<i class="tape ' + TAPES[idx % 4] + ' l"></i><i class="tape ' + TAPES[(idx + 2) % 4] + ' r"></i>' + ic(ch.special ? 's-star' : 's-flower', 'stk stk-a') + ic('s-leaf', 'stk stk-b');
    page.appendChild(el('p', 'hand', ch.special ? 'Bonus collection' : 'Chapter ' + (CFG.chapters.filter((c, j) => !c.special && j <= idx).length)));
    page.appendChild(el('h2', 'alb-title', ch.title));
    page.appendChild(el('p', 'alb-blurb', ch.blurb || ''));
    if (cs.open) { page.appendChild(el('p', 'alb-count', cs.unlocked + ' of ' + cs.total + ' memories (' + cs.pct + '%)')); page.appendChild(bar(cs.pct)); }
    else page.appendChild(el('p', 'alb-count lockedtxt', needText(ch.unlockAt, st.progress)));

    const grid = el('div', 'alb-grid');
    ch.memories.forEach((m, i) => {
      const got = have.has(m.id), th = memThreshold(ch, m);
      const b = el('button', 'pol' + (got ? '' : ' locked')); b.type = 'button'; b.dataset.memory = m.id;
      b.setAttribute('aria-label', got ? m.title : 'Locked memory. ' + needText(th, st.progress));
      b.appendChild(el('i', 'tape ' + TAPES[(i + idx) % 4] + ' top'));
      const f = el('div', 'frame'); if (got) f.appendChild(photoEl(ch, m)); else f.innerHTML = lockIc; b.appendChild(f);
      b.appendChild(el('span', 'cap', got || CFG.settings.showLockedTitles ? m.title : 'After ' + th + ' level' + (th === 1 ? '' : 's')));
      if (got && !seen.has(m.id)) b.appendChild(el('span', 'new', 'new'));
      b.onclick = () => { if (got) { tap(); openViewer(ch.id, m.id); } else toast(needText(th, st.progress)); };
      grid.appendChild(b);
    });
    page.appendChild(grid);

    const nav = el('div', 'alb-pagenav');
    const prev = el('button', 'pn', '‹'), next = el('button', 'pn', '›');
    prev.type = next.type = 'button'; prev.setAttribute('aria-label', 'Previous chapter'); next.setAttribute('aria-label', 'Next chapter');
    prev.disabled = idx === 0; next.disabled = idx === CFG.chapters.length - 1;
    prev.onclick = () => turn(-1); next.onclick = () => turn(1);
    const dots = el('span', 'dots'); CFG.chapters.forEach((c, j) => dots.appendChild(el('i', j === idx ? 'on' : '')));
    nav.appendChild(prev); nav.appendChild(dots); nav.appendChild(next); page.appendChild(nav);
    host.appendChild(page);
  }

  function turn(d) {
    const i = CFG.chapters.findIndex(c => c.id === ui.chapterId) + d;
    if (i < 0 || i >= CFG.chapters.length) return;
    tap(); openChapter(CFG.chapters[i].id, d > 0 ? 'next' : 'prev');
  }
  function openChapter(id, dir) { ui.view = 'chapter'; ui.chapterId = id; render(dir); $('#screens').scrollTop = 0; }

  function render(dir) {
    const host = $('#album-root'); if (!host) return;
    if (Nav.current() !== 'album' && !dir && host.childElementCount) { ui.dirty = true; return; }
    ui.dirty = false; host.innerHTML = '';
    host.style.setProperty('--fit', CFG.settings.thumbFit === 'cover' ? 'cover' : 'contain');
    if (ui.view === 'chapter' && chById(ui.chapterId)) renderChapter(host, dir); else { ui.view = 'overview'; renderOverview(host, dir); }
  }

  /* ---------- photo viewer ---------- */
  function openViewer(chId, memId) { ui.viewer = { chId, memId }; drawViewer(); }
  function closeViewer() { ui.viewer = null; $('#alb-viewer').hidden = true; setTimeout(maybeCelebrate, 350); }

  function drawViewer() {
    const { chId, memId } = ui.viewer, ch = chById(chId), m = ch.memories.find(x => x.id === memId);
    const have = new Set(S().memories), list = ch.memories.filter(x => have.has(x.id)), i = list.findIndex(x => x.id === memId);
    const v = $('#alb-viewer'); v.hidden = false; v.innerHTML = '';
    v.onclick = e => { if (e.target === v) closeViewer(); };
    const card = el('div', 'alb-card'); card.setAttribute('role', 'dialog'); card.setAttribute('aria-label', m.title);
    const x = el('button', 'alb-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Close'); x.onclick = closeViewer; card.appendChild(x);

    const big = el('button', 'alb-bigframe'); big.type = 'button'; big.setAttribute('aria-label', 'Zoom photo');
    big.appendChild(el('i', 'tape t-pink top')); const inner = el('div', 'in'); inner.appendChild(photoEl(ch, m)); big.appendChild(inner);
    big.onclick = () => { const src = photoSrc(ch, m); if (src) openZoom(src, m.title); };
    card.appendChild(big);

    card.appendChild(el('h3', 'alb-mtitle', m.title));
    if (m.date) card.appendChild(el('p', 'alb-date hand', m.date));
    if (m.description) card.appendChild(el('p', 'alb-desc', m.description));
    if (m.message) { const n = el('div', 'alb-note'); n.appendChild(el('i', 'tape t-butter top')); n.appendChild(el('span', 'hand', 'A little note')); n.appendChild(el('p', '', m.message)); card.appendChild(n); }

    const imageSrc = photoSrc(ch, m);
    if (imageSrc) {
      const saveRow = el('div', 'alb-import');
      const saveImage = el('button', 'btn btn-soft', 'Save this picture'); saveImage.type = 'button';
      saveImage.onclick = async () => {
        try {
          const response = await fetch(imageSrc);
          if (!response.ok) throw new Error('Image unavailable');
          const blob = await response.blob();
          const ext = (blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
          const url = URL.createObjectURL(blob), a = document.createElement('a');
          const safe = (m.title || 'our-memory').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'our-memory';
          a.href = url; a.download = safe + '.' + ext; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1500);
          toast('Picture saved');
        } catch (err) { console.error(err); toast('Could not save this picture'); }
      };
      saveRow.appendChild(saveImage); card.appendChild(saveRow);
    }

    if (CFG.settings.allowPhotoImport && root.AlbumDB && root.AlbumDB.available) {
      const row = el('div', 'alb-import'), has = ui.imported.has(m.id);
      const input = el('input'); input.type = 'file'; input.accept = 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp'; input.hidden = true;
      input.onchange = () => { if (input.files[0]) importPhoto(input.files[0]); };
      const add = el('button', 'btn btn-soft', has ? 'Change photo' : 'Add a photo from this device'); add.type = 'button'; add.onclick = () => input.click();
      row.appendChild(input); row.appendChild(add);
      if (has) { const rm = el('button', 'btn btn-quiet', 'Remove my photo'); rm.type = 'button'; rm.onclick = () => removeImported(m.id); row.appendChild(rm); }
      card.appendChild(row);
    }
    if (list.length > 1) {
      const nav = el('div', 'alb-pagenav');
      const p = el('button', 'pn', '‹'), n = el('button', 'pn', '›'); p.type = n.type = 'button'; p.disabled = i <= 0; n.disabled = i >= list.length - 1;
      p.setAttribute('aria-label', 'Previous memory'); n.setAttribute('aria-label', 'Next memory');
      p.onclick = () => openViewer(chId, list[i - 1].id); n.onclick = () => openViewer(chId, list[i + 1].id);
      nav.appendChild(p); nav.appendChild(el('span', 'hand', (i + 1) + ' of ' + list.length)); nav.appendChild(n); card.appendChild(nav);
    }
    v.appendChild(card);
    SaveStore.albumAdd('seen', memId);
  }

  function openZoom(src, alt) {
    const z = $('#alb-zoom'); z.hidden = false; z.innerHTML = '';
    const img = new Image(); img.src = src; img.alt = alt || ''; z.appendChild(img);
    z.onclick = () => { z.hidden = true; z.innerHTML = ''; };
  }

  /* ---------- chapter complete ---------- */
  function maybeCelebrate() {
    if (Nav.current() !== 'album' || ui.viewer || !$('#alb-celebrate').hidden) return;
    const done = new Set(S().album.celebrated), st = Logic.stats(CFG, S());
    const c = st.chapters.find(x => x.complete && !done.has(x.id));
    if (c) celebrate(c.id);
  }
  function celebrate(chId) {
    const ch = chById(chId), c = $('#alb-celebrate'); c.hidden = false; c.innerHTML = '';
    const card = el('div', 'alb-card cele');
    card.innerHTML = ic('s-flower', 'cele-fl') + '<p class="hand">Chapter complete</p>';
    card.appendChild(el('h2', 'alb-title', ch.title));
    card.appendChild(el('p', 'alb-desc', ch.completionMessage || CFG.completionMessage || 'You found every memory in this chapter.'));
    const go = el('button', 'btn btn-primary', 'Continue'); go.type = 'button';
    go.onclick = () => { c.hidden = true; c.innerHTML = ''; setTimeout(maybeCelebrate, 350); };
    card.appendChild(go); c.appendChild(card);
    for (let i = 0; i < 16; i++) {
      const p = el('div', 'alb-conf'); p.innerHTML = ic(['s-flower', 's-star', 's-leaf'][i % 3]);
      p.style.left = Math.random() * 92 + '%'; p.style.animationDelay = Math.random() * 1.2 + 's'; c.appendChild(p);
    }
    SaveStore.albumAdd('celebrated', chId);
    if (root.AppUI) root.AppUI.Fx.tap(880);
  }

  function init() {
    const problems = Logic.validate(CFG); if (problems.length) console.warn('album-config.js problems:\n- ' + problems.join('\n- '));
    installArt();
    ['alb-viewer', 'alb-zoom', 'alb-celebrate'].forEach(id => { const d = el('div'); d.id = id; d.hidden = true; $('#app').appendChild(d); });
    checkUnlocks();
    const host = $('#album-root'); let sx = 0, sy = 0;
    host.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    host.addEventListener('touchend', e => {
      if (ui.view !== 'chapter') return;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 70 && Math.abs(dy) < 45) turn(dx < 0 ? 1 : -1);
    }, { passive: true });
    Nav.onChange(name => {
      if (name === 'album') { if (ui.dirty) render(); setTimeout(maybeCelebrate, 500); }
      else { $('#alb-viewer').hidden = true; ui.viewer = null; $('#alb-zoom').hidden = true; }
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#alb-zoom').hidden) $('#alb-zoom').click(); else if (ui.viewer) closeViewer(); } });
    if (root.AlbumDB && root.AlbumDB.available) {
      root.AlbumDB.all().then(rows => { rows.forEach(r => setImported(r.id, r.blob)); render(); }).catch(() => {});
    }
    render();
  }

  root.Album = { init, render, checkUnlocks, rewardText, stats: () => Logic.stats(CFG, S()), Logic };
})(typeof window !== 'undefined' ? window : globalThis);

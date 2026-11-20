/* Painting Our Memories: a colorless version of one of your album photos that she brings to life, one section at a time.
   Photo -> numbered sections (js/paint-engine.js) -> she mixes the right color into each section. */
(function () {
  const $ = s => document.querySelector(s);
  const PE = window.PaintEngine;
  const S = 3;                       // canvas pixels per working pixel (crisp lines, smooth upscaling of the painting)
  const WORK = 360;                  // longest side of the working image
  const DIFF_ORDER = [['relaxed', 'Relaxed'], ['detailed', 'Detailed'], ['masterpiece', 'Masterpiece']];
  const state = {
    src: null, level: 0, levelMode: false, diff: 'detailed', eng: null, W: 0, H: 0,
    selected: 0, painted: null, paintedCount: 0, remain: [], zoom: 1, hint: true, done: false, token: 0, params: null
  };
  const baseCv = document.createElement('canvas'), hintCv = document.createElement('canvas'), lineCv = document.createElement('canvas');
  let baseImg = null, hintImg = null, saveTimer = 0;
  const oldDone = () => { try { return JSON.parse(localStorage.getItem('alpou.paint.done') || '[]'); } catch (_) { return []; } };

  /* ---------- which photos can she paint? ---------- */
  function memoryPhotos() {
    const cfg = window.AlbumConfig; if (!cfg || !cfg.chapters) return [];
    const seen = new Map(), out = [];
    cfg.chapters.forEach(ch => ch.memories.forEach(m => {
      const path = cfg.photoPath(ch, m); if (!path) return;
      let e = seen.get(path);
      if (!e) { e = { key: path, path, title: m.title, chapter: ch.title, ids: [] }; seen.set(path, e); out.push(e); }
      e.ids.push(m.id);
    }));
    return out;
  }
  const unlockedSet = () => new Set((window.SaveStore && SaveStore.get().memories) || []);
  /* Journey levels use the photos in album order, round and round, with more detail each time round. */
  function photoForLevel(n) { const p = memoryPhotos(); return p.length ? p[(n - 1) % p.length] : null; }
  function levelInfo(n) {
    const lp = PE.levelParams(n), ph = photoForLevel(n);
    return { id: ph ? ph.key : 'memory', name: ph ? ph.title : 'A memory', emoji: '🖼️', regions: lp.regions, colors: lp.colors, colorCount: lp.colors, photo: ph };
  }

  /* ---------- loading the photo ---------- */
  async function importedUrl(entry) {      // a photo she imported from her own phone replaces the bundled one
    try {
      if (!window.AlbumDB || !AlbumDB.available) return null;
      const rows = await AlbumDB.all();
      const row = rows.find(r => entry.ids.includes(r.id));
      return row ? URL.createObjectURL(row.blob) : null;
    } catch (_) { return null; }
  }
  const loadImage = url => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => rej(new Error('photo')); im.src = url; });
  function toWorkImage(im) {
    const nw = im.naturalWidth || im.width, nh = im.naturalHeight || im.height, k = WORK / Math.max(nw, nh);
    const w = Math.max(8, Math.round(nw * k)), h = Math.max(8, Math.round(nh * k));
    // shrink in halves so big phone photos stay smooth instead of jagged
    let cur = im, cw = nw, ch = nh;
    while (cw / 2 > w * 1.5) {
      const c = document.createElement('canvas'); c.width = Math.round(cw / 2); c.height = Math.round(ch / 2);
      const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, c.width, c.height);
      cur = c; cw = c.width; ch = c.height;
    }
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, w, h);
    return { data: x.getImageData(0, 0, w, h).data, w, h };
  }

  /* ---------- saving her place (so a big painting survives closing the app) ---------- */
  const sessionKey = () => 'alpou.paint.s1.' + (state.levelMode ? 'L' + state.level : 'F.' + state.src.key + '.' + state.diff);
  function saveSession() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        const k = sessionKey();
        if (state.done || !state.paintedCount) { localStorage.removeItem(k); return; }
        const ids = []; for (let i = 1; i <= state.eng.regionCount; i++) if (state.painted[i]) ids.push(i);
        localStorage.setItem(k, JSON.stringify({ rc: state.eng.regionCount, ids }));
      } catch (_) { /* saving is a bonus */ }
    }, 300);
  }
  function restoreSession() {
    try {
      const raw = JSON.parse(localStorage.getItem(sessionKey()) || 'null');
      if (!raw || raw.rc !== state.eng.regionCount || !Array.isArray(raw.ids)) return;
      raw.ids.forEach(id => { if (id >= 1 && id <= raw.rc && !state.painted[id]) { state.painted[id] = 1; state.paintedCount++; state.remain[state.eng.regionColor[id]]--; PE.fillRegion(state.eng, id, true, baseImg.data); } });
    } catch (_) { /* start fresh */ }
  }

  /* ---------- picker ---------- */
  function renderPicker() {
    const diff = $('#paint-diff'), host = $('#paint-picker'); if (!host) return;
    diff.innerHTML = '<span>Detail</span>';
    DIFF_ORDER.forEach(([k, label]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.setAttribute('aria-pressed', String(state.diff === k));
      b.onclick = () => { state.diff = k; renderPicker(); }; diff.append(b);
    });
    const have = unlockedSet(); host.innerHTML = '';
    const photos = memoryPhotos(), open = photos.filter(p => p.ids.some(id => have.has(id)));
    if (!open.length) {
      const p = document.createElement('p'); p.className = 'note'; p.textContent = 'Your first memory is almost here. Keep playing and it will appear so you can paint it. Or start the painting levels on the Play path.'; host.append(p); return;
    }
    open.forEach(ph => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'paint-animal paint-memory';
      const img = document.createElement('img'); img.loading = 'lazy'; img.decoding = 'async'; img.alt = ''; img.src = ph.path;
      const t = document.createElement('strong'); t.textContent = ph.title;
      const sm = document.createElement('small'); sm.textContent = hasSession(ph) ? 'Continue painting' : 'Paint this memory';
      b.append(img, t, sm); b.onclick = () => startFree(ph); host.append(b);
    });
    const left = photos.length - open.length;
    if (left > 0) { const p = document.createElement('p'); p.className = 'note paint-more'; p.textContent = left + ' more ' + (left === 1 ? 'memory' : 'memories') + ' to paint as you unlock them in the album.'; host.append(p); }
  }
  function hasSession(ph) { try { return !!localStorage.getItem('alpou.paint.s1.F.' + ph.key + '.' + state.diff); } catch (_) { return false; } }

  /* ---------- workspace ---------- */
  function showPicker() {
    state.token++; state.src = null; state.eng = null; state.done = false;
    $('#paint-workspace').hidden = true; $('#paint-picker').hidden = false; $('#paint-diff').hidden = false;
    $('#paint-title').textContent = 'Choose a memory to paint'; renderPicker();
  }
  async function openPhoto(entry, params, levelMode, level) {
    const token = ++state.token;
    state.src = entry; state.levelMode = levelMode; state.level = level; state.params = params; state.done = false; state.eng = null;
    $('#paint-picker').hidden = true; $('#paint-diff').hidden = true; $('#paint-workspace').hidden = false;
    $('#paint-title').textContent = (levelMode ? 'Level ' + level + ' · ' : '') + entry.title;
    $('#paint-progress').textContent = 'Mixing your paints…'; $('#paint-palette-name').textContent = ''; $('#paint-palette').innerHTML = '';
    $('#paint-save').disabled = true; $('#animal-canvas').classList.add('loading');
    try {
      const url = (await importedUrl(entry)) || entry.path;
      const im = await loadImage(url);
      if (token !== state.token) return;
      await new Promise(r => setTimeout(r, 30));          // let the "mixing" message show before the heavy work
      const work = toWorkImage(im);
      const eng = PE.build(work, { regions: params.regions, colors: params.colors, seed: entry.key });
      if (token !== state.token) return;
      setup(eng);
    } catch (e) {
      console.error(e);
      if (token === state.token) { $('#paint-progress').textContent = 'This photo could not be opened.'; $('#animal-canvas').classList.remove('loading'); }
    }
  }
  function setup(eng) {
    state.eng = eng; state.W = eng.w; state.H = eng.h; state.zoom = 1; state.selected = 0; state.done = false;
    state.painted = new Uint8Array(eng.regionCount + 1); state.paintedCount = 0;
    state.remain = new Array(eng.palette.length).fill(0);
    for (let id = 1; id <= eng.regionCount; id++) state.remain[eng.regionColor[id]]++;
    baseCv.width = eng.w; baseCv.height = eng.h; hintCv.width = eng.w; hintCv.height = eng.h;
    baseImg = baseCv.getContext('2d').createImageData(eng.w, eng.h); hintImg = hintCv.getContext('2d').createImageData(eng.w, eng.h);
    for (let id = 1; id <= eng.regionCount; id++) PE.fillRegion(eng, id, false, baseImg.data);
    restoreSession();
    baseCv.getContext('2d').putImageData(baseImg, 0, 0);
    buildLines();
    $('.paint-canvas-wrap').style.setProperty('--ar', (eng.w / eng.h).toFixed(4));
    const cv = $('#animal-canvas'); cv.width = eng.w * S; cv.height = eng.h * S; cv.style.width = '100%'; cv.classList.remove('loading');
    state.selected = nextColor(-1);
    if (state.paintedCount === eng.regionCount) state.done = true;
    $('#paint-save').disabled = !state.done;
    buildPalette(); renderHint(); draw(); updateZoomLabel();
  }
  function startFree(entry) { const d = PE.DIFFICULTY[state.diff]; openPhoto(entry, { regions: d.regions, colors: d.colors }, false, 0); }
  function startLevel(n) {
    const info = levelInfo(n); if (!info.photo) return;
    state.levelMode = true; state.level = n;
    openPhoto(info.photo, { regions: info.regions, colors: info.colors }, true, n); Nav.go('paint');
  }

  function buildLines() {
    const { w, h, labels } = state.eng; lineCv.width = w * S; lineCv.height = h * S;
    const x = lineCv.getContext('2d'); x.clearRect(0, 0, lineCv.width, lineCv.height); x.fillStyle = 'rgba(84,68,104,.62)';
    for (let y = 0; y < h; y++) for (let px = 0; px < w; px++) {
      const p = y * w + px, l = labels[p];
      if (px < w - 1 && labels[p + 1] !== l) x.fillRect((px + 1) * S - 1, y * S, 2, S);
      if (y < h - 1 && labels[p + w] !== l) x.fillRect(px * S, (y + 1) * S - 1, S, 2);
    }
  }
  function nextColor(from) {            // the next color (after `from`) that still has sections to paint
    const k = state.remain.length;
    for (let i = 1; i <= k; i++) { const c = (from + i + k) % k; if (state.remain[c] > 0) return c; }
    return Math.max(0, from);
  }
  function buildPalette() {
    const host = $('#paint-palette'); host.innerHTML = '';
    state.eng.palette.forEach((col, i) => {
      const b = document.createElement('button'); b.type = 'button';
      const lum = 0.299 * col[0] + 0.587 * col[1] + 0.114 * col[2], left = state.remain[i];
      b.className = 'paint-swatch' + (i === state.selected ? ' active' : '') + (left === 0 ? ' finished' : '');
      b.style.setProperty('--swatch', 'rgb(' + col.join(',') + ')'); b.style.setProperty('--swatch-ink', lum > 150 ? '#4a3f55' : '#fff');
      b.setAttribute('aria-label', 'Color ' + (i + 1) + ', ' + left + ' sections left');
      b.innerHTML = '<span class="n">' + (left === 0 ? '✓' : i + 1) + '</span>' + (left ? '<span class="c">' + left + '</span>' : '');
      b.onclick = () => { state.selected = i; buildPalette(); renderHint(); draw(); };
      host.append(b);
    });
    $('#paint-palette-name').textContent = state.done ? 'All painted!' : 'Color ' + (state.selected + 1) + ' · ' + state.remain[state.selected] + ' left';
  }
  function renderHint() {
    const d = hintImg.data; d.fill(0);
    if (state.hint && !state.done) {
      const e = state.eng;
      for (let id = 1; id <= e.regionCount; id++) {
        if (state.painted[id] || e.regionColor[id] !== state.selected) continue;
        for (let k = e.start[id]; k < e.start[id + 1]; k++) { const o = e.order[k] * 4; d[o] = 176; d[o + 1] = 132; d[o + 2] = 232; d[o + 3] = 60; }
      }
    }
    hintCv.getContext('2d').putImageData(hintImg, 0, 0);
  }
  function draw() {
    const e = state.eng; if (!e) return;
    const cv = $('#animal-canvas'), ctx = cv.getContext('2d'), vw = cv.width, vh = cv.height;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(baseCv, 0, 0, vw, vh);
    if (!state.done) {
      if (state.hint) ctx.drawImage(hintCv, 0, 0, vw, vh);
      ctx.drawImage(lineCv, 0, 0);
      ctx.fillStyle = '#4a3f55'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let id = 1; id <= e.regionCount; id++) {
        if (state.painted[id]) continue;
        const size = Math.max(9, Math.min(26, e.cr[id] * S * 1.15));
        ctx.font = '700 ' + Math.round(size) + 'px sans-serif';
        ctx.fillText(String(e.regionColor[id] + 1), e.cx[id] * S + S / 2, e.cy[id] * S + S / 2);
      }
    }
    const total = e.regionCount, done = state.paintedCount, pct = Math.floor(done / total * 100);
    $('#paint-progress').textContent = state.done ? 'Painting complete!' : done + ' / ' + total + ' sections · ' + pct + '%';
  }
  function updateZoomLabel() { const el = $('#paint-zoom-level'); if (el) el.textContent = Math.round(state.zoom * 100) + '%'; }
  function setZoom(next) { state.zoom = Math.max(1, Math.min(3, next)); $('#animal-canvas').style.width = (state.zoom * 100) + '%'; updateZoomLabel(); }

  function paintAt(x, y) {
    const e = state.eng; if (!e || state.done) return;
    const id = e.labels[y * e.w + x]; if (!id || state.painted[id]) return;
    const need = e.regionColor[id];
    if (state.selected !== need) { $('#paint-palette-name').textContent = 'That section is color ' + (need + 1); return; }
    state.painted[id] = 1; state.paintedCount++; state.remain[need]--;
    PE.fillRegion(e, id, true, baseImg.data); baseCv.getContext('2d').putImageData(baseImg, 0, 0);
    if (state.paintedCount === e.regionCount) { state.done = true; }
    else if (state.remain[need] === 0) state.selected = nextColor(need);
    buildPalette(); renderHint(); draw(); saveSession();
    if (state.done) finish();
  }
  function finish() {
    $('#paint-save').disabled = false; $('#paint-title').textContent = (state.levelMode ? 'Level ' + state.level + ' · ' : '') + state.src.title + ' · painted!';
    if (!state.levelMode) { AppUI.toast('Your memory is painted. Save it if you like.'); return; }
    const n = state.level, info = levelInfo(n), stars = info.regions >= 140 ? 3 : info.regions >= 80 ? 2 : 1;
    const gain = AppUI.completePaintingLevel(n, stars);
    try { localStorage.setItem('alpou.paint.done', JSON.stringify([...new Set(oldDone().concat('L' + n))])); } catch (_) {}
    AppUI.openSheet(p => {
      const h = document.createElement('h3'); h.textContent = 'A little masterpiece!'; p.append(h);
      const q = document.createElement('p'); q.textContent = 'You painted ' + state.src.title + ' · ' + state.eng.regionCount + ' sections · ' + stars + ' stars' + (gain ? ' · +' + gain + ' new stars' : '') + '.'; p.append(q);
      const sv = document.createElement('button'); sv.className = 'btn btn-soft ws-wide'; sv.textContent = 'Save picture'; sv.onclick = savePng; p.append(sv);
      if (AppUI.hasNext('paint', n)) { const b = document.createElement('button'); b.className = 'btn btn-primary'; b.textContent = 'Next level'; b.onclick = () => AppUI.playNext('paint', n); p.append(b); }
      const back = document.createElement('button'); back.className = 'btn btn-soft ws-wide'; back.textContent = 'Back to levels'; back.onclick = () => { AppUI.closeSheet(); Nav.go('play'); }; p.append(back);
    }, 'Lovely!');
  }
  function savePng() {
    if (!state.done) return;
    const link = document.createElement('a'), cv = $('#animal-canvas');
    link.download = 'little-piece-painting' + (state.levelMode ? '-level-' + state.level : '') + '.png'; link.href = cv.toDataURL('image/png'); link.click();
  }

  /* ---------- wiring ---------- */
  const zoomIn = $('#paint-zoom-in'), zoomOut = $('#paint-zoom-out'), zoomReset = $('#paint-zoom-reset'), hintBtn = $('#paint-hint');
  if (zoomIn) zoomIn.addEventListener('click', () => setZoom(state.zoom + .25));
  if (zoomOut) zoomOut.addEventListener('click', () => setZoom(state.zoom - .25));
  if (zoomReset) zoomReset.addEventListener('click', () => setZoom(1));
  if (hintBtn) hintBtn.addEventListener('click', () => { state.hint = !state.hint; hintBtn.setAttribute('aria-pressed', String(state.hint)); renderHint(); draw(); });
  $('#animal-canvas').addEventListener('click', ev => {
    const e = state.eng; if (!e) return;
    const rect = ev.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.w - 1, Math.floor((ev.clientX - rect.left) / rect.width * e.w)));
    const y = Math.max(0, Math.min(e.h - 1, Math.floor((ev.clientY - rect.top) / rect.height * e.h)));
    paintAt(x, y);
  });
  $('#paint-save').addEventListener('click', savePng);
  Nav.onChange(name => { if (name === 'paint' && !state.levelMode) showPicker(); });
  document.addEventListener('click', e => { if (e.target.closest('[data-go="paint"]')) { state.levelMode = false; showPicker(); } });
  showPicker();
  window.Painting = { startLevel, levelInfo };
})();

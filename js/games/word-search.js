/* Word Search: puzzle engine (pure logic, testable in Node) + game screen controller. */
(function (root) {
  const DIRS = { E: [0, 1], W: [0, -1], S: [1, 0], N: [-1, 0], SE: [1, 1], NW: [-1, -1], NE: [-1, 1], SW: [1, -1] };
  const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  /* ================= ENGINE ================= */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, rnd) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const clean = w => String(w).toUpperCase().replace(/[^A-Z]/g, '');

  /* Same level always gets the same words. Own category first, other categories fill any gap. */
  function pickWords(cfg, pools, override) {
    if (override && override.length) return override.map(clean);
    const inRange = w => w.length >= cfg.minLen && w.length <= cfg.maxLen;
    const rnd = mulberry32(cfg.number * 7919 + 13);
    const own = shuffle((pools[cfg.category] || []).map(clean).filter(inRange), rnd);
    const others = shuffle(Object.keys(pools).filter(k => k !== cfg.category).flatMap(k => pools[k]).map(clean).filter(inRange), rnd);
    const out = [];
    for (const w of own.concat(others)) {
      if (out.length >= cfg.count) break;
      if (out.some(o => o === w || o.includes(w) || w.includes(o))) continue; // no duplicates or words inside words
      out.push(w);
    }
    return out;
  }

  function tryPlace(grid, word, size, dirKeys, rnd) {
    const byDir = [];
    dirKeys.forEach(key => {
      const [dr, dc] = DIRS[key], opts = [];
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) {
        const er = r + dr * (word.length - 1), ec = c + dc * (word.length - 1);
        if (er < 0 || ec < 0 || er >= size || ec >= size) continue;
        let fits = true;
        for (let i = 0; i < word.length; i++) {
          const ch = grid[r + dr * i][c + dc * i];
          if (ch && ch !== word[i]) { fits = false; break; }   // overlap only on identical letters
        }
        if (fits) opts.push([r, c]);
      }
      if (opts.length) byDir.push({ key, dr, dc, opts });
    });
    if (!byDir.length) return null;
    const d = byDir[Math.floor(rnd() * byDir.length)];       // pick a direction evenly, then a spot
    const [r, c] = d.opts[Math.floor(rnd() * d.opts.length)];
    for (let i = 0; i < word.length; i++) grid[r + d.dr * i][c + d.dc * i] = word[i];
    return { word, r, c, dr: d.dr, dc: d.dc, dir: d.key };
  }

  function generate(words, size, dirKeys, rnd) {
    rnd = rnd || Math.random;
    words = words.map(clean);
    if (words.some(w => w.length > size || w.length < 2)) throw new Error('Word does not fit the grid');
    const sorted = words.slice().sort((a, b) => b.length - a.length);
    for (let attempt = 0; attempt < 400; attempt++) {
      const grid = Array.from({ length: size }, () => Array(size).fill(''));
      const placements = [];
      let ok = true;
      for (const w of sorted) {
        const p = tryPlace(grid, w, size, dirKeys, rnd);
        if (!p) { ok = false; break; }
        placements.push(p);
      }
      if (!ok) continue;
      for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!grid[r][c]) grid[r][c] = ALPHA[Math.floor(rnd() * 26)];
      const puzzle = { size, grid, words: words.slice(), placements };
      verify(puzzle);
      return puzzle;
    }
    throw new Error('Could not generate puzzle');
  }

  /* Throws unless every word is really in the grid where the placement says it is. */
  function verify(p) {
    const seen = new Set();
    p.words.forEach(w => {
      const pl = p.placements.find(x => x.word === w);
      if (!pl) throw new Error('Missing placement: ' + w);
      let s = '';
      for (let i = 0; i < w.length; i++) {
        const r = pl.r + pl.dr * i, c = pl.c + pl.dc * i;
        if (r < 0 || c < 0 || r >= p.size || c >= p.size) throw new Error('Out of bounds: ' + w);
        s += p.grid[r][c];
      }
      if (s !== w) throw new Error('Mismatch: ' + w + ' vs ' + s);
      if (seen.has(w)) throw new Error('Duplicate word: ' + w);
      seen.add(w);
    });
    return true;
  }

  /* Straight line of cells from the start toward the pointer, snapped to the nearest of 8 directions. */
  function pathCells(r0, c0, r1, c1, size) {
    const dx = c1 - c0, dy = r1 - r0;
    if (!dx && !dy) return [[r0, c0]];
    const k = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
    const sx = Math.round(Math.cos(k * Math.PI / 4)), sy = Math.round(Math.sin(k * Math.PI / 4));
    const len = Math.max(0, Math.round((dx * sx + dy * sy) / (sx && sy ? 2 : 1)));
    const out = [];
    for (let i = 0; i <= len; i++) {
      const r = r0 + sy * i, c = c0 + sx * i;
      if (r < 0 || c < 0 || r >= size || c >= size) break;
      out.push([r, c]);
    }
    return out;
  }

  /* Returns the listed word spelled by these cells (either direction), or null. */
  function match(cells, grid, words) {
    if (!Array.isArray(cells) || cells.length < 2 || !Array.isArray(grid) || !grid.length) return null;
    const size = grid.length;
    if (cells.some(([r, c]) => !Number.isInteger(r) || !Number.isInteger(c) || r < 0 || c < 0 || r >= size || c >= size)) return null;
    const dr0 = cells[1][0] - cells[0][0], dc0 = cells[1][1] - cells[0][1];
    if (Math.abs(dr0) > 1 || Math.abs(dc0) > 1 || (!dr0 && !dc0)) return null;
    for (let i = 1; i < cells.length; i++) {
      if (cells[i][0] - cells[i - 1][0] !== dr0 || cells[i][1] - cells[i - 1][1] !== dc0) return null;
    }
    const s = cells.map(([r, c]) => grid[r][c]).join('');
    const rev = s.split('').reverse().join('');
    return words.find(w => w === s || w === rev) || null;
  }

  /* A seeded generator makes a level reproducible on replay and easier to test. */
  function seededRandom(seed) { return mulberry32(seed >>> 0); }

  /* Hints are intentionally forgiving: up to two hints do not reduce the reward. */
  const starsFor = hints => hints <= 2 ? 3 : hints <= 4 ? 2 : 1;

  const Engine = { DIRS, pickWords, generate, verify, pathCells, match, starsFor, seededRandom };
  if (typeof module !== 'undefined' && module.exports) module.exports = { Engine };
  if (typeof document === 'undefined') return;

  /* ================= GAME SCREEN ================= */
  const D = root.GameData, WSD = root.WordSearchData;
  const $ = s => document.querySelector(s);
  const UI = () => root.AppUI;
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const btn = (label, cls, fn) => { const b = el('button', 'btn ' + cls, label); b.onclick = fn; return b; };
  const LINES = ['That was lovely.', 'Every little piece found its place.', 'Nicely done, take a moment to enjoy that.', 'You found every last one.', 'Just right.'];

  const st = { n: 0, cfg: null, puzzle: null, found: new Map(), hints: 0, origin: null, sel: [], drag: false, done: false, cells: [], chips: {} };
  let grid, hintTimer;

  function start(n) {
    const cfg = WSD.levels[n - 1];
    if (!cfg) { UI().toast('That level is not ready yet'); return; }
    let puzzle;
    try { puzzle = Engine.generate(Engine.pickWords(cfg, WSD.pools, WSD.overrides[n]), cfg.size, cfg.dirs, Engine.seededRandom(n * 104729 + 17)); }
    catch (e) { console.error(e); UI().toast('Could not build this puzzle. Please try again.'); return; }
    Object.assign(st, { n, cfg, puzzle, found: new Map(), hints: 0, sel: [], drag: false, done: false });
    build();
    Nav.go('game');
  }

  function build() {
    const { cfg, puzzle } = st;
    $('#ws-title').textContent = 'Level ' + st.n;
    $('#ws-cat').textContent = cfg.category;
    grid.style.setProperty('--n', puzzle.size);
    grid.innerHTML = ''; st.cells = [];
    puzzle.grid.forEach(row => row.forEach(ch => { const d = el('div', 'ws-cell', ch); grid.appendChild(d); st.cells.push(d); }));
    const list = $('#ws-words'); list.innerHTML = ''; st.chips = {};
    puzzle.words.slice().sort().forEach(w => { const s = el('span', 'ws-chip', w); list.appendChild(s); st.chips[w] = s; });
    update();
  }

  function update() {
    const t = st.puzzle.words.length, f = st.found.size;
    $('#ws-count').textContent = f + ' of ' + t + ' found';
    $('#ws-fill').style.width = (f / t * 100) + '%';
    $('#ws-bar').setAttribute('aria-valuenow', Math.round(f / t * 100));
  }

  function cellAt(e) {
    const rect = grid.getBoundingClientRect(), n = st.puzzle.size;
    const c = Math.floor((e.clientX - rect.left) / rect.width * n), r = Math.floor((e.clientY - rect.top) / rect.height * n);
    return [Math.min(n - 1, Math.max(0, r)), Math.min(n - 1, Math.max(0, c))];
  }

  function paint() {
    const n = st.puzzle.size;
    st.cells.forEach(c => c.classList.remove('sel'));
    st.sel.forEach(([r, c]) => st.cells[r * n + c].classList.add('sel'));
  }

  function evaluate() {
    const sel = st.sel; st.sel = []; paint();
    if (sel.length < 2) return;
    const word = Engine.match(sel, st.puzzle.grid, st.puzzle.words);
    if (!word) return;
    if (st.found.has(word)) { UI().toast('Already found'); return; }
    markFound(word, sel);
  }

  function markFound(word, cells) {
    const n = st.puzzle.size, ci = st.found.size % 6;
    st.found.set(word, cells);
    if (root.SaveStore) SaveStore.addTo('secrets', 'words', word);   // lets word-based secrets be discovered
    cells.forEach(([r, c]) => { st.cells[r * n + c].className = 'ws-cell f' + ci + ' pop'; });
    st.chips[word].classList.add('found', 'pop');
    UI().Fx.tap(600 + st.found.size * 40);
    update();
    if (st.found.size === st.puzzle.words.length) setTimeout(complete, 700);
  }

  function complete() {
    st.done = true;
    const stars = Engine.starsFor(st.hints), lv = D.levels[st.n - 1];
    const gain = SaveStore.completeLevel('L' + st.n, stars);          // saves level + stars
    const albumMsg = root.Album ? root.Album.rewardText(root.Album.checkUnlocks()) : ''; // album unlock check
    const gardText = root.Garden ? root.Garden.takeGainText() : '';
    UI().Fx.tap(880);
    UI().openSheet(p => {
      p.appendChild(el('h3', '', 'You found them all'));
      const row = el('div', 'ws-stars');
      for (let i = 0; i < 3; i++) { const s = el('span', i < stars ? 'on' : '', '★'); s.style.animationDelay = (0.15 + i * 0.2) + 's'; row.appendChild(s); }
      p.appendChild(row);
      p.appendChild(el('p', '', LINES[st.n % LINES.length] + (gain ? ' +' + gain + (gain > 1 ? ' stars.' : ' star.') : '')));
      if (albumMsg) p.appendChild(el('p', 'ws-reward', albumMsg));
      else if (gardText) p.appendChild(el('p', 'ws-reward', gardText));
      if (UI().hasNext('word', st.n)) p.appendChild(btn('Next level', 'btn-primary', () => UI().playNext('word', st.n)));
      p.appendChild(btn('Back to levels', 'btn-soft ws-wide', () => { UI().closeSheet(); Nav.go('play'); }));
    }, 'Look at the board');
  }

  function init() {
    grid = $('#ws-grid');
    grid.addEventListener('pointerdown', e => {
      if (!st.puzzle || st.done) return;
      e.preventDefault();
      try { grid.setPointerCapture(e.pointerId); } catch (_) {}
      st.drag = true; st.origin = cellAt(e); st.sel = [st.origin]; paint();
    });
    grid.addEventListener('pointermove', e => {
      if (!st.drag) return;
      e.preventDefault();
      const cur = cellAt(e);
      st.sel = Engine.pathCells(st.origin[0], st.origin[1], cur[0], cur[1], st.puzzle.size); paint();
    });
    grid.addEventListener('pointerup', () => { if (st.drag) { st.drag = false; evaluate(); } });
    grid.addEventListener('pointercancel', () => { st.drag = false; st.sel = []; if (st.puzzle) paint(); });
    grid.addEventListener('contextmenu', e => e.preventDefault());

    $('#ws-menu').addEventListener('click', () => UI().openSheet(p => {
      p.appendChild(el('h3', '', 'Taking a break'));
      p.appendChild(el('p', '', 'There is no timer. Your puzzle will wait for you.'));
      p.appendChild(btn('New puzzle for this level', 'btn-soft ws-wide', () => { UI().closeSheet(); start(st.n); }));
      p.appendChild(btn('Back to levels', 'btn-soft ws-wide', () => { UI().closeSheet(); Nav.go('play'); }));
    }, 'Keep playing'));

    $('#ws-hint').addEventListener('click', () => {
      if (!st.puzzle || st.done) return;
      const left = st.puzzle.placements.filter(p => !st.found.has(p.word));
      if (!left.length) return;
      const p = left[Math.floor(Math.random() * left.length)];
      st.hints++;
      const cell = st.cells[p.r * st.puzzle.size + p.c];
      cell.classList.add('hint'); clearTimeout(hintTimer);
      hintTimer = setTimeout(() => cell.classList.remove('hint'), 3200);
      UI().toast('A word starts at the glowing letter'); UI().Fx.tap(500);
    });

    Nav.onChange(name => { if (name === 'game' && !st.puzzle) Nav.go('play'); });
  }

  init();
  root.WordSearch = { Engine, start };
})(typeof window !== 'undefined' ? window : globalThis);

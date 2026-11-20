/* App wiring: renders every screen from saved state. */
(function () {
  const D = GameData;
  const $ = (s, r = document) => r.querySelector(s);
  const make = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const icon = id => `<svg class="ic"><use href="#i-${id}"/></svg>`;
  const set = () => SaveStore.get().settings;

  /* ---------- feedback ---------- */
  const Fx = {
    ctx: null,
    tap(freq = 660) {
      if (set().sound) try {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        const c = this.ctx, o = c.createOscillator(), g = c.createGain(), t = c.currentTime;
        o.type = 'sine'; o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g).connect(c.destination); o.start(t); o.stop(t + 0.18);
      } catch (e) {}
      if (set().vibration && navigator.vibrate) try { navigator.vibrate(12); } catch (e) {}
    }
  };

  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2400);
  }

  function openSheet(build, closeLabel = 'Close') {
    const panel = $('#sheet-panel'); panel.innerHTML = ''; build(panel);
    const close = make('button', 'btn btn-quiet', closeLabel); close.onclick = closeSheet; panel.appendChild(close);
    $('#sheet').hidden = false;
  }
  function closeSheet() { $('#sheet').hidden = true; }
  window.AppUI = { Fx, toast, openSheet, closeSheet }; // used by the games

  /* ---------- progress ---------- */
  function percent() {
    const s = SaveStore.get();
    const al = Album.stats(), gs = Garden.stats(), done = Object.keys(s.levels).length + Object.keys(s.match.levels).length + Object.keys(s.paint.levels || {}).length + al.unlocked + gs.claimed;
    return Math.min(100, Math.round(done / (D.levels.length + D.matchLevels.length + D.paintLevels.length + al.total + gs.total) * 100));
  }

  /* ---------- renderers ---------- */
  function renderHome() {
    const s = SaveStore.get(), p = percent();
    $('#welcome').textContent = 'Welcome home, ' + (s.settings.playerName.trim() || 'love') + '. I made this little world just for you.';
    $('#home-percent').textContent = p + '%';
    $('#home-fill').style.width = p + '%';
    $('#home-bar').setAttribute('aria-valuenow', p);
    $('#home-stars').textContent = s.stars;
    $('#home-memories').textContent = Album.stats().unlocked;
    $('#home-garden').textContent = Garden.stats().blooms;
    Renovation.render();
  }

  /* ---------- the play path: Word Search and Match-3 take turns ---------- */
  const GAME_NAME = { word: 'Word Search', match: 'Match-3', paint: 'Painting' };
  const nodeRec = n => n.game === 'word' ? SaveStore.get().levels['L' + n.number] : n.game === 'match' ? SaveStore.get().match.levels['L' + n.number] : SaveStore.get().paint.levels['L' + n.number];
  const nodeIndex = (game, number) => D.journey.findIndex(n => n.game === game && n.number === number);
  const nodeOpen = i => i === 0 || !!nodeRec(D.journey[i]) || !!nodeRec(D.journey[i - 1]);
  const nodeReady = n => n.game === 'word' ? !!WordSearchData.levels[n.number - 1] : n.game === 'match' ? !!MatchData.levels[n.number - 1] : !!D.paintLevels[n.number - 1];
  function startNode(n) { closeSheet(); if (n.game === 'word') WordSearch.start(n.number); else if (n.game === 'match') MatchThree.start(n.number); else Painting.startLevel(n.number); }
  function hasNext(game, number) { const i = nodeIndex(game, number); return i >= 0 && i + 1 < D.journey.length && nodeReady(D.journey[i + 1]); }
  function playNext(game, number) { if (hasNext(game, number)) startNode(D.journey[nodeIndex(game, number) + 1]); else { closeSheet(); Nav.go('play'); } }
  window.AppUI.hasNext = hasNext; window.AppUI.playNext = playNext;

  function renderPlay() {
    const s = SaveStore.get(), map = $('#level-map'); map.innerHTML = '';
    $('#play-stars').textContent = s.stars; $('#play-max').textContent = D.maxStars;
    let currentMarked = false;
    D.journey.forEach((node, i) => {
      const rec = nodeRec(node), open = nodeOpen(i), name = GAME_NAME[node.game];
      const isCurrent = open && !rec && !currentMarked; if (isCurrent) currentMarked = true;
      const cell = make('div', 'level ' + (node.game === 'match' ? 'm ' : node.game === 'paint' ? 'p ' : 'w ') + (rec ? 'done' : isCurrent ? 'current' : open ? '' : 'locked'));
      const gameIcon = node.game === 'word' ? 'word' : node.game === 'match' ? 'gem' : 'paint';
      const b = make('button', '', (open ? String(i + 1) : icon('lock')) + '<span class="tag">' + (node.game === 'paint' ? '✿' : icon(gameIcon)) + '</span>');
      b.setAttribute('aria-label', 'Journey step ' + (i + 1) + ', ' + name + ' level ' + node.number + (rec ? ', ' + rec.stars + ' stars' : open ? '' : ', locked'));
      b.onclick = () => openNode(i);
      cell.appendChild(b);
      cell.appendChild(make('span', 'st', rec ? '★'.repeat(rec.stars) + '☆'.repeat(3 - rec.stars) : ''));
      map.appendChild(cell);
    });
  }

  function scrollToCurrent() {
    requestAnimationFrame(() => { const c = $('#level-map .level.current'); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'center' }); });
  }

  function openNode(i) {
    const node = D.journey[i];
    if (!nodeOpen(i)) { toast('Finish the step before it first'); return; }
    if (!nodeReady(node)) { toast('That level is not ready yet'); return; }
    Fx.tap(520);
    openSheet(p => {
      p.appendChild(make('h3', '', 'Journey step ' + (i + 1) + ' of ' + D.journey.length + ' · ' + GAME_NAME[node.game] + ' level ' + node.number));
      if (node.game === 'word') {
        const cfg = WordSearchData.levels[node.number - 1];
        p.appendChild(make('p', '', cfg.category + ': find ' + cfg.count + ' hidden words. No timer, no rush.'));
      } else if (node.game === 'match') {
        const cfg = MatchData.levels[node.number - 1];
        p.appendChild(make('p', '', cfg.objectives.map(MatchData.describe).join(', ') + '. You have ' + cfg.moves + ' moves.'));
      } else {
        const cfg = Painting.levelInfo(node.number);
        p.appendChild(make('p', '', 'Paint "' + cfg.name + '": about ' + cfg.regions + ' sections in ' + cfg.colors + ' colors. It starts colorless and comes to life as you paint. Your place is saved.'));
      }
      const go = make('button', 'btn btn-primary', 'Start');
      go.onclick = () => startNode(node);
      p.appendChild(go);
    });
  }

  function renderAlbum() { Album.render(); }

  function renderLetters() { Letters.render(); }

  function renderSettings() {
    const s = set();
    const name = $('#set-name'); if (document.activeElement !== name) name.value = s.playerName;
    $('#set-sound').checked = s.sound; $('#set-vibration').checked = s.vibration; $('#set-motion').checked = s.reduceMotion;
    document.documentElement.classList.toggle('reduce-motion', s.reduceMotion);
    $('#storage-note').textContent = SaveStore.isPersistent() ? 'Your progress is saved on this device.' : 'Saving is unavailable in this browser, so progress may be lost when you close the game.';
  }

  function updateConnectionStatus() {
    const el = $('#connection-status');
    if (!el) return;
    const offline = !navigator.onLine;
    el.hidden = !offline;
    el.textContent = offline ? 'You are offline — your saved game and downloaded content are still available.' : '';
  }

  async function exportBackup() {
    try {
      const payload = SaveStore.exportBackup();
      const text = JSON.stringify(payload, null, 2);
      const name = 'a-little-piece-of-us-backup-' + new Date().toISOString().slice(0, 10) + '.json';
      // On phones the share sheet is the dependable way to save a file (home-screen apps often ignore downloads).
      const phone = window.matchMedia && matchMedia('(pointer: coarse)').matches;
      if (phone && typeof File === 'function' && navigator.canShare && navigator.share) {
        const file = new File([text], name, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'A Little Piece of Us backup' }); toast('Progress backup ready'); return; }
          catch (err) { if (err && err.name === 'AbortError') return; /* sheet closed: nothing to do. Anything else: fall back to a download. */ }
        }
      }
      const blob = new Blob([text], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast('Progress backup created');
    } catch (err) { console.error(err); toast('Could not create the backup'); }
  }

  async function importBackupFile(file) {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast('That backup file is unusually large'); return; }
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!payload || payload.format !== 'a-little-piece-of-us-backup' || payload.backupVersion !== 1 || !payload.data) {
        throw new Error('This is not a supported game backup.');
      }
      const when = payload.exportedAt ? new Date(payload.exportedAt).toLocaleString() : 'an unknown date';
      const ok = confirm('Import this backup from ' + when + '? This will replace the current progress on this device. Export your current progress first if you want to keep it.');
      if (!ok) return;
      SaveStore.importBackup(payload);
      toast('Progress restored successfully');
    } catch (err) {
      console.error(err);
      toast(err instanceof SyntaxError ? 'The backup file could not be read' : (err.message || 'Could not restore this backup'));
    }
  }

  function renderAll() { renderHome(); renderPlay(); renderAlbum(); renderLetters(); Story.render(); Garden.render(); renderSettings(); }

  /* ---------- init ---------- */
  function init() {
    $('#app-version').textContent = D.version;
    $('#set-name').addEventListener('input', e => SaveStore.setSetting('playerName', e.target.value));
    $('#set-sound').addEventListener('change', e => SaveStore.setSetting('sound', e.target.checked));
    $('#set-vibration').addEventListener('change', e => SaveStore.setSetting('vibration', e.target.checked));
    $('#set-motion').addEventListener('change', e => SaveStore.setSetting('reduceMotion', e.target.checked));
    $('#export-backup').addEventListener('click', exportBackup);
    $('#import-backup').addEventListener('click', () => $('#backup-file').click());
    $('#backup-file').addEventListener('change', e => { importBackupFile(e.target.files && e.target.files[0]); e.target.value = ''; });
    window.addEventListener('online', updateConnectionStatus);
    window.addEventListener('offline', updateConnectionStatus);
    updateConnectionStatus();
    $('#reset-btn').addEventListener('click', () => {
      if (confirm('Start over? Puzzle and coloring levels and stars will be cleared. Your garden, home improvements, memories, letters, secrets and story chapters stay.')) { SaveStore.resetProgress(); toast('Fresh start'); }
    });
    $('#sheet').addEventListener('click', e => { if (e.target.id === 'sheet') closeSheet(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
    $('#nav').addEventListener('click', () => Fx.tap(600));
    Nav.onChange(closeSheet);
    Nav.onChange(name => { if (name === 'play') scrollToCurrent(); });
    Nav.onChange(name => {
      if (window.__alpouUpdatePending && !window.__alpouReloadingForUpdate && !['game', 'match', 'paint'].includes(name)) {
        window.__alpouReloadingForUpdate = true; window.location.reload();
      }
    });
    Nav.onChange(name => $('#app').classList.toggle('in-game', name === 'game' || name === 'match' || name === 'paint'));
    window.AppUI.completePaintingLevel = (number, stars) => SaveStore.completePaintingLevel('L' + number, stars);
    Album.init();
    Letters.init(); Story.init(); Garden.init();
    SaveStore.subscribe(renderAll);
    renderAll();
    Nav.init();

    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      let hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController && !window.__alpouReloadingForUpdate) {
          // Never reload in the middle of a puzzle: wait until she leaves the game screen.
          if (['game', 'match', 'paint'].includes(Nav.current())) { window.__alpouUpdatePending = true; }
          else { window.__alpouReloadingForUpdate = true; window.location.reload(); }
        }
        hadController = true;
      });
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
          if (navigator.onLine) reg.update().catch(() => {});
        }).catch(err => console.warn('Offline support could not be registered:', err));
      });
    }
  }
  init();
})();

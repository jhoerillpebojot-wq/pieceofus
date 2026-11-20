/* Centralized save system (SaveStore). Everything saves through here.
   - One versioned localStorage key, plus a backup copy of the previous save.
   - Every load is normalized against DEFAULTS: new fields get safe defaults,
     existing progress is never reset, unknown fields are preserved for later stages.
   - IndexedDB is intentionally not used yet (set up later for photos/large data). */
(function () {
  const KEY = 'alpou.save.v1';
  const BAK = KEY + '.bak';

  const DEFAULTS = {
    schema: 1,
    levels: {},        // Word Search: { L1: { stars: 3 } }
    match: { levels: {} }, // Match-3: { levels: { L1: { stars: 3 } } }
    paint: { levels: {} }, // Coloring challenges: { levels: { L1: { stars: 3 } } }
    memories: [],      // unlocked album memory ids (permanent)
    letters: { unlocked: [], read: [] },                       // letters she can read / has opened
    secrets: { found: [], seen: [], collected: [], words: [] }, // discovered secrets, hidden sparkles tapped, Word Search words found
    story: { unlocked: [], finished: [], page: {} },            // story chapters open / finished / last page read
    album: { chapters: [], seen: [], celebrated: [] }, // unlocked chapters, memories she has opened, chapter-complete screens shown
    garden: [],        // (old Stage 1 keepsake list, no longer used)
    garden2: { seeds: {}, decor: {}, claimed: [], areas: ['beginning'], plots: {}, spots: {}, seen: 0, progress: 0 }, // Little Garden (permanent)
    home: { spent: 0, completed: [], decor: {} }, // selectable room decorations
    stars: 0,          // total collected stars
    settings: { playerName: '', sound: true, vibration: true, reduceMotion: false },
    meta: { created: 0, lastPlayed: 0 }
  };

  const clone = o => JSON.parse(JSON.stringify(o));
  const listeners = [];
  let persistent = true;
  let memoryOnly = null; // fallback if localStorage is unavailable
  let state;

  /* Level ids must look like L1..Ln and (when the game data is loaded) exist, so a damaged or edited file cannot invent levels. */
  function levelOk(id, total) {
    const m = /^L([1-9]\d*)$/.exec(id);
    return !!m && (!total || Number(m[1]) <= total);
  }
  function levelTotals() {
    const gd = typeof window !== 'undefined' && window.GameData;
    return { word: gd && gd.levels ? gd.levels.length : 0, match: gd && gd.matchLevels ? gd.matchLevels.length : 0, paint: gd && gd.paintLevels ? gd.paintLevels.length : 0 };
  }

  function normalize(raw) {
    const s = clone(DEFAULTS), tot = levelTotals();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return s;

    if (raw.levels && typeof raw.levels === 'object') {
      for (const [id, v] of Object.entries(raw.levels)) {
        const n = Number(v && v.stars);
        if (levelOk(id, tot.word) && Number.isFinite(n)) s.levels[id] = { stars: Math.min(3, Math.max(0, Math.round(n))) };
      }
    }
    if (raw.match && raw.match.levels && typeof raw.match.levels === 'object') {
      for (const [id, v] of Object.entries(raw.match.levels)) {
        const n = Number(v && v.stars);
        if (levelOk(id, tot.match) && Number.isFinite(n)) s.match.levels[id] = { stars: Math.min(3, Math.max(0, Math.round(n))) };
      }
    }
    if (raw.paint && raw.paint.levels && typeof raw.paint.levels === 'object') {
      for (const [id, v] of Object.entries(raw.paint.levels)) {
        const n = Number(v && v.stars);
        if (levelOk(id, tot.paint) && Number.isFinite(n)) s.paint.levels[id] = { stars: Math.min(3, Math.max(0, Math.round(n))) };
      }
    }
    ['memories', 'garden'].forEach(k => {
      if (Array.isArray(raw[k])) s[k] = [...new Set(raw[k].filter(x => typeof x === 'string'))];
    });
    if (raw.album && typeof raw.album === 'object') {
      ['chapters', 'seen', 'celebrated'].forEach(k => {
        if (Array.isArray(raw.album[k])) s.album[k] = [...new Set(raw.album[k].filter(x => typeof x === 'string'))];
      });
    }
    const strs = a => Array.isArray(a) ? [...new Set(a.filter(x => typeof x === 'string'))] : null;
    [['letters', ['unlocked', 'read']], ['secrets', ['found', 'seen', 'collected', 'words']], ['story', ['unlocked', 'finished']]].forEach(([g, keys]) => {
      if (raw[g] && typeof raw[g] === 'object') keys.forEach(k => { const v = strs(raw[g][k]); if (v) s[g][k] = v; });
    });
    if (raw.story && raw.story.page && typeof raw.story.page === 'object') {
      for (const [id, n] of Object.entries(raw.story.page)) if (Number.isFinite(n) && n >= 0) s.story.page[id] = Math.floor(n);
    }
    if (raw.garden2 && typeof raw.garden2 === 'object') {
      const r = raw.garden2, g = s.garden2, num = o => { const out = {}; for (const [k, v] of Object.entries(o || {})) if (Number.isFinite(v) && v > 0) out[k] = Math.floor(v); return out; };
      g.seeds = num(r.seeds); g.decor = num(r.decor);
      g.claimed = strs(r.claimed) || []; g.areas = [...new Set(['beginning'].concat(strs(r.areas) || []))];
      for (const [a, pl] of Object.entries(r.plots || {})) { g.plots[a] = {}; for (const [i, v] of Object.entries(pl || {})) if (v && typeof v.t === 'string' && Number.isFinite(v.s)) g.plots[a][i] = { t: v.t, s: Math.min(3, Math.max(0, Math.floor(v.s))), lastWaterAt: Number.isFinite(v.lastWaterAt) ? v.lastWaterAt : 0 }; }
      for (const [a, sp] of Object.entries(r.spots || {})) { g.spots[a] = {}; for (const [i, v] of Object.entries(sp || {})) if (typeof v === 'string') g.spots[a][i] = v; }
      g.seen = Number.isFinite(r.seen) ? Math.max(0, Math.floor(r.seen)) : 0; g.progress = Number.isFinite(r.progress) ? Math.max(0, Math.floor(r.progress)) : 0;
    }
    if (raw.home && typeof raw.home === 'object') {
      s.home.spent = Number.isFinite(raw.home.spent) ? Math.max(0, Math.floor(raw.home.spent)) : 0;
      s.home.completed = strs(raw.home.completed) || [];
      if (raw.home.decor && typeof raw.home.decor === 'object') { for (const [k,v] of Object.entries(raw.home.decor)) if (typeof v === 'string') s.home.decor[k] = v; }
    }
    if (Number.isFinite(raw.stars)) s.stars = Math.max(0, Math.floor(raw.stars));
    if (raw.settings && typeof raw.settings === 'object') {
      for (const k of Object.keys(s.settings)) {
        if (typeof raw.settings[k] === typeof s.settings[k]) s.settings[k] = raw.settings[k];
      }
    }
    if (raw.meta && typeof raw.meta === 'object') {
      for (const k of Object.keys(s.meta)) if (Number.isFinite(raw.meta[k])) s.meta[k] = raw.meta[k];
    }
    // keep data added by future stages (word search, match-3, etc.)
    for (const k of Object.keys(raw)) if (!(k in s)) s[k] = raw[k];
    return s;
  }

  function read(key) {
    try { const t = localStorage.getItem(key); return t ? JSON.parse(t) : null; }
    catch (e) { return undefined; } // undefined = unreadable/corrupt
  }

  function load() {
    let raw = read(KEY);
    if (raw === undefined || raw === null) { const bak = read(BAK); if (bak) raw = bak; }
    state = normalize(raw);
    if (!state.meta.created) state.meta.created = Date.now();
    persist();
  }

  function persist() {
    try {
      const prev = localStorage.getItem(KEY);
      if (prev) localStorage.setItem(BAK, prev);
      localStorage.setItem(KEY, JSON.stringify(state));
      persistent = true;
    } catch (e) {
      persistent = false;
      memoryOnly = clone(state);
    }
  }

  function commit(quiet) {
    state.meta.lastPlayed = Date.now();
    persist();
    if (quiet) return;   // quiet = save without re-drawing screens
    listeners.forEach(fn => { try { fn(state); } catch (e) { console.error(e); } });
  }

  load();

  window.SaveStore = {
    get: () => state,
    isPersistent: () => persistent,
    subscribe: fn => listeners.push(fn),

    /* Records stars for a level (keeps best). Returns newly gained stars. */
    completeLevel(id, stars) {
      const s = Math.min(3, Math.max(1, Math.round(stars) || 1));
      const old = (state.levels[id] && state.levels[id].stars) || 0;
      const gain = Math.max(0, s - old);
      if (s > old) { state.levels[id] = { stars: s }; state.stars += gain; }
      else if (!state.levels[id]) state.levels[id] = { stars: old || s };
      commit();
      return gain;
    },

    /* Match-3 level result (keeps best stars). Returns newly gained stars. */
    completeMatchLevel(id, stars) {
      const s = Math.min(3, Math.max(1, Math.round(stars) || 1));
      const old = (state.match.levels[id] && state.match.levels[id].stars) || 0;
      const gain = Math.max(0, s - old);
      if (s > old) { state.match.levels[id] = { stars: s }; state.stars += gain; }
      commit();
      return gain;
    },

    completePaintingLevel(id, stars) {
      const s = Math.min(3, Math.max(1, Math.round(stars) || 1));
      const old = (state.paint.levels[id] && state.paint.levels[id].stars) || 0;
      const gain = Math.max(0, s - old);
      if (s > old) { state.paint.levels[id] = { stars: s }; state.stars += gain; }
      commit();
      return gain;
    },

    /* list: 'memories' | 'garden'. Returns true if newly unlocked. */
    unlock(list, id) {
      if (!Array.isArray(state[list]) || state[list].includes(id)) return false;
      state[list].push(id);
      commit();
      return true;
    },

    /* Album bookkeeping. list: 'chapters' | 'seen' | 'celebrated'. Returns true if newly added. */
    addTo(group, list, id) {
      const g = ['letters', 'secrets', 'story'].includes(group) ? state[group] : null;
      if (!g || !Array.isArray(g[list]) || typeof id !== 'string' || g[list].includes(id)) return false;
      g[list].push(id); commit();
      return true;
    },
    /* Remembers which page of a story chapter she was on. */
    storySet(id, page) { state.story.page[id] = Math.max(0, Math.floor(page) || 0); commit(true); },

    albumAdd(list, id) {
      if (!Array.isArray(state.album[list]) || typeof id !== 'string' || state.album[list].includes(id)) return false;
      state.album[list].push(id); commit();
      return true;
    },

    /* Little Garden: fn(state) edits state.garden2 (and nothing else). quiet = don't redraw screens. */
    gardenEdit(fn, quiet) { fn(state); commit(quiet); },

    setSetting(key, value) {
      if (!(key in state.settings) || typeof value !== typeof state.settings[key]) return;
      state.settings[key] = value;
      commit();
    },

    /* Matchington-style renovation: stars are earned once; spending never changes lifetime unlock totals. */
    completeHomeTask(id, cost) {
      if (typeof id !== 'string' || !id || state.home.completed.includes(id)) return false;
      const amount = Math.max(1, Math.floor(Number(cost) || 1));
      const balance = Math.max(0, state.stars - state.home.spent);
      if (balance < amount) return false;
      state.home.spent += amount;
      state.home.completed.push(id);
      commit();
      return true;
    },

    setHomeDecor(slot, choice, cost) {
      if (typeof slot !== 'string' || typeof choice !== 'string') return false;
      const amount = Math.max(1, Math.floor(Number(cost) || 1));
      if (state.home.decor[slot] === choice) return true;
      if (Math.max(0, state.stars - state.home.spent) < amount) return false;
      state.home.spent += amount; state.home.decor[slot] = choice; commit(); return true;
    },

    /* Portable progress backup. Imported data is normalized before it replaces the save. */
    exportBackup() {
      return {
        format: 'a-little-piece-of-us-backup',
        backupVersion: 1,
        exportedAt: new Date().toISOString(),
        data: clone(state)
      };
    },
    importBackup(payload) {
      if (!payload || typeof payload !== 'object' || payload.format !== 'a-little-piece-of-us-backup' || payload.backupVersion !== 1 || !payload.data || typeof payload.data !== 'object' || Array.isArray(payload.data)) {
        throw new Error('This file is not a valid A Little Piece of Us backup.');
      }
      const imported = normalize(payload.data);
      if (!imported.meta.created) imported.meta.created = Date.now();
      // The star total always equals the stars on the levels (that is how normal play adds them up).
      imported.stars = Object.values(imported.levels).concat(Object.values(imported.match.levels), Object.values(imported.paint.levels)).reduce((n, v) => n + v.stars, 0);
      state = imported;
      commit();
      return true;
    },

    /* Wipes levels and stars. Keeps settings and everything unlocked in the album. */
    resetProgress() {
      const settings = state.settings, created = state.meta.created, keep = ['memories', 'album', 'letters', 'secrets', 'story', 'garden2', 'home'].map(k => state[k]);
      state = clone(DEFAULTS);
      state.settings = settings; state.meta.created = created;
      ['memories', 'album', 'letters', 'secrets', 'story', 'garden2', 'home'].forEach((k, i) => { state[k] = keep[i]; });
      state.home.spent = 0;   // everything unlocked is permanent
      commit();
    }
  };
})();

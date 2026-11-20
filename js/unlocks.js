/* One rule format for letters, secrets and story chapters ("unlock": { ... }).
   Every key listed must be satisfied (AND). Leave unlock out (or null) for "always open".
     levels: 10         complete 10 levels (Word Search + Match-3 together)
     wordLevels: 5      complete 5 Word Search levels         matchLevels: 5   same for Match-3
     wordLevel: 7       finish Word Search level 7            matchLevel: 7    finish Match-3 level 7
     stars: 40          collect 40 stars in total
     chapter: 'chapter-2'   the album chapter is open (an array means all of them)
     memory: 'c1m1'     that album memory is unlocked         memories: 6   six album memories unlocked
     secret: 's-word'   that secret was discovered            secrets: 3    three secrets discovered
     letter: 'l2'       that letter is unlocked               garden: 3     three flowers planted   blooms: 5  five in full bloom
     word: 'HONEY'      that word was found in a Word Search  collectible: 'home-sparkle'   that hidden sparkle was found
   Unlocks are saved permanently, so nothing ever locks again. */
(function (root) {
  const COUNT_KEYS = ['levels', 'wordLevels', 'matchLevels', 'stars', 'memories', 'secrets', 'garden', 'blooms'];
  const ID_KEYS = ['wordLevel', 'matchLevel', 'chapter', 'memory', 'secret', 'letter', 'word', 'collectible'];
  const has = (a, v) => Array.isArray(a) && a.includes(v);
  const sc = st => st.secrets || {};

  function counts(st) {
    const w = Object.keys(st.levels || {}).length, m = Object.keys((st.match && st.match.levels) || {}).length;
    let mem = (st.memories || []).length;
    const cfg = root.AlbumConfig;
    if (cfg && cfg.chapters) { const ids = new Set(cfg.chapters.flatMap(c => c.memories.map(x => x.id))); mem = (st.memories || []).filter(x => ids.has(x)).length; }
    const pl = [].concat(...Object.values((st.garden2 && st.garden2.plots) || {}).map(a => Object.values(a)));
    return { word: w, match: m, total: w + m, memories: mem, planted: pl.length, blooms: pl.filter(x => x.s >= 3).length };
  }
  function one(k, v, st) {
    const c = counts(st);
    switch (k) {
      case 'levels': return c.total >= v;
      case 'wordLevels': return c.word >= v;
      case 'matchLevels': return c.match >= v;
      case 'stars': return (st.stars || 0) >= v;
      case 'wordLevel': return !!(st.levels && st.levels['L' + v]);
      case 'matchLevel': return !!(st.match && st.match.levels && st.match.levels['L' + v]);
      case 'chapter': return has(st.album && st.album.chapters, v);
      case 'memory': return has(st.memories, v);
      case 'memories': return c.memories >= v;
      case 'secret': return has(sc(st).found, v);
      case 'secrets': return (sc(st).found || []).length >= v;
      case 'letter': return has(st.letters && st.letters.unlocked, v);
      case 'garden': return c.planted >= v;
      case 'blooms': return c.blooms >= v;
      case 'word': return has(sc(st).words, String(v).toUpperCase());
      case 'collectible': return has(sc(st).collected, v);
      default: return false;
    }
  }
  const Unlocks = {
    COUNT_KEYS, ID_KEYS,
    check(spec, st) {
      if (!spec) return true;
      return Object.keys(spec).every(k => COUNT_KEYS.includes(k) ? one(k, spec[k], st) : [].concat(spec[k]).every(x => one(k, x, st)));
    },
    /* "complete 10 levels (6 to go)" style text for locked things. */
    describe(spec, st, chapterTitle) {
      if (!spec) return '';
      const c = counts(st), left = (v, have) => v - have > 0 ? ' (' + (v - have) + ' to go)' : '';
      const parts = [];
      Object.keys(spec).forEach(k => {
        const v = spec[k];
        if (k === 'levels') parts.push('complete ' + v + ' level' + (v === 1 ? '' : 's') + left(v, c.total));
        else if (k === 'wordLevels') parts.push('finish ' + v + ' Word Search levels' + left(v, c.word));
        else if (k === 'matchLevels') parts.push('finish ' + v + ' Match-3 levels' + left(v, c.match));
        else if (k === 'stars') parts.push('collect ' + v + ' stars' + left(v, st.stars || 0));
        else if (k === 'wordLevel') parts.push('finish Word Search level ' + v);
        else if (k === 'matchLevel') parts.push('finish Match-3 level ' + v);
        else if (k === 'chapter') [].concat(v).forEach(id => parts.push('open the album chapter \u201c' + (chapterTitle ? chapterTitle(id) : id) + '\u201d'));
        else if (k === 'memory') parts.push('unlock a certain album memory');
        else if (k === 'memories') parts.push('unlock ' + v + ' album memories' + left(v, c.memories));
        else if (k === 'secret') parts.push('discover a certain secret');
        else if (k === 'secrets') parts.push('discover ' + v + ' secrets' + left(v, (sc(st).found || []).length));
        else if (k === 'letter') parts.push('open another letter');
        else if (k === 'garden') parts.push('plant ' + v + ' flowers' + left(v, c.planted));
        else if (k === 'blooms') parts.push('grow ' + v + ' flowers in full bloom' + left(v, c.blooms));
        else if (k === 'word') [].concat(v).forEach(w => parts.push('find the word \u201c' + String(w).toUpperCase() + '\u201d in Word Search'));
        else if (k === 'collectible') parts.push('find a hidden sparkle');
      });
      return parts.join(' and ');
    },
    /* Problems in a rule (empty = fine). */
    validate(spec, label) {
      const out = [];
      if (spec === null || spec === undefined) return out;
      if (typeof spec !== 'object' || Array.isArray(spec)) return [label + ': unlock must be an object like { levels: 10 }'];
      Object.keys(spec).forEach(k => {
        if (!COUNT_KEYS.includes(k) && !ID_KEYS.includes(k)) out.push(label + ': unknown unlock rule "' + k + '"');
        else if (COUNT_KEYS.includes(k) && !(Number.isFinite(spec[k]) && spec[k] >= 0)) out.push(label + ': "' + k + '" must be a number');
      });
      return out;
    }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Unlocks; else root.Unlocks = Unlocks;
})(typeof window !== 'undefined' ? window : globalThis);

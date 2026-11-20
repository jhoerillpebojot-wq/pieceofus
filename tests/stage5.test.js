const assert = require('assert');
const U = require('../js/unlocks.js');
const L = require('../js/data/letters.js'), S = require('../js/data/secrets.js'), T = require('../js/data/story.js');
const { Logic } = require('../js/letters.js'), { Logic: SL } = require('../js/story.js');
const WS = require('../js/games/word-search.js').Engine, WSD = require('../js/games/word-search-levels.js');
const AC = require('../js/album-config.js');

const st = (o = {}) => ({ levels: {}, match: { levels: {} }, stars: 0, memories: [], garden: [],
  album: { chapters: [] }, letters: { unlocked: [], read: [] }, secrets: { found: [], seen: [], collected: [], words: [] }, story: { unlocked: [], finished: [], page: {} }, ...o });
const lv = (w, m = 0) => ({ levels: Object.fromEntries(Array.from({ length: w }, (_, i) => ['L' + (i + 1), { stars: 1 }])), match: { levels: Object.fromEntries(Array.from({ length: m }, (_, i) => ['L' + (i + 1), { stars: 1 }])) } });
const ids = (items, state, have = []) => Logic.pending(items, have, state).map(i => i.id);

/* ---- rule engine ---- */
assert(U.check(null, st()) && U.check(undefined, st()), 'no rule = always open');
assert(!U.check({ levels: 3 }, st(lv(2))) && U.check({ levels: 3 }, st(lv(2, 1))), 'levels counts both games');
assert(U.check({ wordLevels: 2 }, st(lv(2))) && !U.check({ wordLevels: 3 }, st(lv(2, 5))));
assert(U.check({ matchLevels: 2 }, st(lv(0, 2))));
assert(U.check({ stars: 5 }, st({ stars: 5 })) && !U.check({ stars: 5 }, st({ stars: 4 })));
assert(U.check({ wordLevel: 3 }, st(lv(3))) && !U.check({ wordLevel: 4 }, st(lv(3))));
assert(U.check({ matchLevel: 2 }, st(lv(0, 2))) && !U.check({ matchLevel: 3 }, st(lv(0, 2))));
assert(U.check({ chapter: 'c' }, st({ album: { chapters: ['c'] } })) && !U.check({ chapter: ['c', 'd'] }, st({ album: { chapters: ['c'] } })), 'array = all of them');
assert(U.check({ word: 'honey' }, st({ secrets: { words: ['HONEY'], found: [], collected: [] } })), 'words are case-insensitive');
assert(U.check({ collectible: 'x' }, st({ secrets: { collected: ['x'], found: [], words: [] } })));
assert(U.check({ secret: 'a', secrets: 2 }, st({ secrets: { found: ['a', 'b'], collected: [], words: [] } })));
assert(U.check({ levels: 1, stars: 2 }, st({ ...lv(1), stars: 2 })) && !U.check({ levels: 1, stars: 2 }, st({ ...lv(1), stars: 1 })), 'several rules must all hold');
assert(!U.check({ bogus: 1 }, st()), 'unknown rule never unlocks');
assert(/complete 10 levels \(7 to go\)/.test(U.describe({ levels: 10 }, st(lv(3)))), U.describe({ levels: 10 }, st(lv(3))));
assert(/\u201cHONEY\u201d/.test(U.describe({ word: 'honey' }, st())));
assert(/Little Moments/.test(U.describe({ chapter: 'chapter-2' }, st(), id => AC.chapters.find(c => c.id === id).title)));
assert.deepStrictEqual(U.validate({ levels: 10 }, 'x'), []); assert(U.validate({ lvls: 10 }, 'x').length === 1); assert(U.validate({ levels: 'ten' }, 'x').length === 1);

/* ---- the shipped config files are valid ---- */
assert.deepStrictEqual(Logic.problems(L, S, T), [], Logic.problems(L, S, T).join('\n'));
const bad = JSON.parse(JSON.stringify(L)); bad.letters[1].id = bad.letters[0].id; bad.letters[2].unlock = { nope: 1 }; bad.letters[3].body = '';
assert(Logic.problems(bad, S, T).length >= 3, 'problems are reported');
const badS = JSON.parse(JSON.stringify(S)); badS.collectibles[0].screen = 'moon'; badS.secrets[1].unlock = { collectible: 'ghost' };
assert(Logic.problems(L, badS, T).length >= 2);

/* ---- letters unlock on progress ---- */
assert.deepStrictEqual(ids(L.letters, st()), ['l-hello'], 'start: only the letter with no requirement');
assert(ids(L.letters, st(lv(3))).includes('l-beside') && !ids(L.letters, st(lv(2))).includes('l-beside'), '3 levels -> 2nd letter');
assert(ids(L.letters, st({ ...lv(0), stars: 20 })).includes('l-reminder'), 'stars rule');
assert(ids(L.letters, st({ album: { chapters: ['chapter-2'] } })).includes('l-apart'), 'album chapter rule');
assert(ids(L.letters, st({ secrets: { found: ['s-sparkle'], seen: [], collected: [], words: [] } })).includes('l-found'), 'secret rule');
assert(ids(L.letters, st(lv(10, 10))).includes('l-words') && ids(L.letters, st(lv(10, 10))).includes('l-sweet'), 'game-specific level rules');
/* nothing unlocks twice or re-locks */
assert.deepStrictEqual(ids(L.letters, st(lv(60, 60)), L.letters.map(l => l.id)), []);
assert.deepStrictEqual(ids(L.letters, st(), ['l-beside', 'l-time']), ['l-hello'], 'already-unlocked letters are not touched when progress drops');

/* ---- secrets ---- */
const sid = state => ids(S.secrets, state);
assert.deepStrictEqual(sid(st()), [], 'no secrets at the start');
assert(sid(st({ secrets: { words: ['HONEY'], found: [], seen: [], collected: [] } })).includes('s-word'), 'finding the word reveals its secret');
assert(sid(st({ secrets: { collected: ['home-sparkle'], found: [], seen: [], words: [] } })).includes('s-sparkle'), 'hidden collectible');
assert(sid(st(lv(0, 5))).includes('s-match') && !sid(st(lv(0, 4))).includes('s-match'), 'Match-3 level 5');
assert(sid(st({ album: { chapters: ['chapter-2'] } })).includes('s-chapter'), 'album chapter');
assert(sid(st({ secrets: { found: ['a', 'b', 'c', 'd', 'e'], seen: [], collected: [], words: [] } })).includes('s-five'), 'secret count chains');
/* every placeholder secret/letter/chapter can actually be reached */
const albumIds = new Set(AC.chapters.map(c => c.id));
[...S.secrets, ...L.letters, ...T.chapters].forEach(i => { [].concat((i.unlock && i.unlock.chapter) || []).forEach(c => assert(albumIds.has(c), i.id + ' needs a real album chapter')); });
const l1 = WSD.levels.slice(0, 30).flatMap(c => WS.pickWords(c, WSD.pools, WSD.overrides[c.number]));
S.secrets.forEach(s => { if (s.unlock && s.unlock.word) assert(l1.includes(String(s.unlock.word).toUpperCase()), s.id + ': word never appears in Word Search'); });
assert(WS.pickWords(WSD.levels[0], WSD.pools).includes('HONEY'), 'the placeholder word is in level 1, so the first secret is easy to find');

/* ---- story ---- */
assert.deepStrictEqual(Logic.pending(T.chapters, [], st()).map(c => c.id), ['st-1']);
assert(Logic.pending(T.chapters, ['st-1'], st(lv(8))).map(c => c.id).includes('st-2'));
assert(!Logic.pending(T.chapters, ['st-1'], st(lv(7, 0))).map(c => c.id).includes('st-2'));
assert.deepStrictEqual(T.chapters.map(c => c.title), ['How It Started', 'The Little Things', 'My Favorite Memories', 'Things I Want Us to Experience', 'Our Next Chapter']);
assert.deepStrictEqual(SL.pages({ pages: ['a', { title: 'T', text: 'b' }] }), [{ title: '', text: 'a' }, { title: 'T', text: 'b' }]);
assert(T.chapters.every(c => SL.pages(c).length >= 3 && SL.pages(c).every(p => p.text.trim())));

/* ---- saving: permanence, persistence, quiet saves, older saves ---- */
const mem = {}; global.window = global;
global.localStorage = { getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const load = () => { delete require.cache[require.resolve('../js/storage.js')]; delete global.SaveStore; require('../js/storage.js'); return global.SaveStore; };
let Sv = load(), calls = 0; Sv.subscribe(() => calls++);
assert(Sv.addTo('letters', 'unlocked', 'l-hello')); assert(!Sv.addTo('letters', 'unlocked', 'l-hello'), 'no duplicates');
assert(Sv.addTo('letters', 'read', 'l-hello')); assert(Sv.addTo('secrets', 'found', 's-word')); assert(Sv.addTo('secrets', 'words', 'HONEY')); assert(Sv.addTo('secrets', 'collected', 'home-sparkle'));
assert(Sv.addTo('story', 'unlocked', 'st-1')); assert(!Sv.addTo('levels', 'x', 'y'), 'only the three groups are writable'); assert(!Sv.addTo('story', 'bogus', 'y'));
const before = calls; Sv.storySet('st-1', 2); assert.strictEqual(calls, before, 'page position saves quietly (no screen redraw)');
Sv.completeLevel('L1', 3);
Sv = load();
const g = Sv.get();
assert(g.letters.unlocked.includes('l-hello') && g.letters.read.includes('l-hello') && g.secrets.found.includes('s-word') && g.secrets.words.includes('HONEY') && g.secrets.collected.includes('home-sparkle') && g.story.unlocked.includes('st-1'), 'everything persists after reopening');
assert.strictEqual(g.story.page['st-1'], 2, 'reading position persists');
Sv.resetProgress();
assert(Sv.get().letters.unlocked.includes('l-hello') && Sv.get().secrets.found.includes('s-word') && Sv.get().story.unlocked.includes('st-1') && Sv.get().story.page['st-1'] === 2, 'Start over keeps letters, secrets and story');
assert.deepStrictEqual(Sv.get().levels, {});
mem['alpou.save.v1'] = JSON.stringify({ levels: { L1: { stars: 1 } }, secrets: { found: ['x', 7, null], words: 'oops' }, story: { page: { a: -3, b: 2 } } });   // damaged / old save
Sv = load();
assert.deepStrictEqual(Sv.get().secrets.found, ['x'], 'bad entries are dropped'); assert.deepStrictEqual(Sv.get().secrets.words, []);
assert.deepStrictEqual(Sv.get().story.page, { b: 2 }); assert.deepStrictEqual(Sv.get().letters, { unlocked: [], read: [] }, 'older saves gain empty letters');
console.log('stage 5 logic OK');

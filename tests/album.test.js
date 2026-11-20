const assert = require('assert');
const CFG = require('../js/album-config.js');
const { Logic: L } = require('../js/album.js');

const st = (word, match, memories = [], chapters = []) => ({
  levels: Object.fromEntries(Array.from({ length: word }, (_, i) => ['L' + (i + 1), { stars: 1 }])),
  match: { levels: Object.fromEntries(Array.from({ length: match }, (_, i) => ['L' + (i + 1), { stars: 1 }])) },
  memories, album: { chapters, seen: [], celebrated: [] }
});
const ids = (word, match = 0) => { const u = L.computeUnlocks(CFG, st(word, match)); return { m: u.memories, c: u.chapters }; };

/* shipped config is valid */
assert.deepStrictEqual(L.validate(CFG), [], 'config problems: ' + L.validate(CFG));
assert.strictEqual(CFG.chapters.length, 7);
assert.strictEqual(CFG.chapters.slice(0, 6).reduce((n, c) => n + c.memories.length, 0), 39, 'every distinct bundled photo is represented in the six photo chapters');
assert(CFG.chapters.every(c => c.memories.every(m => m.photo)), 'every album memory has a configured photo');
assert.deepStrictEqual(CFG.chapters.slice(0, 6).map(c => c.title), ['Our Beginning', 'Little Moments', 'Our Adventures', 'My Favorite Person', 'Memories I Treasure', 'More Memories to Come']);
const total = CFG.chapters.reduce((a, c) => a + c.memories.length, 0);

/* the suggested reward schedule */
assert.deepStrictEqual(ids(0), { m: [], c: ['chapter-1'] }, 'start: only chapter 1 is open, no memories');
assert.deepStrictEqual(ids(2).m, [], '2 levels: nothing yet');
assert.deepStrictEqual(ids(3).m, ['c1m1'], '3 levels: first memory');
assert.deepStrictEqual(ids(5).m, ['c1m1', 'c1m2'], '5 levels: second memory');
let r = ids(10); assert(r.c.includes('chapter-2') && r.m.includes('c2m1'), '10 levels: next chapter opens');
assert(!ids(14).m.includes('c1m4') && ids(15).m.includes('c1m4'), '15 levels: another memory');
r = ids(20); assert(r.c.includes('chapter-3') && r.m.includes('c3m1'), '20 levels: another chapter');
r = ids(30); assert(r.c.includes('special') && r.m.includes('sp1'), '30 levels: special collection');
assert(!ids(29).c.includes('special'), 'special collection not before 30');
assert.strictEqual(ids(60).m.length, total, 'everything unlocks by 60 total levels');
/* progress counting modes + both games count */
assert.deepStrictEqual(ids(1, 2).m, ['c1m1'], 'Word Search + Match-3 levels add up (total mode)');
const wordOnly = { ...CFG, settings: { ...CFG.settings, progressCounts: 'word' } };
assert.deepStrictEqual(L.computeUnlocks(wordOnly, st(1, 5)).memories, [], "'word' mode ignores Match-3");
assert.deepStrictEqual(L.computeUnlocks({ ...CFG, settings: { ...CFG.settings, progressCounts: 'match' } }, st(0, 3)).memories, ['c1m1']);
/* a memory never unlocks before its chapter */
const early = { ...CFG, chapters: [{ id: 'a', title: 'A', unlockAt: 10, memories: [{ id: 'a1', title: 'x', unlockAt: 2 }] }], settings: CFG.settings, photoPath: CFG.photoPath };
assert.deepStrictEqual(L.computeUnlocks(early, st(5, 0)).memories, [], 'locked chapter holds its memories back');
assert.deepStrictEqual(L.computeUnlocks(early, st(10, 0)).memories, ['a1']);

/* permanence: progress dropping never removes anything */
const kept = st(0, 0, ['c1m1', 'c1m2', 'c2m1'], ['chapter-1', 'chapter-2']);
assert.deepStrictEqual(L.computeUnlocks(CFG, kept).memories, [], 'nothing to re-unlock');
const s2 = L.stats(CFG, kept);
assert.strictEqual(s2.unlocked, 3, 'unlocked memories stay counted after a progress reset');
assert(s2.chapters[0].open && s2.chapters[1].open && !s2.chapters[2].open);
assert.strictEqual(L.stats(CFG, st(0, 0, ['M1', 'M16', 'ghost'])).unlocked, 0, 'old placeholder ids are ignored');

/* stats and completion */
const all = CFG.chapters.flatMap(c => c.memories.map(m => m.id));
const full = L.stats(CFG, st(0, 0, all, CFG.chapters.map(c => c.id)));
assert.strictEqual(full.unlocked, total); assert.strictEqual(full.pct, 100); assert(full.chapters.every(c => c.complete && c.pct === 100));
const part = L.stats(CFG, st(0, 0, ['c1m1', 'c1m2']));
assert.strictEqual(part.chapters[0].pct, 40); assert(!part.chapters[0].complete);
const nx = L.nextUnlock(CFG, st(4, 0, ['c1m1']));
assert.strictEqual(nx.memory.id, 'c1m2'); assert.strictEqual(nx.left, 1);

/* every bundled photo reference resolves to a real local file */
const fs = require('fs');
for (const c of CFG.chapters) for (const m of c.memories) if (m.photo) assert.ok(fs.existsSync(CFG.photoPath(c, m)), `${m.id} missing photo ${CFG.photoPath(c,m)}`);
assert.strictEqual(new Set(CFG.allPhotoPaths()).size, 39, 'all 39 distinct photo files are referenced once across the album chapters');

/* photo paths and validation */
const ch = { id: 'chapter-1', folder: 'chapter-1' };
assert.strictEqual(CFG.photoPath(ch, { photo: '' }), '');
assert.strictEqual(CFG.photoPath(ch, { photo: 'us.jpg' }), 'assets/memories/chapter-1/us.jpg');
assert.strictEqual(CFG.photoPath(ch, { photo: 'chapter-3/trip.webp' }), 'assets/memories/chapter-3/trip.webp');
assert.strictEqual(CFG.photoPath(ch, { photo: 'assets/memories/special/a.png' }), 'assets/memories/special/a.png');
assert.strictEqual(CFG.photoPath(ch, { photo: 'https://example.com/a.jpg' }), '', 'online URLs are refused');
const bad = JSON.parse(JSON.stringify(CFG)); bad.photoPath = CFG.photoPath;
bad.chapters[0].memories[1].id = 'c1m1'; bad.chapters[0].memories[0].photo = 'x.gif'; bad.chapters[0].memories[2].photo = 'http://a/b.jpg'; bad.settings.progressCounts = 'daily';
const problems = L.validate(bad).join('|');
assert(/duplicate/.test(problems) && /\.jpg, \.jpeg, \.png or \.webp/.test(problems) && /web address/.test(problems) && /progressCounts/.test(problems), problems);
['jpg', 'jpeg', 'png', 'webp', 'JPG'].forEach(e => { const c = JSON.parse(JSON.stringify(CFG)); c.photoPath = CFG.photoPath; c.chapters[0].memories[0].photo = 'a.' + e; assert.deepStrictEqual(L.validate(c), [], e + ' accepted'); });

/* saving: permanence through reload + reset, old saves still load */
const mem = {}; global.window = global;
global.localStorage = { getItem: k => k in mem ? mem[k] : null, setItem: (k, v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
const load = () => { delete require.cache[require.resolve('../js/storage.js')]; delete global.SaveStore; require('../js/storage.js'); return global.SaveStore; };
let S = load();
assert(S.unlock('memories', 'c1m1')); assert(!S.unlock('memories', 'c1m1'), 'no duplicates');
assert(S.albumAdd('chapters', 'chapter-1')); assert(S.albumAdd('seen', 'c1m1')); assert(S.albumAdd('celebrated', 'chapter-1')); assert(!S.albumAdd('seen', 'c1m1'));
assert(!S.albumAdd('bogus', 'x'));
S.completeLevel('L1', 3);
S = load();
assert(S.get().memories.includes('c1m1') && S.get().album.chapters.includes('chapter-1') && S.get().album.seen.includes('c1m1') && S.get().album.celebrated.includes('chapter-1'), 'album state persists after reopening');
S.resetProgress();
assert(S.get().memories.includes('c1m1') && S.get().album.chapters.includes('chapter-1'), 'Start over keeps unlocked memories');
assert.deepStrictEqual(S.get().levels, {}, 'Start over clears levels');
mem['alpou.save.v1'] = JSON.stringify({ levels: { L1: { stars: 2 } }, memories: ['M1', 'M2'], stars: 2 });   // a Stage 3 save
S = load();
assert.deepStrictEqual(S.get().album, { chapters: [], seen: [], celebrated: [] }, 'older saves gain an empty album');
assert.deepStrictEqual(S.get().levels, { L1: { stars: 2 } });
console.log('album OK (' + total + ' memories in ' + CFG.chapters.length + ' chapters)');

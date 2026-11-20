const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const values = new Map();
const localStorage = {
  getItem: key => values.has(key) ? values.get(key) : null,
  setItem: (key, value) => values.set(key, String(value)),
  removeItem: key => values.delete(key)
};
const window = { GameData: { levels: Array(100), matchLevels: Array(100), paintLevels: Array(100) } };
vm.runInNewContext(fs.readFileSync('js/storage.js', 'utf8'), {
  window, localStorage, Date, JSON, Math, Number, Object, Array, Set, console
});
const store = window.SaveStore;
store.completeLevel('L1', 3);
store.completePaintingLevel('L1', 2);
store.setSetting('playerName', 'Love');
const backup = store.exportBackup();
assert.strictEqual(backup.format, 'a-little-piece-of-us-backup');
assert.strictEqual(backup.data.levels.L1.stars, 3);
assert.strictEqual(backup.data.paint.levels.L1.stars, 2);
store.completeLevel('L2', 2);
assert.ok(store.get().levels.L2);
store.importBackup(backup);
assert.ok(store.get().levels.L1);
assert.strictEqual(store.get().levels.L2, undefined);
assert.strictEqual(store.get().paint.levels.L1.stars, 2);
assert.strictEqual(store.get().settings.playerName, 'Love');
assert.throws(() => store.importBackup({ data: {} }), /valid A Little Piece/);
console.log('stage 7 backup export/import OK');

const manifest = JSON.parse(fs.readFileSync('manifest.json', 'utf8'));
assert.strictEqual(manifest.name, 'A Little Piece of Us');
assert.strictEqual(manifest.display, 'standalone');
assert.strictEqual(manifest.orientation, 'landscape');
const sw = fs.readFileSync('sw.js', 'utf8');
assert.match(sw, /const VERSION = 'v\d+'/);
const precacheBlock = sw.split('const ASSETS = [')[1].split('];')[0];
const precache = [...precacheBlock.matchAll(/'([^']+)'/g)].map(m => m[1]);
for (const asset of precache) {
  if (asset === './') continue;
  assert.ok(fs.existsSync(path.join(process.cwd(), asset)), `missing precache asset: ${asset}`);
}
const html = fs.readFileSync('index.html', 'utf8');
assert.match(html, /id="export-backup"/);
assert.match(html, /id="import-backup"/);
assert.match(html, /id="connection-status"/);
const CFG = require('../js/album-config.js');
const photoPaths = CFG.allPhotoPaths();
assert.strictEqual(photoPaths.length, 42, 'all 39 distinct bundled photos plus 3 special-collection references are precached');
for (const photo of photoPaths) assert.ok(fs.existsSync(photo), `missing bundled photo: ${photo}`);
console.log(`stage 7 PWA manifest, ${precache.length} shell paths and ${photoPaths.length} photo references OK`);

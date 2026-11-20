const assert = require('assert');
const mem = {};
global.window = global;
global.localStorage = { getItem: k => k in mem ? mem[k] : null, setItem: (k,v) => { mem[k] = String(v); }, removeItem: k => { delete mem[k]; } };
global.GameData = { levels: Array.from({length:30},(_,i)=>({id:'L'+(i+1)})), matchLevels: Array.from({length:30},(_,i)=>({id:'L'+(i+1)})) };
require('../js/storage.js');
const S = global.SaveStore;
assert.strictEqual(S.get().home.spent, 0);
assert.strictEqual(S.completeHomeTask('living-sofa', 2), false, 'cannot spend stars that were not earned');
S.completeLevel('L1', 3);
assert.strictEqual(S.completeHomeTask('living-sofa', 2), true);
assert.strictEqual(S.get().home.spent, 2);
assert.strictEqual(S.get().stars - S.get().home.spent, 1, 'unspent star balance is correct');
assert.strictEqual(S.completeHomeTask('living-sofa', 2), false, 'task cannot be purchased twice');
const backup = S.exportBackup();
S.importBackup(backup);
assert.deepStrictEqual(S.get().home.completed, ['living-sofa']);
assert.strictEqual(S.get().home.spent, 2);
S.resetProgress();
assert.deepStrictEqual(S.get().home.completed, ['living-sofa'], 'renovation stays completed after a level reset');
assert.strictEqual(S.get().home.spent, 0, 'reset clears old spending against the new star balance');
console.log('renovation logic OK');


// Lightweight render smoke test: the home board should show four room cards and three first-room tasks.
const host = {
  children: [], _html: '',
  set innerHTML(v) { this._html = v; this.children = []; },
  appendChild(n) { this.children.push(n); return n; }
};
function fakeEl(tag) {
  return {
    tag, children: [], className: '', textContent: '', disabled: false, attrs: {},
    appendChild(n) { this.children.push(n); return n; },
    append(...nodes) { this.children.push(...nodes); },
    setAttribute(k,v) { this.attrs[k] = v; },
    addEventListener() {}
  };
}
global.document = { querySelector: sel => sel === '#home-renovation' ? host : null, createElement: fakeEl };
global.AppUI = { toast() {} };
require('../js/renovation.js');
global.Renovation.render();
assert.strictEqual(host.children.length, 5, 'heading plus four room cards render');
assert.strictEqual(host.children[1].children[2].children.length, 4, 'living room has four decor slots');
console.log('renovation screen render OK');

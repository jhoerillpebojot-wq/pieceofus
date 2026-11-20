/* Letters + Secrets: unlock logic (testable in Node) and the screens. */
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const U = isNode ? require('./unlocks.js') : root.Unlocks;
  const SCREENS = ['home', 'play', 'album', 'letters', 'garden', 'story', 'settings'];

  /* ================= LOGIC ================= */
  const Logic = {
    /* Items whose rule is met now but are not yet saved as unlocked. Never returns removals. */
    pending(items, have, st) { const h = new Set(have || []); return items.filter(i => !h.has(i.id) && U.check(i.unlock, st)); },
    /* Plain-English problems in the three config files (empty = fine). */
    problems(L, S, T) {
      const out = [], ids = new Set();
      const list = (items, label, need) => (items || []).forEach(i => {
        const tag = label + ' ' + i.id;
        if (!i.id || ids.has(label + ':' + i.id)) out.push('duplicate or missing ' + label + ' id: ' + i.id); ids.add(label + ':' + i.id);
        need.forEach(f => { if (!i[f]) out.push(tag + ' has no ' + f); });
        U.validate(i.unlock, tag).forEach(p => out.push(p));
      });
      list(L.letters, 'letter', ['title', 'body']); list(S.secrets, 'secret', ['title', 'message']); list(T.chapters, 'story chapter', ['title']);
      (T.chapters || []).forEach(c => { if (!Array.isArray(c.pages)) out.push('story chapter ' + c.id + ': pages must be a list'); });
      const cids = new Set();
      (S.collectibles || []).forEach(c => {
        if (!c.id || cids.has(c.id)) out.push('duplicate or missing collectible id: ' + c.id); cids.add(c.id);
        if (!SCREENS.includes(c.screen)) out.push('collectible ' + c.id + ': screen must be one of ' + SCREENS.join(', '));
      });
      (S.secrets || []).concat(L.letters || [], T.chapters || []).forEach(i => {
        [].concat((i.unlock && i.unlock.collectible) || []).forEach(c => { if (!cids.has(c)) out.push(i.id + ': unknown collectible "' + c + '"'); });
      });
      return out;
    }
  };
  if (isNode) module.exports = { Logic };
  if (typeof document === 'undefined') return;

  /* ================= SCREENS ================= */
  const LC = root.LettersConfig, SC = root.SecretsConfig, TC = root.StoryConfig;
  const $ = s => document.querySelector(s);
  const S = () => SaveStore.get();
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const ico = id => `<svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>`;
  const toast = m => root.AppUI && root.AppUI.toast(m);
  const tap = f => root.AppUI && root.AppUI.Fx.tap(f || 560);
  const reduced = () => document.documentElement.classList.contains('reduce-motion') || matchMedia('(prefers-reduced-motion: reduce)').matches;
  const chapterTitle = id => { const c = root.AlbumConfig && root.AlbumConfig.chapters.find(x => x.id === id); return c ? c.title : id; };
  const ui = { tab: 'letters', reader: null, dirty: false };
  let busy = false;

  /* ---------- unlocking (runs whenever progress is saved) ---------- */
  function checkAll(silent) {
    if (busy) return; busy = true;
    const got = { letters: [], secrets: [], chapters: [] };
    try {
      for (let guard = 0, again = true; again && guard < 6; guard++) {
        again = false;
        Logic.pending(LC.letters, S().letters.unlocked, S()).forEach(l => { if (SaveStore.addTo('letters', 'unlocked', l.id)) { got.letters.push(l); again = true; } });
        Logic.pending(SC.secrets, S().secrets.found, S()).forEach(s => { if (SaveStore.addTo('secrets', 'found', s.id)) { got.secrets.push(s); again = true; } });
        Logic.pending(TC.chapters, S().story.unlocked, S()).forEach(c => { if (SaveStore.addTo('story', 'unlocked', c.id)) { got.chapters.push(c); again = true; } });
      }
    } finally { busy = false; }
    if (!silent) {
      got.secrets.forEach(() => notify('You discovered a secret'));
      if (got.letters.length) toast(got.letters.length === 1 ? 'A new letter is waiting' : got.letters.length + ' new letters are waiting');
      else if (got.chapters.length) toast('A new story chapter is open');
    }
    updateBadge();
  }

  /* ---------- small "secret discovered" notice ---------- */
  const queue = []; let showing = false;
  function notify(msg) { queue.push(msg); if (!showing) nextNotice(); }
  function nextNotice() {
    const n = $('#ltr-notice'), m = queue.shift();
    if (!m) { showing = false; n.classList.remove('show'); return; }
    showing = true; n.querySelector('span').textContent = m; n.classList.add('show'); tap(900);
    setTimeout(() => { n.classList.remove('show'); setTimeout(nextNotice, 350); }, 3600);
  }

  function updateBadge() {
    const s = S(), unread = s.letters.unlocked.filter(id => !s.letters.read.includes(id)).length, unseen = s.secrets.found.filter(id => !s.secrets.seen.includes(id)).length;
    document.querySelectorAll('#nav [data-go=letters]').forEach(b => b.classList.toggle('has-new', unread + unseen > 0));
  }

  /* ---------- hidden sparkles ---------- */
  function mountCollectibles() {
    document.querySelectorAll('.hidden-spark').forEach(n => n.remove());
    const got = new Set(S().secrets.collected);
    SC.collectibles.filter(c => !got.has(c.id)).forEach(c => {
      const sec = document.querySelector('.screen[data-screen="' + c.screen + '"]'); if (!sec) return;
      const b = el('button', 'hidden-spark'); b.type = 'button'; b.dataset.collectible = c.id;
      b.style.left = c.x; b.style.top = c.y; b.setAttribute('aria-label', c.label || 'A hidden sparkle'); b.innerHTML = '<svg viewBox="0 0 24 24"><use href="#i-star"/></svg>';
      b.onclick = () => {
        b.classList.add('got'); setTimeout(() => b.remove(), 450);
        SaveStore.addTo('secrets', 'collected', c.id);
        toast('You found a hidden sparkle (' + S().secrets.collected.length + ' of ' + SC.collectibles.length + ')');
      };
      sec.appendChild(b);
    });
  }

  /* ---------- envelopes + letters ---------- */
  function envelope(locked) {
    const e = el('div', 'env'); e.innerHTML = '<i class="e-back"></i><i class="e-paper"></i><i class="e-front"></i><i class="e-flap"></i><i class="e-seal">' + (locked ? ico('lock') : '') + '</i>';
    return e;
  }
  function renderTabs(host) {
    const seg = el('div', 'seg'); seg.setAttribute('role', 'tablist');
    [['letters', 'Letters'], ['secrets', 'Secrets']].forEach(([k, t]) => {
      const b = el('button', '', t); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.tab = k; b.setAttribute('aria-selected', String(ui.tab === k));
      if (k === 'secrets' && S().secrets.found.some(id => !S().secrets.seen.includes(id))) b.appendChild(el('i', 'tabdot'));
      b.onclick = () => { ui.tab = k; tap(); render(); };
      seg.appendChild(b);
    });
    host.appendChild(seg);
  }

  function renderLetters(host) {
    const s = S(), have = new Set(s.letters.unlocked), read = new Set(s.letters.read);
    const open = LC.letters.filter(l => have.has(l.id)).length;
    const head = el('header', 'screen-head'); head.appendChild(el('h2', '', 'Letters from me')); head.appendChild(el('p', '', open + ' of ' + LC.letters.length + ' letters open')); host.appendChild(head);
    const grid = el('div', 'ltr-grid');
    LC.letters.forEach(l => {
      const got = have.has(l.id);
      const b = el('button', 'ltr-card' + (got ? '' : ' locked')); b.type = 'button'; b.dataset.letter = l.id;
      b.appendChild(envelope(!got));
      b.appendChild(el('strong', '', got || LC.settings.showLockedTitles ? l.title : 'A sealed letter'));
      b.appendChild(el('small', '', got ? l.preview : 'Opens after you ' + U.describe(l.unlock, s, chapterTitle)));
      if (got && !read.has(l.id)) b.appendChild(el('span', 'new', 'new'));
      b.onclick = () => got ? openLetter(l.id, b) : toast('Opens after you ' + U.describe(l.unlock, S(), chapterTitle));
      grid.appendChild(b);
    });
    host.appendChild(grid);
  }

  function openLetter(id, card) {
    tap(700);
    const go = () => { ui.reader = { kind: 'letter', id }; drawReader(); if (card) card.querySelector('.env').classList.remove('opening'); };
    if (card && !reduced()) { card.querySelector('.env').classList.add('opening'); setTimeout(go, 750); } else go();
  }

  /* ---------- secrets collection ---------- */
  function renderSecrets(host) {
    const s = S(), have = new Set(s.secrets.found), seen = new Set(s.secrets.seen);
    const head = el('header', 'screen-head'); head.appendChild(el('h2', '', 'Secrets')); head.appendChild(el('p', '', have.size + ' of ' + SC.secrets.length + ' discovered')); host.appendChild(head);
    if (SC.collectibles.length) host.appendChild(el('p', 'sec-sparks', 'Hidden sparkles found: ' + s.secrets.collected.filter(id => SC.collectibles.some(c => c.id === id)).length + ' of ' + SC.collectibles.length));
    const list = el('div', 'sec-list');
    SC.secrets.forEach(x => {
      const got = have.has(x.id), b = el('button', 'sec-card' + (got ? '' : ' locked')); b.type = 'button'; b.dataset.secret = x.id;
      b.innerHTML = '<span class="sec-ico">' + (got ? ico('star') : '?') + '</span>';
      const t = el('span', 'sec-text'); t.appendChild(el('strong', '', got ? x.title : 'A hidden secret'));
      t.appendChild(el('small', '', got ? x.message.trim().split('\n')[0] : (x.hint || 'Keep exploring. It will turn up.'))); b.appendChild(t);
      if (got && !seen.has(x.id)) b.appendChild(el('span', 'new', 'new'));
      b.onclick = () => got ? (ui.reader = { kind: 'secret', id: x.id }, tap(), drawReader()) : toast(x.hint || 'Keep exploring. It will turn up.');
      list.appendChild(b);
    });
    host.appendChild(list);
  }

  /* ---------- reader (letters and secrets) ---------- */
  function drawReader() {
    const r = ui.reader, host = $('#ltr-reader'); host.hidden = false; host.innerHTML = '';
    const isL = r.kind === 'letter', item = isL ? LC.letters.find(x => x.id === r.id) : SC.secrets.find(x => x.id === r.id);
    const unlocked = isL ? LC.letters.filter(x => S().letters.unlocked.includes(x.id)) : [];
    const i = unlocked.findIndex(x => x.id === r.id);
    const wrap = el('div', 'rd-wrap');
    const back = el('button', 'rd-back', isL ? '‹ All letters' : '‹ All secrets'); back.type = 'button'; back.onclick = closeReader; wrap.appendChild(back);
    const paper = el('article', 'paper' + (isL ? '' : ' note')); paper.appendChild(el('i', 'tape t-pink top'));
    paper.appendChild(el('h2', 'rd-title', item.title));
    const meta = [];
    if (isL && item.date) meta.push(item.date);
    if (isL && item.chapter) meta.push('From the chapter \u201c' + chapterTitle(item.chapter) + '\u201d');
    if (meta.length) { const m = el('p', 'rd-meta'); meta.forEach(t => m.appendChild(el('span', '', t))); paper.appendChild(m); }
    paper.appendChild(el('div', 'rd-body', (isL ? item.body : item.message).trim()));
    if (isL && LC.settings.signoff) paper.appendChild(el('p', 'rd-sign', LC.settings.signoff));
    wrap.appendChild(paper);
    if (isL && unlocked.length > 1) {
      const nav = el('div', 'alb-pagenav'), p = el('button', 'pn', '‹'), n = el('button', 'pn', '›'); p.type = n.type = 'button';
      p.disabled = i <= 0; n.disabled = i >= unlocked.length - 1; p.setAttribute('aria-label', 'Previous letter'); n.setAttribute('aria-label', 'Next letter');
      p.onclick = () => { ui.reader = { kind: 'letter', id: unlocked[i - 1].id }; drawReader(); }; n.onclick = () => { ui.reader = { kind: 'letter', id: unlocked[i + 1].id }; drawReader(); };
      nav.appendChild(p); nav.appendChild(el('span', 'hand', (i + 1) + ' of ' + unlocked.length)); nav.appendChild(n); wrap.appendChild(nav);
    }
    host.appendChild(wrap); wrap.scrollTop = 0;
    SaveStore.addTo(isL ? 'letters' : 'secrets', isL ? 'read' : 'seen', r.id);
  }
  function closeReader() { ui.reader = null; const h = $('#ltr-reader'); h.hidden = true; h.innerHTML = ''; }

  function render() {
    const host = $('#letters-root'); if (!host) return;
    if (Nav.current() !== 'letters' && host.childElementCount) { ui.dirty = true; return; }
    ui.dirty = false; host.innerHTML = '';
    renderTabs(host); (ui.tab === 'secrets' ? renderSecrets : renderLetters)(host);
  }

  function init() {
    const problems = Logic.problems(LC, SC, TC); if (problems.length) console.warn('data/*.js problems:\n- ' + problems.join('\n- '));
    const n = el('button', ''); n.id = 'ltr-notice'; n.type = 'button'; n.innerHTML = ico('star') + '<span></span>'; n.onclick = () => { ui.tab = 'secrets'; Nav.go('letters'); render(); };
    const r = el('div'); r.id = 'ltr-reader'; r.hidden = true;
    $('#app').appendChild(n); $('#app').appendChild(r);
    checkAll(true); mountCollectibles();
    SaveStore.subscribe(() => checkAll(false));
    Nav.onChange(name => { if (name === 'letters') { if (ui.dirty) render(); } else closeReader(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && ui.reader) closeReader(); });
    render(); updateBadge();
  }

  root.Letters = { init, render, checkAll, Logic };
})(typeof window !== 'undefined' ? window : globalThis);

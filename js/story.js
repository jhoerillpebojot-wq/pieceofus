/* Our Story: a small book with previous / next buttons. */
(function (root) {
  const isNode = typeof module !== 'undefined' && module.exports;
  const U = isNode ? require('./unlocks.js') : root.Unlocks;
  const Logic = {
    /* pages may be plain strings or { title, text } */
    pages(ch) { return (ch.pages || []).map(p => typeof p === 'string' ? { title: '', text: p } : { title: p.title || '', text: p.text || '' }); }
  };
  if (isNode) module.exports = { Logic };
  if (typeof document === 'undefined') return;

  const TC = root.StoryConfig, $ = s => document.querySelector(s), S = () => SaveStore.get();
  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const tap = () => root.AppUI && root.AppUI.Fx.tap(560);
  const chapterTitle = id => { const c = root.AlbumConfig && root.AlbumConfig.chapters.find(x => x.id === id); return c ? c.title : id; };
  const ui = { view: 'toc', id: null, page: 0, dirty: false };
  const unlocked = id => S().story.unlocked.includes(id);

  function renderToc(host, dir) {
    const s = S(), open = TC.chapters.filter(c => unlocked(c.id)).length;
    const cover = el('div', 'bk-cover' + (dir ? ' turn-' + dir : ''));
    cover.innerHTML = '<i class="tape t-lav l"></i><i class="tape t-pink r"></i>';
    cover.appendChild(el('h2', 'alb-title', TC.cover.title)); cover.appendChild(el('p', 'hand', TC.cover.subtitle));
    cover.appendChild(el('p', 'bk-count', open + ' of ' + TC.chapters.length + ' chapters open'));
    host.appendChild(cover);
    const list = el('div', 'bk-list');
    TC.chapters.forEach((c, i) => {
      const got = unlocked(c.id), fin = s.story.finished.includes(c.id), pg = s.story.page[c.id] || 0;
      const b = el('button', 'bk-chap' + (got ? '' : ' locked')); b.type = 'button'; b.dataset.chapter = c.id;
      b.appendChild(el('span', 'bk-num', got ? String(i + 1) : ''));
      if (!got) b.firstChild.innerHTML = '<svg class="ic"><use href="#i-lock"/></svg>';
      const t = el('span', 'bk-text'); t.appendChild(el('strong', '', c.title));
      t.appendChild(el('small', '', got ? (fin ? 'Finished' : pg > 0 ? 'Continue on page ' + (pg + 1) : 'Start reading') : 'Opens after you ' + U.describe(c.unlock, s, chapterTitle)));
      b.appendChild(t);
      b.onclick = () => got ? (tap(), openChapter(c.id)) : (root.AppUI && root.AppUI.toast('Opens after you ' + U.describe(c.unlock, S(), chapterTitle)));
      list.appendChild(b);
    });
    host.appendChild(list);
  }

  function openChapter(id) {
    const s = S(); ui.view = 'book'; ui.id = id;
    ui.page = s.story.finished.includes(id) ? 0 : Math.min(s.story.page[id] || 0, Math.max(0, Logic.pages(TC.chapters.find(c => c.id === id)).length - 1));
    render('next'); $('#screens').scrollTop = 0;
  }

  function renderBook(host, dir) {
    const idx = TC.chapters.findIndex(c => c.id === ui.id), ch = TC.chapters[idx], pages = Logic.pages(ch), n = pages.length;
    const back = el('button', 'alb-back', '‹ Contents'); back.type = 'button';
    back.onclick = () => { tap(); ui.view = 'toc'; render('prev'); $('#screens').scrollTop = 0; }; host.appendChild(back);

    const book = el('div', 'bk-page' + (dir ? ' turn-' + dir : '')); book.dataset.page = ui.page;
    book.innerHTML = '<i class="tape t-butter top"></i>';
    book.appendChild(el('p', 'hand', 'Chapter ' + (idx + 1)));
    book.appendChild(el('h2', 'alb-title', ch.title));
    if (ui.page < n) {
      const pg = pages[ui.page];
      if (pg.title) book.appendChild(el('h3', 'bk-ptitle', pg.title));
      book.appendChild(el('div', 'bk-text-body', pg.text.trim()));
    } else {
      const nx = TC.chapters[idx + 1], end = el('div', 'bk-end');
      end.appendChild(el('p', 'hand', 'The end of this chapter'));
      if (nx && unlocked(nx.id)) { const b = el('button', 'btn btn-primary', 'Next chapter'); b.type = 'button'; b.onclick = () => { tap(); openChapter(nx.id); }; end.appendChild(b); }
      else if (nx) end.appendChild(el('small', 'bk-lockhint', 'The next chapter opens after you ' + U.describe(nx.unlock, S(), chapterTitle)));
      const c = el('button', 'btn btn-soft', 'Back to contents'); c.type = 'button'; c.onclick = () => { ui.view = 'toc'; render('prev'); }; end.appendChild(c);
      book.appendChild(end);
    }
    const nav = el('div', 'alb-pagenav');
    const p = el('button', 'pn', '‹'), nb = el('button', 'pn', '›'); p.type = nb.type = 'button';
    p.disabled = ui.page <= 0; nb.disabled = ui.page >= n; p.setAttribute('aria-label', 'Previous page'); nb.setAttribute('aria-label', 'Next page');
    p.onclick = () => turn(-1); nb.onclick = () => turn(1);
    nav.appendChild(p); nav.appendChild(el('span', 'hand', ui.page < n ? 'Page ' + (ui.page + 1) + ' of ' + n : 'The end')); nav.appendChild(nb);
    book.appendChild(nav); host.appendChild(book);
  }

  function turn(d) {
    const ch = TC.chapters.find(c => c.id === ui.id), n = Logic.pages(ch).length, to = ui.page + d;
    if (to < 0 || to > n) return;
    tap(); ui.page = to; render(d > 0 ? 'next' : 'prev');
    if (to < n) SaveStore.storySet(ui.id, to);
    else setTimeout(() => SaveStore.addTo('story', 'finished', ui.id), 650);   // reached the end: mark finished
  }

  function render(dir) {
    const host = $('#story-root'); if (!host) return;
    if (Nav.current() !== 'story' && !dir && host.childElementCount) { ui.dirty = true; return; }
    ui.dirty = false; host.innerHTML = '';
    if (ui.view === 'book' && unlocked(ui.id)) renderBook(host, dir); else { ui.view = 'toc'; renderToc(host, dir); }
  }

  function init() {
    let sx = 0, sy = 0; const host = $('#story-root');
    host.addEventListener('touchstart', e => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    host.addEventListener('touchend', e => {
      if (ui.view !== 'book') return;
      const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
      if (Math.abs(dx) > 70 && Math.abs(dy) < 45) turn(dx < 0 ? 1 : -1);
    }, { passive: true });
    Nav.onChange(name => { if (name === 'story' && ui.dirty) render(); });
    render();
  }
  root.Story = { init, render, Logic };
})(typeof window !== 'undefined' ? window : globalThis);

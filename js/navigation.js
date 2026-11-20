/* Screen navigation using the URL hash (#home, #play, ...). Works offline and with the back button. */
(function () {
  const SCREENS = ['home', 'play', 'album', 'letters', 'garden', 'settings', 'game', 'match', 'story', 'paint'];
  const listeners = [];
  let current = null;

  function fromHash() {
    const name = location.hash.replace('#', '');
    return SCREENS.includes(name) ? name : 'home';
  }

  function show(name) {
    current = name;
    document.querySelectorAll('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === name));
    document.querySelectorAll('#nav button').forEach(b => {
      if (b.dataset.go === name) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    document.getElementById('screens').scrollTop = 0;
    listeners.forEach(fn => fn(name));
  }

  window.Nav = {
    go(name) {
      if (!SCREENS.includes(name)) name = 'home';
      if (location.hash !== '#' + name) location.hash = name; else show(name);
    },
    current: () => current,
    onChange: fn => listeners.push(fn),
    init() {
      document.addEventListener('click', e => {
        const t = e.target.closest('[data-go]');
        if (t) Nav.go(t.dataset.go);
      });
      window.addEventListener('hashchange', () => show(fromHash()));
      show(fromHash());
    }
  };
})();

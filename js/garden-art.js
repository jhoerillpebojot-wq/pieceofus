/* Original SVG artwork for the garden (no image files). */
(function (root) {
  const COL = { tulip: '#f08fae', rose: '#e0607e', daisy: '#fff', sunflower: '#ffcf4a', lavender: '#a58ad8' };
  const rot = (n, f) => Array.from({ length: n }, (_, i) => f(i * 360 / n)).join('');
  const HEAD = {
    tulip: '<path d="M19 36q-3-18 13-26 16 8 13 26-13 9-26 0z" fill="#f08fae"/><path d="M32 10q-6 10-4 28 9 2 17-2 3-18-13-26z" fill="#f7b3c9"/>',
    rose: '<circle r="13" cx="32" cy="30" fill="#e0607e"/><circle r="9" cx="32" cy="30" fill="#ec7f98"/><path d="M26 30q6-8 12 0t-8 6" fill="none" stroke="#c94a69" stroke-width="2.4" stroke-linecap="round"/>',
    daisy: rot(10, a => `<ellipse cx="32" cy="16" rx="4.2" ry="9" fill="#fff" stroke="#f0dfe5" transform="rotate(${a} 32 30)"/>`) + '<circle cx="32" cy="30" r="6" fill="#ffd35c"/>',
    sunflower: rot(14, a => `<ellipse cx="32" cy="14" rx="4.4" ry="10" fill="#ffcf4a" transform="rotate(${a} 32 30)"/>`) + '<circle cx="32" cy="30" r="8.5" fill="#8a5a44"/><circle cx="32" cy="30" r="4.5" fill="#6b4233"/>',
    lavender: [24, 32, 40].map((x, i) => `<g fill="#a58ad8">${[0, 1, 2, 3, 4].map(k => `<ellipse cx="${x + (k % 2 ? 1.5 : -1.5)}" cy="${34 - k * 6 - (i === 1 ? 6 : 0)}" rx="3.2" ry="4.2"/>`).join('')}</g>`).join('')
  };
  const FLOWER_STEM = '<path d="M32 70V32" stroke="#7fb274" stroke-width="3.4" stroke-linecap="round"/><path d="M32 58q-12 0-14-10 12-1 14 10zM32 52q12 0 14-10-12-1-14 10z" fill="#9ccb8f"/>';
  const LAV_STEM = '<path d="M24 70V36M32 70V30M40 70V36" stroke="#7fb274" stroke-width="2.6" stroke-linecap="round"/>';
  const MOUND = '<ellipse cx="32" cy="72" rx="25" ry="8" fill="#c99a86"/><ellipse cx="32" cy="70" rx="21" ry="6" fill="#d9b09b"/>';
  const wrap = (inner, cls) => `<svg viewBox="0 0 64 80" class="${cls || ''}" aria-hidden="true">${inner}</svg>`;

  /* stage 0 seed, 1 sprout, 2 bud, 3 in bloom */
  function flower(type, stage) {
    const lav = type === 'lavender';
    if (stage < 0) return EMPTY;
    if (stage === 0) return wrap(MOUND + '<ellipse cx="32" cy="66" rx="6" ry="4" fill="#8a5a44"/><circle cx="44" cy="54" r="2.4" fill="#ffd35c"/><circle cx="20" cy="58" r="1.8" fill="#fff"/><circle cx="32" cy="50" r="2" fill="#f6c1cf"/>');
    if (stage === 1) return wrap(MOUND + '<path d="M32 70V58" stroke="#7fb274" stroke-width="3" stroke-linecap="round"/><path d="M32 60q-10 0-11-8 10-1 11 8zM32 58q10 0 11-8-10-1-11 8z" fill="#9ccb8f"/>');
    if (stage === 2) return wrap(MOUND + (lav ? LAV_STEM + '<g fill="#c4b3e8">' + [24, 32, 40].map(x => `<ellipse cx="${x}" cy="${x === 32 ? 28 : 34}" rx="3" ry="5"/>`).join('') + '</g>' : FLOWER_STEM + `<ellipse cx="32" cy="${type === 'sunflower' ? 30 : 27}" rx="7" ry="9" fill="${type === 'daisy' ? '#f3ecf0' : COL[type]}" opacity=".9"/>`));
    return wrap(MOUND + (lav ? LAV_STEM : FLOWER_STEM) + `<g class="sway">${HEAD[type]}</g>`, 'bloomed');
  }

  const EMPTY = wrap('<ellipse cx="32" cy="70" rx="25" ry="8" fill="#d6b09d" stroke="#fff" stroke-width="2.4" stroke-dasharray="4 4"/><ellipse cx="32" cy="70" rx="20" ry="5.5" fill="#c99a86"/><path d="M32 63v14M25 70h14" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".85"/>');
  const D = (inner) => `<svg viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
  const DECOR = {
    stone: D('<ellipse cx="22" cy="48" rx="17" ry="11" fill="#cdc3d4"/><ellipse cx="44" cy="51" rx="13" ry="8" fill="#ddd5e4"/><ellipse cx="18" cy="43" rx="7" ry="3" fill="#e9e3ee"/>'),
    fence: D('<rect x="4" y="30" width="56" height="5" rx="2" fill="#e4c9b8"/><rect x="4" y="42" width="56" height="5" rx="2" fill="#e4c9b8"/>' + [8, 24, 40].map(x => `<path d="M${x} 56V30l6-8 6 8v26z" fill="#fff4ea" stroke="#e4c9b8" stroke-width="1.5"/>`).join('')),
    bush: D('<circle cx="20" cy="42" r="16" fill="#9ccb8f"/><circle cx="42" cy="40" r="18" fill="#8cc182"/><circle cx="32" cy="32" r="15" fill="#aad69d"/><circle cx="26" cy="30" r="2.6" fill="#f6c1cf"/><circle cx="40" cy="38" r="2.6" fill="#f6c1cf"/><circle cx="22" cy="44" r="2.4" fill="#fff"/>'),
    tree: D('<rect x="29" y="34" width="7" height="26" rx="3" fill="#b98a72"/><circle cx="32" cy="24" r="20" fill="#f6c1cf"/><circle cx="20" cy="30" r="13" fill="#f2a9be"/><circle cx="44" cy="30" r="13" fill="#f9d3de"/><circle cx="30" cy="16" r="3" fill="#fff"/><circle cx="42" cy="26" r="2.4" fill="#fff"/>'),
    bench: D('<rect x="8" y="22" width="48" height="8" rx="3" fill="#e6bba2"/><rect x="6" y="36" width="52" height="8" rx="3" fill="#d9a98c"/><path d="M12 44v14M52 44v14M12 30v6M52 30v6" stroke="#b98a72" stroke-width="4" stroke-linecap="round"/>'),
    pond: D('<ellipse cx="32" cy="42" rx="28" ry="16" fill="#ddd5e4"/><ellipse cx="32" cy="42" rx="24" ry="12.5" fill="#bfe0ee"/><ellipse cx="26" cy="40" rx="7" ry="3.6" fill="#9ccb8f"/><circle cx="26" cy="38" r="2.4" fill="#f6c1cf"/><path d="M40 44q4-2 8 0" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>'),
    lantern: D('<path d="M32 58V28" stroke="#b98a72" stroke-width="4" stroke-linecap="round"/><rect x="22" y="12" width="20" height="20" rx="6" fill="#fff2b8" stroke="#e8c76a" stroke-width="2"/><circle cx="32" cy="22" r="5" fill="#ffd35c"/><path d="M26 12q6-8 12 0" fill="none" stroke="#b98a72" stroke-width="3"/>'),
    birdbath: D('<path d="M26 58h12l-3-22h-6z" fill="#ddd5e4"/><ellipse cx="32" cy="34" rx="22" ry="8" fill="#cdc3d4"/><ellipse cx="32" cy="32" rx="18" ry="5.5" fill="#bfe0ee"/><circle cx="40" cy="26" r="5" fill="#f6c1cf"/><path d="M44 26l5 1-5 2z" fill="#ffd35c"/>'),
    mushroom: D('<rect x="14" y="36" width="8" height="18" rx="3" fill="#fff4ea"/><path d="M6 38q8-22 24 0z" fill="#f08fae"/><rect x="38" y="42" width="7" height="14" rx="3" fill="#fff4ea"/><path d="M32 44q8-16 20 0z" fill="#e0607e"/><circle cx="16" cy="32" r="2" fill="#fff"/><circle cx="43" cy="38" r="2" fill="#fff"/>'),
    arch: D('<path d="M10 60V28q0-18 22-18t22 18v32" fill="none" stroke="#d9a98c" stroke-width="5" stroke-linecap="round"/>' + [[14, 34], [12, 48], [18, 22], [32, 10], [46, 22], [52, 34], [52, 48]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.5" fill="#f08fae"/><circle cx="${x + 3}" cy="${y + 3}" r="3" fill="#9ccb8f"/>`).join(''))
  };

  const THEMES = {
    dawn: ['#ffe9ee', '#fff6ea', '#bfe3b4', '#a8d69b'], bloom: ['#ffe0e8', '#ffeede', '#c6e8b8', '#aedaa0'],
    butterfly: ['#e9defa', '#fdeaf2', '#c9e8c0', '#b3dba9'], secret: ['#d9ccf0', '#f1dff0', '#b6d9b0', '#9fcb9b']
  };
  function scene(theme) {
    const [a, b, g1, g2] = THEMES[theme] || THEMES.dawn, id = 'g' + theme;
    const bush = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#9ccb8f"/><circle cx="${x + r * .7}" cy="${y + 2}" r="${r * .8}" fill="#8cc182"/>`;
    const tuft = (x, y) => `<path d="M${x} ${y}q-2-9-5-10 4 1 5 10 1-8 5-11-2 4-5 11z" fill="#8cc182"/>`;
    const dots = [[40, 330, '#fff'], [310, 300, '#f6c1cf'], [120, 405, '#ffe08a'], [250, 420, '#fff'], [20, 380, '#f6c1cf'], [335, 380, '#ffe08a']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="3.4" fill="${c}"/>`).join('');
    return `<svg class="g-bg" viewBox="0 0 360 440" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><linearGradient id="${id}g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${g1}"/><stop offset="1" stop-color="${g2}"/></linearGradient></defs>`
      + `<rect width="360" height="440" fill="url(#${id}s)"/><circle cx="300" cy="62" r="30" fill="#fff6d6" opacity=".9"/><ellipse cx="90" cy="70" rx="46" ry="14" fill="#fff" opacity=".75"/><ellipse cx="120" cy="60" rx="30" ry="12" fill="#fff" opacity=".75"/>`
      + `<path d="M0 190q90-50 180-14t180-20v280H0z" fill="#d3ebc9"/><path d="M0 214q120-40 200-4t160-6v236H0z" fill="url(#${id}g)"/>`
      + `<g>${bush(20, 212, 22)}${bush(64, 218, 16)}${bush(310, 208, 24)}${bush(344, 218, 16)}</g>`
      + `<g><rect x="258" y="130" width="10" height="70" rx="4" fill="#b98a72"/><circle cx="263" cy="116" r="38" fill="#f6c1cf"/><circle cx="244" cy="128" r="22" fill="#f2a9be"/><circle cx="284" cy="126" r="22" fill="#f9d3de"/></g>`
      + `<g><rect x="62" y="150" width="8" height="52" rx="4" fill="#b98a72"/><circle cx="66" cy="138" r="28" fill="#aad69d"/><circle cx="52" cy="148" r="16" fill="#9ccb8f"/></g>`
      + `<path d="M-10 440V400q180-40 380 0v40z" fill="${g2}" opacity=".55"/>${tuft(70, 300)}${tuft(300, 340)}${tuft(190, 412)}${tuft(24, 430)}${tuft(330, 250)}${dots}`
      + (theme === 'secret' ? '<g fill="#fff6c0" opacity=".85">' + [[60, 90], [150, 40], [230, 100], [320, 150], [30, 170]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('') + '</g>' : '') + '</svg>';
  }
  const BUTTERFLY = '<svg viewBox="0 0 32 24" aria-hidden="true"><ellipse cx="9" cy="9" rx="8" ry="7" fill="#f6a9c6"/><ellipse cx="23" cy="9" rx="8" ry="7" fill="#c9b4ef"/><ellipse cx="10" cy="17" rx="5" ry="5" fill="#f9c8dc"/><ellipse cx="22" cy="17" rx="5" ry="5" fill="#ddd0f5"/><rect x="15" y="4" width="2" height="16" rx="1" fill="#6b4a58"/></svg>';
  root.GardenArt = { flower, DECOR, scene, BUTTERFLY };
})(typeof window !== 'undefined' ? window : globalThis);

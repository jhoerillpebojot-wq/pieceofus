/* Match-3 artwork. Each piece is a 64x64 SVG drawing, in the same order as the piece numbers 0-5
   used in match-levels.js. Edit the SVG markup to redraw a piece. Pieces must stay visually
   different by SHAPE (not only color) so they are easy to tell apart. */
(function (root) {
  const PIECES = [
    /* 0 strawberry */ '<path d="M32 59C15 50 7 36 10 26c2-9 12-12 22-8 10-4 20-1 22 8 3 10-5 24-22 33z" fill="#ff7f86"/><path d="M32 18c-7-2-14 1-16 6 6 0 10 0 16-3 6 3 10 3 16 3-2-5-9-8-16-6z" fill="#7cc27f"/><path d="M32 19l-5-9 5 4 5-4z" fill="#7cc27f"/><g fill="#ffe9d6"><ellipse cx="23" cy="33" rx="2" ry="3"/><ellipse cx="38" cy="31" rx="2" ry="3"/><ellipse cx="31" cy="42" rx="2" ry="3"/><ellipse cx="42" cy="42" rx="2" ry="3"/><ellipse cx="22" cy="44" rx="2" ry="3"/><ellipse cx="32" cy="52" rx="2" ry="3"/></g>',
    /* 1 flower */ '<g fill="#c9a9e8"><circle cx="32" cy="17" r="12"/><circle cx="46" cy="27" r="12"/><circle cx="41" cy="44" r="12"/><circle cx="23" cy="44" r="12"/><circle cx="18" cy="27" r="12"/></g><circle cx="32" cy="33" r="9" fill="#ffd966"/><circle cx="29" cy="30" r="2.5" fill="#fff3bf"/>',
    /* 2 star */ '<path d="M32 5l8 18 19 2-14 13 5 19-18-10-18 10 5-19L5 25l19-2z" fill="#ffd35c" stroke="#f2b632" stroke-width="3" stroke-linejoin="round"/><circle cx="28" cy="27" r="3" fill="#fff3bf"/>',
    /* 3 candy */ '<path d="M5 21l17 11-17 11z" fill="#4fb8a5"/><path d="M59 21L42 32l17 11z" fill="#4fb8a5"/><circle cx="32" cy="32" r="17" fill="#7fd3c2"/><path d="M22 21c8 6 12 15 9 25" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" opacity=".75"/><path d="M33 17c6 4 10 10 10 16" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round" opacity=".5"/>',
    /* 4 heart */ '<path d="M32 58C9 42 5 29 9 19c4-10 17-10 23 1 6-11 19-11 23-1 4 10 0 23-23 39z" fill="#e8527a"/><ellipse cx="20" cy="22" rx="5" ry="3.5" fill="#ffb3c6" transform="rotate(-30 20 22)"/>',
    /* 5 bow */ '<path d="M30 32L6 17C2 28 2 38 6 49z" fill="#a9c4f5"/><path d="M34 32l24-15c4 11 4 21 0 32z" fill="#a9c4f5"/><path d="M29 38l-9 19 8-4zM35 38l9 19-8-4z" fill="#8aa9e6"/><rect x="24" y="24" width="16" height="16" rx="6" fill="#7f9fe0"/>'
  ];
  const SPARK = '<circle cx="32" cy="32" r="26" fill="#fff8ec" stroke="#e99bb0" stroke-width="3"/><circle cx="19" cy="22" r="4" fill="#f6c1cf"/><circle cx="46" cy="22" r="4" fill="#c9a9e8"/><circle cx="19" cy="43" r="4" fill="#7fd3c2"/><circle cx="46" cy="43" r="4" fill="#ffd35c"/><path d="M32 14l4.5 13.5L50 32l-13.5 4.5L32 50l-4.5-13.5L14 32l13.5-4.5z" fill="#e99bb0"/>';
  const OUT = 'stroke="#5a3d3a" stroke-opacity=".45" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  const WHT = 'stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"';
  const MARKS = {   // overlays that tell special pieces apart
    row:  `<path d="M12 32h40M21 23l-9 9 9 9M43 23l9 9-9 9" ${OUT}/><path d="M12 32h40M21 23l-9 9 9 9M43 23l9 9-9 9" ${WHT}/>`,
    col:  `<path d="M32 12v40M23 21l9-9 9 9M23 43l9 9 9-9" ${OUT}/><path d="M32 12v40M23 21l9-9 9 9M23 43l9 9 9-9" ${WHT}/>`,
    bomb: `<circle cx="32" cy="32" r="14" ${OUT}/><circle cx="32" cy="32" r="14" ${WHT}/><circle cx="32" cy="32" r="3" fill="#fff"/>`
  };

  function install() {
    if (typeof document === 'undefined' || document.getElementById('match-art')) return;
    const syms = PIECES.map((s, i) => `<symbol id="p-${i}" viewBox="0 0 64 64">${s}</symbol>`).join('')
      + `<symbol id="p-spark" viewBox="0 0 64 64">${SPARK}</symbol>`
      + Object.keys(MARKS).map(k => `<symbol id="m-${k}" viewBox="0 0 64 64">${MARKS[k]}</symbol>`).join('');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'match-art'; svg.setAttribute('width', '0'); svg.setAttribute('height', '0');
    svg.setAttribute('style', 'position:absolute'); svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<defs>' + syms + '</defs>';
    document.body.appendChild(svg);
  }
  root.MatchArt = { PIECES, SPARK, MARKS, install };
  install();
})(typeof window !== 'undefined' ? window : globalThis);

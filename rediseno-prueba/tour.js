/* Visor liviano del recorrido 3D de Muzzaga: una secuencia de cuadros reales del recorrido.
   Se arrastra (o se usan las flechas) para moverse. Los cuadros se descargan recién cuando
   alguien abre el visor o lo toca; antes solo hay un póster y un video corto. */
(() => {
  const T = window.SE7EN_TOUR;
  const d = document.documentElement;
  const rm = () => matchMedia('(prefers-reduced-motion: reduce)').matches || d.classList.contains('rm');

  const mount = (box, { autoload = false, onFrame } = {}) => {
    if (!T || !T.frames || !T.frames.length) return null;
    const N = T.frames.length;
    const img = document.createElement('img');
    img.alt = ''; img.src = T.poster || T.frames[0]; img.draggable = false;
    const old = box.querySelector('video,img'); old ? old.replaceWith(img) : box.prepend(img);
    const hint = box.querySelector('.hint');
    let i = 0, loaded = 0, started = false, drag = null;
    const cache = new Array(N);
    const load = () => {
      if (started) return; started = true;
      if (hint) hint.lastChild.textContent = ' Cargando el recorrido…';
      let k = 0;
      const next = () => {
        if (k >= N) return;
        const im = new Image(); const j = k++;
        im.onload = im.onerror = () => { cache[j] = im; loaded++; if (hint && loaded === N) hint.lastChild.textContent = ' Arrastrá hacia la derecha para acercarte'; next(); };
        im.src = T.frames[j];
      };
      for (let c = 0; c < 4; c++) next();
    };
    const show = (n) => {
      i = Math.max(0, Math.min(N - 1, Math.round(n)));
      const c = cache[i];
      if (c) img.src = c.src; else if (!started) load();
      onFrame && onFrame(i, N);
    };
    box.addEventListener('pointerdown', (e) => { load(); drag = { x: e.clientX, i }; box.setPointerCapture(e.pointerId); });
    box.addEventListener('pointermove', (e) => { if (!drag) return; const r = box.getBoundingClientRect(); show(drag.i + (e.clientX - drag.x) / r.width * N * 1.1); });
    ['pointerup', 'pointercancel'].forEach((t) => box.addEventListener(t, () => { drag = null; }));
    box.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { load(); show(i + 2); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { load(); show(i - 2); e.preventDefault(); }
    });
    if (autoload) load();
    if (hint) hint.lastChild.textContent = autoload ? ' Cargando el recorrido…' : ' Arrastrá hacia la derecha para acercarte';
    return { show, load, get i() { return i; }, N };
  };

  const spacesHTML = () => (T && T.spaces && T.spaces.length) ? T.spaces.map((s) => `<span>${s}</span>`).join('') : '';

  // Visor dentro del caso
  const inline = document.querySelector('[data-tour-inline]');
  if (inline && T && T.frames && T.frames.length) {
    const bar = document.querySelector('.tour-bar');
    const range = document.createElement('input');
    range.type = 'range'; range.min = 0; range.max = T.frames.length - 1; range.value = 0; range.setAttribute('aria-label', 'Moverse por el recorrido');
    const v = mount(inline, { onFrame: (k) => { range.value = k; } });
    range.addEventListener('input', () => { v.load(); v.show(+range.value); });
    const cap = document.querySelector('[data-tour-cap]');
    if (cap) { cap.textContent = ''; cap.appendChild(range); }
    if ('IntersectionObserver' in window && !d.classList.contains('capture')) {
      const io = new IntersectionObserver(([e]) => { if (e.isIntersecting && !matchMedia('(hover: none)').matches && !(navigator.connection && navigator.connection.saveData)) { v.load(); io.disconnect(); } }, { threshold: 0.4 });
      io.observe(inline);
    }
  }

  // Lista de espacios en la home
  const sp = document.querySelector('[data-mz-spaces]');
  if (sp) sp.innerHTML = spacesHTML();

  // Visor dentro del portal (home)
  window.SE7EN_TOUR_BUILD = (body, foot) => {
    if (!T || !T.frames || !T.frames.length) return false;
    const wrap = document.createElement('div'); wrap.className = 'viewer'; wrap.tabIndex = 0;
    wrap.setAttribute('role', 'img'); wrap.setAttribute('aria-label', 'Recorrido 3D de Muzzaga. Arrastrá o usá las flechas para moverte.');
    wrap.innerHTML = '<span class="hint"><svg width="18" height="18" aria-hidden="true"><use href="#i-drag"/></svg> Arrastrá hacia la derecha para acercarte</span>';
    body.appendChild(wrap);
    const range = document.createElement('input');
    range.type = 'range'; range.className = 'scrub'; range.min = 0; range.max = T.frames.length - 1; range.value = 0; range.setAttribute('aria-label', 'Moverse por el recorrido');
    const v = mount(wrap, { autoload: true, onFrame: (k) => { range.value = k; } });
    range.addEventListener('input', () => v.show(+range.value));
    foot.innerHTML = `<span><b>Vista previa liviana</b> · ${T.frames.length} cuadros del recorrido real${T.weight ? ' · ' + T.weight : ''}</span>`;
    foot.appendChild(range);
    const a = document.createElement('a'); a.className = 'btn-ghost'; a.href = T.url || 'https://muzzaga-padel-seven.vercel.app/'; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Abrir el recorrido completo ↗';
    foot.appendChild(a);
    setTimeout(() => wrap.focus(), 50);
    return true;
  };
})();

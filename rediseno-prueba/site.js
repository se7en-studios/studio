/* SE7EN · sitio de prueba de la dirección «Superficie y profundidad». Sin dependencias.
   Regla: todo el contenido se ve sin JS; el movimiento solo suma.
   No hay envíos de datos: el formulario se valida y muestra un estado simulado. */
(() => {
  const d = document.documentElement;
  const q = new URLSearchParams(location.search);
  const CAPTURE = d.classList.contains('capture');
  const mqRM = matchMedia('(prefers-reduced-motion: reduce)');
  const rm = () => mqRM.matches || d.classList.contains('rm');
  const touch = d.classList.contains('touch');
  const saveData = !!(navigator.connection && navigator.connection.saveData);
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const EASE_CUT = 'cubic-bezier(.7,0,.25,1)';
  const EASE_OUT = 'cubic-bezier(.2,.7,0,1)';
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} } };

  /* ── Hora local ── */
  const timeEl = $('[data-time]');
  if (timeEl) {
    const fmt = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Argentina/Salta' });
    const tick = () => { timeEl.textContent = 'Catriel · ' + fmt.format(new Date()); };
    tick(); setInterval(tick, 30000);
  }

  /* ── Aviso breve ── */
  const toastEl = $('[data-toast]');
  let toastT;
  const toast = (msg) => {
    if (!toastEl) return;
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('on'), 2400);
  };

  /* ── Navegación: se esconde al bajar, vuelve al subir ── */
  const nav = $('[data-nav]'), demo = $('[data-demo]');
  let lastY = scrollY, sheetOpen = false;
  const onScroll = () => {
    const y = scrollY, down = y > lastY + 2, up = y < lastY - 2;
    if (nav) {
      nav.classList.toggle('scrolled', y > 24);
      if (!sheetOpen && down && y > 360) nav.classList.add('hide');
      if (up || y < 120) nav.classList.remove('hide');
    }
    if (demo) { if (down && y > 360) demo.classList.add('hide'); if (up || y < 120) demo.classList.remove('hide'); }
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  nav && nav.addEventListener('focusin', () => nav.classList.remove('hide'));
  demo && demo.addEventListener('focusin', () => demo.classList.remove('hide'));
  const navLinks = $$('.nav-links a');
  if ('IntersectionObserver' in window && navLinks.length) {
    const byId = new Map(navLinks.map((a) => [(a.getAttribute('href').split('#')[1] || ''), a]));
    const io = new IntersectionObserver((ents) => {
      ents.forEach((e) => {
        if (!e.isIntersecting) return;
        const key = e.target.id === 'propios' || e.target.id === 'muzzaga' ? 'proyectos' : e.target.id;
        const a = byId.get(key); if (!a) return;
        navLinks.forEach((x) => x.removeAttribute('aria-current'));
        a.setAttribute('aria-current', 'true');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['proyectos', 'muzzaga', 'propios', 'servicios', 'estudio', 'contacto'].forEach((id) => { const el = document.getElementById(id); el && io.observe(el); });
  }

  /* ── Menú en hoja ── */
  const sheet = $('#menu'), openBtn = $('[data-menu-open]');
  let lastFocus = null;
  const focusables = (root) => $$('a[href],button:not([disabled]),input,textarea,[tabindex]:not([tabindex="-1"])', root).filter((el) => !el.closest('[hidden]'));
  const openSheet = () => {
    if (!sheet) return;
    lastFocus = document.activeElement; sheet.hidden = false; sheetOpen = true;
    requestAnimationFrame(() => requestAnimationFrame(() => sheet.classList.add('open')));
    openBtn && openBtn.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
    setTimeout(() => { const c = $('[data-menu-close]'); c && c.focus(); }, 30);
  };
  const closeSheet = (restore = true) => {
    if (!sheet || !sheetOpen) return;
    sheet.classList.remove('open'); sheetOpen = false;
    openBtn && openBtn.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
    setTimeout(() => { if (!sheetOpen) sheet.hidden = true; }, rm() ? 0 : 520);
    if (restore && lastFocus) lastFocus.focus();
  };
  openBtn && openBtn.addEventListener('click', openSheet);
  $$('[data-menu-close]').forEach((b) => b.addEventListener('click', () => closeSheet()));
  sheet && $$('a', sheet).forEach((a) => a.addEventListener('click', () => closeSheet(false)));
  const trap = (root, e) => {
    const f = focusables(root); if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { last.focus(); e.preventDefault(); }
    else if (!e.shiftKey && document.activeElement === last) { first.focus(); e.preventDefault(); }
  };
  document.addEventListener('keydown', (e) => {
    if (sheetOpen) { if (e.key === 'Escape') closeSheet(); if (e.key === 'Tab') trap(sheet, e); }
    else if (portalOpen) { if (e.key === 'Escape') closePortal(); if (e.key === 'Tab') trap(portalEl, e); }
  });

  /* ── Entradas al hacer scroll (siempre desde un estado visible) ── */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((ents) => ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.04, rootMargin: '0px 0px -4% 0px' });
    $$('.rise,.clip-in').forEach((el) => io.observe(el));
  } else $$('.rise,.clip-in').forEach((el) => el.classList.add('in'));

  /* ══ HERO ══ */
  const ctl = { i: $('[data-reel-i]'), total: $('[data-reel-total]'), name: $('[data-reel-name]'), what: $('[data-reel-what]'), link: $('[data-reel-link]'), pause: $('[data-reel-pause]') };
  const pad = (n) => String(n + 1).padStart(2, '0');
  const setCaption = (s, i, total) => {
    if (!ctl.name) return;
    ctl.i.textContent = pad(i); ctl.name.textContent = s.name; ctl.what.textContent = '· ' + s.what; ctl.link.href = s.href;
    if (ctl.total && total) ctl.total.textContent = String(total).padStart(2, '0');
  };
  let paused = rm() || CAPTURE, hoverPause = false, heroVisible = true;

  /* Hero A · el 7 se dibuja en dos trazos y corta entre proyectos */
  const SLIDES = [
    { name: 'Muzzaga Pádel', what: 'Sitio, reservas y recorrido 3D', shot: '/assets/shots/muzzaga-2026-10.webp', y: 27, phone: '/assets/phones/muzzaga-mobile-2026-10.webp', c: '#0f1a33', href: '/casos/muzzaga' },
    { name: 'Poné La Pava', what: 'Tienda online', shot: '/assets/shots/pone-la-pava-2026-10.webp', y: 30, phone: '/assets/phones/pone-la-pava-mobile-2026-10.webp', c: '#c9ad7c', href: '/casos/pone-la-pava' },
    { name: 'Apex Performance', what: 'Producto propio', shot: '/assets/shots/apex-ai-2026-10.webp', y: 7, phone: '/assets/phones/apex-ai-mobile-2026-10b.webp', c: '#f5c400', href: '/casos/apex' },
    { name: 'Pravilo', what: 'Sitio web', shot: '/assets/shots/pravilo-2026-09.webp', y: 30, phone: '/assets/phones/pravilo-mobile-2026-10.webp', c: '#e0303f', href: '/casos/pravilo' },
  ];
  const seven = $('[data-seven]'), bar = $('[data-bar]'), stem = $('[data-stem]');
  let cur = 0, busy = false, timer = null;
  const barLayer = (s) => { const l = document.createElement('div'); l.className = 'layer next'; const s8 = s.shot.replace('.webp', '-800.webp'); l.innerHTML = `<img src="${s.shot}" srcset="${s8} 800w, ${s.shot} 1600w" sizes="(max-width: 1099px) 92vw, 570px" alt="Sitio de ${s.name} en computadora" style="--y:${s.y}" width="1600" height="1000">`; return l; };
  const stemLayer = (s) => { const l = document.createElement('div'); l.className = 'layer next'; l.style.setProperty('--c', s.c); l.innerHTML = `<span class="glow"></span><div class="phone"><img class="scr" src="${s.phone}" alt="Sitio de ${s.name} en celular"><img class="frm" src="/assets/phones/marco.webp" alt=""></div>`; return l; };
  const blade = () => { const l = document.createElement('div'); l.className = 'layer next'; l.style.background = 'var(--signal)'; return l; };
  // Corte diagonal a 67°: S = cuánto se corre el borde de arriba a abajo, en % del ancho de la ventana
  const cutFrames = (S) => [{ clipPath: `polygon(-80% 0,0% 0,${-S}% 100%,-80% 100%)` }, { clipPath: `polygon(-80% 0,${100 + S}% 0,100% 100%,-80% 100%)` }];
  const wipe = (box, layer, S, delay, dur = 760) => { box.appendChild(layer); return layer.animate(cutFrames(S), { duration: dur, delay, easing: EASE_CUT, fill: 'both' }); };
  const goA = (n, instant = false) => {
    if (!bar || busy) return;
    cur = (n + SLIDES.length) % SLIDES.length;
    const s = SLIDES[cur];
    const oldB = $('.layer.cur', bar), oldS = $('.layer.cur', stem);
    const nb = barLayer(s), ns = stemLayer(s);
    const finish = () => {
      oldB && oldB.remove(); oldS && oldS.remove();
      $$('.layer.next', bar).concat($$('.layer.next', stem)).forEach((l) => { if (l.style.background) l.remove(); else { l.classList.remove('next'); l.classList.add('cur'); l.getAnimations().forEach((a) => a.cancel()); } });
      busy = false;
    };
    setCaption(s, cur, SLIDES.length);
    if (instant || rm()) { bar.appendChild(nb); stem.appendChild(ns); finish(); return; }
    busy = true;
    wipe(bar, blade(), 10.9, 0, 640); wipe(bar, nb, 10.9, 90, 700);
    wipe(stem, blade(), 50.6, 150, 640);
    wipe(stem, ns, 50.6, 240, 700).finished.then(finish).catch(finish);
  };
  const introA = () => {
    if (!bar) return [];
    const anims = [];
    anims.push(bar.animate([{ clipPath: 'polygon(0 0,0% 0,0% 100%,0 100%)' }, { clipPath: 'polygon(0 0,100% 0,89.1% 100%,0 100%)' }], { duration: 680, easing: EASE_CUT, fill: 'backwards' }));
    anims.push(stem.animate([{ clipPath: 'polygon(50.6% 0,100% 0,100% 0,50.6% 0)' }, { clipPath: 'polygon(50.6% 0,100% 0,49.4% 100%,0 100%)' }], { duration: 620, delay: 380, easing: EASE_CUT, fill: 'backwards' }));
    $$('.founder', seven).forEach((f, k) => anims.push(f.animate([{ transform: 'translateY(12px)', opacity: 0.4 }, { transform: 'none', opacity: 1 }], { duration: 520, delay: 760 + k * 160, easing: EASE_OUT, fill: 'backwards' })));
    return anims;
  };
  const introTitle = () => {
    const a = $('[data-h1a]'), b = $('[data-h1b]'), out = [];
    a && out.push(a.animate([{ fontStretch: '118%' }, { fontStretch: '100%' }], { duration: 900, easing: EASE_OUT }));
    b && out.push(b.animate([{ fontStretch: '78%' }, { fontStretch: '62%' }], { duration: 900, delay: 80, easing: EASE_OUT, fill: 'backwards' }));
    return out;
  };

  /* Hero B · Portal: los proyectos salen de los anillos del logo */
  const tbox = $('[data-tunnel]');
  const TB = { w: 640, h: 700, vp: [548, 352], s: 0.66 };
  const TSL = [
    { name: 'Muzzaga Pádel', what: 'Sitio, reservas y recorrido 3D', img: '/assets/shots/muzzaga-2026-10.webp', href: '/casos/muzzaga' },
    { name: 'Poné La Pava', what: 'Tienda online', img: '/assets/shots/pone-la-pava-2026-10.webp', href: '/casos/pone-la-pava' },
    { name: 'Apex Performance', what: 'Producto propio', img: '/assets/shots/apex-ai-2026-10.webp', href: '/casos/apex' },
    { name: 'Sentinel', what: 'Producto propio', img: '/assets/shots/sentinel-2026-10.webp', href: '/casos/sentinel' },
    { name: 'Pravilo', what: 'Sitio web', img: '/assets/shots/pravilo-2026-09.webp', href: '/casos/pravilo' },
  ];
  const POSE = { cx: 236, cy: 404, w: 404 };
  let tCur = 0, tBusy = false, tTimer = null, tCard = null;
  const crescent = (cx, cy, rx, rx2, ry) => { const f = (n) => (+n).toFixed(1); return `M${f(cx)} ${f(cy - ry)}A${f(rx)} ${f(ry)} 0 0 0 ${f(cx)} ${f(+cy + +ry)}A${f(rx2)} ${f(ry)} 0 0 1 ${f(cx)} ${f(cy - ry)}Z`; };
  const tCardEl = (s) => {
    const f = document.createElement('figure'); f.className = 't-card front';
    f.style.left = (POSE.cx / TB.w * 100) + '%'; f.style.top = (POSE.cy / TB.h * 100) + '%'; f.style.width = (POSE.w / TB.w * 100) + '%';
    f.innerHTML = `<img src="${s.img}" alt="Sitio de ${s.name}"><figcaption><b>${s.name}</b><span>${s.what}</span></figcaption>`;
    return f;
  };
  const goB = (n, instant = false) => {
    if (!tbox || tBusy) return;
    tCur = (n + TSL.length) % TSL.length;
    const s = TSL[tCur];
    const inner = $('.tunnel', tbox); const nc = tCardEl(s); inner.appendChild(nc);
    const old = tCard; tCard = nc;
    setCaption(s, tCur, TSL.length);
    if (instant || rm() || !old) { old && old.remove(); return; }
    tBusy = true;
    const dx = (TB.vp[0] - POSE.cx) / POSE.w * 100, dy = (TB.vp[1] - POSE.cy) / (POSE.w * 0.625) * 100;
    nc.animate([{ transform: `translate(-50%,-50%) translate(${dx}%,${dy}%) scale(.06)`, opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'translate(-50%,-50%)', opacity: 1 }], { duration: 1000, easing: EASE_OUT });
    const done = () => { old.remove(); tBusy = false; };
    old.animate([{ transform: 'translate(-50%,-50%)', opacity: 1 }, { transform: 'translate(-50%,-50%) translate(-22%,14%) scale(1.45)', opacity: 0 }], { duration: 760, easing: 'cubic-bezier(.5,0,.75,0)', fill: 'forwards' }).finished.then(done).catch(done);
    const rings = $('[data-tunnel-rings] g', tbox);
    rings && rings.animate([{ transform: 'scale(1)' }, { transform: `scale(${1 / TB.s})`, opacity: 0.55, offset: 0.6 }, { transform: 'scale(1)', opacity: 1 }], { duration: 1000, easing: 'cubic-bezier(.3,.6,.3,1)' });
  };
  const introB = () => {
    if (!tbox) return [];
    const out = [];
    const rings = $$('[data-tunnel-rings] .ring', tbox);
    rings.forEach((r, i) => out.push(r.animate([{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 700, delay: (rings.length - i) * 70, easing: EASE_OUT, fill: 'backwards' })));
    if (tCard) {
      const dx = (TB.vp[0] - POSE.cx) / POSE.w * 100, dy = (TB.vp[1] - POSE.cy) / (POSE.w * 0.625) * 100;
      out.push(tCard.animate([{ transform: `translate(-50%,-50%) translate(${dx}%,${dy}%) scale(.06)`, opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'translate(-50%,-50%)', opacity: 1 }], { duration: 1000, delay: 380, easing: EASE_OUT, fill: 'backwards' }));
    }
    return out;
  };
  if (tbox) {
    const svg = $('[data-tunnel-rings]', tbox);
    const [vx, vy] = TB.vp; const base = { cx: 300, rx: 290, rx2: 206, ry: 336 };
    let html = `<g style="transform-origin:${vx}px ${vy}px">`;
    for (let i = 0; i < 6; i++) {
      const k = Math.pow(TB.s, i), cx = vx - (vx - base.cx) * k;
      html += `<path class="ring" style="transform-origin:${vx}px ${vy}px" d="${crescent(cx, vy, base.rx * k, base.rx2 * k, base.ry * k)}" opacity="${(1 - i * 0.07).toFixed(2)}"/>`;
    }
    html += `<ellipse cx="${vx + 26}" cy="${vy}" rx="9" ry="24" fill="var(--signal)"/></g>`;
    svg.innerHTML = html;
    goB(0, true);
  }

  /* Controlador común: el selector de la demo cambia de hero sin recargar */
  const H = {
    a: { go: goA, i: () => cur, list: SLIDES, intro: () => introA().concat(introTitle()), timerSet: (fn, ms) => { timer = setTimeout(fn, ms); }, timerClear: () => clearTimeout(timer), every: 6000 },
    b: { go: goB, i: () => tCur, list: TSL, intro: () => introB().concat(introTitle()), timerSet: (fn, ms) => { tTimer = setTimeout(fn, ms); }, timerClear: () => clearTimeout(tTimer), every: 5200 },
  };
  const hasHero = !!(seven || tbox);
  const active = () => H[d.dataset.hero === 'b' ? 'b' : 'a'];
  const schedule = () => {
    H.a.timerClear(); H.b.timerClear();
    if (!hasHero || paused || hoverPause || !heroVisible || document.hidden) return;
    const h = active(); h.timerSet(() => { h.go(h.i() + 1); schedule(); }, h.every);
  };
  const setPaused = (p) => {
    paused = p;
    if (ctl.pause) { ctl.pause.setAttribute('aria-label', p ? 'Reanudar el cambio automático' : 'Pausar el cambio automático'); ctl.pause.querySelector('use').setAttribute('href', p ? '#i-play' : '#i-pause'); }
    schedule();
  };
  const syncDemo = () => $$('[data-set-hero]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.setHero === (d.dataset.hero || 'a'))));
  const setHero = (h, { animate = true, announce = false } = {}) => {
    h = h === 'b' ? 'b' : 'a';
    d.dataset.hero = h; store.set('se7en-demo-hero', h); syncDemo();
    try { const u = new URL(location.href); if (h === 'b') u.searchParams.set('hero', 'b'); else u.searchParams.delete('hero'); history.replaceState(history.state, '', u); } catch (e) {}
    if (!hasHero) return;
    const s = active(); setCaption(s.list[s.i()], s.i(), s.list.length);
    if (animate && !rm() && !CAPTURE && scrollY < innerHeight) s.intro();
    schedule();
    if (announce) toast(h === 'b' ? 'Hero B · Portal' : 'Hero A · El 7 como vitrina');
  };
  if (hasHero) {
    seven && seven.addEventListener('mouseenter', () => { hoverPause = true; schedule(); });
    seven && seven.addEventListener('mouseleave', () => { hoverPause = false; schedule(); });
    tbox && tbox.addEventListener('mouseenter', () => { hoverPause = true; schedule(); });
    tbox && tbox.addEventListener('mouseleave', () => { hoverPause = false; schedule(); });
    $('[data-reel-next]').addEventListener('click', () => { const h = active(); h.go(h.i() + 1); schedule(); });
    $('[data-reel-prev]').addEventListener('click', () => { const h = active(); h.go(h.i() - 1); schedule(); });
    ctl.pause && ctl.pause.addEventListener('click', () => setPaused(!paused));
    document.addEventListener('visibilitychange', schedule);
    const heroEl = $('.hero');
    if ('IntersectionObserver' in window && heroEl) new IntersectionObserver(([e]) => { heroVisible = e.isIntersecting; schedule(); }).observe(heroEl);
    const startSlide = parseInt(q.get('slide') || '0', 10);
    if (startSlide) { goA(startSlide, true); goB(startSlide, true); }
  }
  // Elección inicial: parámetro, después lo que eligió la última vez, si no el A
  setHero(q.get('hero') || store.get('se7en-demo-hero') || 'a', { animate: !CAPTURE });
  setPaused(paused);
  $$('[data-set-hero]').forEach((b) => b.addEventListener('click', () => {
    if (!hasHero) { store.set('se7en-demo-hero', b.dataset.setHero); location.href = '/' + (b.dataset.setHero === 'b' ? '?hero=b' : ''); return; }
    if ((d.dataset.hero || 'a') === b.dataset.setHero) return;
    setHero(b.dataset.setHero, { animate: true, announce: true });
  }));

  /* ── Videos: en compu se reproducen al pasar el mouse; en celular, solo si tocás ── */
  const canAuto = () => !touch && !saveData && !CAPTURE && !rm();
  $$('[data-hover-video]').forEach((v) => {
    const st = v.closest('.stage') || v.parentElement;
    st.addEventListener('mouseenter', () => { if (canAuto()) v.play().catch(() => {}); });
    st.addEventListener('mouseleave', () => { if (!v.dataset.manual) v.pause(); });
  });
  $$('[data-play]').forEach((b) => b.addEventListener('click', () => {
    const v = b.parentElement.querySelector('video'); if (!v) return;
    if (v.paused) { v.dataset.manual = '1'; v.play().catch(() => {}); b.lastChild.textContent = ' Pausar'; }
    else { v.pause(); b.lastChild.textContent = ' Ver en movimiento'; }
  }));
  if ('IntersectionObserver' in window) {
    const vio = new IntersectionObserver((ents) => ents.forEach((e) => { const v = e.target; if (e.isIntersecting && canAuto()) v.play().catch(() => {}); else v.pause(); }), { threshold: 0.5 });
    $$('[data-inview-video]').forEach((v) => vio.observe(v));
  }

  /* ── Pestañas de proyectos (para clientes / propios) ── */
  const tabs = $$('[data-tab]');
  if (tabs.length && 'IntersectionObserver' in window) {
    const tio = new IntersectionObserver((ents) => ents.forEach((e) => {
      if (!e.isIntersecting) return;
      tabs.forEach((t) => { if (t.getAttribute('href') === '#' + e.target.id) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current'); });
    }), { rootMargin: '-40% 0px -55% 0px' });
    ['clientes', 'propios'].forEach((id) => { const el = document.getElementById(id); el && tio.observe(el); });
  }

  /* ── Comparador boceto → producto (corte a 67°) ── */
  const cmpSet = (c, v) => { const p = Math.max(-18, Math.min(118, v)); c.style.setProperty('--p', p.toFixed(1)); const h = $('.handle', c); h.style.left = Math.max(6, Math.min(94, p)) + '%'; h.setAttribute('aria-valuenow', String(Math.round(Math.max(0, Math.min(100, p))))); return p; };
  $$('[data-cmp]').forEach((c) => {
    let p = parseFloat(c.style.getPropertyValue('--p')) || 56, drag = false;
    const at = (e) => { const r = c.getBoundingClientRect(); return (e.clientX - r.left) / r.width * 100; };
    c.addEventListener('pointerdown', (e) => { drag = true; c.setPointerCapture(e.pointerId); p = cmpSet(c, at(e)); });
    c.addEventListener('pointermove', (e) => { if (drag) p = cmpSet(c, at(e)); });
    ['pointerup', 'pointercancel'].forEach((t) => c.addEventListener(t, () => { drag = false; }));
    $('.handle', c).addEventListener('keydown', (e) => {
      const m = { ArrowLeft: -5, ArrowRight: 5, PageDown: -20, PageUp: 20 };
      if (m[e.key]) { p = cmpSet(c, p + m[e.key]); e.preventDefault(); }
      if (e.key === 'Home') { p = cmpSet(c, -18); e.preventDefault(); }
      if (e.key === 'End') { p = cmpSet(c, 118); e.preventDefault(); }
    });
    cmpSet(c, p);
    if (!CAPTURE && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return; io.disconnect(); if (rm()) return;
        const t0 = performance.now(), base = p;
        const step = (t) => { const k = Math.min(1, (t - t0) / 1500); const v = base + Math.sin(k * Math.PI * 2) * 22 * (1 - k); cmpSet(c, v); if (k < 1 && !drag) requestAnimationFrame(step); else p = cmpSet(c, base); };
        requestAnimationFrame(step);
      }, { threshold: 0.6 });
      io.observe(c);
    }
  });

  /* ── Oficina: personajes vivos solo en pantalla, pines con la sala ── */
  const ROOMS = [
    { n: '01', name: 'Takefyy', txt: 'Carta digital y pedidos para restaurantes. Producto propio de Franco.', href: '/casos/takefyy' },
    { n: '02', name: 'Apex Performance', txt: 'Software para entrenadores de fuerza. Producto propio de Federico.', href: '/casos/apex' },
    { n: '03', name: 'Poné La Pava', txt: 'Tienda online con identidad editorial y stock en tiempo real.', href: '/casos/pone-la-pava' },
    { n: '04', name: 'Pravilo', txt: 'Sitio del primer centro Pravilo de Argentina, en Plottier.', href: '/casos/pravilo' },
    { n: '05', name: 'Muzzaga Pádel', txt: 'Sitio, reservas y recorrido 3D de un club de pádel en Catriel.', href: '/casos/muzzaga' },
    { n: '06', name: 'Sentinel', txt: 'Mapa de incendios con datos satelitales en vivo. Producto propio de Franco.', href: '/casos/sentinel' },
    { n: '07', name: 'Altum Sci', txt: 'Sitio corporativo de una inmobiliaria de Río Negro.', href: '/casos/altum-sci' },
    { n: '08', name: 'iPhone Vita', txt: 'Tienda de tecnología con catálogo y panel propio.', href: '/casos/iphone-vita' },
  ];
  const bindRooms = (root) => {
    const card = $('[data-room-card]', root); if (!card) return;
    const show = (pin) => {
      const r = ROOMS[+pin.dataset.room];
      $$('.pin', root).forEach((p) => p.setAttribute('aria-expanded', String(p === pin)));
      card.style.left = pin.style.left; card.style.top = pin.style.top;
      const lx = parseFloat(pin.style.left), ty = parseFloat(pin.style.top);
      const tx = lx < 16 ? '-12%' : lx > 84 ? '-88%' : '-50%';
      card.style.transform = ty < 38 ? `translate(${tx},34px)` : `translate(${tx},calc(-100% - 30px))`;
      card.innerHTML = `<span class="pixl">Sala ${r.n}</span><h4>${r.name}</h4><p>${r.txt}</p><a class="link-7" href="${r.href}"><span class="l">Ver el caso</span></a>`;
    };
    $$('.pin', root).forEach((pin) => { pin.addEventListener('mouseenter', () => show(pin)); pin.addEventListener('focus', () => show(pin)); pin.addEventListener('click', () => show(pin)); });
    const pre = $('.pin[aria-expanded="true"]', root); pre && show(pre);
  };
  const charAnim = (root) => {
    const seqs = { fed: ['federico-21', 'federico-20', 'federico-21', 'federico-22', 'federico-00', 'federico-01'], fra: ['franco-45', 'franco-46', 'franco-47', 'franco-48'] };
    const ms = { fed: 420, fra: 180 }, timers = [];
    const start = () => { if (rm() || CAPTURE || timers.length) return; $$('[data-char]', root).forEach((el) => { const s = seqs[el.dataset.char]; let k = 0; timers.push(setInterval(() => { k = (k + 1) % s.length; el.src = '/assets/chars/' + s[k] + '.webp'; }, ms[el.dataset.char])); }); };
    const stop = () => { timers.splice(0).forEach(clearInterval); };
    return { start, stop };
  };
  const vit = $('[data-vitrina]');
  if (vit) {
    bindRooms(vit);
    const ca = charAnim(vit);
    if ('IntersectionObserver' in window) new IntersectionObserver(([e]) => (e.isIntersecting ? ca.start() : ca.stop()), { threshold: 0.2 }).observe(vit);
    if (!touch) {
      const inn = $('.vit-in', vit);
      vit.addEventListener('pointermove', (e) => { if (rm()) return; const r = vit.getBoundingClientRect(); inn.style.setProperty('--rx', (((e.clientX - r.left) / r.width - 0.5) * 5).toFixed(2)); inn.style.setProperty('--ry', ((-(e.clientY - r.top) / r.height + 0.5) * 3.5).toFixed(2)); });
      vit.addEventListener('pointerleave', () => { inn.style.setProperty('--rx', 0); inn.style.setProperty('--ry', 0); });
    }
  }

  /* ── Portal: las experiencias se abren a pedido con los anillos del logo ── */
  const portalEl = $('[data-portal-el]'), ringsEl = $('[data-portal-rings]');
  let portalOpen = false, portalOrigin = null, portalReturn = null, portalCA = null;
  const portalContent = (kind) => {
    const body = $('[data-portal-body]'), foot = $('[data-portal-foot]'), title = $('[data-portal-title]');
    body.innerHTML = ''; foot.innerHTML = '';
    if (kind === 'office') {
      title.textContent = 'Oficina SE7EN · demostración';
      const floor = $('.vit-floor');
      const w = document.createElement('div'); w.className = 'office-live';
      if (floor) w.innerHTML = floor.outerHTML;
      body.appendChild(w); bindRooms(w); portalCA = charAnim(w); portalCA.start();
      foot.innerHTML = '<span><b>Demostración:</b> la oficina real con sus salas. El motor jugable (tu personaje, zoom y salas vivas) está en el sitio actual.</span><a class="btn-ghost" href="https://www.se7en.com.ar/#en-vivo" target="_blank" rel="noopener">Abrir la oficina real ↗</a>';
    } else if (kind === 'tour') {
      title.textContent = 'Muzzaga Pádel · recorrido 3D';
      if (!(window.SE7EN_TOUR_BUILD && window.SE7EN_TOUR_BUILD(body, foot))) {
        body.innerHTML = '<div class="viewer"><video controls muted playsinline loop poster="/assets/muzzaga/preview-3d-poster.webp" style="width:100%;height:100%;object-fit:contain"><source src="/assets/muzzaga/preview-3d.mp4" type="video/mp4"></video></div>';
        foot.innerHTML = '<span>Vista previa liviana.</span><a class="btn-ghost" href="https://muzzaga-padel-seven.vercel.app/" target="_blank" rel="noopener">Abrir el recorrido real ↗</a>';
      }
    }
  };
  const ringFrames = (svg, x, y, out) => {
    const R = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    svg.setAttribute('viewBox', `0 0 ${innerWidth} ${innerHeight}`);
    let html = '';
    for (let i = 0; i < 5; i++) html += `<g transform="translate(${x} ${y})"><g class="pr"><use href="#rings" x="-50" y="-50" width="100" height="100" style="color:var(--signal)"/></g></g>`;
    svg.innerHTML = html;
    return $$('.pr', svg).map((g, i) => g.animate(
      out ? [{ transform: `scale(${R / 40})`, opacity: 0.9 }, { transform: 'scale(.2)', opacity: 0 }]
          : [{ transform: 'scale(.15)', opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: `scale(${R / 38})`, opacity: 0 }],
      { duration: out ? 420 : 900, delay: i * 70, easing: out ? EASE_CUT : 'cubic-bezier(.4,0,.2,1)', fill: 'both' }));
  };
  const openPortal = (kind, trigger, ev) => {
    if (!portalEl) return;
    portalReturn = trigger || document.activeElement;
    const r = trigger ? trigger.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const x = ev && ev.clientX ? ev.clientX : r.left + r.width / 2, y = ev && ev.clientY ? ev.clientY : r.top + r.height / 2;
    portalOrigin = [x, y];
    portalContent(kind);
    portalEl.getAnimations().forEach((a) => a.cancel()); // sin restos del cierre anterior
    portalEl.hidden = false; portalEl.classList.add('open'); portalOpen = true;
    document.body.style.overflow = 'hidden';
    if (!rm()) {
      ringsEl.classList.add('on');
      const anims = ringFrames($('svg', ringsEl), x, y, false);
      Promise.all(anims.map((a) => a.finished)).then(() => ringsEl.classList.remove('on')).catch(() => ringsEl.classList.remove('on'));
      portalEl.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${Math.hypot(innerWidth, innerHeight)}px at ${x}px ${y}px)` }], { duration: 760, delay: 120, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'backwards' });
    } else portalEl.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160 });
    setTimeout(() => { const c = $('[data-portal-close]'); c && c.focus(); }, 60);
  };
  const closePortal = () => {
    if (!portalOpen) return;
    portalOpen = false; portalCA && portalCA.stop();
    const done = () => { portalEl.hidden = true; portalEl.classList.remove('open'); portalEl.getAnimations().forEach((a) => a.cancel()); $('[data-portal-body]').innerHTML = ''; document.body.style.overflow = ''; portalReturn && portalReturn.focus && portalReturn.focus(); };
    if (rm()) { done(); return; }
    const [x, y] = portalOrigin || [innerWidth / 2, innerHeight / 2];
    portalEl.animate([{ clipPath: `circle(${Math.hypot(innerWidth, innerHeight)}px at ${x}px ${y}px)` }, { clipPath: `circle(0px at ${x}px ${y}px)` }], { duration: 420, easing: EASE_CUT, fill: 'forwards' }).finished.then(done).catch(done);
  };
  $$('[data-portal]').forEach((t) => t.addEventListener('click', (e) => { e.preventDefault(); closeSheet(false); openPortal(t.dataset.portal, t, e); }));
  $$('[data-portal-close]').forEach((b) => b.addEventListener('click', closePortal));
  portalEl && portalEl.addEventListener('click', (e) => { const a = e.target.closest('a[href^="/"]'); if (a) { portalOpen = false; document.body.style.overflow = ''; } });

  /* ── Formulario: chips, validación y envío simulado (no sale ningún dato) ── */
  const form = $('[data-form]');
  if (form) {
    $$('.chip', form).forEach((c) => c.addEventListener('click', () => c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'))));
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const n = $('#f-nombre').value.trim(), c = $('#f-contacto').value.trim(), err = $('[data-err]');
      if (!n || !c) { err.textContent = 'Falta tu nombre y un mail o WhatsApp para responderte.'; (n ? $('#f-contacto') : $('#f-nombre')).focus(); return; }
      err.textContent = ''; form.classList.add('sent'); const h = $('.form-ok h3', form); h.setAttribute('tabindex', '-1'); h.focus();
    });
    const again = $('[data-form-again]', form);
    again && again.addEventListener('click', () => { form.reset(); form.classList.remove('sent'); $('#f-nombre').focus(); });
  }

  /* ── Ganchos para capturas de revisión (no afectan al uso normal) ── */
  window.__sb = {
    heroIntro(t) { const a = introA().concat(introTitle()); a.forEach((x) => { x.pause(); x.currentTime = t; }); },
    portal(kind, t, x, y) {
      portalContent(kind); portalEl.hidden = false; portalEl.classList.add('open'); ringsEl.classList.add('on');
      const anims = ringFrames($('svg', ringsEl), x, y, false);
      anims.push(portalEl.animate([{ clipPath: `circle(0px at ${x}px ${y}px)` }, { clipPath: `circle(${Math.hypot(innerWidth, innerHeight)}px at ${x}px ${y}px)` }], { duration: 760, delay: 120, easing: 'cubic-bezier(.6,0,.2,1)', fill: 'both' }));
      anims.forEach((a) => { a.pause(); a.currentTime = t; });
    },
    menu(open) { if (open) { sheet.hidden = false; sheet.classList.add('open'); } else closeSheet(false); },
  };
})();

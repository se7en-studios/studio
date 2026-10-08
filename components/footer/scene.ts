// Se7en footer scene — pure functions shared by demo + React component.
// buildSVG(): markup del SVG (determinístico) · bindScene(root)(p): aplica el estado para p ∈ [0,1]

const W = 1600,
  H = 900,
  ACC = "#ff4d2e";
const rng = (s: number) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const P = (a: number[][]) =>
  a.map((q) => q.map((n) => Math.round(n * 10) / 10).join(",")).join(" ");
const hex = (h: string) =>
  [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lerpC = (a: string, b: string, t: number) => {
  const A = hex(a),
    B = hex(b);
  return (
    "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",") + ")"
  );
};

function lowPoly(seed: number, outline: number[][]): string {
  const r = rng(seed),
    cols = 10,
    rows = 15,
    GW = 480,
    GH = 800,
    x0 = -20,
    y0 = 110;
  const g: number[][][] = [];
  for (let j = 0; j <= rows; j++) {
    g[j] = [];
    for (let i = 0; i <= cols; i++) {
      const e = i === 0 || i === cols || j === 0 || j === rows;
      g[j][i] = [
        x0 + (i * GW) / cols + (e ? 0 : (r() - 0.5) * 38),
        y0 + (j * GH) / rows + (e ? 0 : (r() - 0.5) * 38),
      ];
    }
  }
  let out = "";
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const a = g[j][i],
        b = g[j][i + 1],
        c = g[j + 1][i + 1],
        d = g[j + 1][i];
      const tris =
        r() > 0.5
          ? [
              [a, b, c],
              [a, c, d],
            ]
          : [
              [a, b, d],
              [b, c, d],
            ];
      tris.forEach((t, k) => {
        const cx = (t[0][0] + t[1][0] + t[2][0]) / 3,
          cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
        // distance to canyon edge of this row (outline x at this y)
        let ex = 0;
        for (let n = 0; n < outline.length - 2; n++) {
          const [x1, y1] = outline[n],
            [x2, y2] = outline[n + 1];
          if (cy >= y1 && cy <= y2)
            ex = x1 + (x2 - x1) * ((cy - y1) / (y2 - y1 || 1));
        }
        const edge = Math.max(0, 1 - Math.abs(ex - cx) / 130);
        const depth = (cy - 150) / 750;
        const base = lerpC(
          "#2e2e34",
          "#0c0c0e",
          Math.min(1, Math.max(0, depth * 0.9 + (r() - 0.5) * 0.35 + k * 0.06)),
        );
        const ember =
          Math.pow(edge, 1.6) * (1 - depth * 0.55) * (0.55 + r() * 0.45);
        const fill =
          ember > 0.05
            ? lerpC(
                rgbToHex(base),
                ember > 0.6 ? "#ff7a52" : ACC,
                Math.min(0.85, ember),
              )
            : base;
        out += `<polygon points="${P(t)}" fill="${fill}" stroke="${fill}" stroke-width="1"/>`;
      });
    }
  return out;
}
function rgbToHex(rgb: string) {
  return (
    "#" +
    (rgb.match(/\d+/g) || [])
      .map((n) => (+n).toString(16).padStart(2, "0"))
      .join("")
  );
}

const CL = [
  [0, 160],
  [120, 182],
  [240, 220],
  [330, 288],
  [368, 372],
  [338, 470],
  [384, 560],
  [348, 662],
  [398, 762],
  [372, 900],
  [0, 900],
];
const CR = [
  [0, 196],
  [140, 206],
  [250, 248],
  [335, 306],
  [350, 396],
  [380, 478],
  [346, 566],
  [394, 668],
  [362, 900],
  [0, 900],
];
const ARCH = "M340 860 C470 250 1130 250 1260 860";
const FAR =
  "M0 640 L80 560 L140 590 L210 470 L245 500 L290 380 L320 420 L352 300 L372 330 L398 250 L420 360 L470 440 L540 480 L600 380 L640 300 L662 330 L690 200 L712 250 L736 150 L758 230 L790 190 L812 290 L846 350 L900 300 L940 230 L962 270 L990 180 L1016 260 L1050 330 L1110 400 L1170 330 L1210 360 L1250 280 L1276 320 L1320 400 L1400 450 L1470 420 L1600 520 V900 H0Z";
const MID =
  "M0 720 L110 640 L200 676 L330 600 L450 664 L560 626 L690 690 L800 650 L930 700 L1060 630 L1180 680 L1300 624 L1440 680 L1600 640 V900 H0Z";

function bridgeGeo() {
  const bez = (t: number): [number, number] => {
    const u = 1 - t;
    return [
      u * u * u * 340 +
        3 * u * u * t * 470 +
        3 * u * t * t * 1130 +
        t * t * t * 1260,
      u * u * u * 860 +
        3 * u * u * t * 250 +
        3 * u * t * t * 250 +
        t * t * t * 860,
    ];
  };
  const S = Array.from({ length: 500 }, (_, i) => bez(i / 499));
  const archY = (x: number) => {
    if (x < 340 || x > 1260) return 860;
    let b = S[0];
    for (const s of S) if (Math.abs(s[0] - x) < Math.abs(b[0] - x)) b = s;
    return b[1] - 24;
  };
  const win: string[] = [];
  for (let cx = 232; cx <= 1370; cx += 76) {
    const w = 46,
      top = 388,
      bottom = Math.min(archY(cx - w / 2), archY(cx + w / 2)) - 14;
    if (bottom - top < 44) continue;
    win.push(
      `M${cx - w / 2} ${bottom} V${top + w / 2} A${w / 2} ${w / 2} 0 0 1 ${cx + w / 2} ${top + w / 2} V${bottom} Z`,
    );
  }
  return win;
}

export function buildSVG(): string {
  const sr = rng(11);
  let stars = "";
  for (let i = 0; i < 90; i++)
    stars += `<circle cx="${(sr() * W) | 0}" cy="${(sr() * 360) | 0}" r="${(sr() * 1.3 + 0.3).toFixed(2)}" fill="#f5f5f4" opacity="${(sr() * 0.6 + 0.2).toFixed(2)}"/>`;
  let grid = "";
  for (let x = 0; x <= W; x += 40)
    grid += `<line x1="${x}" y1="0" x2="${x}" y2="${H}"/>`;
  for (let y = 0; y <= H; y += 40)
    grid += `<line x1="0" y1="${y}" x2="${W}" y2="${y}"/>`;
  let posts = "";
  for (let x = 190; x <= 1410; x += 20)
    posts += `<line x1="${x}" y1="312" x2="${x}" y2="330"/>`;
  const win = bridgeGeo();
  const spandrel = "M200 366 H1400 V860 H1260 C1130 250 470 250 340 860 H200 Z";
  const bp = (d: string, extra = "") =>
    `<path class="bp" pathLength="1" d="${d}" ${extra}/>`;
  const MONO = `style="font-family:var(--font-chivo-mono,'Chivo Mono'),ui-monospace,monospace"`;

  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="s7-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070708"/><stop offset=".6" stop-color="#140c0b"/><stop offset="1" stop-color="#2a100b"/></linearGradient>
    <radialGradient id="s7-glow" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${ACC}" stop-opacity=".55"/><stop offset=".45" stop-color="${ACC}" stop-opacity=".18"/><stop offset="1" stop-color="${ACC}" stop-opacity="0"/></radialGradient>
    <linearGradient id="s7-word" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5f5f4" stop-opacity=".22"/><stop offset=".85" stop-color="#f5f5f4" stop-opacity="0"/></linearGradient>
    <linearGradient id="s7-fog" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0a0a0b" stop-opacity="0"/><stop offset="1" stop-color="#0a0a0b" stop-opacity=".9"/></linearGradient>
    <linearGradient id="s7-deck" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a3a42"/><stop offset="1" stop-color="#1c1c21"/></linearGradient>
    <linearGradient id="s7-body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f1f24"/><stop offset="1" stop-color="#121215"/></linearGradient>
    <radialGradient id="s7-light"><stop offset="0" stop-color="#fff1ea"/><stop offset=".25" stop-color="#ff8a6a" stop-opacity=".9"/><stop offset="1" stop-color="${ACC}" stop-opacity="0"/></radialGradient>
    <linearGradient id="s7-trail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${ACC}" stop-opacity="0"/><stop offset="1" stop-color="${ACC}"/></linearGradient>
    <mask id="s7-win"><rect width="${W}" height="${H}" fill="#fff"/>${win.map((d) => `<path d="${d}" fill="#000"/>`).join("")}</mask>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#s7-sky)"/>
</svg>${layer("stars", stars)}${layer("glow", `<ellipse cx="800" cy="600" rx="700" ry="380" fill="url(#s7-glow)"/>`)}${layer("word", `<text x="800" y="352" text-anchor="middle" style="font-family:var(--font-archivo,'Archivo'),system-ui,sans-serif" font-weight="800" font-size="250" letter-spacing="-12" fill="url(#s7-word)" stroke="#f5f5f4" stroke-opacity=".12" stroke-width="1.2">SE<tspan fill="#ff4d2e" fill-opacity=".38" stroke="#ff4d2e" stroke-opacity=".7">7</tspan>EN</text>`)}${layer("far", `<path d="${FAR}" fill="#131316"/><path d="${FAR}" fill="none" stroke="${ACC}" stroke-opacity=".35" stroke-width="1.5"/>`)}${layer("mid", `<path d="${MID}" fill="#0e0e10"/><path d="${MID}" fill="none" stroke="${ACC}" stroke-opacity=".18" stroke-width="1.2"/><rect y="560" width="${W}" height="340" fill="url(#s7-fog)"/>`)}${layer("grid", `<g stroke="${ACC}" stroke-opacity=".07" stroke-width="1">${grid}</g>`, "opacity:0")}${layer("bridge", `
    <g data-k="solid" opacity="0">
      <path mask="url(#s7-win)" fill="url(#s7-body)" d="${spandrel}"/>
      <path d="${ARCH}" fill="none" stroke="#26262c" stroke-width="48"/>
      <path d="${ARCH}" fill="none" stroke="${ACC}" stroke-opacity=".45" stroke-width="2" transform="translate(0,-24)"/>
      <rect x="180" y="330" width="1240" height="28" fill="url(#s7-deck)"/>
      <rect x="180" y="358" width="1240" height="8" fill="#0c0c0e"/>
      <g stroke="#4a4a52" stroke-width="3"><line x1="180" y1="312" x2="1420" y2="312"/>${posts}</g>
    </g>
    <g data-k="blue" fill="none" stroke="${ACC}" stroke-width="1.6" stroke-linecap="round">
      ${bp("M180 312 H1420")}${bp("M180 330 H1420 V366 H180 Z")}${bp(ARCH)}${bp("M340 860 C470 250 1130 250 1260 860", 'transform="translate(0,-24)" stroke-dasharray=".006 .006"')}
      ${win.map((d) => bp(d, 'stroke-width="1"')).join("")}
      ${bp("M180 276 V296 M1420 276 V296 M180 286 H1420", 'stroke-width="1"')}
      ${bp("M800 402 V486 M780 486 H820", 'stroke-width="1"')}
    </g>
    <g data-k="notes" fill="${ACC}" font-size="13" letter-spacing="1.5" ${MONO} opacity="0">
      <rect x="720" y="276" width="160" height="20" fill="#0a0a0b"/><text x="800" y="291" text-anchor="middle">LUZ 1.240 M</text>
      <text x="830" y="470">ARCO f/L 0.38</text>
      <text x="1436" y="352">CARGA ✓</text>
      <text x="96" y="352" text-anchor="start">v2.0</text>
    </g>
    <g data-k="deploy" opacity="0">
      <rect data-k="trail" x="180" y="327" width="0" height="3" fill="url(#s7-trail)"/>
      <g data-k="light"><circle r="34" fill="url(#s7-light)"/><circle r="4" fill="#fff5f0"/></g>
    </g>
    <g data-k="live" opacity="0" ${MONO} font-size="14" letter-spacing="1">
      <rect x="712" y="262" width="176" height="32" rx="16" fill="#0a0a0b" stroke="#3ddc97" stroke-opacity=".55"/>
      <circle cx="734" cy="278" r="4" fill="#3ddc97"/><text x="748" y="283" fill="#3ddc97">en vivo · 1 ms</text>
    </g>
`)}${cliff("cl", lowPoly(7, CL), CL, "")}${cliff("cr", lowPoly(77, CR), CR, `transform="translate(${W},0) scale(-1,1)"`)}`;
}

// Cada plano que se mueve o se desvanece entero va en su propio SVG dentro de
// un div-capa: transform/opacity CSS sólo recomponen, en vez de re-pintar toda
// la escena (las laderas solas son ~600 polígonos) en cada frame de scroll.
// Los gradientes/máscaras viven en el <defs> del primer SVG (url(#…) resuelve
// en todo el documento).
function layer(k: string, inner: string, style = "") {
  return `<div data-k="${k}" style="position:absolute;inset:0;will-change:transform,opacity;${style}"><svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${inner}</svg></div>`;
}
function cliff(k: string, polys: string, outline: number[][], flip: string) {
  return layer(
    k,
    `<defs><clipPath id="s7-${k}"><polygon points="${P(outline)}"/></clipPath></defs><g ${flip}><g clip-path="url(#s7-${k})">${polys}</g></g>`,
  );
}

// Unidades del viewBox → px con el escalado de "slice": requiere
// container-type:size en [data-art].
const vb = (v: number) => `calc(${v} * max(100cqw / ${W}, 100cqh / ${H}))`;

// ---------- animation ----------
const cl = (v: number) => Math.max(0, Math.min(1, v));
const seg = (p: number, a: number, b: number) => cl((p - a) / (b - a));
const eOut = (t: number) => 1 - Math.pow(1 - t, 3);
const eIO = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

export function bindScene(root: HTMLElement, ampVh = 14): (p: number) => void {
  const q = (k: string) => root.querySelector(`[data-k="${k}"]`);
  const n = Object.fromEntries(
    [
      "stars",
      "glow",
      "far",
      "word",
      "mid",
      "grid",
      "solid",
      "blue",
      "notes",
      "deploy",
      "trail",
      "light",
      "live",
      "cl",
      "cr",
      "bridge",
    ].map((k) => [k, q(k)]),
  ) as Record<string, Element | null>;
  const bps = Array.from(root.querySelectorAll<SVGPathElement>(".bp"));
  const ui = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
  // Escribir sólo lo que cambió: fuera del tramo activo de cada pieza los
  // valores quedan fijos y no hace falta invalidar nada.
  const last = new Map<string, string>();
  const changed = (key: string, v: string) =>
    last.get(key) !== v && (last.set(key, v), true);
  const set = (el: Element | null, a: string, v: string | number) => {
    const s = String(v);
    if (el && changed(`${el.getAttribute("data-k")}@${a}`, s))
      el.setAttribute(a, s);
  };
  // Capas (divs): transform en unidades del viewBox y opacity, vía CSS.
  const layer = (k: string, x: number, y: number, o = 1) => {
    const el = n[k];
    if (!(el instanceof HTMLElement)) return;
    const t = `translate3d(${vb(x)},${vb(y)},0)`;
    if (changed(`${k}.t`, t)) el.style.transform = t;
    if (changed(`${k}.o`, String(o))) el.style.opacity = String(o);
  };
  const art = root.querySelector<HTMLElement>("[data-art]");
  return (p: number) => {
    const pan = `translate3d(0,${mix(ampVh, 0, eIO(seg(p, 0.55, 0.9)))}vh,0)`;
    if (art && changed("art", pan)) art.style.transform = pan;
    const c = eOut(seg(p, 0, 0.55));
    layer("cl", mix(-520, 0, c), mix(90, 0, c));
    layer("cr", mix(520, 0, c), mix(90, 0, c));
    layer("far", 0, mix(140, 0, eOut(seg(p, 0, 0.7))));
    layer("mid", 0, mix(110, 0, c));
    {
      const w = eOut(seg(p, 0.5, 0.95));
      layer("word", 0, mix(230, 0, w), w);
    }
    layer("glow", 0, 0, mix(0.35, 1, seg(p, 0, 0.8)));
    layer("stars", 0, 0, seg(p, 0.1, 0.6));
    // blueprint
    layer("grid", 0, 0, seg(p, 0.22, 0.4) * (1 - seg(p, 0.62, 0.8)));
    const draw = eIO(seg(p, 0.28, 0.58));
    bps.forEach((el, i) => {
      const d = cl(draw * 1.25 - (i / bps.length) * 0.25);
      if (!changed(`bp${i}`, String(d))) return;
      el.style.strokeDasharray = el.getAttribute("stroke-dasharray")
        ? ""
        : "1 1";
      if (!el.getAttribute("stroke-dasharray"))
        el.style.strokeDashoffset = String(1 - d);
      else el.style.opacity = String(d);
    });
    set(n.blue, "opacity", 1 - 0.8 * seg(p, 0.6, 0.72));
    set(n.notes, "opacity", seg(p, 0.42, 0.52) * (1 - seg(p, 0.66, 0.74)));
    set(n.solid, "opacity", eIO(seg(p, 0.55, 0.7)));
    layer("bridge", 0, mix(24, 0, eOut(seg(p, 0.25, 0.7))));
    // deploy
    const d = eIO(seg(p, 0.7, 0.86));
    set(n.deploy, "opacity", seg(p, 0.69, 0.71) * (1 - 0.6 * seg(p, 0.9, 1)));
    set(n.light, "transform", `translate(${mix(260, 1340, d)},328.5)`);
    set(n.trail, "x", 180);
    set(n.trail, "width", mix(80, 1160, d));
    set(n.live, "opacity", seg(p, 0.86, 0.9));
    set(
      n.live,
      "transform",
      `translate(0,${mix(8, 0, eOut(seg(p, 0.86, 0.92)))})`,
    );
    // html ui
    ui.forEach((el, i) => {
      const s = parseFloat(el.dataset.reveal || "0");
      const t = eOut(seg(p, s, s + 0.08));
      if (!changed(`ui${i}`, String(t))) return;
      el.style.opacity = String(t);
      el.style.transform = `translateY(${mix(16, 0, t)}px)`;
    });
  };
}

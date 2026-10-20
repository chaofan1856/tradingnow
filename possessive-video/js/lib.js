// Shared helpers: easing, beat envelopes from events.json, seeded random, 3D projection, neon drawing.
export const W = 2560, H = 1440, CX = W / 2, CY = H / 2;

export const C = {
  bg: '#05030b',
  cyan: '#00f0ff',
  magenta: '#ff2bd6',
  red: '#ff1744',
  hot: '#ff3d6e',
  violet: '#8f3dff',
  yellow: '#fcee0a',
  white: '#f4f1ff',
};

/* ---------- math / easing ---------- */
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const prog = (t, a, b) => clamp((t - a) / (b - a));
export const smooth = x => x * x * (3 - 2 * x);
export const eio = x => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
export const eoutExpo = x => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));
export const einExpo = x => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10));
export const eoutCubic = x => 1 - Math.pow(1 - x, 3);
export const einCubic = x => x * x * x;
export const eoutQuart = x => 1 - Math.pow(1 - x, 4);
export const eoutBack = (x, s = 1.7) => 1 + (s + 1) * Math.pow(x - 1, 3) + s * Math.pow(x - 1, 2);
export const eioExpo = x => (x <= 0 ? 0 : x >= 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2);
// critically-damped-ish spring settle: 0 -> 1 with one overshoot
export const spring = (x, k = 7) => (x <= 0 ? 0 : 1 - Math.exp(-k * x) * Math.cos(k * 1.35 * x));

/* ---------- seeded random ---------- */
export function rand(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
export const hash = n => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/* ---------- beat envelopes ---------- */
export const EV = {};
export function setEvents(e) { Object.assign(EV, e); }

// most recent event at or before t
function lastBefore(list, t) {
  let lo = 0, hi = list.length - 1, r = -1;
  while (lo <= hi) {
    const m = (lo + hi) >> 1;
    const v = Array.isArray(list[m]) ? list[m][0] : list[m];
    if (v <= t + 1e-6) { r = m; lo = m + 1; } else hi = m - 1;
  }
  return r;
}
export function pulse(name, t, decay = 0.15, from = -Infinity, to = Infinity) {
  const list = EV[name] || [];
  const i = lastBefore(list, t);
  if (i < 0) return 0;
  const at = Array.isArray(list[i]) ? list[i][0] : list[i];
  if (at < from || at > to) return 0;
  return Math.exp(-(t - at) / decay);
}
export function sinceLast(name, t) {
  const list = EV[name] || [];
  const i = lastBefore(list, t);
  if (i < 0) return Infinity;
  return t - (Array.isArray(list[i]) ? list[i][0] : list[i]);
}
export function countBefore(name, t, from = -Infinity) {
  const list = EV[name] || [];
  let n = 0;
  for (const v of list) { const a = Array.isArray(v) ? v[0] : v; if (a > from && a <= t) n++; }
  return n;
}
export function envAt(name, t) {
  const arr = EV.env?.[name];
  if (!arr) return 0;
  const f = t * (EV.fps || 60);
  const i = Math.floor(f), fr = f - i;
  const a = arr[clamp(i, 0, arr.length - 1)], b = arr[clamp(i + 1, 0, arr.length - 1)];
  return a + (b - a) * fr;
}
export const BEAT = 0.5, BAR = 2;
export const beatPhase = t => (t / BEAT) % 1;

/* ---------- 3D ---------- */
export function rotY(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c]; }
export function rotX(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c]; }
export function rotZ(p, a) { const c = Math.cos(a), s = Math.sin(a); return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]]; }
export function project(p, cam = {}) {
  const f = cam.f ?? 1400, cx = cam.cx ?? CX, cy = cam.cy ?? CY;
  const z = p[2] + (cam.z ?? 0);
  if (z <= 1) return null;
  return [cx + (p[0] * f) / z, cy + (p[1] * f) / z, f / z];
}

/* ---------- drawing ---------- */
export function neonLine(ctx, pts, color, width = 3, glow = 1, close = false) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  if (close) ctx.closePath();
  if (glow > 0) {
    ctx.globalAlpha *= 0.35 * glow;
    ctx.strokeStyle = color; ctx.lineWidth = width * 3.2; ctx.stroke();
    ctx.globalAlpha /= 0.35 * glow;
  }
  ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1, width * 0.35); ctx.stroke();
  ctx.restore();
}

export function font(weight, size, fam = 'SC') {
  return `${weight} ${size}px ${fam === 'SC' ? '"SC"' : fam === 'Inter' ? '"InterD"' : '"Plex"'}`;
}

// text with neon core: colored fill/stroke + white hot center
export function neonText(ctx, str, x, y, opt = {}) {
  const { size = 200, weight = 900, fam = 'SC', color = C.red, align = 'center', base = 'middle',
    stroke = false, lw = 4, spacing = 0, core = 0.8, alpha = 1 } = opt;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = font(weight, size, fam);
  ctx.textAlign = align; ctx.textBaseline = base;
  if (spacing) ctx.letterSpacing = `${spacing}px`;
  if (stroke) {
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color; ctx.lineWidth = lw * 3; ctx.globalAlpha *= 0.3; ctx.strokeText(str, x, y); ctx.globalAlpha /= 0.3;
    ctx.lineWidth = lw; ctx.strokeText(str, x, y);
    if (core > 0) { ctx.strokeStyle = `rgba(255,255,255,${core})`; ctx.lineWidth = lw * 0.35; ctx.strokeText(str, x, y); }
  } else {
    ctx.fillStyle = color; ctx.fillText(str, x, y);
    if (core > 0) {
      ctx.globalAlpha *= core * 0.55;
      ctx.fillStyle = '#fff';
      ctx.fillText(str, x, y);
    }
  }
  ctx.restore();
}

// type-on reveal with glitch characters for HUD strings
const GLYPHS = '01#%&$@<>/\\|=+*ABCDEFXYZ';
export function scramble(str, p, seed = 1) {
  if (p >= 1) return str;
  const n = str.length, shown = Math.floor(p * n * 1.0);
  let s = '';
  for (let i = 0; i < n; i++) {
    if (i < shown) s += str[i];
    else if (i < shown + 4 && p > 0) s += GLYPHS[Math.floor(hash(seed * 31 + i * 7 + Math.floor(p * 40)) * GLYPHS.length)];
  }
  return s;
}

export function heartPath(ctx, x, y, s) {
  // classic parametric heart, size s ≈ half-width
  ctx.beginPath();
  for (let i = 0; i <= 120; i++) {
    const a = (i / 120) * Math.PI * 2;
    const hx = 16 * Math.pow(Math.sin(a), 3);
    const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
    const px = x + (hx / 16) * s, py = y + (hy / 16) * s - s * 0.1;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

export function corners(ctx, x, y, w, h, len, color, lw = 3, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'square';
  ctx.beginPath();
  for (const [sx, sy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
    const px = x + sx * w, py = y + sy * h, dx = sx ? -1 : 1, dy = sy ? -1 : 1;
    ctx.moveTo(px + dx * len, py); ctx.lineTo(px, py); ctx.lineTo(px, py + dy * len);
  }
  ctx.stroke();
  ctx.restore();
}

export function hudText(ctx, str, x, y, opt = {}) {
  const { size = 26, color = C.cyan, align = 'left', alpha = 1, weight = 300, fam = 'Plex', spacing = 2 } = opt;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.font = font(weight, size, fam);
  ctx.letterSpacing = `${spacing}px`;
  ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
  ctx.restore();
}

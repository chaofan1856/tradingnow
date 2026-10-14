'use strict';
/* Shared helpers. Everything is a pure function of time t (seconds): no Date, no Math.random. */
const W = 1920, H = 1080;
const $ = id => document.getElementById(id);

/* ---------- math ---------- */
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, u) => a + (b - a) * u;
const seg = (t, a, b) => clamp((t - a) / (b - a));
function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = s => ((ax * s + bx) * s + cx) * s, dX = s => (3 * ax * s + 2 * bx) * s + cx, Y = s => ((ay * s + by) * s + cy) * s;
  return x => {
    if (x <= 0) return 0; if (x >= 1) return 1;
    let s = x;
    for (let i = 0; i < 8; i++) { const e = X(s) - x, d = dX(s); if (Math.abs(e) < 1e-6 || Math.abs(d) < 1e-6) break; s -= e / d; }
    if (Math.abs(X(s) - x) > 1e-5) { let lo = 0, hi = 1; s = x; for (let i = 0; i < 30; i++) { X(s) < x ? lo = s : hi = s; s = (lo + hi) / 2; } }
    return Y(s);
  };
}
const EXPO = bezier(.16, 1, .3, 1);       // fast in, long settle — the house curve
const SWIFT = bezier(.65, 0, .35, 1);     // symmetric in-out for camera moves
const SOFT = bezier(.4, 0, .2, 1);
const sine = x => -(Math.cos(Math.PI * clamp(x)) - 1) / 2;
const outCubic = x => 1 - Math.pow(1 - clamp(x), 3);
const inCubic = x => Math.pow(clamp(x), 3);
const ease = (t, a, d, f = EXPO) => f(clamp((t - a) / d));
/* in at a (over fi), out ending at b (over fo) */
const life = (t, a, b, fi = 0.9, fo = 0.9, f = SOFT) => Math.min(f(seg(t, a, a + fi)), 1 - f(seg(t, b - fo, b)));
function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function noise1(seed) {                    // smooth 1-D value noise in [-1,1]
  const R = rng(seed), g = Array.from({ length: 512 }, () => R() * 2 - 1);
  return x => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lerp(g[((i % 512) + 512) % 512], g[(((i + 1) % 512) + 512) % 512], u); };
}
function valueNoise2(seed, cell) {
  const R = rng(seed), N = 256, g = Array.from({ length: N * N }, R), sm = x => x * x * (3 - 2 * x);
  return (x, y) => {
    const gx = x / cell, gy = y / cell, ix = Math.floor(gx), iy = Math.floor(gy), fx = sm(gx - ix), fy = sm(gy - iy);
    const v = (i, j) => g[(((iy + j) % N) + N) % N * N + (((ix + i) % N) + N) % N];
    return lerp(lerp(v(0, 0), v(1, 0), fx), lerp(v(0, 1), v(1, 1), fx), fy);
  };
}
const qbez = (a, c, b, u) => [(1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * c[0] + u * u * b[0], (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * c[1] + u * u * b[1]];

/* ---------- palette ---------- */
const C = {
  bg: '#110D09', gold: '#C9A66B', goldHi: '#F0D9A8', ivory: '#EFE8DC',
  up: '#C0574C', down: '#5E9479',          // A-share convention: red up, green down (muted)
  ink: '#2A2219', paper: '#D8CBAE',
};
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; };

/* ---------- canvas helpers ---------- */
/* render scale: 2 → native 3840×2160 drawing in the same 1920×1080 coordinate space */
const DPR = +(new URLSearchParams(location.search).get('dpr') || window.devicePixelRatio || 1);
for (const id of ['cv', 'post']) { $(id).width = 1920 * DPR; $(id).height = 1080 * DPR; $(id).style.width = '1920px'; $(id).style.height = '1080px'; }
const cv = $('cv'), ctx = cv.getContext('2d');
function offscreen(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function polyLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
/* stroke the first fraction p of a polyline; returns the head point */
function strokePart(g, pts, p, close = false) {
  if (p <= 0 || pts.length < 2) return pts[0];
  const P = close ? [...pts, pts[0]] : pts, total = polyLen(P), target = total * clamp(p);
  g.beginPath(); g.moveTo(P[0][0], P[0][1]);
  let acc = 0, head = P[0];
  for (let i = 1; i < P.length; i++) {
    const d = Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]);
    if (acc + d >= target) { const u = (target - acc) / (d || 1); head = [lerp(P[i - 1][0], P[i][0], u), lerp(P[i - 1][1], P[i][1], u)]; g.lineTo(head[0], head[1]); break; }
    g.lineTo(P[i][0], P[i][1]); acc += d; head = P[i];
  }
  g.stroke();
  return head;
}
/* gold hairline with a soft halo */
function goldStroke(g, pts, p = 1, { w = 1.6, a = 1, color = C.gold, glow = 0.35, close = false } = {}) {
  if (a <= 0.002 || p <= 0) return pts[0];
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
  if (glow > 0) { g.globalAlpha = a * glow; g.strokeStyle = color; g.lineWidth = w * 4.5; g.filter = `blur(${3 * DPR}px)`; strokePart(g, pts, p, close); g.filter = 'none'; }
  g.globalAlpha = a; g.strokeStyle = color; g.lineWidth = w;
  const head = strokePart(g, pts, p, close);
  g.restore();
  return head;
}
function arcPts(cx, cy, r, a0, a1, n = 48) { const o = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; }
function rectPts(x, y, w, h) { return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]]; }
function glowDot(g, x, y, r, a, color = C.goldHi) {
  if (a <= 0) return;
  const gr = g.createRadialGradient(x, y, 0, x, y, r * 6);
  gr.addColorStop(0, rgba(color, 0.5 * a)); gr.addColorStop(0.25, rgba(color, 0.14 * a)); gr.addColorStop(1, rgba(color, 0));
  g.fillStyle = gr; g.fillRect(x - r * 6, y - r * 6, r * 12, r * 12);
  g.globalAlpha = a; g.fillStyle = '#FFF4DC'; g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); g.globalAlpha = 1;
}
/* canvas text, letter-spaced; align: 'left' | 'center' | 'right' */
function text(g, s, x, y, { size = 26, font = 'serif', weight = 400, color = C.ivory, a = 1, align = 'center', track = 0.08, italic = false, vertical = false, blur = 0 } = {}) {
  if (a <= 0.002) return;
  const fam = font === 'latin' ? "'CormorantSub','Cormorant Garamond',serif" : "'NotoSerifSub','Noto Serif SC',serif";
  if (size < 70) size = Math.round(size * 1.22);                  // larger type across all labels
  g.save(); g.globalAlpha = a; g.fillStyle = color; g.font = `${italic ? 'italic ' : ''}${weight} ${size}px ${fam}`; g.textBaseline = 'middle';
  if (blur > 0.05) g.filter = `blur(${blur * DPR}px)`;
  const chars = [...s], sp = size * track;
  if (vertical) {
    const step = size * 1.18;
    chars.forEach((c, i) => { g.textAlign = 'center'; g.fillText(c, x, y + i * step); });
  } else {
    const ws = chars.map(c => g.measureText(c).width), total = ws.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
    let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    g.textAlign = 'left';
    chars.forEach((c, i) => { g.fillText(c, cx, y); cx += ws[i] + sp; });
  }
  g.restore();
}
/* leader-line callout: dot at (x,y), line to (lx,ly), label beyond */
function callout(g, x, y, lx, ly, label, p, { side = 'left', size = 26, color = C.ivory } = {}) {
  if (p <= 0) return;
  const pl = ease(p, 0, 0.6, SOFT), pt = ease(p, 0.35, 0.65);
  glowDot(g, x, y, 2.4, pl);
  goldStroke(g, [[x, y], [lx, ly]], pl, { w: 1, a: 0.85, glow: 0.2 });
  text(g, label, lx + (side === 'left' ? -14 : 14), ly, { size, color, a: pt, align: side === 'left' ? 'right' : 'left', track: 0.18 });
}

/* ---------- background: spotlight cone, floor, dust, vignette, grain ---------- */
const BG = (() => {
  const cone = offscreen(W, H), cg = cone.getContext('2d');
  cg.filter = 'blur(26px)';
  const gr = cg.createLinearGradient(0, 0, 0, 780);
  gr.addColorStop(0, 'rgba(255,228,178,.17)'); gr.addColorStop(0.55, 'rgba(255,226,170,.10)'); gr.addColorStop(1, 'rgba(255,222,165,.075)');
  cg.fillStyle = gr; cg.beginPath(); cg.moveTo(778, -40); cg.lineTo(1142, -40); cg.lineTo(1720, 772); cg.lineTo(200, 772); cg.closePath(); cg.fill();
  cg.filter = 'none';
  const floor = offscreen(W, H), fg = floor.getContext('2d');
  let f = fg.createRadialGradient(960, 770, 0, 960, 770, 820);
  f.addColorStop(0, 'rgba(255,224,170,.16)'); f.addColorStop(0.5, 'rgba(255,224,170,.06)'); f.addColorStop(1, 'rgba(255,224,170,0)');
  fg.save(); fg.translate(960, 770); fg.scale(1, 0.16); fg.translate(-960, -770); fg.fillStyle = f; fg.fillRect(0, 0, W, H * 8); fg.restore();
  const lf = fg.createLinearGradient(0, 760, 0, 1080); lf.addColorStop(0, 'rgba(40,30,20,.32)'); lf.addColorStop(1, 'rgba(0,0,0,0)');
  fg.fillStyle = lf; fg.fillRect(0, 768, W, 312);
  const vig = offscreen(W, H), vg = vig.getContext('2d');
  const v = vg.createRadialGradient(960, 520, 300, 960, 540, 1200);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(0.6, 'rgba(0,0,0,.12)'); v.addColorStop(1, 'rgba(0,0,0,.55)');
  vg.fillStyle = v; vg.fillRect(0, 0, W, H);
  const warm = offscreen(W, H), wg = warm.getContext('2d');      // faint warm haze so blacks are brown, not grey
  const wv = wg.createRadialGradient(960, 420, 0, 960, 480, 1100); wv.addColorStop(0, 'rgba(70,52,32,.8)'); wv.addColorStop(0.6, 'rgba(36,27,18,.45)'); wv.addColorStop(1, 'rgba(16,12,8,0)');
  wg.fillStyle = wv; wg.fillRect(0, 0, W, H);
  const R = rng(77), dust = Array.from({ length: 260 }, () => ({ x: R(), y: R(), z: R(), ph: R() * 6.28, sp: 0.2 + R() * 0.8 }));
  const grain = Array.from({ length: 6 }, (_, n) => {
    const c = offscreen(256, 256), x = c.getContext('2d'), img = x.createImageData(256, 256), Rg = rng(900 + n);
    for (let i = 0; i < img.data.length; i += 4) { const g = 128 + (Rg() - 0.5) * 255; img.data[i] = img.data[i + 1] = img.data[i + 2] = g; img.data[i + 3] = 255; }
    x.putImageData(img, 0, 0); return c;
  });
  const bok = offscreen(256, 256), bg2 = bok.getContext('2d'), rb = bg2.createRadialGradient(128, 128, 0, 128, 128, 128);
  rb.addColorStop(0, 'rgba(255,226,170,.9)'); rb.addColorStop(0.55, 'rgba(255,214,150,.35)'); rb.addColorStop(0.85, 'rgba(255,214,150,.08)'); rb.addColorStop(1, 'rgba(255,214,150,0)');
  bg2.fillStyle = rb; bg2.fillRect(0, 0, 256, 256);
  const Rb = rng(404), bokeh = Array.from({ length: 26 }, () => ({ x: Rb(), y: Rb(), r: 24 + Rb() ** 2 * 90, a: 0.025 + Rb() * 0.06, sp: 0.2 + Rb() * 0.8, ph: Rb() * 6.28 }));
  return { cone, floor, vig, warm, dust, grain, bok, bokeh };
})();

function drawBackground(g, t, { spot = 1, width = 1, floor = 1, haze = 1 } = {}) {
  g.fillStyle = C.bg; g.fillRect(0, 0, W, H);
  if (haze > 0) { g.globalAlpha = haze; g.drawImage(BG.warm, 0, 0); }
  if (spot > 0.002) {
    for (const k of BG.bokeh) {
      const x = ((k.x * (W + 300) + t * 6 * k.sp) % (W + 300)) - 150, y = k.y * H * 0.85 + Math.sin(t * 0.2 * k.sp + k.ph) * 30;
      g.globalAlpha = k.a * spot * (0.7 + 0.3 * Math.sin(t * 0.5 + k.ph)); g.drawImage(BG.bok, x - k.r, y - k.r, k.r * 2, k.r * 2);
    }
    g.globalAlpha = 1;
    g.save(); g.globalAlpha = spot;
    g.translate(960, 0); g.scale(width, 1); g.translate(-960, 0);
    g.drawImage(BG.cone, 0, 0); g.restore();
    g.globalAlpha = spot * floor; g.drawImage(BG.floor, 0, 0);
    // dust motes drifting in the beam
    g.globalAlpha = 1;
    for (const d of BG.dust) {
      const yy = ((d.y * 820 - t * 9 * d.sp) % 820 + 820) % 820, half = lerp(190, 770, yy / 780) * width;
      const xx = 960 + (d.x * 2 - 1) * half * 0.92 + Math.sin(t * 0.3 * d.sp + d.ph) * 14;
      const a = spot * (0.12 + 0.5 * d.z) * (0.6 + 0.4 * Math.sin(t * 0.9 + d.ph)) * (1 - yy / 900);
      g.fillStyle = `rgba(255,232,190,${a.toFixed(3)})`; g.beginPath(); g.arc(xx, yy, 0.6 + d.z * 1.3, 0, 6.2832); g.fill();
    }
  }
  g.globalAlpha = 1;
}
const DITHER = (() => {
  const n = 512, c = offscreen(n, n), x = c.getContext('2d'), img = x.createImageData(n, n), R = rng(1234);
  for (let i = 0; i < img.data.length; i += 4) { const v = 128 + (R() + R() - 1) * 90; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; img.data[i + 3] = 255; }
  x.putImageData(img, 0, 0); return c;
})();
let postDrawn = false;
function drawPost(t) {
  if (postDrawn) return;                       // static: vignette + fine dither against banding, identical every frame
  const p = $('post').getContext('2d');
  p.setTransform(DPR, 0, 0, DPR, 0, 0); p.clearRect(0, 0, W, H);
  p.drawImage(BG.vig, 0, 0);
  p.setTransform(1, 0, 0, 1, 0, 0);
  p.globalCompositeOperation = 'overlay'; p.globalAlpha = 0.045;
  p.fillStyle = p.createPattern(DITHER, 'repeat'); p.fillRect(0, 0, W * DPR, H * DPR);
  p.globalCompositeOperation = 'source-over'; p.globalAlpha = 1;
  postDrawn = true;
}
/* camera: scale s about focus (fx,fy), then translate (dx,dy) */
function camera(g, s = 1, fx = 960, fy = 540, dx = 0, dy = 0) { g.setTransform(s * DPR, 0, 0, s * DPR, (fx - fx * s + dx) * DPR, (fy - fy * s + dy) * DPR); }
function resetCam(g) { g.setTransform(DPR, 0, 0, DPR, 0, 0); }

/* candles: deterministic random walk */
function makeCandles(seed, n, { drift = 0.15, vol = 1, start = 100 } = {}) {
  const R = rng(seed), out = []; let p = start;
  for (let i = 0; i < n; i++) {
    const o = p, c = o + (R() - 0.5 + drift * 0.5) * 6 * vol, hi = Math.max(o, c) + R() * 3 * vol, lo = Math.min(o, c) - R() * 3 * vol;
    out.push({ o, c, hi, lo }); p = c;
  }
  return out;
}
function drawCandle(g, x, yOf, k, w, a, { grow = 1, mono = 0, glow = 0 } = {}) {
  if (a <= 0.003) return;
  const up = k.c >= k.o, col = mono > 0 ? mixHex(up ? C.up : C.down, C.gold, mono) : (up ? C.up : C.down);
  const c = lerp(k.o, k.c, grow), yo = yOf(k.o), yc = yOf(c), yh = yOf(lerp(Math.max(k.o, k.c), k.hi, grow)), yl = yOf(lerp(Math.min(k.o, k.c), k.lo, grow));
  g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 1.4;
  g.beginPath(); g.moveTo(x, yh); g.lineTo(x, yl); g.stroke();
  g.fillStyle = col; const top = Math.min(yo, yc), h = Math.max(1.5, Math.abs(yc - yo));
  g.fillRect(x - w / 2, top, w, h);
  if (glow > 0) { g.globalAlpha = a * glow; g.strokeStyle = C.goldHi; g.lineWidth = 1.2; g.strokeRect(x - w / 2 - 2, top - 2, w + 4, h + 4); }
  g.globalAlpha = 1;
}
function mixHex(a, b, u) {
  const A = parseInt(a.slice(1), 16), B = parseInt(b.slice(1), 16);
  const r = Math.round(lerp(A >> 16, B >> 16, u)), gg = Math.round(lerp(A >> 8 & 255, B >> 8 & 255, u)), bl = Math.round(lerp(A & 255, B & 255, u));
  return '#' + ((1 << 24) + (r << 16) + (gg << 8) + bl).toString(16).slice(1);
}

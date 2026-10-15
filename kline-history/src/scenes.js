'use strict';
/* Scene choreography. Pure functions of t.
   One persistent field of 720 light points re-forms into every diagram, so the film never cuts.
   Shared skeleton (lattice open, title, finale, matrix scheduler, frame) + this film's sections (FILM SECTIONS below). */

const N = 720;
const L_ = (id, k) => LS(id)[k];                    // line k of a scene
const lt = (id, k) => LS(id)[k].start;
const le = (id, k) => LS(id)[k].end;
const lon = (id, k, fi = 0.8, fo = 0.8, pre = 0.2, post = 0.3) => (t) => life(t, lt(id, k) - pre, le(id, k) + post, fi, fo);
const TAU = Math.PI * 2;
const COL = ['#F0D9A8', '#EFE8DC', '#D9786A', '#7DB898', '#9FCFC9', '#C9A66B'];   // goldHi, ivory, up, down, teal, gold
const GOLDHI = 0, IVORY = 1, UP = 2, DOWN = 3, TEAL = 4, GOLD = 5;

/* ---------- glow sprites: one per colour, drawn with drawImage (cheap at 4K) ---------- */
const SPR = COL.map(c => {
  const s = offscreen(64, 64), x = s.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, '#FFFBF0'); gr.addColorStop(0.1, rgba(c, 1)); gr.addColorStop(0.22, rgba(c, 0.55)); gr.addColorStop(0.5, rgba(c, 0.12)); gr.addColorStop(1, rgba(c, 0));
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return s;
});
function dot(g, x, y, r, a, c) {
  if (a <= 0.004 || r <= 0.05) return;
  g.globalAlpha = Math.min(1, a); g.drawImage(SPR[c], x - r * 4, y - r * 4, r * 8, r * 8);
}

/* ---------- per-particle constants ---------- */
const P = Array.from({ length: N }, (_, i) => { const R = rng(i * 7919 + 13); return { r1: R(), r2: R(), r3: R(), r4: R(), r5: R(), r6: R() }; });

const inWin = (t, id, pre = 0.6, post = 0.6) => t > WIN[id][0] - pre && t < WIN[id][1] + post;
const sec = id => SECTIONS.indexOf(id);

/* =====================================================================
   SHARED FORMATIONS — each writes [x, y, radius, alpha, colour] for particle i at time t into o
   ===================================================================== */
function fLattice(i, t, o) {
  const c = i % 30, r = Math.floor(i / 30), u = c / 29 - 0.5, v = r / 23;
  const rot = 0.1 * Math.sin(t * 0.09) + 0.04;
  let X = u * 2600, Z = 520 + v * 1900;
  const xr = X * Math.cos(rot) - (Z - 1300) * Math.sin(rot), zr = 1300 + X * Math.sin(rot) + (Z - 1300) * Math.cos(rot);
  const Y = 230 + 26 * Math.sin(X * 0.0024 + t * 0.7) * Math.cos(Z * 0.002 - t * 0.5);
  const f = 900, sx = 960 + xr * f / zr, sy = 430 + Y * f / zr;
  const scan = Math.exp(-Math.pow((zr - (500 + ((t * 260) % 2300))) / 140, 2));
  const tw = 0.6 + 0.4 * Math.sin(t * (1.2 + P[i].r1) + P[i].r2 * TAU);
  const fog = clamp(1.4 - zr / 2100);
  o[0] = sx; o[1] = sy; o[2] = Math.max(0.6, 2.6 * f / zr); o[3] = fog * (0.32 * tw + 0.75 * scan) * (sx > -40 && sx < 1960 ? 1 : 0); o[4] = scan > 0.4 ? GOLDHI : GOLD;
}

function fFinale(i, t, o) {
  const p = P[i], a = WIN.finale[0], k = t - a, th = p.r1 * TAU, R = 200 + p.r2 * 700 + k * (8 + p.r3 * 14);
  o[0] = 960 + Math.cos(th) * R * 1.4; o[1] = 520 + Math.sin(th) * R * 0.7; o[2] = 1 + p.r4; o[3] = 0.4 * (1 - ease(t, a + 0.5, 3.5, SOFT)); o[4] = GOLD;
}


/* =====================================================================
   FILM SECTIONS — formations + line-art for this film (see README)
   ===================================================================== */
// FILM_FORM: extra formations by name; FILM_SCHED(): [[time, formation], …] for the body of the film;
// FILM_ART: { sectionId: (g, t) => … } line-art drawn over the field while the section is on screen
/* ---------- helpers ---------- */
const RED = '#D45F52', GREEN = '#5FA982', REDL = '#E08A7E', GREENL = '#8FC0A6', GREY = '#C9C7C0';
const gz = (u, c, w) => Math.exp(-Math.pow((u - c) / w, 2));
const cbez = (a, b, c, d, u) => { const v = 1 - u; return [v * v * v * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u * u * u * d[0], v * v * v * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u * u * u * d[1]]; };
function mkPath(polys) {                           // arc-length sampler over one or more polylines
  const segs = []; let L = 0;
  for (const pts of polys) for (let k = 1; k < pts.length; k++) { const a = pts[k - 1], b = pts[k], d = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, L, d]); L += d; }
  return u => {
    const s = clamp(u) * L; let lo = 0, hi = segs.length - 1;
    while (lo < hi) { const m = (lo + hi + 1) >> 1; if (segs[m][2] <= s) lo = m; else hi = m - 1; }
    const [a, b, l0, d] = segs[lo], f = d ? clamp((s - l0) / d) : 0; return [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
  };
}
const closeP = pts => [...pts, pts[0]];
function rrPts(x, y, w, h, r, n = 6) {             // rounded rectangle, closed
  const o = [];
  for (const [cx, cy, a0] of [[x + w - r, y + r, -Math.PI / 2], [x + w - r, y + h - r, 0], [x + r, y + h - r, Math.PI / 2], [x + r, y + r, Math.PI]])
    for (let k = 0; k <= n; k++) { const a = a0 + k / n * Math.PI / 2; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  o.push(o[0]); return o;
}
function amb(i, t, o, a = 0.1, x0 = 160, x1 = 1760, y0 = 280, y1 = 760, col = GOLD) {
  const p = P[i];
  o[0] = x0 + p.r1 * (x1 - x0) + Math.sin(t * 0.21 + p.r5 * 9) * 14; o[1] = y0 + p.r2 * (y1 - y0) + Math.sin(t * 0.3 + p.r3 * 9) * 12;
  o[2] = 1 + p.r4; o[3] = a * (0.6 + 0.4 * Math.sin(t * (0.8 + p.r5) + p.r6 * TAU)); o[4] = col;
}
const secA = (t, id, out = 1.2) => ease(t, WIN[id][0] + 1.4, 1.0, SOFT) * (1 - ease(t, WIN[id][1] - out, 0.9, SOFT));
/* candle in screen space: open/close/high/low are y values */
function candleY(g, x, yo, yc, yh, yl, w, a, col, { lw = 1.6, hollow = false } = {}) {
  if (a <= 0.003) return;
  const top = Math.min(yo, yc), h = Math.max(1.5, Math.abs(yc - yo));
  g.globalAlpha = a; g.strokeStyle = col; g.fillStyle = col; g.lineWidth = lw;
  g.beginPath(); g.moveTo(x, yh); g.lineTo(x, top); g.moveTo(x, top + h); g.lineTo(x, yl); g.stroke();
  if (hollow) g.strokeRect(x - w / 2, top, w, h); else g.fillRect(x - w / 2, top, w, h);
  g.globalAlpha = 1;
}
/* a red square seal with ivory characters stacked vertically */
function seal(g, x, y, s, a, chars) {
  if (a <= 0.003) return;
  g.save(); g.globalAlpha = a; g.fillStyle = '#B23A2E';
  g.beginPath(); g.moveTo(x - s / 2 + 2, y - s / 2); g.lineTo(x + s / 2, y - s / 2 + 2); g.lineTo(x + s / 2 - 1, y + s / 2); g.lineTo(x - s / 2, y + s / 2 - 2); g.closePath(); g.fill();
  g.strokeStyle = '#F3E6D2'; g.lineWidth = Math.max(1, s * 0.025); g.globalAlpha = a * 0.85; g.strokeRect(x - s * 0.4, y - s * 0.4, s * 0.8, s * 0.8);
  g.restore();
  const n = chars.length, step = s * 0.8 / n;
  [...chars].forEach((c, k) => text(g, c, x, y - s * 0.4 + step * (k + 0.5) + s * 0.01, { size: (step * 0.86) / (step * 0.86 < 70 ? 1.22 : 1), weight: 700, color: '#F3E6D2', a, track: 0 }));
}

/* =====================================================================
   OPEN — a wall of trading screens collapses into one grain of rice
   ===================================================================== */
const OP = { x0: 170, y0: 334, w: 240, h: 100, gx: 28, gy: 16 };
const OPL = ['NASDAQ', 'BTC / USDT', '沪深300', 'NIKKEI 225', 'EUR / USD', 'S&P 500', '恒生指数', 'GOLD', 'DAX', 'ETH / USDT', '上证指数', 'FTSE 100',
  'BRENT', 'KOSPI', '创业板指', 'USD / JPY', 'TSLA', 'CAC 40', '纳指期货', 'AAPL', 'SOL / USDT', '深证成指', 'NVDA', 'US 10Y'];
const opPanel = k => [OP.x0 + (k % 6) * (OP.w + OP.gx), OP.y0 + Math.floor(k / 6) * (OP.h + OP.gy)];
const OPN = Array.from({ length: 24 }, (_, k) => noise1(300 + k)), OPC = noise1(299);
const opSync = t => ease(t, lt('open', 2) + 0.3, 1.8, SWIFT);
function opVal(k, x, t) {                          // x in [0,1] across panel k -> value about [-1,1]
  const sp = 1.6 + hash01(k * 3 + 1) * 2.4, s = opSync(t);
  const own = clamp(OPN[k](x * 5 + t * sp + k * 17) * 1.4 + (hash01(k) - 0.5) * 0.6 * (x - 0.5), -1, 1);
  const common = OPC(x * 4 + t * 0.45) * 0.75 + (x - 0.5) * 0.7;
  return lerp(own, common, s);
}
const opApp = (k, t) => ease(t, 0.5 + hash01(k * 13 + 5) * 1.8, 0.7, SOFT);
const opFlick = (k, t) => 1 - 0.45 * (1 - opSync(t)) * (hash01(Math.floor(t * 6) * 31 + k * 7) > 0.82 ? 1 : 0);
function fScreens(i, t, o) {
  const k = Math.floor(i / 30), j = i % 30, [px, py] = opPanel(k), x = j / 29;
  const v = opVal(k, x, t), dv = opVal(k, x + 0.02, t) - opVal(k, x - 0.02, t);
  o[0] = px + 10 + x * (OP.w - 20); o[1] = py + 64 - v * 28; o[2] = 1.3;
  o[3] = 0.42 * opApp(k, t) * opFlick(k, t); o[4] = dv >= 0 ? UP : DOWN;
}
function grainXY(th, rr = 1) {                     // rice grain outline: fuller at one end, a small embryo notch at the other
  const notch = 1 - 0.13 * Math.exp(-Math.pow(Math.atan2(Math.sin(th - 3.55), Math.cos(th - 3.55)) / 0.22, 2));
  const x = Math.cos(th) * 80 * rr * notch, y = Math.sin(th) * 30 * rr * (1 + 0.14 * Math.cos(th)) * notch, c = Math.cos(-0.3), s = Math.sin(-0.3);
  return [x * c - y * s, x * s + y * c];
}
const GRN = P.map((p, i) => { const edge = i < 200, th = edge ? i / 200 * TAU : p.r1 * TAU, rr = edge ? 1 : Math.sqrt(p.r2) * 0.9; return [...grainXY(th, rr), edge]; });
const grainT0 = () => lt('open', 3) + 0.4;
function grainPlace(t) { const m = ease(t, WIN.title[0] - 0.9, 2.2, SWIFT); return { cx: 960, cy: lerp(512, 292, m), sc: lerp(1, 0.55, m) }; }
function fGrain(i, t, o) {
  const p = P[i], G = GRN[i], pl = grainPlace(t), sp = ease(t, grainT0() + 2.3, 1.8, EXPO);
  const br = 1 + 0.03 * Math.sin(t * 1.4);
  o[0] = pl.cx + (G[0] * sp * br + (1 - sp) * (p.r3 - 0.5) * 7) * pl.sc; o[1] = pl.cy + (G[1] * sp * br + (1 - sp) * (p.r4 - 0.5) * 7) * pl.sc;
  o[2] = (G[2] ? 1.6 : 1.25) * lerp(1, 0.8, 1 - pl.sc); o[3] = lerp(0.22, G[2] ? 0.45 : 0.3 + 0.14 * Math.sin(t * 2 + p.r5 * TAU), sp); o[4] = G[2] ? GOLDHI : GOLD;
}
function artScreens(g, t) {
  const a = 1 - ease(t, grainT0() + 0.2, 1.3, SOFT);
  if (a > 0.003) {
    for (let k = 0; k < 24; k++) {
      const [px, py] = opPanel(k), al = a * opApp(k, t) * opFlick(k, t);
      if (al <= 0.003) continue;
      g.globalAlpha = al * 0.32; g.strokeStyle = C.gold; g.lineWidth = 1; g.strokeRect(px, py, OP.w, OP.h);
      const lab = OPL[k], cjk = /[^\x00-\x7f]/.test(lab);
      text(g, lab, px + 10, py + 17, { size: 20, font: cjk ? 'serif' : 'latin', color: C.ivory, a: al * 0.55, align: 'left', track: cjk ? 0.08 : 0.06 });
      for (let m = 0; m < 12; m++) {
        const x0 = m / 12, x1 = (m + 1) / 12, vo = opVal(k, x0, t), vc = opVal(k, x1, t), cx = px + 10 + (x0 + x1) / 2 * (OP.w - 20);
        const hi = Math.max(vo, vc) + 0.06 + 0.12 * hash01(k * 41 + m), lo = Math.min(vo, vc) - 0.06 - 0.12 * hash01(k * 43 + m + 7);
        candleY(g, cx, py + 64 - vo * 28, py + 64 - vc * 28, py + 64 - hi * 28, py + 64 - lo * 28, 9, al * 0.9, vc >= vo ? RED : GREEN, { lw: 1 });
      }
    }
    g.globalAlpha = 1;
  }
  // the single gold point, then the grain's contour
  const t0 = grainT0(), fl = life(t, t0 + 1.2, t0 + 3.2, 0.5, 1.0);
  const pl = grainPlace(t);
  if (fl > 0) glowDot(g, pl.cx, pl.cy, 3 + 2 * fl, fl);
  const sp = ease(t, t0 + 2.4, 1.8, EXPO), ga = sp * (1 - ease(t, WIN.open[1] - 0.9, 0.9, SOFT));
  if (ga > 0.003) {
    const pts = [], c = Math.cos(-0.3), s = Math.sin(-0.3);
    for (let k = 0; k <= 96; k++) { const [x, y] = grainXY(k / 96 * TAU, 1.03); pts.push([pl.cx + x * pl.sc, pl.cy + y * pl.sc]); }
    goldStroke(g, pts, ease(t, t0 + 2.6, 1.6, SOFT), { w: 1.3, a: ga * 0.9, glow: 0.5, color: C.goldHi });
    const gr = []; for (let k = 0; k <= 24; k++) { const u = k / 24 - 0.5, x = u * 118, y = 3 - 6 * Math.cos(u * Math.PI); gr.push([pl.cx + (x * c - y * s) * pl.sc, pl.cy + (x * s + y * c) * pl.sc]); }
    goldStroke(g, gr, ease(t, t0 + 3.2, 1.4, SOFT), { w: 1, a: ga * 0.5, glow: 0 });
  }
}

/* =====================================================================
   DOJIMA — the river, Osaka's warehouses, the hall, rice tickets, futures, the storm, the ledger
   ===================================================================== */
const RIV = u => cbez([120, 748], [600, 640], [900, 716], [1400, 628], u);
const RIVW = u => lerp(66, 16, u);
function rivN(u) { const a = RIV(Math.max(0, u - 0.01)), b = RIV(Math.min(1, u + 0.01)), dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [-dy / l, dx / l]; }
const BALE = mkPath([rrPts(-23, -12, 46, 24, 10, 5)]);
const KURA = [[1430, 612, 70, 50], [1590, 612, 84, 62], [1415, 640, 92, 80], [1520, 640, 118, 106], [1652, 640, 100, 88]];   // x, base, w, h
const dj = k => lt('dojima', k), dje = k => le('dojima', k);
function fDojima(i, t, o) {
  const p = P[i], t0 = WIN.dojima[0];
  if (i < 300) {                                   // the river: a slow drift of light
    const u = (t * 0.03 + p.r1) % 1, c = RIV(u), n = rivN(u), off = (p.r2 - 0.5) * RIVW(u) * 0.9;
    o[0] = c[0] + n[0] * off; o[1] = c[1] + n[1] * off; o[2] = lerp(1.5, 0.8, u);
    o[3] = 0.34 * Math.min(1, u * 8, (1 - u) * 10) * (0.6 + 0.4 * Math.sin(t * 2 + p.r3 * TAU)); o[4] = p.r4 > 0.8 ? IVORY : GOLD; return;
  }
  if (i < 540) {                                   // eight rice bales floating down to Osaka
    const b = Math.floor((i - 300) / 30), k = (i - 300) % 30, ub = (b / 8 + (t - t0) * 0.03) % 1, c = RIV(ub), s = lerp(1.25, 0.5, ub);
    let lx, ly;
    if (k < 22) [lx, ly] = BALE(k / 22); else { const r = k - 22; lx = r < 4 ? -11 : 11; ly = -10 + (r % 4) * 6.6; }
    const vis = Math.min(1, ub * 12, (1 - ub) * 9);
    o[0] = c[0] + lx * s; o[1] = c[1] - 10 * s + ly * s + Math.sin(t * 1.6 + b) * 2; o[2] = 0.7 + 1.0 * s; o[3] = 0.85 * vis; o[4] = GOLDHI; return;
  }
  if (i < 660) {                                   // silver and gold piling up on the Osaka quay
    const c = i - 540, st = c % 6, lv = Math.floor(c / 6), n = 20 * ease(t, dj(1) - 0.2 + st * 0.25, dje(1) - dj(1), SOFT);
    o[0] = 1452 + st * 46; o[1] = 742 - lv * 4.4; o[2] = 2; o[3] = lv < n ? 0.85 : 0; o[4] = st % 2 ? IVORY : GOLDHI; return;
  }
  amb(i, t, o, 0.12, 600, 1340, 300, 560);
}
const HALL = [
  [[600, 664], [1320, 664]], [[640, 664], [640, 642], [1280, 642], [1280, 664]],
  [[700, 642], [700, 474]], [[830, 642], [830, 474]], [[1090, 642], [1090, 474]], [[1220, 642], [1220, 474]],
  [[668, 474], [1252, 474]],
  [[560, 484], [604, 474], [700, 444], [960, 432], [1220, 444], [1316, 474], [1360, 484]],
  [[712, 442], [770, 382], [1150, 382], [1208, 442]],
  [[736, 372], [748, 380], [1172, 380], [1184, 372]],
  [[900, 492], [1020, 492], [1020, 528], [900, 528], [900, 492]],
];
const HALLP = mkPath(HALL);
function fHall(i, t, o) {
  const p = P[i];
  if (i < 440) { const [x, y] = HALLP(i / 440); o[0] = x + Math.sin(t * 0.8 + i) * 0.8; o[1] = y; o[2] = 1.5; o[3] = 0.5 + 0.2 * Math.sin(t * 1.5 + p.r1 * TAU); o[4] = GOLD; return; }
  const span = 760, x = 580 + (((p.r1 * span + t * (p.r2 - 0.5) * 36) % span) + span) % span;   // merchants milling about the forecourt
  o[0] = x; o[1] = 690 + p.r3 * 70; o[2] = 1.5; o[3] = 0.32 * (0.6 + 0.4 * Math.sin(t * 2 + p.r4 * TAU)); o[4] = IVORY;
}
const TK = { x: 1500, y: 272, w: 220, h: 468 };
const TKP = mkPath([closeP(rectPts(TK.x, TK.y, TK.w, TK.h)), closeP(rectPts(TK.x + 12, TK.y + 12, TK.w - 24, TK.h - 24))]);
function fTicket(i, t, o) {
  const p = P[i];
  if (i < 260) { const [x, y] = TKP(i / 260); o[0] = x; o[1] = y; o[2] = 1.4; o[3] = 0.55; o[4] = GOLD; return; }
  // a heap of real rice is drawn into the paper
  const hx = 1110 + p.r1 * 290, hm = 64 * (1 - Math.abs(p.r1 * 2 - 1)), hy = 772 - p.r2 * hm;
  const tx = TK.x + 26 + p.r4 * (TK.w - 52), ty = TK.y + 30 + p.r5 * (TK.h - 60);
  const gth = ease(t, dj(3) + 1.0 + p.r3 * 2.4, 1.4, SWIFT);
  o[0] = lerp(hx, tx, gth); o[1] = lerp(hy, ty, gth) - Math.sin(Math.PI * gth) * 90; o[2] = lerp(1.6, 1.1, gth);
  o[3] = lerp(0.55, 0.12, gth); o[4] = gth > 0.5 ? GOLD : IVORY;
}
const FA = { x: 300, top: 460, w: 140 }, FB = { x: 640, top: 330, w: 140 }, FBASE = 690;
const FAP = mkPath([closeP(rectPts(FA.x, FA.top, FA.w, FBASE - FA.top))]), FBP = mkPath([closeP(rectPts(FB.x, FB.top, FB.w, FBASE - FB.top))]);
function fFutures(i, t, o) {
  const p = P[i];
  if (i < 110) { const [x, y] = FAP(i / 110); o[0] = x; o[1] = y; o[2] = 1.4; o[3] = 0.55 * ease(t, dj(4) + 0.2, 0.8); o[4] = GOLD; return; }
  if (i < 250) { const [x, y] = FBP((i - 110) / 140); o[0] = x; o[1] = y; o[2] = 1.4; o[3] = 0.55 * ease(t, dj(4) + 1.0, 0.8); o[4] = GOLD; return; }
  if (i < 450) {                                   // only the difference changes hands
    const c = (i - 250) % 14, r = Math.floor((i - 250) / 14); if (r > 13) return amb(i, t, o, 0.08, 170, 1000, 290, 760);
    const on = ease(t, dj(4) + 3.0 + (13 - r) * 0.06, 0.7);
    o[0] = FB.x + 10 + c * 9.2 + (r % 2) * 4.6; o[1] = FB.top + 9 + r * 8.6; o[2] = 1.8; o[3] = on * (0.55 + 0.35 * Math.sin(t * 3 - r * 0.5 + c)); o[4] = GOLDHI; return;
  }
  amb(i, t, o, 0.08, 170, 1000, 290, 760);
}
const stormY = u => 530 - 205 * gz(u, 0.24, 0.05) + 165 * gz(u, 0.36, 0.04) - 250 * gz(u, 0.56, 0.035) + 190 * gz(u, 0.69, 0.045) - 120 * gz(u, 0.85, 0.04) + 24 * Math.sin(u * 61) + 13 * Math.sin(u * 137);
const stormX = u => 200 + u * 1520;
const stormProg = t => ease(t, dj(5) - 0.3, 2.8, SOFT);
function fStorm(i, t, o) {
  const p = P[i];
  if (i < 600) {
    const u = i / 599, sh = 3 * (1 - ease(t, dje(5), 1.2)) * Math.sin(t * 23 + i * 1.7);
    o[0] = stormX(u); o[1] = stormY(u) + sh; o[2] = 1.6; o[3] = u <= stormProg(t) ? 0.75 : 0; o[4] = stormY(u + 0.003) < stormY(u - 0.003) ? UP : DOWN; return;
  }
  const ph = (t * 0.9 + p.r1) % 1;                 // driving rain
  o[0] = p.r2 * 2000 - 40 - ph * 140; o[1] = 240 + ph * 540; o[2] = 1; o[3] = 0.22 * Math.min(1, ph * 6, (1 - ph) * 6); o[4] = IVORY;
}
const pageY = u => 528 + (stormY(u) - 530) * 0.36, pageX = u => 996 + u * 286;
function fLedger(i, t, o) {
  const p = P[i];
  if (i < 600) { const u = i / 599; o[0] = pageX(u); o[1] = pageY(u); o[2] = 1.3; o[3] = 0.6; o[4] = pageY(u + 0.003) < pageY(u - 0.003) ? UP : DOWN; return; }
  const k = (i - 600) % 6, s = Math.floor((i - 600) / 6) / 19;
  o[0] = 652 + s * 276; o[1] = 412 + k * 44; o[2] = 1.1; o[3] = 0.3 * ease(t, dj(6) + 0.6 + s * 0.8, 0.5); o[4] = IVORY;
}
const BOOKL = [[960, 356], [900, 340], [760, 330], [620, 340], [620, 706], [760, 696], [900, 704], [960, 718]];
const BOOKR = BOOKL.map(([x, y]) => [1920 - x, y]);

function artDojima(g, t) {
  const A = secA(t, 'dojima', 1.1);
  if (A <= 0.003) return;
  // --- landscape (lines 0-1)
  const la = A * (1 - ease(t, dj(2) - 0.8, 1.0, SOFT));
  if (la > 0.003) {
    const t0 = WIN.dojima[0] + 1.4, dr = k => ease(t, t0 + k * 0.2, 1.8, SOFT);
    goldStroke(g, [[140, 612], [1408, 612]], dr(0), { w: 1, a: la * 0.55, glow: 0.3 });
    goldStroke(g, [[200, 612], [380, 500], [440, 462], [468, 457], [496, 462], [556, 500], [736, 612]], dr(1), { w: 1.2, a: la * 0.6, glow: 0.3 });
    goldStroke(g, [[404, 487], [428, 500], [450, 484], [470, 503], [492, 485], [514, 498], [534, 489]], dr(2), { w: 1, a: la * 0.45, glow: 0 });
    // the sun: an ukiyo-e disc
    const sa = la * ease(t, t0 + 0.4, 2.0, SOFT);
    g.globalAlpha = sa * 0.72; g.fillStyle = '#B5463A'; g.beginPath(); g.arc(1040, 404, 44, 0, TAU); g.fill(); g.globalAlpha = 1;
    goldStroke(g, arcPts(1040, 404, 54, 0, TAU, 60), sa, { w: 0.8, a: sa * 0.35, glow: 0 });
    // river banks and wave curls
    for (const s of [1, -1]) {
      const pts = []; for (let k = 0; k <= 60; k++) { const u = k / 60, c = RIV(u), n = rivN(u), w = RIVW(u) / 2 * s; pts.push([c[0] + n[0] * w, c[1] + n[1] * w]); }
      goldStroke(g, pts, dr(1.5), { w: 1.1, a: la * 0.6, glow: 0.25 });
    }
    for (const u0 of [0.12, 0.3, 0.48, 0.66]) {
      const u = u0 + 0.02 * Math.sin(t * 0.7 + u0 * 20), c = RIV(u), r = 9 * lerp(1.2, 0.5, u);
      goldStroke(g, arcPts(c[0], c[1] + 2, r, Math.PI * 1.05, Math.PI * 1.95, 12), dr(3), { w: 1, a: la * 0.45, glow: 0 });
    }
    // Osaka's rice warehouses
    KURA.forEach(([x, b, w, h], k) => {
      const q = ease(t, t0 + 0.6 + k * 0.18, 1.4, SOFT), r = h * 0.34;
      goldStroke(g, [[x, b], [x, b - h], [x + w, b - h], [x + w, b]], q, { w: 1.1, a: la * 0.7, glow: 0.2 });
      goldStroke(g, [[x - 10, b - h + 4], [x + w / 2, b - h - r], [x + w + 10, b - h + 4]], q, { w: 1.4, a: la * 0.85, glow: 0.3 });
      goldStroke(g, closeP(rectPts(x + w / 2 - 9, b - h + 16, 18, 14)), q, { w: 0.9, a: la * 0.5, glow: 0 });
    });
    const ok = la * lon('dojima', 0, 0.9, 0.9, -0.4, 6)(t);
    text(g, '大阪', 1590, 402, { size: 36, weight: 600, color: C.goldHi, a: ok, track: 0.3 });
    text(g, '天下的厨房', 1590, 444, { size: 22, color: C.ivory, a: ok * 0.8, track: 0.3 });
    const k1 = la * lon('dojima', 1, 0.9, 0.9, 0.0, 0.6)(t);
    text(g, '各地年贡米', 286, 640, { size: 24, color: C.ivory, a: k1 * 0.85, track: 0.2 });
    g.save(); g.lineWidth = 1;
    for (let st = 0; st < 6; st++) { const n = Math.floor(20 * ease(t, dj(1) - 0.2 + st * 0.25, dje(1) - dj(1), SOFT)); g.strokeStyle = st % 2 ? C.ivory : C.goldHi;
      for (let lv = 0; lv < n; lv += 2) { g.globalAlpha = k1 * 0.55; g.beginPath(); g.ellipse(1452 + st * 46, 742 - lv * 4.4, 13, 3.6, 0, 0, TAU); g.stroke(); } }
    g.restore();
    text(g, '换成金银', 1567, 772, { size: 22, color: C.goldHi, a: k1 * ease(t, dj(1) + 1.6, 1.0), track: 0.3 });
  }
  // --- the hall (line 2)
  const ha = A * life(t, dj(2) - 0.3, dje(2) + 0.35, 1.0, 0.8);
  if (ha > 0.003) {
    HALL.forEach((pl, k) => goldStroke(g, pl, ease(t, dj(2) - 0.1 + k * 0.09, 1.4, SOFT), { w: k >= 7 ? 1.8 : 1.2, a: ha, glow: k >= 7 ? 0.5 : 0.25, color: k >= 7 ? C.goldHi : C.gold }));
    text(g, '米会所', 960, 510, { size: 20, color: C.goldHi, a: ha * ease(t, dj(2) + 1.0, 0.8), track: 0.3 });
    text(g, '堂岛米会所', 960, 318, { size: 36, weight: 600, color: C.goldHi, a: ha * ease(t, dj(2) + 0.6, 1.0), track: 0.3 });
    text(g, '1730', 960, 270, { font: 'latin', size: 30, weight: 500, color: C.gold, a: ha * ease(t, dj(2) + 0.9, 1.0), track: 0.3 });
  }
  // --- the rice ticket (line 3, right of the L column)
  const ta = A * life(t, dj(3) - 0.3, dje(3) + 0.35, 1.0, 0.8);
  if (ta > 0.003) {
    const q = ease(t, dj(3) - 0.1, 1.6, SOFT);
    goldStroke(g, closeP(rectPts(TK.x, TK.y, TK.w, TK.h)), q, { w: 1.6, a: ta, glow: 0.45, color: C.goldHi });
    goldStroke(g, closeP(rectPts(TK.x + 12, TK.y + 12, TK.w - 24, TK.h - 24)), q, { w: 0.9, a: ta * 0.7, glow: 0 });
    const tx = ease(t, dj(3) + 0.8, 1.0);
    text(g, '壹石', TK.x + TK.w / 2, TK.y + 120, { size: 64, weight: 700, color: C.goldHi, a: ta * tx, vertical: true });
    text(g, '米切手', TK.x + TK.w - 40, TK.y + 64, { size: 24, color: C.ivory, a: ta * tx * 0.85, vertical: true });
    text(g, '堂岛', TK.x + 40, TK.y + 64, { size: 22, color: C.ivory, a: ta * tx * 0.7, vertical: true });
    seal(g, TK.x + TK.w / 2, TK.y + TK.h - 74, 52, ta * ease(t, dj(3) + 1.6, 0.5, EXPO), '米');
    text(g, '现米', 1255, 664, { size: 24, color: C.ivory, a: ta * 0.8 * (1 - ease(t, dj(3) + 2.4, 1.2, SOFT)), track: 0.3 });
    text(g, '票据', TK.x + TK.w / 2, 772, { size: 24, color: C.goldHi, a: ta * ease(t, dj(3) + 2.6, 1.0), track: 0.3 });
  }
  // --- futures (line 4, left of the R column)
  const fa = A * life(t, dj(4) - 0.3, dje(4) + 0.35, 1.0, 0.8);
  if (fa > 0.003) {
    goldStroke(g, closeP(rectPts(FA.x, FA.top, FA.w, FBASE - FA.top)), ease(t, dj(4), 1.2, SOFT), { w: 1.4, a: fa, glow: 0.35, color: C.goldHi });
    goldStroke(g, closeP(rectPts(FB.x, FB.top, FB.w, FBASE - FB.top)), ease(t, dj(4) + 0.8, 1.2, SOFT), { w: 1.4, a: fa, glow: 0.35, color: C.goldHi });
    text(g, '约定价', FA.x + FA.w / 2, 540, { size: 24, color: C.ivory, a: fa * ease(t, dj(4) + 0.6, 0.8), vertical: true });
    text(g, '结算价', FB.x + FB.w / 2, 540, { size: 24, color: C.ivory, a: fa * ease(t, dj(4) + 1.4, 0.8), vertical: true });
    g.save(); g.setLineDash([7, 7]);
    goldStroke(g, [[FA.x + FA.w, FA.top], [FB.x + FB.w, FA.top]], ease(t, dj(4) + 2.0, 1.0, SWIFT), { w: 1.2, a: fa * 0.8, glow: 0, color: C.ivory });
    g.restore();
    const br = ease(t, dj(4) + 3.2, 0.9, SOFT);
    goldStroke(g, [[FB.x + FB.w + 14, FB.top], [FB.x + FB.w + 26, FB.top], [FB.x + FB.w + 26, FA.top], [FB.x + FB.w + 14, FA.top]], br, { w: 1.6, a: fa, glow: 0.4, color: C.goldHi });
    text(g, '差额结算', FB.x + FB.w + 62, FB.top + 18, { size: 26, weight: 600, color: C.goldHi, a: fa * ease(t, dj(4) + 3.6, 0.9), vertical: true });
    text(g, '账合米', (FA.x + FB.x + FB.w) / 2, 282, { size: 32, weight: 600, color: C.goldHi, a: fa * ease(t, dj(4) + 0.3, 1.0), track: 0.3 });
  }
  // --- the storm (line 5)
  const sa = A * life(t, dj(5) - 0.3, dje(5) + 0.35, 0.8, 0.8);
  if (sa > 0.003) {
    g.save(); g.strokeStyle = C.ivory; g.lineWidth = 1;
    for (let k = 0; k < 70; k++) {
      const ph = (t * 1.4 + hash01(k * 7 + 1)) % 1, x = hash01(k * 7 + 2) * 2100 - 60 - ph * 160, y = 220 + ph * 560;
      g.globalAlpha = sa * 0.16 * Math.min(1, ph * 5, (1 - ph) * 5); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 12, y + 46); g.stroke();
    }
    g.restore();
    const pr = stormProg(t), pts = [];
    for (let k = 0; k <= 200; k++) { const u = k / 200 * pr; pts.push([stormX(u), stormY(u)]); }
    goldStroke(g, pts, 1, { w: 1.2, a: sa * 0.55, glow: 0.3, color: C.ivory });
    const hu = 0.56, lu = 0.69;
    text(g, '暴涨', stormX(hu) + 40, stormY(hu) + 8, { size: 28, weight: 700, color: REDL, a: sa * clamp((pr - hu) * 12), align: 'left', track: 0.3 });
    text(g, '暴跌', stormX(lu) + 40, stormY(lu) - 4, { size: 28, weight: 700, color: GREENL, a: sa * clamp((pr - lu) * 12), align: 'left', track: 0.3 });
  }
  // --- the ledger (line 6)
  const ba = A * life(t, dj(6) - 0.3, WIN.dojima[1] + 1, 1.0, 0.8);
  if (ba > 0.003) {
    const q = ease(t, dj(6) - 0.1, 1.6, SOFT);
    goldStroke(g, closeP(BOOKL), q, { w: 1.5, a: ba, glow: 0.4, color: C.goldHi });
    goldStroke(g, closeP(BOOKR), q, { w: 1.5, a: ba, glow: 0.4, color: C.goldHi });
    goldStroke(g, [[960, 356], [960, 718]], q, { w: 1.2, a: ba * 0.8, glow: 0.2 });
    for (let k = 0; k < 3; k++) goldStroke(g, [[620 - 4 - k * 4, 344 + k * 4], [620 - 4 - k * 4, 708 + k * 2]], q, { w: 0.8, a: ba * 0.35, glow: 0 });
    for (let k = 0; k < 3; k++) goldStroke(g, [[1300 + 4 + k * 4, 344 + k * 4], [1300 + 4 + k * 4, 708 + k * 2]], q, { w: 0.8, a: ba * 0.35, glow: 0 });
    text(g, '账本', 960, 292, { size: 36, weight: 600, color: C.goldHi, a: ba * ease(t, dj(6) + 0.5, 1.0), track: 0.5 });
    // the first candles surface from the record: what the ledger is about to become
    for (let k = 0; k < 11; k++) {
      const u0 = k / 11, u1 = (k + 1) / 11, q2 = ba * ease(t, dj(6) + 2.4 + k * 0.12, 0.8);
      if (q2 <= 0.003) continue;
      const yo = pageY(u0), yc = pageY(u1), x = pageX((u0 + u1) / 2);
      candleY(g, x, yo, yc, Math.min(yo, yc) - 8, Math.max(yo, yc) + 8, 12, q2 * 0.85, C.goldHi, { lw: 1.2, hollow: yc < yo });
    }
  }
}

/* =====================================================================
   HOMMA — the seal, fear and greed, the fortune, the scroll, brush candles, three mountains / three rivers
   ===================================================================== */
const hm = k => lt('homma', k), hme = k => le('homma', k);
function fPaddy(i, t, o) {
  const s = Math.floor(i / 8), j = i % 8, ps = P[s * 8], x = 170 + s * (1580 / 89) + (ps.r1 - 0.5) * 8, h = 58 + ps.r3 * 54, yb = 790;
  const sway = 0.14 * Math.sin(t * 1.1 - x * 0.006) + 0.04 * Math.sin(t * 2.3 + s), f = j / 7;
  o[0] = x + Math.sin(sway) * h * f * f; o[1] = yb - h * f * Math.cos(sway * f);
  o[2] = j === 7 ? 2.1 : 1.1; o[3] = j === 7 ? 0.7 : 0.28; o[4] = j === 7 ? GOLDHI : GOLD;
}
const EMO = { L: [680, 480], R: [1240, 480] };
function fEmotion(i, t, o) {
  const p = P[i];
  if (i < 600) {
    const left = i < 300, c = left ? EMO.L : EMO.R, dir = left ? -1 : 1;
    const rad = 30 + Math.pow(p.r3, 0.7) * 190, th = p.r1 * TAU + dir * t * (0.25 + 60 / rad * 0.5);
    o[0] = c[0] + Math.cos(th) * rad; o[1] = c[1] + Math.sin(th) * rad * 0.78; o[2] = 1.2 + p.r4 * 0.9;
    o[3] = (0.4 + 0.5 * (1 - rad / 220)) * (0.7 + 0.3 * Math.sin(t * 2 + p.r5 * TAU)); o[2] += 0.3; o[4] = left ? DOWN : UP; return;
  }
  const u = (i - 600) / 119, x = 470 + u * 980;     // the price, pulled between the two
  o[0] = x; o[1] = 480 - 110 * Math.sin(u * 5.2 - t * 1.3) * Math.sin(t * 0.7 + u * 2) - 24 * Math.sin(u * 23 + t * 2);
  o[2] = 1.7; o[3] = 0.8; o[4] = GOLDHI;
}
const STK = Array.from({ length: 14 }, (_, s) => ({ x: s < 7 ? 260 + s * 44 : 1396 + (s - 7) * 44, h: 12 + Math.floor(hash01(s * 17 + 3) * 16) }));
function fWealth(i, t, o) {
  const p = P[i];
  if (i < 392) {
    const s = i % 14, lv = Math.floor(i / 14), S = STK[s];
    if (lv < S.h) {
      const n = S.h * ease(t, hm(2) + (s % 7) * 0.12, 3.2, SOFT), glow = lon('homma', 3, 0.9, 0.9, 0.2, 0.6)(t);
      o[0] = S.x; o[1] = 758 - lv * 8; o[2] = 2.3 + glow * 0.5; o[3] = lv < n ? 0.82 + 0.18 * glow * Math.sin(t * 3 - lv * 0.4) : 0; o[4] = GOLDHI; return;
    }
  }
  const side = p.r6 < 0.5, ph = (t * (0.02 + p.r2 * 0.02) + p.r1) % 1;   // grains of light rising beside the stacks
  o[0] = side ? 200 + p.r3 * 440 : 1280 + p.r3 * 440; o[1] = 770 - ph * 480; o[2] = 1 + p.r4; o[3] = 0.2 * Math.min(1, ph * 5, (1 - ph) * 4); o[4] = GOLD;
}
const scrollW = t => 30 + 400 * ease(t, hm(4) + 0.2, 2.4, SWIFT);
function scrollCol(i) { const c = i % 14, j = Math.floor(i / 14), ch = Math.floor(j / 7), sub = j % 7; return { c, ch, sub, x: 1290 - c * 50 + (hash01(c * 31 + ch * 7 + sub) - 0.5) * 16, y: 384 + ch * 46 + sub * 5.4 }; }
function fScroll(i, t, o) {
  if (i >= 588) return amb(i, t, o, 0.08);
  const S = scrollCol(i), W = scrollW(t), vis = clamp((W - 26 - Math.abs(S.x - 960)) / 30);
  o[0] = S.x; o[1] = S.y; o[2] = 1.3; o[3] = 0.55 * vis * ease(t, hm(4) + 1.2 + S.c * 0.12, 0.8); o[4] = IVORY;
}
const BRC = (() => {
  const k = makeCandles(1755, 10, { drift: 0.1, vol: 2.4 }), lo = Math.min(...k.map(c => c.lo)), hi = Math.max(...k.map(c => c.hi)), y = v => 652 - (v - lo) / (hi - lo) * 280;
  return k.map((c, j) => ({ x: 672 + j * 64, yo: y(c.o), yc: y(c.c), yh: y(c.hi), yl: y(c.lo) }));
})();
function fBrush(i, t, o) {
  const p = P[i];
  if (i < 500) {
    const B = BRC[i % 10], on = ease(t, hm(5) + 0.4 + (i % 10) * 0.35, 1.0);
    const yy = lerp(B.yh, B.yl, p.r2), dx = (p.r3 - 0.5) * 50 * (0.4 + p.r4);
    o[0] = B.x + dx; o[1] = yy + Math.sin(t * 0.8 + p.r5 * TAU) * 6; o[2] = 1 + p.r6; o[3] = 0.16 * on; o[4] = GOLD; return;
  }
  amb(i, t, o, 0.08);
}
function brushCandle(g, B, w, a, p) {
  if (a <= 0.003 || p <= 0) return;
  const up = B.yc < B.yo, top = Math.min(B.yo, B.yc), bot = Math.max(B.yo, B.yc), x = B.x;
  g.save(); g.lineCap = 'round'; g.lineJoin = 'round'; g.strokeStyle = C.goldHi; g.fillStyle = C.goldHi;
  const pw = clamp(p / 0.3), pb = clamp((p - 0.25) / 0.75);
  g.globalAlpha = a * 0.9; g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(x, B.yh); g.lineTo(x, lerp(B.yh, B.yl, pw)); g.stroke();
  if (pb > 0) {
    const hh = Math.max(4, (bot - top) * pb), L = x - w / 2, R = x + w / 2;
    g.beginPath(); g.moveTo(L - 2, top + 3); g.quadraticCurveTo(x, top - 5, R + 1, top + 1); g.lineTo(R + 2, top + hh * 0.55); g.lineTo(R - 1, top + hh);
    g.quadraticCurveTo(x, top + hh + 5, L + 1, top + hh - 1); g.lineTo(L - 1, top + hh * 0.45); g.closePath();
    if (up) { g.globalAlpha = a; g.lineWidth = 3; g.stroke(); g.globalAlpha = a * 0.1; g.fill(); }
    else {
      g.globalAlpha = a * 0.88; g.fill();
      g.globalAlpha = a * 0.35; g.strokeStyle = '#000'; g.lineWidth = 1.1;    // dry-brush streaks
      for (const f of [0.28, 0.55, 0.78]) { g.beginPath(); g.moveTo(L + w * f, top + 6); g.lineTo(L + w * f + 1, top + hh * (0.6 + 0.3 * f)); g.stroke(); }
    }
  }
  g.restore();
}
/* three mountains (a triple top) and three rivers (a triple bottom) */
function patShape(u) { return gz(u, 0.2, 0.085) + gz(u, 0.5, 0.085) + gz(u, 0.8, 0.085) - (u < 0.08 ? 0.3 * (0.08 - u) / 0.08 : 0) - (u > 0.88 ? 0.5 * (u - 0.88) / 0.12 : 0); }
function mkPattern(top, x0, seed) {
  const R = rng(seed), n = 24, out = []; let prev = null;
  for (let k = 0; k < n; k++) {
    const u = k / (n - 1), v = patShape(u) + (R() - 0.5) * 0.08, y = top ? 620 - 236 * v : 470 + 236 * v;
    const yo = prev === null ? y + (top ? 14 : -14) : prev, yc = y;
    let yh = Math.min(yo, yc) - 4 - R() * 14, yl = Math.max(yo, yc) + 4 + R() * 14;
    out.push({ x: x0 + k * 29, yo, yc, yh, yl }); prev = yc;
  }
  const touch = [5, 12, 18];
  touch.forEach(k => { if (top) out[k].yh = 372; else out[k].yl = 718; });
  return { c: out, touch, line: top ? 372 : 718 };
}
const SANZAN = mkPattern(true, 1060, 31), SANSEN = mkPattern(false, 180, 37);
function fPattern(Pt, id, k, x0, x1) {
  return (i, t, o) => {
    const p = P[i];
    if (i < 360) {                                 // a pulsing ring at each of the three touches
      const j = Math.floor(i / 120), c = Pt.c[Pt.touch[j]], on = ease(t, lt(id, k) + 0.4 + Pt.touch[j] * 0.09 + 0.3, 0.8);
      const th = (i % 120) / 120 * TAU + t * 0.5, r = 20 + 8 * Math.sin(t * 3 - j) + p.r2 * 6;
      o[0] = c.x + Math.cos(th) * r; o[1] = Pt.line + Math.sin(th) * r; o[2] = 1.3; o[3] = 0.6 * on; o[4] = GOLDHI; return;
    }
    if (i < 480) { const u = (i - 360) / 119; o[0] = lerp(x0, x1, u); o[1] = Pt.line + Math.sin(t * 2 + u * 20) * 1.5; o[2] = 1.3; o[3] = 0.45 * ease(t, lt(id, k) + 0.2 + u * 0.8, 0.6); o[4] = GOLD; return; }
    amb(i, t, o, 0.08, x0, x1, 290, 760);
  };
}
function drawPattern(g, Pt, t, t0, a, top) {
  const n = Pt.c.length, x0 = Pt.c[0].x - 30, x1 = Pt.c[n - 1].x + 30;
  g.save(); g.setLineDash([8, 8]); goldStroke(g, [[x0, Pt.line], [x1, Pt.line]], ease(t, t0, 1.2, SWIFT), { w: 1.2, a: a * 0.85, glow: 0, color: C.ivory }); g.restore();
  Pt.c.forEach((c, k) => { const q = ease(t, t0 + 0.4 + k * 0.09, 0.5); candleY(g, c.x, c.yo, lerp(c.yo, c.yc, q), lerp(c.yo, c.yh, q), lerp(c.yo, c.yl, q), 14, a * q, c.yc < c.yo ? RED : GREEN); });
  Pt.touch.forEach((k, j) => text(g, String(j + 1), Pt.c[k].x, Pt.line + (top ? -40 : 40), { font: 'latin', size: 24, weight: 500, color: C.goldHi, a: a * ease(t, t0 + 0.7 + k * 0.09, 0.6) }));
  // the break: an arrow drawn as a shape
  const last = Pt.c[n - 1], q = ease(t, t0 + 0.6 + n * 0.09, 0.8), ax = last.x + 34, ay0 = top ? last.yc - 60 : last.yc + 60, ay1 = top ? last.yc + 10 : last.yc - 10;
  goldStroke(g, [[ax, ay0], [ax, ay1]], q, { w: 2, a: a, glow: 0.4, color: top ? GREENL : REDL });
  const d = top ? 1 : -1; goldStroke(g, [[ax - 8, ay1 - 10 * d], [ax, ay1], [ax + 8, ay1 - 10 * d]], q, { w: 2, a: a * q, glow: 0, color: top ? GREENL : REDL });
  text(g, top ? '压力线' : '支撑线', top ? x1 - 4 : x0 + 4, Pt.line + (top ? -30 : 30) * 1, { size: 22, color: C.ivory, a: a * 0.8 * ease(t, t0 + 1.0, 0.8), align: top ? 'right' : 'left', track: 0.2 });
}
function artHomma(g, t) {
  const A = secA(t, 'homma', 1.1);
  if (A <= 0.003) return;
  // the seal (line 0, centre stays clear)
  const sl = A * life(t, hm(0) + 0.3, hme(0) + 0.5, 0.4, 0.8), st = ease(t, hm(0) + 0.3, 0.5, EXPO);
  if (sl > 0.003) {
    const s = 120 * lerp(1.35, 1, st);
    seal(g, 1500, 342, s, sl * st, '本间');
    goldStroke(g, arcPts(1500, 342, 70 + 60 * ease(t, hm(0) + 0.45, 1.0), 0, TAU, 60), 1, { w: 1, a: sl * (1 - ease(t, hm(0) + 0.45, 1.0)) * 0.6, glow: 0 });
    goldStroke(g, [[170, 680], [1750, 680]], ease(t, WIN.homma[0] + 1.4, 2.0, SOFT), { w: 0.8, a: sl * 0.3, glow: 0 });
  }
  // fear and greed (line 1)
  const e1 = A * lon('homma', 1, 0.9, 0.9, 0.0, 0.5)(t);
  if (e1 > 0.003) {
    text(g, '恐惧', EMO.L[0], 716, { size: 36, weight: 700, color: GREENL, a: e1 * ease(t, hm(1) + 0.6, 0.8), track: 0.4 });
    text(g, '贪婪', EMO.R[0], 716, { size: 36, weight: 700, color: REDL, a: e1 * ease(t, hm(1) + 1.0, 0.8), track: 0.4 });
    text(g, '供需', 960, 300, { size: 24, color: C.ivory, a: e1 * 0.6 * ease(t, hm(1) + 0.3, 0.8), track: 0.4 });
    goldStroke(g, [[920, 318], [1000, 318]], ease(t, hm(1) + 1.6, 0.6), { w: 1.2, a: e1 * 0.6, glow: 0, color: C.ivory });
  }
  // the fortune (lines 2-3): coin tops
  const w2 = A * life(t, hm(2) - 0.2, hme(3) + 0.4, 1.0, 0.8);
  if (w2 > 0.003) {
    g.save(); g.strokeStyle = C.goldHi; g.lineWidth = 1.1;
    STK.forEach((S, s) => {
      const n = Math.floor(S.h * ease(t, hm(2) + (s % 7) * 0.12, 3.2, SOFT)); if (n < 1) return;
      g.globalAlpha = w2 * 0.45; g.beginPath(); for (let lv = 0; lv < n; lv++) { const y = 758 - lv * 8; g.moveTo(S.x + 15, y); g.ellipse(S.x, y, 15, 4.2, 0, 0, Math.PI); } g.stroke();
      g.globalAlpha = w2 * 0.85; g.beginPath(); g.ellipse(S.x, 758 - (n - 1) * 8, 15, 4.2, 0, 0, TAU); g.stroke();
      g.beginPath(); g.moveTo(S.x - 15, 758); g.lineTo(S.x - 15, 758 - (n - 1) * 8); g.moveTo(S.x + 15, 758); g.lineTo(S.x + 15, 758 - (n - 1) * 8); g.globalAlpha = w2 * 0.35; g.stroke();
    });
    g.restore();
    goldStroke(g, [[230, 766], [570, 766]], w2, { w: 1, a: w2 * 0.5, glow: 0 });
    goldStroke(g, [[1366, 766], [1706, 766]], w2, { w: 1, a: w2 * 0.5, glow: 0 });
  }
  // the scroll (lines 4-5)
  const sc = A * life(t, hm(4) - 0.2, hme(5) + 0.4, 0.8, 0.8);
  if (sc > 0.003) {
    const W = scrollW(t), y0 = 334, y1 = 686;
    goldStroke(g, [[960 - W, y0], [960 + W, y0]], 1, { w: 1.2, a: sc * 0.8, glow: 0.2 });
    goldStroke(g, [[960 - W, y1], [960 + W, y1]], 1, { w: 1.2, a: sc * 0.8, glow: 0.2 });
    goldStroke(g, [[960 - W + 10, y0 + 12], [960 + W - 10, y0 + 12]], 1, { w: 0.7, a: sc * 0.4, glow: 0 });
    goldStroke(g, [[960 - W + 10, y1 - 12], [960 + W - 10, y1 - 12]], 1, { w: 0.7, a: sc * 0.4, glow: 0 });
    for (const s of [-1, 1]) {
      const x = 960 + s * W;
      goldStroke(g, closeP(rectPts(x - 8, y0 - 18, 16, y1 - y0 + 36)), 1, { w: 1.6, a: sc, glow: 0.4, color: C.goldHi });
      for (const yy of [y0 - 26, y1 + 26]) goldStroke(g, closeP(rectPts(x - 5, yy - 8, 10, 16)), 1, { w: 1.2, a: sc * 0.8, glow: 0 });
    }
    // the title slip, read vertically
    const ts = sc * clamp((W - 380) / 30);
    goldStroke(g, closeP(rectPts(1330, 360, 38, 204)), ts, { w: 1, a: ts * 0.8, glow: 0 });
    text(g, '三猿金泉录', 1349, 384, { size: 20, weight: 600, color: C.goldHi, a: ts, vertical: true });
    const b5 = ease(t, hm(5) - 0.2, 0.8, SOFT);
    text(g, '相传成书 · 1755', 960, 722, { size: 22, color: C.ivory, a: sc * 0.75 * ease(t, hm(4) + 2.4, 1.0) * (1 - b5), track: 0.25 });
    BRC.forEach((B, k) => brushCandle(g, B, 32, sc * b5, ease(t, hm(5) + 0.4 + k * 0.35, 1.0, SOFT)));
    const fu = BRC.findIndex(B => B.yc < B.yo), fd = BRC.findIndex(B => B.yc > B.yo), la = sc * ease(t, hm(5) + 4.2, 0.9);
    text(g, '阳线', BRC[fu].x, 722, { size: 24, weight: 600, color: C.goldHi, a: la, track: 0.3 });
    text(g, '阴线', BRC[fd].x, 722, { size: 24, weight: 600, color: C.goldHi, a: la, track: 0.3 });
  }
  // three mountains (line 6, right) and three rivers (line 7, left)
  const m6 = A * life(t, hm(6) - 0.3, hme(6) + 0.4, 0.8, 0.7);
  if (m6 > 0.003) drawPattern(g, SANZAN, t, hm(6), m6, true);
  const m7 = A * life(t, hm(7) - 0.3, WIN.homma[1] + 1, 0.8, 0.7);
  if (m7 > 0.003) drawPattern(g, SANSEN, t, hm(7), m7, false);
}

/* =====================================================================
   NISON — 界线 (keisen), Wall Street, bar chart vs candlestick, emotion
   ===================================================================== */
const ns = k => lt('nison', k), nse = k => le('nison', k);
const KST = [[[800, 296], [800, 728]], [[828, 528], [1080, 296]], [[900, 452], [1092, 728]]];
function fKletter(i, t, o) {
  const p = P[i], sg = i < 270 ? 0 : i < 500 ? 1 : 2, [[x0, y0], [x1, y1]] = KST[sg], l = Math.hypot(x1 - x0, y1 - y0), w = 34 * (p.r2 - 0.5);
  const x = lerp(x0, x1, p.r1) - (y1 - y0) / l * w, y = lerp(y0, y1, p.r1) + (x1 - x0) / l * w;
  o[0] = x; o[1] = y + Math.sin(t * 1.3 + p.r3 * TAU) * 1.5;
  o[2] = 1.4 + p.r4 * 0.8; o[3] = 0.55 + 0.25 * Math.sin(t * 1.7 + p.r5 * TAU); o[4] = p.r6 < 0.15 ? IVORY : GOLDHI;
}
const BLD = [[380, 90, 540], [478, 74, 450], [560, 108, 370], [676, 82, 480], [766, 128, 330], [902, 92, 430], [1002, 120, 384], [1130, 72, 500], [1210, 104, 352], [1322, 92, 456], [1422, 116, 404]];
const WINS = (() => {
  const all = [];
  BLD.forEach(([x, w, top], b) => { for (let y = top + 16; y < 750; y += 22) for (let xx = x + 12; xx < x + w - 8; xx += 17) all.push([xx, y, b]); });
  const n = Math.min(640, all.length), out = []; for (let k = 0; k < n; k++) out.push(all[Math.floor(k * all.length / n)]); return out;
})();
const skyY = (y, sc) => 760 - (760 - y) * sc;
function fSkyline(warm) {
  return (i, t, o) => {
    const p = P[i];
    if (i >= WINS.length) return amb(i, t, o, 0.07, 200, 1720, 270, 520);
    const [x, y, b] = WINS[i], sc = warm ? 0.56 : 1, on = hash01(i * 3 + Math.floor(t * 0.7 + p.r1 * 5) * 977) > (warm ? 0.12 : 0.35);
    o[0] = 960 + (x - 960) * (warm ? 0.92 : 1); o[1] = skyY(y, sc); o[2] = warm ? 1.7 : 1.5;
    o[3] = (on ? (warm ? 0.9 : 0.5) : 0.07) * (0.8 + 0.2 * Math.sin(t * 2 + p.r2 * TAU));
    o[4] = warm ? (p.r3 < 0.45 ? UP : p.r3 < 0.8 ? DOWN : GOLDHI) : (p.r3 < 0.5 ? TEAL : IVORY);
  };
}
const BARS = (() => { const k = makeCandles(1991, 12, { drift: 0.2, vol: 1.2 }), lo = Math.min(...k.map(c => c.lo)), hi = Math.max(...k.map(c => c.hi)), y = v => 690 - (v - lo) / (hi - lo) * 350; return k.map((c, j) => ({ j, yo: y(c.o), yc: y(c.c), yh: y(c.hi), yl: y(c.lo), up: c.c >= c.o })); })();
function barPlace(t) {
  const m = ease(t, ns(4) - 0.5, 1.8, SWIFT), m2 = ease(t, ns(5) - 0.5, 1.8, SWIFT);
  const cx = lerp(1388, 960, m), sc = lerp(lerp(1, 1.16, m), 0.6, m2), cy = lerp(515, 372, m2);
  return { x: j => cx + (j - 5.5) * 56 * sc, y: v => cy + (v - 515) * sc, sc };
}
const barGrow = (j, t) => ease(t, ns(3) + 1.6 + j * 0.2, 0.9);
function fBars(i, t, o) {
  const p = P[i];
  if (i < 480) { const B = BARS[i % 12], s = Math.floor(i / 12) / 39, pl = barPlace(t); o[0] = pl.x(B.j); o[1] = pl.y(lerp(B.yh, B.yl, s)); o[2] = 1.2; o[3] = 0.3; o[4] = IVORY; return; }
  amb(i, t, o, 0.07, 1000, 1780, 280, 740, TEAL);
}
const BOOK = { x: 360, y: 340, w: 330, h: 390 };
const BOOKP = mkPath([closeP(rectPts(BOOK.x, BOOK.y, BOOK.w, BOOK.h))]);
function fCandles(i, t, o) {
  const p = P[i];
  if (i < 480) {
    const B = BARS[i % 12], s = Math.floor(i / 12) / 39, pl = barPlace(t), gr = barGrow(B.j, t);
    const top = Math.min(B.yo, B.yc), bot = Math.max(B.yo, B.yc), mid = (top + bot) / 2, body = s < 0.65;
    const yb = lerp(mid, lerp(top, bot, s / 0.65), gr), yw = lerp(B.yh, B.yl, (s - 0.65) / 0.35);
    o[0] = pl.x(B.j) + (body ? (p.r2 - 0.5) * 16 * gr * pl.sc : 0); o[1] = pl.y(body ? yb : yw); o[2] = 1.4; o[3] = body ? 0.4 * gr : 0.3; o[4] = B.up ? UP : DOWN; return;
  }
  if (i < 640) { const [x, y] = BOOKP((i - 480) / 160); o[0] = x; o[1] = y; o[2] = 1.3; o[3] = 0.4 * (1 - ease(t, ns(4) - 0.6, 0.8)); o[4] = GOLD; return; }
  amb(i, t, o, 0.07);
}
function fGlow(i, t, o) {
  const p = P[i];
  if (i < 600) {                                   // warm sparks lifting off every candle
    const B = BARS[i % 12], pl = barPlace(t), ph = (t * (0.18 + p.r2 * 0.2) + p.r1) % 1, top = Math.min(B.yo, B.yc), bot = Math.max(B.yo, B.yc);
    o[0] = pl.x(B.j) + (p.r3 - 0.5) * 34 * pl.sc + Math.sin(ph * 6 + p.r4 * 9) * 6; o[1] = pl.y(lerp(bot, top, p.r5)) - ph * 120 * pl.sc;
    o[2] = 1.1 + p.r6; o[3] = 0.55 * Math.min(1, ph * 6, (1 - ph) * 2); o[4] = p.r6 < 0.6 ? (B.up ? UP : DOWN) : GOLDHI; return;
  }
  amb(i, t, o, 0.08);
}
function artNison(g, t) {
  const A = secA(t, 'nison', 1.1);
  if (A <= 0.003) return;
  // keisen: ruled lines behind the K (line 0)
  const k0 = A * life(t, WIN.nison[0], nse(0) + 0.4, 0.8, 0.8);
  if (k0 > 0.003) {
    for (let k = 0; k < 9; k++) { const y = 296 + k * 54; goldStroke(g, [[560, y], [1220, y]], ease(t, WIN.nison[0] + 1.6 + k * 0.12, 1.4, SOFT), { w: 0.8, a: k0 * 0.28, glow: 0 }); }
    goldStroke(g, [[600, 270], [600, 754]], ease(t, WIN.nison[0] + 1.5, 1.4, SOFT), { w: 0.8, a: k0 * 0.4, glow: 0, color: REDL });
    const q = ease(t, ns(0) + 0.8, 1.0);
    text(g, '界线', 1310, 452, { size: 48, weight: 600, color: C.goldHi, a: k0 * q, align: 'left', track: 0.3 });
    g.save(); g.font = "500 41px 'CormorantSub'"; const kw = g.measureText('K').width; g.restore();
    text(g, 'K', 1312, 520, { font: 'latin', size: 34, weight: 500, color: C.goldHi, a: k0 * ease(t, ns(0) + 1.6, 1.0), align: 'left', track: 0 });
    text(g, 'EISEN', 1312 + kw + 6, 520, { font: 'latin', size: 34, weight: 500, color: C.ivory, a: k0 * 0.6 * ease(t, ns(0) + 1.6, 1.0), align: 'left', track: 0.18 });
    goldStroke(g, [[1312, 546], [1312 + kw, 546]], ease(t, ns(0) + 2.4, 0.6), { w: 1.6, a: k0, glow: 0.4, color: C.goldHi });
  }
  // Wall Street (line 1) and its reprise lit by candles (line 5)
  const sk = A * Math.max(lon('nison', 1, 0.9, 0.8, 0.1, -0.4)(t), life(t, ns(5) - 0.3, WIN.nison[1] + 1, 1.0, 0.8));
  if (sk > 0.003) {
    const warm = t > ns(3), sc = warm ? 0.56 : 1, xs = warm ? 0.92 : 1;
    BLD.forEach(([x, w, top], b) => {
      const X = 960 + (x - 960) * xs, Wd = w * xs, Y = skyY(top, sc);
      goldStroke(g, [[X, 760], [X, Y], [X + Wd, Y], [X + Wd, 760]], ease(t, (warm ? ns(5) : ns(1)) - 0.2 + b * 0.07, 1.2, SOFT), { w: 1, a: sk * 0.55, glow: 0.15, color: warm ? C.gold : GREY });
    });
    goldStroke(g, [[340, 760], [1580, 760]], 1, { w: 1, a: sk * 0.45, glow: 0, color: warm ? C.gold : GREY });
    if (!warm) {
      text(g, 'WALL STREET', 960, 292, { font: 'latin', size: 26, weight: 500, color: GREY, a: sk * 0.8, track: 0.5 });
      text(g, '1980年代以前', 960, 252, { size: 22, color: C.ivory, a: sk * 0.6, track: 0.3 });
    }
  }
  // the western bar chart (line 2) -> candles (line 3) -> glowing emotion (line 4) -> shrinks above the city (line 5)
  const ch = A * life(t, ns(2) - 0.3, WIN.nison[1] + 1, 0.9, 0.8);
  if (ch > 0.003) {
    const pl = barPlace(t), warm4 = ease(t, ns(4) - 0.2, 1.4, SOFT), small = ease(t, ns(5) - 0.5, 1.8, SWIFT);
    BARS.forEach(B => {
      const q = ease(t, ns(2) + 0.2 + B.j * 0.12, 0.7), gr = barGrow(B.j, t), x = pl.x(B.j), col = mixHex(GREY, B.up ? RED : GREEN, gr), al = ch * q;
      if (al <= 0.003) return;
      const top = Math.min(B.yo, B.yc), bot = Math.max(B.yo, B.yc), mid = (top + bot) / 2, w = 22 * pl.sc;
      g.globalAlpha = al; g.strokeStyle = col; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x, pl.y(B.yh)); g.lineTo(x, pl.y(B.yl)); g.stroke();
      if (gr < 1) { g.globalAlpha = al * (1 - gr); g.lineWidth = 2.2; g.beginPath(); g.moveTo(x - 14 * pl.sc, pl.y(B.yo)); g.lineTo(x, pl.y(B.yo)); g.moveTo(x, pl.y(B.yc)); g.lineTo(x + 14 * pl.sc, pl.y(B.yc)); g.stroke(); }
      if (gr > 0) { g.globalAlpha = al * gr; g.fillStyle = col; const y0 = pl.y(lerp(mid, top, gr)), y1 = pl.y(lerp(mid, bot, gr)); g.fillRect(x - w / 2, y0, w, Math.max(1.5, y1 - y0)); }
      g.globalAlpha = 1;
      if (warm4 > 0.01) { const y0 = pl.y(top), y1 = pl.y(bot); goldStroke(g, closeP(rectPts(x - w / 2 - 4, y0 - 4, w + 8, y1 - y0 + 8)), 1, { w: 1, a: al * warm4 * (0.35 + 0.25 * Math.sin(t * 2.2 + B.j)), glow: 0.8, color: C.goldHi }); }
    });
    const lx = pl.x(5.5), ly = pl.y(318), bar = ch * (1 - ease(t, ns(3) + 1.6, 1.0, SOFT)), cdl = ch * ease(t, ns(3) + 2.2, 1.0, SOFT) * (1 - ease(t, ns(4) - 0.4, 0.6, SOFT));
    text(g, '条形图 · OHLC', lx, ly, { size: 26, color: GREY, a: bar, track: 0.25 });
    text(g, '蜡烛图', lx, ly, { size: 30, weight: 600, color: C.goldHi, a: cdl, track: 0.4 });
    // open / close callouts on the first and last bars
    const oc = ch * ease(t, ns(2) + 1.8, 0.8) * (1 - ease(t, ns(3) + 1.2, 0.8, SOFT));
    const B0 = BARS[0], B1 = BARS[11];
    text(g, '开盘', pl.x(0) - 26, pl.y(B0.yo), { size: 22, color: GREY, a: oc, align: 'right', track: 0.2 });
    text(g, '收盘', pl.x(11) + 26, pl.y(B1.yc), { size: 22, color: GREY, a: oc, align: 'left', track: 0.2 });
    // body / shadow callouts (line 4)
    const em = ch * lon('nison', 4, 0.8, 0.8, -0.4, 0.3)(t);
    if (em > 0.003) {
      const Bt = BARS[11], x = pl.x(11), top = pl.y(Math.min(Bt.yo, Bt.yc)), bot = pl.y(Math.max(Bt.yo, Bt.yc));
      callout(g, x + 14 * pl.sc, (top + bot) / 2, x + 110, (top + bot) / 2 + 60, '实体', ease(t, ns(4) + 0.6, 1.2) * em, { side: 'right', size: 24, color: C.goldHi });
      callout(g, x, pl.y(Bt.yh) + 4, x + 110, pl.y(Bt.yh) - 40, '影线', ease(t, ns(4) + 1.2, 1.2) * em, { side: 'right', size: 24, color: C.goldHi });
    }
  }
  // the book (line 3)
  const bk = A * life(t, ns(3) - 0.3, nse(3) + 0.4, 0.9, 0.8);
  if (bk > 0.003) {
    const q = ease(t, ns(3) - 0.1, 1.4, SOFT), { x, y, w, h } = BOOK;
    goldStroke(g, closeP(rectPts(x, y, w, h)), q, { w: 1.6, a: bk, glow: 0.45, color: C.goldHi });
    goldStroke(g, [[x + 18, y], [x + 18, y + h]], q, { w: 0.9, a: bk * 0.6, glow: 0 });
    for (let k = 1; k <= 3; k++) goldStroke(g, [[x + w + k * 4, y + k * 4], [x + w + k * 4, y + h + k * 2], [x + 18 + k * 4, y + h + k * 2]], q, { w: 0.8, a: bk * 0.35, glow: 0 });
    const tq = bk * ease(t, ns(3) + 0.6, 1.0);
    text(g, '1991', x + w / 2 + 9, y + 54, { font: 'latin', size: 30, weight: 500, color: C.gold, a: tq, track: 0.3 });
    text(g, '日本蜡烛图技术', x + w / 2 + 9, y + 132, { size: 28, weight: 700, color: C.goldHi, a: tq, track: 0.1 });
    [[0, 1, 26, -8], [1, 0, 34, 6], [2, 1, 22, -14]].forEach(([k, up, hh, dy]) => {
      const cx = x + w / 2 - 22 + k * 22, cy = y + 236 + dy;
      candleY(g, cx, up ? cy + hh / 2 : cy - hh / 2, up ? cy - hh / 2 : cy + hh / 2, cy - hh / 2 - 10, cy + hh / 2 + 10, 11, tq * 0.9, up ? RED : GREEN, { lw: 1.2 });
    });
    text(g, 'STEVE NISON', x + w / 2 + 9, y + h - 54, { font: 'latin', size: 22, weight: 500, color: C.ivory, a: tq * 0.8, track: 0.35 });
  }
}

/* =====================================================================
   COLOR — one series, two conventions; then a single candle and its flame
   ===================================================================== */
const cl = k => lt('color', k), cle = k => le('color', k);
const CS = [[10, 12, 12.6, 9.6], [12, 11.2, 12.4, 10.8], [11.2, 13.5, 13.9, 11], [13.5, 14.6, 15, 13.1], [14.6, 13.9, 15.1, 13.4], [13.9, 15.8, 16.2, 13.7], [15.8, 15.2, 16.4, 14.9], [15.2, 17.1, 17.5, 15], [17.1, 18.4, 18.9, 16.8]];
function drawSeries(g, cx, cy, sc, upC, dnC, a, prog = 1) {
  if (a <= 0.003) return;
  const yOf = v => cy + (14.25 - v) * 24 * sc;
  CS.forEach(([o, c, h, l], k) => {
    const q = clamp(prog * CS.length - k);
    if (q <= 0) return;
    const x = cx + (k - 4) * 58 * sc, cc = lerp(o, c, q);
    candleY(g, x, yOf(o), yOf(cc), yOf(lerp(Math.max(o, c), h, q)), yOf(lerp(Math.min(o, c), l, q)), 30 * sc, a * q, c >= o ? upC : dnC, { lw: 2 });
  });
}
const swapS = t => sine(seg(t, cl(3) + 0.6, cl(3) + 1.8)) - sine(seg(t, cl(3) + 2.0, cl(3) + 3.2));
const goldM = t => ease(t, cl(3) + 3.0, 1.0, SOFT);
const flameT = () => cl(3) + 3.6;
function fColorA(i, t, o) {
  const p = P[i];
  if (i < 240) { const u = i / 239; o[0] = 200 + u * 1520; o[1] = 772 + Math.sin(u * 30 + t * 1.2) * 2; o[2] = 1.2; o[3] = 0.22 * (0.6 + 0.4 * Math.sin(t * 1.5 + u * 40)); o[4] = GOLD; return; }
  const th = p.r1 * TAU + t * 0.05 * (0.5 + p.r2), rx = 700 + p.r3 * 200, ry = 230 + p.r4 * 80;
  o[0] = 960 + Math.cos(th) * rx; o[1] = 500 + Math.sin(th) * ry; o[2] = 1 + p.r5 * 1.1; o[3] = 0.12 + 0.08 * Math.sin(t + p.r6 * TAU); o[4] = GOLD;
}
const FL = { x: 960, top: 500, bot: 690, wick: 452 };
function fFlame(i, t, o) {
  const p = P[i];
  if (i < 420) {                                   // a soft halo around the candle
    const th = p.r1 * TAU + t * 0.25 * (p.r2 - 0.5), r = 90 + p.r3 * 260;
    o[0] = FL.x + Math.cos(th) * r * 1.2; o[1] = 520 + Math.sin(th) * r * 0.75; o[2] = 1 + p.r4; o[3] = 0.16 * (1 - r / 400) + 0.06; o[4] = GOLD; return;
  }
  const ph = (t * (0.22 + p.r2 * 0.25) + p.r1) % 1, on = ease(t, flameT() + 0.6, 1.0);   // embers rising from the flame
  o[0] = FL.x + Math.sin(ph * 5 + p.r3 * 9) * 40 * ph + (p.r4 - 0.5) * 70 * ph; o[1] = FL.wick - 90 - ph * 170; o[2] = 1 + p.r5 * 1.2;
  o[3] = (i % 3 === 0 ? on * 0.6 * Math.min(1, ph * 8, (1 - ph) * 1.5) : 0); o[4] = p.r6 < 0.5 ? GOLDHI : GOLD;
}
const FLN = noise1(4401);
function drawFlame(g, x, y, h, w, a, t) {
  if (a <= 0.003) return;
  const sway = 4 * FLN(t * 2.1), hh = h * (1 + 0.08 * FLN(t * 3.3 + 7));
  const gr = g.createRadialGradient(x, y - hh * 0.35, 0, x, y - hh * 0.35, h * 1.6);
  gr.addColorStop(0, rgba(C.goldHi, 0.3 * a)); gr.addColorStop(0.4, rgba(C.gold, 0.1 * a)); gr.addColorStop(1, rgba(C.gold, 0));
  g.fillStyle = gr; g.fillRect(x - h * 1.6, y - hh * 0.35 - h * 1.6, h * 3.2, h * 3.2);
  const tear = (s, col, al) => {
    g.globalAlpha = a * al; g.fillStyle = col; g.beginPath();
    g.moveTo(x + sway * s * 1.4, y - hh * s);
    g.bezierCurveTo(x + w * s * 0.9 + sway * 0.5, y - hh * s * 0.55, x + w * s * 1.05, y - hh * s * 0.05 + 2, x, y + w * s * 0.35);
    g.bezierCurveTo(x - w * s * 1.05, y - hh * s * 0.05 + 2, x - w * s * 0.9 + sway * 0.5, y - hh * s * 0.55, x + sway * s * 1.4, y - hh * s);
    g.fill();
  };
  tear(1, C.gold, 0.55); tear(0.78, C.goldHi, 0.8); tear(0.48, '#FFF6E2', 0.95);
  g.globalAlpha = 1;
}
function artColor(g, t) {
  const A = secA(t, 'color', 0.3);
  if (A <= 0.003) return;
  const CN = [RED, GREEN], US = [GREEN, RED];
  // series 1: centre (line 0) -> right, A-share (line 1) -> left, US (line 2) -> left in line 3
  const m1 = ease(t, cl(1) - 0.6, 1.6, SWIFT), m2 = ease(t, cl(2) - 0.6, 1.8, SWIFT), mg = ease(t, cl(3) + 3.0, 1.4, SWIFT);
  let cx = lerp(lerp(960, 1400, m1), 560, m2), cy = lerp(470, 490, m1), sc = lerp(1.3, 1.12, m1);
  const toUS = ease(t, cl(2) - 0.2, 1.2, SOFT), s = swapS(t), gm = goldM(t);
  const fade = 1 - ease(t, cl(3) + 3.6, 0.9, SOFT);
  const col = (base, other, u) => [mixHex(mixHex(base[0], other[0], u), C.goldHi, gm), mixHex(mixHex(base[1], other[1], u), C.goldHi, gm)];
  const c1 = col(CN, US, clamp(toUS - s)), prog = ease(t, WIN.color[0] + 1.6, 2.0, SOFT);
  drawSeries(g, lerp(cx, 960, mg), lerp(cy, 520, mg), lerp(sc, 0.5, mg), c1[0], c1[1], A * fade, prog);
  // series 2 joins on the right for line 3 (A-share), and the two trade colours
  const a2 = A * ease(t, cl(3) - 0.4, 1.0, SOFT) * fade;
  const c2 = col(CN, US, s);
  drawSeries(g, lerp(1360, 960, mg), lerp(490, 520, mg), lerp(1.12, 0.5, mg), c2[0], c2[1], a2);
  // labels
  const lab = (x, mk, mkC, a) => {
    if (a <= 0.003) return;
    text(g, mk, x, 704, { size: 32, weight: 700, color: C.goldHi, a, track: 0.3 });
    const [u, d] = mkC === 'cn' ? [['红涨', REDL], ['绿跌', GREENL]] : [['绿涨', GREENL], ['红跌', REDL]];
    text(g, u[0], x - 62, 750, { size: 26, weight: 600, color: u[1], a, track: 0.2 });
    text(g, '·', x, 750, { size: 26, color: C.gold, a, track: 0 });
    text(g, d[0], x + 62, 750, { size: 26, weight: 600, color: d[1], a, track: 0.2 });
  };
  lab(1400, 'A股', 'cn', A * lon('color', 1, 0.8, 0.6, -0.6, 0.2)(t));
  lab(560, '美股', 'us', A * life(t, cl(2) + 0.6, cl(3) + 0.6, 0.8, 0.6));
  const l3 = A * life(t, cl(3) - 0.2, cl(3) + 2.9, 0.8, 0.6);
  text(g, '美股', 560, 712, { size: 26, weight: 600, color: C.ivory, a: l3 * 0.85, track: 0.3 });
  text(g, 'A股', 1360, 712, { size: 26, weight: 600, color: C.ivory, a: l3 * 0.85, track: 0.3 });
  // one candle, and its wick becomes a flame
  const ft = flameT(), ca = life(t, ft - 0.3, WIN.color[1] - 0.15, 1.0, 1.0);
  if (ca > 0.003) {
    const gw = ease(t, ft - 0.3, 1.2, EXPO), top = lerp(595, FL.top, gw), bot = lerp(595, FL.bot, gw);
    g.globalAlpha = ca * 0.9; g.fillStyle = C.goldHi; g.fillRect(FL.x - 24, top, 48, bot - top);
    g.globalAlpha = ca * 0.5; g.fillStyle = '#000'; g.fillRect(FL.x + 8, top + 4, 3, bot - top - 8); g.globalAlpha = 1;
    goldStroke(g, closeP(rectPts(FL.x - 24, top, 48, bot - top)), 1, { w: 1.2, a: ca, glow: 0.6, color: C.goldHi });
    const wk = ease(t, ft + 0.3, 0.8, SOFT);
    goldStroke(g, [[FL.x, top], [FL.x, lerp(top, FL.wick, wk)]], 1, { w: 2, a: ca, glow: 0.3, color: C.ivory });
    goldStroke(g, [[FL.x, bot], [FL.x, lerp(bot, bot + 36, wk)]], 1, { w: 2, a: ca * 0.8, glow: 0.2, color: C.goldHi });
    const fi = ease(t, ft + 0.9, 1.4, SOFT);
    drawFlame(g, FL.x, FL.wick - 4, 112 * fi, 24 * fi, ca * fi, t);
  }
}

const FILM_FORM = {
  screens: fScreens, grain: fGrain,
  dojima: fDojima, hall: fHall, ticket: fTicket, futures: fFutures, storm: fStorm, ledger: fLedger,
  paddy: fPaddy, emotion: fEmotion, wealth: fWealth, scroll: fScroll, brush: fBrush,
  sanzan: fPattern(SANZAN, 'homma', 6, 1020, 1760), sansen: fPattern(SANSEN, 'homma', 7, 150, 900),
  kletter: fKletter, skyline: fSkyline(false), bars: fBars, candles: fCandles, glow: fGlow, skyline2: fSkyline(true),
  colorA: fColorA, flame: fFlame,
};
function FILM_SCHED() {
  return [
    [0, 'screens'], [grainT0(), 'grain'],
    [WIN.dojima[0] - 0.2, 'dojima'], [dj(2) - 0.6, 'hall'], [dj(3) - 0.6, 'ticket'], [dj(4) - 0.6, 'futures'], [dj(5) - 0.5, 'storm'], [dj(6) - 0.4, 'ledger'],
    [WIN.homma[0] - 0.2, 'paddy'], [hm(1) - 0.6, 'emotion'], [hm(2) - 0.6, 'wealth'], [hm(4) - 0.6, 'scroll'], [hm(5) - 0.4, 'brush'], [hm(6) - 0.6, 'sanzan'], [hm(7) - 0.6, 'sansen'],
    [WIN.nison[0] - 0.2, 'kletter'], [ns(1) - 0.5, 'skyline'], [ns(2) - 1.5, 'bars'], [ns(3) - 0.2, 'candles'], [ns(4) - 0.5, 'glow'], [ns(5) - 0.5, 'skyline2'],
    [WIN.color[0] - 0.2, 'colorA'], [flameT() - 0.6, 'flame'],
  ];
}
const FILM_ART = { dojima: artDojima, homma: artHomma, nison: artNison, color: artColor };


/* =====================================================================
   SCHEDULER
   ===================================================================== */
const FORM = { lattice: fLattice, finale: fFinale, ...FILM_FORM };
let SCHED_ = null;
function sched() { return SCHED_ || (SCHED_ = [[-1, 'lattice'], ...FILM_SCHED(), [WIN.finale[0] - 0.6, 'finale']]); }
const OA = [0, 0, 0, 0, 0], OB = [0, 0, 0, 0, 0];
function formAlpha(t) {                            // the field steps back behind the title card
  return (1 - 0.55 * life(t, WIN.title[0] - 0.2, WIN.title[1] + 0.2, 0.8, 0.8)) * ease(t, 0.1, 1.6, SOFT);
}
function drawMatrix(g, t) {
  const S = sched(); let k = 0; while (k + 1 < S.length && t >= S[k + 1][0]) k++;
  const cur = S[k], prev = S[Math.max(0, k - 1)], fa = formAlpha(t);
  for (let i = 0; i < N; i++) {
    const p = P[i], u = k === 0 ? 1 : SWIFT(clamp((t - cur[0] - p.r1 * 0.5) / 1.5));
    FORM[cur[1]](i, t, OB);
    if (u < 1) {
      FORM[prev[1]](i, t, OA);
      const x = lerp(OA[0], OB[0], u), y = lerp(OA[1], OB[1], u) - Math.sin(Math.PI * u) * (20 + p.r2 * 40), r = lerp(OA[2], OB[2], u);
      if (OA[4] === OB[4]) dot(g, x, y, r, lerp(OA[3], OB[3], u) * fa, OB[4]);
      else { dot(g, x, y, r, OA[3] * (1 - u) * fa, OA[4]); dot(g, x, y, r, OB[3] * u * fa, OB[4]); }
    } else dot(g, OB[0], OB[1], OB[2], OB[3] * fa, OB[4]);
  }
  g.globalAlpha = 1;
}

/* =====================================================================
   LINE-ART: open + title (shared)
   ===================================================================== */
function artOpen(g, t) { artScreens(g, t); }
function artTitle(g, t) {
  const [a, b] = WIN.title, al = life(t, a - 0.1, b + 0.1, 1.2, 1.0), r = ease(t, a + 1.6, 1.6) * al;
  goldStroke(g, [[960 - 280 * r, 604], [960 + 280 * r, 604]], 1, { w: 1, a: 0.7 * r, glow: 0.3 });
  glowDot(g, 960, 604, 2, r);
}

/* =====================================================================
   FRAME
   ===================================================================== */
function drawScenes(g, t) {
  drawBackground(g, t);
  // a slow, continuous camera drift keeps the whole frame breathing
  const s = 1.012 + 0.01 * Math.sin(t * 0.11), dx = 7 * Math.sin(t * 0.07), dy = 5 * Math.sin(t * 0.09 + 1);
  camera(g, s, 960, 540, dx, dy);
  drawMatrix(g, t);
  if (inWin(t, 'open', 0, 0.8)) artOpen(g, t);
  if (inWin(t, 'title', 0.2, 0.2)) artTitle(g, t);
  for (const id of SECTIONS) if (FILM_ART[id] && inWin(t, id, 0.3, 0.6)) FILM_ART[id](g, t);
  resetCam(g);
}

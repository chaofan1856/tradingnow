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

const FILM_FORM = {}, FILM_ART = {};

/* ---------- shared bits ---------- */
const UPC = '#E08A7E', DNC = '#8FC0A6';
const twk = (i, t, s = 2) => 0.8 + 0.2 * Math.sin(t * s + P[i].r6 * TAU);
const secA = (t, id, out = 0.6) => ease(t, WIN[id][0] + 1.4, 1.0, SOFT) * (1 - ease(t, WIN[id][1] - out, 0.9, SOFT));
function amb(i, t, o, a = 0.1, x0 = 140, y0 = 270, x1 = 1780, y1 = 770) {     // a faint drifting dust field
  const p = P[i];
  o[0] = x0 + p.r1 * (x1 - x0) + 16 * Math.sin(t * 0.19 + p.r3 * TAU);
  o[1] = y0 + p.r2 * (y1 - y0) + 10 * Math.sin(t * 0.23 + p.r4 * TAU);
  o[2] = 0.9 + p.r5 * 1.1; o[3] = a * (0.55 + 0.45 * Math.sin(t * (0.7 + p.r6) + p.r3 * TAU)); o[4] = GOLD;
}
/* particles packed into bars: count proportional to height, each bar a little grid */
const BL_ = {};
function barLayout(key, hs, n, cols) {
  if (BL_[key]) return BL_[key];
  const tot = hs.reduce((s, h) => s + h, 0), out = []; let cum = 0;
  hs.forEach((h, b) => {
    const s0 = Math.round(n * cum / tot); cum += h; const cnt = Math.round(n * cum / tot) - s0;
    const c = Math.max(1, Math.min(cols, cnt)), rows = Math.max(1, Math.ceil(cnt / c));
    for (let j = 0; j < cnt; j++) { const row = Math.floor(j / c); out.push({ b, fx: c > 1 ? (j % c) / (c - 1) - 0.5 : 0, fy: (row + 0.5) / rows, top: row === rows - 1 }); }
  });
  while (out.length < n) out.push(out[out.length - 1]);
  return (BL_[key] = out);
}
function barBox(g, x, base, w, h, a, col = C.gold, fill = 0.1, dir = 1) {
  if (a <= 0.003 || h <= 0.5) return;
  const y = dir > 0 ? base - h : base;
  g.globalAlpha = a * fill; g.fillStyle = col; g.fillRect(x - w / 2, y, w, h);
  g.globalAlpha = a * 0.55; g.strokeStyle = col; g.lineWidth = 1; g.strokeRect(x - w / 2, y, w, h); g.globalAlpha = 1;
}
function arrowHead(g, x0, y0, x1, y1, a, color = C.goldHi, w = 1.6, s = 14) {
  const an = Math.atan2(y1 - y0, x1 - x0);
  goldStroke(g, [[x1 - Math.cos(an - 0.45) * s, y1 - Math.sin(an - 0.45) * s], [x1, y1], [x1 - Math.cos(an + 0.45) * s, y1 - Math.sin(an + 0.45) * s]], 1, { w, a, color, glow: 0.2 });
}
function arrow(g, x0, y0, x1, y1, p, { w = 2, a = 1, color = C.goldHi, glow = 0.4, s = 14 } = {}) {
  if (p <= 0 || a <= 0.003) return;
  const hx = lerp(x0, x1, p), hy = lerp(y0, y1, p);
  goldStroke(g, [[x0, y0], [hx, hy]], 1, { w, a, color, glow });
  arrowHead(g, x0, y0, hx, hy, a * clamp(p * 4 - 0.2), color, w, s);
}
function checkMark(g, x, y, s, p, a, color = C.goldHi) {
  goldStroke(g, [[x - s * 0.5, y], [x - s * 0.12, y + s * 0.4], [x + s * 0.6, y - s * 0.5]], p, { w: 3, a, color, glow: 0.6 });
}
function diamond(g, x, y, s, a, color = C.goldHi) {
  if (a <= 0.003) return;
  g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.globalAlpha = a; g.strokeStyle = color; g.lineWidth = 1.2; g.strokeRect(-s, -s, 2 * s, 2 * s); g.restore();
}

/* =====================================================================
   OPEN — a chart that can be drawn and bent; volume bars that cannot
   ===================================================================== */
const OPC = makeCandles(1867, 30, { drift: 0.12, vol: 1 });
const OPR = (() => { let lo = 1e9, hi = -1e9; for (const k of OPC) { lo = Math.min(lo, k.lo); hi = Math.max(hi, k.hi); } return { lo, hi }; })();
const opX = j => 468 + j * 34.5, opY = v => 610 - (v - OPR.lo) / (OPR.hi - OPR.lo) * 280;
function opWarp(x, t, m = 1) {
  const A = ease(t, lt('open', 0) + 1.3, 2.2, SOFT);
  return A * m * (30 * Math.sin(x * 0.0072 + t * 1.5) + 16 * Math.sin(x * 0.018 - t * 2.3));
}
const OPV = Array.from({ length: 24 }, (_, j) => 70 + 120 * (0.5 + 0.5 * Math.sin(j * 0.9 + 1)) * (0.6 + 0.4 * hash01(j + 50)));
const ovX = j => 498 + j * 40.9, OV_BASE = 772;
function fOBars(i, t, o) {
  if (i >= 600) return amb(i, t, o, 0.07);
  const L = barLayout('open', OPV, 600, 3)[i], h = OPV[L.b], gr = ease(t, lt('open', 1) - 0.1 + L.b * 0.05, 1.6);
  o[0] = ovX(L.b) + L.fx * 14; o[1] = OV_BASE - 3 - L.fy * (h - 5) * gr;
  o[2] = 1.7; o[3] = 0.85 * twk(i, t); o[4] = L.top ? GOLDHI : GOLD;
}
const ROAD = Array.from({ length: 9 }, (_, k) => { const u = k / 8; return { x: lerp(440, 1490, u), y: 742 - 320 * Math.pow(u, 0.85) - 30 * Math.sin(u * Math.PI), s: lerp(1, 0.5, u) }; });
function fORoad(i, t, o) {
  const p = P[i], k = i % 9, M = ROAD[k], on = ease(t, lt('open', 2) + 0.2 + k * 0.28, 0.9);
  if (p.r4 < 0.28) { o[0] = M.x + (p.r1 - 0.5) * 4 * M.s; o[1] = M.y - p.r2 * 72 * M.s; }       // a slim post of light
  else { const rr = Math.sqrt(p.r1) * 34 * M.s, th = p.r2 * TAU + t * 0.4; o[0] = M.x + Math.cos(th) * rr; o[1] = M.y + Math.sin(th) * rr * 0.32; }
  o[2] = 1.4 * (0.6 + 0.4 * M.s) + on * 0.5; o[3] = (0.22 + 0.72 * on) * twk(i, t); o[4] = on > 0.5 ? GOLDHI : GOLD;
}

/* =====================================================================
   TAPE — chalk, the ticker, the first share counts
   ===================================================================== */
const BOARD = { x: 540, y: 300, w: 840, h: 400 };
const CHALK = [['ERIE', 37.375], ['NYC', 112.5], ['HAR', 64.25], ['PM', 48.625], ['WU', 79], ['RDG', 96.125], ['MICH', 103.5], ['ROCK', 88.75], ['CNW', 71.25], ['OHIO', 26.875]];
const frac8 = v => { const w = Math.floor(v + 1e-6), e = Math.round((v - w) * 8); if (!e) return String(w); const d = e % 4 === 0 ? 4 : e % 2 === 0 ? 2 : 1; return w + ' ' + (e / d) + '/' + (8 / d); };
function chalkCell(c, t) {                         // every 0.4 s two quotes are wiped and rewritten
  const t0 = lt('tape', 0) - 0.6, tick = Math.floor((t - t0) / 0.4); let v = CHALK[c][1], last = -99;
  for (let k = 0; k <= tick; k++) for (const s of [1, 2]) if (Math.floor(hash01(k * 13 + s * 5) * 10) === c) {
    const d = Math.floor(hash01(k * 13 + s * 7 + 1) * 4); v += (d < 2 ? -1 - d : d - 1) / 8; last = t0 + k * 0.4;
  }
  return { v, last };
}
const TP = { mouth: 1490, y: 612, hw: 25, sp: 280, base: 584 };
const DOME = { x: 1610, y: 600, r: 96 };
function tapeV(t) {                                // paper speed, px/s
  const a = lt('tape', 1), b = lt('tape', 4), e = le('tape', 4), s8 = lt('tape', 5);
  let v = 260 * ease(t, a + 0.2, 1.0, SOFT) - 175 * ease(t, lt('tape', 2) - 0.8, 1.4, SOFT) + 260 * ease(t, b + 0.6, e - b - 0.8, SOFT);
  return v * (1 - ease(t, e - 0.1, s8 + 0.8 - e, SOFT));
}
let TOFF_ = null;
function tapeOff(t) {
  if (!TOFF_) { const a = WIN.tape[0], n = Math.ceil((WIN.tape[1] + 1 - a) * 240), arr = new Float32Array(n + 1); let s = 0; for (let k = 0; k <= n; k++) { arr[k] = s; s += tapeV(a + k / 240) / 240; } TOFF_ = { a, arr }; }
  const k = clamp((t - TOFF_.a) * 240, 0, TOFF_.arr.length - 1), i0 = Math.floor(k);
  return lerp(TOFF_.arr[i0], TOFF_.arr[Math.min(i0 + 1, TOFF_.arr.length - 1)], k - i0);
}
const TSYM = [['NYC', 112.5], ['ERIE', 37.25], ['RCA', 85.75], ['GM', 64.5], ['ANA', 48.125], ['BS', 72.375]];
let TENT_ = null;
function tapeEnt() {
  if (TENT_) return TENT_;
  const kA = Math.ceil((tapeOff(lt('tape', 4) - 1.2) - 40) / TP.sp), R = rng(1867), list = []; let px = 141.25;
  for (let k = 0; k < 60; k++) {
    if (k < kA) { const [s, b] = TSYM[k % TSYM.length]; list.push({ s, p: b + (Math.floor(R() * 5) - 2) * 0.125, n: (1 + Math.floor(R() * 8)) * 100, rally: false }); }
    else { px += 0.375 + Math.floor(R() * 4) * 0.25; list.push({ s: 'USS', p: px, n: Math.round((1800 + (k - kA) * 1500 + R() * 1200) / 100) * 100, rally: true }); }
  }
  return (TENT_ = { kA, list });
}
const fmtN = n => n >= 1000 ? Math.floor(n / 1000) + ',' + String(n % 1000).padStart(3, '0') : String(n);
const entX = (k, off) => TP.mouth - (off - (k * TP.sp + 40));
let TB_ = null;
function tapeBars() {                              // the entries that become the first volume bars
  if (TB_) return TB_;
  const off = tapeOff(lt('tape', 5) + 1.2), E = tapeEnt(), ks = [];
  for (let k = 0; k < 60; k++) { const x = entX(k, off) + 210; if (off > k * TP.sp + 40 && x > 130 && x < 1440) ks.push(k); }
  const mx = Math.max(...ks.map(k => E.list[k].n)), hs = ks.map(k => 46 + 236 * E.list[k].n / mx);
  return (TB_ = { ks, hs, idx: Object.fromEntries(ks.map((k, j) => [k, j])) });
}
const tbGrow = (j, t) => ease(t, lt('tape', 5) + 0.7 + j * 0.2, 1.5);
function fTChalk(i, t, o) {
  const p = P[i];
  if (i < 300) {
    const H = BOARD.h - 30, f = ((p.r2 * H + t * (5 + p.r3 * 9)) % H) / H;
    o[0] = BOARD.x + 15 + p.r1 * (BOARD.w - 30) + 6 * Math.sin(t * 0.5 + p.r3 * TAU); o[1] = BOARD.y + 15 + f * H;
    o[2] = 0.8 + p.r4 * 0.9; o[3] = 0.2 * Math.sin(Math.PI * f) * twk(i, t, 3); o[4] = IVORY; return;
  }
  amb(i, t, o, 0.07);
}
function fTTape(i, t, o) {
  const p = P[i], off = tapeOff(t);
  if (i < 280) {                                   // sprocket dots along both edges of the paper, moving with it
    const row = i % 2, j = i >> 1, span = 1640, d = ((off + j * (span / 140)) % span + span) % span, x = TP.mouth - d;
    o[0] = x; o[1] = TP.y + (row ? 1 : -1) * (TP.hw + 7); o[2] = 1.2;
    o[3] = 0.55 * clamp((TP.mouth - 6 - x) / 40) * clamp((x + 20) / 80) * clamp((x - (TP.mouth - off)) / 30); o[4] = GOLD; return;
  }
  if (i < 360) {                                   // glints travelling over the glass dome
    const j = i - 280, th = Math.PI + (j + 0.5) / 80 * Math.PI, ph = ((t * 0.7) % 1.6) * Math.PI;
    const sw = Math.exp(-Math.pow(th - Math.PI - ph, 2) / 0.06);
    o[0] = DOME.x + Math.cos(th) * DOME.r; o[1] = DOME.y + Math.sin(th) * DOME.r; o[2] = 1.1 + sw * 1.2; o[3] = 0.22 + 0.6 * sw; o[4] = GOLDHI; return;
  }
  amb(i, t, o, 0.07);
}
function fTBars(i, t, o) {
  if (i >= 620) return fTTape(280 + (i - 620) % 80, t, o);
  const B = tapeBars(), L = barLayout('tape', B.hs, 620, 4)[i], x = entX(B.ks[L.b], tapeOff(t)) + 210, gr = tbGrow(L.b, t);
  o[0] = x + L.fx * 38; o[1] = TP.base - 4 - L.fy * (B.hs[L.b] - 6) * gr; o[2] = 1.7; o[3] = 0.88 * twk(i, t); o[4] = L.top ? GOLDHI : GOLD;
}

/* =====================================================================
   WYCKOFF — supply & demand on a beam, effort vs result, the Composite Man
   ===================================================================== */
function wyBeam(t) {
  const r = ease(t, lt('wyckoff', 2) + 0.2, 1.8, SWIFT), sw = 0.05 * Math.sin(t * 0.9) + 0.03 * Math.sin(t * 2.1);
  const ang = lerp(sw, -Math.PI / 2, r), cx = 960, cy = lerp(450, 525, r), half = lerp(300, 240, r);
  return { r, ang, cx, cy, half, L: [cx - Math.cos(ang) * half, cy - Math.sin(ang) * half], R: [cx + Math.cos(ang) * half, cy + Math.sin(ang) * half] };
}
function wyOrbit(i, t, o) {
  const p = P[i], th = p.r3 * TAU + t * 0.06 * (0.5 + p.r4), rx = 640 + p.r1 * 160, ry = 170 + p.r2 * 60;
  o[0] = 960 + Math.cos(th) * rx; o[1] = 520 + Math.sin(th) * ry; o[2] = 1 + p.r5; o[3] = 0.13 * twk(i, t); o[4] = GOLD;
}
function fWScale(i, t, o) {
  const p = P[i], B = wyBeam(t);
  if (i < 400) {                                   // two heaps: supply (left) and demand (right)
    const left = i < 200, e = left ? B.L : B.R, yv = Math.pow(p.r2, 0.8), hw = 62 * (1 - yv);
    o[0] = e[0] + (p.r1 * 2 - 1) * hw; o[1] = e[1] + 142 - yv * 56 + 1.5 * Math.sin(t * 2 + p.r3 * TAU);
    o[2] = 1.6; o[3] = 0.8 * twk(i, t); o[4] = left ? DOWN : UP; return;
  }
  wyOrbit(i, t, o);
}
function colBar(i, t, o, x, top, base, w, n, cols, a = 0.85) {
  const c = Math.min(cols, n), col = i % c, row = Math.floor(i / c), rows = Math.ceil(n / c);
  o[0] = x + (c > 1 ? col / (c - 1) - 0.5 : 0) * w; o[1] = base - (row + 0.5) / rows * (base - top); o[2] = 1.6; o[3] = a * twk(i, t); o[4] = row >= rows - 1 ? GOLDHI : GOLD;
}
function fWMeasure(i, t, o) {
  if (i >= 480) return wyOrbit(i, t, o);
  colBar(i, t, o, 960, 288, 762, 52, 480, 6);
}
function fWEffort(i, t, o) {
  if (i >= 480) return wyOrbit(i, t, o);
  colBar(i, t, o, 1360, 372, 770, 70, 480, 6, 0.9);
}
function fWResult(i, t, o) {
  if (i >= 480) return amb(i, t, o, 0.08);
  colBar(i, t, o, 380, 470, 770, 52, 480, 5, 0.5);
}
const WC = [55, 62, 50, 72, 66, 80, 74, 92, 86, 104, 98, 112, 300, 124, 96, 84, 72, 64];
const wcX = j => 500 + j * 54, WC_BASE = 770, WC_GIANT = 12;
const WCK = (() => { const R = rng(1910), out = []; let pc = 100;
  for (let j = 0; j < 18; j++) {
    let c = j < WC_GIANT ? 100 + (j + 1) * 3.1 + (R() - 0.5) * 2.5 : j === WC_GIANT ? pc : [136, 133.5, 131, 127.5, 126.5][j - 13];
    const hi = j === WC_GIANT ? 149 : Math.max(pc, c) + 0.6 + R() * 1.6, lo = j === WC_GIANT ? 135.2 : Math.min(pc, c) - 0.6 - R() * 1.6;
    out.push({ o: pc, c: j === WC_GIANT ? pc + 0.15 : c, hi, lo }); pc = c;
  }
  return out; })();
const wcY = v => 455 - (v - 98) * 4.4;
const wcGrow = (j, t) => j === WC_GIANT ? ease(t, lt('wyckoff', 5) + 1.3, 1.8) : ease(t, lt('wyckoff', 5) - 0.1 + j * 0.06, 1.2);
function fWClimax(i, t, o) {
  if (i >= 620) return amb(i, t, o, 0.08, 140, 270, 1780, 560);
  const L = barLayout('wc', WC, 620, 3)[i], gr = wcGrow(L.b, t);
  o[0] = wcX(L.b) + L.fx * 20; o[1] = WC_BASE - 3 - L.fy * (WC[L.b] - 4) * gr; o[2] = L.b === WC_GIANT ? 1.9 : 1.6;
  o[3] = (L.b === WC_GIANT ? 0.95 : 0.7) * twk(i, t); o[4] = L.b === WC_GIANT || L.top ? GOLDHI : GOLD;
}
let FOOT_ = null;
function footLayout(n) {                           // a footprint, sampled on vertical columns so it reads as volume bars
  if (FOOT_) return FOOT_;
  const x0 = 500, Lf = 720, cy = 692, segs = [];
  const hw = u => u < 0.22 ? 55 * Math.sqrt(Math.max(0, 1 - Math.pow((0.22 - u) / 0.22, 2))) : u < 0.5 ? lerp(55, 40, (u - 0.22) / 0.28)
    : u < 0.8 ? lerp(40, 68, Math.sin((u - 0.5) / 0.3 * Math.PI / 2)) : 68 * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.8) / 0.2, 2)));
  const top = u => cy - hw(u) + 34 * Math.exp(-Math.pow((u - 0.47) / 0.11, 2)), bot = u => cy + hw(u);   // the arch bites into the inner edge
  const toes = [[1256, 622, 26], [1283, 668, 19], [1292, 704, 16], [1287, 738, 14], [1272, 766, 12]];
  for (let x = x0 + 6; x < 1310; x += 12) {
    const u = (x - x0) / Lf;
    if (u <= 1 && hw(u) > 2) segs.push([x, top(u), bot(u)]);
    for (const [tx, ty, tr] of toes) { const d = Math.abs(x - tx); if (d < tr) { const hh = Math.sqrt(tr * tr - d * d); segs.push([x, ty - hh, ty + hh]); } }
  }
  const tot = segs.reduce((s, q) => s + q[2] - q[1], 0), out = []; let si = 0, acc = 0;
  for (let j = 0; j < n; j++) {
    const target = (j + 0.5) / n * tot;
    while (si < segs.length - 1 && acc + segs[si][2] - segs[si][1] < target) { acc += segs[si][2] - segs[si][1]; si++; }
    out.push([segs[si][0], segs[si][1] + (target - acc)]);
  }
  return (FOOT_ = out);
}
function fWFoot(i, t, o) {
  if (i >= 560) return amb(i, t, o, 0.08, 140, 270, 1780, 560);
  const [x, y] = footLayout(560)[i], st = ease(t, lt('wyckoff', 6) + 0.4 + (x - 500) / 810 * 1.8, 0.9);
  o[0] = x; o[1] = y - (1 - st) * 26; o[2] = 1.5 + 0.3 * st; o[3] = (0.12 + 0.7 * st) * twk(i, t); o[4] = st > 0.6 ? GOLDHI : GOLD;
}
const WCP = [[400, 320], [450, 430], [505, 540], [560, 452], [612, 520], [668, 408], [728, 530], [790, 440], [850, 534], [910, 410], [968, 505], [1028, 462], [1076, 532], [1104, 594], [1146, 520], [1190, 468], [1232, 502], [1300, 420], [1380, 360], [1450, 330], [1540, 276]];

/* =====================================================================
   OBV — signed volume, summed day by day
   ===================================================================== */
const OBVD = (() => { const R = rng(1963), out = []; let pc = 20, ob = 0;
  for (let d = 0; d < 30; d++) {
    const c = pc + (R() - 0.4) * 1.6, up = c >= pc, v = 0.45 + R() * 0.8 + (up ? 0.25 : 0); ob += up ? v : -v;
    out.push({ o: pc, c, hi: Math.max(pc, c) + R() * 0.5, lo: Math.min(pc, c) - R() * 0.5, up, v, ob }); pc = c;
  }
  return out; })();
const OBR = (() => { let lo = 1e9, hi = -1e9, ob = 0; for (const d of OBVD) { lo = Math.min(lo, d.lo); hi = Math.max(hi, d.hi); ob = Math.max(ob, Math.abs(d.ob)); } return { lo, hi, ob }; })();
const odX = d => 420 + d * 37, odY = v => 545 - (v - OBR.lo) / (OBR.hi - OBR.lo) * 130;
const ofX = d => 1048 + d * 24, OF_ZERO = 556, ofObY = ob => OF_ZERO - ob / OBR.ob * 250;
const ofFlip = (d, t) => ease(t, lt('obv', 1) + 0.5 + d * 0.12, 0.5);
function fODays(i, t, o) {
  if (i >= 600) return amb(i, t, o, 0.07);
  const L = barLayout('obv', OBVD.map(d => d.v), 600, 2)[i], D = OBVD[L.b], gr = ease(t, WIN.obv[0] + 1.6 + L.b * 0.05, 1.0);
  o[0] = odX(L.b) + L.fx * 10; o[1] = 770 - 3 - L.fy * (D.v * 95 - 4) * gr; o[2] = 1.6; o[3] = 0.75 * twk(i, t); o[4] = D.up ? UP : DOWN;
}
function fOFlip(i, t, o) {
  if (i >= 600) return amb(i, t, o, 0.07, 980, 270, 1780, 770);
  const L = barLayout('obv', OBVD.map(d => d.v), 600, 2)[i], D = OBVD[L.b], f = ofFlip(L.b, t), s = lerp(1, D.up ? 1 : -1, f);
  o[0] = ofX(L.b) + L.fx * 7; o[1] = OF_ZERO - s * (3 + L.fy * (D.v * 80 - 4)); o[2] = 1.5; o[3] = 0.8 * twk(i, t); o[4] = f > 0.5 ? (D.up ? UP : DOWN) : GOLD;
}
const trF = s => 0.55 * Math.sin(s * 7.2 - 1.3) + 0.9 * s;
const trX = s => 380 + s * 1140, trObY = s => 480 - 120 * trF(s), trPrY = s => 700 - 120 * trF(s - 0.1), TR_LAG = 0.06;
const trHead = t => lerp(0.08, 1, ease(t, lt('obv', 2) - 0.3, le('obv', 2) - lt('obv', 2) + 0.3, SOFT));
function fOTrain(i, t, o) {
  const p = P[i], h = trHead(t);
  if (i < 320) { const s = h - (i / 320) * 0.45; o[0] = trX(s); o[1] = trObY(s) + (p.r1 - 0.5) * 6; o[2] = 1.4 + (1 - i / 320) * 1.2; o[3] = (s < 0 ? 0 : 0.95 * Math.pow(1 - i / 320, 0.7)); o[4] = i < 40 ? GOLDHI : GOLD; return; }
  if (i < 520) { const j = i - 320, s = h - TR_LAG - (j / 200) * 0.45; o[0] = trX(s); o[1] = trPrY(s) + (p.r1 - 0.5) * 4; o[2] = 1.3; o[3] = (s < 0 ? 0 : 0.6 * (1 - j / 200)); o[4] = IVORY; return; }
  amb(i, t, o, 0.07);
}
const DAM = { x0: 432, x1: 1286, wx: 1300, ww: 26, top: 330, base: 770 };
const damLevel = t => lerp(745, 398, ease(t, lt('obv', 3) + 0.3, le('obv', 3) - lt('obv', 3) + 0.2, SOFT));
const damBreak = () => lt('obv', 4) + 0.5;
function damPt(i, t, o) {
  const p = P[i], c = i % 40, r = Math.floor(i / 40), Lv = damLevel(t), x = DAM.x0 + c * (DAM.x1 - DAM.x0) / 39 + (p.r1 - 0.5) * 6;
  const sy = Lv + 5 * Math.sin(x * 0.02 + t * 2.2) + 3 * Math.sin(x * 0.047 - t * 3.1);
  o[0] = x; o[1] = lerp(sy, DAM.base - 4, r / 13) + (r ? (p.r2 - 0.5) * 6 : 0); o[2] = r === 0 ? 1.8 : 1.4; o[3] = (r === 0 ? 0.9 : 0.4) * twk(i, t); o[4] = r === 0 ? GOLDHI : GOLD;
}
function fODam(i, t, o) { if (i < 560) return damPt(i, t, o); amb(i, t, o, 0.07, 140, 270, 1780, 560); }
function fOBurst(i, t, o) {
  if (i >= 560) return amb(i, t, o, 0.07, 140, 270, 1780, 560);
  const p = P[i], c = i % 40, r = Math.floor(i / 40);
  const launch = damBreak() + (1 - c / 39) * 1.7 + r * 0.03 + p.r2 * 0.25, dt = t - launch;
  damPt(i, t, o); if (dt <= 0) return;
  const B = [DAM.wx + 24, 560 + (p.r3 - 0.5) * 90];
  if (dt < 0.3) { const u = SOFT(dt / 0.3); o[0] = lerp(o[0], B[0], u); o[1] = lerp(o[1], B[1], u); o[4] = GOLDHI; o[3] = 0.85; return; }
  const T = (dt - 0.3) % 1.7, vx = 140 + p.r4 * 300, vy = 300 + p.r5 * 150;
  o[0] = B[0] + vx * T; o[1] = B[1] - vy * T + 150 * T * T; o[2] = 1.5 + p.r1; o[3] = 0.9 * Math.pow(1 - T / 1.7, 1.3) * clamp(T * 12 + (dt < 2 ? 1 : 0)); o[4] = p.r6 < 0.35 ? UP : GOLDHI;
}

/* =====================================================================
   GME — the crowd, the short, the squeeze
   ===================================================================== */
const HB = [[1270, 510, 120, 260], [1410, 400, 160, 370], [1590, 550, 120, 220]];      // hedge-fund blocks x, y, w, h (floor 770)
const GMEP = [16.6, 16.1, 15.8, 16.6, 16.9, 16.4, 13.7, 13.9, 14.0, 14.8, 14.3, 15.6, 15.5, 16.1, 20.2, 19.9, 21.2, 20.5, 20.2, 20.9, 19.4,
  17.25, 17.37, 18.36, 18.08, 17.69, 19.94, 19.95, 31.4, 39.91, 35.5, 39.36, 39.12, 43.03, 65.01, 76.79, 147.98, 347.51, 193.6, 325.0,
  225.0, 90.0, 92.4, 53.5, 63.8, 60.0, 50.3, 51.2];
const GMEV = [9, 8, 6, 8, 7, 7, 28, 14, 10, 12, 9, 15, 11, 13, 41, 22, 25, 16, 12, 14, 10,
  10, 5, 6, 6, 6, 7, 8, 144, 93, 46, 74, 33, 57, 197, 177, 178, 93, 58, 50,
  37, 79, 42, 62, 81, 25, 9, 13];
const GM_SPIKE = 38, GM_SURGE = 28;
const gmX = d => 380 + d * 25, gmY = p => 600 - p * 0.62, GM_BASE = 775;
const gmT = d => lt('gme', 3) + 0.3 + d * 0.07;
function gCrowdPt(i, t, o) {
  const p = P[i];
  const rr = Math.sqrt(p.r1), th = p.r2 * TAU, bx = 500 + Math.cos(th) * rr * 290, by = 560 + Math.sin(th) * rr * 215;
  o[0] = bx + 6 * Math.sin(t * 1.7 + p.r3 * TAU) + 12 * Math.max(0, Math.sin(t * 2.2 - bx * 0.012)); o[1] = by + 5 * Math.sin(t * 2.1 + p.r4 * TAU);
  o[2] = 1.1 + p.r5 * 0.9; o[3] = (0.35 + 0.4 * p.r6) * twk(i, t, 3); o[4] = p.r6 < 0.18 ? UP : p.r6 < 0.6 ? IVORY : GOLDHI;
}
function gBlockPt(i, t, o) {
  const p = P[i], b = i % 3, [x, y, w, h] = HB[b];
  o[0] = x + 6 + p.r1 * (w - 12); o[1] = y + 6 + p.r2 * (h - 12); o[2] = 1.3 + p.r3; o[3] = 0.4 * twk(i, t, 1.3); o[4] = GOLD;
}
function fGCrowd(i, t, o) { if (i < 600) return gCrowdPt(i, t, o); gBlockPt(i, t, o); }
function fGLock(i, t, o) {
  if (i >= 600) return gBlockPt(i, t, o);
  if (i >= 576) return gCrowdPt(i, t, o);
  const c = i % 24, r = Math.floor(i / 24);
  o[0] = 400 + c * 12 + 0.6 * Math.sin(t * 9 + i); o[1] = 470 + r * 12; o[2] = 1.5; o[3] = 0.8 * twk(i, t, 4); o[4] = (c + r) % 7 === 0 ? UP : GOLDHI;
}
function fGChart(i, t, o) {
  if (i >= 640) return amb(i, t, o, 0.07, 140, 270, 1780, 560);
  const L = barLayout('gme', GMEV, 640, 2)[i], gr = ease(t, gmT(L.b), 0.7);
  o[0] = gmX(L.b) + L.fx * 8; o[1] = GM_BASE - 2 - L.fy * (GMEV[L.b] / 197 * 190) * gr; o[2] = 1.5; o[3] = 0.85 * twk(i, t); o[4] = L.b >= GM_SURGE ? GOLDHI : GOLD;
}
const BKY = r => 345 + r * 41, BKL = r => 200 + 220 * (0.35 + 0.65 * hash01(r + 300));
function fGBook(i, t, o) {
  const p = P[i];
  if (i < 600) {                                   // bids: crowded rows
    const r = Math.floor(i / 60), j = i % 60, col = j % 20, ln = Math.floor(j / 20), fill = ease(t, lt('gme', 4) + 0.2 + r * 0.08, 1.0);
    o[0] = 900 - (col + 0.5) / 20 * BKL(r) * fill; o[1] = BKY(r) + (ln - 1) * 8 + 0.8 * Math.sin(t * 5 + i); o[2] = 1.5; o[3] = 0.8 * twk(i, t, 4); o[4] = UP; return;
  }
  if (i < 604) { const r = [2, 2, 7, 8][i - 600]; o[0] = 1032 + (i % 2) * 10; o[1] = BKY(r); o[2] = 1.3; o[3] = 0.55; o[4] = DOWN; return; }
  amb(i, t, o, 0.06);
}
function fGFall(i, t, o) {
  if (i < 600) return gCrowdPt(i, t, o);
  const p = P[i], b = i % 3, [x, y, w, h] = HB[b], tf = lt('gme', 5) + 1.6 + b * 0.35 + p.r4 * 0.5, dt = Math.max(0, t - tf);
  gBlockPt(i, t, o);
  o[0] += (p.r5 - 0.5) * 120 * dt; o[1] += 450 * dt * dt; o[3] *= clamp((785 - o[1]) / 40) * (dt > 0 ? 1.8 : 1); if (dt > 0) o[4] = GOLDHI;
}

/* =====================================================================
   SCHEDULE
   ===================================================================== */
Object.assign(FILM_FORM, {
  oBars: fOBars, oRoad: fORoad, tChalk: fTChalk, tTape: fTTape, tBars: fTBars,
  wScale: fWScale, wMeasure: fWMeasure, wEffort: fWEffort, wResult: fWResult, wClimax: fWClimax, wFoot: fWFoot,
  oDays: fODays, oFlip: fOFlip, oTrain: fOTrain, oDam: fODam, oBurst: fOBurst,
  gCrowd: fGCrowd, gLock: fGLock, gChart: fGChart, gBook: fGBook, gFall: fGFall,
});
function FILM_SCHED() {
  return [
    [lt('open', 1) - 0.6, 'oBars'], [lt('open', 2) - 0.4, 'oRoad'], [WIN.title[0] - 0.4, 'lattice'],
    [WIN.tape[0] - 0.2, 'tChalk'], [lt('tape', 1) - 0.3, 'tTape'], [lt('tape', 5) + 0.3, 'tBars'],
    [WIN.wyckoff[0] - 0.2, 'wScale'], [lt('wyckoff', 2) + 0.1, 'wMeasure'], [lt('wyckoff', 3) - 0.4, 'wEffort'], [le('wyckoff', 3) + 0.05, 'wResult'],
    [lt('wyckoff', 5) - 0.4, 'wClimax'], [lt('wyckoff', 6) - 0.4, 'wFoot'],
    [WIN.obv[0] - 0.2, 'oDays'], [lt('obv', 1) - 0.4, 'oFlip'], [lt('obv', 2) - 0.4, 'oTrain'], [lt('obv', 3) - 0.4, 'oDam'], [lt('obv', 4) - 0.2, 'oBurst'],
    [WIN.gme[0] - 0.2, 'gCrowd'], [lt('gme', 2) - 0.4, 'gLock'], [lt('gme', 3) - 0.4, 'gChart'], [lt('gme', 4) - 0.4, 'gBook'], [lt('gme', 5) - 0.4, 'gFall'],
  ];
}

/* =====================================================================
   LINE-ART
   ===================================================================== */
function tapeText(g, t, a, off, hl) {             // the printed entries (clipped at the machine's mouth by the caller)
  const E = tapeEnt(), B = tapeBars(), k1 = Math.floor((off - 40) / TP.sp), sc = mixHex(C.ivory, C.goldHi, hl);
  for (let k = Math.max(0, k1 - 8); k <= k1; k++) {
    const e = E.list[k], x = entX(k, off); if (x < -320) continue;
    text(g, e.s, x, TP.y, { font: 'latin', size: 23, weight: 500, color: C.ivory, a: a * 0.7, align: 'left', track: 0.1 });
    text(g, e.p.toFixed(2), x + 72, TP.y, { font: 'latin', size: 23, color: C.ivory, a: a * 0.9, align: 'left', track: 0.06 });
    const j = B.idx[k], gr = j === undefined ? 0 : tbGrow(j, t), dy = gr ? gr * (B.hs[j] + 28) : 0;
    const sz = e.rally ? 23 + Math.min(7, e.n / 2500) : 23;
    text(g, fmtN(e.n), x + 172, TP.y - dy, { font: 'latin', size: sz, weight: 500, color: gr > 0 ? C.goldHi : sc, a: a * (0.75 + 0.25 * hl), align: 'left', track: 0.06 });
  }
}
function artTape(g, t) {
  const a = secA(t, 'tape');
  if (a <= 0) return;
  // line 0: a chalkboard of quotes, rewritten every 0.4 s
  const ba = a * life(t, WIN.tape[0] + 1.2, le('tape', 0) + 0.5, 1.0, 0.9);
  if (ba > 0.01) {
    const dr = ease(t, WIN.tape[0] + 1.3, 1.6, SOFT);
    goldStroke(g, rectPts(BOARD.x, BOARD.y, BOARD.w, BOARD.h), dr, { w: 1.4, a: ba * 0.7, color: C.ivory, glow: 0.15, close: true });
    goldStroke(g, rectPts(BOARD.x + 12, BOARD.y + 12, BOARD.w - 24, BOARD.h - 24), dr, { w: 0.8, a: ba * 0.3, color: C.ivory, glow: 0, close: true });
    let newest = null;
    for (let c = 0; c < 10; c++) {
      const col = c % 2, row = c >> 1, x0 = BOARD.x + 70 + col * 400, y = BOARD.y + 72 + row * 64, ca = ba * ease(t, WIN.tape[0] + 1.6 + c * 0.05, 0.6);
      const { v, last } = chalkCell(c, t), u = clamp((t - last) / 0.3), age = t - last;
      text(g, CHALK[c][0], x0, y, { font: 'latin', size: 26, color: C.ivory, a: ca * 0.5, align: 'left', track: 0.14 });
      if (age < 1.4) { g.globalAlpha = ca * 0.07 * (1 - age / 1.4); g.fillStyle = C.ivory; g.fillRect(x0 + 140, y - 22, 180, 44); g.globalAlpha = 1; }
      text(g, frac8(v), x0 + 310, y, { font: 'latin', size: 32, color: C.ivory, a: ca * (0.3 + 0.6 * u), align: 'right', track: 0.06 });
      if (age < 0.4 && (!newest || last > newest[2])) newest = [x0 + 300, y + 14, last];
    }
    if (newest) glowDot(g, newest[0], newest[1], 2.2, ba * (1 - (t - newest[2]) / 0.4));
    text(g, '交易所 · 粉笔报价', 960, 268, { size: 22, color: C.ivory, a: ba * 0.7, track: 0.3 });
  }
  // lines 1–5: the ticker and its paper ribbon
  const ma = a * ease(t, lt('tape', 1) - 0.3, 1.2, SOFT);
  if (ma <= 0.01) return;
  const off = tapeOff(t), dr = ease(t, lt('tape', 1) - 0.3, 1.6, SOFT), dim = 1 - 0.4 * ease(t, lt('tape', 5), 1.0, SOFT);
  const D = DOME;
  goldStroke(g, arcPts(D.x, D.y, D.r, Math.PI, TAU, 48), dr, { w: 1.4, a: ma * dim, glow: 0.4, color: C.goldHi });
  goldStroke(g, rectPts(D.x - 120, D.y, 240, 46), dr, { w: 1.4, a: ma * dim, glow: 0.2, close: true });
  goldStroke(g, [[D.x - 100, D.y + 46], [D.x - 110, D.y + 70]], dr, { w: 1.2, a: ma * dim * 0.7, glow: 0 });
  goldStroke(g, [[D.x + 100, D.y + 46], [D.x + 110, D.y + 70]], dr, { w: 1.2, a: ma * dim * 0.7, glow: 0 });
  const wr = off * 0.02;                           // the type wheel turns with the paper
  goldStroke(g, arcPts(D.x, D.y - 38, 26, 0, TAU, 32), dr, { w: 1.2, a: ma * dim * 0.8, glow: 0.2 });
  for (let k = 0; k < 6; k++) { const an = wr + k * Math.PI / 3; goldStroke(g, [[D.x, D.y - 38], [D.x + Math.cos(an) * 26, D.y - 38 + Math.sin(an) * 26]], 1, { w: 1, a: ma * dim * 0.6 * dr, glow: 0 }); }
  const la = ma * lerp(1, 0.45, ease(t, lt('tape', 2), 1.0, SOFT));
  text(g, '1867', D.x, D.y + 108, { font: 'latin', size: 44, weight: 500, color: C.goldHi, a: la * ease(t, lt('tape', 1) + 0.4, 0.8), track: 0.1 });
  text(g, 'STOCK TICKER', D.x, D.y + 148, { font: 'latin', size: 18, color: C.gold, a: la * 0.8 * ease(t, lt('tape', 1) + 0.7, 0.8), track: 0.4 });
  // the paper
  const left = Math.max(-30, TP.mouth - off);
  if (off > 1) {
    g.globalAlpha = ma * 0.07; g.fillStyle = C.paper; g.fillRect(left, TP.y - TP.hw, TP.mouth - left, TP.hw * 2); g.globalAlpha = 1;
    goldStroke(g, [[left, TP.y - TP.hw], [TP.mouth, TP.y - TP.hw]], 1, { w: 1, a: ma * 0.6, glow: 0.2 });
    goldStroke(g, [[left, TP.y + TP.hw], [TP.mouth, TP.y + TP.hw]], 1, { w: 1, a: ma * 0.6, glow: 0.2 });
  }
  // speed streaks while the tape races
  const sp = clamp((tapeV(t) - 90) / 200) * ease(t, lt('tape', 4), 1.0, SOFT);
  if (sp > 0.01) for (let k = 0; k < 9; k++) {
    const y = TP.y + (k % 2 ? 1 : -1) * (44 + (k * 7) % 22), len = 60 + 80 * hash01(k + 9), x = TP.mouth - 40 - (((t * (700 + 200 * hash01(k))) + k * 210) % 1500);
    goldStroke(g, [[x, y], [x + len, y]], 1, { w: 1, a: ma * sp * 0.35, glow: 0, color: C.ivory });
  }
  const hl = ease(t, lt('tape', 2) + 0.3, 1.0, SOFT);
  g.save(); g.beginPath(); g.rect(-40, 0, TP.mouth + 40, H); g.clip();
  tapeText(g, t, ma, off, hl);
  g.restore();
  // line 2: what the tape prints
  const k2 = lon('tape', 2, 0.8, 0.8, -0.4, 0.3)(t) * a;
  if (k2 > 0.01) {
    const kL = Math.round((tapeOff(lt('tape', 2) + 1.0) - 40 - (TP.mouth - 1000)) / TP.sp), x = entX(kL, off);
    for (const [dx, s, up, col, wt] of [[24, '代码', 0, C.ivory, 400], [108, '价格', 0, C.ivory, 400], [205, '成交股数', 1, C.goldHi, 700]]) {
      const y0 = up ? TP.y - TP.hw - 6 : TP.y + TP.hw + 6, y1 = up ? y0 - 26 : y0 + 26;
      goldStroke(g, [[x + dx, y0], [x + dx, y1]], k2, { w: 1, a: k2 * 0.7, glow: 0, color: col });
      text(g, s, x + dx, up ? y1 - 22 : y1 + 22, { size: up ? 28 : 22, weight: wt, color: col, a: k2 * (up ? 1 : 0.7), track: 0.2 });
    }
  }
  // line 3: a reading glass over the tape
  const k3 = lon('tape', 3, 0.8, 0.8, 0.0, 0.3)(t) * a;
  if (k3 > 0.01) {
    const lx = 840 + 10 * Math.sin(t * 0.8), ly = TP.y, R = 80;
    g.save(); g.beginPath(); g.arc(lx, ly, R, 0, TAU); g.clip();
    g.globalAlpha = k3 * 0.9; g.fillStyle = '#000'; g.fillRect(lx - R, ly - R, 2 * R, 2 * R); g.globalAlpha = 1;
    g.translate(lx, ly); g.scale(1.6, 1.6); g.translate(-lx, -ly);
    g.globalAlpha = k3 * 0.1; g.fillStyle = C.paper; g.fillRect(lx - R, TP.y - TP.hw, 2 * R, TP.hw * 2); g.globalAlpha = 1;
    tapeText(g, t, k3, off, hl);
    g.restore();
    goldStroke(g, arcPts(lx, ly, R, 0, TAU, 60), k3, { w: 2.2, a: k3, glow: 0.6, color: C.goldHi });
    goldStroke(g, [[lx + R * 0.72, ly + R * 0.72], [lx + R * 1.5, ly + R * 1.5]], k3, { w: 5, a: k3 * 0.9, glow: 0.3, color: C.gold });
    text(g, '利弗莫尔 · 盯盘', lx, ly - R - 34, { size: 28, weight: 600, color: C.goldHi, a: k3 * ease(t, lt('tape', 3) + 0.5, 0.8), track: 0.24 });
  }
  // line 4: the rally — the price trace climbs off the tape, the counts swell
  const k4 = lon('tape', 4, 0.8, 0.8, 0.0, 0.5)(t) * a;
  if (k4 > 0.01) {
    const E = tapeEnt(), pts = [];
    for (let k = E.kA; k < 60; k++) { if (off < k * TP.sp + 40 + 120) break; const x = entX(k, off) + 110; if (x < -40) continue; pts.unshift([x, 530 - (E.list[k].p - E.list[E.kA].p) * 30]); }
    if (pts.length > 1) goldStroke(g, pts, 1, { w: 2, a: k4, glow: 0.5, color: UPC });
    for (const [x, y] of pts) { glowDot(g, x, y, 2.2, k4 * 0.9); goldStroke(g, [[x, y + 8], [x, TP.y - TP.hw - 4]], 1, { w: 0.8, a: k4 * 0.25, glow: 0, color: C.ivory }); }
    const ck = ease(t, lt('tape', 4) + 3.0, 0.7, SOFT) * k4;
    checkMark(g, 1170, 318, 40, ck, k4);
    text(g, '安全', 1214, 318, { size: 30, weight: 700, color: C.goldHi, a: ck, align: 'left', track: 0.3 });
  }
  // line 5: the counts lift off the tape and become bars
  const k5 = life(t, lt('tape', 5) + 0.3, WIN.tape[1] - 0.2, 0.8, 0.9) * a;
  if (k5 > 0.01) {
    const B = tapeBars();
    B.ks.forEach((k, j) => { const gr = tbGrow(j, t); barBox(g, entX(k, off) + 210, TP.base, 48, B.hs[j] * gr, k5 * clamp(gr * 3), C.gold, 0.12); });
    text(g, '成交量柱的诞生', 300, 330, { size: 30, weight: 600, color: C.goldHi, a: k5 * ease(t, lt('tape', 5) + 1.6, 1.0), align: 'left', track: 0.24 });
    text(g, 'THE FIRST VOLUME BARS', 300, 372, { font: 'latin', size: 18, color: C.gold, a: k5 * 0.8 * ease(t, lt('tape', 5) + 1.9, 1.0), align: 'left', track: 0.4 });
  }
}

function artWyckoff(g, t) {
  const a = secA(t, 'wyckoff');
  if (a <= 0) return;
  // lines 0–2: supply and demand on a beam; the beam stands up and becomes a bar
  const sa = a * (1 - ease(t, lt('wyckoff', 3) - 0.6, 0.8, SOFT));
  if (sa > 0.01) {
    const B = wyBeam(t), dr = ease(t, WIN.wyckoff[0] + 1.4, 1.4, SOFT), pan = sa * (1 - ease(t, lt('wyckoff', 2) + 0.1, 0.9, SOFT));
    goldStroke(g, [[B.cx - 70, 770], [960, 450], [B.cx + 70, 770]], dr, { w: 1.5, a: pan, glow: 0.3 });
    goldStroke(g, [[B.cx - 110, 770], [B.cx + 110, 770]], dr, { w: 1.2, a: pan * 0.7, glow: 0 });
    // the beam as a thin bar that thickens as it turns
    const bw = lerp(4, 28, B.r), nx = -Math.sin(B.ang) * bw, ny = Math.cos(B.ang) * bw;
    goldStroke(g, [[B.L[0] + nx, B.L[1] + ny], [B.R[0] + nx, B.R[1] + ny], [B.R[0] - nx, B.R[1] - ny], [B.L[0] - nx, B.L[1] - ny]], dr, { w: 1.6, a: sa * (1 - 0.5 * B.r), glow: 0.5, close: true, color: C.goldHi });
    glowDot(g, 960, B.cy, 3.5, pan);
    for (const [e, s, sub, col] of [[B.L, '供', 'SUPPLY', DNC], [B.R, '求', 'DEMAND', UPC]]) {
      if (pan <= 0.01) break;
      const q = [e[0], e[1] + 112];
      goldStroke(g, [e, [q[0] - 80, q[1] - 6]], dr, { w: 0.9, a: pan * 0.6, glow: 0 }); goldStroke(g, [e, [q[0] + 80, q[1] - 6]], dr, { w: 0.9, a: pan * 0.6, glow: 0 });
      goldStroke(g, arcPts(q[0], q[1] - 30, 84, 0.35, Math.PI - 0.35, 24), dr, { w: 1.6, a: pan, glow: 0.25 });
      text(g, s, q[0], q[1] + 86, { size: 40, weight: 700, color: col, a: pan * ease(t, WIN.wyckoff[0] + 2.0, 0.8), track: 0.3 });
      text(g, sub, q[0], q[1] + 124, { font: 'latin', size: 18, color: C.gold, a: pan * 0.75, track: 0.4 });
    }
    const mk = lon('wyckoff', 1, 0.8, 0.8, 0.0, 0.3)(t) * pan;
    text(g, '价格 = 供求', 960, 300, { size: 28, weight: 600, color: C.goldHi, a: mk, track: 0.24 });
    // the measure: ruler ticks along the standing bar
    const mr = life(t, lt('wyckoff', 2) + 1.2, lt('wyckoff', 3) - 0.3, 0.9, 0.6) * a;
    if (mr > 0.01) {
      for (let k = 0; k <= 12; k++) { const y = 762 - k * 39.5, q = mr * ease(t, lt('wyckoff', 2) + 1.2 + k * 0.05, 0.4); goldStroke(g, [[1000, y], [1000 + (k % 3 === 0 ? 26 : 13), y]], 1, { w: 1, a: q * 0.8, glow: 0 }); }
      text(g, '度量衡', 1050, 500, { size: 40, weight: 700, color: C.goldHi, a: mr, align: 'left', track: 0.3 });
      text(g, 'THE MEASURE', 1052, 548, { font: 'latin', size: 18, color: C.gold, a: mr * 0.8, align: 'left', track: 0.4 });
    }
  }
  // line 3 (text on the left): effort on the right
  const ef = lon('wyckoff', 3, 0.8, 0.5, 0.0, 0.0)(t) * a;
  if (ef > 0.01) {
    barBox(g, 1360, 770, 92, 398 * ease(t, lt('wyckoff', 3) + 0.3, 1.0), ef, C.gold, 0.1);
    text(g, '努力 · 成交量', 1360, 300, { size: 32, weight: 700, color: C.goldHi, a: ef, track: 0.24 });
    text(g, 'EFFORT', 1360, 338, { font: 'latin', size: 18, color: C.gold, a: ef * 0.8, track: 0.5 });
  }
  // line 4 (text on the right): result on the left
  const rs = lon('wyckoff', 4, 0.8, 0.8, 0.0, 0.3)(t) * a;
  if (rs > 0.01) {
    barBox(g, 380, 770, 70, 300, rs * 0.6, C.gold, 0.08);
    text(g, '努力', 380, 444, { size: 24, color: C.ivory, a: rs * 0.7, track: 0.3 });
    const pr = ease(t, lt('wyckoff', 4) + 0.3, 1.2, SOFT);
    arrow(g, 560, 720, 800, 420, pr, { w: 3, a: rs, color: UPC, glow: 0.6, s: 22 });
    goldStroke(g, [[540, 720], [820, 720]], rs, { w: 1, a: rs * 0.5, glow: 0, color: C.ivory });
    text(g, '结果 · 涨跌', 640, 330, { size: 32, weight: 700, color: C.goldHi, a: rs * ease(t, lt('wyckoff', 4) + 0.5, 0.8), track: 0.24 });
    text(g, 'RESULT', 640, 368, { font: 'latin', size: 18, color: C.gold, a: rs * 0.8, track: 0.5 });
  }
  // line 5: climactic volume, no progress — distribution
  const cl = lon('wyckoff', 5, 0.8, 0.8, 0.2, 0.3)(t) * a;
  if (cl > 0.01) {
    WC.forEach((h, j) => barBox(g, wcX(j), WC_BASE, 26, h * wcGrow(j, t), cl * (j === WC_GIANT ? 1 : 0.5), j === WC_GIANT ? C.goldHi : C.gold, j === WC_GIANT ? 0.14 : 0.06));
    goldStroke(g, [[470, WC_BASE + 1], [1450, WC_BASE + 1]], cl, { w: 1, a: cl * 0.6, glow: 0 });
    WCK.forEach((k, j) => { const gr = ease(t, lt('wyckoff', 5) - 0.1 + j * 0.06, 0.6); if (gr > 0) drawCandle(g, wcX(j), wcY, k, 18, cl * clamp(gr * 2), { grow: gr, mono: 0.25, glow: j === WC_GIANT ? 0.6 * ease(t, lt('wyckoff', 5) + 2.2, 0.8) : 0 }); });
    const gx = wcX(WC_GIANT), ds = cl * ease(t, lt('wyckoff', 5) + 2.4, 0.8);
    if (ds > 0.01) {
      for (const an of [-2.55, -2.05, -1.1, -0.6]) {
        const u = ((t * 0.7 + an) % 1 + 1) % 1, r0 = 34 + u * 24, x0 = gx + Math.cos(an) * r0, y0 = wcY(149) + 10 + Math.sin(an) * r0;
        arrow(g, x0, y0, x0 + Math.cos(an) * 58, y0 + Math.sin(an) * 58, 1, { w: 1.6, a: ds * (1 - u * 0.6), color: DNC, glow: 0.3, s: 10 });
      }
      goldStroke(g, [[gx + 22, WC_BASE - 300 + 20], [gx + 70, 540], [gx + 80, 540]], ds, { w: 1, a: ds * 0.7, glow: 0, color: C.goldHi });
      text(g, '天量滞涨 · 出货', gx + 92, 540, { size: 30, weight: 700, color: C.goldHi, a: ds, align: 'left', track: 0.2 });
    }
  }
  // line 6: the Composite Man — accumulation range, spring, markup, and his footprint in the volume
  const cm = life(t, lt('wyckoff', 6) - 0.2, WIN.wyckoff[1] - 0.3, 1.0, 0.9) * a;
  if (cm > 0.01) {
    g.save(); g.setLineDash([6, 8]);
    for (const y of [405, 540]) goldStroke(g, [[480, y], [1200, y]], ease(t, lt('wyckoff', 6) + 0.2, 1.2, SWIFT), { w: 1.1, a: cm * 0.6, glow: 0, color: C.ivory });
    g.restore();
    const pr = ease(t, lt('wyckoff', 6) + 0.4, (le('wyckoff', 6) - lt('wyckoff', 6)) * 0.75, SOFT), pts = [], L = polyLen(WCP);
    const head = goldStroke(g, WCP, pr, { w: 2, a: cm, glow: 0.5, color: C.goldHi });
    if (pr < 1) glowDot(g, head[0], head[1], 3, cm);
    const at = x => cm * clamp((head[0] - x) / 60);
    text(g, '综合人 · Composite Man', 800, 300, { size: 30, weight: 600, color: C.goldHi, a: cm * ease(t, lt('wyckoff', 6) + 0.6, 1.0), track: 0.16 });
    text(g, '吸筹', 780, 570, { size: 24, color: C.ivory, a: at(800) * 0.85, track: 0.4 });
    text(g, '弹簧', 1078, 590, { size: 24, color: DNC, a: at(1110), align: 'right', track: 0.3 });
    text(g, '拉升', 1420, 400, { size: 24, color: UPC, a: at(1400), align: 'left', track: 0.3 });
    text(g, '巨型脚印', 1340, 700, { size: 24, weight: 600, color: C.goldHi, a: cm * ease(t, lt('wyckoff', 6) + 2.6, 1.0), align: 'left', track: 0.3 });
  }
}

function artObv(g, t) {
  const a = secA(t, 'obv');
  if (a <= 0) return;
  // line 0: the name, a run of daily bars and their volume
  const k0 = life(t, WIN.obv[0] + 1.3, le('obv', 0) + 0.4, 1.0, 0.8) * a;
  if (k0 > 0.01) {
    text(g, 'OBV', 960, 312, { font: 'latin', size: 120, weight: 500, color: C.goldHi, a: k0, track: 0.12 });
    text(g, 'ON-BALANCE VOLUME · 能量潮', 960, 382, { size: 20, color: C.gold, a: k0 * 0.85, track: 0.3 });
    OBVD.forEach((d, j) => { const gr = ease(t, WIN.obv[0] + 1.5 + j * 0.05, 0.6); if (gr > 0) drawCandle(g, odX(j), odY, d, 16, k0 * clamp(gr * 2), { grow: gr, mono: 0.3 }); });
    goldStroke(g, [[400, 771], [1520, 771]], k0, { w: 1, a: k0 * 0.5, glow: 0 });
  }
  // line 1 (text on the left): signed volume on the right, summed into OBV
  const k1 = lon('obv', 1, 0.8, 0.8, 0.2, 0.3)(t) * a;
  if (k1 > 0.01) {
    goldStroke(g, [[1020, OF_ZERO], [1770, OF_ZERO]], ease(t, lt('obv', 1) - 0.2, 1.0, SWIFT), { w: 1.2, a: k1 * 0.8, glow: 0.2, color: C.ivory });
    text(g, '0', 1004, OF_ZERO, { font: 'latin', size: 22, color: C.ivory, a: k1 * 0.7, align: 'right' });
    text(g, '正', 1004, OF_ZERO - 70, { size: 24, weight: 700, color: UPC, a: k1 * ease(t, lt('obv', 1) + 0.8, 0.6), align: 'right' });
    text(g, '负', 1004, OF_ZERO + 70, { size: 24, weight: 700, color: DNC, a: k1 * ease(t, lt('obv', 1) + 1.2, 0.6), align: 'right' });
    const pts = [[ofX(0) - 12, OF_ZERO]];
    for (let d = 0; d < 30; d++) { const f = ofFlip(d, t); if (f <= 0) break; const prev = pts[pts.length - 1]; pts.push([lerp(prev[0], ofX(d), f), lerp(prev[1], ofObY(OBVD[d].ob), f)]); }
    if (pts.length > 1) { goldStroke(g, pts, 1, { w: 2.2, a: k1, glow: 0.6, color: C.goldHi }); const h = pts[pts.length - 1]; glowDot(g, h[0], h[1], 3, k1); }
    text(g, 'OBV', ofX(29) + 18, ofObY(OBVD[29].ob), { font: 'latin', size: 26, weight: 500, color: C.goldHi, a: k1 * ofFlip(29, t), align: 'left', track: 0.1 });
    text(g, '逐日累加', 1400, 300, { size: 24, color: C.goldHi, a: k1 * ease(t, lt('obv', 1) + 2.4, 0.8), track: 0.3 });
  }
  // line 2: OBV is the locomotive, price the carriage
  const k2 = lon('obv', 2, 0.8, 0.8, 0.1, 0.3)(t) * a;
  if (k2 > 0.01) {
    const h = trHead(t), ob = [], pr = [];
    for (let k = 0; k <= 160; k++) { const s = k / 160 * h; ob.push([trX(s), trObY(s)]); const sp = k / 160 * (h - TR_LAG); pr.push([trX(sp), trPrY(sp)]); }
    goldStroke(g, ob, 1, { w: 2.2, a: k2, glow: 0.6, color: C.goldHi });
    goldStroke(g, pr, 1, { w: 1.6, a: k2 * 0.85, glow: 0.2, color: C.ivory });
    const hx = trX(h), hy = trObY(h), px = trX(h - TR_LAG), py = trPrY(h - TR_LAG);
    glowDot(g, hx, hy, 4.5, k2); glowDot(g, px, py, 3, k2 * 0.8, C.ivory);
    goldStroke(g, [[px + 6, py - 6], [hx - 6, hy + 6]], 1, { w: 1, a: k2 * 0.35, glow: 0, color: C.ivory });     // the coupling
    text(g, '火车头 · 成交量', hx, hy - 40, { size: 26, weight: 700, color: C.goldHi, a: k2 * ease(t, lt('obv', 2) + 0.4, 0.8), track: 0.2 });
    text(g, '车厢 · 价格', px, py - 34, { size: 24, color: C.ivory, a: k2 * 0.85 * ease(t, lt('obv', 2) + 0.8, 0.8), track: 0.2 });
    text(g, 'VOLUME LEADS PRICE', 960, 290, { font: 'latin', size: 20, color: C.gold, a: k2 * 0.85, track: 0.45 });
  }
  // lines 3–4: the dam — water (OBV) rises behind it while the price is held flat; then it breaks
  const k3 = life(t, lt('obv', 3) - 0.3, WIN.obv[1] - 0.3, 1.0, 0.9) * a;
  if (k3 > 0.01) {
    const tb = damBreak(), Lv = damLevel(t), bt = t - tb, flat = x => 600 + 8 * Math.sin(x * 0.03 + t * 1.3);
    const fp = []; for (let x = 420; x <= 1290; x += 10) fp.push([x, flat(x)]);
    goldStroke(g, fp, ease(t, lt('obv', 3), 1.4, SOFT), { w: 1.8, a: k3 * 0.9, glow: 0.2, color: C.ivory });
    text(g, '价格 · 压着不涨', 440, 640, { size: 24, color: C.ivory, a: k3 * 0.85 * ease(t, lt('obv', 3) + 0.6, 0.8), align: 'left', track: 0.2 });
    const wl = k3 * (1 - ease(t, tb + 0.4, 0.8, SOFT));
    text(g, 'OBV · 水位', DAM.x1 - 14, Lv - 28, { size: 24, weight: 600, color: C.goldHi, a: wl * ease(t, lt('obv', 3) + 1.0, 0.8), align: 'right', track: 0.2 });
    // the wall: six courses of stone; after the break they tumble away
    const hh = (DAM.base - DAM.top) / 6;
    g.save(); g.beginPath(); g.rect(0, 0, W, 786); g.clip();
    for (let k = 0; k < 6; k++) {
      const d = bt - Math.abs(k - 3.5) * 0.06, f = d > 0 ? d : 0, y = DAM.top + k * hh, al = k3 * (1 - clamp(f / 1.1));
      if (al <= 0.01) continue;
      const cx = DAM.wx + DAM.ww / 2 + 140 * f + 40 * f * (k % 2), cy = y + hh / 2 + 380 * f * f, rot = (k % 2 ? 1 : -1) * f * 1.6;
      g.save(); g.translate(cx, cy); g.rotate(rot);
      goldStroke(g, rectPts(-DAM.ww / 2, -hh / 2 + 2, DAM.ww, hh - 4), ease(t, lt('obv', 3) - 0.2 + k * 0.08, 0.8), { w: 1.6, a: al, glow: 0.3, close: true, color: C.goldHi });
      g.restore();
    }
    g.restore();
    text(g, '堤坝', DAM.wx + 13, DAM.top - 30, { size: 26, weight: 600, color: C.goldHi, a: k3 * (1 - ease(t, tb - 0.2, 0.4)), track: 0.3 });
    if (bt > -0.2) {
      text(g, '决口', DAM.wx + 13, DAM.top - 30, { size: 30, weight: 700, color: UPC, a: k3 * ease(t, tb - 0.2, 0.4), track: 0.3 });
      const pr = ease(t, tb + 0.2, 1.6, SOFT), pts = [];
      for (let k = 0; k <= 60; k++) pts.push(qbez([1290, flat(1290)], [1500, 610], [1730, 280], k / 60));
      const hd = goldStroke(g, pts, pr, { w: 2.6, a: k3, glow: 0.7, color: UPC });
      if (pr > 0) glowDot(g, hd[0], hd[1], 4, k3);
      text(g, '价格', 1752, 280, { size: 26, weight: 700, color: UPC, a: k3 * ease(t, tb + 1.6, 0.6), align: 'left', track: 0.3 });
    }
  }
}

function blockShape(g, b, a, crack, fall) {      // a hedge-fund block; it cracks down the middle and the halves drop
  const [x, y, w, h] = HB[b], cr = [];
  for (let k = 0; k <= 6; k++) cr.push([x + w * (0.52 + (k % 2 ? 0.12 : -0.1) * (k > 0 && k < 6 ? 1 : 0.2)), y + h * k / 6]);
  if (fall <= 0) {
    g.globalAlpha = a * 0.1; g.fillStyle = C.gold; g.fillRect(x, y, w, h); g.globalAlpha = 1;
    goldStroke(g, rectPts(x, y, w, h), 1, { w: 1.6, a, glow: 0.35, close: true, color: C.goldHi });
    if (crack > 0) goldStroke(g, cr, crack, { w: 1.6, a, glow: 0.5, color: C.ivory });
    return;
  }
  const al = a * (1 - clamp(fall / 1.0));
  for (const s of [-1, 1]) {
    const poly = s < 0 ? [[x, y], ...cr, [x, y + h]] : [[x + w, y], ...cr, [x + w, y + h]];
    g.save(); g.translate(x + w / 2 + s * 30 * fall, y + h / 2 + 420 * fall * fall); g.rotate(s * 0.5 * fall); g.translate(-(x + w / 2), -(y + h / 2));
    g.globalAlpha = al * 0.08; g.fillStyle = C.gold; g.beginPath(); poly.forEach(([px, py], k) => k ? g.lineTo(px, py) : g.moveTo(px, py)); g.closePath(); g.fill(); g.globalAlpha = 1;
    goldStroke(g, poly, 1, { w: 1.6, a: al, glow: 0.35, close: true, color: C.goldHi });
    g.restore();
  }
}
function artGme(g, t) {
  const a = ease(t, WIN.gme[0] + 1.4, 1.0, SOFT) * (1 - ease(t, WIN.gme[1] - 1.8, 1.2, SOFT));
  if (a <= 0) return;
  // lines 0–2 and 5: the hedge-fund blocks facing the crowd
  const bl = a * Math.max(life(t, WIN.gme[0] + 1.2, lt('gme', 3) + 0.1, 1.0, 0.8), ease(t, lt('gme', 5) - 0.3, 0.8, SOFT));
  if (bl > 0.01) {
    g.save(); g.beginPath(); g.rect(0, 0, W, 786); g.clip();
    HB.forEach((_, b) => { const tc = lt('gme', 5) + 0.7 + b * 0.35; blockShape(g, b, bl, ease(t, tc, 0.8, SOFT), Math.max(0, t - tc - 0.9 - 0.3)); });
    g.restore();
    const early = 1 - ease(t, lt('gme', 3) - 0.6, 0.6, SOFT);
    text(g, '对冲基金', 1490, 340, { size: 30, weight: 700, color: C.goldHi, a: bl * early, track: 0.3 });
    text(g, 'HEDGE FUNDS', 1490, 300, { font: 'latin', size: 18, color: C.gold, a: bl * early * 0.8, track: 0.4 });
    const ml = a * ease(t, lt('gme', 5) + 0.5, 1.0, SOFT);
    text(g, '梅尔文资本 · 次年清盘', 1490, 340, { size: 30, weight: 700, color: C.goldHi, a: ml, track: 0.2 });
    text(g, 'MELVIN CAPITAL · 2022', 1490, 300, { font: 'latin', size: 18, color: C.gold, a: ml * 0.8, track: 0.4 });
  }
  const cr = a * life(t, WIN.gme[0] + 1.4, le('gme', 1) + 0.3, 1.0, 0.8);
  text(g, '散户', 500, 296, { size: 30, weight: 700, color: C.ivory, a: cr, track: 0.4 });
  // line 1: short interest past 100% of the float
  const gg = lon('gme', 1, 0.8, 0.8, 0.0, 0.4)(t) * a;
  if (gg > 0.01) {
    const cx = 1030, cy = 650, R = 130, v = 1.4 * ease(t, lt('gme', 1) + 0.6, 2.8, SOFT), A = x => Math.PI + x / 1.5 * Math.PI;
    goldStroke(g, arcPts(cx, cy, R, Math.PI, TAU, 60), ease(t, lt('gme', 1) - 0.2, 1.0), { w: 1.2, a: gg * 0.6, glow: 0 });
    goldStroke(g, arcPts(cx, cy, R - 14, A(0), A(Math.min(v, 1)), 50), 1, { w: 9, a: gg * 0.75, color: C.gold, glow: 0.2 });
    if (v > 1) goldStroke(g, arcPts(cx, cy, R - 14, A(1), A(v), 20), 1, { w: 9, a: gg, color: UPC, glow: 0.5 });
    for (const [x, s] of [[0, '0'], [0.5, '50%'], [1, '100%'], [1.5, '150%']]) {
      const an = A(x); goldStroke(g, [[cx + Math.cos(an) * (R + 4), cy + Math.sin(an) * (R + 4)], [cx + Math.cos(an) * (R + 16), cy + Math.sin(an) * (R + 16)]], 1, { w: 1.2, a: gg * 0.8, glow: 0 });
      text(g, s, cx + Math.cos(an) * (R + 40), cy + Math.sin(an) * (R + 34), { font: 'latin', size: 18, color: x === 1 ? C.goldHi : C.ivory, a: gg * 0.75 });
    }
    const an = A(v); goldStroke(g, [[cx, cy], [cx + Math.cos(an) * (R - 30), cy + Math.sin(an) * (R - 30)]], 1, { w: 2, a: gg, glow: 0.4, color: C.goldHi }); glowDot(g, cx, cy, 3.5, gg);
    text(g, Math.round(v * 100) + '%', cx, cy - 48, { font: 'latin', size: 44, weight: 500, color: v > 1 ? UPC : C.goldHi, a: gg });
    text(g, '空头仓位 · 流通股', cx, cy + 40, { size: 24, weight: 600, color: C.goldHi, a: gg, track: 0.2 });
  }
  // line 2: the chips locked up
  const lk = lon('gme', 2, 0.8, 0.8, 0.0, 0.3)(t) * a;
  if (lk > 0.01) {
    const fr = ease(t, lt('gme', 2) + 0.9, 1.0, SOFT);
    goldStroke(g, rectPts(388, 458, 300, 300), fr, { w: 1.4, a: lk * 0.8, glow: 0.3, close: true, color: C.goldHi });
    const sh = arcPts(538, 458, 66, Math.PI, TAU, 32); sh.unshift([472, 458]); sh.push([604, 458]);
    goldStroke(g, sh, ease(t, lt('gme', 2) + 1.5, 0.9, SOFT), { w: 4, a: lk, glow: 0.5, color: C.goldHi });
    [[296, 520], [790, 480], [304, 690], [784, 650], [420, 360], [680, 352]].forEach(([x, y], q) => {
      const e = ease(t, lt('gme', 2) + 1.4 + q * 0.32, 0.7);
      text(g, 'HOLD', x, y - 6 * e + 3 * Math.sin(t * 1.6 + q), { font: 'latin', size: 20, weight: 500, color: q % 2 ? UPC : C.goldHi, a: lk * e * 0.9, track: 0.3 });
    });
  }
  // line 3: the squeeze — price and a tsunami of volume
  const ch = lon('gme', 3, 0.8, 0.8, 0.0, 0.3)(t) * a;
  if (ch > 0.01) {
    const pts = []; let head = null;
    for (let d = 0; d < GMEP.length; d++) {
      const u = clamp((t - gmT(d)) / 0.07); if (u <= 0) break;
      if (d === GM_SPIKE) { pts.push([gmX(d) - 3, gmY(483)]); if (u > 0.5) pts.push([gmX(d) + 3, gmY(GMEP[d])]); }
      else if (d > 0 && u < 1) { const p0 = pts[pts.length - 1]; pts.push([lerp(p0[0], gmX(d), u), lerp(p0[1], gmY(GMEP[d]), u)]); }
      else pts.push([gmX(d), gmY(GMEP[d])]);
    }
    if (pts.length > 1) { goldStroke(g, pts, 1, { w: 2.2, a: ch, glow: 0.6, color: UPC }); head = pts[pts.length - 1]; glowDot(g, head[0], head[1], 3.5, ch); }
    goldStroke(g, [[360, GM_BASE + 1], [1580, GM_BASE + 1]], ch, { w: 1, a: ch * 0.5, glow: 0 });
    text(g, 'GME · 2020.12 - 2021.02', 380, 300, { font: 'latin', size: 20, color: C.gold, a: ch * 0.85, align: 'left', track: 0.3 });
    text(g, '$20', gmX(8), gmY(20) - 34, { font: 'latin', size: 30, weight: 500, color: C.ivory, a: ch * ease(t, gmT(6), 0.6) });
    const sp = ch * ease(t, gmT(GM_SPIKE), 0.6);
    text(g, '$483', gmX(GM_SPIKE) + 22, gmY(483), { font: 'latin', size: 40, weight: 500, color: C.goldHi, a: sp, align: 'left' });
    text(g, '盘中', gmX(GM_SPIKE) + 24, gmY(483) + 40, { size: 20, color: C.ivory, a: sp * 0.7, align: 'left', track: 0.3 });
    text(g, '成交量', 380, 700, { size: 22, color: C.gold, a: ch * 0.8, align: 'left', track: 0.3 });
  }
  // line 4: an order book with nothing on the ask
  const bk = lon('gme', 4, 0.8, 0.8, 0.0, 0.3)(t) * a;
  if (bk > 0.01) {
    text(g, '买盘 · BID', 700, 296, { size: 26, weight: 700, color: UPC, a: bk, track: 0.2 });
    text(g, '卖盘 · ASK', 1220, 296, { size: 26, weight: 700, color: DNC, a: bk, track: 0.2 });
    goldStroke(g, [[960, 320], [960, 740]], bk, { w: 1, a: bk * 0.4, glow: 0, color: C.ivory });
    g.save(); g.setLineDash([4, 7]);
    for (let r = 0; r < 10; r++) {
      text(g, String(350 - r * 5), 960, BKY(r), { font: 'latin', size: 18, color: C.ivory, a: bk * 0.55 });
      if (r !== 4 && r !== 5) { g.globalAlpha = bk * 0.3; g.strokeStyle = DNC; g.lineWidth = 1; g.strokeRect(1020, BKY(r) - 13, 380, 26); }
      g.globalAlpha = bk * 0.25; g.strokeStyle = UPC; g.strokeRect(900 - BKL(r) - 8, BKY(r) - 15, BKL(r) + 8, 30);
    }
    g.restore(); g.globalAlpha = 1;
    text(g, '没有卖盘', 1210, (BKY(4) + BKY(5)) / 2, { size: 36, weight: 700, color: DNC, a: bk * ease(t, lt('gme', 4) + 1.0, 0.8), track: 0.4 });
  }
}
Object.assign(FILM_ART, { tape: artTape, wyckoff: artWyckoff, obv: artObv, gme: artGme });


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
function artOpen(g, t) {
  const a = ease(t, 0.6, 1.4, SOFT) * (1 - ease(t, WIN.open[1] - 0.8, 1.2, SOFT));
  if (a <= 0) return;
  const t0 = lt('open', 0), t1 = lt('open', 1), t2 = lt('open', 2);
  // line 0: a chart drawn by hand, then bent by money
  const ca = a * ease(t, t0 - 0.8, 1.0, SOFT) * (1 - 0.6 * ease(t, t1 - 0.2, 1.4, SOFT)) * (1 - ease(t, t2 - 0.5, 1.0, SOFT));
  if (ca > 0.01) {
    const d0 = t0 - 0.5; let head = null;
    OPC.forEach((k, j) => {
      const gr = ease(t, d0 + j * 0.075, 0.5); if (gr <= 0) return;
      const x = opX(j), w = opWarp(x, t);
      drawCandle(g, x, v => opY(v) + w, k, 14, ca * clamp(gr * 2), { grow: gr, mono: 0.3 });
      head = [x, opY(k.c) + w];
    });
    const drawing = 1 - ease(t, d0 + OPC.length * 0.075, 0.6, SOFT);
    if (head && drawing > 0) glowDot(g, head[0] + 12, head[1], 3, ca * drawing);
    const ma = [];
    for (let j = 4; j < OPC.length; j++) {
      if (t < d0 + j * 0.075 + 0.3) break;
      let s = 0; for (let q = j - 4; q <= j; q++) s += OPC[q].c;
      const x = opX(j); ma.push([x, opY(s / 5) + opWarp(x, t, 2.0)]);
    }
    if (ma.length > 1) {
      goldStroke(g, ma, 1, { w: 2, a: ca * 0.9, glow: 0.5, color: C.goldHi });
      const e = ma[ma.length - 1];
      text(g, '均线', e[0] + 20, e[1], { size: 22, color: C.goldHi, a: ca * ease(t, t0 + 1.6, 0.8), align: 'left', track: 0.2 });
    }
  }
  // line 1: real volume rises from the floor and stays; wash trades flare and collapse
  const ba = a * ease(t, t1 - 0.3, 1.0, SOFT) * (1 - ease(t, t2 - 0.2, 1.2, SOFT));
  if (ba > 0.01) {
    OPV.forEach((h, j) => barBox(g, ovX(j), OV_BASE, 22, h * ease(t, t1 - 0.1 + j * 0.05, 1.6), ba, C.gold, 0.12));
    goldStroke(g, [[470, OV_BASE + 1], [1460, OV_BASE + 1]], ease(t, t1 - 0.4, 1.2, SWIFT), { w: 1.2, a: ba * 0.8, glow: 0.3 });
    const fa = ba * ease(t, t1 + 0.9, 0.8);
    [3, 8, 13, 19].forEach((j, q) => {
      const ph = ((t - t1 + q * 0.55) % 2.2 + 2.2) % 2.2, pu = ph < 1 ? Math.sin(Math.PI * ph) : 0;
      if (pu <= 0.01 || fa <= 0.01) return;
      const h = OPV[j] * (1 + 1.5 * pu), x = ovX(j);
      g.save(); g.setLineDash([5, 6]); g.globalAlpha = fa * pu * 0.8; g.strokeStyle = C.ivory; g.lineWidth = 1.2; g.strokeRect(x - 14, OV_BASE - h, 28, h); g.restore();
    });
    text(g, '对倒 · 虚量', 452, 700, { size: 22, color: C.ivory, a: fa * 0.7, align: 'right', track: 0.2 });
    text(g, '真实成交', 1482, 700, { size: 22, weight: 600, color: C.goldHi, a: ba * ease(t, t1 + 1.4, 0.8), align: 'left', track: 0.2 });
  }
  // line 2: the bars become way-markers on a road
  const ra = a * ease(t, t2 - 0.2, 1.0, SOFT);
  if (ra > 0.01) {
    g.save(); g.setLineDash([3, 9]);
    goldStroke(g, ROAD.map(M => [M.x, M.y]), ease(t, t2, 2.6, SOFT), { w: 1.4, a: ra * 0.7, glow: 0.3, color: C.goldHi });
    g.restore();
    ROAD.forEach((M, k) => diamond(g, M.x, M.y - 84 * M.s, 5 * M.s + 2, ra * ease(t, t2 + 0.2 + k * 0.28, 0.9)));
    const E = ROAD[8];
    text(g, '路标', E.x + 46, E.y - 52, { size: 26, weight: 600, color: C.goldHi, a: ra * ease(t, t2 + 2.6, 1.0), align: 'left', track: 0.3 });
  }
}
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

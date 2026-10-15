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
const RED = '#E08A7E', GRN = '#8FC0A6';            // line-art / label tints of the A-share red (up) and green (down)

/* ambient dust: every particle not used by a diagram rests here, so it stays put across re-formations */
function amb(i, t, o, a = 0.1, col = GOLD) {
  const p = P[i];
  o[0] = 110 + p.r1 * 1700 + 34 * Math.sin(t * 0.11 + p.r3 * TAU);
  o[1] = 262 + p.r2 * 520 + 16 * Math.sin(t * 0.19 + p.r4 * TAU);
  o[2] = 0.9 + p.r5 * 1.2; o[3] = a * (0.55 + 0.45 * Math.sin(t * (0.7 + p.r6) + p.r2 * TAU)); o[4] = col;
}

/* ---------- 模块一: one large anatomical candle (360 body particles, 120 wick particles) ---------- */
const NB = 360, NW = 120;
const BIG = {
  anat: { cx: 960, bt: 360, bb: 620, wt: 250, wb: 750, w: 160, col: GOLDHI },
  red: { cx: 1380, bt: 380, bb: 600, wt: 276, wb: 700, w: 150, col: UP },
  green: { cx: 560, bt: 380, bb: 600, wt: 290, wb: 712, w: 150, col: DOWN },
  wick: { cx: 960, bt: 430, bb: 560, wt: 262, wb: 742, w: 150, col: UP },
  doji: { cx: 960, bt: 497, bb: 503, wt: 330, wb: 670, w: 260, col: GOLDHI },
};
function fBig(key, i, t, o) {
  const B = BIG[key], p = P[i];
  if (i >= NB + NW) return amb(i, t, o, 0.1);
  let x, y, r, a, col = B.col;
  if (i < NB) {                                     // the real body: a dense block of light
    const h = Math.max(4, B.bb - B.bt), cols = clamp(Math.round(Math.sqrt(NB * B.w / h)), 1, NB), rows = Math.ceil(NB / cols);
    const c = i % cols, rw = Math.floor(i / cols);
    x = B.cx - B.w / 2 + (c + 0.5 + (p.r2 - 0.5) * 0.5) * B.w / cols;
    y = B.bt + (rw + 0.5 + (p.r3 - 0.5) * 0.5) * h / rows;
    r = 2.0 + p.r4 * 0.6; a = 0.62 + 0.24 * Math.sin(t * 1.6 + p.r5 * TAU);
    if (key === 'anat') {
      col = i % 6 === 0 ? IVORY : GOLDHI;
      const u = ease(t, lt('body', 0) - 0.5 + rw / rows * 1.4 + p.r1 * 0.4, 1.4, EXPO);
      if (u < 1) {                                  // before the first line: a loose cloud waiting to condense
        const th = p.r1 * TAU + t * 0.08 * (p.r2 - 0.4), R = 120 + p.r3 * 260;
        x = lerp(960 + Math.cos(th) * R * 1.6, x, u); y = lerp(500 + Math.sin(th) * R * 0.7, y, u); a = lerp(0.26, a, u); r = lerp(1.4, r, u);
      }
    }
    if (key === 'wick') {                           // the bulls surge to the high (line 4), the bears to the low (line 5)
      const s4 = p.r6 < 0.2, s5 = p.r6 > 0.8;
      if (s4 || s5) {
        const k = s4 ? 4 : 5, t0 = lt('body', k) + 0.7, q = ease(t, t0 + p.r2 * 1.8, 1.5, EXPO) * (1 - ease(t, le('body', k) + 0.1 + p.r2 * 0.5, 1.1, SOFT));
        if (q > 0) {
          const tx = B.cx + (p.r3 - 0.5) * 16, ty = s4 ? B.wt + 6 + p.r4 * 22 : B.wb - 6 - p.r4 * 22;
          x = lerp(x, tx, clamp(q * 2.5)); y = lerp(y, ty, q); col = q > 0.5 ? GOLDHI : col; r += q * 0.4; a = lerp(a, 0.95, q);
        }
      }
    }
    if (key === 'doji') {                           // line 7: a full round of fighting, up and down the shadows, then back to the origin
      const d = t - (lt('body', 7) + 0.4);
      if (d > 0) {
        const env = Math.exp(-d / 1.9) * (1 - Math.exp(-d * 3)), s = (i % 2 ? 1 : -1), A = 70 + p.r3 * 95;
        y += s * A * env * Math.abs(Math.sin(d * 2.4 + p.r4 * 0.7));
        x = lerp(x, B.cx + (p.r2 - 0.5) * 8, clamp(env * 3));
        col = env * Math.abs(Math.sin(d * 2.4 + p.r4 * 0.7)) > 0.25 ? (s < 0 ? UP : DOWN) : GOLDHI;
      }
    }
  } else {                                          // the shadows: thin lines of light
    const k = i - NB, up = B.bt - B.wt, dn = B.wb - B.bb, f = up / (up + dn), s = (k + 0.5) / NW;
    const fr = s < f ? s / f : (s - f) / (1 - f);
    y = s < f ? B.bt - fr * up : B.bb + fr * dn; x = B.cx + (p.r2 - 0.5) * 2.2;
    r = 1.5 + p.r4 * 0.4; a = 0.72 + 0.2 * Math.sin(t * 2 + p.r5 * TAU); col = B.col === GOLDHI ? GOLD : B.col;
    if (key === 'anat') {
      const u = ease(t, lt('body', 0) + 0.8 + fr * 1.0 + p.r1 * 0.2, 1.2, EXPO);
      if (u < 1) { const th = p.r1 * TAU + t * 0.08, R = 160 + p.r3 * 240; x = lerp(960 + Math.cos(th) * R * 1.6, x, u); y = lerp(500 + Math.sin(th) * R * 0.7, y, u); a = lerp(0.24, a, u); }
    }
  }
  if (key === 'anat') a *= 1 - 0.7 * life(t, lt('body', 1) - 0.4, le('body', 1) + 0.5, 0.7, 0.7);   // the centre line reads over a dimmed candle
  o[0] = x; o[1] = y; o[2] = r; o[3] = a; o[4] = col;
}

/* ---------- candle series built from light: bodies are particle blocks, shadows are line-art ---------- */
function fromPiv(seed, n, piv, { noise = 8, wick = 12 } = {}) {
  const R = rng(seed), at = new Set(piv.map(q => q[0]));
  const v = j => { for (let q = 1; q < piv.length; q++) if (j <= piv[q][0]) { const [a, va] = piv[q - 1], [b, vb] = piv[q]; return lerp(va, vb, (j - a) / (b - a)); } return piv[piv.length - 1][1]; };
  const out = []; let prev = v(0);
  for (let j = 0; j < n; j++) {
    const o = prev, c = v(j + 1) + (at.has(j + 1) ? 0 : (R() - 0.5) * noise);
    out.push({ o, c, hi: Math.max(o, c) + 2 + R() * wick, lo: Math.min(o, c) - 2 - R() * wick }); prev = c;
  }
  return out;
}
function mkSer(cands, Y0, budget = 560, rad = 2.0) {
  const y = v => Y0 - v, bh = k => Math.max(5, Math.abs(k.c - k.o));
  const area = cands.map(k => bh(k) * k.w), tot = area.reduce((s, v) => s + v, 0), slots = [];
  cands.forEach((k, ci) => {
    const n = Math.max(3, Math.round(budget * area[ci] / tot)), h = bh(k), top = y(Math.max(k.o, k.c));
    const cols = clamp(Math.round(Math.sqrt(n * k.w / h)), 1, n), rows = Math.ceil(n / cols);
    for (let q = 0; q < n && slots.length < N - 80; q++) {
      const c = q % cols, r = Math.floor(q / cols), R = P[slots.length];
      slots.push({ c: ci, x: k.x - k.w / 2 + (c + 0.5 + (R.r5 - 0.5) * 0.4) * k.w / cols, y: top + (r + 0.5 + (R.r6 - 0.5) * 0.4) * h / rows, r: rad });
    }
  });
  return { c: cands, y, slots, Y0 };
}
const swingPts = (S, piv) => piv.slice(1, -1).map(([k, v], j) => {   // the extreme of the two candles meeting at a pivot
  const peak = v > piv[j][1], a = S.c[k - 1], b = S.c[k], A = peak ? a.hi : a.lo, Bv = peak ? b.hi : b.lo, useA = peak ? A >= Bv : A <= Bv;
  return { peak, x: useA ? a.x : b.x, y: S.y(useA ? A : Bv) };
});
const SERDEF = {
  zig: () => {
    const piv = [[0, 40], [7, 190], [11, 118], [18, 285], [22, 200], [29, 360], [33, 282], [40, 432], [44, 392]];
    const c = fromPiv(11, 44, piv, { noise: 12, wick: 12 }); c.forEach((k, j) => { k.x = 315 + j * 30; k.w = 18; });
    const S = mkSer(c, 720); S.piv = piv; S.rev = j => WIN.trend[0] + 1.7 + j * 0.115; return S;
  },
  up: () => {
    const piv = [[0, 30], [5, 160], [8, 104], [13, 250], [16, 190], [21, 340], [24, 280], [30, 420]];
    const c = fromPiv(23, 30, piv, { noise: 10, wick: 10 }); c.forEach((k, j) => { k.x = 1024 + j * 25; k.w = 14; });
    const S = mkSer(c, 740); S.piv = piv; S.rev = j => lt('trend', 1) + 0.1 + j * 0.11; return S;
  },
  down: () => {
    const piv = [[0, 420], [5, 290], [8, 346], [13, 200], [16, 260], [21, 110], [24, 170], [30, 30]];
    const c = fromPiv(37, 30, piv, { noise: 10, wick: 10 }); c.forEach((k, j) => { k.x = 176 + j * 25; k.w = 14; });
    const S = mkSer(c, 740); S.piv = piv; S.rev = j => lt('trend', 2) + 0.1 + j * 0.11; return S;
  },
  range: () => {
    const piv = [[0, 200], [3, 292], [6, 128], [9, 298], [12, 124], [15, 290], [18, 132], [21, 296], [24, 122], [27, 288], [30, 130], [32, 210]];
    const c = fromPiv(41, 32, piv, { noise: 26, wick: 16 }); c.forEach((k, j) => { k.x = 496 + j * 30; k.w = 18; });
    const S = mkSer(c, 660); S.rv = 300; S.sv = 120; S.rev = j => lt('trend', 3) + 0.2 + j * 0.12; return S;
  },
  tight: () => {                                    // a quiet base, then a tight same-colour run
    const R = rng(31), c = []; let p = 70;
    for (let j = 0; j < 8; j++) { const o = p, cl = 70 + (j % 2 ? 14 : -14) + (R() - 0.5) * 16; c.push({ o, c: cl, hi: Math.max(o, cl) + 8 + R() * 16, lo: Math.min(o, cl) - 8 - R() * 16 }); p = cl; }
    for (let j = 0; j < 18; j++) { const o = p - 3 - R() * 3, cl = o + 19 + R() * 6; c.push({ o, c: cl, hi: cl + 2 + R() * 4, lo: o - 2 - R() * 4 }); p = cl; }
    c.forEach((k, j) => { k.x = 470 + j * 37; k.w = 20; });
    const S = mkSer(c, 720); S.rev = j => j < 8 ? lt('gain', 0) - 0.6 + j * 0.42 : lt('gain', 1) + 0.3 + (j - 8) * 0.3; return S;
  },
  grow: () => {                                     // each candle bigger than the last: red climbing, then green falling
    const R = rng(53), c = [], tr = [lt('gain', 3) + 0.4], tg = [lt('gain', 4) + 2.3];
    let p = 40;
    for (let j = 0; j < 9; j++) { const h = 14 * Math.pow(1.27, j), o = j ? p - 6 : p, cl = o + h; c.push({ o, c: cl, hi: cl + 3 + R() * 6, lo: o - 3 - R() * 6, x: 380 + j * 58, w: 14 + j * 3 }); p = cl; }
    p = c[8].c;
    for (let j = 0; j < 9; j++) { const h = 14 * Math.pow(1.27, j), o = j ? p + 6 : p, cl = o - h; c.push({ o, c: cl, hi: o + 3 + R() * 6, lo: cl - 3 - R() * 6, x: 1076 + j * 58, w: 14 + j * 3 }); p = cl; }
    for (let j = 1; j < 9; j++) { tr.push(tr[j - 1] + 0.72 * Math.pow(0.86, j - 1)); tg.push(tg[j - 1] + 0.5 * Math.pow(0.86, j - 1)); }
    const S = mkSer(c, 720, 600); S.rev = j => j < 9 ? tr[j] : tg[j - 9]; return S;
  },
  wide: () => {                                     // a tight run, then wide swings with long shadows both ways
    const R = rng(67), c = []; let p = 30;
    for (let j = 0; j < 12; j++) { const o = p - 3, cl = o + 21 + R() * 4; c.push({ o, c: cl, hi: cl + 2 + R() * 3, lo: o - 2 - R() * 3, x: 400 + j * 34, w: 18 }); p = cl; }
    [230, 300, 205, 292, 218, 306, 200, 278, 214, 262].forEach((cl, m) => {
      const o = p; c.push({ o, c: cl, hi: Math.max(o, cl) + 55 + R() * 55, lo: Math.min(o, cl) - 55 - R() * 55, x: 846 + m * 52, w: 30 }); p = cl;
    });
    const S = mkSer(c, 720); S.rev = j => j < 12 ? WIN.loss[0] + 1.5 + j * 0.18 : lt('loss', 0) + 1.9 + (j - 12) * 0.45; return S;
  },
  shrink: () => {
    const R = rng(71), c = []; let p = 48;
    [100, 78, 60, 46, 36, 28, 21, 16, 12, 9].forEach((h, j) => { const o = j ? p - 8 : p, cl = o + h; c.push({ o, c: cl, hi: cl + 5 + R() * 8, lo: o - 5 - R() * 8, x: 640 + j * 72, w: 36 }); p = cl; });
    const S = mkSer(c, 710); S.rev = j => lt('loss', 2) + 0.3 + j * 0.42; return S;
  },
  shift: () => {                                    // strong red run, a green candle that fails at the high, then follow-through
    const R = rng(83), c = []; let p = 40;
    for (let j = 0; j < 8; j++) { const o = j ? p - 4 : p, cl = o + 40 + R() * 6; c.push({ o, c: cl, hi: cl + 6 + R() * 6, lo: o - 4 - R() * 5 }); p = cl; }
    const H = c[7].hi; c.push({ o: p - 2, c: p - 46, hi: H - 16, lo: p - 52 }); p -= 46;
    for (const d of [34, 30, 38]) { const o = p + 2, cl = o - d; c.push({ o, c: cl, hi: o + 6 + R() * 6, lo: cl - 5 - R() * 6 }); p = cl; }
    c.forEach((k, j) => { k.x = 600 + j * 60; k.w = 30; });
    const S = mkSer(c, 724); S.rev = j => j < 8 ? lt('loss', 4) + 0.3 + j * 0.36 : j === 8 ? lt('loss', 4) + 3.5 : lt('loss', 5) + 0.5 + (j - 9) * 0.6; return S;
  },
};
const SER_ = {};
const ser = key => SER_[key] || (SER_[key] = SERDEF[key]());
function serPt(key, i, t, o, ambA = 0.1, ambC = GOLD, boost = 0) {
  const S = ser(key), s = S.slots[i];
  amb(i, t, o, ambA, ambC);
  if (!s) return;
  const k = S.c[s.c], p = P[i], r0 = S.rev(s.c), u = ease(t, r0 + p.r1 * 0.25, 0.9, EXPO);
  if (u <= 0.001) return;
  const gy = ease(t, r0 + 0.05, 0.8, EXPO), ty = lerp(S.y(k.o), s.y, gy);   // the body grows out of its open
  o[0] = lerp(o[0], s.x + 0.7 * Math.sin(t * 1.3 + p.r2 * TAU), u); o[1] = lerp(o[1], ty, u);
  o[2] = lerp(o[2], s.r * (1 + 0.3 * boost), u); o[3] = lerp(o[3], (0.8 + 0.14 * Math.sin(t * 2 + p.r3 * TAU)) * (1 + 0.2 * boost), u);
  if (u > 0.3) o[4] = k.c >= k.o ? UP : DOWN;
}
/* shadows + hairline outlines of a series, growing as each candle is revealed */
function serArt(g, key, t, a, { outline = 0.28, glow = null, from = 0 } = {}) {
  const S = ser(key);
  g.save(); g.lineCap = 'round';
  for (let ci = from; ci < S.c.length; ci++) {
    const k = S.c[ci], r0 = S.rev(ci), rv = ease(t, r0 + 0.1, 0.9, SOFT) * a; if (rv <= 0.003) continue;
    const gw = ease(t, r0 + 0.05, 0.8, EXPO), yo = S.y(k.o), yc = lerp(yo, S.y(k.c), gw), top = Math.min(yo, yc), bot = Math.max(yo, yc, top + 5);
    const ws = ease(t, r0 + 0.35, 0.9, EXPO), col = k.c >= k.o ? RED : GRN;
    g.globalAlpha = rv * 0.85; g.strokeStyle = col; g.lineWidth = 1.3;
    g.beginPath(); g.moveTo(k.x, top); g.lineTo(k.x, lerp(top, S.y(k.hi), ws)); g.moveTo(k.x, bot); g.lineTo(k.x, lerp(bot, S.y(k.lo), ws)); g.stroke();
    if (outline > 0) { g.globalAlpha = rv * outline; g.lineWidth = 1; g.strokeRect(k.x - k.w / 2 - 2, top - 2, k.w + 4, bot - top + 4); }
    const gl = glow ? glow(ci, t) : 0;
    if (gl > 0) { g.globalAlpha = rv * gl; g.strokeStyle = C.goldHi; g.lineWidth = 1.2; g.strokeRect(k.x - k.w / 2 - 5, top - 5, k.w + 10, bot - top + 10); }
  }
  g.restore();
}

const FILM_FORM = {
  anat: (i, t, o) => fBig('anat', i, t, o), bRed: (i, t, o) => fBig('red', i, t, o), bGreen: (i, t, o) => fBig('green', i, t, o),
  bWick: (i, t, o) => fBig('wick', i, t, o), bDoji: (i, t, o) => fBig('doji', i, t, o),
  tZig: (i, t, o) => serPt('zig', i, t, o), tUp: (i, t, o) => serPt('up', i, t, o), tDown: (i, t, o) => serPt('down', i, t, o),
  tRange: (i, t, o) => {
    serPt('range', i, t, o);
    if (ser('range').slots[i]) return;
    const w4 = life(t, lt('trend', 4) - 0.2, WIN.trend[1] + 0.5, 1.4, 1.2);   // chips changing hands inside the box
    if (w4 <= 0) return;
    const S = ser('range'), p = P[i], x = 960 + 470 * Math.sin(t * (0.35 + p.r2 * 0.5) + p.r1 * TAU), y = lerp(S.y(S.rv) + 12, S.y(S.sv) - 12, p.r3) + 6 * Math.sin(t * 2 + p.r4 * 9);
    o[0] = lerp(o[0], x, w4); o[1] = lerp(o[1], y, w4); o[2] = lerp(o[2], 1.3, w4); o[3] = lerp(o[3], 0.3, w4); if (w4 > 0.5) o[4] = i % 2 ? UP : DOWN;
  },
  gTight: (i, t, o) => serPt('tight', i, t, o),
  gGrow: (i, t, o) => { const b = ease(t, lt('gain', 5) - 0.2, 1.6, SOFT); serPt('grow', i, t, o, 0.1 + 0.32 * b, b > 0.5 && i % 3 === 0 ? GOLDHI : GOLD, b); },
  lWide: (i, t, o) => serPt('wide', i, t, o),
  lShrink: (i, t, o) => serPt('shrink', i, t, o),
  lShift: (i, t, o) => {
    const p = P[i], col = t > lt('loss', 5) + 0.3 + p.r1 * 2.6 ? DOWN : t > lt('loss', 4) + 0.6 + p.r1 * 2.0 ? UP : GOLD;
    serPt('shift', i, t, o, 0.13, col);
  },
};
function FILM_SCHED() {
  return [
    [WIN.body[0] - 0.2, 'anat'], [lt('body', 2) - 0.6, 'bRed'], [lt('body', 3) - 0.6, 'bGreen'], [lt('body', 4) - 0.6, 'bWick'], [lt('body', 6) - 0.5, 'bDoji'],
    [WIN.trend[0] - 0.2, 'tZig'], [lt('trend', 1) - 0.6, 'tUp'], [lt('trend', 2) - 0.6, 'tDown'], [lt('trend', 3) - 0.5, 'tRange'],
    [WIN.gain[0] - 0.2, 'gTight'], [lt('gain', 3) - 0.5, 'gGrow'],
    [WIN.loss[0] - 0.2, 'lWide'], [lt('loss', 2) - 0.5, 'lShrink'], [lt('loss', 4) - 0.5, 'lShift'],
  ];
}

/* ---------- line-art helpers ---------- */
function bigOutline(g, B, a, p) {
  if (a <= 0.003) return;
  goldStroke(g, rectPts(B.cx - B.w / 2 - 7, B.bt - 7, B.w + 14, B.bb - B.bt + 14), p, { w: 1.2, a, glow: 0.35, close: true });
  goldStroke(g, [[B.cx, B.bt - 7], [B.cx, B.wt - 4]], p, { w: 1, a: a * 0.8, glow: 0.2 });
  goldStroke(g, [[B.cx, B.bb + 7], [B.cx, B.wb + 4]], p, { w: 1, a: a * 0.8, glow: 0.2 });
}
/* a labelled tick: dot on the candle, short leader, latin letter, Chinese name */
function tick(g, x, y, side, zh, lat, q, col = C.goldHi) {
  if (q <= 0.003) return;
  const L = 38, al = side < 0 ? 'right' : 'left';
  goldStroke(g, [[x, y], [x + side * L, y]], ease(q, 0, 1, SOFT), { w: 1, a: q * 0.85, glow: 0.2 });
  glowDot(g, x, y, 2.2, q);
  text(g, lat, x + side * (L + 12), y, { font: 'latin', italic: true, size: 26, color: C.gold, a: q, align: al, track: 0 });
  text(g, zh, x + side * (L + 42), y, { size: 24, weight: 600, color: col, a: q, align: al, track: 0.2 });
}
function arrowV(g, x, y0, y1, p, a, col) {          // a vertical arrow drawn as a shape
  const head = goldStroke(g, [[x, y0], [x, y1]], p, { w: 1.6, a, glow: 0.4, color: col }), d = Math.sign(y1 - y0);
  if (p > 0.95) goldStroke(g, [[x - 9, head[1] - d * 12], [x, head[1]], [x + 9, head[1] - d * 12]], 1, { w: 1.6, a: a * ease(p, 0.95, 0.05), glow: 0.3, color: col });
}
function cutX(pts, xm) {                             // a polyline clipped at x = xm (x-monotonic)
  const out = [pts[0]];
  for (let k = 1; k < pts.length; k++) {
    if (pts[k][0] <= xm) { out.push(pts[k]); continue; }
    const [x0, y0] = pts[k - 1], [x1, y1] = pts[k]; if (xm > x0) out.push([xm, lerp(y0, y1, (xm - x0) / (x1 - x0))]); break;
  }
  return out;
}
const dashed = (g, f, d = [8, 9]) => { g.save(); g.setLineDash(d); f(); g.restore(); };
const secA = (id, t) => ease(t, WIN[id][0] + 1.4, 1.0, SOFT) * (1 - ease(t, WIN[id][1] - 1.3, 0.9, SOFT));

/* ---------- 模块一 多空符号的解构 ---------- */
function artBody(g, t) {
  const A = secA('body', t); if (A <= 0) return;
  // anatomy (lines 0–1)
  const ea = A * life(t, lt('body', 0) - 0.2, lt('body', 2) - 0.2, 1.0, 0.8);
  if (ea > 0) {
    const B = BIG.anat, dim = life(t, lt('body', 1) - 0.4, le('body', 1) + 0.5, 0.7, 0.7);
    bigOutline(g, B, ea * (1 - 0.45 * dim), ease(t, lt('body', 0) + 1.0, 2.2, SOFT));
    const q0 = ea * life(t, lt('body', 0) + 1.6, le('body', 0) + 0.2, 0.9, 0.7);
    const L3 = [[B.cx - 10, (B.wt + B.bt) / 2, -1, '上影线', 'UPPER SHADOW'], [B.cx + B.w / 2 + 8, (B.bt + B.bb) / 2, 1, '实体', 'REAL BODY'], [B.cx - 10, (B.bb + B.wb) / 2, -1, '下影线', 'LOWER SHADOW']];
    L3.forEach(([x, y, s, zh, en], k) => {
      const q = q0 * ease(t, lt('body', 0) + 1.6 + k * 0.4, 0.9);
      goldStroke(g, [[x, y], [x + s * 60, y]], q, { w: 1, a: q * 0.8, glow: 0.2 }); glowDot(g, x, y, 2, q);
      text(g, zh, x + s * 74, y - 12, { size: 26, weight: 600, color: C.goldHi, a: q, align: s < 0 ? 'right' : 'left', track: 0.24 });
      text(g, en, x + s * 74, y + 20, { font: 'latin', size: 20, color: C.gold, a: q * 0.85, align: s < 0 ? 'right' : 'left', track: 0.3 });
    });
    const T = [[B.cx - B.w / 2 - 7, B.bb, -1, '开盘', 'O'], [B.cx + 6, B.wt, 1, '最高', 'H'], [B.cx + 6, B.wb, 1, '最低', 'L'], [B.cx - B.w / 2 - 7, B.bt, -1, '收盘', 'C']];
    T.forEach(([x, y, s, zh, en], k) => tick(g, x, y, s, zh, en, ea * ease(t, lt('body', 1) + 0.1 + k * 0.45, 0.9) * (1 - ease(t, lt('body', 2) - 0.9, 0.7, SOFT))));
  }
  // red (line 2) and green (line 3)
  for (const [key, k, dir, zhT, en, col] of [['red', 2, -1, '阳线', 'BULLISH', RED], ['green', 3, 1, '阴线', 'BEARISH', GRN]]) {
    const e = A * life(t, lt('body', k) + 0.6, lt('body', k + 1) - 0.25, 0.9, 0.7); if (e <= 0) continue;
    const B = BIG[key], up = dir < 0;
    bigOutline(g, B, e * 0.85, ease(t, lt('body', k) + 0.8, 1.6, SOFT));
    tick(g, B.cx + B.w / 2 + 7, up ? B.bb : B.bt, 1, '开盘', 'O', e * ease(t, lt('body', k) + 1.3, 0.9));
    tick(g, B.cx + B.w / 2 + 7, up ? B.bt : B.bb, 1, '收盘', 'C', e * ease(t, lt('body', k) + 1.9, 0.9));
    const ax = B.cx - B.w / 2 - 40;
    arrowV(g, ax, up ? B.bb : B.bt, up ? B.bt : B.bb, ease(t, lt('body', k) + 1.6, 1.4, SOFT), e, col);
    text(g, zhT, B.cx, B.wb + 44, { size: 30, weight: 700, color: col, a: e * ease(t, lt('body', k) + 1.2, 1), track: 0.4 });
    text(g, en, B.cx, B.wb + 80, { font: 'latin', size: 20, color: C.gold, a: e * 0.85 * ease(t, lt('body', k) + 1.5, 1), track: 0.45 });
  }
  // the extremes (lines 4–5)
  const ew = A * life(t, lt('body', 4) + 0.5, lt('body', 6) - 0.2, 0.9, 0.7);
  if (ew > 0) {
    const B = BIG.wick;
    bigOutline(g, B, ew * 0.8, ease(t, lt('body', 4) + 0.6, 1.6, SOFT));
    for (const [k, y, zh, en] of [[4, B.wt, '最高 · 多头冲锋的极限', 'HIGH'], [5, B.wb, '最低 · 空头打压的极限', 'LOW']]) {
      const q = ew * lon('body', k, 0.9, 0.8, -1.2, 0.5)(t); if (q <= 0) continue;
      const pulse = 0.5 + 0.5 * Math.sin(t * 3.2);
      glowDot(g, B.cx, y, 3.4 + 1.2 * pulse, q);
      goldStroke(g, arcPts(B.cx, y, 20 + 4 * pulse, 0, TAU, 40), q, { w: 1.1, a: q * 0.7, glow: 0.4 });
      goldStroke(g, [[B.cx + 26, y], [B.cx + 84, y]], q, { w: 1, a: q * 0.8, glow: 0.2 });
      text(g, zh, B.cx + 98, y, { size: 26, weight: 600, color: C.goldHi, a: q * ease(t, lt('body', k) + 1.5, 0.9), align: 'left', track: 0.14 });
      text(g, en, B.cx - 34, y, { font: 'latin', size: 22, color: C.gold, a: q * 0.85 * ease(t, lt('body', k) + 1.5, 0.9), align: 'right', track: 0.4 });
    }
  }
  // doji (lines 6–7)
  const ed = A * ease(t, lt('body', 6) + 0.6, 1.0, SOFT);
  if (ed > 0) {
    const B = BIG.doji, cy = (B.bt + B.bb) / 2, d = t - (lt('body', 7) + 0.4);
    bigOutline(g, B, ed * 0.85, ease(t, lt('body', 6) + 0.7, 1.6, SOFT));
    const q6 = ed * ease(t, lt('body', 6) + 1.2, 1.0) * (1 - ease(t, lt('body', 7) + 3.4, 0.8, SOFT));
    text(g, '十字星', B.cx + B.w / 2 + 34, cy - 14, { size: 30, weight: 700, color: C.goldHi, a: q6, align: 'left', track: 0.3 });
    text(g, 'DOJI', B.cx + B.w / 2 + 36, cy + 22, { font: 'latin', size: 22, color: C.gold, a: q6 * 0.85, align: 'left', track: 0.5 });
    text(g, '开盘 = 收盘', B.cx - B.w / 2 - 34, cy, { size: 24, color: C.ivory, a: q6 * 0.85 * ease(t, lt('body', 6) + 1.8, 1.0), align: 'right', track: 0.16 });
    const fight = ed * life(t, lt('body', 7) + 0.2, lt('body', 7) + 5.2, 0.8, 1.2);
    text(g, '多', B.cx, B.wt - 36, { size: 28, weight: 700, color: RED, a: fight, track: 0 });
    text(g, '空', B.cx, B.wb + 36, { size: 28, weight: 700, color: GRN, a: fight, track: 0 });
    const q7 = ed * ease(t, lt('body', 7) + 4.0, 1.2, SOFT);
    glowDot(g, B.cx, cy, 3 + Math.sin(t * 2), q7);
    text(g, '犹豫', B.cx + B.w / 2 + 34, cy - 14, { size: 30, weight: 700, color: C.goldHi, a: q7, align: 'left', track: 0.4 });
    text(g, 'INDECISION', B.cx + B.w / 2 + 36, cy + 22, { font: 'latin', size: 22, color: C.gold, a: q7 * 0.85, align: 'left', track: 0.4 });
  }
}

/* ---------- 模块二 秩序的轨迹 ---------- */
function swingArt(g, key, t, a, labs, lineCol) {
  const S = ser(key), sw = swingPts(S, S.piv), hi = [], lo = [];
  sw.forEach((s, j) => {
    const k = S.piv[j + 1][0], q = a * ease(t, S.rev(Math.min(S.c.length - 1, k + 1)) + 0.2, 0.8);
    if (q <= 0) return;
    (s.peak ? hi : lo).push([s.x, s.y + (s.peak ? -10 : 10)]);
    glowDot(g, s.x, s.y + (s.peak ? -10 : 10), 2.8, q);
    text(g, s.peak ? labs[0] : labs[1], s.x, s.y + (s.peak ? -38 : 40), { font: 'latin', size: 24, weight: 500, color: C.goldHi, a: q, track: 0.12 });
  });
  for (const pts of [hi, lo]) if (pts.length > 1) goldStroke(g, pts, 1, { w: 1.1, a: a * 0.7, glow: 0.3, color: lineCol });
}
function artTrend(g, t) {
  const A = secA('trend', t); if (A <= 0) return;
  // line 0: runs and pullbacks
  const ez = A * life(t, WIN.trend[0] + 1.4, lt('trend', 1) - 0.2, 1.0, 0.8);
  if (ez > 0) {
    const S = ser('zig'); serArt(g, 'zig', t, ez);
    const pts = S.piv.map(([k, v]) => [k ? S.c[k - 1].x : S.c[0].x - 15, S.y(v)]), xm = 315 + clamp((t - S.rev(0) - 0.7) / 0.115, 0, 44) * 30;
    goldStroke(g, cutX(pts, xm), 1, { w: 1.3, a: ez * 0.75, glow: 0.4, color: C.goldHi });
    const l1 = ez * ease(t, S.rev(14), 0.8), l2 = ez * ease(t, S.rev(20), 0.8);
    text(g, '冲锋', 300 + 14 * 30 - 46, S.y(lerp(118, 285, 3 / 7)) - 30, { size: 24, weight: 600, color: RED, a: l1, align: 'right', track: 0.3 });
    text(g, '回调', 300 + 20 * 30 + 30, S.y(240) + 66, { size: 24, weight: 600, color: GRN, a: l2, align: 'left', track: 0.3 });
  }
  // line 1: uptrend (right half) / line 2: downtrend (left half)
  const eu = A * life(t, lt('trend', 1) + 0.0, lt('trend', 2) - 0.25, 0.9, 0.7);
  if (eu > 0) {
    serArt(g, 'up', t, eu); swingArt(g, 'up', t, eu, ['HH', 'HL'], C.goldHi);
    text(g, 'HIGHER HIGHS · HIGHER LOWS', 1390, 800, { font: 'latin', size: 20, color: C.gold, a: eu * 0.85 * ease(t, lt('trend', 1) + 1.6, 1), track: 0.4 });
  }
  const ed = A * life(t, lt('trend', 2) + 0.0, lt('trend', 3) - 0.25, 0.9, 0.7);
  if (ed > 0) {
    serArt(g, 'down', t, ed); swingArt(g, 'down', t, ed, ['LH', 'LL'], C.goldHi);
    text(g, 'LOWER HIGHS · LOWER LOWS', 540, 800, { font: 'latin', size: 20, color: C.gold, a: ed * 0.85 * ease(t, lt('trend', 2) + 1.6, 1), track: 0.4 });
  }
  // lines 3–4: the range
  const er = A * ease(t, lt('trend', 3) + 0.1, 0.9, SOFT);
  if (er > 0) {
    const S = ser('range'); serArt(g, 'range', t, er);
    const p = ease(t, lt('trend', 3) + 0.4, 1.8, SWIFT), yR = S.y(S.rv), yS = S.y(S.sv);
    dashed(g, () => {
      goldStroke(g, [[450, yR], [1480, yR]], p, { w: 1.3, a: er * 0.8, glow: 0, color: C.goldHi });
      goldStroke(g, [[450, yS], [1480, yS]], p, { w: 1.3, a: er * 0.8, glow: 0, color: C.goldHi });
    });
    const ql = er * ease(t, lt('trend', 3) + 1.6, 1.0);
    text(g, '阻力', 1504, yR - 12, { size: 26, weight: 600, color: C.goldHi, a: ql, align: 'left', track: 0.3 });
    text(g, 'RESISTANCE', 1506, yR + 20, { font: 'latin', size: 20, color: C.gold, a: ql * 0.85, align: 'left', track: 0.3 });
    text(g, '支撑', 1504, yS - 12, { size: 26, weight: 600, color: C.goldHi, a: ql, align: 'left', track: 0.3 });
    text(g, 'SUPPORT', 1506, yS + 20, { font: 'latin', size: 20, color: C.gold, a: ql * 0.85, align: 'left', track: 0.3 });
    const q4 = er * lon('trend', 4, 1.2, 0.9, -0.8, 0.4)(t);
    text(g, '泥潭战', 960, yS + 96, { size: 34, weight: 600, color: C.ivory, a: q4 * 0.55, track: 0.9 });
  }
}

/* ---------- 模块三 动能增强 ---------- */
function artGain(g, t) {
  const A = secA('gain', t); if (A <= 0) return;
  const e1 = A * life(t, WIN.gain[0] + 1.4, lt('gain', 3) - 0.2, 1.0, 0.8);
  if (e1 > 0) {
    const S = ser('tight'); serArt(g, 'tight', t, e1);
    // the narrow channel around the run
    const run = S.c.slice(8), x0 = run[0].x - 26, x1 = run[17].x + 26, m0 = (run[0].o + run[0].c) / 2, m1 = (run[17].o + run[17].c) / 2;
    const vAt = x => lerp(m0, m1, (x - run[0].x) / (run[17].x - run[0].x));
    let hw = 0; run.forEach(k => { hw = Math.max(hw, k.hi - vAt(k.x), vAt(k.x) - k.lo); }); hw += 8;
    const cp = ease(t, S.rev(8), S.rev(25) - S.rev(8) + 0.6, SOFT), q = e1 * ease(t, lt('gain', 1) + 0.2, 0.8);
    for (const s of [1, -1]) goldStroke(g, [[x0, S.y(vAt(x0) + s * hw)], [x1, S.y(vAt(x1) + s * hw)]], cp, { w: 1.2, a: q * 0.85, glow: 0.4 });
    const pulse = lon('gain', 2, 0.8, 0.8, 0, 0.3)(t) * e1;
    if (pulse > 0) {                                // line 2: the channel holds; light runs along it unopposed
      const u = ((t - lt('gain', 2)) * 0.45) % 1, x = lerp(x0, x1, u);
      for (const s of [1, -1]) glowDot(g, x, S.y(vAt(x) + s * hw), 3, pulse * Math.sin(Math.PI * u));
      g.save(); g.globalAlpha = pulse * 0.07; g.fillStyle = C.goldHi; g.beginPath();
      g.moveTo(x0, S.y(vAt(x0) + hw)); g.lineTo(x1, S.y(vAt(x1) + hw)); g.lineTo(x1, S.y(vAt(x1) - hw)); g.lineTo(x0, S.y(vAt(x0) - hw)); g.closePath(); g.fill(); g.restore();
    }
    const lx = run[4].x - 40, ly = S.y(vAt(run[4].x) + hw) - 92, ql = q * ease(t, lt('gain', 1) + 1.0, 1.0);
    text(g, '紧凑排列', lx, ly, { size: 30, weight: 700, color: C.goldHi, a: ql, track: 0.36 });
    text(g, 'TIGHT', lx, ly + 36, { font: 'latin', size: 22, color: C.gold, a: ql * 0.85, track: 0.6 });
  }
  const e2 = A * ease(t, lt('gain', 3) + 0.1, 0.9, SOFT);
  if (e2 > 0) {
    const b = ease(t, lt('gain', 5) - 0.2, 1.6, SOFT);
    serArt(g, 'grow', t, e2, { glow: (c, tt) => (c < 9 ? c : c - 9) / 8 * (0.55 + 0.3 * b) * (0.8 + 0.2 * Math.sin(tt * 3 + c)) });
    const ql = e2 * ease(t, lt('gain', 3) + 0.9, 1.0);
    text(g, '实体放大', 960, 284, { size: 30, weight: 700, color: C.goldHi, a: ql, track: 0.36 });
    text(g, 'GROWING', 960, 320, { font: 'latin', size: 22, color: C.gold, a: ql * 0.85, track: 0.6 });
    text(g, '买盘疯狂', 400, 420, { size: 28, weight: 700, color: RED, a: e2 * ease(t, lt('gain', 4) + 0.5, 1.0), track: 0.3 });
    text(g, '恐慌抛售', 1520, 420, { size: 28, weight: 700, color: GRN, a: e2 * ease(t, lt('gain', 4) + 2.6, 1.0), track: 0.3 });
    if (b > 0) text(g, 'MOMENTUM AT ITS PEAK', 960, 760, { font: 'latin', size: 20, color: C.goldHi, a: e2 * b * 0.8, track: 0.5 });
  }
}

/* ---------- 模块四 动能衰竭 ---------- */
function artLoss(g, t) {
  const A = secA('loss', t); if (A <= 0) return;
  const e1 = A * life(t, WIN.loss[0] + 1.4, lt('loss', 2) - 0.2, 1.0, 0.8);
  if (e1 > 0) {
    const S = ser('wide'); serArt(g, 'wide', t, e1);
    const run = S.c.slice(0, 12), x0 = run[0].x - 20, x1 = run[11].x + 20, sl = (run[11].c - run[0].o) / (run[11].x - run[0].x);
    const vAt = x => run[0].o + (x - run[0].x) * sl;
    // the tight run's channel: drawn with the run, then the swings tear out of it
    const cp = ease(t, S.rev(0), S.rev(11) - S.rev(0) + 0.6, SOFT);
    for (const s of [1, -1]) goldStroke(g, [[x0, S.y(vAt(x0) + s * 22)], [x1, S.y(vAt(x1) + s * 22)]], cp, { w: 1.1, a: e1 * 0.6, glow: 0.3 });
    const ql = e1 * ease(t, lt('loss', 0) + 2.6, 1.0);
    text(g, '宽幅震荡', 1080, 256, { size: 30, weight: 700, color: C.goldHi, a: ql, track: 0.36 });
    text(g, 'WIDE SWINGS', 1080, 292, { font: 'latin', size: 22, color: C.gold, a: ql * 0.85, track: 0.5 });
    const q1 = e1 * lon('loss', 1, 0.8, 0.8, -0.2, 0.3)(t);   // line 1: the long shadows flare — the other side hits back
    if (q1 > 0) S.c.slice(12).forEach((k, m) => {
      const pu = 0.6 + 0.4 * Math.sin(t * 3 + m);
      glowDot(g, k.x, S.y(k.hi), 2.4, q1 * pu * ease(t, lt('loss', 1) + m * 0.12, 0.6));
      glowDot(g, k.x, S.y(k.lo), 2.4, q1 * pu * ease(t, lt('loss', 1) + m * 0.12, 0.6));
    });
  }
  const e2 = A * life(t, lt('loss', 2) + 0.0, lt('loss', 4) - 0.2, 0.9, 0.8);
  if (e2 > 0) {
    const S = ser('shrink'); serArt(g, 'shrink', t, e2);
    S.c.forEach((k, j) => {                         // the step each candle gains, fading as the run tires
      const q = e2 * ease(t, S.rev(j) + 0.5, 0.8) * (0.95 - j * 0.07); if (q <= 0) return;
      const x = k.x + k.w / 2 + 12, ya = S.y(j ? S.c[j - 1].c : k.o), yb = S.y(k.c);
      goldStroke(g, [[x - 5, ya], [x, ya], [x, yb], [x - 5, yb]], ease(t, S.rev(j) + 0.5, 0.8, SOFT), { w: 1.3, a: q, glow: 0.3, color: C.goldHi });
    });
    const ql = e2 * ease(t, lt('loss', 2) + 1.0, 1.0);
    text(g, '实体缩小', 1160, 540, { size: 30, weight: 700, color: C.goldHi, a: ql, track: 0.36 });
    text(g, 'SHRINKING', 1160, 576, { font: 'latin', size: 22, color: C.gold, a: ql * 0.85, track: 0.5 });
    const q3 = e2 * ease(t, lt('loss', 3) - 0.1, 0.9);
    if (q3 > 0) {                                   // line 3: the curve of progress flattens out
      const pts = []; for (let k = 0; k <= 60; k++) { const u = k / 60, x = lerp(S.c[0].x, S.c[9].x + 40, u), j = clamp((x - S.c[0].x) / 72, 0, 9), j0 = Math.floor(j), f = j - j0; pts.push([x, S.y(lerp(S.c[j0].c, S.c[Math.min(9, j0 + 1)].c, f)) - 26]); }
      goldStroke(g, pts, ease(t, lt('loss', 3), 2.0, SOFT), { w: 1.4, a: q3 * 0.8, glow: 0.4, color: C.ivory });
      text(g, '后劲不足', S.c[9].x + 60, S.y(S.c[9].c) - 26, { size: 26, weight: 600, color: C.ivory, a: q3 * ease(t, lt('loss', 3) + 1.6, 1), align: 'left', track: 0.3 });
    }
  }
  const e3 = A * ease(t, lt('loss', 4) + 0.1, 0.9, SOFT);
  if (e3 > 0) {
    const S = ser('shift'); serArt(g, 'shift', t, e3);
    const k0 = S.c[0], k7 = S.c[7], k8 = S.c[8], sl = (k7.lo - k0.lo) / (k7.x - k0.x), lv = x => k0.lo - 6 + (x - k0.x) * sl;
    // the trend line under the run
    const tp = ease(t, S.rev(1), S.rev(7) - S.rev(1) + 0.6, SOFT), xb = k8.x;
    goldStroke(g, [[k0.x - 30, S.y(lv(k0.x - 30))], [xb, S.y(lv(xb))]], tp, { w: 1.4, a: e3 * 0.8, glow: 0.4, color: C.goldHi });
    // the failed high
    const fq = e3 * ease(t, S.rev(8) + 0.4, 0.9);
    if (fq > 0) {
      dashed(g, () => goldStroke(g, [[k7.x - 30, S.y(k7.hi)], [k8.x + 110, S.y(k7.hi)]], ease(t, S.rev(8) + 0.4, 0.9, SOFT), { w: 1.3, a: fq * 0.9, glow: 0, color: C.goldHi }));
      goldStroke(g, [[k8.x + 14, S.y(k7.hi) + 3], [k8.x + 14, S.y(k8.hi)]], fq, { w: 1.2, a: fq * 0.8, glow: 0.2, color: GRN });
      text(g, '未创新高', k8.x + 124, S.y(k7.hi), { size: 28, weight: 700, color: GRN, a: fq * ease(t, S.rev(8) + 0.8, 0.9), align: 'left', track: 0.3 });
      text(g, 'FAILED HIGH', k8.x + 126, S.y(k7.hi) + 34, { font: 'latin', size: 20, color: C.gold, a: fq * 0.85 * ease(t, S.rev(8) + 1.0, 0.9), align: 'left', track: 0.4 });
    }
    // line 5: the line snaps; its old path fades on as a broken dash
    const bq = e3 * ease(t, lt('loss', 5) + 0.2, 1.0);
    if (bq > 0) {
      const xe = S.c[11].x + 40;
      dashed(g, () => goldStroke(g, [[xb, S.y(lv(xb))], [xe, S.y(lv(xe))]], ease(t, lt('loss', 5) + 0.3, 1.4, SOFT), { w: 1.2, a: bq * 0.6, glow: 0, color: C.goldHi }), [3, 9]);
      glowDot(g, xb, S.y(lv(xb)), 3.5 + Math.sin(t * 4), bq);
      text(g, '惯性中断', S.c[11].x + 44, S.y(S.c[10].c), { size: 26, weight: 600, color: C.goldHi, a: bq * ease(t, lt('loss', 5) + 1.0, 1.0), align: 'left', track: 0.3 });
    }
  }
}
const FILM_ART = { body: artBody, trend: artTrend, gain: artGain, loss: artLoss };

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
  // a ticker ribbon drifting along the horizon
  const R = rng(5);
  for (let k = 0; k < 16; k++) {
    const x = ((k * 160 + t * 40) % 2560) - 320, v = (32 + R() * 4).toFixed(2), up = R() > 0.45;
    text(g, v, x, 404 + (k % 2) * 16, { font: 'latin', size: 20, color: up ? '#E08A7E' : '#8FC0A6', a: a * 0.5, track: 0.04 });
  }
  goldStroke(g, [[0, 430], [1920, 430]], ease(t, 0.4, 2.2, SOFT), { w: 1, a: a * 0.5, glow: 0.4 });
  // line 2: a few points of the lattice warm to red (bulls), then a few cool to green (bears)
  const gl = life(t, lt('open', 2) - 0.2, le('open', 2) + 0.4, 1.0, 1.0);
  if (gl > 0) {
    const o = [0, 0, 0, 0, 0];
    GLINT.forEach(([i, col, d]) => {
      fLattice(i, t, o);
      const q = gl * ease(t, lt('open', 2) + d, 1.3, SOFT) * (0.75 + 0.25 * Math.sin(t * 2.2 + i));
      dot(g, o[0], o[1], o[2] * 2.1, q * clamp(0.45 + o[3] * 1.8), col);
    });
    g.globalAlpha = 1;
  }
}
const GLINT = (() => { const R = rng(91), out = [];
  for (let k = 0; k < 12; k++) out.push([(2 + Math.floor(R() * 8)) * 30 + 3 + Math.floor(R() * 10), UP, 0.3 + k * 0.12]);
  for (let k = 0; k < 12; k++) out.push([(2 + Math.floor(R() * 8)) * 30 + 17 + Math.floor(R() * 10), DOWN, 2.1 + k * 0.12]);
  return out; })();
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

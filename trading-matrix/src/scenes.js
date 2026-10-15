'use strict';
/* 《交易的矩阵》 — scene choreography. Pure functions of t.
   One persistent field of 720 light points (the "matrix") re-forms into every diagram, so the film never cuts:
   lattice → balance → payoff histogram → light grid → beauty contest → colliding order flow → four rings → dimension diagrams. */

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

/* ---------- spotlight ---------- */
function spotAt(t) {
  const W = WIN, K = [
    [0, 0.3, 1], [W.open[1] - 1.0, 0.45, 1], [W.open[1] + 0.6, 1, 1], [W.title[1], 0.85, 1], [W.p1[1], 0.6, 1],
    [W.risk[0] + 1.0, 0.95, 1], [W.flow[1], 0.95, 1.05], [W.p2[0] + 1.0, 0.55, 1], [W.rings[0] + 1.0, 0.8, 1.15],
    [W.self[1] - 2.0, 0.8, 1.15], [W.finale[0] + 1.4, 0.0, 0.8], [1e9, 0, 0.8],
  ];
  let i = 0; while (i + 1 < K.length && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)], u = b[0] > a[0] ? SOFT(seg(t, a[0], b[0])) : 0;
  return { spot: lerp(a[1], b[1], u), width: lerp(a[2], b[2], u) };
}
const inWin = (t, id, pre = 0.6, post = 0.6) => t > WIN[id][0] - pre && t < WIN[id][1] + post;

/* =====================================================================
   FORMATIONS — each returns [x, y, radius, alpha, colour] for particle i at time t
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

/* gold balance: state shared by the particles (pans) and the line-art */
function balanceState(t) {
  const lo = id => lt('risk', id), W = WIN.risk;
  const tilt = 0.22 * Math.sin(Math.PI * seg(t, lo(2) + 0.2, lo(2) + 0.2 + (le('risk', 2) - lo(2)) * 0.5)) - 0.22 * Math.sin(Math.PI * seg(t, lo(2) + 0.2 + (le('risk', 2) - lo(2)) * 0.5, le('risk', 2) + 0.2));
  const settle = 0.03 * Math.sin(t * 0.9) * (1 - Math.abs(tilt) * 4);
  const ang = tilt + settle;
  const fade = ease(t, W[0] + 1.5, 1.4, SOFT) * (1 - ease(t, lo(4) - 0.6, 1.2, SOFT));
  const cx = 960, cy = 470, half = 330;
  const L = [cx - Math.cos(ang) * half, cy - Math.sin(ang) * half], R = [cx + Math.cos(ang) * half, cy + Math.sin(ang) * half];
  return { ang, fade, cx, cy, half, L, R, pl: [L[0], L[1] + 120], pr: [R[0], R[1] + 120] };
}
function fBalance(i, t, o) {
  const B = balanceState(t), p = P[i], g = i % 8;
  const detach = life(t, lt('risk', 1) + 0.2, le('risk', 1) + 0.2, 0.9, 1.0);
  if (g === 0) {                                   // risk: a restless cloud in the left pan
    const k = Math.floor(i / 8), ph = p.r1 * TAU + t * (0.8 + p.r2 * 1.4), rad = 18 + p.r3 * 44;
    o[0] = B.pl[0] + Math.cos(ph) * rad; o[1] = B.pl[1] - 46 + Math.sin(ph * 1.3) * rad * 0.5 - detach * (60 + p.r4 * 160);
    o[2] = 1.6 + p.r5 * 1.4; o[3] = (0.5 + 0.4 * Math.sin(t * 3 + k)) * B.fade * (1 - detach); o[4] = IVORY;
  } else if (g === 1) {                            // return: a stack of coins in the right pan
    const k = Math.floor(i / 8), col = k % 10, row = Math.floor(k / 10);
    o[0] = B.pr[0] - 45 + col * 10 + (row % 2) * 5; o[1] = B.pr[1] - 14 - row * 9 + detach * (90 + p.r4 * 120);
    o[2] = 2.4; o[3] = 0.9 * B.fade * (1 - detach); o[4] = GOLDHI;
  } else {                                         // a slow orbit of uncertainty around the scale
    const th = p.r3 * TAU + t * 0.06 * (0.5 + p.r4), rx = 620 + p.r1 * 180, ry = 200 + p.r2 * 90;
    o[0] = 960 + Math.cos(th) * rx; o[1] = 500 + Math.sin(th) * ry; o[2] = 1.1 + p.r5 * 1.2; o[3] = 0.16 + 0.12 * Math.sin(t + p.r6 * TAU); o[4] = GOLD;
  }
}

/* asymmetric payoff: losses capped at −1R, a long right tail of wins */
const PAYX = R => 820 + R * 150, PAYY = 780;
let PAY_ = null;
function payoffLayout() {
  if (PAY_) return PAY_;
  const bins = {}, out = [];
  for (let j = 0; j < 360; j++) {
    const p = P[j * 2], win = p.r2 > 0.62;
    const R = win ? Math.min(6.2, -Math.log(1 - p.r3 * 0.985) * 1.45) : -1 + p.r3 * 0.98;
    const b = Math.floor((R + 1) * 2);              // 0.5R bins from −1R
    bins[b] = (bins[b] || 0) + 1; out.push({ R, b, slot: bins[b] - 1, win });
  }
  return (PAY_ = out);
}
function fPayoff(i, t, o) {
  if (i % 2) { const p = P[i]; o[0] = 200 + p.r1 * 1520; o[1] = 280 + p.r2 * 420 + Math.sin(t * 0.3 + p.r3 * 9) * 12; o[2] = 1 + p.r4; o[3] = 0.1; o[4] = GOLD; return; }
  const d = payoffLayout()[i / 2], cols = 6, bx = 820 - 150 + (d.b + 0.5) * 75;
  const rise = ease(t, lt('risk', 4) + (d.win ? 0.4 : 0) + d.slot * 0.008, 1.4, EXPO);
  o[0] = bx + ((d.slot % cols) - 2.5) * 11.5; o[1] = PAYY - 9 - Math.floor(d.slot / cols) * 11.5 * rise;
  const hl = d.win ? lon('risk', 5, 0.8, 1.0, 0.1, 1.2)(t) * (d.R > 2 ? 1 : 0.4) : 0;
  const dim = 1 - 0.55 * ease(t, lt('risk', 6) - 0.2, 1.0, SOFT);
  o[2] = d.win ? 2.5 + hl * 1.2 : 2.2; o[3] = (d.win ? 0.95 : 0.55) * dim; o[4] = d.win ? GOLDHI : IVORY;
}

/* light matrix: 36 × 20 cells; the crowd's moods are fields over it */
function gridPlace(t) {
  // slide aside for side-column text: right for L lines, left for R lines
  let cx = 960, sc = 1;
  for (const k of [2, 3]) { const w = life(t, lt('crowd', k) - 0.6, le('crowd', k) + 0.4, 1.0, 1.0); const side = L_('crowd', k).pos === 'L' ? 1 : -1; cx += side * 300 * w; sc -= 0.22 * w; }
  return { cx, sc };
}
const CANDLES = (() => { const R = rng(4242), out = []; let p = 10; for (let c = 0; c < 36; c++) { const o = p, cl = o + (R() - 0.47) * 3.2, hi = Math.max(o, cl) + R() * 1.6, lo = Math.min(o, cl) - R() * 1.6; out.push({ o, c: cl, hi, lo }); p = cl; } return out; })();
const MOODS = [{ c: 2, r: 2, col: UP, name: '贪婪' }, { c: 33, r: 2, col: GOLDHI, name: '期待' }, { c: 2, r: 17, col: DOWN, name: '恐惧' }, { c: 33, r: 17, col: TEAL, name: '绝望' }];
function devPrice(c, t) { return 9.5 - 6.5 * Math.sin(c * 0.28 + 0.6) * Math.exp(-Math.pow((c - 18) / 16, 2)) - 1.2 * Math.sin(c * 0.9 + t * 0.6); }
function fGrid(i, t, o) {
  const c = i % 36, r = Math.floor(i / 36), G = gridPlace(t), p = P[i];
  o[0] = G.cx + (c - 17.5) * 36.5 * G.sc; o[1] = 512 + (r - 9.5) * 26 * G.sc;
  const base = 0.1 + 0.06 * Math.sin(c * 0.4 + r * 0.3 + t * 1.1);
  let b = base, col = GOLD;
  // phase 0: candles woven from light
  const w0 = life(t, WIN.crowd[0] + 0.6, le('crowd', 0) + 0.6, 1.2, 1.0);
  if (w0 > 0) {
    const k = CANDLES[c], row = v => 19 - (v - 4) * 1.6, reveal = ease(t, WIN.crowd[0] + 0.8 + c * 0.06, 0.7);
    const top = row(Math.max(k.o, k.c)), bot = row(Math.min(k.o, k.c)), wt = row(k.hi), wb = row(k.lo);
    const inBody = r >= top - 0.5 && r <= bot + 0.5, inWick = r >= wt - 0.5 && r <= wb + 0.5;
    const v = inBody ? 1 : inWick ? 0.45 : 0;
    b = lerp(b, base * 0.6 + v * 0.95 * reveal, w0); if (v) col = k.c >= k.o ? UP : DOWN;
  }
  // phase 1: four moods ripple across the matrix
  const w1 = life(t, lt('crowd', 1) - 0.4, le('crowd', 1) + 0.5, 1.0, 1.0);
  if (w1 > 0) {
    let best = 0, bc = GOLD;
    MOODS.forEach((m, j) => { const d = Math.hypot(c - m.c, (r - m.r) * 1.4); const on = ease(t, lt('crowd', 1) + j * 0.35, 0.8); const v = on * (0.5 + 0.5 * Math.sin(d * 0.7 - t * 4 + j)) * Math.exp(-d / 11); if (v > best) { best = v; bc = m.col; } });
    b = lerp(b, base * 0.5 + best, w1); if (best > 0.12) col = bc;
  }
  // phase 2 + 5 + 6: price drifting around value (crowd psychology vs value)
  const w2 = Math.max(life(t, lt('crowd', 2) - 0.3, le('crowd', 2) + 0.3, 1.0, 1.0), life(t, lt('crowd', 5) - 0.3, WIN.crowd[1] + 0.4, 1.0, 1.0));
  if (w2 > 0) {
    const pr = devPrice(c, t), dv = Math.abs(r - pr), val = Math.abs(r - 9.5);
    const v = Math.exp(-dv * dv / 0.6) * 1.0 + (val < 0.5 && (c % 2 === 0) ? 0.5 : 0);
    b = lerp(b, base * 0.6 + v, w2); if (dv < 1) col = GOLDHI; else if (val < 0.5) col = IVORY;
  }
  // phase 3: mountains, as old as speculation
  const w3 = life(t, lt('crowd', 3) - 0.3, le('crowd', 3) + 0.3, 1.0, 1.0);
  if (w3 > 0) {
    const ridge = 19 - (9 * Math.exp(-Math.pow((c - 10) / 6, 2)) + 13 * Math.exp(-Math.pow((c - 21) / 5, 2)) + 7 * Math.exp(-Math.pow((c - 30) / 4.5, 2)));
    const rise = ease(t, lt('crowd', 3) + c * 0.02, 1.4, EXPO), rr = lerp(20, ridge, rise);
    const v = r >= rr ? 0.35 + 0.5 * Math.exp(-(r - rr) / 2.5) : 0;
    b = lerp(b, base * 0.5 + v, w3); if (v > 0) col = r - rr < 1.2 ? IVORY : GOLD;
  }
  o[2] = 1.6 + b * 1.6; o[3] = clamp(b) * (0.85 + 0.15 * Math.sin(t * 2 + p.r1 * TAU)); o[4] = col;
}

/* Keynes's beauty contest: six portraits, the crowd's votes swarm to the face the crowd will pick */
const FRAMES = [0, 1, 2, 3, 4, 5].map(j => [560 + j * 160, 470]);
function fContest(i, t, o) {
  const p = P[i], t0 = lt('crowd', 4), dur = le('crowd', 4) - t0;
  if (i < 300) {                                   // the portraits' oval outlines
    const j = Math.floor(i / 50), k = i % 50, th = k / 50 * TAU, [fx, fy] = FRAMES[j];
    o[0] = fx + Math.cos(th) * 52; o[1] = fy + Math.sin(th) * 66; o[2] = 1.5; o[3] = 0.55; o[4] = GOLD; return;
  }
  if (i >= 660) { o[0] = 200 + p.r1 * 1520; o[1] = 300 + p.r2 * 400; o[2] = 1; o[3] = 0.08; o[4] = GOLD; return; }
  const mine = 1, crowd = 4, sw = ease(t, t0 + dur * 0.42 + p.r1 * 0.9, 1.4, SWIFT);
  const scatter = p.r2 < 0.18 ? Math.floor(p.r3 * 6) : -1;
  const jA = scatter >= 0 ? scatter : mine, jB = p.r2 < 0.08 ? Math.floor(p.r3 * 6) : crowd;
  const th = p.r4 * TAU + t * (0.5 + p.r5 * 0.6), rad = 84 + p.r6 * 34;
  const A = [FRAMES[jA][0] + Math.cos(th) * rad * 0.8, FRAMES[jA][1] + Math.sin(th) * rad], Bp = [FRAMES[jB][0] + Math.cos(th) * rad * 0.8, FRAMES[jB][1] + Math.sin(th) * rad];
  o[0] = lerp(A[0], Bp[0], sw); o[1] = lerp(A[1], Bp[1], sw) - Math.sin(Math.PI * sw) * 80;
  o[2] = 1.7; o[3] = 0.75; o[4] = sw > 0.5 ? GOLDHI : IVORY;
}

/* supply & demand: two order streams collide at the price */
let PRICE_ = null;
function flowDS(t) {
  const W = WIN.flow, k3 = lt('flow', 3), k3e = le('flow', 3), mid = (k3 + k3e) / 2;
  let D = 0.62 + 0.06 * Math.sin(t * 0.8), S = 0.62 + 0.06 * Math.sin(t * 0.7 + 1);
  const up = life(t, k3 - 0.2, mid, 0.8, 0.6), dn = life(t, mid, k3e + 0.6, 0.6, 0.8);
  D += 0.36 * up - 0.24 * dn; S += -0.24 * up + 0.36 * dn;
  const of = life(t, lt('flow', 5) - 0.3, W[1] + 0.6, 1, 1);
  D += 0.1 * of * Math.sin(t * 1.3); S += 0.1 * of * Math.sin(t * 1.3 + 2);
  return { D, S };
}
function priceY(t) {
  if (!PRICE_) {                                   // integrate dP/dt ∝ (D − S) once over the flow window
    const a = WIN.flow[0] - 1, b = WIN.flow[1] + 2, n = Math.ceil((b - a) * 60); PRICE_ = { a, arr: new Float32Array(n + 1) };
    let y = 560; for (let k = 0; k <= n; k++) { const tt = a + k / 60, { D, S } = flowDS(tt); y += -(D - S) * 115 / 60 + (560 - y) * 0.004; PRICE_.arr[k] = y; }
  }
  const k = clamp((t - PRICE_.a) * 60, 0, PRICE_.arr.length - 1), i0 = Math.floor(k), f = k - i0;
  return lerp(PRICE_.arr[i0], PRICE_.arr[Math.min(i0 + 1, PRICE_.arr.length - 1)], f);
}
function streamPt(i, t, Px, Py, D, S, spread = 1, o) {
  const p = P[i], buy = i % 2 === 0, act = buy ? D : S;
  const sp = 0.2 + p.r3 * 0.22 + act * 0.18, u = ((t * sp + p.r4) % 1 + 1) % 1;
  const sx = buy ? Px - 1100 * spread : Px + 1100 * spread, sy = Py - 300 * spread + p.r5 * 600 * spread;
  const ctrl = [buy ? Px - 380 * spread : Px + 380 * spread, (sy + Py) / 2 + (p.r6 - 0.5) * 120];
  const end = [Px + (buy ? -4 : 4), Py + (p.r6 - 0.5) * 16], q = qbez([sx, sy], ctrl, end, Math.pow(u, 1.25));
  const on = p.r2 < act ? 1 : 0;
  o[0] = q[0]; o[1] = q[1]; o[2] = 1.4 + u * 1.4; o[3] = on * (0.15 + 0.75 * Math.pow(u, 2.2)) * (u > 0.97 ? (1 - u) / 0.03 : 1); o[4] = buy ? UP : DOWN;
}
function fCollide(i, t, o) { const { D, S } = flowDS(t); streamPt(i, t, 960, priceY(t), D, S, 1, o); }
function fCollide2(i, t, o) {
  const a = lt('flow', 4), g = i % 4 < 2;          // two panels: a fine asset nobody bids for, junk that the money chases
  const rk = ease(t, a + 0.4, le('flow', 4) - a, SOFT);
  if (g) streamPt(i, t, 640, 560, 0.18, 0.42, 0.42, o); else streamPt(i, t, 1290, lerp(660, 330, rk), 0.98, 0.25, 0.42, o);
}

/* four concentric geometric rings (outer circle, octagon, hexagon, core circle) */
const RINGS = [{ n: 160, R: 430, sides: 0, rot: 0.02 }, { n: 100, R: 330, sides: 8, rot: -0.03 }, { n: 70, R: 232, sides: 6, rot: 0.045 }, { n: 30, R: 120, sides: 0, rot: -0.06 }];
const RING_OF = (() => { const a = []; RINGS.forEach((r, k) => { for (let j = 0; j < r.n; j++) a.push([k, j / r.n]); }); return a; })();
function polyPt(sides, R, s, rot) {
  if (!sides) { const th = s * TAU + rot; return [Math.cos(th) * R, Math.sin(th) * R]; }
  const e = s * sides, k = Math.floor(e), f = e - k, a0 = k / sides * TAU + rot - Math.PI / 2, a1 = (k + 1) / sides * TAU + rot - Math.PI / 2;
  return [lerp(Math.cos(a0), Math.cos(a1), f) * R, lerp(Math.sin(a0), Math.sin(a1), f) * R];
}
function ringFocus(t) {                            // which ring the beam is on (0 = outer … 3 = core)
  if (t < WIN.prob[0]) return 3 * ease(t, lt('rings', 0) - 0.2, le('rings', 0) - lt('rings', 0) + 0.6, SOFT);
  const ids = ['prob', 'expect', 'liquid', 'self']; let f = 0;
  ids.forEach((id, k) => { if (t > WIN[id][0] - 0.4) f = lerp(f, k, ease(t, WIN[id][0] - 0.4, 1.4, SWIFT)); });
  return f;
}
function ringPlace(t) { const m = ease(t, WIN.prob[0] - 0.4, 2.0, SWIFT); return { cx: lerp(960, 470, m), cy: lerp(540, 560, m), sc: lerp(1, 0.6, m) }; }
function ringPt(i, t, o) {
  const [k, s] = RING_OF[i], Rg = RINGS[k], pl = ringPlace(t), fk = ringFocus(t), beam = t * 1.5;
  const [x, y] = polyPt(Rg.sides, Rg.R, s, t * Rg.rot);
  const th = Math.atan2(y, x), dth = Math.atan2(Math.sin(th - beam), Math.cos(th - beam));
  const focus = Math.exp(-Math.pow(k - fk, 2) / 0.25), sweep = Math.exp(-dth * dth / 0.12) * (0.3 + 0.7 * focus);
  o[0] = pl.cx + x * pl.sc; o[1] = pl.cy + y * pl.sc; o[2] = (1.5 + focus * 1.0 + sweep * 1.2) * (0.75 + 0.25 * pl.sc);
  o[3] = 0.22 + 0.5 * focus + 0.5 * sweep; o[4] = focus > 0.5 ? GOLDHI : GOLD;
}
function fRings(i, t, o) {
  if (i < 360) return ringPt(i, t, o);
  const p = P[i], pl = ringPlace(t), th = p.r1 * TAU + t * 0.03 * (p.r2 - 0.5), R = 480 + p.r3 * 150;
  o[0] = pl.cx + Math.cos(th) * R * pl.sc; o[1] = pl.cy + Math.sin(th) * R * pl.sc; o[2] = 1 + p.r4; o[3] = 0.12 * (0.6 + 0.4 * Math.sin(t + p.r5 * TAU)); o[4] = GOLD;
}

/* ---- dimension diagrams (the right half; the rings stay on the left) ---- */
const EQ = (() => { const R = rng(777), out = [0]; let s = 0; for (let j = 0; j < 360; j++) { s += R() < 0.4 ? 2.5 : -1; out.push(s); } return out; })();
const EQX = j => 900 + j * 2.35, EQY = v => 650 - v * 1.75;
function fProb(i, t, o) {
  if (i < 360) return ringPt(i, t, o);
  const j = i - 360, p = P[i], win = EQ[j + 1] > EQ[j];
  const gx = 930 + (j % 24) * 33, gy = 300 + Math.floor(j / 24) * 28;   // phase 0: single trades, coin flips
  const flip = ((t * 1.7 + p.r1 * 7) % 1), coinWin = p.r2 < 0.4;
  const toCurve = ease(t, lt('prob', 1) - 0.2 + (j / 360) * 1.2, 1.4, SWIFT);
  o[0] = lerp(gx, EQX(j), toCurve); o[1] = lerp(gy, EQY(EQ[j + 1]), toCurve);
  o[2] = lerp(2.2, 1.9, toCurve); o[3] = lerp(0.35 + 0.55 * Math.pow(1 - flip, 3), 0.85, toCurve);
  o[4] = toCurve > 0.5 ? (win ? UP : DOWN) : (coinWin ? UP : DOWN);
}
const LOOP = { cx: 1320, cy: 520, R: 190 };
function sellFactPt(u) {                           // price runs up into the news, then is sold on the fact
  const x = lerp(900, 1740, u), news = 0.62;
  const y = u < news ? 650 - 300 * Math.pow(u / news, 1.6) : 350 + 240 * (1 - Math.exp(-(u - news) * 9)) - 20 * Math.sin((u - news) * 30) * Math.exp(-(u - news) * 6);
  return [x, y];
}
function fExpect(i, t, o) {
  if (i < 360) return ringPt(i, t, o);
  const j = i - 360, p = P[i];
  const sp = 0.06 + 0.16 * ease(t, lt('expect', 1), 6, SOFT) + 0.1 * ease(t, lt('expect', 2), 4, SOFT);
  const th = j / 360 * TAU + t * sp * TAU, wob = 1 + 0.18 * life(t, lt('expect', 2), le('expect', 2), 1.4, 1.2) * Math.sin(th * 3 + t * 2);
  const A = [LOOP.cx + Math.cos(th) * LOOP.R * wob, LOOP.cy + Math.sin(th) * LOOP.R * 0.82 * wob];
  const B = sellFactPt(j / 359), lead = ease(t, WIN.expect[0] + 0.3, 1.2);
  const E = [900 + j / 359 * 840, 640 - 260 * SOFT(clamp(j / 359 * 1.4)) ];   // phase 0: the expectation curve
  const toLoop = ease(t, lt('expect', 1) - 0.4 + p.r1 * 0.5, 1.6, SWIFT), toChart = ease(t, lt('expect', 3) - 0.4 + (j / 360) * 0.8, 1.6, SWIFT);
  let x = lerp(E[0], A[0], toLoop), y = lerp(E[1], A[1], toLoop); x = lerp(x, B[0], toChart); y = lerp(y, B[1], toChart);
  o[0] = x; o[1] = y; o[2] = 1.8; o[3] = (0.7 * lead) * (toLoop > 0.5 && toChart < 0.5 ? 0.6 + 0.4 * Math.sin(th * 4) : 1); o[4] = toChart > 0.5 ? (j / 359 > 0.62 ? DOWN : GOLDHI) : GOLDHI;
}
const LQ = { lowY: 680, highY: 330, x0: 900, x1: 1760 };
function liqPricePt(u, t) {                        // range → sweep below the lows → reversal through the highs
  const sw = 0.62, x = lerp(LQ.x0, LQ.x1, u);
  let y = 505 + 150 * Math.sin(u * 13) * (u < sw - 0.04 ? 1 : 0);
  if (u >= sw - 0.04 && u < sw + 0.04) y = lerp(505, LQ.lowY + 70, Math.sin(Math.PI * (u - (sw - 0.04)) / 0.08));
  if (u >= sw + 0.04) y = 505 - 215 * SOFT(clamp((u - sw - 0.04) / 0.34));
  return [x, y];
}
function fLiquid(i, t, o) {
  if (i < 360) return ringPt(i, t, o);
  const j = i - 360, p = P[i];
  // phase 0–1: fuel rising from below, chips stacked as walls with a gap (least resistance)
  const fuel = j < 150, wallRow = Math.floor((j - 150) / 70), wk = (j - 150) % 70;
  let A;
  if (fuel) { const u = ((t * (0.25 + p.r2 * 0.2) + p.r1) % 1); A = [1060 + p.r3 * 520 + Math.sin(u * 6 + j) * 18, 800 - u * 420]; }
  else { const gap = [1420, 1180, 1520][wallRow], x = 940 + wk * 12.2; A = [Math.abs(x - gap) < 60 ? x + Math.sign(x - gap || 1) * 60 : x, 470 - wallRow * 80]; }
  // phase 2–3: resting stops below the equal lows (sell stops) and above the highs (buy stops)
  const pool = j < 220 ? 0 : 1, pk = pool ? j - 220 : j, cols = 22;
  const B = pool ? [1060 + (pk % cols) * 14 + (Math.floor(pk / cols) % 2) * 7, LQ.highY - 26 - Math.floor(pk / cols) * 11] : [1060 + (pk % cols) * 14 + (Math.floor(pk / cols) % 2) * 7, LQ.lowY + 26 + Math.floor(pk / cols) * 11];
  const toPools = ease(t, lt('liquid', 2) - 0.6 + p.r1 * 0.6, 1.6, SWIFT);
  // the sweep: the wick dives into the sell-stop pool and the orders are absorbed by the institution
  const swT = lt('liquid', 2) + (le('liquid', 2) - lt('liquid', 2)) * 0.55;
  const grab = pool ? 0 : ease(t, swT + (pk % cols) * 0.02, 1.3, SWIFT);
  const inst = [1700, 600];
  let x = lerp(A[0], B[0], toPools), y = lerp(A[1], B[1], toPools);
  x = lerp(x, inst[0] + Math.cos(p.r4 * TAU + t) * 26 * p.r5, grab); y = lerp(y, inst[1] + Math.sin(p.r4 * TAU + t) * 26 * p.r5, grab) - Math.sin(Math.PI * grab) * 60;
  o[0] = x; o[1] = y; o[2] = toPools > 0.5 ? 2.0 : 1.8; o[3] = toPools > 0.5 ? 0.85 : (fuel ? 0.55 : 0.7);
  o[4] = toPools > 0.5 ? (pool ? UP : DOWN) : (fuel ? GOLDHI : IVORY); if (grab > 0.6) o[4] = GOLDHI;
}
const SELF = { cx: 1320, cy: 520 };
function fSelf(i, t, o) {
  if (i < 360) return ringPt(i, t, o);
  const j = i - 360, p = P[i];
  // phase 0: market as running water
  const lane = j % 9, u = ((t * (0.08 + p.r2 * 0.05) + p.r1) % 1);
  const A = [880 + u * 900, 330 + lane * 50 + 22 * Math.sin(u * 9 + lane + t * 1.4)];
  // phase 1–2: the three things you control, held around a calm core
  const node = j % 3, NA = [[SELF.cx, SELF.cy - 190], [SELF.cx - 170, SELF.cy + 110], [SELF.cx + 170, SELF.cy + 110]][node];
  const ph = p.r3 * TAU + t * 0.9, rr = 10 + p.r4 * 40;
  const Bp = [NA[0] + Math.cos(ph) * rr, NA[1] + Math.sin(ph) * rr];
  // phase 4: the machine — a perfect, constant orbit
  const th = j / 360 * TAU + t * 0.9, C = [SELF.cx + Math.cos(th) * 150, SELF.cy + Math.sin(th) * 150];
  const toNodes = ease(t, lt('self', 1) - 0.4 + p.r1 * 0.6, 1.6, SWIFT), toMachine = ease(t, lt('self', 4) - 0.4 + p.r1 * 0.5, 1.8, SWIFT);
  let x = lerp(A[0], Bp[0], toNodes), y = lerp(A[1], Bp[1], toNodes); x = lerp(x, C[0], toMachine); y = lerp(y, C[1], toMachine);
  o[0] = x; o[1] = y; o[2] = 1.8; o[3] = lerp(0.45, 0.85, toNodes); o[4] = toNodes > 0.5 ? GOLDHI : TEAL;
}
function fFinale(i, t, o) {
  const p = P[i], a = WIN.finale[0], k = t - a, th = p.r1 * TAU, R = 200 + p.r2 * 700 + k * (8 + p.r3 * 14);
  o[0] = 960 + Math.cos(th) * R * 1.4; o[1] = 520 + Math.sin(th) * R * 0.7; o[2] = 1 + p.r4; o[3] = 0.4 * (1 - ease(t, a + 0.5, 3.5, SOFT)); o[4] = GOLD;
}

const FORM = { lattice: fLattice, balance: fBalance, payoff: fPayoff, grid: fGrid, contest: fContest, collide: fCollide, collide2: fCollide2, rings: fRings, prob: fProb, expect: fExpect, liquid: fLiquid, self: fSelf, finale: fFinale };
let SCHED_ = null;
function sched() {
  if (SCHED_) return SCHED_;
  return (SCHED_ = [
    [-1, 'lattice'], [WIN.risk[0] - 0.2, 'balance'], [lt('risk', 4) - 0.5, 'payoff'],
    [WIN.crowd[0] - 0.2, 'grid'], [lt('crowd', 4) - 0.6, 'contest'], [lt('crowd', 5) - 0.5, 'grid'],
    [WIN.flow[0] - 0.2, 'collide'], [lt('flow', 4) - 0.5, 'collide2'], [lt('flow', 5) - 0.4, 'collide'],
    [WIN.p2[0] + 0.2, 'rings'], [WIN.prob[0] - 0.3, 'prob'], [WIN.expect[0] - 0.2, 'expect'], [WIN.liquid[0] - 0.2, 'liquid'], [WIN.self[0] - 0.2, 'self'],
    [WIN.finale[0] - 0.6, 'finale'],
  ]);
}
const OA = [0, 0, 0, 0, 0], OB = [0, 0, 0, 0, 0];
function formAlpha(t) {                            // the field steps back behind the title and the part cards
  let a = 1;
  for (const id of ['title', 'p1', 'p2']) a = Math.min(a, 1 - 0.55 * life(t, WIN[id][0] - 0.2, WIN[id][1] + 0.2, 0.8, 0.8));
  return a * ease(t, 0.1, 1.6, SOFT);
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
   LINE-ART & LABELS per section (drawn over the field)
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
}
function artTitle(g, t) {
  const [a, b] = WIN.title, al = life(t, a - 0.1, b + 0.1, 1.2, 1.0), r = ease(t, a + 1.6, 1.6) * al;
  goldStroke(g, [[960 - 280 * r, 604], [960 + 280 * r, 604]], 1, { w: 1, a: 0.7 * r, glow: 0.3 });
  glowDot(g, 960, 604, 2, r);
}
function artPart(g, t, id) {
  const [a, b] = WIN[id], r = ease(t, a + 0.2, 1.4) * (1 - ease(t, b - 0.9, 0.8, SOFT)), y = 672;
  goldStroke(g, [[960 - 260 * r, y], [960 + 260 * r, y]], 1, { w: 1.1, a: r, glow: 0.4 });
  g.save(); g.translate(960, y); g.rotate(Math.PI / 4); g.globalAlpha = r; g.strokeStyle = C.goldHi; g.lineWidth = 1.2; g.strokeRect(-5, -5, 10, 10); g.restore();
}
function artRisk(g, t) {
  const B = balanceState(t), a = B.fade;
  if (a > 0.01) {
    const pv = [B.cx, B.cy];
    goldStroke(g, [[pv[0], pv[1]], [pv[0] - 70, 760], [pv[0] + 70, 760], [pv[0], pv[1]]], ease(t, WIN.risk[0] + 1.5, 1.2), { w: 1.6, a, glow: 0.3 });
    goldStroke(g, [B.L, B.R], ease(t, WIN.risk[0] + 1.8, 1.2), { w: 2.6, a, glow: 0.5 });
    glowDot(g, pv[0], pv[1], 3.5, a);
    for (const [pt, lab, sub] of [[B.L, '风险', 'RISK'], [B.R, '收益', 'RETURN']]) {
      const q = [pt[0], pt[1] + 120];
      goldStroke(g, [pt, [q[0] - 70, q[1]]], 1, { w: 0.9, a: a * 0.7, glow: 0 }); goldStroke(g, [pt, [q[0] + 70, q[1]]], 1, { w: 0.9, a: a * 0.7, glow: 0 });
      goldStroke(g, arcPts(q[0], q[1] - 12, 84, 0.2, Math.PI - 0.2, 24), 1, { w: 1.6, a, glow: 0.25 });
      text(g, lab, q[0], q[1] + 96, { size: 30, weight: 600, color: C.goldHi, a, track: 0.3 });
      text(g, sub, q[0], q[1] + 132, { font: 'latin', size: 18, color: C.gold, a: a * 0.75, track: 0.4 });
    }
    const comp = lon('risk', 0, 0.8, 0.8, -0.6, 0.2)(t);
    text(g, '补偿', 960, 380, { size: 30, weight: 600, color: C.goldHi, a: a * comp, track: 0.4 });
    goldStroke(g, arcPts(960, 470, 120, Math.PI * 1.15, Math.PI * 1.85, 40), comp, { w: 1, a: a * comp * 0.7, glow: 0.2 });
    // 赌博 / 空谈 at the two extremes
    const k2 = lt('risk', 2), k2e = le('risk', 2), mid = (k2 + k2e) / 2;
    text(g, '赌博', B.R[0], B.R[1] + 300, { size: 40, weight: 700, color: '#E08A7E', a: a * life(t, k2 + 0.3, mid, 0.6, 0.6), track: 0.3 });
    text(g, '空谈', B.L[0], B.L[1] + 300, { size: 40, weight: 700, color: '#8FC0A6', a: a * life(t, mid, k2e + 0.2, 0.6, 0.6), track: 0.3 });
    // Graham: the capital floor
    const gr = lon('risk', 3, 0.9, 0.8, 0.0, 0.4)(t);
    if (gr > 0) {
      goldStroke(g, [[640, 792], [1280, 792]], ease(t, lt('risk', 3), 1.2, SWIFT), { w: 2.4, a: gr, glow: 0.6 });
      for (let k = 0; k < 7; k++) goldStroke(g, [[660 + k * 95, 792], [640 + k * 95, 812]], gr, { w: 1, a: gr * 0.6, glow: 0 });
      text(g, '本金', 610, 792, { size: 30, weight: 700, color: C.goldHi, a: gr, align: 'right', track: 0.4 });
    }
  }
  // payoff histogram axis + labels
  const pa = ease(t, lt('risk', 4), 1.2, SOFT) * (1 - ease(t, WIN.risk[1] - 0.6, 0.9, SOFT));
  if (pa > 0) {
    goldStroke(g, [[PAYX(-1.4), PAYY], [PAYX(6.6), PAYY]], ease(t, lt('risk', 4), 1.4, SWIFT), { w: 1.2, a: pa * 0.8, glow: 0 });
    for (let R = -1; R <= 6; R++) { goldStroke(g, [[PAYX(R), PAYY], [PAYX(R), PAYY + 10]], pa, { w: 1, a: pa * 0.6, glow: 0 }); text(g, R === 0 ? '0' : (R > 0 ? '+' : '−') + Math.abs(R) + 'R', PAYX(R), PAYY + 30, { font: 'latin', size: 20, color: C.ivory, a: pa * 0.7 }); }
    const cut = lon('risk', 5, 0.8, 1.0, 0.1, 1.2)(t) * pa;
    goldStroke(g, [[PAYX(-1) - 6, PAYY - 260], [PAYX(-1) - 6, PAYY]], cut, { w: 2.4, a: cut, glow: 0.7, color: '#8FC0A6' });
    text(g, '代价极小', PAYX(-1) - 20, PAYY - 280, { size: 28, weight: 700, color: '#8FC0A6', a: cut, align: 'right', track: 0.2 });
    text(g, '获利极大', PAYX(5.2), PAYY - 130, { size: 28, weight: 700, color: C.goldHi, a: cut, track: 0.2 });
    goldStroke(g, [[PAYX(1.2), PAYY - 70], [PAYX(5.6), PAYY - 70]], cut, { w: 1.2, a: cut * 0.8, glow: 0.3 });
    goldStroke(g, [[PAYX(5.6) - 12, PAYY - 78], [PAYX(5.6), PAYY - 70], [PAYX(5.6) - 12, PAYY - 62]], cut, { w: 1.2, a: cut * 0.8, glow: 0 });
    text(g, 'ASYMMETRY · 不对称性', 960, 300, { font: 'latin', size: 20, color: C.gold, a: pa * 0.85 * (1 - ease(t, lt('risk', 6) - 0.4, 0.8, SOFT)), track: 0.45 });
  }
  // cut losses short, let profits run
  const cl = ease(t, lt('risk', 6) - 0.2, 1.0, SOFT) * (1 - ease(t, WIN.risk[1] - 0.6, 0.9, SOFT));
  if (cl > 0) {
    const X0 = 900, X1 = 1740, Y0 = 620, ent = [1020, 1210, 1390];
    const pathPt = u => { const x = lerp(X0, X1, u); let y = Y0 + 16 * Math.sin(u * 40);
      for (const e of ent.slice(0, 2)) { const d = (x - e) / 60; if (d > 0 && d < 1) y += 60 * d; }
      if (x > ent[2]) y -= Math.pow((x - ent[2]) / (X1 - ent[2]), 1.3) * 260; return [x, y]; };
    const pts = []; const prog = ease(t, lt('risk', 6), (le('risk', 6) - lt('risk', 6)) * 0.85, SOFT);
    for (let k = 0; k <= 200; k++) pts.push(pathPt(k / 200 * prog));
    goldStroke(g, pts, 1, { w: 2, a: cl, glow: 0.5, color: C.ivory });
    ent.forEach((e, k) => {
      const show = clamp((pathPt(prog)[0] - e) / 40); if (show <= 0) return;
      glowDot(g, e, Y0, 3, cl * show);
      if (k < 2) { goldStroke(g, [[e, Y0 + 60], [e + 70, Y0 + 60]], show, { w: 1.6, a: cl, glow: 0, color: '#8FC0A6' }); text(g, '−1R 止损', e + 76, Y0 + 60, { size: 20, color: '#8FC0A6', a: cl * show, align: 'left' }); }
    });
    const tr = clamp((pathPt(prog)[0] - ent[2] - 120) / 300);
    if (tr > 0) { text(g, '+5R', X1 - 150, Y0 - 250, { font: 'latin', size: 34, weight: 500, color: C.goldHi, a: cl * tr, align: 'right' }); text(g, '让利润奔跑', X1 - 150, Y0 - 210, { size: 24, color: C.goldHi, a: cl * tr, align: 'right', track: 0.2 }); }
    text(g, '截断亏损', 1110, Y0 + 104, { size: 24, color: '#8FC0A6', a: cl * clamp((pathPt(prog)[0] - ent[1]) / 80), track: 0.2 });
  }
}
function artCrowd(g, t) {
  const W = WIN.crowd;
  const m1 = lon('crowd', 1, 0.8, 0.8, 0.0, 0.5)(t);
  if (m1 > 0) MOODS.forEach((m, j) => {
    const G = gridPlace(t), x = G.cx + (m.c - 17.5) * 36.5 * G.sc, y = 512 + (m.r - 9.5) * 26 * G.sc, q = m1 * ease(t, lt('crowd', 1) + j * 0.35, 0.8);
    const ex = G.cx + (m.c < 18 ? -19 : 19) * 36.5 * G.sc;
    text(g, m.name, ex, y, { size: 34, weight: 700, color: COL[m.col], a: q, align: m.c < 18 ? 'right' : 'left', track: 0.3 });
  });
  // price vs value labels
  const w2 = Math.max(lon('crowd', 2, 0.8, 0.8, 0.0, 0.3)(t), life(t, lt('crowd', 5) - 0.3, W[1] + 0.3, 1.0, 1.0));
  if (w2 > 0) {
    const G = gridPlace(t), xr = G.cx + 18.5 * 36.5 * G.sc;
    text(g, '价值', xr + 14, 512, { size: 22, color: C.ivory, a: w2 * 0.8, align: 'left', track: 0.2 });
    text(g, '价格', xr + 14, 512 + (devPrice(35, t) - 9.5) * 26 * G.sc, { size: 22, color: C.goldHi, a: w2, align: 'left', track: 0.2 });
  }
  const k6 = lon('crowd', 6, 0.8, 0.8, 0.1, 0.4)(t);
  if (k6 > 0) {
    const G = gridPlace(t);
    for (const c of [9, 26]) {                      // the two extremes: greed above, panic below
      const pr = devPrice(c, t), x = G.cx + (c - 17.5) * 36.5 * G.sc, y = 512 + (pr - 9.5) * 26 * G.sc, up = pr < 9.5;
      goldStroke(g, arcPts(x, y, 26 + 6 * Math.sin(t * 3), 0, TAU, 40), k6, { w: 1.4, a: k6, glow: 0.5 });
      text(g, up ? '极度贪婪 · 借力做空' : '极度恐慌 · 借力买入', x, y + (up ? -48 : 48), { size: 24, weight: 600, color: up ? '#E08A7E' : '#8FC0A6', a: k6, track: 0.12 });
    }
  }
  const k3 = lon('crowd', 3, 0.8, 0.8, 0.0, 0.3)(t);
  if (k3 > 0) { const G = gridPlace(t); text(g, '人性从未改变', G.cx, 512 + 11 * 26 * G.sc, { size: 26, weight: 600, color: C.goldHi, a: k3 * ease(t, lt('crowd', 3) + 1.4, 1), track: 0.4 }); }
  // the contest
  const c4 = life(t, lt('crowd', 4) - 0.3, le('crowd', 4) + 0.4, 1.0, 0.9);
  if (c4 > 0) {
    const t0 = lt('crowd', 4), dur = le('crowd', 4) - t0, sw = ease(t, t0 + dur * 0.42, 1.6, SWIFT);
    FRAMES.forEach(([fx, fy], j) => {
      const hl = j === 1 ? 1 - sw : j === 4 ? sw : 0;
      g.save(); g.globalAlpha = c4 * (0.25 + 0.5 * hl); g.strokeStyle = C.goldHi; g.lineWidth = 1.2;
      g.beginPath(); g.arc(fx, fy - 18, 16, 0, TAU); g.stroke(); g.beginPath(); g.ellipse(fx, fy + 30, 30, 18, 0, Math.PI, TAU); g.stroke(); g.restore();
    });
    text(g, '你心中最美', FRAMES[1][0], 600, { size: 24, color: C.ivory, a: c4 * (1 - sw) * ease(t, t0 + 0.4, 0.8), track: 0.2 });
    text(g, '大众心中最美', FRAMES[4][0], 600, { size: 24, weight: 600, color: C.goldHi, a: c4 * sw, track: 0.2 });
    text(g, 'BEAUTY CONTEST · 选美理论', 960, 330, { font: 'latin', size: 20, color: C.gold, a: c4 * 0.85, track: 0.4 });
    const ar = c4 * ease(t, t0 + dur * 0.42 + 0.4, 1.2);
    goldStroke(g, arcPts(FRAMES[2][0] + 80, 360, 260, Math.PI * 1.15, Math.PI * 1.85, 30).map(([x, y]) => [x, y + 160]), ar, { w: 1.4, a: c4, glow: 0.3 });
    text(g, '预判', FRAMES[2][0] + 80, 362, { size: 26, weight: 700, color: C.goldHi, a: ar, track: 0.4 });
  }
}
function artFlow(g, t) {
  const a = ease(t, WIN.flow[0] + 1.4, 1.0, SOFT) * (1 - ease(t, WIN.flow[1] - 0.6, 1.0, SOFT));
  if (a <= 0) return;
  const two = life(t, lt('flow', 4) - 0.4, le('flow', 4) + 0.4, 1.0, 1.0), one = 1 - two;
  const Py = priceY(t);
  if (one > 0.02) {
    // the collision flash and the price trace scrolling right
    glowDot(g, 960, Py, 5 + 3 * Math.sin(t * 9), a * one);
    const pts = []; for (let k = 0; k <= 120; k++) { const tt = t - k / 30; pts.push([960 + k * 6, priceY(tt)]); }
    goldStroke(g, pts, 1, { w: 1.8, a: a * one * 0.85, glow: 0.4, color: C.goldHi });
    text(g, '即时均衡点', 960, Py - 40, { size: 26, weight: 600, color: C.goldHi, a: a * one * lon('flow', 1, 0.8, 0.8, 0.0, 0.6)(t), track: 0.24 });
    const k0 = lon('flow', 0, 0.8, 0.8, 0.0, 0.3)(t) * a;
    for (const [x, y, s] of [[560, 330, '基本面'], [1360, 330, '技术指标']]) {
      text(g, s, x, y, { size: 30, color: C.ivory, a: k0 * 0.7, track: 0.3 });
      goldStroke(g, [[x - 70, y + 4], [x + 70, y + 4]], ease(t, lt('flow', 0) + 1.2, 0.8), { w: 1.6, a: k0, glow: 0, color: '#E08A7E' });
    }
    text(g, '主动买盘 · DEMAND', 300, 820, { size: 22, color: '#E08A7E', a: a * one * 0.85, track: 0.2 });
    text(g, '主动卖盘 · SUPPLY', 1620, 820, { size: 22, color: '#8FC0A6', a: a * one * 0.85, track: 0.2 });
    // Marshall's scissors: two blades meeting at the price
    const sc = lon('flow', 2, 1.0, 0.9, 0.0, 0.3)(t) * a;
    if (sc > 0) {
      const open = 0.34 + 0.12 * Math.sin(t * 1.6);
      for (const [s, col] of [[1, '#E08A7E'], [-1, '#8FC0A6']]) {
        const ang = s * open, dx = Math.cos(ang), dy = Math.sin(ang);
        const tip = [960 + dx * 330, Py + dy * 330], tail = [960 - dx * 250, Py - dy * 250];
        goldStroke(g, [tail, tip], ease(t, lt('flow', 2), 1.0, SWIFT), { w: 3, a: sc, glow: 0.6, color: col });
        goldStroke(g, arcPts(tail[0] - dx * 26, tail[1] - dy * 26, 26, 0, TAU, 36), sc, { w: 1.6, a: sc * 0.8, glow: 0.2, color: col });
      }
      text(g, '需求', 960 + Math.cos(open) * 360, Py + Math.sin(open) * 360 + 30, { size: 26, color: '#E08A7E', a: sc, track: 0.3 });
      text(g, '供给', 960 + Math.cos(-open) * 360, Py + Math.sin(-open) * 360 - 30, { size: 26, color: '#8FC0A6', a: sc, track: 0.3 });
    }
    const wy = lon('flow', 3, 0.8, 0.8, 0.0, 0.4)(t) * a;
    if (wy > 0) { const { D, S } = flowDS(t), upw = D > S; text(g, upw ? '需求 > 供给  ↑' : '供给 > 需求  ↓', 960, 760, { size: 32, weight: 700, color: upw ? '#E08A7E' : '#8FC0A6', a: wy * clamp(Math.abs(D - S) * 4), track: 0.2 }); }
    const of = life(t, lt('flow', 5) - 0.2, WIN.flow[1], 1.0, 0.8) * a;
    if (of > 0) {                                  // footprint: bid/ask volume at each price level
      for (let k = -5; k <= 5; k++) {
        const y = Py + k * 22, bv = 40 + 140 * Math.abs(Math.sin(k * 1.7 + t * 0.6)), av = 40 + 140 * Math.abs(Math.cos(k * 1.3 + t * 0.5));
        g.globalAlpha = of * 0.55; g.fillStyle = '#E08A7E'; g.fillRect(1420 - bv * ease(t, lt('flow', 5) + k * 0.03 + 0.3, 0.8), y - 8, bv * ease(t, lt('flow', 5) + k * 0.03 + 0.3, 0.8), 16);
        g.fillStyle = '#8FC0A6'; g.fillRect(1430, y - 8, av * ease(t, lt('flow', 5) + k * 0.03 + 0.3, 0.8), 16);
      }
      g.globalAlpha = 1;
      text(g, 'ORDER FLOW · 订单流', 1425, Py - 150, { font: 'latin', size: 20, color: C.gold, a: of, track: 0.4 });
    }
  }
  if (two > 0.02) {
    const a0 = lt('flow', 4), rk = ease(t, a0 + 0.4, le('flow', 4) - a0, SOFT);
    for (const [x, y, lab, sub, col] of [[640, 560, '优质资产', '缺乏买盘 · 死气沉沉', C.ivory], [1290, lerp(660, 330, rk), '垃圾资产', '资金抢筹 · 一飞冲天', '#E08A7E']]) {
      glowDot(g, x, y, 4, two * a);
      text(g, lab, x, 300, { size: 34, weight: 700, color: col, a: two * a, track: 0.3 });
      text(g, sub, x, 344, { size: 22, color: C.ivory, a: two * a * 0.75, track: 0.2 });
    }
    const pts = []; for (let k = 0; k <= 60; k++) { const u = k / 60; pts.push([1290 + u * 300, lerp(660, 330, ease(t - (1 - u) * 3, a0 + 0.4, le('flow', 4) - a0, SOFT))]); }
    goldStroke(g, pts, 1, { w: 2, a: two * a, glow: 0.5, color: '#E08A7E' });
    goldStroke(g, [[640, 560], [940, 560 + 6 * Math.sin(t)]], 1, { w: 1.6, a: two * a * 0.7, glow: 0, color: C.ivory });
  }
}
const DIMS = [['概率游戏', 'PROBABILITY'], ['预期博弈', 'REFLEXIVITY'], ['流动性', 'LIQUIDITY'], ['自我管理', 'SELF-CONTROL']];
function artRings(g, t) {
  const on = ease(t, WIN.p2[0] + 0.3, 1.6, SOFT) * (1 - ease(t, WIN.finale[0] - 0.8, 1.4, SOFT));
  if (on <= 0) return;
  const pl = ringPlace(t), fk = ringFocus(t), beam = t * 1.5;
  // the scanning beam: a soft wedge sweeping round, its reach shrinking from the outer ring to the core
  const reach = RINGS[Math.min(3, Math.round(fk))].R * pl.sc + 40 * pl.sc;
  g.save(); g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 14; k++) {
    const a0 = beam - k * 0.035, a1 = beam - (k + 1) * 0.035;
    g.globalAlpha = on * 0.05 * (1 - k / 14); g.fillStyle = C.goldHi;
    g.beginPath(); g.moveTo(pl.cx, pl.cy); g.arc(pl.cx, pl.cy, reach, a1, a0); g.closePath(); g.fill();
  }
  g.restore();
  // faint guide lines for each ring + labels
  RINGS.forEach((Rg, k) => {
    const focus = Math.exp(-Math.pow(k - fk, 2) / 0.25), pts = [];
    for (let j = 0; j <= 96; j++) { const [x, y] = polyPt(Rg.sides, Rg.R, j / 96, t * Rg.rot); pts.push([pl.cx + x * pl.sc, pl.cy + y * pl.sc]); }
    goldStroke(g, pts, 1, { w: 1, a: on * (0.18 + 0.4 * focus), glow: 0.3 * focus });
    const lx = pl.cx + (Rg.R + (k === 3 ? -Rg.R : 0)) * pl.sc * (k === 3 ? 0 : 0.0), ly = pl.cy - Rg.R * pl.sc - 14;
    const la = on * (t < WIN.prob[0] ? ease(t, lt('rings', 0) + k * 0.6, 0.8) : 0.35 + 0.65 * focus);
    text(g, DIMS[k][0], lx, k === 3 ? pl.cy : ly, { size: k === 3 ? 26 : 22, weight: focus > 0.5 ? 700 : 400, color: focus > 0.5 ? C.goldHi : C.ivory, a: la, track: 0.24 });
  });
  glowDot(g, pl.cx, pl.cy, 4 + 2 * Math.sin(t * 2), on * (0.4 + 0.6 * Math.exp(-Math.pow(3 - fk, 2) / 0.3)));
}
function artProb(g, t) {
  const a = ease(t, WIN.prob[0] + 1.4, 1.0, SOFT) * (1 - ease(t, WIN.prob[1] - 0.6, 0.9, SOFT));
  if (a <= 0) return;
  const k0 = lon('prob', 0, 0.8, 0.8, 0.2, 0.3)(t);
  text(g, '单笔结果 · 随机', 1320, 270, { size: 26, color: C.ivory, a: a * k0, track: 0.3 });
  const cv = ease(t, lt('prob', 1) + 0.6, 1.4, SOFT) * a;
  if (cv > 0) {
    const slope = (EQ[360] / 360), pts = [[EQX(0), EQY(0)], [EQX(360), EQY(slope * 360)]];
    g.save(); g.setLineDash([8, 8]); goldStroke(g, pts, ease(t, lt('prob', 1) + 1.0, 1.6, SWIFT), { w: 1.4, a: cv * 0.8, glow: 0, color: C.goldHi }); g.restore();
    text(g, '数学期望', EQX(360) - 6, EQY(slope * 360) - 30, { size: 24, weight: 600, color: C.goldHi, a: cv, align: 'right', track: 0.2 });
    text(g, '第 1 笔', EQX(0), EQY(0) + 40, { size: 20, color: C.ivory, a: cv * 0.7 });
    text(g, '第 N 笔', EQX(355), EQY(EQ[356]) + 44, { size: 20, color: C.ivory, a: cv * 0.7 });
  }
  const q2 = lon('prob', 2, 0.8, 0.8, 0.0, 0.4)(t) * a;
  if (q2 > 0) { const x = EQX(360) + 30, y = EQY(EQ[360]); text(g, '?', x, y - 6, { font: 'latin', italic: true, size: 56, color: C.goldHi, a: q2 * (0.6 + 0.4 * Math.sin(t * 3)) }); }
  const f3 = lon('prob', 3, 0.8, 0.8, 0.0, 0.6)(t) * a;
  if (f3 > 0) {
    const y = 300; text(g, '期望值  =  胜率 40% × 盈亏比 2.5  −  败率 60%  =  +0.4R', 1330, y, { size: 26, weight: 600, color: C.goldHi, a: f3 * ease(t, lt('prob', 3) + 0.4, 1.0), track: 0.06 });
    text(g, 'POSITIVE EXPECTANCY · 正期望系统', 1330, y + 42, { font: 'latin', size: 18, color: C.gold, a: f3 * 0.85, track: 0.4 });
  }
  const r4 = lon('prob', 4, 0.8, 0.8, 0.0, 0.8)(t) * a;
  if (r4 > 0) {
    // capital block with a 1% slice, and a reckless path crashing to zero beside the survivor
    const bx = 900, by = 300; g.globalAlpha = r4 * 0.25; g.fillStyle = C.gold; g.fillRect(bx, by, 300, 26); g.globalAlpha = r4; g.fillStyle = '#E08A7E'; g.fillRect(bx + 297 - 6 * ease(t, lt('prob', 4) + 0.3, 0.8), by, 6, 26); g.globalAlpha = 1;
    text(g, '单笔风险 ≤ 1–2%', bx + 320, by + 13, { size: 24, weight: 600, color: C.goldHi, a: r4, align: 'left', track: 0.1 });
    const crash = []; for (let j = 0; j <= 120; j++) { const u = j / 120, x = EQX(j * 1.6); let y = EQY(EQ[Math.round(j * 1.6)] * 2.4); if (u > 0.55) y = lerp(y, 760, SOFT(clamp((u - 0.55) / 0.25))); crash.push([x, Math.min(760, y)]); }
    goldStroke(g, crash, ease(t, lt('prob', 4) + 0.6, 2.4, SOFT), { w: 1.6, a: r4 * 0.85, glow: 0.2, color: '#8FC0A6' });
    text(g, '重仓 · 爆仓', EQX(150), 790, { size: 22, color: '#8FC0A6', a: r4 * ease(t, lt('prob', 4) + 2.4, 0.8), track: 0.2 });
  }
}
function artExpect(g, t) {
  const a = ease(t, WIN.expect[0] + 1.4, 1.0, SOFT) * (1 - ease(t, WIN.expect[1] - 0.6, 0.9, SOFT));
  if (a <= 0) return;
  const k0 = life(t, WIN.expect[0] + 0.4, le('expect', 0) + 0.4, 1.0, 0.8) * a;
  if (k0 > 0) {
    // the fact arrives later (a step), the price has already moved on the expectation
    const fx = 1500; g.save(); g.setLineDash([6, 8]); goldStroke(g, [[900, 640], [fx, 640], [fx, 380], [1740, 380]], ease(t, WIN.expect[0] + 0.8, 1.8, SWIFT), { w: 1.4, a: k0 * 0.8, glow: 0, color: C.ivory }); g.restore();
    text(g, '事实', fx + 20, 360, { size: 24, color: C.ivory, a: k0, align: 'left', track: 0.2 });
    text(g, '价格 · 先行反映预期', 1020, 470, { size: 24, color: C.goldHi, a: k0, track: 0.12 });
  }
  const lp = life(t, lt('expect', 1) - 0.2, le('expect', 2) + 0.4, 1.0, 1.0) * a;
  if (lp > 0) {
    const nodes = [['认知', -Math.PI / 2], ['价格', Math.PI / 6], ['基本面', Math.PI * 5 / 6]];
    nodes.forEach(([s, th], k) => {
      const x = LOOP.cx + Math.cos(th) * (LOOP.R + 62), y = LOOP.cy + Math.sin(th) * (LOOP.R * 0.82 + 50);
      text(g, s, x, y, { size: 30, weight: 700, color: C.goldHi, a: lp * ease(t, lt('expect', 1) + k * 0.3, 0.8), track: 0.2 });
    });
    text(g, 'REFLEXIVITY', LOOP.cx, LOOP.cy - 8, { font: 'latin', size: 22, color: C.gold, a: lp * 0.85, track: 0.4 });
    text(g, '反身性', LOOP.cx, LOOP.cy + 26, { size: 26, weight: 600, color: C.goldHi, a: lp, track: 0.4 });
    const er = lon('expect', 2, 0.8, 0.8, 0.0, 0.3)(t);
    text(g, '错误  →  现实', LOOP.cx, LOOP.cy + 290, { size: 26, weight: 600, color: '#E08A7E', a: lp * er, track: 0.2 });
  }
  const sf = ease(t, lt('expect', 3) - 0.2, 1.0, SOFT) * a;
  if (sf > 0) {
    const n = sellFactPt(0.62);
    g.save(); g.setLineDash([4, 6]); goldStroke(g, [[n[0], 300], [n[0], 760]], sf, { w: 1.2, a: sf * 0.8, glow: 0, color: C.ivory }); g.restore();
    text(g, '利好兑现', n[0], 280, { size: 26, weight: 600, color: C.ivory, a: sf, track: 0.2 });
    text(g, 'Buy the rumor', 1080, 700, { font: 'latin', italic: true, size: 28, color: C.goldHi, a: sf });
    text(g, 'Sell the fact', 1640, 700, { font: 'latin', italic: true, size: 28, color: '#8FC0A6', a: sf * ease(t, lt('expect', 3) + 1.2, 0.8) });
    const gp = lon('expect', 4, 0.8, 0.8, 0.0, 0.8)(t) * a;
    if (gp > 0) {
      g.save(); g.globalAlpha = gp * 0.18; g.fillStyle = C.goldHi; g.fillRect(n[0], 350, 1740 - n[0], 240); g.restore();
      text(g, '预期落差', (n[0] + 1740) / 2, 470, { size: 30, weight: 700, color: C.goldHi, a: gp, track: 0.3 });
    }
  }
}
function artLiquid(g, t) {
  const a = ease(t, WIN.liquid[0] + 1.4, 1.0, SOFT) * (1 - ease(t, WIN.liquid[1] - 0.6, 0.9, SOFT));
  if (a <= 0) return;
  const p01 = life(t, WIN.liquid[0] + 0.4, le('liquid', 1) + 0.4, 1.0, 0.9) * a;
  if (p01 > 0) {
    text(g, '资金 · 燃料', 1330, 830, { size: 24, color: C.goldHi, a: p01, track: 0.2 });
    text(g, '筹码 · 围墙', 1760, 470, { size: 24, color: C.ivory, a: p01, align: 'right', track: 0.2 });
    const k1 = ease(t, lt('liquid', 1) + 0.3, 2.6, SOFT);
    const path = [[1240, 780], [1240, 560], [1420, 520], [1420, 400], [1180, 380], [1180, 290]].map(([x, y]) => [x, y]);
    goldStroke(g, path, k1, { w: 2.2, a: p01 * ease(t, lt('liquid', 1), 0.8), glow: 0.6, color: C.goldHi });
    text(g, '阻力最小的方向', 1180, 262, { size: 24, weight: 600, color: C.goldHi, a: p01 * clamp(k1 * 1.4 - 0.4), track: 0.2 });
  }
  const p23 = ease(t, lt('liquid', 2) - 0.4, 1.2, SOFT) * a;
  if (p23 > 0) {
    g.save(); g.setLineDash([6, 8]);
    goldStroke(g, [[LQ.x0, LQ.lowY], [LQ.x1, LQ.lowY]], p23, { w: 1.2, a: p23 * 0.7, glow: 0, color: C.ivory });
    goldStroke(g, [[LQ.x0, LQ.highY], [LQ.x1, LQ.highY]], p23, { w: 1.2, a: p23 * 0.7, glow: 0, color: C.ivory });
    g.restore();
    text(g, '止损单 · 卖方流动性', LQ.x0 + 10, LQ.lowY + 92, { size: 22, color: '#8FC0A6', a: p23, align: 'left', track: 0.16 });
    text(g, '止损单 · 买方流动性', LQ.x0 + 10, LQ.highY - 92, { size: 22, color: '#E08A7E', a: p23, align: 'left', track: 0.16 });
    const prog = ease(t, lt('liquid', 2) + 0.2, (le('liquid', 3) - lt('liquid', 2)) * 0.8, SOFT), pts = [];
    for (let k = 0; k <= 240; k++) pts.push(liqPricePt(k / 240 * prog, t));
    goldStroke(g, pts, 1, { w: 2, a: p23, glow: 0.5, color: C.goldHi });
    const head = liqPricePt(prog, t); glowDot(g, head[0], head[1], 3.5, p23);
    const swT = lt('liquid', 2) + (le('liquid', 2) - lt('liquid', 2)) * 0.55, sw = life(t, swT - 0.4, le('liquid', 3) + 0.4, 0.6, 0.8);
    text(g, 'SWEEP LIQUIDITY', LQ.x0 + 0.62 * (LQ.x1 - LQ.x0), LQ.lowY + 140, { font: 'latin', size: 24, weight: 500, color: C.goldHi, a: p23 * sw, track: 0.3 });
    const inst = lon('liquid', 3, 0.8, 0.8, 0.2, 0.8)(t) * a;
    goldStroke(g, arcPts(1700, 600, 54, 0, TAU, 48), inst, { w: 1.6, a: inst, glow: 0.6 });
    text(g, '机构', 1700, 690, { size: 26, weight: 700, color: C.goldHi, a: inst, track: 0.3 });
    text(g, '对手盘', 1700, 724, { size: 20, color: C.ivory, a: inst * 0.8, track: 0.3 });
  }
}
function artSelf(g, t) {
  const a = ease(t, WIN.self[0] + 1.4, 1.0, SOFT) * (1 - ease(t, WIN.self[1] - 1.4, 1.4, SOFT));
  if (a <= 0) return;
  text(g, '行情如流水', 1330, 280, { size: 28, color: '#9FCFC9', a: a * lon('self', 0, 0.8, 0.8, 0.2, 0.4)(t), track: 0.4 });
  const nd = life(t, lt('self', 1) - 0.2, le('self', 3) + 0.3, 1.0, 1.0) * a;
  if (nd > 0) {
    const N3 = [['手', 0, -190], ['仓位', -170, 110], ['心态', 170, 110]];
    N3.forEach(([s, dx, dy], k) => {
      const q = nd * ease(t, lt('self', 1) + 0.5 + k * 0.4, 0.8);
      goldStroke(g, arcPts(SELF.cx + dx, SELF.cy + dy, 52, 0, TAU, 40), q, { w: 1.4, a: q, glow: 0.5 });
      text(g, s, SELF.cx + dx, SELF.cy + dy + 82, { size: 30, weight: 700, color: C.goldHi, a: q, track: 0.2 });
      goldStroke(g, [[SELF.cx, SELF.cy], [SELF.cx + dx * 0.7, SELF.cy + dy * 0.7]], q, { w: 1, a: q * 0.5, glow: 0 });
    });
    glowDot(g, SELF.cx, SELF.cy, 5, nd);
    const d2 = lon('self', 2, 0.8, 0.8, 0.0, 0.3)(t);
    for (const [s, x] of [['不认赔', 1060], ['过度交易', 1600]]) { text(g, s, x, 780, { size: 26, color: '#E08A7E', a: nd * d2, track: 0.2 }); goldStroke(g, [[x - 60, 784], [x + 60, 784]], ease(t, lt('self', 2) + 1.2, 0.6), { w: 1.6, a: nd * d2, glow: 0, color: '#E08A7E' }); }
    const d3 = lon('self', 3, 0.8, 0.8, 0.0, 0.4)(t);
    ['何时认赔', '何时落袋', '何时空仓'].forEach((s, k) => {
      const q = nd * d3 * ease(t, lt('self', 3) + k * 0.6, 0.6), x = 1080 + k * 240, y = 790;
      text(g, s, x + 16, y, { size: 26, weight: 600, color: C.goldHi, a: q, track: 0.12 });
      goldStroke(g, [[x - 72, y], [x - 62, y + 10], [x - 44, y - 12]], ease(t, lt('self', 3) + k * 0.6 + 0.3, 0.4), { w: 2, a: q, glow: 0.3, color: C.goldHi });
    });
  }
  const mc = ease(t, lt('self', 4) - 0.2, 1.2, SOFT) * a;
  if (mc > 0) {
    // the machine: a steady oscillation with no emotion in it
    const pts = []; for (let k = 0; k <= 200; k++) { const x = 980 + k * 3.6; pts.push([x, 800 + 16 * Math.sin(x * 0.04 - t * 4)]); }
    goldStroke(g, pts, 1, { w: 1.4, a: mc * 0.8, glow: 0.4, color: C.goldHi });
    text(g, 'PROBABILITY MACHINE · 概率执行机器', SELF.cx, 290, { font: 'latin', size: 20, color: C.gold, a: mc, track: 0.4 });
  }
}

/* =====================================================================
   FRAME
   ===================================================================== */
function drawScenes(g, t) {
  drawBackground(g, t, spotAt(t));
  // a slow, continuous camera drift keeps the whole frame breathing
  const s = 1.012 + 0.01 * Math.sin(t * 0.11), dx = 7 * Math.sin(t * 0.07), dy = 5 * Math.sin(t * 0.09 + 1);
  camera(g, s, 960, 540, dx, dy);
  if (inWin(t, 'rings', 2.5, 30) || t > WIN.p2[0] - 0.2) artRings(g, t);
  drawMatrix(g, t);
  if (inWin(t, 'open', 0, 0.8)) artOpen(g, t);
  if (inWin(t, 'title', 0.2, 0.2)) artTitle(g, t);
  for (const id of ['p1', 'p2']) if (inWin(t, id, 0.2, 0.3)) artPart(g, t, id);
  if (inWin(t, 'risk', 0.3, 0.6)) artRisk(g, t);
  if (inWin(t, 'crowd', 0.3, 0.6)) artCrowd(g, t);
  if (inWin(t, 'flow', 0.3, 0.6)) artFlow(g, t);
  if (inWin(t, 'prob', 0.3, 0.6)) artProb(g, t);
  if (inWin(t, 'expect', 0.3, 0.6)) artExpect(g, t);
  if (inWin(t, 'liquid', 0.3, 0.6)) artLiquid(g, t);
  if (inWin(t, 'self', 0.3, 0.6)) artSelf(g, t);
  resetCam(g);
}

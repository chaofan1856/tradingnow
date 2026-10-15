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
const RED = '#E08A7E', GRN = '#8FC0A6', BUYC = '#E6A27C', SELLC = '#93C4A4';
const secA = (t, id) => ease(t, WIN[id][0] + 1.4, 1.0, SOFT) * (1 - ease(t, WIN[id][1] - 1.5, 0.9, SOFT));
function amb(i, t, o, a = 0.1, x0 = 160, y0 = 290, x1 = 1760, y1 = 770) {
  const p = P[i];
  o[0] = x0 + p.r1 * (x1 - x0) + 14 * Math.sin(t * 0.21 + p.r3 * TAU); o[1] = y0 + p.r2 * (y1 - y0) + 10 * Math.sin(t * 0.3 + p.r4 * TAU);
  o[2] = 0.9 + p.r5 * 1.1; o[3] = a * (0.55 + 0.45 * Math.sin(t * (0.8 + p.r6) + p.r1 * TAU)); o[4] = GOLD;
}
const smooth = (arr, u) => { const k = clamp(u) * (arr.length - 1), i0 = Math.floor(k), f = k - i0; return lerp(arr[i0], arr[Math.min(arr.length - 1, i0 + 1)], f); };
function polyFn(f, x0, x1, n = 80, upto = 1) { const pts = []; for (let k = 0; k <= n; k++) { const x = lerp(x0, x0 + (x1 - x0) * upto, k / n); pts.push([x, f(x)]); } return pts; }
function tri(g, x, y, s, dir, color, a) {          // filled triangle arrow head: dir 1 = up, -1 = down
  if (a <= 0.003) return;
  g.save(); g.globalAlpha = a; g.fillStyle = color; g.beginPath();
  g.moveTo(x, y - dir * s); g.lineTo(x - s * 0.8, y + dir * s * 0.6); g.lineTo(x + s * 0.8, y + dir * s * 0.6); g.closePath(); g.fill(); g.restore();
}

/* ---------------- OPEN: a jittering mess of candles; a gold average sweeps through and calms them ---------------- */
const OK_ = (() => { const R = rng(321), o = []; for (let c = 0; c < 40; c++) o.push({ x: 200 + c * 39, d: (R() - 0.5) * 2, bh: 6 + R() * 13, wu: 8 + R() * 16, wd: 8 + R() * 16, up: R() > 0.45, nb: 16 + R() * 26, ph: R() * TAU, nz: R() * 60 }); return o; })();
const maO = x => 600 - 0.12 * (x - 200) + 50 * Math.sin(x * 0.004 + 0.5);
const SW0 = () => lt('open', 1) + 0.3, SWD = 4.4;
const sweepX = t => lerp(100, 1820, clamp((t - SW0()) / SWD));
const calmAt = x => SW0() + (x - 100) / 1720 * SWD;
const NZ = noise1(91);
function fOpenK(i, t, o) {
  const c = Math.floor(i / 18), k = i % 18, K = OK_[c], p = P[i];
  const calm = ease(t, calmAt(K.x) - 0.1, 1.3, EXPO), dz = ease(t, lt('open', 3) + 0.8, 4.5, SOFT);
  const ny = 560 + 160 * NZ(c * 1.7 + t * 1.5 + K.nz), nbh = K.nb * 1.3 * (0.55 + 0.45 * Math.abs(NZ(c * 2.3 + t * 2.0 + 5)));
  const pull = life(t, lt('open', 2) - 0.2, le('open', 2) + 0.8, 1.0, 1.2);
  const cy = maO(K.x) + K.d * 20 + pull * 9 * Math.sin(t * 2.2 + K.ph);
  const yc = lerp(ny, cy, calm), bh = lerp(nbh, K.bh, calm), jit = (1 - calm) * 4.5;
  let x = K.x, y;
  if (k < 12) { x += ((k % 2) - 0.5) * 8; y = yc - bh + (Math.floor(k / 2) + 0.5) * (bh / 3); }
  else if (k < 15) y = yc - bh - (k - 11) * lerp(K.wu * 1.4, K.wu, calm) / 3;
  else y = yc + bh + (k - 14) * lerp(K.wd * 1.4, K.wd, calm) / 3;
  x += jit * Math.sin(t * 17 + i * 1.3); y += jit * Math.cos(t * 13 + i * 0.7);
  if (dz > 0) { x += dz * (40 + p.r1 * 300); y = lerp(y, maO(x) + (p.r2 - 0.5) * 150, dz * 0.85); }
  const flick = calm < 0.5 ? (NZ(c * 3.1 + t * 1.7 + 11) > 0) : K.up;
  o[0] = x; o[1] = y; o[2] = k < 12 ? 2.5 : 1.5;
  o[3] = (k < 12 ? 0.85 : 0.55) * (1 - 0.6 * dz) * (calm < 0.5 ? 0.75 + 0.25 * Math.sin(t * 9 + c) : 1); o[4] = flick ? UP : DOWN;
}

/* ---------------- ORIGIN ---------------- */
const OD = (() => { const R = rng(55), N1 = noise1(56), v = []; for (let j = 0; j < 48; j++) v.push(clamp(674 - 44 * Math.sin(j * 0.12 + 0.4) + 12 * N1(j * 0.3) + (R() - 0.5) * 74, 608, 748)); return v; })();
const ODX = j => 330 + j * 27.5;
const OMA = OD.map((_, j) => j < 4 ? OD[j] : (OD[j] + OD[j - 1] + OD[j - 2] + OD[j - 3] + OD[j - 4]) / 5);
const WHY = j => 770 - (220 + (750 - OD[j]) * 1.6);
const wT0 = () => lt('origin', 1) + 0.7, wT1 = () => le('origin', 2) - 0.9;
function winPos(t) {                               // sliding window: index of its newest point (4 … 47), hopping one step at a time
  const u = clamp((t - wT0()) / (wT1() - wT0())), idx = 4 + 43 * Math.pow(u, 1.5), k = Math.floor(idx), fr = idx - k;
  return Math.min(47, k + SWIFT(clamp((fr - 0.3) / 0.7)));
}
const revealT = j => wT0() + Math.pow((j - 4) / 43, 1 / 1.5) * (wT1() - wT0()) + 0.12;
function wheatHead(j, t) {
  const gr = ease(t, WIN.origin[0] + 2.1 + j * 0.025, 1.6, EXPO), m = ease(t, lt('origin', 0) + 4.0 + j * 0.03, 1.5, SWIFT);
  const sw = 0.07 * Math.sin(t * 1.2 + j * 0.45) + 0.03 * Math.sin(t * 2.3 + j), L = (770 - WHY(j)) * gr;
  return { gr, m, sw, hx: ODX(j) + Math.sin(sw) * L, hy: 770 - Math.cos(sw) * L };
}
function fWheat(i, t, o) {
  const p = P[i];
  if (i < 384) {
    const j = i >> 3, k = i & 7, W = wheatHead(j, t), r = k >> 1, side = (k & 1) ? 1 : -1;
    const ax = Math.sin(W.sw), ay = -Math.cos(W.sw);           // ear axis (towards the tip)
    const ex = W.hx - ax * r * 9 + (-ay) * side * 4.2, ey = W.hy - ay * r * 9 + ax * side * 4.2;
    const x = lerp(ex, ODX(j), W.m), y = lerp(ey, OD[j], W.m);
    const wp = winPos(t), inWin = t > wT0() - 0.4 && j <= wp + 0.5 && j >= wp - 4.5 && t < le('origin', 2) + 0.3;
    o[0] = x; o[1] = y; o[2] = lerp(1.9, k ? 1.2 : 3.0, W.m) * (0.4 + 0.6 * W.gr);
    o[3] = lerp(0.8, k ? 0.15 : 1, W.m) * (0.15 + 0.85 * W.gr); o[4] = W.m < 0.5 ? GOLD : (inWin ? GOLDHI : IVORY); return;
  }
  if (i < 560) {
    const q = i - 384, j = 4 + (q >> 2), k = q & 3, r = ease(t, revealT(j), 0.9, EXPO), s = j - k;
    o[0] = lerp(ODX(s), ODX(j), r); o[1] = lerp(OD[s], OMA[j], r); o[2] = k ? 1.3 : 2.3; o[3] = r * (k ? 0.35 : 0.95); o[4] = GOLDHI; return;
  }
  amb(i, t, o, 0.12 * (1 - 0.75 * lon('origin', 2, 0.6, 0.6, 0.3, 0)(t)), 160, 290, 1760, 560);
}
const RC = [620, 520];
const trajPt = s => [lerp(1000, 1720, s), (1 - s) * 740 + s * 560 - 4 * 300 * s * (1 - s)];
const projS = t => SOFT(seg(t, lt('origin', 3) + 0.5, le('origin', 3) - 0.3));
function fRadar(i, t, o) {
  const p = P[i];
  if (i < 300) {
    const ring = i < 60 ? 0 : i < 160 ? 1 : 2, k = ring === 0 ? i : ring === 1 ? i - 60 : i - 160, n = [60, 100, 140][ring], R = [85, 165, 245][ring];
    const th = k / n * TAU + t * 0.05 * (ring - 1), sweep = t * 1.6, d = Math.atan2(Math.sin(th - sweep), Math.cos(th - sweep));
    const hit = d < 0 && d > -1.2 ? Math.exp(d * 2.4) : 0;
    o[0] = RC[0] + Math.cos(th) * R; o[1] = RC[1] + Math.sin(th) * R; o[2] = 1.5 + hit; o[3] = 0.3 + 0.6 * hit; o[4] = hit > 0.4 ? GOLDHI : GOLD; return;
  }
  if (i < 380) {
    const k = i - 300, v = k < 40, s = (k % 40) / 39 * 2 - 1;
    o[0] = RC[0] + (v ? 0 : s * 255); o[1] = RC[1] + (v ? s * 255 : 0); o[2] = 1.1; o[3] = 0.22; o[4] = GOLD; return;
  }
  if (i < 600) {
    const s = (i - 380) / 219, ps = projS(t), [x, y] = trajPt(s), past = s <= ps;
    o[0] = x; o[1] = y; o[2] = past ? 1.8 : 1.3; o[3] = past ? 0.8 : 0.22 + 0.12 * Math.sin(t * 3 - s * 30); o[4] = past ? GOLDHI : IVORY; return;
  }
  amb(i, t, o, 0.1);
}
const WB = Array.from({ length: 20 }, (_, k) => ({ x: 600 + k * 38, h: 400 * Math.pow(0.8, 19 - k) }));
const WB_P = (() => { const a = []; WB.forEach((b, k) => { const n = Math.max(1, Math.round(b.h / 10)); for (let r = 0; r < n; r++) for (let c = 0; c < 2; c++) a.push([k, c, r, n]); }); return a; })();
function fWeights(i, t, o) {
  if (i < WB_P.length) {
    const [k, c, r] = WB_P[i], b = WB[k], rise = ease(t, lt('origin', 4) + 0.2 + (19 - k) * 0.07, 1.3, EXPO), w = b.h / 400;
    o[0] = b.x + (c - 0.5) * 9; o[1] = 760 - (r + 0.5) * 10 * rise; o[2] = 1.6 + w * 0.8; o[3] = (0.35 + 0.6 * w) * (0.9 + 0.1 * Math.sin(t * 2 + r * 0.4)); o[4] = k > 15 ? GOLDHI : GOLD; return;
  }
  amb(i, t, o, 0.1);
}
const LOOPC = { x: 1360, y: 470, rx: 375, ry: 168 };
function fLoop(i, t, o) {
  const p = P[i];
  if (i < 400) {
    const th = i / 400 * TAU + t * 0.55, pk = Math.pow(0.5 + 0.5 * Math.cos(th - t * 0.55 * 3 - 1), 6), j = (p.r1 - 0.5) * 8;
    o[0] = LOOPC.x + Math.cos(th) * (LOOPC.rx + j); o[1] = LOOPC.y + Math.sin(th) * (LOOPC.ry + j); o[2] = 1.3 + pk * 1.3; o[3] = 0.22 + 0.7 * pk; o[4] = pk > 0.5 ? GOLDHI : GOLD; return;
  }
  amb(i, t, o, 0.08, 980, 290, 1780, 770);
}
const DU = (() => { const R = rng(808), pr = []; for (let k = 0; k < 64; k++) { const st = SOFT(clamp((k - 27) / 4)); pr.push(640 - 205 * st + (R() - 0.5) * 26 + 6 * Math.sin(k * 0.9)); }
  const sma = pr.map((_, k) => { let s = 0, c = 0; for (let j = Math.max(0, k - 11); j <= k; j++) { s += pr[j]; c++; } return s / c; });
  const ema = []; pr.forEach((v, k) => ema.push(k ? ema[k - 1] + 0.26 * (v - ema[k - 1]) : v)); return { pr, sma, ema }; })();
const DUX = k => 180 + k * 10;
const duRv = t => SOFT(seg(t, lt('origin', 6) - 0.1, lt('origin', 6) + 3.4));
function fDual(i, t, o) {
  if (i < 300) {
    const u = i / 299, rv = duRv(t);
    o[0] = lerp(DUX(0), DUX(63), u); o[1] = smooth(DU.pr, u); o[2] = 1.6; o[3] = u <= rv ? 0.75 : 0.06; o[4] = IVORY; return;
  }
  amb(i, t, o, 0.08, 150, 290, 860, 770);
}

/* ---------------- GRANVILLE ---------------- */
const maG = (x, s) => 600 + 42 * Math.sin((x + s) * 0.0042 + 0.3);
const integ = x => x <= 0 ? 0 : x - (1 - Math.exp(-x));
const scrollG = t => 70 * integ(t - (lt('granville', 1) - 0.3));
const AX = 1060, AY0 = 352;
const fallT = () => lt('granville', 0) + 2.6, GRV = 1500;
const landY = () => maG(AX, 0) - 32;
const landT = () => fallT() + Math.sqrt(2 * (landY() - AY0) / GRV);
function bounceH(dt) {                             // decaying bounces after the apple lands
  let h = 70, s = 0;
  for (let n = 0; n < 4; n++) { const T = 2 * Math.sqrt(2 * h / GRV); if (dt < s + T) { const u = dt - s; return Math.sqrt(2 * GRV * h) * u - 0.5 * GRV * u * u; } s += T; h *= 0.35; }
  return 0;
}
function devG(t) {
  if (t < landT()) return 0;
  const osc = life(t, lt('granville', 1) - 1.2, le('granville', 1) + 0.9, 1.6, 1.0);
  return -bounceH(t - landT()) * (1 - osc) - osc * 150 * Math.sin(1.35 * (t - lt('granville', 1) + 0.2)) * (0.65 + 0.35 * Math.sin(0.5 * t));
}
const priceG = t => maG(AX, scrollG(t)) + devG(t);
function fGrav(i, t, o) {
  const p = P[i], s = scrollG(t);
  if (i < 260) {
    const u = i / 259, x = lerp(150, 1770, u), on = ease(t, WIN.granville[0] + 1.3 + u * 1.2, 0.9, SOFT);
    o[0] = x; o[1] = maG(x, s) + 1.5 * Math.sin(t * 2 + i); o[2] = i % 3 ? 1.5 : 2.1; o[3] = 0.75 * on; o[4] = i % 3 ? GOLD : GOLDHI; return;
  }
  const up = p.r2 < 0.5, x = 160 + p.r1 * 1600, y0 = up ? 290 + p.r3 * 200 : 770 - p.r3 * 70;
  const u = ((t * (0.09 + 0.07 * p.r4) + p.r5) % 1), on = ease(t, WIN.granville[0] + 2.0, 1.6, SOFT);
  o[0] = x + (p.r6 - 0.5) * 30 * (1 - u); o[1] = lerp(y0, maG(x, s), u * u); o[2] = 1 + p.r6; o[3] = 0.32 * Math.sin(Math.PI * u) * on; o[4] = p.r3 < 0.3 ? IVORY : GOLD;
}
const maS = x => 600 + 18 * Math.sin(x * 0.006);
function snapDev(u) {                              // + = above the average
  let d = 6 * Math.sin(u * 70);
  if (u > 0.06 && u < 0.42) d += 250 * Math.pow(SOFT((u - 0.06) / 0.36), 1.3);
  if (u >= 0.42 && u < 0.62) d += 250 * (1 - SOFT(clamp((u - 0.42) / 0.07))) - 34 * Math.sin((u - 0.42) * 50) * Math.exp(-(u - 0.42) * 30) * clamp((u - 0.42) / 0.07);
  if (u >= 0.6 && u < 0.85) d -= 150 * Math.pow(SOFT((u - 0.6) / 0.25), 1.2);
  if (u >= 0.85) d -= 150 * (1 - SOFT(clamp((u - 0.85) / 0.06))) - 22 * Math.sin((u - 0.85) * 50) * Math.exp(-(u - 0.85) * 30) * clamp((u - 0.85) / 0.06);
  return d;
}
const snapX = u => 1000 + 760 * u, snapY = u => maS(snapX(u)) - snapDev(u);
const snapU = t => clamp((t - lt('granville', 2) - 0.1) / ((le('granville', 2) - lt('granville', 2)) * 0.9));
function fSnap(i, t, o) {
  const p = P[i];
  if (i < 220) { const x = lerp(1000, 1770, i / 219); o[0] = x; o[1] = maS(x) + 1.5 * Math.sin(t * 2 + i); o[2] = i % 3 ? 1.5 : 2.1; o[3] = 0.75; o[4] = i % 3 ? GOLD : GOLDHI; return; }
  if (i < 600) {
    const up = p.r2 < 0.5, x = 1000 + p.r1 * 770, y0 = up ? 290 + p.r3 * 180 : 780 - p.r3 * 60, u = ((t * (0.09 + 0.07 * p.r4) + p.r5) % 1);
    o[0] = x; o[1] = lerp(y0, maS(x), u * u); o[2] = 1 + p.r6; o[3] = 0.3 * Math.sin(Math.PI * u); o[4] = p.r3 < 0.3 ? IVORY : GOLD; return;
  }
  amb(i, t, o, 0.07, 980, 290, 1780, 770);
}
const maR = x => 330 + (x - 170) * 0.2, maSp = x => 765 - (x - 170) * 0.24;
const TOUCH = [330, 520, 720];
const gapM = x => { let m = 0; for (const xt of TOUCH) m = Math.max(m, Math.exp(-Math.abs(x - xt) / 42)); return 4 + 74 * (1 - m) * clamp((x - 170) / 60 + 0.4); };
const moatU = (t, d = 0) => SOFT(seg(t, lt('granville', 3) + d, lt('granville', 3) + d + 4.4));
function fMoat(i, t, o) {
  const p = P[i];
  if (i < 300) { const top = i < 150, u = (i % 150) / 149, x = lerp(170, 830, u); o[0] = x; o[1] = (top ? maR(x) : maSp(x)) + 1.2 * Math.sin(t * 2 + i); o[2] = i % 3 ? 1.5 : 2.1; o[3] = 0.78; o[4] = i % 3 ? GOLD : GOLDHI; return; }
  if (i < 560) {
    const top = i < 430, u = ((i - 300) % 130) / 129, x = lerp(170, 830, u), rv = moatU(t, top ? 0.4 : 0);
    o[0] = x; o[1] = top ? maR(x) + gapM(x) : maSp(x) - gapM(x); o[2] = 1.5; o[3] = u <= rv ? 0.7 : 0.05; o[4] = IVORY; return;
  }
  amb(i, t, o, 0.08, 150, 290, 880, 770);
}
const E8 = (() => {
  const CP = [[0, 0.62], [0.05, 0.42], [0.1, 0.1], [0.14, 0.22], [0.2, 0.40], [0.24, 0.47], [0.285, 0.38], [0.33, 0.56], [0.38, 0.64], [0.42, 0.62], [0.48, 0.76], [0.53, 0.97], [0.58, 0.80], [0.63, 0.68], [0.67, 0.56], [0.72, 0.48], [0.76, 0.62], [0.8, 0.46], [0.84, 0.40], [0.885, 0.43], [0.93, 0.33], [1, 0.24]];
  const cr = u => { let k = 0; while (k < CP.length - 2 && u > CP[k + 1][0]) k++; const p0 = CP[Math.max(0, k - 1)], p1 = CP[k], p2 = CP[k + 1], p3 = CP[Math.min(CP.length - 1, k + 2)], s = (u - p1[0]) / (p2[0] - p1[0]), s2 = s * s, s3 = s2 * s;
    return 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * s + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3); };
  const n = 400, pr = [], ma = [];
  for (let i = 0; i <= n; i++) pr.push(cr(i / n));
  for (let i = 0; i <= n; i++) { let s = 0, c = 0; for (let j = Math.max(0, i - 40); j <= i; j++) { s += pr[j]; c++; } ma.push(s / c); }
  return { pr, ma };
})();
const E8X = u => 200 + u * 1520, E8Y = v => 752 - v * 380;
const MK8 = [[0.10, 4, 1], [0.15, 1, 1], [0.285, 2, 1], [0.42, 3, 1], [0.53, 8, -1], [0.572, 5, -1], [0.76, 6, -1], [0.885, 7, -1]];
const e8Rv = t => SOFT(seg(t, lt('granville', 4) + 0.1, lt('granville', 4) + 4.8));
function fEight(i, t, o) {
  if (i < 380) { const u = i / 379; o[0] = E8X(u); o[1] = E8Y(smooth(E8.pr, u)); o[2] = 1.5; o[3] = u <= e8Rv(t) ? 0.7 : 0.05; o[4] = IVORY; return; }
  if (i < 680) { const u = (i - 380) / 299; o[0] = E8X(u); o[1] = E8Y(smooth(E8.ma, u)); o[2] = i % 3 ? 1.5 : 2.1; o[3] = u <= e8Rv(t - 0.3) ? 0.85 : 0.08; o[4] = i % 3 ? GOLD : GOLDHI; return; }
  amb(i, t, o, 0.07);
}

/* ---------------- TELEGRAM ---------------- */
const MORSE = { S: '...', E: '.', L: '.-..', V: '...-', R: '.-.', Y: '-.--', T: '-', H: '....', I: '..', N: '-.', G: '--.' };
const MSG = 'SELL EVERYTHING';
const TP = (() => {                                 // morse elements: unit start, length, letter index, centre unit inside the letter
  const el = []; let u = 0;
  [...MSG].forEach((ch, L) => {
    if (ch === ' ') { u += 4; return; }
    const code = MORSE[ch]; let w = 0; for (const c of code) w += (c === '-' ? 3 : 1) + 1; w -= 1;
    let v = 0; for (const c of code) { const len = c === '-' ? 3 : 1; el.push({ u: u + v, len, L, lu: v + len / 2 - w / 2 }); v += len + 1; }
    u += w + 3;
  });
  const parts = []; el.forEach((e, k) => { const n = e.len === 3 ? 3 : 1; for (let s = 0; s < n; s++) parts.push({ k, s }); });
  return { el, parts, M: u + 10 };
})();
const TU = 9, TSPD = 120, tapeY0 = 290, tapeY1 = 392;
function tapeScroll(t) {
  const T0 = lt('telegram', 0) - 1.2, a = lt('telegram', 1) - 0.7, b = lt('telegram', 1) + 0.4;
  if (t < a) return TSPD * (t - T0);
  const d = Math.min(t, b) - a; return TSPD * (a - T0) + TSPD * (d - d * d / (2 * (b - a)));
}
const slotX = L => 960 + (L - 7) * 92;
const letterT = L => lt('telegram', 1) + 0.35 + L * 0.27;
function fTape(i, t, o) {
  const p = P[i], np = TP.parts.length;
  if (i < np * 3) {
    const copy = Math.floor(i / np), part = TP.parts[i % np], e = TP.el[part.k];
    const ux = (e.u + (e.len === 3 ? part.s + 0.5 : e.len / 2)) * TU;
    let x = 1760 - tapeScroll(t) + copy * TP.M * TU + ux;
    const vis = clamp((1760 - x) / 30) * clamp((x - 140) / 40);
    const st = copy === 0 ? ease(t, lt('telegram', 1) - 0.5 + e.L * 0.05, 1.3, SWIFT) : 0;
    const sx = slotX(e.L) + (e.lu + (e.len === 3 ? part.s - 1 : 0)) * 5.5;
    o[0] = lerp(x, sx, st); o[1] = lerp(322, 320, st); o[2] = 2.7; o[3] = lerp(0.9 * vis, 0.95, st) * (copy ? 1 - ease(t, lt('telegram', 1) - 0.4, 1.0, SOFT) : 1);
    o[4] = st > 0.5 && t > letterT(e.L) ? UP : GOLDHI; return;
  }
  if (i < np * 3 + 300) {
    const k = i - np * 3, row = k % 2, x = 140 + ((((k >> 1) * 11 - tapeScroll(t)) % 1650) + 1650) % 1650;
    o[0] = x; o[1] = row ? tapeY1 - 4 : tapeY0 + 4; o[2] = 1.2; o[3] = 0.35 * clamp((x - 140) / 60) * clamp((1790 - x) / 60) * ease(t, WIN.telegram[0] + 1.2, 1.2, SOFT); o[4] = GOLD; return;
  }
  amb(i, t, o, 0.08, 160, 420, 1760, 770);
}
const CR = (() => { const R = rng(1981), out = []; let p = 100.5;
  for (let k = 0; k < 36; k++) {
    let o = p, c;
    if (k < 24) c = o + (R() - 0.52) * 1.6; else if (k === 24) { o = p - 0.6; c = o - 8.2; } else c = o + (R() - 0.55) * 1.5;
    const hi = Math.max(o, c) + R() * 0.8, lo = Math.min(o, c) - R() * 0.8 - (k === 24 ? 1.2 : 0); out.push({ o, c, hi, lo }); p = c;
  }
  return out; })();
const CRX = k => 330 + k * 36, CRY = v => 296 + (102.5 - v) * 15;
const VOL = (() => { const R = rng(77), v = []; for (let k = 0; k < 36; k++) v.push(k === 24 ? 220 : k > 24 ? 40 + R() * 22 : 12 + R() * 26); return v; })();
const VOL_P = (() => { const a = []; VOL.forEach((h, k) => { const n = Math.max(1, Math.round(h / 8)); for (let r = 0; r < n; r++) for (let c = 0; c < 2; c++) a.push([k, c, r]); }); return a; })();
const crT = k => k < 24 ? lt('telegram', 2) - 0.1 + k * 0.1 : lt('telegram', 3) + 0.7 + (k - 24) * 0.22;
function fCrash(i, t, o) {
  const p = P[i];
  if (i < VOL_P.length) {
    const [k, c, r] = VOL_P[i], rise = ease(t, crT(k) + 0.1, 1.0, EXPO), spike = k === 24;
    o[0] = CRX(k) + (c - 0.5) * 9; o[1] = 770 - (r + 0.5) * 8 * rise; o[2] = spike ? 2.1 : 1.6; o[3] = (spike ? 0.95 : 0.55) * (r < 1 || rise > 0.05 ? 1 : 0); o[4] = spike ? GOLDHI : (k > 24 ? DOWN : GOLD); return;
  }
  const u = ((t * (0.32 + p.r4 * 0.3) + p.r5) % 1), x = 330 + p.r1 * 1270 - u * 40;
  const rain = 0.06 + 0.36 * life(t, lt('telegram', 3) + 0.4, le('telegram', 3) + 0.4, 0.8, 1.6);
  o[0] = x; o[1] = lerp(285, 700, u); o[2] = 1.1 + p.r6 * 0.8; o[3] = (p.r2 < rain ? 0.55 : 0) * Math.sin(Math.PI * u); o[4] = DOWN;
}
const HC = [960, 480];
function fHalo(i, t, o) {
  const p = P[i];
  if (i < 384) {
    const r = i % 16, j = Math.floor(i / 16), th = r / 16 * TAU - Math.PI / 2, crown = 0.5 + 0.5 * Math.cos(th + Math.PI / 2 - Math.PI);
    const L = 110 + 120 * Math.pow(0.5 - 0.5 * Math.sin(th), 1.5), u = ((j / 24 + t * 0.12) % 1), R = 46 + u * L;
    o[0] = HC[0] + Math.cos(th) * R; o[1] = HC[1] + Math.sin(th) * R; o[2] = 1.2 + (1 - u) * 1.2; o[3] = 0.85 * Math.pow(1 - u, 1.3) * (0.7 + 0.3 * Math.sin(t * 3 + r)); o[4] = u < 0.3 ? GOLDHI : GOLD; return;
  }
  if (i < 584) { const k = i - 384, ring = k < 80, th = (ring ? k / 80 : (k - 80) / 120) * TAU + t * (ring ? 0.2 : -0.12), R = ring ? 30 : 64;
    o[0] = HC[0] + Math.cos(th) * R; o[1] = HC[1] + Math.sin(th) * R; o[2] = 1.3; o[3] = 0.6; o[4] = GOLDHI; return; }
  amb(i, t, o, 0.08);
}
const BX = yr => 180 + (yr - 1982) * 104;
const bullMA = x => 730 - 380 * Math.pow(clamp((x - 180) / 1560), 1.3) + 7 * Math.sin(x * 0.012);
const NB = noise1(1982);
const bullP = x => bullMA(x) - 34 - 24 * NB(x * 0.018) - 9 * NB(x * 0.07 + 40) + (x > BX(1987.75) ? 110 * Math.exp(-(x - BX(1987.75)) / 40) * clamp((x - BX(1987.75)) / 8) : 0);
const bullRv = t => SOFT(seg(t, lt('telegram', 5) + 0.1, lt('telegram', 5) + 5.2));
function fBull(i, t, o) {
  const p = P[i];
  if (i < 320) { const u = i / 319, x = lerp(180, 1740, u); o[0] = x; o[1] = bullMA(x) + 1.2 * Math.sin(t * 2 + i); o[2] = i % 3 ? 1.5 : 2.1; o[3] = u <= bullRv(t - 0.25) ? 0.85 : 0.06; o[4] = i % 3 ? GOLD : GOLDHI; return; }
  if (i < 580) { const u = (i - 320) / 259, x = lerp(180, 1740, u); o[0] = x; o[1] = bullP(x); o[2] = 1.5; o[3] = u <= bullRv(t) ? 0.7 : 0.04; o[4] = IVORY; return; }
  amb(i, t, o, 0.07);
}
const curY = (x, t) => 650 + 38 * Math.sin(x * 0.0034 - t * 0.35);
function fTide(i, t, o) {
  const p = P[i], k7 = lt('telegram', 7);
  if (i < 360) {
    const x = 160 + p.r1 * 1600, A = 46 * (1 - ease(t, k7 + 0.6, 4.5, SOFT));
    const chop = A * (0.6 * Math.sin(x * 0.045 + t * 3.1 + p.r2 * 2) + 0.4 * Math.sin(x * 0.021 - t * 2.3 + p.r3)) + (p.r4 - 0.5) * 24;
    const sink = ease(t, k7 + 1.6 + p.r3 * 2.2, 2.6, SOFT);
    o[0] = x; o[1] = lerp(430 + chop, curY(x, t) + (p.r2 - 0.5) * 28, sink); o[2] = 1.1 + p.r5; o[3] = lerp(0.42, 0.5, sink); o[4] = sink > 0.5 ? GOLD : (p.r6 < 0.5 ? IVORY : TEAL); return;
  }
  if (i < 680) { const x = 160 + ((p.r1 * 1600 + t * 22) % 1600); o[0] = x; o[1] = curY(x, t) + (p.r2 - 0.5) * 34; o[2] = 1.3 + p.r5 * 0.9; o[3] = 0.5 * clamp((x - 160) / 80) * clamp((1760 - x) / 80); o[4] = p.r3 < 0.4 ? GOLDHI : GOLD; return; }
  amb(i, t, o, 0.05);
}

const FILM_FORM = { openK: fOpenK, wheat: fWheat, radar: fRadar, weights: fWeights, loop: fLoop, dual: fDual, grav: fGrav, snap: fSnap, moat: fMoat, eight: fEight, tape: fTape, crash: fCrash, halo: fHalo, bull: fBull, tide: fTide };
function FILM_SCHED() {
  return [
    [0.3, 'openK'],
    [WIN.origin[0] - 0.2, 'wheat'], [lt('origin', 3) - 0.5, 'radar'], [lt('origin', 4) - 0.4, 'weights'], [lt('origin', 5) - 0.5, 'loop'], [lt('origin', 6) - 0.5, 'dual'],
    [WIN.granville[0] - 0.2, 'grav'], [lt('granville', 2) - 0.5, 'snap'], [lt('granville', 3) - 0.5, 'moat'], [lt('granville', 4) - 0.5, 'eight'],
    [WIN.telegram[0] - 0.2, 'tape'], [lt('telegram', 2) - 0.3, 'crash'], [lt('telegram', 4) - 0.4, 'halo'], [lt('telegram', 5) - 0.5, 'bull'], [lt('telegram', 7) - 0.4, 'tide'],
  ];
}

/* ---------------- line-art ---------------- */
function measure(g, s, size, font = 'latin', weight = 400) {
  const fam = font === 'latin' ? "'CormorantSub','Cormorant Garamond',serif" : "'NotoSerifSub','Noto Serif SC',serif";
  const px = size < 70 ? Math.round(size * 1.22) : size; g.save(); g.font = `${weight} ${px}px ${fam}`; const w = g.measureText(s).width; g.restore(); return w;
}
function subLabel(g, base, sub, x, y, a, color = C.ivory) {    // "P" with a true subscript digit
  const w1 = measure(g, base, 24, 'latin', 500), w2 = measure(g, sub, 17, 'latin', 500), x0 = x - (w1 + w2 + 2) / 2;
  text(g, base, x0, y, { font: 'latin', size: 24, weight: 500, color, a, align: 'left', track: 0 });
  text(g, sub, x0 + w1 + 2, y + 10, { font: 'latin', size: 17, weight: 500, color, a, align: 'left', track: 0 });
}
function artOrigin(g, t) {
  const A = secA(t, 'origin');
  if (A <= 0) return;
  // line 0: wheat stalks (one batched path), turning into data
  const st = life(t, WIN.origin[0] + 1.3, le('origin', 0) + 1.5, 1.0, 1.2) * A;
  if (st > 0) {
    g.save(); g.strokeStyle = C.gold; g.lineCap = 'round';
    for (let j = 0; j < 48; j++) {
      const W = wheatHead(j, t), a = st * (1 - W.m) * W.gr; if (a <= 0.01) continue;
      const bx = ODX(j), cx = bx + (W.hx - bx) * 0.2, cy = lerp(770, W.hy, 0.55);
      g.globalAlpha = a * 0.7; g.lineWidth = 1.1; g.beginPath(); g.moveTo(bx, 770); g.quadraticCurveTo(cx, cy, W.hx, W.hy + 30); g.stroke();
      const ly = lerp(770, W.hy, 0.45), lx = lerp(bx, W.hx, 0.45), sd = j % 2 ? 1 : -1;
      g.globalAlpha = a * 0.45; g.beginPath(); g.moveTo(lx, ly); g.quadraticCurveTo(lx + sd * 16, ly - 6, lx + sd * 26, ly - 28); g.stroke();
      g.globalAlpha = a * 0.5; g.lineWidth = 0.8;              // awns
      g.beginPath(); g.moveTo(W.hx, W.hy); g.lineTo(W.hx + Math.sin(W.sw) * 24 - 4, W.hy - Math.cos(W.sw) * 24); g.moveTo(W.hx, W.hy); g.lineTo(W.hx + Math.sin(W.sw) * 24 + 4, W.hy - Math.cos(W.sw) * 24); g.stroke();
    }
    g.restore();
    goldStroke(g, [[300, 770], [1650, 770]], ease(t, WIN.origin[0] + 1.4, 1.4, SWIFT), { w: 1, a: st * 0.55 * (1 - ease(t, lt('origin', 0) + 5, 1.2, SOFT)), glow: 0.2 });
    text(g, 'R. H. HOOKER · 1901', 1640, 300, { font: 'latin', size: 20, color: C.gold, a: st * 0.85 * (1 - ease(t, lt('origin', 0) + 4.2, 0.8, SOFT)), align: 'right', track: 0.35 });
  }
  const dl = life(t, lt('origin', 0) + 5.2, le('origin', 0) + 0.6, 0.9, 0.7) * A;
  if (dl > 0) { text(g, '经济数据 · 短期起伏', ODX(0), 560, { size: 24, color: C.ivory, a: dl * 0.85, align: 'left', track: 0.2 }); }
  // lines 1–2: the sliding window and the average line it leaves behind
  const wa = life(t, lt('origin', 1) + 0.2, le('origin', 2) + 0.4, 0.9, 0.8) * A;
  if (wa > 0) {
    const wp = winPos(t), x0 = ODX(wp - 4) - 14, x1 = ODX(wp) + 14, y0 = 590, y1 = 764, c = 16;
    g.save(); g.globalAlpha = wa * 0.07; g.fillStyle = C.goldHi; g.fillRect(x0, y0, x1 - x0, y1 - y0); g.restore();
    for (const [px, py, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) goldStroke(g, [[px + sx * c, py], [px, py], [px, py + sy * c]], 1, { w: 1.6, a: wa, glow: 0.5, color: C.goldHi });
    goldStroke(g, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 1, { w: 0.8, a: wa * 0.35, glow: 0, close: true });
    const k = Math.round(wp), mean = OMA[Math.max(4, k)];
    g.save(); g.setLineDash([5, 6]); goldStroke(g, [[x0 + 4, mean], [x1 - 4, mean]], 1, { w: 1.2, a: wa * 0.75, glow: 0, color: C.goldHi }); g.restore();
    const n1 = life(t, lt('origin', 1) + 0.6, le('origin', 1) + 0.2, 0.7, 0.5) * A;
    text(g, 'N = 5', (x0 + x1) / 2, 566, { font: 'latin', size: 24, weight: 500, color: C.goldHi, a: n1, track: 0.1 });
    // average line through the dots revealed so far
    const pts = []; for (let j = 4; j <= 47; j++) { const r = ease(t, revealT(j), 0.9, EXPO); if (r < 0.98) break; pts.push([ODX(j), OMA[j]]); }
    if (pts.length > 1) goldStroke(g, pts, 1, { w: 2, a: wa, glow: 0.6, color: C.goldHi });
    // line 2: label the window's points with true subscripts, away from the centre line
    const l2 = lon('origin', 2, 0.7, 0.7, 0.1, 0.2)(t) * A;
    if (l2 > 0) {
      ['1', '2', '3', '4', 'n'].forEach((s, q) => subLabel(g, 'P', s, (x0 + x1) / 2 + (q - 2) * 50, 784, l2 * 0.9));
      text(g, 'MA', x1 + 14, mean, { font: 'latin', size: 24, weight: 600, color: C.goldHi, a: l2, align: 'left', track: 0.1 });
    }
    const done = ease(t, revealT(47) + 0.4, 0.8) * wa;
    text(g, '移动平均线', ODX(47) + 18, OMA[47] - 34, { size: 24, weight: 600, color: C.goldHi, a: done, align: 'left', track: 0.18 });
  }
  // line 3: radar sweep + ballistic trajectory
  const r3 = lon('origin', 3, 0.9, 0.8, 0.3, 0.3)(t) * A;
  if (r3 > 0) {
    const sweep = t * 1.6;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 16; k++) { g.globalAlpha = r3 * 0.06 * (1 - k / 16); g.fillStyle = C.goldHi; g.beginPath(); g.moveTo(RC[0], RC[1]); g.arc(RC[0], RC[1], 248, sweep - (k + 1) * 0.04, sweep - k * 0.04); g.closePath(); g.fill(); }
    g.restore();
    goldStroke(g, [RC, [RC[0] + Math.cos(sweep) * 250, RC[1] + Math.sin(sweep) * 250]], 1, { w: 1.4, a: r3 * 0.9, glow: 0.5, color: C.goldHi });
    [[0.9, 140], [2.6, 200], [4.4, 110]].forEach(([th, R]) => { const d = ((sweep - th) % TAU + TAU) % TAU, b = Math.exp(-d * 1.4); glowDot(g, RC[0] + Math.cos(th) * R, RC[1] + Math.sin(th) * R, 2.6, r3 * (0.15 + 0.85 * b), C.goldHi); });
    text(g, '雷达跟踪', RC[0], RC[1] + 285, { size: 24, color: C.ivory, a: r3 * 0.85, track: 0.3 });
    const ps = projS(t), hp = trajPt(ps);
    glowDot(g, hp[0], hp[1], 3.6, r3 * clamp(ps * 20) * (1 - ease(ps, 0.97, 0.03)));
    text(g, '弹道预测', trajPt(0.5)[0], trajPt(0.5)[1] - 40, { size: 24, color: C.ivory, a: r3 * 0.85, track: 0.3 });
    g.save(); g.setLineDash([3, 7]); goldStroke(g, [[RC[0] + 250, RC[1]], [trajPt(0.08)[0] - 10, RC[1]]], 1, { w: 1, a: r3 * 0.35, glow: 0 }); g.restore();
  }
  // line 4: exponential weights
  const w4 = lon('origin', 4, 0.9, 0.8, 0.0, 0.3)(t) * A;
  if (w4 > 0) {
    const pts = WB.map(b => [b.x, 760 - b.h - 10]);
    goldStroke(g, pts, ease(t, lt('origin', 4) + 1.2, 1.6, SWIFT), { w: 1.4, a: w4 * 0.8, glow: 0.4, color: C.goldHi });
    text(g, '指数平滑 · 越新权重越大', 960, 296, { size: 28, weight: 600, color: C.goldHi, a: w4 * ease(t, lt('origin', 4) + 0.8, 1.0), track: 0.2 });
    text(g, '旧', WB[0].x, 784, { size: 22, color: C.ivory, a: w4 * 0.75 });
    text(g, '新', WB[19].x, 784, { size: 22, color: C.goldHi, a: w4 });
    goldStroke(g, [[WB[2].x, 784], [WB[17].x, 784]], ease(t, lt('origin', 4) + 1.0, 1.4, SWIFT), { w: 1, a: w4 * 0.5, glow: 0 });
    g.save(); g.translate(WB[17].x + 4, 784); g.rotate(Math.PI / 2); tri(g, 0, 0, 7, 1, C.gold, w4 * 0.6 * ease(t, lt('origin', 4) + 2.2, 0.5)); g.restore();
  }
  // line 5 (L column): the recursion as glowing tokens on the right
  const l5 = lon('origin', 5, 0.8, 0.8, 0.0, 0.3)(t) * A;
  if (l5 > 0) {
    const toks = [['EMA', 0], ['=', 0], ['EMA', 1], ['+', 2], ['a', 0], ['×', 3], ['(', 0], ['P', 0], ['-', 0], ['EMA', 1], [')', 0]];
    const gap = 15, ws = toks.map(([s]) => measure(g, s, 43, 'latin', 500) + (s === 'EMA' ? 6 : 0) + (s === '+' || s === '×' ? 22 : 0));
    let x = LOOPC.x - (ws.reduce((a, b) => a + b, 0) + gap * (toks.length - 1)) / 2;
    const y = LOOPC.y - 6;
    toks.forEach(([s, f], k) => {
      const q = l5 * ease(t, lt('origin', 5) + 0.2 + k * 0.12, 0.7), cx = x + ws[k] / 2, hl = f >= 2;
      text(g, s, cx, y, { font: 'latin', size: 43, weight: 500, italic: s === 'a', color: hl ? C.goldHi : C.ivory, a: q, track: 0 });
      if (f === 1) goldStroke(g, [[x + ws[k] - 1, y - 33], [x + ws[k] - 5, y - 19]], 1, { w: 2, a: q, glow: 0, color: C.ivory });
      if (hl) {
        const k2 = l5 * ease(t, lt('origin', 5) + 1.8 + (3 - f) * 0.6, 0.8), dy = f === 3 ? 1 : -1;
        goldStroke(g, arcPts(cx, y + 2, 21 + 1.5 * Math.sin(t * 3 + f), 0, TAU, 40), k2, { w: 1.4, a: k2, glow: 0.6, color: C.goldHi });
        goldStroke(g, [[cx, y + 2 + dy * 24], [cx, y + 2 + dy * 48]], k2, { w: 1, a: k2 * 0.7, glow: 0 });
        text(g, f === 3 ? '一次乘法' : '一次加法', cx, y + 2 + dy * 70, { size: 24, weight: 600, color: C.goldHi, a: k2, track: 0.2 });
      }
      x += ws[k] + gap;
    });
    text(g, 'a = 2 / (N + 1)', LOOPC.x, LOOPC.y + 136, { font: 'latin', size: 24, italic: true, color: C.gold, a: l5 * ease(t, lt('origin', 5) + 3.0, 1.0), track: 0.06 });
  }
  // line 6 (R column): SMA vs EMA on the left
  const l6 = life(t, lt('origin', 6) - 0.3, WIN.origin[1] - 0.6, 0.8, 0.9);
  if (l6 > 0) {
    const rv = duRv(t), n = Math.max(2, Math.floor(rv * 63) + 1);
    const sp = DU.sma.slice(0, n).map((v, k) => [DUX(k), v]), ep = DU.ema.slice(0, n).map((v, k) => [DUX(k), v]);
    g.save(); g.setLineDash([6, 7]); goldStroke(g, sp, 1, { w: 1.6, a: l6 * 0.8, glow: 0, color: C.ivory }); g.restore();
    goldStroke(g, ep, 1, { w: 2.4, a: l6, glow: 0.7, color: C.goldHi });
    const la = l6 * ease(t, lt('origin', 6) + 2.6, 0.9);
    for (const [k, lx, lab, col, arr] of [[30, 560, 'EMA', C.goldHi, DU.ema], [36, 720, 'SMA', C.ivory, DU.sma]]) {
      const px = DUX(k), py = arr[k];
      goldStroke(g, [[px, py + 6], [lx, 712]], la, { w: 1, a: la * 0.6, glow: 0, color: col });
      glowDot(g, px, py, 2.4, la);
      text(g, lab, lx, 736, { font: 'latin', size: 28, weight: 600, color: col, a: la, track: 0.12 });
    }
    text(g, '价格', DUX(63) + 16, DU.pr[63] - 26, { size: 22, color: C.ivory, a: la * 0.7, align: 'left', track: 0.2 });
  }
}
function drawApple(g, x, y, s, a) {
  if (a <= 0.003) return;
  const pts = []; for (let k = 0; k <= 60; k++) { const th = k / 60 * TAU, r = 20 * s * (1 - 0.18 * Math.pow(Math.max(0, Math.cos(th + Math.PI / 2)), 6)); pts.push([x + Math.cos(th) * r * 1.05, y + Math.sin(th) * r * (Math.sin(th) > 0 ? 1.0 : 0.92)]); }
  goldStroke(g, pts, 1, { w: 1.8, a, glow: 0.6, color: C.goldHi });
  goldStroke(g, [[x, y - 17 * s], [x + 3 * s, y - 30 * s]], 1, { w: 1.6, a, glow: 0, color: C.gold });
  goldStroke(g, [[x + 3 * s, y - 26 * s], [x + 14 * s, y - 34 * s], [x + 22 * s, y - 28 * s], [x + 11 * s, y - 22 * s], [x + 3 * s, y - 26 * s]], 1, { w: 1.2, a: a * 0.8, glow: 0, color: C.gold });
}
function artGranville(g, t) {
  const A = secA(t, 'granville');
  if (A <= 0) return;
  // lines 0–1: the apple, the price, the rubber band
  const g01 = life(t, WIN.granville[0] + 1.2, le('granville', 1) + 0.6, 1.0, 0.9) * A;
  if (g01 > 0) {
    const br = ease(t, lt('granville', 0) + 0.2, 1.4, SWIFT);
    goldStroke(g, [[1250, 262], [1180, 276], [1110, 290], [1040, 300], [980, 318]], br, { w: 2, a: g01 * 0.8, glow: 0.3 });
    goldStroke(g, [[1150, 282], [1170, 304], [1196, 300], [1180, 286], [1150, 282]], br, { w: 1.1, a: g01 * 0.6, glow: 0 });
    const ft = fallT(), lT = landT(), s = scrollG(t);
    if (t < lT + 0.35) {
      const y = t < ft ? AY0 + 2 * Math.sin(t * 2.2) : Math.min(landY(), AY0 + 0.5 * GRV * (t - ft) ** 2);
      const fadeA = 1 - ease(t, lT, 0.35, SOFT);
      drawApple(g, AX, y, 1.6, g01 * fadeA * ease(t, lt('granville', 0) + 0.6, 1.0));
      if (t < ft) goldStroke(g, [[AX + 5, 300], [AX + 5, y - 46]], 1, { w: 1, a: g01 * 0.6, glow: 0 });
    }
    if (t > lT) {
      const py = priceG(t), ma = maG(AX, s), d = py - ma;
      const rip = ease(t, lT, 1.2, EXPO);
      goldStroke(g, arcPts(AX, ma, 12 + rip * 70, 0, TAU, 48).map(([x, y]) => [x, ma + (y - ma) * 0.22]), 1, { w: 1.2, a: g01 * (1 - rip) * 0.8, glow: 0.4, color: C.goldHi });
      // trail since the chart began to scroll
      const t0 = lt('granville', 1) - 0.3;
      if (t > t0) {
        const pts = []; for (let k = 0; k <= 220; k++) { const tt = t - k * 0.05; if (tt < t0) break; pts.push([AX - (s - scrollG(tt)), priceG(tt)]); }
        if (pts.length > 1) goldStroke(g, pts, 1, { w: 1.8, a: g01 * 0.9, glow: 0.3, color: C.ivory });
      }
      const ten = clamp((Math.abs(d) - 14) / 130);
      if (ten > 0) {
        const col = mixHex(C.goldHi, RED, ten), bow = 8 * Math.sin(t * 9) * ten;
        goldStroke(g, [[AX, py], [AX + bow, (py + ma) / 2], [AX, ma]], 1, { w: 1 + ten * 1.8, a: g01 * (0.4 + 0.6 * ten), glow: 0.4 + 0.6 * ten, color: col });
      }
      glowDot(g, AX, py, 4.5, g01);
      const l1 = lon('granville', 1, 0.8, 0.8, 0.0, 0.4)(t) * A;
      text(g, '均线', 190, maG(190, s) - 34, { size: 24, color: C.goldHi, a: l1, align: 'left', track: 0.2 });
      text(g, '价格', AX + 22, py - 28, { size: 22, color: C.ivory, a: l1 * 0.85, align: 'left', track: 0.2 });
      text(g, '引力中心', 1500, maG(1500, s) + 46, { size: 26, weight: 600, color: C.goldHi, a: l1 * ease(t, lt('granville', 1) + 1.8, 1.0), track: 0.3 });
    }
  }
  // line 2 (L column): stretch and snap back, on the right
  const l2 = life(t, lt('granville', 2) - 0.2, le('granville', 2) + 0.5, 0.8, 0.8) * A;
  if (l2 > 0) {
    const u = snapU(t), pts = []; for (let k = 0; k <= 160; k++) { const v = u * k / 160; pts.push([snapX(v), snapY(v)]); }
    goldStroke(g, pts, 1, { w: 2, a: l2 * 0.9, glow: 0.4, color: C.ivory });
    const hx = snapX(u), hy = snapY(u), my = maS(hx), d = Math.abs(hy - my), ten = clamp((d - 14) / 200);
    if (ten > 0) goldStroke(g, [[hx, hy], [hx + 8 * Math.sin(t * 10) * ten, (hy + my) / 2], [hx, my]], 1, { w: 1 + ten * 2, a: l2 * (0.35 + 0.65 * ten), glow: 0.4 + 0.6 * ten, color: mixHex(C.goldHi, RED, ten) });
    glowDot(g, hx, hy, 4.5, l2);
    const st = life(t, lt('granville', 2) + 1.6, lt('granville', 2) + 3.6, 0.5, 0.6) * l2, bk = life(t, lt('granville', 2) + 3.2, le('granville', 2) + 0.4, 0.6, 0.8) * l2;
    text(g, '拉扯', snapX(0.42), snapY(0.42) - 40, { size: 28, weight: 700, color: RED, a: st, track: 0.3 });
    text(g, '回归', snapX(0.5), maS(snapX(0.5)) + 54, { size: 28, weight: 700, color: C.goldHi, a: bk, track: 0.3 });
    text(g, '均线', 1770, maS(1770) - 30, { size: 22, color: C.goldHi, a: l2 * 0.8, align: 'right', track: 0.2 });
  }
  // line 3 (R column): support and resistance, on the left
  const l3 = life(t, lt('granville', 3) - 0.2, le('granville', 3) + 0.5, 0.8, 0.8) * A;
  if (l3 > 0) {
    for (const top of [true, false]) {
      const rv = moatU(t, top ? 0.4 : 0), f = x => top ? maR(x) + gapM(x) : maSp(x) - gapM(x);
      goldStroke(g, polyFn(f, 170, 830, 120, rv), 1, { w: 1.8, a: l3 * 0.9, glow: 0.3, color: C.ivory });
      const hx = lerp(170, 830, rv); glowDot(g, hx, f(hx), 3.5, l3 * (rv < 1 ? 1 : 0.6));
      g.save(); g.globalAlpha = l3 * 0.35; g.strokeStyle = C.gold; g.lineWidth = 1; g.beginPath();
      for (let x = 180; x <= 820; x += 18) { const y = top ? maR(x) : maSp(x); g.moveTo(x, y + (top ? -4 : 4)); g.lineTo(x + 10, y + (top ? -16 : 16)); }
      g.stroke(); g.restore();
      TOUCH.forEach((xt, k) => { const q = clamp((lerp(170, 830, rv) - xt) / 20); if (q <= 0) return; const y = top ? maR(xt) + 4 : maSp(xt) - 4, rp = ease(t, lt('granville', 3) + (top ? 0.4 : 0) + (xt - 170) / 660 * 4.4, 1.0, EXPO);
        goldStroke(g, arcPts(xt, y, 8 + 22 * rp, 0, TAU, 32), 1, { w: 1.2, a: l3 * (1 - rp) * 0.9 + l3 * 0.3, glow: 0.5, color: top ? GRN : RED }); });
      text(g, top ? '阻力' : '支撑', 850, top ? maR(830) : maSp(830), { size: 28, weight: 700, color: top ? GRN : RED, a: l3 * ease(t, lt('granville', 3) + (top ? 2.4 : 2.0), 0.8), align: 'left', track: 0.3 });
    }
  }
  // line 4: Granville's eight rules
  const l4 = life(t, lt('granville', 4) - 0.3, WIN.granville[1] - 0.6, 0.8, 0.9);
  if (l4 > 0) {
    const rv = e8Rv(t);
    goldStroke(g, polyFn(x => E8Y(smooth(E8.ma, (x - 200) / 1520)), 200, 1720, 160, e8Rv(t - 0.3)), 1, { w: 1.8, a: l4 * 0.8, glow: 0.5, color: C.goldHi });
    goldStroke(g, polyFn(x => E8Y(smooth(E8.pr, (x - 200) / 1520)), 200, 1720, 200, rv), 1, { w: 1.2, a: l4 * 0.55, glow: 0, color: C.ivory });
    text(g, '格兰维尔八大法则', 960, 282, { size: 30, weight: 700, color: C.goldHi, a: l4 * ease(t, lt('granville', 4) + 0.3, 1.0), track: 0.3 });
    MK8.forEach(([u, num, dir]) => {
      const q = l4 * ease(t, lt('granville', 4) + 0.1 + u * 4.7 + 0.25, 0.7, EXPO); if (q <= 0) return;
      const x = E8X(u), py = E8Y(smooth(E8.pr, u)), col = dir > 0 ? BUYC : SELLC, cy = py + dir * 50;
      tri(g, x, py + dir * 20, 7, dir, col, q);
      goldStroke(g, arcPts(x, cy, 16, 0, TAU, 36), 1, { w: 1.4, a: q, glow: 0.4, color: col });
      text(g, String(num), x, cy + 1, { font: 'latin', size: 19, weight: 600, color: col, a: q, track: 0 });
    });
    const lg = l4 * ease(t, lt('granville', 4) + 5.0, 1.0);
    tri(g, 1530, 300, 7, 1, BUYC, lg); text(g, '买入 1-4', 1546, 300, { size: 22, color: BUYC, a: lg, align: 'left', track: 0.1 });
    tri(g, 1530, 336, 7, -1, SELLC, lg); text(g, '卖出 5-8', 1546, 336, { size: 22, color: SELLC, a: lg, align: 'left', track: 0.1 });
  }
}
function artTelegram(g, t) {
  const A = secA(t, 'telegram');
  if (A <= 0) return;
  // lines 0–2: the telegraph tape
  const tp = life(t, WIN.telegram[0] + 1.2, lt('telegram', 2) + 1.2, 1.0, 1.0) * A;
  if (tp > 0) {
    const op = ease(t, WIN.telegram[0] + 1.2, 1.6, SWIFT);
    g.save(); g.globalAlpha = tp * 0.07; g.fillStyle = C.paper; g.fillRect(960 - 830 * op, tapeY0, 1660 * op, tapeY1 - tapeY0); g.restore();
    for (const y of [tapeY0, tapeY1]) goldStroke(g, [[960 - 830 * op, y], [960 + 830 * op, y]], 1, { w: 1.4, a: tp, glow: 0.4 });
    // the print head on the right
    const pul = 0.5 + 0.5 * Math.sin(t * 14);
    goldStroke(g, rectPts(1766, tapeY0 - 14, 26, tapeY1 - tapeY0 + 28), 1, { w: 1.2, a: tp * 0.8, glow: 0.3, close: true });
    glowDot(g, 1779, 322, 2.4, tp * (t < lt('telegram', 1) ? 0.4 + 0.6 * pul : 0.3));
    text(g, 'TELEGRAM · JAN 6, 1981', 1790, 422, { font: 'latin', size: 20, color: C.gold, a: tp * 0.85, align: 'right', track: 0.35 });
    [...MSG].forEach((ch, L) => {
      if (ch === ' ') return;
      const q = ease(t, letterT(L), 0.5, EXPO) * tp; if (q <= 0) return;
      const fl = 1 - ease(t, letterT(L), 0.6, SOFT);
      text(g, ch, slotX(L), 362, { font: 'latin', size: 34, weight: 600, color: RED, a: q, track: 0 });
      if (fl > 0) glowDot(g, slotX(L), 362, 3, fl * tp, RED);
    });
  }
  // lines 2–3: the crash and the record volume
  const cr = life(t, lt('telegram', 2) - 0.3, le('telegram', 3) + 0.5, 0.8, 0.9) * A;
  if (cr > 0) {
    CR.forEach((k, j) => { const q = ease(t, crT(j), 0.6, EXPO); if (q > 0) drawCandle(g, CRX(j), CRY, k, 18, cr * q * 0.9, { grow: q }); });
    goldStroke(g, [[310, 772], [1610, 772]], 1, { w: 1, a: cr * 0.5, glow: 0 });
    const sp = cr * ease(t, crT(24) + 0.6, 0.9);
    g.save(); g.setLineDash([4, 7]); goldStroke(g, [[330, 770 - VOL[24]], [CRX(24) - 14, 770 - VOL[24]]], sp, { w: 1, a: sp * 0.5, glow: 0 }); g.restore();
    text(g, '成交量 · 历史纪录', CRX(24) + 26, 770 - VOL[24] + 40, { size: 24, weight: 600, color: C.goldHi, a: sp, align: 'left', track: 0.16 });
    text(g, '1981.1.7', CRX(24) - 22, CRY((CR[24].o + CR[24].c) / 2), { font: 'latin', size: 20, color: C.ivory, a: sp * 0.8, align: 'right', track: 0.1 });
  }
  // line 4: the prophet's crown of light
  const h4 = lon('telegram', 4, 0.9, 0.9, 0.2, 0.3)(t) * A;
  if (h4 > 0) {
    for (let r = 0; r < 16; r++) { const th = r / 16 * TAU - Math.PI / 2, L = 110 + 120 * Math.pow(0.5 - 0.5 * Math.sin(th), 1.5), gr = ease(t, lt('telegram', 4) + 0.1 + Math.abs(r - 12) * 0.03, 1.2);
      goldStroke(g, [[HC[0] + Math.cos(th) * 40, HC[1] + Math.sin(th) * 40], [HC[0] + Math.cos(th) * (40 + L * gr), HC[1] + Math.sin(th) * (40 + L * gr)]], 1, { w: 1, a: h4 * 0.35, glow: 0.3, color: C.goldHi }); }
    glowDot(g, HC[0], HC[1], 7 + Math.sin(t * 3), h4);
    text(g, 'JOSEPH GRANVILLE', HC[0], 660, { font: 'latin', size: 22, color: C.gold, a: h4 * 0.9, track: 0.5 });
  }
  // lines 5–6: the long bull market riding a rising average; the short calls fail
  const b5 = life(t, lt('telegram', 5) - 0.3, lt('telegram', 7) + 0.2, 0.8, 1.0) * A;
  if (b5 > 0) {
    const rv = bullRv(t);
    goldStroke(g, polyFn(bullMA, 180, 1740, 160, bullRv(t - 0.25)), 1, { w: 2, a: b5 * 0.85, glow: 0.6, color: C.goldHi });
    goldStroke(g, polyFn(bullP, 180, 1740, 240, rv), 1, { w: 1.3, a: b5 * 0.6, glow: 0, color: C.ivory });
    goldStroke(g, [[180, 778], [1740, 778]], ease(t, lt('telegram', 5), 1.6, SWIFT), { w: 1, a: b5 * 0.4, glow: 0 });
    [1982, 1987, 1992, 1997].forEach((yr, k) => { const q = b5 * clamp((rv * 1560 + 180 - BX(yr)) / 40 + 0.5); goldStroke(g, [[BX(yr), 772], [BX(yr), 784]], 1, { w: 1, a: q * 0.6, glow: 0 }); });
    text(g, '1982 牛市', 200, 556, { size: 30, weight: 700, color: C.goldHi, a: b5 * ease(t, lt('telegram', 5) + 0.6, 1.0) * (1 - ease(t, lt('telegram', 6) - 0.2, 0.8, SOFT)), align: 'left', track: 0.25 });
    text(g, '上升的均线', 1720, bullMA(1560) + 44, { size: 24, color: C.goldHi, a: b5 * ease(t, lt('telegram', 5) + 4.6, 1.0), align: 'right', track: 0.2 });
    [1984, 1986.6, 1989.2, 1991.6, 1994, 1996.2].forEach((yr, k) => {
      const t0 = lt('telegram', 6) + 0.3 + k * 1.0, q = life(t, t0, t0 + 1.9, 0.25, 0.9), x = BX(yr), y = bullP(x) - 62;
      if (q <= 0) return;
      const pop = ease(t, t0, 0.5, EXPO), drop = ease(t, t0 + 1.0, 0.9, SOFT) * 30;
      g.save(); g.translate(x, y + drop); g.scale(0.6 + 0.4 * pop, 0.6 + 0.4 * pop);
      g.globalAlpha = b5 * q; g.fillStyle = RED; g.fillRect(-4, -34, 8, 22); tri(g, 0, 0, 14, -1, RED, b5 * q);
      g.restore();
    });
  }
  // line 7: restless tide over a deep current
  const t7 = life(t, lt('telegram', 7) + 0.4, WIN.telegram[1] - 0.6, 1.4, 1.4);
  if (t7 > 0) goldStroke(g, polyFn(x => curY(x, t), 160, 1760, 120, 1), 1, { w: 1.4, a: t7 * 0.5, glow: 0.5, color: C.goldHi });
}
const FILM_ART = { origin: artOrigin, granville: artGranville, telegram: artTelegram };

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
  const a = ease(t, lt('open', 1) - 0.3, 0.6, SOFT) * (1 - ease(t, le('open', 3) - 2.0, 2.0, SOFT));
  if (a <= 0) return;
  // the gold average sweeps across; the noise calms where it has passed
  const hx = sweepX(t), pts = [];
  for (let x = 100; x < hx; x += 10) pts.push([x, maO(x)]);
  pts.push([hx, maO(hx)]);
  if (pts.length > 1) goldStroke(g, pts, 1, { w: 2.6, a, glow: 0.7, color: C.goldHi });
  glowDot(g, hx, maO(hx), 4.5, a * (1 - ease(t, SW0() + SWD - 0.3, 0.6, SOFT)));
  // 万有引力: the candles are held to the line
  const k2 = lon('open', 2, 0.9, 1.0, 0.0, 0.5)(t) * a;
  if (k2 > 0) {
    const x = 1560, y = maO(x);
    text(g, '万有引力', x, 296, { size: 34, weight: 600, color: C.goldHi, a: k2, track: 0.4 });
    text(g, 'GRAVITY', x, 334, { font: 'latin', size: 20, color: C.gold, a: k2 * 0.8, track: 0.6 });
    g.save(); g.setLineDash([3, 6]); goldStroke(g, [[x, 352], [x, y - 70]], ease(t, lt('open', 2) + 0.3, 1.0), { w: 1, a: k2 * 0.6, glow: 0 }); g.restore();
    for (const c of [6, 14, 22, 30, 37]) {                // faint threads tying a few candles to the line
      const K = OK_[c], cy = maO(K.x) + K.d * 20 + 9 * Math.sin(t * 2.2 + K.ph), y2 = maO(K.x);
      if (Math.abs(cy - y2) > 6) goldStroke(g, [[K.x + 12, cy], [K.x + 12, y2]], 1, { w: 1, a: k2 * 0.45, glow: 0.3, color: C.goldHi });
    }
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

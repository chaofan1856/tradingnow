'use strict';
/* Scene choreography. Every scene draws itself from (g, t) inside its window WIN[id];
   transitions are match-cuts: the last shape of one scene is the first shape of the next. */

/* ---------- spotlight keyframes ---------- */
function spotAt(t) {
  const K = [
    [0, 0, 1], [13.5, 0, 1], [WIN.open[1] + 0.2, 1, 1], [WIN.title[1], 0.9, 1], [WIN.ch1[1] - 0.6, 0.55, 1],
    [WIN.ch1[1] + 0.1, 0.0, 0.25], [LN(3).start - 0.6, 0.0, 0.22], [LN(4).start + 0.8, 1, 1],
    [WIN.babylon[1], 1, 1], [WIN.ch2[0] + 1.0, 0.6, 1], [WIN.zhou[0] + 1.2, 1, 1], [WIN.zhou[1], 1, 1],
    [WIN.scroll[0] + 1.0, 0.8, 1], [WIN.chain[1], 0.85, 1], [WIN.ch3[0] + 1.0, 0.55, 1], [WIN.voc[0] + 1.2, 0.95, 1],
    [WIN.candle[0], 0.8, 1], [WIN.consensus[1] - 1.6, 0.85, 1], [WIN.finale[0] + 1.2, 0.0, 0.6], [1e9, 0, 0.6],
  ];
  let i = 0; while (i + 1 < K.length && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)], u = b[0] > a[0] ? SOFT(seg(t, a[0], b[0])) : 0;
  return { spot: lerp(a[1], b[1], u), width: lerp(a[2], b[2], u) };
}
const inWin = (t, id, pre = 0.6, post = 0.6) => t > WIN[id][0] - pre && t < WIN[id][1] + post;

function drawScenes(g, t) {
  const s = spotAt(t);
  drawBackground(g, t, s);
  if (inWin(t, 'open', 0, 0.8)) sceneOpen(g, t);
  if (inWin(t, 'title', 0.2, 0.2)) sceneTitle(g, t);
  for (const id of ['ch1', 'ch2', 'ch3']) if (inWin(t, id, 0.2, 0.3)) sceneChapter(g, t, id);
  if (inWin(t, 'sumer', 0.2, 1.2)) sceneSumer(g, t);
  if (inWin(t, 'babylon', 0.4, 0.3)) sceneBabylon(g, t);
  if (inWin(t, 'zhou', 0.3, 0.1)) sceneZhou(g, t);
  if (inWin(t, 'scroll', 0.05, 0.3)) sceneScroll(g, t);
  if (inWin(t, 'chain', 0.3, 0.3)) sceneChain(g, t);
  if (inWin(t, 'voc', 0.3, 0.3)) sceneVOC(g, t);
  if (inWin(t, 'years', 0.4, 0.4)) sceneYears(g, t);
  if (inWin(t, 'candle', 0.4, 0.4)) sceneCandle(g, t);
  if (inWin(t, 'consensus', 0.4, 0.3)) sceneConsensus(g, t);
  resetCam(g);
}

/* =====================================================================
   OPEN — a live K-line; the camera falls into the newest candle, which becomes a beam of light
   ===================================================================== */
const OPEN = (() => {
  const K = makeCandles(11, 60, { drift: 0.16, vol: 1.1 });
  let lo = 1e9, hi = -1e9; for (const k of K) { lo = Math.min(lo, k.lo); hi = Math.max(hi, k.hi); }
  return { K, yOf: p => lerp(700, 310, (p - lo) / (hi - lo)), x: i => 250 + i * 24 };
})();
function sceneOpen(g, t) {
  const { K, yOf, x } = OPEN, n = K.length;
  const rev = ease(t, 0.7, 12.2, SOFT) * (n - 1) + 1;
  const done = Math.floor(rev), frac = rev - done;
  const zoom = inCubic(seg(t, 12.3, WIN.open[1] + 0.3));
  const head = Math.min(n - 1, done);
  const hx = x(head), hy = yOf(K[head].c);
  camera(g, 1 + zoom * 2.4, hx, hy, (960 - hx) * zoom, (470 - hy) * zoom);
  const mono = seg(t, 11.5, 14.5), fadeAll = 1 - seg(t, WIN.open[1] - 0.6, WIN.open[1] + 0.2);
  // grid
  const ga = ease(t, 0.9, 2) * 0.07 * fadeAll;
  g.strokeStyle = rgba(C.gold, ga); g.lineWidth = 1;
  for (let i = 0; i < 6; i++) { const y = 300 + i * 82; g.beginPath(); g.moveTo(230, y); g.lineTo(1690, y); g.stroke(); }
  // candles + volume
  for (let i = 0; i <= Math.min(done, n - 1); i++) {
    const grow = i < done ? 1 : EXPO(frac), a = (i < done ? 1 : clamp(frac * 3)) * fadeAll;
    drawCandle(g, x(i), yOf, K[i], 11, a * 0.92, { grow, mono });
    const vh = 6 + Math.abs(K[i].c - K[i].o) * 7;
    g.globalAlpha = a * 0.22; g.fillStyle = mono > 0.5 ? C.gold : (K[i].c >= K[i].o ? C.up : C.down); g.fillRect(x(i) - 5, 772 - vh * grow, 10, vh * grow); g.globalAlpha = 1;
  }
  // close-price line with a glowing head
  const pts = []; for (let i = 0; i <= head; i++) pts.push([x(i), yOf(K[i].c)]);
  if (pts.length > 1) goldStroke(g, pts, 1, { w: 1.4, a: 0.55 * fadeAll, glow: 0.3 });
  const hb = 0.6 + 0.4 * Math.sin(t * 5);
  glowDot(g, hx, hy, 3, ease(t, 0.8, 1) * fadeAll * hb);
  // ticking price readout
  const tick = Math.floor(t * 10), jitter = (rng(tick)() - 0.5) * 0.6;
  const price = (3000 + (K[head].c - 100) * 37 + jitter * 3).toFixed(2);
  text(g, price, hx + 26, hy - 26, { font: 'latin', size: 30, weight: 500, color: C.goldHi, a: ease(t, 1.4, 1) * (1 - zoom) * fadeAll, align: 'left', track: 0.04 });
  text(g, '+' + (Math.abs(K[head].c - K[0].o) * 0.37).toFixed(2) + '%', hx + 26, hy + 8, { font: 'latin', size: 20, color: C.up, a: ease(t, 1.8, 1) * (1 - zoom) * fadeAll * 0.8, align: 'left' });
  resetCam(g);
  // the candle becomes a column of light
  const beam = seg(t, WIN.open[1] - 2.2, WIN.open[1] + 0.3);
  if (beam > 0) {
    const bw = lerp(30, 900, inCubic(beam)), a = SOFT(beam) * (1 - seg(t, WIN.open[1] + 0.1, WIN.open[1] + 0.9));
    const gr = g.createLinearGradient(960 - bw / 2, 0, 960 + bw / 2, 0);
    gr.addColorStop(0, 'rgba(255,230,180,0)'); gr.addColorStop(0.5, `rgba(255,236,196,${0.55 * a})`); gr.addColorStop(1, 'rgba(255,230,180,0)');
    g.fillStyle = gr; g.fillRect(960 - bw / 2, 0, bw, H);
  }
  const flash = Math.max(0, 1 - Math.abs(t - WIN.open[1]) / 0.55);
  if (flash > 0) { g.fillStyle = `rgba(255,238,205,${0.5 * SOFT(flash)})`; g.fillRect(0, 0, W, H); }
}

/* ---------- title ---------- */
function sceneTitle(g, t) {
  const [a, b] = WIN.title, al = life(t, a - 0.1, b + 0.1, 1.2, 1.0);
  const { K, yOf } = OPEN;
  // a quiet ghost of the opening chart under the title, slowly drifting
  for (let i = 0; i < K.length; i++) {
    const xx = 1180 + i * 9 - (t - a) * 6, k = K[i];
    if (xx < 1090 || xx > 1760) continue;
    const yo = p => lerp(250, 50, (p - 90) / 40) + 380;
    const edge = Math.min(seg(xx, 1090, 1260), 1 - seg(xx, 1600, 1760));
    drawCandle(g, xx, yo, k, 4, al * 0.32 * edge, { mono: 1 });
  }
  // fine rule under the title
  const r = ease(t, a + 1.6, 1.6) * al;
  goldStroke(g, [[960 - 240 * r, 604], [960 + 240 * r, 604]], 1, { w: 1, a: 0.7 * r, glow: 0.3 });
  glowDot(g, 960, 604, 2, r);
}

/* ---------- chapter cards: a rule that draws out from the centre ---------- */
function sceneChapter(g, t, id) {
  const [a, b] = WIN[id], r = ease(t, a + 0.2, 1.4) * (1 - ease(t, b - 0.9, 0.8, SOFT));
  const y = 672;
  goldStroke(g, [[960 - 260 * r, y], [960 + 260 * r, y]], 1, { w: 1.1, a: r, glow: 0.4 });
  g.save(); g.translate(960, y); g.rotate(Math.PI / 4); g.globalAlpha = r; g.strokeStyle = C.goldHi; g.lineWidth = 1.2; g.strokeRect(-5, -5, 10, 10); g.restore();
  glowDot(g, 960 - 260 * r, y, 1.6, r * 0.8); glowDot(g, 960 + 260 * r, y, 1.6, r * 0.8);
}

/* =====================================================================
   SUMER — temple, barley out & back, the tablet carved, then dissolved into leverage & options
   ===================================================================== */
const TABLET = { x: 960, y: 450, w: 280, h: 190 };
const SUMER = (() => {
  const R = rng(3000), wedges = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 9; c++) wedges.push({ r, c, x: TABLET.x - 112 + c * 28 + (R() - 0.5) * 6, y: TABLET.y - 66 + r * 26 + (R() - 0.5) * 3, rot: (R() < 0.75 ? 0 : (R() < 0.5 ? Math.PI / 2 : -0.6)), s: 0.8 + R() * 0.45 });
  const stalks = Array.from({ length: 46 }, () => ({ x: 1290 + R() * 380, y: 700 + R() * 66, h: 26 + R() * 26, d: R() * 0.8 }));
  // symbol targets for the particles
  const lever = [[300, 540], [640, 420]], fulcrum = [[430, 498], [460, 552], [400, 552], [430, 498]];
  const option = [[1300, 520], [1450, 520], [1640, 360]], axis = [[1290, 560], [1290, 340]], axisX = [[1280, 552], [1660, 552]];
  const sample = (poly, n) => { const L = polyLen(poly), out = []; for (let i = 0; i < n; i++) { let d = (i + 0.5) / n * L; for (let k = 1; k < poly.length; k++) { const s = Math.hypot(poly[k][0] - poly[k - 1][0], poly[k][1] - poly[k - 1][1]); if (d <= s) { const u = d / s; out.push([lerp(poly[k - 1][0], poly[k][0], u), lerp(poly[k - 1][1], poly[k][1], u)]); break; } d -= s; } } return out; };
  const targets = [...sample(lever, 70), ...sample(fulcrum, 30), ...sample(option, 80), ...sample(axis, 18), ...sample(axisX, 18)];
  const parts = wedges.flatMap((w, i) => [0, 1, 2, 3].map(j => ({ w: i, tgt: targets[(i * 4 + j) % targets.length], d: R() * 0.9, c: [w.x + (R() - .5) * 120, w.y - 120 - R() * 140] })));
  return { wedges, stalks, lever, fulcrum, option, axis, axisX, parts };
})();
function wedge(g, x, y, s, rot, a, carve = 1) {
  if (a <= 0 || carve <= 0) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.globalAlpha = a;
  g.fillStyle = 'rgba(60,40,20,.85)';
  g.beginPath(); g.moveTo(-7, -5); g.lineTo(-7, 5); g.lineTo(-1, 0); g.closePath(); g.fill();
  g.fillRect(-1, -1, 12 * carve, 2);
  g.fillStyle = 'rgba(255,230,180,.35)'; g.fillRect(-7, 5, 7, 0.8);
  g.restore();
}
function drawTablet(g, cx, cy, w, h, a, { rTop = 26, basalt = 0, rows = 0, carve = null, wedgeA = 1 } = {}) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a;
  const x0 = cx - w / 2, y0 = cy - h / 2, rb = lerp(22, 6, basalt);
  // top corners: elliptical, from a pillowy tablet corner (22) to the stele's full round head
  const rx = lerp(22, w / 2, basalt), ry = Math.max(22, Math.min(rTop, h / 2));
  g.beginPath();
  g.moveTo(x0, y0 + ry); g.ellipse(x0 + rx, y0 + ry, rx, ry, 0, Math.PI, 1.5 * Math.PI);
  g.lineTo(x0 + w - rx, y0); g.ellipse(x0 + w - rx, y0 + ry, rx, ry, 0, 1.5 * Math.PI, 2 * Math.PI);
  g.lineTo(x0 + w, y0 + h - rb); g.quadraticCurveTo(x0 + w, y0 + h, x0 + w - rb, y0 + h); g.lineTo(x0 + rb, y0 + h); g.quadraticCurveTo(x0, y0 + h, x0, y0 + h - rb); g.closePath();
  const gr = g.createLinearGradient(x0, y0, x0 + w, y0 + h);
  gr.addColorStop(0, mixHex('#D9B47A', '#2C2620', basalt)); gr.addColorStop(0.5, mixHex('#B08550', '#15120F', basalt)); gr.addColorStop(1, mixHex('#7A5730', '#070605', basalt));
  g.fillStyle = gr; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 40; g.shadowOffsetY = 20; g.fill();
  g.shadowColor = 'transparent';
  g.save(); g.clip();
  const sh = g.createRadialGradient(x0 + w * 0.3, y0 + h * 0.2, 0, x0 + w * 0.3, y0 + h * 0.2, Math.max(w, h));
  sh.addColorStop(0, `rgba(255,236,190,${0.3 * (1 - basalt) + 0.06 * basalt})`); sh.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = sh; g.fillRect(x0, y0, w, h);
  g.restore();
  g.lineWidth = 1.4; g.strokeStyle = basalt > 0.5 ? rgba(C.gold, 0.45) : 'rgba(255,236,190,.45)'; g.stroke();
  g.restore();
  if (carve && basalt < 0.6) for (const [i, W_] of SUMER.wedges.entries()) {
    const sx = cx + (W_.x - TABLET.x) * (w / TABLET.w), sy = cy + (W_.y - TABLET.y) * (h / TABLET.h);
    wedge(g, sx, sy, W_.s, W_.rot, a * wedgeA * (1 - basalt) * (carve[i] > 0 ? 1 : 0), carve[i]);
  }
}
function sceneSumer(g, t) {
  const [A, B] = WIN.sumer, L = i => LN(i);
  const out = 1 - seg(t, B - 0.3, B + 1.2);
  // camera: a push into the tablet while it is carved, back out for the echo
  const push = ease(t, L(7).start - 0.4, 2.4, SWIFT) * (1 - ease(t, L(9).start - 0.2, 2.0, SWIFT));
  const push2 = ease(t, L(9).start - 0.2, 2.0, SWIFT) * (1 - ease(t, L(11).start - 0.6, 1.8, SWIFT));
  const drift = 1 + 0.02 * seg(t, A, B);
  camera(g, drift * (1 + push * 0.55 + push2 * 0.12), TABLET.x, TABLET.y + 10);
  const sceneA = ease(t, L(3).start - 0.4, 1.6, SOFT);
  // pedestal
  const ped = ease(t, L(3).start - 0.2, 2.2) * out * (1 - seg(t, B - 0.6, B + 0.6));
  if (ped > 0) {
    const rise = (1 - ped) * 30;
    g.save(); g.globalAlpha = ped;
    const pg = g.createLinearGradient(860, 0, 1060, 0); pg.addColorStop(0, '#5E4626'); pg.addColorStop(0.4, '#C9A66B'); pg.addColorStop(1, '#4A3820');
    g.fillStyle = pg; g.fillRect(872, 752 + rise, 176, 22); g.beginPath(); g.moveTo(896, 752 + rise); g.lineTo(1024, 752 + rise); g.lineTo(1008, 736 + rise); g.lineTo(912, 736 + rise); g.fill();
    g.fillRect(951, 548 + rise, 18, 190);
    g.restore();
  }
  // temple (ziggurat) + fields
  const env = ease(t, L(4).start - 0.2, 2.6, SOFT) * (1 - ease(t, L(7).start - 0.4, 1.4, SOFT)) * out;
  const zig = [[250, 772], [250, 712], [300, 712], [300, 652], [350, 652], [350, 600], [510, 600], [510, 652], [560, 652], [560, 712], [610, 712], [610, 772]];
  goldStroke(g, zig, ease(t, L(4).start, 2.2, SOFT), { w: 1.4, a: env * 0.9 });
  goldStroke(g, [[405, 600], [405, 570], [455, 570], [455, 600]], ease(t, L(4).start + 1.4, 1), { w: 1.2, a: env * 0.8 });
  goldStroke(g, [[430, 772], [430, 600]], ease(t, L(4).start + 0.8, 1.6), { w: 0.8, a: env * 0.45, glow: 0 });
  text(g, '神 庙', 430, 808, { size: 24, color: C.gold, a: env * ease(t, L(4).start + 1.0, 1), track: 0.3 });
  text(g, 'TEMPLE', 430, 838, { font: 'latin', size: 16, color: C.gold, a: env * 0.6 * ease(t, L(4).start + 1.2, 1), track: 0.4 });
  const fieldA = ease(t, L(5).start - 0.4, 1.6, SOFT) * (1 - ease(t, L(7).start - 0.4, 1.4, SOFT)) * out;
  for (let i = 0; i < 7; i++) { const y = 706 + i * 10, sh = (7 - i) * 6; goldStroke(g, [[1270 + sh, y], [1690 - sh, y]], ease(t, L(5).start - 0.3 + i * 0.06, 1.2), { w: 0.8, a: fieldA * 0.45, glow: 0 }); }
  text(g, '农 田', 1480, 808, { size: 24, color: C.gold, a: fieldA * ease(t, L(5).start, 1), track: 0.3 });
  text(g, 'FIELD', 1480, 838, { font: 'latin', size: 16, color: C.gold, a: fieldA * 0.6, track: 0.4 });
  // stalks: sprout after the loan, turn gold for harvest
  const harvest = ease(t, L(6).start - 0.3, 1.4, SOFT);
  for (const s of SUMER.stalks) {
    const gr = ease(t, L(5).start + 1.4 + s.d, 1.6, outCubic); if (gr <= 0 || fieldA <= 0) continue;
    const col = mixHex('#8FA35E', '#E3C27C', harvest);
    g.globalAlpha = fieldA * 0.85; g.strokeStyle = col; g.lineWidth = 1.2; g.beginPath(); g.moveTo(s.x, s.y); g.quadraticCurveTo(s.x + 3, s.y - s.h * gr * 0.6, s.x + 5 * gr, s.y - s.h * gr); g.stroke();
    if (harvest > 0) { g.fillStyle = col; g.globalAlpha = fieldA * harvest; g.beginPath(); g.ellipse(s.x + 5 * gr, s.y - s.h * gr - 4, 2.2, 6, 0.2, 0, 6.2832); g.fill(); }
    g.globalAlpha = 1;
  }
  // barley out (principal) and back (principal + interest)
  const flow = (n, t0, from, ctrl, to, size, col, spread) => {
    for (let i = 0; i < n; i++) {
      const u = ease(t, t0 + i * spread, 1.9, SWIFT); if (u <= 0 || u >= 1) continue;
      const r = rng(i * 7 + n)(), p = qbez(from, [ctrl[0] + (r - .5) * 120, ctrl[1] + (r - .5) * 60], [to[0] + (r - .5) * 70, to[1] + (r - .5) * 20], u);
      g.save(); g.translate(p[0], p[1]); g.rotate(u * 6 + i); g.globalAlpha = Math.sin(Math.PI * u) * env; g.fillStyle = col;
      g.beginPath(); g.ellipse(0, 0, size * 0.45, size, 0, 0, 6.2832); g.fill(); g.restore();
    }
  };
  flow(60, L(5).start + 0.3, [430, 590], [860, 300], [1480, 730], 3.2, '#E2C88E', 0.045);
  flow(90, L(6).start + 0.1, [1480, 720], [960, 250], [430, 590], 3.8, '#F2D598', 0.03);
  const lbl1 = life(t, L(5).start + 0.6, L(6).start + 0.2, 0.8, 0.6) * env, lbl2 = life(t, L(6).start + 0.5, L(7).start, 0.8, 0.6) * env;
  text(g, '本 金', 960, 395, { size: 26, color: C.ivory, a: lbl1 * 0.9, track: 0.3 });
  text(g, '本 金 ＋ 利 息', 960, 330, { size: 26, color: C.goldHi, a: lbl2, track: 0.2 });
  // tablet: carved during L7
  const tabA = ease(t, L(3).start + 0.4, 2.6) * out;
  const carve = SUMER.wedges.map((w, i) => {
    const pre = i % 3 === 0 ? 1 : 0;                         // a few marks are there from the start
    return Math.max(pre * ease(t, L(3).start + 1.4, 1), ease(t, L(7).start + 0.2 + (w.r * 9 + w.c) * 0.045, 0.4, outCubic));
  });
  const dissolve = ease(t, L(11).start - 0.2, 1.6, SOFT), regather = ease(t, B - 2.2, 1.6, SOFT);
  const bob = Math.sin(t * 0.8) * 3 * (1 - regather);
  drawTablet(g, TABLET.x, TABLET.y + (1 - tabA) * 30 + bob, TABLET.w, TABLET.h, tabA, { carve, wedgeA: 1 - dissolve * (1 - regather) });
  // callouts on the tablet
  const cA = (k) => life(t, L(8).start - 0.1 + k * 0.7, L(9).start + 0.4, 0.9, 0.6);
  callout(g, 880, 396, 760, 360, '本金', cA(0), { side: 'left', size: 22 });
  callout(g, 1050, 448, 1160, 412, '利息', cA(1), { side: 'right', size: 22 });
  callout(g, 880, 508, 760, 548, '违约惩罚', cA(2), { side: 'left', size: 22 });
  // time axis: spring -> autumn
  const tx = life(t, L(9).start - 0.1, L(11).start, 1.0, 0.8);
  if (tx > 0) {
    goldStroke(g, [[640, 610], [1290, 610]], ease(t, L(9).start, 1.4, SOFT), { w: 1.1, a: tx * 0.8 });
    goldStroke(g, [[1278, 603], [1292, 610], [1278, 617]], ease(t, L(9).start + 1.2, 0.5), { w: 1.1, a: tx * 0.8, glow: 0 });
    text(g, '春 播', 680, 640, { size: 20, color: C.ivory, a: tx * 0.8, track: 0.2 });
    text(g, '秋 收', 1240, 640, { size: 20, color: C.ivory, a: tx * 0.8, track: 0.2 });
    const arc = []; for (let i = 0; i <= 40; i++) { const u = i / 40; arc.push([lerp(680, 1240, u), 600 - Math.sin(Math.PI * u) * 40]); }
    const hp = goldStroke(g, arc, ease(t, L(9).start + 0.6, 2.2, SOFT), { w: 1, a: tx * 0.6, glow: 0.2 });
    glowDot(g, hp[0], hp[1], 2.2, tx * ease(t, L(9).start + 0.6, 0.6));
    const ip = life(t, L(10).start, L(11).start, 0.9, 0.8);
    text(g, 'interest  =  the price of time', 960, 686, { font: 'latin', italic: true, size: 30, color: C.goldHi, a: ip, track: 0.06 });
  }
  // dissolve: wedge marks fly out and become LEVERAGE and OPTIONS
  if (dissolve > 0 && out > 0) {
    const sym = ease(t, L(11).start + 1.1, 1.4, SOFT) * (1 - regather);
    for (const p of SUMER.parts) {
      const w = SUMER.wedges[p.w], u = ease(t, L(11).start - 0.2 + p.d * 0.8, 1.9, SWIFT) * (1 - regather);
      if (u <= 0.001) continue;
      const q = qbez([w.x, w.y + bob], p.c, p.tgt, u), a = (1 - sym * 0.85) * Math.min(1, u * 4) * out;
      g.globalAlpha = a; g.fillStyle = C.goldHi; g.beginPath(); g.arc(q[0], q[1], 1.6, 0, 6.2832); g.fill();
    }
    g.globalAlpha = 1;
    const sa = sym * out;
    goldStroke(g, SUMER.lever, 1, { w: 2.2, a: sa }); goldStroke(g, SUMER.fulcrum, 1, { w: 1.6, a: sa });
    glowDot(g, 300, 540, 3, sa); text(g, '×10', 600, 370, { font: 'latin', size: 64, weight: 500, color: C.goldHi, a: sa, track: 0.02 });
    text(g, 'LEVERAGE', 470, 610, { font: 'latin', size: 22, color: C.gold, a: sa * 0.8, track: 0.5 });
    text(g, '杠 杆', 470, 646, { size: 28, color: C.ivory, a: sa, track: 0.3 });
    goldStroke(g, SUMER.axis, 1, { w: 1, a: sa * 0.6, glow: 0 }); goldStroke(g, SUMER.axisX, 1, { w: 1, a: sa * 0.6, glow: 0 });
    goldStroke(g, SUMER.option, 1, { w: 2.2, a: sa }); glowDot(g, 1450, 520, 2.6, sa);
    text(g, 'K', 1450, 572, { font: 'latin', italic: true, size: 24, color: C.gold, a: sa * 0.8 });
    text(g, 'CALL', 1620, 330, { font: 'latin', size: 26, weight: 500, color: C.goldHi, a: sa, track: 0.3 });
    text(g, 'OPTIONS', 1470, 610, { font: 'latin', size: 22, color: C.gold, a: sa * 0.8, track: 0.5 });
    text(g, '期 权', 1470, 646, { size: 28, color: C.ivory, a: sa, track: 0.3 });
    // echo rings
    for (let k = 0; k < 4; k++) {
      const u = seg(t, L(12).start - 0.2 + k * 0.9, L(12).start + 2.6 + k * 0.9); if (u <= 0 || u >= 1) continue;
      g.globalAlpha = (1 - u) * 0.5 * out; g.strokeStyle = C.gold; g.lineWidth = 1.2;
      g.beginPath(); g.ellipse(TABLET.x, TABLET.y, 160 + u * 620, (160 + u * 620) * 0.62, 0, 0, 6.2832); g.stroke();
    }
    g.globalAlpha = 1;
  }
  resetCam(g);
}

/* =====================================================================
   BABYLON — the tablet grows into a basalt stele; its lines become a limit-bound K-line
   ===================================================================== */
const BAB = (() => {
  const R = rng(1754), rows = [];
  for (let y = 0; y < 30; y++) { const marks = []; let x = 0; while (x < 1) { marks.push([x, 0.3 + R() * 0.7, R() < 0.8 ? 0 : 1.57]); x += 0.045 + R() * 0.05; } rows.push(marks); }
  const K = makeCandles(1792, 34, { drift: 0.55, vol: 0.9 });
  let lo = 1e9; for (const k of K) lo = Math.min(lo, k.lo);
  return { rows, K, lo };
})();
function steleGeom(t) {
  const [A, B] = WIN.babylon, m = ease(t, A - 0.3, 2.2, SWIFT);
  const shift = ease(t, LN(18).start - 0.5, 2.2, SWIFT);
  const cx = lerp(960, 470, shift), sc = lerp(1, 0.78, shift);
  const w = lerp(TABLET.w, 250, m) * sc, h = lerp(TABLET.h, 560, m) * sc;
  const cy = lerp(TABLET.y, 772 - h / 2, m);
  return { m, cx, cy, w, h, top: cy - h / 2, bottom: cy + h / 2, sc, shift };
}
function sceneBabylon(g, t) {
  const [A, B] = WIN.babylon, L = i => LN(i), S = steleGeom(t);
  const exit = ease(t, B - 1.6, 1.5, SWIFT);
  const fade = 1 - seg(t, B - 1.3, B - 0.2);
  camera(g, 1 + 0.025 * seg(t, A, B), 960, 600);
  // stele
  const rTop = lerp(26, 125 * S.sc, S.m);
  drawTablet(g, S.cx, S.cy, S.w, S.h, fade, { rTop, basalt: S.m, carve: null });
  // relief + inscription
  const ins = ease(t, A + 1.2, 1.6) * fade;
  if (ins > 0) {
    g.save();
    const x0 = S.cx - S.w / 2 + 16 * S.sc, x1 = S.cx + S.w / 2 - 16 * S.sc;
    // sun disk + rays in the relief
    const sy = S.top + 95 * S.sc;
    g.globalAlpha = ins * 0.65; g.strokeStyle = C.gold; g.lineWidth = 1.1;
    g.beginPath(); g.arc(S.cx + 34 * S.sc, sy, 20 * S.sc, 0, 6.2832); g.stroke();
    for (let k = 0; k < 8; k++) { const an = k * Math.PI / 4; g.beginPath(); g.moveTo(S.cx + 34 * S.sc + Math.cos(an) * 26 * S.sc, sy + Math.sin(an) * 26 * S.sc); g.lineTo(S.cx + 34 * S.sc + Math.cos(an) * 34 * S.sc, sy + Math.sin(an) * 34 * S.sc); g.stroke(); }
    g.beginPath(); g.moveTo(S.cx - 60 * S.sc, sy + 40 * S.sc); g.lineTo(S.cx - 60 * S.sc, sy - 22 * S.sc); g.arc(S.cx - 60 * S.sc, sy - 30 * S.sc, 8 * S.sc, Math.PI / 2, Math.PI * 2.5); g.stroke();
    g.beginPath(); g.moveTo(x0, S.top + 170 * S.sc); g.lineTo(x1, S.top + 170 * S.sc); g.stroke();
    // carved rows, lit by a scan
    const scanU = ease(t, L(15).start - 0.2, Math.max(2, L(15).end - L(15).start + 0.6), SOFT);
    const rowTop = S.top + 190 * S.sc, rowStep = 12.6 * S.sc;
    const order = ease(t, L(20).start - 0.2, 1.4, SOFT);
    BAB.rows.forEach((marks, r) => {
      const y = rowTop + r * rowStep; if (y > S.bottom - 20 * S.sc) return;
      const lit = Math.max(r / BAB.rows.length < scanU ? 0.55 : 0, Math.exp(-Math.pow((r / BAB.rows.length - scanU) * 9, 2)), order * 0.7);
      g.globalAlpha = ins * (0.2 + 0.8 * lit) * (1 - exit); g.fillStyle = lit > 0.3 ? C.goldHi : C.gold;
      for (const [mx, len, rot] of marks) {
        const xx = lerp(x0, x1, mx); if (xx > x1 - 6) continue;
        if (rot) g.fillRect(xx, y - 3 * S.sc, 1.3, 6 * S.sc); else { g.beginPath(); g.moveTo(xx, y - 2.6 * S.sc); g.lineTo(xx, y + 2.6 * S.sc); g.lineTo(xx + 3.5 * S.sc, y); g.fill(); g.fillRect(xx + 2, y - 0.6, 7 * len * S.sc, 1.2); }
      }
    });
    if (scanU > 0 && scanU < 1) { const yy = lerp(rowTop, S.bottom - 20, scanU); goldStroke(g, [[x0 - 8, yy], [x1 + 8, yy]], 1, { w: 1.2, a: ins * 0.9, glow: 0.8 }); }
    g.restore();
  }
  // two codes, one tradition
  const codes = life(t, L(14).start - 0.1, L(16).start + 0.1, 1.0, 0.7) * fade;
  text(g, '《埃什南纳法典》', 560, 360, { size: 32, color: C.ivory, a: codes, track: 0.06 });
  text(g, 'c. 1800 BC', 560, 402, { font: 'latin', italic: true, size: 22, color: C.gold, a: codes * 0.8 });
  text(g, '《汉谟拉比法典》', 1360, 360, { size: 32, color: C.ivory, a: codes * ease(t, L(14).start + 1.2, 1), track: 0.06 });
  text(g, 'c. 1754 BC', 1360, 402, { font: 'latin', italic: true, size: 22, color: C.gold, a: codes * 0.8 * ease(t, L(14).start + 1.2, 1) });
  goldStroke(g, [[700, 380], [800, 380]], ease(t, L(14).start + 0.6, 0.8), { w: 1, a: codes * 0.7, glow: 0 });
  goldStroke(g, [[1120, 380], [1218, 380], [1208, 373], [1218, 380], [1208, 387]], ease(t, L(14).start + 1.0, 0.8), { w: 1, a: codes * 0.7, glow: 0 });
  // interest caps
  const capA = life(t, L(16).start - 0.1, L(18).start + 0.4, 0.9, 0.8) * fade;
  if (capA > 0) {
    const v1 = 33.333 * ease(t, L(16).start, 2.2), v2 = 20 * ease(t, L(17).start, 2.0);
    const s1 = v1 > 33.2 ? '33.3%' : Math.floor(v1) + '%';
    text(g, s1, 540, 520, { font: 'latin', size: 128, weight: 500, color: C.goldHi, a: capA, track: 0.01 });
    text(g, '大麦 · 年息上限', 540, 612, { size: 26, color: C.ivory, a: capA * ease(t, L(16).start + 0.5, 1), track: 0.2 });
    const a2 = capA * ease(t, L(17).start - 0.1, 0.9);
    text(g, Math.round(v2) + '%', 1380, 520, { font: 'latin', size: 128, weight: 500, color: C.goldHi, a: a2, track: 0.01 });
    text(g, '白银 · 年息上限', 1380, 612, { size: 26, color: C.ivory, a: a2 * ease(t, L(17).start + 0.5, 1), track: 0.2 });
    goldStroke(g, [[420, 650], [660, 650]], ease(t, L(16).start + 0.4, 1.2), { w: 1, a: capA * 0.5, glow: 0 });
    goldStroke(g, [[1260, 650], [1500, 650]], ease(t, L(17).start + 0.4, 1.2), { w: 1, a: a2 * 0.5, glow: 0 });
  }
  // the inscription becomes a market with limits
  const ch = ease(t, L(18).start + 0.3, 1.6, SOFT) * (1 - exit);
  const CEIL = 360, FLOOR = 650, X0 = 820, DX = 26;
  if (ch > 0) {
    for (let i = 0; i < 7; i++) { const y = 300 + i * 66; goldStroke(g, [[X0 - 30, y], [1720, y]], ease(t, L(18).start + 0.2 + i * 0.08, 1.4, SOFT), { w: 0.8, a: ch * 0.12, glow: 0 }); }
    const { K } = BAB, yOf = p => 640 - (p - BAB.lo) * 5.6;
    const n = Math.floor(ease(t, L(18).start + 0.5, (L(19).end - L(18).start) * 0.82, outCubic) * K.length);
    const halt = ease(t, L(19).start + 0.2, 0.6);
    const clampY = (p) => Math.max(CEIL, Math.min(FLOOR, yOf(p)));
    for (let i = 0; i < n; i++) {
      const k = K[i], x = X0 + i * DX, yo = clampY(k.o), yc = clampY(k.c), yh = clampY(k.hi), yl = clampY(k.lo);
      const limited = yOf(k.c) < CEIL;
      g.globalAlpha = ch; g.strokeStyle = g.fillStyle = limited ? C.goldHi : (k.c >= k.o ? C.up : C.down);
      g.lineWidth = 1.3; g.beginPath(); g.moveTo(x, yh); g.lineTo(x, yl); g.stroke();
      g.fillRect(x - 6, Math.min(yo, yc), 12, Math.max(2, Math.abs(yc - yo)));
    }
    g.globalAlpha = 1;
    // limit lines
    const lim = ease(t, L(19).start - 0.4, 1.2, SOFT) * ch;
    const ext = ease(t, L(20).start, 1.6, SWIFT);
    goldStroke(g, [[lerp(X0 - 30, S.cx + S.w / 2, ext), CEIL], [1720, CEIL]], lim, { w: 1.6, a: lim, glow: 0.6 + ext * 0.6, color: C.goldHi });
    g.save(); g.setLineDash([6, 8]); goldStroke(g, [[X0 - 30, FLOOR], [1720, FLOOR]], lim, { w: 1, a: lim * 0.5, glow: 0 }); g.restore();
    text(g, '涨停 · LIMIT UP', 1716, CEIL - 22, { size: 20, color: C.goldHi, a: lim, align: 'right', track: 0.12 });
    text(g, '跌停 · LIMIT DOWN', 1716, FLOOR + 22, { size: 20, color: C.ivory, a: lim * 0.6, align: 'right', track: 0.12 });
    // trading halt badge
    const hb = halt * ch * (1 - ease(t, L(20).start + 0.6, 0.8)) * (0.7 + 0.3 * Math.sin(t * 7));
    if (hb > 0) {
      g.save(); g.globalAlpha = hb; g.strokeStyle = '#D0574B'; g.lineWidth = 1.6; g.fillStyle = 'rgba(120,30,24,.35)';
      g.beginPath(); g.roundRect(1330, 262, 250, 62, 6); g.fill(); g.stroke(); g.restore();
      text(g, '限 制 交 易', 1410, 293, { size: 26, weight: 600, color: '#F2B9A8', a: hb, track: 0.1 });
      text(g, 'HALT', 1530, 293, { font: 'latin', size: 22, weight: 600, color: '#F2B9A8', a: hb, track: 0.2 });
    }
    // the three rules, timed against the narration
    const d = L(19).end - L(19).start, tags = ['涨跌停板', '保证金', '强制平仓'];
    tags.forEach((s, k) => {
      const ta = ease(t, L(19).start + k * d * 0.31, 0.8) * ch;
      const x = 1000 + k * 260;
      g.save(); g.globalAlpha = ta * 0.85; g.strokeStyle = C.gold; g.lineWidth = 1; g.beginPath(); g.roundRect(x - 88, 716, 176, 48, 24); g.stroke(); g.restore();
      text(g, s, x, 741, { size: 24, color: C.ivory, a: ta, track: 0.16 });
    });
    text(g, '秩 序 · ORDER', S.cx, S.top - 40, { size: 26, color: C.goldHi, a: ease(t, L(20).start + 0.6, 1.2) * ch, track: 0.2 });
  }
  // exit: everything gives way to one gold line that becomes the chapter rule
  if (exit > 0) {
    const y = lerp(CEIL, 672, exit), xa = lerp(S.cx + S.w / 2, 700, exit), xb = lerp(1720, 1220, exit);
    goldStroke(g, [[xa, y], [xb, y]], 1, { w: lerp(1.6, 1.1, exit), a: 1 - seg(t, B, B + 0.3), glow: 0.5, color: C.goldHi });
  }
  resetCam(g);
}

/* =====================================================================
   ZHOU — cowrie → bronze → a crowd of lenders → the state's coin breathes in and out
   ===================================================================== */
const ZHOU = (() => {
  const R = rng(650);
  const nodes = Array.from({ length: 84 }, () => ({ x: 290 + R() * 1340, y: 300 + R() * 400, ph: R() * 6.28, d: R() }));
  const arcs = Array.from({ length: 140 }, () => ({ a: Math.floor(R() * 84), b: Math.floor(R() * 84), t0: R(), len: 0.8 + R() * 1.2, red: R() < 0.4 }));
  const nz = noise1(9);
  return { nodes, arcs, nz };
})();
function cowrie(g, x, y, s, a, bronze = 0, glow = 0) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = a;
  const gr = g.createRadialGradient(-12, -14, 4, 0, 0, 62);
  gr.addColorStop(0, mixHex('#F4EAD6', '#D7B072', bronze)); gr.addColorStop(0.6, mixHex('#CDBB98', '#8A6936', bronze)); gr.addColorStop(1, mixHex('#7D6B50', '#4B3A20', bronze));
  g.fillStyle = gr; g.shadowColor = glow > 0 ? `rgba(255,170,80,${glow})` : 'rgba(0,0,0,.6)'; g.shadowBlur = glow > 0 ? 40 : 24; g.shadowOffsetY = glow > 0 ? 0 : 10;
  g.beginPath(); g.ellipse(0, 0, 58, 40, 0, 0, 6.2832); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = mixHex('#4A3B28', '#2E2414', bronze); g.lineWidth = 2.2;
  g.beginPath(); g.moveTo(-44, 2); g.bezierCurveTo(-18, -5, 18, 7, 44, -1); g.stroke();
  for (let i = -5; i <= 5; i++) { const xx = i * 7.5; g.lineWidth = 1.2; g.beginPath(); g.moveTo(xx, 2 + i * 0.4 - 5); g.lineTo(xx, 2 + i * 0.4 + 5); g.stroke(); }
  if (bronze > 0.3) { g.globalAlpha = a * (bronze - 0.3) * 0.5; g.fillStyle = '#5E8A70'; for (let k = 0; k < 7; k++) { g.beginPath(); g.arc(-30 + k * 10, (k % 3 - 1) * 14, 3 + (k % 2) * 2, 0, 6.2832); g.fill(); } }
  g.restore();
}
function coin(g, x, y, r, a, rot = 0, holeLight = 0) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.globalAlpha = a;
  const gr = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.1);
  gr.addColorStop(0, '#E6C58A'); gr.addColorStop(0.55, '#A07A40'); gr.addColorStop(1, '#4E3A1C');
  g.fillStyle = gr; g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = 30; g.shadowOffsetY = 12;
  g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.fill(); g.shadowColor = 'transparent';
  g.strokeStyle = 'rgba(255,236,190,.55)'; g.lineWidth = 1.4; g.beginPath(); g.arc(0, 0, r - 7, 0, 6.2832); g.stroke();
  g.rotate(rot); const h = r * 0.3;
  g.strokeStyle = 'rgba(60,40,18,.9)'; g.lineWidth = 2; g.strokeRect(-h - 6, -h - 6, 2 * h + 12, 2 * h + 12);
  g.fillStyle = holeLight > 0 ? `rgb(${Math.round(lerp(14, 222, holeLight))},${Math.round(lerp(11, 208, holeLight))},${Math.round(lerp(8, 178, holeLight))})` : '#0E0B08';
  g.fillRect(-h, -h, 2 * h, 2 * h);
  // two characters on the face, as on a ban-liang
  g.rotate(-rot); g.fillStyle = 'rgba(60,40,18,.85)'; g.font = `600 ${Math.round(r * 0.32)}px 'NotoSerifSub',serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('轻', -r * 0.62, 0); g.fillText('重', r * 0.62, 0);
  g.restore();
}
function sceneZhou(g, t) {
  const [A, B] = WIN.zhou, L = i => LN(i);
  const zoom = inCubic(seg(t, B - 2.3, B + 0.05));
  camera(g, 1 + 0.02 * seg(t, A, B) + zoom * 36, 960, 500);
  const appear = ease(t, A + 0.1, 1.4, SOFT);
  // shells
  const shellOut = ease(t, L(22).start - 0.2, 1.2, SOFT);
  const sA = appear * (1 - shellOut);
  cowrie(g, 790, 486 + Math.sin(t) * 4, 1.15, sA * ease(t, L(21).start - 0.3, 1.2));
  const cast = ease(t, L(21).start + 2.0, 1.8, SOFT);
  cowrie(g, 1130, 486 + Math.sin(t + 1) * 4, 1.15, sA * ease(t, L(21).start + 1.6, 1.0), cast, (1 - cast) * 0.8 * ease(t, L(21).start + 1.6, 0.5));
  text(g, '贝 币', 790, 590, { size: 26, color: C.ivory, a: sA * ease(t, L(21).start + 0.4, 1), track: 0.3 });
  text(g, '铜 贝', 1130, 590, { size: 26, color: C.ivory, a: sA * ease(t, L(21).start + 2.4, 1), track: 0.3 });
  // crowd of private lenders
  const crowd = ease(t, L(22).start, 1.4, SOFT) * (1 - zoom);
  const breathe = ease(t, L(23).start + 0.3, 1.4, SWIFT) * (1 - ease(t, L(23).start + 2.3, 1.6, SWIFT));
  const calm = ease(t, L(23).start + 2.0, 2.0, SOFT);
  if (crowd > 0) {
    const pos = ZHOU.nodes.map(n => {
      const jx = Math.sin(t * 1.3 + n.ph) * 6 * (1 - calm), jy = Math.cos(t * 1.1 + n.ph) * 6 * (1 - calm);
      const bx = lerp(n.x, 960 + (n.x - 960) * 0.18, breathe), by = lerp(n.y, 500 + (n.y - 500) * 0.18, breathe);
      const r = Math.hypot(bx - 960, by - 500), ring = calm * Math.max(0, 200 - r) / 200;   // keep clear of the coin once calm
      return [bx + jx + (bx - 960) / (r || 1) * ring * 120, by + jy + (by - 500) / (r || 1) * ring * 120];
    });
    const busy = 1 - calm * 0.75;
    for (const a of ZHOU.arcs) {
      const cyc = 2.4, ph = ((t - L(22).start) / cyc + a.t0) % 1; if (t < L(22).start || a.a === a.b) continue;
      const u = ph / (a.len / cyc); if (u > 1) continue;
      const P = pos[a.a], Q = pos[a.b], M = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2 - 60];
      const pts = []; for (let i = 0; i <= 16; i++) pts.push(qbez(P, M, Q, i / 16 * Math.min(1, u * 1.6)));
      g.globalAlpha = crowd * busy * Math.sin(Math.PI * u) * 0.55; g.strokeStyle = a.red ? '#C9705F' : C.gold; g.lineWidth = 0.9;
      g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.stroke();
    }
    g.globalAlpha = 1;
    pos.forEach((p, i) => { g.globalAlpha = crowd * (0.45 + 0.4 * Math.sin(t * 2 + i)); g.fillStyle = C.goldHi; g.beginPath(); g.arc(p[0], p[1], 2.1, 0, 6.2832); g.fill(); });
    g.globalAlpha = 1;
  }
  // the state's coin: swallow (吞) and release (吐)
  const coinA = ease(t, L(23).start - 0.3, 1.4) * (1 - seg(t, B + 0.0, B + 0.3));
  const holeLight = ease(t, L(27).start + 0.2, 2.2, SOFT);
  coin(g, 960, 500, 112, coinA, Math.sin((t - L(23).start) * 0.4) * 0.1 * (1 - ease(t, L(27).start - 0.5, 1.5, SOFT)), holeLight);
  if (holeLight > 0 && zoom < 1) glowDot(g, 960, 500, 6, holeLight * 0.6 * (1 - zoom), C.goldHi);
  const tun = life(t, L(23).start + 0.4, L(24).start, 0.8, 0.8), tu = life(t, L(23).start + 2.2, L(24).start + 0.4, 0.8, 0.8);
  text(g, '吞', 700, 500, { size: 78, weight: 600, color: C.goldHi, a: tun * (1 - zoom), track: 0 });
  text(g, '吐', 1220, 500, { size: 78, weight: 600, color: C.goldHi, a: tu * (1 - zoom), track: 0 });
  text(g, '齐 · 管仲', 960, 352, { size: 24, color: C.gold, a: life(t, L(23).start + 0.2, L(25).start, 1, 0.6) * (1 - zoom), track: 0.24 });
  // grain price under a band (李悝 平籴)
  const band = life(t, L(24).start - 0.2, L(25).start + 0.6, 1, 0.8) * (1 - zoom);
  if (band > 0) {
    const damp = ease(t, L(24).start + 1.4, 2.4, SOFT), X0 = 420, X1 = 1500, mid = 690;
    const pts = []; for (let i = 0; i <= 140; i++) { const u = i / 140, amp = lerp(48, 12, damp * u * 1.2); pts.push([lerp(X0, X1, u), mid + ZHOU.nz(u * 14 + 3) * amp + Math.sin(u * 22) * amp * 0.3]); }
    goldStroke(g, pts, ease(t, L(24).start - 0.1, 1.6, SOFT), { w: 1.5, a: band, glow: 0.3 });
    g.save(); g.setLineDash([5, 7]);
    goldStroke(g, [[X0, mid - 20], [X1, mid - 20]], ease(t, L(24).start + 1.0, 1.0), { w: 1, a: band * 0.6, glow: 0 });
    goldStroke(g, [[X0, mid + 20], [X1, mid + 20]], ease(t, L(24).start + 1.0, 1.0), { w: 1, a: band * 0.6, glow: 0 });
    g.restore();
    text(g, '丰年 · 籴', 560, 760, { size: 22, color: C.ivory, a: band * ease(t, L(24).start + 1.3, 1), track: 0.2 });
    text(g, '荒年 · 粜', 1360, 760, { size: 22, color: C.ivory, a: band * ease(t, L(24).start + 1.8, 1), track: 0.2 });
    text(g, '魏 · 李悝', 330, 690, { size: 22, color: C.gold, a: band, align: 'right', track: 0.2 });
  }
  // three instruments of the state, then their modern names
  const tags = [['放贷', '逆回购'], ['收储', '平准基金'], ['平抑物价', '政策性贷款']];
  const tagA = life(t, L(25).start - 0.1, L(27).start + 0.6, 0.8, 0.8) * (1 - zoom);
  tags.forEach(([old, neu], k) => {
    const x = 660 + k * 300, y = 300, ta = tagA * ease(t, L(25).start + k * 0.8, 0.8);
    if (ta <= 0) return;
    const flip = seg(t, L(26).start + 0.3 + k * 1.2, L(26).start + 0.9 + k * 1.2), sy = Math.abs(Math.cos(Math.PI * flip));
    const label = flip < 0.5 ? old : neu, col = flip < 0.5 ? C.ivory : C.goldHi;
    g.save(); g.translate(x, y); g.scale(1, Math.max(0.02, sy)); g.globalAlpha = ta * 0.9; g.strokeStyle = flip < 0.5 ? C.gold : C.goldHi; g.lineWidth = 1.1;
    g.beginPath(); g.roundRect(-104, -26, 208, 52, 4); g.stroke(); g.restore();
    g.save(); g.translate(x, y); g.scale(1, Math.max(0.02, sy)); text(g, label, 0, 1, { size: 26, color: col, a: ta, track: 0.14 }); g.restore();
  });
  resetCam(g);
  // through the square hole: the light fills the frame
  if (zoom > 0.75) { g.fillStyle = `rgba(216,203,174,${SOFT(seg(zoom, 0.75, 1))})`; g.fillRect(0, 0, W, H); }
}

/* =====================================================================
   SCROLL — one long hand-scroll: Tang flying cash · Song jiaozi · Qing piaohao network
   ===================================================================== */
const SCROLL = (() => {
  const w = 6200, h = 430, c = offscreen(w, h), x = c.getContext('2d');
  const n1 = valueNoise2(5, 90), n2 = valueNoise2(6, 22), img = x.createImageData(w, h);
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const v = n1(i, j) * 0.65 + n2(i, j) * 0.35, k = (j * w + i) * 4, fib = (Math.sin(j * 1.7 + n2(i * 0.2, j) * 6) * 0.5 + 0.5) * 4;
    img.data[k] = 214 + v * 22 - fib; img.data[k + 1] = 200 + v * 20 - fib; img.data[k + 2] = 170 + v * 18 - fib; img.data[k + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  // ink-wash mountains, three layers
  const nz = noise1(77);
  [[0.06, 300, 70, 0.0021, 6], [0.09, 340, 55, 0.0034, 3], [0.12, 380, 40, 0.006, 1.5]].forEach(([a, base, amp, f, bl]) => {
    x.filter = `blur(${bl}px)`; x.fillStyle = `rgba(60,48,34,${a})`; x.beginPath(); x.moveTo(0, h);
    for (let i = 0; i <= w; i += 6) x.lineTo(i, base - Math.max(0, nz(i * f + base) * amp + nz(i * f * 3 + 9) * amp * 0.4) - amp * 0.3);
    x.lineTo(w, h); x.closePath(); x.fill(); x.filter = 'none';
  });
  const grd = x.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, 'rgba(70,50,30,.18)'); grd.addColorStop(0.12, 'rgba(70,50,30,0)'); grd.addColorStop(0.88, 'rgba(70,50,30,0)'); grd.addColorStop(1, 'rgba(70,50,30,.22)');
  x.fillStyle = grd; x.fillRect(0, 0, w, h);
  // city positions for the piaohao network (lon, lat)
  const cities = [['平遥', 112.2, 37.2], ['北京', 116.4, 39.9], ['天津', 117.2, 39.1], ['沈阳', 123.4, 41.8], ['西安', 108.9, 34.3], ['兰州', 103.8, 36.1], ['成都', 104.1, 30.7], ['重庆', 106.5, 29.6],
    ['汉口', 114.3, 30.6], ['长沙', 113.0, 28.2], ['苏州', 120.6, 31.3], ['上海', 121.5, 31.2], ['广州', 113.3, 23.1], ['济南', 117.0, 36.7], ['开封', 114.3, 34.8]]
    .map(([n, lo, la]) => ({ n, x: 4220 + (lo - 103) * 56, y: 420 + (42.5 - la) * 14.5 }));
  const R = rng(1823), links = [];
  cities.slice(1).forEach((c2, i) => links.push([0, i + 1, 0.15 * i]));
  [[1, 2], [2, 3], [4, 5], [6, 7], [7, 8], [8, 9], [10, 11], [8, 10], [9, 12], [13, 1], [14, 8], [4, 14], [13, 10]].forEach(([a, b], i) => links.push([a, b, 2.0 + 0.1 * i]));
  return { c, w, h, cities, links, Y0: 300, Y1: 730, R };
})();
function ink(a) { return `rgba(40,30,20,${a})`; }
function scrollPan(t) {
  const s = SC('song').start, p = SC('piaohao').start;
  return ease(t, s - 1.9, 2.4, SWIFT) * 1920 + ease(t, p - 1.9, 2.4, SWIFT) * 1920 + (t - WIN.scroll[0]) * 4;
}
function ticketPath(x, y, w, h, side) {          // a slip with one notched edge (side: 1 notch on right, -1 notch on left)
  const pts = [], n = 6, jag = 9;
  if (side > 0) { pts.push([x, y], [x + w, y]); for (let i = 1; i <= n; i++) pts.push([x + w + (i % 2 ? -jag : 0), y + h * i / n]); pts.push([x, y + h]); }
  else { pts.push([x + w, y], [x + w, y + h]); pts.push([x, y + h]); for (let i = n - 1; i >= 1; i--) pts.push([x + (i % 2 ? -jag : 0), y + h * i / n]); pts.push([x, y]); }
  return pts;
}
function drawSlip(g, pts, a, label) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.fillStyle = '#EDE3CC'; g.strokeStyle = ink(0.85); g.lineWidth = 1.4;
  g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fill(); g.stroke(); g.restore();
  if (label) { const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]); text(g, label, (Math.min(...xs) + Math.max(...xs)) / 2, Math.min(...ys) + 40, { size: 30, color: ink(0.9), a, vertical: true }); }
}
function sceneScroll(g, t) {
  const [A, B] = WIN.scroll, L = i => LN(i), S = SCROLL;
  const open = ease(t, A, 1.6, SWIFT), close = ease(t, B - 1.4, 1.3, SWIFT);
  const y0 = lerp(0, S.Y0, open), y1 = lerp(H, S.Y1, open);
  const yc = 515, Y0 = lerp(y0, yc, close), Y1 = lerp(y1, yc, close);
  if (Y1 - Y0 < 0.5) { goldStroke(g, [[200, yc], [1720, yc]], 1, { w: 1.4, a: 1, glow: 0.5 }); return; }
  const pan = scrollPan(t);
  g.save(); g.beginPath(); g.rect(0, Y0, W, Y1 - Y0); g.clip();
  g.drawImage(S.c, pan, 0, W, S.h, 0, Y0, W, Y1 - Y0);
  g.translate(-pan, 0);
  const cA = (1 - close) * ease(t, A + 0.8, 1.2, SOFT);
  /* ---- Tang: 飞钱 ---- */
  if (pan < 2000) {
    // Chang'an wall + gate
    g.save(); g.globalAlpha = cA; g.strokeStyle = ink(0.75); g.lineWidth = 2;
    g.beginPath(); g.moveTo(150, 640); g.lineTo(560, 640); g.stroke();
    for (let i = 0; i < 20; i++) g.strokeRect(152 + i * 20.5, 626, 10, 14);
    g.fillStyle = ink(0.75); g.fillRect(300, 560, 90, 80); g.fillStyle = '#E2D6BA'; g.beginPath(); g.moveTo(330, 640); g.lineTo(330, 606); g.arc(345, 606, 15, Math.PI, 0); g.lineTo(360, 640); g.fill();
    g.fillStyle = ink(0.85); g.beginPath(); g.moveTo(276, 566); g.quadraticCurveTo(345, 540, 414, 566); g.lineTo(400, 556); g.quadraticCurveTo(345, 530, 290, 556); g.fill();
    g.beginPath(); g.moveTo(290, 540); g.quadraticCurveTo(345, 510, 400, 540); g.lineTo(390, 532); g.quadraticCurveTo(345, 506, 300, 532); g.fill(); g.fillRect(318, 536, 54, 20);
    g.restore();
    text(g, '长 安', 345, 682, { size: 26, color: ink(0.85), a: cA, track: 0.3 });
    // copper coins stack — heavy, they stay
    const coinsA = cA * ease(t, L(28).start + 0.6, 1.0), sink = ease(t, L(31).start, 1.6, SOFT);
    for (let i = 0; i < 6; i++) {
      const cx = 500 + (i % 3) * 30, cy = 628 - Math.floor(i / 3) * 12 + sink * 4;
      g.save(); g.globalAlpha = coinsA * (1 - sink * 0.35); g.fillStyle = '#9A6A35'; g.strokeStyle = ink(0.7); g.lineWidth = 1;
      g.beginPath(); g.ellipse(cx, cy, 14, 6, 0, 0, 6.2832); g.fill(); g.stroke(); g.fillStyle = '#E2D6BA'; g.fillRect(cx - 3, cy - 1.5, 6, 3); g.restore();
    }
    text(g, '铜 钱', 530, 682, { size: 20, color: ink(0.7), a: coinsA, track: 0.3 });
    // 进奏院 hall
    const hall = cA * ease(t, L(28).start + 2.2, 1.2);
    g.save(); g.globalAlpha = hall; g.strokeStyle = ink(0.75); g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(640, 600); g.quadraticCurveTo(710, 576, 780, 600); g.stroke(); g.strokeRect(658, 600, 104, 40);
    for (let i = 0; i < 4; i++) { g.beginPath(); g.moveTo(670 + i * 27, 600); g.lineTo(670 + i * 27, 640); g.stroke(); }
    g.restore();
    text(g, '进奏院', 610, 470, { size: 26, color: ink(0.8), a: hall, vertical: true });
    // the slip, split in two; one half flies, they rejoin elsewhere
    const slipA = cA * ease(t, L(29).start - 0.2, 0.9);
    const split = ease(t, L(29).start + 0.5, 0.6, SOFT), fly = ease(t, L(29).start + 0.9, 2.0, SWIFT), join = ease(t, L(29).start + 2.9, 0.5, SOFT);
    const sx = 840, sy = 420, sw = 64, sh = 190;
    const left = ticketPath(sx - split * 10, sy, sw / 2, sh, 1);
    const P0 = [sx + sw / 2 + 10, sy], P2 = [1430, sy], P1 = [1135, 270];
    const fp = qbez(P0, P1, P2, fly);
    const rightHalf = ticketPath(fp[0] - (sw / 2) * (1 - join) + 0, fp[1], sw / 2, sh, -1);
    drawSlip(g, left, slipA * (1 - ease(t, L(30).start + 0.5, 1)), null);
    // the stub that waits at the destination office
    const stubA = cA * ease(t, L(29).start + 0.6, 1.0);
    drawSlip(g, ticketPath(1430 - sw / 2 - 4 + join * 4, sy, sw / 2, sh, 1), stubA, null);
    drawSlip(g, rightHalf.map(p => [p[0] + sw / 2 * join, p[1]]), slipA, null);
    text(g, '飞', 1430 - 2, sy + 70, { size: 34, color: ink(0.9), a: stubA * join });
    text(g, '钱', 1430 - 2, sy + 116, { size: 34, color: ink(0.9), a: stubA * join });
    g.save(); g.setLineDash([4, 7]); g.lineDashOffset = -t * 30;
    const dash = []; for (let i = 0; i <= 30; i++) dash.push(qbez(P0, P1, P2, i / 30));
    goldStroke(g, dash, ease(t, L(29).start + 0.7, 1.6, SOFT), { w: 1.2, a: cA * 0.8, glow: 0, color: '#8A6A3A' });
    g.restore();
    if (fly > 0 && fly < 1) glowDot(g, fp[0] + sw / 4, fp[1], 2.4, cA, C.gold);
    text(g, '长安 · 存钱', 800, 682, { size: 24, color: ink(0.85), a: slipA, track: 0.2 });
    text(g, '异地 · 取钱', 1430, 682, { size: 24, color: ink(0.85), a: stubA, track: 0.2 });
    const flash = Math.max(0, 1 - Math.abs(t - (L(29).start + 3.15)) / 0.35);
    if (flash > 0) glowDot(g, 1430, sy + sh / 2, 10, flash * cA, C.gold);
    // coins reappear at the destination
    const outC = cA * ease(t, L(29).start + 3.3, 1.0);
    for (let i = 0; i < 3; i++) { g.save(); g.globalAlpha = outC; g.fillStyle = '#9A6A35'; g.strokeStyle = ink(0.7); g.beginPath(); g.ellipse(1400 + i * 30, 640, 14, 6, 0, 0, 6.2832); g.fill(); g.stroke(); g.restore(); }
    // "飞钱" title + seal
    const big = cA * ease(t, L(30).start - 0.1, 1.2);
    text(g, '飞', 1700, 400, { size: 82, weight: 700, color: ink(0.9), a: big });
    text(g, '钱', 1700, 500, { size: 82, weight: 700, color: ink(0.9), a: big });
    const st = ease(t, L(30).start + 0.6, 0.5, outCubic);
    if (st > 0) { g.save(); g.globalAlpha = cA * st * 0.9; g.translate(1700, 590); g.scale(1.6 - st * 0.6, 1.6 - st * 0.6); g.fillStyle = '#A8322A'; g.fillRect(-20, -20, 40, 40); g.strokeStyle = '#E8CFC0'; g.lineWidth = 1.2; g.strokeRect(-15, -15, 30, 30); g.restore(); }
    // credit flowing through space
    const fl = cA * ease(t, L(31).start + 0.2, 1);
    for (let k = 0; k < 14; k++) { const u = ((t - L(31).start) * 0.45 + k / 14) % 1; const p = qbez([880, 420], P1, [1420, 420], u); glowDot(g, p[0], p[1], 1.8, fl * Math.sin(Math.PI * u) * 0.9, C.gold); }
  }
  /* ---- Song: 交子 ---- */
  if (pan > 600 && pan < 3900) {
    const X = 2880, Y = 512, NW = 220, NH = 340;
    const nA = cA * ease(t, SC('song').start - 0.4, 1.0);
    text(g, '北宋 · 益州', 2080, 360, { size: 28, color: ink(0.8), a: nA, vertical: true });
    const press = ease(t, L(32).start + 0.1, 0.7, SOFT), lift = ease(t, L(32).start + 1.0, 0.9, SWIFT);
    const noteA = nA * ease(t, L(32).start + 0.75, 0.3);
    const symb = ease(t, L(35).start, 2.0, SOFT), rise = ease(t, L(34).start, 1.2, SOFT) * 18;
    // the printed note
    if (noteA > 0) {
      const ny = Y - NH / 2 - rise;
      g.save(); g.globalAlpha = noteA; g.fillStyle = mixHex('#EFE6D0', '#D8CBAE', symb); g.shadowColor = 'rgba(60,40,20,.35)'; g.shadowBlur = 18; g.shadowOffsetY = 6;
      g.fillRect(X - NW / 2, ny, NW, NH); g.shadowColor = 'transparent';
      const det = 1 - symb;
      g.strokeStyle = symb > 0 ? mixHex('#3A2A1E', '#B08A4E', symb) : ink(0.85); g.lineWidth = 2.2; g.strokeRect(X - NW / 2 + 8, ny + 8, NW - 16, NH - 16);
      g.globalAlpha = noteA * det; g.lineWidth = 0.8; g.strokeRect(X - NW / 2 + 15, ny + 15, NW - 30, NH - 30);
      for (let i = 0; i < 18; i++) { g.strokeRect(X - NW / 2 + 18 + i * 10.4, ny + 18, 6, 6); g.strokeRect(X - NW / 2 + 18 + i * 10.4, ny + NH - 24, 6, 6); }
      g.restore();
      text(g, '交 子', X, ny + 62, { size: 40, weight: 700, color: ink(0.9), a: noteA * (1 - symb), track: 0.2 });
      g.save(); g.globalAlpha = noteA * (1 - symb); g.strokeStyle = ink(0.7); g.lineWidth = 1.1;
      g.strokeRect(X - 70, ny + 100, 140, 96);
      for (let k = 0; k < 3; k++) { const hx = X - 48 + k * 48; g.beginPath(); g.moveTo(hx - 18, ny + 150); g.lineTo(hx, ny + 132); g.lineTo(hx + 18, ny + 150); g.stroke(); g.strokeRect(hx - 12, ny + 150, 24, 22); }
      for (let k = 0; k < 9; k++) { g.beginPath(); g.moveTo(X - 72 + k * 18, ny + 214); g.lineTo(X - 72 + k * 18, ny + 214 + 50 + (k % 3) * 10); g.stroke(); }
      g.restore();
      [[X + 52, ny + 70], [X - 40, ny + 290], [X + 48, ny + 270]].forEach(([sx, sy], k) => {
        const sa = noteA * ease(t, L(32).start + 1.6 + k * 0.35, 0.4) * (1 - symb);
        if (sa > 0) { g.save(); g.globalAlpha = sa * 0.85; g.fillStyle = '#A8322A'; g.fillRect(sx - 14, sy - 14, 28, 28); g.restore(); }
      });
    }
    // the printing block
    if (lift < 1) {
      const by = lerp(-420, Y - NH / 2 - 4, press) - lift * 520;
      g.save(); g.globalAlpha = nA; g.fillStyle = '#3B2B1D'; g.fillRect(X - NW / 2 - 8, by, NW + 16, NH + 8);
      g.strokeStyle = 'rgba(255,230,190,.25)'; g.strokeRect(X - NW / 2 - 4, by + 4, NW + 8, NH); g.restore();
    }
    // metal value dissolves into it
    const metal = cA * life(t, L(33).start - 0.2, L(34).start + 0.6, 0.6, 0.8);
    const melt = ease(t, L(33).start + 0.8, 1.8, SOFT);
    for (let i = 0; i < 3; i++) {
      const cx = lerp(2440 + i * 46, X - 60, melt), cy = lerp(600, 520, melt), r = lerp(26, 4, melt);
      g.save(); g.globalAlpha = metal * (1 - melt * 0.9); g.fillStyle = '#9A6A35'; g.strokeStyle = ink(0.7); g.lineWidth = 1.2;
      g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill(); g.stroke(); g.fillStyle = '#E2D6BA'; g.fillRect(cx - r * 0.3, cy - r * 0.3, r * 0.6, r * 0.6); g.restore();
    }
    text(g, '金属价值', 2486, 660, { size: 24, color: ink(0.8), a: metal, track: 0.2 });
    const strike = ease(t, L(33).start + 1.5, 0.6);
    if (strike > 0) { g.save(); g.globalAlpha = metal; g.strokeStyle = '#A8322A'; g.lineWidth = 2; g.beginPath(); g.moveTo(2420, 660); g.lineTo(2420 + 132 * strike, 660); g.stroke(); g.restore(); }
    // standing on credit
    const base = cA * ease(t, L(34).start + 0.2, 1.0);
    goldStroke(g, [[X - 170, 700], [X + 170, 700]], base, { w: 1.6, a: base, glow: 0.2, color: '#8A6A3A' });
    text(g, '信  用', X, 714, { size: 22, weight: 600, color: ink(0.9), a: base, track: 0.4 });
    // symbolised
    const sy = cA * ease(t, L(35).start + 0.6, 1.4);
    ['¥', '$', '€', '£', '¢'].forEach((s, k) => {
      const a = sy * ease(t, L(35).start + 0.6 + k * 0.18, 1.0);
      text(g, s, 3170 + k * 92, 470 + Math.sin(t * 0.8 + k) * 8 + (k % 2) * 40, { font: 'latin', size: 62, weight: 500, color: '#8A6A3A', a: a * 0.85 });
    });
  }
  /* ---- Qing: 山西票号 ---- */
  if (pan > 2400) {
    const pA = cA * ease(t, SC('piaohao').start - 0.4, 1.0);
    text(g, '日升昌 · 平遥', 4060, 360, { size: 28, color: ink(0.8), a: pA, vertical: true });
    // plaque
    const pl = pA * ease(t, L(36).start, 1.2);
    if (pl > 0) {
      const py = 372 - (1 - pl) * 20;
      g.save(); g.globalAlpha = pl; g.fillStyle = '#17110B'; g.shadowColor = 'rgba(40,25,10,.5)'; g.shadowBlur = 16; g.shadowOffsetY = 6;
      g.fillRect(4560, py - 44, 480, 88); g.shadowColor = 'transparent'; g.strokeStyle = '#B08A4E'; g.lineWidth = 2; g.strokeRect(4568, py - 36, 464, 72); g.restore();
      text(g, '汇 通 天 下', 4800, py + 2, { size: 46, weight: 700, color: '#D9B878', a: pl, track: 0.3 });
    }
    // network
    const net = pA * ease(t, L(37).start - 0.4, 0.8);
    if (net > 0) {
      const C_ = S.cities;
      S.links.forEach(([a, b, d]) => {
        const p = ease(t, L(37).start + d * 0.9, 1.2, SOFT); if (p <= 0) return;
        const P = [C_[a].x, C_[a].y], Q = [C_[b].x, C_[b].y], M = [(P[0] + Q[0]) / 2, (P[1] + Q[1]) / 2 - 18];
        const pts = []; for (let i = 0; i <= 14; i++) pts.push(qbez(P, M, Q, i / 14));
        goldStroke(g, pts, p, { w: a === 0 ? 1.4 : 0.9, a: net * (a === 0 ? 0.9 : 0.5), glow: 0, color: '#9C7A42' });
        // money moving at the speed of a letter
        const sp = ease(t, L(38).start, 1);
        if (sp > 0) for (let k = 0; k < 2; k++) { const u = ((t * 0.55 + d * 3 + k * 0.5) % 1); const q = qbez(P, M, Q, u); glowDot(g, q[0], q[1], 1.6, net * sp * Math.sin(Math.PI * u), C.gold); }
      });
      C_.forEach((c, i) => {
        const a = net * ease(t, L(37).start + (i ? 0.3 + i * 0.12 : 0), 0.8);
        g.save(); g.globalAlpha = a; g.fillStyle = i ? ink(0.8) : '#A8322A'; g.beginPath(); g.arc(c.x, c.y, i ? 3.2 : 6, 0, 6.2832); g.fill(); g.restore();
        text(g, c.n, c.x + (i ? 0 : 0), c.y + (i ? -16 : -22), { size: i ? 18 : 24, weight: i ? 400 : 700, color: ink(i ? 0.7 : 0.95), a, track: 0.1 });
      });
      text(g, '联号 · 密押', 5420, 700, { size: 22, color: ink(0.7), a: net * ease(t, L(37).start + 1.6, 1), align: 'right', track: 0.2 });
    }
    // the escort cart is no longer needed
    const cart = pA * life(t, L(38).start - 0.2, B, 0.6, 0.8);
    if (cart > 0) {
      const u = seg(t, L(38).start, L(38).end + 0.6), cx = lerp(4130, 4290, u), cy = 690 - Math.sin(u * 9) * 2;
      const gone = ease(t, L(38).start + 2.2, 1.0);
      g.save(); g.globalAlpha = cart * (1 - gone * 0.7); g.strokeStyle = ink(0.8); g.fillStyle = ink(0.7); g.lineWidth = 1.4;
      g.fillRect(cx - 18, cy - 16, 36, 14); g.beginPath(); g.arc(cx - 10, cy, 6, 0, 6.2832); g.stroke(); g.beginPath(); g.arc(cx + 10, cy, 6, 0, 6.2832); g.stroke();
      g.beginPath(); g.moveTo(cx + 14, cy - 16); g.lineTo(cx + 14, cy - 36); g.stroke(); g.fillStyle = '#A8322A'; g.fillRect(cx + 14, cy - 36, 14, 9); g.restore();
      text(g, '镖车', cx, cy + 24, { size: 18, color: ink(0.7), a: cart * (1 - gone * 0.7), track: 0.2 });
      if (gone > 0) { g.save(); g.globalAlpha = cart * gone; g.strokeStyle = '#A8322A'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx - 30, cy - 40); g.lineTo(cx - 30 + 60 * gone, cy + 30 - 70 * (1 - gone)); g.stroke(); g.restore(); }
    }
  }
  g.restore();
  // rails
  const railA = 1;
  for (const [y, dir] of [[Y0, -1], [Y1, 1]]) {
    g.fillStyle = '#2A1E13'; g.fillRect(0, dir < 0 ? y - 12 : y, W, 12);
    goldStroke(g, [[0, y], [W, y]], 1, { w: 1.4, a: railA * 0.9, glow: 0.3, color: '#B79158' });
    goldStroke(g, [[0, y + dir * 12], [W, y + dir * 12]], 1, { w: 0.8, a: railA * 0.5, glow: 0, color: '#B79158' });
  }
  if (close > 0.9) goldStroke(g, [[lerp(0, 200, seg(close, 0.9, 1)), yc], [lerp(W, 1720, seg(close, 0.9, 1)), yc]], 1, { w: 1.4, a: seg(close, 0.9, 1), glow: 0.5 });
}

/* =====================================================================
   CHAIN — the efficiency line: 飞钱 → 交子 → 票号 → 电汇 → 数字资产
   ===================================================================== */
function sceneChain(g, t) {
  const [A, B] = WIN.chain, L = i => LN(i), y = 515;
  const exit = ease(t, B - 1.0, 1.0, SWIFT), a = 1 - seg(t, B - 0.2, B + 0.3);
  const xa = lerp(200, 960, exit), xb = lerp(1720, 960, exit);
  goldStroke(g, [[xa, y], [xb, y]], 1, { w: 1.4, a, glow: 0.5 });
  if (exit > 0.85) glowDot(g, 960, y, 4, (1 - seg(t, B, B + 0.3)) * SOFT(seg(exit, 0.85, 1)));
  const nodes = [['飞钱', '唐 · 806'], ['交子', '北宋 · 1023'], ['票号', '清 · 1823'], ['电汇', '19 世纪'], ['数字资产', '今天']];
  const xs = [330, 640, 950, 1260, 1580];
  const d39 = L(39).end - L(39).start;
  const litAt = [L(39).start, L(39).start + d39 * 0.3, L(39).start + d39 * 0.62, L(42).start + 0.6, L(42).start + 1.9];
  nodes.forEach(([n, era], k) => {
    const x = lerp(xs[k], 960, exit), lit = ease(t, litAt[k] - 0.1, 0.8), base = ease(t, A + 0.6 + k * 0.12, 1.0) * (1 - exit);
    glowDot(g, x, y, lerp(2.5, 4, lit), base * lerp(0.35, 1, lit));
    g.save(); g.globalAlpha = base * lerp(0.3, 1, lit); g.strokeStyle = lit > 0.5 ? C.goldHi : C.gold; g.lineWidth = 1; g.beginPath(); g.arc(x, y, 12 + lit * 4, 0, 6.2832); g.stroke(); g.restore();
    text(g, n, x, y + 52, { size: 32, weight: 600, color: lit > 0.5 ? C.goldHi : C.ivory, a: base * lerp(0.4, 1, lit), track: 0.12 });
    text(g, era, x, y + 92, { font: k === 4 ? 'serif' : 'serif', size: 20, color: C.ivory, a: base * lerp(0.3, 0.7, lit), track: 0.12 });
    // icons
    const ia = base * lerp(0.25, 0.95, lit), iy = y - 64;
    g.save(); g.globalAlpha = ia; g.strokeStyle = C.gold; g.lineWidth = 1.3;
    if (k === 0) { g.strokeRect(x - 10, iy - 26, 20, 52); g.beginPath(); for (let i = 0; i < 5; i++) { g.lineTo(x + 10 + (i % 2 ? 5 : 0), iy - 26 + i * 13); } g.stroke(); }
    if (k === 1) { g.strokeRect(x - 18, iy - 28, 36, 56); g.strokeRect(x - 13, iy - 23, 26, 46); g.fillStyle = '#A8322A'; g.fillRect(x + 2, iy + 8, 9, 9); }
    if (k === 2) { g.strokeRect(x - 34, iy - 14, 68, 28); g.beginPath(); g.moveTo(x - 26, iy); g.lineTo(x + 26, iy); g.stroke(); }
    if (k === 3) { g.beginPath(); for (let i = 0; i <= 40; i++) { const u = i / 40; g.lineTo(x - 34 + u * 68, iy + Math.sin(u * 18 + t * 4) * 10 * Math.sin(Math.PI * u)); } g.stroke(); }
    if (k === 4) { g.beginPath(); for (let i = 0; i < 6; i++) { const an = Math.PI / 6 + i * Math.PI / 3; g.lineTo(x + Math.cos(an) * 26, iy + Math.sin(an) * 26); } g.closePath(); g.stroke(); g.beginPath(); g.arc(x, iy, 8, 0, 6.2832); g.stroke(); }
    g.restore();
    if (k === 4 && lit > 0) {
      for (let i = 0; i < 26; i++) { const r0 = rng(i + 40), an = r0() * 6.28, sp = 30 + r0() * 80, u = ((t - litAt[4]) * 0.6 + r0()) % 1;
        g.globalAlpha = (1 - u) * lit * base * 0.8; g.fillStyle = C.goldHi; g.fillRect(x + Math.cos(an) * sp * u - 1.5, iy + Math.sin(an) * sp * u - 1.5, 3, 3); }
      g.globalAlpha = 1;
    }
  });
  // efficiency comet
  const cm = seg(t, L(40).start, L(40).start + 2.4);
  if (cm > 0 && cm < 1 && exit === 0) { const cx = lerp(200, 1720, SWIFT(cm)); const gr = g.createLinearGradient(cx - 260, 0, cx, 0); gr.addColorStop(0, 'rgba(255,230,180,0)'); gr.addColorStop(1, 'rgba(255,236,200,.9)'); g.fillStyle = gr; g.fillRect(cx - 260, y - 1.5, 260, 3); glowDot(g, cx, y, 3.5, 1); }
  // liquidity up, cost down
  const cv_ = life(t, L(41).start - 0.2, B - 0.6, 1.0, 0.8) * (1 - exit);
  if (cv_ > 0) {
    const up = [], dn = []; for (let i = 0; i <= 50; i++) { const u = i / 50; up.push([lerp(330, 1580, u), lerp(400, 250, Math.pow(u, 1.6))]); dn.push([lerp(330, 1580, u), lerp(260, 400, Math.pow(u, 0.7))]); }
    goldStroke(g, up, ease(t, L(41).start, 2.0, SOFT), { w: 2, a: cv_, glow: 0.5, color: C.goldHi });
    g.save(); g.setLineDash([6, 6]); goldStroke(g, dn, ease(t, L(41).start + 1.6, 2.0, SOFT), { w: 1.4, a: cv_ * 0.7, glow: 0, color: C.ivory }); g.restore();
    text(g, '流动性 ↑', 1610, 250, { size: 24, color: C.goldHi, a: cv_ * ease(t, L(41).start + 1.2, 1), align: 'left', track: 0.12 });
    text(g, '交易成本 ↓', 1610, 400, { size: 24, color: C.ivory, a: cv_ * ease(t, L(41).start + 2.6, 1) * 0.8, align: 'left', track: 0.12 });
  }
}

/* =====================================================================
   VOC — a ship on the horizon, the monogram, the share, the exchange; the future, packaged
   ===================================================================== */
const VOC = (() => {
  const R = rng(1602);
  const glitter = Array.from({ length: 140 }, () => ({ x: R() * W, y: 660 + Math.pow(R(), 1.6) * 110, w: 6 + R() * 26, ph: R() * 6.28 }));
  const crowd = Array.from({ length: 120 }, () => ({ x: 260 + R() * 600, y: 730 + R() * 34, d: R(), ph: R() * 6.28 }));
  const fan = Array.from({ length: 36 }, (_, i) => { const nz = noise1(300 + i); return { nz, end: (R() - 0.45) * 2 }; });
  return { glitter, crowd, fan };
})();
function shipPts(x, y, s) {
  const P = (px, py) => [x + px * s, y + py * s];
  return {
    hull: [P(-120, -20), P(-100, 18), P(96, 18), P(132, -26), P(110, -22), P(100, -30), P(-110, -30), P(-120, -20)],
    masts: [[P(-60, -30), P(-60, -170)], [P(10, -30), P(10, -200)], [P(74, -30), P(74, -150)], [P(110, -24), P(170, -80)]],
    sails: [[P(-92, -150), P(-28, -150), P(-24, -100), P(-96, -100)], [P(-88, -95), P(-32, -95), P(-30, -50), P(-90, -50)],
      [P(-26, -185), P(46, -185), P(50, -128), P(-30, -128)], [P(-24, -122), P(44, -122), P(48, -60), P(-28, -60)],
      [P(50, -140), P(98, -140), P(100, -100), P(48, -100)], [P(52, -95), P(96, -95), P(98, -55), P(50, -55)]],
  };
}
function sceneVOC(g, t) {
  const [A, B] = WIN.voc, L = i => LN(i);
  const exit = ease(t, B - 1.2, 1.2, SWIFT), a0 = ease(t, A + 0.1, 1.4, SOFT) * (1 - exit);
  camera(g, 1 + 0.03 * seg(t, A, B), 960, 560);
  // sea + horizon
  goldStroke(g, [[lerp(960, 0, ease(t, A, 1.6, SWIFT)), 650], [lerp(960, W, ease(t, A, 1.6, SWIFT)), 650]], 1, { w: 1.2, a: a0 * 0.8, glow: 0.3 });
  for (const gl of VOC.glitter) { const a = a0 * 0.35 * (0.5 + 0.5 * Math.sin(t * 1.4 + gl.ph)) * (1 - (gl.y - 660) / 130); g.fillStyle = rgba(C.goldHi, a); g.fillRect(gl.x + Math.sin(t * 0.3 + gl.ph) * 10, gl.y, gl.w, 1); }
  // ship
  const shipA = a0 * ease(t, L(43).start - 0.2, 1) * (1 - ease(t, L(45).start - 0.3, 1.2, SOFT));
  const sx = lerp(1560, 1250, seg(t, A, L(46).start)), bob = Math.sin(t * 1.2) * 2;
  const sp = shipPts(sx, 650 + bob, 1.05), draw = ease(t, L(43).start, 2.6, SOFT);
  if (shipA > 0) {
    goldStroke(g, sp.hull, draw, { w: 1.6, a: shipA });
    sp.masts.forEach((m, i) => goldStroke(g, m, ease(t, L(43).start + 0.5 + i * 0.2, 1.4), { w: 1.2, a: shipA, glow: 0.2 }));
    sp.sails.forEach((s, i) => { const p = ease(t, L(43).start + 1.0 + i * 0.18, 1.6); if (p <= 0) return; g.save(); g.globalAlpha = shipA * p * 0.16; g.fillStyle = C.goldHi; g.beginPath(); s.forEach((q, j) => j ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1])); g.fill(); g.restore(); goldStroke(g, s, p, { w: 1, a: shipA * 0.9, glow: 0, close: true }); });
  }
  // VOC monogram
  const mono = a0 * ease(t, L(44).start - 0.2, 0.6) * (1 - ease(t, L(47).start - 0.4, 1.0, SOFT) * 0.85);
  if (mono > 0) {
    const mx = 960, my = 330, s = 0.9;
    goldStroke(g, [[mx - 64 * s, my - 70 * s], [mx, my + 62 * s], [mx + 64 * s, my - 70 * s]], ease(t, L(44).start, 1.4, SOFT), { w: 2, a: mono, glow: 0.5, color: C.goldHi });
    goldStroke(g, arcPts(mx - 38 * s, my - 26 * s, 21 * s, -Math.PI / 2, Math.PI * 1.5), ease(t, L(44).start + 0.6, 1.2, SOFT), { w: 1.6, a: mono, glow: 0.4 });
    goldStroke(g, arcPts(mx + 40 * s, my - 26 * s, 21 * s, -Math.PI * 0.3, -Math.PI * 1.7), ease(t, L(44).start + 0.9, 1.2, SOFT), { w: 1.6, a: mono, glow: 0.4 });
    goldStroke(g, arcPts(mx, my - 8 * s, 98 * s, -Math.PI / 2, Math.PI * 1.5, 80), ease(t, L(44).start + 1.2, 1.8, SOFT), { w: 0.8, a: mono * 0.5, glow: 0 });
  }
  // share certificate (splits into ownership / control)
  const cert = a0 * ease(t, L(44).start + 1.4, 1.2);
  const split = ease(t, L(46).start + 0.2, 1.6, SWIFT), cx = lerp(380, 560, ease(t, L(44).start + 1.4, 1.4)), cy = 470;
  const certFade = 1 - ease(t, L(47).start - 0.4, 1.0, SOFT);
  if (cert > 0) {
    const half = (side) => {
      const off = split * 90 * side, dy = split * (side < 0 ? 60 : -30);
      g.save(); g.globalAlpha = cert * certFade; g.translate(cx + off, cy + dy); g.rotate(split * 0.05 * side);
      g.beginPath(); g.rect(side < 0 ? -150 : 0 - (split > 0 ? 0 : 0), -105, 150, 210); g.clip();
      g.fillStyle = '#D9CBAA'; g.fillRect(-150, -105, 300, 210); g.strokeStyle = ink(0.75); g.lineWidth = 1.6; g.strokeRect(-140, -95, 280, 190);
      g.font = "italic 500 36px 'CormorantSub',serif"; g.fillStyle = ink(0.9); g.textAlign = 'center'; g.fillText('Aandeel', 0, -52);
      g.font = "400 14px 'CormorantSub',serif"; g.fillText('AMSTERDAM · MDCII', 0, -28);
      g.lineWidth = 0.7; for (let i = 0; i < 5; i++) { g.beginPath(); for (let k = 0; k <= 30; k++) g.lineTo(-110 + k * 7.3, 0 + i * 12 + Math.sin(k * 0.9 + i) * 2); g.stroke(); }
      g.lineWidth = 1.4; g.beginPath(); g.moveTo(-22, 66); g.lineTo(0, 92); g.lineTo(22, 66); g.stroke();
      g.restore();
    };
    if (split > 0) { half(-1); half(1); } else half(-1), half(1);
    const lab = cert * ease(t, L(46).start + 1.0, 1) * certFade;
    text(g, '所有权', cx - 90 - 90 * split, cy + 170, { size: 26, color: C.goldHi, a: lab, track: 0.2 });
    text(g, '经营权', cx + 90 + 90 * split, cy + 110, { size: 26, color: C.goldHi, a: lab, track: 0.2 });
    text(g, '第一家上市公司 · VOC', cx, cy - 140, { size: 22, color: C.ivory, a: cert * ease(t, L(45).start, 1) * (1 - split) * certFade, track: 0.16 });
  }
  // the exchange (Beurs) — arcade + tower
  const ex = a0 * ease(t, L(45).start - 0.2, 0.6) * (1 - ease(t, L(47).start - 0.4, 1.0, SOFT) * 0.88);
  if (ex > 0) {
    const bx = 1380, by = 640, p = ease(t, L(45).start, 2.2, SOFT);
    goldStroke(g, [[bx - 270, by], [bx + 270, by]], p, { w: 1.4, a: ex });
    goldStroke(g, [[bx - 270, by - 150], [bx + 270, by - 150]], p, { w: 1.2, a: ex });
    goldStroke(g, [[bx - 270, by - 160], [bx + 270, by - 160]], p, { w: 0.8, a: ex * 0.6, glow: 0 });
    for (let i = 0; i < 9; i++) { const ax = bx - 240 + i * 60, q = ease(t, L(45).start + 0.3 + i * 0.08, 1.0, SOFT); goldStroke(g, [[ax - 20, by], [ax - 20, by - 80], ...arcPts(ax, by - 80, 20, Math.PI, 2 * Math.PI, 12), [ax + 20, by]], q, { w: 1, a: ex * 0.85, glow: 0 }); }
    goldStroke(g, [[bx - 26, by - 160], [bx - 26, by - 240], [bx, by - 280], [bx + 26, by - 240], [bx + 26, by - 160]], ease(t, L(45).start + 1.0, 1.2), { w: 1.2, a: ex });
    goldStroke(g, arcPts(bx, by - 214, 12, 0, 6.2832, 24), ease(t, L(45).start + 1.6, 0.8), { w: 1, a: ex, glow: 0 });
    text(g, '阿姆斯特丹证券交易所', bx, by + 40, { size: 22, color: C.ivory, a: ex * ease(t, L(45).start + 1.4, 1), track: 0.16 });
  }
  // the public streams in
  const pub = a0 * (1 - ease(t, L(47).start - 0.4, 0.8, SOFT)) * life(t, L(46).start + 0.6, L(47).start + 0.4, 1.0, 0.8);
  if (pub > 0) for (const c of VOC.crowd) {
    const u = ((t - L(46).start) * 0.18 + c.d) % 1, x = lerp(c.x, 1380 + (c.d - 0.5) * 400, SOFT(u)), y = lerp(c.y, 600 + Math.sin(c.ph) * 20, SOFT(u));
    g.globalAlpha = pub * 0.7 * Math.sin(Math.PI * u); g.fillStyle = C.goldHi; g.beginPath(); g.arc(x, y, 1.8, 0, 6.2832); g.fill();
  }
  g.globalAlpha = 1;
  // the future as a fan of outcomes, packed into one tradable line
  const fanA = ease(t, L(47).start - 0.2, 1.0) * (1 - exit * 0.0);
  if (fanA > 0) {
    const ox = 700, oy = 470, pack = ease(t, L(48).start + 0.2, 1.6, SWIFT), grow = ease(t, L(47).start, 2.0, SOFT);
    VOC.fan.forEach((f, i) => {
      const pts = []; for (let k = 0; k <= 40; k++) { const u = k / 40 * grow; pts.push([ox + u * 640, oy + (f.end * 190 * Math.pow(u, 1.2) + f.nz(u * 6) * 26 * u) * (1 - pack)]); }
      goldStroke(g, pts, 1, { w: 0.8, a: fanA * 0.32 * (1 - exit), glow: 0, color: f.end > 0 ? '#7FA48F' : '#D07A6C' });
    });
    if (pack > 0) {
      g.save(); g.globalAlpha = fanA * pack * (1 - exit); g.strokeStyle = C.goldHi; g.lineWidth = 1.2; const bw = lerp(140, 64, pack), bh = lerp(380, 64, pack);
      g.strokeRect(ox + 640 - bw / 2, oy - bh / 2, bw, bh); g.restore();
      text(g, '标的', ox + 640, oy - lerp(220, 62, pack), { size: 26, weight: 600, color: C.goldHi, a: fanA * pack * (1 - exit), track: 0.2 });
    }
    const tick = ease(t, L(48).start + 1.4, 1.4, SOFT);
    if (tick > 0) {
      const nz = noise1(42), pts = []; for (let k = 0; k <= 80; k++) { const u = k / 80 * tick; pts.push([ox + 672 + u * 560, oy + nz(u * 9 + t * 0.2) * 22 * Math.min(1, u * 4)]); }
      const hp = goldStroke(g, pts, 1, { w: 1.6, a: fanA * (1 - exit * 0.0), glow: 0.5, color: C.goldHi });
      glowDot(g, hp[0], hp[1], 3, fanA);
      text(g, (100 + nz(t) * 8).toFixed(2), hp[0] + 18, hp[1] - 24, { font: 'latin', size: 24, weight: 500, color: C.goldHi, a: fanA * tick * (1 - exit), align: 'left' });
    }
  }
  resetCam(g);
}

/* =====================================================================
   YEARS — 5,000 years of finance vs. 400 years of markets
   ===================================================================== */
function sceneYears(g, t) {
  const [A, B] = WIN.years, X0 = 240, X1 = 1680, y = 540, L = LN(49);
  const xNow = X1, x400 = X1 - (X1 - X0) * 420 / 5026;
  const zoom = inCubic(seg(t, B - 1.4, B + 0.4));
  camera(g, 1 + zoom * 9, (x400 + xNow) / 2, y);
  const a = ease(t, A - 0.3, 1.2, SOFT) * (1 - seg(t, B + 0.1, B + 0.4));
  const draw = ease(t, A - 0.3, 1.4, SWIFT);
  goldStroke(g, [[lerp(1300, X0, draw), y], [lerp(1400, X1, draw), y]], 1, { w: 3, a: a * 0.45, glow: 0, color: C.gold });
  for (let k = 0; k <= 5; k++) { const x = lerp(X0, X1, (k * 1000 + 26) / 5026); goldStroke(g, [[x, y - 8], [x, y + 8]], 1, { w: 1, a: a * 0.4, glow: 0 }); }
  const hi = ease(t, L.start + 0.3, 1.2);
  goldStroke(g, [[x400, y], [lerp(x400, xNow, hi), y]], 1, { w: 5, a, glow: 1.2, color: C.goldHi });
  const lz = 1 - seg(zoom, 0, 0.25);
  text(g, '古代金融 · 5000 年', (X0 + x400) / 2, y - 48, { size: 28, color: C.ivory, a: a * ease(t, A, 1) * lz, track: 0.2 });
  text(g, '公元前 3000', X0, y + 44, { size: 20, color: C.ivory, a: a * 0.6 * lz, track: 0.12 });
  text(g, '1602', x400, y + 44, { font: 'latin', size: 24, color: C.goldHi, a: a * hi * lz });
  text(g, '今', xNow, y + 44, { size: 20, color: C.goldHi, a: a * hi * lz });
  const n = Math.round(400 * ease(t, L.start + 0.6, 1.8, SOFT));
  text(g, n + '+', (x400 + xNow) / 2, y - 92, { font: 'latin', size: 64, weight: 500, color: C.goldHi, a: a * hi * lz, track: 0.02 });
  text(g, '现代资本市场', (x400 + xNow) / 2, y - 48, { size: 22, color: C.goldHi, a: a * hi * lz, track: 0.2 });
  resetCam(g);
  if (zoom > 0.6) { const f = seg(zoom, 0.6, 1); g.fillStyle = `rgba(255,236,200,${0.35 * Math.sin(Math.PI * f)})`; g.fillRect(0, 0, W, H); }
}

/* =====================================================================
   CANDLE — every candle carries the past: tablet, flying cash, greed, fear
   ===================================================================== */
const CAN = (() => {
  const K = makeCandles(2026, 42, { drift: 0.08, vol: 1.2 });
  K.forEach((k, i) => { if (i > 30) { const m = (k.o + k.c) / 2; k.hi = m + (k.hi - m) * 1.6; k.lo = m - (m - k.lo) * 1.6; } });
  let lo = 1e9, hi = -1e9; for (const k of K) { lo = Math.min(lo, k.lo); hi = Math.max(hi, k.hi); }
  return { K, yOf: p => lerp(720, 300, (p - lo) / (hi - lo)), x: i => 250 + i * 34 };
})();
function sceneCandle(g, t) {
  const [A, B] = WIN.candle, L = i => LN(i), { K, yOf, x } = CAN;
  const a = ease(t, A - 0.2, 1.0, SOFT) * (1 - seg(t, B - 0.4, B + 0.4) * 0.0);
  const toCons = ease(t, B - 1.0, 1.4, SWIFT);
  camera(g, lerp(1.06, 1, ease(t, A - 0.2, 3, SOFT)) + 0.02 * seg(t, A, B), 960, 520);
  for (let i = 0; i < 7; i++) { const y = 300 + i * 70; goldStroke(g, [[230, y], [1700, y]], ease(t, A + i * 0.05, 1.2, SOFT), { w: 0.8, a: a * 0.1 * (1 - toCons), glow: 0 }); }
  for (let i = 0; i < 7; i++) text(g, (3320 - i * 40).toString(), 1716, 300 + i * 70, { font: 'latin', size: 18, color: C.gold, a: a * 0.5 * (1 - toCons), align: 'left' });
  const n = ease(t, A, 3.2, SOFT) * K.length;
  const glowSweep = seg(t, L(54).start - 0.2, L(54).start + 2.2);
  const greed = life(t, L(53).start - 0.1, B, 1.0, 1.0);
  for (let i = 0; i < K.length; i++) {
    const p = clamp(n - i); if (p <= 0) break;
    const focus = (i === 12 ? life(t, L(51).start - 0.1, L(53).start, 0.6, 0.6) : 0) + (i === 24 ? life(t, L(52).start - 0.1, L(53).start + 0.3, 0.6, 0.6) : 0);
    const gl = Math.exp(-Math.pow((i / K.length - glowSweep) * 8, 2)) + (glowSweep >= 1 ? 0.35 : 0);
    const dim = (L(51).start - 0.1 < t && t < L(53).start + 0.3) ? (focus > 0 ? 1 : 0.45) : 1;
    drawCandle(g, x(i), yOf, K[i], 16, a * p * dim * (1 - toCons), { grow: EXPO(p), mono: toCons, glow: Math.max(focus, gl * ease(t, L(54).start - 0.2, 0.4)) * 0.9 });
  }
  // the past, written inside two candles
  const ic1 = life(t, L(51).start - 0.1, L(53).start, 0.6, 0.6), ic2 = life(t, L(52).start - 0.1, L(53).start + 0.3, 0.6, 0.6);
  const c1 = [x(12), Math.min(yOf(K[12].hi), yOf(K[12].lo)) - 90], c2 = [x(24), Math.min(yOf(K[24].hi), yOf(K[24].lo)) - 100];
  if (ic1 > 0) { drawTablet(g, c1[0], c1[1], 84, 58, ic1, { carve: SUMER.wedges.map(() => 1) }); text(g, '泥板 · 3000 BC', c1[0], c1[1] - 54, { size: 20, color: C.goldHi, a: ic1, track: 0.12 }); goldStroke(g, [[c1[0], c1[1] + 34], [c1[0], yOf(K[12].hi) - 8]], ic1, { w: 1, a: ic1 * 0.6, glow: 0 }); }
  if (ic2 > 0) { drawSlip(g, ticketPath(c2[0] - 14, c2[1] - 36, 28, 72, 1), ic2, null); text(g, '飞钱 · 806', c2[0], c2[1] - 60, { size: 20, color: C.goldHi, a: ic2, track: 0.12 }); goldStroke(g, [[c2[0], c2[1] + 40], [c2[0], yOf(K[24].hi) - 8]], ic2, { w: 1, a: ic2 * 0.6, glow: 0 }); }
  // greed / fear
  const gA = greed * (1 - toCons);
  text(g, '贪 婪', 1420, 270, { size: 88, weight: 700, color: C.up, a: gA * 0.42 * ease(t, L(53).start + 0.2, 1.2), track: 0.1 });
  text(g, '恐 惧', 520, 760, { size: 88, weight: 700, color: C.down, a: gA * 0.42 * ease(t, L(53).start + 1.1, 1.2), track: 0.1 });
  resetCam(g);
}

/* =====================================================================
   CONSENSUS — resources carried across time; every bid and ask collapses into one price
   ===================================================================== */
const CONS = (() => { const R = rng(7); return Array.from({ length: 320 }, (_, i) => ({ x: 260 + R() * 1400, y0: R() < 0.5 ? 200 + R() * 220 : 640 + R() * 220, d: R(), buy: i % 2 === 0 })); })();
function sceneConsensus(g, t) {
  const [A, B] = WIN.consensus, L = i => LN(i), y = 530;
  const a = ease(t, A - 0.2, 1.0, SOFT) * (1 - seg(t, B - 1.6, B));
  const shrink = ease(t, B - 2.4, 2.0, SWIFT);
  // time arrow
  const ax = ease(t, A - 0.2, 1.6, SWIFT);
  const xa = lerp(960, 260, ax) + shrink * 700, xb = lerp(960, 1660, ax) - shrink * 700;
  // resources across time
  const res = life(t, L(55).start - 0.2, L(56).start + 0.6, 0.8, 0.8);
  if (res > 0) {
    text(g, '现在', 360, y + 44, { size: 22, color: C.ivory, a: res * 0.8, track: 0.2 });
    text(g, '未来', 1560, y + 44, { size: 22, color: C.ivory, a: res * 0.8, track: 0.2 });
    goldStroke(g, [[1640, y - 8], [1660, y], [1640, y + 8]], 1, { w: 1.2, a: res * 0.8, glow: 0 });
    for (let k = 0; k < 3; k++) {
      const P = [380 + k * 120, y], Q = [1220 + k * 120, y], M = [(P[0] + Q[0]) / 2, y - 150 - k * 40], pts = [];
      for (let i = 0; i <= 30; i++) pts.push(qbez(P, M, Q, i / 30));
      goldStroke(g, pts, ease(t, L(55).start + k * 0.3, 1.6, SOFT), { w: 1, a: res * 0.5, glow: 0 });
      for (let j = 0; j < 5; j++) { const u = ((t - L(55).start) * 0.32 + j / 5 + k * 0.13) % 1; const q = qbez(P, M, Q, u); glowDot(g, q[0], q[1], 2, res * Math.sin(Math.PI * u)); }
    }
  }
  // bids and asks converge
  const conv = ease(t, L(56).start - 0.2, Math.max(2.4, L(56).end - L(56).start), SWIFT);
  if (conv > 0) {
    for (const p of CONS) {
      const u = clamp(conv * 1.3 - p.d * 0.3);
      const yy = lerp(p.y0, y + Math.sin(p.x * 0.01 + t) * 6, SOFT(u)), xx = lerp(p.x, lerp(p.x, 960, shrink), 1);
      g.globalAlpha = a * (0.25 + 0.6 * u) * (1 - u * 0.6); g.fillStyle = u > 0.9 ? C.goldHi : (p.buy ? C.up : C.down);
      g.beginPath(); g.arc(xx, yy, 1.8, 0, 6.2832); g.fill();
    }
    g.globalAlpha = 1;
    text(g, 'CONSENSUS', 960, y - 70, { font: 'latin', size: 24, color: C.goldHi, a: a * ease(t, L(56).start + 1.8, 1.2) * (1 - shrink), track: 0.6 });
  }
  const line = []; for (let i = 0; i <= 120; i++) { const u = i / 120; line.push([lerp(xa, xb, u), y + Math.sin(u * 30 + t * 1.5) * 6 * (1 - conv) * (1 - shrink)]); }
  goldStroke(g, line, 1, { w: lerp(1.2, 2.2, conv), a, glow: 0.4 + conv * 0.8, color: conv > 0.5 ? C.goldHi : C.gold });
  if (shrink > 0.7) glowDot(g, 960, y, 4, a * seg(shrink, 0.7, 1));
}

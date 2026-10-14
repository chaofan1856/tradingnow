'use strict';
/* 《重新理解价格与价值》 — scene choreography. Pure functions of t; match-cut transitions. */

const SEA = { top: '#122320', deep: '#05090A', line: '#CDB27A', ice: '#E9EEE8', iceDim: '#9FB4B6', iceLine: '#C7D8D6' };

function spotAt(t) {
  const K = [
    [0, 0.25, 1], [WIN.open[1] - 1.0, 0.3, 1], [WIN.open[1] + 0.6, 1, 1], [WIN.title[1], 0.9, 1], [WIN.ch1[1], 0.6, 1],
    [WIN.barter[0] + 1.0, 1, 1], [WIN.past[1], 0.95, 1], [WIN.ch2[0] + 1.0, 0.6, 1], [WIN.book[0] + 1.0, 0.9, 1],
    [WIN.mood[1], 0.9, 1], [WIN.ch3[0] + 1.0, 0.55, 1], [WIN.ocean[0] + 1.6, 0.75, 1.15], [WIN.ocean[1], 0.75, 1.15],
    [WIN.ch4[0] + 1.0, 0.55, 1], [WIN.value[0] + 1.4, 0.7, 1.15], [WIN.summary[1] - 1.5, 0.75, 1.15], [WIN.finale[0] + 1.2, 0.0, 0.8], [1e9, 0, 0.8],
  ];
  let i = 0; while (i + 1 < K.length && t >= K[i + 1][0]) i++;
  const a = K[i], b = K[Math.min(i + 1, K.length - 1)], u = b[0] > a[0] ? SOFT(seg(t, a[0], b[0])) : 0;
  return { spot: lerp(a[1], b[1], u), width: lerp(a[2], b[2], u) };
}
const inWin = (t, id, pre = 0.6, post = 0.6) => t > WIN[id][0] - pre && t < WIN[id][1] + post;

function drawScenes(g, t) {
  drawBackground(g, t, spotAt(t));
  if (inWin(t, 'open', 0, 0.8)) sceneOpen(g, t);
  if (inWin(t, 'title', 0.2, 0.2)) sceneTitle(g, t);
  for (const id of ['ch1', 'ch2', 'ch3', 'ch4']) if (inWin(t, id, 0.2, 0.3)) sceneChapter(g, t, id);
  if (inWin(t, 'barter', 0.3, 0.6)) sceneBarter(g, t);
  if (inWin(t, 'print', 0.3, 0.5)) scenePrint(g, t);
  if (inWin(t, 'past', 0.4, 0.3)) scenePast(g, t);
  if (inWin(t, 'book', 0.3, 0.5)) sceneBook(g, t);
  if (inWin(t, 'mood', 0.4, 0.3)) sceneMood(g, t);
  if (inWin(t, 'ocean', 0.3, 0.3)) sceneOcean(g, t);
  if (inWin(t, 'value', 0.3, 0.6)) sceneValue(g, t);
  if (inWin(t, 'trend', 0.5, 0.6)) sceneTrend(g, t);
  if (inWin(t, 'summary', 0.5, 0.3)) sceneSummary(g, t);
  resetCam(g);
}

/* ---------- shared bits ---------- */
function sceneTitle(g, t) {
  const [a, b] = WIN.title, al = life(t, a - 0.1, b + 0.1, 1.2, 1.0);
  const r = ease(t, a + 1.6, 1.6) * al;
  goldStroke(g, [[960 - 260 * r, 604], [960 + 260 * r, 604]], 1, { w: 1, a: 0.7 * r, glow: 0.3 });
  glowDot(g, 960, 604, 2, r);
}
function sceneChapter(g, t, id) {
  const [a, b] = WIN[id], r = ease(t, a + 0.2, 1.4) * (1 - ease(t, b - 0.9, 0.8, SOFT)), y = 672;
  goldStroke(g, [[960 - 260 * r, y], [960 + 260 * r, y]], 1, { w: 1.1, a: r, glow: 0.4 });
  g.save(); g.translate(960, y); g.rotate(Math.PI / 4); g.globalAlpha = r; g.strokeStyle = C.goldHi; g.lineWidth = 1.2; g.strokeRect(-5, -5, 10, 10); g.restore();
}
const price2 = v => v.toFixed(2);
const NZ = noise1(31);

/* =====================================================================
   OPEN — a price that will not sit still
   ===================================================================== */
const TAPE = (() => { const R = rng(9); return Array.from({ length: 60 }, (_, i) => ({ s: 7 + i * 3 + Math.floor(R() * 3), p: 32.3 + R() * 0.4, v: 100 * (1 + Math.floor(R() * 40)) })); })();
function openPrice(t) {
  const k = Math.floor(Math.min(t, LN(1).end - 0.4) / 0.14);
  return 32.47 + Math.round(NZ(k * 0.37) * 9) / 100;
}
function sceneOpen(g, t) {
  const [A, B] = WIN.open;
  const freeze = ease(t, LN(1).end - 0.4, 0.5);
  const lift = ease(t, B - 1.0, 1.6, SWIFT);
  const a = ease(t, 0.2, 1.2, SOFT) * (1 - lift);
  const v = freeze > 0 ? 32.50 : openPrice(t), k = Math.floor(t / 0.14), flash = freeze > 0 ? 0 : 1 - ((t / 0.14) % 1);
  text(g, price2(v), 960, 470 - lift * 120, { font: 'latin', size: 210, weight: 500, color: C.goldHi, a: a * (1 - flash * 0.18), track: 0.02 });
  const up = NZ(k * 0.37) >= NZ((k - 1) * 0.37);
  if (freeze <= 0) text(g, up ? '▲' : '▼', 1210, 410, { size: 30, color: up ? C.up : C.down, a: a * 0.8 });
  // the tape of prints scrolling past
  const sc = (t * 26) % 30;
  for (let i = 0; i < 18; i++) {
    const r = TAPE[(Math.floor(t * 26 / 30) + i) % TAPE.length], y = 760 - i * 30 + sc;
    const aa = a * 0.32 * Math.min(1, (760 - y) / 60 + 0.2) * Math.min(1, (y - 270) / 80);
    if (aa <= 0) continue;
    text(g, `10:31:${String(r.s % 60).padStart(2, '0')}`, 1460, y, { font: 'latin', size: 20, color: C.ivory, a: aa, align: 'left', track: 0.04 });
    text(g, price2(r.p), 1600, y, { font: 'latin', size: 20, color: C.goldHi, a: aa, align: 'left' });
    text(g, String(r.v), 1700, y, { font: 'latin', size: 20, color: C.ivory, a: aa * 0.7, align: 'left' });
  }
  // a jittering sparkline to the left
  const pts = []; for (let i = 0; i <= 80; i++) { const x = 220 + i * 5; pts.push([x, 560 + NZ(i * 0.25 + Math.floor(t * 7) * 0.05) * 40]); }
  goldStroke(g, pts, ease(t, 0.6, 2, SOFT), { w: 1.2, a: a * 0.4, glow: 0 });
}

/* =====================================================================
   BARTER — a sheep, three axes, a balance → an exchange ratio
   ===================================================================== */
function sheep(g, x, y, s, a) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.scale(s, s); g.globalAlpha = a; g.lineWidth = 1.6; g.strokeStyle = C.goldHi; g.fillStyle = 'rgba(30,24,16,.9)';
  g.beginPath(); for (let i = 0; i < 10; i++) { const an = Math.PI * (1 + i / 9), r = 16; g.arc(Math.cos(an) * 48, Math.sin(an) * 22 - 2, r, an - 1.2, an + 1.2); }
  g.closePath(); g.fill(); g.stroke();
  g.beginPath(); g.ellipse(-50, 6, 46, 24, 0, 0.2, Math.PI - 0.2); g.stroke();
  g.beginPath(); g.ellipse(62, -18, 14, 18, -0.4, 0, 6.2832); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(54, -32); g.lineTo(46, -40); g.stroke();
  for (const lx of [-34, -12, 16, 34]) { g.beginPath(); g.moveTo(lx, 20); g.lineTo(lx, 44); g.stroke(); }
  g.restore();
}
function axe(g, x, y, s, a, rot = 0) {
  if (a <= 0) return;
  g.save(); g.translate(x, y); g.rotate(rot); g.scale(s, s); g.globalAlpha = a; g.lineWidth = 1.6; g.strokeStyle = C.goldHi; g.fillStyle = 'rgba(30,24,16,.9)';
  g.beginPath(); g.moveTo(-40, 6); g.lineTo(40, -6); g.stroke();
  g.beginPath(); g.moveTo(22, -4); g.quadraticCurveTo(30, -30, 46, -32); g.lineTo(44, 18); g.quadraticCurveTo(30, 16, 24, 4); g.closePath(); g.fill(); g.stroke();
  g.restore();
}
function coinStack(g, x, y, n, a) {
  for (let i = 0; i < n; i++) { g.save(); g.globalAlpha = a; g.fillStyle = '#2A2014'; g.strokeStyle = C.goldHi; g.lineWidth = 1.3; g.beginPath(); g.ellipse(x, y - i * 9, 34, 10, 0, 0, 6.2832); g.fill(); g.stroke(); g.restore(); }
}
function certIcon(g, x, y, a) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(30,24,16,.9)'; g.strokeStyle = C.goldHi; g.lineWidth = 1.5;
  g.fillRect(x - 60, y - 42, 120, 84); g.strokeRect(x - 60, y - 42, 120, 84); g.lineWidth = 0.8; g.strokeRect(x - 52, y - 34, 104, 68); g.restore();
  text(g, '1 股', x, y + 2, { size: 30, weight: 600, color: C.goldHi, a, track: 0.1 });
}
const BAL = { cx: 960, py: 560, half: 330 };
function sceneBarter(g, t) {
  const [A, B] = WIN.barter, L = i => LN(i);
  const a0 = ease(t, A + 0.1, 1.2, SOFT), exit = ease(t, B - 1.0, 1.3, SWIFT);
  const lands = [A + 1.2, A + 1.9, A + 2.6].map(x => Math.min(x, L(2).start + 1.6));
  const nAx = lands.filter(x => t > x).length;
  // the beam: sheep side heavy until the third axe lands, then a damped settle to level
  const settle = t - lands[2];
  let ang = t < lands[2] ? lerp(-0.16, -0.06, nAx / 3) : -0.06 * Math.exp(-settle * 2.2) * Math.cos(settle * 7);
  const fade = a0 * (1 - exit);
  const lx = BAL.cx - Math.cos(ang) * BAL.half, ly = BAL.py - Math.sin(ang) * BAL.half, rx = BAL.cx + Math.cos(ang) * BAL.half, ry = BAL.py + Math.sin(ang) * BAL.half;
  goldStroke(g, [[BAL.cx, BAL.py], [BAL.cx, 772]], ease(t, A, 1.0), { w: 2, a: fade });
  goldStroke(g, [[BAL.cx - 60, 772], [BAL.cx + 60, 772]], 1, { w: 2, a: fade * 0.8, glow: 0 });
  goldStroke(g, [[lx, ly], [rx, ry]], ease(t, A + 0.2, 1.2), { w: 2.4, a: fade, glow: 0.4 });
  glowDot(g, BAL.cx, BAL.py, 3, fade);
  const pan = (x, y) => { goldStroke(g, [[x, y], [x - 80, y + 110]], 1, { w: 0.9, a: fade * 0.7, glow: 0 }); goldStroke(g, [[x, y], [x + 80, y + 110]], 1, { w: 0.9, a: fade * 0.7, glow: 0 });
    goldStroke(g, arcPts(x, y + 98, 96, 0.25, Math.PI - 0.25, 24), 1, { w: 1.6, a: fade, glow: 0.2 }); return [x, y + 110]; };
  const P1 = pan(lx, ly), P2 = pan(rx, ry);
  // contents: sheep & axes → share & coins
  const morph = ease(t, L(3).start + 0.6, 1.4, SWIFT);
  sheep(g, P1[0], P1[1] - 36, 1, fade * (1 - morph) * ease(t, A + 0.5, 0.8));
  certIcon(g, P1[0], P1[1] - 40, fade * morph);
  for (let i = 0; i < 3; i++) {
    if (t < lands[i] - 0.5) continue;
    const drop = ease(t, lands[i] - 0.5, 0.5, inCubic);
    axe(g, P2[0] + (i - 1) * 20, lerp(P2[1] - 300, P2[1] - 18 - i * 16, drop), 0.9, fade * (1 - morph) * drop, -0.1 + i * 0.08);
  }
  coinStack(g, P2[0], P2[1] - 10, 5, fade * morph);
  text(g, '一只羊', P1[0], P1[1] + 46, { size: 24, color: C.ivory, a: fade * (1 - morph) * ease(t, A + 1.0, 1), track: 0.2 });
  text(g, '三把斧头', P2[0], P2[1] + 46, { size: 24, color: C.ivory, a: fade * (1 - morph) * ease(t, lands[2], 1), track: 0.2 });
  text(g, '股票', P1[0], P1[1] + 46, { size: 24, color: C.ivory, a: fade * morph, track: 0.2 });
  text(g, '现金', P2[0], P2[1] + 46, { size: 24, color: C.ivory, a: fade * morph, track: 0.2 });
  // the ratio, which becomes the next scene's price
  const ra = ease(t, lands[2] + 0.4, 1.0) * a0;
  const ry_ = lerp(330, 400, exit), size = lerp(110, 210, exit);
  text(g, '1 : 3', 960, ry_, { font: 'latin', size, weight: 500, color: C.goldHi, a: ra * (1 - morph), track: 0.06 });
  text(g, price2(32.50), 960, ry_, { font: 'latin', size, weight: 500, color: C.goldHi, a: ra * morph, track: 0.02 });
  text(g, '1 股 ＝', 960 - 250 - exit * 100, ry_ + 6, { size: 34, color: C.ivory, a: ra * morph * (1 - exit), align: 'right', track: 0.1 });
  text(g, '元', 960 + 250 + exit * 100, ry_ + 6, { size: 34, color: C.ivory, a: ra * morph * (1 - exit), align: 'left' });
  text(g, 'EXCHANGE RATIO · 交换比例', 960, ry_ + 92, { font: 'latin', size: 18, color: C.gold, a: ra * (1 - exit) * 0.8, track: 0.4 });
}

/* =====================================================================
   PRINT — a heartbeat that flattens into a ledger line; buyer meets seller
   ===================================================================== */
function trader(g, x, y, a, label, sub, col) {
  if (a <= 0) return;
  g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = 1.6; g.fillStyle = 'rgba(20,16,12,.9)';
  g.beginPath(); g.arc(x, y - 26, 13, 0, 6.2832); g.fill(); g.stroke();
  g.beginPath(); g.moveTo(x - 24, y + 22); g.quadraticCurveTo(x, y - 18, x + 24, y + 22); g.stroke(); g.restore();
  text(g, label, x, y + 52, { size: 24, color: C.ivory, a, track: 0.2 });
  text(g, sub, x, y + 86, { font: 'latin', size: 22, color: col, a: a * 0.9, track: 0.04 });
}
function scenePrint(g, t) {
  const [A, B] = WIN.print, L = i => LN(i);
  const a0 = ease(t, A - 0.2, 0.6, SOFT);
  const shrink = ease(t, L(6).start + 0.4, 1.4, SWIFT), exit = ease(t, B - 1.0, 1.2, SWIFT);
  const ny = lerp(400, 610, shrink), nsize = lerp(210, 34, shrink), nx = lerp(960, 1040, shrink);
  // big number (continues from the barter ratio)
  text(g, price2(32.50), nx, ny, { font: 'latin', size: nsize, weight: 500, color: C.goldHi, a: a0 * (1 - SOFT(shrink)), track: 0.02 });
  // heartbeat → flat ledger rule
  const hb = life(t, L(4).start - 0.2, L(5).start + 0.6, 0.6, 0.8), flat = ease(t, L(4).start + 1.6, 1.2, SOFT);
  if (hb > 0) {
    const pts = []; for (let i = 0; i <= 240; i++) { const x = 200 + i * 6.5, ph = (x - 200 - (t - L(4).start) * 520); const beat = ((ph % 420) + 420) % 420;
      const spike = beat < 40 ? Math.sin(beat / 40 * Math.PI) * -110 : beat < 60 ? Math.sin((beat - 40) / 20 * Math.PI) * 40 : 0; pts.push([x, 560 + spike * (1 - flat)]); }
    goldStroke(g, pts, ease(t, L(4).start - 0.1, 1.0, SOFT), { w: 1.6, a: hb * 0.85, glow: 0.4, color: mixHex('#C0574C', C.gold, flat) });
  }
  // buyer and seller walk in, meet, the trade prints
  const tr = life(t, L(5).start - 0.3, L(7).start + 0.8, 0.8, 0.8);
  const meet = ease(t, L(5).start + 0.2, Math.max(1.6, L(6).start - L(5).start), SWIFT);
  trader(g, lerp(360, 820, meet), 700, tr, '买家', '出价 32.50', C.up);
  trader(g, lerp(1560, 1100, meet), 700, tr, '卖家', '要价 32.50', C.down);
  const hit = Math.max(0, 1 - Math.abs(t - (L(6).start + 0.1)) / 0.45);
  if (hit > 0) glowDot(g, 960, 690, 6 + hit * 6, hit, C.goldHi);
  // ledger rows
  const rows = ['10:31:05   32.48   300', '10:31:06   32.49   1,200', '10:31:07   32.50   200'];
  const la = ease(t, L(6).start + 0.3, 0.9) * (1 - exit);
  rows.forEach((r, i) => {
    const last = i === 2, y = 530 + i * 42 - (last ? 0 : (1 - la) * 10);
    text(g, r, 820, y, { font: 'latin', size: 30, color: last ? C.goldHi : C.ivory, a: la * (last ? 1 : 0.35), align: 'left', track: 0.04 });
  });
  text(g, '成交', 1180, 614, { size: 26, weight: 600, color: C.goldHi, a: la, align: 'left', track: 0.2 });
  if (la > 0) { g.save(); g.globalAlpha = la * 0.8; g.strokeStyle = C.gold; g.lineWidth = 1; g.strokeRect(800, 588, 460, 46); g.restore(); }
  text(g, 'TRADE PRINT · 成交记录', 960, 470, { font: 'latin', size: 18, color: C.gold, a: la * 0.8, track: 0.4 });
}

/* =====================================================================
   PAST — the record belongs to the past; high price ≠ expensive
   ===================================================================== */
function scenePast(g, t) {
  const [A, B] = WIN.past, L = i => LN(i), y = 560;
  const ax = ease(t, A - 0.2, 1.4, SWIFT) * (1 - ease(t, L(8).start - 0.3, 1.0, SOFT));
  if (ax > 0) {
    goldStroke(g, [[220, y], [960, y]], ax, { w: 2, a: ax, glow: 0.4 });
    g.save(); g.setLineDash([6, 10]); g.lineDashOffset = -t * 20; goldStroke(g, [[960, y], [1700, y]], ax, { w: 1.2, a: ax * 0.6, glow: 0 }); g.restore();
    glowDot(g, 960, y, 4, ax);
    text(g, '现在', 960, y + 40, { size: 22, color: C.goldHi, a: ax, track: 0.2 });
    text(g, '过去 · 已发生的成交', 520, y + 40, { size: 22, color: C.ivory, a: ax * 0.8, track: 0.2 });
    text(g, '未来 · 尚未成交', 1400, y + 40, { size: 22, color: C.ivory, a: ax * 0.6, track: 0.2 });
    for (let i = 0; i < 7; i++) { const x = 900 - i * 100 - (t - A) * 8; glowDot(g, x, y, 2.2, ax * (1 - i * 0.12)); text(g, price2(32.5 - (i % 3) * 0.01 - Math.floor(i / 2) * 0.02), x, y - 30, { font: 'latin', size: 18, color: C.gold, a: ax * (0.8 - i * 0.09) }); }
    for (let i = 0; i < 6; i++) { const x = 1060 + i * 110, yy = y - 40 + Math.sin(t * 0.8 + i) * 50; text(g, '?', x, yy, { font: 'latin', size: 40 + i * 4, color: C.ivory, a: ax * 0.22 * (1 - i * 0.1), italic: true }); }
  }
  // high ≠ expensive, low ≠ cheap
  const tg = ease(t, L(8).start - 0.1, 1.2) * (1 - ease(t, B - 0.6, 0.9, SOFT));
  if (tg > 0) {
    const floor = 760, col = (x, priceH, valueH, tag, verdict, vcol, d) => {
      const grow = ease(t, L(8).start + 0.6 + d, 1.4, SWIFT);
      g.save(); g.globalAlpha = tg * 0.9;
      const gr = g.createLinearGradient(0, floor - valueH, 0, floor); gr.addColorStop(0, 'rgba(201,166,107,.55)'); gr.addColorStop(1, 'rgba(201,166,107,.08)');
      g.fillStyle = gr; g.fillRect(x - 60, floor - valueH * grow, 120, valueH * grow); g.strokeStyle = C.gold; g.lineWidth = 1; g.strokeRect(x - 60, floor - valueH * grow, 120, valueH * grow); g.restore();
      text(g, '价值', x, floor - valueH * grow + 24, { size: 20, color: C.goldHi, a: tg * grow, track: 0.2 });
      g.save(); g.setLineDash([6, 6]); goldStroke(g, [[x - 130, floor - priceH], [x + 130, floor - priceH]], tg, { w: 1.4, a: tg, glow: 0, color: C.ivory }); g.restore();
      g.save(); g.globalAlpha = tg; g.fillStyle = '#1B150F'; g.strokeStyle = C.ivory; g.lineWidth = 1.2; g.beginPath(); g.roundRect(x + 140, floor - priceH - 24, 150, 48, 6); g.fill(); g.stroke(); g.restore();
      text(g, tag, x + 215, floor - priceH, { font: 'latin', size: 28, weight: 500, color: C.ivory, a: tg });
      text(g, '价格', x - 150, floor - priceH, { size: 20, color: C.ivory, a: tg * 0.8, align: 'right', track: 0.2 });
      text(g, verdict, x, floor + 40, { size: 28, weight: 600, color: vcol, a: tg * ease(t, L(8).start + 1.8 + d, 1), track: 0.2 });
    };
    col(560, 280, 440, '¥1,800', '高价 · 却便宜', C.goldHi, 0);
    col(1260, 280, 110, '¥3.20', '低价 · 却昂贵', C.up, 0.5);
  }
}

/* =====================================================================
   BOOK — the order book: countless expectations; a match makes a print
   ===================================================================== */
const BOOK = (() => {
  const R = rng(250);
  const asks = [32.55, 32.54, 32.53, 32.52, 32.51].map((p, i) => ({ p, d: 0.35 + R() * 0.65 }));
  const bids = [32.49, 32.48, 32.47, 32.46, 32.45].map((p, i) => ({ p, d: 0.35 + R() * 0.65 }));
  const crowd = Array.from({ length: 110 }, (_, i) => { const buy = i % 2 === 0; return { buy, x: buy ? 230 + R() * 420 : 1270 + R() * 420, y: 300 + R() * 440, ph: R() * 6.28, row: Math.floor(R() * 5), d: R() }; });
  return { asks, bids, crowd };
})();
function sceneBook(g, t) {
  const [A, B] = WIN.book, L = i => LN(i);
  const a0 = ease(t, A - 0.1, 1.2, SOFT), exit = ease(t, B - 1.0, 1.2, SWIFT), al = a0 * (1 - exit);
  const rowY = (k, ask) => ask ? 330 + k * 40 : 590 + k * 40;           // asks top (k=0 highest), bids bottom
  const cx = 960;
  const fill = ease(t, L(10).start - 0.2, 2.2, SOFT);
  const match = ease(t, L(12).start + 0.3, 1.0, SWIFT);
  // spread band
  const spread = life(t, L(11).start, B, 0.8, 0.8) * al;
  g.save(); g.globalAlpha = spread * 0.25; g.fillStyle = C.gold; g.fillRect(cx - 300, 532 - 18 * (1 - match), 600, 36 * (1 - match) + 2); g.restore();
  text(g, '价差', cx + 330, 532, { size: 20, color: C.goldHi, a: spread * (1 - match), align: 'left', track: 0.3 });
  BOOK.asks.forEach((r, k) => {
    const y = rowY(k, true), w = 260 * r.d * fill;
    g.save(); g.globalAlpha = al * 0.55; g.fillStyle = C.down; g.fillRect(cx + 70, y - 13, w * (k === 4 ? 1 - match * 0.6 : 1), 26); g.restore();
    text(g, price2(r.p), cx, y, { font: 'latin', size: 26, color: C.ivory, a: al * ease(t, A + 0.3 + k * 0.05, 0.8) });
    text(g, '卖' + (5 - k), cx - 120, y, { size: 18, color: C.down, a: al * 0.8, align: 'right' });
  });
  BOOK.bids.forEach((r, k) => {
    const y = rowY(k, false), w = 260 * r.d * fill, rise = k === 0 ? match : 0;
    g.save(); g.globalAlpha = al * 0.55; g.fillStyle = C.up; g.fillRect(cx - 70 - w, y - 13 - rise * 60, w, 26); g.restore();
    text(g, price2(k === 0 ? lerp(r.p, 32.50, rise) : r.p), cx, y - rise * 60, { font: 'latin', size: 26, color: rise > 0.5 ? C.goldHi : C.ivory, a: al * ease(t, A + 0.6 + k * 0.05, 0.8) });
    text(g, '买' + (k + 1), cx + 120, y, { size: 18, color: C.up, a: al * 0.8, align: 'left' });
  });
  // match flash + print
  const hit = Math.max(0, 1 - Math.abs(t - (L(12).start + 1.3)) / 0.45);
  if (hit > 0) glowDot(g, cx, 532, 8 + hit * 8, hit * al, C.goldHi);
  const pr = ease(t, L(12).start + 1.3, 0.8) * al;
  text(g, '32.50 · 成交', cx, 532, { size: 32, weight: 600, color: C.goldHi, a: pr, track: 0.1 });
  // the crowd: countless buyers & sellers sending orders in
  const cr = ease(t, L(9).start - 0.2, 1.6, SOFT) * al;
  for (const c of BOOK.crowd) {
    const jx = Math.sin(t * 0.9 + c.ph) * 8, jy = Math.cos(t * 0.7 + c.ph) * 8;
    glowDot(g, c.x + jx, c.y + jy, 1.6, cr * 0.7, c.buy ? '#E08A7E' : '#8FC0A6');
    const u = ((t - L(10).start) * 0.35 + c.d) % 1;
    if (t > L(10).start - 0.2 && fill > 0.05) {
      const tx = c.buy ? cx - 80 - 40 : cx + 80 + 40, ty = c.buy ? rowY(c.row, false) : rowY(c.row, true);
      const p = qbez([c.x + jx, c.y + jy], [(c.x + tx) / 2, Math.min(c.y, ty) - 80], [tx, ty], SOFT(u));
      g.globalAlpha = cr * Math.sin(Math.PI * u) * 0.6; g.fillStyle = c.buy ? '#E08A7E' : '#8FC0A6'; g.fillRect(p[0] - 1.5, p[1] - 1.5, 3, 3); g.globalAlpha = 1;
    }
  }
  text(g, '买方 · 期望更低', 440, 800, { size: 24, color: '#E08A7E', a: cr * ease(t, L(11).start, 1), track: 0.16 });
  text(g, '卖方 · 期望更高', 1480, 800, { size: 24, color: '#8FC0A6', a: cr * ease(t, L(11).start + 0.6, 1), track: 0.16 });
  const arr = life(t, L(11).start + 0.2, L(12).start + 0.6, 0.6, 0.6) * al;
  goldStroke(g, [[cx - 330, 600], [cx - 330, 760], [cx - 340, 744], [cx - 330, 760], [cx - 320, 744]], arr, { w: 1.4, a: arr, glow: 0, color: '#E08A7E' });
  goldStroke(g, [[cx + 330, 460], [cx + 330, 300], [cx + 320, 316], [cx + 330, 300], [cx + 340, 316]], arr, { w: 1.4, a: arr, glow: 0, color: '#8FC0A6' });
  text(g, 'ORDER BOOK · 买卖盘', cx, 270, { font: 'latin', size: 18, color: C.gold, a: al * 0.8, track: 0.4 });
}

/* =====================================================================
   MOOD — money moves price, mood moves supply & demand
   ===================================================================== */
const MOODK = makeCandles(77, 26, { drift: 0, vol: 1 });
function sceneMood(g, t) {
  const [A, B] = WIN.mood, L = i => LN(i);
  const a0 = ease(t, A - 0.2, 1.2, SOFT), exit = ease(t, B - 1.0, 1.0, SWIFT), al = a0 * (1 - exit);
  const slide = ease(t, L(16).start - 0.3, 1.6, SWIFT);
  const ox = lerp(560, 400, slide), oy = 760, Wd = 560, Hd = 430;   // chart origin (quantity →, price ↑)
  goldStroke(g, [[ox, oy - Hd], [ox, oy], [ox + Wd, oy]], ease(t, A, 1.2, SOFT), { w: 1.4, a: al * 0.8, glow: 0 });
  text(g, '价格', ox - 16, oy - Hd, { size: 20, color: C.ivory, a: al * 0.7, align: 'right' });
  text(g, '数量', ox + Wd, oy + 30, { size: 20, color: C.ivory, a: al * 0.7, align: 'right' });
  const opt = ease(t, L(14).start + 0.2, 1.8, SWIFT) * (1 - ease(t, L(15).start + 0.1, 1.8, SWIFT));
  const fear = ease(t, L(15).start + 0.1, 1.8, SWIFT) * (1 - ease(t, L(16).start + 0.6, 1.6, SWIFT));
  const dShift = opt * 130 - fear * 110, sShift = fear * 90;
  const D = u => [ox + 60 + u * 440 + dShift, oy - Hd + 40 + u * 340], S = u => [ox + 60 + u * 440 + sShift, oy - 40 - u * 340];
  const curve = f => { const p = []; for (let i = 0; i <= 30; i++) p.push(f(i / 30)); return p; };
  goldStroke(g, curve(D), ease(t, A + 0.4, 1.4, SOFT), { w: 2, a: al, glow: 0.4, color: '#E08A7E' });
  goldStroke(g, curve(S), ease(t, A + 0.8, 1.4, SOFT), { w: 2, a: al, glow: 0.4, color: '#8FC0A6' });
  text(g, '需求', D(1)[0] + 30, D(1)[1], { size: 22, color: '#E08A7E', a: al, align: 'left' });
  text(g, '供给', S(1)[0] + 30, S(1)[1], { size: 22, color: '#8FC0A6', a: al, align: 'left' });
  // intersection (solve for crossing: D(u) and S(v) lines)
  const d0 = D(0), d1 = D(1), s0 = S(0), s1 = S(1);
  const den = (d1[0] - d0[0]) * (s1[1] - s0[1]) - (d1[1] - d0[1]) * (s1[0] - s0[0]);
  const uu = ((s0[0] - d0[0]) * (s1[1] - s0[1]) - (s0[1] - d0[1]) * (s1[0] - s0[0])) / den;
  const X = [d0[0] + uu * (d1[0] - d0[0]), d0[1] + uu * (d1[1] - d0[1])];
  const ia = ease(t, A + 1.6, 1) * al;
  g.save(); g.setLineDash([4, 6]); goldStroke(g, [[ox, X[1]], [X[0], X[1]]], ia, { w: 1, a: ia * 0.8, glow: 0, color: C.goldHi }); g.restore();
  glowDot(g, X[0], X[1], 4, ia);
  const pv = 32.5 + (oy - Hd / 2 - X[1] + 0) * 0.02 - 0.0;
  text(g, price2(32.5 + (590 - X[1]) * 0.02), ox - 16, X[1], { font: 'latin', size: 24, weight: 500, color: C.goldHi, a: ia, align: 'right' });
  text(g, '乐观 · 加价抢购', ox + 330, oy - Hd - 10, { size: 26, weight: 600, color: '#E08A7E', a: al * opt, track: 0.12 });
  text(g, '恐惧 · 踩踏割肉', ox + 330, oy - Hd - 10, { size: 26, weight: 600, color: '#8FC0A6', a: al * fear, track: 0.12 });
  // money pushes: particles flowing into the demand side while optimistic
  if (opt > 0.05) for (let i = 0; i < 26; i++) { const u = ((t * 0.6 + i / 26) % 1); const p = [lerp(ox - 120, X[0], u), X[1] + 40 * Math.sin(i * 2.3) * (1 - u)]; glowDot(g, p[0], p[1], 1.6, al * opt * Math.sin(Math.PI * u), '#F0B5A8'); }
  // the K-line: a record of the tug-of-war, not of value
  const kA = ease(t, L(14).start - 0.2, 1.0) * al;
  const n = Math.floor(ease(t, L(14).start, (L(16).end - L(14).start) * 0.9, SOFT) * MOODK.length);
  const kx0 = lerp(1180, 1050, slide), yOf = p => 600 - (p - 100) * 24;
  // a deterministic up-then-down path driven by the same moods
  let p = 100; const ks = [];
  for (let i = 0; i < MOODK.length; i++) { const dir = i < 10 ? 0.9 : i < 19 ? -1.1 : (i % 2 ? 0.6 : -0.6); const o = p, c = p + dir * (1 + (MOODK[i].c - MOODK[i].o) * 0.25); ks.push({ o, c, hi: Math.max(o, c) + 0.8, lo: Math.min(o, c) - 0.8 }); p = c; }
  for (let i = 0; i < n; i++) drawCandle(g, kx0 + i * 25, yOf, ks[i], 14, kA);
  const ba = life(t, L(16).start + 0.4, B, 0.9, 0.6) * al;
  text(g, '多', kx0 + 10, 300, { size: 46, weight: 700, color: C.up, a: ba * 0.85 });
  text(g, '空', kx0 + 600, 300, { size: 46, weight: 700, color: C.down, a: ba * 0.85 });
  goldStroke(g, [[kx0 + 50, 300], [kx0 + 290, 300]], ba, { w: 1.6, a: ba, glow: 0, color: C.up });
  goldStroke(g, [[kx0 + 560, 300], [kx0 + 320, 300]], ba, { w: 1.6, a: ba, glow: 0, color: C.down });
  glowDot(g, kx0 + 305 + Math.sin(t * 2.2) * 20, 300, 4, ba);
}

/* =====================================================================
   OCEAN — the iceberg: price above, value below; bubble, panic, reversion
   ===================================================================== */
const BERG = [[0, -132], [30, -96], [58, -46], [84, 0], [190, 40], [300, 120], [352, 232], [300, 342], [160, 412], [-40, 432], [-224, 382], [-332, 272], [-352, 150], [-262, 60], [-112, 12], [-72, -40], [-34, -100]];
const FACETS = [[[0, -132], [-30, 10], [-180, 200], [-40, 432]], [[84, 0], [120, 180], [160, 412]], [[-112, 12], [40, 160], [300, 342]]];
function waveY(x, t, amp, crest = null) {
  let y = Math.sin(x * 0.006 + t * 0.9) * 6 + Math.sin(x * 0.013 - t * 1.3) * 3.5 + Math.sin(x * 0.021 + t * 1.7) * 2;
  y *= amp;
  if (crest) { const d = (x - crest.x) / crest.w; y -= crest.h * Math.exp(-d * d) * (d < 0 ? 1 : 0.8); }
  return y;
}
/* state of the sea for a given time: waterline y, wave amplitude, berg offset/inflation, crest */
function oceanState(t) {
  const L = i => LN(i), W_ = WIN.ocean;
  const st = { wy: 430, amp: 1, off: 0, infl: 1, crest: null, cx: 960 };
  if (t < W_[0] || t > W_[1] + 0.3) return st;
  const bub = ease(t, L(21).start + 0.2, 2.2, SWIFT) * (1 - ease(t, L(23).start - 0.6, 1.8, SWIFT));
  const pan = ease(t, L(23).start - 0.2, 1.8, SWIFT) * (1 - ease(t, L(25).start - 0.4, 1.0, SWIFT));
  st.amp = 1 + bub * 2.2 + pan * 3;
  st.off = -150 * bub + 120 * pan;
  st.infl = 1 + 0.75 * bub;
  // reversion: a damped bob back to equilibrium
  const r0 = L(25).start - 0.4;
  if (t > r0) { const k = t - r0; st.off += 120 * Math.exp(-k * 0.9) * Math.cos(k * 2.4) * (1 - pan) * 0.6; }
  // the big wave that buries the tip
  const cw = seg(t, L(23).start + 0.2, L(24).start + 1.4);
  if (cw > 0 && cw < 1) st.crest = { x: lerp(2100, -300, SOFT(cw)), w: 380, h: 190 * Math.sin(Math.PI * cw) };
  return st;
}
function bergPoly(st, cx, scale = 1) {
  return BERG.map(([x, y]) => {
    const yy = st.wy + (y * scale + st.off);
    const above = clamp((st.wy - yy) / 40);
    const sx = 1 + (st.infl - 1) * above, sy = 1 + (st.infl - 1) * 0.6 * above;
    return [cx + x * scale * sx, st.wy + (yy - st.wy) * sy];
  });
}
function drawSea(g, t, st, a, { berg = true, cx = 960, scale = 1, labels = null, glowBody = 0 } = {}) {
  if (a <= 0) return bergPoly(st, cx, scale);
  const surf = []; for (let x = -20; x <= W + 20; x += 12) surf.push([x, st.wy + waveY(x, t, st.amp, st.crest)]);
  // water body
  g.save(); g.globalAlpha = a;
  g.beginPath(); g.moveTo(surf[0][0], surf[0][1]); for (const p of surf) g.lineTo(p[0], p[1]); g.lineTo(W + 20, H); g.lineTo(-20, H); g.closePath();
  const gr = g.createLinearGradient(0, st.wy, 0, H); gr.addColorStop(0, 'rgba(36,58,52,.8)'); gr.addColorStop(0.45, 'rgba(16,28,26,.88)'); gr.addColorStop(1, 'rgba(8,12,11,.94)');
  g.fillStyle = gr; g.fill();
  g.clip();
  // light shafts fanning down from the surface
  g.globalCompositeOperation = 'lighter';
  for (let k = 0; k < 9; k++) {
    const x0 = 120 + k * 220 + Math.sin(t * 0.25 + k * 1.7) * 60, w0 = 40 + (k % 3) * 30, len = 520 + (k % 4) * 90, lean = 140 + (k % 2) * 80;
    const sh = g.createLinearGradient(0, st.wy, 0, st.wy + len);
    const al = a * (0.05 + 0.03 * Math.sin(t * 0.6 + k * 2.1));
    sh.addColorStop(0, `rgba(210,230,215,${al})`); sh.addColorStop(1, 'rgba(210,230,215,0)');
    g.fillStyle = sh; g.beginPath(); g.moveTo(x0, st.wy); g.lineTo(x0 + w0, st.wy); g.lineTo(x0 + w0 * 2.6 + lean, st.wy + len); g.lineTo(x0 + lean, st.wy + len); g.closePath(); g.fill();
  }
  g.globalCompositeOperation = 'source-over';
  // bubbles rising
  for (let i = 0; i < 38; i++) {
    const r = rng(i + 77), bx = r() * W, sp = 30 + r() * 50, ph = r() * 400, y = st.wy + 40 + ((H - st.wy) - ((t * sp + ph) % (H - st.wy)));
    const x = bx + Math.sin(t * 1.5 + i) * 6, rad = 1.5 + r() * 3;
    g.globalAlpha = a * 0.35; g.strokeStyle = '#CFE0DC'; g.lineWidth = 0.8; g.beginPath(); g.arc(x, y, rad, 0, 6.2832); g.stroke();
  }
  g.globalAlpha = 1;
  g.restore();
  const poly = berg ? bergPoly(st, cx, scale) : null;
  if (poly) {
    // underwater body: translucent, clipped below the surface
    g.save(); g.beginPath(); g.moveTo(surf[0][0], surf[0][1]); for (const p of surf) g.lineTo(p[0], p[1]); g.lineTo(W + 20, H); g.lineTo(-20, H); g.closePath(); g.clip();
    g.globalAlpha = a; g.beginPath(); poly.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
    const bg = g.createLinearGradient(0, st.wy, 0, st.wy + 440 * scale); bg.addColorStop(0, 'rgba(160,200,200,.22)'); bg.addColorStop(1, 'rgba(90,130,135,.08)');
    g.fillStyle = bg; g.fill(); g.strokeStyle = 'rgba(199,216,214,.55)'; g.lineWidth = 1.3; g.stroke();
    if (glowBody > 0) { g.globalAlpha = a * glowBody; g.shadowColor = 'rgba(240,217,168,.9)'; g.shadowBlur = 24 * DPR; g.strokeStyle = C.goldHi; g.lineWidth = 2; g.stroke(); g.shadowBlur = 0; }
    g.globalAlpha = a * 0.25; g.strokeStyle = '#C7D8D6'; g.lineWidth = 0.8;
    for (const f of FACETS) { g.beginPath(); f.forEach(([x, y], i) => { const q = [cx + x * scale, st.wy + y * scale + st.off]; i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.stroke(); }
    g.restore();
    // above water: solid ice, lit from the spotlight
    g.save(); g.beginPath(); g.moveTo(surf[0][0], surf[0][1]); for (const p of surf) g.lineTo(p[0], p[1]); g.lineTo(W + 20, -20); g.lineTo(-20, -20); g.closePath(); g.clip();
    g.globalAlpha = a; g.beginPath(); poly.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
    const top = Math.min(...poly.map(p => p[1]));
    const ig = g.createLinearGradient(cx - 120, top, cx + 120, st.wy); ig.addColorStop(0, '#F4F2EA'); ig.addColorStop(0.55, '#C9D5D2'); ig.addColorStop(1, '#8EA3A6');
    g.fillStyle = ig; g.shadowColor = 'rgba(240,230,200,.35)'; g.shadowBlur = 30 * DPR; g.fill(); g.shadowBlur = 0;
    g.strokeStyle = C.goldHi; g.lineWidth = 1.4; g.stroke();
    g.restore();
  }
  // surface line + glints
  goldStroke(g, surf, 1, { w: 1.6, a: a * 0.9, glow: 0.5, color: SEA.line });
  for (let i = 0; i < 40; i++) { const x = ((i * 97 + t * 30 * (1 + (i % 3))) % (W + 200)) - 100; const y = st.wy + waveY(x, t, st.amp, st.crest) + 6 + (i % 5) * 9; g.globalAlpha = a * 0.25 * (0.5 + 0.5 * Math.sin(t * 2 + i)); g.fillStyle = C.goldHi; g.fillRect(x, y, 10 + (i % 4) * 6, 1); }
  // suspended specks underwater
  for (let i = 0; i < 70; i++) { const r = rng(i + 500); const x = r() * W, y = st.wy + 30 + r() * (H - st.wy), yy = y - ((t * 6 * (0.5 + r())) % 80); g.globalAlpha = a * 0.25 * r(); g.fillStyle = '#BFD3D2'; g.fillRect(x, yy, 1.4, 1.4); }
  g.globalAlpha = 1;
  return poly;
}
function sceneOcean(g, t) {
  const [A, B] = WIN.ocean, L = i => LN(i);
  const st = oceanState(t);
  const rise = ease(t, A - 0.2, 2.0, SWIFT);
  st.wy = lerp(1100, 430, rise);
  const a = ease(t, A - 0.2, 1.0, SOFT);
  const bodyGlow = life(t, L(24).start + 0.4, L(25).start + 0.6, 0.8, 0.8) * (0.6 + 0.4 * Math.sin(t * 4));
  const poly = drawSea(g, t, st, a, { glowBody: bodyGlow });
  const tipY = Math.min(...poly.map(p => p[1]));
  // labels: price (tip) and value (body)
  const pl = life(t, L(18).start - 0.1, L(21).start + 0.4, 0.8, 0.6);
  callout(g, 990, tipY + 40, 1210, Math.min(tipY + 10, 330), '市场价格 · PRICE', pl, { side: 'right', size: 26 });
  const vl = life(t, L(20).start - 0.1, L(21).end + 0.2, 0.8, 0.6);
  callout(g, 1240, st.wy + 220 + st.off, 1450, st.wy + 160, '内在价值 · VALUE', vl, { side: 'right', size: 26 });
  text(g, '约 90%', 1464, st.wy + 204, { size: 34, weight: 500, color: C.goldHi, a: vl * ease(t, L(20).start + 0.8, 1), align: 'left' });
  // fundamentals inside the body
  ['基本面', '盈利能力', '行业护城河'].forEach((s, k) => {
    const d = (L(21).end - L(21).start) * 0.18;
    const q = life(t, L(21).start + k * d, L(22).start + 0.4, 0.8, 0.6);
    text(g, s, 960 + (k - 1) * 190, st.wy + 230 + st.off + (k % 2) * 40, { size: 30, weight: 600, color: C.goldHi, a: q, track: 0.16 });
  });
  // bubble: inflated tip vs its true size
  const bub = life(t, L(22).start - 0.2, L(23).start - 0.2, 1.0, 0.8);
  if (bub > 0) {
    const real = bergPoly({ ...st, infl: 1 }, 960);
    g.save(); g.setLineDash([5, 7]); g.beginPath(); real.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath();
    g.save(); g.beginPath(); g.rect(0, 0, W, st.wy); g.clip(); g.globalAlpha = bub; g.strokeStyle = C.ivory; g.lineWidth = 1.2; g.beginPath(); real.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.stroke(); g.restore(); g.restore();
    text(g, '价格泡沫 · 高估', 1440, st.wy - 112, { size: 30, weight: 700, color: '#E08A7E', a: bub, align: 'left', track: 0.14 });
    text(g, '虚线 · 真实体量', 1440, st.wy - 66, { size: 20, color: C.ivory, a: bub * 0.7, align: 'left', track: 0.14 });
  }
  const pn = life(t, L(23).start + 0.6, L(25).start - 0.2, 1.0, 0.8);
  text(g, '恐慌低估', 1420, st.wy - 120, { size: 30, weight: 700, color: '#8FC0A6', a: pn, track: 0.2 });
  text(g, '完好无损', 960, st.wy + 330 + st.off, { size: 26, weight: 600, color: C.goldHi, a: life(t, L(24).start + 0.6, L(25).start, 0.8, 0.6), track: 0.3 });
  // reversion: weight arrow + damped price around value
  const rv = life(t, L(25).start + 0.2, B + 0.3, 1.0, 0.8);
  if (rv > 0) {
    g.save(); g.setLineDash([4, 8]); goldStroke(g, [[960, tipY + 10], [960, st.wy + 210 + st.off]], rv, { w: 1.2, a: rv * 0.8, glow: 0, color: C.goldHi }); g.restore();
    goldStroke(g, [[948, st.wy + 196 + st.off], [960, st.wy + 214 + st.off], [972, st.wy + 196 + st.off]], rv, { w: 1.4, a: rv, glow: 0 });
    const X0 = 1330, X1 = 1760, Y = 640;
    goldStroke(g, [[X0, Y], [X1, Y]], rv, { w: 1.2, a: rv * 0.8, glow: 0, color: C.gold });
    text(g, '价值', X1 + 14, Y, { size: 20, color: C.goldHi, a: rv, align: 'left' });
    const pts = []; for (let i = 0; i <= 120; i++) { const u = i / 120; pts.push([lerp(X0, X1, u), Y - 90 * Math.exp(-u * 3.2) * Math.sin(u * 22)]); }
    goldStroke(g, pts, ease(t, L(25).start + 0.4, 2.4, SOFT), { w: 1.8, a: rv, glow: 0.4, color: C.ivory });
    text(g, '价格', X0 - 14, Y - 40, { size: 20, color: C.ivory, a: rv, align: 'right' });
    text(g, 'MEAN REVERSION · 价值回归', (X0 + X1) / 2, Y + 70, { font: 'latin', size: 18, color: C.gold, a: rv * 0.8, track: 0.3 });
  }
}

/* =====================================================================
   VALUE — the value investor measures the berg and buys the panic
   ===================================================================== */
function sceneValue(g, t) {
  const [A, B] = WIN.value, L = i => LN(i);
  const st = { wy: 300, amp: 1.2, off: 0, infl: 1, crest: null };
  const pull = ease(t, A - 0.4, 2.0, SWIFT), a = ease(t, A - 0.4, 0.8, SOFT) * (1 - ease(t, B - 0.6, 1.0, SOFT) * 0);
  st.wy = lerp(430, 300, pull);
  const cx = lerp(960, 640, pull), sc = lerp(1, 1.15, pull);
  const pan = life(t, L(29).start - 0.2, L(30).end, 1.2, 1.4);
  st.amp = 1.2 + pan * 2.5;
  st.crest = (() => { const cw = seg(t, L(29).start, L(29).end + 0.6); return cw > 0 && cw < 1 ? { x: lerp(1600, -200, SOFT(cw)), w: 300, h: 120 * Math.sin(Math.PI * cw) } : null; })();
  drawSea(g, t, st, a, { cx, scale: sc, glowBody: life(t, L(30).start, L(31).start + 0.6, 0.8, 0.8) });
  // sonar sweep measuring the body
  const so = life(t, L(28).start, L(31).end, 1.0, 0.8) * a;
  if (so > 0) {
    const ox = cx, oy = st.wy + 200 * sc;
    for (let k = 0; k < 3; k++) { const r = ((t * 120 + k * 140) % 420); g.globalAlpha = so * 0.4 * (1 - r / 420); g.strokeStyle = C.goldHi; g.lineWidth = 1.2; g.beginPath(); g.ellipse(ox, oy, r, r * 0.62, 0, 0, 6.2832); g.stroke(); }
    g.globalAlpha = 1;
    text(g, '估算 · 内在价值', cx, oy, { size: 26, weight: 600, color: C.goldHi, a: so, track: 0.2 });
  }
  // price crashes through value → buy
  const X0 = 1180, X1 = 1740, VY = 520;
  const ch = ease(t, L(29).start - 0.4, 1.0) * a;
  if (ch > 0) {
    g.save(); g.setLineDash([6, 6]); goldStroke(g, [[X0, VY], [X1, VY]], ch, { w: 1.4, a: ch, glow: 0, color: C.goldHi }); g.restore();
    text(g, '内在价值', X1, VY - 24, { size: 20, color: C.goldHi, a: ch, align: 'right', track: 0.16 });
    const prog = ease(t, L(29).start, (L(31).start - L(29).start) + 1.0, SOFT);
    const path = u => { const x = lerp(X0, X1, u); let y = VY - 40 + NZ(u * 9) * 14; if (u > 0.25) y += 260 * Math.sin(Math.PI * clamp((u - 0.25) / 0.55)) ** 1.2; if (u > 0.62) y -= (u - 0.62) * 260; return [x, y]; };
    const pts = []; for (let i = 0; i <= 100; i++) pts.push(path(i / 100 * prog));
    const hp = goldStroke(g, pts, 1, { w: 2, a: ch, glow: 0.4, color: C.ivory });
    glowDot(g, hp[0], hp[1], 3, ch);
    const by = path(0.52), buy = ease(t, L(30).start + 0.6, 0.6, outCubic) * ch;
    if (buy > 0) {
      g.save(); g.translate(by[0], by[1] + 30); g.rotate(Math.PI / 4); g.scale(buy, buy); g.globalAlpha = buy; g.fillStyle = C.goldHi; g.fillRect(-9, -9, 18, 18); g.restore();
      text(g, '买入', by[0], by[1] + 70, { size: 26, weight: 700, color: C.goldHi, a: buy, track: 0.2 });
    }
  }
  const bf = ease(t, L(31).start, 1.0) * a;
  text(g, 'Warren Buffett', 1460, 352, { font: 'latin', italic: true, size: 34, color: C.goldHi, a: bf });
  text(g, '“Price is what you pay; value is what you get.”', 1460, 390, { font: 'latin', italic: true, size: 22, color: C.ivory, a: bf * 0.8 });
}

/* =====================================================================
   TREND — the trend trader rides the wave through resistance
   ===================================================================== */
function sceneTrend(g, t) {
  const [A, B] = WIN.trend, L = i => LN(i);
  const fromV = ease(t, A - 0.5, 2.0, SWIFT);
  const st = { wy: lerp(300, 620, fromV), amp: 1.4, off: 120, infl: 1, crest: null };
  const a = ease(t, A - 0.6, 0.6, SOFT);
  const grow = ease(t, L(33).start, (L(34).end - L(33).start), SOFT);
  // the price IS the wave crest: a base, then a breakout that the wave carries
  st.crest = { x: lerp(-200, 1450, grow), w: 360, h: 40 + 200 * ease(t, L(34).start, 2.4, SOFT) };
  drawSea(g, t, st, a, { cx: 260, scale: 0.6 });
  const RES = st.wy - 170;
  const ra = ease(t, L(32).start + 0.4, 1.0) * a;
  g.save(); g.setLineDash([8, 8]); goldStroke(g, [[200, RES], [1720, RES]], ra, { w: 1.2, a: ra * 0.8, glow: 0, color: C.ivory }); g.restore();
  text(g, '阻力位', 1720, RES - 22, { size: 20, color: C.ivory, a: ra * 0.8, align: 'right', track: 0.2 });
  // the rider on the crest
  const rx = st.crest.x - 40, ry = st.wy + waveY(rx, t, st.amp, st.crest) - 14;
  const trail = []; for (let i = 0; i <= 40; i++) { const x = rx - i * 14; trail.push([x, st.wy + waveY(x, t, st.amp, st.crest) - 14]); }
  goldStroke(g, trail, 1, { w: 2, a: a * 0.6, glow: 0.6, color: C.goldHi });
  glowDot(g, rx, ry, 4, a * ease(t, L(33).start, 0.8));
  const bo = ease(t, L(34).start + 1.0, 0.8);
  if (bo > 0 && ry < RES) { text(g, '突破', rx + 40, ry - 30, { size: 28, weight: 700, color: C.up, a: bo * a, align: 'left', track: 0.2 }); }
  const sh = ease(t, L(34).start + 1.6, 1.0) * a;
  goldStroke(g, [[rx - 200, ry + 10], [rx - 60, ry - 50], [rx - 82, ry - 52], [rx - 60, ry - 50], [rx - 70, ry - 30]], sh, { w: 2, a: sh, glow: 0.5, color: C.goldHi });
  text(g, '顺势', rx - 230, ry - 50, { size: 34, weight: 700, color: C.goldHi, a: sh, align: 'left', track: 0.2 });
  // wind lines (supply/demand imbalance)
  const wd = ease(t, L(33).start, 1.2) * a;
  for (let i = 0; i < 8; i++) { const y = 260 + i * 34, off = ((t * 220 + i * 170) % 2200) - 300; const pts = []; for (let k = 0; k <= 20; k++) pts.push([off + k * 16, y + Math.sin(k * 0.5 + i) * 4]); goldStroke(g, pts, 1, { w: 1, a: wd * 0.3, glow: 0, color: C.ivory }); }
}

/* =====================================================================
   SUMMARY — spray, wind, iceberg
   ===================================================================== */
function sceneSummary(g, t) {
  const [A, B] = WIN.summary, L = i => LN(i);
  const st = { wy: 470, amp: 1.6, off: 0, infl: 1, crest: null };
  const back = ease(t, A - 0.5, 2.2, SWIFT);
  st.wy = lerp(620, 470, back);
  const a = ease(t, A - 0.5, 0.6, SOFT) * (1 - ease(t, B - 1.4, 1.4, SOFT));
  const l1 = ease(t, L(35).start, 1.0), l2 = ease(t, L(36).start, 1.0), l3 = ease(t, L(37).start, 1.0);
  const foc = (k) => { const at = [L(35).start, L(36).start, L(37).start][k]; const nx = [L(36).start, L(37).start, 1e9][k]; return lerp(0.35, 1, life(t, at, nx + 0.2, 0.6, 0.6)); };
  drawSea(g, t, st, a, { cx: 1180, scale: 0.85, glowBody: l3 * foc(2) * 0.8 });
  // spray on the surface
  for (let i = 0; i < 60; i++) { const r = rng(i + 900); const x = 300 + r() * 1400, ph = (t * (0.6 + r()) + r()) % 1; const y = st.wy + waveY(x, t, st.amp) - ph * 50; g.globalAlpha = a * l1 * foc(0) * (1 - ph) * 0.8; g.fillStyle = C.ivory; g.fillRect(x, y, 2, 2); }
  g.globalAlpha = 1;
  // wind in the sky
  for (let i = 0; i < 7; i++) { const y = 300 + i * 18, off = ((t * 260 + i * 210) % 2300) - 300; const pts = []; for (let k = 0; k <= 22; k++) pts.push([off + k * 16, y + Math.sin(k * 0.45 + i + t) * 5]); goldStroke(g, pts, 1, { w: 1.1, a: a * l2 * foc(1) * 0.55, glow: 0, color: C.goldHi }); }
  const row = (y, who, what, k, la) => { text(g, who, 240, y, { size: 30, weight: 700, color: C.goldHi, a: a * la * foc(k), align: 'left', track: 0.2 }); text(g, what, 360, y, { size: 30, color: C.ivory, a: a * la * foc(k), align: 'left', track: 0.14 }); };
  row(st.wy - 40, '新手', '看价格 · 浪花', 0, l1);
  row(345, '老手', '看供求 · 风向', 1, l2);
  row(st.wy + 230, '高手', '看价值 · 冰山', 2, l3);
}

/* =====================================================================
   SOUND CUES — exported for tools/sfx.py (times in seconds, gains in dB)
   ===================================================================== */
function buildCues() {
  // sparse and purely tonal: a few accents on the beats that matter, nothing continuous, no noise
  const L = i => LN(i), C_ = [];
  const cue = (type, at, gain = 0, extra = {}) => C_.push({ type, at: +at.toFixed(3), gain, ...extra });
  cue('impact', WIN.title[0] + 0.35, -4);                                   // title
  for (const id of ['ch1', 'ch2', 'ch3', 'ch4']) cue('impact', WIN[id][0] + 0.25, -11);
  cue('tock', LN(1).end - 0.4, -10);                                        // the price freezes
  [WIN.barter[0] + 1.2, WIN.barter[0] + 1.9, WIN.barter[0] + 2.6].map(x => Math.min(x, L(2).start + 1.6)).forEach(x => cue('thud', x, -14));
  cue('heart', L(4).start, -16, { dur: 1.8 });                              // the "lifeline"
  cue('tock', L(6).start + 0.1, -7);                                        // buyer meets seller
  cue('tock', L(12).start + 1.3, -8);                                       // orders match
  cue('tock', L(30).start + 0.6, -7);                                       // the value investor buys
  cue('impact', WIN.finale[0] + 0.9, -9);                                   // closing line
  return C_;
}

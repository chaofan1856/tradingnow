/* ============================================================
   《MACD终极指南》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py + sfx.json)

   Clock pinned to the music: the drop at 16.7 s is the lightning title (price action first, MACD
   second); the quiet section (85.3–103.2 s) builds strategy one — the support, the bullish
   divergence, the line at the high — and the track's return at 103.2 s is the break of that high.
   Short, fast finale.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const Y = '#FFD34D';                                               // core signal: yellow

const H0 = { label: '入门', sub: '基本介绍与核心本质', en: 'MACD Basics', zh: '《MACD终极指南》' };
const H1 = { label: '误区', sub: '传统金叉死叉', en: 'Why Not the Crosses', zh: '《摒弃传统用法》' };
const H2 = { label: '背离', num: 1, sub: '趋势反转背离 · 捕捉拐点', en: 'Reversal Divergence', zh: '《四大背离形态》' };
const H3 = { label: '背离', num: 2, sub: '趋势延续背离 · 顺势加仓', en: 'Continuation Divergence', zh: '《四大背离形态》' };
const HS1 = { label: '策略', num: 1, sub: '关键价位 + 反转背离', en: 'Level + Divergence', zh: '《共振天条》' };
const HS2 = { label: '策略', num: 2, sub: '大周期阻力 + 小周期背离', en: 'Multi-Timeframe Short', zh: '《共振天条》' };
const HS3 = { label: '策略', num: 3, sub: '双 MACD 延续背离', en: 'Double Continuation', zh: '《共振天条》' };
const TOP = { subX: 960, subY: 275, subAlign: 'center' };      // chart scenes: one subtitle line above the picture, never over it
const BOT = { subX: 960, subAlign: 'center' };

/* ---------------- shared motion helpers ---------------- */
/** deterministic shake: decaying multi-frequency wobble that starts at t0 */
function shake(t, t0, amp, decay = 5) {
  const u = t - t0; if (u < 0 || u > 2.5) return [0, 0];
  const k = amp * Math.exp(-u * decay);
  return [k * (Math.sin(u * 71) * .6 + Math.sin(u * 43 + 1) * .4), k * (Math.sin(u * 59 + 2) * .6 + Math.cos(u * 37) * .4)];
}
/** solid glowing polyline drawn to progress p (by length), bright head */
function poly(ctx, pts, p, o = {}) {
  p = clamp(p); if (p <= 0) return;
  const seg = []; let L = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let rem = L * p, hx = pts[0][0], hy = pts[0][1];
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = o.color || C.goldHi; ctx.lineWidth = o.width || 4; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.shadowColor = rgba(o.color || C.gold, .75); ctx.shadowBlur = o.blur ?? 18;
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath(); ctx.moveTo(hx, hy);
  for (let i = 0; i < seg.length && rem > 0; i++) {
    const u = Math.min(1, rem / seg[i]); hx = lerp(pts[i][0], pts[i + 1][0], u); hy = lerp(pts[i][1], pts[i + 1][1], u);
    ctx.lineTo(hx, hy); rem -= seg[i];
  }
  ctx.stroke();
  if (o.head !== false && p < 1) { ctx.setLineDash([]); ctx.fillStyle = '#FFF6DC'; ctx.shadowColor = o.color || C.goldHi; ctx.shadowBlur = 26; ctx.beginPath(); ctx.arc(hx, hy, (o.width || 4) * 1.1, 0, 6.2832); ctx.fill(); }
  ctx.restore();
}
/** tag anchored left / right / centre of x (K.tag only centres or left-aligns) */
function tagAt(ctx, x, y, str, o = {}) {
  ctx.save(); ctx.font = o.font || F.serif(700, 20); const w = ctx.measureText(str).width + 26; ctx.restore();
  const side = o.side || 'center';
  K.tag(ctx, side === 'left' ? x - w : side === 'right' ? x : x, y, str, { ...o, align: side === 'center' ? undefined : 'left' });
}
/** big flashing callout text: flickers in, then settles */
function callout(ctx, str, x, y, a, t, o = {}) {
  if (a <= 0.002) return;
  const flick = t < .9 ? .55 + .45 * Math.cos(t * 22) * (1 - t / .9) : 1;
  K.text(ctx, str, x, y, { font: F.serif(900, o.size || 30), color: o.color || C.goldHi, align: o.align || 'center', alpha: a * flick, glow: .9, glowColor: o.color || C.goldHi, spacing: o.spacing ?? 4 });
}
/** gold targeting reticle that drops onto (x,y) */
function reticle(ctx, x, y, a, t, col = C.goldHi) {
  if (a <= 0.002) return;
  const s = lerp(2.4, 1, easeOut(a)), rot = t * .9, r = 30 * s;
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.translate(x, y);
  ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.globalAlpha *= .7; ctx.beginPath(); ctx.arc(0, 0, r * 1.55, rot, rot + 1.1); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * 1.55, rot + Math.PI, rot + Math.PI + 1.1); ctx.stroke(); ctx.globalAlpha /= .7;
  ctx.lineWidth = 2;
  for (let k = 0; k < 4; k++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(r * .55, 0); ctx.lineTo(r * 1.25, 0); ctx.stroke(); }
  const pulse = (t * 1.2) % 1; ctx.globalAlpha *= (1 - pulse) * .8; ctx.beginPath(); ctx.arc(0, 0, r * (1 + pulse * 1.2), 0, 6.2832); ctx.stroke();
  ctx.restore();
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.fillStyle = '#FFF6DC'; ctx.shadowColor = col; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(x, y, 4.5, 0, 6.2832); ctx.fill(); ctx.restore();
}
/** soft radial flash (breakouts, impacts) */
function flash(ctx, x, y, a, r = 380, col = C.goldHi) {
  if (a <= 0.002) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(col, .55 * a)); g.addColorStop(.4, rgba(col, .16 * a)); g.addColorStop(1, rgba(col, 0));
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
}
/** expanding shock ring */
function ring(ctx, x, y, u, col = C.goldHi, maxR = 200) {
  if (u <= 0 || u >= 1) return;
  ctx.save(); ctx.strokeStyle = col; ctx.globalAlpha = (1 - u) * .9; ctx.lineWidth = 3 * (1 - u) + .5; ctx.shadowColor = col; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.arc(x, y, easeOut(u) * maxR, 0, 6.2832); ctx.stroke(); ctx.restore();
}
/** chart that reveals candles with an eased, continuous count */
function drawChart(ctx, chart, reveal, o = {}) { chart.draw(ctx, reveal, { glow: .45, ...o }); }


/* ---------------- chapter card (house style) ---------------- */
function chapter(numCn, idx, title, en, sub) {
  return (ctx, S) => {
    const cx = 960, a = S.p(0.15, 1.0);
    K.text(ctx, `PART · 0${idx}`, cx, 300, { font: F.latin(500, 20), color: C.gold, align: 'center', spacing: 9, alpha: S.p(0.1, 1) });
    ctx.save(); ctx.translate(cx, 470); const s = lerp(1.25, 1, easeOut(S.t / 1.6)); ctx.scale(s, s);
    K.goldText(ctx, numCn, 0, 0, 84, { alpha: a, glow: .8 + .2 * Math.sin(S.t * 2) });
    ctx.restore();
    K.rule(ctx, cx, 535, 280, S.p(0.6, 1.2));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 548, 1920, 100); ctx.clip();
    const tp = S.p(0.9, 1.1, K.expo);
    K.text(ctx, title, cx, 625 + (1 - tp) * 70, { font: F.serif(900, 44), color: C.white, align: 'center', spacing: 12, alpha: tp });
    ctx.restore();
    K.text(ctx, en.toUpperCase(), cx, 690, { font: F.latin(500, 20), color: C.gray, align: 'center', spacing: 7, alpha: S.p(1.5, 1) });
    K.text(ctx, sub, cx, 752, { font: F.serif(500, 22), color: C.gray, align: 'center', spacing: 6, alpha: S.p(1.8, 1) });
  };
}


function volume(ctx, ch, vol, reveal, y, h, o = {}) {
  K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, y + h, { p: o.base ?? 1, step: 60, alpha: .75 });
  K.text(ctx, 'VOLUME', ch.box.x - 18, y + 18, { font: F.latin(500, 14), color: C.gray, align: 'right', spacing: 3, alpha: o.base ?? 1 });
  for (let i = 0; i < vol.length && i < Math.ceil(reveal); i++) {
    const g = clamp(reveal - i), hh = h * vol[i] / 100 * easeOut(g), w = ch.cw, hot = o.hot === i, k = ch.k[i];
    const col = hot ? (k.c >= k.o ? C.red : C.green) : mix(k.c >= k.o ? C.red : C.green, C.gold, .45);
    ctx.save(); ctx.globalAlpha = (hot ? .95 : .55) * easeOut(g); ctx.fillStyle = col;
    if (hot) { ctx.shadowColor = col; ctx.shadowBlur = 20; }
    ctx.fillRect(ch.x(i) - w / 2, y + h - hh, w, hh); ctx.restore();
  }
}
const railOf = (a, b) => { const s = (b.price - a.price) / (b.i - a.i); return i => a.price + s * (i - a.i); };
function band(ctx, ch, up, lo, i0, i1, p, alpha = 1) {             // two rails + translucent fill, drawn to progress p
  const ie = lerp(i0, i1, smooth(p)); if (p <= 0) return;
  ctx.save(); ctx.globalAlpha = .1 * alpha; ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.moveTo(ch.x(i0), ch.y(up(i0))); ctx.lineTo(ch.x(ie), ch.y(up(ie))); ctx.lineTo(ch.x(ie), ch.y(lo(ie))); ctx.lineTo(ch.x(i0), ch.y(lo(i0))); ctx.fill(); ctx.restore();
  K.line(ctx, ch.x(i0), ch.y(up(i0)), ch.x(ie), ch.y(up(ie)), { width: 2.2, color: C.goldHi, glow: .8, alpha });
  K.line(ctx, ch.x(i0), ch.y(lo(i0)), ch.x(ie), ch.y(lo(ie)), { width: 2.2, color: C.goldHi, glow: .8, alpha });
}


/** simple moving average of closes (window n), for every candle (shorter window at the start) */
const sma = (k, n) => k.map((_, i) => { const a = Math.max(0, i - n + 1); let s = 0; for (let j = a; j <= i; j++) s += k[j].c; return s / (i - a + 1); });
/** the MA line, drawn to progress p over candle indices [i0, i1] */
function maLine(ctx, ch, ma, i0, i1, p, o = {}) {
  const pts = []; for (let i = i0; i <= i1; i++) pts.push([ch.x(i), ch.y(ma[i])]);
  poly(ctx, pts, p, { color: o.color || C.goldHi, width: o.width || 4, blur: 18, alpha: o.alpha ?? 1, head: o.head });
  if (o.label) K.text(ctx, o.label, ch.x(i1) + 14, ch.y(ma[i1]) + 6, { font: F.latin(500, 18), color: o.color || C.goldHi, alpha: (o.alpha ?? 1) * clamp(p * 3 - 2), spacing: 2 });
}
/** giant stamped X */
function bigX(ctx, x, y, a, size = 300, col = C.green) {
  if (a <= .002) return;
  ctx.save(); ctx.translate(x, y); const r = lerp(size * 1.7, size, easeOut(a));
  ctx.globalAlpha = clamp(a * 1.4) * .92; ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = size * .11; ctx.shadowColor = rgba(col, .9); ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.moveTo(-r, -r * .62); ctx.lineTo(r, r * .62); ctx.moveTo(r, -r * .62); ctx.lineTo(-r, r * .62); ctx.stroke(); ctx.restore();
}
/** check mark */
function tick(ctx, x, y, a, s = 60, col = C.red) {
  if (a <= .002) return;
  ctx.save(); ctx.globalAlpha = clamp(a); ctx.strokeStyle = col; ctx.lineWidth = s * .16; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.shadowColor = col; ctx.shadowBlur = 20;
  ctx.beginPath(); ctx.moveTo(x - s * .5, y); ctx.lineTo(x - s * .1, y + s * .4); ctx.lineTo(lerp(x - s * .1, x + s * .6, smooth(a)), lerp(y + s * .4, y - s * .5, smooth(a))); ctx.stroke(); ctx.restore();
}
/** yellow sparks bursting from a point */
function sparks(ctx, x, y, u, n = 30) {
  if (u <= 0 || u >= 1) return;
  const R = K.rng(77);
  for (let k = 0; k < n; k++) { const a = -Math.PI / 2 + (R() - .5) * 2.4, v = 120 + R() * 260, e = easeOut(u);
    const px = x + Math.cos(a) * v * e, py = y + Math.sin(a) * v * e + 160 * u * u;
    ctx.save(); ctx.globalAlpha = 1 - u; ctx.strokeStyle = Y; ctx.lineWidth = 2; ctx.shadowColor = Y; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.cos(a) * 14, py - Math.sin(a) * 14); ctx.stroke(); ctx.restore(); }
}



/** MA drawn red while above the other line, green while below — the colour flips exactly at the cross */
function crossLine(ctx, ch, a, b, i0, i1, p, o = {}) {
  const iend = lerp(i0, i1, clamp(p)); if (p <= 0) return;
  for (let i = i0; i < Math.min(i1, Math.ceil(iend)); i++) {
    const j = Math.min(i + 1, iend), up = (a[i] + a[Math.min(i + 1, a.length - 1)]) / 2 >= (b[i] + b[Math.min(i + 1, b.length - 1)]) / 2;
    const pa = a[i] + (a[Math.min(i + 1, a.length - 1)] - a[i]) * (j - i);
    K.line(ctx, ch.x(i), ch.y(a[i]), ch.x(j), ch.y(pa), { color: up ? C.red : C.green, width: o.width || 4.5, glow: .9, alpha: o.alpha ?? 1 });
  }
}
/** find the index where series a crosses series b (sign change), searching from i0 */
const crossAt = (a, b, i0 = 1, dir = 0) => { for (let i = Math.max(1, i0); i < a.length; i++) { const d0 = a[i - 1] - b[i - 1], d1 = a[i] - b[i]; if (d0 * d1 < 0 && (!dir || Math.sign(d1) === dir)) return i - d1 / (d1 - d0); } return -1; };
const at = (arr, x) => { const i = Math.floor(x), f = x - i; return arr[i] + ((arr[Math.min(i + 1, arr.length - 1)] ?? arr[i]) - arr[i]) * f; };
/** smooth series through anchors [[i, v], …] over n points */
const curve = (anchors, n) => Array.from({ length: n }, (_, i) => { let j = 0; while (j < anchors.length - 2 && i > anchors[j + 1][0]) j++; const [i0, v0] = anchors[j], [i1, v1] = anchors[j + 1]; return lerp(v0, v1, smooth((i - i0) / (i1 - i0 || 1))); });
/** RSI panel (示意) under a chart */
function rsiPanel(ctx, ch, rsi, y0, h, p, a = 1) {
  if (a <= .002) return;
  const yOf = v => y0 + h - h * (v - 10) / 80;
  ctx.save(); ctx.globalAlpha = a;
  ctx.strokeStyle = rgba(C.gray, .35); ctx.setLineDash([4, 6]); ctx.lineWidth = 1;
  [70, 30].forEach(v => { ctx.beginPath(); ctx.moveTo(ch.box.x, yOf(v)); ctx.lineTo(ch.box.x + ch.box.w, yOf(v)); ctx.stroke(); });
  ctx.restore();
  K.text(ctx, 'RSI（示意）', ch.box.x - 18, y0 + 20, { font: F.serif(700, 14), color: C.gray, align: 'right', alpha: a });
  const pts = rsi.map((v, i) => [ch.x(i), yOf(v)]);
  poly(ctx, pts, p, { color: C.goldHi, width: 2.6, alpha: a, blur: 10 });
  return yOf;
}


/** stick figure (head centre at x,y). mood: 'greed' hugs the position, 'panic' flails */
function stickman(ctx, x, y, a, mood, t, s = 1.3) {
  if (a <= .002) return;
  const col = mood === 'panic' ? C.green : mood === 'greed' ? C.red : C.white;
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.translate(x, y); ctx.scale(s, s);
  ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 3.2; ctx.lineCap = 'round'; ctx.shadowColor = rgba(col, .8); ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(0, 0, 12, 0, 6.2832); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(0, 12); ctx.lineTo(0, 48); ctx.moveTo(0, 48); ctx.lineTo(-12, 74); ctx.moveTo(0, 48); ctx.lineTo(12, 74); ctx.stroke();
  ctx.beginPath();
  if (mood === 'panic') { const w = Math.sin(t * 24) * 10; ctx.moveTo(0, 22); ctx.lineTo(-22, 2 + w); ctx.moveTo(0, 22); ctx.lineTo(22, 2 - w); }
  else if (mood === 'greed') { ctx.moveTo(0, 22); ctx.lineTo(-14, 32); ctx.lineTo(4, 38); ctx.moveTo(0, 22); ctx.lineTo(14, 32); ctx.lineTo(-4, 38);
    ctx.stroke(); ctx.beginPath(); ctx.fillStyle = C.goldHi; ctx.arc(0, 34, 6, 0, 6.2832); ctx.fill(); }   // clutching the coin
  else { ctx.moveTo(0, 22); ctx.lineTo(-16, 40); ctx.moveTo(0, 22); ctx.lineTo(16, 40); }
  ctx.stroke(); ctx.restore();
}
/** rubber stamp text: drops in big, lands with a tilt */
function stamp(ctx, str, x, y, a, o = {}) {
  if (a <= .002) return;
  const col = o.color || Y, s = lerp(2.2, 1, easeOut(a));
  ctx.save(); ctx.translate(x, y); ctx.rotate(o.rot ?? -.08); ctx.scale(s, s); ctx.globalAlpha *= clamp(a * 1.5);
  ctx.font = F.serif(900, o.size || 44); const w = ctx.measureText(str).width + 60, h = (o.size || 44) * 1.75 + 34;
  ctx.strokeStyle = col; ctx.lineWidth = 5; ctx.shadowColor = rgba(col, .8); ctx.shadowBlur = 24;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, 10); ctx.stroke();
  ctx.fillStyle = rgba(col, .1); ctx.fill();
  ctx.fillStyle = col; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(str, 0, 4); ctx.restore();
}
/** shaded region over a chart's candle range [i0, i1) */
function region(ctx, ch, i0, i1, col, a) {
  if (a <= .002) return;
  const x0 = ch.x(i0) - ch.step / 2, x1 = ch.x(i1 - 1) + ch.step / 2;
  ctx.save(); ctx.globalAlpha = .1 * a; ctx.fillStyle = col; ctx.fillRect(x0, ch.box.y, (x1 - x0) * smooth(a), ch.box.h); ctx.restore();
}


/** red photo frame */
function frame(ctx, x, y, w, h, a, on = 1, col = C.red) {
  if (a <= .002) return;
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.fillStyle = rgba(col, .06 + .08 * on); ctx.strokeStyle = rgba(col, .45 + .5 * on); ctx.lineWidth = 2;
  ctx.shadowColor = col; ctx.shadowBlur = 8 + 22 * on; ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke(); ctx.restore();
}
/** draw a pattern into box b to progress p (by length): red legs up, green legs down, guides, labels, breakout burst */
function pat(ctx, Q, b, p, o = {}) {
  const X = x => b.x + x * b.w, Yp = y => b.y + (1 - y) * b.h, w = o.w ?? 4, a = o.alpha ?? 1;
  const ga = (o.ga ?? smooth(clamp(p * 2.2))) * a;
  (Q.g || []).forEach(([x1, y1, x2, y2, col, lb]) => {
    K.dash(ctx, X(x1), Yp(y1), X(x2), Yp(y2), { p: ga, color: col, width: o.gw ?? 2, alpha: .9 * a, dash: o.small ? [5, 5] : [9, 7] });
    if (lb && !o.small) K.text(ctx, lb, X(x2) + 10, Yp(y2) + 6, { font: F.serif(700, 15), color: col, alpha: ga });
  });
  const pts = Q.pts.map(([x, y]) => [X(x), Yp(y)]), seg = [];
  let L = 0; for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  let rem = L * clamp(p), acc = 0;
  for (let i = 0; i < seg.length && rem > 0; i++) {
    const u = Math.min(1, rem / seg[i]), up = Q.pts[i + 1][1] >= Q.pts[i][1];
    poly(ctx, [pts[i], pts[i + 1]], u, { color: up ? C.red : C.green, width: w, blur: o.small ? 6 : 14, head: false, alpha: a });
    rem -= seg[i];
  }
  (Q.lab || []).forEach(([i, t, s]) => {
    const la = clamp((p * L - seg.slice(0, i).reduce((m, d) => m + d, 0)) / 60) * a;
    if (la > 0 && !o.small) K.text(ctx, t, pts[i][0], pts[i][1] + (s === 'a' ? -18 : 40), { font: F.serif(900, 17), color: C.white, align: 'center', alpha: la });
  });
  if (o.small || o.fx === false) return;
  // breakout burst on the final leg
  const f0 = (L - seg[seg.length - 1]) / L, u = (p - f0) / (1 - f0), n = pts.length;
  if (u > 0) {
    const up = Q.pts[n - 1][1] > Q.pts[n - 2][1], col = Q.spark ? Y : up ? C.red : C.green, bx = lerp(pts[n - 2][0], pts[n - 1][0], .3), by = lerp(pts[n - 2][1], pts[n - 1][1], .3);
    flash(ctx, bx, by, clamp(1 - u) * a, 220, col); ring(ctx, bx, by, u, col, 130);
    if (Q.spark) sparks(ctx, bx, by, clamp(u * 1.2), 26);
  }
  if (p > 0 && p < 1) {                                               // bright head
    let r = L * p, hx = pts[0][0], hy = pts[0][1];
    for (let i = 0; i < seg.length; i++) { if (r <= seg[i]) { hx = lerp(pts[i][0], pts[i + 1][0], r / seg[i]); hy = lerp(pts[i][1], pts[i + 1][1], r / seg[i]); break; } r -= seg[i]; }
    ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = '#FFF6DC'; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 22; ctx.beginPath(); ctx.arc(hx, hy, w * 1.2, 0, 6.2832); ctx.fill(); ctx.restore();
  }
}

/* ---------------- MACD maths (real) ---------------- */
const ema = (a, n) => { const k = 2 / (n + 1), o = [a[0]]; for (let i = 1; i < a.length; i++) o.push(a[i] * k + o[i - 1] * (1 - k)); return o; };
/** price path with a flat warm-up so the averages are settled; returns the visible candles + EMA12/26 + MACD/signal/histogram */
function series(wps, per, seed, warm = 40) {
  const pre = K.gen.path([wps[0], wps[0] + .6, wps[0] - .4, wps[0]], { per: Math.round(warm / 3), seed: seed + 1, noise: .4, wick: .4 }).candles;
  const k = K.gen.path(wps, { per, seed, noise: .4, wick: .45 }).candles, all = [...pre, ...k], c = all.map(x => x.c);
  const e12 = ema(c, 12), e26 = ema(c, 26), m = e12.map((v, i) => v - e26[i]), s = ema(m, 9), n = pre.length;
  return { K: k, e12: e12.slice(n), e26: e26.slice(n), macd: m.slice(n), sig: s.slice(n), hist: m.slice(n).map((v, i) => v - s[n + i]) };
}
/** MACD panel under a chart: zero line, histogram, MACD line (white), signal line (gold) — drawn to reveal rv */
function macdPanel(ctx, ch, M, y0, h, rv, a = 1, o = {}) {
  if (a <= .002) return null;
  const sc = o.scale || Math.max(...M.macd.map(Math.abs), ...M.sig.map(Math.abs)) * 1.15, yOf = v => y0 + h / 2 - v / sc * h / 2;
  K.line(ctx, ch.box.x, y0 + h / 2, ch.box.x + ch.box.w, y0 + h / 2, { color: C.dim, width: 1, alpha: a });
  K.text(ctx, o.label || 'MACD', ch.box.x - 18, y0 + 20, { font: F.latin(500, 14), color: C.gray, align: 'right', spacing: 2, alpha: a });
  for (let i = 0; i < M.hist.length && i < Math.ceil(rv); i++) {
    const g = clamp(rv - i), v = M.hist[i], up = v >= 0, grow = i > 0 && Math.abs(v) >= Math.abs(M.hist[i - 1]);
    ctx.save(); ctx.globalAlpha = a * easeOut(g) * (grow ? .85 : .45); ctx.fillStyle = up ? C.red : C.green;
    const y1 = yOf(0), y2 = yOf(v * easeOut(g)); ctx.fillRect(ch.x(i) - ch.cw * .35, Math.min(y1, y2), ch.cw * .7, Math.abs(y2 - y1)); ctx.restore();
  }
  const n = Math.min(M.macd.length - 1, rv - 1);
  if (n > 0) {
    const line = (arr, col, w) => { const pts = []; for (let i = 0; i <= Math.floor(n); i++) pts.push([ch.x(i), yOf(arr[i])]); if (n % 1) pts.push([ch.x(n), yOf(at(arr, n))]); poly(ctx, pts, 1, { color: col, width: w, blur: 10, alpha: a, head: false }); };
    line(M.sig, C.gold, 2.4); line(M.macd, '#F4F0E8', 2.6);
  }
  return yOf;
}

/* ---------------- divergence diagrams (示意): price path above, MACD histogram below ---------------- */
const bump = (x, c, w) => Math.exp(-Math.pow((x - c) / w, 2));
const DIV = {
  top: { name: '顶背离 · 看跌反转', col: C.green, pts: [[0, .15], [.25, .7], [.42, .48], [.65, .86], [.8, .55], [1, .12]], mac: x => .9 * bump(x, .25, .11) + .42 * bump(x, .65, .1) - .25 * bump(x, .43, .06) - .75 * bump(x, .92, .08),
    pk: [[.25, .7], [.65, .86]], mk: [.25, .65], lp: '价格：顶顶高（HH）', lm: 'MACD：波峰一浪比一浪低', pcol: C.red },
  cont: { name: '上升延续背离 · 看涨', col: C.red, pts: [[0, .1], [.2, .55], [.33, .32], [.55, .74], [.68, .45], [.92, .96], [1, .98]], mac: x => .55 * bump(x, .2, .09) - .32 * bump(x, .33, .06) + .62 * bump(x, .55, .09) - .72 * bump(x, .68, .06) + .8 * bump(x, .92, .08),
    pk: [[.33, .32], [.68, .45]], mk: [.33, .68], lp: '价格：底底高（HL）', lm: 'MACD：波谷创新低', pcol: C.red, low: true },
};
const flipDiv = (D, name, col, lp, lm, pcol) => ({ ...D, name, col, lp, lm, pcol, pts: D.pts.map(([x, y]) => [x, 1 - y]), mac: x => -D.mac(x), pk: D.pk.map(([x, y]) => [x, 1 - y]), low: !D.low });
DIV.bot = flipDiv(DIV.top, '底背离 · 看涨反转', C.red, '价格：底底低（LL）', 'MACD：波谷不断抬高', C.green);
DIV.contDn = flipDiv(DIV.cont, '下跌延续背离 · 看跌', C.green, '价格：顶顶低（LH）', 'MACD：波峰反常新高', C.green);

function divPanel(ctx, D, b, p, show, a = 1) {
  const pb = { x: b.x, y: b.y + 36, w: b.w, h: 180 }, my = b.y + 262, mh = 110, N = 46;
  pat(ctx, { pts: D.pts, g: [] }, pb, p, { w: 3.6, fx: false, alpha: a });
  K.line(ctx, b.x, my + mh / 2, b.x + b.w, my + mh / 2, { color: C.dim, width: 1, alpha: a });
  K.text(ctx, 'MACD（示意）', b.x + b.w, my - 6, { font: F.serif(700, 14), color: C.gray, align: 'right', alpha: a });
  const bw = b.w / N * .62;
  for (let i = 0; i < N; i++) {
    const x = i / (N - 1), g = clamp((p * 1.02 - x) * 12); if (g <= 0) break;
    const v = D.mac(x); ctx.save(); ctx.globalAlpha = a * .8 * g; ctx.fillStyle = v >= 0 ? C.red : C.green;
    ctx.fillRect(b.x + x * b.w - bw / 2, Math.min(my + mh / 2, my + mh / 2 - v * mh / 2), bw, Math.abs(v * mh / 2)); ctx.restore();
  }
  if (show <= 0) return;
  const P = ([x, y]) => [b.x + x * b.w, pb.y + (1 - y) * pb.h + (D.low ? 14 : -14)], M = x => [b.x + x * b.w, my + mh / 2 - D.mac(x) * mh / 2 + (D.mac(x) >= 0 ? -8 : 8)];
  poly(ctx, D.pk.map(P), show, { color: D.pcol, width: 2.6, dash: [8, 6], blur: 8, head: false, alpha: a });
  poly(ctx, D.mk.map(M), show, { color: Y, width: 2.6, dash: [8, 6], blur: 8, head: false, alpha: a });
  const [p1, p2] = D.pk.map(P), [m1, m2] = D.mk.map(M);
  K.text(ctx, D.lp, (p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2 + (D.low ? 44 : -16), { font: F.serif(900, 17), color: D.pcol, align: 'center', alpha: a * clamp(show * 2 - 1) });
  K.text(ctx, D.lm, (m1[0] + m2[0]) / 2, D.mac(D.mk[0]) >= 0 ? my - 30 : my + mh + 34, { font: F.serif(900, 17), color: Y, align: 'center', alpha: a * clamp(show * 2 - 1) });
}
const LB = { x: 180, y: 420, w: 680, h: 360 }, RB = { x: 1060, y: 420, w: 680, h: 360 };
function divScene(id, header, l, r, lines, dur, tr) {
  return { id, header, dur, tr: tr || ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6, lines,
    visual(ctx, S) {
      K.line(ctx, 960, 390, 960, 390 + 430 * smooth(S.at(0, 0, 1.0)), { color: C.gold, width: 1.2, glow: .5, alpha: .55 });
      [[l, LB, 0], [r, RB, 1]].forEach(([D, b, j]) => {
        const p = smooth(S.lin(j, .2, 3.0)), on = j === Math.max(0, S.line()) ? 1 : .55;
        K.text(ctx, D.name, b.x + b.w / 2, 398, { font: F.serif(900, 24), color: D.col, align: 'center', alpha: clamp(S.at(j, 0, .6, easeBack)), glow: .5, glowColor: D.col });
        divPanel(ctx, D, b, p, smooth(S.lin(j, 3.3, 1.0)), lerp(1, on, S.at(1, 0, .6)));
      });
    } };
}

/* ---------------- data ---------------- */
const MA = series([104, 112, 107, 118, 111, 117], [6, 4, 6, 4, 4], 501);
const chMA = new K.Chart(MA.K, { x: 260, y: 240, w: 1400, h: 250 });
const CR = series([120, 104, 118, 111, 115, 110.5, 114.5, 110, 114, 110.5, 113.5], [10, 12, 4, 3, 3, 3, 3, 3, 3, 3], 511);
const chCR = new K.Chart(CR.K, { x: 260, y: 370, w: 1400, h: 250 });
const CR_BOT = 9, CR_GX = crossAt(CR.macd, CR.sig, CR_BOT, 1);
const CR_X = []; for (let i = 26; i < CR.K.length; i++) { const d0 = CR.macd[i - 1] - CR.sig[i - 1], d1 = CR.macd[i] - CR.sig[i]; if (d0 * d1 < 0) CR_X.push(i - d1 / (d1 - d0)); }

// strategy 1: historical support → second test with bullish divergence → break of the down-leg high
const S1p = K.gen.path([104, 100.3, 114, 101, 117, 100.6, 106.2, 99.7, 104.5, 103.2], { per: [3, 5, 4, 5, 5, 4, 3, 4, 2], seed: 521, noise: .35, wick: .4 });
const S1K = [...S1p.candles, { o: 103.2, c: 108.6, h: 109.1, l: 103.0 }, ...K.gen.seq(108.6, [[1.2, .4, .3], [.9, .5, .3]])];
const S1_B = S1p.candles.length, S1_SW = S1p.swings, S1_HI = S1_SW[5].price;
const S1M = curve([[0, -.2], [S1_SW[0].i, -.5], [S1_SW[1].i, .8], [S1_SW[2].i, -.4], [S1_SW[3].i, .9], [S1_SW[4].i, -1], [S1_SW[5].i, .1], [S1_SW[6].i, -.45], [S1_SW[7].i, .2], [S1_B, .5], [S1K.length - 1, .8]], S1K.length);
const chS1 = new K.Chart(S1K, { x: 260, y: 360, w: 1400, h: 290 }, { lo: 97, hi: 119 });

// strategy 2: 1H resistance (support/resistance flip) + long upper wick → 5m bearish divergence → trend-line break
const S2Ap = K.gen.path([110, 104, 107.5, 100.5, 104.3], { per: [5, 3, 5, 4], seed: 531, noise: .35, wick: .4 });
const S2AK = [...S2Ap.candles, { o: 104.0, c: 103.5, h: 106.2, l: 103.2 }], S2A_W = S2AK.length - 1;
const chS2A = new K.Chart(S2AK, { x: 180, y: 430, w: 660, h: 330 }, { lo: 99.5, hi: 111 });
const S2Bp = K.gen.path([100, 102.6, 101.5, 104.0, 102.8, 104.5, 103.2, 103.7, 101.6, 102.1, 100.6], { per: [3, 2, 3, 2, 3, 2, 1, 3, 1, 2], seed: 541, noise: .3, wick: .35 });
const S2BK = S2Bp.candles, S2B_SW = S2Bp.swings, S2B_TL = railOf(S2B_SW[1], S2B_SW[5]), S2B_BRK = S2B_SW[6].i + 1;
const S2BM = curve([[0, 0], [S2B_SW[0].i, .45], [S2B_SW[1].i, .05], [S2B_SW[2].i, .9], [S2B_SW[3].i, .2], [S2B_SW[4].i, .5], [S2B_SW[5].i, .1], [S2B_SW[6].i, .2], [S2B_SW[7].i, -.7], [S2BK.length - 1, -.9]], S2BK.length);
const chS2B = new K.Chart(S2BK, { x: 1060, y: 410, w: 680, h: 220 }, { lo: 99.5, hi: 105.5 });

// strategy 3: 4H resistance-turned-support + continuation divergence, 15m continuation divergence + down-trend-line break
const S3Ap = K.gen.path([100, 110, 104, 110.2, 105.5, 116.5, 110.6], { per: [4, 3, 3, 3, 4, 3], seed: 551, noise: .35, wick: .4 });
const S3AK = [...S3Ap.candles, { o: 110.8, c: 115.6, h: 116.0, l: 110.5 }], S3A_B = S3AK.length - 1, S3A_SW = S3Ap.swings;
const S3AM = curve([[0, .1], [S3A_SW[0].i, .7], [S3A_SW[1].i, -.2], [S3A_SW[2].i, .5], [S3A_SW[3].i, -.35], [S3A_SW[4].i, .9], [S3A_SW[5].i, -.65], [S3A_B, .2]], S3AK.length);
const chS3A = new K.Chart(S3AK, { x: 180, y: 410, w: 660, h: 220 }, { lo: 98, hi: 118.5 });
const S3Bp = K.gen.path([116.5, 113.6, 114.8, 111.4, 112.8, 111.9, 112.3], { per: [3, 2, 3, 2, 2, 1], seed: 561, noise: .3, wick: .35 });
const S3BK = [...S3Bp.candles, { o: 112.3, c: 115.4, h: 115.7, l: 112.1 }], S3B_B = S3BK.length - 1, S3B_SW = S3Bp.swings, S3B_TL = railOf(S3B_SW[1], S3B_SW[3]);
const S3BM = curve([[0, .3], [S3B_SW[0].i, -.3], [S3B_SW[1].i, .05], [S3B_SW[2].i, -.5], [S3B_SW[3].i, -.05], [S3B_SW[4].i, -.8], [S3B_SW[5].i, -.3], [S3B_B, .5]], S3BK.length);
const chS3B = new K.Chart(S3BK, { x: 1060, y: 410, w: 680, h: 220 }, { lo: 110.2, hi: 117.5 });

/** simple MACD-style histogram (示意) for a strategy chart */
function histPanel(ctx, ch, M, y0, h, rv, a = 1) {
  K.line(ctx, ch.box.x, y0 + h / 2, ch.box.x + ch.box.w, y0 + h / 2, { color: C.dim, width: 1, alpha: a });
  K.text(ctx, 'MACD（示意）', ch.box.x, y0 - 6, { font: F.serif(700, 14), color: C.gray, alpha: a });
  for (let i = 0; i < M.length && i < Math.ceil(rv); i++) { const g = clamp(rv - i), v = M[i];
    ctx.save(); ctx.globalAlpha = a * .8 * easeOut(g); ctx.fillStyle = v >= 0 ? C.red : C.green; ctx.fillRect(ch.x(i) - ch.cw * .35, Math.min(y0 + h / 2, y0 + h / 2 - v * h / 2 * easeOut(g)), ch.cw * .7, Math.abs(v * h / 2 * easeOut(g))); ctx.restore(); }
  return i => y0 + h / 2 - M[i] * h / 2 + (M[i] >= 0 ? -8 : 8);
}
/** gear outline */
function gear(ctx, x, y, r, rot, a, col = Y) {
  if (a <= .002) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 16;
  ctx.beginPath(); for (let k = 0; k < 24; k++) { const ang = k / 24 * Math.PI * 2, rr = k % 2 ? r : r * 1.22; ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * .4, 0, 6.2832); ctx.stroke(); ctx.restore();
}
const panelTitle = (ctx, str, x, y, a, col = C.gray) => K.text(ctx, str, x, y, { font: F.serif(900, 20), color: col, alpha: a });

window.FILM = {
  title: 'MACD终极指南',
  transition: 1.2,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },
  scenes: [

  /* ================= 0:00 HOOK ================= */
  { id: 'hook', dur: 6.0, camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, hit = .3;
      const [sx, sy] = shake(t, hit, 18, 5), p = clamp((t - .05) / .3), s = lerp(2.2, 1, easeOut(p));
      ctx.save(); ctx.translate(960 + sx, 470 + sy); ctx.scale(s, s);
      ctx.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '金叉买、死叉卖？', 0, 0, { font: F.serif(900, 56), color: mix(C.white, C.gray, S.p(1.3, .6)), align: 'center', alpha: p, glow: .5, glowColor: Y, spacing: 4 });
      ctx.restore();
      const q = clamp((t - 1.3) / .3), s2 = lerp(2.2, 1, easeOut(q)), [qx, qy] = shake(t, 1.55, 16, 5);
      ctx.save(); ctx.translate(960 + qx, 610 + qy); ctx.scale(s2, s2);
      ctx.filter = q < 1 ? `blur(${((1 - q) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '这是 MACD 最大的误区。', 0, 0, { font: F.serif(900, 48), color: C.white, align: 'center', alpha: q, glow: .7, glowColor: C.green, spacing: 3 });
      ctx.restore();
      flash(ctx, 960, 470, (t > hit ? 1 : 0) * clamp(1 - (t - hit) / .5), 600, '#FFFFFF');
    } },

  /* ================= 0:06 ANATOMY ================= */
  { id: 'anatomy', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.03, z1: 1.0 }, ...BOT, pre: 3.4,
    lines: [{ s: 'MACD：指数平滑{异同移动平均线}', d: 3.5 }, { s: '核心：判断趋势的{转变或延续}', d: 3.8 }],
    visual(ctx, S) {
      const c = chMA, rv = MA.K.length * smooth(S.lin(0, -3.2, 4.2)), mp = Math.min(rv / MA.K.length + .02, 1);
      drawChart(ctx, c, rv, { dim: () => .55 });
      maLine(ctx, c, MA.e12, 0, MA.K.length - 1, mp, { color: '#F4F0E8', width: 2.6, head: false });
      maLine(ctx, c, MA.e26, 0, MA.K.length - 1, mp, { color: C.gold, width: 2.6, head: false });
      const la = S.p(3.4, .8), xr = c.box.x + c.box.w + 14, last = MA.K.length - 1;
      K.text(ctx, '快线 EMA12', xr, c.y(MA.e12[last]) - 4, { font: F.serif(700, 16), color: '#F4F0E8', alpha: la });
      K.text(ctx, '慢线 EMA26', xr, c.y(MA.e26[last]) + 26, { font: F.serif(700, 16), color: C.gold, alpha: la });
      macdPanel(ctx, c, MA, 525, 200, rv, S.p(.6, .8));
      const lb = S.p(4.2, .8);
      [['白线：MACD（快线 − 慢线）', '#F4F0E8', 560], ['金线：信号线 9', C.gold, 960], ['柱状图：两线之差', C.red, 1330]].forEach(([str, col, x], j) =>
        K.text(ctx, str, x, 768, { font: F.serif(900, 18), color: col, align: 'center', alpha: S.p(4.2 + j * .4, .8) }));
    } },

  /* ================= 0:16.7 LIGHTNING TITLE ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 }, ...BOT, pre: 4.6,
    lines: [{ s: '没有任何指标的胜率是 {100%}', d: 2.8 }, { s: '先用{价格行为}定方向，再用指标辅助', d: 2.9 }],
    visual(ctx, S) {
      const t = S.t, z = .15;
      const R = K.rng(59), pts = []; let x = -60, y = 220, up = 1;
      while (x < 1980) { pts.push([x, y]); x += 70 + R() * 70; y += up * (50 + R() * 80) + 10; up = -up; }
      const bp = clamp((t - z) / .22), fade = clamp(1 - (t - z - .25) / .9);
      if (bp > 0 && fade > 0) { poly(ctx, pts, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false }); poly(ctx, pts, bp, { color: C.goldHi, width: 14, blur: 60, alpha: fade * .35, head: false }); flash(ctx, 960, 360, fade, 1100, C.goldHi); }
      const tp = S.p(z + .35, 1.2, K.expo);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 220, 1920, 150); ctx.clip();
      K.goldText(ctx, 'MACD终极指南', 960, 340 + (1 - tp) * 120, 58, { spacing: 14, alpha: tp });
      ctx.restore();
      // main and auxiliary: price action first, the indicator second
      [['价格行为', 'PRICE ACTION · 主', 760, C.goldHi, 1.4], ['MACD', '辅助工具 · 提高胜率', 1160, C.gray, 1.8]].forEach(([t1, t2, cx, col, t0], j) => {
        const a = S.p(t0, .7, easeBack); if (a <= 0) return;
        frame(ctx, cx - 170, 470 + (1 - clamp(a)) * 30, 340, 200, clamp(a), j ? .2 : .8, j ? C.gray : C.gold);
        K.text(ctx, t1, cx, 570 + (1 - clamp(a)) * 30, { font: F.serif(900, j ? 34 : 38), color: col, align: 'center', alpha: clamp(a) });
        K.text(ctx, t2, cx, 630 + (1 - clamp(a)) * 30, { font: F.serif(700, 16), color: C.gray, align: 'center', alpha: clamp(a), spacing: 2 });
      });
      K.arrow(ctx, 940, 570, 978, 570, { p: S.p(2.2, .5), color: C.goldHi, width: 2.4, head: 12 });
    } },

  /* ================= 壹 · WHY NOT THE CROSSES ================= */
  { id: 'ch1', dur: 3.6, tr: 'sweep', visual: chapter('壹', 1, '摒弃传统用法', 'Why Not the Crosses', '严重滞后 · 假信号频繁') },

  { id: 'cross', header: H1, dur: 18.6, tr: ['iris', [960, 560]], camera: { z0: 1.0, z1: 1.03, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '传统用法：快线上穿=[金叉]，下穿=<死叉>', d: 6.0 }, { s: '缺陷一：{严重滞后}，交叉时已走一大截', d: 6.0 }, { s: '缺陷二：震荡市{假信号}频繁，反复止损', d: 6.0 }],
    visual(ctx, S) {
      const c = chCR, rv = (CR_GX + 2) * smooth(S.lin(0, 0, 5.4)) + (CR.K.length - CR_GX - 2) * smooth(S.lin(2, 0, 3.6));
      drawChart(ctx, c, rv, { dim: () => .8 });
      macdPanel(ctx, c, CR, 650, 170, rv, S.at(0, 0, .8));
      const gx = c.x(CR_GX), gA = S.at(0, 4.6, .6);
      const yM = 650 + 85 - at(CR.macd, CR_GX) / (Math.max(...CR.macd.map(Math.abs), ...CR.sig.map(Math.abs)) * 1.15) * 85;
      if (gA > 0) { ring(ctx, gx, yM, (S.t - S.beat(0) - 4.6) / 1.1, C.red, 90); K.text(ctx, '金叉', gx, 858, { font: F.serif(900, 20), color: C.red, align: 'center', alpha: gA }); }
      // the lag: from the real bottom to the cross, price already ran
      const lA = S.at(1, .3, .8) * (1 - S.at(2, 0, .6)), bx = c.x(CR_BOT);
      K.dash(ctx, bx, c.y(CR.K[CR_BOT].l) + 18, bx, 820, { p: lA, color: C.gray, width: 1.4 });
      K.dash(ctx, gx, c.y(CR.K[Math.round(CR_GX)].c), gx, 820, { p: lA, color: C.gray, width: 1.4 });
      K.bracket(ctx, bx, gx, c.y(CR.K[CR_BOT].l) + 54, '', { p: lA, up: false, color: Y });
      tagAt(ctx, (bx + gx) / 2, c.y(CR.K[CR_BOT].l) + 90, '滞后：行情已走一大截', { alpha: S.at(1, 1.0, .6, easeBack) * (1 - S.at(2, 0, .6)), color: Y, font: F.serif(900, 20) });
      // chop: crosses everywhere
      CR_X.forEach((xi, k) => { const a = S.at(2, 1.2 + k * .2, .4); if (a <= 0) return; const x = c.x(xi);
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = Y; ctx.lineWidth = 3; ctx.shadowColor = Y; ctx.shadowBlur = 12; const r = 10;
        ctx.beginPath(); ctx.moveTo(x - r, 705 - r); ctx.lineTo(x + r, 705 + r); ctx.moveTo(x + r, 705 - r); ctx.lineTo(x - r, 705 + r); ctx.stroke(); ctx.restore(); });
      tagAt(ctx, c.x(CR.K.length - 9), c.box.y + 6, '金叉死叉频繁交织', { alpha: S.at(2, 2.6, .6, easeBack), color: Y, font: F.serif(900, 20) });
    } },

  /* ================= 贰 · THE FOUR DIVERGENCES ================= */
  { id: 'ch2', dur: 3.6, tr: 'sweep', visual: chapter('贰', 2, '四大背离形态', 'Four Divergences', '唯一且最强大的真正用法') },
  divScene('div1', H2, DIV.top, DIV.bot, [{ s: '顶背离：价格新高，MACD波峰却{走低}', d: 6.2 }, { s: '底背离：价格新低，MACD波谷却[抬高]', d: 6.2 }], 13.0, ['iris', [960, 600]]),
  divScene('div2', H3, DIV.cont, DIV.contDn, [{ s: '上升延续：低点抬高，MACD却<创新低>', d: 6.2 }, { s: '下跌延续：高点降低，MACD却[反常新高]', d: 6.2 }], 13.0),

  /* ================= 叁 · THREE STRATEGIES (quiet section → the break of the high on the return) ================= */
  { id: 'ch3', dur: 3.6, tr: 'sweep', visual: chapter('叁', 3, '职业交易员共振天条', 'Three Confluence Strategies', '关键位 · 多周期 · 双重背离') },

  { id: 's1', header: HS1, dur: 27.4, tr: ['iris', [960, 520]], camera: { z0: 1.0, z1: 1.03, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '策略一·找位：画出{历史关键支撑}', d: 6.4 }, { s: '看背离：回到支撑，走出MACD{底背离}', d: 6.8 }, { s: '等破坏：画出前高横线，<决不直接开仓>', d: 7.0 }, { s: '[强力涨破前高]——高胜率入场点', d: 6.6 }],
    visual(ctx, S) {
      const c = chS1, tE = S.beat(3);
      const L1 = S1_SW[4].i + 1, L2 = S1_SW[6].i + 1;
      const r0 = L1 * smooth(S.lin(0, 0, 5.4)), r1 = (L2 - L1) * smooth(S.lin(1, 0, 3.0)), r2 = (S1_B - L2) * smooth(S.lin(2, .6, 5.2)), r3 = clamp((S.t - tE) / .45), r4 = 2 * smooth(clamp((S.t - tE - 1.2) / 2));
      const rv = r0 + (r0 >= L1 - 1e-6 ? r1 : 0) + (r1 >= L2 - L1 - 1e-6 ? r2 : 0) + (r2 >= S1_B - L2 - 1e-6 ? r3 : 0) + (r3 >= 1 ? r4 : 0);
      const [sx, sy] = shake(S.t, tE, 9, 5);
      ctx.save(); ctx.translate(sx, sy);
      const zA = S.at(0, 1.4, 1.0);
      if (zA > 0) { ctx.save(); ctx.globalAlpha = .13 * zA; ctx.fillStyle = C.red; ctx.fillRect(c.box.x, c.y(101.3), c.box.w * smooth(zA), c.y(99.4) - c.y(101.3)); ctx.restore();
        K.text(ctx, '历史关键支撑', c.box.x + c.box.w - 10, c.y(99.4) + 30, { font: F.serif(900, 18), color: C.red, align: 'right', alpha: zA }); }
      [S1_SW[0], S1_SW[2]].forEach((sw, k) => { const a = S.at(0, 2.4 + k * .5, .5) * (1 - S.at(2, 0, .6)); K.marker(ctx, c.x(sw.i), c.y(sw.price) + 4, { alpha: a, r: 11, color: C.red });
        K.arrow(ctx, c.x(sw.i) + 22, c.y(sw.price) - 10, c.x(sw.i) + 64, c.y(sw.price) - 90, { p: a, color: C.red, width: 2.4, head: 12 }); });
      const hA = S.at(2, .4, 1.0);
      K.dash(ctx, c.x(S1_SW[5].i), c.y(S1_HI), c.box.x + c.box.w, c.y(S1_HI), { p: hA, color: Y, width: 2 });
      K.text(ctx, '下跌前高', c.x(S1_SW[5].i) + 10, c.y(S1_HI) - 12, { font: F.serif(900, 18), color: Y, alpha: hA });
      drawChart(ctx, c, rv, { dim: i => i === S1_B ? 1 : .8 });
      const yM = histPanel(ctx, c, S1M, 690, 130, rv, S.at(0, .2, .8));
      // the divergence: lower low on price, higher low on MACD
      const dA = smooth(S.lin(1, 3.2, 1.0)), p1 = [c.x(S1_SW[4].i), c.y(S1_SW[4].price) + 14], p2 = [c.x(S1_SW[6].i), c.y(S1_SW[6].price) + 14];
      poly(ctx, [p1, p2], dA, { color: C.green, width: 2.6, dash: [8, 6], blur: 8, head: false });
      poly(ctx, [[p1[0], yM(S1_SW[4].i)], [p2[0], yM(S1_SW[6].i)]], dA, { color: Y, width: 2.6, dash: [8, 6], blur: 8, head: false });
      callout(ctx, '【 MACD 底背离 】', (p1[0] + p2[0]) / 2 + 10, 838, S.at(1, 3.8, .5) * (1 - S.at(2, 0, .5)), S.t - S.beat(1) - 3.8, { size: 22, color: Y, spacing: 2 });
      tagAt(ctx, c.x(S1_B - 3), c.box.y + 30, '决不直接开仓：等结构破坏', { alpha: S.at(2, 1.6, .6, easeBack) * (1 - S.at(3, 0, .5)), color: Y, font: F.serif(900, 20) });
      // the break of the high
      const ex = c.x(S1_B), eC = c.y(S1K[S1_B].c);
      flash(ctx, ex, c.y(S1_HI), (S.t >= tE ? 1 : 0) * clamp(1 - (S.t - tE) / 1.3), 440, C.red);
      ring(ctx, ex, c.y(S1_HI), (S.t - tE) / 1.2, Y, 260);
      const ra = S.at(3, .9, .7);
      reticle(ctx, ex, eC, ra, S.t, Y);
      tagAt(ctx, ex - 40, eC - 64, '趋势破坏 · 入场点', { alpha: ra, color: Y, font: F.serif(900, 22) });
      ctx.restore();
    } },

  { id: 's2', header: HS2, dur: 21.4, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '策略二·大周期：1小时图锁定{关键阻力}', d: 5.2 }, { s: '价格行为：长上影线，{上涨动能衰竭}', d: 5.2 }, { s: '切入5分钟：阻力区精准走出{顶背离}', d: 5.2 }, { s: '跌破上升趋势线，<果断开仓做空>', d: 5.2 }],
    visual(ctx, S) {
      K.line(ctx, 950, 390, 950, 390 + 430 * smooth(S.at(0, 0, 1.0)), { color: C.gold, width: 1.2, glow: .5, alpha: .5 });
      // 1H
      const a = chS2A, ra = S2AK.length * smooth(S.lin(0, 0, 3.4)), hiA = S.after(2) ? .55 : 1;
      panelTitle(ctx, '1 小时图 · 大周期', a.box.x, 392, S.at(0, 0, .6));
      const zA = S.at(0, 2.4, .8);
      if (zA > 0) { ctx.save(); ctx.globalAlpha = .14 * zA * hiA; ctx.fillStyle = C.green; ctx.fillRect(a.x(S2Ap.swings[0].i), a.y(104.9), a.box.x + a.box.w - a.x(S2Ap.swings[0].i), a.y(103.6) - a.y(104.9)); ctx.restore();
        K.text(ctx, '绿区：阻力（前低支撑互换）', a.box.x + a.box.w, 392, { font: F.serif(900, 16), color: C.green, align: 'right', alpha: zA * hiA }); }
      ctx.save(); ctx.globalAlpha = hiA; drawChart(ctx, a, ra, { dim: i => i === S2A_W ? 1 : .8, color: i => i === S2A_W ? Y : undefined }); ctx.restore();
      const wA = S.at(1, .4, .6);
      K.marker(ctx, a.x(S2A_W), a.y(S2AK[S2A_W].h) - 6, { alpha: wA * hiA, r: 13, color: Y, pulse: (S.t * .8) % 1 });
      tagAt(ctx, a.x(S2A_W) - 30, a.y(S2AK[S2A_W].h) - 84, '长上影线 · 动能衰竭', { side: 'left', alpha: S.at(1, 1.0, .6, easeBack) * hiA, color: Y, font: F.serif(900, 18) });
      // 5m
      const b = chS2B, tB = S.beat(3) + 1.0, rb = S2B_BRK * smooth(S.lin(2, 0, 3.6)) + (S2BK.length - S2B_BRK) * smooth(clamp((S.t - tB) / 2.2));
      panelTitle(ctx, '5 分钟图 · 小周期', b.box.x, 392, S.at(2, 0, .6), Y);
      drawChart(ctx, b, rb, { dim: () => .85 });
      const yM = histPanel(ctx, b, S2BM, 660, 110, rb, S.at(2, 0, .6));
      const dA = smooth(S.lin(2, 3.4, 1.0)) * (1 - S.at(3, 2.4, .5)), h1 = S2B_SW[2], h2 = S2B_SW[4];
      poly(ctx, [[b.x(h1.i), b.y(h1.price) - 12], [b.x(h2.i), b.y(h2.price) - 12]], dA, { color: C.red, width: 2.4, dash: [8, 6], blur: 8, head: false });
      poly(ctx, [[b.x(h1.i), yM(h1.i)], [b.x(h2.i), yM(h2.i)]], dA, { color: Y, width: 2.4, dash: [8, 6], blur: 8, head: false });
      K.text(ctx, '顶背离', b.x(h2.i) + 30, yM(h2.i) + 4, { font: F.serif(900, 18), color: Y, alpha: dA });
      const tl = S.at(3, 0, 1.0), i0 = S2B_SW[1].i, i1 = S2B_BRK + 2;
      K.line(ctx, b.x(i0), b.y(S2B_TL(i0)), b.x(i1), b.y(S2B_TL(i1)), { p: tl, color: C.red, width: 2.4, glow: .7 });
      flash(ctx, b.x(S2B_BRK), b.y(S2B_TL(S2B_BRK)), (S.t >= tB + .3 ? 1 : 0) * clamp(1 - (S.t - tB - .3) / 1.2), 260, C.green);
      ring(ctx, b.x(S2B_BRK), b.y(S2B_TL(S2B_BRK)), (S.t - tB - .3) / 1.1, C.green, 140);
      const ra2 = S.at(3, 3.0, .6), li = S2BK.length - 1;
      reticle(ctx, b.x(li), b.y(S2BK[li].c), ra2, S.t, Y);
      tagAt(ctx, b.x(li) - 46, 646, '底底低 · 开仓做空', { side: 'left', alpha: ra2, color: C.green, font: F.serif(900, 18) });
    } },

  { id: 's3', header: HS3, dur: 16.8, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '策略三·4小时：阻力变支撑，{延续背离}', d: 5.4 }, { s: '15分钟同步走出{延续背离}', d: 5.4 }, { s: '突破下跌趋势线——[双周期共振引爆]', d: 5.4 }],
    visual(ctx, S) {
      const tX = S.beat(2) + .8;
      K.line(ctx, 950, 390, 950, 390 + 430 * smooth(S.at(0, 0, 1.0)), { color: C.gold, width: 1.2, glow: .5, alpha: .5 });
      // 4H
      const a = chS3A, ra = S3A_B * smooth(S.lin(0, 0, 3.4)) + clamp((S.t - tX) / .45);
      panelTitle(ctx, '4 小时图 · 大周期', a.box.x, 392, S.at(0, 0, .6));
      const zA = S.at(0, 1.6, .8);
      if (zA > 0) { ctx.save(); ctx.globalAlpha = .13 * zA; ctx.fillStyle = C.red; ctx.fillRect(a.box.x, a.y(110.8), a.box.w, a.y(109.4) - a.y(110.8)); ctx.restore();
        K.text(ctx, '红区：阻力变支撑', a.box.x + a.box.w, 392, { font: F.serif(900, 16), color: C.red, align: 'right', alpha: zA }); }
      drawChart(ctx, a, ra, { dim: i => i === S3A_B ? 1 : .8 });
      const yA = histPanel(ctx, a, S3AM, 660, 110, ra, S.at(0, 0, .6));
      const dA = smooth(S.lin(0, 3.4, 1.0)), l1 = S3A_SW[3], l2 = S3A_SW[5];
      poly(ctx, [[a.x(l1.i), a.y(l1.price) + 14], [a.x(l2.i), a.y(l2.price) + 14]], dA, { color: C.red, width: 2.4, dash: [8, 6], blur: 8, head: false });
      poly(ctx, [[a.x(l1.i), yA(l1.i)], [a.x(l2.i), yA(l2.i)]], dA, { color: Y, width: 2.4, dash: [8, 6], blur: 8, head: false });
      K.text(ctx, '延续背离', a.x(l2.i) - 20, yA(l2.i) + 34, { font: F.serif(900, 16), color: Y, align: 'right', alpha: dA });
      // 15m
      const b = chS3B, rb = S3B_B * smooth(S.lin(1, 0, 3.4)) + clamp((S.t - tX) / .45);
      panelTitle(ctx, '15 分钟图 · 小周期', b.box.x, 392, S.at(1, 0, .6), Y);
      drawChart(ctx, b, rb, { dim: i => i === S3B_B ? 1 : .8 });
      const yB = histPanel(ctx, b, S3BM, 660, 110, rb, S.at(1, 0, .6));
      const dB = smooth(S.lin(1, 3.4, 1.0)), m1 = S3B_SW[2], m2 = S3B_SW[4];
      poly(ctx, [[b.x(m1.i), b.y(m1.price) + 14], [b.x(m2.i), b.y(m2.price) + 14]], dB, { color: C.red, width: 2.4, dash: [8, 6], blur: 8, head: false });
      poly(ctx, [[b.x(m1.i), yB(m1.i)], [b.x(m2.i), yB(m2.i)]], dB, { color: Y, width: 2.4, dash: [8, 6], blur: 8, head: false });
      const tl = S.at(2, 0, .8), j0 = S3B_SW[0].i, j1 = S3B_B;
      K.line(ctx, b.x(j0), b.y(S3B_TL(j0)), b.x(j1), b.y(S3B_TL(j1)), { p: tl, color: C.green, width: 2.4, glow: .7 });
      // ignition: one bar confirms both timeframes
      [[a, S3A_B], [b, S3B_B]].forEach(([ch, i]) => { flash(ctx, ch.x(i), ch.y(ch.k[i].c), (S.t >= tX ? 1 : 0) * clamp(1 - (S.t - tX) / 1.3), 300, C.red); ring(ctx, ch.x(i), ch.y(ch.k[i].o), (S.t - tX) / 1.2, Y, 170); });
      const gA = S.at(2, 1.2, .6);
      gear(ctx, 950, 560, 34, S.t * 2.4 * gA, gA); gear(ctx, 950, 640, 22, -S.t * 3.7 * gA, gA, C.red);
      tagAt(ctx, 950, 880, '双周期共振 · 黄金引爆点', { alpha: S.at(2, 1.6, .6, easeBack), color: Y, font: F.serif(900, 22) });
    } },

  /* ================= 2:28 FINALE — short and fast ================= */
  { id: 'phil', dur: 10.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    visual(ctx, S) {
      const t = S.t;
      const ebb = smooth(clamp(t / 1.2));
      if (ebb < 1) { ctx.save(); ctx.globalAlpha = 1 - ebb; ctx.translate(0, 200 * ebb * ebb);
        for (let i = 0; i < 40; i++) { const v = Math.sin(i * .45) * 80 + Math.sin(i * 1.3) * 30; ctx.fillStyle = v >= 0 ? C.red : C.green; ctx.globalAlpha = (1 - ebb) * .6; ctx.fillRect(200 + i * 38, 560 - Math.max(v, 0), 20, Math.abs(v)); }
        ctx.restore(); }
      ctx.save(); ctx.fillStyle = `rgba(2,2,3,${(.9 * smooth(clamp((t - .4) / 1.1))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
      const rows = [['没有任何指标的胜率是 100%。', 400, 1.2, 38], ['先看价格行为，再用 MACD 确认。', 510, 2.8, 38], ['关键位 + 背离 + 结构破坏', 680, 4.6, 52]];
      rows.forEach(([str, y, t0, sz], j) => {
        const u = smooth(clamp((t - t0) / .6)); if (u <= .002) return;
        const [sx, sy] = shake(t, t0, j === 2 ? 15 : 6, 6);
        ctx.save(); ctx.translate(960 + sx, y - 20 + sy); const s = lerp(1.3, 1, u); ctx.scale(s, s); ctx.translate(-960, -(y - 20));
        ctx.filter = u < 1 ? `blur(${((1 - u) * 9).toFixed(1)}px)` : 'none';
        K.goldText(ctx, str, 960, y, sz, { alpha: u, glow: j === 2 ? 1.2 : .9, spacing: j === 2 ? 6 : 3 });
        ctx.restore();
        ring(ctx, 960, y - 20, (t - t0) / 1.2, C.goldHi, j === 2 ? 900 : 500);
      });
      if (t > 4.6) K.rule(ctx, 960, 590, 300, S.p(4.8, .8), { alpha: .7 });
    } },

  /* ================= END CARD ================= */
  { id: 'end', dur: 5.0, tr: 'zoom', noWatermark: true,
    visual(ctx, S) {
      const a = S.p(.1, .9);
      ctx.save(); ctx.translate(960, 470); const z = lerp(.92, 1, easeOut(S.t / 1.6)); ctx.scale(z, z);
      const L = document.getElementById('logo'), lw = 760, lh = lw * L.naturalHeight / L.naturalWidth;   // the channel's own logo
      ctx.globalAlpha = a; ctx.shadowColor = rgba(C.goldHi, .35); ctx.shadowBlur = 40;
      ctx.drawImage(L, -lw / 2, -lh / 2, lw, lh); ctx.shadowBlur = 0;
      const sw = clamp((S.t - .8) / 1.2);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.beginPath(); ctx.rect(-lw / 2, -lh / 2, lw, lh); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(-lw / 2 - 120, lw / 2 + 120, sw), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        g.addColorStop(0, 'rgba(255,236,190,0)'); g.addColorStop(.5, 'rgba(255,236,190,.22)'); g.addColorStop(1, 'rgba(255,236,190,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, -lh / 2, 180, lh); ctx.restore();
      }
      ctx.restore();
      K.rule(ctx, 960, 560, 340, S.p(.6, 1.2));
      K.text(ctx, 'MACD终极指南', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(.9, .9) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.2, .9) });
    } },
  ],
};
})();

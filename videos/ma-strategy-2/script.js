/* ============================================================
   《均线策略（二）》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py + sfx.json)

   Clock pinned to the music: the drop at 16.7 s is the lightning title, the quiet
   section (85.3–103.2 s) builds the RSI divergence and the death cross, and the
   track's return at 103.2 s is the bearish engulfing bar — the confluence short.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const Y = '#FFD34D';                                               // core hint / target: yellow

const H0 = { label: '引入', sub: '重新定义金叉与死叉', en: 'Crosses, Redefined', zh: '《均线策略 · 二》' };
const HC = { label: '密码', num: 1, sub: '交叉背后的筹码洗牌', en: 'Behind the Cross', zh: '《进阶密码》' };
const HR = { label: '密码', num: 2, sub: '高质量交叉的三大铁律', en: 'Three Iron Rules', zh: '《进阶密码》' };
const HV = { label: '共振', num: 1, sub: '高位反转 · RSI 顶背离', en: 'Reversal Confluence', zh: '《交叉 + RSI》' };
const HT = { label: '共振', num: 2, sub: '趋势延续 · RSI 延续背离', en: 'Continuation Confluence', zh: '《交叉 + RSI》' };
const TOP = { subX: 960, subY: 275, subAlign: 'center' };      // chart scenes: one subtitle line above the chart, never over it
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

/* ---------------- data ---------------- */
// death cross: a long, large rally — then the short average falls through the long one
const DCp = K.gen.path([100, 138, 131, 137, 121, 126, 112, 116, 108], { per: [16, 3, 3, 5, 2, 4, 2, 3], seed: 191, noise: .4, wick: .45 });
const DCK = DCp.candles, DCS = sma(DCK, 5), DCL = sma(DCK, 14);
const chDC = new K.Chart(DCK, { x: 260, y: 370, w: 1400, h: 430 }, { lo: 96, hi: 142 });
const DC_X = crossAt(DCS, DCL, 18, -1);
// golden cross: a long base, then the short average stabs up through the long one
const GCp = K.gen.path([132, 106, 111, 104, 109.5, 105, 110, 106.5, 118, 114, 127], { per: [10, 3, 4, 3, 4, 3, 4, 4, 2, 4], seed: 201, noise: .4, wick: .45 });
const GCK = GCp.candles, GCS = sma(GCK, 5), GCL = sma(GCK, 14);
const chGC = new K.Chart(GCK, { x: 260, y: 370, w: 1400, h: 430 }, { lo: 100, hi: 134 });
const GC_X = crossAt(GCS, GCL, 18, 1);

// reversal confluence: higher high on price, lower high on RSI → death cross + break of the prior low → weak pullback → engulfing
const RVp = K.gen.path([100, 118, 110, 121.5, 113, 115.5, 106, 109.6], { per: [9, 4, 5, 4, 2, 3, 3], seed: 211, noise: .3, wick: .4 });
const RVK = [...RVp.candles, { o: 109.9, c: 104.2, h: 110.4, l: 103.8 }, ...K.gen.seq(104.2, [[-1.4, .3, .5], [.5, .5, .4], [-1.2, .3, .5]])];
const RV_E = RVp.candles.length, RV_H1 = RVp.swings[0], RV_H2 = RVp.swings[2], RV_L = RVp.swings[1];
const RVS = sma(RVK, 4), RVL = sma(RVK, 10), RV_X = crossAt(RVS, RVL, 18, -1);
const RVR = curve([[0, 50], [RV_H1.i, 79], [RV_L.i, 50], [RV_H2.i, 64], [RV_H2.i + 4, 40], [RV_H2.i + 6, 47], [RV_E - 4, 27], [RV_E - 1, 41], [RV_E, 24], [RVK.length - 1, 20]], RVK.length);
const chRV = new K.Chart(RVK, { x: 260, y: 360, w: 1400, h: 330 }, { lo: 101, hi: 124 });

// continuation: bearish alignment; a lower high on price while RSI prints a higher high (a weak, false bounce)
const CTp = K.gen.path([132, 113, 120.5, 106, 112.6], { per: [8, 4, 7, 5], seed: 221, noise: .3, wick: .4 });
const CTK = [...CTp.candles, { o: 112.6, c: 106.4, h: 113.0, l: 106.0 }, ...K.gen.seq(106.4, [[-1.6, .3, .5], [.6, .5, .4], [-1.8, .3, .5], [-1.2, .3, .4]])];
const CT_E = CTp.candles.length, CT_H1 = CTp.swings[1], CT_H2 = CTp.swings[3];
const CTL = curve([[0, 136], [CT_H1.i, 123.6], [CT_H2.i, 113.4], [CTK.length - 1, 108.5]], CTK.length);   // long MA (示意): the ceiling the bounce hits
const CTS = curve([[0, 133], [CT_H1.i, 118.6], [CT_H2.i - 2, 109.4], [CT_H2.i, 110.8], [CTK.length - 1, 104]], CTK.length);
const CTR = curve([[0, 40], [CT_H1 ? CT_H1.i - 4 : 4, 22], [CT_H1.i, 50], [CT_H2.i - 5, 24], [CT_H2.i, 62], [CT_E, 36], [CTK.length - 1, 26]], CTK.length);
const chCT = new K.Chart(CTK, { x: 260, y: 360, w: 1400, h: 330 }, { lo: 98, hi: 138 });

window.FILM = {
  title: '均线策略（二）',
  transition: 1.2,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },
  scenes: [

  /* ================= 0:00 HOOK — the jam ================= */
  { id: 'hook', dur: 6.0, camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, cx = 960, cy = 480, hit = .3;
      const [sx, sy] = shake(t, hit, 18, 5);
      const p = clamp((t - .05) / .3), s = lerp(2.2, 1, easeOut(p));
      ctx.save(); ctx.translate(cx + sx, cy + sy); ctx.scale(s, s);
      ctx.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '为什么你看见金叉买入，', 0, -24, { font: F.serif(900, 52), color: C.white, align: 'center', alpha: p, glow: .5, glowColor: C.red, spacing: 3 });
      K.text(ctx, '却总买在最高点？', 0, 76, { font: F.serif(900, 52), color: C.white, align: 'center', alpha: p, glow: .65, glowColor: C.green, spacing: 3 });
      ctx.restore();
      flash(ctx, cx, cy, (t > hit ? 1 : 0) * clamp(1 - (t - hit) / .5), 500, '#FFFFFF');
      // a dud round: the hammer falls, nothing fires
      const d = S.p(1.2, .6, easeBack);
      ctx.save(); ctx.globalAlpha = clamp(d) * .8; ctx.strokeStyle = C.gray; ctx.lineWidth = 2; ctx.translate(cx, 690);
      ctx.beginPath(); ctx.roundRect(-60, -14, 120, 28, 8); ctx.stroke(); ctx.beginPath(); ctx.arc(-60, 0, 14, Math.PI / 2, Math.PI * 1.5); ctx.stroke(); ctx.restore();
      K.text(ctx, 'MISFIRE', cx, 750, { font: F.latin(500, 18), color: C.gray, align: 'center', spacing: 12, alpha: S.p(1.6, 1) });
    } },

  /* ================= 0:06 THE TWO LINES ================= */
  { id: 'cross', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.02, z1: 1.0 }, ...BOT, pre: 5.6,
    lines: [{ s: '死记硬背交叉去交易，就是给市场{送钱}', d: 4.6 }],
    visual(ctx, S) {
      const N = 90, x0 = 200, x1 = 1720, yb = 500;
      const L = Array.from({ length: N }, (_, i) => Math.sin(i / N * 5.2) * 60), Sv = Array.from({ length: N }, (_, i) => Math.sin(i / N * 5.2 + .9) * 140);
      const p = smooth(S.lin(0, -5.2, 4.6)), n = Math.floor(p * (N - 1));
      const xs = i => lerp(x0, x1, i / (N - 1));
      const pL = L.slice(0, n + 1).map((v, i) => [xs(i), yb - v]);
      poly(ctx, pL, 1, { color: C.gray, width: 4, blur: 12, head: false });
      for (let i = 0; i < n; i++) { const up = Sv[i] >= L[i]; K.line(ctx, xs(i), yb - Sv[i], xs(i + 1), yb - Sv[i + 1], { color: up ? C.red : C.green, width: 5, glow: .9 }); }
      // each crossing pulses and is named
      for (let i = 1; i < n; i++) {
        const d0 = Sv[i - 1] - L[i - 1], d1 = Sv[i] - L[i]; if (d0 * d1 >= 0) continue;
        const gold = d1 > 0, x = xs(i), y = yb - L[i], age = (n - i) / (N * .12);
        ring(ctx, x, y, clamp(age), gold ? C.red : C.green, 90);
        K.text(ctx, gold ? '金叉' : '死叉', x, y + (gold ? 70 : -50), { font: F.serif(900, 24), color: gold ? C.red : C.green, align: 'center', alpha: clamp(age * 3), glow: .6, glowColor: gold ? C.red : C.green });
      }
      K.text(ctx, '长期均线', x0, yb - L[0] + 46, { font: F.serif(700, 18), color: C.gray, alpha: S.p(.6, .8) });
    } },

  /* ================= 0:16.7 LIGHTNING TITLE + THE TWO ALARMS ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 }, ...BOT, pre: 6.4,
    lines: [{ s: '交叉不是信号，是主力的{“筹码换手密码”}', d: 3.6 }],
    visual(ctx, S) {
      const t = S.t, z = .15;
      const R = K.rng(33), pts = []; let x = -60, y = 220, up = 1;
      while (x < 1980) { pts.push([x, y]); x += 70 + R() * 70; y += up * (50 + R() * 80) + 10; up = -up; }
      const bp = clamp((t - z) / .22), fade = clamp(1 - (t - z - .25) / .9);
      if (bp > 0 && fade > 0) { poly(ctx, pts, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false }); poly(ctx, pts, bp, { color: C.goldHi, width: 14, blur: 60, alpha: fade * .35, head: false }); flash(ctx, 960, 360, fade, 1100, C.goldHi); }
      const tp = S.p(z + .35, 1.2, K.expo);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 220, 1920, 150); ctx.clip();
      K.goldText(ctx, '均线策略（二）', 960, 340 + (1 - tp) * 120, 58, { spacing: 14, alpha: tp });
      ctx.restore();
      // the two alarm lamps
      [[640, C.red, '多数持仓者开始盈利'], [1280, C.green, '多数持仓者开始亏损']].forEach(([lx, col, cap], j) => {
        const a = S.p(1.4 + j * .3, .8, easeBack), pulse = .55 + .45 * Math.sin(t * 6 + j * Math.PI);
        if (a <= 0) return;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createRadialGradient(lx, 520, 0, lx, 520, 220); g.addColorStop(0, rgba(col, .45 * pulse * clamp(a))); g.addColorStop(1, rgba(col, 0)); ctx.fillStyle = g; ctx.fillRect(lx - 220, 300, 440, 440); ctx.restore();
        ctx.save(); ctx.globalAlpha = clamp(a); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 40 * pulse; ctx.beginPath(); ctx.arc(lx, 520, 62, Math.PI, 0); ctx.lineTo(lx + 62, 560); ctx.lineTo(lx - 62, 560); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.gray; ctx.fillRect(lx - 80, 560, 160, 18); ctx.restore();
        K.text(ctx, j ? '死叉' : '金叉', lx, 628, { font: F.serif(900, 26), color: col, align: 'center', alpha: clamp(a) });
        K.text(ctx, cap, lx, 668, { font: F.serif(700, 19), color: C.white, align: 'center', alpha: clamp(a) });
      });
      const wa = S.p(3.2, .6, easeBack);
      tagAt(ctx, 960, 756, '警告：它不是开仓按钮，而是趋势警报灯！', { alpha: clamp(wa), color: Y, font: F.serif(900, 24) });
    } },

  /* ================= 壹 · BEHIND THE CROSS ================= */
  { id: 'ch1', dur: 3.6, tr: 'sweep', visual: chapter('壹', 1, '交叉背后的筹码洗牌', 'Behind the Cross', '死叉 · 金叉 · 高质量交叉的三大铁律') },

  { id: 'dcross', header: HC, dur: 14.0, tr: ['iris', [960, 580]], camera: { z0: 1.0, z1: 1.05, x1: -20 }, ...TOP, pre: .6,
    lines: [{ s: '死叉：长期大涨后，短均线{砸穿长均线}', d: 6.2 }, { s: '近期买入者{全部开始亏钱}——多头撤退', d: 6.6 }],
    visual(ctx, S) {
      const c = chDC, rv = DCK.length * smooth(S.lin(0, 0, 6.6));
      K.baseline(ctx, c.box.x, c.box.x + c.box.w, c.box.y + c.box.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .5 });
      drawChart(ctx, c, rv, { dim: () => .7 });
      const mp = Math.min(rv / DCK.length + .03, 1);
      maLine(ctx, c, DCL, 0, DCK.length - 1, mp, { color: C.gray, width: 3.4, label: '200 MA', head: false });
      crossLine(ctx, c, DCS, DCL, 0, DCK.length - 1, mp);
      K.text(ctx, '50 MA', c.box.x, c.y(DCS[0]) + 40, { font: F.latin(500, 18), color: C.red, alpha: S.p(.6, .8), spacing: 2 });
      const xa = S.at(0, 4.4, .5), xx = c.x(DC_X), xy = c.y(at(DCL, DC_X));
      if (xa > 0) { ring(ctx, xx, xy, (S.t - S.beat(0) - 4.4) / 1.2, C.green, 160); K.marker(ctx, xx, xy, { alpha: xa, r: 12, color: C.green }); K.text(ctx, '死亡交叉', xx, xy - 34, { font: F.serif(900, 24), color: C.green, align: 'center', alpha: xa, glow: .6, glowColor: C.green }); }
      tagAt(ctx, 960, 860, '近期买入的人全部开始亏钱，多头正在撤退！', { alpha: S.at(1, .4, .6, easeBack), color: C.green, font: F.serif(900, 24) });
    } },

  { id: 'gcross', header: HC, dur: 14.0, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05, x1: -20 }, ...TOP, pre: .6,
    lines: [{ s: '金叉：底部盘整后，短均线{向上刺破}', d: 6.2 }, { s: '套牢盘被解放，市场愿意{更高价成交}', d: 6.6 }],
    visual(ctx, S) {
      const c = chGC, rv = GCK.length * smooth(S.lin(0, 0, 6.6));
      K.baseline(ctx, c.box.x, c.box.x + c.box.w, c.box.y + c.box.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .5 });
      const bA = S.at(0, 1.6, 1.2);
      if (bA > 0) { ctx.save(); ctx.globalAlpha = .1 * bA; ctx.fillStyle = C.gold; ctx.fillRect(c.x(9), c.y(112), c.x(30) - c.x(9), c.y(103) - c.y(112)); ctx.restore(); K.text(ctx, '底部盘整区', c.x(19.5), c.y(103) + 34, { font: F.serif(900, 20), color: C.gold, align: 'center', alpha: bA }); }
      drawChart(ctx, c, rv, { dim: () => .7 });
      const mp = Math.min(rv / GCK.length + .03, 1);
      maLine(ctx, c, GCL, 0, GCK.length - 1, mp, { color: C.gray, width: 3.4, label: '200 MA', head: false });
      crossLine(ctx, c, GCS, GCL, 0, GCK.length - 1, mp);
      const xa = S.at(0, 4.6, .5), xx = c.x(GC_X), xy = c.y(at(GCL, GC_X));
      if (xa > 0) { ring(ctx, xx, xy, (S.t - S.beat(0) - 4.6) / 1.2, C.red, 160); K.marker(ctx, xx, xy, { alpha: xa, r: 12, color: C.red }); K.text(ctx, '黄金交叉', xx, xy + 54, { font: F.serif(900, 24), color: C.red, align: 'center', alpha: xa, glow: .6, glowColor: C.red }); }
      tagAt(ctx, 960, 860, '长期套牢盘被解放，市场愿意用更高的价格成交！', { alpha: S.at(1, .4, .6, easeBack), color: C.red, font: F.serif(900, 24) });
    } },

  { id: 'rules', header: HR, dur: 18.0, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '铁律一·位置：金叉在{低位}，死叉在{高位}', d: 5.6 }, { s: '铁律二·量价：突破[放量]，回调<缩量>', d: 5.6 }, { s: '铁律三·结构：同步{突破前高 / 跌破前低}', d: 5.8 }],
    visual(ctx, S) {
      const cards = [['位置要对', 'POSITION'], ['量价配合', 'VOLUME'], ['结构确认', 'STRUCTURE']];
      cards.forEach(([t1, en], j) => {
        const a = S.at(j, 0, .7, easeOut), x = 400 + j * 560, y = 600 + (1 - a) * 50, on = j === Math.max(0, S.line());
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = on ? rgba(C.gold, .08) : 'rgba(255,255,255,.02)'; ctx.strokeStyle = rgba(on ? Y : C.gold, on ? .9 : .4); ctx.lineWidth = 1.5;
        if (on) { ctx.shadowColor = Y; ctx.shadowBlur = 22; } ctx.beginPath(); ctx.roundRect(x - 250, y - 220, 500, 440, 16); ctx.fill(); ctx.stroke(); ctx.restore();
        K.text(ctx, `铁律 ${j + 1}`, x, y - 170, { font: F.latin(500, 16), color: C.gray, align: 'center', spacing: 4, alpha: a });
        K.text(ctx, t1, x, y - 124, { font: F.serif(900, 30), color: on ? Y : C.white, align: 'center', alpha: a });
        const p = S.p(S.beat(j) + .4, 1.6, easeInOut), gx = x - 190, gw = 380, gy = y + 110;
        if (j === 0) {                                                     // a wave: golden cross low, death cross high
          const pts = []; for (let k = 0; k <= 60; k++) { const u = k / 60; pts.push([gx + gw * u, gy - 60 - Math.sin(u * Math.PI * 1.6 - .4) * 90]); }
          poly(ctx, pts, p, { color: C.goldHi, width: 3, blur: 10, alpha: a });
          K.marker(ctx, gx + gw * .08, gy + 20, { alpha: a * S.p(S.beat(0) + 1.6, .4), r: 10, color: C.red, label: '金叉', pos: 'below', font: F.serif(900, 18) });
          K.marker(ctx, gx + gw * .6, gy - 150, { alpha: a * S.p(S.beat(0) + 2.2, .4), r: 10, color: C.green, label: '死叉', pos: 'above', font: F.serif(900, 18) });
        }
        if (j === 1) {                                                     // tall bar on the breakout, short bars on the pullback
          const hs = [40, 46, 150, 70, 34, 26, 22];
          hs.forEach((h, k) => { const u = smooth(clamp((p * 7 - k))); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = k === 2 ? C.red : k > 2 ? mix(C.green, C.gold, .4) : mix(C.red, C.gold, .5); if (k === 2) { ctx.shadowColor = C.red; ctx.shadowBlur = 18; } ctx.fillRect(gx + 20 + k * 52, gy + 40 - h * u, 32, h * u); ctx.restore(); });
          K.text(ctx, '放量', gx + 20 + 2 * 52 + 16, gy - 126, { font: F.serif(900, 18), color: C.red, align: 'center', alpha: a * S.p(S.beat(1) + 1.4, .4) });
          K.text(ctx, '缩量', gx + 20 + 5 * 52 + 16, gy - 2, { font: F.serif(900, 18), color: C.green, align: 'center', alpha: a * S.p(S.beat(1) + 2.0, .4) });
        }
        if (j === 2) {                                                     // the line through the prior high, and price clearing it
          K.dash(ctx, gx, gy - 70, gx + gw, gy - 70, { p, color: Y, width: 2 });
          K.text(ctx, '前期高点', gx, gy - 84, { font: F.serif(700, 16), color: Y, alpha: a * p });
          const pts = [[gx, gy + 10], [gx + 80, gy - 70], [gx + 140, gy - 10], [gx + 220, gy - 64], [gx + 260, gy - 20], [gx + gw, gy - 150]];
          poly(ctx, pts, S.p(S.beat(2) + .6, 2.0, easeInOut), { color: C.red, width: 3.4, blur: 12, alpha: a });
          ring(ctx, gx + 300, gy - 70, (S.t - S.beat(2) - 2.0) / 1, Y, 70);
        }
      });
    } },

  /* ================= 贰 · CROSS + RSI (quiet section → engulfing on the return) ================= */
  { id: 'ch2', dur: 3.6, tr: 'sweep', visual: chapter('贰', 2, '交叉 + RSI 共振', 'Cross + RSI Confluence', '高位反转猎杀 · 趋势延续加仓') },

  { id: 'rev', header: HV, dur: 30.0, tr: ['iris', [960, 560]], camera: { z0: 1.0, z1: 1.04, x1: -16 }, ...TOP, pre: .6,
    lines: [{ s: '价格创新高，RSI却走低——{顶背离}', d: 6.8 }, { s: '均线<死叉>，价格放量{跌破前低}', d: 7.0 }, { s: '缩量反弹至{均线与阻力的重合区}', d: 8.6 }, { s: '<看跌吞没>：{共振做空点}，止损放均线上方', d: 6.8 }],
    visual(ctx, S) {
      const c = chRV, tE = S.beat(3);                                     // the engulfing bar lands when the music returns
      const rA = (RV_H2.i + 1) * smooth(S.lin(0, 0, 4.6)), r0 = rA + (RV_E - RV_H2.i - 1) * smooth(S.lin(1, -.4, 14.6)), r1 = clamp((S.t - tE) / .45), r2 = 3 * smooth(clamp((S.t - tE - 1.4) / 2.6));
      const rv = r0 + (r0 >= RV_E ? r1 : 0) + (r1 >= 1 ? r2 : 0);
      const [sx, sy] = shake(S.t, tE, 8, 5);
      ctx.save(); ctx.translate(sx, sy);
      const mp = Math.min(rv / RVK.length + .03, 1);
      // resistance zone: the prior low, now overhead
      const zA = S.at(2, .2, 1.0);
      if (zA > 0) { ctx.save(); ctx.globalAlpha = .14 * zA; ctx.fillStyle = Y; ctx.fillRect(c.x(RV_L.i), c.y(RV_L.price + .9), c.box.x + c.box.w - c.x(RV_L.i), c.y(RV_L.price - .6) - c.y(RV_L.price + .9)); ctx.restore();
        K.text(ctx, '均线 + 阻力重合区', c.x(RV_L.i) + 40, c.y(RV_L.price - .6) + 30, { font: F.serif(900, 20), color: Y, alpha: zA }); }
      K.dash(ctx, c.x(RV_L.i), c.y(RV_L.price), c.box.x + c.box.w, c.y(RV_L.price), { p: S.at(1, .6, 1.2), color: C.gray, width: 1.6 });
      drawChart(ctx, c, rv, { dim: i => i === RV_E ? 1 : .78 });
      maLine(ctx, c, RVL, 0, RVK.length - 1, mp, { color: C.gray, width: 3, head: false, label: '长均线' });
      crossLine(ctx, c, RVS, RVL, 0, RVK.length - 1, mp, { width: 3.6 });
      // divergence: price HH (red), RSI LH (yellow)
      const dA = S.at(0, 4.2, 1.2) * (1 - .6 * S.at(2, 0, .8));
      const yR = rsiPanel(ctx, c, RVR.slice(0, Math.max(2, Math.ceil(rv))), 740, 120, 1, S.at(0, .2, .8));
      poly(ctx, [[c.x(RV_H1.i), c.y(RV_H1.price) - 12], [c.x(RV_H2.i), c.y(RV_H2.price) - 12]], dA, { color: C.red, width: 2.6, dash: [8, 6], blur: 8, alpha: dA, head: false });
      if (yR) poly(ctx, [[c.x(RV_H1.i), yR(RVR[RV_H1.i]) - 8], [c.x(RV_H2.i), yR(RVR[RV_H2.i]) - 8]], dA, { color: Y, width: 2.6, dash: [8, 6], blur: 8, alpha: dA, head: false });
      callout(ctx, '【 RSI 顶背离：多头动能枯竭 】', 960, 732, S.at(0, 5.0, .5) * (1 - S.at(1, .6, .5)), S.t - S.beat(0) - 5.0, { size: 24, color: Y, spacing: 2 });
      // death cross + breakdown
      const xa = S.at(1, .4, .5), xx = c.x(RV_X), xy = c.y(at(RVL, RV_X));
      if (xa > 0 && RV_X > 0) { ring(ctx, xx, xy, (S.t - S.beat(1) - .4) / 1.2, C.green, 140); K.text(ctx, '死叉', xx, xy - 30, { font: F.serif(900, 22), color: C.green, align: 'center', alpha: xa }); }
      tagAt(ctx, c.x(RV_L.i + 13), c.y(RVp.swings[5].price) + 50, '放量跌破前低', { alpha: S.at(1, 1.6, .6) * (1 - S.at(3, 0, .5)), color: C.green, font: F.serif(900, 20) });
      tagAt(ctx, c.x(RV_E - 1) + 34, c.y(RVK[RV_E - 1].h) - 6, '缩量反弹', { side: 'right', alpha: S.at(2, 1.6, .6) * (1 - S.at(3, 0, .5)), color: C.gray, font: F.serif(900, 20) });
      // the engulfing strike
      const ex = c.x(RV_E), eC = c.y(RVK[RV_E].c);
      flash(ctx, ex, c.y(RVK[RV_E].o), (S.t >= tE ? 1 : 0) * clamp(1 - (S.t - tE) / 1.3), 420, C.green);
      ring(ctx, ex, c.y(RVK[RV_E].o), (S.t - tE) / 1.2, Y, 240);
      const ra = S.at(3, 1.2, .7);
      reticle(ctx, ex, eC, ra, S.t, Y);
      tagAt(ctx, ex - 52, eC + 4, '共振做空点', { side: 'left', alpha: ra, color: Y, font: F.serif(900, 24) });
      const sA = S.at(3, 2.6, 1.0), sy2 = c.y(at(RVL, RV_E) + 1.6);
      K.line(ctx, ex - 60, sy2, c.box.x + c.box.w, sy2, { p: sA, color: C.red, width: 2.4, glow: .7 });
      K.text(ctx, '止损：均线上方', c.box.x + c.box.w, sy2 - 12, { font: F.serif(900, 20), color: C.red, align: 'right', alpha: sA });
      ctx.restore();
    } },

  { id: 'cont', header: HT, dur: 30.6, tr: ['push', 1], camera: { z0: 1.0, z1: 1.04, x1: -16 }, ...TOP, pre: .6,
    lines: [{ s: '趋势延续：均线完美{空头排列}', d: 6.4 }, { s: '反弹时RSI反常新高——{延续背离}', d: 7.4 }, { s: '反弹力度不足：<虚假的无效反弹>', d: 7.2 }, { s: '回踩均线出现<看跌形态>：{顺势加仓做空}', d: 8.4 }],
    visual(ctx, S) {
      const c = chCT, tE = S.beat(3) + .6;
      const r0 = CT_E * smooth(S.lin(0, 0, 15.5)), r1 = clamp((S.t - tE) / .45), r2 = 4 * smooth(clamp((S.t - tE - 1.2) / 3));
      const rv = r0 + (r0 >= CT_E ? r1 : 0) + (r1 >= 1 ? r2 : 0);
      const [sx, sy] = shake(S.t, tE, 7, 5);
      ctx.save(); ctx.translate(sx, sy);
      const mp = Math.min(rv / CTK.length + .03, 1);
      drawChart(ctx, c, rv, { dim: i => i === CT_E ? 1 : .78 });
      maLine(ctx, c, CTL, 0, CTK.length - 1, mp, { color: C.green, width: 3.6, head: false, label: '长均线', alpha: .9 });
      maLine(ctx, c, CTS, 0, CTK.length - 1, mp, { color: mix(C.green, C.gold, .3), width: 3, head: false, label: '短均线', alpha: .9 });
      tagAt(ctx, c.x(4), c.y(CTL[4]) - 40, '空头排列：短均线在长均线下方', { side: 'right', alpha: S.at(0, 1.6, .6) * (1 - S.at(1, 0, .5)), color: C.green, font: F.serif(900, 20) });
      // continuation (hidden) divergence: price lower high, RSI higher high
      const dA = S.at(1, 1.0, 1.2);
      const yR = rsiPanel(ctx, c, CTR.slice(0, Math.max(2, Math.ceil(rv))), 740, 120, 1, S.at(0, .2, .8));
      poly(ctx, [[c.x(CT_H1.i), c.y(CT_H1.price) - 12], [c.x(CT_H2.i), c.y(CT_H2.price) - 12]], dA, { color: C.green, width: 2.6, dash: [8, 6], blur: 8, alpha: dA, head: false });
      if (yR) poly(ctx, [[c.x(CT_H1.i), yR(CTR[CT_H1.i]) - 8], [c.x(CT_H2.i), yR(CTR[CT_H2.i]) - 8]], dA, { color: Y, width: 2.6, dash: [8, 6], blur: 8, alpha: dA, head: false });
      callout(ctx, '【 RSI 延续背离：虚假的无效反弹 】', 960, 732, S.at(1, 2.2, .5) * (1 - S.at(3, 0, .5)), S.t - S.beat(1) - 2.2, { size: 24, color: Y, spacing: 2 });
      const hA = S.at(2, .4, .6);
      K.marker(ctx, c.x(CT_H2.i), c.y(CT_H2.price) - 8, { alpha: hA * (1 - S.at(3, .4, .5)), r: 11, color: Y, label: '触及均线阻力', pos: 'above', font: F.serif(900, 20) });
      const ex = c.x(CT_E), eC = c.y(CTK[CT_E].c);
      flash(ctx, ex, c.y(CTK[CT_E].o), (S.t >= tE ? 1 : 0) * clamp(1 - (S.t - tE) / 1.3), 420, C.green);
      ring(ctx, ex, c.y(CTK[CT_E].o), (S.t - tE) / 1.2, Y, 240);
      const ra = S.at(3, 1.8, .7);
      reticle(ctx, ex, eC, ra, S.t, Y);
      tagAt(ctx, ex - 40, eC + 62, '顺势加仓做空点', { side: 'left', alpha: ra, color: Y, font: F.serif(900, 24) });
      ctx.restore();
    } },

  /* ================= 2:20.8 FINALE — erased to black, the trigger ================= */
  { id: 'phil', dur: 29.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t;
      // the red/green lines and the candles are wiped away
      const wipe = smooth(clamp(t / 2.4));
      if (wipe < 1) {
        const pts1 = [], pts2 = []; for (let i = 0; i <= 60; i++) { const x = 200 + i * 25; pts1.push([x, 520 - Math.sin(i / 9) * 90]); pts2.push([x, 520 - Math.sin(i / 9 + 1) * 140]); }
        ctx.save(); ctx.beginPath(); ctx.rect(lerp(150, 1800, wipe), 0, 1920, 1080); ctx.clip();
        poly(ctx, pts1, 1, { color: C.red, width: 4, blur: 14, head: false }); poly(ctx, pts2, 1, { color: C.green, width: 4, blur: 14, head: false }); ctx.restore();
        const bx = lerp(150, 1800, wipe); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(bx - 60, 0, bx + 20, 0); g.addColorStop(0, rgba(C.goldHi, 0)); g.addColorStop(1, rgba(C.goldHi, .5)); ctx.fillStyle = g; ctx.fillRect(bx - 60, 0, 80, 1080); ctx.restore();
      }
      ctx.save(); ctx.fillStyle = `rgba(2,2,3,${(.88 * smooth(clamp((t - 1.6) / 2.4))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
      const screens = [[['弱者迷失于巨震，', 470, 5.4], ['智者静候于蓄势。', 570, 7.4]], [['平庸者盲目捕捉波动，', 470, 12.2], ['顶尖猎手，看清底牌才扣动扳机。', 570, 14.2]]];
      screens.forEach((lines, k) => {
        const out = 1 - smooth(clamp((t - (k ? 18.4 : 11.4)) / .8));
        for (const [str, y, t0] of lines) {
          const u = smooth(clamp((t - t0) / 1.5)); if (u <= .002 || out <= 0) continue;
          ctx.save(); ctx.translate(960, y - 20); const s = lerp(1.12, 1, u); ctx.scale(s, s); ctx.translate(-960, -(y - 20));
          ctx.filter = u < 1 ? `blur(${((1 - u) * 8).toFixed(1)}px)` : 'none';
          K.goldText(ctx, str, 960, y, 36, { alpha: u * out, glow: .9, spacing: 3 });
          ctx.restore();
        }
      });
      const tF = 19.6, u = clamp((t - tF) / .3);
      if (t > 18.9 && t < tF + .2) { const k = clamp((t - 18.9) / .7); K.rule(ctx, 960, 560, 200 * k, 1, { alpha: .8 }); }
      if (u > 0) {
        const [sx, sy] = shake(t, tF, 18, 6);
        ctx.save(); ctx.translate(960 + sx, 560 + sy); const s = lerp(1.6, 1, easeOut(u)); ctx.scale(s, s);
        K.goldText(ctx, '宁可错过，绝不做错。', 0, 30, 72, { alpha: u, glow: 1.2, spacing: 8 });
        ctx.restore();
        ring(ctx, 960, 540, (t - tF) / 1.4, C.goldHi, 900);
        const sw = clamp((t - tF - 1.0) / 1.4);
        if (sw > 0 && sw < 1) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          const xx = lerp(200, 1720, sw); ctx.translate(xx, 560); ctx.scale(1, .7);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 160); g.addColorStop(0, 'rgba(255,240,200,.38)'); g.addColorStop(1, 'rgba(255,240,200,0)');
          ctx.fillStyle = g; ctx.fillRect(-160, -160, 320, 320); ctx.restore();
        }
      }
    } },

  /* ================= END CARD ================= */
  { id: 'end', dur: 6.5, tr: 'zoom', noWatermark: true,
    visual(ctx, S) {
      const a = S.p(.2, 1.2);
      ctx.save(); ctx.translate(960, 470); const z = lerp(.92, 1, easeOut(S.t / 2)); ctx.scale(z, z);
      const L = document.getElementById('logo'), lw = 760, lh = lw * L.naturalHeight / L.naturalWidth;   // the channel's own logo
      ctx.globalAlpha = a; ctx.shadowColor = rgba(C.goldHi, .35); ctx.shadowBlur = 40;
      ctx.drawImage(L, -lw / 2, -lh / 2, lw, lh); ctx.shadowBlur = 0;
      const sw = clamp((S.t - 1.0) / 1.4);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.beginPath(); ctx.rect(-lw / 2, -lh / 2, lw, lh); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(-lw / 2 - 120, lw / 2 + 120, sw), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        g.addColorStop(0, 'rgba(255,236,190,0)'); g.addColorStop(.5, 'rgba(255,236,190,.22)'); g.addColorStop(1, 'rgba(255,236,190,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, -lh / 2, 180, lh); ctx.restore();
      }
      ctx.restore();
      K.rule(ctx, 960, 560, 340, S.p(.8, 1.4));
      K.text(ctx, '均线策略（二）', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(1.2, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.6, 1) });
    } },
  ],
};
})();

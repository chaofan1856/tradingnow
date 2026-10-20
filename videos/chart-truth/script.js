/* ============================================================
   《看透图表的真相》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py + sfx.json)

   Clock pinned to the music: the drop at 16.7 s is the lightning title (three charts); the quiet
   section (85.3–103.2 s) walks the Shanghai Composite from the weekly breakout to the daily 3328
   confluence, and the track's return at 103.2 s is the 3-11 bar breaking the 15-minute high.
   Index levels 3458 / 3731 / 3328 / 3723 are real; chart shapes are 示意. Short, fast finale.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const Y = '#FFD34D';                                               // core key / confluence target / entry: yellow

const H0 = { label: '破题', sub: '痛点直击', en: 'The Truth of the Chart', zh: '《看透图表的真相》' };
const H1 = { label: '架构', sub: '结构生命线 · 防假跌破', en: 'Market Structure', zh: '《第一张图》' };
const H2 = { label: '共振', sub: '三环咬合理论', en: 'Multi-Timeframe', zh: '《第二张图》' };
const H3 = { label: '实战', sub: '上证指数 3328 拆解', en: 'Case Study: 3328', zh: '《第三张图》' };
const H4 = { label: '锁仓', sub: '移动被动止盈', en: 'Trailing Stop', zh: '《高阶技巧》' };
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
/** gear outline */
function gear(ctx, x, y, r, rot, a, col = Y) {
  if (a <= .002) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 16;
  ctx.beginPath(); for (let k = 0; k < 24; k++) { const ang = k / 24 * Math.PI * 2, rr = k % 2 ? r : r * 1.22; ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * .4, 0, 6.2832); ctx.stroke(); ctx.restore();
}

/** volume bars under a chart */
function vbars(ctx, ch, vol, rv, y0, h, hot = [], a = 1) {
  K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, y0 + h, { p: a, step: 60, alpha: .55 });
  for (let i = 0; i < vol.length && i < Math.ceil(rv); i++) {
    const g = clamp(rv - i), hh = h * vol[i] / 100 * easeOut(g), k = ch.k[i], isHot = hot.includes(i);
    const col = isHot ? (k.c >= k.o ? C.red : C.green) : mix(k.c >= k.o ? C.red : C.green, C.gold, .45);
    ctx.save(); ctx.globalAlpha = a * (isHot ? .95 : .5) * easeOut(g); ctx.fillStyle = col; if (isHot) { ctx.shadowColor = col; ctx.shadowBlur = 18; }
    ctx.fillRect(ch.x(i) - ch.cw / 2, y0 + h - hh, ch.cw, hh); ctx.restore();
  }
}
/** gold shield with a tick */
function shield(ctx, x, y, s, a) {
  if (a <= .002) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= clamp(a);
  ctx.fillStyle = rgba(C.gold, .25); ctx.strokeStyle = C.goldHi; ctx.lineWidth = 3; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(0, -26); ctx.quadraticCurveTo(14, -18, 24, -20); ctx.quadraticCurveTo(24, 10, 0, 28); ctx.quadraticCurveTo(-24, 10, -24, -20); ctx.quadraticCurveTo(-14, -18, 0, -26); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, 0); ctx.lineTo(-2, 8); ctx.lineTo(11, -8); ctx.stroke(); ctx.restore();
}

/* ---------------- data ---------------- */
// chaos → the red line of structure
const CHp = K.gen.path([100, 108, 104, 113, 108.5, 118, 113, 123], { per: [5, 4, 5, 4, 5, 4, 5], seed: 701, noise: 1.1, wick: 1.0 });
const CHK = CHp.candles, CH_SW = CHp.swings;
const chCH = new K.Chart(CHK, { x: 260, y: 230, w: 1400, h: 470 });

// figure 1: HH/HL, the two lines, the fake break and the reclaim
const STp = K.gen.path([100, 108, 104, 112, 107.5, 116.5], { per: [4, 3, 4, 3, 4], seed: 711, noise: .35, wick: .4 });
const STK = [...STp.candles, ...K.gen.seq(116.5, [[-2.6, .3, .4], [-2.8, .3, .5], [-2.4, .3, .5], [-2.3, .3, .7], [.3, .5, .6], [4.2, .3, .3], [2.0, .5, .3], [2.4, .4, .3]])];
const ST_SW = STp.swings, ST_HI = ST_SW[2].price, ST_LO = ST_SW[3].price, ST_N0 = STp.candles.length, ST_FAKE = ST_N0 + 3, ST_RE = ST_N0 + 5;
const STV = STK.map((k, i) => i === ST_RE ? 100 : i >= 14 && i <= 16 ? 78 : i >= ST_N0 && i <= ST_FAKE ? 34 : i > ST_RE ? 60 : 38);
const chST = new K.Chart(STK, { x: 260, y: 360, w: 1400, h: 330 }, { lo: 98, hi: 121 });

// figure 2: a 15-minute crash that is only a dip on the daily
const M15K = K.gen.path([118, 121, 112, 114, 103], { per: [3, 4, 2, 4], seed: 721, noise: .35, wick: .4 }).candles;
const chM15 = new K.Chart(M15K, { x: 260, y: 380, w: 1400, h: 380 });
const D1K = K.gen.path([100, 112, 108, 120, 115, 128, 123, 135, 130.5], { per: [5, 3, 5, 3, 5, 3, 5, 3], seed: 731, noise: .35, wick: .4 }).candles;
const chD1 = new K.Chart(D1K, { x: 260, y: 380, w: 1400, h: 380 });

// figure 3: the Shanghai Composite, 3328 (示意 shapes, real levels)
const WKK = K.gen.path([3100, 2450, 2950, 2650, 3150, 2750, 3288, 2650, 3000, 3458, 3250, 3400], { per: [5, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3], seed: 741, noise: .35, wick: .4 }).candles;
const WK_B0 = 34, WKV = WKK.map((k, i) => i >= 35 && i <= 37 ? 92 + (i - 35) * 4 : 30 + (i * 7) % 18);
const chWK = new K.Chart(WKK, { x: 260, y: 380, w: 1400, h: 300 }, { lo: 2350, hi: 3620 });
const DYp = K.gen.path([2850, 3458, 3200, 3400, 3210, 3460, 3350, 3731, 3328], { per: [6, 5, 4, 4, 4, 4, 6, 4], seed: 751, noise: .3, wick: .35 });
const DYK = DYp.candles, DY_SW = DYp.swings, DY_N = DYK.length;
const DYMA = curve([[0, 3010], [12, 3150], [24, 3260], [DY_N - 1, 3330]], DY_N);     // 250-day line (示意)
const FIB = r => 3731 - r * (3731 - 2850);
const chDY = new K.Chart(DYK, { x: 220, y: 400, w: 880, h: 360 }, { lo: 2800, hi: 3800 });
const Q15p = K.gen.path([3395, 3352, 3368, 3329, 3342, 3331], { per: [5, 3, 5, 3, 3], seed: 761, noise: .3, wick: .35 });
const Q15K = [...Q15p.candles, { o: 3333, c: 3392, h: 3398, l: 3330 }], Q15_B = Q15K.length - 1, Q15_HI = Q15p.swings[1].price;
const chQ15 = new K.Chart(Q15K, { x: 1200, y: 440, w: 500, h: 300 }, { lo: 3310, hi: 3412 });

// trailing stop on the 1-hour chart
const TRp = K.gen.path([3350, 3420, 3395, 3480, 3450, 3540, 3505, 3600, 3570, 3660], { per: 3, seed: 771, noise: .3, wick: .35 });
const TRK = TRp.candles, TR_N = TRK.length, TR_ATR = 15;
const TR_STEPS = [[0, 3318], ...TRp.swings.filter(s => s.type === 'L').map(s => [s.i + 2, s.price - TR_ATR])];
const chTR = new K.Chart(TRK, { x: 260, y: 380, w: 1400, h: 400 }, { lo: 3300, hi: 3700 });

window.FILM = {
  title: '看透图表的真相',
  transition: 1.2,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },
  scenes: [

  /* ================= 0:00 HOOK — thunder, a green question mark ================= */
  { id: 'hook', dur: 6.0, camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, hit = .3, tx = 1.5;
      const q = S.p(hit, .5, easeBack), qOut = smooth(clamp((t - tx + .2) / .7)), [qx, qy] = shake(t, hit, 26, 5);
      if (q > 0) { ctx.save(); ctx.translate(960 + qx, 470 + qy - 40 * qOut); const s = lerp(.2, 1, q) * lerp(1, .82, qOut); ctx.scale(s, s);
        K.text(ctx, '?', 0, 150, { font: F.latin(700, 250), color: C.green, align: 'center', alpha: lerp(1, .16, qOut), glow: 1, glowColor: C.green }); ctx.restore(); }
      flash(ctx, 960, 470, (t > hit ? 1 : 0) * clamp(1 - (t - hit) / .5), 800, '#FFFFFF');
      const p = clamp((t - tx) / .3), s = lerp(2.2, 1, easeOut(p)), [sx, sy] = shake(t, tx + .25, 16, 5);
      ctx.save(); ctx.translate(960 + sx, 500 + sy); ctx.scale(s, s);
      ctx.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '为什么大盘一跌你就割肉，', 0, -40, { font: F.serif(900, 50), color: C.white, align: 'center', alpha: p, glow: .5, glowColor: C.green, spacing: 3 });
      K.text(ctx, '刚割完它就拔地而起？', 0, 70, { font: F.serif(900, 50), color: C.white, align: 'center', alpha: p, glow: .65, glowColor: C.red, spacing: 3 });
      ctx.restore();
    } },

  /* ================= 0:06 CHAOS → THE RED LINE ================= */
  { id: 'chaos', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.03, z1: 1.0 }, ...BOT, pre: 3.6,
    lines: [{ s: '凭感觉买股，就是在枪林弹雨中<裸奔>', d: 3.4 }, { s: '盘面再乱，专业交易员只看{两条生命线}', d: 3.7 }],
    visual(ctx, S) {
      const c = chCH, rv = CHK.length * smooth(S.lin(0, -3.6, 3.0)), lp = smooth(S.lin(0, -.4, 2.8));
      drawChart(ctx, c, rv, { dim: () => lerp(.9, .3, lp) });
      const pts = [[c.x(0), c.y(CHK[0].o)], ...CH_SW.map(s => [c.x(s.i), c.y(s.price)])];
      poly(ctx, pts, lp, { color: C.red, width: 7, blur: 26 });
      CH_SW.forEach((s, k) => { const a = clamp((lp * CH_SW.length - k) * 1.5) * S.at(0, .4, .6); if (a <= 0 || k === 0) return;
        K.text(ctx, s.type === 'H' ? '顶顶高' : '底底高', c.x(s.i), c.y(s.price) + (s.type === 'H' ? -22 : 44), { font: F.serif(900, 17), color: C.red, align: 'center', alpha: a }); });
    } },

  /* ================= 0:16.7 LIGHTNING TITLE — three charts ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 }, ...BOT, pre: 4.6,
    lines: [{ s: '三张图，看透{主力的底牌}', d: 2.8 }, { s: '彻底告别<凭感觉买股>', d: 2.9 }],
    visual(ctx, S) {
      const t = S.t, z = .15;
      const R = K.rng(73), pts = []; let x = -60, y = 220, up = 1;
      while (x < 1980) { pts.push([x, y]); x += 70 + R() * 70; y += up * (50 + R() * 80) + 10; up = -up; }
      const bp = clamp((t - z) / .22), fade = clamp(1 - (t - z - .25) / .9);
      if (bp > 0 && fade > 0) { poly(ctx, pts, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false }); poly(ctx, pts, bp, { color: C.goldHi, width: 14, blur: 60, alpha: fade * .35, head: false }); flash(ctx, 960, 360, fade, 1100, C.goldHi); }
      const tp = S.p(z + .35, 1.2, K.expo);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 220, 1920, 150); ctx.clip();
      K.goldText(ctx, '看透图表的真相', 960, 340 + (1 - tp) * 120, 58, { spacing: 16, alpha: tp });
      ctx.restore();
      [['第一张图', '市场架构'], ['第二张图', '多周期共振'], ['第三张图', '实战猎杀 3328']].forEach(([t1, t2], j) => {
        const a = S.p(1.4 + j * .35, .7, easeBack); if (a <= 0) return;
        const cx = 540 + j * 420, yy = 470 + (1 - clamp(a)) * 30;
        frame(ctx, cx - 180, yy, 360, 220, clamp(a), .5, j === 2 ? Y : C.red);
        K.text(ctx, t1, cx, yy + 70, { font: F.serif(700, 18), color: C.gray, align: 'center', alpha: clamp(a), spacing: 4 });
        K.text(ctx, t2, cx, yy + 140, { font: F.serif(900, j === 2 ? 25 : 30), color: j === 2 ? Y : C.white, align: 'center', alpha: clamp(a) });
      });
    } },

  /* ================= 壹 · STRUCTURE ================= */
  { id: 'ch1', dur: 3.6, tr: 'sweep', visual: chapter('壹', 1, '市场架构与防“假跌破”', 'Market Structure', '上升看低点 · 下跌看高点') },

  { id: 'struct', header: H1, dur: 22.2, tr: ['iris', [960, 560]], camera: { z0: 1.0, z1: 1.03, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '前高画线：{趋势突破线}，冲破即主升浪', d: 5.4 }, { s: '前低画线：<趋势破坏线>，多头最后防线', d: 5.4 }, { s: '股价短暂<跌破>——庄家在抓取流动性', d: 5.4 }, { s: '{千万别割肉}：[放量拉回]才是黄金抄底点', d: 5.4 }],
    visual(ctx, S) {
      const c = chST, tR = S.beat(3) + .6;
      const rv = ST_N0 * S.lin(0, .2, 4.4) + 4 * smooth(S.lin(2, .1, 1.6)) + clamp((S.t - tR + .5) / .5) + clamp((S.t - tR) / .45) + 2 * smooth(clamp((S.t - tR - 1.2) / 1.8));
      const [sx, sy] = shake(S.t, tR + .45, 8, 5);
      ctx.save(); ctx.translate(sx, sy);
      const xr = c.box.x + c.box.w, bA = S.at(0, .6, 1.0), dA = S.at(1, .3, 1.0);
      K.line(ctx, c.x(ST_SW[2].i), c.y(ST_HI), xr, c.y(ST_HI), { p: bA, color: C.green, width: 2.6, glow: .8 });
      K.text(ctx, '趋势突破线', xr, c.y(ST_HI) - 12, { font: F.serif(900, 18), color: C.green, align: 'right', alpha: bA * (1 - .6 * S.at(1, 0, .6)) * (1 - S.at(3, 0, .5)) });
      K.line(ctx, c.x(ST_SW[3].i), c.y(ST_LO), xr, c.y(ST_LO), { p: dA, color: C.green, width: 2.6, glow: .8 });
      K.text(ctx, '趋势破坏线', xr, c.y(ST_LO) + 30, { font: F.serif(900, 18), color: C.green, align: 'right', alpha: dA * (1 - S.at(3, 0, .5)) });
      drawChart(ctx, c, rv, { dim: i => i === ST_RE ? 1 : .8 });
      vbars(ctx, c, STV, rv, 715, 85, [15, 16, ST_RE]);
      // HH / HL markers
      ST_SW.forEach((s, k) => { const a = clamp((rv - s.i - .6) * 2) * S.at(0, 0, .5) * (1 - S.at(2, 0, .6)); if (k === 0 || a <= 0) return;
        K.text(ctx, s.type === 'H' ? 'HH' : 'HL', c.x(s.i), c.y(s.price) + (s.type === 'H' ? -20 : 40), { font: F.latin(600, 17), color: C.red, align: 'center', alpha: a }); });
      const tb = S.beat(0) + 4.0;
      flash(ctx, c.x(15.5), c.y(ST_HI), (S.t >= tb ? 1 : 0) * clamp(1 - (S.t - tb) / 1.2), 300, C.red); ring(ctx, c.x(15.5), c.y(ST_HI), (S.t - tb) / 1.1, C.red, 140);
      // the fake break
      const fA = S.at(2, 1.8, .6, easeBack) * (1 - S.at(3, .6, .5));
      tagAt(ctx, c.x(ST_FAKE) - 40, c.y(STK[ST_FAKE].l) + 36, '散户恐慌割肉', { side: 'left', alpha: fA, color: C.green, font: F.serif(900, 20) });
      callout(ctx, '【 庄家在抓取流动性，千万别割肉！】', 960, 862, S.at(2, 2.2, .5) * (1 - S.at(3, 2.0, .5)), S.t - S.beat(2) - 2.2, { size: 26, color: Y, spacing: 2 });
      // the reclaim
      const ex = c.x(ST_RE), eC = c.y(STK[ST_RE].c);
      flash(ctx, ex, eC, (S.t >= tR + .45 ? 1 : 0) * clamp(1 - (S.t - tR - .45) / 1.2), 360, C.red); ring(ctx, ex, c.y(ST_LO), (S.t - tR - .45) / 1.1, Y, 200);
      const ra = S.at(3, 1.6, .6);
      reticle(ctx, ex, eC, ra, S.t, Y);
      tagAt(ctx, ex + 50, eC + 4, '黄金抄底点', { side: 'right', alpha: ra, color: Y, font: F.serif(900, 22) });
      ctx.restore();
    } },

  /* ================= 贰 · MULTI-TIMEFRAME ================= */
  { id: 'ch2', dur: 3.6, tr: 'sweep', visual: chapter('贰', 2, '多周期共振', 'Three Gears', '大盘与个股的齿轮咬合') },

  { id: 'mtf', header: H2, dur: 22.0, tr: ['iris', [960, 560]], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '只看 15 分钟：暴跌，散户在<最低点割肉>', d: 5.4 }, { s: '拉大到日线：只是强势上涨中的{微小回调}', d: 5.4 }, { s: '大周期定方向，中周期等回踩，{小周期转涨}', d: 5.6 }, { s: '三环咬合同一方向，抄底[胜率大增]', d: 5.0 }],
    visual(ctx, S) {
      const z = smooth(S.lin(1, 0, 1.8)), out = 1 - S.at(2, 0, .8);
      if (out > 0) {
        ctx.save(); ctx.globalAlpha = out;
        // daily chart behind
        const d = chD1, i0 = 28, i1 = 31;
        if (z > 0) { ctx.save(); ctx.globalAlpha *= z; drawChart(ctx, d, D1K.length, { dim: i => i >= i0 && i <= i1 ? 1 : .75 });
          K.text(ctx, '日线（D1）', d.box.x, d.box.y - 12, { font: F.serif(900, 18), color: C.red, alpha: 1 }); ctx.restore(); }
        let lo = Infinity, hi = -Infinity; for (let i = i0; i <= i1; i++) { lo = Math.min(lo, D1K[i].l); hi = Math.max(hi, D1K[i].h); }
        const tx = d.x(i0) - d.step / 2, tw = d.x(i1) + d.step / 2 - tx, ty = d.y(hi) - 4, th = d.y(lo) - d.y(hi) + 8;
        // the 15-minute view shrinks into its place on the daily
        const m = chM15, bx = lerp(m.box.x, tx, z), by = lerp(m.box.y, ty, z), sx = lerp(1, tw / m.box.w, z), sy = lerp(1, th / m.box.h, z);
        ctx.save(); ctx.translate(bx, by); ctx.scale(sx, sy); ctx.translate(-m.box.x, -m.box.y);
        drawChart(ctx, m, M15K.length * smooth(S.lin(0, 0, 3.0)), { dim: () => .9 });
        ctx.restore();
        if (z < .2) K.text(ctx, '15 分钟（M15）', m.box.x, m.box.y - 12, { font: F.serif(900, 18), color: C.green, alpha: 1 - z * 5 });
        tagAt(ctx, m.x(M15K.length - 1) - 40, m.y(M15K[M15K.length - 1].l) + 6, '散户：最低点割肉', { side: 'left', alpha: S.at(0, 3.2, .6, easeBack) * (1 - z * 3), color: C.green, font: F.serif(900, 20) });
        if (z > .9) { ctx.save(); ctx.strokeStyle = Y; ctx.lineWidth = 2; ctx.shadowColor = Y; ctx.shadowBlur = 12; ctx.globalAlpha *= S.at(1, 1.8, .4); ctx.strokeRect(tx - 6, ty - 6, tw + 12, th + 12); ctx.restore(); }
        tagAt(ctx, tx + tw / 2, ty - 44, '只是微小回调', { alpha: S.at(1, 2.0, .6, easeBack), color: Y, font: F.serif(900, 20) });
        ctx.restore();
      }
      // three gears, three steps
      const gA = S.at(2, .2, .8);
      if (gA > 0) {
        const spin = S.t * (S.after(3) ? 2.2 : 1.0), lit = j => S.at(2, .5 + j * 1.0, .5);
        const g2 = [540 + 240 * Math.cos(-.7), 620 + 240 * Math.sin(-.7)], G = [[540, 620, 130, C.red], [g2[0], g2[1], 84, Y], [g2[0] + 163 * Math.cos(.55), g2[1] + 163 * Math.sin(.55), 62, C.red]];
        G.forEach(([x, y, r, col], j) => gear(ctx, x, y, r, (j === 1 ? -1 : 1) * spin * 130 / r, gA, mix(C.gray, col, lit(j))));
        [['① 日线看涨', '锁死铁律：只找做多机会'], ['② 4 小时', '回踩关键支撑'], ['③ 15 分钟', '下跌结构被破坏，转为上涨']].forEach(([t1, t2], j) => {
          const a = lit(j), y = 470 + j * 120;
          K.text(ctx, t1, 1000, y, { font: F.serif(900, 28), color: a > .5 ? (j === 1 ? Y : C.red) : C.gray, alpha: gA });
          K.text(ctx, t2, 1000, y + 44, { font: F.serif(700, 19), color: C.white, alpha: gA * lerp(.35, 1, a) });
        });
        tagAt(ctx, 960, 850, '三环咬合 · 抄底胜率大增', { alpha: S.at(3, .6, .6, easeBack), color: Y, font: F.serif(900, 24) });
      }
    } },

  /* ================= 叁 · THE 3328 CASE (quiet section → the 15-minute breakout on the return) ================= */
  { id: 'ch3', dur: 3.6, tr: 'sweep', visual: chapter('叁', 3, '实战猎杀 · 上证 3328', 'Case Study: 3328', '周线 · 日线 · 15 分钟') },

  { id: 'case', header: H3, dur: 27.6, tr: ['iris', [960, 520]], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '周线：突破两年大箱体，[量能翻倍]', d: 6.6 }, { s: '日线：2021年3月9日，精准砸到{3328 点}', d: 7.0 }, { s: '3328：三大支撑在此{共振}', d: 7.0 }, { s: '3月11日，放量大阳线[涨破15分钟前高]', d: 6.4 }],
    visual(ctx, S) {
      const t = S.t, tE = S.beat(3);
      // weekly
      const wA = S.at(0, 0, .8) * (1 - S.at(1, 0, .8));
      if (wA > 0) {
        const c = chWK, rv = WKK.length * smooth(S.lin(0, .2, 3.6));
        ctx.save(); ctx.globalAlpha = wA;
        const bA = S.at(0, 1.4, .8);
        ctx.save(); ctx.globalAlpha *= .1 * bA; ctx.fillStyle = C.gold; ctx.fillRect(c.box.x, c.y(3288), c.x(WK_B0) - c.box.x, c.y(2440) - c.y(3288)); ctx.restore();
        K.dash(ctx, c.box.x, c.y(3288), c.x(WK_B0), c.y(3288), { p: bA, color: C.gold, width: 1.6 }); K.dash(ctx, c.box.x, c.y(2440), c.x(WK_B0), c.y(2440), { p: bA, color: C.gold, width: 1.6 });
        K.text(ctx, '两年横盘大箱体', c.box.x + 10, c.y(3288) - 12, { font: F.serif(900, 18), color: C.gold, alpha: bA });
        drawChart(ctx, c, rv, { dim: i => i >= 35 && i <= 37 ? 1 : .8 });
        vbars(ctx, c, WKV, rv, 700, 110, [35, 36, 37]);
        K.text(ctx, '上证指数 · 周线（示意）', c.box.x, c.box.y - 14, { font: F.serif(700, 18), color: C.gray });
        tagAt(ctx, c.x(36), c.y(3458) - 34, '2020.7 突破 · 量能翻倍', { alpha: S.at(0, 3.6, .6, easeBack), color: C.red, font: F.serif(900, 20) });
        ctx.restore();
      }
      // daily
      const dA = S.at(1, .2, .8);
      if (dA > 0) {
        const c = chDY, rv = DY_N * smooth(S.lin(1, .3, 3.8));
        ctx.save(); ctx.globalAlpha = dA;
        K.text(ctx, '日线（示意）', c.box.x, c.box.y - 14, { font: F.serif(700, 18), color: C.gray });
        // the three supports
        const s1 = S.at(2, .4, .6), s2 = S.at(2, 1.6, .6), s3 = S.at(2, 2.8, .6);
        if (s1 > 0) { ctx.save(); ctx.globalAlpha *= .16 * s1; ctx.fillStyle = C.red; ctx.fillRect(c.x(5), c.y(3365), c.box.x + c.box.w - c.x(5), c.y(3295) - c.y(3365)); ctx.restore(); }
        [[.382, '0.382'], [.5, '0.5']].forEach(([r, lb]) => { K.dash(ctx, c.x(DY_SW[0].i), c.y(FIB(r)), c.box.x + c.box.w, c.y(FIB(r)), { p: s2, color: Y, width: 1.6 }); });
        maLine(ctx, c, DYMA, 0, DY_N - 1, s3, { color: '#F4F0E8', width: 2.4, head: false });
        drawChart(ctx, c, rv, { dim: i => i === DY_N - 1 ? 1 : .8 });
        [[DY_SW[0], '3458'], [DY_SW[6], '3731'], [DY_SW[7], '3328']].forEach(([s, lb], k) => { const a = S.at(1, 2.0 + k * .5, .5); const isLo = s.type === 'L';
          K.text(ctx, lb, c.x(s.i), c.y(s.price) + (isLo ? 40 : -16), { font: F.serif(900, 20), color: isLo ? Y : C.white, align: 'center', alpha: a }); });
        const zp = .5 + .5 * Math.sin(t * 5);
        ring(ctx, c.x(DY_N - 1), c.y(3328), ((t - S.beat(1) - 3.6) % 1.6) / 1.6, Y, 70);
        ctx.restore();
        // right column: the three confluences, then the 15-minute trigger
        const qA = S.at(2, 4.8, .8);
        [['① 前阻力 → 强支撑', '2020.7 筹码密集区', C.red, s1], ['② 斐波那契回撤', '2850→3731 的 0.382–0.5', Y, s2], ['③ 250 日年线', '牛熊分界附近（示意）', '#F4F0E8', s3]].forEach(([t1, t2, col, a], j) => {
          const aa = a * (1 - qA); if (aa <= 0) return;
          K.text(ctx, t1, 1200, 470 + j * 110, { font: F.serif(900, 24), color: col, alpha: aa });
          K.text(ctx, t2, 1200, 510 + j * 110, { font: F.serif(700, 17), color: C.gray, alpha: aa });
        });
        if (qA > 0) {
          const q = chQ15, rq = Q15_B * smooth(S.lin(2, 4.8, 1.8)) + clamp((t - tE) / .45);
          const [sx, sy] = shake(t, tE, 10, 5);
          ctx.save(); ctx.globalAlpha = qA; ctx.translate(sx, sy);
          K.text(ctx, '15 分钟 · 3 月 9 日—11 日', q.box.x, q.box.y - 18, { font: F.serif(900, 18), color: Y });
          K.dash(ctx, q.x(Q15p.swings[1].i), q.y(Q15_HI), q.box.x + q.box.w, q.y(Q15_HI), { p: qA, color: C.green, width: 1.6 });
          K.text(ctx, '15 分钟前高', q.x(Q15_B) - 60, q.y(Q15_HI) - 10, { font: F.serif(700, 15), color: C.green, align: 'right' });
          drawChart(ctx, q, rq, { dim: i => i === Q15_B ? 1 : .85 });
          const ex = q.x(Q15_B), eC = q.y(Q15K[Q15_B].c);
          flash(ctx, ex, eC, (t >= tE ? 1 : 0) * clamp(1 - (t - tE) / 1.3), 380, C.red); ring(ctx, ex, q.y(Q15_HI), (t - tE) / 1.2, Y, 220);
          const ra = S.at(3, .8, .7);
          reticle(ctx, ex, eC, ra, t, Y);
          tagAt(ctx, ex - 46, q.box.y + 18, '共振入场点', { side: 'left', alpha: ra, color: Y, font: F.serif(900, 22) });
          ctx.restore();
        }
      }
    } },

  { id: 'result', header: H3, dur: 16.8, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '止损：3328 下方再减 {1 个 ATR}', d: 5.4 }, { s: '其后上证最高涨至 [3723 点]', d: 5.4 }, { s: '小止损换大波段，盈亏比约 {11 : 1}', d: 5.4 }],
    visual(ctx, S) {
      const lo = 3280, hi = 3760, yOf = p => 820 - (p - lo) / (hi - lo) * 440, x0 = 720, x1 = 1500;
      const E = 3350, SL = 3318, TP = 3723;
      const eA = S.at(0, .2, .7), rA = S.at(0, 1.2, .8), tA = S.at(1, .3, .8);
      if (rA > 0) { ctx.save(); ctx.globalAlpha = .16 * rA; ctx.fillStyle = C.green; ctx.fillRect(x0, yOf(E), (x1 - x0) * smooth(rA), yOf(SL) - yOf(E)); ctx.restore(); }
      if (tA > 0) { ctx.save(); ctx.globalAlpha = .13 * tA; ctx.fillStyle = C.red; ctx.fillRect(x0, yOf(TP), (x1 - x0) * smooth(tA), yOf(E) - yOf(TP)); ctx.restore(); }
      K.line(ctx, x0, yOf(E), x1, yOf(E), { p: eA, color: C.goldHi, width: 2.4, glow: .8 });
      K.line(ctx, x0, yOf(SL), x1, yOf(SL), { p: rA, color: C.green, width: 2.6, glow: .8 });
      K.line(ctx, x0, yOf(TP), x1, yOf(TP), { p: tA, color: C.red, width: 2.6, glow: .8 });
      K.text(ctx, '入场 ≈ 3350（3 月 11 日）', x0 - 24, yOf(E) - 6, { font: F.serif(900, 20), color: C.goldHi, align: 'right', alpha: eA });
      K.text(ctx, '止损 ≈ 3318（3328 − 1 ATR）', x0 - 24, yOf(SL) + 30, { font: F.serif(900, 20), color: C.green, align: 'right', alpha: rA });
      K.text(ctx, '2021.9 高点 3723', x0 - 24, yOf(TP) + 8, { font: F.serif(900, 22), color: C.red, align: 'right', alpha: tA });
      K.arrow(ctx, 1000, yOf(E) - 8, 1000, yOf(TP) + 10, { p: S.at(1, .8, 1.2), color: C.red, width: 4, head: 20 });
      K.text(ctx, '近 400 点', 976, (yOf(E) + yOf(TP)) / 2, { font: F.serif(900, 30), align: 'right', color: C.red, alpha: S.at(1, 1.6, .6), glow: .6, glowColor: C.red });
      K.text(ctx, '试错约 30 点', 1130, yOf(SL) + 34, { font: F.serif(900, 20), color: C.green, alpha: S.at(0, 2.0, .6) });
      const ra = S.at(2, .4, .6, easeBack);
      if (ra > 0) { ctx.save(); ctx.translate(1290, 560); const s = lerp(1.6, 1, clamp(ra)); ctx.scale(s, s);
        K.text(ctx, '11 : 1', 0, 0, { font: F.serif(900, 64), color: Y, align: 'center', alpha: clamp(ra), glow: 1, glowColor: Y });
        K.text(ctx, '盈亏比（示意计算）', 0, 52, { font: F.serif(700, 18), color: C.gray, align: 'center', alpha: clamp(ra) }); ctx.restore(); }
      K.text(ctx, '15 分钟 ATR 约 10 点（示意）', x1, 880, { font: F.serif(700, 16), color: C.gray, align: 'right', alpha: S.at(0, 2.4, .6) });
    } },

  { id: 'trail', header: H4, dur: 16.2, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '高阶技巧：{移动被动止盈}', d: 5.2 }, { s: '止损跟随前低上移，锁在下方 1 个 ATR', d: 5.2 }, { s: '放胆去赢，{底线锁死}', d: 5.2 }],
    visual(ctx, S) {
      const c = chTR, rv = TR_N * S.lin(0, .4, 13.0), xr = c.box.x + c.box.w;
      drawChart(ctx, c, rv, { dim: () => .85 });
      K.text(ctx, '1 小时图（示意）', c.box.x, c.box.y - 14, { font: F.serif(700, 18), color: C.gray });
      // the stop climbs like a lift, one notch per confirmed higher low
      let lvl = TR_STEPS[0][1], from = TR_STEPS[0][1], tStep = -9;
      TR_STEPS.forEach(([i, p]) => { if (rv >= i) { from = lvl; lvl = p; tStep = .4 + 13.0 * i / TR_N; } });
      const u = smooth(clamp((S.t - S.beat(0) - tStep) / .45)), cur = lerp(from, lvl, u), sy = c.y(cur), sA = S.at(0, .2, .6);
      K.line(ctx, c.box.x, sy, xr, sy, { p: sA, color: C.green, width: 3, glow: .9 });
      shield(ctx, xr + 36, sy, 1, sA);
      K.text(ctx, '移动止损', xr + 68, sy + 7, { font: F.serif(900, 17), color: C.green, alpha: sA });
      TRp.swings.filter(s => s.type === 'L').forEach(s => { const a = clamp((rv - s.i - 1) * 2);
        K.marker(ctx, c.x(s.i), c.y(s.price) + 4, { alpha: a * .9, r: 9, color: C.red }); });
      ring(ctx, xr + 36, sy, (S.t - S.beat(0) - tStep) / .9, C.goldHi, 90);
      tagAt(ctx, 960, 850, '既给波动留空间，又把利润锁进保险箱', { alpha: S.at(2, .6, .6, easeBack), color: Y, font: F.serif(900, 22) });
    } },

  /* ================= 2:22.6 FINALE — collapse to a golden point, short and fast ================= */
  { id: 'phil', dur: 10.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    visual(ctx, S) {
      const t = S.t, col = smooth(clamp(t / 1.0)), R = K.rng(91);
      if (col < 1) for (let i = 0; i < 50; i++) { const x0 = 200 + R() * 1520, y0 = 250 + R() * 600, h = 20 + R() * 80;
        const x = lerp(x0, 960, col), y = lerp(y0, 540, col); ctx.save(); ctx.globalAlpha = (1 - col) * .7; ctx.fillStyle = R() < .5 ? C.red : C.green; ctx.fillRect(x - 6, y - h * (1 - col) / 2, 12, h * (1 - col)); ctx.restore(); }
      flash(ctx, 960, 540, (t > 1.0 ? 1 : 0) * clamp(1 - (t - 1.0) / .8), 900, C.goldHi); ring(ctx, 960, 540, (t - 1.0) / 1.0, C.goldHi, 1000);
      ctx.save(); ctx.fillStyle = `rgba(2,2,3,${(.92 * smooth(clamp((t - .9) / .8))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
      const rows = [['随趋势抬高防线，', 380, 1.6, 36], ['既给波动留空间，又将利润锁进保险箱。', 480, 2.6, 36], ['交易不是预测未来，', 610, 3.8, 42], ['而是把自己化为概率执行的机器。', 720, 5.0, 46]];
      rows.forEach(([str, y, t0, sz], j) => {
        const u = smooth(clamp((t - t0) / .5)); if (u <= .002) return;
        const [sx, sy] = shake(t, t0, j === 3 ? 16 : 5, 6);
        ctx.save(); ctx.translate(960 + sx, y - 20 + sy); const s = lerp(1.3, 1, u); ctx.scale(s, s); ctx.translate(-960, -(y - 20));
        ctx.filter = u < 1 ? `blur(${((1 - u) * 9).toFixed(1)}px)` : 'none';
        K.goldText(ctx, str, 960, y, sz, { alpha: u, glow: j === 3 ? 1.2 : .9, spacing: j >= 2 ? 5 : 3 });
        ctx.restore();
      });
      ring(ctx, 960, 700, (t - 5.0) / 1.2, C.goldHi, 900);
      if (t > 3.8) K.rule(ctx, 960, 540, 300, S.p(3.9, .8), { alpha: .7 });
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
      K.text(ctx, '看透图表的真相', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(.9, .9) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.2, .9) });
    } },
  ],
};
})();

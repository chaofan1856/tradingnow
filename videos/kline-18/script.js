/* ============================================================
   《K线18种终极形态》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py + sfx.json)

   Clock pinned to the music: the drop at 16.7 s is the lightning title over the two lines of
   money; the quiet section (85.3–103.2 s) raises the flagpole and builds the flag, and the
   track's return at 103.2 s is the flag breakout. Short, fast finale: all 18 at a glance.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const Y = '#FFD34D';                                               // core breakout signal: yellow

const H0 = { label: '破局', sub: '表象与本质', en: 'Shapes & Substance', zh: '《K线18种终极形态》' };
const HR = { label: '反转', sub: '能量的衰竭与交接', en: 'Reversal Patterns', zh: '《趋势反转 · 9 种》' };
const HC = { label: '延续', sub: '强势修正 · 中继换挡', en: 'Continuation Patterns', zh: '《趋势延续 · 9 种》' };
const HT = { label: '延续', sub: '临界收敛 · 波动压缩', en: 'Converging Patterns', zh: '《趋势延续 · 9 种》' };
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

/* ---------------- the 18 patterns, as normalised line paths (x → right, y → up) ---------------- */
const G = C.gray;
const P = {};
P[1] = { name: '双顶（M头）', kw: '主力高位出货', pts: [[0, .15], [.25, .8], [.42, .5], [.6, .8], [.78, .45], [1, .08]], g: [[.1, .8, .9, .8, C.green, '阻力'], [.3, .5, .95, .5, G, '颈线']] };
P[2] = { name: '三重顶', kw: '跌破颈线 · 暴跌', pts: [[0, .15], [.18, .78], [.3, .5], [.48, .8], [.62, .5], [.78, .78], [.88, .5], [1, .06]], g: [[.08, .79, .86, .79, C.green, '阻力'], [.24, .5, .96, .5, G, '颈线']] };
P[3] = { name: '头肩顶', kw: '右肩无力 · 空头掌控', pts: [[0, .15], [.18, .62], [.3, .45], [.5, .9], [.66, .45], [.8, .62], [.9, .42], [1, .08]], g: [[.22, .45, .96, .45, G, '颈线']], lab: [[1, '左肩', 'a'], [3, '头', 'a'], [5, '右肩', 'a']] };
P[4] = { name: '圆弧顶', kw: '动能如抛物线耗尽', pts: [...Array.from({ length: 31 }, (_, i) => { const u = i / 30 * .9; return [u, .22 + .6 * Math.pow(Math.sin(Math.PI * u / .9), .75)]; }), [1, .06]], g: [] };
const flipY = (Q, name, kw, col) => ({ name, kw, pts: Q.pts.map(([x, y]) => [x, 1 - y]), g: Q.g.map(([a, b, c, d, gc, lb]) => [a, 1 - b, c, 1 - d, lb === '阻力' ? C.red : lb === '支撑' ? C.green : gc, lb === '阻力' ? '支撑' : lb === '支撑' ? '阻力' : lb]), lab: Q.lab && Q.lab.map(([i, t, s]) => [i, t, s === 'a' ? 'b' : 'a']) });
P[5] = flipY(P[1], '双底（W底）', '同一支撑二次吸筹');
P[6] = flipY(P[2], '三重底', '洗净浮动筹码');
P[7] = flipY(P[3], '头肩底', '最坚固的吸筹形态');
P[8] = flipY(P[4], '圆弧底', '冷清吸筹 · 爆发力强');
P[9] = { name: 'V形顶/底', kw: '情绪急转 · 速度极快', pts: [[0, .9], [.5, .1], [1, .92]], g: [] };
const V_TOP = { name: '倒转V形顶', kw: '利好出尽 · 急跌', pts: [[0, .12], [.5, .92], [1, .08]], g: [] };
const V_BOT = { name: 'V形底', kw: '利空出尽 · 急涨', pts: [[0, .88], [.5, .08], [1, .92]], g: [] };
P[10] = { name: '上升旗形', kw: '突破旗面 · 涨势延续', pts: [[0, .12], [.08, .15], [.3, .75], [.38, .62], [.44, .7], [.52, .56], [.58, .64], [.66, .5], [.72, .58], [1, .98]],
  g: [[.3, .75, .76, .557, C.green, ''], [.38, .62, .76, .46, C.green, '']] };
P[11] = { name: '下降旗形', kw: '通常是诱多陷阱', pts: [[0, .95], [.28, .25], [.4, .4], [.48, .3], [.58, .45], [.66, .35], [.76, .5], [.84, .38], [1, .04]],
  g: [[.28, .35, .86, .522, G, ''], [.3, .25, .86, .405, G, '']] };
P[12] = { name: '上升通道', kw: '多头动能稳定输出', pts: [[0, .1], [.15, .35], [.25, .22], [.42, .52], [.52, .4], [.7, .7], [.8, .58], [1, .9]],
  g: [[.05, .286, 1, .894, C.red, ''], [.05, .092, 1, .70, C.red, '']] };
P[13] = { name: '下降通道', kw: '未突破前绝不抄底', pts: P[12].pts.map(([x, y]) => [x, 1 - y]), g: [[.05, .714, 1, .106, C.green, ''], [.05, .908, 1, .30, C.green, '']] };
P[14] = { name: '矩形箱体', kw: '主力横盘洗盘区', pts: [[0, .3], [.1, .7], [.22, .32], [.36, .7], [.5, .3], [.64, .7], [.78, .3], [.88, .7], [1, .95]], g: [[.04, .7, .92, .7, C.gold, '箱顶'], [.04, .3, .92, .3, C.gold, '箱底']] };
P[15] = { name: '对称三角形', kw: '惊天变盘即将来临', pts: [[0, .5], [.1, .9], [.25, .15], [.42, .78], [.56, .3], [.68, .66], [.78, .42], [.85, .58], [1, .95]], g: [[.1, .9, .92, .564, Y, ''], [.2, .125, .92, .485, Y, '']], spark: true };
P[16] = { name: '上升三角形', kw: '多头突破概率极高', pts: [[0, .2], [.15, .75], [.28, .3], [.45, .75], [.58, .45], [.72, .75], [.82, .6], [.9, .75], [1, .98]], g: [[.1, .75, .94, .75, Y, '水平阻力'], [.2, .256, .94, .667, C.red, '']], spark: true };
P[17] = { name: '下降三角形', kw: '支撑终将崩溃 · 暴跌', pts: P[16].pts.map(([x, y]) => [x, 1 - y]).map((q, i, a) => i === a.length - 1 ? [1, .02] : q), g: [[.1, .25, .94, .25, C.green, '水平支撑'], [.2, .744, .94, .333, C.green, '']] };
P[18] = { name: '扩散喇叭形', kw: '牛末出货 · 危险信号', pts: [[0, .5], [.12, .62], [.24, .38], [.4, .75], [.55, .25], [.72, .88], [.88, .1], [1, .04]], g: [[.04, .585, .8, .92, Y, ''], [.1, .43, .92, .07, Y, '']] };

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
const LB = { x: 190, y: 430, w: 660, h: 340 }, RB = { x: 1070, y: 430, w: 660, h: 340 };
/** split-screen pair: left draws on line 0, right on line 1 */
function pairScene(id, header, l, r, lines, dur, colL, colR, tr) {
  return { id, header, dur, tr: tr || ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6, lines,
    visual(ctx, S) {
      K.line(ctx, 960, 390, 960, 390 + 440 * smooth(S.at(0, 0, 1.0)), { color: C.gold, width: 1.2, glow: .5, alpha: .55 });
      [[l, LB, colL, 0], [r, RB, colR, 1]].forEach(([Q, b, col, j]) => {
        const p = smooth(S.lin(j, .25, 3.3)), ta = S.at(j, 0, .6, easeBack), on = j === Math.max(0, S.line()) ? 1 : .55;
        K.text(ctx, `${Q.n} · ${Q.name}`, b.x + b.w / 2, 400, { font: F.serif(900, 26), color: col, align: 'center', alpha: clamp(ta), glow: .5, glowColor: col });
        pat(ctx, Q, b, p, { alpha: lerp(1, on, S.at(1, 0, .6)) });
        tagAt(ctx, b.x + b.w / 2, 812, Q.kw, { alpha: S.at(j, 3.0, .6, easeBack), color: col, font: F.serif(900, 20) });
      });
    } };
}
for (const k in P) P[k].n = +k;
V_TOP.n = 9; V_BOT.n = 9;

window.FILM = {
  title: 'K线18种终极形态',
  transition: 1.2,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },
  scenes: [

  /* ================= 0:00 HOOK ================= */
  { id: 'hook', dur: 6.0, camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, hit = .3;
      [[0, C.red], [1, C.green]].forEach(([j, col]) => {                 // two lines of money flicker behind
        const pts = []; for (let i = 0; i <= 80; i++) { const u = i / 80; pts.push([100 + 1720 * u, 540 + Math.sin(u * 9 + t * 2 + j * 2.4) * (90 + 40 * j)]); }
        poly(ctx, pts, smooth(clamp((t - 2.2) / 1.6)), { color: col, width: 3, blur: 16, alpha: .45, head: false });
      });
      const [sx, sy] = shake(t, hit, 18, 5), p = clamp((t - .05) / .3), s = lerp(2.2, 1, easeOut(p));
      ctx.save(); ctx.translate(960 + sx, 500 + sy); ctx.scale(s, s);
      ctx.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '散户记形态，', 0, -30, { font: F.serif(900, 56), color: C.white, align: 'center', alpha: p, glow: .5, glowColor: C.green, spacing: 4 });
      ctx.restore();
      const q = clamp((t - 1.1) / .3), s2 = lerp(2.2, 1, easeOut(q)), [qx, qy] = shake(t, 1.35, 16, 5);
      ctx.save(); ctx.translate(960 + qx, 610 + qy); ctx.scale(s2, s2);
      ctx.filter = q < 1 ? `blur(${((1 - q) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '主力看动能。', 0, 30, { font: F.serif(900, 56), color: C.white, align: 'center', alpha: q, glow: .7, glowColor: C.red, spacing: 4 });
      ctx.restore();
      flash(ctx, 960, 500, (t > hit ? 1 : 0) * clamp(1 - (t - hit) / .5), 600, '#FFFFFF');
      flash(ctx, 960, 620, (t > 1.35 ? 1 : 0) * clamp(1 - (t - 1.35) / .5), 500, C.red);
    } },

  /* ================= 0:06 18 SHAPES → TWO LINES OF MONEY ================= */
  { id: 'stars', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.04, z1: 1.0 }, ...BOT, pre: 3.6,
    lines: [{ s: '万变不离其宗：核心形态只有{18 种}', d: 3.4 }, { s: '本质都是主力资金的[能量]留痕', d: 3.7 }],
    visual(ctx, S) {
      const t = S.t, R = K.rng(88), conv = smooth(clamp((t - 4.6) / 2.4));
      for (let k = 1; k <= 18; k++) {
        const x0 = 250 + ((k - 1) % 6) * 284 + (R() - .5) * 90, y0 = 250 + Math.floor((k - 1) / 6) * 210 + (R() - .5) * 60, dx = (R() - .5) * 40, dy = (R() - .5) * 30, ph = R() * 6;
        const appear = smooth(clamp((t - .1 - k * .1) / .6)), tw = .7 + .3 * Math.sin(t * 3 + ph);
        const tx = lerp(x0 + dx * t, 160 + (k - 1) / 17 * 1600, conv), ty = lerp(y0 + dy * t, 470, conv), sc = lerp(1, .3, conv);
        const w = 130 * sc, h = 70 * sc;
        pat(ctx, P[k], { x: tx - w / 2, y: ty - h / 2, w, h }, 1, { small: true, w: 2.2, gw: 1, alpha: appear * tw * (1 - conv) * .95 });
      }
      const lp = smooth(clamp((t - 5.4) / 2.4));
      [[0, C.red], [1, C.green]].forEach(([j, col]) => {
        const pts = []; for (let i = 0; i <= 90; i++) { const u = i / 90; pts.push([120 + 1680 * u, 470 + Math.sin(u * 8 + t * 2.2 + j * 2.6) * (70 + 50 * j) * (.4 + .6 * u)]); }
        poly(ctx, pts, lp, { color: col, width: 4, blur: 22, head: true });
      });
      K.text(ctx, '资金线 · 红多 / 绿空', 120, 690, { font: F.serif(700, 18), color: C.gray, alpha: S.p(7.6, .8) });
    } },

  /* ================= 0:16.7 LIGHTNING TITLE ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 }, ...BOT, pre: 4.6,
    lines: [{ s: '看透最核心的{18 种 K 线形态}', d: 2.8 }, { s: '以及背后的{多空底层逻辑}', d: 2.9 }],
    visual(ctx, S) {
      const t = S.t, z = .15;
      const R = K.rng(53), pts = []; let x = -60, y = 220, up = 1;
      while (x < 1980) { pts.push([x, y]); x += 70 + R() * 70; y += up * (50 + R() * 80) + 10; up = -up; }
      const bp = clamp((t - z) / .22), fade = clamp(1 - (t - z - .25) / .9);
      if (bp > 0 && fade > 0) { poly(ctx, pts, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false }); poly(ctx, pts, bp, { color: C.goldHi, width: 14, blur: 60, alpha: fade * .35, head: false }); flash(ctx, 960, 360, fade, 1100, C.goldHi); }
      const tp = S.p(z + .35, 1.2, K.expo);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 220, 1920, 150); ctx.clip();
      K.goldText(ctx, 'K线18种终极形态', 960, 340 + (1 - tp) * 120, 58, { spacing: 12, alpha: tp });
      ctx.restore();
      const la = S.p(.9, 1.2);
      [[0, C.red], [1, C.green]].forEach(([j, col]) => {
        const pts2 = []; for (let i = 0; i <= 90; i++) { const u = i / 90; pts2.push([160 + 1600 * u, 560 + Math.sin(u * 7 + t * 2.2 + j * 2.6) * (55 + 30 * j)]); }
        poly(ctx, pts2, 1, { color: col, width: 3.6, blur: 20, alpha: la * .9, head: false });
      });
      tagAt(ctx, 960, 740, '明辨红绿之相，顺行数字之流', { alpha: S.p(2.2, .7, easeBack), color: Y, font: F.serif(900, 28) });
    } },

  /* ================= 壹 · REVERSALS ================= */
  { id: 'ch1', dur: 3.6, tr: 'sweep', visual: chapter('壹', 1, '趋势反转形态 · 9 种', 'Reversal Patterns', '能量的衰竭与交接') },
  pairScene('r1', HR, P[1], P[5], [{ s: '1·双顶：两冲<阻力>失败，主力高位出货', d: 5.0 }, { s: '5·双底：同一[支撑位]二次抄底吸筹', d: 5.4 }], 11.0, C.green, C.red, ['iris', [960, 600]]),
  pairScene('r2', HR, P[2], P[6], [{ s: '2·三重顶：三次冲顶未果，破颈线<暴跌>', d: 5.0 }, { s: '6·三重底：三次筑底，洗净{浮动筹码}', d: 5.4 }], 11.0, C.green, C.red),
  pairScene('r3', HR, P[3], P[7], [{ s: '3·头肩顶：右肩无力新高，<空头掌控>', d: 5.0 }, { s: '7·头肩底：最坚固的吸筹，[趋势向上]', d: 5.4 }], 11.0, C.green, C.red),
  pairScene('r4', HR, P[4], P[8], [{ s: '4·圆弧顶：弧形慢速出货，<动能耗尽>', d: 5.0 }, { s: '8·圆弧底：冷清中吸筹，{爆发力强}', d: 5.4 }], 11.0, C.green, C.red),
  pairScene('r5', HR, V_TOP, V_BOT, [{ s: '9·V形反转：利好利空引发{情绪急转}', d: 4.9 }, { s: '速度极快——顶部<急跌>，底部[急涨]', d: 5.2 }], 10.7, C.green, C.red),

  /* ================= 贰 · CONTINUATION (quiet section → the flag breaks out on the return) ================= */
  { id: 'ch2', dur: 3.6, tr: 'sweep', visual: chapter('贰', 2, '趋势延续形态 · 9 种', 'Continuation Patterns', '洪流中的歇息 · 中继与蓄势') },

  { id: 'flag', header: HC, dur: 19.8, tr: ['iris', [960, 600]], camera: { z0: 1.0, z1: 1.04, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '强势修正：主力在下一次进攻前{中继换挡}', d: 6.6 }, { s: '10·上升旗形：暴涨后微幅向下<洗盘>', d: 7.1 }, { s: '突破旗面——[涨势延续]', d: 5.5 }],
    visual(ctx, S) {
      const b = { x: 360, y: 400, w: 1200, h: 400 }, Q = P[10], X = x => b.x + x * b.w, Yp = y => b.y + (1 - y) * b.h, tB = S.beat(2);
      const [sx, sy] = shake(S.t, tB, 10, 5);
      ctx.save(); ctx.translate(sx, sy);
      // the energy column bursts out of the ground (the pole)
      const cA = smooth(S.lin(0, .6, 2.2)), cx = X(.19), top = lerp(Yp(.12), Yp(.75), cA);
      if (cA > 0) { const g = ctx.createLinearGradient(0, top, 0, Yp(.06)); g.addColorStop(0, rgba(C.red, .55)); g.addColorStop(1, rgba(C.red, 0));
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = g; ctx.fillRect(cx - 34, top, 68, Yp(.06) - top); ctx.restore(); }
      K.text(ctx, '旗杆', X(.19) - 70, Yp(.45), { font: F.serif(900, 22), color: C.red, align: 'right', alpha: S.at(0, 2.4, .6) });
      // path: pole on line 0, flag on line 1, breakout exactly on the beat
      const n = Q.pts.length, cut = n - 2;                                 // index of the last flag point
      const sub = (i0, i1) => ({ ...Q, pts: Q.pts.slice(i0, i1 + 1), g: [] });
      pat(ctx, sub(0, 2), b, smooth(S.lin(0, .6, 2.2)), { w: 7, ga: 0, fx: false });
      const fp = smooth(S.lin(1, .2, 4.6));
      const fA = S.at(1, 1.0, 1.0);
      if (fA > 0) { ctx.save(); ctx.globalAlpha = .1 * fA; ctx.fillStyle = C.gold; ctx.beginPath(); ctx.moveTo(X(.3), Yp(.75)); ctx.lineTo(X(.76), Yp(.557)); ctx.lineTo(X(.76), Yp(.46)); ctx.lineTo(X(.38), Yp(.62)); ctx.closePath(); ctx.fill(); ctx.restore(); }
      Q.g.forEach(([x1, y1, x2, y2, col]) => K.dash(ctx, X(x1), Yp(y1), X(x2), Yp(y2), { p: fA, color: col, width: 2 }));
      K.text(ctx, '旗面：微幅向下洗盘', X(.53), Yp(.82), { font: F.serif(900, 20), color: C.green, align: 'center', alpha: S.at(1, 2.0, .6) });
      pat(ctx, sub(2, cut), b, fp, { w: 4.5, ga: 0, fx: false });
      const bp = clamp((S.t - tB) / .55);
      if (bp > 0) pat(ctx, sub(cut, n - 1), b, easeOut(bp), { w: 7, ga: 0, fx: false });
      const ex = lerp(X(Q.pts[cut][0]), X(1), .25), ey = lerp(Yp(Q.pts[cut][1]), Yp(.98), .25);
      flash(ctx, ex, ey, (S.t >= tB ? 1 : 0) * clamp(1 - (S.t - tB) / 1.3), 460, C.red);
      ring(ctx, ex, ey, (S.t - tB) / 1.2, Y, 260);
      sparks(ctx, ex, ey, clamp((S.t - tB) / 1.4), 34);
      tagAt(ctx, X(.9) + 20, Yp(.5), '突破旗面 · 涨势延续', { side: 'right', alpha: S.at(2, 1.0, .6, easeBack), color: C.red, font: F.serif(900, 22) });
      ctx.restore();
    } },

  pairScene('c1', HC, P[11], P[12], [{ s: '11·下降旗形：弱势反弹，常是{诱多陷阱}', d: 4.1 }, { s: '12·上升通道：[多头动能]稳定输出', d: 4.3 }], 9.0, C.green, C.red),
  pairScene('c2', HC, P[13], P[14], [{ s: '13·下降通道：未突破前<绝不抄底>', d: 4.1 }, { s: '14·矩形箱体：区间拉锯，{横盘洗盘}', d: 4.3 }], 9.0, C.green, C.goldHi),
  pairScene('c3', HT, P[15], P[16], [{ s: '15·对称三角：波动压缩，{变盘将至}', d: 4.1 }, { s: '16·上升三角：多头{向上突破}概率极高', d: 4.3 }], 9.0, Y, C.red),
  pairScene('c4', HT, P[17], P[18], [{ s: '17·下降三角：支撑终将崩溃，<暴跌>', d: 4.1 }, { s: '18·扩散喇叭：情绪失控，{危险信号}', d: 4.3 }], 9.0, C.green, Y),

  /* ================= 2:24.7 FINALE — all 18 at a glance, then one gold line ================= */
  { id: 'phil', dur: 10.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03 },
    visual(ctx, S) {
      const t = S.t, dim = 1 - smooth(clamp((t - 4.0) / 1.0));
      if (dim > 0) {
        K.goldText(ctx, 'K线 18 种终极形态 · 速查', 960, 215, 34, { spacing: 6, alpha: S.p(.1, .6) * dim });
        for (let k = 1; k <= 18; k++) {
          const r = Math.floor((k - 1) / 6), c = (k - 1) % 6, x = 105 + c * 290, y = 262 + r * 262, a = S.p(.15 + (k - 1) * .05, .45, easeBack) * dim;
          if (a <= 0) continue;
          const col = [1, 2, 3, 4, 11, 13, 17].includes(k) ? C.green : [15, 18].includes(k) ? Y : k === 14 ? C.gold : C.red;
          frame(ctx, x, y + (1 - clamp(a)) * 30, 260, 236, clamp(a), .25, col);
          pat(ctx, P[k], { x: x + 26, y: y + 24 + (1 - clamp(a)) * 30, w: 208, h: 120 }, 1, { small: true, w: 2.6, gw: 1.2, alpha: clamp(a) });
          K.text(ctx, `${k} ${P[k].name}`, x + 130, y + 206 + (1 - clamp(a)) * 30, { font: F.serif(900, 17), color: C.white, align: 'center', alpha: clamp(a) });
        }
      }
      const rows = [['形态只是表象，', 480, 5.0, 40], ['主力资金的成本与意图，才是灵魂。', 610, 6.4, 46]];
      rows.forEach(([str, y, t0, sz], j) => {
        const u = smooth(clamp((t - t0) / .6)); if (u <= .002) return;
        const [sx, sy] = shake(t, t0, j ? 14 : 6, 6);
        ctx.save(); ctx.translate(960 + sx, y - 20 + sy); const s = lerp(1.3, 1, u); ctx.scale(s, s); ctx.translate(-960, -(y - 20));
        ctx.filter = u < 1 ? `blur(${((1 - u) * 9).toFixed(1)}px)` : 'none';
        K.goldText(ctx, str, 960, y, sz, { alpha: u, glow: j ? 1.2 : .9, spacing: j ? 6 : 4 });
        ctx.restore();
        ring(ctx, 960, y - 20, (t - t0) / 1.2, C.goldHi, j ? 900 : 500);
      });
      if (t > 6.4) K.rule(ctx, 960, 530, 300, S.p(6.6, .8), { alpha: .7 });
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
      K.text(ctx, 'K线18种终极形态', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(.9, .9) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.2, .9) });
    } },
  ],
};
})();

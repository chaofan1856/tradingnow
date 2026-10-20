/* ============================================================
   《技术指标之王-MACD》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py + sfx.json)

   Clock pinned to the music: the drop at 16.7 s is the lightning title and the golden brain
   (多空心理学); the quiet section (85.3–103.2 s) lays out DIF and DEA and measures the gap, and
   the track's return at 103.2 s is the lightning that throws up the histogram. Short, fast finale.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const Y = '#FFD34D';                                               // turning points / core secrets: yellow

const H0 = { label: '破题', sub: '谁在操控你的屏幕', en: 'The King of Indicators', zh: '《技术指标之王》' };
const HA = { label: '起源', num: 1, sub: '1979 · 杰拉德·阿佩尔', en: 'Gerald Appel, 1979', zh: '《跨界奇才》' };
const HB = { label: '起源', num: 2, sub: '从均线交叉到距离差', en: 'From Crosses to DIF', zh: '《跨界奇才》' };
const HC = { label: '起源', num: 3, sub: '恐惧、贪婪与动能', en: 'Fear, Greed, Momentum', zh: '《跨界奇才》' };
const HD = { label: '进化', num: 1, sub: '1986 · 能量柱诞生', en: 'The Histogram, 1986', zh: '《能量柱的进化》' };
const HE = { label: '进化', num: 2, sub: '底背离 · 提早数个周期', en: 'Divergence', zh: '《能量柱的进化》' };
const HF = { label: '进化', num: 3, sub: '量化时代的底层天条', en: 'The Quant Era', zh: '《能量柱的进化》' };
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
/** gear outline */
function gear(ctx, x, y, r, rot, a, col = Y) {
  if (a <= .002) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 16;
  ctx.beginPath(); for (let k = 0; k < 24; k++) { const ang = k / 24 * Math.PI * 2, rr = k % 2 ? r : r * 1.22; ctx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr); } ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 0, r * .4, 0, 6.2832); ctx.stroke(); ctx.restore();
}

/** aged parchment card (1979 / 1986 flashbacks) */
function parchment(ctx, x, y, w, h, a, t) {
  if (a <= .002) return;
  const flick = .92 + .08 * Math.sin(t * 37) * Math.sin(t * 13);
  ctx.save(); ctx.globalAlpha *= clamp(a) * flick;
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#4A3A22'); g.addColorStop(.5, '#3A2D1A'); g.addColorStop(1, '#2B2113');
  ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 30;
  ctx.beginPath(); const R = K.rng(5); ctx.moveTo(x, y);
  for (let i = 1; i <= 20; i++) ctx.lineTo(x + w * i / 20, y + (R() - .5) * 6);
  for (let i = 1; i <= 10; i++) ctx.lineTo(x + w + (R() - .5) * 6, y + h * i / 10);
  for (let i = 19; i >= 0; i--) ctx.lineTo(x + w * i / 20, y + h + (R() - .5) * 6);
  for (let i = 9; i >= 0; i--) ctx.lineTo(x + (R() - .5) * 6, y + h * i / 10);
  ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,230,180,.12)'; ctx.lineWidth = 1;                       // scratches
  for (let i = 0; i < 14; i++) { const sx = x + R() * w, sy = y + R() * h; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (R() - .5) * 120, sy + (R() - .5) * 20); ctx.stroke(); }
  const v = ctx.createRadialGradient(x + w / 2, y + h / 2, h * .2, x + w / 2, y + h / 2, w * .7); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = v; ctx.fillRect(x, y, w, h); ctx.restore();
}
/** a stylised brain: two hemispheres with folds, gold */
function brain(ctx, cx, cy, s, a, t) {
  if (a <= .002) return;
  ctx.save(); ctx.translate(cx, cy); ctx.scale(s, s); ctx.globalAlpha *= clamp(a);
  ctx.strokeStyle = C.goldHi; ctx.lineWidth = 3.2 / s * 1.0; ctx.lineCap = 'round'; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 20;
  [-1, 1].forEach(d => {
    ctx.beginPath(); ctx.moveTo(0, -78);
    ctx.bezierCurveTo(d * 40, -100, d * 92, -90, d * 104, -44); ctx.bezierCurveTo(d * 126, -20, d * 118, 30, d * 96, 46);
    ctx.bezierCurveTo(d * 88, 78, d * 44, 86, d * 22, 70); ctx.bezierCurveTo(d * 10, 78, 0, 74, 0, 64); ctx.stroke();
    ctx.lineWidth = 2.2;
    [[[d * 20, -60], [d * 50, -50], [d * 46, -24]], [[d * 70, -60], [d * 88, -30], [d * 70, -10]], [[d * 30, -14], [d * 60, 4], [d * 40, 28]], [[d * 86, 14], [d * 70, 34], [d * 52, 50]]]
      .forEach(([p0, p1, p2]) => { ctx.beginPath(); ctx.moveTo(...p0); ctx.quadraticCurveTo(...p1, ...p2); ctx.stroke(); });
    ctx.lineWidth = 3.2;
  });
  ctx.beginPath(); ctx.moveTo(0, -78); ctx.lineTo(0, 64); ctx.stroke();
  ctx.restore();
  for (let k = 0; k < 14; k++) {                                       // refracted rays
    const ang = k / 14 * Math.PI * 2 + t * .25, r0 = 150 * s, L = (40 + 30 * Math.abs(Math.sin(t * 2 + k))) * s;
    K.line(ctx, cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0, cx + Math.cos(ang) * (r0 + L), cy + Math.sin(ang) * (r0 + L), { color: C.goldHi, width: 1.6, glow: .9, alpha: clamp(a) * .7 });
  }
}

/* ---------------- data ---------------- */
const JM = series([104, 112, 103, 110, 101, 109, 104, 113, 106], [5, 4, 5, 4, 5, 4, 5, 4], 601);
const chJM = new K.Chart(JM.K, { x: 260, y: 220, w: 1400, h: 300 });
// the 1970s pain: moving averages braided in a range
const TGp = K.gen.path([110, 113, 108.5, 112.5, 109, 113, 108, 112, 109, 112.5], { per: 3, seed: 611, noise: .5, wick: .45 });
const TGK = TGp.candles, TG5 = sma(TGK, 3), TG10 = sma(TGK, 7);
const chTG = new K.Chart(TGK, { x: 260, y: 380, w: 1400, h: 300 });
const TG_X = []; for (let i = 8; i < TGK.length; i++) { const d0 = TG5[i - 1] - TG10[i - 1], d1 = TG5[i] - TG10[i]; if (d0 * d1 < 0) TG_X.push(i - d1 / (d1 - d0)); }
// Appel's idea: the distance between fast and slow
const DF = series([100, 120, 117, 119, 104, 103], [14, 4, 5, 9, 4], 621);
const chDF = new K.Chart(DF.K, { x: 260, y: 370, w: 1400, h: 270 });
// Aspray: DIF − DEA
const AS = series([100, 110, 104, 112, 103, 108, 100, 106], [6, 5, 6, 6, 5, 6, 5], 631);
const chAS = new K.Chart(AS.K, { x: 260, y: 400, w: 1400, h: 300 });
// divergence: lower low on price, green bars shrink fast
const DVp = K.gen.path([118, 108, 111.5, 104, 107.5, 102.6, 107], { per: [5, 3, 5, 3, 5, 4], seed: 641, noise: .35, wick: .4 });
const DVK = DVp.candles, DV_SW = DVp.swings;
const DVH = curve([[0, -.1], [DV_SW[0].i, -.55], [DV_SW[1].i, .15], [DV_SW[2].i, -1], [DV_SW[3].i, -.15], [DV_SW[4].i, -.4], [DV_SW[4].i + 2, -.05], [DVK.length - 1, .45]], DVK.length);
const DV_TURN = DV_SW[4].i, DV_ZERO = (() => { for (let i = DV_TURN; i < DVH.length; i++) if (DVH[i] >= 0) return i; return DVH.length - 1; })();
const chDV = new K.Chart(DVK, { x: 260, y: 360, w: 1400, h: 260 }, { lo: 100.5, hi: 120 });

window.FILM = {
  title: '技术指标之王-MACD',
  transition: 1.2,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },
  scenes: [

  /* ================= 0:00 HOOK — the slide racks, gold words drop ================= */
  { id: 'hook', dur: 6.0, camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, hit = .45;
      const [sx, sy] = shake(t, hit, 18, 5), p = clamp((t - hit + .25) / .3), s = lerp(2.2, 1, easeOut(p));
      ctx.save(); ctx.translate(960 + sx, 520 + sy); ctx.scale(s, s);
      ctx.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
      K.goldText(ctx, '为什么全球 99% 的看盘软件，', 0, -40, 44, { alpha: p, glow: 1, spacing: 3 });
      K.goldText(ctx, '默认开启的第一个指标都是 MACD？', 0, 70, 44, { alpha: p, glow: 1, spacing: 3 });
      ctx.restore();
      flash(ctx, 960, 500, (t > hit ? 1 : 0) * clamp(1 - (t - hit) / .5), 650, C.goldHi);
      ring(ctx, 960, 500, (t - hit) / 1.2, C.goldHi, 800);
    } },

  /* ================= 0:06 THE BREATHING BARS ================= */
  { id: 'breath', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.03, z1: 1.0 }, ...BOT, pre: 3.6,
    lines: [{ s: '它被称为金融市场的{“指标之王”}', d: 3.4 }, { s: '不是冰冷的公式，而是{群体心理天条}', d: 3.7 }],
    visual(ctx, S) {
      const c = chJM, rv = JM.K.length * smooth(S.lin(0, -3.4, 6.4)), br = 1 + .06 * Math.sin(S.t * 3.2);
      drawChart(ctx, c, rv, { dim: () => .85 });
      ctx.save(); ctx.translate(0, 660); ctx.scale(1, br); ctx.translate(0, -660);
      macdPanel(ctx, c, JM, 560, 200, rv, S.p(.3, .8), { label: 'MACD' });
      ctx.restore();
    } },

  /* ================= 0:16.7 LIGHTNING TITLE — the brain: 多空心理学 ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 }, ...BOT, pre: 4.6,
    lines: [{ s: '2 分钟，跨越{半个世纪}', d: 2.8 }, { s: '看透图表背后的{终极真相}', d: 2.9 }],
    visual(ctx, S) {
      const t = S.t, z = .15;
      const R = K.rng(67), pts = []; let x = -60, y = 220, up = 1;
      while (x < 1980) { pts.push([x, y]); x += 70 + R() * 70; y += up * (50 + R() * 80) + 10; up = -up; }
      const bp = clamp((t - z) / .22), fade = clamp(1 - (t - z - .25) / .9);
      if (bp > 0 && fade > 0) { poly(ctx, pts, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false }); poly(ctx, pts, bp, { color: C.goldHi, width: 14, blur: 60, alpha: fade * .35, head: false }); flash(ctx, 960, 360, fade, 1100, C.goldHi); }
      const tp = S.p(z + .35, 1.2, K.expo);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 220, 1920, 150); ctx.clip();
      K.goldText(ctx, '技术指标之王 · MACD', 960, 340 + (1 - tp) * 120, 58, { spacing: 10, alpha: tp });
      ctx.restore();
      const ba = S.p(1.3, .9, easeBack);
      brain(ctx, 960, 520, .82 * lerp(.6, 1, clamp(ba)), ba, t);
      flash(ctx, 960, 520, clamp(ba) * (.35 + .15 * Math.sin(t * 2.6)), 240, C.goldHi);
      tagAt(ctx, 960, 762, '多空心理学', { alpha: S.p(2.4, .6, easeBack), color: Y, font: F.serif(900, 30) });
    } },

  /* ================= 壹 · THE POLYMATH ================= */
  { id: 'ch1', dur: 3.6, tr: 'sweep', visual: chapter('壹', 1, '跨界奇才的灵感', 'Gerald Appel · 1979', '心理学与物理学的碰撞') },

  { id: 'appel', header: HA, dur: 11.2, tr: ['iris', [960, 520]], camera: { z0: 1.0, z1: 1.04 }, ...TOP, pre: .6,
    lines: [{ s: '1979 年，{杰拉德·阿佩尔}', d: 5.0 }, { s: '诗人、摄影师，更是{执业心理学家}', d: 5.6 }],
    visual(ctx, S) {
      const a = S.at(0, 0, .9);
      parchment(ctx, 560, 380, 800, 260, a, S.t);
      K.text(ctx, '1979', 640, 545, { font: F.serif(900, 64), color: '#E9D3A4', alpha: a * .9 });
      K.text(ctx, '杰拉德·阿佩尔', 960, 500, { font: F.serif(900, 34), color: '#F2E2BC', alpha: S.at(0, .6, .8) });
      K.text(ctx, 'Gerald Appel', 962, 560, { font: F.latin(500, 24), color: '#C9B48A', alpha: S.at(0, 1.0, .8), spacing: 3 });
      [['诗人', 600, C.gray], ['摄影师', 900, C.gray], ['执业心理学家', 1330, Y]].forEach(([str, x, col], j) => {
        const p = S.at(1, .3 + j * 1.0, .5, easeBack), on = j === 2 ? 1 : 1 - .5 * S.at(1, 2.4, .6);
        if (p <= 0) return;
        ctx.save(); ctx.translate(x, 740); const s = lerp(1.8, 1, clamp(p)); ctx.scale(s, s);
        tagAt(ctx, 0, 0, str, { alpha: clamp(p) * on, color: col, font: F.serif(900, j === 2 ? 30 : 24) }); ctx.restore();
        flash(ctx, x, 740, clamp(1 - (S.t - S.beat(1) - .3 - j) / .6) * (S.t > S.beat(1) + .3 + j ? 1 : 0), j === 2 ? 260 : 160, col);
        if (j < 2) K.arrow(ctx, [671, 992][j], 740, [808, 1144][j], 740, { p: S.at(1, .8 + j * 1.0, .4), color: C.gray, width: 2, head: 10 });
      });
    } },

  { id: 'dif', header: HB, dur: 17.6, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '1970 年代：均线在震荡市<反复打脸>', d: 5.4 }, { s: '阿佩尔改看快慢线的{距离差（DIF）}', d: 5.6 }, { s: '距离拉大=[动能喷发]，缩小=<动能枯竭>', d: 6.0 }],
    visual(ctx, S) {
      // the braid of the 1970s
      const oA = 1 - S.at(1, 0, .8);
      if (oA > 0) {
        const c = chTG, rv = TGK.length * smooth(S.lin(0, 0, 2.6)), mp = Math.min(rv / TGK.length + .02, 1);
        ctx.save(); ctx.globalAlpha = oA;
        drawChart(ctx, c, rv, { dim: () => .55 });
        maLine(ctx, c, TG5, 0, TGK.length - 1, mp, { color: '#F4F0E8', width: 3, head: false });
        maLine(ctx, c, TG10, 0, TGK.length - 1, mp, { color: C.gold, width: 3, head: false });
        TG_X.forEach((xi, k) => { const a = S.at(0, 1.2 + k * .12, .3); K.marker(ctx, c.x(xi), c.y(at(TG5, xi)), { alpha: a, r: 8, color: Y }); });
        K.text(ctx, '传统均线 MA（1970 年代）', c.box.x, c.box.y - 14, { font: F.serif(700, 18), color: C.gray, alpha: S.at(0, .2, .6) });
        bigX(ctx, 960, 530, S.at(0, 3.0, .4), 220, C.green);
        ctx.restore();
      }
      // the distance between fast and slow
      const nA = S.at(1, .2, .8);
      if (nA > 0) {
        const c = chDF, n = DF.K.length, rv = n * smooth(S.lin(1, .2, 4.6)) * (1 - 0) , m = Math.min(Math.ceil(rv), n);
        ctx.save(); ctx.globalAlpha = nA;
        drawChart(ctx, c, rv, { dim: () => .45 });
        for (let i = 1; i < m; i++) {                                     // the gap: red while it widens, green while it narrows
          const wide = Math.abs(DF.macd[i]) >= Math.abs(DF.macd[i - 1]), col = wide ? C.red : C.green;
          ctx.save(); ctx.globalAlpha = nA * .28; ctx.fillStyle = col; ctx.beginPath();
          ctx.moveTo(c.x(i - 1), c.y(DF.e12[i - 1])); ctx.lineTo(c.x(i), c.y(DF.e12[i])); ctx.lineTo(c.x(i), c.y(DF.e26[i])); ctx.lineTo(c.x(i - 1), c.y(DF.e26[i - 1])); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        const mp = Math.min(rv / n + .02, 1);
        maLine(ctx, c, DF.e12, 0, n - 1, mp, { color: '#F4F0E8', width: 2.8, head: false });
        maLine(ctx, c, DF.e26, 0, n - 1, mp, { color: C.gold, width: 2.8, head: false });
        const fUp = DF.e12[n - 1] >= DF.e26[n - 1], yF = c.y(DF.e12[n - 1]), yS = c.y(DF.e26[n - 1]);
        K.text(ctx, '快线', c.box.x + c.box.w + 14, fUp ? Math.min(yF, yS) - 4 : Math.max(yF, yS) + 24, { font: F.serif(700, 16), color: '#F4F0E8', alpha: S.at(1, 3.6, .6) });
        K.text(ctx, '慢线', c.box.x + c.box.w + 14, fUp ? Math.max(yF, yS) + 24 : Math.min(yF, yS) - 4, { font: F.serif(700, 16), color: C.gold, alpha: S.at(1, 3.6, .6) });
        // DIF below, coloured by whether the distance grows
        const y0 = 690, h = 130, sc = Math.max(...DF.macd.map(Math.abs)) * 1.1, yOf = v => y0 + h / 2 - v / sc * h / 2;
        K.line(ctx, c.box.x, y0 + h / 2, c.box.x + c.box.w, y0 + h / 2, { color: C.dim, width: 1 });
        K.text(ctx, 'DIF', c.box.x - 18, y0 + 20, { font: F.latin(600, 16), color: C.gray, align: 'right', spacing: 2 });
        for (let i = 1; i < m; i++) { const wide = Math.abs(DF.macd[i]) >= Math.abs(DF.macd[i - 1]);
          K.line(ctx, c.x(i - 1), yOf(DF.macd[i - 1]), c.x(i), yOf(DF.macd[i]), { color: wide ? C.red : C.green, width: 4, glow: .9 }); }
        const lA = S.at(2, .4, .6);
        tagAt(ctx, c.x(7), y0 - 26, '距离拉大 → 动能喷发', { alpha: lA, color: C.red, font: F.serif(900, 20) });
        tagAt(ctx, c.x(26), y0 + h + 6, '距离缩小 → 动能枯竭', { alpha: S.at(2, 1.2, .6), color: C.green, font: F.serif(900, 20) });
        ctx.restore();
      }
    } },

  { id: 'psych', header: HC, dur: 20.4, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '股市波动，是{恐惧与贪婪}的周期性外化', d: 6.6 }, { s: '心理执念有惯性，像物理学的{“动能”}', d: 6.6 }, { s: 'MACD 测量的，是{群体心理动能}的转变', d: 6.6 }],
    visual(ctx, S) {
      const x0 = 260, x1 = 1660, yc = 545, A = 120, P = 700, f = x => yc - A * Math.sin((x - x0) / P * Math.PI * 2);
      const wp = smooth(S.lin(0, 0, 3.2)), pts = [];
      for (let x = x0; x <= x1; x += 6) pts.push([x, f(x)]);
      poly(ctx, pts, wp, { color: C.goldHi, width: 3.4, blur: 16 });
      K.text(ctx, '情绪 / 价格', x1, 400, { font: F.serif(700, 18), color: C.gray, align: 'right', alpha: S.at(0, .4, .6) });
      [[x0 + P / 4, '贪婪', C.red, -1], [x0 + P * 3 / 4, '恐惧', C.green, 1], [x0 + P * 5 / 4, '贪婪', C.red, -1], [x0 + P * 7 / 4, '恐惧', C.green, 1]].forEach(([x, str, col, d], k) => {
        const a = S.at(0, 1.2 + k * .5, .5, easeBack); if (a <= 0) return;
        K.marker(ctx, x, f(x), { alpha: clamp(a), r: 10, color: col });
        K.text(ctx, str, x, f(x) + d * 40 + (d > 0 ? 14 : 0), { font: F.serif(900, 24), color: col, align: 'center', alpha: clamp(a), glow: .6, glowColor: col });
      });
      // the ball keeps rolling: momentum
      const bA = S.at(1, .2, .6);
      if (bA > 0) {
        const bx = x0 + 60 + ((S.t - S.beat(1)) * 150) % (x1 - x0 - 120), by = f(bx), dy = -A * Math.cos((bx - x0) / P * Math.PI * 2) * Math.PI * 2 / P;
        const v = Math.hypot(1, dy), ux = 1 / v, uy = dy / v, sp = 60 + 70 * Math.abs(Math.cos((bx - x0) / P * Math.PI * 2));
        ctx.save(); ctx.globalAlpha = bA; ctx.fillStyle = Y; ctx.shadowColor = Y; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(bx, by - 14, 13, 0, 6.2832); ctx.fill(); ctx.restore();
        K.arrow(ctx, bx, by - 14, bx + ux * sp, by - 14 + uy * sp, { color: Y, width: 3, head: 14, alpha: bA });
      }
      // psychological momentum leads the price by a quarter cycle
      const mA = S.at(2, .2, .8), my = 760, mh = 50, mp = smooth(S.lin(2, .2, 3.0)), mpts = [];
      for (let x = x0; x <= x1; x += 6) mpts.push([x, my - mh * Math.cos((x - x0) / P * Math.PI * 2)]);
      if (mA > 0) {
        K.line(ctx, x0, my, x1, my, { color: C.dim, width: 1, alpha: mA });
        poly(ctx, mpts, mp, { color: Y, width: 3, blur: 14, alpha: mA });
        K.text(ctx, '群体心理动能（领先于价格）', x0, my + mh + 40, { font: F.serif(900, 18), color: Y, alpha: S.at(2, 1.6, .6) });
        const pk = x0 + P, gk = x0 + P * 5 / 4;
        K.dash(ctx, pk, my - mh, pk, f(pk) - 10, { p: S.at(2, 2.6, .8), color: Y, width: 1.4 });
        K.dash(ctx, gk, my - 4, gk, f(gk) + 12, { p: S.at(2, 2.6, .8), color: C.red, width: 1.4 });
        K.bracket(ctx, pk, gk, my + 26, '', { p: S.at(2, 3.2, .6), up: false, color: Y });
        K.text(ctx, '提前转向', (pk + gk) / 2, my + 72, { font: F.serif(900, 18), color: Y, align: 'center', alpha: S.at(2, 3.6, .5) });
      }
    } },

  /* ================= 贰 · THE HISTOGRAM (quiet section → lightning and the bars on the return) ================= */
  { id: 'ch2', dur: 3.6, tr: 'sweep', visual: chapter('贰', 2, '能量柱的进化', 'The Histogram · 1986', '拉开量化时代的序幕') },

  { id: 'aspray', header: HD, dur: 25.4, tr: ['iris', [960, 520]], camera: { z0: 1.0, z1: 1.04 }, ...TOP, pre: .6,
    lines: [{ s: '1986 年，另一位大师{托马斯·阿斯芮}', d: 6.4 }, { s: '白线 DIF，金线 DEA（DIF 的平均）', d: 6.4 }, { s: '他用 {DIF 减去 DEA}……', d: 6.4 }, { s: '凌空画出红绿交替的[能量柱]！', d: 5.6 }],
    visual(ctx, S) {
      const t = S.t, tE = S.beat(3);
      const pa = S.at(0, 0, .9) * (1 - S.at(1, 0, .8));
      parchment(ctx, 560, 400, 800, 240, pa, t);
      K.text(ctx, '1986', 640, 555, { font: F.serif(900, 64), color: '#E9D3A4', alpha: pa * .9 });
      K.text(ctx, '托马斯·阿斯芮', 960, 510, { font: F.serif(900, 34), color: '#F2E2BC', alpha: pa * S.at(0, .6, .8) });
      K.text(ctx, 'Thomas Aspray', 962, 568, { font: F.latin(500, 24), color: '#C9B48A', alpha: pa * S.at(0, 1.0, .8), spacing: 3 });
      const c = chAS, n = AS.K.length, y0 = 410, h = 340, sc = Math.max(...AS.macd.map(Math.abs), ...AS.sig.map(Math.abs)) * 1.12, yOf = v => y0 + h / 2 - v / sc * h / 2;
      const lp = smooth(S.lin(1, .3, 4.4)), la = S.at(1, .2, .8);
      if (la > 0) {
        const [sx, sy] = shake(t, tE, 10, 5);
        ctx.save(); ctx.translate(sx, sy);
        K.line(ctx, c.box.x, yOf(0), c.box.x + c.box.w, yOf(0), { color: C.dim, width: 1, alpha: la });
        // the histogram erupts on the beat
        const hp = clamp((t - tE) / .9);
        for (let i = 0; i < n; i++) {
          const g = clamp(hp * n * 1.4 - Math.abs(i - n / 2) * 1.4); if (g <= 0) continue;
          const v = AS.hist[i] * 1.6, col = v >= 0 ? C.red : C.green;
          ctx.save(); ctx.globalAlpha = .85 * easeOut(g); ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 12 * (1 - hp) + 4;
          const ya = yOf(0), yb = yOf(v * easeBack(g)); ctx.fillRect(c.x(i) - c.cw * .38, Math.min(ya, yb), c.cw * .76, Math.abs(yb - ya)); ctx.restore();
        }
        // the gap being measured before the strike
        const gA = S.at(2, .4, .8) * (1 - clamp((t - tE) / .4));
        for (let i = 2; i < n; i += 2) { const p = .55 + .45 * Math.sin(t * 6 - i * .5); K.line(ctx, c.x(i), yOf(AS.macd[i]), c.x(i), yOf(AS.sig[i]), { color: Y, width: 2, alpha: gA * p, glow: .8 }); }
        const pts = (arr) => arr.map((v, i) => [c.x(i), yOf(v)]);
        poly(ctx, pts(AS.sig), lp, { color: C.gold, width: 3, blur: 12, alpha: la, head: false });
        poly(ctx, pts(AS.macd), lp, { color: '#F4F0E8', width: 3.2, blur: 12, alpha: la, head: false });
        K.text(ctx, 'DIF', c.box.x - 18, yOf(AS.macd[0]) + 6, { font: F.latin(600, 18), color: '#F4F0E8', align: 'right', alpha: la });
        K.text(ctx, 'DEA', c.box.x - 18, yOf(AS.sig[0]) + 34, { font: F.latin(600, 18), color: C.gold, align: 'right', alpha: la });
        ctx.restore();
        // the lightning
        if (t > tE - .05 && t < tE + 1.2) {
          const R = K.rng(71), zz = []; let x = -40, y = 380, up = 1;
          while (x < 1960) { zz.push([x, y]); x += 60 + R() * 70; y += up * (40 + R() * 70); up = -up; }
          const bp = clamp((t - tE) / .2), fade = clamp(1 - (t - tE - .25) / .9);
          poly(ctx, zz, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false }); flash(ctx, 960, 560, fade, 1100, C.goldHi);
        }
        const eA = S.at(2, 1.0, .6);
        K.text(ctx, 'DIF − DEA = ', 1180, 830, { font: F.latin(600, 26), color: '#F4F0E8', align: 'right', alpha: eA });
        K.text(ctx, '？', 1196, 830, { font: F.serif(900, 26), color: Y, alpha: eA * (1 - clamp((t - tE) / .3)) });
        K.text(ctx, '能量柱（Histogram）', 1196, 830, { font: F.serif(900, 26), color: C.red, alpha: S.at(3, .6, .5), glow: .6, glowColor: C.red });
      }
    } },

  { id: 'div', header: HE, dur: 17.4, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '价格继续疲软下跌，<创出新低>', d: 5.2 }, { s: '下方绿柱却迅速{缩短、变矮}', d: 5.6 }, { s: '能量柱转向，往往比金叉{提早数个周期}', d: 6.0 }],
    visual(ctx, S) {
      const c = chDV, n = DVK.length, rv = (DV_SW[4].i + 1) * smooth(S.lin(0, 0, 4.4)) + (n - DV_SW[4].i - 1) * smooth(S.lin(2, 0, 3.0));
      drawChart(ctx, c, rv, { dim: () => .85 });
      const y0 = 650, h = 170, yOf = v => y0 + h / 2 - v * h / 2;
      K.line(ctx, c.box.x, yOf(0), c.box.x + c.box.w, yOf(0), { color: C.dim, width: 1 });
      K.text(ctx, '能量柱', c.box.x - 18, y0 + 20, { font: F.serif(700, 15), color: C.gray, align: 'right' });
      for (let i = 0; i < n && i < Math.ceil(rv); i++) { const g = clamp(rv - i), v = DVH[i];
        ctx.save(); ctx.globalAlpha = .85 * easeOut(g); ctx.fillStyle = v >= 0 ? C.red : C.green; const ya = yOf(0), yb = yOf(v * easeOut(g)); ctx.fillRect(c.x(i) - c.cw * .36, Math.min(ya, yb), c.cw * .72, Math.abs(yb - ya)); ctx.restore(); }
      const l1 = DV_SW[2], l2 = DV_SW[4], dA = smooth(S.lin(1, .6, 1.0)) * (1 - S.at(2, 0, .6));
      poly(ctx, [[c.x(l1.i), c.y(l1.price) + 14], [c.x(l2.i), c.y(l2.price) + 14]], smooth(S.lin(0, 4.0, .8)) * (1 - S.at(2, 0, .6)), { color: C.green, width: 2.6, dash: [8, 6], blur: 8, head: false });
      poly(ctx, [[c.x(l1.i), yOf(DVH[l1.i]) + 10], [c.x(l2.i), yOf(DVH[l2.i]) + 10]], dA, { color: Y, width: 2.6, dash: [8, 6], blur: 8, head: false });
      callout(ctx, '【 底背离：绿色冰点，多头筹码正在悄悄再生！】', 960, 880, S.at(1, 1.4, .5) * (1 - S.at(2, 0, .5)), S.t - S.beat(1) - 1.4, { size: 22, color: Y, spacing: 1 });
      // the bars turn before the cross
      const tA = S.at(2, 3.0, .6);
      [[DV_TURN, '能量柱转向', Y], [DV_ZERO, '金叉', C.red]].forEach(([i, str, col], k) => {
        const a = S.at(2, 3.0 + k * .4, .5); if (a <= 0) return;
        K.dash(ctx, c.x(i), c.box.y + 20, c.x(i), y0 + h, { p: a, color: col, width: 1.6 });
        K.text(ctx, str, c.x(i) + (k ? 14 : -14), c.box.y + 16, { font: F.serif(900, 18), color: col, align: k ? 'left' : 'right', alpha: a });
      });
      K.bracket(ctx, c.x(DV_TURN), c.x(DV_ZERO), y0 + h + 22, '', { p: tA, up: false, color: Y });
      K.text(ctx, '提早数个周期', (c.x(DV_TURN) + c.x(DV_ZERO)) / 2, y0 + h + 66, { font: F.serif(900, 20), color: Y, align: 'center', alpha: S.at(2, 3.6, .5) });
    } },

  { id: 'quant', header: HF, dur: 16.8, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '奠定量化基金与趋势系统的{底层天条}', d: 5.4 }, { s: '千万算法，同时盯着这根柱子的{衰竭}', d: 5.4 }, { s: '恐怖的[“自我实现”]效应，就此诞生', d: 5.4 }],
    visual(ctx, S) {
      const t = S.t, gA = S.at(0, 0, .8) * (1 - S.at(1, 0, .8));
      if (gA > 0) {
        gear(ctx, 520, 600, 86, t * 1.2, gA, C.red); gear(ctx, 676, 486, 56, -t * 1.84 + .2, gA, C.green); gear(ctx, 690, 708, 44, -t * 2.35, gA, Y);
        frame(ctx, 900, 430, 760, 330, gA, .2, C.gold);
        const code = ['hist = DIF - DEA', 'if hist[t] < hist[t-1]:', '    momentum.decay()', 'signal = trend_follow(hist)', 'execute(signal)'];
        let budget = (t - S.beat(0) - .6) * 22;
        code.forEach((ln, k) => { const nch = clamp(budget / ln.length) * ln.length; budget -= ln.length + 4; if (nch <= 0) return;
          K.text(ctx, ln.slice(0, Math.floor(nch)), 940, 490 + k * 56, { font: F.mono(22), color: k === 0 ? Y : '#E8E2D4', alpha: gA }); });
        K.text(ctx, '量化黑盒 · 第一行天条', 1640, 742, { font: F.serif(700, 16), color: C.gray, align: 'right', alpha: gA });
      }
      // the web: everyone watching the same bar
      const nA = S.at(1, .2, .8), cx = 960, cy = 600, decay = smooth(S.lin(2, .3, 1.2)), N = 36;
      if (nA > 0) {
        const bh = lerp(150, 34, decay), col = mix(C.red, C.green, decay), top = cy + 80 - bh;
        for (let k = 0; k < N; k++) {
          const ang = k / N * Math.PI * 2, nx = cx + Math.cos(ang) * 560, ny = cy + Math.sin(ang) * 210, a = nA * S.at(1, .2 + k * .03, .4);
          K.line(ctx, nx, ny, cx, top, { color: C.gold, width: 1, alpha: a * .35 });
          ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(nx, ny, 5, 0, 6.2832); ctx.fill(); ctx.restore();
          if (decay > 0) { const u = ((t - S.beat(2)) * 1.3 + k * .07) % 1; ctx.save(); ctx.globalAlpha = nA * decay * (1 - u); ctx.fillStyle = C.red; ctx.shadowColor = C.red; ctx.shadowBlur = 12;
            ctx.beginPath(); ctx.arc(lerp(nx, cx, u), lerp(ny, top, u), 4, 0, 6.2832); ctx.fill(); ctx.restore(); }
        }
        ctx.save(); ctx.globalAlpha = nA; ctx.fillStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 24; ctx.fillRect(cx - 26, top, 52, bh); ctx.restore();
        K.text(ctx, '千万算法 · 职业交易员', cx, cy + 270, { font: F.serif(900, 20), color: C.gray, align: 'center', alpha: S.at(1, 1.0, .6) * (1 - S.at(2, 1.0, .5)) });
        flash(ctx, cx, top, (t > S.beat(2) + 1.0 ? 1 : 0) * clamp(1 - (t - S.beat(2) - 1.0) / 1.2), 500, Y);
        tagAt(ctx, cx, cy + 270, '“自我实现”效应', { alpha: S.at(2, 1.4, .6, easeBack), color: Y, font: F.serif(900, 24) });
      }
    } },

  /* ================= 2:23 FINALE — collapse to a black hole, short and fast ================= */
  { id: 'phil', dur: 11.0, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    visual(ctx, S) {
      const t = S.t, col = smooth(clamp(t / 1.4)), R = K.rng(81);
      if (col < 1) for (let i = 0; i < 70; i++) {                         // bars and candles spiral into the centre
        const r0 = 150 + R() * 820, a0 = R() * 6.28, r = r0 * (1 - col), ang = a0 + col * 3.2, x = 960 + Math.cos(ang) * r * 1.2, y = 540 + Math.sin(ang) * r * .6, h = (14 + R() * 70) * (1 - col);
        ctx.save(); ctx.globalAlpha = (1 - col) * .8; ctx.fillStyle = R() < .5 ? C.red : C.green; ctx.fillRect(x - 6, y - h / 2, 12, h); ctx.restore();
      }
      ctx.save(); ctx.fillStyle = `rgba(2,2,3,${(.92 * smooth(clamp((t - .6) / 1.0))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
      ring(ctx, 960, 540, (t - 1.1) / 1.0, C.goldHi, 420);
      const rows = [['【 唯一不外传的真相 】', 300, 1.3, 30], ['市场永远走在两条路上：', 400, 2.3, 34], ['一条通往极度狂热的自我毁灭，', 490, 3.2, 34], ['另一条通往极度恐慌的筹码再生。', 580, 4.1, 34], ['而 MACD，只是测量这条路还有多远的尺子。', 730, 5.4, 40]];
      rows.forEach(([str, y, t0, sz], j) => {
        const u = smooth(clamp((t - t0) / .5)); if (u <= .002) return;
        const [sx, sy] = shake(t, t0, j === 4 ? 16 : 5, 6);
        ctx.save(); ctx.translate(960 + sx, y - 20 + sy); const s = lerp(1.3, 1, u); ctx.scale(s, s); ctx.translate(-960, -(y - 20));
        ctx.filter = u < 1 ? `blur(${((1 - u) * 9).toFixed(1)}px)` : 'none';
        K.goldText(ctx, str, 960, y, sz, { alpha: u, glow: j === 4 ? 1.2 : .9, spacing: j === 4 ? 4 : 3 });
        ctx.restore();
      });
      ring(ctx, 960, 710, (t - 5.4) / 1.2, C.goldHi, 900);
      if (t > 5.4) K.rule(ctx, 960, 650, 320, S.p(5.6, .8), { alpha: .7 });
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
      K.text(ctx, '技术指标之王 · MACD', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(.9, .9) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.2, .9) });
    } },
  ],
};
})();

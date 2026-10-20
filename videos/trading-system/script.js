/* ============================================================
   《构建自己的交易系统》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py + sfx.json)

   Clock pinned to the music: the drop at 16.7 s is the lightning title + the gold triangle
   (计划 / 风控 / 纪律); the quiet section (85.3–103.2 s) sets up Mr A vs Mr B, and the track's
   return at 103.2 s is B's account crashing −50% (→ +100% to break even). Short, fast finale.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const Y = '#FFD34D';                                               // core hint / target: yellow

const H0 = { label: '引入', sub: '痛点直击与打破迷思', en: 'Why You Keep Losing', zh: '《构建交易系统》' };
const H1 = { label: '计划', num: 1, sub: '看趋势', en: 'Read the Trend', zh: '《铁血计划》' };
const H2 = { label: '计划', num: 2, sub: '等回调 · 抓入场', en: 'Pullback & Entry', zh: '《铁血计划》' };
const H3 = { label: '计划', num: 3, sub: '控生死 · 止损与止盈', en: 'Stop & Target', zh: '《铁血计划》' };
const HA = { label: '风控', num: 1, sub: 'A先生 vs B先生', en: 'Risk Firewall', zh: '《资金防火墙》' };
const HB = { label: '风控', num: 2, sub: '给情绪绝对脱敏', en: 'Numbers, Not Feelings', zh: '《资金防火墙》' };
const HD = { label: '纪律', sub: '知行合一的底气', en: 'Discipline', zh: '《铁血纪律》' };
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

/* ---------------- data ---------------- */
// gambling by feel: a jumpy market, a big unrealised gain held out of greed, then the crash and the panic sale
const GBp = K.gen.path([100, 109, 103, 117, 110, 131, 112, 84, 90, 70], { per: [3, 2, 3, 2, 3, 2, 3, 2, 3], seed: 301, noise: .7, wick: .7 });
const GBK = GBp.candles, GB_PK = GBp.swings[4], GB_END = GBK.length - 1;
const chGB = new K.Chart(GBK, { x: 300, y: 250, w: 1240, h: 470 }, { lo: 64, hi: 138 });

// step 1 — up trend, sideways range, down trend
const TRp = K.gen.path([100, 112, 108, 121, 116, 128, 122, 129, 121, 128.5, 122, 127, 114, 118, 105, 109, 96],
  { per: [4, 3, 4, 3, 4, 3, 3, 3, 3, 3, 3, 4, 3, 4, 3, 4], seed: 311, noise: .5, wick: .5 });
const TRK = TRp.candles;
const chTR = new K.Chart(TRK, { x: 260, y: 400, w: 1400, h: 400 }, { lo: 94, hi: 134 });
const TR_RG = [[0, 18, C.red, '上升趋势'], [18, 36, Y, '横盘趋势'], [36, 54, C.green, '下跌趋势']];

// steps 2–3 — flagpole, shrinking pullback into 0.5–0.618, MA support, volume breakout through the prior high
const ENp = K.gen.path([101, 99, 101.5, 99.5, 130, 113, 114.5, 113.2, 133.5, 137], { per: [2, 2, 2, 7, 7, 2, 2, 1, 3], seed: 321, noise: .35, wick: .45 });
const ENK = ENp.candles, EN_L = ENp.swings[2], EN_H = ENp.swings[3], EN_P = ENp.swings[4], EN_B = ENp.swings[7].i;
const ENV = ENK.map((k, i) => i === EN_B ? 100 : i > EN_B ? 52 : i > EN_L.i && i <= EN_H.i ? 58 + (i - EN_L.i) * 3 : i > EN_H.i && i <= EN_P.i ? 44 - (i - EN_H.i) * 4 : i > EN_P.i ? 16 : 26);
const ENMA = curve([[0, 98.4], [EN_L.i, 99.1], [EN_H.i, 104.6], [EN_P.i, 110.4], [EN_B - 1, 111.6], [EN_B, 112.6], [ENK.length - 1, 119]], ENK.length);
const fib = r => EN_H.price - r * (EN_H.price - EN_L.price);
const chEN = new K.Chart(ENK, { x: 260, y: 360, w: 1400, h: 360 }, { lo: 95, hi: 140 });

// steps 4–5 — entry, 2×ATR stop below, 2:1 target above (wide right margin for the plan)
const RKK = [...K.gen.path([96.5, 98.4, 97.2, 98.6, 97.6], { per: [2, 2, 2, 2], seed: 331, noise: .4, wick: .5 }).candles, { o: 97.6, c: 100, h: 100.5, l: 97.4 }];
const RK_E = RKK.length - 1, ENTRY = 100, ATR = 2.5, STOP = ENTRY - 2 * ATR, TGT = ENTRY + 2 * (ENTRY - STOP);
const chRK = new K.Chart([...RKK, ...Array.from({ length: 14 }, () => ({ o: 100, c: 100, h: 100, l: 100 }))], { x: 260, y: 360, w: 1400, h: 380 }, { lo: 92, hi: 113 });
const RKATR = curve([[0, 30], [3, 46], [6, 36], [RK_E, 52], [23, 50]], 24);

window.FILM = {
  title: '构建自己的交易系统',
  transition: 1.2,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },
  scenes: [

  /* ================= 0:00 HOOK — siren, a giant green question mark ================= */
  { id: 'hook', dur: 6.0, camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, cx = 960, hit = .3, tx = 1.5;
      const pulse = .5 + .5 * Math.sin(t * 9.4);                     // the siren washes the edges
      const sa = clamp(t / .2) * (1 - smooth(clamp((t - 3.4) / 1.4)));
      if (sa > 0) { ctx.save(); const g = ctx.createRadialGradient(960, 540, 300, 960, 540, 1100); g.addColorStop(0, rgba(C.green, 0)); g.addColorStop(1, rgba(C.green, .32 * pulse * sa)); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); }
      const q = S.p(hit, .5, easeBack), qOut = smooth(clamp((t - tx + .2) / .7));
      const [qx, qy] = shake(t, hit, 26, 5);
      if (q > 0) {
        ctx.save(); ctx.translate(cx + qx, 470 + qy - 40 * qOut); const s = lerp(.2, 1, q) * lerp(1, .82, qOut); ctx.scale(s, s);
        K.text(ctx, '?', 0, 150, { font: F.latin(700, 250), color: C.green, align: 'center', alpha: lerp(1, .16, qOut), glow: 1, glowColor: C.green });
        ctx.restore();
      }
      flash(ctx, cx, 470, (t > hit ? 1 : 0) * clamp(1 - (t - hit) / .5), 700, C.green);
      const p = clamp((t - tx) / .3), s = lerp(2.2, 1, easeOut(p)), [sx, sy] = shake(t, tx + .25, 16, 5);
      ctx.save(); ctx.translate(cx + sx, 500 + sy); ctx.scale(s, s);
      ctx.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '为什么你总是', 0, -40, { font: F.serif(900, 52), color: C.white, align: 'center', alpha: p, glow: .5, glowColor: C.gold, spacing: 3 });
      K.text(ctx, '一买就跌，一卖就涨？', 0, 70, { font: F.serif(900, 52), color: C.white, align: 'center', alpha: p, glow: .65, glowColor: C.green, spacing: 3 });
      ctx.restore();
    } },

  /* ================= 0:06 GAMBLING BY FEEL ================= */
  { id: 'gamble', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.03, z1: 1.0 }, ...BOT, pre: 4.0,
    lines: [{ s: '炒股长期亏钱，根本不是因为{运气不好}', d: 3.2 }, { s: '没有系统，进场就是[双手合十]去<赌博>', d: 3.5 }],
    visual(ctx, S) {
      const c = chGB, t = S.t, rv = GBK.length * smooth(clamp((t - .2) / 6.6)), st = S.p(7.3, .45);
      ctx.save(); ctx.globalAlpha = 1 - .72 * clamp(st);                 // the chart sinks back under the stamp
      drawChart(ctx, c, rv, { dim: () => .85 });
      // the trader rides the last candle
      const cur = clamp(rv - 1, 0, GB_END), i = Math.floor(cur), f = cur - i, cl = lerp(GBK[i].c, GBK[Math.min(i + 1, GB_END)].c, f);
      const mood = cur < GB_PK.i + 1 ? 'greed' : cur < GB_END - .5 ? 'hold' : 'panic';
      stickman(ctx, c.x(cur) + 56, c.y(cl) - 96, clamp(rv / 2), mood, t);
      const gA = clamp((rv - GB_PK.i - .5) / 1.2) * (1 - clamp((rv - GB_PK.i - 5) / 1.2));
      tagAt(ctx, c.x(GB_PK.i) + 100, c.y(GB_PK.price) - 4, '贪婪：浮盈也死握不放', { side: 'right', alpha: gA, color: C.red, font: F.serif(900, 20) });
      const pA = clamp((rv - GBK.length + .4) / .8);
      tagAt(ctx, c.x(GB_END) - 30, c.y(GBK[GB_END].l) + 50, '慌乱割肉', { side: 'left', alpha: pA, color: C.green, font: F.serif(900, 22) });
      ctx.restore();
      const [sx, sy] = shake(t, 7.55, 12, 6);
      ctx.save(); ctx.translate(sx, sy); stamp(ctx, '凭感觉赌博', 960, 470, st, { color: Y, size: 48 }); ctx.restore();
    } },

  /* ================= 0:16.7 LIGHTNING TITLE + THE GOLD TRIANGLE ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 }, ...BOT, pre: 4.6,
    lines: [{ s: '你缺少的，是一套{完整的交易系统}', d: 2.8 }, { s: '今天，手把手建立{持续盈利的交易体系}', d: 2.9 }],
    visual(ctx, S) {
      const t = S.t, z = .15;
      const R = K.rng(41), pts = []; let x = -60, y = 220, up = 1;
      while (x < 1980) { pts.push([x, y]); x += 70 + R() * 70; y += up * (50 + R() * 80) + 10; up = -up; }
      const bp = clamp((t - z) / .22), fade = clamp(1 - (t - z - .25) / .9);
      if (bp > 0 && fade > 0) { poly(ctx, pts, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false }); poly(ctx, pts, bp, { color: C.goldHi, width: 14, blur: 60, alpha: fade * .35, head: false }); flash(ctx, 960, 360, fade, 1100, C.goldHi); }
      const tp = S.p(z + .35, 1.2, K.expo);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 220, 1920, 150); ctx.clip();
      K.goldText(ctx, '构建自己的交易系统', 960, 340 + (1 - tp) * 120, 58, { spacing: 14, alpha: tp });
      ctx.restore();
      // the frame: three gold edges, each refracting light, each a pillar
      const V = [[960, 405], [1110, 665], [810, 665]], ctr = [960, 578];
      const edges = [[0, 1, '风控', 1], [1, 2, '纪律', 2], [2, 0, '计划', 0]];
      edges.forEach(([a, b, name, k]) => {
        const p = S.p(1.5 + k * .45, .7, easeInOut); if (p <= 0) return;
        poly(ctx, [V[a], V[b]], p, { color: C.goldHi, width: 4, blur: 26, head: p < 1 });
        const mx = (V[a][0] + V[b][0]) / 2, my = (V[a][1] + V[b][1]) / 2, nx = mx - ctr[0], ny = my - ctr[1], nl = Math.hypot(nx, ny), ux = nx / nl, uy = ny / nl;
        const la = S.p(2.0 + k * .45, .6, easeBack), shine = .55 + .45 * Math.sin(t * 3 + k * 2);
        for (let r = -2; r <= 2; r++) {                                  // refracted rays fanning out of the edge
          const ang = Math.atan2(uy, ux) + r * .2, L = (28 + 16 * Math.abs(Math.sin(t * 2 + r))) * clamp(la);
          K.line(ctx, mx + ux * 18, my + uy * 18, mx + ux * 18 + Math.cos(ang) * L, my + uy * 18 + Math.sin(ang) * L, { color: C.goldHi, width: 1.6, glow: .9, alpha: clamp(la) * shine * .7 });
        }
        const off = k === 1 ? 74 : 104;
        K.text(ctx, name, mx + ux * off, my + uy * off + 14, { font: F.serif(900, 30), color: Y, align: 'center', alpha: clamp(la), glow: .8, glowColor: Y });
      });
      const ga = S.p(3.2, 1.0) * (.6 + .4 * Math.sin(t * 2.4));
      flash(ctx, ctr[0], ctr[1], ga * .5, 220, C.goldHi);
    } },

  /* ================= 壹 · THE PLAN ================= */
  { id: 'ch1', dur: 3.6, tr: 'sweep', visual: chapter('壹', 1, '无死角的铁血计划', 'The Plan', '看趋势 · 等回调 · 抓入场 · 控生死') },

  { id: 'trend', header: H1, dur: 14.0, tr: ['iris', [960, 600]], camera: { z0: 1.0, z1: 1.04, x1: -16 }, ...TOP, pre: .6,
    lines: [{ s: '步骤一·看趋势：{只做上升趋势}', d: 6.4 }, { s: '顺势而为，才是{正期望值（正EV）}的决定', d: 7.0 }],
    visual(ctx, S) {
      const c = chTR, rv = TRK.length * smooth(S.lin(0, -.4, 4.4));
      K.baseline(ctx, c.box.x, c.box.x + c.box.w, c.box.y + c.box.h + 12, { p: S.at(0, -.4, 1.4), step: 60, alpha: .5 });
      TR_RG.forEach(([i0, i1, col, name], j) => {
        const a = S.at(0, 2.2 + j * .8, .9);
        region(ctx, c, i0, i1, col, a);
        const lx = c.x((i0 + i1 - 1) / 2), ly = j === 1 ? c.box.y + c.box.h - 18 : c.box.y + 40;
        tagAt(ctx, lx, ly, name, { alpha: a, color: col, font: F.serif(900, 22) });
      });
      drawChart(ctx, c, rv, { dim: i => i < 18 ? 1 : lerp(1, .45, S.at(1, .3, 1.0)) });
      const xA = (j, d) => S.at(1, d, .5);
      bigX(ctx, c.x(26.5), c.y(118), xA(1, .3), 130, Y);
      bigX(ctx, c.x(44.5), c.y(112), xA(2, .7), 130, C.green);
      tick(ctx, c.x(8), c.y(102), S.at(1, 1.3, .8), 80, C.red);
    } },

  { id: 'entry', header: H2, dur: 22.0, tr: ['push', 1], camera: { z0: 1.0, z1: 1.04, x1: -14 }, ...TOP, pre: .6,
    lines: [{ s: '步骤二·等回调：缩量落入{0.5–0.618}', d: 7.0 }, { s: '均线与黄金分割位{共振支撑}', d: 7.0 }, { s: '放量大阳线[突破前高]——{双重确认入场}', d: 7.4 }],
    visual(ctx, S) {
      const c = chEN, tB = S.beat(2) + .8;
      const r0 = (EN_P.i + 1) * smooth(S.lin(0, 0, 6.0)), r1 = (EN_B - EN_P.i - 1) * smooth(S.lin(1, .4, 4.0)), r2 = clamp((S.t - tB) / .45), r3 = 3 * smooth(clamp((S.t - tB - 1.2) / 2.6));
      const rv = r0 + (r0 >= EN_P.i + 1 ? r1 : 0) + (r1 >= EN_B - EN_P.i - 1 - 1e-6 ? r2 : 0) + (r2 >= 1 ? r3 : 0);
      const [sx, sy] = shake(S.t, tB, 9, 5);
      ctx.save(); ctx.translate(sx, sy);
      // Fibonacci retracement of the pole, golden zone 0.5–0.618
      const fA = S.at(0, 3.4, 1.2), zx0 = c.x(EN_H.i);
      [[0, '0'], [.5, '0.5'], [.618, '0.618'], [1, '1']].forEach(([r, lb], j) => {
        const yy = c.y(fib(r)); K.dash(ctx, zx0, yy, c.box.x + c.box.w, yy, { p: clamp(fA * 1.4 - j * .12), color: r === .5 || r === .618 ? Y : C.gray, width: 1.4 });
        K.text(ctx, lb, c.box.x + c.box.w + 14, yy + (r === .5 ? -4 : r === .618 ? 26 : 7), { font: F.latin(500, 16), color: r === .5 || r === .618 ? Y : C.gray, alpha: clamp(fA * 1.4 - j * .12) });
      });
      const zA = S.at(0, 4.6, 1.0), zp = .55 + .45 * Math.sin(S.t * 3);
      if (zA > 0) { ctx.save(); ctx.globalAlpha = (.12 + .06 * zp) * zA; ctx.fillStyle = Y; ctx.fillRect(zx0, c.y(fib(.5)), c.box.x + c.box.w - zx0, c.y(fib(.618)) - c.y(fib(.5))); ctx.restore();
        K.text(ctx, '黄金区', c.box.x + c.box.w - 12, c.y(fib(.618)) - 8, { font: F.serif(900, 18), color: Y, align: 'right', alpha: zA * (1 - S.at(2, 1.6, .6)) }); }
      K.text(ctx, '前期高点', c.box.x + 6, c.y(fib(0)) - 12, { font: F.serif(700, 18), color: C.gray, alpha: fA });
      drawChart(ctx, c, rv, { dim: i => i === EN_B ? 1 : .8 });
      // the 20 MA underneath
      maLine(ctx, c, ENMA, 0, ENK.length - 1, Math.min(S.lin(1, 0, 3.0) * (EN_B / ENK.length) + (rv > EN_B ? (rv - EN_B) / ENK.length : 0), 1), { color: C.goldHi, width: 3.4, head: false });
      K.text(ctx, '20 MA（示意）', c.x(EN_H.i - 1), c.y(ENMA[EN_H.i - 1]) + 44, { font: F.latin(500, 17), color: C.goldHi, alpha: S.at(1, 1.6, .8) * (1 - S.at(2, 0, .6)), align: 'center' });
      const sA = S.at(1, 3.2, .6) * (1 - S.at(2, .6, .5));
      K.marker(ctx, c.x(EN_P.i + 2), c.y(ENMA[EN_P.i + 2]), { alpha: sA, r: 12, color: Y, pulse: (S.t * .8) % 1 });
      tagAt(ctx, c.x(EN_P.i + 2), c.y(ENMA[EN_P.i + 2]) + 54, '均线 + 黄金区共振', { alpha: sA, color: Y, font: F.serif(900, 20) });
      // volume
      const vy = 745, vh = 85;
      K.baseline(ctx, c.box.x, c.box.x + c.box.w, vy + vh, { p: S.at(0, 0, 1.2), step: 60, alpha: .6 });
      for (let i = 0; i < ENK.length && i < Math.ceil(rv); i++) {
        const g = clamp(rv - i), hh = vh * ENV[i] / 100 * easeOut(g), k = ENK[i], hot = i === EN_B;
        const col = hot ? C.red : mix(k.c >= k.o ? C.red : C.green, C.gold, .45);
        ctx.save(); ctx.globalAlpha = (hot ? .95 : .5) * easeOut(g); ctx.fillStyle = col; if (hot) { ctx.shadowColor = col; ctx.shadowBlur = 20; }
        ctx.fillRect(c.x(i) - c.cw / 2, vy + vh - hh, c.cw, hh); ctx.restore();
      }
      K.text(ctx, '缩量', c.x(EN_P.i - 2), vy + 18, { font: F.serif(900, 18), color: C.green, align: 'center', alpha: S.at(0, 5.0, .6) * (1 - S.at(2, 0, .5)) });
      K.text(ctx, '放量！', c.x(EN_B) + 30, vy + 18, { font: F.serif(900, 18), color: C.red, align: 'left', alpha: S.at(2, 1.3, .5) });
      // breakout through the prior high
      const ex = c.x(EN_B), eC = c.y(ENK[EN_B].c);
      flash(ctx, ex, eC, (S.t >= tB ? 1 : 0) * clamp(1 - (S.t - tB) / 1.3), 420, C.red);
      ring(ctx, ex, c.y(fib(0)), (S.t - tB - .2) / 1.2, Y, 240);
      const ra = S.at(2, 1.8, .7);
      reticle(ctx, ex, eC, ra, S.t, Y);
      tagAt(ctx, ex - 56, eC + 2, '正EV入场点', { side: 'left', alpha: ra, color: Y, font: F.serif(900, 24) });
      ctx.restore();
    } },

  { id: 'risk', header: H3, dur: 18.7, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '步骤四·止损：入场下方{2 倍 ATR}', d: 5.8 }, { s: '步骤五·止盈：按[2 : 1 盈亏比]挂好', d: 5.8 }, { s: '无论市场怎么走，都有{提前准备的对策}', d: 6.1 }],
    visual(ctx, S) {
      const c = chRK, rv = (RK_E + 1) * smooth(S.lin(0, -.4, 2.6)), ex = c.x(RK_E), xr = c.box.x + c.box.w;
      const yE = c.y(ENTRY), yS = c.y(STOP), yT = c.y(TGT);
      // reward / risk boxes
      const bA = S.at(1, 1.0, 1.0), rA = S.at(0, 3.6, 1.0);
      if (rA > 0) { ctx.save(); ctx.globalAlpha = .13 * rA; ctx.fillStyle = C.green; ctx.fillRect(ex + 24, yE, (xr - ex - 24) * smooth(rA), yS - yE); ctx.restore(); }
      if (bA > 0) { ctx.save(); ctx.globalAlpha = .12 * bA; ctx.fillStyle = C.red; ctx.fillRect(ex + 24, yT, (xr - ex - 24) * smooth(bA), yE - yT); ctx.restore(); }
      drawChart(ctx, c, rv, { dim: i => i === RK_E ? 1 : .8 });
      const eA = S.at(0, 2.4, .7);
      K.dash(ctx, ex, yE, xr, yE, { p: eA, color: C.goldHi, width: 1.6 });
      K.text(ctx, '入场 100', xr + 14, yE + 7, { font: F.serif(700, 16), color: C.goldHi, alpha: eA });
      K.marker(ctx, ex, yE, { alpha: eA, r: 10, color: Y });
      // ATR (示意) panel
      const aA = S.at(0, .4, .8), ay = 770, ah = 70;
      K.text(ctx, 'ATR（示意）', c.box.x - 18, ay + 20, { font: F.serif(700, 14), color: C.gray, align: 'right', alpha: aA });
      poly(ctx, RKATR.slice(0, RK_E + 1).map((v, i) => [c.x(i), ay + ah - ah * v / 60]), clamp(rv / (RK_E + 1)), { color: C.goldHi, width: 2.4, blur: 10, alpha: aA, head: false });
      K.text(ctx, 'ATR = 2.5', c.x(RK_E) + 24, ay + ah - ah * RKATR[RK_E] / 60 + 8, { font: F.latin(500, 18), color: Y, alpha: S.at(0, 2.6, .6) });
      // stop: 2 ATR below the entry
      const bxA = S.at(0, 3.0, .8);
      K.vbrace(ctx, ex + 70, yE + 4, yS - 4, '2 × ATR', { p: bxA, color: Y, labelColor: Y, alpha: 1 - S.at(2, 0, .6) });
      const sA = S.at(0, 3.6, .8);
      K.line(ctx, ex, yS, xr, yS, { p: sA, color: C.green, width: 3, glow: .8 });
      K.text(ctx, '止损 95', xr + 14, yS + 7, { font: F.serif(700, 16), color: C.green, alpha: sA });
      tagAt(ctx, xr - 10, yS + 34, '铁血止损位', { side: 'left', alpha: S.at(0, 4.2, .6, easeBack) * (1 - S.at(2, 0, .6)), color: C.green, font: F.serif(900, 22) });
      // target: 2:1
      const tA = S.at(1, .4, .8);
      K.line(ctx, ex, yT, xr, yT, { p: tA, color: C.red, width: 3, glow: .8 });
      K.text(ctx, '止盈 110', xr + 14, yT + 7, { font: F.serif(700, 16), color: C.red, alpha: tA });
      tagAt(ctx, xr - 10, yT - 34, '自动止盈位', { side: 'left', alpha: S.at(1, 1.4, .6, easeBack) * (1 - S.at(2, 0, .6)), color: C.red, font: F.serif(900, 22) });
      const rr = S.at(1, 2.2, .7) * (1 - S.at(2, 0, .6));
      K.text(ctx, '收益 2R', (ex + xr) / 2 + 120, (yT + yE) / 2 + 14, { font: F.serif(900, 26), color: C.red, align: 'center', alpha: rr });
      K.text(ctx, '风险 1R', (ex + xr) / 2 + 120, (yE + yS) / 2 + 12, { font: F.serif(900, 22), color: C.green, align: 'center', alpha: rr });
      // whichever way the market goes, the exit is already written down
      const fp = S.p(S.beat(2) + .3, 2.0, easeInOut), xe = c.x(19);
      const up = [[ex, yE], [c.x(11), c.y(102.2)], [c.x(12), c.y(100.8)], [c.x(14), c.y(105.2)], [c.x(15), c.y(103.9)], [c.x(17), c.y(108.2)], [xe, yT]];
      const dn = [[ex, yE], [c.x(11), c.y(98.7)], [c.x(12), c.y(99.6)], [c.x(14), c.y(97.1)], [c.x(15), c.y(97.9)], [c.x(17), c.y(95.9)], [xe, yS]];
      poly(ctx, up, fp, { color: C.red, width: 3.2, blur: 14 });
      poly(ctx, dn, fp, { color: C.green, width: 3.2, blur: 14, dash: [10, 8] });
      const hA = S.at(2, 2.4, .5);
      ring(ctx, xe, yT, (S.t - S.beat(2) - 2.3) / 1, C.red, 90); ring(ctx, xe, yS, (S.t - S.beat(2) - 2.3) / 1, C.green, 90);
      tick(ctx, xe + 40, yT - 6, S.at(2, 2.6, .6), 44, C.red); tick(ctx, xe + 40, yS - 6, S.at(2, 2.6, .6), 44, C.green);
      K.text(ctx, '+2R 离场', xe, yT - 26, { font: F.serif(900, 18), color: C.red, align: 'center', alpha: hA });
      K.text(ctx, '−1R 离场', xe, yS + 44, { font: F.serif(900, 18), color: C.green, align: 'center', alpha: hA });
    } },

  /* ================= 贰 · RISK FIREWALL (quiet section → B's crash on the return) ================= */
  { id: 'ch2', dur: 3.6, tr: 'sweep', visual: chapter('贰', 2, '资金防火墙', 'Risk Firewall', 'A先生 vs B先生 · 给情绪绝对脱敏') },

  { id: 'firewall', header: HA, dur: 21.3, tr: ['iris', [960, 600]], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '首要任务永远是{保存资金}，不是暴利', d: 6.6 }, { s: 'A先生：亏<10%>，回本只需[+11.11%]', d: 7.1 }, { s: 'B先生扛到<−50%>，回本必须[+100%]', d: 7.0 }],
    visual(ctx, S) {
      const t = S.t, base = 830, k = 3.8, tB = S.beat(2);                 // 1 unit of capital = 3.8 px
      const dv = S.at(0, 0, 1.0);
      K.line(ctx, 960, 360, 960, 360 + 470 * smooth(dv), { color: C.gold, width: 1.4, glow: .6, alpha: .7 });
      [[480, 'A先生 · 严格风控', C.red, 90, S.beat(1)], [1440, 'B先生 · 毫无风控', C.green, 50, tB]].forEach(([cx, name, col, left, t0], j) => {
        const a = S.at(0, .3 + j * .3, .8);
        K.text(ctx, name, cx, 375, { font: F.serif(900, 28), color: col, align: 'center', alpha: a, glow: .5, glowColor: col });
        K.baseline(ctx, cx - 230, cx + 230, base, { p: a, step: 40, alpha: .6 });
        const d0 = t0 + (j ? .05 : .3), rise = S.at(0, .8 + j * .3, 1.2), drop = smooth(clamp((t - d0) / (j ? .35 : .9)));
        const cap = 100 * rise - (100 - left) * drop, bx = cx - 150, bw = 120;
        const [sx, sy] = j ? shake(t, d0, 14, 5) : [0, 0];
        // B trembles while holding through the quiet section
        const tr = j && t < d0 && t > S.beat(1) ? Math.sin(t * 40) * 2.2 * clamp((t - S.beat(1)) / 4) : 0;
        ctx.save(); ctx.translate(sx + tr, sy);
        const g = ctx.createLinearGradient(0, base - cap * k, 0, base); g.addColorStop(0, C.goldHi); g.addColorStop(1, C.goldDeep);
        ctx.globalAlpha = a; ctx.fillStyle = g; ctx.shadowColor = rgba(C.gold, .5); ctx.shadowBlur = 18; ctx.fillRect(bx, base - cap * k, bw, cap * k); ctx.restore();
        K.text(ctx, `本金 ${Math.round(cap)}`, bx - 18 + sx, base - cap * k + 30 + sy, { font: F.serif(900, 22), color: C.white, align: 'right', alpha: a });
        // the lost slice breaks off and falls away
        if (drop > 0) {
          const fall = clamp((t - d0) / 1.6), ly = base - 100 * k + 40 * fall * fall * 6, lh = (100 - left) * k;
          ctx.save(); ctx.globalAlpha = (1 - fall) * .9; ctx.fillStyle = C.green; ctx.shadowColor = C.green; ctx.shadowBlur = 20;
          ctx.translate(bx + bw / 2, ly + lh / 2); ctx.rotate(fall * (j ? .5 : .3)); ctx.fillRect(-bw / 2, -lh / 2, bw, lh);
          ctx.shadowBlur = 0; ctx.globalAlpha = 1 - fall; ctx.font = F.serif(900, j ? 30 : 20); ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(j ? '−50%' : '−10%', 0, 2); ctx.restore();
        }
        // break-even: the climb back
        const rp = S.p(t0 + (j ? 1.4 : 1.6), j ? 1.6 : 1.0, easeInOut);
        if (rp > 0) {
          const y0 = base - left * k, y1 = base - 100 * k, ax = bx + bw + 46;
          K.dash(ctx, bx - 10, y1, bx + bw + 160, y1, { p: rp, color: C.gray, width: 1.2 });
          ctx.save(); ctx.globalAlpha = .3 * rp; ctx.fillStyle = C.red; ctx.fillRect(bx, lerp(y0, y1, rp), bw, y0 - lerp(y0, y1, rp)); ctx.restore();
          K.arrow(ctx, ax, y0, ax, y1 + 6, { p: rp, color: C.red, width: 3, head: 18 });
          const la = S.p(t0 + (j ? 2.6 : 2.4), .6, easeBack), big = j ? 1 + .06 * Math.sin(t * 8) * clamp(la) : 1;
          ctx.save(); ctx.translate(ax + 24, (y0 + y1) / 2 + 14); ctx.scale(big, big);
          K.text(ctx, j ? '+100%' : '+11.11%', 0, 0, { font: F.serif(900, j ? 46 : 30), color: C.red, alpha: clamp(la), glow: .8, glowColor: C.red });
          K.text(ctx, j ? '回本必须' : '回本只需', 0, j ? 48 : 40, { font: F.serif(700, 18), color: C.white, alpha: clamp(la) });
          ctx.restore();
        }
      });
      flash(ctx, 1440, 560, (t >= tB + .05 ? 1 : 0) * clamp(1 - (t - tB - .05) / 1.2), 520, C.green);
    } },

  { id: 'desens', header: HB, dur: 19.8, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '刮掉金额，只看{百分比}', d: 6.2 }, { s: '资金比例过大，涨跌就会[干扰你的生活]', d: 6.4 }, { s: '完美标准：买入后，{生活完全不受影响}', d: 6.6 }],
    visual(ctx, S) {
      const t = S.t, b0 = S.beat(0), cy = 470;
      // jittering money → scraped off → percentages
      const nums = ['+5000', '−3200', '+1800', '−5000', '+4200', '−2600'];
      const ma = S.at(0, 0, .5), sw = smooth(clamp((t - b0 - 2.2) / 1.0)), sx = lerp(380, 1540, sw);
      if (ma > 0 && sw < 1) {
        const n = nums[Math.floor(Math.max(0, t) * 5) % nums.length], col = n[0] === '+' ? C.red : C.green, [jx, jy] = [Math.sin(t * 53) * 3, Math.cos(t * 41) * 3];
        ctx.save(); ctx.beginPath(); ctx.rect(sx, 300, 1920, 300); ctx.clip();
        K.text(ctx, `盈亏 ${n} 元`, 960 + jx, cy + 36 + jy, { font: F.serif(900, 64), color: col, align: 'center', alpha: ma, glow: .7, glowColor: col });
        ctx.restore();
      }
      if (sw > 0 && sw < 1) {                                            // the scraper blade
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(sx - 50, 0, sx + 10, 0); g.addColorStop(0, rgba(C.goldHi, 0)); g.addColorStop(1, rgba(C.goldHi, .7));
        ctx.fillStyle = g; ctx.fillRect(sx - 50, cy - 90, 60, 180); ctx.restore();
        K.line(ctx, sx, cy - 95, sx, cy + 95, { color: '#FFF3C4', width: 3, glow: 1 });
      }
      const scr = clamp((t - b0 - 2.2) / 1.0) * (1 - clamp((t - b0 - 3.4) / .8));   // scratch marks left behind
      if (scr > 0) { const R = K.rng(9); for (let q = 0; q < 26; q++) { const y = cy - 70 + R() * 140, x0 = 380 + R() * 260; K.line(ctx, x0, y, Math.min(sx, x0 + 300 + R() * 500), y + (R() - .5) * 10, { color: C.gray, width: 1.2, alpha: scr * .6 }); } }
      const pA = S.at(0, 3.4, .7, easeBack);
      if (pA > 0) {
        ctx.save(); ctx.translate(960, cy + 30); const s = lerp(1.3, 1, easeOut(clamp(pA))); ctx.scale(s, s);
        K.text(ctx, '+2%', -40, 0, { font: F.serif(900, 64), color: C.red, align: 'right', alpha: clamp(pA), glow: .7, glowColor: C.red });
        K.text(ctx, '/', 0, 0, { font: F.latin(500, 56), color: C.gray, align: 'center', alpha: clamp(pA) });
        K.text(ctx, '−1%', 40, 0, { font: F.serif(900, 64), color: C.green, align: 'left', alpha: clamp(pA), glow: .7, glowColor: C.green });
        ctx.restore();
      }
      tagAt(ctx, 960, cy + 110, '月度目标锁定：+10%', { alpha: S.at(0, 4.2, .6, easeBack), color: Y, font: F.serif(900, 24) });
      // heart monitor: wild with oversized positions, calm with comfortable ones
      const eA = S.at(1, 0, .8), calm = smooth(S.lin(2, .2, 3.2)), amp = lerp(78, 6, calm), base = 760;
      if (eA > 0) {
        const pts = [], spike = f => f < .36 ? 0 : f < .40 ? -(f - .36) / .04 * .25 : f < .43 ? -.25 + (f - .40) / .03 * 1.25 : f < .47 ? 1 - (f - .43) / .04 * 1.6 : f < .52 ? -.6 + (f - .47) / .05 * .6 : 0;
        for (let x = 0; x <= 1400; x += 4) {
          const u = x / 1400 * 5 - t * 1.4, f = u - Math.floor(u);
          const wild = (Math.sin(x * .05 + t * 9) * .35 + Math.sin(x * .013 - t * 5) * .3) * (1 - calm);
          pts.push([260 + x, base - amp * (spike(f) + wild)]);
        }
        const col = calm < .5 ? mix(C.red, C.gold, calm * 2) : mix(C.gold, C.goldHi, (calm - .5) * 2);
        ctx.save(); ctx.globalAlpha = eA; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 16; ctx.lineJoin = 'round';
        const g = ctx.createLinearGradient(260, 0, 1660, 0); g.addColorStop(0, rgba(col, 0)); g.addColorStop(.25, col); g.addColorStop(1, col); ctx.strokeStyle = g;
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
        K.baseline(ctx, 260, 1660, base + 70, { p: eA, step: 60, alpha: .4 });
      }
      tagAt(ctx, 1660, 650, '仓位过重：心跳失控', { side: 'left', alpha: S.at(1, .8, .6) * (1 - S.at(2, .6, .6)), color: C.red, font: F.serif(900, 20) });
      tagAt(ctx, 1660, 650, '比例舒适：心如止水', { side: 'left', alpha: S.at(2, 2.4, .8), color: Y, font: F.serif(900, 20) });
    } },

  /* ================= 叁 · DISCIPLINE ================= */
  { id: 'ch3', dur: 3.6, tr: 'sweep', visual: chapter('叁', 3, '激活纪律肌肉', 'Discipline', '知行合一的底气') },

  { id: 'disc', header: HD, dur: 23.0, tr: ['iris', [960, 480]], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '纪律不是忍出来的，而是{底气}给的', d: 5.4 }, { s: '前三次连亏，恐惧让你<放弃了后面的盈利>', d: 5.6 }, { s: '<不一致的决策>，必然导致不一致的成绩', d: 5.4 }, { s: '成百次回测，了解胜率——{绝对执行}', d: 6.0 }],
    visual(ctx, S) {
      const t = S.t, res = [0, 0, 0, 1, 1, 1, 1], cw = 170, chh = 200, cy = 480;
      const xOf = k => 390 + k * 190;
      const quit = S.at(1, 3.6, .6) * (1 - S.at(3, .2, .8));
      res.forEach((win, k) => {
        const deal = S.at(0, .2 + k * .14, .6, easeBack);
        if (deal <= 0) return;
        const ft = S.beat(1) + (k < 3 ? .3 + k * .6 : 2.4 + (k - 3) * .25), f = smooth(clamp((t - ft) / .5));
        const x = xOf(k), y = cy + (1 - clamp(deal)) * 60, sxk = Math.abs(Math.cos(f * Math.PI)), front = f > .5;
        ctx.save(); ctx.globalAlpha = clamp(deal); ctx.translate(x, y); ctx.scale(Math.max(.02, sxk), 1);
        const col = front ? (win ? C.red : C.green) : C.gold, glow = front && win ? S.at(3, .4, .8) : 0;
        ctx.fillStyle = front ? rgba(col, .16) : 'rgba(255,255,255,.03)'; ctx.strokeStyle = rgba(col, front ? .9 : .6); ctx.lineWidth = 2;
        ctx.shadowColor = col; ctx.shadowBlur = 10 + 30 * glow;
        ctx.beginPath(); ctx.roundRect(-cw / 2, -chh / 2, cw, chh, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        if (front) K.text(ctx, win ? '赢' : '输', 0, 30, { font: F.serif(900, 50), color: col, align: 'center', glow: .7, glowColor: col, alpha: win ? 1 - quit : 1 });
        else K.text(ctx, '?', 0, 26, { font: F.latin(600, 46), color: C.gold, align: 'center', alpha: .8 });
        ctx.restore();
        if (win && quit > 0) {                                           // never taken: greyed out
          ctx.save(); ctx.globalAlpha = quit * .8; ctx.fillStyle = '#0A0A0C'; ctx.beginPath(); ctx.roundRect(x - cw / 2, cy - chh / 2, cw, chh, 14); ctx.fill(); ctx.restore();
          K.text(ctx, '放弃', x, cy + 14, { font: F.serif(900, 22), color: C.gray, align: 'center', alpha: quit * clamp((t - S.beat(1) - 3.6 - (k - 3) * .12) / .4) });
        }
      });
      // fear after three losses, and the main wave that was missed
      const fA = S.at(1, 2.0, .6, easeBack) * (1 - S.at(2, 0, .6));
      tagAt(ctx, xOf(1), cy + 160, '恐惧：开始怀疑策略', { alpha: fA, color: C.green, font: F.serif(900, 20) });
      const wA = 1 - S.at(2, 0, .6), wp = S.p(S.beat(1) + 3.8, 1.4, easeInOut);
      poly(ctx, [[xOf(3) - 70, 720], [xOf(4), 700], [xOf(5) - 40, 680], [xOf(5) + 40, 690], [xOf(6), 640], [xOf(6) + 80, 610]], wp * wA, { color: C.red, width: 4, blur: 18 });
      K.text(ctx, '错过全部主升浪', xOf(4.5), 760, { font: F.serif(900, 20), color: C.red, align: 'center', alpha: S.at(1, 4.8, .6) * wA });
      // 不一致 — crushed — and the rule slices the screen
      const b2 = S.beat(2), crush = clamp((t - b2 - 2.4) / .9), tg = S.at(2, .3, .5, easeBack);
      if (tg > 0 && crush < 1) {
        if (crush <= 0) tagAt(ctx, 960, 690, '不一致的决策', { alpha: clamp(tg), color: C.green, font: F.serif(900, 30) });
        else {
          const R = K.rng(51);
          for (let q = 0; q < 10; q++) {
            const ang = Math.PI * (.12 + R() * .76), v = 80 + R() * 220, dx = Math.cos(ang) * v * easeOut(crush), dy = Math.sin(ang) * v * easeOut(crush) + 220 * crush * crush;
            ctx.save(); ctx.globalAlpha = 1 - crush; ctx.translate(960 - 160 + q * 32 + dx, 690 + dy); ctx.rotate((R() - .5) * 4 * crush);
            ctx.fillStyle = rgba(C.green, .5); ctx.strokeStyle = C.green; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.rect(-14, -22 + R() * 8, 28, 36 - R() * 10); ctx.fill(); ctx.stroke(); ctx.restore();
          }
          flash(ctx, 960, 690, (1 - crush) * .8, 300, C.green);
        }
      }
      const sl = clamp((t - b2 - 3.0) / .45), slx = lerp(80, 1840, easeOut(sl));
      if (sl > 0) {
        ctx.save(); ctx.beginPath(); ctx.rect(0, 600, slx, 160); ctx.clip();
        K.goldText(ctx, '计划你的交易，交易你的计划！', 960, 712, 40, { spacing: 6, glow: 1.1 });
        ctx.restore();
        if (sl < 1 || t - b2 - 3.45 < .5) { const fa = sl < 1 ? 1 : 1 - (t - b2 - 3.45) / .5;
          K.line(ctx, 80, 738, slx, 738, { color: '#FFF3C4', width: 2.4, glow: 1, alpha: fa }); flash(ctx, slx, 738, fa * .7, 200, C.goldHi); }
      }
      tagAt(ctx, 960, 820, '回测成百上千次 · 胜率了然于胸', { alpha: S.at(3, 1.0, .6, easeBack), color: Y, font: F.serif(900, 22) });
    } },

  /* ================= 2:36.6 FINALE — short and fast: three drums ================= */
  { id: 'phil', dur: 10.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.05 },
    visual(ctx, S) {
      const t = S.t;
      // the frame and the candles ebb away like a tide
      const ebb = smooth(clamp(t / 1.3));
      if (ebb < 1) {
        ctx.save(); ctx.globalAlpha = 1 - ebb; ctx.translate(0, 260 * ebb * ebb);
        poly(ctx, [[960, 330], [1180, 710], [740, 710], [960, 330]], 1, { color: C.goldHi, width: 3, blur: 20, head: false });
        for (let i = 0; i < 14; i++) { const x = 300 + i * 100, up = i % 3 !== 1, o = 640 - i * 14, c = o + (up ? -60 : 40); K.candle(ctx, x, { o: -o, c: -c, h: -Math.min(o, c) + 20, l: -Math.max(o, c) - 20 }, p => -p, { w: 22, alpha: .55 }); }
        ctx.restore();
      }
      ctx.save(); ctx.fillStyle = `rgba(2,2,3,${(.88 * smooth(clamp((t - .5) / 1.2))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
      const rows = [['投资的本质，', 400, 1.5, 40], ['是一场借由市场修剪人性的修行。', 515, 3.5, 40], ['计划你的交易，交易你的计划。', 690, 5.5, 50]];
      rows.forEach(([str, y, t0, sz], j) => {
        const u = smooth(clamp((t - t0) / .7)); if (u <= .002) return;
        const [sx, sy] = shake(t, t0, j === 2 ? 16 : 7, 6);
        ctx.save(); ctx.translate(960 + sx, y - 20 + sy); const s = lerp(1.35, 1, u); ctx.scale(s, s); ctx.translate(-960, -(y - 20));
        ctx.filter = u < 1 ? `blur(${((1 - u) * 9).toFixed(1)}px)` : 'none';
        K.goldText(ctx, str, 960, y, sz, { alpha: u, glow: j === 2 ? 1.2 : .9, spacing: j === 2 ? 6 : 3 });
        ctx.restore();
        ring(ctx, 960, y - 20, (t - t0) / 1.2, C.goldHi, j === 2 ? 900 : 500);
      });
      if (t > 5.5) K.rule(ctx, 960, 610, 340, S.p(5.7, .8), { alpha: .8 });
      const sw = clamp((t - 6.4) / 1.2);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const xx = lerp(300, 1620, sw); ctx.translate(xx, 670); ctx.scale(1, .6);
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 160); g.addColorStop(0, 'rgba(255,240,200,.36)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(-160, -160, 320, 320); ctx.restore();
      }
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
      K.text(ctx, '构建自己的交易系统', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(.9, .9) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.2, .9) });
    } },
  ],
};
})();

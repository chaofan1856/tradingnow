/* ============================================================
   《小资金练胜率》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py + sfx.json)

   Clock pinned to the music: the drop at 16.7 s is the lightning title + the spinning sandbox
   cube; the quiet section (85.3–103.2 s) builds the 15-minute setup (trend, the cost zone, the
   pullback), and the track's return at 103.2 s is the bullish engulfing bar. Short, fast finale.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const Y = '#FFD34D';                                               // core practice point / confluence: yellow

const H0 = { label: '破局', sub: '小资金是最好的沙盒', en: 'The Sandbox', zh: '《小资金练胜率》' };
const HS = [['无压练习', 'Stage One'], ['胜率校准', 'Stage Two'], ['知行合一', 'Stage Three']].map(([sub, en], j) => ({ label: '阶段', num: j + 1, sub, en, zh: '《三阶段打磨》' }));
const HP = { label: '实战', num: 1, sub: '顺势 · 成本 · 确认', en: 'The Setup', zh: '《实战克制》' };
const HM = { label: '实战', num: 2, sub: '止损上移 · 立于不败', en: 'Break-even Stop', zh: '《实战克制》' };
const HF = { label: '实战', num: 3, sub: '只练一件事', en: 'Total Focus', zh: '《实战克制》' };
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


/** the "trading sandbox": a spinning yellow tesseract (cube in a cube) */
function cube(ctx, cx, cy, s, ax, ay, a) {
  if (a <= .002) return;
  const V = []; for (let k = 0; k < 8; k++) V.push([k & 1 ? 1 : -1, k & 2 ? 1 : -1, k & 4 ? 1 : -1]);
  const proj = (v, sc, rx, ry) => { let [x, y, z] = v; [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)]; [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)]; const f = 4 / (4 + z); return [cx + x * sc * f, cy + y * sc * f]; };
  const O = V.map(v => proj(v, s, ax, ay)), I = V.map(v => proj(v, s * .48, -ax * 1.3, -ay * 1.3 + .6));
  const edges = []; for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) { const d = i ^ j; if (d === 1 || d === 2 || d === 4) edges.push([i, j]); }
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.lineCap = 'round'; ctx.shadowColor = Y; ctx.shadowBlur = 22;
  ctx.strokeStyle = Y; ctx.lineWidth = 3.4; ctx.beginPath(); edges.forEach(([i, j]) => { ctx.moveTo(...O[i]); ctx.lineTo(...O[j]); }); ctx.stroke();
  ctx.strokeStyle = mix(Y, '#FFFFFF', .3); ctx.lineWidth = 2.2; ctx.beginPath(); edges.forEach(([i, j]) => { ctx.moveTo(...I[i]); ctx.lineTo(...I[j]); }); ctx.stroke();
  ctx.globalAlpha *= .5; ctx.lineWidth = 1.2; ctx.beginPath(); for (let i = 0; i < 8; i++) { ctx.moveTo(...O[i]); ctx.lineTo(...I[i]); } ctx.stroke();
  ctx.restore();
}
/** odometer number: rolls up to n (fractional part drives the roll) */
function roll(ctx, n, x, y, size, col, a) {
  if (a <= .002) return;
  const i = Math.floor(n), u = smooth((n - i - .6) / .4), h = size * 1.75 * 1.1;
  ctx.save(); ctx.beginPath(); ctx.rect(x - 300, y - h * .95, 600, h * 1.2); ctx.clip();
  K.text(ctx, String(i), x, y - u * h, { font: F.serif(900, size), color: col, align: 'center', alpha: a * (1 - u), glow: .8, glowColor: col });
  if (u > 0) K.text(ctx, String(i + 1), x, y + (1 - u) * h, { font: F.serif(900, size), color: col, align: 'center', alpha: a * u, glow: .8, glowColor: col });
  ctx.restore();
}
/** red photo frame */
function frame(ctx, x, y, w, h, a, on = 1, col = C.red) {
  if (a <= .002) return;
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.fillStyle = rgba(col, .06 + .08 * on); ctx.strokeStyle = rgba(col, .45 + .5 * on); ctx.lineWidth = 2;
  ctx.shadowColor = col; ctx.shadowBlur = 8 + 22 * on; ctx.beginPath(); ctx.roundRect(x, y, w, h, 14); ctx.fill(); ctx.stroke(); ctx.restore();
}
/** the three stairs: 阶段一 → 二 → 三, the current one lit */
const STAGES = ['阶段一 · 无压练习', '阶段二 · 胜率校准', '阶段三 · 知行合一'];
function stairs(ctx, S, act, intro) {
  const xs = [560, 960, 1360], ys = [436, 404, 372], w = 340, h = 54;
  STAGES.forEach((name, j) => {
    const a = intro ? S.p(.2 + j * .3, .7, easeBack) : 1, on = j === act ? .75 + .25 * Math.sin(S.t * 3) : j < act ? .25 : 0;
    frame(ctx, xs[j] - w / 2, ys[j] - h / 2 + (1 - clamp(a)) * 30, w, h, a * (j > act ? .55 : 1), on);
    K.text(ctx, name, xs[j], ys[j] + 12 + (1 - clamp(a)) * 30, { font: F.serif(900, 19), color: j === act ? C.white : j < act ? mix(C.red, C.white, .4) : C.gray, align: 'center', alpha: clamp(a) });
    if (j < 2) K.arrow(ctx, xs[j] + w / 2 + 8, ys[j] - 8, xs[j + 1] - w / 2 - 8, ys[j + 1] + 8, { p: intro ? S.p(.6 + j * .3, .6) : 1, color: C.red, width: 2, head: 10 });
  });
}

/* ---------------- data ---------------- */
// practice tape: a long, choppy series that scrolls past during stage one
const TPp = K.gen.path([100, 104, 101, 106, 102, 105, 99, 103, 100, 107, 103, 108, 104, 102, 106, 103, 109, 105, 104, 108, 103, 107, 104, 109, 106, 110, 105],
  { per: 3, seed: 401, noise: .6, wick: .6 });
const TPK = TPp.candles;
const LEDGER = (() => { const R = K.rng(412); return Array.from({ length: 60 }, () => R() < .55); })();      // win / loss of each practice trade
const MATCH = (() => { const R = K.rng(431); return Array.from({ length: 60 }, (_, k) => R() < (k < 30 ? .5 : .78)); })();   // fits the accumulation logic
const EQ = Array.from({ length: 101 }, (_, i) => i <= 60 ? 1 + .0075 * i + .028 * Math.sin(i * .9) + .016 * Math.sin(i * 2.3) : 0);
for (let i = 61; i <= 100; i++) EQ[i] = EQ[i - 1] * 1.045 + .004 * Math.sin(i * 1.7);

// 15-minute setup: higher highs / higher lows → volume thrust through the prior high → pullback into the cost zone → engulfing
const SUp = K.gen.path([100, 105, 102.5, 107.5, 104.5, 110, 107], { per: [3, 2, 3, 2, 3, 2], seed: 441, noise: .4, wick: .45 });
const SUK = [...SUp.candles, { o: 107, c: 114.6, h: 115.2, l: 106.7 },
  ...K.gen.seq(114.6, [[1.2, .4, .3], [.8, .6, .3], [-1.6, .3, .3], [-1.4, .3, .3], [-1.2, .3, .4], [-.9, .2, .5]]),
  { o: 111.3, c: 115.4, h: 115.8, l: 110.9 },
  ...K.gen.seq(115.4, [[1.6, .4, .3], [1.2, .5, .3], [-1.0, .3, .4], [2.2, .4, .3], [1.4, .5, .3], [-.8, .3, .3], [2.0, .5, .3], [1.2, .4, .3]])];
const SU_B = 15, SU_E = 22, SU_SW = SUp.swings, ENTRY = 115.4, STOP = 109.4, ZLO = 110.0, ZHI = 112.4;
const SUV = SUK.map((k, i) => i === SU_B ? 100 : i === SU_E ? 74 : i > SU_B && i < SU_E ? 46 - (i - SU_B) * 5 : i > SU_E ? 40 : 22 + (i % 3) * 6);
const chSU = new K.Chart(SUK, { x: 260, y: 360, w: 1400, h: 360 }, { lo: 98, hi: 126 });

window.FILM = {
  title: '小资金练胜率',
  transition: 1.2,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },
  scenes: [

  /* ================= 0:00 HOOK — ¥10,000 shrinks into the sandbox ================= */
  { id: 'hook', dur: 6.0, camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, hit = .3;
      const nA = S.p(hit - .1, .3), shrink = smooth(clamp((t - 1.3) / .9)), [sx, sy] = shake(t, hit, 18, 5);
      if (shrink < 1) {
        ctx.save(); ctx.translate(960 + sx, lerp(520, 330, shrink) + sy); const s = lerp(2.0, 1, easeOut(nA)) * lerp(1, .1, shrink); ctx.scale(s, s);
        K.text(ctx, '¥10,000', 0, 50, { font: F.serif(900, 120), color: C.white, align: 'center', alpha: nA * (1 - shrink), glow: .8, glowColor: Y, spacing: 6 });
        ctx.restore();
      }
      flash(ctx, 960, 480, (t > hit ? 1 : 0) * clamp(1 - (t - hit) / .5), 600, '#FFFFFF');
      const cA = smooth(clamp((t - 1.8) / .6)), spin = t * 2.6;
      cube(ctx, 960, 300, lerp(20, 86, cA), spin * .7, spin, cA);
      flash(ctx, 960, 300, cA * (1 - clamp((t - 2.4) / 1)) * .9, 260, Y);
      const p = clamp((t - 2.6) / .3), s2 = lerp(2.0, 1, easeOut(p)), [qx, qy] = shake(t, 2.85, 12, 6);
      ctx.save(); ctx.translate(960 + qx, 640 + qy); ctx.scale(s2, s2);
      ctx.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '小资金起步：', 0, -10, { font: F.serif(900, 44), color: C.white, align: 'center', alpha: p, spacing: 3 });
      K.text(ctx, '1 万元如何练就高胜率？', 0, 100, { font: F.serif(900, 54), color: C.white, align: 'center', alpha: p, glow: .6, glowColor: Y, spacing: 3 });
      ctx.restore();
    } },

  /* ================= 0:06 THE EXPENSIVE WAY — ¥500,000 of tuition ================= */
  { id: 'tuition', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.03, z1: 1.0 }, ...BOT, pre: 3.6,
    lines: [{ s: '很多人一入场，就砸下{几十万本金}', d: 3.4 }, { s: '交完巨额学费，还没摸清门道就<爆仓>', d: 3.7 }],
    visual(ctx, S) {
      const t = S.t, base = 780, H = 420, bx = 860, bw = 200;
      const up = S.p(.3, 1.0, easeOut), drops = [[2.2, .22, '学费 −11 万'], [3.4, .3, '学费 −15 万'], [4.6, .26, '学费 −13 万'], [5.8, .14, '学费 −7 万']];
      let lost = 0; drops.forEach(([t0, d]) => { lost += d * smooth(clamp((t - t0) / .35)); });
      const cap = clamp(up - lost, .04, 1), st = S.p(7.5, .45), dim = 1 - .7 * clamp(st);
      ctx.save(); ctx.globalAlpha = dim;
      K.baseline(ctx, 600, 1320, base, { p: up, step: 60, alpha: .6 });
      const g = ctx.createLinearGradient(0, base - H, 0, base); g.addColorStop(0, C.goldHi); g.addColorStop(1, C.goldDeep);
      ctx.save(); ctx.fillStyle = g; ctx.shadowColor = rgba(C.gold, .5); ctx.shadowBlur = 18; ctx.fillRect(bx, base - H * cap, bw, H * cap); ctx.restore();
      K.text(ctx, `本金 ${Math.round(cap * 50)} 万`, bx - 22, base - H * cap + 34, { font: F.serif(900, 24), color: C.white, align: 'right', alpha: up });
      drops.forEach(([t0, d, lb], k) => {                               // each chunk of tuition breaks off and falls
        const u = clamp((t - t0) / 1.2); if (u <= 0 || u >= 1) return;
        const top = base - H * (1 - drops.slice(0, k).reduce((s, x) => s + x[1], 0));
        ctx.save(); ctx.globalAlpha = 1 - u; ctx.fillStyle = C.green; ctx.shadowColor = C.green; ctx.shadowBlur = 18;
        ctx.translate(bx + bw / 2 + u * 160, top + H * d / 2 + 110 * u * u); ctx.rotate(u * .6); ctx.fillRect(-bw / 2, -H * d / 2, bw, H * d); ctx.restore();
        tagAt(ctx, bx + bw + 250, 390 + k * 84, lb, { side: 'right', alpha: clamp((t - t0) / .3) * (1 - clamp((t - t0 - 2.6) / .6)), color: C.green, font: F.serif(900, 22) });
      });
      ctx.restore();
      const [sx, sy] = shake(t, 7.75, 12, 6);
      ctx.save(); ctx.translate(sx, sy); stamp(ctx, '仓促爆仓', 960, 520, st, { color: C.green, size: 50 }); ctx.restore();
    } },

  /* ================= 0:16.7 LIGHTNING TITLE + THE SANDBOX ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 }, ...BOT, pre: 4.6,
    lines: [{ s: '小资金，是你低成本的{实战沙盒}', d: 2.8 }, { s: '反复练习，直到系统形成{肌肉记忆}', d: 2.9 }],
    visual(ctx, S) {
      const t = S.t, z = .15;
      const R = K.rng(47), pts = []; let x = -60, y = 220, up = 1;
      while (x < 1980) { pts.push([x, y]); x += 70 + R() * 70; y += up * (50 + R() * 80) + 10; up = -up; }
      const bp = clamp((t - z) / .22), fade = clamp(1 - (t - z - .25) / .9);
      if (bp > 0 && fade > 0) { poly(ctx, pts, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false }); poly(ctx, pts, bp, { color: C.goldHi, width: 14, blur: 60, alpha: fade * .35, head: false }); flash(ctx, 960, 360, fade, 1100, C.goldHi); }
      const tp = S.p(z + .35, 1.2, K.expo);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 220, 1920, 150); ctx.clip();
      K.goldText(ctx, '小资金练胜率', 960, 340 + (1 - tp) * 120, 58, { spacing: 18, alpha: tp });
      ctx.restore();
      const cA = S.p(1.2, .9, easeBack), spin = t * 1.1;
      cube(ctx, 960, 500, 74 * clamp(cA), spin * .6, spin, clamp(cA));
      flash(ctx, 960, 500, clamp(cA) * (.35 + .15 * Math.sin(t * 2.4)), 240, Y);
      K.text(ctx, '1 万元 · 交易沙盒', 960, 680, { font: F.serif(900, 22), color: Y, align: 'center', alpha: S.p(1.8, .8), spacing: 6 });
      tagAt(ctx, 960, 750, '交易，从低成本练习开始', { alpha: S.p(2.6, .7, easeBack), color: Y, font: F.serif(900, 26) });
    } },

  /* ================= 壹 · THREE STAGES ================= */
  { id: 'ch1', dur: 3.6, tr: 'sweep', visual: chapter('壹', 1, '高胜率打磨的三阶段', 'Three Stages', '无压练习 · 胜率校准 · 知行合一') },

  { id: 'st1', header: HS[0], dur: 18.0, tr: ['iris', [960, 600]], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '阶段一·无压练习：先{忘掉金钱}', d: 5.6 }, { s: '守住 1 万本金，完成{30 笔完整交易}', d: 5.8 }, { s: '压力低，才能冷静练习{规则的执行}', d: 6.0 }],
    visual(ctx, S) {
      stairs(ctx, S, 0, true);
      const n = 1 + 29 * smooth(S.lin(0, .4, 16.2)), fA = S.at(0, .2, .8);
      frame(ctx, 290, 490, 400, 290, fA, .6 + .4 * Math.sin(S.t * 3));
      K.text(ctx, '第', 360, 680, { font: F.serif(700, 24), color: C.gray, align: 'center', alpha: fA });
      roll(ctx, n, 490, 690, 80, C.white, fA);
      K.text(ctx, '笔', 620, 680, { font: F.serif(700, 24), color: C.gray, align: 'center', alpha: fA });
      K.text(ctx, '/ 30', 490, 752, { font: F.serif(700, 20), color: C.gray, align: 'center', alpha: fA });
      tagAt(ctx, 490, 815, '守住 1 万本金', { alpha: S.at(1, .4, .6, easeBack) * (1 - S.at(2, 0, .5)), color: Y, font: F.serif(900, 22) });
      tagAt(ctx, 490, 815, '心理压力：低', { alpha: S.at(2, .4, .6, easeBack), color: C.red, font: F.serif(900, 22) });
      // the practice tape scrolls; each finished trade drops into the ledger
      const cA = S.at(0, .4, .8), off = 52 * S.lin(0, 0, 17.2), W = 34, x0 = 820, cw = 24.7, lo = 96, hi = 112, yOf = p => 500 + 250 * (1 - (p - lo) / (hi - lo));
      ctx.save(); ctx.beginPath(); ctx.rect(x0, 480, 840, 290); ctx.clip(); ctx.globalAlpha = cA;
      for (let i = Math.floor(off); i < Math.min(TPK.length, Math.floor(off) + W + 1); i++) K.candle(ctx, x0 + (i - off) * cw + cw / 2, TPK[i], yOf, { w: cw * .6, alpha: .85, glow: .3 });
      ctx.restore();
      K.baseline(ctx, x0, x0 + 840, 772, { p: cA, step: 60, alpha: .5 });
      for (let k = 0; k < 30; k++) {
        const g = clamp(n - 1 - k); if (g <= 0) break;
        const col = LEDGER[k] ? C.red : C.green;
        ctx.save(); ctx.globalAlpha = easeOut(g) * .85; ctx.fillStyle = col; if (g < 1) { ctx.shadowColor = col; ctx.shadowBlur = 16; }
        ctx.fillRect(x0 + k * 28, 792, 22, 22 * easeOut(g)); ctx.restore();
      }
    } },

  { id: 'st2', header: HS[1], dur: 18.0, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '阶段二·胜率校准：同样模式再练{30 笔}', d: 5.6 }, { s: '复盘 60 笔：多少笔{符合主力建仓逻辑}', d: 6.0 }, { s: '高胜率，来自同一形态的{千锤百炼}', d: 5.8 }],
    visual(ctx, S) {
      stairs(ctx, S, 1, false);
      const n = 30 + 30 * smooth(S.lin(0, .2, 5.2));
      frame(ctx, 290, 490, 400, 290, 1, .6 + .4 * Math.sin(S.t * 3));
      K.text(ctx, '第', 360, 680, { font: F.serif(700, 24), color: C.gray, align: 'center' });
      roll(ctx, n, 490, 690, 80, C.white, 1);
      K.text(ctx, '笔', 620, 680, { font: F.serif(700, 24), color: C.gray, align: 'center' });
      K.text(ctx, '/ 60', 490, 752, { font: F.serif(700, 20), color: C.gray, align: 'center' });
      // 60 trades; the review sweep lights the ones that fit the accumulation logic
      const rv = 60 * S.lin(1, .4, 4.2), pulse = S.after(2) ? .6 + .4 * Math.sin(S.t * 5) : 1;
      let m = 0;
      for (let k = 0; k < 60; k++) {
        const g = k < 30 ? 1 : clamp(n - k), r = clamp(rv - k), x = 836 + (k % 10) * 82, y = 495 + Math.floor(k / 10) * 52;
        if (g <= 0) continue;
        if (r >= 1 && MATCH[k]) m++;
        const base = LEDGER[k] ? C.red : C.green, col = r <= 0 ? base : MATCH[k] ? Y : C.dim;
        ctx.save(); ctx.globalAlpha = easeOut(g) * (r > 0 && !MATCH[k] ? .55 : r > 0 ? .9 * pulse : .6); ctx.fillStyle = rgba(col, r > 0 && MATCH[k] ? .3 : .2); ctx.strokeStyle = col; ctx.lineWidth = 1.6;
        if (r > 0 && MATCH[k]) { ctx.shadowColor = Y; ctx.shadowBlur = 14; }
        ctx.beginPath(); ctx.roundRect(x, y, 70, 40, 6); ctx.fill(); ctx.stroke(); ctx.restore();
        if (r > 0 && MATCH[k]) tick(ctx, x + 35, y + 20, r, 22, Y);
      }
      if (rv > 0 && rv < 60) { const k = Math.floor(rv), y = 495 + Math.floor(k / 10) * 52; K.line(ctx, 830, y + 46, 1650, y + 46, { color: Y, width: 2, glow: 1, alpha: .8 }); }
      tagAt(ctx, 490, 815, `符合建仓逻辑：${m} 笔（示意）`, { alpha: S.at(1, .4, .6, easeBack), color: Y, font: F.serif(900, 20) });
    } },

  { id: 'st3', header: HS[2], dur: 18.7, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '阶段三·知行合一：系统{稳定正期望}', d: 5.8 }, { s: '图形识别率极高时，再{放大资金}', d: 6.0 }, { s: '开启[复利奔跑]', d: 6.0 }],
    visual(ctx, S) {
      stairs(ctx, S, 2, false);
      frame(ctx, 290, 490, 400, 290, 1, .6 + .4 * Math.sin(S.t * 3));
      const eA = S.at(0, .3, .7, easeBack);
      K.text(ctx, 'EV > 0', 490, 660, { font: F.serif(900, 56), color: C.red, align: 'center', alpha: clamp(eA), glow: .8, glowColor: C.red });
      K.text(ctx, '正期望值 · 稳定', 490, 735, { font: F.serif(700, 20), color: C.gray, align: 'center', alpha: S.at(0, .9, .6) });
      tagAt(ctx, 490, 815, '图形识别率 ↑', { alpha: S.at(1, .3, .6, easeBack), color: Y, font: F.serif(900, 22) });
      // equity: steady first, then the y-axis zooms out as compounding takes over
      const x0 = 820, x1 = 1660, yb = 790, yt = 510, p = 45 * smooth(S.lin(0, .4, 5.0)) + 15 * smooth(S.lin(1, .2, 4.0)) + 40 * smooth(S.lin(2, .2, 4.4));
      const hi = lerp(1.6, EQ[100] * 1.04, smooth(S.lin(2, 0, 3.6))), yOf = v => yb - (yb - yt) * (v - .9) / (hi - .9), xOf = i => x0 + (x1 - x0) * i / 100;
      K.baseline(ctx, x0, x1, yb + 12, { p: S.at(0, 0, 1.2), step: 60, alpha: .5 });
      const n = Math.floor(p), head = [xOf(p), yOf(EQ[n] + (EQ[Math.min(n + 1, 100)] - EQ[n]) * (p - n))];
      const ptsA = [], ptsB = [];
      for (let i = 0; i <= Math.min(n, 60); i++) ptsA.push([xOf(i), yOf(EQ[i])]);
      if (p <= 60) ptsA.push(head); else { for (let i = 60; i <= n; i++) ptsB.push([xOf(i), yOf(EQ[i])]); ptsB.push(head); }
      if (ptsA.length > 1) poly(ctx, ptsA, 1, { color: C.goldHi, width: 3.4, blur: 14, head: p <= 60 });
      if (ptsB.length > 1) poly(ctx, ptsB, 1, { color: C.red, width: 4.4, blur: 22, head: true });
      if (p > 60) flash(ctx, head[0], head[1], .5 + .2 * Math.sin(S.t * 6), 120, C.red);
      K.text(ctx, '资金曲线（示意）', x0, yt - 2, { font: F.serif(700, 16), color: C.gray, alpha: S.at(0, .6, .8) });
      tagAt(ctx, x0 + 10, 560, '本金 1 万', { side: 'right', alpha: S.at(0, 1.0, .6) * (1 - S.at(1, 1.2, .4)), color: C.gray, font: F.serif(900, 20) });
      tagAt(ctx, x0 + 10, 560, '放大资金', { side: 'right', alpha: S.at(1, 1.4, .6, easeBack), color: C.red, font: F.serif(900, 20) });
    } },

  /* ================= 贰 · RESTRAINT (quiet section → the engulfing bar on the return) ================= */
  { id: 'ch2', dur: 3.6, tr: 'sweep', visual: chapter('贰', 2, '实战克制', 'Restraint in Practice', '一看顺势 · 二找成本 · 三等确认') },

  { id: 'setup', header: HP, dur: 21.3, tr: ['iris', [960, 560]], camera: { z0: 1.0, z1: 1.03, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '一看顺势：15 分钟图{顶顶高、底底高}', d: 6.6 }, { s: '二找成本：锁定放量拉升的{核心支撑区}', d: 7.1 }, { s: '三等确认：回踩支撑，走出{看涨吞没}', d: 7.0 }],
    visual(ctx, S) {
      const c = chSU, tE = S.beat(2);                                    // the engulfing bar lands when the music returns
      const r0 = SU_B * smooth(S.lin(0, 0, 4.4)), r1 = clamp((S.t - S.beat(1) - .4) / .45), r2 = (SU_E - SU_B - 1) * smooth(S.lin(1, 2.6, 4.0)), r3 = clamp((S.t - tE) / .45);
      const rv = r0 + (r0 >= SU_B ? r1 : 0) + (r1 >= 1 ? r2 : 0) + (r2 >= SU_E - SU_B - 1 - 1e-6 ? r3 : 0);
      const [sx, sy] = shake(S.t, tE, 9, 5), [bx, by] = shake(S.t, S.beat(1) + .4, 6, 6);
      ctx.save(); ctx.translate(sx + bx, sy + by);
      K.text(ctx, '15 分钟（示意）', c.box.x, c.box.y - 4, { font: F.serif(700, 16), color: C.gray, alpha: S.at(0, .2, .8) });
      // cost zone of the thrust
      const zA = S.at(1, 2.0, 1.0);
      if (zA > 0) { ctx.save(); ctx.globalAlpha = .14 * zA; ctx.fillStyle = C.red; ctx.fillRect(c.x(SU_B) - c.step / 2, c.y(ZHI), (c.box.x + c.box.w - c.x(SU_B) + c.step / 2) * smooth(zA), c.y(ZLO) - c.y(ZHI)); ctx.restore();
        K.text(ctx, '核心支撑区（主力成本）', c.box.x + c.box.w - 10, c.y(ZLO) + 34, { font: F.serif(900, 18), color: C.red, align: 'right', alpha: zA }); }
      const hA = S.at(1, .2, .8);
      K.dash(ctx, c.x(SU_SW[4].i), c.y(SU_SW[4].price), c.x(SU_B) + 30, c.y(SU_SW[4].price), { p: hA, color: C.gray, width: 1.4 });
      drawChart(ctx, c, rv, { dim: i => i === SU_E ? 1 : .8, color: i => i === SU_E ? Y : undefined });
      // higher highs, higher lows
      const tA = S.at(0, 3.4, 1.0) * (1 - S.at(1, 0, .6));
      const HHs = SU_SW.filter(s => s.type === 'H'), HLs = SU_SW.filter(s => s.type === 'L');
      poly(ctx, HHs.map(s => [c.x(s.i), c.y(s.price) - 14]), tA, { color: C.red, width: 2.4, blur: 10, dash: [8, 6], head: false, alpha: tA });
      poly(ctx, HLs.map(s => [c.x(s.i), c.y(s.price) + 14]), tA, { color: C.red, width: 2.4, blur: 10, dash: [8, 6], head: false, alpha: tA });
      K.text(ctx, '顶顶高', c.x(HHs[2].i) + 24, c.y(HHs[2].price) - 18, { font: F.serif(900, 20), color: C.red, alpha: tA });
      K.text(ctx, '底底高', c.x(HLs[2].i) + 28, c.y(HLs[2].price) + 40, { font: F.serif(900, 20), color: C.red, alpha: tA });
      // the thrust through the prior high
      const tb = S.beat(1) + .4;
      flash(ctx, c.x(SU_B), c.y(112), (S.t >= tb ? 1 : 0) * clamp(1 - (S.t - tb) / 1.2), 360, C.red);
      ring(ctx, c.x(SU_B), c.y(SU_SW[4].price), (S.t - tb) / 1.2, C.red, 200);
      tagAt(ctx, c.x(SU_B) - 40, c.y(114.6), '放量冲破前高', { side: 'left', alpha: S.at(1, 1.0, .6) * (1 - S.at(1, 2.6, .5)), color: C.red, font: F.serif(900, 20) });
      // volume
      const vy = 745, vh = 85;
      K.baseline(ctx, c.box.x, c.box.x + c.box.w, vy + vh, { p: S.at(0, 0, 1.2), step: 60, alpha: .6 });
      for (let i = 0; i < SUK.length && i < Math.ceil(rv); i++) {
        const g = clamp(rv - i), hh = vh * SUV[i] / 100 * easeOut(g), k = SUK[i], hot = i === SU_B || i === SU_E;
        const col = i === SU_E ? Y : hot ? C.red : mix(k.c >= k.o ? C.red : C.green, C.gold, .45);
        ctx.save(); ctx.globalAlpha = (hot ? .95 : .5) * easeOut(g); ctx.fillStyle = col; if (hot) { ctx.shadowColor = col; ctx.shadowBlur = 20; }
        ctx.fillRect(c.x(i) - c.cw / 2, vy + vh - hh, c.cw, hh); ctx.restore();
      }
      // the engulfing confirmation
      const ex = c.x(SU_E), eC = c.y(SUK[SU_E].c);
      flash(ctx, ex, eC, (S.t >= tE ? 1 : 0) * clamp(1 - (S.t - tE) / 1.3), 420, Y);
      ring(ctx, ex, c.y(SUK[SU_E].o), (S.t - tE) / 1.2, Y, 240);
      const ra = S.at(2, .9, .7);
      reticle(ctx, ex, eC, ra, S.t, Y);
      tagAt(ctx, ex + 56, eC, '看涨吞没 · 收线进场', { side: 'right', alpha: ra, color: Y, font: F.serif(900, 22) });
      ctx.restore();
    } },

  { id: 'manage', header: HM, dur: 19.8, tr: 'dissolve', camera: { z0: 1.03, z1: 1.06, x0: -12, x1: -24 }, ...TOP, pre: .6,
    lines: [{ s: '单笔亏损，严控在总资金的{2%（200 元）}', d: 6.2 }, { s: '价格拉开成本，立刻把{止损上移到开仓价}', d: 6.4 }, { s: '最坏结果也不亏本金——{立于不败}', d: 6.6 }],
    visual(ctx, S) {
      const c = chSU, xr = c.box.x + c.box.w, ex = c.x(SU_E);
      const rv = SU_E + 1 + 4 * smooth(S.lin(1, 0, 3.0)) + 4 * smooth(S.lin(2, 0, 2.6));
      const mv = smooth(S.lin(1, 3.2, 1.0)), sp = lerp(STOP, ENTRY, mv), sy = c.y(sp), yE = c.y(ENTRY);
      const st = S.at(2, 1.0, .45);
      // risk band between entry and stop collapses to nothing once the stop is at break-even
      const bA = S.at(0, .6, .8);
      if (bA > 0 && sy - yE > .5) { ctx.save(); ctx.globalAlpha = .13 * bA; ctx.fillStyle = C.green; ctx.fillRect(ex, yE, (xr - ex) * smooth(bA), sy - yE); ctx.restore(); }
      ctx.save(); ctx.beginPath(); ctx.rect(c.x(SU_B) - c.step / 2, c.y(ZHI), xr - c.x(SU_B) + c.step / 2, c.y(ZLO) - c.y(ZHI)); ctx.globalAlpha = .08; ctx.fillStyle = C.red; ctx.fill(); ctx.restore();
      drawChart(ctx, c, rv, { dim: i => i === SU_E ? 1 : .8, color: i => i === SU_E ? Y : undefined });
      K.dash(ctx, ex, yE, xr, yE, { p: S.at(0, .2, .8), color: C.goldHi, width: 1.6 });
      K.text(ctx, '开仓价', xr + 14, yE + 7, { font: F.serif(700, 16), color: C.goldHi, alpha: S.at(0, .2, .8) });
      reticle(ctx, ex, yE, S.at(0, .2, .6) * (1 - S.at(2, 0, .6)), S.t, Y);
      const sA = S.at(0, .8, .8), col = mix(C.green, C.goldHi, mv);
      K.line(ctx, ex, sy, xr, sy, { p: sA, color: col, width: 3, glow: .8 });
      if (mv < .98) K.text(ctx, '止损', xr + 14, sy + 7, { font: F.serif(700, 16), color: C.green, alpha: sA * (1 - mv) });
      tagAt(ctx, ex + 20, c.y(STOP) + 36, '单笔最多亏 200 元（总资金 2%）', { side: 'right', alpha: S.at(0, 1.6, .6, easeBack) * (1 - S.at(1, 2.6, .5)), color: C.green, font: F.serif(900, 20) });
      if (mv > 0 && mv < 1) K.arrow(ctx, xr - 60, c.y(STOP), xr - 60, sy + 4, { p: 1, color: C.goldHi, width: 3, head: 14 });
      ring(ctx, xr - 60, yE, (S.t - S.beat(1) - 4.2) / 1.1, C.goldHi, 140);
      tagAt(ctx, ex + 20, yE + 40, '止损上移至开仓价（保本）', { side: 'right', alpha: S.at(1, 4.0, .6, easeBack) * (1 - S.at(2, .6, .5)), color: C.goldHi, font: F.serif(900, 20) });
      tagAt(ctx, ex + 20, yE + 40, '最坏结果：不亏本金', { side: 'right', alpha: S.at(2, 1.2, .6, easeBack), color: C.goldHi, font: F.serif(900, 20) });
      const [kx, ky] = shake(S.t, S.beat(2) + 1.25, 12, 6);
      ctx.save(); ctx.translate(kx, ky); stamp(ctx, '立于不败', 960, 790, st, { color: Y, size: 40, rot: -.05 }); ctx.restore();
    } },

  { id: 'focus', header: HF, dur: 13.6, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '只练一件事：同一主线·同一周期·同一支撑', d: 6.4 }, { s: '心态平稳，才能捕捉{高胜率的终点}', d: 6.6 }],
    visual(ctx, S) {
      const cards = [['同一条主线', '只做主线板块'], ['同一个周期', '15 分钟图'], ['同一种支撑', '主力成本区']];
      cards.forEach(([t1, t2], j) => {
        const a = S.at(0, j * .25, .7, easeOut), x = 520 + j * 440, y = 555 + (1 - a) * 40, lk = S.at(0, .9 + j * .5, .35, easeBack);
        frame(ctx, x - 180, y - 125, 360, 250, a, clamp(lk), clamp(lk) > .5 ? Y : C.gold);
        // padlock: the shackle drops shut
        const ly = y - 62, sh = lerp(-18, 0, clamp(lk));
        ctx.save(); ctx.globalAlpha = clamp(a); ctx.strokeStyle = clamp(lk) > .5 ? Y : C.gray; ctx.fillStyle = rgba(clamp(lk) > .5 ? Y : C.gray, .25); ctx.lineWidth = 4; ctx.shadowColor = Y; ctx.shadowBlur = 16 * clamp(lk);
        ctx.beginPath(); ctx.arc(x, ly - 8 + sh, 15, Math.PI, 0); ctx.lineTo(x + 15, ly + 4 + sh); ctx.moveTo(x - 15, ly - 8 + sh); ctx.lineTo(x - 15, ly + 4 + sh); ctx.stroke();
        ctx.beginPath(); ctx.roundRect(x - 24, ly, 48, 36, 6); ctx.fill(); ctx.stroke(); ctx.restore();
        ring(ctx, x, ly + 18, (S.t - S.beat(0) - .9 - j * .5) / .9, Y, 110);
        K.text(ctx, t1, x, y + 30, { font: F.serif(900, 26), color: C.white, align: 'center', alpha: a });
        K.text(ctx, t2, x, y + 86, { font: F.serif(700, 18), color: C.gray, align: 'center', alpha: a });
      });
      // a calm, steady path to the target
      const pp = S.p(S.beat(1) + .2, 3.2, easeInOut), pts = [];
      for (let i = 0; i <= 80; i++) { const u = i / 80; pts.push([300 + 1280 * u, 790 - 22 * u - 6 * Math.sin(u * 12)]); }
      poly(ctx, pts, pp, { color: C.goldHi, width: 3.2, blur: 16 });
      const ra = S.at(1, 3.2, .7);
      reticle(ctx, 1580, 768, ra, S.t, Y);
      K.text(ctx, '高胜率的终点', 1610, 838, { font: F.serif(900, 20), color: Y, align: 'right', alpha: ra });
    } },

  /* ================= 2:23.6 FINALE — short and fast, white on black ================= */
  { id: 'phil', dur: 10.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    visual(ctx, S) {
      const t = S.t;
      const ebb = smooth(clamp(t / 1.3));                                 // the messy red and green candles fade away
      if (ebb < 1) {
        const R = K.rng(61);
        ctx.save(); ctx.globalAlpha = 1 - ebb;
        for (let i = 0; i < 26; i++) { const x = 140 + R() * 1640, y = 200 + R() * 680, h = 40 + R() * 120, up = R() < .5, j = Math.sin(t * 20 + i) * 6 * (1 - ebb);
          const pt = 1080 - y, pb = 1080 - y - h; K.candle(ctx, x + j, { o: up ? pb : pt, c: up ? pt : pb, h: pt + 20, l: pb - 20 }, p => 1080 - p, { w: 18, alpha: .55 }); }
        ctx.restore();
      }
      ctx.save(); ctx.fillStyle = `rgba(2,2,3,${(.9 * smooth(clamp((t - .4) / 1.2))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
      const rows = [['不要迷信虚幻的“神仙胜率”。', 380, 1.2, 36], ['交易不是赌博，', 480, 2.8, 36], ['它是关于概率和克制的长久修行。', 580, 4.4, 36], ['用小资金，多练习。', 730, 6.2, 52]];
      rows.forEach(([str, y, t0, sz], j) => {
        const u = smooth(clamp((t - t0) / .6)); if (u <= .002) return;
        const [sx, sy] = shake(t, t0, j === 3 ? 14 : 5, 6);
        ctx.save(); ctx.translate(960 + sx, y - 20 + sy); const s = lerp(1.25, 1, u); ctx.scale(s, s); ctx.translate(-960, -(y - 20));
        ctx.filter = u < 1 ? `blur(${((1 - u) * 8).toFixed(1)}px)` : 'none';
        K.text(ctx, str, 960, y, { font: F.serif(900, sz), color: '#F4F0E8', align: 'center', alpha: u, glow: j === 3 ? .8 : .35, glowColor: j === 3 ? Y : '#FFFFFF', spacing: j === 3 ? 10 : 4 });
        ctx.restore();
        if (j === 3) ring(ctx, 960, y - 24, (t - t0) / 1.2, Y, 800);
      });
      if (t > 6.2) K.rule(ctx, 960, 640, 300, S.p(6.4, .8), { alpha: .7 });
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
      K.text(ctx, '小资金练胜率', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(.9, .9) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.2, .9) });
    } },
  ],
};
})();

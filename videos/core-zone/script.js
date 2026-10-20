/* ============================================================
   《狙击核心区》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py + sfx.json)

   Clock pinned to the music: the drop at 16.7 s is the lightning title and the crosshair on the
   cost zone; the quiet section (85.3–103.2 s) sets up the three timeframes (4H direction, 1H core
   support), and the track's return at 103.2 s is the 5-minute thrust through the micro high.
   Short, fast finale.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const Y = '#FFD34D';                                               // turning points / core secrets: yellow

const H0 = { label: '破题', sub: '回归纯粹的价格行为', en: 'Snipe the Core Zone', zh: '《狙击核心区》' };
const H1 = { label: '本质', sub: '主力的核心成本区', en: "The Whale's Cost Zone", zh: '《跟着主力做交易》' };
const H2 = { label: '方法', sub: '3 大步骤找核心区', en: 'Three Steps', zh: '《跟着主力做交易》' };
const H3 = { label: '狙击', sub: '多时间级别联动', en: 'Three Timeframes', zh: '《跟着主力做交易》' };
const H4 = { label: '心法', sub: '关掉屏幕，交给市场', en: 'Plan, Then Let Go', zh: '《跟着主力做交易》' };
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

/** a little cat (retail) — outline icon */
function cat(ctx, x, y, s, a) {
  if (a <= .002) return;
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.globalAlpha *= clamp(a);
  ctx.strokeStyle = '#E8E2D4'; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.shadowColor = 'rgba(255,255,255,.5)'; ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(-26, -10); ctx.lineTo(-22, -40); ctx.lineTo(-8, -26); ctx.lineTo(8, -26); ctx.lineTo(22, -40); ctx.lineTo(26, -10);
  ctx.quadraticCurveTo(28, 14, 0, 16); ctx.quadraticCurveTo(-28, 14, -26, -10); ctx.closePath(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-10, -6, 3, 0, 6.28); ctx.arc(10, -6, 3, 0, 6.28); ctx.fillStyle = '#E8E2D4'; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-30, 2); ctx.lineTo(-44, -2); ctx.moveTo(-30, 8); ctx.lineTo(-44, 10); ctx.moveTo(30, 2); ctx.lineTo(44, -2); ctx.moveTo(30, 8); ctx.lineTo(44, 10); ctx.stroke();
  ctx.restore();
}
/** a whale (the main force) — outline icon */
function whale(ctx, x, y, s, a, t) {
  if (a <= .002) return;
  ctx.save(); ctx.translate(x, y + Math.sin(t * 1.6) * 6); ctx.scale(s, s); ctx.globalAlpha *= clamp(a);
  ctx.strokeStyle = C.goldHi; ctx.fillStyle = rgba(C.gold, .12); ctx.lineWidth = 3.4; ctx.lineJoin = 'round'; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(-120, 0); ctx.bezierCurveTo(-110, -60, 40, -70, 90, -20); ctx.quadraticCurveTo(120, 0, 150, -34); ctx.quadraticCurveTo(140, 0, 156, 30);
  ctx.quadraticCurveTo(120, 14, 92, 18); ctx.bezierCurveTo(40, 60, -100, 56, -120, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(-80, -8, 5, 0, 6.28); ctx.fillStyle = C.goldHi; ctx.fill();
  ctx.beginPath(); ctx.moveTo(-108, 16); ctx.quadraticCurveTo(-80, 30, -50, 22); ctx.stroke();
  ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(-60, -52); ctx.quadraticCurveTo(-66, -80, -52, -96); ctx.moveTo(-60, -52); ctx.quadraticCurveTo(-56, -84, -72, -100); ctx.stroke();
  ctx.restore();
}
/** the "last opposite candle" box */
function zoneBox(ctx, ch, i, a, col, label, below = true) {
  if (a <= .002) return;
  const k = ch.k[i], x0 = ch.x(i) - ch.step * .7, x1 = ch.box.x + ch.box.w, y0 = ch.y(k.h) - 4, y1 = ch.y(k.l) + 4;
  ctx.save(); ctx.globalAlpha = .16 * a; ctx.fillStyle = col; ctx.fillRect(x0, y0, (x1 - x0) * smooth(a), y1 - y0); ctx.restore();
  ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = col; ctx.shadowBlur = 12; ctx.strokeRect(x0, y0, (x1 - x0) * smooth(a), y1 - y0); ctx.restore();
  if (label) K.text(ctx, label, x1 - 8, below ? y1 + 30 : y0 - 12, { font: F.serif(900, 18), color: col, align: 'right', alpha: a });
}

/* ---------------- data ---------------- */
// the cluttered chart
const CLp = K.gen.path([100, 106, 102, 109, 104.5, 111, 107, 114], { per: [5, 4, 5, 4, 5, 4, 5], seed: 801, noise: .5, wick: .5 });
const CLK = CLp.candles, CLN = CLK.length, CLc = CLK.map(k => k.c);
const CL5 = sma(CLK, 5), CL12 = sma(CLK, 12), CLBU = CL12.map(v => v + 2.6), CLBD = CL12.map(v => v - 2.6);
const chCL = new K.Chart(CLK, { x: 260, y: 230, w: 1400, h: 380 }, { lo: 96, hi: 118 });

// accumulation → explosive rally → the first return to the cost zone
const CZK = [...K.gen.seq(100, [[-.6, .4, .3], [.5, .3, .4], [-.4, .4, .3], [.3, .3, .4], [-.5, .3, .3], [.4, .4, .3], [-.6, .3, .4]]),
  ...K.gen.seq(99.1, [[3.2, .3, .2], [2.8, .4, .2], [3.4, .3, .2], [2.6, .5, .3], [1.2, .6, .4], [-1.4, .4, .4], [-1.8, .3, .4], [-2.2, .3, .4], [-2.4, .3, .5], [-2.0, .3, .5], [-1.2, .3, 1.0], [2.6, .3, .3], [3.0, .4, .3], [2.4, .5, .3]])];
const CZ_A = 6, CZ_TOP = 11, CZ_RET = 17, CZN = CZK.length;
const chCZ = new K.Chart(CZK, { x: 260, y: 380, w: 1400, h: 400 }, { lo: 95, hi: 116 });

// 3 steps: big bullish candles break the prior high → box the last bearish candle before the move
const S3p = K.gen.path([100, 105, 102, 106.2, 103.4], { per: [4, 3, 4, 3], seed: 811, noise: .35, wick: .4 });
const S3K = [...S3p.candles, ...K.gen.seq(103.4, [[-.8, .3, .3], [3.0, .3, .2], [2.9, .4, .2], [2.6, .4, .3], [.6, .5, .4]])];
const S3_LAST = S3p.candles.length, S3_HI = S3p.swings[2].price;
const chS3 = new K.Chart(S3K, { x: 260, y: 380, w: 1400, h: 380 }, { lo: 98, hi: 115 });
const SBK = S3K.map(k => ({ o: 200 - k.o, c: 200 - k.c, h: 200 - k.l, l: 200 - k.h }));                // the mirror: core resistance
const chSB = new K.Chart(SBK, { x: 260, y: 380, w: 1400, h: 380 }, { lo: 85, hi: 102 });

// sniper: 4H trend, 1H core support, 5m reversal
const SN4 = K.gen.path([100, 108, 104, 113, 109, 118, 114.5], { per: [4, 3, 4, 3, 4, 3], seed: 821, noise: .35, wick: .4 }).candles;
const SN1p = K.gen.path([100, 103, 101.4, 102.2, 101.2], { per: [4, 2, 2, 3], seed: 831, noise: .3, wick: .35 });
const SN1K = [...SN1p.candles.slice(0, 3), { o: 101.6, c: 101.0, h: 101.9, l: 100.8 }, ...K.gen.seq(101.0, [[2.0, .3, .2], [1.8, .4, .2], [1.4, .4, .3], [-.8, .3, .3], [-1.0, .3, .3], [-1.2, .3, .3], [-1.0, .3, .4], [-.9, .3, .5]])];
const SN1_Z = 3, SN1N = SN1K.length;
const SN5p = K.gen.path([102.6, 101.4, 101.9, 101.0, 101.5, 100.9], { per: [4, 2, 3, 2, 2], seed: 841, noise: .3, wick: .35 });
const SN5K = [...SN5p.candles, { o: 100.95, c: 102.3, h: 102.45, l: 100.9 }, ...K.gen.seq(102.3, [[.5, .3, .2], [.4, .3, .2]])];
const SN5_B = SN5p.candles.length, SN5_HI = SN5p.swings[3].price, SN5_LO = SN5p.swings[4].price, SN5_ATR = .25;
const ch4H = new K.Chart(SN4, { x: 130, y: 430, w: 500, h: 320 });
const ch1H = new K.Chart(SN1K, { x: 710, y: 430, w: 500, h: 320 }, { lo: 99.6, hi: 106.4 });
const ch5M = new K.Chart(SN5K, { x: 1290, y: 430, w: 500, h: 320 }, { lo: 99.6, hi: 104.2 });

window.FILM = {
  title: '狙击核心区',
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
      K.text(ctx, '看着指标做多，一买就跌？', 0, 0, { font: F.serif(900, 50), color: C.white, align: 'center', alpha: p, glow: .6, glowColor: C.green, spacing: 3 });
      ctx.restore();
      const q = clamp((t - 1.3) / .3), s2 = lerp(2.2, 1, easeOut(q)), [qx, qy] = shake(t, 1.55, 16, 5);
      ctx.save(); ctx.translate(960 + qx, 610 + qy); ctx.scale(s2, s2);
      ctx.filter = q < 1 ? `blur(${((1 - q) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '一被插针扫损，它就一飞冲天？', 0, 0, { font: F.serif(900, 50), color: C.white, align: 'center', alpha: q, glow: .6, glowColor: C.red, spacing: 3 });
      ctx.restore();
      flash(ctx, 960, 470, (t > hit ? 1 : 0) * clamp(1 - (t - hit) / .5), 600, '#FFFFFF');
    } },

  /* ================= 0:06 WIPE THE INDICATORS ================= */
  { id: 'wipe', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.03, z1: 1.0 }, ...BOT, pre: 3.6,
    lines: [{ s: '今天，不教任何{技术指标}', d: 3.4 }, { s: '回归纯粹的{价格行为}', d: 3.7 }],
    visual(ctx, S) {
      const c = chCL, t = S.t, wx = lerp(180, 1760, smooth(clamp((t - 2.6) / 2.2)));
      drawChart(ctx, c, CLN * smooth(clamp(t / 1.4)), { dim: () => .9 });
      // the clutter, clipped to the right of the eraser
      ctx.save(); ctx.beginPath(); ctx.rect(wx, 0, 1920, 1080); ctx.clip();
      const a = clamp(t / 1.0);
      maLine(ctx, c, CL5, 0, CLN - 1, a, { color: '#4FC3F7', width: 2.2, head: false });
      maLine(ctx, c, CL12, 0, CLN - 1, a, { color: '#BA68C8', width: 2.2, head: false });
      maLine(ctx, c, CLBU, 0, CLN - 1, a, { color: '#90A4AE', width: 1.6, head: false });
      maLine(ctx, c, CLBD, 0, CLN - 1, a, { color: '#90A4AE', width: 1.6, head: false });
      const R = K.rng(9); for (let k = 0; k < 7; k++) { const y = c.y(98 + R() * 16); K.dash(ctx, c.box.x, y, c.box.x + c.box.w, y, { p: a, color: ['#FF8A65', '#AED581', '#FFF176'][k % 3], width: 1.2 }); }
      const ky = 660, kh = 110, pts = [[], [], []];
      for (let i = 0; i < CLN; i++) { const x = c.x(i); pts[0].push([x, ky + kh / 2 + Math.sin(i * .7) * 40]); pts[1].push([x, ky + kh / 2 + Math.sin(i * .7 - .8) * 36]); pts[2].push([x, ky + kh / 2 + Math.sin(i * .7 + .9) * 46]); }
      poly(ctx, pts[0], a, { color: '#FFD54F', width: 2, blur: 6, head: false }); poly(ctx, pts[1], a, { color: '#4DD0E1', width: 2, blur: 6, head: false }); poly(ctx, pts[2], a, { color: '#F06292', width: 2, blur: 6, head: false });
      K.text(ctx, 'KDJ  MACD  BOLL  MA5  MA12', c.box.x, 790, { font: F.latin(500, 16), color: C.gray, alpha: a, spacing: 2 });
      ctx.restore();
      // the eraser
      if (wx > 180 && wx < 1760) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(wx - 70, 0, wx + 10, 0); g.addColorStop(0, rgba(C.goldHi, 0)); g.addColorStop(1, rgba(C.goldHi, .55)); ctx.fillStyle = g; ctx.fillRect(wx - 70, 200, 80, 620); ctx.restore();
        K.line(ctx, wx, 200, wx, 820, { color: '#FFF3C4', width: 3, glow: 1 }); }
      K.text(ctx, '只留下干净的 K 线', 960, 790, { font: F.serif(900, 22), color: C.goldHi, align: 'center', alpha: S.p(5.0, .8) });
    } },

  /* ================= 0:16.7 LIGHTNING TITLE ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 }, ...BOT, pre: 4.6,
    lines: [{ s: '找出主力砸入巨资的{核心支撑与阻力}', d: 2.8 }, { s: '学会这一招，交易变得{非常简单}', d: 2.9 }],
    visual(ctx, S) {
      const t = S.t, z = .15;
      const R = K.rng(83), pts = []; let x = -60, y = 220, up = 1;
      while (x < 1980) { pts.push([x, y]); x += 70 + R() * 70; y += up * (50 + R() * 80) + 10; up = -up; }
      const bp = clamp((t - z) / .22), fade = clamp(1 - (t - z - .25) / .9);
      if (bp > 0 && fade > 0) { poly(ctx, pts, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false }); poly(ctx, pts, bp, { color: C.goldHi, width: 14, blur: 60, alpha: fade * .35, head: false }); flash(ctx, 960, 360, fade, 1100, C.goldHi); }
      const tp = S.p(z + .35, 1.2, K.expo);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 220, 1920, 150); ctx.clip();
      K.goldText(ctx, '狙击核心区', 960, 340 + (1 - tp) * 120, 58, { spacing: 24, alpha: tp });
      ctx.restore();
      // a crosshair settling on a glowing zone
      const a = S.p(1.3, .8, easeBack), zp = .55 + .45 * Math.sin(t * 3);
      if (a > 0) { ctx.save(); ctx.globalAlpha = .18 * clamp(a) * zp; ctx.fillStyle = Y; ctx.fillRect(660, 520, 600, 90); ctx.restore();
        ctx.save(); ctx.globalAlpha = clamp(a); ctx.strokeStyle = Y; ctx.lineWidth = 2; ctx.shadowColor = Y; ctx.shadowBlur = 16; ctx.strokeRect(660, 520, 600, 90); ctx.restore(); }
      reticle(ctx, 960, 565, S.p(1.8, .6), t, Y);
      tagAt(ctx, 960, 745, '看清主力资金的核心成本区', { alpha: S.p(2.4, .6, easeBack), color: Y, font: F.serif(900, 28) });
    } },

  /* ================= 壹 · THE WHALE'S COST ZONE ================= */
  { id: 'ch1', dur: 3.6, tr: 'sweep', visual: chapter('壹', 1, '主力的核心成本区', "The Whale's Cost Zone", '散户 vs 主力') },

  { id: 'whale', header: H1, dur: 16.8, tr: ['iris', [960, 560]], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '散户买 1 手，价格{纹丝不动}', d: 5.2 }, { s: '主力要买 100 万手，卖盘根本<不够>', d: 5.6 }, { s: '只能在一个价格区间{分批吸筹}', d: 5.4 }],
    visual(ctx, S) {
      const t = S.t;
      // the sell ladder
      const lv = [[106, 8], [105, 6], [104, 9], [103, 7], [102, 5], [101, 6]], lx = 1180, ly = 400, lh = 56;
      const eat = smooth(S.lin(1, 1.2, 2.6)), eaten = eat * lv.length;
      K.text(ctx, '卖盘挂单', lx, ly - 18, { font: F.serif(900, 20), color: C.green, alpha: S.at(0, 0, .6) * (1 - eat) });
      lv.forEach(([p, v], j) => {
        const k = lv.length - 1 - j, gone = clamp(eaten - k), a = S.at(0, j * .08, .5) * (1 - gone), y = ly + j * lh;
        if (a <= .002) return;
        K.text(ctx, String(p.toFixed(2)), lx, y + 34, { font: F.latin(600, 20), color: C.white, alpha: a });
        ctx.save(); ctx.globalAlpha = a * .7; ctx.fillStyle = C.green; ctx.fillRect(lx + 130, y + 14, v * 30, 26); ctx.restore();
        K.text(ctx, `${v} 手`, lx + 150 + v * 30, y + 34, { font: F.serif(700, 18), color: C.gray, alpha: a });
      });
      // the price ticker
      const price = 101 + eat * 5.4 * (S.after(1) ? 1 : 0);
      K.text(ctx, '现价', 860, 420, { font: F.serif(700, 18), color: C.gray, align: 'center', alpha: S.at(0, 0, .6) });
      K.text(ctx, price.toFixed(2), 860, 480, { font: F.latin(700, 40), color: eat > .02 ? C.red : C.white, align: 'center', alpha: S.at(0, 0, .6), glow: eat > .02 ? .8 : 0, glowColor: C.red });
      // the cat
      const cA = S.at(0, .2, .6, easeBack) * (1 - S.at(1, 0, .6));
      cat(ctx, 430, 600, 1.6, cA);
      K.arrow(ctx, 520, 600, 1150, ly + 5 * lh + 26, { p: S.at(0, 1.0, .8), color: '#E8E2D4', width: 2, head: 12, alpha: cA });
      tagAt(ctx, 430, 700, '买 1 手', { alpha: cA, color: C.gray, font: F.serif(900, 22) });
      K.text(ctx, '纹丝不动', 860, 540, { font: F.serif(900, 22), color: C.gray, align: 'center', alpha: S.at(0, 2.2, .5) * (1 - S.at(1, 0, .5)) });
      // the whale
      const wA = S.at(1, .1, .8, easeOut);
      whale(ctx, 470, 610, 1.3, wA, t);
      tagAt(ctx, 470, 740, '主力：要买 100 万手', { alpha: wA, color: Y, font: F.serif(900, 22) });
      if (eat > 0 && eat < 1) for (let k = 0; k < 4; k++) { const u = (t * 2 + k * .25) % 1; ctx.save(); ctx.globalAlpha = (1 - u) * .8; ctx.fillStyle = C.red; ctx.shadowColor = C.red; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(lerp(680, 1180, u), lerp(600, ly + (1 - eat) * 5 * lh, u), 6, 0, 6.28); ctx.fill(); ctx.restore(); }
      tagAt(ctx, 900, 560, '卖单被吃光，价格暴动', { alpha: S.at(1, 3.4, .5) * (1 - S.at(2, 0, .5)), color: C.red, font: F.serif(900, 20) });
      // so it buys in batches inside a band
      const bA = S.at(2, .4, .8);
      if (bA > 0) {
        ctx.save(); ctx.globalAlpha = .16 * bA; ctx.fillStyle = Y; ctx.fillRect(760, 520, 1000, 110); ctx.restore();
        for (let k = 0; k < 8; k++) { const a = S.at(2, .8 + k * .3, .4); const x = 800 + k * 120, y = 575 + Math.sin(k * 1.7) * 30;
          ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.red; ctx.shadowColor = C.red; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.28); ctx.fill(); ctx.restore(); }
        K.text(ctx, '分批吸筹区间', 1760, 664, { font: F.serif(900, 20), color: Y, align: 'right', alpha: bA });
      }
    } },

  { id: 'costzone', header: H1, dur: 17.0, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '建仓完毕，价格[爆发式拉升]', d: 5.4 }, { s: '最初的起涨点，就是{核心支撑位}', d: 5.4 }, { s: '首次跌回，主力必定再次[出手护盘]', d: 5.6 }],
    visual(ctx, S) {
      const c = chCZ, tB = S.beat(2) + 3.6;
      const rv = (CZ_TOP + 1) * smooth(S.lin(0, 0, 4.2)) + (CZ_RET - CZ_TOP) * smooth(S.lin(2, .2, 3.2)) + clamp((S.t - tB) / .5) + 2 * smooth(clamp((S.t - tB - .6) / 1.2));
      const bA = S.at(1, .4, 1.0);
      let zl = Infinity, zh = -Infinity; for (let i = 0; i <= CZ_A; i++) { zl = Math.min(zl, CZK[i].l); zh = Math.max(zh, CZK[i].h); }
      if (bA > 0) { const x0 = c.x(0) - c.step / 2, x1 = c.box.x + c.box.w, y0 = c.y(zh) - 4, y1 = c.y(zl) + 4;
        ctx.save(); ctx.globalAlpha = .16 * bA; ctx.fillStyle = Y; ctx.fillRect(x0, y0, (x1 - x0) * smooth(bA), y1 - y0); ctx.restore();
        ctx.save(); ctx.globalAlpha = bA; ctx.strokeStyle = Y; ctx.lineWidth = 2; ctx.shadowColor = Y; ctx.shadowBlur = 12; ctx.strokeRect(x0, y0, (x1 - x0) * smooth(bA), y1 - y0); ctx.restore();
        K.text(ctx, '主力建仓成本区', x1 - 8, y1 + 30, { font: F.serif(900, 18), color: Y, align: 'right', alpha: bA }); }
      drawChart(ctx, c, rv, { dim: i => i >= 7 && i <= 10 ? 1 : .8 });
      K.text(ctx, '起涨点', c.x(CZ_A), c.y(CZK[CZ_A].l) + 70, { font: F.serif(900, 20), color: Y, align: 'center', alpha: S.at(1, 1.2, .5) });
      const ex = c.x(CZ_RET + 1), ey = c.y(CZK[CZ_RET].l);
      flash(ctx, ex, ey, (S.t >= tB ? 1 : 0) * clamp(1 - (S.t - tB) / 1.2), 360, C.red); ring(ctx, ex, ey, (S.t - tB) / 1.1, Y, 180);
      tagAt(ctx, 1180, c.y(Math.min(...CZK.slice(0, CZ_A + 1).map(k => k.l))) + 34, '首次回踩 · 强烈反弹', { alpha: S.at(2, 4.2, .6, easeBack), color: C.red, font: F.serif(900, 20) });
    } },

  /* ================= 贰 · THREE STEPS ================= */
  { id: 'ch2', dur: 3.6, tr: 'sweep', visual: chapter('贰', 2, '寻找核心区的 3 大步骤', 'Three Steps', '核心支撑 · 核心阻力') },

  { id: 'steps', header: H2, dur: 21.2, tr: ['iris', [960, 560]], camera: { z0: 1.0, z1: 1.03, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '第一步：出现{饱满的大阳线}', d: 5.0 }, { s: '第二步：强势[冲破前高]', d: 5.0 }, { s: '第三步：框出起涨前{最后一根阴线}', d: 5.4 }, { s: '做空反过来：框出暴跌前<最后一根阳线>', d: 5.2 }],
    visual(ctx, S) {
      const bull = 1 - S.at(3, 0, .8), bear = S.at(3, .3, .8);
      if (bull > 0) {
        const c = chS3, n = S3K.length, rv = S3_LAST * smooth(S.lin(0, -.6, 2.2)) + (n - S3_LAST) * smooth(S.lin(0, 1.6, 2.6));
        ctx.save(); ctx.globalAlpha = bull;
        zoneBox(ctx, c, S3_LAST, S.at(2, .6, 1.0), C.red, null);
        K.dash(ctx, c.x(S3p.swings[2].i), c.y(S3_HI), c.box.x + c.box.w, c.y(S3_HI), { p: S.at(1, .2, .8), color: C.gray, width: 1.6 });
        K.text(ctx, '前高', c.x(S3p.swings[2].i) - 10, c.y(S3_HI) + 6, { font: F.serif(900, 18), color: C.gray, align: 'right', alpha: S.at(1, .2, .6) });
        drawChart(ctx, c, rv, { dim: i => i > S3_LAST && i < S3_LAST + 4 ? 1 : .75 });
        [S3_LAST + 1, S3_LAST + 2, S3_LAST + 3].forEach((i, k) => K.marker(ctx, c.x(i), c.y(S3K[i].c) - 16, { alpha: S.at(0, 3.6 + k * .2, .4) * (1 - S.at(1, 0, .5)), r: 9, color: C.red }));
        const tb = S.beat(1) + .6; flash(ctx, c.x(S3_LAST + 2), c.y(S3_HI), (S.t >= tb ? 1 : 0) * clamp(1 - (S.t - tb) / 1.2), 300, C.red); ring(ctx, c.x(S3_LAST + 2), c.y(S3_HI), (S.t - tb) / 1.1, C.red, 150);
        K.arrow(ctx, c.x(S3_LAST + 3), c.y(S3K[S3_LAST + 3].h) - 30, c.x(S3_LAST) + 20, c.y(S3K[S3_LAST].h) - 30, { p: S.at(2, 0, 1.0), color: Y, width: 2.4, head: 14 });
        tagAt(ctx, c.x(S3_LAST), c.y(S3K[S3_LAST].l) + 60, '核心支撑位：大涨前最后一根阴线', { alpha: S.at(2, 1.2, .6, easeBack), color: Y, font: F.serif(900, 20) });
        ctx.restore();
      }
      if (bear > 0) {
        const c = chSB, n = SBK.length, rv = n * smooth(S.lin(3, .3, 2.4));
        ctx.save(); ctx.globalAlpha = bear;
        zoneBox(ctx, c, S3_LAST, S.at(3, 2.4, .8), C.green, null);
        drawChart(ctx, c, rv, { dim: i => i > S3_LAST && i < S3_LAST + 4 ? 1 : .75 });
        tagAt(ctx, c.x(S3_LAST), c.y(SBK[S3_LAST].h) - 60, '核心阻力位：暴跌前最后一根阳线', { alpha: S.at(3, 2.8, .6, easeBack), color: Y, font: F.serif(900, 20) });
        ctx.restore();
      }
    } },

  /* ================= 叁 · THE SNIPER (the 5-minute break lands on the music's return) ================= */
  { id: 'ch3', dur: 3.6, tr: 'sweep', visual: chapter('叁', 3, '多级别联动 · 精准狙击', 'Three Timeframes', '4 小时 · 1 小时 · 5 分钟') },

  { id: 'sniper', header: H3, dur: 26.6, tr: ['iris', [960, 560]], camera: { z0: 1.0, z1: 1.02 }, ...TOP, pre: .6,
    lines: [{ s: '4 小时定方向：大趋势向上，{只做多}', d: 4.8 }, { s: '1 小时画出核心支撑，{耐心等回落}', d: 5.0 }, { s: '5 分钟强拉[冲破微观前高]——进场！', d: 5.6 }, { s: '止损：支撑下方再加 {1 个 ATR}', d: 5.2 }, { s: '止盈看大级别阻力，盈亏比{1:5 以上}', d: 5.4 }],
    visual(ctx, S) {
      const t = S.t, tE = S.beat(2);
      [[ch4H, '4 小时 · 看方向', 0, C.red], [ch1H, '1 小时 · 画核心支撑', 1, Y], [ch5M, '5 分钟 · 精准进场', 2, Y]].forEach(([c, name, j, col]) => {
        const on = j === Math.min(2, Math.max(0, S.line())) ? 1 : .55, a = S.at(Math.min(j, 1), j === 2 ? 3.4 : .1, .6);
        K.text(ctx, name, c.box.x, 400, { font: F.serif(900, 20), color: on > .9 ? col : C.gray, alpha: a });
        ctx.save(); ctx.globalAlpha = a * .25; ctx.strokeStyle = C.gold; ctx.strokeRect(c.box.x - 14, c.box.y - 14, c.box.w + 28, c.box.h + 28); ctx.restore();
      });
      // 4H
      const a4 = S.at(0, .1, .6), r4 = SN4.length * smooth(S.lin(0, .2, 2.6));
      ctx.save(); ctx.globalAlpha = a4 * (S.line() === 0 ? 1 : .6); drawChart(ctx, ch4H, r4, { dim: () => .9 });
      K.arrow(ctx, ch4H.x(2), ch4H.y(SN4[2].l) + 40, ch4H.x(SN4.length - 3), ch4H.y(SN4[SN4.length - 3].h) - 20, { p: S.at(0, 2.6, .8), color: C.red, width: 3, head: 16 }); ctx.restore();
      // 1H
      const a1 = S.at(1, .1, .6), r1 = SN1N * smooth(S.lin(1, .2, 3.2));
      ctx.save(); ctx.globalAlpha = a1 * (S.line() === 1 ? 1 : .7);
      zoneBox(ctx, ch1H, SN1_Z, S.at(1, 2.6, .8), Y, null);
      K.text(ctx, '黄框 = 核心支撑', ch1H.box.x + ch1H.box.w, 400, { font: F.serif(900, 15), color: Y, align: 'right', alpha: S.at(1, 2.8, .6) });
      drawChart(ctx, ch1H, r1, { dim: () => .9 }); ctx.restore();
      // 5m
      const a5 = S.at(1, 3.4, .6), r5 = SN5_B * smooth(S.lin(1, 3.6, 6.2)) + clamp((t - tE) / .45) + 2 * smooth(clamp((t - tE - .8) / 1.4));
      const [sx, sy] = shake(t, tE, 9, 5), c = ch5M;
      ctx.save(); ctx.globalAlpha = a5; ctx.translate(sx, sy);
      K.dash(ctx, c.x(SN5p.swings[3].i), c.y(SN5_HI), c.box.x + c.box.w, c.y(SN5_HI), { p: a5, color: C.gray, width: 1.4 });
      K.text(ctx, '微观前高', c.x(SN5p.swings[3].i) - 8, c.y(SN5_HI) + 6, { font: F.serif(700, 15), color: C.gray, align: 'right' });
      drawChart(ctx, c, r5, { dim: i => i === SN5_B ? 1 : .85 });
      flash(ctx, c.x(SN5_B), c.y(SN5_HI), (t >= tE ? 1 : 0) * clamp(1 - (t - tE) / 1.2), 300, C.red); ring(ctx, c.x(SN5_B), c.y(SN5_HI), (t - tE) / 1.1, Y, 160);
      const ra = S.at(2, .8, .6), ey = c.y(SN5K[SN5_B].o);
      reticle(ctx, c.x(SN5_B), ey, ra, t, Y);
      // stop and target
      const sA = S.at(3, .3, .8), stop = SN5_LO - SN5_ATR;
      K.line(ctx, c.x(SN5_B) - 20, c.y(stop), c.box.x + c.box.w, c.y(stop), { p: sA, color: C.green, width: 2.6, glow: .8 });
      K.text(ctx, '止损（+1 ATR）', c.x(SN5_B) - 56, c.y(stop) + 28, { font: F.serif(900, 16), color: C.green, align: 'right', alpha: sA });
      const tA = S.at(4, .3, .8);
      K.line(ctx, c.x(SN5_B) - 20, c.y(104), c.box.x + c.box.w, c.y(104), { p: tA, color: C.red, width: 2.6, glow: .8 });
      K.text(ctx, '止盈：大级别阻力', c.box.x + c.box.w, c.y(104) - 10, { font: F.serif(900, 16), color: C.red, align: 'right', alpha: tA });
      ctx.restore();
      tagAt(ctx, 960, 860, '风险 1 · 收益 5～7', { alpha: S.at(4, 1.2, .6, easeBack), color: Y, font: F.serif(900, 24) });
    } },

  /* ================= 2:00 THE MINDSET ================= */
  { id: 'calm', header: H4, dur: 16.2, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '真正的成功交易，不需要{时刻盯盘}', d: 5.2 }, { s: '盘前做好计划：{进场 · 止损 · 止盈}', d: 5.2 }, { s: '然后关掉屏幕，{把答案交给市场}', d: 5.2 }],
    visual(ctx, S) {
      const t = S.t, off = smooth(S.lin(2, .6, 1.2));
      // a monitor
      const mx = 960, my = 560, mw = 760, mh = 400;
      ctx.save(); ctx.strokeStyle = C.gold; ctx.lineWidth = 3; ctx.shadowColor = C.gold; ctx.shadowBlur = 14; ctx.globalAlpha = S.at(0, 0, .6);
      ctx.strokeRect(mx - mw / 2, my - mh / 2, mw, mh); ctx.beginPath(); ctx.moveTo(mx - 60, my + mh / 2); ctx.lineTo(mx - 90, my + mh / 2 + 60); ctx.moveTo(mx + 60, my + mh / 2); ctx.lineTo(mx + 90, my + mh / 2 + 60); ctx.moveTo(mx - 140, my + mh / 2 + 60); ctx.lineTo(mx + 140, my + mh / 2 + 60); ctx.stroke(); ctx.restore();
      // jittery anxious tape on screen, then the plan, then off
      ctx.save(); ctx.beginPath(); ctx.rect(mx - mw / 2 + 10, my - mh / 2 + 10, (mw - 20) * (1 - off), mh - 20); ctx.clip();
      const jit = (1 - S.at(1, 0, .6)) * S.at(0, .2, .6);
      if (jit > 0) { const pts = []; for (let i = 0; i <= 80; i++) pts.push([mx - mw / 2 + 20 + i * 9, my + Math.sin(i * .9 + t * 8) * 60 * Math.sin(i * .13 + t) + Math.sin(i * 2.3 - t * 11) * 22]);
        poly(ctx, pts, 1, { color: C.green, width: 2.4, blur: 10, alpha: jit, head: false }); K.text(ctx, '焦虑 · 过度盯盘', mx, my - 140, { font: F.serif(900, 22), color: C.green, align: 'center', alpha: jit }); }
      const pA = S.at(1, .2, .6) * (1 - off);
      [['进场', '核心成本区', Y], ['止损', '支撑下方 + 1 ATR', C.green], ['止盈', '大级别阻力', C.red]].forEach(([a1, a2, col], j) => {
        const a = S.at(1, .3 + j * .4, .5) * pA;
        K.text(ctx, a1, mx - 220, my - 70 + j * 80, { font: F.serif(900, 30), color: col, alpha: a });
        K.text(ctx, a2, mx - 80, my - 70 + j * 80, { font: F.serif(700, 24), color: C.white, alpha: a });
        tick(ctx, mx + 250, my - 80 + j * 80, S.at(1, .6 + j * .4, .5) * pA, 30, col);
      });
      ctx.restore();
      if (off > 0) { const w = (mw - 20) * off; ctx.save(); ctx.fillStyle = '#050506'; ctx.fillRect(mx + mw / 2 - 10 - w, my - mh / 2 + 10, w, mh - 20); ctx.restore();
        if (off > .98) { const p = .4 + .3 * Math.sin(t * 2); ctx.save(); ctx.fillStyle = rgba(C.red, p); ctx.beginPath(); ctx.arc(mx + mw / 2 - 30, my + mh / 2 - 24, 5, 0, 6.28); ctx.fill(); ctx.restore(); } }
    } },

  /* ================= 2:15.6 FINALE — short and fast ================= */
  { id: 'phil', dur: 10.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    visual(ctx, S) {
      const t = S.t;
      ctx.save(); ctx.fillStyle = `rgba(2,2,3,${(.9 * smooth(clamp(t / 1.0))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
      const rows = [['谋局以理，', 420, 1.2, 48], ['抽身以克，', 540, 2.6, 48], ['剩下的，交付时间与概率。', 690, 4.2, 52]];
      rows.forEach(([str, y, t0, sz], j) => {
        const u = smooth(clamp((t - t0) / .55)); if (u <= .002) return;
        const [sx, sy] = shake(t, t0, j === 2 ? 16 : 7, 6);
        ctx.save(); ctx.translate(960 + sx, y - 20 + sy); const s = lerp(1.35, 1, u); ctx.scale(s, s); ctx.translate(-960, -(y - 20));
        ctx.filter = u < 1 ? `blur(${((1 - u) * 9).toFixed(1)}px)` : 'none';
        K.goldText(ctx, str, 960, y, sz, { alpha: u, glow: j === 2 ? 1.2 : .9, spacing: 8 });
        ctx.restore();
        ring(ctx, 960, y - 20, (t - t0) / 1.2, C.goldHi, j === 2 ? 900 : 500);
      });
      if (t > 4.2) K.rule(ctx, 960, 600, 300, S.p(4.4, .8), { alpha: .7 });
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
      K.text(ctx, '狙击核心区', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(.9, .9) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.2, .9) });
    } },
  ],
};
})();

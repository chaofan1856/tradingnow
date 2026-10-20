/* ============================================================
   《盘口密码》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py + sfx.json)

   Clock pinned to the music: the drop at 16.7 s is the lightning title over a rain of red and green
   prints; the quiet section (85.3–103.2 s) stacks the sell side and keeps the tape quiet, and the
   track's return at 103.2 s is the sweep — red block prints flood the tape and the asks vanish.
   Short, fast finale.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const Y = '#FFD34D';                                               // core key / target / entry signal: yellow

const H0 = { label: '破局', sub: '真正的第一手数据', en: 'Read the Tape', zh: '《盘口密码》' };
const H1 = { label: '行为', num: 1, sub: '挂单欺骗 · 冰山与诱饵', en: 'Spoofing & Icebergs', zh: '《拆解庄家行为》' };
const H2 = { label: '行为', num: 2, sub: '主动性进击 · 入场信号', en: 'The Aggressive Sweep', zh: '《拆解庄家行为》' };
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

/* ---------------- the order book (五档) and the tape (逐笔明细) ---------------- */
const LV = ['卖五', '卖四', '卖三', '卖二', '卖一', '买一', '买二', '买三', '买四', '买五'];
/** rows: [[price, vol, alpha?, glow?], …] top→bottom (5 asks then 5 bids) */
function book(ctx, x, y, rows, a, o = {}) {
  if (a <= .002) return;
  const rh = 44, sc = o.scale || .026;
  ctx.save(); ctx.globalAlpha *= a;
  K.text(ctx, '五档盘口', x, y - 20, { font: F.serif(900, 20), color: C.goldHi });
  rows.forEach(([pr, vol, ra = 1, glow = 0], j) => {
    const yy = y + j * rh + (j >= 5 ? 16 : 0), ask = j < 5, col = ask ? C.green : C.red;
    K.text(ctx, LV[j], x, yy + 30, { font: F.serif(700, 17), color: C.gray, alpha: ra });
    K.text(ctx, pr.toFixed(2), x + 92, yy + 30, { font: F.latin(600, 18), color: '#E8E2D4', alpha: ra });
    K.text(ctx, String(Math.round(vol)), x + 300, yy + 30, { font: F.latin(600, 18), color: col, align: 'right', alpha: ra });
    const bw = Math.min(300, vol * sc * 10);
    ctx.save(); ctx.globalAlpha *= ra * (.45 + .5 * glow); ctx.fillStyle = col; if (glow) { ctx.shadowColor = col; ctx.shadowBlur = 24 * glow; } ctx.fillRect(x + 316, yy + 12, bw, 24); ctx.restore();
  });
  K.line(ctx, x, y + 5 * rh + 8, x + 620, y + 5 * rh + 8, { color: C.gold, width: 1, alpha: .5 });
  ctx.restore();
}
const R0 = (k, s) => { const R = K.rng(s * 1000 + k); R(); return R; };
/** one tape print, deterministic by index; big=true → the sweep */
function print(k, big) {
  const R = R0(k, big ? 7 : 3), sec = 10 + k * 2, mm = 30 + Math.floor(sec / 60);
  const vol = big ? 800 + Math.floor(R() * 42) * 100 : 1 + Math.floor(Math.pow(R(), 2.2) * 90), buy = big ? true : R() < .5;
  return { tm: `10:${String(mm).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`, pr: big ? 12.37 + Math.min(.05, k * .002) : 12.35 + (buy ? .01 : 0), vol, buy };
}
/** the tape: n = prints so far (float), kBig = first sweep index */
function tape(ctx, x, y, n, kBig, a) {
  if (a <= .002) return;
  const rh = 46, N = 9, last = Math.floor(n), f = n - last;
  ctx.save(); ctx.globalAlpha *= a;
  K.text(ctx, '逐笔成交明细', x, y - 20, { font: F.serif(900, 20), color: C.goldHi });
  K.text(ctx, '时间', x, y + 18, { font: F.serif(700, 15), color: C.gray }); K.text(ctx, '价格', x + 200, y + 18, { font: F.serif(700, 15), color: C.gray }); K.text(ctx, '手数', x + 480, y + 18, { font: F.serif(700, 15), color: C.gray, align: 'right' });
  ctx.beginPath(); ctx.rect(x - 10, y + 30, 560, N * rh); ctx.clip();
  for (let j = 0; j <= N; j++) {
    const k = last - N + j; if (k < 0) continue;
    const p = print(k, k >= kBig), appear = j === N ? smooth(f * 2) : 1;
    const big = p.vol >= 500, col = p.buy ? C.red : C.green, ry = y + 30 + (j - f) * rh;
    K.text(ctx, p.tm, x, ry + 32, { font: F.latin(500, 16), color: C.gray, alpha: appear });
    K.text(ctx, p.pr.toFixed(2), x + 200, ry + 32, { font: F.latin(600, 18), color: '#E8E2D4', alpha: appear });
    K.text(ctx, `${p.vol}${p.buy ? ' B' : ' S'}`, x + 520, ry + 32, { font: F.latin(big ? 700 : 600, big ? 24 : 18), color: col, align: 'right', alpha: appear, glow: big ? .9 : 0, glowColor: col });
  }
  ctx.restore();
}
/** iceberg: a small tip above the water line, a huge mass below */
function iceberg(ctx, x, y, s, a, t) {
  if (a <= .002) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  K.line(ctx, -200, 0, 200, 0, { color: '#4FC3F7', width: 2, glow: .8, alpha: .8 });
  ctx.fillStyle = 'rgba(232,240,255,.85)'; ctx.beginPath(); ctx.moveTo(-34, 0); ctx.lineTo(-6, -46); ctx.lineTo(10, -30); ctx.lineTo(36, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = rgba(C.red, .28); ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.shadowColor = C.red; ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.moveTo(-36, 2); ctx.lineTo(-150, 90); ctx.lineTo(-110, 200); ctx.lineTo(20, 250); ctx.lineTo(150, 160); ctx.lineTo(140, 60); ctx.lineTo(38, 2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/* ---------------- data ---------------- */
const SP_ROWS = [[12.40, 86], [12.39, 120], [12.38, 10000], [12.37, 64], [12.36, 45], [12.35, 5], [12.34, 38], [12.33, 52], [12.32, 27], [12.31, 40]];
const SW_ROWS = [[12.42, 860], [12.41, 1240], [12.40, 2100], [12.39, 1580], [12.38, 920], [12.37, 30], [12.36, 46], [12.35, 58], [12.34, 41], [12.33, 35]];
const MTp = K.gen.path([12.20, 12.30, 12.26, 12.36, 12.33, 12.37], { per: [4, 3, 4, 3, 5], seed: 901, noise: .3, wick: .35 });
const MTK = [...MTp.candles, ...K.gen.seq(12.37, [[.09, .01, .005], [.07, .01, .01], [.06, .02, .01], [-.02, .01, .01], [.05, .01, .01]])], MT_B = MTp.candles.length;
const chMT = new K.Chart(MTK, { x: 260, y: 390, w: 1400, h: 380 }, { lo: 12.14, hi: 12.66 });

window.FILM = {
  title: '盘口密码',
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
      K.text(ctx, '散户看指标，', 0, 0, { font: F.serif(900, 60), color: mix(C.white, C.gray, S.p(1.3, .6)), align: 'center', alpha: p, spacing: 6 });
      ctx.restore();
      const q = clamp((t - 1.3) / .3), s2 = lerp(2.2, 1, easeOut(q)), [qx, qy] = shake(t, 1.55, 18, 5);
      ctx.save(); ctx.translate(960 + qx, 620 + qy); ctx.scale(s2, s2);
      ctx.filter = q < 1 ? `blur(${((1 - q) * 10).toFixed(1)}px)` : 'none';
      K.goldText(ctx, '主力看盘口。', 0, 0, 64, { alpha: q, glow: 1.2, spacing: 8 });
      ctx.restore();
      flash(ctx, 960, 470, (t > hit ? 1 : 0) * clamp(1 - (t - hit) / .5), 600, '#FFFFFF');
      flash(ctx, 960, 600, (t > 1.55 ? 1 : 0) * clamp(1 - (t - 1.55) / .6), 700, C.goldHi);
    } },

  /* ================= 0:06 INDICATORS SHATTER, TWO WINDOWS LIGHT ================= */
  { id: 'shatter', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.03, z1: 1.0 }, ...BOT, pre: 3.6,
    lines: [{ s: '均线是过去式，K线是{收盘后的结果}', d: 3.4 }, { s: '只有盘口，才是{第一手绝对数据}', d: 3.7 }],
    visual(ctx, S) {
      const t = S.t, br = clamp((t - 2.6) / 1.4), R = K.rng(17);
      if (br < 1) {                                                       // the indicators flash, then shatter
        const N = 26;
        for (let k = 0; k < N; k++) {
          const x0 = 260 + k * 54, kind = k % 3, ang = R() * 6.28, v = 200 + R() * 500, dx = Math.cos(ang) * v * easeOut(br), dy = Math.sin(ang) * v * easeOut(br) + 300 * br * br;
          ctx.save(); ctx.globalAlpha = (1 - br) * clamp(t / .6); ctx.translate(x0 + dx, 420 + dy); ctx.rotate((R() - .5) * 6 * br);
          ctx.strokeStyle = ['#4FC3F7', '#BA68C8', '#FFF176'][kind]; ctx.lineWidth = 3; ctx.shadowColor = ctx.strokeStyle; ctx.shadowBlur = 10;
          ctx.beginPath(); ctx.moveTo(-27, Math.sin(k * .6) * 40); ctx.lineTo(27, Math.sin(k * .6 + .6) * 40); ctx.stroke();
          ctx.fillStyle = k % 2 ? rgba(C.red, .7) : rgba(C.green, .7); ctx.fillRect(-10, 140, 20, -30 - Math.abs(Math.sin(k)) * 60); ctx.restore();
        }
        K.text(ctx, 'MA · MACD · FIB', 960, 330, { font: F.latin(600, 20), color: C.gray, align: 'center', alpha: (1 - br) * clamp(t / .6), spacing: 6 });
        flash(ctx, 960, 480, br > 0 ? clamp(1 - br * 1.5) : 0, 700, '#FFFFFF');
      }
      // two windows of first-hand data
      [['五档', 'ORDER BOOK', 640], ['逐笔成交明细', 'TIME & SALES', 1280]].forEach(([t1, t2, cx], j) => {
        const a = S.p(4.0 + j * .4, .8, easeBack); if (a <= 0) return;
        frame(ctx, cx - 250, 300 + (1 - clamp(a)) * 30, 500, 440, clamp(a), .7, C.gold);
        K.text(ctx, t1, cx, 380 + (1 - clamp(a)) * 30, { font: F.serif(900, 30), color: C.goldHi, align: 'center', alpha: clamp(a) });
        K.text(ctx, t2, cx, 418 + (1 - clamp(a)) * 30, { font: F.latin(500, 15), color: C.gray, align: 'center', alpha: clamp(a), spacing: 4 });
        for (let r = 0; r < 6; r++) { const RR = K.rng(40 + j * 10 + r), w = 60 + RR() * 260, col = j ? (RR() < .5 ? C.red : C.green) : (r < 3 ? C.green : C.red), fl = .5 + .5 * Math.sin(S.t * 6 + r * 1.3 + j);
          ctx.save(); ctx.globalAlpha = clamp(a) * (.4 + .4 * fl); ctx.fillStyle = col; ctx.fillRect(cx - 200, 470 + r * 42 + (1 - clamp(a)) * 30, w, 22); ctx.restore(); }
      });
    } },

  /* ================= 0:16.7 LIGHTNING TITLE ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 }, ...BOT, pre: 4.6,
    lines: [{ s: '庄家能画出完美 K 线，却{藏不住盘口}', d: 2.8 }, { s: '三分钟，看清庄家的{底层逻辑}', d: 2.9 }],
    visual(ctx, S) {
      const t = S.t, z = .15;
      const R = K.rng(93), pts = []; let x = -60, y = 220, up = 1;
      while (x < 1980) { pts.push([x, y]); x += 70 + R() * 70; y += up * (50 + R() * 80) + 10; up = -up; }
      const bp = clamp((t - z) / .22), fade = clamp(1 - (t - z - .25) / .9);
      if (bp > 0 && fade > 0) { poly(ctx, pts, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false }); poly(ctx, pts, bp, { color: C.goldHi, width: 14, blur: 60, alpha: fade * .35, head: false }); flash(ctx, 960, 360, fade, 1100, C.goldHi); }
      const tp = S.p(z + .35, 1.2, K.expo);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 220, 1920, 150); ctx.clip();
      K.goldText(ctx, '盘口密码', 960, 340 + (1 - tp) * 120, 58, { spacing: 28, alpha: tp });
      ctx.restore();
      // a rain of red and green digits
      const dA = S.p(1.2, .8), RR = K.rng(29);
      for (let cI = 0; cI < 11; cI++) { const sp = 30 + RR() * 40, ph = RR() * 40;
        for (let r = 0; r < 8; r++) { const y = 420 + ((t * sp + ph + r * 40) % 320); const RD = K.rng(cI * 100 + Math.floor((t * sp + ph + r * 40) / 320) * 7 + r);
          K.text(ctx, String(Math.floor(RD() * 9000 + 100)), 270 + cI * 140, y, { font: F.latin(600, 16), color: (cI + r) % 2 ? C.red : C.green, alpha: dA * .5 * (1 - (y - 420) / 320) }); } }
      tagAt(ctx, 960, 760, '拆解庄家行为的盘口密码', { alpha: S.p(2.2, .6, easeBack), color: Y, font: F.serif(900, 28) });
    } },

  /* ================= 壹 · SPOOFING AND ICEBERGS ================= */
  { id: 'ch1', dur: 3.6, tr: 'sweep', visual: chapter('壹', 1, '挂单欺骗', 'Spoofing & Icebergs', '庄家的“冰山”与“诱饵”') },

  { id: 'spoof', header: H1, dur: 27.2, tr: ['iris', [960, 560]], camera: { z0: 1.0, z1: 1.02 }, ...TOP, pre: .6,
    lines: [{ s: '卖三突现<10000 手>巨单，压住价格', d: 5.4 }, { s: '散户看到后<恐慌割肉>——这正是诱饵', d: 5.4 }, { s: '价格一靠近，巨单就被{神秘撤单}', d: 5.4 }, { s: '冰山订单：表面 5 手，暗中[成交 500 手]', d: 5.4 }, { s: '铁律：挂出来的巨单，{多为恐吓}', d: 5.0 }],
    visual(ctx, S) {
      const t = S.t, bx = 300, by = 400;
      const eat = smooth(S.lin(2, .3, 1.6)), cancel = smooth(clamp((t - S.beat(2) - 2.2) / .5));
      const rows = SP_ROWS.map(([p, v], j) => {
        if (j === 4) return [p, v * (1 - eat), 1 - eat * .7, 0];
        if (j === 3) return [p, v * (1 - clamp(eat * 2 - 1)), 1 - clamp(eat * 2 - 1) * .7, 0];
        if (j === 2) return [p, v * (1 - cancel), 1, (S.at(0, 1.0, .6)) * (1 - cancel)];
        if (j === 5) return [p, 5, 1, S.at(3, .2, .5)];
        return [p, v, 1, 0];
      });
      book(ctx, bx, by, rows, S.at(0, 0, .6));
      const hy = by + 2 * 44 + 24, hA = S.at(0, 1.4, .5) * (1 - cancel);
      if (hA > 0) { ctx.save(); ctx.globalAlpha = hA; ctx.strokeStyle = Y; ctx.lineWidth = 3; ctx.shadowColor = Y; ctx.shadowBlur = 20; ctx.beginPath(); ctx.ellipse(bx + 476, hy, 166, 32, 0, 0, 6.2832); ctx.stroke(); ctx.restore(); }
      // cancelled: a puff where the wall was
      if (cancel > 0 && cancel < 1) { const R = K.rng(3); for (let k = 0; k < 18; k++) { const ang = R() * 6.28, v = 40 + R() * 160;
        ctx.save(); ctx.globalAlpha = 1 - cancel; ctx.fillStyle = C.green; ctx.beginPath(); ctx.arc(bx + 470 + Math.cos(ang) * v * cancel, hy + Math.sin(ang) * v * cancel * .4, 5, 0, 6.28); ctx.fill(); ctx.restore(); } }
      // right panel: words, panic, iceberg
      const rx = 1150;
      [['压盘吸筹', 0], ['虚假申报', 1]].forEach(([w, j]) => tagAt(ctx, rx + j * 250, 440, w, { side: 'right', alpha: S.at(0, 2.2 + j * .3, .5, easeBack) * (1 - S.at(1, 0, .5)), color: Y, font: F.serif(900, 24) }));
      const pA = S.at(1, .2, .6) * (1 - S.at(2, 0, .5));
      if (pA > 0) { for (let k = 0; k < 7; k++) { const u = ((t - S.beat(1)) * .8 + k / 7) % 1;
          K.text(ctx, `${3 + (k * 7) % 40} S`, lerp(1650, 1200, u), 520 + k * 34, { font: F.latin(600, 18), color: C.green, alpha: pA * (1 - u) }); }
        tagAt(ctx, rx, 470, '散户恐慌割肉', { side: 'right', alpha: pA, color: C.green, font: F.serif(900, 22) }); }
      tagAt(ctx, rx, 470, '撤单！', { side: 'right', alpha: S.at(2, 2.6, .5, easeBack) * (1 - S.at(3, 0, .5)), color: Y, font: F.serif(900, 28) });
      const iA = S.at(3, .2, .8);
      iceberg(ctx, 1450, 560, 1, iA, t);
      K.text(ctx, '表面 5 手', 1520, 540, { font: F.serif(900, 20), color: '#E8F0FF', alpha: iA });
      const filled = Math.round(500 * smooth(S.lin(3, .8, 3.0)));
      K.text(ctx, `实际成交 ${filled} 手`, 1450, 860, { font: F.serif(900, 24), color: C.red, align: 'center', alpha: iA, glow: .7, glowColor: C.red });
      K.text(ctx, `已成交 ${filled}`, bx + 316 + 40, by + 5 * 44 + 16 + 30, { font: F.serif(900, 16), color: C.red, alpha: iA });
      callout(ctx, '【 盘口铁律：真正的单子，在跳动的瞬间才现形 】', 960, 960, S.at(4, .4, .5), S.t - S.beat(4) - .4, { size: 22, color: Y, spacing: 1 });
    } },

  /* ================= 贰 · THE SWEEP (quiet section → the tape floods red on the return) ================= */
  { id: 'ch2', dur: 3.6, tr: 'sweep', visual: chapter('贰', 2, '主动性进击', 'The Aggressive Sweep', '主力真正的入场信号') },

  { id: 'market', header: H2, dur: 22.2, tr: ['iris', [960, 560]], camera: { z0: 1.0, z1: 1.02 }, ...TOP, pre: .6,
    lines: [{ s: '庄家发动行情，绝不坐等别人卖给他', d: 5.6 }, { s: '他用{市价单}开启掠夺模式', d: 5.0 }, { s: '盯住逐笔明细：价格来到{关键位置}', d: 5.4 }, { s: '卖盘层层堆积，盘面<异常安静>……', d: 5.6 }],
    visual(ctx, S) {
      const t = S.t;
      // limit vs market
      const cA = S.at(0, .2, .6) * (1 - S.at(2, 0, .6));
      if (cA > 0) {
        frame(ctx, 300, 430, 600, 300, cA, .2, C.gray);
        K.text(ctx, '限价单', 600, 520, { font: F.serif(900, 34), color: C.gray, align: 'center', alpha: cA });
        K.text(ctx, '挂着等，别人卖给我', 600, 590, { font: F.serif(700, 22), color: C.gray, align: 'center', alpha: cA });
        const mA = S.at(1, .2, .6, easeBack) * cA;
        frame(ctx, 1020, 430, 600, 300, mA, .9, C.red);
        K.text(ctx, '市价单', 1320, 520, { font: F.serif(900, 38), color: C.red, align: 'center', alpha: mA, glow: .7, glowColor: C.red });
        K.text(ctx, '主动吃掉卖盘，不计成本', 1320, 590, { font: F.serif(700, 22), color: C.white, align: 'center', alpha: mA });
        K.arrow(ctx, 1150, 650, 1500, 650, { p: S.at(1, 1.0, .8), color: C.red, width: 4, head: 18, alpha: mA });
      }
      // the key level, the book stacking up, the tape going quiet
      const kA = S.at(2, .2, .8);
      if (kA > 0) {
        const n = 6 + (t - S.beat(2)) * 2.4 * (1 - .7 * S.at(3, 0, 1.0));
        book(ctx, 300, 400, SW_ROWS.map(([p, v], j) => [p, j < 5 ? v * smooth(S.lin(3, j * .3, 1.2)) + (j < 5 ? 40 : 0) : v, 1, 0]), kA, { scale: .012 });
        tape(ctx, 1110, 400, n, 1e9, kA);
        K.dash(ctx, 300, 400 + 4 * 44 + 42, 920, 400 + 4 * 44 + 42, { p: S.at(2, 1.0, .8), color: Y, width: 2 });
        K.text(ctx, '关键位置', 935, 400 + 4 * 44 + 48, { font: F.serif(900, 18), color: Y, alpha: S.at(2, 1.4, .5) });
      }
    } },

  { id: 'sweep', header: H2, dur: 30.6, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .6,
    lines: [{ s: '一笔、两笔……{大单}开始出现', d: 6.2 }, { s: '买盘悄悄{逼近}阻力', d: 6.4 }, { s: '……蓄势到极限', d: 6.4 }, { s: '[红色大单连续刷屏]——卖盘瞬间清空！', d: 5.6 }, { s: '这就是主力亮剑的{极限入场信号}', d: 5.4 }],
    visual(ctx, S) {
      const t = S.t, tE = S.beat(3), pre = Math.min(t, tE), kBig = Math.floor(8 + tE * 1.1);
      const n = 8 + pre * 1.1 + (t > tE ? (t - tE) * 14 * (1 - .6 * S.at(4, 0, 1.5)) : 0);
      const [sx, sy] = shake(t, tE, 12, 5);
      ctx.save(); ctx.translate(sx, sy);
      const wipe = clamp((t - tE) / .7), dim = 1 - .25 * S.at(2, 0, 1.0) * (1 - wipe);
      ctx.save(); ctx.globalAlpha = dim;
      book(ctx, 300, 400, SW_ROWS.map(([p, v], j) => {
        if (j >= 5) return [p + (S.after(1) ? .01 * smooth(S.lin(1, .4, 3)) : 0), v * (1 + 2 * smooth(S.lin(1, .4, 3))), 1, S.at(1, .4, 1)];
        const gone = clamp(wipe * 5 - (4 - j)); return [p, (v + 40) * (1 - gone), 1 - .7 * gone, 0];
      }), 1, { scale: .012 });
      // a few big prints sprinkled in the build-up
      tape(ctx, 1110, 400, n, kBig, 1);
      ctx.restore();
      const pulse = S.after(2) && t < tE ? .5 + .5 * Math.sin(t * 7) : 0;
      if (pulse) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .12 * pulse; ctx.fillStyle = Y; ctx.fillRect(296, 400 + 4 * 44, 630, 44); ctx.restore(); }
      flash(ctx, 610, 480, (t >= tE ? 1 : 0) * clamp(1 - (t - tE) / 1.2), 600, C.red);
      flash(ctx, 1380, 600, (t >= tE ? 1 : 0) * clamp(1 - (t - tE) / 1.2), 500, Y);
      ctx.restore();
      tagAt(ctx, 610, 945, '主动性通吃', { alpha: S.at(3, 1.0, .6, easeBack), color: Y, font: F.serif(900, 26) });
      tagAt(ctx, 1380, 945, '趋势向上', { alpha: S.at(3, 1.4, .6, easeBack), color: C.red, font: F.serif(900, 26) });
      reticle(ctx, 1730, 640, S.at(4, .4, .6), t, Y);
    } },

  { id: 'mean', header: H2, dur: 11.6, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '他不在乎几分钱价差，他要的是{绝对筹码}', d: 5.4 }, { s: '毫秒内倾泻的[买方力量]，就是狙击时机', d: 5.6 }],
    visual(ctx, S) {
      const c = chMT, rv = MT_B * smooth(S.lin(0, -.6, 2.0)) + (MTK.length - MT_B) * smooth(S.lin(0, 1.6, 2.4));
      K.dash(ctx, c.box.x, c.y(12.38), c.box.x + c.box.w, c.y(12.38), { p: S.at(0, 0, .8), color: C.green, width: 1.6 });
      K.text(ctx, '卖盘阻力 12.38（已被通吃）', c.box.x + 10, c.y(12.38) + 30, { font: F.serif(900, 18), color: C.green, alpha: S.at(0, .4, .6) });
      drawChart(ctx, c, rv, { dim: i => i === MT_B ? 1 : .85 });
      const ex = c.x(MT_B), eC = c.y(MTK[MT_B].c);
      reticle(ctx, ex, eC, S.at(1, .4, .6), S.t, Y);
      tagAt(ctx, ex - 50, eC - 4, '狙击时机', { side: 'left', alpha: S.at(1, .8, .6, easeBack), color: Y, font: F.serif(900, 22) });
    } },

  /* ================= 2:05.8 FINALE — the numbers slow, short and fast ================= */
  { id: 'phil', dur: 10.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    visual(ctx, S) {
      const t = S.t, slow = Math.exp(-t * 1.2), RR = K.rng(57), fa = clamp(1 - t / 1.8);
      if (fa > 0) for (let cI = 0; cI < 13; cI++) { const sp = 120 + RR() * 200, ph = RR() * 46;
        for (let r = 0; r < 20; r++) { const y = 140 + ((ph + r * 46 + (1 - slow) / 1.2 * sp) % 920);
          K.text(ctx, String(1000 + ((cI * 37 + r * 91) % 8999)), 140 + cI * 135, y, { font: F.latin(600, 18), color: (cI + r) % 2 ? C.red : C.green, alpha: fa * .6 }); } }
      ctx.save(); ctx.fillStyle = `rgba(2,2,3,${(.92 * smooth(clamp((t - .4) / 1.2))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
      const rows = [['盘口数字，每毫秒都在生灭跳动。', 380, 1.4, 34], ['从散乱的数字中，看到庄家的意图，', 480, 2.6, 34], ['在红绿共振、信号激发的瞬间——', 580, 3.8, 34], ['顺势而为。', 740, 5.2, 64]];
      rows.forEach(([str, y, t0, sz], j) => {
        const u = smooth(clamp((t - t0) / .5)); if (u <= .002) return;
        const [sx, sy] = shake(t, t0, j === 3 ? 18 : 5, 6);
        ctx.save(); ctx.translate(960 + sx, y - 20 + sy); const s = lerp(1.3, 1, u); ctx.scale(s, s); ctx.translate(-960, -(y - 20));
        ctx.filter = u < 1 ? `blur(${((1 - u) * 9).toFixed(1)}px)` : 'none';
        K.goldText(ctx, str, 960, y, sz, { alpha: u, glow: j === 3 ? 1.3 : .9, spacing: j === 3 ? 20 : 3 });
        ctx.restore();
      });
      ring(ctx, 960, 720, (t - 5.2) / 1.2, C.goldHi, 900);
      if (t > 5.2) K.rule(ctx, 960, 650, 300, S.p(5.4, .8), { alpha: .7 });
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
      K.text(ctx, '盘口密码', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(.9, .9) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.2, .9) });
    } },
  ],
};
})();

/* ============================================================
   《均线策略（一）》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py + sfx.json)

   Clock pinned to the music: the drop at 16.7 s is the lightning title, the quiet
   section (85.3–103.2 s) is the flat, directionless "meat grinder", and the
   track's return at 103.2 s opens chapter 叁 — the volume breakout.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };
const Y = '#FFD34D';                                               // core hint / target: yellow

const H0 = { label: '引入', sub: '均线的本质是多空共识', en: 'The Moving Average', zh: '《均线策略 · 一》' };
const H1 = { label: '法则', num: 1, sub: '趋势共振 · 动态支撑阻力', en: 'Trend Confluence', zh: '《三大实战策略》' };
const H2 = { label: '法则', num: 2, sub: '市场均衡 · 避战陷阱', en: 'Market Equilibrium', zh: '《三大实战策略》' };
const H3 = { label: '法则', num: 3, sub: '动能突破 · 主力引爆点', en: 'Momentum Breakout', zh: '《三大实战策略》' };
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
    ctx.save(); ctx.globalAlpha *= (hot ? .95 : .55) * easeOut(g); ctx.fillStyle = col;
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

/* ---------------- data ---------------- */
// the wrong way: a sideways-ish drift where price keeps slicing through the line
const WRp = K.gen.path([110, 114, 108, 113.5, 107.5, 112, 108.5, 113, 109], { per: [3, 3, 3, 3, 3, 3, 3, 3], seed: 151, noise: .6, wick: .7 });
const WRK = WRp.candles, WRMA = sma(WRK, 6);
const chWR = new K.Chart(WRK, { x: 260, y: 380, w: 1400, h: 400 }, { lo: 104, hi: 117 });

// the right way: a clean uptrend, pullbacks to the MA, then a bull flag right on it and the breakout
const RTp = K.gen.path([100, 109, 105.6, 114, 110.2, 119.5, 116.2, 117.2, 115.6, 116.4, 115.2], { per: [5, 3, 4, 3, 5, 2, 1, 2, 1, 2], seed: 161, noise: .35, wick: .4 });
const RTK = [...RTp.candles, ...K.gen.seq(115.2, [[6.2, .5, .3], [1.6, .5, .4], [-.7, .4, .5], [2.0, .5, .3]])];
const RT_BRK = RTp.candles.length;
const RT_PB = [RTp.swings[1], RTp.swings[3]];                              // the two pullbacks that test the line
const RTMA = (() => {                                                        // MA (示意): passes just under each pullback low
  const anchors = [[0, 97.6], [RT_PB[0].i, RT_PB[0].price - .25], [RT_PB[1].i, RT_PB[1].price - .25], [RT_BRK - 1, 112.6], [RTK.length - 1, 116.4]];
  return RTK.map((_, i) => { let j = 0; while (j < anchors.length - 2 && i > anchors[j + 1][0]) j++; const [i0, p0] = anchors[j], [i1, p1] = anchors[j + 1]; return lerp(p0, p1, smooth((i - i0) / (i1 - i0))); });
})();
const chRT = new K.Chart(RTK, { x: 260, y: 370, w: 1400, h: 430 }, { lo: 96, hi: 126 });
const RT_FL = { up: i => 120.0 - (i - RTp.swings[4].i) * .32, lo: i => 116.4 - (i - RTp.swings[4].i) * .32 };

// equilibrium: a flat line and a twisted rope of candles around it
const EQp = K.gen.path([110, 113, 107.5, 112.6, 108, 113.2, 107.6, 112.4, 108.4, 112.8, 107.8, 111], { per: [2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2], seed: 171, noise: .8, wick: .8 });
const EQK = EQp.candles, EQMA = sma(EQK, 8);
const chEQ = new K.Chart(EQK, { x: 260, y: 380, w: 1400, h: 400 }, { lo: 104, hi: 116 });

// the volume breakdown: a calm line, then the gap and the full-bodied bear bar on a volume explosion
const BKp = K.gen.path([112, 113, 111.4, 112.8, 111.6, 112.6, 111.8, 112.2], { per: [2, 2, 2, 2, 2, 2, 2], seed: 181, noise: .3, wick: .3 });
const BKK = [...BKp.candles, { o: 110.6, c: 103.4, h: 110.9, l: 102.8 }, ...K.gen.seq(103.4, [[-1.2, .3, .5], [.6, .5, .4], [-1.6, .3, .5]])];
const BK_B = BKp.candles.length, BKMA = sma(BKK, 8);
const chBK = new K.Chart(BKK, { x: 260, y: 370, w: 1400, h: 380 }, { lo: 100, hi: 116 });
const BKV = [30, 28, 32, 26, 30, 28, 24, 26, 30, 28, 26, 22, 24, 26, 100, 64, 48, 56];
// true vs false break, side by side
const TB = { o: 108.2, c: 103.6, h: 108.5, l: 103.1 }, FB = { o: 111.2, c: 110.2, h: 111.5, l: 104.0 };

window.FILM = {
  title: '均线策略（一）',
  transition: 1.2,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },
  scenes: [

  /* ================= 0:00 HOOK — the brakes ================= */
  { id: 'hook', dur: 6.0, camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, cx = 960, cy = 480, hit = .3;
      // skid marks streak across under the question
      const sk = smooth(clamp((t - hit) / .8));
      for (let k = 0; k < 2; k++) { const y = 700 + k * 40; ctx.save(); ctx.globalAlpha = .35 * sk * (1 - smooth(clamp((t - 3.5) / 2))); const g = ctx.createLinearGradient(0, 0, 1920, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba(C.gray, .9)); ctx.strokeStyle = g; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(1920, y); ctx.lineTo(1920 - 1600 * sk, y + 8 * Math.sin(k)); ctx.stroke(); ctx.restore(); }
      const [sx, sy] = shake(t, hit, 22, 3.6);
      const p = clamp((t - .05) / .3), s = lerp(2.2, 1, easeOut(p));
      ctx.save(); ctx.translate(cx + sx, cy + sy); ctx.scale(s, s);
      ctx.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '为什么你跟着金叉买，', 0, -24, { font: F.serif(900, 52), color: C.white, align: 'center', alpha: p, glow: .5, glowColor: C.gold, spacing: 3 });
      K.text(ctx, '却总是买在天花板？', 0, 76, { font: F.serif(900, 52), color: C.white, align: 'center', alpha: p, glow: .65, glowColor: C.green, spacing: 3 });
      ctx.restore();
      flash(ctx, cx, cy, (t > hit ? 1 : 0) * clamp(1 - (t - hit) / .7), 700, '#FFFFFF');
      K.text(ctx, 'BUYING THE TOP — AGAIN ?', cx, 640, { font: F.latin(500, 20), color: C.gray, align: 'center', spacing: 10, alpha: S.p(1.8, 1.2) });
    } },

  /* ================= 0:06 NOISE → THE LINE ================= */
  { id: 'filter', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.03, z1: 1.0 }, ...BOT, pre: 3.2,
    lines: [{ s: '指标不是魔法：均线是市场的{平均成本}', d: 3.6 }, { s: '平滑波动的过滤器，多空的{“心理共识线”}', d: 3.6 }],
    visual(ctx, S) {
      const R = K.rng(51), N = 46, x0 = 200, x1 = 1720, mid = i => 580 - Math.sin(i / N * 3.4) * 80 - i * 1.2;
      const filt = smooth(clamp((S.t - 2.6) / 2.4));
      const pts = [];
      for (let i = 0; i < N; i++) {
        const x = lerp(x0, x1, i / (N - 1)), m = mid(i), jump = (R() - .5) * 260, body = 30 + R() * 110, up = R() > .5;
        const o = m + jump * (1 - .55 * filt), c = o + (up ? -body : body) * (1 - .4 * filt), hi = Math.min(o, c) - R() * 60, lo = Math.max(o, c) + R() * 60;
        const a = clamp(S.p(.1 + i * .03, .4)) * (1 - .55 * filt), col = up ? C.red : C.green, jig = Math.sin(S.t * 9 + i) * 6 * (1 - filt);
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, hi + jig); ctx.lineTo(x, lo + jig); ctx.stroke(); ctx.fillRect(x - 9, Math.min(o, c) + jig, 18, Math.abs(c - o)); ctx.restore();
        pts.push([x, m]);
      }
      poly(ctx, pts, smooth(clamp((S.t - 2.2) / 2.4)), { color: C.goldHi, width: 6, blur: 30 });
      K.text(ctx, '均线 · 过滤杂讯', x1 - 40, mid(N - 1) - 40, { font: F.serif(900, 24), color: C.goldHi, align: 'right', alpha: S.p(4.4, .8), glow: .6 });
    } },

  /* ================= 0:16.7 LIGHTNING TITLE + THE FORMULA ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 }, ...BOT, pre: 6.2,
    lines: [{ s: '2分钟，解锁均线最高频的{3大实战策略}！', d: 3.8 }],
    visual(ctx, S) {
      const t = S.t, z = .15;
      const R = K.rng(33), pts = []; let x = -60, y = 260, up = 1;
      while (x < 1980) { pts.push([x, y]); x += 70 + R() * 70; y += up * (50 + R() * 80) + 10; up = -up; }
      const bp = clamp((t - z) / .22), fade = clamp(1 - (t - z - .25) / .9);
      if (bp > 0 && fade > 0) {
        poly(ctx, pts, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false });
        poly(ctx, pts, bp, { color: C.goldHi, width: 14, blur: 60, alpha: fade * .35, head: false });
        flash(ctx, 960, 400, fade, 1100, C.goldHi);
      }
      const tp = S.p(z + .35, 1.2, K.expo);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 250, 1920, 160); ctx.clip();
      K.goldText(ctx, '均线策略（一）', 960, 370 + (1 - tp) * 120, 58, { spacing: 14, alpha: tp });
      ctx.restore();
      K.rule(ctx, 960, 430, 360, S.p(1.0, 1.2));
      // the formula: twenty closes slide in, are summed, and divided
      const fa = S.p(1.8, .9);
      K.text(ctx, 'SMA 20  =  最近 20 根K线收盘价之和  ÷  20', 960, 506, { font: F.serif(900, 28), color: C.white, align: 'center', alpha: fa, spacing: 2 });
      const R2 = K.rng(8), bars = [];
      for (let i = 0; i < 20; i++) bars.push(40 + R2() * 70);
      const avg = bars.reduce((a, b) => a + b, 0) / 20, bx0 = 960 - 19 * 22, base = 720;
      bars.forEach((h, i) => {
        const u = smooth(clamp((t - 2.4 - i * .06) / .6)), x = bx0 + i * 44;
        ctx.save(); ctx.globalAlpha = u * .85; ctx.fillStyle = i % 3 ? C.red : C.green; ctx.fillRect(x - 12, base - h * u, 24, h * u); ctx.restore();
      });
      const av = smooth(clamp((t - 4.2) / 1.0));
      K.line(ctx, bx0 - 30, base - avg, lerp(bx0 - 30, bx0 + 19 * 44 + 30, av), base - avg, { color: Y, width: 3, glow: 1 });
      K.text(ctx, '平均成本', bx0 + 19 * 44 + 44, base - avg + 8, { font: F.serif(900, 22), color: Y, alpha: av });
    } },

  /* ================= 壹 · TREND CONFLUENCE ================= */
  { id: 'ch1', dur: 3.6, tr: 'sweep', visual: chapter('壹', 1, '动态支撑与阻力', 'Dynamic Support & Resistance', '趋势共振 · 拒绝单一使用') },

  { id: 'wrong', header: H1, dur: 12.0, tr: ['iris', [960, 580]], camera: { z0: 1.0, z1: 1.04 }, ...TOP, pre: .6,
    lines: [{ s: '错误示范：{单用均线}，频繁止损', d: 4.6 }, { s: '价格反复穿插均线——<买了就跌，卖了就涨>', d: 6.4 }],
    visual(ctx, S) {
      const c = chWR, rv = WRK.length * smooth(S.lin(0, 0, 5.4));
      K.baseline(ctx, c.box.x, c.box.x + c.box.w, c.box.y + c.box.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .5 });
      drawChart(ctx, c, rv, { dim: () => .85 });
      maLine(ctx, c, WRMA, 0, WRK.length - 1, smooth(S.lin(0, .2, 5.4)), { label: 'MA' });
      // every cross = a stop-out
      let n = 0;
      for (let i = 1; i < WRK.length; i++) {
        const cr = (WRK[i - 1].c - WRMA[i - 1]) * (WRK[i].c - WRMA[i]) < 0; if (!cr) continue;
        const a = S.at(1, .2 + n * .35, .4, easeBack) * (rv > i ? 1 : 0); n++;
        K.text(ctx, '止损', c.x(i), c.y(WRK[i].l) + 44, { font: F.serif(900, 18), color: C.green, align: 'center', alpha: clamp(a) });
      }
      bigX(ctx, 960, 590, clamp((S.t - S.beat(1) - 3.4) / .35), 260);
    } },

  { id: 'right', header: H1, dur: 25.2, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05, x1: -20, y1: 6 }, ...TOP, pre: .6,
    lines: [{ s: '正确示范：{多头趋势}，低点不断抬高', d: 4.8 }, { s: '每次回调触及均线——[立刻反弹]', d: 4.6 }, { s: '回踩均线处停顿，走出{上升旗形}', d: 4.8 }, { s: '[大阳线]突破旗形：{共振入场点}', d: 4.6 }, { s: '触及均线 + 形态突破 = {高胜率猎杀时刻}', d: 5.2 }],
    visual(ctx, S) {
      const c = chRT, tB = S.beat(3) + .4;
      const r0 = RT_BRK * smooth(S.lin(0, 0, 13.6)), r1 = clamp((S.t - tB) / .55), r2 = (RTK.length - RT_BRK - 1) * smooth(clamp((S.t - tB - 1.4) / 3));
      const rv = r0 + (r0 >= RT_BRK ? r1 : 0) + (r1 >= 1 ? r2 : 0);
      const [sx, sy] = shake(S.t, tB, 6, 6);
      ctx.save(); ctx.translate(sx, sy);
      K.baseline(ctx, c.box.x, c.box.x + c.box.w, c.box.y + c.box.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .5 });
      maLine(ctx, c, RTMA, 0, RTK.length - 1, Math.min(rv / RTK.length + .04, 1), { label: 'MA20', head: false });
      // flag on the line
      const fa = S.at(2, .6, 1.2), fi0 = RTp.swings[4].i - .3, fi1 = RT_BRK - .2;
      if (fa > 0) band(ctx, c, RT_FL.up, RT_FL.lo, fi0, fi1, fa);
      drawChart(ctx, c, rv, { dim: () => .86 });
      // the two tests of the line: red rebound arrows
      RT_PB.forEach((sw, j) => {
        const a = S.at(1, .3 + j * .9, .6) * (rv > sw.i + 1 ? 1 : 0), x = c.x(sw.i), y = c.y(sw.price);
        K.arrow(ctx, x, y + 60, x, y + 12, { p: a, color: C.red, width: 5, head: 20, alpha: a });
        ring(ctx, x, y, a > 0 ? (S.t - S.beat(1) - .3 - j * .9) / 1 : 0, C.red, 80);
        K.text(ctx, '反弹', x, y + 96, { font: F.serif(900, 20), color: C.red, align: 'center', alpha: a });
      });
      callout(ctx, '上升旗形', c.x((fi0 + fi1) / 2), c.y(RT_FL.up((fi0 + fi1) / 2)) - 40, fa * (1 - S.at(3, 0, .5)), S.t - S.beat(2) - .6, { size: 24 });
      const bx = c.x(RT_BRK), bc = c.y(RTK[RT_BRK].c);
      flash(ctx, bx, c.y(RT_FL.up(RT_BRK)), (S.t > tB ? 1 : 0) * clamp(1 - (S.t - tB) / 1.3), 400, C.red);
      ring(ctx, bx, c.y(RT_FL.up(RT_BRK)), (S.t - tB) / 1.1, Y, 240);
      const ra = S.at(3, 1.5, .7);
      reticle(ctx, bx, bc, ra, S.t, Y);
      tagAt(ctx, bx - 52, bc - 4, '共振入场点', { side: 'left', alpha: ra, color: Y, font: F.serif(900, 24) });
      ctx.restore();
    } },

  /* ================= 贰 · EQUILIBRIUM (the quiet section) ================= */
  { id: 'ch2', dur: 3.6, tr: 'sweep', visual: chapter('贰', 2, '市场均衡', 'Market Equilibrium', '避战陷阱 · 看懂什么时候不交易') },

  { id: 'equil', header: H2, dur: 31.8, tr: ['iris', [960, 580]], camera: { z0: 1.0, z1: 1.04, x1: -12 }, ...TOP, pre: .6,
    lines: [{ s: '当均线{彻底走平}，价格化身<“绞肉机”>', d: 6.0 }, { s: '买卖力量均等——{市场均衡 / 多空分歧}', d: 7.4 }, { s: '均线{丧失支撑阻力}：趋势交易者立刻离场', d: 7.4 }, { s: '看懂{什么时候不交易}，比交易更重要！', d: 9.8 }],
    visual(ctx, S) {
      const c = chEQ, rv = EQK.length * smooth(S.lin(0, 0, 7.5));
      K.baseline(ctx, c.box.x, c.box.x + c.box.w, c.box.y + c.box.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .5 });
      // range boundaries: resistance and support
      const bA = S.at(2, .8, 1.4);
      K.dash(ctx, c.box.x, c.y(113.4), c.box.x + c.box.w, c.y(113.4), { p: bA, color: C.green, width: 2.2 });
      K.dash(ctx, c.box.x, c.y(107.2), c.box.x + c.box.w, c.y(107.2), { p: bA, color: C.red, width: 2.2 });
      K.text(ctx, '阻力位 · 高抛', c.box.x + c.box.w, c.y(113.4) - 14, { font: F.serif(900, 20), color: C.green, align: 'right', alpha: bA });
      K.text(ctx, '支撑位 · 低吸', c.box.x + c.box.w, c.y(107.2) + 34, { font: F.serif(900, 20), color: C.red, align: 'right', alpha: bA });
      drawChart(ctx, c, rv, { dim: () => .8 });
      maLine(ctx, c, EQMA, 2, EQK.length - 1, smooth(S.lin(0, .3, 7.2)), { label: 'MA', color: C.gray });
      // the yellow "!" — equilibrium
      const ea = S.at(1, .2, .6, easeBack) * (1 - S.at(2, 0, .6));
      if (ea > 0) {
        ctx.save(); ctx.globalAlpha = clamp(ea) * .92; ctx.fillStyle = 'rgba(6,5,4,.8)'; ctx.beginPath(); ctx.roundRect(560, 470, 800, 230, 18); ctx.fill(); ctx.strokeStyle = Y; ctx.lineWidth = 2; ctx.shadowColor = Y; ctx.shadowBlur = 26; ctx.stroke(); ctx.restore();
        ctx.save(); ctx.translate(680, 585); const s = lerp(1.6, 1, easeOut(clamp(ea))); ctx.scale(s, s);
        K.text(ctx, '!', 0, 46, { font: F.latin(500, 80), color: Y, align: 'center', alpha: clamp(ea), glow: 1, glowColor: Y }); ctx.restore();
        K.text(ctx, '市场均衡状态', 1000, 572, { font: F.serif(900, 34), color: Y, align: 'center', alpha: clamp(ea), glow: .7, glowColor: Y });
        K.text(ctx, '多空资金分歧 · 方向缺失', 1000, 634, { font: F.serif(700, 22), color: C.white, align: 'center', alpha: clamp(ea) });
      }
      bigX(ctx, 960, 580, S.at(2, .2, .35) * (1 - S.at(3, 0, .6)), 230);
      tagAt(ctx, 960, 760, '趋势交易者离场：高抛低吸，或观望', { alpha: S.at(2, 1.6, .6), color: Y, font: F.serif(900, 22) });
    } },

  /* ================= 叁 · MOMENTUM BREAKOUT (music returns) ================= */
  { id: 'ch3', dur: 3.6, tr: 'sweep', visual: chapter('叁', 3, '动能突破', 'Momentum Breakout', '主力引爆点 · 实体 + 成交量') },

  { id: 'brk', header: H3, dur: 34.0, tr: ['iris', [960, 580]], camera: { z0: 1.0, z1: 1.04 }, ...TOP, pre: .6,
    lines: [{ s: '利空来袭：<巨型大阴线>跳空砸穿均线', d: 6.4 }, { s: '成交量{瞬间暴涨}——主力资金重仓推动', d: 6.6 }, { s: '左：实体完全收在线下——[真突破]', d: 6.2 }, { s: '右：长下影收回线上——<假跌破>', d: 6.2 }, { s: '实体收在均线之外：平衡打破，{顺势介入}', d: 7.4 }],
    visual(ctx, S) {
      const c = chBK, tB = S.beat(0) + 2.2, cmp = S.at(2, 0, 1.0, easeInOut);
      const r0 = BK_B * smooth(S.lin(0, 0, 2.2)), r1 = clamp((S.t - tB) / .45), r2 = 3 * smooth(clamp((S.t - tB - .8) / 2.4));
      const rv = r0 + (r0 >= BK_B ? r1 : 0) + (r1 >= 1 ? r2 : 0);
      const [sx, sy] = shake(S.t, tB, 9, 5);
      // stage 1: the real chart (fades out when the comparison takes over)
      if (cmp < .999) {
      ctx.save(); ctx.globalAlpha = 1 - cmp; ctx.translate(sx, sy);
      K.baseline(ctx, c.box.x, c.box.x + c.box.w, c.box.y + c.box.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .5 });
      volume(ctx, c, BKV, rv, 790, 100, { hot: BK_B, base: S.at(0, .2, 1) });
      drawChart(ctx, c, rv, { dim: i => i === BK_B ? 1 : .82 });
      maLine(ctx, c, BKMA, 1, BKK.length - 1, Math.min(rv / BKK.length + .05, 1), { label: 'MA', head: false });
      const bx = c.x(BK_B);
      flash(ctx, bx, c.y(BKMA[BK_B]), (S.t > tB ? 1 : 0) * clamp(1 - (S.t - tB) / 1.3), 420, C.green);
      ring(ctx, bx, c.y(BKMA[BK_B]), (S.t - tB) / 1.1, Y, 240);
      tagAt(ctx, bx + 44, c.y(BKK[BK_B].c) + 4, '实体完全收在均线下', { side: 'right', alpha: S.at(0, 3.4, .6) * (1 - cmp), color: C.green, font: F.serif(900, 22) });
      const vt = S.t - S.beat(1) - .3;
      sparks(ctx, bx, 790, vt / 1.2, 36);
      tagAt(ctx, bx + 44, 800, '主力资金重仓推动', { side: 'right', alpha: S.at(1, .6, .6) * (1 - cmp), color: Y, font: F.serif(900, 22) });
      ctx.restore();
      }
      // stage 2: true break vs false break
      if (cmp > 0) {
        const panel = (x, k, ok, lab, sub, line) => {
          const a = cmp * S.at(line, 0, .7), maY = 560, yOf = p => maY - (p - 109) * 26;
          ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(255,255,255,.025)'; ctx.strokeStyle = rgba(ok ? C.red : C.green, .6); ctx.lineWidth = 1.4;
          ctx.beginPath(); ctx.roundRect(x - 330, 350, 660, 470, 16); ctx.fill(); ctx.stroke(); ctx.restore();
          K.line(ctx, x - 280, maY, x + 280, maY, { color: C.goldHi, width: 4, glow: .9, alpha: a });
          K.text(ctx, 'MA', x + 290, maY + 6, { font: F.latin(500, 16), color: C.goldHi, alpha: a });
          K.candle(ctx, x - 40, k, yOf, { w: 70, grow: smooth(clamp((S.t - S.beat(line) - .2) / .8)), alpha: a, glow: .6, wick: 4 });
          K.text(ctx, lab, x, 400, { font: F.serif(900, 28), color: ok ? C.red : C.green, align: 'center', alpha: a });
          K.text(ctx, sub, x, 790, { font: F.serif(700, 20), color: C.white, align: 'center', alpha: a });
          const ma = S.at(line, 1.2, .5);
          if (ok) tick(ctx, x + 150, 640, ma, 90, C.red); else bigX(ctx, x + 150, 640, ma, 70, C.green);
        };
        panel(560, TB, true, '真突破', '实体饱满，完全收在均线下', 2);
        panel(1360, FB, false, '假跌破', '长下影，收盘重回均线上', 3);
      }
      callout(ctx, '实体 + 成交量 = 真正的破位', 960, 880, S.at(4, .4, .6), S.t - S.beat(4) - .4, { size: 30, color: Y, spacing: 3 });
    } },

  /* ================= 2:20.8 FINALE — collision, collapse, the trigger ================= */
  { id: 'phil', dur: 29.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, cx = 960, cy = 520;
      // the jagged price line and the smooth average rush together and collide
      const run = smooth(clamp(t / 2.2)), col = clamp((t - 2.2) / 1.0);
      if (col < 1) {
        const R = K.rng(4), jag = [], sm = [];
        for (let i = 0; i <= 40; i++) { const u = i / 40; jag.push([lerp(-200, cx, run) - (1 - u) * 900 * (1 - col), cy + (R() - .5) * 220 * (1 - col) - 60]); sm.push([lerp(2120, cx, run) + u * 900 * (1 - col), cy + Math.sin(u * 4) * 30 * (1 - col) + 60]); }
        poly(ctx, jag, 1, { color: C.green, width: 3, alpha: 1 - col, blur: 14, head: false });
        poly(ctx, sm, 1, { color: C.goldHi, width: 5, alpha: 1 - col, blur: 20, head: false });
      }
      flash(ctx, cx, cy, (t > 2.2 ? 1 : 0) * clamp(1 - (t - 2.2) / 1.2), 900, C.goldHi);
      ring(ctx, cx, cy, (t - 2.2) / 1.6, C.goldHi, 900);
      ctx.save(); ctx.fillStyle = `rgba(2,2,3,${(.88 * smooth(clamp((t - 2.6) / 2.4))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
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
      // the trigger: cocked at 18.9 s, fired at 19.6 s — the last line lands like a shot
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
      K.text(ctx, '均线策略（一）', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(1.2, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.6, 1) });
    } },
  ],
};
})();

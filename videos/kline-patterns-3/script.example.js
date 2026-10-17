/* ============================================================
   《K线形态深度课（二）》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py)

   Clock pinned to the music: the drop at 16.7 s is the gold lightning title,
   the quiet section (85.3–103.2 s) carries the falling wedge's squeeze, and
   the track's return at 103.2 s is the wedge breakout.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };

const H0 = { label: '引入', sub: '从经典走向进阶', en: 'From Classic to Advanced', zh: '《K线形态深度课 · 二》' };
const HT = { label: '形态', num: 1, sub: '头肩顶 · 看跌反转', en: 'Head & Shoulders Top', zh: '《头肩形》' };
const HB = { label: '形态', num: 2, sub: '头肩底 · 看涨反转', en: 'Inverse Head & Shoulders', zh: '《头肩形》' };
const HF = { label: '形态', num: 3, sub: '下降楔形 · 多变看涨', en: 'Falling Wedge', zh: '《楔形三角形》' };
const HR = { label: '形态', num: 4, sub: '上升楔形 · 多变看跌', en: 'Rising Wedge', zh: '《楔形三角形》' };
const TOP = { subX: 960, subY: 275, subAlign: 'center' };      // chart scenes: one subtitle line above the chart, never over it

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



/* ---------------- pattern icons: last episode's four, this episode's four ---------------- */
const ICON = {
  W: { col: C.red, name: '双底', pts: [[-1, -.75], [-.5, .65], [0, -.1], [.5, .65], [1, -.95]] },
  M: { col: C.green, name: '双顶', pts: [[-1, .75], [-.5, -.65], [0, .1], [.5, -.65], [1, .95]] },
  BF: { col: C.red, name: '上升旗形', pts: [[-1, .9], [-.45, -.7], [-.3, -.45], [-.18, -.6], [-.02, -.32], [.12, -.47], [.28, -.2], [1, -1]] },
  BR: { col: C.green, name: '下降旗形', pts: [[-1, -.9], [-.45, .7], [-.3, .45], [-.18, .6], [-.02, .32], [.12, .47], [.28, .2], [1, 1]] },
  HS: { col: C.green, name: '头肩顶', en: 'HEAD & SHOULDERS', pts: [[-1, .75], [-.62, -.25], [-.38, .2], [0, -.9], [.36, .3], [.6, -.18], [1, .95]], neck: [[-.5, .18], [.5, .32]] },
  IH: { col: C.red, name: '头肩底', en: 'INVERSE H&S', pts: [[-1, -.75], [-.62, .25], [-.38, -.2], [0, .9], [.36, -.3], [.6, .18], [1, -.95]], neck: [[-.5, -.18], [.5, -.32]] },
  FW: { col: C.red, name: '下降楔形', en: 'FALLING WEDGE', pts: [[-1, -.85], [-.7, .05], [-.45, -.45], [-.2, .3], [0, -.05], [.2, .42], [.38, .25], [1, -.95]], ch: [[-1, -.9, .45, .2], [-1, .0, .45, .5]] },
  RW: { col: C.green, name: '上升楔形', en: 'RISING WEDGE', pts: [[-1, .85], [-.7, -.05], [-.45, .45], [-.2, -.3], [0, .05], [.2, -.42], [.38, -.25], [1, .95]], ch: [[-1, .9, .45, -.2], [-1, .0, .45, -.5]] },
};
function icon(ctx, key, cx, cy, s, p, a = 1) {
  const I = ICON[key], P = I.pts.map(([x, y]) => [cx + x * s, cy + y * s * .8]);
  const lines = [...(I.ch || []), ...(I.neck ? [[I.neck[0][0], I.neck[0][1], I.neck[1][0], I.neck[1][1]]] : [])];
  for (const [x1, y1, x2, y2] of lines) K.dash(ctx, cx + x1 * s, cy + y1 * s * .8, cx + x2 * s, cy + y2 * s * .8, { p: clamp(p * 2 - .6), alpha: a * .85, color: C.goldHi, dash: [6, 6] });
  poly(ctx, P, p, { color: I.col, width: Math.max(2.5, s * .045), alpha: a, blur: 16 });
}
function card(ctx, key, x, y, a, p, o = {}) {
  const I = ICON[key], cw = 310, ch = 280;
  if (a <= .002) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(o.rot || 0); ctx.scale(o.s || 1, o.s || 1);
  if (o.blur > .3) ctx.filter = `blur(${o.blur.toFixed(1)}px)`;
  ctx.fillStyle = rgba(mix(C.gold, I.col, .35), .07); ctx.strokeStyle = rgba(mix(C.gold, I.col, .45), .75); ctx.lineWidth = 1.4;
  ctx.shadowColor = rgba(I.col, .35); ctx.shadowBlur = 22;
  ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 14); ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
  icon(ctx, key, 0, -34, 98, p, 1);
  K.text(ctx, I.name, 0, 84, { font: F.serif(900, 26), color: C.white, align: 'center' });
  if (I.en) K.text(ctx, I.en, 0, 116, { font: F.latin(500, 14), color: C.gray, align: 'center', spacing: 4 });
  ctx.restore();
}

/* ---------------- volume panel ---------------- */
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

/* ---------------- data ---------------- */
const PBOX = { x: 250, y: 395, w: 1400, h: 350 }, VY = 790, VH = 100;
// head & shoulders top: rising lows into the head, a lower right shoulder, a down-sloping neckline
const HSp = K.gen.path([100, 118, 110, 126, 107, 116, 105.6], { per: [5, 3, 4, 4, 3, 4], seed: 52, noise: .4, wick: .45 });
const HSK = [...HSp.candles, ...K.gen.seq(105.6, [[-7.4, .3, .6], [1.6, .4, .3], [1.5, .4, .3], [.9, .9, .3], [-5.6, .4, .5], [-1.5, .3, .4], [-1.2, .3, .5]])];
const chHS = new K.Chart(HSK, PBOX, { lo: 92, hi: 130 });
const [HS_LS, HS_T1, HS_HD, HS_T2, HS_RS] = HSp.swings;
const HS_BRK = 23, HS_RE = 27;
const hsNeck = i => HS_T1.price + (HS_T2.price - HS_T1.price) * (i - HS_T1.i) / (HS_T2.i - HS_T1.i);
const HSV = [40, 44, 48, 52, 58, 42, 38, 36, 50, 56, 62, 66, 48, 44, 40, 36, 34, 36, 30, 28, 26, 25, 30, 100, 44, 40, 38, 78, 60, 55];

// inverse head & shoulders: the mirror image, breakout on a volume surge
const IHp = K.gen.path([130, 112, 120, 104, 123, 114, 124.4], { per: [5, 3, 4, 4, 3, 4], seed: 61, noise: .4, wick: .45 });
const IHK = [...IHp.candles, ...K.gen.seq(124.4, [[7.6, .6, .3], [1.6, .5, .4], [-.9, .4, .5], [2.0, .5, .3], [1.6, .5, .4]])];
const chIH = new K.Chart(IHK, PBOX, { lo: 100, hi: 138 });
const [IH_LS, IH_P1, IH_HD, IH_P2, IH_RS] = IHp.swings;
const IH_BRK = 23;
const ihNeck = i => IH_P1.price + (IH_P2.price - IH_P1.price) * (i - IH_P1.i) / (IH_P2.i - IH_P1.i);
const IHV = [44, 46, 50, 52, 56, 40, 38, 36, 46, 50, 56, 60, 44, 42, 38, 34, 36, 34, 30, 28, 27, 26, 32, 100, 70, 52, 58, 54];

// wedges: two lines sloping the same way and converging; each new extreme travels less
function wedgeData(dir) {
  const m = p => dir > 0 ? p : 240 - p;                       // dir +1: falling wedge (bullish) · −1: rising wedge (bearish)
  const wp = [129.5, 116.6, 123.6, 113.1, 115.6, 110.3].map(m);
  const p = K.gen.path(wp, { per: [3, 2, 3, 2, 2], seed: dir > 0 ? 71 : 72, noise: .25, wick: .35 });
  const brk = dir > 0 ? [[7.4, .5, .3], [1.6, .5, .4], [-.8, .4, .5], [2.0, .5, .3], [1.4, .4, .4]] : [[-7.6, .3, .5], [-1.6, .4, .5], [.8, .5, .4], [-2.0, .3, .5], [-1.4, .4, .4]];
  const k = [...p.candles, ...K.gen.seq(wp[5], brk)];
  // rails through the swing points: upper/lower for the falling wedge, mirrored for the rising one
  const sw = p.swings, at = i => sw[i];
  const rail = (a, b) => { const s = (b.price - a.price) / (b.i - a.i); return i => a.price + s * (i - a.i); };
  const hiRail = dir > 0 ? rail({ i: 0, price: wp[0] }, at(3)) : rail(at(0), at(4));
  const loRail = dir > 0 ? rail(at(0), at(4)) : rail({ i: 0, price: wp[0] }, at(3));
  const legs = dir > 0 ? [[0, 0, wp[0]], [at(1).i, at(1).price, at(0).price], [at(3).i, at(3).price, at(2).price]]   // drops that shrink
                       : [[0, 0, wp[0]], [at(1).i, at(1).price, at(0).price], [at(3).i, at(3).price, at(2).price]];
  return { k, sw, hiRail, loRail, B: p.candles.length, dir, top: Math.max(...k.slice(0, p.candles.length).map(c => c.h)) };
}
const FWD = wedgeData(1), RWD = wedgeData(-1);
const WBOX = { x: 300, y: 360, w: 1300, h: 400 };
const chFW = new K.Chart(FWD.k, WBOX, { lo: 106, hi: 132 }), chRW = new K.Chart(RWD.k, WBOX, { lo: 108, hi: 134 });
const RWV = [52, 48, 50, 46, 44, 42, 40, 38, 36, 34, 32, 30, 100, 70, 52, 58, 50];
const RSI = [58, 44, 30, 46, 58, 44, 38, 34, 46, 54, 44, 41, 66, 70, 64, 72, 74];   // 示意: higher lows while price makes lower lows

/* ---------------- shared H&S scene builder ---------------- */
function hsScene(o) {
  return (ctx, S) => {
    const c = o.ch, K_ = o.k, top = o.dir < 0;                          // top = bearish H&S top
    const tB = S.beat(o.brkLine) + .5;
    const r0 = o.brk * smooth(S.lin(0, 0, 4.0));
    const r1 = clamp((S.t - tB) / .6);
    const rest = K_.length - o.brk - 1;
    const r2 = rest * smooth(clamp((S.t - tB - 1.4) / (o.restDur || 6)));
    const reveal = r0 + (r0 >= o.brk ? r1 : 0) + (r1 >= 1 ? r2 : 0);
    const [sx, sy] = shake(S.t, tB + .3, 6, 6);
    ctx.save(); ctx.translate(sx, sy);
    K.baseline(ctx, PBOX.x, PBOX.x + PBOX.w, PBOX.y + PBOX.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .5 });
    volume(ctx, c, o.vol, reveal, VY, VH, { hot: o.brk, base: S.at(0, .2, 1.2) });
    drawChart(ctx, c, reveal, { dim: () => .8 });
    // shoulder–head–shoulder trace
    const sw = o.sw, P = [[c.x(0), c.y(K_[0].o)], ...sw.slice(0, 5).map(s => [c.x(s.i), c.y(s.price) + (s.type === 'H' ? -6 : 6)]), [c.x(o.brk - 1), c.y(K_[o.brk - 1].c)]];
    poly(ctx, P, smooth(S.lin(0, .1, 4.0)), { color: o.col, width: 5, alpha: .95 });
    const peaks = top ? [sw[0], sw[2], sw[4]] : [sw[0], sw[2], sw[4]];
    ['左肩', '头部', '右肩'].forEach((lab, j) => {
      const s = peaks[j], a = S.at(0, 1.2 + j * .7, .6, easeBack), y = c.y(s.price) + (top ? -44 : 64);
      K.text(ctx, lab, c.x(s.i), y, { font: F.serif(900, 24), color: C.white, align: 'center', alpha: clamp(a), glow: .5, glowColor: o.col });
    });
    // structure: the head's extreme cannot be revisited
    const hA = S.at(1, .2, 1.2), hy = c.y(sw[2].price) + (top ? -6 : 6);
    K.dash(ctx, c.x(sw[2].i), hy, c.x(sw[4].i) + 60, hy, { p: hA, color: C.gray, width: 1.4, dash: [6, 7] });
    K.arrow(ctx, c.x(sw[4].i), hy + (top ? 10 : -10), c.x(sw[4].i), c.y(sw[4].price) + (top ? -18 : 18), { p: S.at(1, 1.0, .8), color: C.goldHi, width: 2, head: 12 });
    const later = 1 - S.at(o.brkLine, 0, .6);
    tagAt(ctx, c.x(sw[4].i) + 44, c.y(sw[4].price) + (top ? -8 : 8), o.failTag, { side: 'right', alpha: S.at(1, 1.6, .6) * later, color: top ? C.green : C.red, font: F.serif(900, 22) });
    if (o.riseTag) {                                                    // H&S top: lows were rising into the head
      const a = S.at(1, .4, .7) * (1 - S.at(o.brkLine, 0, .6));
      K.arrow(ctx, c.x(0) + 10, c.y(K_[0].l) + 14, c.x(sw[1].i), c.y(sw[1].price) + 18, { p: a, color: C.red, width: 2, head: 12, alpha: .9 });
      K.text(ctx, o.riseTag, c.x(sw[1].i) - 70, c.y(sw[1].price) + 66, { font: F.serif(700, 19), color: C.gray, align: 'center', alpha: a });
    }
    // neckline through the two reaction points, extended
    const nA = S.at(o.neckLine, .2, 1.4), neck = o.neck;
    const nx0 = c.x(sw[1].i) - 40, nx1 = PBOX.x + PBOX.w + 20, ni = x => sw[1].i + (x - c.x(sw[1].i)) / c.step;
    K.line(ctx, nx0, c.y(neck(ni(nx0))), lerp(nx0, nx1, smooth(nA)), c.y(neck(ni(lerp(nx0, nx1, smooth(nA))))), { color: C.goldHi, width: 2.4, glow: .8 });
    if (o.neckLabel) callout(ctx, o.neckLabel, c.x(sw[3].i), c.y(neck(sw[3].i)) + (top ? 64 : -40), S.at(o.neckLine, .8, .4) * (1 - S.at(o.brkLine, 0, .6)), S.t - S.beat(o.neckLine) - .8, { size: 24, spacing: 2 });
    // breakout bar on volume
    const bx = c.x(o.brk), bc = c.y(K_[o.brk].c), ny = c.y(neck(o.brk));
    flash(ctx, bx, ny, (S.t > tB ? 1 : 0) * clamp(1 - (S.t - tB - .3) / 1.2), 380, o.col);
    ring(ctx, bx, ny, (S.t - tB - .3) / 1.1, C.goldHi, 230);
    const vA = S.at(o.brkLine, 1.0, .5) * (1 - S.at(o.brkLine + 1, 0, .5));
    tagAt(ctx, bx, VY - 18, '放量！', { alpha: vA, color: o.col, font: F.serif(900, 20) });
    const ra = S.at(o.brkLine, 1.8, .7), dimR = o.retest ? .55 * S.at(o.brkLine + 1, 0, .6) : 0;
    reticle(ctx, bx, bc, ra * (1 - dimR), S.t, o.col === C.red ? C.goldHi : C.goldHi);
    tagAt(ctx, bx - 52, bc + (top ? 4 : -4), o.entry1, { side: 'left', alpha: ra * (1 - (o.retest ? S.at(o.brkLine + 1, 0, .6) : 0)), color: C.goldHi, font: F.serif(900, 24) });
    if (o.retest) {                                                     // pullback to the neckline, then the second entry
      const pb = S.at(o.brkLine + 1, .2, 1.6, easeInOut), rx = c.x(o.retest), rk = K_[o.retest];
      if (pb > 0) poly(ctx, [[bx, bc], [c.x(o.retest - 1), c.y(K_[o.retest - 1].h) - 4]], pb, { color: C.goldHi, width: 2, dash: [8, 8], alpha: .9, blur: 8 });
      const rb = S.at(o.brkLine + 1, 2.6, .7);
      reticle(ctx, rx, c.y(rk.c), rb, S.t);
      tagAt(ctx, rx - 52, c.y(rk.c) + 4, o.entry2, { side: 'left', alpha: rb, color: C.goldHi, font: F.serif(900, 24) });
    }
    // stop beyond the right shoulder
    const sA = S.at(o.stopLine, .2, 1.2), sp = sw[4].price + (top ? 1.4 : -1.4), sy2 = c.y(sp);
    K.line(ctx, c.x(sw[4].i) - 70, sy2, PBOX.x + PBOX.w + 20, sy2, { p: sA, color: top ? C.red : C.green, width: 2.6, glow: .7 });
    callout(ctx, '止损位', PBOX.x + PBOX.w + 20, sy2 + (top ? -18 : 44), S.at(o.stopLine, .9, .5), S.t - S.beat(o.stopLine) - .9, { align: 'right', color: top ? C.red : C.green, size: 26 });
    ctx.restore();
  };
}

/* ---------------- shared wedge scene builder ---------------- */
function wedgeScene(D, ch, o) {
  const bull = D.dir > 0, col = bull ? C.red : C.green;
  return (ctx, S) => {
    const tB = S.beat(o.brkLine) + (o.brkDelay ?? 0);
    const r0 = D.B * smooth(S.lin(0, 0, o.revealDur || 7.8));
    const r1 = clamp((S.t - tB) / .55), r2 = (D.k.length - D.B - 1) * smooth(clamp((S.t - tB - 1.4) / 3.4));
    const reveal = r0 + (r0 >= D.B ? r1 : 0) + (r1 >= 1 ? r2 : 0);
    const [sx, sy] = shake(S.t, tB, 7, 6);
    ctx.save(); ctx.translate(sx, sy);
    K.baseline(ctx, WBOX.x, WBOX.x + WBOX.w, WBOX.y + WBOX.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .5 });
    // converging rails with a soft fill that narrows
    const rA = S.at(1, .2, 1.8, easeInOut), x0 = ch.x(0) - ch.step * .4, xe = ch.x(D.B - 1) + ch.step * .9, x1 = lerp(x0, xe, rA);
    const ix = x => (x - ch.x(0)) / ch.step;
    if (rA > 0) {
      ctx.save(); ctx.globalAlpha = .1 * rA; ctx.fillStyle = C.gold;
      ctx.beginPath(); ctx.moveTo(x0, ch.y(D.hiRail(ix(x0)))); ctx.lineTo(x1, ch.y(D.hiRail(ix(x1)))); ctx.lineTo(x1, ch.y(D.loRail(ix(x1)))); ctx.lineTo(x0, ch.y(D.loRail(ix(x0)))); ctx.fill(); ctx.restore();
      K.line(ctx, x0, ch.y(D.hiRail(ix(x0))), x1, ch.y(D.hiRail(ix(x1))), { width: 2.2, color: C.goldHi, glow: .8 });
      K.line(ctx, x0, ch.y(D.loRail(ix(x0))), x1, ch.y(D.loRail(ix(x1))), { width: 2.2, color: C.goldHi, glow: .8 });
      // dotted projection to the apex
      const ax = ch.x(D.B + 1.5);
      K.dash(ctx, xe, ch.y(D.hiRail(ix(xe))), ax, ch.y(D.hiRail(ix(ax))), { p: S.at(1, 1.6, 1), alpha: .5, color: C.goldHi, dash: [4, 6] });
      K.dash(ctx, xe, ch.y(D.loRail(ix(xe))), ax, ch.y(D.loRail(ix(ax))), { p: S.at(1, 1.6, 1), alpha: .5, color: C.goldHi, dash: [4, 6] });
    }
    callout(ctx, '越走越窄', ch.x(D.B * .55), ch.y(D.hiRail(D.B * .55)) - 40, S.at(1, 1.8, .5) * (1 - S.at(2, 0, .5)), S.t - S.beat(1) - 1.8, { size: 24, spacing: 3 });
    drawChart(ctx, ch, reveal, { dim: () => .85 });
    // each swing travels less: measured legs with shrinking brackets
    const legs = bull ? [[0, 1], [2, 3], [4, 5]] : [[0, 1], [2, 3], [4, 5]];
    const pts = [{ i: 0, price: D.k[0].o }, ...D.sw];
    legs.forEach(([a, b], j) => {
      const A = pts[a], B = pts[b]; if (!A || !B) return;
      const la = S.at(2, .3 + j * .55, .5) * (1 - S.at(o.brkLine, 0, .6)), xx = ch.x(B.i) + ch.step * .55;
      K.dash(ctx, xx, ch.y(A.price), xx, ch.y(B.price), { p: la, color: col, width: 2.4, dash: [3, 0] });
      K.text(ctx, (Math.abs(A.price - B.price)).toFixed(1), xx + 12, (ch.y(A.price) + ch.y(B.price)) / 2 + 10, { font: F.serif(900, 22), color: col, alpha: la, glow: .5, glowColor: col });
    });
    callout(ctx, o.fadeLabel, ch.x(D.B * .5), bull ? ch.y(D.loRail(D.B * .5)) + 76 : ch.y(D.hiRail(D.B * .5)) - 46, S.at(2, 1.8, .5) * (1 - S.at(o.brkLine, 0, .5)), S.t - S.beat(2) - 1.8, { size: 24, spacing: 2, color: col });
    // optional panel: RSI (示意) for the falling wedge, volume for the rising one
    if (o.panel === 'rsi') {
      const pa = S.at(o.panelLine, .2, 1), y0 = 800, h = 100, n = RSI.length;
      if (pa > 0) {
        K.baseline(ctx, WBOX.x, WBOX.x + WBOX.w, y0 + h, { p: pa, step: 60, alpha: .6 });
        K.text(ctx, 'RSI（示意）', WBOX.x - 18, y0 + 18, { font: F.serif(700, 14), color: C.gray, align: 'right', alpha: pa });
        const pts2 = RSI.slice(0, Math.min(n, D.k.length)).map((v, i) => [ch.x(i), y0 + h - h * (v - 20) / 60]);
        poly(ctx, pts2, smooth(S.lin(o.panelLine, .2, 2)), { color: C.goldHi, width: 2.4, alpha: pa, blur: 10 });
        const lows = [2, 7, 11].map(i => [ch.x(i), y0 + h - h * (RSI[i] - 20) / 60 + 8]);
        poly(ctx, lows, S.at(o.panelLine, 2.4, 1.2), { color: C.red, width: 2, dash: [6, 6], alpha: .95, blur: 8, head: false });
        tagAt(ctx, ch.x(11) + 40, lows[2][1] - 4, '动能底背离', { side: 'right', alpha: S.at(o.panelLine, 3.2, .6), color: C.red, font: F.serif(900, 20) });
      }
    } else if (o.panel === 'vol') volume(ctx, ch, RWV, reveal, 800, 100, { hot: D.B, base: S.at(0, .2, 1) });
    // breakout
    const bx = ch.x(D.B), bc = ch.y(D.k[D.B].c), rail = bull ? D.hiRail(D.B) : D.loRail(D.B);
    flash(ctx, bx, ch.y(rail), (S.t >= tB ? 1 : 0) * clamp(1 - (S.t - tB) / 1.4), 420, col);
    ring(ctx, bx, ch.y(rail), (S.t - tB) / 1.2, C.goldHi, 260);
    const ra = S.at(o.brkLine, (o.brkDelay ?? 0) + 1.2, .7);
    reticle(ctx, bx, bc, ra, S.t, col);
    tagAt(ctx, bx + 46, bc + (bull ? 72 : -72), o.entry, { side: 'right', alpha: ra, color: col, font: F.serif(900, 24) });
    if (o.stop) {                                                        // stop above the wedge's highest point
      const sA = S.at(o.stop, .2, 1.2), sy2 = ch.y(D.top + .9);
      K.line(ctx, ch.x(0) - 30, sy2, WBOX.x + WBOX.w + 20, sy2, { p: sA, color: C.red, width: 2.6, glow: .7 });
      callout(ctx, '止损位', WBOX.x + WBOX.w + 20, sy2 - 18, S.at(o.stop, .9, .5), S.t - S.beat(o.stop) - .9, { align: 'right', color: C.red, size: 26 });
    }
    ctx.restore();
  };
}

window.FILM = {
  title: 'K线形态深度课（二）',
  transition: 1.2,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },
  scenes: [

  /* ================= 0:00 HOOK — the alarm ================= */
  { id: 'hook', dur: 6.0, camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, hit = .3, cx = 960, cy = 520;
      const [sx, sy] = shake(t, hit, 24, 3.2);
      // rotating red warning beacon + pulsing alarm wash
      const pulse = .5 + .5 * Math.sin((t - hit) * 9.4);
      if (t > hit) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 1100); g.addColorStop(0, rgba(C.red, .2 * pulse)); g.addColorStop(1, rgba(C.red, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
        for (let k = 0; k < 2; k++) {
          const a = (t - hit) * 2.6 + k * Math.PI;
          ctx.save(); ctx.translate(cx, cy); ctx.rotate(a);
          const b = ctx.createLinearGradient(0, 0, 1400, 0); b.addColorStop(0, rgba(C.red, .22)); b.addColorStop(1, rgba(C.red, 0));
          ctx.fillStyle = b; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1400, -240); ctx.lineTo(1400, 240); ctx.closePath(); ctx.fill(); ctx.restore();
        }
        ctx.restore();
        // hazard ticks along the frame edges
        ctx.save(); ctx.globalAlpha = .35 + .3 * pulse; ctx.fillStyle = C.red;
        for (let x = -60 + ((t * 120) % 80); x < 1980; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 40, 0); ctx.lineTo(x + 20, 14); ctx.lineTo(x - 20, 14); ctx.fill(); ctx.beginPath(); ctx.moveTo(x, 1080); ctx.lineTo(x + 40, 1080); ctx.lineTo(x + 20, 1066); ctx.lineTo(x - 20, 1066); ctx.fill(); }
        ctx.restore();
      }
      const p = clamp((t - .05) / .3), s = lerp(2.2, 1, easeOut(p));
      ctx.save(); ctx.translate(cx + sx, cy + sy); ctx.scale(s, s);
      ctx.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '为什么你总是倒在暴跌的前夜？', 0, 36, { font: F.serif(900, 56), color: C.white, align: 'center', alpha: p, glow: .65, glowColor: C.red, spacing: 3 });
      ctx.restore();
      K.rule(ctx, cx, 640, 380, S.p(1.4, 1.2));
      K.text(ctx, 'THE NIGHT BEFORE THE CRASH', cx, 700, { font: F.latin(500, 20), color: C.gray, align: 'center', spacing: 10, alpha: S.p(1.8, 1.2) });
    } },

  /* ================= 0:06 OLD FOUR EXPLODE → NEW FOUR ================= */
  { id: 'upgrade', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.03, z1: 1.0 }, subX: 960, subAlign: 'center', pre: 3.6,
    lines: [{ s: '经典形态升级！进阶{四大K线形态}来袭', d: 6.6 }],
    visual(ctx, S) {
      const xs = [420, 780, 1140, 1500], cy = 470, boom = 2.9;
      // last episode's four
      ['W', 'M', 'BF', 'BR'].forEach((key, j) => {
        const a = S.p(.1 + j * .12, .6, easeBack), u = clamp((S.t - boom) / .9), e = easeOut(u);
        const ang = [-2.5, -1.9, -1.2, -.6][j], dist = 900 * e;
        const x = xs[j] + Math.cos(ang) * dist * (j < 2 ? 1 : -1) * -1 * (j < 2 ? 1 : 1), y = cy + Math.sin(ang) * dist * .6;
        const ox = xs[j] + (xs[j] - 960) * 1.9 * e, oy = cy + (j % 2 ? 1 : -1) * 520 * e;
        card(ctx, key, ox, oy, clamp(a) * (1 - u), S.p(.3 + j * .12, 1.1, easeInOut), { rot: (j % 2 ? 1 : -1) * .6 * e, s: lerp(1, 1.5, e), blur: e * 14 });
      });
      // burst at the moment of the explosion
      const bu = (S.t - boom) / 1.1;
      if (bu > 0 && bu < 1) {
        flash(ctx, 960, cy, 1 - bu, 700);
        const R = K.rng(9);
        for (let k = 0; k < 70; k++) {
          const ang = R() * 6.2832, v = 300 + R() * 1100, x = 960 + Math.cos(ang) * v * easeOut(bu), y = cy + Math.sin(ang) * v * .6 * easeOut(bu);
          ctx.fillStyle = rgba(C.goldHi, .8 * (1 - bu)); ctx.beginPath(); ctx.arc(x, y, 1.5 + R() * 2.5, 0, 6.2832); ctx.fill();
        }
      }
      // this episode's four fly in from the edges
      ['HS', 'IH', 'FW', 'RW'].forEach((key, j) => {
        const u = smooth(clamp((S.t - boom - .5 - j * .16) / 1.1));
        if (u <= 0) return;
        const fx = xs[j] + (xs[j] - 960) * 1.6, fy = cy + (j % 2 ? -1 : 1) * 480;
        card(ctx, key, lerp(fx, xs[j], u), lerp(fy, cy, u), u, S.p(boom + .9 + j * .16, 1.3, easeInOut), { s: lerp(1.4, 1, u), blur: (1 - u) * 12, rot: (1 - u) * (j % 2 ? -.4 : .4) });
      });
    } },

  /* ================= 0:16.7 LIGHTNING TITLE (music drop) ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.05 }, subX: 960, subAlign: 'center', pre: 4.6,
    lines: [{ s: '别只看图形，这次要剥开{主力的底牌}——', d: 2.7 }, { s: '看他们的{“动能”}如何一步步衰竭！', d: 2.7 }],
    visual(ctx, S) {
      const t = S.t, z = .15;
      // a gold lightning bolt tears across the centre
      const R = K.rng(33), pts = []; let x = -60, y = 300, up = 1;
      while (x < 1980) { pts.push([x, y]); x += 70 + R() * 70; y += up * (50 + R() * 80) + 14; up = -up; }      // sharp alternating zigzag
      const bp = clamp((t - z) / .22), fade = clamp(1 - (t - z - .25) / .9);
      if (bp > 0 && fade > 0) {
        poly(ctx, pts, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false });
        poly(ctx, pts, bp, { color: C.goldHi, width: 14, blur: 60, alpha: fade * .35, head: false });
        flash(ctx, 960, 470, fade, 1100, C.goldHi);
      }
      const tp = S.p(z + .35, 1.2, K.expo);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 360, 1920, 170); ctx.clip();
      K.goldText(ctx, 'K线形态深度课 · 第二集', 960, 485 + (1 - tp) * 120, 58, { spacing: 10, alpha: tp });
      ctx.restore();
      const sw = clamp((t - 1.6) / 1.3);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const xx = lerp(380, 1540, sw), g = ctx.createLinearGradient(xx - 90, 0, xx + 90, 0);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,240,200,.28)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(xx - 90, 380, 180, 140); ctx.restore();
      }
      K.rule(ctx, 960, 560, 420, S.p(1.2, 1.4));
      K.text(ctx, '主攻：趋势结构的', 960 - 40, 640, { font: F.serif(700, 26), color: C.white, align: 'right', alpha: S.p(1.8, 1) });
      K.text(ctx, '“动能衰竭密码”', 960 - 30, 640, { font: F.serif(900, 30), color: C.goldHi, align: 'left', alpha: S.p(2.2, 1), glow: .7 });
    } },

  /* ================= PART 1 · HEAD & SHOULDERS ================= */
  { id: 'ch1', dur: 4.0, tr: 'sweep', visual: chapter('壹', 1, '头肩形', 'Head & Shoulders', '最经典的趋势反转 · 头肩顶 · 头肩底') },

  { id: 'hstop', header: HT, dur: 29.0, tr: ['iris', [960, 560]], camera: { z0: 1.0, z1: 1.05, x1: -20, y1: 6 }, ...TOP,
    lines: [{ s: '形态 1：{头肩顶}（<看跌反转>）', d: 4.2 }, { s: '无法创新高——结构转为{顶低、底低}！', d: 5.2 }, { s: '高阶胜率：颈线{向下倾斜}，质量更高！', d: 4.8 },
      { s: '放量<大阴线>砸穿颈线：{破位做空点}', d: 4.8 }, { s: '回踩颈线再向下：{稳健回踩做空点}', d: 5.0 }, { s: '止损放在{右肩上方}。', d: 3.6 }],
    visual: hsScene({ ch: chHS, k: HSK, sw: HSp.swings, dir: -1, col: C.green, brk: HS_BRK, retest: HS_RE, vol: HSV, neck: hsNeck, neckLine: 2, brkLine: 3, stopLine: 5,
      neckLabel: '【 高胜率颈线 】', failTag: '多头动能衰竭！', riseTag: '低点抬高', entry1: '破位做空点', entry2: '稳健回踩做空点', restDur: 7 }) },

  { id: 'hsbot', header: HB, dur: 25.3, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05, x1: -20, y1: -6 }, ...TOP,
    lines: [{ s: '形态 2：{头肩底}（[看涨反转]）', d: 4.3 }, { s: '无法创新低——{多头主力完成抄底}！', d: 5.6 }, { s: '突破必须伴随[大阳线]与{成交量放大}！', d: 7.0 }, { s: '止损放在{右肩下方}。', d: 7.0 }],
    visual: hsScene({ ch: chIH, k: IHK, sw: IHp.swings, dir: 1, col: C.red, brk: IH_BRK, vol: IHV, neck: ihNeck, neckLine: 1, brkLine: 2, stopLine: 3,
      neckLabel: '颈线', failTag: '底部抬高', entry1: '顺势做多点', restDur: 6 }) },

  /* ================= PART 2 · WEDGES ================= */
  { id: 'ch2', dur: 4.0, tr: 'sweep', visual: chapter('贰', 2, '楔形三角形', 'Wedge Patterns', '多空蓄力的爆发点 · 下降楔形 · 上升楔形') },

  { id: 'fwedge', header: HF, dur: 30.0, tr: ['iris', [800, 560]], camera: { z0: 1.0, z1: 1.05, x1: -20, y1: 8 }, ...TOP,
    lines: [{ s: '形态 3：{下降楔形}（多变[看涨]）', d: 3.7 }, { s: '两条收敛线同时向下，{越走越窄}', d: 4.6 }, { s: '新低幅度越来越小——{下跌动能衰竭}！', d: 4.9 },
      { s: '[红色大阳线]突破上轨：{顺势做多}！', d: 6.6 }, { s: '实操：搭配{RSI或MACD}确认突破！', d: 8.9 }],
    visual: wedgeScene(FWD, chFW, { brkLine: 3, fadeLabel: '下跌动能逐级减弱', entry: '做多', panel: 'rsi', panelLine: 4, revealDur: 8.4 }) },

  { id: 'rwedge', header: HR, dur: 24.5, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05, x1: -20, y1: -8 }, ...TOP,
    lines: [{ s: '形态 4：{上升楔形}（多变<看跌>）', d: 3.6 }, { s: '新高幅度越来越小——{诱多行情的末尾}！', d: 5.6 }, { s: '一旦<放量跌破>，空头{疯狂延续}！', d: 6.0 }, { s: '止损放在{楔形最高点}上方。', d: 7.9 }],
    visual: wedgeScene(RWD, chRW, { brkLine: 2, brkDelay: .5, fadeLabel: '表面上涨，实际缺乏动能', entry: '做空', panel: 'vol', stop: 3, revealDur: 7.2 }) },

  /* ================= 2:23.8 PHILOSOPHY — the taiji ================= */
  { id: 'phil', dur: 26.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.08 },
    visual(ctx, S) {
      const k = smooth(clamp(S.t / 2.6)), xs = [420, 780, 1140, 1500];
      ['HS', 'IH', 'FW', 'RW'].forEach((key, j) => { if (k < 1) icon(ctx, key, lerp(xs[j], 960, k), lerp(460, 520, k), lerp(96, 10, k), 1, 1 - k); });
      // the lines gather into a slowly turning gold taiji, then sink into ink
      const T = smooth(clamp((S.t - 1.8) / 2.2)) * (1 - .78 * smooth(clamp((S.t - 6) / 4)));
      if (T > 0) {
        const r = 230 * lerp(.2, 1, smooth(clamp((S.t - 1.8) / 2.2))), rot = S.t * .25;
        ctx.save(); ctx.translate(960, 520); ctx.rotate(rot); ctx.globalAlpha = T;
        ctx.shadowColor = rgba(C.goldHi, .6); ctx.shadowBlur = 50;
        const g1 = ctx.createLinearGradient(-r, -r, r, r); g1.addColorStop(0, '#F6DFA0'); g1.addColorStop(1, '#9C7432');
        ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); ctx.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true); ctx.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = rgba(C.goldHi, .9); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.2832); ctx.stroke();
        ctx.fillStyle = '#0B0A08'; ctx.beginPath(); ctx.arc(0, -r / 2, r * .13, 0, 6.2832); ctx.fill();
        ctx.fillStyle = g1; ctx.beginPath(); ctx.arc(0, r / 2, r * .13, 0, 6.2832); ctx.fill();
        ctx.restore();
      }
      ctx.save(); ctx.fillStyle = `rgba(4,4,5,${(.84 * smooth(clamp((S.t - 4.5) / 3))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
      if (T > 0) { ctx.save(); ctx.globalAlpha = .12 * T; ctx.translate(960, 520); ctx.rotate(S.t * .25); ctx.strokeStyle = C.goldHi; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(0, 0, 230, 0, 6.2832); ctx.stroke(); ctx.restore(); }
      K.text(ctx, '【 交易哲理总结 】', 960, 262, { font: F.serif(700, 26), color: C.gold, align: 'center', spacing: 10, alpha: S.p(5.6, 1.4) });
      K.rule(ctx, 960, 300, 260, S.p(6.0, 1.4));
      const lines = [['市场的多空博弈，就像是在一松一紧的呼吸。', 392, 7.2], ['新手在价格的最高点看到贪婪，', 500, 10.6], ['而专业交易员，在价格的上涨中看到了“衰竭”。', 584, 13.2],
        ['学会克制，等待那个动能耗尽的瞬间，', 692, 16.6], ['与势同行，你便能立于不败之地。', 776, 19.4]];
      for (const [str, y, t0] of lines) {
        const u = smooth(clamp((S.t - t0) / 1.6));
        if (u <= .002) continue;
        ctx.save(); ctx.translate(960, y - 20); const s = lerp(1.12, 1, u); ctx.scale(s, s); ctx.translate(-960, -(y - 20));   // each line pushes forward into place
        ctx.filter = u < 1 ? `blur(${((1 - u) * 8).toFixed(1)}px)` : 'none';
        K.goldText(ctx, str, 960, y, 33, { alpha: u, glow: .9, spacing: 3 });
        ctx.restore();
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
      K.text(ctx, 'K线形态深度课（二）', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(1.2, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.6, 1) });
    } },
  ],
};
})();

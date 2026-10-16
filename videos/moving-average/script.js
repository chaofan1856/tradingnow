/* ============================================================
   《趋势指挥官：均线》 — content for the TradingNow film engine (index.html)

   A scene:
     { id, header?, lines?: [subtitle markup], visual?(ctx, S, K), tr?: transition into this scene,
       camera?: {z0,z1,x0,x1,y0,y1}, dur?: fixed seconds, noWatermark? }
   Subtitle markup:  {金色重点}  [红色/多头]  <绿色/空头>
   S (scene clock):  S.t, S.at(line, delay, dur) → eased 0..1, S.lin(...), S.p(sec, dur), S.beat(line)
   K (drawing kit):  see index.html — text, goldText, rich, candle, Chart, gen.path/seq, dotted, dash,
                     line, rule, arrow, marker, bracket, vbrace, tag, baseline
   Transitions:      'zoom' | ['push', ±1] | 'sweep' | ['iris', [x,y]] | 'dissolve'
   All moving-average lines on candle charts are computed from the candle closes (sma / ema below).
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, rgba, mix, F } = K;
const BOX = { x: 260, y: 250, w: 1400, h: 500 };          // standard chart stage (above the subtitle zone)
const TAU = Math.PI * 2;

/* header presets */
const H0 = { label: '导言', sub: '红绿背后的隐藏丝线', en: 'The Hidden Thread', zh: '《趋势指挥官：均线》' };
const H1 = { label: '模块', num: 1, sub: '跨界起源 · 从麦田到火箭', en: 'Unlikely Origins', zh: '《移动平均的来历》' };
const H2 = { label: '模块', num: 2, sub: '现代均线之父与万有引力', en: 'The Gravity of Price', zh: '《价格的引力中心》' };
const H3 = { label: '模块', num: 3, sub: '1981 · 一条震动华尔街的指令', en: 'Sell Everything, 1981', zh: '《神话与镜鉴》' };
const H4 = { label: '结语', sub: '向洋流低头的潮水', en: 'Tide & Current', zh: '《趋势指挥官：均线》' };

/* ---------- math: moving averages from closes ---------- */
const easeBack = x => { x = clamp(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const closes = ks => ks.map(k => k.c);
function sma(cl, n) { const out = []; let s = 0; for (let i = 0; i < cl.length; i++) { s += cl[i]; if (i >= n) s -= cl[i - n]; out.push(i >= n - 1 ? s / n : null); } return out; }
function ema(cl, n) { const k = 2 / (n + 1), out = []; let e = null; for (let i = 0; i < cl.length; i++) { if (i === n - 1) e = cl.slice(0, n).reduce((a, b) => a + b, 0) / n; else if (i >= n) e = k * cl[i] + (1 - k) * e; out.push(e); } return out; }
/** candles with a warm-up history: MA is computed over everything, the chart shows only the tail */
function series(wps, per, seed, warm, o = {}) {
  const all = K.gen.path(wps, { per, seed, ...o }).candles;
  return { all, show: all.slice(warm), warm };
}
/** points of an MA on a chart (display index j ↔ data index j+off), up to `reveal` candles */
function maPts(ch, ma, off = 0, reveal = Infinity) {
  const pts = [];
  for (let j = 0; j < ch.k.length && j < reveal; j++) { const v = ma[j + off]; if (v != null) pts.push([ch.x(j), ch.y(v)]); }
  return pts;
}

/* ---------- drawing helpers ---------- */
/** smooth glowing polyline with draw progress (by length). o:{color,width,glow,alpha,head} */
function curve(ctx, pts, p = 1, o = {}) {
  if (pts.length < 2 || p <= 0) return null;
  let L = 0; const seg = [];
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); seg.push(d); L += d; }
  const end = L * clamp(p); let acc = 0, tip = pts[0];
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.strokeStyle = o.color || C.goldHi; ctx.lineWidth = o.width || 3; ctx.lineJoin = ctx.lineCap = 'round';
  if (o.glow !== 0) { ctx.shadowColor = rgba(o.color || C.goldHi, o.glow ?? .8); ctx.shadowBlur = o.blur || 16; }
  if (o.dash) ctx.setLineDash(o.dash);
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    if (acc + seg[i - 1] >= end) { const u = (end - acc) / seg[i - 1]; tip = [lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u)]; ctx.lineTo(...tip); break; }
    acc += seg[i - 1]; ctx.lineTo(pts[i][0], pts[i][1]); tip = pts[i];
  }
  ctx.stroke();
  if (o.head && p < 1) { ctx.setLineDash([]); ctx.fillStyle = '#FFF4D6'; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(tip[0], tip[1], o.head, 0, TAU); ctx.fill(); }
  ctx.restore();
  return tip;
}
/** K.dotted needs at least two points */
const dots = (ctx, pts, p, o) => { if (pts.length > 1) K.dotted(ctx, pts, p, o); };
/** an MA label pinned to the end of a line */
const maLabel = (ctx, pts, str, a, col = C.goldHi, dy = -14) => { if (pts.length) { const [x, y] = pts[pts.length - 1]; K.text(ctx, str, x + 14, y + dy, { font: F.latin(500, 22), color: col, alpha: a, spacing: 2 }); } };

/** chapter card: 壹/贰/叁 → title → subtitle, with the gold rule */
function chapter(numCn, idx, title, en, sub) {
  return (ctx, S) => {
    const cx = 960;
    const a = S.p(0.15, 1.0);
    K.text(ctx, `MODULE · 0${idx}`, cx, 330, { font: F.latin(500, 20), color: C.gold, align: 'center', spacing: 9, alpha: S.p(0.1, 1) });
    ctx.save(); ctx.translate(cx, 470); const s = lerp(1.25, 1, easeOut(S.t / 1.6)); ctx.scale(s, s);
    K.goldText(ctx, numCn, 0, 0, 120, { alpha: a, glow: .8 + .2 * Math.sin(S.t * 2) });
    ctx.restore();
    K.rule(ctx, cx, 535, 280, S.p(0.6, 1.2));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 548, 1920, 100); ctx.clip();
    const tp = S.p(0.9, 1.1, K.expo);
    K.text(ctx, title, cx, 625 + (1 - tp) * 70, { font: F.serif(900, 62), color: C.white, align: 'center', spacing: 14, alpha: tp });
    ctx.restore();
    K.text(ctx, en.toUpperCase(), cx, 690, { font: F.latin(500, 20), color: C.gray, align: 'center', spacing: 7, alpha: S.p(1.5, 1) });
    K.text(ctx, sub, cx, 736, { font: F.serif(500, 22), color: C.gray, align: 'center', spacing: 6, alpha: S.p(1.8, 1) });
  };
}

/** one wheat stalk in gold line-art. lean: tip offset in px */
function wheat(ctx, x, yb, h, lean, a, s = 1) {
  if (a <= 0.002) return;
  const tx = x + lean, ty = yb - h, ang = Math.atan2(ty - (yb - h * .55), tx - (x + lean * .25));
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = rgba(C.gold, .85); ctx.lineWidth = 1.3 * s; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, yb); ctx.quadraticCurveTo(x + lean * .25, yb - h * .55, tx, ty); ctx.stroke();
  // leaf
  ctx.beginPath(); ctx.moveTo(x + lean * .05, yb - h * .25); ctx.quadraticCurveTo(x + 22 * s + lean * .1, yb - h * .38, x + 30 * s + lean * .15, yb - h * .3); ctx.stroke();
  // ear: grains alternating along the tip direction
  const ex = Math.cos(ang), ey = Math.sin(ang), nx = -ey, ny = ex;
  ctx.fillStyle = rgba(C.goldHi, .16); ctx.strokeStyle = rgba(C.goldHi, .9); ctx.shadowColor = rgba(C.gold, .5); ctx.shadowBlur = 6;
  for (let g = 0; g < 7; g++) {
    const d = (g - 7) * 7.5 * s;
    for (const side of [-1, 1]) {
      const gx = tx + ex * d + nx * side * 5 * s, gy = ty + ey * d + ny * side * 5 * s;
      ctx.beginPath(); ctx.ellipse(gx, gy, 6 * s, 3 * s, ang + side * .5, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + (ex * 1 + nx * side * .5) * 16 * s, gy + (ey * 1 + ny * side * .5) * 16 * s); ctx.stroke();
    }
  }
  ctx.restore();
}
/** a field of wheat; t drives a gentle wind */
function wheatField(ctx, x0, x1, yb, t, a, rows = 3) {
  for (let r = 0; r < rows; r++) {
    const s = .7 + r * .2, gap = 34 * s, y = yb - (rows - 1 - r) * 34, al = a * (.45 + r * .27);
    for (let x = x0 + (r % 2) * gap / 2; x <= x1; x += gap) {
      const h = (95 + 30 * Math.sin(x * .13 + r)) * s, lean = 10 * Math.sin(t * 1.3 - x * .012 + r) + 6;
      wheat(ctx, x, y, h, lean * s, al, s * .9);
    }
  }
}
/** line-art rocket, pointing along `ang` (0 = straight up) */
function rocket(ctx, x, y, ang, s, a, t, thrust = 1) {
  if (a <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(ang); ctx.scale(s, s);
  // flame
  if (thrust > 0) {
    const fl = (34 + 10 * Math.sin(t * 47) + 6 * Math.sin(t * 31)) * thrust;
    const g = ctx.createLinearGradient(0, 40, 0, 40 + fl);
    g.addColorStop(0, rgba('#FFF1C8', .95)); g.addColorStop(.5, rgba(C.goldHi, .6)); g.addColorStop(1, rgba(C.red, 0));
    ctx.fillStyle = g; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 24;
    ctx.beginPath(); ctx.moveTo(-9, 40); ctx.quadraticCurveTo(0, 40 + fl * 1.2, 9, 40); ctx.closePath(); ctx.fill();
  }
  ctx.shadowColor = rgba(C.gold, .7); ctx.shadowBlur = 10;
  ctx.strokeStyle = C.goldHi; ctx.lineWidth = 2 / s * 1.2; ctx.fillStyle = 'rgba(12,10,8,.85)';
  ctx.beginPath(); ctx.moveTo(-14, 34); ctx.lineTo(-14, -30); ctx.quadraticCurveTo(-13, -58, 0, -78); ctx.quadraticCurveTo(13, -58, 14, -30); ctx.lineTo(14, 34); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14, 10); ctx.lineTo(-28, 38); ctx.lineTo(-14, 32); ctx.moveTo(14, 10); ctx.lineTo(28, 38); ctx.lineTo(14, 32); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-9, 34); ctx.lineTo(-11, 42); ctx.lineTo(11, 42); ctx.lineTo(9, 34); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -22, 6, 0, TAU); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-14, -40); ctx.lineTo(14, -40); ctx.stroke();
  ctx.restore();
}
/** anonymous silhouette (head & shoulders), gold rim */
function silhouette(ctx, x, y, s, a) {
  if (a <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = 'rgba(10,9,8,.92)'; ctx.strokeStyle = rgba(C.goldHi, .85); ctx.lineWidth = 1.6; ctx.shadowColor = rgba(C.gold, .7); ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.moveTo(x - s * .62, y); ctx.bezierCurveTo(x - s * .6, y - s * .38, x - s * .3, y - s * .46, x - s * .14, y - s * .5);
  ctx.lineTo(x - s * .12, y - s * .6); ctx.bezierCurveTo(x - s * .3, y - s * .7, x - s * .3, y - s * 1.12, x, y - s * 1.14);
  ctx.bezierCurveTo(x + s * .3, y - s * 1.12, x + s * .3, y - s * .7, x + s * .12, y - s * .6); ctx.lineTo(x + s * .14, y - s * .5);
  ctx.bezierCurveTo(x + s * .3, y - s * .46, x + s * .6, y - s * .38, x + s * .62, y); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
}
/** zig-zag spring from (x,y0) to (x,y1) */
function spring(ctx, x, y0, y1, a, col = C.goldHi) {
  if (a <= 0.002) return;
  const n = 9, w = 14;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.shadowColor = rgba(col, .7); ctx.shadowBlur = 10;
  ctx.beginPath(); ctx.moveTo(x, y0);
  for (let i = 1; i < n; i++) ctx.lineTo(x + (i % 2 ? w : -w), lerp(y0, y1, i / n));
  ctx.lineTo(x, y1); ctx.stroke(); ctx.restore();
}

/* ---------- data ---------- */
// cold open: a nervous tape; the MA is computed from the (jittering) closes every frame
const NOISE = K.gen.path([100, 112, 97, 115, 104, 121, 108, 126, 114, 131], { per: 7, seed: 41, noise: 1.6, wick: 1.1 }).candles;
// intro: a typical chart with MA5 / MA10 / MA20
const INTRO = series([96, 100, 108, 103, 114, 108, 120, 114, 124], [6, 6, 6, 6, 6, 6, 6, 6], 31, 19, { noise: .9, wick: .7 });
const chINTRO = new K.Chart(INTRO.show, { x: 260, y: 260, w: 1400, h: 470 });
// MA window demo
const WIN = K.gen.path([100, 106, 102, 110, 105, 113], { per: [5, 4, 5, 5, 5], seed: 52, noise: .8 }).candles;
const chWIN = new K.Chart(WIN, { x: 300, y: 320, w: 1320, h: 400 }, { body: .5 });
const MA_WIN = sma(closes(WIN), 5);
// MA vs EMA on a V-turn
const VT = series([116, 120, 104, 100, 117], [9, 9, 4, 12], 63, 12, { noise: .55 });
const chVT = new K.Chart(VT.show, { x: 1010, y: 300, w: 640, h: 430 }, { body: .55 });
const VT_MA = sma(closes(VT.all), 10), VT_EMA = ema(closes(VT.all), 10);
// rubber band: steady, over-extended surge, snap back
const RB = series([98, 101, 100, 102.5, 101.5, 120, 104, 106], [5, 4, 4, 4, 6, 5, 3], 71, 13, { noise: .35, wick: .5 });
const chRB = new K.Chart(RB.show, { x: 260, y: 270, w: 1240, h: 470 }, { body: .55 });
const RB_MA = sma(closes(RB.all), 10);
// support / resistance
const SUP = series([92, 100, 105, 103, 109, 106.5, 113, 110.5, 117, 115, 121], [5, 5, 3, 4, 3, 4, 3, 4, 3, 3], 81, 10, { noise: .3, wick: .4 });
const RES = series([129, 121, 116, 118, 111, 113.5, 107, 109.5, 103, 105, 99], [5, 5, 3, 4, 3, 4, 3, 4, 3, 3], 82, 10, { noise: .3, wick: .4 });
const chSUP = new K.Chart(SUP.show, { x: 270, y: 300, w: 640, h: 420 }, { body: .55 }), chRES = new K.Chart(RES.show, { x: 1010, y: 300, w: 640, h: 420 }, { body: .55 });
const SUP_MA = sma(closes(SUP.all), 10), RES_MA = sma(closes(RES.all), 10);
// 1981 panic
const PANIC = K.gen.seq(100, [[.6, .5, .4], [-.5, .4, .5], [.4, .5, .3], [-.3, .3, .4], [.5, .4, .3], [-.4, .5, .4], [.3, .3, .3], [-1.2, .4, .8], [-2.6, .6, 1.4], [-4.2, .8, 2.2], [-3.4, 1.4, 1.8], [-2.2, 1.2, 1.6], [1.0, .8, 1.0], [-1.6, 1.0, 1.2]]);
const chPANIC = new K.Chart(PANIC, { x: 300, y: 260, w: 1320, h: 330 }, { body: .55 });
const VOL = [22, 25, 20, 24, 21, 26, 23, 48, 70, 100, 82, 64, 45, 52];
// the long bull market
const BULL = series([80, 84, 82, 90, 86, 97, 92, 104, 99, 112, 106, 120, 114, 129, 123, 138], [5, 3, 5, 3, 5, 3, 5, 3, 5, 3, 5, 3, 5, 3, 5], 91, 14, { noise: .45, wick: .5 });
const chBULL = new K.Chart(BULL.show, { x: 260, y: 260, w: 1400, h: 490 }, { body: .55 });
const BULL_MA = sma(closes(BULL.all), 14);

/* MA window state at time u (0..1 slide progress): a hop-and-hold motion */
const winPos = u => { const n = WIN.length - 1, f = lerp(4, n, clamp(u)), i = Math.floor(f), fr = f - i; return Math.min(n, i + easeInOut(clamp((fr - .35) / .45))); };

/* Granville diagram geometry: MA (schematic) and price offsets around it */
const GX = u => 300 + u * 1320;
const GMA = u => 500 - 125 * Math.cos(TAU * (u - .56) / .88);
const GOFF = [[0, 50], [.05, 105], [.11, 55], [.17, 0], [.23, -62], [.30, 26], [.35, -58], [.42, -16], [.52, -112], [.60, -46], [.66, 0], [.72, 58], [.78, -28], [.84, 62], [.90, 14], [.96, 70], [1, 86]];
const goff = u => { let i = 0; while (i < GOFF.length - 2 && u > GOFF[i + 1][0]) i++; const [u0, a] = GOFF[i], [u1, b] = GOFF[i + 1]; const w = (1 - Math.cos(Math.PI * clamp((u - u0) / (u1 - u0)))) / 2; return lerp(a, b, w); };
const GRULES = [
  [.05, 'B4', '超跌反弹', 1], [.17, 'B1', '上穿均线', 1], [.30, 'B2', '假跌破', 1], [.42, 'B3', '回踩不破', 1],
  [.52, 'S4', '超涨回落', 0], [.66, 'S1', '下穿均线', 0], [.78, 'S2', '假突破', 0], [.90, 'S3', '反弹不过', 0],
];

/* Morse key-downs for "SELL" (unit 0.1 s), repeated */
const MORSE = (() => { const u = .1, out = []; let t = 0; const code = ['...', '.', '.-..', '.-..'];
  for (let rep = 0; rep < 3; rep++) { for (const ch of code) { for (const m of ch) { const d = m === '.' ? u : 3 * u; out.push([t, d]); t += d + u; } t += 2 * u; } t += 4 * u; }
  return out; })();

window.FILM = {
  title: '趋势指挥官：均线',
  transition: 1.1,
  timing: { perChar: 0.14, base: 1.2, minLine: 2.4, pre: 0.8, post: 0.9 },
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },   // 48 × FS 1.75 = 84px: readable at first glance on a phone
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', camera: { z0: 1.07, z1: 1.0 }, lines: ['密密麻麻的红绿K线，上下乱跳，让人迷失方向。', '直到一条{平滑的线}划过——趋势，一目了然。'],
    visual(ctx, S) {
      const calm = S.at(1, .3, 2.6, easeInOut);
      const amp = 1 - calm * .85;
      // every candle trembles (pure function of time), less and less once the line arrives
      const ks = NOISE.map((k, i) => { const j = (Math.sin(S.t * (9 + (i % 5)) + i * 1.7) + Math.sin(S.t * (15 + (i % 3)) + i)) * 1.1 * amp; return { o: k.o + j * .6, c: k.c - j, h: k.h + Math.abs(j) * .8, l: k.l - Math.abs(j) * .8 }; });
      const ch = new K.Chart(ks, BOX, { lo: 90, hi: 136, body: .55 });
      K.baseline(ctx, BOX.x, BOX.x + BOX.w, BOX.y + BOX.h + 30, { p: S.p(0, 1.4) });
      const shake = Math.sin(S.t * 37) * 2.2 * amp * S.p(.3, .6);
      ctx.save(); ctx.translate(shake, Math.cos(S.t * 29) * 1.4 * amp);
      ch.draw(ctx, S.lin(0, -.6, 2.4) * ks.length, { dim: () => 1 - calm * .62, glow: .35 * amp });
      ctx.restore();
      // the smooth moving-average line sweeps in
      const ma = sma(closes(ks), 10), pts = maPts(ch, ma);
      curve(ctx, pts, S.at(1, 0, 2.2, easeInOut), { width: 4, head: 6, glow: .9, blur: 22 });
      K.text(ctx, 'MA', pts[pts.length - 1][0] + 16, pts[pts.length - 1][1] + 8, { font: F.latin(500, 26), color: C.goldHi, alpha: S.at(1, 2, .8), spacing: 3 });
    } },

  /* ================= TITLE ================= */
  { id: 'title', dur: 5.2, tr: 'zoom', camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const cx = 960;
      const bg = K.gen.path([100, 108, 103, 114, 109, 121, 115, 128], { per: 6, seed: 3 });
      const ch = new K.Chart(bg.candles, { x: 120, y: 200, w: 1680, h: 640 });
      ch.draw(ctx, S.lin(0, -.2, 3.2) * bg.candles.length, { alpha: .14, glow: 0, color: () => C.gold });
      curve(ctx, maPts(ch, sma(closes(bg.candles), 6)), S.p(.4, 3), { width: 2, alpha: .35, glow: .4 });
      K.text(ctx, 'MOVING AVERAGE  ·  THE TREND COMMANDER', cx, 400, { font: F.latin(500, 24), color: C.gold, align: 'center', spacing: 10, alpha: S.p(.3, 1.2) });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 410, 1920, 150); ctx.clip();
      const tp = S.p(.5, 1.4, K.expo);
      K.goldText(ctx, '趋势指挥官：均线', cx, 528 + (1 - tp) * 110, 104, { spacing: 14 });
      ctx.restore();
      const sw = clamp((S.t - 1.8) / 1.3);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(440, 1480, sw), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,240,200,.28)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, 410, 180, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 330, S.p(1.3, 1.4));
      K.text(ctx, '从麦田、火箭到华尔街 · 一条线的传奇', cx, 650, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 8, alpha: S.p(2.0, 1.2) });
    } },

  /* ================= 导言 ================= */
  { id: 'intro', header: H0, tr: ['iris', [960, 480]], camera: { z0: 1.02, z1: 1.06, x1: -20 },
    lines: ['打开任何一款行情软件，都能拉出几条{平滑的均线}。', '它被称为{股市的万有引力}。', '可它的核心算法，并非诞生于华尔街——', '而是来自英国的{统计学家}，和美国的{航天工程师}。'],
    visual(ctx, S) {
      const ch = chINTRO, cl = closes(INTRO.all), off = INTRO.warm;
      const away = S.at(2, 0, 1.2, easeInOut);
      ctx.save(); ctx.globalAlpha *= 1 - away * .88;
      K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, ch.box.y + ch.box.h + 26, { p: S.at(0, 0, 1) });
      ch.draw(ctx, S.lin(0, 0, 2.6) * ch.k.length, { dim: () => 1 - S.at(0, 2.4, 1) * .5 });
      const mas = [[5, C.white, 'MA5'], [10, C.goldHi, 'MA10'], [20, C.gold, 'MA20']];
      mas.forEach(([n, col, lb], i) => {
        const pts = maPts(ch, sma(cl, n), off), p = S.at(0, 1.4 + i * .35, 2.0, easeInOut);
        curve(ctx, pts, p, { color: col, width: 2.6, glow: .6, head: 4 });
        K.text(ctx, lb, ch.box.x + ch.box.w + 14, pts[pts.length - 1][1] + 8 + (i - 1) * 6, { font: F.latin(500, 20), color: col, alpha: S.at(0, 3.2 + i * .2, .6), spacing: 2 });
      });
      ctx.restore();
      const g = S.at(1, 0, .9) * (1 - away);
      K.text(ctx, '股市万有引力', 960, 236, { font: F.serif(900, 34), color: C.goldHi, align: 'center', spacing: 12, alpha: g, glow: .5 });
      // two unexpected ancestors
      const L = S.at(3, 0, 1, easeBack), Rr = S.at(3, 1.6, 1, easeBack);
      const medal = (x, a, draw, zh, en) => {
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha *= clamp(a); ctx.translate(x, 470); ctx.scale(.8 + .2 * a, .8 + .2 * a);
        ctx.strokeStyle = rgba(C.goldHi, .8); ctx.lineWidth = 1.4; ctx.shadowColor = rgba(C.gold, .7); ctx.shadowBlur = 18;
        ctx.beginPath(); ctx.arc(0, 0, 140, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
        ctx.strokeStyle = rgba(C.gold, .35); ctx.beginPath(); ctx.arc(0, 0, 152, 0, TAU); ctx.stroke();
        draw(); ctx.restore();
        K.text(ctx, zh, x, 680, { font: F.serif(900, 34), color: C.white, align: 'center', spacing: 6, alpha: clamp(a) });
        K.text(ctx, en, x, 718, { font: F.latin(500, 18), color: C.gray, align: 'center', spacing: 6, alpha: clamp(a) });
      };
      medal(620, L, () => { for (let i = -2; i <= 2; i++) wheat(ctx, i * 34, 95, 150 + (2 - Math.abs(i)) * 18, 8 * Math.sin(S.t * 1.3 + i), 1, 1); }, '英国 · 统计学家', 'BRITAIN · STATISTICIAN');
      medal(1300, Rr, () => rocket(ctx, 0, 10, .25, 1.3, 1, S.t, .8), '美国 · 航天工程师', 'USA · AEROSPACE ENGINEER');
      const q = S.at(3, .8, .8) * (1 - away * 0) * clamp(away * 2);
      K.goldText(ctx, '？', 960, 500, 110, { alpha: q * (.75 + .25 * Math.sin(S.t * 3)) });
      K.dash(ctx, 790, 470, 880, 470, { p: q, alpha: .6 }); K.dash(ctx, 1130, 470, 1040, 470, { p: q, alpha: .6 });
    } },

  /* ================= 模块一 ================= */
  { id: 'ch1', dur: 4.2, tr: 'sweep', visual: chapter('壹', 1, '跨界起源', 'Unlikely Origins', '农作物产量 · 道氏理论 · 航天轨迹') },

  { id: 'wheat', header: H1, tr: 'zoom', camera: { z0: 1.0, z1: 1.06, y1: -10 }, chapter: '模块一：跨界起源',
    lines: ['{1901年}，英国统计学家{胡克}（R. H. Hooker），', '在研究{气候}与{农作物收成}的关系时，', '用上了一种方法：{移动平均}。', '数据按窗口取平均，逐年的{起伏就被熨平}。'],
    visual(ctx, S) {
      const field = S.at(0, 0, 1.6);
      wheatField(ctx, 300, 1620, 790, S.t, field);
      K.tag(ctx, 960, 238, 'R. H. HOOKER  ·  1901  ·  英国统计学家', { alpha: S.at(0, .6, .7), font: F.serif(700, 20) });
      // yearly harvest (illustrative) and its moving average
      const N = 24, R = K.rng(19), Y = [];
      for (let i = 0; i < N; i++) Y.push(50 + 10 * Math.sin(i * .32) + (R() - .5) * 26);
      const bx = 380, bw = 1160, by = 300, bh = 210, lo = 25, hi = 80;
      const px = i => bx + i * bw / (N - 1), py = v => by + bh * (1 - (v - lo) / (hi - lo));
      const ca = S.at(1, 0, 1);
      K.baseline(ctx, bx, bx + bw, by + bh + 14, { p: ca, step: bw / (N - 1), alpha: .8 });
      K.text(ctx, '收成（示意）', bx - 16, by + 20, { font: F.serif(500, 18), color: C.gray, align: 'right', alpha: ca });
      K.text(ctx, '年份 →', bx + bw, by + bh + 44, { font: F.serif(500, 18), color: C.gray, align: 'right', alpha: ca });
      const raw = Y.map((v, i) => [px(i), py(v)]);
      const rp = S.lin(1, 0, 2.2);
      curve(ctx, raw, rp, { color: rgba(C.gray, .9), width: 1.4, glow: 0 });
      raw.forEach(([x, y], i) => { const a = clamp(rp * (N - 1) - i + 1); if (a > 0) { ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, TAU); ctx.fill(); ctx.restore(); } });
      const m = sma(Y, 5), mp = m.map((v, i) => v == null ? null : [px(i), py(v)]).filter(Boolean);
      curve(ctx, mp, S.at(2, .3, 2.0, easeInOut), { width: 3.5, head: 5 });
      K.text(ctx, '移动平均', mp[mp.length - 1][0] + 14, mp[mp.length - 1][1] + 8, { font: F.serif(700, 22), color: C.goldHi, alpha: S.at(2, 2, .7) });
      // weather icons (line 2)
      const w = S.at(1, .4, .8);
      if (w > 0) {
        ctx.save(); ctx.globalAlpha = w; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 1.6; ctx.shadowColor = rgba(C.gold, .6); ctx.shadowBlur = 10;
        const sx = 1640, sy = 330, rot = S.t * .3;
        ctx.beginPath(); ctx.arc(sx, sy, 20, 0, TAU); ctx.stroke();
        for (let k = 0; k < 8; k++) { const a = rot + k * TAU / 8; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * 28, sy + Math.sin(a) * 28); ctx.lineTo(sx + Math.cos(a) * 40, sy + Math.sin(a) * 40); ctx.stroke(); }
        const cx = 290, cy = 420;
        ctx.beginPath(); ctx.arc(cx - 18, cy, 16, Math.PI * .5, Math.PI * 1.5); ctx.arc(cx, cy - 12, 20, Math.PI, 0); ctx.arc(cx + 22, cy, 14, Math.PI * 1.5, Math.PI * .5); ctx.closePath(); ctx.stroke();
        for (let k = 0; k < 3; k++) { const d = ((S.t * 1.4 + k * .33) % 1); ctx.globalAlpha = w * (1 - d); ctx.beginPath(); ctx.moveTo(cx - 16 + k * 16, cy + 24 + d * 30); ctx.lineTo(cx - 20 + k * 16, cy + 34 + d * 30); ctx.stroke(); }
        ctx.restore();
      }
      K.tag(ctx, 960, 560, '起伏被熨平', { alpha: S.at(3, .3, .7), color: C.gold });
    } },

  { id: 'window', header: H1, tr: ['push', 1], camera: { z0: 1.02, z1: 1.0, x0: 20, x1: -20 },
    lines: ['算法很简单：取最近{N个收盘价}，求平均。', '每过一天，窗口就{向前滑一格}——', '加入最新的一天，丢掉最旧的一天，再算一次。', '把每天的平均值连起来，就是{移动平均线}（MA）。'],
    visual(ctx, S) {
      const ch = chWIN, n = WIN.length, cl = closes(WIN);
      const pos = winPos(S.lin(1, 0, S.beat(3) - S.beat(1) + 1.2));
      const cur = Math.round(pos);
      K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, ch.box.y + ch.box.h + 24, { p: S.at(0, 0, 1) });
      ch.draw(ctx, S.lin(0, -.4, 1.6) * n, { dim: i => (i > cur - 5 && i <= cur) ? 1 : .45, glow: .3 });
      const wa = S.at(0, 1, .7);
      // the window
      if (wa > 0) {
        const x0 = ch.x(pos - 4) - ch.step / 2, x1 = ch.x(pos) + ch.step / 2;
        ctx.save(); ctx.globalAlpha = wa; ctx.fillStyle = rgba(C.gold, .08); ctx.fillRect(x0, ch.box.y - 10, x1 - x0, ch.box.h + 20);
        ctx.strokeStyle = rgba(C.goldHi, .9); ctx.lineWidth = 1.6; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 14; ctx.strokeRect(x0, ch.box.y - 10, x1 - x0, ch.box.h + 20); ctx.restore();
        K.text(ctx, 'N = 5', (x0 + x1) / 2, ch.box.y - 22, { font: F.latin(500, 22), color: C.goldHi, align: 'center', alpha: wa, spacing: 2 });
        for (let j = cur - 4; j <= cur; j++) K.marker(ctx, ch.x(j), ch.y(cl[j]), { alpha: wa, r: 6, color: C.goldHi });
        // live formula
        const vals = cl.slice(cur - 4, cur + 1).map(v => v.toFixed(1));
        K.text(ctx, `MA5 = ( ${vals.join(' + ')} ) ÷ 5 = ${MA_WIN[cur].toFixed(2)}`, 960, 262, { font: F.latin(500, 28), color: C.white, align: 'center', alpha: wa, spacing: 1 });
        // in / out labels
        const io = S.at(2, 0, .7);
        K.tag(ctx, x1 + 4, ch.box.y + ch.box.h + 58, '+ 加入最新', { alpha: io, color: C.red, font: F.serif(700, 18), align: 'left' });
        K.tag(ctx, x0 - 4 - 120, ch.box.y + ch.box.h + 58, '− 丢掉最旧', { alpha: io * (cur > 4 ? 1 : .0), color: C.green, font: F.serif(700, 18), align: 'left' });
      }
      // MA dots accumulate as the window slides; connect into the line at the end
      for (let j = 4; j <= cur; j++) { const a = wa * clamp(1 + (pos - j) * 3); ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 14; ctx.beginPath(); ctx.arc(ch.x(j), ch.y(MA_WIN[j]), 4.5, 0, TAU); ctx.fill(); ctx.restore(); }
      const pts = maPts(ch, MA_WIN, 0, cur + 1);
      curve(ctx, pts, S.at(3, .2, 1.6, easeInOut), { width: 3.5, head: 5 });
      maLabel(ctx, pts, 'MA5', S.at(3, 1.6, .6), C.goldHi, 34);
    } },

  { id: 'dow', header: H1, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05 },
    lines: ['后来，{道氏理论的追随者}把它带进了股市。', '价格每天上蹿下跳，大多只是{噪音}；', '经过移动平均的过滤，{主要趋势}才浮出水面。'],
    visual(ctx, S) {
      const N = 150, R = K.rng(77), raw = [];
      for (let i = 0; i < N; i++) raw.push(Math.sin(i / N * 5.2) * 70 - i * .9 + (R() - .5) * 90 + Math.sin(i * 1.7) * 18);
      const m = sma(raw, 15), px = i => 280 + i * 9.0, py = v => 520 - v * .9;
      const fx = 960, flow = S.lin(0, 0, 4.2);
      // noise on the left of the filter, smooth trend on the right
      const shown = Math.floor(flow * N);
      const left = [], right = [], ghost = [];
      for (let i = 0; i < shown; i++) { const x = px(i); if (x < fx - 60) left.push([x, py(raw[i])]); else ghost.push([x, py(raw[i])]); if (x > fx + 60 && m[i] != null) right.push([x, py(m[i])]); }
      curve(ctx, left, 1, { color: rgba(C.white, .75), width: 1.3, glow: 0 });
      curve(ctx, ghost, 1, { color: rgba(C.gray, .18), width: 1, glow: 0 });
      curve(ctx, right, 1, { width: 3.5, head: flow < 1 ? 5 : 0 });
      // the filter
      const fa = S.at(0, .3, .8);
      ctx.save(); ctx.globalAlpha = fa; ctx.strokeStyle = rgba(C.gold, .55); ctx.lineWidth = 1;
      for (let k = 0; k <= 8; k++) { ctx.beginPath(); ctx.moveTo(fx - 50 + k * 12.5, 300); ctx.lineTo(fx - 50 + k * 12.5, 700); ctx.stroke(); }
      for (let y = 300; y <= 700; y += 16) { ctx.beginPath(); ctx.moveTo(fx - 50, y); ctx.lineTo(fx + 50, y); ctx.stroke(); }
      ctx.strokeStyle = C.goldHi; ctx.lineWidth = 2; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 16; ctx.strokeRect(fx - 50, 300, 100, 400);
      ctx.restore();
      K.text(ctx, '移动平均', fx, 738, { font: F.serif(700, 22), color: C.goldHi, align: 'center', alpha: fa });
      K.text(ctx, 'FILTER', fx, 766, { font: F.latin(500, 17), color: C.gray, align: 'center', spacing: 4, alpha: fa });
      K.tag(ctx, 960, 246, '道氏理论的追随者', { alpha: S.at(0, .2, .7), font: F.serif(700, 22) });
      const la = S.at(1, 0, .8);
      K.text(ctx, '噪音 NOISE', 560, 760, { font: F.serif(700, 24), color: C.white, align: 'center', alpha: la });
      K.text(ctx, '主要趋势 PRIMARY TREND', 1370, 760, { font: F.serif(700, 24), color: C.goldHi, align: 'center', alpha: S.at(2, 0, .8) });
    } },

  { id: 'rocket', header: H1, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -30, y1: 10 },
    lines: ['{1960年代}，工程师{豪尔兰}（P. N. Haurlan）', '曾在美国航天项目中，处理{飞行轨迹}的跟踪数据。', '雷达读数跳动不停，{指数平滑}能把它们修成稳定的航迹。', '后来，他把这套方法带进股市，推广了{指数移动平均线}（EMA）。'],
    visual(ctx, S) {
      const gy = 780;
      K.baseline(ctx, 260, 1660, gy, { p: S.at(0, 0, 1), step: 70 });
      // launch gantry
      const ga = S.at(0, 0, .8);
      ctx.save(); ctx.globalAlpha = ga; ctx.strokeStyle = rgba(C.gold, .7); ctx.lineWidth = 1.3;
      ctx.strokeRect(330, 520, 40, gy - 520);
      for (let y = 520; y < gy; y += 26) { ctx.beginPath(); ctx.moveTo(330, y); ctx.lineTo(370, y + 26); ctx.moveTo(370, y); ctx.lineTo(330, y + 26); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(370, 600); ctx.lineTo(410, 600); ctx.moveTo(370, 680); ctx.lineTo(410, 680); ctx.stroke(); ctx.restore();
      // trajectory
      const traj = u => [lerp(430, 1330, Math.pow(u, 1.35)), lerp(700, 300, 1 - Math.pow(1 - u, 1.8))];
      const u = S.at(0, 1.0, S.beat(2) + .6 - S.beat(0) - 1.0, x => { x = clamp(x); return x * x * (3 - 2 * x) * .25 + x * .75; });
      const tp = []; for (let i = 0; i <= 80; i++) tp.push(traj(i / 80 * u));
      dots(ctx, tp, 1, { alpha: .35, gap: 9, r: 1.3 });
      // radar dish, beam sweeping toward the rocket
      const [rx, ry] = traj(Math.max(u, .001)), dx = 1520, dy = gy - 70;
      const ra = S.at(1, 0, .8);
      ctx.save(); ctx.globalAlpha = ra; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 1.8; ctx.shadowColor = rgba(C.gold, .7); ctx.shadowBlur = 10;
      const da = Math.atan2(ry - dy, rx - dx);
      ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx - 20, gy); ctx.moveTo(dx, dy); ctx.lineTo(dx + 20, gy); ctx.stroke();
      ctx.beginPath(); ctx.arc(dx, dy, 46, da - 1.1 + Math.PI, da + 1.1 + Math.PI, false); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(dx, dy); ctx.lineTo(dx + Math.cos(da) * 30, dy + Math.sin(da) * 30); ctx.stroke();
      const g = ctx.createRadialGradient(dx, dy, 0, dx, dy, 900); g.addColorStop(0, rgba(C.goldHi, .14)); g.addColorStop(1, rgba(C.goldHi, 0));
      ctx.fillStyle = g; ctx.shadowBlur = 0; const sw = .05 + .03 * Math.sin(S.t * 6);
      ctx.beginPath(); ctx.moveTo(dx, dy); ctx.arc(dx, dy, 900, da - sw, da + sw); ctx.closePath(); ctx.fill();
      ctx.restore();
      K.text(ctx, '雷达 RADAR', dx, gy + 40, { font: F.serif(700, 20), color: C.gray, align: 'center', alpha: ra });
      // noisy radar fixes behind the rocket, and their exponential smoothing
      const NB = 40, R = K.rng(23), blips = [];
      for (let i = 0; i < NB; i++) { const [x, y] = traj(i / (NB - 1)); blips.push([x + (R() - .5) * 46, y + (R() - .5) * 60]); }
      const seen = Math.floor(clamp((u - .02) / .98) * NB * S.at(1, 0, .01));
      const k = .3, sm = []; let ex = blips[0][0], ey = blips[0][1];
      for (let i = 0; i < seen; i++) { if (i) { ex = k * blips[i][0] + (1 - k) * ex; ey = k * blips[i][1] + (1 - k) * ey; } sm.push([ex, ey]); }
      for (let i = 0; i < seen; i++) K.marker(ctx, blips[i][0], blips[i][1], { r: 4, alpha: .75, color: C.white });
      curve(ctx, sm, S.at(2, 0, .01), { width: 3.5, glow: .9 });
      rocket(ctx, rx, ry, Math.atan2(traj(Math.min(1, u + .01))[1] - ry, traj(Math.min(1, u + .01))[0] - rx) + Math.PI / 2, 1.05, ga, S.t, u > 0 && u < 1 ? 1 : (u >= 1 ? .6 : .25));
      K.tag(ctx, 640, 250, 'P. N. HAURLAN  ·  1960s', { alpha: S.at(0, .4, .7), font: F.serif(700, 20) });
      const sl = S.at(2, .6, .7);
      if (sm.length > 4) K.text(ctx, '指数平滑后的航迹', sm[Math.floor(sm.length * .55)][0] + 34, sm[Math.floor(sm.length * .55)][1] + 40, { font: F.serif(700, 22), color: C.goldHi, alpha: sl });
      K.text(ctx, '跳动的读数', blips[8][0] - 30, blips[8][1] - 30, { font: F.serif(700, 20), color: C.white, align: 'right', alpha: S.at(1, 1.2, .7) * (1 - S.at(3, 0, .6)) });
      const em = S.at(3, .3, .9, easeBack);
      K.tag(ctx, 1150, 540, '指数平滑  →  EMA', { alpha: clamp(em), color: C.gold, font: F.serif(700, 24) });
    } },

  { id: 'ema', header: H1, tr: ['push', 1], camera: { z0: 1.0, z1: 1.04 },
    lines: ['{MA}对窗口里的每一天{一视同仁}，权重相同；', '{EMA}则是越近的价格{权重越大}，越早的逐渐衰减。', '所以EMA{转身更快}，能更早跟上价格的拐点。'],
    visual(ctx, S) {
      // left: weights
      const N = 10, k = 2 / (N + 1), bx = 300, step = 52, sc = 640;
      const rows = [['MA · 等权', 'MA = 收盘价之和 ÷ N', 410, i => 1 / N, C.gold, 0], ['EMA · 近大远小', 'EMA = k×今收 + (1−k)×昨EMA', 660, i => k * Math.pow(1 - k, N - 1 - i), C.goldHi, 1]];
      for (const [name, fml, y, wf, col, li] of rows) {
        const a = S.at(li, 0, .8);
        K.text(ctx, name, bx, y - 140, { font: F.serif(900, 28), color: col, alpha: a });
        K.text(ctx, fml, bx + 2, y - 108, { font: F.serif(500, 19), color: C.gray, alpha: a });
        K.line(ctx, bx - 10, y, bx + N * step, y, { p: a, color: rgba(C.gold, .55) });
        for (let i = 0; i < N; i++) {
          const g = S.at(li, .3 + i * .06, .6, easeBack), h = wf(i) * sc * g;
          ctx.save(); ctx.globalAlpha = clamp(g); ctx.fillStyle = rgba(col, .75); ctx.shadowColor = rgba(col, .6); ctx.shadowBlur = 12;
          ctx.fillRect(bx + i * step + 8, y - h, step - 16, h); ctx.restore();
        }
        K.text(ctx, '旧', bx + 6, y + 30, { font: F.serif(500, 18), color: C.gray, alpha: a });
        K.text(ctx, '新', bx + N * step - 16, y + 30, { font: F.serif(500, 18), color: C.gray, alpha: a });
        K.dash(ctx, bx + 30, y + 24, bx + N * step - 30, y + 24, { p: a, alpha: .5, dash: [3, 6] });
      }
      // right: the V-turn, MA10 vs EMA10 from the closes
      const ch = chVT, off = VT.warm;
      const r = S.lin(0, 0, 3.0) * ch.k.length;
      K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, ch.box.y + ch.box.h + 24, { p: S.at(0, 0, 1), step: 40 });
      ch.draw(ctx, r, { dim: () => .55, glow: .2 });
      const mp = maPts(ch, VT_MA, off, r), ep = maPts(ch, VT_EMA, off, r);
      const lp = S.at(0, 0, .01);
      dots(ctx, mp, lp, { color: C.gold, r: 2, gap: 6 });
      curve(ctx, ep, lp * S.at(1, 0, .01), { width: 3.2 });
      maLabel(ctx, mp, 'MA10', S.at(0, 3, .6), C.gold, 22);
      maLabel(ctx, ep, 'EMA10', S.at(1, .4, .6), C.goldHi, -12);
      // turning points: first index after the low where each line rises
      const turn = arr => { let lo = Infinity, li = 0; for (let j = off; j < arr.length; j++) if (arr[j] != null && arr[j] < lo) { lo = arr[j]; li = j; } return li - off; };
      const te = turn(VT_EMA), tm = turn(VT_MA), ta = S.at(2, 0, .8);
      const ex_ = ch.x(te), ey_ = ch.y(VT_EMA[te + off]), mx_ = ch.x(tm), my_ = ch.y(VT_MA[tm + off]), tb = S.at(2, .6, .8);
      K.marker(ctx, ex_, ey_, { alpha: ta, pulse: ta > .99 ? (S.t * .7) % 1 : 0 });
      K.dash(ctx, ex_ + 4, ey_ - 14, 1400, 350, { p: ta, alpha: .7, dash: [3, 5] });
      K.text(ctx, 'EMA 先拐头', 1400, 336, { font: F.serif(700, 24), color: C.goldHi, align: 'center', alpha: ta });
      K.marker(ctx, mx_, my_, { alpha: tb, color: C.gold });
      K.dash(ctx, mx_ + 8, my_ + 10, 1520, 690, { p: tb, alpha: .7, dash: [3, 5] });
      K.text(ctx, 'MA 后拐头', 1530, 698, { font: F.serif(700, 24), color: C.gold, alpha: tb });
    } },

  /* ================= 模块二 ================= */
  { id: 'ch2', dur: 4.2, tr: 'sweep', visual: chapter('贰', 2, '万有引力', 'The Gravity of Price', '葛兰威尔 · 回归 · 支撑与阻力 · 八大法则') },

  { id: 'granville', header: H2, tr: ['iris', [620, 470]], camera: { z0: 1.03, z1: 1.0 }, chapter: '模块二：万有引力',
    lines: ['让均线{封神}的，是20世纪华尔街的明星分析师——', '{约瑟夫·葛兰威尔}（Joseph Granville）。', '他的核心哲学：{均线，就是价格的万有引力中心}。'],
    visual(ctx, S) {
      const a = S.at(0, 0, 1.2);
      // the gravity well behind the silhouette: rings pulled toward a centre line
      const ga = S.at(2, 0, 1.2);
      silhouette(ctx, 600, 640, 300, a);
      K.text(ctx, 'ANALYST', 600, 690, { font: F.latin(500, 18), color: C.gray, align: 'center', spacing: 8, alpha: a });
      const na = S.at(1, 0, .9);
      ctx.save(); ctx.beginPath(); ctx.rect(860, 330, 900, 110); ctx.clip();
      K.goldText(ctx, '约瑟夫·葛兰威尔', 880, 420 + (1 - K.expo(na)) * 90, 72, { align: 'left', spacing: 6 });
      ctx.restore();
      K.text(ctx, 'JOSEPH GRANVILLE', 884, 472, { font: F.latin(500, 24), color: C.gold, spacing: 8, alpha: S.at(1, .4, .8) });
      K.text(ctx, '20世纪 · 华尔街明星分析师', 884, 512, { font: F.serif(500, 22), color: C.gray, spacing: 4, alpha: S.at(0, 1.2, .8) });
      // quote + a tiny gravity diagram
      const y0 = 650;
      K.line(ctx, 880, y0, 1640, y0, { p: ga, color: C.goldHi, width: 3, glow: .8 });
      for (let i = 0; i < 7; i++) {
        const x = 920 + i * 110, ph = (S.t * .8 + i * .37) % 1, d = 70 * (1 - ph);
        const al = ga * Math.sin(Math.PI * ph);
        K.arrow(ctx, x, y0 - 22 - d, x, y0 - 12 - d * .3, { alpha: al, color: C.red, width: 1.6, head: 9 });
        K.arrow(ctx, x + 55, y0 + 22 + d, x + 55, y0 + 12 + d * .3, { alpha: al, color: C.green, width: 1.6, head: 9 });
      }
      K.text(ctx, '价格的万有引力中心', 1640, y0 - 104, { font: F.serif(900, 34), color: C.white, align: 'right', alpha: ga, spacing: 4 });
      K.text(ctx, 'MA', 1660, y0 + 8, { font: F.latin(500, 24), color: C.goldHi, alpha: ga, spacing: 3 });
    } },

  { id: 'apple', header: H2, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05, x1: -40 },
    lines: ['就像传说中落在牛顿身边的那颗{苹果}——', '价格冲得再远，也会被拉回{均线}；', '而一触到均线，又像{弹簧}一样被弹开。'],
    visual(ctx, S) {
      // branch
      const ba = S.at(0, 0, .8);
      ctx.save(); ctx.globalAlpha = ba; ctx.strokeStyle = rgba(C.gold, .85); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(360, 262); ctx.quadraticCurveTo(440, 274, 560, 258); ctx.stroke();
      ctx.lineWidth = 1.3;
      for (const [lx, ly, an] of [[400, 270, .5], [455, 271, -.4], [520, 264, .3]]) { ctx.save(); ctx.translate(lx, ly); ctx.rotate(an + Math.sin(S.t + lx) * .06); ctx.beginPath(); ctx.ellipse(16, 10, 18, 7, .5, 0, TAU); ctx.stroke(); ctx.restore(); }
      ctx.restore();
      // MA curve across the stage (schematic rising average) and a ball-price bouncing on it
      const mx = x => 470 + (x - 470), my = x => 640 - (x - 470) * .12 - 18 * Math.sin((x - 470) / 260);
      const maPath = []; for (let x = 300; x <= 1660; x += 10) maPath.push([x, my(x)]);
      const ma = S.at(0, 1.2, 1.2);
      curve(ctx, maPath, ma, { width: 4, glow: .9 });
      K.text(ctx, '均线 MA', 1660, my(1660) - 22, { font: F.serif(700, 22), color: C.goldHi, align: 'right', alpha: S.at(0, 2, .6) });
      // apple falls from the branch to the line (free fall), small settle
      const tf = S.t - S.beat(0) - .4, g = 900, yLand = my(470) - 18;
      let ay = 292; if (tf > 0) ay = Math.min(yLand, 292 + .5 * g * tf * tf);
      const landed = tf > 0 && ay >= yLand;
      const bounceT = landed ? tf - Math.sqrt(2 * (yLand - 292) / g) : 0;
      if (landed) ay = yLand - Math.abs(Math.sin(bounceT * 7)) * 40 * Math.exp(-bounceT * 4);
      const morph = S.at(1, 0, .8);
      if (morph < 1) {
        ctx.save(); ctx.globalAlpha = 1 - morph; ctx.strokeStyle = C.red; ctx.lineWidth = 2.4; ctx.shadowColor = rgba(C.red, .7); ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.arc(462, ay, 15, 0, TAU); ctx.arc(478, ay, 15, 0, TAU); ctx.stroke();
        ctx.strokeStyle = C.gold; ctx.beginPath(); ctx.moveTo(470, ay - 14); ctx.lineTo(474, ay - 28); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(482, ay - 26, 8, 4, -.4, 0, TAU); ctx.stroke(); ctx.restore();
      }
      const fa = S.at(0, .5, .6) * (1 - morph);
      K.arrow(ctx, 540, 300, 540, 420, { p: fa, alpha: fa, color: C.goldHi, width: 1.8 });
      K.text(ctx, '引力', 560, 370, { font: F.serif(700, 22), color: C.goldHi, alpha: fa });
      // price as a bouncing ball over the MA
      const span = 280, X0 = 470, amp = [150, 120, 160, 110, 130];
      const off = x => { const k = Math.floor((x - X0) / span); return Math.abs(Math.sin(Math.PI * (x - X0) / span)) * (amp[k] ?? 100); };
      const run = S.lin(1, .2, S.dur - S.beat(1) - 1.2);
      const xHead = lerp(X0, 1640, run), pp = [];
      for (let x = X0; x <= xHead; x += 6) pp.push([x, my(x) - 18 - off(x)]);
      if (run > 0) {
        dots(ctx, pp, 1, { color: C.white, r: 1.8, gap: 7 });
        const [hx, hy] = pp[pp.length - 1] || [X0, my(X0) - 18];
        ctx.save(); ctx.fillStyle = C.red; ctx.shadowColor = C.red; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(hx, hy, 9, 0, TAU); ctx.fill(); ctx.restore();
        // springs compress at each touch
        for (let k = 1; k <= 4; k++) {
          const tx = X0 + k * span; if (xHead < tx - 70) continue;
          const d = Math.abs(xHead - tx), comp = clamp(1 - d / 70);
          const top = my(tx) - 18 - lerp(56, 6, comp);
          const sa = S.at(2, 0, .6) * (xHead > tx + 70 ? .55 : 1);
          spring(ctx, tx, my(tx) - 2, top, sa);
          K.marker(ctx, tx, my(tx), { alpha: clamp(1 - Math.abs(xHead - tx) / 60) + .25 * (xHead > tx ? 1 : 0), r: 8 });
        }
        // pull-back arrows on the descents
        for (let k = 0; k < 4; k++) {
          const cx = X0 + k * span + span * .72; if (xHead < cx) continue;
          const a = S.at(1, .4, .6);
          K.arrow(ctx, cx + 20, my(cx) - 18 - off(cx) - 30, cx + 20, my(cx) - 40, { alpha: a * .8, color: C.goldHi, width: 1.6, head: 10 });
        }
      }
      K.tag(ctx, 1240, 300, '拉回 · 弹开', { alpha: S.at(2, .4, .7), color: C.gold, font: F.serif(700, 22) });
    } },

  { id: 'rubber', header: H2, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05, x1: 20 },
    lines: ['股价再疯狂，也像被{橡皮筋}拴在均线上：', '偏离越远，拉力越大，', '最终回归均线——也就是市场的{平均成本}。', '所以，远离均线的价格，往往{难以持久}。'],
    visual(ctx, S) {
      const ch = chRB, n = ch.k.length, off = RB.warm;
      const r = S.lin(0, 0, S.beat(2) + 1.6 - S.beat(0)) * n;
      K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, ch.box.y + ch.box.h + 24, { p: S.at(0, 0, 1) });
      ch.draw(ctx, r, { glow: .3 });
      const pts = maPts(ch, RB_MA, off, r);
      curve(ctx, pts, 1, { width: 3.5 });
      // the elastic band between the MA and the latest close
      const j = Math.min(n - 1, Math.max(0, Math.ceil(r) - 1));
      const c = ch.k[j].c, m = RB_MA[j + off], x = ch.x(j) + ch.step * .9;
      const y1 = ch.y(c), y0 = ch.y(m), stretch = clamp(Math.abs(y1 - y0) / 230);
      if (r > 1) {
        const col = mix(C.goldHi, C.red, stretch), wob = Math.sin(S.t * 18) * 6 * stretch;
        ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = lerp(5, 1.4, stretch); ctx.shadowColor = rgba(col, .8); ctx.shadowBlur = 14;
        for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x - 6, y0); ctx.quadraticCurveTo(x + s * (10 + wob), (y0 + y1) / 2, x - 6, y1); ctx.stroke(); }
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x - 6, y0, 4, 0, TAU); ctx.arc(x - 6, y1, 4, 0, TAU); ctx.fill(); ctx.restore();
      }
      // tension meter on the right
      const ma_ = S.at(1, 0, .8);
      const mx = 1660, mt = 330, mb = 700;
      ctx.save(); ctx.globalAlpha = ma_; ctx.strokeStyle = rgba(C.gold, .6); ctx.lineWidth = 1.2; ctx.strokeRect(mx - 14, mt, 28, mb - mt);
      const fh = (mb - mt) * stretch; const gr = ctx.createLinearGradient(0, mb, 0, mt); gr.addColorStop(0, C.goldHi); gr.addColorStop(1, C.red);
      ctx.fillStyle = gr; ctx.shadowColor = rgba(C.red, .6 * stretch); ctx.shadowBlur = 18; ctx.fillRect(mx - 10, mb - fh, 20, fh); ctx.restore();
      K.text(ctx, '拉力', mx, mb + 40, { font: F.serif(700, 22), color: C.goldHi, align: 'center', alpha: ma_ });
      // peak deviation
      let pk = 0, pd = 0; for (let i = 0; i < n; i++) { const d = ch.k[i].c - RB_MA[i + off]; if (d > pd) { pd = d; pk = i; } }
      if (r > 1) K.text(ctx, '偏离', x + 22, (y0 + y1) / 2 + 8, { font: F.serif(700, 24), color: mix(C.goldHi, C.red, stretch), alpha: S.at(1, 0, .6) * clamp(stretch * 4 - .4) });
      const ca = S.at(2, .6, .8);
      if (pts.length) K.tag(ctx, pts[pts.length - 1][0] - 90, pts[pts.length - 1][1] - 84, '均线 ≈ 平均成本', { alpha: ca, color: C.gold });
      K.tag(ctx, ch.x(pk) - 20, ch.y(ch.k[pk].h) - 40, '难以持久', { alpha: S.at(3, .2, .7), color: C.red });
    } },

  { id: 'sr', header: H2, tr: 'zoom', camera: { z0: 1.0, z1: 1.04 },
    lines: ['一旦趋势形成，均线就成了{护城河}：', '上涨时，回踩不破，它是[支撑]；', '下跌时，反弹受阻，它是<阻力>。', '跌破上升的均线，或站上下降的均线，往往是{趋势生变}的信号。'],
    visual(ctx, S) {
      const pair = [[chSUP, SUP, SUP_MA, 1, C.red, '上涨 · 均线在下', '支撑'], [chRES, RES, RES_MA, 2, C.green, '下跌 · 均线在上', '阻力']];
      for (const [ch, d, ma, li, col, title, word] of pair) {
        const r = S.lin(0, (li - 1) * .5, 2.6) * ch.k.length;
        K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, ch.box.y + ch.box.h + 24, { p: S.at(0, 0, 1), step: 40 });
        ch.draw(ctx, r, { glow: .25, dim: () => 1 - (S.after(li) ? 0 : .35) });
        const pts = maPts(ch, ma, d.warm, r);
        curve(ctx, pts, 1, { width: 3.4 });
        K.text(ctx, title, ch.box.x + ch.box.w / 2, 262, { font: F.serif(900, 28), color: col, align: 'center', alpha: S.at(li, 0, .7), glow: .3, glowColor: col });
        // touches: candles whose wick reaches the MA (from the correct side)
        let last = -9, k = 0;
        for (let i = 0; i < ch.k.length; i++) {
          const m = ma[i + d.warm]; if (m == null) continue;
          const touch = li === 1 ? ch.k[i].l <= m + .4 && ch.k[i].c > m - .2 : ch.k[i].h >= m - .4 && ch.k[i].c < m + .2;
          if (!touch || i - last < 3) continue; last = i;
          const a = S.at(li, .4 + k * .3, .6); k++;
          K.marker(ctx, ch.x(i), ch.y(m), { alpha: a, color: col, r: 10, pulse: a > .99 ? (S.t * .8 + k * .3) % 1 : 0 });
          K.arrow(ctx, ch.x(i), ch.y(m) + (li === 1 ? 44 : -44), ch.x(i), ch.y(m) + (li === 1 ? 16 : -16), { alpha: a, color: col, width: 2, head: 10 });
        }
        K.tag(ctx, ch.box.x + ch.box.w / 2, ch.box.y + ch.box.h + 62, word + (li === 1 ? ' SUPPORT' : ' RESISTANCE'), { alpha: S.at(li, .8, .6) * (1 - S.at(3, 0, .5)), color: col });
      }
      K.tag(ctx, 960, 786, '反向穿越均线  →  趋势生变', { alpha: S.at(3, .3, .6), color: C.gold, font: F.serif(700, 22) });
    } },

  { id: 'eight', header: H2, tr: 'zoom', camera: { z0: 1.0, z1: 1.04, y1: -6 },
    lines: ['他总结出流传最广的{葛兰威尔八大买卖法则}：', '均线走平转升，价格上穿、假跌破、回踩不破——[买]；', '均线走平转降，价格下穿、假突破、反弹不过——<卖>；', '离均线太远，则提防{回归}：超跌可买，超涨要卖。'],
    visual(ctx, S) {
      const N = 220, ma = [], pr = [];
      for (let i = 0; i <= N; i++) { const u = i / N; ma.push([GX(u), GMA(u)]); pr.push([GX(u), GMA(u) + goff(u)]); }
      const a0 = S.at(0, 0, 2, easeInOut);
      curve(ctx, ma, a0, { width: 4, glow: .9 });
      dots(ctx, pr, S.at(0, .5, 2.2, easeInOut), { color: C.white, r: 1.8, gap: 7 });
      K.text(ctx, '均线', GX(1) + 12, GMA(1) + 8, { font: F.serif(700, 22), color: C.goldHi, alpha: S.at(0, 2, .6) });
      K.text(ctx, '价格', GX(1) + 12, GMA(1) + goff(1) + 18, { font: F.serif(700, 22), color: C.white, alpha: S.at(0, 2.4, .6) });
      for (const [u, id, zh, buy] of GRULES) {
        const far = id === 'B4' || id === 'S4';
        const li = far ? 3 : (buy ? 1 : 2);
        const order = far ? (buy ? 0 : 1) : ['B1', 'B2', 'B3', 'S1', 'S2', 'S3'].indexOf(id) % 3;
        const a = S.at(li, .2 + order * .55, .6, easeBack);
        if (a <= 0) continue;
        const x = GX(u), y = GMA(u) + goff(u), col = buy ? C.red : C.green;
        const below = buy;                                     // buy labels below the price, sell labels above
        K.marker(ctx, x, y, { alpha: clamp(a), color: col, r: 10, pulse: clamp(a) > .99 ? (S.t * .6 + u) % 1 : 0 });
        const ly = below ? Math.max(y, GMA(u)) + 54 : Math.min(y, GMA(u)) - 46;
        K.tag(ctx, x, ly, `${id} ${zh}`, { alpha: clamp(a), color: col, font: F.serif(700, 18) });
      }
      // legend
      const lg = S.at(0, 1, .8);
      K.text(ctx, '[ 示意 ]', 1640, 250, { font: F.serif(500, 18), color: C.gray, align: 'right', alpha: lg, spacing: 2 });
      K.tag(ctx, 380, 262, '买 · 4', { alpha: S.at(1, 0, .6), color: C.red });
      K.tag(ctx, 500, 262, '卖 · 4', { alpha: S.at(2, 0, .6), color: C.green });
    } },

  /* ================= 模块三 ================= */
  { id: 'ch3', dur: 4.2, tr: 'sweep', visual: chapter('叁', 3, '疯狂往事', 'Sell Everything, 1981', '一条震动华尔街的指令') },

  { id: 'telegraph', header: H3, tr: ['iris', [700, 600]], camera: { z0: 1.04, z1: 1.0 }, chapter: '模块三：疯狂往事',
    lines: ['{1981年1月6日}晚，葛兰威尔向订户发出一条警告：', '{“卖掉一切”}——Sell Everything！', '一条指令，让整个华尔街{屏住了呼吸}。'],
    visual(ctx, S) {
      const t0 = S.beat(0) + .5, kt = S.t - t0;
      let down = 0;
      for (const [s, d] of MORSE) { if (kt >= s && kt < s + d) down = 1; else if (kt >= s + d && kt < s + d + .04) down = 1 - (kt - s - d) / .04; }
      const stamp = S.at(1, 0, .45, easeOut), dimKey = 1 - .7 * S.at(1, 0, .5);
      const ka = S.at(0, 0, .8) * dimKey;
      // telegraph key (line art)
      const bx = 520, by = 640;
      ctx.save(); ctx.globalAlpha = ka; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 2; ctx.shadowColor = rgba(C.gold, .7); ctx.shadowBlur = 10; ctx.fillStyle = 'rgba(14,12,9,.9)';
      ctx.beginPath(); ctx.roundRect(bx - 220, by, 440, 46, 8); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.roundRect(bx - 200, by + 46, 400, 14, 4); ctx.stroke();
      ctx.beginPath(); ctx.rect(bx - 150, by - 54, 34, 54); ctx.fill(); ctx.stroke();                 // pivot post
      ctx.beginPath(); ctx.arc(bx + 120, by - 4, 9, 0, TAU); ctx.stroke();                            // contact
      spring(ctx, bx + 40, by, by - 30 + down * 12, 1);
      ctx.save(); ctx.translate(bx - 133, by - 46); ctx.rotate(.02 + down * .07);
      ctx.beginPath(); ctx.roundRect(0, -8, 330, 16, 6); ctx.fill(); ctx.stroke();                  // lever
      ctx.beginPath(); ctx.ellipse(330, -18, 40, 15, 0, 0, TAU); ctx.fill(); ctx.stroke();           // knob
      ctx.beginPath(); ctx.moveTo(318, -3); ctx.lineTo(318, 8); ctx.moveTo(342, -3); ctx.lineTo(342, 8); ctx.stroke();
      ctx.restore();
      // spark at the contact
      if (down > .5) { ctx.fillStyle = '#FFF2CC'; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 30; ctx.beginPath(); ctx.arc(bx + 120, by - 10, 5, 0, TAU); ctx.fill(); }
      ctx.restore();
      // wire and morse marks travelling to the right
      const wy = by + 23, wx0 = bx + 220, wx1 = 1680, v = 300;
      K.line(ctx, wx0, wy, wx1, wy, { p: S.at(0, 0, 1), color: rgba(C.gold, .5), alpha: ka / Math.max(.01, S.at(0, 0, .8)) });
      ctx.save(); ctx.globalAlpha = ka; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 14;
      for (const [s, d] of MORSE) {
        if (kt < s) break;
        const a = wx0 + Math.max(0, kt - s - d) * v, b = wx0 + (kt - s) * v;
        if (a > wx1) continue;
        ctx.beginPath(); ctx.moveTo(a + 3, wy); ctx.lineTo(Math.min(b, wx1), wy); ctx.stroke();
      }
      ctx.restore();
      K.tag(ctx, 960, 262, '1981.01.06  ·  夜', { alpha: S.at(0, .2, .7), font: F.serif(700, 22) });
      K.text(ctx, '· · ·   ·   · — · ·   · — · ·', 1180, 600, { font: F.latin(500, 26), color: C.gold, align: 'center', spacing: 2, alpha: S.at(0, 1.4, .8) * dimKey });
      K.text(ctx, 'S   E   L   L', 1180, 560, { font: F.latin(500, 20), color: C.gray, align: 'center', spacing: 6, alpha: S.at(0, 1.6, .8) * dimKey });
      // SELL EVERYTHING stamp
      if (stamp > 0) {
        const sc = lerp(1.5, 1, stamp), shake = (1 - S.at(1, .3, .6)) * Math.sin(S.t * 60) * 6;
        ctx.save(); ctx.translate(960 + shake, 470); ctx.scale(sc, sc); ctx.globalAlpha = stamp;
        ctx.font = F.latin(500, 132); ctx.textAlign = 'center'; ctx.letterSpacing = '6px';
        ctx.shadowColor = rgba(C.red, .9); ctx.shadowBlur = 40 + 20 * Math.sin(S.t * 5); ctx.fillStyle = C.red;
        ctx.fillText('SELL EVERYTHING', 0, 0);
        ctx.shadowBlur = 0; ctx.strokeStyle = rgba('#FFD0D0', .5); ctx.lineWidth = 1; ctx.strokeText('SELL EVERYTHING', 0, 0);
        ctx.restore();
        K.text(ctx, '卖  掉  一  切', 960, 560, { font: F.serif(900, 50), color: C.red, align: 'center', alpha: S.at(1, .4, .6), glow: .7, glowColor: C.red, spacing: 6 });
        const hold = S.at(2, 0, 1);
        K.rule(ctx, 960, 610, 420, hold);
      }
    } },

  { id: 'panic', header: H3, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05, y0: -10, y1: 10 },
    lines: ['次日，美股应声{大跌}，', '纽交所成交量创下{当时的纪录}。', '据说，交易系统一度{不堪重负}——恐慌如潮水般蔓延。'],
    visual(ctx, S) {
      const ch = chPANIC, n = PANIC.length, r = S.lin(0, -.3, 3.2) * n;
      const glitch = S.at(2, 0, .5) * (1 - S.at(2, 2.6, 1));
      // falling "sell" rain (abstract)
      const R = K.rng(5), rain = S.at(0, .8, 1.2);
      for (let i = 0; i < 70; i++) {
        const x = 280 + R() * 1360, sp = 160 + R() * 220, ph = R();
        const y = 230 + ((S.t * sp / 600 + ph) % 1) * 560, al = rain * (.12 + R() * .3);
        K.arrow(ctx, x, y - 26, x, y, { alpha: al, color: C.green, width: 1.4, head: 8, glow: false });
      }
      const slices = glitch > .02 ? 7 : 1;
      for (let s = 0; s < slices; s++) {
        ctx.save();
        if (slices > 1) { const y0 = 240 + s * 52; ctx.beginPath(); ctx.rect(0, y0, 1920, 52); ctx.clip(); ctx.translate(Math.sin(S.t * 23 + s * 2.1) * 26 * glitch * (s % 2 ? 1 : -.7), 0); }
        ch.draw(ctx, r, { glow: .4 });
        ctx.restore();
      }
      // volume
      const vb = 780, vh = 150, va = S.at(1, 0, .8);
      K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, vb, { p: S.at(0, 0, 1), step: 40 });
      for (let i = 0; i < n; i++) {
        const g = clamp((r - i)) * va; if (g <= 0) continue;
        const rec = i === 9, h = VOL[i] / 100 * vh * easeOut(g), col = rec ? C.goldHi : (PANIC[i].c >= PANIC[i].o ? C.red : C.green);
        ctx.save(); ctx.fillStyle = rgba(col, rec ? .95 : .55); if (rec) { ctx.shadowColor = C.goldHi; ctx.shadowBlur = 30; }
        ctx.fillRect(ch.x(i) - ch.cw / 2, vb - h, ch.cw, h); ctx.restore();
      }
      K.text(ctx, '成交量', ch.box.x - 14, vb - 8, { font: F.serif(700, 20), color: C.gray, align: 'right', alpha: va });
      K.tag(ctx, ch.x(9) + 150, vb - vh + 10, '当时的纪录', { alpha: S.at(1, .8, .7), color: C.gold, font: F.serif(700, 20) });
      K.line(ctx, ch.x(9) + 14, vb - vh + 6, ch.x(9) + 86, vb - vh + 10, { p: S.at(1, .8, .7), alpha: .8 });
      // overload warning
      const w = glitch * (.6 + .4 * Math.sin(S.t * 14));
      K.tag(ctx, 1400, 280, '系统一度不堪重负', { alpha: w, color: C.green, font: F.serif(700, 22) });
    } },

  { id: 'bull', header: H3, tr: 'zoom', camera: { z0: 1.0, z1: 1.06, x0: 30, x1: -40 },
    lines: ['然而，神话随后破灭：美股不久便开启了{超级大牛市}，', '价格沿着[上升的均线]一路向上。', '他却长期坚持<看空>——据报道，不少追随者损失惨重。', '再响亮的预言，也敌不过{趋势}本身。'],
    visual(ctx, S) {
      const ch = chBULL, n = ch.k.length, r = S.lin(0, 0, S.beat(2) + 1 - S.beat(0)) * n;
      K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, ch.box.y + ch.box.h + 24, { p: S.at(0, 0, 1) });
      const glow = S.at(1, 0, 1);
      if (glow > 0) { const g = ctx.createLinearGradient(0, ch.box.y + ch.box.h, 0, ch.box.y); g.addColorStop(0, rgba(C.red, 0)); g.addColorStop(1, rgba(C.red, .09 * glow)); ctx.fillStyle = g; ctx.fillRect(ch.box.x, ch.box.y, ch.box.w, ch.box.h); }
      ch.draw(ctx, r, { glow: .3 });
      const pts = maPts(ch, BULL_MA, BULL.warm, r);
      curve(ctx, pts, 1, { width: 3.6 });
      maLabel(ctx, pts, 'MA', S.at(1, 0, .6), C.goldHi, 30);
      // the bear call, fading as the market climbs
      const bear = S.at(0, .4, .7) * (1 - .85 * S.at(2, .8, 2.4));
      const bx = 520, by = 330;
      K.tag(ctx, bx, by, '看空 · BEARISH CALL', { alpha: bear, color: C.green, font: F.serif(700, 22) });
      K.arrow(ctx, bx, by + 26, bx, by + 120, { alpha: bear, color: C.green, width: 2.6, p: S.at(0, .8, .8) });
      const x = S.at(2, 1.4, .6);
      K.line(ctx, bx - 110, by - 20, bx + 110, by + 20, { p: x, color: C.gray, width: 2, alpha: .8 });
      K.tag(ctx, 1460, 300, '超级大牛市', { alpha: S.at(1, .6, .7), color: C.red, font: F.serif(700, 22) });
      const tr = S.at(3, 0, 1);
      if (tr > 0) curve(ctx, pts, 1, { width: 6, alpha: tr * (.5 + .3 * Math.sin(S.t * 3)), glow: 1, blur: 30 });
      K.tag(ctx, 1240, 620, '预言  <  趋势', { alpha: S.at(3, .3, .7), color: C.gold, font: F.serif(700, 24) });
    } },

  /* ================= 结语 / RECAP ================= */
  { id: 'recap', header: H4, tr: 'sweep', camera: { z0: 1.06, z1: .98 }, chapter: '结语：潮水与洋流',
    lines: ['K线，是容易激动的{潮水}；', '均线，是深沉的{洋流}。', '潮水涌得再高，最终也要向洋流{低头}。'],
    visual(ctx, S) {
      const calm = S.at(1, 0, S.beat(2) + 2 - S.beat(1), easeInOut), amp = lerp(1, .12, calm);
      const n = 52, bx = 260, step = 1400 / n, base = 430;
      const cl = [], ks = [];
      let prev = base;
      for (let i = 0; i < n; i++) {
        const w = Math.sin(i * .45 - S.t * 2.2) * 70 + Math.sin(i * 1.3 + S.t * 1.4) * 34 + Math.sin(i * 2.9 - S.t * 3.1) * 16;
        const c = base - 40 * Math.sin(i * .06) + w * amp;
        const o = prev, h = Math.min(o, c) - (8 + Math.abs(Math.sin(i * 7.1 + S.t * 3)) * 22) * amp, l = Math.max(o, c) + (8 + Math.abs(Math.cos(i * 5.3 + S.t * 2.6)) * 22) * amp;
        ks.push({ o: -o, c: -c, h: -h, l: -l }); cl.push(c); prev = c;
      }
      const sink = S.at(2, .4, 2, easeInOut);
      const reveal = S.at(0, -.6, 1.6);
      for (let i = 0; i < n; i++) K.candle(ctx, bx + step * (i + .5), ks[i], v => -v, { w: step * .55, alpha: reveal * (1 - .55 * calm), grow: clamp(reveal * 1.6 - i * .01), glow: .4 * amp });
      const m = sma(cl, 8), pts = m.map((v, i) => v == null ? null : [bx + step * (i + .5), v]).filter(Boolean);
      curve(ctx, pts, S.at(1, 0, 1.6, easeInOut), { width: 4, head: 5, glow: .9 });
      K.text(ctx, '潮水  TIDE', 300, 260, { font: F.serif(700, 24), color: C.white, alpha: S.at(0, .4, .7) * (1 - .6 * calm), spacing: 4 });
      // the deep current
      const ca = S.at(1, .6, 1.4);
      if (ca > 0) {
        const cy = lerp(700, 690, sink);
        const g = ctx.createLinearGradient(0, cy - 70, 0, cy + 70);
        g.addColorStop(0, rgba(C.gold, 0)); g.addColorStop(.5, rgba(C.gold, .16 * ca)); g.addColorStop(1, rgba(C.gold, 0));
        ctx.fillStyle = g; ctx.fillRect(260, cy - 70, 1400, 140);
        for (let k = 0; k < 7; k++) {
          const yy = cy - 48 + k * 16, sp = 60 + k * 9, ph = (S.t * sp) % 70;
          const line = []; for (let x = 260; x <= 1660; x += 20) line.push([x, yy + Math.sin(x * .006 + k + S.t * .4) * 6]);
          ctx.save(); ctx.globalAlpha = ca * (.25 + .5 * Math.sin(Math.PI * (k + .5) / 7));
          ctx.strokeStyle = C.goldHi; ctx.lineWidth = 1.4; ctx.setLineDash([26, 44]); ctx.lineDashOffset = -ph; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 8;
          ctx.beginPath(); line.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); ctx.restore();
        }
        K.text(ctx, '洋流  CURRENT', 1640, cy + 104, { font: F.serif(700, 24), color: C.goldHi, align: 'right', alpha: ca, spacing: 4 });
        // the tide bows to the current: light threads from the MA down into the stream
        const bow = S.at(2, .2, 1.2);
        for (let i = 4; i < pts.length; i += 6) K.dash(ctx, pts[i][0], pts[i][1] + 12, pts[i][0], cy - 40, { p: bow, alpha: .35 * bow, dash: [2, 6] });
      }
    } },

  { id: 'summary', tr: 'dissolve', camera: { z0: 1.03, z1: 1.0 },
    lines: ['均线，用数学的冷静{过滤}了人性的狂热。', '但请记住：工具永远只是{路标}，', '盲目迷信任何神话，都会被{市场}吞噬。'],
    visual(ctx, S) {
      const rows = [['壹', '起源', '麦田 · 火箭 · 移动平均', C.goldHi], ['贰', '引力', '回归 · 支撑 · 阻力', C.red], ['叁', '镜鉴', '工具只是路标', C.green]];
      rows.forEach(([n, a, b, col], i) => {
        const p = S.at(i, 0, .9), y = 330 + i * 140;
        ctx.save(); ctx.globalAlpha = p; ctx.translate((1 - p) * -60, 0);
        K.goldText(ctx, n, 560, y + 22, 64, { weight: 900 });
        K.text(ctx, a, 680, y + 18, { font: F.serif(900, 48), color: C.white });
        K.line(ctx, 820, y, 1010, y, { p, color: rgba(C.gold, .6) });
        K.text(ctx, b, 1040, y + 16, { font: F.serif(700, 38), color: col, glow: .4, glowColor: col });
        ctx.restore();
      });
      K.rule(ctx, 960, 760, 420, S.at(2, .8, 1.2));
    } },

  { id: 'end', dur: 5.5, tr: 'zoom', noWatermark: true,
    visual(ctx, S) {
      const a = S.p(.2, 1.2), s = 54;
      ctx.save(); ctx.translate(960, 470); const z = lerp(.92, 1, easeOut(S.t / 2)); ctx.scale(z, z);
      const L = document.getElementById('logo'), lw = 760, lh = lw * L.naturalHeight / L.naturalWidth;   // the channel's own logo
      ctx.globalAlpha = a; ctx.shadowColor = rgba(C.goldHi, .35); ctx.shadowBlur = 40;
      ctx.drawImage(L, -lw / 2, -lh / 2, lw, lh); ctx.shadowBlur = 0;
      const sw = clamp((S.t - 1.0) / 1.4);                            // one light sweep across the mark
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.beginPath(); ctx.rect(-lw / 2, -lh / 2, lw, lh); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(-lw / 2 - 120, lw / 2 + 120, sw), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        g.addColorStop(0, 'rgba(255,236,190,0)'); g.addColorStop(.5, 'rgba(255,236,190,.22)'); g.addColorStop(1, 'rgba(255,236,190,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, -lh / 2, 180, lh); ctx.restore();
      }
      ctx.restore();
      K.rule(ctx, 960, 560, 340, S.p(.8, 1.4));
      K.text(ctx, '趋势指挥官：均线', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(1.2, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.6, 1) });
    } },
  ],
};
})();

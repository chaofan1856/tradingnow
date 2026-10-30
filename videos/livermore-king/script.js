/* ============================================================
   《华尔街投机之王利弗莫尔》 — content for the TradingNow film engine (index.html)

   A scene:
     { id, header?, lines?: [subtitle markup], visual?(ctx, S, K), tr?: transition into this scene,
       camera?: {z0,z1,x0,x1,y0,y1}, dur?: fixed seconds, noWatermark? }
   Subtitle markup:  {金色重点}  [红色/多头]  <绿色/空头>
   S (scene clock):  S.t, S.at(line, delay, dur) → eased 0..1, S.lin(...), S.p(sec, dur), S.beat(line)
   Transitions:      'zoom' | ['push', ±1] | 'sweep' | ['iris', [x,y]] | 'dissolve'

   Cut to the supplied track (≈ 58 s): loud intro → open/title/导言 · breakdown → 模块一 ·
   build → 模块二 · drop → 模块三 · the track's last bar → logo page.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, rgba, mix, F } = K;

/* the portrait (assets/portrait.jpg, supplied with the earlier Livermore film) — added to the page so
   the engine's ASSETS_READY waits for it like the logo */
const PHOTO = new Image(); PHOTO.src = 'assets/portrait.jpg'; PHOTO.hidden = true; document.body.appendChild(PHOTO);

/* header presets */
const H0 = { label: '导言', sub: '人物画像', en: 'Portrait of a Speculator', zh: '《投机之王》' };
const H1 = { label: '模块', num: 1, sub: '四落四起 · 坐等法则', en: 'Four Falls, Four Rises', zh: '《坐等的法则》' };
const H2 = { label: '模块', num: 2, sub: '1929 · 做空美国', en: 'Shorting the Crash', zh: '《逆流而上》' };
const H3 = { label: '模块', num: 3, sub: '毁灭于人性 · 永恒于历史', en: 'Human Nature', zh: '《永恒的灯塔》' };

/* ---------- shared visual pieces ---------- */
const easeBack = x => { x = clamp(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

/** chapter card: 壹/贰/叁 → title → subtitle, with the gold rule (timed for a 2.6 s card) */
function chapter(numCn, idx, title, en, sub) {
  return (ctx, S) => {
    const cx = 960, k = .72;                                            // the house card, paced to the track
    const a = S.p(0.1 * k, 1.0 * k);
    K.text(ctx, `MODULE · 0${idx}`, cx, 300, { font: F.latin(500, 20), color: C.gold, align: 'center', spacing: 9, alpha: S.p(0.05, .8) });
    ctx.save(); ctx.translate(cx, 470); const s = lerp(1.25, 1, easeOut(S.t / 1.4)); ctx.scale(s, s);
    K.goldText(ctx, numCn, 0, 0, 84, { alpha: a, glow: .8 + .2 * Math.sin(S.t * 2) });
    ctx.restore();
    K.rule(ctx, cx, 535, 280, S.p(0.6 * k, 1.2 * k));
    ctx.save(); ctx.beginPath(); ctx.rect(0, 548, 1920, 100); ctx.clip();
    const tp = S.p(0.9 * k, 1.1 * k, K.expo);
    K.text(ctx, title, cx, 625 + (1 - tp) * 70, { font: F.serif(900, 44), color: C.white, align: 'center', spacing: 12, alpha: tp });
    ctx.restore();
    K.text(ctx, en.toUpperCase(), cx, 690, { font: F.latin(500, 20), color: C.gray, align: 'center', spacing: 7, alpha: S.p(1.5 * k, .8) });
    K.text(ctx, sub, cx, 752, { font: F.serif(500, 22), color: C.gray, align: 'center', spacing: 6, alpha: S.p(1.8 * k, .8) });
  };
}

/** the photo, toned to the film (warm monochrome), cropped from source rect s into dest rect d */
function photo(ctx, d, s, o = {}) {
  if (!PHOTO.naturalWidth || (o.alpha ?? 1) <= .002) return;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.beginPath(); ctx.rect(d.x, d.y, d.w, d.h); ctx.clip();
  ctx.filter = `grayscale(1) sepia(${o.sepia ?? .38}) brightness(${o.b ?? .9}) contrast(1.12)`;
  ctx.drawImage(PHOTO, s.x, s.y, s.w, s.h, d.x, d.y, d.w, d.h);
  ctx.filter = 'none';
  const v = ctx.createRadialGradient(d.x + d.w / 2, d.y + d.h * .42, Math.min(d.w, d.h) * .25, d.x + d.w / 2, d.y + d.h / 2, Math.max(d.w, d.h) * .72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${o.vig ?? .7})`);
  ctx.fillStyle = v; ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.restore();
}
/** source rect of the photo: zoom z around focus (fx,fy) at the dest aspect */
function crop(z, fx, fy, aspect) {
  const W0 = PHOTO.naturalWidth || 1077, H0_ = PHOTO.naturalHeight || 1437;
  let w = W0 / z, h = w / aspect; if (h > H0_ / z) { h = H0_ / z; w = h * aspect; }
  return { x: clamp(fx * W0 - w / 2, 0, W0 - w), y: clamp(fy * H0_ - h / 2, 0, H0_ - h), w, h };
}
/** thin gold frame with corner ticks */
function frame(ctx, x, y, w, h, a) {
  if (a <= .002) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = rgba(C.gold, .7); ctx.lineWidth = 1.2; ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = C.goldHi; ctx.lineWidth = 2; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 10;
  for (const [cx, cy, sx, sy] of [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(cx + sx * 26, cy - sy * 8); ctx.lineTo(cx - sx * 8, cy - sy * 8); ctx.lineTo(cx - sx * 8, cy + sy * 26); ctx.stroke();
  }
  ctx.restore();
}
/** a soft burst ring (impact moments) */
function ring(ctx, x, y, p, col = C.goldHi, R = 140) {
  if (p <= 0 || p >= 1) return;
  ctx.save(); ctx.strokeStyle = rgba(col, .8 * (1 - p)); ctx.lineWidth = 2.2 * (1 - p) + .5; ctx.shadowColor = col; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(x, y, 12 + easeOut(p) * R, 0, 6.2832); ctx.stroke(); ctx.restore();
}

/* ---------- data ---------- */
// 模块一: a fortune that is built and lost four times
const LIFE = K.gen.path([6, 52, 5, 72, 6, 92, 7, 112, 6, 88], { per: [4, 2, 4, 2, 4, 2, 4, 2, 3], seed: 21, noise: .35, wick: .35 });
const LBOX = { x: 420, y: 300, w: 1160, h: 430 };
const chartLIFE = new K.Chart(LIFE.candles, LBOX, { lo: 0, hi: 122 });
// 坐等: chop vs. trend
const CHOP = K.gen.path([100, 104, 99, 103.5, 98.5, 102.5, 97.5, 101.5, 96.5, 99.5], { per: 3, seed: 31, noise: 1.1, wick: .8 });
const TREND = K.gen.path([96, 100, 97.5, 112, 108, 126, 121, 141], { per: [3, 2, 4, 2, 4, 2, 4], seed: 32, noise: .4 });
const chartCHOP = new K.Chart(CHOP.candles, { x: 300, y: 410, w: 560, h: 250 });
const chartTREND = new K.Chart(TREND.candles, { x: 1060, y: 410, w: 560, h: 250 });
// 1929: the bubble, then the crash
const BUB = K.gen.path([100, 118, 112, 135, 128, 158, 150, 172], { per: [3, 2, 3, 2, 3, 2, 3], seed: 41, noise: .4 });
const CR = K.gen.seq(BUB.candles[BUB.candles.length - 1].c, [[-16, 2, 5], [-24, 3, 7], [-9, 4, 6], [7, 4, 2], [-19, 2, 6], [-13, 3, 5]]);
const nBUB = BUB.candles.length, K29 = [...BUB.candles, ...CR];
const CBOX = { x: 260, y: 300, w: 860, h: 430 };
const chart29 = new K.Chart(K29, CBOX);
const peak29 = K29.reduce((m, k, i) => k.h > K29[m].h ? i : m, 0);

window.FILM = {
  title: '华尔街投机之王利弗莫尔',
  transition: 1.1,
  fontScale: 1.55,
  subtitle: { x: 220, y: 912, size: 42, maxW: 1480 },     // 42 × FS 1.55 = 65px
  timing: { perChar: .095, base: .5, minLine: 1.8, pre: .3, post: .3 },   // paced to the 1-minute track
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', dur: 4.4, camera: { z0: 1.08, z1: 1.0 }, lines: ['华尔街没有{新事物}，', '因为投机像{山岳}一样古老。'],
    visual(ctx, S) {
      // a tape of gold price dots streams in, then condenses into candles that stand like a mountain range
      const N = 150, R2 = K.rng(5);
      const ridge = u => .55 * Math.exp(-(((u - .18) / .09) ** 2)) + .86 * Math.exp(-(((u - .43) / .1) ** 2)) + 1.0 * Math.exp(-(((u - .62) / .08) ** 2)) + .62 * Math.exp(-(((u - .84) / .08) ** 2));
      const pts = []; let w = 0;
      for (let i = 0; i < N; i++) { w = w * .85 + (R2() - .5) * 14; pts.push([180 + i * 10.4, 700 - ridge(i / N) * 380 + w]); }
      const reveal = S.lin(0, -.3, 1.9);
      K.baseline(ctx, 180, 1740, 740, { p: S.at(0, 0, 1.4), step: 52, alpha: .9 });
      for (let i = 0; i < N * reveal; i++) {
        const [x, y] = pts[i];
        const cond = S.at(1, .1 + i * .003, .7);
        const gx = 180 + Math.floor(i / 6) * 62.4 + 31;
        ctx.fillStyle = rgba(C.goldHi, .85 - cond * .5); ctx.shadowColor = C.gold; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(lerp(x, gx, cond), y, 1.8, 0, 6.2832); ctx.fill();
      }
      ctx.shadowBlur = 0;
      const ca = S.at(1, .7, 1.0);
      const tops = [];
      if (ca > 0) for (let g = 0; g < N / 6; g++) {
        const seg = pts.slice(g * 6, g * 6 + 6), ys = seg.map(q => q[1]);
        const k = { o: -seg[0][1], c: -seg[5][1], h: -Math.min(...ys), l: -Math.max(...ys) };
        K.candle(ctx, 180 + g * 62.4 + 31, k, v => -v, { w: 26, alpha: ca, grow: clamp(ca * 1.6 - g * .02), glow: .4 });
        tops.push([180 + g * 62.4 + 31, Math.min(...ys) - 18]);
      }
      if (tops.length) K.dotted(ctx, tops, S.lin(1, 1.1, 1.2), { alpha: .85, gap: 8 });     // the ridge line: a mountain
    } },

  /* ================= TITLE ================= */
  { id: 'title', dur: 3.8, tr: 'zoom', camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const cx = 960;
      const bg = K.gen.path([100, 108, 103, 114, 109, 121, 115, 128], { per: 6, seed: 3 });
      const ch = new K.Chart(bg.candles, { x: 120, y: 200, w: 1680, h: 640 });
      ch.draw(ctx, S.lin(0, -.2, 2.6) * bg.candles.length, { alpha: .16, glow: 0, color: () => C.gold });
      K.text(ctx, 'JESSE  LIVERMORE', cx, 384, { font: F.latin(500, 22), color: C.gold, align: 'center', spacing: 12, alpha: S.p(.2, 1.0) });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 405, 1920, 160); ctx.clip();
      const tp = S.p(.35, 1.2, K.expo);
      K.goldText(ctx, '投机之王', cx, 528 + (1 - tp) * 110, 72, { spacing: 24 });
      ctx.restore();
      const sw = clamp((S.t - 1.4) / 1.1);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(620, 1300, sw), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,240,200,.28)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, 410, 180, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 330, S.p(1.0, 1.2));
      K.text(ctx, '华尔街唯一的投机之王 · 杰西·利弗莫尔', cx, 650, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 6, alpha: S.p(1.5, 1.0) });
    } },

  /* ================= 导言 · 人物画像 ================= */
  { id: 'intro', header: H0, tr: ['iris', [500, 500]], camera: { z0: 1.0, z1: 1.04, x1: -16 },
    lines: ['他说：“市场没有新事物，因为{人性永不改变}。”', '他用一生，与人性玩了一场{最极致的游戏}。'],
    visual(ctx, S) {
      // portrait, revealed by a vertical mask, slow push-in on the face
      const d = { x: 300, y: 236, w: 400, h: 534 }, rv = S.p(0, 1.1, easeInOut);
      ctx.save(); ctx.beginPath(); const hh = d.h * rv; ctx.rect(d.x - 20, d.y + (d.h - hh) / 2, d.w + 40, hh); ctx.clip();
      photo(ctx, d, crop(lerp(1.0, 1.12, S.t / S.dur), .5, .38, d.w / d.h));
      ctx.restore();
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.5, .8));
      K.text(ctx, '1877 — 1940', d.x + d.w / 2, d.y + d.h - 22, { font: F.latin(500, 18), color: C.goldHi, align: 'center', spacing: 6, alpha: S.p(.9, .8) });
      // name block
      const x0 = 800, nm = S.p(.25, .9);
      K.text(ctx, '杰西·利弗莫尔', x0, 318 + (1 - nm) * 20, { font: F.serif(900, 40), color: C.white, alpha: nm, spacing: 4 });
      K.text(ctx, 'JESSE LIVERMORE', x0 + 2, 362, { font: F.latin(500, 19), color: C.gray, spacing: 6, alpha: S.p(.5, .8) });
      K.tag(ctx, x0, 410, '华尔街投机之王', { align: 'left', alpha: S.p(.7, .7), color: C.gold });
      // the quote (line 0)
      const q = S.at(0, .3, .8);
      K.text(ctx, '“', x0 - 6, 545, { font: F.latin(500, 64), color: C.gold, alpha: q * .9 });
      K.rich(ctx, '市场没有新事物，', { x: x0 + 70, y: 510, size: 30, weight: 700, t: S.t - S.beat(0) - .3, anchorTop: true });
      K.rich(ctx, '因为{人性永不改变}。', { x: x0 + 70, y: 572, size: 30, weight: 700, t: S.t - S.beat(0) - .7, anchorTop: true });
      K.line(ctx, x0, 612, x0 + 760, 612, { p: q, color: rgba(C.gold, .4) });
      // the game (line 1): him ⟷ human nature, a tug that never settles
      const g = S.at(1, 0, .8);
      if (g > 0) {
        const y = 690, xa = 880, xb = 1500, knot = 1190 + Math.sin((S.t - S.beat(1)) * 3.2) * 70;
        K.tag(ctx, xa, y, '利弗莫尔', { alpha: g, color: C.gold });
        K.tag(ctx, xb, y, '人  性', { alpha: g, color: C.gold });
        K.dotted(ctx, [[xa + 80, y], [xb - 70, y]], g, { gap: 8 });
        K.marker(ctx, knot, y, { alpha: S.at(1, .4, .6), r: 8, pulse: clamp(((S.t - S.beat(1)) % 1.2) / 1.2) });
        K.text(ctx, '一生的博弈', 1190, y + 66, { font: F.serif(700, 22), color: C.goldHi, align: 'center', spacing: 6, alpha: S.at(1, .6, .7) });
      }
    } },

  /* ================= 模块一 ================= */
  { id: 'ch1', dur: 2.6, tr: 'sweep', visual: chapter('壹', 1, '四落四起', 'Four Falls · Four Rises', '十四岁入市 · 四次破产 · 坐等法则') },

  { id: 'life', header: H1, tr: ['iris', [960, 520]], camera: { z0: 1.02, z1: 1.06, x1: -24 },
    lines: ['{14岁}，他揣着{5美金}离家出走，闯荡华尔街。', '一生经历<四次破产>，又[四次东山再起]。'],
    visual(ctx, S) {
      const ch = chartLIFE, n = LIFE.candles.length;
      const reveal = S.lin(0, .2, S.beat(1) + 1.6 - .2) * n;
      K.baseline(ctx, LBOX.x, LBOX.x + LBOX.w, LBOX.y + LBOX.h + 30, { p: S.at(0, 0, 1) });
      ch.draw(ctx, reveal, { glow: .4 });
      // the start: 14 years old, five dollars
      const s0 = S.at(0, .2, .8), x0 = ch.x(0), y0 = ch.y(LIFE.candles[0].l);
      K.goldText(ctx, '14岁', 370, 640, 40, { align: 'right', alpha: s0 });
      K.text(ctx, '揣着 5 美金', 370, 692, { font: F.serif(700, 22), color: C.white, align: 'right', alpha: S.at(0, .6, .7) });
      K.text(ctx, '1891 · 入市', 370, 730, { font: F.latin(500, 18), color: C.gray, align: 'right', spacing: 3, alpha: S.at(0, .8, .7) });
      K.dash(ctx, 382, 680, x0 - 14, y0, { p: S.at(0, .5, .6), alpha: .7, dash: [3, 6] });
      K.marker(ctx, x0, y0, { alpha: S.at(0, .5, .6), r: 8 });
      // every crash and every comeback is marked the moment its candle lands
      let falls = 0, rises = 0;
      LIFE.swings.forEach((s, j) => {
        const a = clamp((reveal - s.i - .6) / .8); if (a <= 0) return;
        const x = ch.x(s.i);
        if (s.type === 'L') {
          falls++;
          K.marker(ctx, x, ch.y(s.price) + 14, { alpha: a, r: 9, color: C.green, label: `破产 ${falls}`, pos: 'below', font: F.serif(700, 20) });
          ring(ctx, x, ch.y(s.price) + 14, clamp((reveal - s.i - .6) / 1.6), C.green, 80);
        } else if (j > 0) {
          rises++;
          K.text(ctx, '再起', x, ch.y(s.price) - 22, { font: F.serif(700, 20), color: C.red, align: 'center', alpha: a });
        }
      });
      // running count (line 1)
      const ca = S.at(1, 0, .6);
      K.tag(ctx, 860, 250, `四次破产  ${falls} / 4`, { alpha: ca, color: C.green });
      K.tag(ctx, 1140, 250, `东山再起  ${rises} / 4`, { alpha: ca, color: C.red });
    } },

  { id: 'sit', header: H1, tr: ['push', 1], camera: { z0: 1.0, z1: 1.04 },
    lines: ['交了无数血本后，他悟出最伟大的交易法则：', '赚大钱不靠{频繁操作}，而靠耐心{坐等}趋势明朗。'],
    visual(ctx, S) {
      // the rule, as he wrote it
      K.text(ctx, '“钱是坐着赚来的，而不是靠操作赚来的。”', 960, 262, { font: F.serif(700, 26), color: C.goldHi, align: 'center', alpha: S.at(0, .9, .8), glow: .5 });
      const pa = S.at(0, 0, .9, easeBack), lose = S.at(1, .1, .8), win = S.at(1, .9, .8);
      const panels = [[270, '频繁操作', 'OVERTRADING'], [1030, '坐等趋势', 'SITTING TIGHT']];
      panels.forEach(([x, zh, en], i) => {
        ctx.save(); ctx.globalAlpha = clamp(pa) * (i === 0 ? 1 - lose * .55 : 1); ctx.translate(0, (1 - clamp(pa)) * 40);
        ctx.strokeStyle = rgba(C.gold, .3); ctx.lineWidth = 1; ctx.strokeRect(x, 310, 620, 450);
        if (i === 1 && win > 0) { ctx.strokeStyle = rgba(C.goldHi, .9 * win); ctx.lineWidth = 2; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 22 * win; ctx.strokeRect(x, 310, 620, 450); ctx.shadowBlur = 0; }
        K.text(ctx, zh, x + 310, 362, { font: F.serif(900, 28), color: i === 0 ? C.white : C.goldHi, align: 'center', spacing: 4 });
        K.text(ctx, en, x + 310, 394, { font: F.latin(500, 15), color: C.gray, align: 'center', spacing: 5 });
        ctx.restore();
      });
      // left: in and out on every wiggle
      const rL = S.lin(0, .3, 2.2) * CHOP.candles.length;
      ctx.save(); ctx.globalAlpha = 1 - lose * .55;
      chartCHOP.draw(ctx, rL, { glow: .25 });
      CHOP.candles.forEach((k, i) => {
        if (i % 2 || i > rL - 1) return;
        const buy = (i / 2) % 2 === 0, x = chartCHOP.x(i), y = buy ? chartCHOP.y(k.l) + 22 : chartCHOP.y(k.h) - 22, s = 8;
        ctx.fillStyle = buy ? C.red : C.green; ctx.beginPath();
        if (buy) { ctx.moveTo(x, y - s); ctx.lineTo(x - s, y + s * .7); ctx.lineTo(x + s, y + s * .7); } else { ctx.moveTo(x, y + s); ctx.lineTo(x - s, y - s * .7); ctx.lineTo(x + s, y - s * .7); }
        ctx.fill();
      });
      K.text(ctx, '来回折腾 · 越做越亏', 580, 722, { font: F.serif(700, 20), color: C.green, align: 'center', alpha: S.at(0, 1.6, .7) });
      ctx.restore();
      // right: one entry, then sit
      const rR = S.lin(0, .5, 2.4) * TREND.candles.length, ct = chartTREND;
      ct.draw(ctx, rR, { glow: .4 });
      const e = S.at(0, .9, .6), last = TREND.candles.length - 1;
      K.marker(ctx, ct.x(1), ct.y(TREND.candles[1].l) + 16, { alpha: e, r: 8, color: C.red, label: '买入', pos: 'below', font: F.serif(700, 18) });
      K.bracket(ctx, ct.x(1), ct.x(last), 690, '耐心持有', { up: false, p: S.at(1, .9, .8), font: F.serif(700, 20) });
      K.marker(ctx, ct.x(last), ct.y(TREND.candles[last].h) - 14, { alpha: S.at(1, 1.3, .6), r: 9, label: '大钱', pos: 'left', font: F.serif(700, 20), color: C.goldHi, pulse: clamp(((S.t - S.beat(1)) % 1.4) / 1.4) });
      // the verdict: a cross over overtrading
      const x = S.at(1, .1, .6);
      if (x > 0) {
        ctx.save(); ctx.strokeStyle = rgba(C.gray, .85); ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(500, 470); ctx.lineTo(lerp(500, 660, x), lerp(470, 630, x));
        if (x > .5) { const y2 = clamp((x - .5) * 2); ctx.moveTo(660, 470); ctx.lineTo(lerp(660, 500, y2), lerp(470, 630, y2)); }
        ctx.stroke(); ctx.restore();
      }
    } },

  /* ================= 模块二 ================= */
  { id: 'ch2', dur: 2.6, tr: 'sweep', visual: chapter('贰', 2, '做空美国', 'Shorting the Crash', '1929 · 逆流而上 · 一日一亿') },

  { id: 'crash', header: H2, post: .77, tr: ['iris', [690, 520]], camera: { z0: 1.0, z1: 1.05, x1: -16 },
    lines: ['1929年大崩溃前夕，他调集全部资金{做空美国}。', '当全美陷入<绝望>，他逆流而上——', '[一天狂赚1亿美金]，富可敌国！', '他证明了：没有[牛市]<熊市>，只有{正确的方向}。'],
    visual(ctx, S) {
      const ch = chart29, n = K29.length;
      const r = S.lin(0, 0, S.beat(1) - .2) * nBUB + S.lin(1, 0, 1.4, easeOut) * (n - nBUB);
      const sh = r > nBUB ? Math.sin(S.t * 37) * 4 * (1 - S.at(2, 0, .8)) : 0;    // the floor gives way
      ctx.save(); ctx.translate(sh, sh * .4);
      K.baseline(ctx, CBOX.x, CBOX.x + CBOX.w, CBOX.y + CBOX.h + 30, { p: S.at(0, 0, 1) });
      K.text(ctx, '1929', CBOX.x, CBOX.y + CBOX.h + 66, { font: F.latin(500, 20), color: C.gray, spacing: 4, alpha: S.at(0, .2, .8) });
      K.text(ctx, '道琼斯指数 · 示意', CBOX.x + CBOX.w, CBOX.y + CBOX.h + 66, { font: F.serif(500, 16), color: C.gray, align: 'right', alpha: S.at(0, .2, .8) });
      ch.draw(ctx, r, { glow: .4 });
      // the bet: everything, short, at the top
      const pk = clamp((r - peak29 - .5) / .8), px = ch.x(peak29), py = ch.y(K29[peak29].h);
      K.marker(ctx, px, py - 14, { alpha: pk, r: 10, label: '泡沫顶点', pos: 'left', font: F.serif(700, 20) });
      const sa = Math.min(S.at(0, 1.6, .7), clamp((r - peak29 - 1) / .6)) * (1 - S.at(3, 0, .6));
      K.tag(ctx, px + 70, py + 20, '全仓做空 SHORT', { alpha: sa, color: C.green, align: 'left' });
      K.arrow(ctx, px + 150, py + 48, px + 150, py + 150, { p: sa, alpha: sa, color: C.green, width: 3 });
      // the crash
      const cr = S.at(1, .4, .7);
      if (cr > 0) {
        const lx = ch.x(n - 3), ly = ch.y(K29[n - 1].l);
        K.text(ctx, '大崩溃', lx, ly + 52, { font: F.serif(900, 26), color: C.green, align: 'center', alpha: cr, glow: .4, glowColor: C.green });
        ring(ctx, ch.x(nBUB + 1), ch.y(K29[nBUB + 1].c), S.lin(1, .2, 1.2), C.green, 160);
      }
      ctx.restore();
      // one day, one hundred million (line 2)
      const m = S.at(2, 0, 1.2), mo = 1 - S.at(3, 0, .4);
      if (m > 0 && mo > 0) {
        const v = Math.round(easeOut(clamp((S.t - S.beat(2)) / 1.3)) * 100000000);
        const str = '+$' + v.toLocaleString('en-US');
        ctx.save(); ctx.globalAlpha = mo;
        K.goldText(ctx, str, 1430, 470, 40, { alpha: clamp(m * 2), glow: 1.2 });
        K.text(ctx, '一天 · 1亿美金', 1430, 540, { font: F.serif(900, 30), color: C.red, align: 'center', alpha: S.at(2, .6, .6), glow: .5, glowColor: C.red });
        K.text(ctx, '富可敌国', 1430, 600, { font: F.serif(500, 22), color: C.gray, align: 'center', spacing: 10, alpha: S.at(2, 1.0, .6) });
        ctx.restore();
        ring(ctx, 1430, 450, S.lin(2, 1.2, 1.0), C.goldHi, 220);
      }
      // no bull, no bear — only direction (line 3)
      const d = S.at(3, .45, .7);
      if (d > 0) {
        const cx = 1430, cy = 520, Rr = 120;
        K.tag(ctx, cx - 100, 330, '牛市', { alpha: d, color: C.red });
        K.tag(ctx, cx + 100, 330, '熊市', { alpha: d, color: C.green });
        const st = S.at(3, .7, .5);
        K.line(ctx, cx - 140, 330, cx - 60, 330, { p: st, color: C.white, width: 2.5, alpha: d });
        K.line(ctx, cx + 60, 330, cx + 140, 330, { p: st, color: C.white, width: 2.5, alpha: d });
        ctx.save(); ctx.globalAlpha = d; ctx.strokeStyle = rgba(C.gold, .6); ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, 6.2832); ctx.stroke();
        for (let i = 0; i < 24; i++) { const a = i / 24 * 6.2832, l = i % 6 ? 6 : 14; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * Rr, cy + Math.sin(a) * Rr); ctx.lineTo(cx + Math.cos(a) * (Rr - l), cy + Math.sin(a) * (Rr - l)); ctx.stroke(); }
        ctx.restore();
        // the needle swings, then settles on the way the market is actually going
        const u = clamp((S.t - S.beat(3) - .5) / 1.6), target = .62;
        const ang = target + Math.sin(u * 14) * (1 - easeOut(u)) * 1.4 - (1 - u) * 1.2;
        K.arrow(ctx, cx - Math.cos(ang) * 70, cy - Math.sin(ang) * 70, cx + Math.cos(ang) * (Rr - 18), cy + Math.sin(ang) * (Rr - 18), { alpha: d, color: C.goldHi, width: 3.2, head: 20 });
        K.text(ctx, '正确的方向', cx, cy + Rr + 64, { font: F.serif(900, 28), color: C.goldHi, align: 'center', spacing: 6, alpha: S.at(3, 1.0, .6), glow: .6 });
      }
    } },

  /* ================= 模块三 ================= */
  { id: 'ch3', dur: 2.6, tr: 'sweep', visual: chapter('叁', 3, '败给人性', 'Human Nature', '毁灭于人性 · 永恒于历史') },

  { id: 'fall', header: H3, tr: ['iris', [640, 470]], camera: { z0: 1.0, z1: 1.05, x0: 10, x1: -20 },
    lines: ['然而赢了世界的他，最终败给了无法战胜的{抑郁}。', '1940年，他饮弹自尽。', '绝笔：“{我的一生是一场失败}。”'],
    visual(ctx, S) {
      // a street lamp in the rain, a lone figure walking away
      const lx = 520, a0 = S.p(0, 1.0), flick = .85 + .15 * Math.sin(S.t * 23) * Math.sin(S.t * 7.3);
      ctx.save(); ctx.globalAlpha = a0;
      const cone = ctx.createRadialGradient(lx + 60, 300, 10, lx + 60, 520, 460);
      cone.addColorStop(0, rgba(C.goldHi, .22 * flick)); cone.addColorStop(1, rgba(C.goldHi, 0));
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(lx + 40, 300); ctx.lineTo(lx + 80, 300); ctx.lineTo(lx + 330, 760); ctx.lineTo(lx - 210, 760); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = rgba(C.gold, .55); ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(lx, 760); ctx.lineTo(lx, 290); ctx.quadraticCurveTo(lx, 270, lx + 30, 270); ctx.lineTo(lx + 60, 270); ctx.stroke();
      ctx.fillStyle = rgba(C.goldHi, .9 * flick); ctx.shadowColor = C.goldHi; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.moveTo(lx + 42, 274); ctx.lineTo(lx + 78, 274); ctx.lineTo(lx + 72, 298); ctx.lineTo(lx + 48, 298); ctx.closePath(); ctx.fill();
      ctx.shadowBlur = 0;
      // wet street: baseline + the lamp's reflection
      K.baseline(ctx, 220, 1000, 762, { p: 1, step: 48 });
      const refl = ctx.createLinearGradient(0, 764, 0, 840); refl.addColorStop(0, rgba(C.goldHi, .12 * flick)); refl.addColorStop(1, rgba(C.goldHi, 0));
      ctx.fillStyle = refl; ctx.fillRect(lx - 40, 764, 160, 76);
      // the figure: hat, long coat, walking slowly out of the light
      const fx = lerp(700, 830, S.t / S.dur), step = Math.sin(S.t * 3.4);
      ctx.save(); ctx.translate(fx, 762);
      ctx.fillStyle = '#060504'; ctx.strokeStyle = rgba(C.goldHi, .38); ctx.lineWidth = 1.4;
      const body = new Path2D();
      body.moveTo(-6, -232); body.quadraticCurveTo(-34, -226, -40, -196); body.lineTo(-50, -70); body.lineTo(-38 + step * 4, -64);
      body.lineTo(-30 + step * 10, 0); body.lineTo(-18 + step * 10, 0); body.lineTo(-10, -60); body.lineTo(6, -60); body.lineTo(16 - step * 10, 0); body.lineTo(28 - step * 10, 0);
      body.lineTo(36, -66); body.lineTo(46, -70); body.lineTo(38, -196); body.quadraticCurveTo(30, -226, 8, -232); body.closePath();
      ctx.fill(body); ctx.stroke(body);
      ctx.beginPath(); ctx.arc(1, -250, 17, 0, 6.2832); ctx.fill();                                   // head
      ctx.beginPath(); ctx.ellipse(1, -262, 32, 6, 0, 0, 6.2832); ctx.fill(); ctx.stroke();            // hat brim
      ctx.beginPath(); ctx.moveTo(-17, -263); ctx.lineTo(-14, -286); ctx.quadraticCurveTo(1, -294, 16, -286); ctx.lineTo(19, -263); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
      ctx.restore();
      // rain over everything
      const R3 = K.rng(77);
      ctx.save(); ctx.strokeStyle = rgba(C.white, .16 * a0); ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 170; i++) {
        const x0 = R3() * 2100 - 90, sp = 700 + R3() * 500, ph = R3(), L = 18 + R3() * 26;
        const y = ((ph + S.t * sp / 900) % 1) * 760 + 240, x = x0 - y * .18;
        if (x < 200 || x > 1720) continue;
        ctx.moveTo(x, y); ctx.lineTo(x - L * .18, y + L);
      }
      ctx.stroke(); ctx.restore();
      // line 0: he won the world, and lost to himself
      const t0 = S.at(0, .4, .7) * (1 - S.at(2, 0, .5));
      K.text(ctx, '赢了世界', 1300, 420, { font: F.serif(900, 40), color: C.goldHi, align: 'center', spacing: 8, alpha: t0, glow: .5 });
      K.text(ctx, '败给抑郁', 1300, 540, { font: F.serif(900, 40), color: C.gray, align: 'center', spacing: 8, alpha: S.at(0, 1.1, .7) * (1 - S.at(2, 0, .5)) });
      K.arrow(ctx, 1300, 448, 1300, 478, { p: S.at(0, .9, .5), alpha: t0 * .8, color: C.gray, width: 2 });
      // line 1: the last note
      const nt = S.at(2, .1, .9);
      if (nt > 0) {
        const x = 1030, y = 330 + (1 - nt) * 30, w = 560, h = 330;
        ctx.save(); ctx.globalAlpha = nt;
        ctx.fillStyle = 'rgba(20,16,10,.82)'; ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = rgba(C.gold, .6); ctx.lineWidth = 1.2; ctx.strokeRect(x, y, w, h);
        ctx.restore();
        K.text(ctx, '1940 · 绝笔', x + 40, y + 62, { font: F.serif(700, 20), color: C.gray, spacing: 6, alpha: nt });
        K.rich(ctx, '“我的一生', { x: x + 40, y: y + 152, size: 36, weight: 900, t: S.t - S.beat(2) - .4, stagger: .08 });
        K.rich(ctx, '是一场{失败}。”', { x: x + 74, y: y + 232, size: 36, weight: 900, t: S.t - S.beat(2) - .8, stagger: .08 });
        K.text(ctx, '— J. L.', x + w - 40, y + h - 26, { font: `italic ${F.latin(500, 20)}`, color: C.gold, align: 'right', alpha: S.at(2, 1.5, .6) });
      }
    } },

  { id: 'legacy', header: H3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.06 },
    lines: ['财富烟消云散，他用生命换来的语录却成了{灯塔}。', '“你能战胜市场，但你永远{无法战胜人性}。”'],
    visual(ctx, S) {
      const cx = 960, by = 560;
      // the fortune: a stack of gold bars that blows away as dust
      const gone = S.at(0, .7, 1.2, easeInOut), R4 = K.rng(31), inA = S.p(.45, .5);
      for (let row = 0; row < 4; row++) for (let j = 0; j < 4 - row; j++) {
        const x = cx - (4 - row) * 52 + j * 104 + 52, y = by - row * 40;
        const a = 1 - clamp(gone * 1.6 - (row * .15 + j * .05));
        if (a <= 0) continue;
        ctx.save(); ctx.globalAlpha = a * inA * (1 - S.at(1, 0, .5)); const g = ctx.createLinearGradient(0, y - 34, 0, y);
        g.addColorStop(0, '#F5DFA0'); g.addColorStop(1, '#8A6A2E'); ctx.fillStyle = g; ctx.shadowColor = rgba(C.gold, .5); ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.roundRect(x - 46, y - 34, 92, 34, 3); ctx.fill(); ctx.restore();
      }
      for (let i = 0; i < 160; i++) {                                     // …and drifts up into nothing
        const sx = cx - 200 + R4() * 400, sy = by - R4() * 160, d = R4(), u = clamp(gone * 1.4 - d * .4);
        if (u <= 0 || u >= 1) continue;
        ctx.fillStyle = rgba(C.goldHi, .8 * (1 - u)); ctx.beginPath(); ctx.arc(sx + Math.sin(u * 6 + d * 9) * 40 + u * 160 * (d - .5), sy - u * 300, 1.6, 0, 6.2832); ctx.fill();
      }
      // the lighthouse: a beam that keeps sweeping from where the fortune stood
      const lb = S.at(0, 1.5, .8) * (1 - S.at(1, 0, .45));
      if (lb > 0) {
        const ang = -Math.PI / 2 + Math.sin((S.t - S.beat(0) - 1.5) * 1.1) * .9;
        ctx.save(); ctx.beginPath(); ctx.rect(200, 240, 1520, 600); ctx.clip(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(cx, by - 40); ctx.rotate(ang);
        const g = ctx.createLinearGradient(0, 0, 640, 0); g.addColorStop(0, rgba(C.goldHi, .34 * lb)); g.addColorStop(1, rgba(C.goldHi, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(640, -110); ctx.lineTo(640, 110); ctx.lineTo(0, 6); ctx.fill();
        ctx.restore();
        ctx.save(); ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 30 * lb; ctx.globalAlpha = lb; ctx.beginPath(); ctx.arc(cx, by - 40, 7, 0, 6.2832); ctx.fill(); ctx.restore();
        K.text(ctx, '灯  塔', cx, by + 56, { font: F.serif(900, 30), color: C.goldHi, align: 'center', spacing: 10, alpha: lb * S.at(0, 1.8, .6) });
      }
      // line 1: the eyes — the close-up the film ends on
      const ey = S.at(1, .4, 1.1, easeInOut);
      if (ey > 0) {
        const d = { x: 360, y: 300, w: 1200, h: 330 };
        ctx.save(); ctx.beginPath(); const ww = d.w * ey; ctx.rect(cx - ww / 2, d.y, ww, d.h); ctx.clip();
        photo(ctx, d, crop(lerp(2.0, 2.2, S.at(1, 0, 3, x => x)), .515, .335, d.w / d.h), { vig: .85, b: .86 });
        ctx.restore();
        frame(ctx, d.x, d.y, d.w, d.h, S.at(1, 1.0, .8));
        K.goldText(ctx, '毁灭于人性 · 永恒于历史', cx, 728, 34, { alpha: S.at(1, 1.2, .8), spacing: 8 });
      }
    } },

  /* ================= RECAP & END ================= */
  { id: 'recap', dur: 3.4, tr: 'dissolve', camera: { z0: 1.03, z1: 1.0 },
    visual(ctx, S) {
      const rows = [['壹', '坐等', '钱是坐着赚来的', C.red], ['贰', '方向', '没有牛熊，只有方向', C.goldHi], ['叁', '人性', '永远无法战胜', C.green]];
      K.text(ctx, 'THREE LESSONS FROM LIVERMORE', 960, 256, { font: F.latin(500, 18), color: C.gold, align: 'center', spacing: 9, alpha: S.p(.1, .8) });
      rows.forEach(([n, a, b, col], i) => {
        const p = S.p(.25 + i * .35, .8), y = 380 + i * 140;
        ctx.save(); ctx.globalAlpha = p; ctx.translate((1 - p) * -60, 0);
        K.goldText(ctx, n, 560, y + 22, 64, { weight: 900 });
        K.text(ctx, a, 680, y + 18, { font: F.serif(900, 48), color: C.white });
        K.line(ctx, 860, y, 1010, y, { p, color: rgba(C.gold, .6) });
        K.text(ctx, b, 1040, y + 16, { font: F.serif(700, 38), color: col, glow: .4, glowColor: col });
        ctx.restore();
      });
      K.rule(ctx, 960, 770, 420, S.p(1.3, 1.0));
    } },

  { id: 'end', dur: 4.6, tr: 'zoom', noWatermark: true,
    visual(ctx, S) {
      const a = S.p(.2, 1.1);
      ctx.save(); ctx.translate(960, 470); const z = lerp(.92, 1, easeOut(S.t / 2)); ctx.scale(z, z);
      const L = document.getElementById('logo'), lw = 760, lh = lw * L.naturalHeight / L.naturalWidth;   // the channel's own logo
      ctx.globalAlpha = a; ctx.shadowColor = rgba(C.goldHi, .35); ctx.shadowBlur = 40;
      ctx.drawImage(L, -lw / 2, -lh / 2, lw, lh); ctx.shadowBlur = 0;
      const sw = clamp((S.t - .9) / 1.3);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.beginPath(); ctx.rect(-lw / 2, -lh / 2, lw, lh); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(-lw / 2 - 120, lw / 2 + 120, sw), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        g.addColorStop(0, 'rgba(255,236,190,0)'); g.addColorStop(.5, 'rgba(255,236,190,.22)'); g.addColorStop(1, 'rgba(255,236,190,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, -lh / 2, 180, lh); ctx.restore();
      }
      ctx.restore();
      K.rule(ctx, 960, 560, 340, S.p(.7, 1.2));
      K.text(ctx, '华尔街投机之王利弗莫尔 · 完', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 6, alpha: S.p(1.0, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.4, 1) });
    } },
  ],
};
})();

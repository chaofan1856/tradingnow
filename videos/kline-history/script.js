/* ============================================================
   《K线图的前世今生》 — content for the TradingNow film engine (index.html)

   A scene:
     { id, header?, lines?: [subtitle markup], visual(ctx, S, K), tr?: transition into this scene,
       camera?: {z0,z1,x0,x1,y0,y1}, dur?: fixed seconds, noWatermark?, chapter?: YouTube chapter name }
   Subtitle markup:  {金色重点}  [红色/多头]  <绿色/空头>
   S (scene clock):  S.t, S.at(line, delay, dur) → eased 0..1, S.lin(...), S.p(sec, dur), S.beat(line)
   Transitions:      'zoom' | ['push', ±1] | 'sweep' | ['iris', [x,y]] | 'dissolve'
   All imagery is original geometry drawn with ctx + K: no photos, covers, logos or portraits.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, rgba, mix, F } = K;
const R = K.rng(1730);
const TAU = Math.PI * 2;

/* header presets */
const H0 = { label: '导言', sub: '全球金融的统一语言', en: 'A Universal Language', zh: '《K线图的前世今生》' };
const H1 = { label: '模块', num: 1, sub: '大米、赌徒与最早的期货', en: 'Rice & the First Futures', zh: '《堂岛米市》' };
const H2 = { label: '模块', num: 2, sub: '酒田之神与《三猿金泉录》', en: 'The God of Sakata', zh: '《酒田战法》' };
const H3 = { label: '模块', num: 3, sub: '华尔街的东方启蒙', en: 'Candlesticks Go West', zh: '《破圈》' };
const H4 = { label: '模块', num: 4, sub: '红绿颠倒的有趣博弈', en: 'Red Up, Green Up', zh: '《红与绿》' };
const H5 = { label: '结语', sub: '照亮人性迷宫的蜡烛', en: 'A Candle in the Maze', zh: '《K线图的前世今生》' };

/* ---------- shared visual pieces ---------- */
const easeBack = x => { x = clamp(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

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

/** dark glass panel with a gold hairline */
function panel(ctx, x, y, w, h, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0.002) return;
  const col = o.color || C.gold;
  ctx.save(); ctx.globalAlpha *= a;
  ctx.fillStyle = o.fill || 'rgba(16,13,9,.82)';
  if (o.glow) { ctx.shadowColor = rgba(col, o.glow); ctx.shadowBlur = 28; }
  ctx.beginPath(); ctx.roundRect(x, y, w, h, o.r ?? 8); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = rgba(col, o.line ?? .45); ctx.lineWidth = o.lw || 1.2; ctx.stroke();
  ctx.restore();
}

/** vertical (top-to-bottom) text */
function vtext(ctx, str, x, y, o = {}) {
  const s = o.size || 26;
  [...str].forEach((ch, i) => K.text(ctx, ch, x, y + i * s * FS() * 1.05, { font: F.serif(o.weight || 700, s), color: o.color || C.white, align: 'center', alpha: o.alpha ?? 1, glow: o.glow, glowColor: o.glowColor }));
}

/** a straw rice bale (tawara), flat-colour; ghost = dashed outline only */
function bale(ctx, x, y, s = 1, o = {}) {
  const a = o.alpha ?? 1; if (a <= 0.002) return;
  const w = 70 * s, h = 40 * s;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
  if (o.ghost) {
    ctx.setLineDash([5, 5]); ctx.strokeStyle = rgba(C.goldHi, .85); ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.stroke(); ctx.restore(); return;
  }
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#DCC28A'); g.addColorStop(.55, '#B8924E'); g.addColorStop(1, '#7C5D27');
  ctx.fillStyle = g; ctx.shadowColor = rgba(C.gold, o.glow ?? .35); ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.roundRect(-w / 2, -h / 2, w, h, h / 2); ctx.fill(); ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(58,40,14,.85)'; ctx.lineWidth = 2.2 * s;
  for (const fx of [-.27, 0, .27]) { ctx.beginPath(); ctx.moveTo(fx * w, -h / 2 + 2); ctx.lineTo(fx * w, h / 2 - 2); ctx.stroke(); }
  ctx.fillStyle = '#EAD6A4';
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx * (w / 2 - h * .2), 0, h * .15, h * .4, 0, 0, TAU); ctx.fill(); }
  ctx.restore();
}

/** a flat-bottomed cargo boat with a square sail and rice bales on deck */
function boat(ctx, x, y, s, a, t) {
  if (a <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y + Math.sin(t * 1.8) * 3); ctx.rotate(Math.sin(t * 1.3) * .012); ctx.scale(s, s);
  ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.moveTo(-20, -12); ctx.lineTo(-20, -232); ctx.stroke();                       // mast
  ctx.fillStyle = 'rgba(236,230,217,.10)';                                                           // sail
  ctx.beginPath(); ctx.rect(-112, -222, 184, 132); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rgba(C.gold, .45); ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(-112 + i * 36.8, -222); ctx.lineTo(-112 + i * 36.8, -90); ctx.stroke(); }
  for (const [bx, by] of [[-110, -34], [-40, -34], [30, -34], [100, -34], [-75, -70], [-5, -70], [65, -70]]) bale(ctx, bx, by, .95);
  ctx.fillStyle = '#21180D'; ctx.strokeStyle = C.gold; ctx.lineWidth = 1.8;                          // hull
  ctx.beginPath(); ctx.moveTo(-180, -14); ctx.lineTo(170, -14); ctx.quadraticCurveTo(205, -18, 222, -46);
  ctx.lineTo(196, 18); ctx.quadraticCurveTo(0, 34, -160, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = rgba(C.gold, .5); ctx.beginPath(); ctx.moveTo(-168, 2); ctx.quadraticCurveTo(0, 14, 200, 0); ctx.stroke();
  ctx.restore();
}

/** stylised exchange hall: platform → pillars → lower roof → upper storey → sign (p: 0..1 build) */
function hall(ctx, x, y, s, p, a = 1) {
  if (p <= 0 || a <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  const st = k => clamp(p * 5 - k);
  ctx.strokeStyle = C.gold; ctx.lineWidth = 1.7; ctx.lineJoin = 'round';
  const shape = (alpha, fn) => { if (alpha <= 0) return; ctx.save(); ctx.globalAlpha *= alpha; ctx.fillStyle = '#1B140C'; ctx.shadowColor = rgba(C.gold, .45); ctx.shadowBlur = 10; ctx.beginPath(); fn(); ctx.fill(); ctx.stroke(); ctx.restore(); };
  shape(st(0), () => { ctx.rect(-240, -26, 480, 26); });
  if (st(1) > 0) {
    ctx.save(); ctx.globalAlpha *= st(1); ctx.fillStyle = 'rgba(241,213,151,.06)'; ctx.fillRect(-200, -170, 400, 144);
    for (let i = 0; i < 6; i++) { const px = -190 + i * 76; ctx.beginPath(); ctx.moveTo(px, -26); ctx.lineTo(px, -26 - 144 * st(1)); ctx.stroke(); }
    ctx.restore();
  }
  shape(st(2), () => { ctx.moveTo(-285, -158); ctx.quadraticCurveTo(-232, -170, -205, -214); ctx.lineTo(205, -214); ctx.quadraticCurveTo(232, -170, 285, -158); ctx.closePath(); });
  shape(st(3), () => { ctx.rect(-125, -268, 250, 54); });
  shape(st(3), () => { ctx.moveTo(-195, -258); ctx.quadraticCurveTo(-160, -268, -140, -306); ctx.lineTo(140, -306); ctx.quadraticCurveTo(160, -268, 195, -258); ctx.closePath(); });
  if (st(4) > 0) {                                                                                  // a cloth sign with "米"
    ctx.save(); ctx.globalAlpha *= st(4);
    ctx.fillStyle = 'rgba(200,52,58,.85)'; ctx.fillRect(-46, -150, 92, 100);
    ctx.restore();
    K.text(ctx, '米', 0, -82, { font: F.serif(900, 52), color: C.white, align: 'center', alpha: st(4) });
  }
  ctx.restore();
}

/** anonymous bust silhouette with a gold rim light (no face, no likeness) */
function silhouette(ctx, x, y, s, a) {
  if (a <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(s, s);
  const body = () => {
    ctx.beginPath();
    ctx.moveTo(-230, 0); ctx.bezierCurveTo(-222, -120, -150, -170, -62, -186); ctx.lineTo(-40, -218);
    ctx.lineTo(40, -218); ctx.lineTo(62, -186); ctx.bezierCurveTo(150, -170, 222, -120, 230, 0); ctx.closePath();
    ctx.moveTo(72, -292); ctx.ellipse(0, -292, 72, 86, 0, 0, TAU);
    ctx.moveTo(40, -384); ctx.ellipse(6, -384, 34, 11, -.12, 0, TAU);                                  // top-knot
  };
  const g = ctx.createLinearGradient(0, -400, 0, 0); g.addColorStop(0, '#16110A'); g.addColorStop(1, '#0A0806');
  ctx.fillStyle = g; ctx.shadowColor = rgba(C.goldHi, .55); ctx.shadowBlur = 30; body(); ctx.fill();
  ctx.shadowBlur = 0; ctx.strokeStyle = rgba(C.goldHi, .75); ctx.lineWidth = 1.6; body(); ctx.stroke();
  ctx.strokeStyle = rgba(C.gold, .55); ctx.lineWidth = 1.4;                                            // kimono collar
  ctx.beginPath(); ctx.moveTo(-62, -186); ctx.lineTo(18, -40); ctx.moveTo(62, -186); ctx.lineTo(-10, -70); ctx.stroke();
  ctx.restore();
}

/** a stab-bound book (closed): plain dark board, vertical title slip — abstract, not a real cover */
function wahon(ctx, cx, cy, w, h, title, a) {
  if (a <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= a;
  const x = cx - w / 2, y = cy - h / 2;
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#2A2013'); g.addColorStop(1, '#130E08');
  ctx.fillStyle = g; ctx.shadowColor = rgba(C.gold, .4); ctx.shadowBlur = 34; ctx.fillRect(x, y, w, h); ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba(C.gold, .7); ctx.lineWidth = 1.4; ctx.strokeRect(x, y, w, h);
  ctx.strokeStyle = rgba(C.goldHi, .7); ctx.lineWidth = 1.2;                                          // binding stitches on the right edge
  for (let i = 0; i < 4; i++) { const sy = y + h * (.14 + i * .24); ctx.beginPath(); ctx.arc(x + w - 20, sy, 2.4, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + w - 20, sy); ctx.lineTo(x + w, sy); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(x + w - 20, y); ctx.lineTo(x + w - 20, y + h); ctx.stroke();
  ctx.fillStyle = 'rgba(236,230,217,.09)'; ctx.fillRect(x + 22, y + 22, 52, h * .66);
  ctx.strokeStyle = rgba(C.gold, .55); ctx.strokeRect(x + 22, y + 22, 52, h * .66);
  ctx.restore();
  vtext(ctx, title, x + 48, y + 66, { size: 30, color: C.white, alpha: a });
}

/** a western hardback (abstract): spine depth + title text only */
function hardback(ctx, cx, cy, w, h, a) {
  if (a <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= a;
  const x = cx - w / 2, y = cy - h / 2, d = 26;
  ctx.fillStyle = '#0F0C08'; ctx.strokeStyle = rgba(C.gold, .55); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w + d, y + d * .6); ctx.lineTo(x + w + d, y + h + d * .6); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x, y + h); ctx.lineTo(x + d, y + h + d * .6); ctx.lineTo(x + w + d, y + h + d * .6); ctx.lineTo(x + w, y + h); ctx.closePath(); ctx.fill(); ctx.stroke();
  const g = ctx.createLinearGradient(x, y, x + w, y + h); g.addColorStop(0, '#2B2215'); g.addColorStop(1, '#16110A');
  ctx.fillStyle = g; ctx.shadowColor = rgba(C.gold, .45); ctx.shadowBlur = 36; ctx.fillRect(x, y, w, h); ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba(C.gold, .75); ctx.strokeRect(x, y, w, h); ctx.strokeRect(x + 14, y + 14, w - 28, h - 28);
  ctx.restore();
  K.text(ctx, '日本蜡烛图技术', cx, cy - 34, { font: F.serif(900, 30), color: C.goldHi, align: 'center', spacing: 2, alpha: a, glow: .3 });
  K.rule(ctx, cx, cy, 90, a);
  K.text(ctx, 'STEVE NISON', cx, cy + 46, { font: F.latin(500, 20), color: C.white, align: 'center', spacing: 4, alpha: a });
  K.text(ctx, '1991', cx, cy + 112, { font: F.latin(500, 26), color: C.gold, align: 'center', spacing: 6, alpha: a });
}

/** candle flame (teardrop) whose base sits at (x, y) */
function flame(ctx, x, y, w, h, t, a) {
  if (a <= 0.002) return;
  const fl = 1 + .07 * Math.sin(t * 13) + .04 * Math.sin(t * 23.7), sw = Math.sin(t * 5.3) * w * .14;
  ctx.save(); ctx.globalAlpha *= a; ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(x, y - h * .4, 0, x, y - h * .4, h * 2.6);
  halo.addColorStop(0, 'rgba(255,214,140,.30)'); halo.addColorStop(.4, 'rgba(229,160,70,.10)'); halo.addColorStop(1, 'rgba(229,160,70,0)');
  ctx.fillStyle = halo; ctx.fillRect(x - h * 2.6, y - h * 3, h * 5.2, h * 5.2);
  ctx.restore();
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createRadialGradient(x, y - h * .28, 0, x, y - h * .4, h * .9);
  g.addColorStop(0, '#FFFBEA'); g.addColorStop(.3, '#FCE3A0'); g.addColorStop(.7, '#E9A445'); g.addColorStop(1, 'rgba(214,96,40,.75)');
  ctx.fillStyle = g; ctx.shadowColor = 'rgba(255,200,110,.9)'; ctx.shadowBlur = 40;
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.bezierCurveTo(x - w, y - h * .22, x - w * .55 + sw, y - h * .68, x + sw * 1.6, y - h * fl);
  ctx.bezierCurveTo(x + w * .55 + sw, y - h * .68, x + w, y - h * .22, x, y); ctx.fill();
  ctx.restore();
}

/** OHLC bar (western bar chart) */
function ohlc(ctx, x, k, y, o = {}) {
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1; ctx.strokeStyle = o.color || C.white; ctx.lineWidth = o.lw || 2;
  if (o.glow) { ctx.shadowColor = rgba(C.goldHi, o.glow); ctx.shadowBlur = 12; }
  const g = o.grow ?? 1, hi = lerp((k.o + k.c) / 2, k.h, g), lo = lerp((k.o + k.c) / 2, k.l, g), tw = o.tw || 11;
  ctx.beginPath(); ctx.moveTo(x, y(hi)); ctx.lineTo(x, y(lo)); ctx.stroke();
  if (g > .5) { ctx.beginPath(); ctx.moveTo(x - tw, y(k.o)); ctx.lineTo(x, y(k.o)); ctx.moveTo(x, y(k.c)); ctx.lineTo(x + tw, y(k.c)); ctx.stroke(); }
  ctx.restore();
}

/** a pixel-space candle (top/bottom of body, wick ends) */
function pxCandle(ctx, x, top, bot, hi, lo, w, col, a = 1, glow = .45) {
  if (a <= 0.002) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.shadowColor = rgba(col, glow); ctx.shadowBlur = 22;
  ctx.strokeStyle = col; ctx.lineWidth = Math.max(2, w * .07);
  ctx.beginPath(); ctx.moveTo(x, hi); ctx.lineTo(x, lo); ctx.stroke();
  ctx.fillStyle = col; ctx.fillRect(x - w / 2, top, w, Math.max(bot - top, 3)); ctx.restore();
}

/* ---------- data ---------- */
const randPath = (seed, n, up) => { const r = K.rng(seed), w = [100]; for (let i = 1; i < n; i++) w.push(w[i - 1] + (i % 2 ? 1 : -1) * (4 + r() * 6) + (up ? 2.2 : -.6)); return K.gen.path(w, { per: 3, seed, noise: .6 }); };
const SCREENS = Array.from({ length: 6 }, (_, i) => randPath(40 + i, 6, i % 3 !== 1).candles);
const PHONE = randPath(77, 6, true).candles;
const TICKER = (() => { const r = K.rng(31); let s = ''; for (let i = 0; i < 26; i++) { const v = (r() * 9000 + 100).toFixed(2), c = ((r() - .45) * 6).toFixed(2); s += `${v}  ${c > 0 ? '+' : ''}${c}%     `; } return s; })();

const NODES = [['纽约', -74, 41], ['伦敦', 0, 51], ['法兰克福', 8.7, 50], ['东京', 139.7, 35.7], ['上海', 121.5, 31.2], ['新加坡', 103.8, 1.3], ['悉尼', 151, -33.9], ['圣保罗', -46.6, -23.5]];

const SANZAN = K.gen.path([100, 117, 107, 120.5, 106, 118, 97], { per: [3, 2, 3, 2, 3, 3], seed: 61, noise: .4, wick: .5 });
const SANSEN = K.gen.path([121, 103, 113, 101, 112, 102.5, 120], { per: [3, 2, 3, 2, 3, 3], seed: 62, noise: .4, wick: .5 });
const chSANZAN = new K.Chart(SANZAN.candles, { x: 280, y: 330, w: 600, h: 400 });
const chSANSEN = new K.Chart(SANSEN.candles, { x: 1040, y: 330, w: 600, h: 400 });
const SANKU = K.gen.seq(100, [[1.4, .3, .3], [1.6, .3, .2], [1.5, .3, .2], [1.7, .3, .2], [1.3, .3, .2]]).map((k, i) => { const d = i * 1.2; return { o: k.o + d, c: k.c + d, h: k.h + d, l: k.l + d }; });
const SANPEI = K.gen.seq(100, [[1.6, .3, .3], [1.7, .3, .3], [1.8, .3, .3]]);
const SANPO = K.gen.seq(100, [[3.2, .3, .3], [-.6, .3, .3], [-.6, .3, .3], [-.5, .3, .3], [3.4, .4, .3]]);

const BARS = K.gen.path([100, 109, 104, 113, 106, 116], { per: [4, 2, 4, 3, 3], seed: 21, noise: .6, wick: .7 });
const chBAR = new K.Chart(BARS.candles, { x: 290, y: 320, w: 580, h: 250 });
const chCDL = new K.Chart(BARS.candles, { x: 1050, y: 320, w: 580, h: 410 });

const BOARD = K.gen.path([100, 106, 103, 110, 107, 115, 112, 119], { per: [3, 2, 3, 2, 3, 2, 3], seed: 33, noise: .5 });
const ROWS = [['样本 01', '18.36', 2.41], ['样本 02', '7.92', 1.15], ['样本 03', '42.10', -0.83], ['样本 04', '3.57', 3.62]];

const EDOCH = K.gen.path([100, 108, 102, 111, 104, 114], { per: 3, seed: 15, noise: .5 }).candles;
const SAKATA = K.gen.seq(100, [[2.2, .8, .6], [1.4, 1.2, .5], [-1.8, .6, 1.2], [2.6, .5, .7], [-.9, 1.4, .8], [1.9, .6, .5], [-2.4, .9, 1.1], [3.0, .7, .6]]);
const FINALE = randPath(91, 8, true).candles;
const MAZE = (() => { const r = K.rng(404), segs = []; const x0 = 280, y0 = 240, s = 60;
  for (let i = 0; i < 23; i++) for (let j = 0; j < 10; j++) { const x = x0 + i * s, y = y0 + j * s; if (r() < .5) segs.push([x, y, x + s, y]); else segs.push([x, y, x, y + s]); }
  return segs; })();

window.FILM = {
  title: 'K线图的前世今生',
  transition: 1.1,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },   // 48 × FS 1.75 = 84px: readable at first glance on a phone
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', camera: { z0: 1.06, z1: 1.0, x0: 20, x1: -10 },
    lines: ['华尔街的大屏、加密市场的盘口、你手机上的行情——', '密密麻麻，全是同一种[红]<绿>{K线}。', '它从哪里来？又为何能{通行全球}？'],
    visual(ctx, S) {
      const q = S.at(2, 0, .9);
      ctx.save(); ctx.globalAlpha *= 1 - .7 * q;
      const t = S.t, aW = S.at(0, -.3, .9), aB = S.at(0, 1.0, .9), aP = S.at(0, 2.1, .9), one = S.at(1, .2, 1.2);
      // wall of screens
      for (let i = 0; i < 6; i++) {
        const c = i % 3, r = Math.floor(i / 3), x = 190 + c * 300, y = 240 + r * 220, a = clamp(aW * 1.5 - i * .1);
        if (a <= 0) continue;
        const fl = .82 + .18 * Math.sin(t * 6 + i * 1.7);
        panel(ctx, x, y, 280, 200, { alpha: a, glow: .25 * fl, line: .35 + .2 * fl });
        const ch = new K.Chart(SCREENS[i], { x: x + 14, y: y + 16, w: 252, h: 168 });
        ch.draw(ctx, clamp(S.t * .9 - i * .12) * SCREENS[i].length, { alpha: a * fl, glow: .5 * (1 + one) });
      }
      // ticker tape
      if (aW > 0) {
        ctx.save(); ctx.globalAlpha *= aW; ctx.beginPath(); ctx.rect(190, 690, 880, 40); ctx.clip();
        ctx.fillStyle = 'rgba(16,13,9,.8)'; ctx.fillRect(190, 690, 880, 40);
        ctx.font = F.mono(20); ctx.fillStyle = C.goldHi; ctx.fillText(TICKER, 190 - (t * 150) % 1400, 717);
        ctx.restore();
      }
      // order book (abstract, digits only)
      if (aB > 0) {
        panel(ctx, 1130, 240, 360, 450, { alpha: aB, glow: .2 });
        for (let j = 0; j < 14; j++) {
          const yy = 270 + j * 30 + (j >= 7 ? 30 : 0), ask = j < 7, col = ask ? C.green : C.red;
          const w = 60 + 140 * (.5 + .5 * Math.sin(t * 2.6 + j * 1.9)) * (ask ? (j + 3) / 10 : (17 - j) / 10);
          ctx.save(); ctx.globalAlpha *= aB; ctx.fillStyle = rgba(col, .28); ctx.fillRect(1470 - w, yy - 18, w, 24); ctx.restore();
          const px = (64218.5 + (ask ? 7 - j : 6 - j) * 2.5 + Math.round(Math.sin(t * 3 + j) * 2) * .5).toFixed(1);
          K.text(ctx, px, 1150, yy, { font: F.mono(18), color: col, alpha: aB });
          K.text(ctx, (1.2 + ((j * 37) % 11) / 4 + Math.abs(Math.sin(t * 2 + j)) * .8).toFixed(3), 1470, yy, { font: F.mono(18), color: C.gray, align: 'right', alpha: aB });
        }
        K.text(ctx, (64218.5 + Math.round(Math.sin(t * 3.3) * 6) * .5).toFixed(1), 1310, 494, { font: F.mono(28), color: Math.sin(t * 3.3) > 0 ? C.red : C.green, align: 'center', alpha: aB, glow: .5 });
      }
      // phone
      if (aP > 0) {
        ctx.save(); ctx.translate(0, (1 - aP) * 40);
        panel(ctx, 1560, 250, 190, 380, { alpha: aP, r: 28, glow: .3, line: .7 });
        panel(ctx, 1574, 290, 162, 300, { alpha: aP, r: 6, fill: 'rgba(8,7,5,.9)', line: .2 });
        ctx.save(); ctx.globalAlpha *= aP; ctx.fillStyle = rgba(C.gold, .6); ctx.beginPath(); ctx.roundRect(1630, 264, 50, 8, 4); ctx.fill(); ctx.restore();
        new K.Chart(PHONE, { x: 1580, y: 330, w: 150, h: 240 }).draw(ctx, clamp((S.t - S.beat(0) - 2.1) / 1.4) * PHONE.length, { alpha: aP, glow: .6 });
        K.text(ctx, '+2.36%', 1590, 318, { font: F.mono(18), color: C.red, alpha: aP });
        ctx.restore();
      }
      // one language: a gold scan unites every screen
      if (one > 0 && one < 1) {
        const x = lerp(150, 1790, one);
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createLinearGradient(x - 80, 0, x + 80, 0); g.addColorStop(0, 'rgba(241,213,151,0)'); g.addColorStop(.5, 'rgba(241,213,151,.22)'); g.addColorStop(1, 'rgba(241,213,151,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 80, 220, 160, 530); ctx.restore();
      }
      K.tag(ctx, 960, 745, '同一种图表 · ONE LANGUAGE', { alpha: S.at(1, .9, .8), font: F.serif(700, 22) });
      ctx.restore();
      if (q > 0) { ctx.save(); ctx.translate(960, 480); const z = lerp(1.3, 1, easeOut(q)); ctx.scale(z, z); K.goldText(ctx, '?', 0, 70, 220, { alpha: q, glow: 1.2 }); ctx.restore(); }
    } },

  /* ================= TITLE ================= */
  { id: 'title', dur: 5.4, tr: 'zoom', camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const cx = 960;
      const bg = K.gen.path([100, 108, 103, 114, 109, 121, 115, 128], { per: 6, seed: 3 });
      const ch = new K.Chart(bg.candles, { x: 120, y: 200, w: 1680, h: 640 });
      ch.draw(ctx, S.lin(0, -.2, 3.2) * bg.candles.length, { alpha: .16, glow: 0, color: () => C.gold });
      K.text(ctx, 'THE  STORY  OF  THE  CANDLESTICK', cx, 400, { font: F.latin(500, 24), color: C.gold, align: 'center', spacing: 12, alpha: S.p(.3, 1.2) });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 410, 1920, 150); ctx.clip();
      const tp = S.p(.5, 1.4, K.expo);
      K.goldText(ctx, 'K线图的前世今生', cx, 528 + (1 - tp) * 110, 112, { spacing: 18 });
      ctx.restore();
      const sw = clamp((S.t - 1.8) / 1.3);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(400, 1520, sw), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,240,200,.28)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, 410, 180, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 360, S.p(1.3, 1.4));
      K.text(ctx, '从堂岛米市到全球交易屏 · 三百年演变', cx, 650, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 8, alpha: S.p(2.0, 1.2) });
    } },

  /* ================= 导言 ================= */
  { id: 'intro', header: H0, tr: ['iris', [960, 450]], chapter: '导言：全球金融的统一语言',
    lines: ['为什么无论哪个国家、交易什么资产，', '大家看的都是{同一种图表}？', '这个每天影响{数万亿美元}流向的工具，', '起点要追溯到约{三百年前}的东方——', '一场围绕{大米}的跨世纪博弈。'],
    visual(ctx, S) {
      const t = S.t, cx = 960, cy = 450, r = 200;
      const ga = S.at(0, -.4, 1.2) * (1 - S.at(3, 0, 1.1, easeInOut)), rot = t * .32;
      if (ga > 0) {
        ctx.save(); ctx.translate(cx, cy); const z = lerp(1, .7, S.at(3, 0, 1.1, easeInOut)); ctx.scale(z, z); ctx.translate(-cx, -cy);
        const ring = (rx, ry, oy, al) => { const pts = []; for (let i = 0; i <= 90; i++) { const a = i / 90 * TAU; pts.push([cx + Math.cos(a) * rx, cy + oy + Math.sin(a) * ry]); } K.dotted(ctx, pts, 1, { alpha: ga * al, gap: 9, r: 1.3, glow: false }); };
        ring(r, r, 0, .9);
        for (const la of [-50, -20, 20, 50]) { const rr = Math.cos(la * Math.PI / 180) * r; ring(rr, rr * .18, -Math.sin(la * Math.PI / 180) * r, .35); }
        ring(r, r * .18, 0, .5);
        for (let m = 0; m < 4; m++) { const ph = rot + m * Math.PI / 4; ring(Math.abs(Math.sin(ph)) * r, r, 0, .3); }
        // market nodes with tiny candles
        NODES.forEach(([name, lon, lat], i) => {
          const L = lon * Math.PI / 180 + rot, P = lat * Math.PI / 180, vis = Math.cos(L);
          if (vis < .05) return;
          const x = cx + r * Math.cos(P) * Math.sin(L), y = cy - r * Math.sin(P), a = ga * clamp(vis * 3) * S.at(0, .3 + i * .12, .6);
          const up = i % 3 !== 2, col = up ? C.red : C.green, hh = 16 + 6 * Math.sin(t * 4 + i);
          pxCandle(ctx, x, y - hh / 2, y + hh / 2, y - hh / 2 - 7, y + hh / 2 + 7, 8, col, a, .7);
          K.text(ctx, name, x + 12, y - 10, { font: F.serif(500, 16), color: C.gray, alpha: a });
          const link = S.at(1, i * .08, .8) * a;
          if (link > 0) K.dash(ctx, x, y, cx, cy, { p: link, alpha: .5 * link, dash: [3, 6], color: C.goldHi });
        });
        // one shared candle at the core
        const core = S.at(1, .4, 1, easeBack) * ga;
        if (core > 0) pxCandle(ctx, cx, cy - 46 * core, cy + 46 * core, cy - 76 * core, cy + 76 * core, 36, C.goldHi, clamp(core), .8);
        // capital streams orbiting
        const fl = S.at(2, 0, 1) * ga;
        if (fl > 0) for (let k = 0; k < 60; k++) {
          const a = k / 60 * TAU + t * 1.1, rx = r * 1.35, ry = r * .42, tilt = -.35;
          const px = Math.cos(a) * rx, py = Math.sin(a) * ry, x = cx + px * Math.cos(tilt) - py * Math.sin(tilt), y = cy + px * Math.sin(tilt) + py * Math.cos(tilt);
          ctx.fillStyle = rgba(C.goldHi, fl * (.35 + .6 * ((k % 6) / 6))); ctx.beginPath(); ctx.arc(x, y, 2, 0, TAU); ctx.fill();
        }
        K.tag(ctx, cx + 300, cy - 210, '数万亿美元 · 每天', { alpha: fl, color: C.gold });
        ctx.restore();
      }
      // timeline rewinds three centuries
      const tl = S.at(3, 0, 1);
      if (tl > 0) {
        const X = yr => lerp(340, 1580, (yr - 1700) / 330), ty = 640;
        K.baseline(ctx, 340, 1580, ty, { p: tl, step: X(1710) - X(1700) });
        [1700, 1750, 1800, 1850, 1900, 1950, 2000].forEach((yr, i) => K.text(ctx, String(yr), X(yr), ty + 40, { font: F.latin(500, 22), color: C.gray, align: 'center', alpha: S.at(3, .2 + i * .05, .5) }));
        const yr = lerp(2026, 1730, S.at(3, .5, 2.2, easeInOut)), mx = X(yr);
        K.dotted(ctx, [[X(2026), ty], [mx, ty]], 1, { alpha: tl * .9, gap: 8, r: 2.2 });
        K.marker(ctx, mx, ty, { alpha: tl, r: 11, label: yr > 2000 ? '今天' : `约 ${Math.round(yr)}`, font: F.latin(500, 24), pos: 'above', pulse: clamp((t * .7) % 1) });
        K.text(ctx, '约三百年前', X(1730), ty + 82, { font: F.serif(700, 26), color: C.goldHi, align: 'center', alpha: S.at(3, 2.4, .7) });
        // a rice bale lands on the far end
        const rb = S.at(4, 0, .9, easeBack);
        if (rb > 0) {
          const g = ctx.createRadialGradient(X(1730), 450, 0, X(1730), 450, 180); g.addColorStop(0, rgba(C.goldHi, .18 * clamp(rb))); g.addColorStop(1, rgba(C.goldHi, 0));
          ctx.fillStyle = g; ctx.fillRect(X(1730) - 180, 270, 360, 360);
          bale(ctx, X(1730), 470 - (1 - clamp(rb)) * 60, 2.2, { alpha: clamp(rb) });
          K.tag(ctx, X(1730) + 190, 470, '大米 · RICE', { alpha: S.at(4, .4, .6), align: 'left' });
          // the sun of the old East rising behind
          ctx.save(); ctx.globalAlpha = .5 * clamp(rb); ctx.fillStyle = 'rgba(200,52,58,.55)'; ctx.shadowColor = 'rgba(229,72,77,.6)'; ctx.shadowBlur = 40;
          ctx.beginPath(); ctx.arc(1160, 400, 120 * clamp(rb), 0, TAU); ctx.fill(); ctx.restore();
          K.text(ctx, '东方 · 江户日本', 1160, 570, { font: F.serif(700, 26), color: C.white, align: 'center', alpha: S.at(4, .6, .7) });
        }
      }
    } },

  /* ================= 模块一 ================= */
  { id: 'ch1', dur: 4.2, tr: 'sweep', visual: chapter('壹', 1, '堂岛米市', 'Rice, Gamblers & the First Futures', '江户时代 · 大阪堂岛 · 空米手形') },

  { id: 'edo', header: H1, tr: ['iris', [960, 520]], camera: { z0: 1.0, z1: 1.06, x1: -30 }, chapter: '模块一：大米、赌徒与最早的期货',
    lines: ['17至18世纪，日本{江户时代}。', '各地诸侯把年贡大米，源源不断运往商业中心{大阪}。', '{堂岛米市}在这里成形，大米集中竞价买卖。', '据记载，{1730年}前后，它得到幕府的官方认可。', '一般认为，它是世界上最早的{期货市场}之一。'],
    visual(ctx, S) {
      const t = S.t, a0 = S.at(0, -.3, 1.2);
      // sky: rising sun and layered mountains (flat colour)
      ctx.save(); ctx.globalAlpha *= a0;
      ctx.fillStyle = 'rgba(200,52,58,.5)'; ctx.shadowColor = 'rgba(229,72,77,.5)'; ctx.shadowBlur = 50;
      ctx.beginPath(); ctx.arc(760, 360, 95, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(138,106,46,.22)'; ctx.beginPath(); ctx.moveTo(240, 620); ctx.lineTo(420, 430); ctx.lineTo(560, 540); ctx.lineTo(700, 400); ctx.lineTo(900, 620); ctx.fill();
      ctx.fillStyle = 'rgba(138,106,46,.34)'; ctx.beginPath(); ctx.moveTo(260, 620); ctx.lineTo(500, 480); ctx.lineTo(640, 560); ctx.lineTo(820, 470); ctx.lineTo(1040, 620); ctx.fill();
      ctx.strokeStyle = rgba(C.goldHi, .5); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(680, 422); ctx.lineTo(700, 400); ctx.lineTo(724, 426); ctx.stroke();
      ctx.restore();
      // water: drifting wave strokes
      for (let row = 0; row < 4; row++) {
        const y = 650 + row * 34, al = a0 * (.5 - row * .08);
        ctx.save(); ctx.strokeStyle = rgba(C.gold, al); ctx.lineWidth = 1.3; ctx.beginPath();
        for (let x = 220; x <= 1700; x += 8) { const yy = y + Math.sin(x * .025 + t * 1.6 + row * 1.3) * 5; x === 220 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); }
        ctx.stroke(); ctx.restore();
        for (let k = 0; k < 9; k++) {                                                                // little curled crests
          const cx = 260 + ((k * 170 + row * 85 + t * 22) % 1440), cy = y - 4;
          ctx.save(); ctx.strokeStyle = rgba(C.goldHi, al * .8); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(cx, cy, 9, Math.PI, Math.PI * 1.9); ctx.stroke(); ctx.restore();
        }
      }
      // the rice boat sails toward Osaka
      const sail = S.at(1, -.4, 4.2, easeInOut);
      boat(ctx, lerp(380, 820, sail), 652, .85, S.at(0, .3, 1), t);
      K.tag(ctx, 380, 260, '江户时代 · EDO', { alpha: S.at(0, .4, .7), align: 'left' });
      K.text(ctx, '年贡米 · 运往大阪', lerp(380, 820, sail), 760, { font: F.serif(700, 22), color: C.goldHi, align: 'center', alpha: S.at(1, .6, .7) * (1 - S.at(3, 0, .6)) });
      // the exchange hall rises on the shore
      const hp = S.at(1, 1.2, 2.8, easeInOut);
      ctx.save(); ctx.fillStyle = rgba(C.goldDeep, .35 * hp); ctx.fillRect(1120, 626, 600, 12); ctx.restore();
      hall(ctx, 1400, 628, .92, hp, 1);
      K.text(ctx, '大阪 · OSAKA', 1400, 300, { font: F.latin(500, 22), color: C.gray, align: 'center', spacing: 4, alpha: S.at(1, 1.8, .7) * (1 - S.at(2, 0, .5)) });
      K.tag(ctx, 1400, 300, '堂岛米市 · DOJIMA', { alpha: S.at(2, .2, .7), font: F.serif(700, 22) });
      // bidding hands: price ticks flicker over the hall
      const bid = S.at(2, .6, .8);
      if (bid > 0) for (let k = 0; k < 4; k++) {
        const ph = (t * .8 + k * .25) % 1, x = [1245, 1305, 1495, 1555][k], y = 595 - ph * 90;
        K.text(ctx, k % 2 ? '买' : '卖', x, y, { font: F.serif(900, 26), color: k % 2 ? C.red : C.green, align: 'center', alpha: bid * Math.sin(Math.PI * ph) });
      }
      K.text(ctx, '据记载 · 1730年前后 · 官方认可', 1400, 250, { font: F.serif(700, 22), color: C.goldHi, align: 'center', alpha: S.at(3, .2, .7) });
      K.tag(ctx, 1400, 735, '最早的期货市场之一 · 一般认为', { alpha: S.at(4, .3, .7), color: C.gold, font: F.serif(700, 22) });
    } },

  { id: 'tegata', header: H1, tr: ['push', 1], camera: { z0: 1.02, z1: 1.06, x1: -20 },
    lines: ['为了提前锁定利润，市场上流通起“{空米手形}”：', '凭一张票据，约定{未来交割}的大米。', '有人借它{对冲风险}，也有人纯粹押注涨跌——投机由此兴起。', '它被视为人类{早期的期货合约}。'],
    visual(ctx, S) {
      const t = S.t, a = S.at(0, -.2, 1, easeBack);
      // the paper note (original design: frame, vertical text, red seal)
      ctx.save(); ctx.translate(500, 500); ctx.rotate(-.04 * (1 - clamp(a))); ctx.translate(0, (1 - clamp(a)) * 60);
      ctx.globalAlpha *= clamp(a);
      ctx.fillStyle = '#E4D6B4'; ctx.shadowColor = rgba(C.goldHi, .35); ctx.shadowBlur = 40; ctx.fillRect(-120, -230, 240, 440); ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(80,58,24,.8)'; ctx.lineWidth = 2; ctx.strokeRect(-104, -214, 208, 408);
      ctx.strokeStyle = 'rgba(80,58,24,.35)'; ctx.lineWidth = 1; for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-104 + i * 52, -200); ctx.lineTo(-104 + i * 52, 180); ctx.stroke(); }
      ctx.restore();
      vtext(ctx, '空米手形', 500, 350, { size: 34, weight: 900, color: '#2A1D0C', alpha: clamp(a) });
      vtext(ctx, '', 446, 330, { size: 15, weight: 700, color: '#5A4420', alpha: clamp(a) * .9 });
      vtext(ctx, '', 446, 520, { size: 15, weight: 700, color: '#5A4420', alpha: clamp(a) * .9 });
      const seal = S.at(0, 1.4, .4, easeBack);
      if (seal > 0) {
        ctx.save(); ctx.translate(555, 640); const z = lerp(1.8, 1, clamp(seal)); ctx.scale(z, z); ctx.globalAlpha *= clamp(seal);
        ctx.fillStyle = 'rgba(200,52,58,.92)'; ctx.fillRect(-26, -26, 52, 52); ctx.strokeStyle = 'rgba(255,230,220,.7)'; ctx.lineWidth = 2; ctx.strokeRect(-19, -19, 38, 38); ctx.restore();
      }
      K.tag(ctx, 500, 248, '票据 · TEGATA', { alpha: S.at(0, .9, .6) });
      // time axis: today → future delivery
      const ax = S.at(1, 0, 1.2), y = 470;
      K.arrow(ctx, 720, y, 1620, y, { p: ax, alpha: ax, color: C.goldHi, width: 2 });
      K.marker(ctx, 760, y, { alpha: ax, label: '今日 · 签约', pos: 'below', font: F.serif(700, 24) });
      K.marker(ctx, 1500, y, { alpha: S.at(1, .8, .6), label: '未来 · 交割', pos: 'below', font: F.serif(700, 24), pulse: clamp((t * .6) % 1) });
      // the rice is "empty" today, real at delivery
      const fill = S.at(2, 0, 1.2);
      [[1460, 384], [1500, 346], [1540, 384]].forEach(([bx, by], k) => {
        const ba = S.at(1, .9 + k * .15, .5);
        bale(ctx, bx, by, 1.05, { alpha: ba * (1 - fill), ghost: true });
        bale(ctx, bx, by, 1.05, { alpha: ba * fill });
      });
      K.text(ctx, '空米 → 实米', 1500, 290, { font: F.serif(700, 22), color: C.gray, align: 'center', alpha: S.at(1, 1.3, .6) });
      // the locked price travels along the axis
      const lk = S.at(1, .5, 2.2, easeInOut);
      if (lk > 0) {
        const x = lerp(760, 1300, lk);
        panel(ctx, x - 70, y - 104, 140, 54, { alpha: ax, glow: .4, color: C.gold, line: .8 });
        K.text(ctx, '锁定价格', x, y - 68, { font: F.serif(700, 24), color: C.goldHi, align: 'center', alpha: ax });
        K.line(ctx, x, y - 50, x, y - 10, { alpha: ax * .7 });
      }
      const hd = S.at(2, 0, .7), sp = S.at(2, 1.2, .7), wob = Math.sin(t * 5) * 14;
      K.tag(ctx, 900, 620, '对冲 · HEDGE', { alpha: hd, color: C.gold, font: F.serif(700, 24) });
      K.line(ctx, 840, 660, 960, 660, { alpha: hd, p: hd, color: C.goldHi, width: 2, glow: .6 });
      K.tag(ctx, 1360, 620, '投机 · SPECULATE', { alpha: sp, color: C.red, font: F.serif(700, 24) });
      K.arrow(ctx, 1290, 690, 1290, 650 - wob, { p: sp, alpha: sp, color: C.red }); K.arrow(ctx, 1430, 650, 1430, 690 + wob, { p: sp, alpha: sp, color: C.green });
      K.tag(ctx, 1130, 735, '早期期货合约 · FUTURES', { alpha: S.at(3, .3, .7), color: C.gold, font: F.serif(700, 24) });
    } },

  { id: 'pain', header: H1, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05 },
    lines: ['可天气、歉收、战乱，都会让{米价}暴涨暴跌。', '价格一日数变，单凭记忆根本{理不清}。', '商人们急需一本能看清价格规律的“{记账本}”。'],
    visual(ctx, S) {
      const t = S.t, toBook = S.at(2, 0, 1.4, easeInOut);
      // three shocks
      const icons = [[560, '天气'], [960, '歉收'], [1360, '战乱']];
      icons.forEach(([x, name], i) => {
        const a = S.at(0, .2 + i * .5, .6, easeBack) * (1 - toBook), y = 280;
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha *= clamp(a); ctx.strokeStyle = C.goldHi; ctx.lineWidth = 2; ctx.shadowColor = rgba(C.gold, .6); ctx.shadowBlur = 12;
        if (i === 0) { ctx.beginPath(); ctx.arc(x - 20, y, 22, Math.PI, 0); ctx.arc(x + 12, y - 4, 28, Math.PI * 1.1, .1); ctx.lineTo(x + 40, y + 12); ctx.lineTo(x - 42, y + 12); ctx.closePath(); ctx.stroke();
          for (let k = 0; k < 4; k++) { const d = (t * 60 + k * 13) % 26; ctx.beginPath(); ctx.moveTo(x - 30 + k * 20, y + 20 + d); ctx.lineTo(x - 34 + k * 20, y + 30 + d); ctx.stroke(); } }
        if (i === 1) { ctx.beginPath(); ctx.moveTo(x, y + 36); ctx.quadraticCurveTo(x + 4, y, x - 6, y - 30); ctx.stroke();
          for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.ellipse(x - 6 + k * 4, y - 22 + k * 16, 7, 13, .9, 0, TAU); ctx.stroke(); }
          ctx.strokeStyle = C.red; ctx.beginPath(); ctx.moveTo(x - 34, y - 34); ctx.lineTo(x + 34, y + 34); ctx.stroke(); }
        if (i === 2) { for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x - 38 * s, y + 38); ctx.lineTo(x + 34 * s, y - 34); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(x + 34 * s, y - 34); ctx.lineTo(x + 20 * s, y - 30); ctx.lineTo(x + 30 * s, y - 20); ctx.closePath(); ctx.fill(); } }
        ctx.restore();
        K.text(ctx, name, x, y + 80, { font: F.serif(700, 26), color: C.white, align: 'center', alpha: clamp(a) });
      });
      // the wild rice price
      const pa = 1 - toBook;
      if (pa > 0) {
        const pts = [], u = S.lin(0, .2, 3.2);
        for (let i = 0; i <= 160 * u; i++) { const x = 300 + i * 8.25, s = i / 160; pts.push([x, 560 - Math.sin(s * 9) * 90 * (1 + s) - Math.sin(s * 23 + 1) * 35 - Math.sin(s * 47) * 12]); }
        if (pts.length > 1) K.dotted(ctx, pts, 1, { alpha: pa, gap: 6, r: 1.8 });
        K.text(ctx, '米价', 280, 568, { font: F.serif(700, 24), color: C.goldHi, align: 'right', alpha: pa * S.at(0, 0, .6) });
        K.baseline(ctx, 300, 1620, 770, { p: S.at(0, 0, 1), alpha: pa });
        const sh = S.at(0, 1.6, .6) * pa;
        K.arrow(ctx, 1660, 520, 1660, 380, { p: sh, alpha: sh, color: C.red }); K.arrow(ctx, 1660, 600, 1660, 740, { p: sh, alpha: sh, color: C.green });
        const qm = S.at(1, 0, .6) * pa;
        [[42, '?'], [78, '?'], [118, '?'], [150, '?']].forEach(([i, q], j) => { const s2 = i / 160, x = 300 + i * 8.25, y = 560 - Math.sin(s2 * 9) * 90 * (1 + s2) - Math.sin(s2 * 23 + 1) * 35 - Math.sin(s2 * 47) * 12;
          K.marker(ctx, x, y, { alpha: S.at(1, j * .25, .5) * pa, r: 10, label: q, font: F.latin(500, 30), pos: j % 2 ? 'below' : 'above' }); });
        K.text(ctx, '暴涨', 1690, 420, { font: F.serif(700, 22), color: C.red, alpha: sh }); K.text(ctx, '暴跌', 1690, 720, { font: F.serif(700, 22), color: C.green, alpha: sh });
      }
      // a ledger opens: the price gets recorded, period by period
      if (toBook > 0) {
        const bx = 960, by = 520, w = 1100 * lerp(.6, 1, toBook), h = 440;
        ctx.save(); ctx.globalAlpha *= toBook;
        ctx.fillStyle = '#1D160D'; ctx.shadowColor = rgba(C.gold, .4); ctx.shadowBlur = 40; ctx.fillRect(bx - w / 2, by - h / 2, w, h); ctx.shadowBlur = 0;
        ctx.strokeStyle = rgba(C.gold, .7); ctx.lineWidth = 1.4; ctx.strokeRect(bx - w / 2, by - h / 2, w, h);
        ctx.beginPath(); ctx.moveTo(bx, by - h / 2); ctx.lineTo(bx, by + h / 2); ctx.stroke();
        ctx.strokeStyle = rgba(C.gold, .16); ctx.lineWidth = 1;
        for (let k = 1; k < 10; k++) { const y = by - h / 2 + k * h / 10; ctx.beginPath(); ctx.moveTo(bx - w / 2 + 30, y); ctx.lineTo(bx - 30, y); ctx.moveTo(bx + 30, y); ctx.lineTo(bx + w / 2 - 30, y); ctx.stroke(); }
        ctx.restore();
        const ch = new K.Chart(EDOCH, { x: bx - w / 2 + 40, y: by - h / 2 + 40, w: w - 80, h: h - 80 });
        ch.draw(ctx, S.lin(2, 1.0, 2.6) * EDOCH.length, { alpha: toBook, glow: .3, color: i => EDOCH[i].c >= EDOCH[i].o ? C.red : C.green });
        K.tag(ctx, 960, 256, '记账本 · 价格的日记', { alpha: S.at(2, .8, .6), color: C.gold });
      }
    } },

  /* ================= 模块二 ================= */
  { id: 'ch2', dur: 4.2, tr: 'sweep', visual: chapter('贰', 2, '酒田之神', 'The God of Sakata', '本间宗久 · 三猿金泉录 · 酒田五法') },

  { id: 'homma', header: H2, tr: 'zoom', camera: { z0: 1.0, z1: 1.06, x1: 30 }, chapter: '模块二：酒田之神与《三猿金泉录》',
    lines: ['相传，米商{本间宗久}在这场博弈中脱颖而出，', '他出身于日本{酒田}——一座繁忙的大米港口。', '后世誉他为“{股市之神}”。', '他发现，决定价格的不只是{供需}，', '更是买卖双方的[贪婪]与<恐惧>。'],
    visual(ctx, S) {
      const t = S.t, a = S.at(0, -.2, 1.4);
      const halo = ctx.createRadialGradient(600, 470, 0, 600, 470, 300);
      halo.addColorStop(0, rgba(C.goldHi, .16 * a)); halo.addColorStop(1, rgba(C.goldHi, 0));
      ctx.fillStyle = halo; ctx.fillRect(300, 170, 600, 600);
      ctx.save(); ctx.strokeStyle = rgba(C.gold, .45 * a); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(600, 470, 230, 0, TAU * a); ctx.stroke(); ctx.restore();
      silhouette(ctx, 600, 765, .95, a);
      K.text(ctx, '本间宗久', 600, 282, { font: F.serif(900, 34), color: C.goldHi, align: 'center', spacing: 8, alpha: S.at(0, .8, .8), glow: .4 });
      K.text(ctx, 'HOMMA MUNEHISA · 相传', 600, 322, { font: F.latin(500, 18), color: C.gray, align: 'center', spacing: 3, alpha: S.at(0, 1.1, .8) });
      K.tag(ctx, 600, 735, '股市之神', { alpha: S.at(2, .2, .7), font: F.serif(700, 24) });
      // the scale: supply vs demand → greed vs fear
      const port = S.at(1, 0, .9) * (1 - S.at(3, 0, .6));
      if (port > 0) {
        for (let row = 0; row < 3; row++) { ctx.save(); ctx.strokeStyle = rgba(C.gold, port * (.45 - row * .1)); ctx.lineWidth = 1.2; ctx.beginPath();
          for (let x = 1020; x <= 1600; x += 8) { const yy = 640 + row * 28 + Math.sin(x * .03 + t * 1.6 + row) * 4; x === 1020 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy); } ctx.stroke(); ctx.restore(); }
        boat(ctx, 1240 + Math.sin(t * .4) * 20, 640, .6, port, t);
        for (const [bx, by] of [[1470, 610], [1540, 610], [1505, 576]]) bale(ctx, bx, by, 1, { alpha: port });
        K.tag(ctx, 1310, 330, '酒田 · SAKATA · 米港', { alpha: port, font: F.serif(700, 24) });
      }
      const sa = S.at(3, 0, .9), emo = S.at(4, 0, 1);
      if (sa > 0) {
        const x = 1300, y = 360, ang = Math.sin(t * (1.2 + emo * 2.4)) * lerp(.05, .22, emo);
        ctx.save(); ctx.globalAlpha *= sa; ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.shadowColor = rgba(C.gold, .5); ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 320); ctx.moveTo(x - 90, y + 320); ctx.lineTo(x + 90, y + 320); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x - 30, y - 18); ctx.lineTo(x, y - 36); ctx.lineTo(x + 30, y - 18); ctx.stroke();
        const ex = Math.cos(ang) * 230, ey = Math.sin(ang) * 230;
        ctx.beginPath(); ctx.moveTo(x - ex, y - ey); ctx.lineTo(x + ex, y + ey); ctx.stroke();
        const pans = [[x - ex, y - ey], [x + ex, y + ey]];
        pans.forEach(([px, py], i) => {
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - 60, py + 120); ctx.moveTo(px, py); ctx.lineTo(px + 60, py + 120); ctx.stroke();
          const col = i === 0 ? mix(C.gold, C.red, emo) : mix(C.gold, C.green, emo);
          ctx.save(); ctx.fillStyle = rgba(col, .25 + .35 * emo); ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10 + 30 * emo;
          ctx.beginPath(); ctx.moveTo(px - 74, py + 120); ctx.quadraticCurveTo(px, py + 175, px + 74, py + 120); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        });
        ctx.restore();
        pans.forEach(([px, py], i) => {
          K.text(ctx, i === 0 ? '供' : '需', px, py + 100, { font: F.serif(900, 34), color: C.white, align: 'center', alpha: sa * (1 - emo) });
          K.text(ctx, i === 0 ? '贪婪' : '恐惧', px, py + 104, { font: F.serif(900, 36), color: i === 0 ? C.red : C.green, align: 'center', alpha: emo, glow: .6, glowColor: i === 0 ? C.red : C.green });
        });
        K.text(ctx, emo > .5 ? '人心 · PSYCHOLOGY' : '供需 · SUPPLY & DEMAND', x, 270, { font: F.serif(700, 24), color: C.goldHi, align: 'center', alpha: sa });
      }
    } },

  { id: 'book', header: H2, tr: ['push', 1], camera: { z0: 1.03, z1: 1.0, x0: 20, x1: -20 },
    lines: ['相传他在{1755年}写成《{三猿金泉录}》，', '其方法被后人整理为“{酒田战法}”。', '用蜡烛般的图形，研判买卖双方的{心理}——', '这被视为{K线的前身}；据说他也因此富甲一方。'],
    visual(ctx, S) {
      const a = S.at(0, -.2, 1, easeBack);
      ctx.save(); ctx.translate(0, (1 - clamp(a)) * 50); wahon(ctx, 470, 500, 280, 420, '三猿金泉录', clamp(a)); ctx.restore();
      K.tag(ctx, 470, 245, '1755 · 相传', { alpha: S.at(0, .8, .6), font: F.latin(500, 24) });
      // the folio of brushed candles
      const pg = S.at(1, 0, 1);
      panel(ctx, 760, 270, 900, 470, { alpha: pg, fill: 'rgba(29,22,13,.85)', glow: .25 });
      if (pg > 0) {
        K.text(ctx, '酒田战法 · SAKATA METHOD', 1210, 312, { font: F.serif(700, 24), color: C.goldHi, align: 'center', spacing: 2, alpha: pg });
        const ch = new K.Chart(SAKATA, { x: 820, y: 340, w: 780, h: 360 }, { body: .42 });
        const rev = S.lin(1, .3, 3.2) * SAKATA.length;
        // brush: ink-like strokes (slightly ragged edge), coloured red/green
        SAKATA.forEach((k, i) => {
          const g = clamp(rev - i); if (g <= 0) return;
          const x = ch.x(i), up = k.c >= k.o, col = up ? C.red : C.green;
          const top = ch.y(Math.max(k.o, k.c)), bot = ch.y(Math.min(k.o, k.c)), mid = (top + bot) / 2;
          const tt = lerp(mid, top, easeOut(g)), bb = lerp(mid, bot, easeOut(g)), w = ch.cw;
          ctx.save(); ctx.globalAlpha *= pg; ctx.fillStyle = col; ctx.shadowColor = rgba(col, .4); ctx.shadowBlur = 14;
          ctx.beginPath(); ctx.moveTo(x - w / 2, tt + 3); for (let s = 0; s <= 6; s++) ctx.lineTo(x - w / 2 + s * w / 6, tt + Math.sin(i * 7 + s * 2.3) * 2.5);
          ctx.lineTo(x + w / 2, bb); for (let s = 6; s >= 0; s--) ctx.lineTo(x - w / 2 + s * w / 6, bb + Math.sin(i * 5 + s * 1.7) * 2.5); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = col; ctx.lineWidth = 3; const wg = easeOut((g - .4) / .6);
          ctx.beginPath(); ctx.moveTo(x, tt); ctx.lineTo(x, lerp(tt, ch.y(k.h), wg)); ctx.moveTo(x, bb); ctx.lineTo(x, lerp(bb, ch.y(k.l), wg)); ctx.stroke(); ctx.restore();
        });
        // psychology notes
        const ps = S.at(2, .3, .8);
        const iUp = 3, iDn = 6;
        K.marker(ctx, ch.x(iUp), ch.y(SAKATA[iUp].h) - 18, { alpha: ps, label: '买方 · 贪婪', pos: 'above', color: C.red, labelColor: C.red });
        K.marker(ctx, ch.x(iDn), ch.y(SAKATA[iDn].l) + 18, { alpha: S.at(2, .8, .8), label: '卖方 · 恐惧', pos: 'below', color: C.green, labelColor: C.green });
      }
      K.tag(ctx, 1210, 735, 'K线的前身 · 一般认为', { alpha: S.at(3, .2, .7), color: C.gold, font: F.serif(700, 22) });
    } },

  { id: 'ohlc', header: H2, tr: ['push', 1], camera: { z0: 1.0, z1: 1.06, x1: 20 },
    lines: ['那么，一根“蜡烛”究竟记下了什么？', '一个时段里的四个价格：{开盘}、{最高}、{最低}、{收盘}。', '收盘高于开盘画成[阳线]，低于开盘画成<阴线>。', '影线的长短，正是多空{来回拉锯}留下的痕迹。'],
    visual(ctx, S) {
      // a live session trace on the left builds the candle on the right
      const keys = [0, .45, .1, .95, .5, -.2, -.8, -.35, .25, .7, .55];
      const T0 = S.beat(0) + .2, Tlen = S.beat(1) + 1.2 - T0;
      const u = clamp((S.t - T0) / Tlen), N = 220;
      const price = s => { const f = s * (keys.length - 1), i = Math.min(keys.length - 2, Math.floor(f)), w = easeInOut(f - i); return lerp(keys[i], keys[i + 1], w) + Math.sin(s * 70) * .035 * Math.sin(s * Math.PI); };
      const px = s => 300 + s * 560, py = v => 500 - v * 200;
      K.baseline(ctx, 300, 860, 760, { p: S.at(0, 0, 1), step: 56 });
      K.text(ctx, '一个时段 · ONE SESSION', 580, 755, { font: F.serif(500, 20), color: C.gray, align: 'center', spacing: 3, alpha: S.at(0, .3, .8) });
      const pts = []; let hi = 0, lo = 0;
      for (let i = 0; i <= N * u; i++) { const s = i / N, v = price(s); pts.push([px(s), py(v)]); hi = Math.max(hi, v); lo = Math.min(lo, v); }
      if (pts.length > 1) K.dotted(ctx, pts, 1, { gap: 6, r: 1.6 });
      const cur = price(u), cx = 1180;
      const col = cur >= 0 ? C.red : C.green;
      if (u > 0) {
        const wl = S.at(3, 0, .8), wg = .5 + .5 * Math.sin(S.t * 4);
        ctx.save(); ctx.shadowColor = rgba(col, .5); ctx.shadowBlur = 22; ctx.strokeStyle = col; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(cx, py(hi)); ctx.lineTo(cx, py(lo)); ctx.stroke();
        ctx.fillStyle = col; const t0 = py(Math.max(0, cur)), b0 = py(Math.min(0, cur)); ctx.fillRect(cx - 60, t0, 120, Math.max(b0 - t0, 3.5));
        if (wl > 0) { ctx.strokeStyle = rgba(C.goldHi, wl * (.6 + .4 * wg)); ctx.lineWidth = 5; ctx.shadowColor = C.goldHi; ctx.beginPath(); ctx.moveTo(cx, py(hi)); ctx.lineTo(cx, t0); ctx.moveTo(cx, b0); ctx.lineTo(cx, py(lo)); ctx.stroke(); }
        ctx.restore();
        if (u < 1) { ctx.save(); ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(px(u), py(cur), 5, 0, TAU); ctx.fill(); ctx.restore(); K.dash(ctx, px(u), py(cur), cx - 66, py(cur), { alpha: .5, dash: [2, 5] }); }
      }
      // O H L C labels
      const lab = [['开盘', 0, 'OPEN'], ['最高', hi, 'HIGH'], ['最低', lo, 'LOW'], ['收盘', cur, 'CLOSE']];
      lab.forEach(([zh, v, en], j) => {
        const a = S.at(1, .2 + j * .35, .6) * (u > .2 ? 1 : 0); if (a <= 0) return;
        const left = j === 0 || j === 2, x = left ? cx - 90 : cx + 90, y = py(v) + 8;
        K.dash(ctx, left ? cx - 66 : cx + 66, py(v), x + (left ? -4 : 4) * 0, py(v), { alpha: .6 * a, dash: [3, 5] });
        K.text(ctx, zh, x + (left ? -10 : 10), y, { font: F.serif(700, 26), color: C.goldHi, align: left ? 'right' : 'left', alpha: a });
        K.text(ctx, en, x + (left ? -10 : 10), y + 26, { font: F.latin(500, 16), color: C.gray, align: left ? 'right' : 'left', spacing: 3, alpha: a });
      });
      // the two outcomes
      const yy = S.at(2, 0, .8, easeBack);
      if (yy > 0) {
        pxCandle(ctx, 1520, 400, 560, 360, 610, 54, C.red, clamp(yy), .5);
        pxCandle(ctx, 1640, 420, 580, 380, 630, 54, C.green, clamp(S.at(2, .6, .8, easeBack)), .5);
        K.text(ctx, '阳线', 1520, 680, { font: F.serif(700, 26), color: C.red, align: 'center', alpha: clamp(yy) });
        K.text(ctx, '收 > 开', 1520, 712, { font: F.serif(500, 20), color: C.gray, align: 'center', alpha: clamp(yy) });
        const ga = clamp(S.at(2, .6, .8));
        K.text(ctx, '阴线', 1640, 680, { font: F.serif(700, 26), color: C.green, align: 'center', alpha: ga });
        K.text(ctx, '收 < 开', 1640, 712, { font: F.serif(500, 20), color: C.gray, align: 'center', alpha: ga });
      }
      const war = S.at(3, .3, .8), osc = Math.sin(S.t * 6) * 8;
      K.arrow(ctx, 1180, py(hi) - 14, 1180, py(hi) - 74 - osc, { p: war, alpha: war, color: C.red, width: 3 });
      K.arrow(ctx, 1180, py(lo) + 14, 1180, py(lo) + 74 + osc, { p: war, alpha: war, color: C.green, width: 3 });
      K.text(ctx, '多空拉锯', 1000, py(hi) - 40, { font: F.serif(900, 28), color: C.goldHi, align: 'center', alpha: war });
    } },

  { id: 'sanzan', header: H2, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -20 },
    lines: ['{酒田五法}：三山、三川、三空、三兵、三法。', '“{三山}”：三次冲高都无力突破，常被视为<顶部>信号；', '“{三川}”的一种常见解读：三次探底不破，[底部]渐稳。', '三空、三兵、三法，则分别描述{跳空}、{连阳连阴}与{休整}。'],
    visual(ctx, S) {
      const names = ['三山', '三川', '三空', '三兵', '三法'];
      names.forEach((n, i) => {
        const a = S.at(0, .3 + i * .25, .6, easeBack), hl = i === 0 ? S.at(1, 0, .6) * (1 - S.at(3, 0, .5)) : i === 1 ? S.at(2, 0, .6) * (1 - S.at(3, 0, .5)) : S.at(3, (i - 2) * .3, .5);
        K.tag(ctx, 560 + i * 200, 250 - (1 - clamp(a)) * 20, n, { alpha: clamp(a) * (hl > 0 ? 1 : 1 - .45 * S.at(1, 0, .5)), color: hl > 0 ? C.goldHi : C.gold, font: F.serif(700, 26) });
      });
      const pair = [[chSANZAN, SANZAN, 1, '三山 · 顶部', C.green, 'H'], [chSANSEN, SANSEN, 2, '三川 · 底部', C.red, 'L']];
      for (const [ch, P, beat, label, col, kind] of pair) {
        const a = S.at(beat, 0, .8) * (1 - S.at(3, 0, .7)), bx = ch.box;
        if (a <= 0.002) continue;
        panel(ctx, bx.x - 20, bx.y - 30, bx.w + 40, bx.h + 70, { alpha: a * .9, line: .3 });
        ch.draw(ctx, S.lin(beat, .1, 2.4) * P.candles.length, { alpha: a });
        const ext = P.swings.filter(s => s.type === kind);
        const lvl = kind === 'H' ? Math.max(...ext.map(s => s.price)) + .4 : Math.min(...ext.map(s => s.price)) - .4;
        const la = S.at(beat, 1.6, .8) * a;
        K.dash(ctx, bx.x, ch.y(lvl), bx.x + bx.w, ch.y(lvl), { p: la, alpha: .8, color: col });
        ext.forEach((s, j) => K.marker(ctx, ch.x(s.i), ch.y(s.price) + (kind === 'H' ? -16 : 16), { alpha: S.at(beat, 1.0 + j * .3, .5) * a, r: 8, label: String(j + 1), font: F.latin(500, 22), pos: kind === 'H' ? 'above' : 'below' }));
        K.dotted(ctx, [[ch.x(0), ch.y(P.candles[0].o)], ...P.swings.map(s => [ch.x(s.i), ch.y(s.price)])], S.lin(beat, 1.0, 1.6), { alpha: .5 * a, gap: 8 });
        K.text(ctx, label, bx.x + bx.w / 2, bx.y + bx.h + 30, { font: F.serif(700, 24), color: col, align: 'center', alpha: la });
      }
      // the other three methods, as three small cards
      const o3 = S.at(3, 0, .8);
      if (o3 > 0) {
        const cards = [[960 - 440, '三空 · 跳空', SANKU], [960, '三兵 · 连阳连阴', SANPEI], [960 + 440, '三法 · 休整', SANPO]];
        cards.forEach(([x, name, data], j) => {
          const a = S.at(3, j * .35, .6, easeBack); if (a <= 0) return;
          panel(ctx, x - 190, 330, 380, 400, { alpha: clamp(a), glow: .3, line: .6 });
          const ch = new K.Chart(data, { x: x - 160, y: 370, w: 320, h: 280 }, { body: .55 });
          ch.draw(ctx, S.lin(3, .2 + j * .35, 1.2) * data.length, { alpha: clamp(a), glow: .45 });
          if (j === 0) for (let g = 1; g < data.length; g++) { const pv = data[g - 1], cu = data[g]; if (cu.l > pv.h) { ctx.save(); ctx.globalAlpha *= clamp(a) * .9; ctx.fillStyle = rgba(C.goldHi, .16); ctx.fillRect(ch.x(g - 1), ch.y(cu.l), ch.x(g) - ch.x(g - 1), ch.y(pv.h) - ch.y(cu.l)); ctx.restore(); } }
          K.text(ctx, name, x, 700, { font: F.serif(700, 24), color: C.goldHi, align: 'center', alpha: clamp(a) });
        });
      }
    } },

  /* ================= 模块三 ================= */
  { id: 'ch3', dur: 4.2, tr: 'sweep', visual: chapter('叁', 3, '华尔街的东方启蒙', 'Candlesticks Go West', 'K的由来 · 条形图 · 史蒂夫·尼森') },

  { id: 'kname', header: H3, tr: ['iris', [960, 470]], camera: { z0: 1.0, z1: 1.05 }, chapter: '模块三：华尔街的东方启蒙',
    lines: ['为什么叫“{K线}”？其实说法不一。', '一种说法是：源自日语“{Keisen}”（意为“格线”）；', '也有说法认为，它与西方的“{Kurs}”（行情）有关。', '而在西方，它因形似蜡烛，被叫作{蜡烛图}。'],
    visual(ctx, S) {
      const t = S.t, a = S.at(0, -.2, 1, easeBack);
      ctx.save(); ctx.translate(960, 500); const z = lerp(1.4, 1, clamp(a)); ctx.scale(z, z);
      K.goldText(ctx, 'K', 0, 80, 250, { alpha: clamp(a), glow: 1 + .3 * Math.sin(t * 2) });
      ctx.restore();
      K.text(ctx, '?', 1080, 380, { font: F.latin(500, 60), color: C.gray, alpha: S.at(0, .6, .6) * (1 - S.at(1, 0, .5)) });
      // branch 1: ruled lines
      const b1 = S.at(1, 0, .9);
      K.dash(ctx, 860, 470, 640, 470, { p: b1, alpha: .7, dash: [3, 6] });
      if (b1 > 0) {
        ctx.save(); ctx.globalAlpha *= b1; ctx.strokeStyle = rgba(C.gold, .35); ctx.lineWidth = 1;
        for (let k = 0; k < 7; k++) { const y = 360 + k * 36; ctx.beginPath(); ctx.moveTo(300, y); ctx.lineTo(300 + 300 * clamp(b1 * 1.4 - k * .06), y); ctx.stroke(); }
        ctx.restore();
        K.text(ctx, 'Keisen', 450, 460, { font: F.latin(500, 64), color: C.goldHi, align: 'center', alpha: b1, glow: .4 });
        K.text(ctx, '日语 · 格线', 450, 510, { font: F.serif(700, 26), color: C.white, align: 'center', alpha: b1 });
        K.text(ctx, '一种说法', 450, 620, { font: F.serif(500, 20), color: C.gray, align: 'center', spacing: 4, alpha: b1 });
      }
      // branch 2: Kurs (quote) ticking
      const b2 = S.at(2, 0, .9);
      K.dash(ctx, 1080, 470, 1290, 470, { p: b2, alpha: .7, dash: [3, 6] });
      if (b2 > 0) {
        const pts = []; for (let i = 0; i <= 60; i++) pts.push([1330 + i * 5, 600 - Math.sin(i * .35 + t * 2) * 14 - i * .7]);
        K.dotted(ctx, pts, b2, { alpha: .8, gap: 6 });
        K.text(ctx, 'Kurs', 1480, 460, { font: F.latin(500, 64), color: C.goldHi, align: 'center', alpha: b2, glow: .4 });
        K.text(ctx, '西方 · 行情', 1480, 510, { font: F.serif(700, 26), color: C.white, align: 'center', alpha: b2 });
        K.text(ctx, '另一种说法', 1480, 660, { font: F.serif(500, 20), color: C.gray, align: 'center', spacing: 4, alpha: b2 });
      }
      // candle with a flame
      const c = S.at(3, 0, .9, easeBack);
      if (c > 0) {
        pxCandle(ctx, 960, 680, 790, 650, 805, 46, C.red, clamp(c), .5);
        flame(ctx, 960, 650, 13, 40, t, clamp(c));
        K.text(ctx, '蜡烛图 · CANDLESTICK', 1010, 750, { font: F.serif(700, 26), color: C.goldHi, alpha: S.at(3, .4, .7) });
      }
    } },

  { id: 'bars', header: H3, tr: ['push', 1], camera: { z0: 1.0, z1: 1.04, x1: -20 },
    lines: ['20世纪80年代以前，华尔街主要使用{条形图}与{点数图}，', '对K线知之甚少。', '同样四个价格，条形图只是{一根细线加两个小横杠}；', 'K线却用{实体}与{影线}，让多空强弱一目了然。'],
    visual(ctx, S) {
      const n = BARS.candles.length, la = S.at(0, -.2, .8), ra = S.at(2, .2, .8);
      panel(ctx, 260, 290, 640, 470, { alpha: la, line: .3 });
      K.text(ctx, '条形图 · BAR CHART', 580, 270, { font: F.serif(700, 24), color: C.white, align: 'center', alpha: la });
      BARS.candles.forEach((k, i) => { const g = clamp(S.lin(0, 0, 2.4) * n - i); if (g > 0) ohlc(ctx, chBAR.x(i), k, p => chBAR.y(p), { grow: g, alpha: la * (1 - .5 * S.at(3, 0, .8)), color: C.white, tw: 10 }); });
      // point & figure strip: X columns up, O columns down
      const pf = S.at(0, 1.4, .8);
      if (pf > 0) {
        K.text(ctx, '点数图 · POINT & FIGURE', 580, 612, { font: F.serif(500, 18), color: C.gray, align: 'center', spacing: 2, alpha: pf });
        let lvl = 0; const legs = [4, -2, 3, -3, 4, -2, 3];
        legs.forEach((m, j) => { const up = m > 0; for (let q = 0; q < Math.abs(m); q++) { lvl += up ? (q ? 1 : 0) : (q ? -1 : 0); const show = clamp(pf * 8 - j - q * .1);
          K.text(ctx, up ? 'X' : 'O', 360 + j * 72, 745 - (lvl + 1) * 15, { font: F.mono(17), color: up ? C.goldHi : C.gray, align: 'center', alpha: show }); } });
      }
      // VS
      K.text(ctx, 'VS', 960, 535, { font: F.latin(500, 40), color: C.gold, align: 'center', spacing: 4, alpha: S.at(1, 0, .7) });
      // the same prices as candles
      panel(ctx, 1020, 290, 640, 470, { alpha: ra, line: .3, color: ra > .5 ? C.gold : C.gold });
      K.text(ctx, 'K线 · CANDLESTICK', 1340, 270, { font: F.serif(700, 24), color: C.goldHi, align: 'center', alpha: ra });
      chCDL.draw(ctx, S.lin(2, .4, 2.4) * n, { alpha: ra, glow: .45, dim: j => j === n - 1 ? 1 : 1 - .6 * S.at(3, 0, .8) });
      // focus: one bar vs one candle
      const i = n - 1, k = BARS.candles[i], f1 = S.at(2, 1.4, .7), f2 = S.at(3, 0, .8);
      K.marker(ctx, chBAR.x(i), chBAR.y(k.h) - 18, { alpha: f1, r: 8, label: '细线 + 小横杠', pos: 'left', font: F.serif(700, 20) });
      if (f2 > 0) {
        const top = chCDL.y(Math.max(k.o, k.c)), bot = chCDL.y(Math.min(k.o, k.c));
        K.vbrace(ctx, chCDL.x(i) + 30, top, bot, '实体', { p: f2 });
        K.vbrace(ctx, chCDL.x(i) + 30, chCDL.y(k.h), top - 4, '', { p: f2, color: C.gray });
        K.tag(ctx, 1340, 735, '一目了然', { alpha: S.at(3, .6, .6), color: C.gold, font: F.serif(700, 22) });
        ctx.save(); ctx.globalAlpha *= f2 * (.5 + .5 * Math.sin(S.t * 4)); ctx.strokeStyle = C.goldHi; ctx.lineWidth = 1.4;
        ctx.strokeRect(chCDL.x(i) - 22, chCDL.y(k.h) - 10, 44, chCDL.y(k.l) - chCDL.y(k.h) + 20); ctx.restore();
      }
    } },

  { id: 'nison', header: H3, tr: 'zoom', camera: { z0: 1.02, z1: 1.07, x1: -30 },
    lines: ['1991年，曾任职美林证券的{史蒂夫·尼森}，', '出版《{日本蜡烛图技术}》，系统介绍这门东方技艺。', '实体与影线的{博弈感}，很快征服了华尔街。', '如今，K线已是全球交易软件里{最常见}的图表。'],
    visual(ctx, S) {
      const t = S.t, a = S.at(0, -.2, 1, easeBack);
      ctx.save(); ctx.translate(0, (1 - clamp(a)) * 50); hardback(ctx, 500, 500, 320, 420, clamp(a)); ctx.restore();
      // skyline of the West, windows become candle screens
      const sk = S.at(0, .6, 1.2), lit = S.at(2, 0, 1.2);
      const towers = [[1040, 170, 330], [1220, 150, 470], [1380, 130, 400], [1520, 150, 520]];
      towers.forEach(([x, w, h], j) => {
        const hh = h * easeOut(clamp(sk * 1.4 - j * .12)), base = 780;
        if (hh <= 1) return;
        ctx.save(); ctx.fillStyle = 'rgba(20,16,10,.92)'; ctx.strokeStyle = rgba(C.gold, .5); ctx.lineWidth = 1.2;
        ctx.fillRect(x, base - hh, w, hh); ctx.strokeRect(x, base - hh, w, hh); ctx.restore();
        for (let r = 0; base - hh + 26 + r * 34 < base - 20; r++) for (let c = 0; c < 4; c++) {
          const wx = x + 18 + c * (w - 36) / 3.4, wy = base - hh + 26 + r * 34, on = ((r * 7 + c * 3 + j) % 5) / 5;
          ctx.fillStyle = rgba(C.goldHi, .05 + .12 * (.5 + .5 * Math.sin(t + on * 6)) * (1 - lit)); ctx.fillRect(wx, wy, 16, 14);
          if (lit > 0 && (r + c + j) % 2 === 0) { const up = (r * 3 + c + j) % 3 !== 0, h2 = 6 + ((r + c) % 3) * 3; pxCandle(ctx, wx + 8, wy + 7 - h2 / 2, wy + 7 + h2 / 2, wy - 1, wy + 15, 7, up ? C.red : C.green, lit * clamp(lit * 3 - (r * .1)), .6); }
        }
      });
      K.text(ctx, '', 1310, 232, { font: F.serif(700, 22), color: C.gray, align: 'center', spacing: 3, alpha: sk });
      // the knowledge arcs from East to West
      const arc = S.at(1, .2, 1.6, easeInOut);
      const P = s => { const x0 = 660, y0 = 350, x1 = 1290, y1 = 260, cx = 980, cy = 120; return [(1 - s) ** 2 * x0 + 2 * (1 - s) * s * cx + s * s * x1, (1 - s) ** 2 * y0 + 2 * (1 - s) * s * cy + s * s * y1]; };
      const pts = []; for (let i = 0; i <= 50; i++) pts.push(P(i / 50));
      K.dotted(ctx, pts, arc, { alpha: .9, gap: 8, r: 2 });
      if (arc >= 1) { const s = (t * .45) % 1, [x, y] = P(s); pxCandle(ctx, x, y - 10, y + 10, y - 18, y + 18, 10, C.red, Math.sin(Math.PI * s), .9); }
      K.text(ctx, '东方 → 西方', 980, 300, { font: F.serif(700, 24), color: C.goldHi, align: 'center', spacing: 4, alpha: S.at(1, 1.0, .7) });
      K.tag(ctx, 1420, 250, '全球通用 · GLOBAL STANDARD', { alpha: S.at(3, .3, .7), color: C.gold, font: F.serif(700, 22) });
      K.tag(ctx, 500, 745, '东方技艺 · 系统西传', { alpha: S.at(1, .6, .7), font: F.serif(700, 22) });
    } },

  /* ================= 模块四 ================= */
  { id: 'ch4', dur: 4.2, tr: 'sweep', visual: chapter('肆', 4, '红绿颠倒', 'Red Up, Green Up', '中国 · 红涨绿跌  |  国际 · 绿涨红跌') },

  { id: 'boards', header: H4, tr: 'zoom', camera: { z0: 1.0, z1: 1.05 }, chapter: '模块四：红绿颠倒的有趣博弈',
    lines: ['有趣的是，同样的涨跌，在不同市场颜色{恰好相反}。', '中国股市：[红涨]<绿跌>；', '美股等国际市场：则多为<绿涨>[红跌]。', '同一段行情，换一块屏，颜色就{整个对调}。', '这只是{配色习惯}不同，K线背后的涨跌逻辑完全一样。'],
    visual(ctx, S) {
      const t = S.t, n = BOARD.candles.length;
      const board = (x, upCol, dnCol, title, sub, a, beat) => {
        if (a <= 0.002) return;
        const y = 240, w = 640, h = 540;
        ctx.save(); ctx.translate(0, (1 - a) * 40);
        panel(ctx, x, y, w, h, { alpha: a, glow: .2 * a, line: .5, r: 14 });
        ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = rgba(upCol, .12); ctx.beginPath(); ctx.roundRect(x, y, w, 48, [14, 14, 0, 0]); ctx.fill();
        for (let d = 0; d < 3; d++) { ctx.fillStyle = rgba(C.gray, .6); ctx.beginPath(); ctx.arc(x + w - 30 - d * 20, y + 24, 5, 0, TAU); ctx.fill(); }
        ctx.restore();
        K.text(ctx, title, x + 22, y + 33, { font: F.serif(700, 24), color: C.white, alpha: a });
        K.text(ctx, sub, x + 22 + 200, y + 33, { font: F.serif(700, 22), color: C.gray, alpha: a });
        const ch = new K.Chart(BOARD.candles, { x: x + 24, y: y + 64, w: w - 48, h: 240 });
        ch.draw(ctx, S.lin(beat, 0, 2.2) * n, { alpha: a, glow: .5, color: i => BOARD.candles[i].c >= BOARD.candles[i].o ? upCol : dnCol });
        ROWS.forEach(([nm, px, ch2], j) => {
          const ry = y + 344 + j * 46, ra = a * S.at(beat, .6 + j * .12, .5), col = ch2 >= 0 ? upCol : dnCol;
          ctx.save(); ctx.globalAlpha *= ra; ctx.strokeStyle = rgba(C.gold, .14); ctx.beginPath(); ctx.moveTo(x + 22, ry + 14); ctx.lineTo(x + w - 22, ry + 14); ctx.stroke(); ctx.restore();
          K.text(ctx, nm, x + 26, ry, { font: F.serif(500, 22), color: C.white, alpha: ra });
          K.text(ctx, px, x + 330, ry, { font: F.mono(22), color: col, align: 'right', alpha: ra });
          ctx.save(); ctx.globalAlpha *= ra; ctx.fillStyle = col; ctx.beginPath(); ctx.roundRect(x + w - 150, ry - 24, 124, 32, 4); ctx.fill(); ctx.restore();
          K.text(ctx, (ch2 >= 0 ? '+' : '') + ch2.toFixed(2) + '%', x + w - 88, ry - 1, { font: F.mono(20), color: '#FFFFFF', align: 'center', alpha: ra });
        });
        ctx.restore();
      };
      board(250, C.red, C.green, '中国市场', '红涨绿跌', S.at(1, -.6, .9), 1);
      board(1030, C.green, C.red, '国际市场', '绿涨红跌', S.at(2, -.6, .9), 2);
      // the swap
      const sw = S.at(3, 0, .8), o = Math.sin(t * 3) * 8;
      K.arrow(ctx, 925 - o, 470, 995 + o, 470, { p: sw, alpha: sw, color: C.red, width: 2.5 });
      K.arrow(ctx, 995 + o, 520, 925 - o, 520, { p: sw, alpha: sw, color: C.green, width: 2.5 });
      K.tag(ctx, 960, 210, '同一份数据 · SAME DATA', { alpha: S.at(0, .4, .7) * (1 - S.at(4, 0, .5)) });
      K.tag(ctx, 960, 210, '配色不同 · 逻辑相同', { alpha: S.at(4, .2, .6), color: C.goldHi });
    } },

  { id: 'culture', header: H4, tr: ['push', 1], camera: { z0: 1.02, z1: 1.06, x1: -20 },
    lines: ['在东方文化里，[红色]象征喜庆与好运；', '西方则常把<绿色>与财富（美钞的颜色）、安全相连，', '而[红色]，往往意味着赤字与危险。', '所以看海外行情时，先确认{颜色规则}，别把涨跌看反。'],
    visual(ctx, S) {
      const t = S.t;
      // a paper lantern (geometric)
      const la = S.at(0, -.2, .9, easeBack);
      if (la > 0) {
        const x = 480, y = 460 + Math.sin(t * 1.2) * 6, a = clamp(la);
        const g = ctx.createRadialGradient(x, y, 0, x, y, 260); g.addColorStop(0, rgba(C.red, .22 * a)); g.addColorStop(1, rgba(C.red, 0)); ctx.fillStyle = g; ctx.fillRect(x - 260, y - 260, 520, 520);
        ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = C.gold; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(x, 250); ctx.lineTo(x, y - 140); ctx.stroke();
        const bg = ctx.createRadialGradient(x - 20, y - 20, 10, x, y, 130); bg.addColorStop(0, '#FF7A6E'); bg.addColorStop(.6, '#D8343B'); bg.addColorStop(1, '#8E1E24');
        ctx.fillStyle = bg; ctx.shadowColor = rgba(C.red, .7); ctx.shadowBlur = 40; ctx.beginPath(); ctx.ellipse(x, y, 115, 125, 0, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(120,24,28,.6)'; ctx.lineWidth = 1.4;
        for (const k of [-.7, -.35, 0, .35, .7]) { ctx.beginPath(); ctx.ellipse(x, y, Math.abs(k) * 115, 125, 0, -Math.PI / 2, Math.PI / 2, k < 0); ctx.stroke(); }
        ctx.fillStyle = C.gold; ctx.fillRect(x - 46, y - 140, 92, 22); ctx.fillRect(x - 46, y + 118, 92, 22);
        ctx.strokeStyle = C.gold; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.moveTo(x + k * 6, y + 140); ctx.lineTo(x + k * 6, y + 200 + Math.sin(t * 2 + k) * 4); ctx.stroke(); }
        ctx.restore();
        K.text(ctx, '喜庆 · 好运', x, 740, { font: F.serif(700, 28), color: C.red, align: 'center', alpha: a, glow: .5, glowColor: C.red });
        K.text(ctx, '', x, 760, { font: F.serif(500, 20), color: C.gray, align: 'center', spacing: 6, alpha: a });
      }
      // a traffic light that keeps changing its mind
      const tl = S.at(0, .8, .8);
      if (tl > 0) {
        const x = 960, y = 330, blink = .5 + .5 * Math.sin(t * 2), phase = lerp(lerp(blink, 0, S.at(1, 0, .5)), 1, S.at(2, 0, .5));   // red weight, eased: the lights cross-fade, never snap
        panel(ctx, x - 55, y, 110, 300, { alpha: tl, r: 22, fill: 'rgba(12,10,8,.95)', line: .6 });
        [[C.red, y + 60, phase], ['#D9A43A', y + 150, 0], [C.green, y + 240, 1 - phase]].forEach(([col, ly, on]) => {
          ctx.save(); ctx.globalAlpha *= tl; ctx.fillStyle = rgba(col, .16 + .84 * on); ctx.shadowColor = col; ctx.shadowBlur = 40 * on;
          ctx.beginPath(); ctx.arc(x, ly, 34, 0, TAU); ctx.fill(); ctx.restore();
        });
        K.text(ctx, '同一颜色 · 不同含义', x, 700, { font: F.serif(700, 24), color: C.goldHi, align: 'center', alpha: tl });
      }
      // a banknote (generic) and a deficit figure
      const na = S.at(1, 0, .9, easeBack);
      if (na > 0) {
        const x = 1440, y = 410, a = clamp(na);
        ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.rotate(-.05);
        ctx.fillStyle = '#16402C'; ctx.shadowColor = rgba(C.green, .6); ctx.shadowBlur = 30; ctx.fillRect(-160, -78, 320, 156); ctx.shadowBlur = 0;
        ctx.strokeStyle = rgba('#7FD8A8', .7); ctx.lineWidth = 1.4; ctx.strokeRect(-148, -66, 296, 132);
        ctx.beginPath(); ctx.arc(0, 0, 44, 0, TAU); ctx.stroke();
        ctx.restore();
        K.text(ctx, '$', x, y + 18, { font: F.latin(500, 58), color: '#9FE6BE', align: 'center', alpha: a });
        K.text(ctx, '财富 · 安全', x, 548, { font: F.serif(700, 28), color: C.green, align: 'center', alpha: a, glow: .5, glowColor: C.green });
      }
      K.tag(ctx, 960, 250, '先确认颜色规则 · CHECK THE COLOURS', { alpha: S.at(3, .2, .7), font: F.serif(700, 22) });
      const da = S.at(2, 0, .8);
      if (da > 0) {
        panel(ctx, 1290, 590, 300, 72, { alpha: da, color: C.red, line: .8, glow: .4 });
        K.text(ctx, '-1,250,000', 1440, 638, { font: F.mono(32), color: C.red, align: 'center', alpha: da });
        K.text(ctx, '赤字 · 危险', 1440, 712, { font: F.serif(700, 28), color: C.red, align: 'center', alpha: da, glow: .5, glowColor: C.red });
        K.text(ctx, '', 1440, 742, { font: F.serif(500, 20), color: C.gray, align: 'center', spacing: 6, alpha: da });
      }
    } },

  /* ================= 结语 ================= */
  { id: 'flame', header: H5, tr: ['iris', [960, 420]], camera: { z0: 1.05, z1: 1.0 }, chapter: '结语：照亮人性迷宫的蜡烛',
    lines: ['K线图历经约三百年而长盛不衰，', '因为市场在变，人性的[贪婪]与<恐惧>却从未改变。', '它不只是一张价格走势图，', '更是一面照亮{人性迷宫}的镜子。', '读懂K线，读懂的终究是{人心}。'],
    visual(ctx, S) {
      const t = S.t, cx = 960, top = 470, bot = 760;
      const m = S.at(2, 0, 1.8, easeInOut), mirror = S.at(3, 0, 1.4);
      // the maze, lit by the flame's radius
      const rad = lerp(120, 560, S.at(0, 0, 3)) * (1 - .5 * m) + mirror * 900;
      for (const [x1, y1, x2, y2] of MAZE) {
        const d = Math.hypot((x1 + x2) / 2 - cx, (y1 + y2) / 2 - 400), a = clamp(1 - d / rad) * (.55 - .3 * m + .2 * mirror);
        if (a <= .01) continue;
        ctx.save(); ctx.strokeStyle = rgba(C.gold, a); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
      }
      // modern chart forms on either side once the flame becomes a candlestick
      if (m > 0) {
        const L = new K.Chart(FINALE.slice(0, 10), { x: 260, y: 360, w: 560, h: 400 }), Rr = new K.Chart(FINALE.slice(10, 20), { x: 1100, y: 330, w: 560, h: 400 });
        L.draw(ctx, S.lin(2, .6, 2) * 10, { alpha: .55 * m, glow: .3 }); Rr.draw(ctx, S.lin(2, 1.0, 2) * 10, { alpha: .55 * m, glow: .3 });
      }
      // the wax candle → a red candlestick
      const body = mix('#E9DCC0', C.red, m), w = lerp(120, 110, m);
      ctx.save(); const bg = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
      bg.addColorStop(0, mix('#B9A57E', mix(C.red, '#000000', .2), m)); bg.addColorStop(.45, body); bg.addColorStop(1, mix('#8E7C58', mix(C.red, '#000000', .3), m));
      ctx.fillStyle = bg; ctx.shadowColor = rgba(m > .5 ? C.red : C.goldHi, .45); ctx.shadowBlur = 36; ctx.fillRect(cx - w / 2, top, w, bot - top); ctx.restore();
      if (m < 1) { ctx.save(); ctx.globalAlpha *= 1 - m; ctx.fillStyle = '#F4EAD2'; ctx.beginPath(); ctx.ellipse(cx, top, w / 2, 8, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      // wicks: the flame shrinks into the upper shadow, a lower shadow grows
      ctx.save(); ctx.strokeStyle = mix('#3A2C18', C.red, m); ctx.lineWidth = 6; ctx.shadowColor = rgba(C.red, .6 * m); ctx.shadowBlur = 16 * m;
      ctx.beginPath(); ctx.moveTo(cx, top); ctx.lineTo(cx, top - lerp(14, 110, m)); ctx.moveTo(cx, bot); ctx.lineTo(cx, bot + 60 * m); ctx.stroke(); ctx.restore();
      flame(ctx, cx, top - 12 - 90 * m, lerp(30, 6, m), lerp(118, 30, m), t, 1 - m);
      // words of the two forces
      const em = S.at(1, .4, .8) * (1 - m);
      K.text(ctx, '贪婪', cx - 260, 600, { font: F.serif(900, 44), color: C.red, align: 'center', alpha: em, glow: .5, glowColor: C.red });
      K.text(ctx, '恐惧', cx + 260, 600, { font: F.serif(900, 44), color: C.green, align: 'center', alpha: em, glow: .5, glowColor: C.green });
      K.tag(ctx, cx, 270, '约三百年 · 长盛不衰', { alpha: S.at(0, .6, .7) * (1 - S.at(2, 0, .5)) });
      K.tag(ctx, cx, 270, '人性之镜 · A MIRROR', { alpha: mirror * (1 - S.at(4, 0, .5)), font: F.serif(700, 22) });
      K.text(ctx, '人心', cx, 300, { font: F.serif(900, 56), color: C.goldHi, align: 'center', spacing: 20, alpha: S.at(4, .2, .9), glow: .8 });
      if (mirror > 0) K.marker(ctx, cx, (top + bot) / 2, { alpha: mirror * .9, r: 120, pulse: clamp(((t - S.beat(3)) * .5) % 1) });
    } },

  /* ================= RECAP & END ================= */
  { id: 'recap', tr: 'dissolve', camera: { z0: 1.03, z1: 1.0 },
    lines: ['堂岛米市，催生了早期的{期货交易}；', '酒田战法，被视为{K线的前身}；', '尼森西传，让{蜡烛图}走向世界；', '红涨绿跌，映照着{东西方文化}的差异。'],
    visual(ctx, S) {
      const rows = [['壹', '米市', '期货萌芽', C.goldHi], ['贰', '酒田', 'K线前身', C.red], ['叁', '西传', '蜡烛图', C.goldHi], ['肆', '红绿', '文化之别', C.green]];
      rows.forEach(([n, a, b, col], i) => {
        const p = S.at(i, 0, .9), y = 290 + i * 118;
        ctx.save(); ctx.globalAlpha = p; ctx.translate((1 - p) * -60, 0);
        K.goldText(ctx, n, 640, y + 22, 60, { weight: 900 });
        K.text(ctx, a, 760, y + 18, { font: F.serif(900, 46), color: C.white });
        K.line(ctx, 900, y, 1120, y, { p, color: rgba(C.gold, .6) });
        K.text(ctx, b, 1150, y + 16, { font: F.serif(700, 40), color: col, glow: .4, glowColor: col });
        ctx.restore();
      });
      K.rule(ctx, 960, 790, 420, S.at(3, .4, 1.2));
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
      K.text(ctx, 'K线图的前世今生', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(1.2, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.6, 1) });
    } },
  ],
};
})();

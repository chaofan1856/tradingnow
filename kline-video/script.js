/* ============================================================
   《K线与动能博弈》 — content for the TradingNow film engine (index.html)

   A scene:
     { id, header?, lines?: [subtitle markup], visual?(ctx, S, K), tr?: transition into this scene,
       camera?: {z0,z1,x0,x1,y0,y1}, dur?: fixed seconds, noWatermark? }
   Subtitle markup:  {金色重点}  [红色/多头]  <绿色/空头>
   S (scene clock):  S.t, S.at(line, delay, dur) → eased 0..1, S.lin(...), S.p(sec, dur), S.beat(line)
   K (drawing kit):  see index.html — text, goldText, rich, candle, Chart, gen.path/seq, dotted, dash,
                     line, rule, arrow, marker, bracket, vbrace, tag, baseline
   Transitions:      'zoom' | ['push', ±1] | 'sweep' | ['iris', [x,y]] | 'dissolve'
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, rgba, mix, F } = K;
const BOX = { x: 260, y: 250, w: 1400, h: 500 };          // standard chart stage (above the subtitle zone)
const R = K.rng(2026);

/* header presets */
const H0 = { label: '导言', sub: '博弈符号的本质', en: 'The Nature of the Symbols', zh: '《K线与动能博弈》' };
const H1 = { label: '模块', num: 1, sub: 'K线基础构造', en: 'Anatomy of a Candlestick', zh: '《多空符号的解构》' };
const H2 = { label: '模块', num: 2, sub: '市场三大趋势识别', en: 'Reading the Trend', zh: '《秩序的轨迹》' };
const H3 = { label: '模块', num: 3, sub: '动能增强与衰竭', en: 'Momentum Gain & Loss', zh: '《博弈的温度》' };

/* ---------- shared visual pieces ---------- */
const easeBack = x => { x = clamp(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

/** chapter card: 壹/贰/叁 → title → subtitle, with the gold rule */
function chapter(numCn, idx, title, en, sub) {
  return (ctx, S) => {
    const cx = 960;
    const a = S.p(0.15, 1.0);
    K.text(ctx, `MODULE · 0${idx}`, cx, 330, { font: F.latin(500, 20), color: C.gold, align: 'center', spacing: 9, alpha: S.p(0.1, 1) });
    // big numeral, slowly breathing glow
    ctx.save(); ctx.translate(cx, 470); const s = lerp(1.25, 1, easeOut(S.t / 1.6)); ctx.scale(s, s);
    K.goldText(ctx, numCn, 0, 0, 120, { alpha: a, glow: .8 + .2 * Math.sin(S.t * 2) });
    ctx.restore();
    K.rule(ctx, cx, 535, 280, S.p(0.6, 1.2));
    // title rises through a mask
    ctx.save(); ctx.beginPath(); ctx.rect(0, 548, 1920, 100); ctx.clip();
    const tp = S.p(0.9, 1.1, K.expo);
    K.text(ctx, title, cx, 625 + (1 - tp) * 70, { font: F.serif(900, 62), color: C.white, align: 'center', spacing: 14, alpha: tp });
    ctx.restore();
    K.text(ctx, en.toUpperCase(), cx, 690, { font: F.latin(500, 20), color: C.gray, align: 'center', spacing: 7, alpha: S.p(1.5, 1) });
    K.text(ctx, sub, cx, 736, { font: F.serif(500, 22), color: C.gray, align: 'center', spacing: 6, alpha: S.p(1.8, 1) });
  };
}

/** the big anatomy candle (shared by the Real-Body/Wick scenes) */
const AN = { x: 1180, open: 600, close: 380, high: 268, low: 712, w: 128 };

/* ---------- data ---------- */
const UP = K.gen.path([100, 109, 104, 116, 110, 124, 117, 132, 126, 140], { per: [5, 3, 5, 3, 5, 3, 5, 3, 5], seed: 11, noise: .5 });
const DOWN = K.gen.path([140, 131, 136, 124, 130, 116, 122, 108, 114, 100], { per: [5, 3, 5, 3, 5, 3, 5, 3, 5], seed: 12, noise: .5 });
const RANGE = K.gen.path([105, 115, 101.5, 114.6, 101, 115.2, 100.8, 114.8, 101.2, 108], { per: [4, 5, 4, 5, 4, 5, 4, 5, 3], seed: 13, noise: 1.3, wick: .7 });
const chartUP = new K.Chart(UP.candles, BOX), chartDOWN = new K.Chart(DOWN.candles, BOX), chartRANGE = new K.Chart(RANGE.candles, BOX, { lo: 95, hi: 121 });

const chop = K.gen.seq(100, [[1.2, .9, .8], [-1.4, .8, 1.1], [.9, 1.3, .6], [-1.1, .7, 1.2], [1.5, .9, .9], [-.8, 1.1, .7], [1.0, .6, 1.0], [-.6, .9, .8]]);
const tightRun = K.gen.seq(chop[chop.length - 1].c, Array.from({ length: 15 }, (_, i) => [1.25 + R() * .45, .12 + R() * .1, .1 + R() * .08]));
const TIGHT = [...chop, ...tightRun], chartTIGHT = new K.Chart(TIGHT, BOX);

const GROW_R = K.gen.seq(100, [[.5, .2, .2], [.9, .2, .2], [1.5, .25, .2], [2.3, .3, .25], [3.3, .35, .3], [4.6, .4, .3]]);
const GROW_G = K.gen.seq(113, [[-.5, .2, .2], [-.9, .2, .2], [-1.5, .2, .25], [-2.3, .25, .3], [-3.3, .3, .35], [-4.6, .3, .4]]);
const chartGR = new K.Chart(GROW_R, { x: 300, y: 270, w: 560, h: 470 }), chartGG = new K.Chart(GROW_G, { x: 1060, y: 270, w: 560, h: 470 });

const wideA = K.gen.seq(100, Array.from({ length: 11 }, () => [1.2 + R() * .4, .15, .12]));
const wideB = K.gen.seq(wideA[wideA.length - 1].c, [[2.2, 3.6, 2.8], [-3.4, 1.8, 3.9], [3.0, 4.2, 2.4], [-4.0, 2.6, 4.4], [2.4, 4.0, 3.5], [-2.8, 3.2, 3.6]]);
const WIDE = [...wideA, ...wideB], chartWIDE = new K.Chart(WIDE, BOX);

const SHRINK = K.gen.seq(100, [[1.4, .2, .2], [2.1, .25, .2], [4.6, .3, .3], [3.6, .45, .3], [2.6, .6, .35], [1.7, .8, .4], [1.0, .9, .5], [.5, 1.0, .6], [.22, 1.0, .7]]);
const chartSHRINK = new K.Chart(SHRINK, BOX, { body: .5 });

const CC = K.gen.seq(100, [[.6, .5, .4], [-.4, .4, .5], [1.6, .3, .2], [2.4, .35, .25], [2.9, .4, .3], [3.1, .5, .3], [2.6, .8, .3], [-3.0, .35, .6], [-.8, .5, .9]]);
const chartCC = new K.Chart(CC, BOX, { body: .5 });

/* mini charts for the summary triptych */
const mini = (path, x) => new K.Chart(path.candles, { x, y: 330, w: 440, h: 330 }, path === RANGE ? { lo: 95, hi: 121 } : {});
const MINI = [mini(UP, 180), mini(DOWN, 740), mini(RANGE, 1300)];

/** swing labels for trends */
function swings(ctx, S, chart, path, labelOf, from, d = .35) {
  path.swings.forEach((s, j) => {
    if (j === 0) return;
    const a = S.at(...from, d) * clamp((S.t - S.beat(from[0]) - from[1] - j * .18) / .4);
    if (a <= 0) return;
    const y = chart.y(s.price) + (s.type === 'H' ? -14 : 14);
    K.marker(ctx, chart.x(s.i), y, { alpha: a, r: 7, label: labelOf(s, j), pos: s.type === 'H' ? 'above' : 'below', font: F.latin(500, 21), color: C.goldHi });
  });
}
const zig = (chart, path) => [[chart.x(0), chart.y(path.candles[0].o)], ...path.swings.map(s => [chart.x(s.i), chart.y(s.price) + (s.type === 'H' ? -14 : 14)])];

window.FILM = {
  title: 'K线与动能博弈',
  transition: 1.1,
  subtitle: { x: 220, y: 912, size: 42, maxW: 1480 },
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', camera: { z0: 1.08, z1: 1.0 }, lines: ['你每天看到的K线，', '并不是{随机跳动的数字}。'],
    visual(ctx, S) {
      // a tape of price dots streams in, then every dot condenses into candles
      const N = 150, R2 = K.rng(5);
      const pts = []; let p = 0;
      for (let i = 0; i < N; i++) { p += (R2() - .48) * 9; pts.push([180 + i * 10.4, 520 + p + Math.sin(i * .2) * 26]); }
      const reveal = S.lin(0, -.3, 2.6);
      K.baseline(ctx, 180, 1740, 700, { p: S.at(0, 0, 1.6), step: 52, alpha: .9 });
      for (let i = 0; i < N * reveal; i++) {
        const [x, y] = pts[i];
        const cond = S.at(1, .4 + i * .004, .9);                     // dots gather into bars on line 2
        const group = Math.floor(i / 6), gx = 180 + group * 62.4 + 31;
        const xx = lerp(x, gx, cond);
        ctx.fillStyle = rgba(C.goldHi, .85 - cond * .5); ctx.shadowColor = C.gold; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(xx, y, 1.8, 0, 6.2832); ctx.fill();
      }
      ctx.shadowBlur = 0;
      const ca = S.at(1, 1.2, 1.2);
      if (ca > 0) for (let g = 0; g < N / 6; g++) {
        const seg = pts.slice(g * 6, g * 6 + 6), ys = seg.map(q => q[1]);
        const yf = v => v, k = { o: -seg[0][1], c: -seg[5][1], h: -Math.min(...ys), l: -Math.max(...ys) };
        K.candle(ctx, 180 + g * 62.4 + 31, k, v => -v, { w: 26, alpha: ca, grow: clamp(ca * 1.6 - g * .02), glow: .4 });
      }
    } },

  /* ================= TITLE ================= */
  { id: 'title', dur: 5.2, tr: 'zoom', camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const cx = 960;
      // candle silhouettes rising behind the title
      const bg = K.gen.path([100, 108, 103, 114, 109, 121, 115, 128], { per: 6, seed: 3 });
      const ch = new K.Chart(bg.candles, { x: 120, y: 200, w: 1680, h: 640 });
      ch.draw(ctx, S.lin(0, -.2, 3.2) * bg.candles.length, { alpha: .16, glow: 0, color: () => C.gold });
      K.text(ctx, 'CANDLESTICKS  &  MOMENTUM', cx, 400, { font: F.latin(500, 24), color: C.gold, align: 'center', spacing: 12, alpha: S.p(.3, 1.2) });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 410, 1920, 150); ctx.clip();
      const tp = S.p(.5, 1.4, K.expo);
      K.goldText(ctx, 'K线与动能博弈', cx, 528 + (1 - tp) * 110, 112, { spacing: 18 });
      ctx.restore();
      // light sweep across the title
      const sw = clamp((S.t - 1.8) / 1.3);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(500, 1420, sw), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,240,200,.28)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, 410, 180, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 330, S.p(1.3, 1.4));
      K.text(ctx, '三大模块 · 读懂多空博弈的语言', cx, 650, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 8, alpha: S.p(2.0, 1.2) });
    } },

  /* ================= 导言 ================= */
  { id: 'intro', header: H0, tr: ['iris', [960, 470]],
    lines: ['每一根K线，都是多空双方在特定时间内，', '用{真金白银}博弈后留下的——', '{情绪切片}与{信用脚印}。', '在中国资本市场，[红色]代表多头的炽热与上涨，', '<绿色>代表空头的冰冷与下跌。', '看懂这套红绿符号，是进入{博弈大局}的第一步。'],
    visual(ctx, S) {
      const y = v => v;
      // one gold candle assembles from dust, then splits into the two camps
      const split = S.at(3, 0, 1.4, easeInOut);
      const form = S.at(0, 0, 1.6);
      const R3 = K.rng(9);
      if (form < 1) for (let i = 0; i < 90; i++) {
        const tx = 960 + (R3() - .5) * 90, ty = 300 + R3() * 340, sx = 960 + (R3() - .5) * 1400, sy = 470 + (R3() - .5) * 800;
        const p = easeOut(form * 1.3 - R3() * .3);
        ctx.fillStyle = rgba(C.goldHi, .8 * (1 - form)); ctx.beginPath(); ctx.arc(lerp(sx, tx, p), lerp(sy, ty, p), 1.8, 0, 6.2832); ctx.fill();
      }
      const g = S.at(0, .9, 1.2);
      const redX = lerp(960, 760, split), grnX = lerp(960, 1160, split);
      const kU = { o: 600, c: 380, h: 300, l: 660 }, kD = { o: 380, c: 600, h: 300, l: 660 };
      const yinv = v => v;  // already in px; flip so o<c reads correctly
      const pxCandle = (x, up, col, a) => {
        ctx.save(); ctx.globalAlpha = a; ctx.shadowColor = rgba(col, .55); ctx.shadowBlur = 26;
        ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x, lerp(490, 300, g)); ctx.lineTo(x, lerp(490, 660, g)); ctx.stroke();
        ctx.fillStyle = col; const hgt = lerp(4, 220, g); ctx.fillRect(x - 46, 490 - hgt / 2, 92, hgt); ctx.restore();
      };
      const col0 = mix(C.gold, C.red, split);
      pxCandle(redX, true, col0, g);
      if (split > 0) pxCandle(grnX, false, mix(C.gold, C.green, split), split);
      // emotion & credit captions around the single candle (lines 2)
      const em = S.at(2, 0, .8) * (1 - split);
      K.tag(ctx, 760, 420, '情绪切片', { alpha: em, color: C.gold });
      K.tag(ctx, 1160, 560, '信用脚印', { alpha: em, color: C.gold });
      K.line(ctx, 830, 420, 905, 450, { alpha: em * .7, p: em });
      K.line(ctx, 1090, 560, 1015, 530, { alpha: em * .7, p: em });
      // camp labels
      const la = S.at(3, .7, .8), lb = S.at(4, 0, .8);
      K.text(ctx, '多头 · 上涨', redX, 730, { font: F.serif(700, 30), color: C.red, align: 'center', alpha: la, glow: .4, glowColor: C.red });
      K.text(ctx, 'BULLISH', redX, 766, { font: F.latin(500, 18), color: C.gray, align: 'center', spacing: 6, alpha: la });
      K.text(ctx, '空头 · 下跌', grnX, 730, { font: F.serif(700, 30), color: C.green, align: 'center', alpha: lb, glow: .4, glowColor: C.green });
      K.text(ctx, 'BEARISH', grnX, 766, { font: F.latin(500, 18), color: C.gray, align: 'center', spacing: 6, alpha: lb });
      // heat & cold auras
      if (la > 0) { const r = ctx.createRadialGradient(redX, 490, 0, redX, 490, 260); r.addColorStop(0, rgba(C.red, .16 * la)); r.addColorStop(1, rgba(C.red, 0)); ctx.fillStyle = r; ctx.fillRect(redX - 260, 230, 520, 520); }
      if (lb > 0) { const r = ctx.createRadialGradient(grnX, 490, 0, grnX, 490, 260); r.addColorStop(0, rgba(C.green, .14 * lb)); r.addColorStop(1, rgba(C.green, 0)); ctx.fillStyle = r; ctx.fillRect(grnX - 260, 230, 520, 520); }
      K.rule(ctx, 960, 205, 260, S.at(5, 0, 1.2));
    } },

  /* ================= 模块一 ================= */
  { id: 'ch1', dur: 4.2, tr: 'sweep', noHeaderFade: true, visual: chapter('壹', 1, '多空符号的解构', 'Anatomy of a Candlestick', 'K线基础构造 · 实体 · 影线 · 十字星') },

  { id: 'anatomy', header: H1, tr: 'zoom', camera: { z0: 1.02, z1: 1.07, x1: -30 },
    lines: ['单根K线由{实体}（Real Body）与{影线}（Wicks）组成，', '记录了特定周期内的四个关键价格：{OHLC}。',
      '[红色K线]：阳线，看涨，Bullish——价格上涨，多头占优。', '开盘价在实体{底部}，收盘价在实体{顶部}，', '收盘高于开盘，所以一路{向上飘红}。',
      '<绿色K线>：阴线，看跌，Bearish——价格下跌，空头占优。', '开盘价在实体{顶部}，收盘价在实体{底部}，', '收盘低于开盘，所以一路{向下走绿}。'],
    visual(ctx, S) {
      const flip = S.at(5, 0, 1.3, easeInOut);                       // red → green morph
      const col = mix(C.red, C.green, flip);
      const g = S.at(0, 0, 1.2, easeBack);
      const x = AN.x, bodyTop = AN.close, bodyBot = AN.open;
      // body & wicks grow from the centre
      const cy = (bodyTop + bodyBot) / 2;
      ctx.save(); ctx.shadowColor = rgba(col, .5); ctx.shadowBlur = 30;
      ctx.strokeStyle = col; ctx.lineWidth = 4;
      const wg = S.at(0, .5, 1.0);
      ctx.beginPath(); ctx.moveTo(x, lerp(bodyTop, AN.high, wg)); ctx.lineTo(x, bodyTop); ctx.moveTo(x, bodyBot); ctx.lineTo(x, lerp(bodyBot, AN.low, wg)); ctx.stroke();
      ctx.fillStyle = col; const hh = (bodyBot - bodyTop) * clamp(g, 0, 1.2);
      ctx.fillRect(x - AN.w / 2, cy - hh / 2, AN.w, hh);
      ctx.restore();
      // braces on the right
      K.vbrace(ctx, x + 110, bodyTop, bodyBot, '实体', { sub: 'REAL BODY', p: S.at(0, .9, .8) });
      K.vbrace(ctx, x + 110, AN.high, bodyTop - 8, '影线', { sub: 'WICK', p: S.at(0, 1.4, .8), labelColor: C.gray });
      K.vbrace(ctx, x + 110, bodyBot + 8, AN.low, '影线', { sub: 'WICK', p: S.at(0, 1.6, .8), labelColor: C.gray });
      // OHLC leaders on the left; O and C trade places as the candle turns green
      const oY = lerp(bodyBot, bodyTop, flip), cY = lerp(bodyTop, bodyBot, flip);
      const lab = [['最高价', 'HIGH', AN.high, 0], ['收盘价', 'CLOSE', cY, .25], ['开盘价', 'OPEN', oY, .5], ['最低价', 'LOW', AN.low, .75]];
      for (const [zh, en, yy, d] of lab) {
        const a = S.at(1, d, .7);
        if (a <= 0) continue;
        K.dash(ctx, x - AN.w / 2 - 18, yy, x - 420, yy, { p: a, alpha: .7, color: C.gold, dash: [3, 6] });
        K.text(ctx, zh, x - 440, yy + 9, { font: F.serif(700, 26), color: (zh === '开盘价' || zh === '收盘价') ? C.goldHi : C.white, align: 'right', alpha: a });
        K.text(ctx, en, x - 440, yy + 36, { font: F.latin(500, 17), color: C.gray, align: 'right', spacing: 3, alpha: a });
      }
      // direction arrow open → close
      const ar = S.at(3, .3, 1.0) * (1 - S.at(5, 0, .5));
      K.arrow(ctx, x, bodyBot - 16, x, bodyTop + 16, { p: ar, alpha: ar, color: '#FFE8C8', width: 3, head: 18 });
      const ar2 = S.at(6, .3, 1.0);
      K.arrow(ctx, x, bodyTop + 16, x, bodyBot - 16, { p: ar2, alpha: ar2, color: '#E6FFF2', width: 3, head: 18 });
      // type tag
      K.tag(ctx, x, 210, '阳线 · BULLISH', { alpha: S.at(2, 0, .6) * (1 - flip), color: C.red });
      K.tag(ctx, x, 210, '阴线 · BEARISH', { alpha: flip, color: C.green });
    } },

  { id: 'wicks', header: H1, tr: ['push', 1],
    lines: ['影线里，藏着多空交锋的{秘密}。', '无论红绿，上影线顶端都是该周期的{最高点}——', '那是[多头冲锋的极限]。', '下影线底端，则是该周期的{最低点}——', '那是<空头打压的极限>。'],
    visual(ctx, S) {
      const y = v => v, a0 = S.at(0, 0, .9, easeBack);
      const ks = [[760, { o: 560, c: 390, h: 260, l: 680 }, C.red], [1160, { o: 400, c: 570, h: 290, l: 700 }, C.green]];
      for (const [x, k, col] of ks) {
        ctx.save(); ctx.globalAlpha = clamp(a0); ctx.shadowColor = rgba(col, .45); ctx.shadowBlur = 22;
        ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x, k.h); ctx.lineTo(x, k.l); ctx.stroke();
        ctx.fillStyle = col; const top = Math.min(k.o, k.c), hh = Math.abs(k.o - k.c) * a0; ctx.fillRect(x - 50, top + (Math.abs(k.o - k.c) - hh) / 2, 100, hh); ctx.restore();
      }
      // highs
      const hiA = S.at(1, 0, .8), pulse1 = clamp((S.t - S.beat(1)) % 1.6 / 1.6);
      for (const [x, k] of ks) {
        ctx.save(); ctx.globalAlpha = hiA; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 4; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.moveTo(x, k.h); ctx.lineTo(x, Math.min(k.o, k.c)); ctx.stroke(); ctx.restore();
        K.marker(ctx, x, k.h, { alpha: hiA, pulse: hiA > .99 ? pulse1 : 0 });
      }
      K.dash(ctx, 560, 260, 1360, 260, { p: hiA, alpha: .45, dash: [4, 8] });
      K.text(ctx, '最高点 HIGH', 1400, 268, { font: F.serif(700, 26), color: C.goldHi, alpha: hiA });
      const atk = S.at(2, 0, .9);
      K.arrow(ctx, 960, 330, 960, 200, { p: atk, alpha: atk, color: C.red, width: 2.5 });
      K.text(ctx, '多头冲锋的极限', 990, 220, { font: F.serif(700, 22), color: C.red, alpha: atk });
      // lows
      const loA = S.at(3, 0, .8), pulse2 = clamp((S.t - S.beat(3)) % 1.6 / 1.6);
      for (const [x, k] of ks) {
        ctx.save(); ctx.globalAlpha = loA; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 4; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 22;
        ctx.beginPath(); ctx.moveTo(x, k.l); ctx.lineTo(x, Math.max(k.o, k.c)); ctx.stroke(); ctx.restore();
        K.marker(ctx, x, k.l, { alpha: loA, pulse: loA > .99 ? pulse2 : 0 });
      }
      K.dash(ctx, 560, 700, 1360, 700, { p: loA, alpha: .45, dash: [4, 8] });
      K.text(ctx, '最低点 LOW', 1400, 708, { font: F.serif(700, 26), color: C.goldHi, alpha: loA });
      const sup = S.at(4, 0, .9);
      K.arrow(ctx, 960, 640, 960, 770, { p: sup, alpha: sup, color: C.green, width: 2.5 });
      K.text(ctx, '空头打压的极限', 990, 770, { font: F.serif(700, 22), color: C.green, alpha: sup });
    } },

  { id: 'doji', header: H1, tr: 'zoom', camera: { z0: 1.0, z1: 1.06, x1: 20 },
    lines: ['当实体极小，甚至几乎没有实体——', '开盘价与收盘价几乎重合，这就是{十字星}（Doji）。', '它代表市场{极度犹豫}（Indecision）：', '多空双方激烈厮杀一整轮，', '最终{回到原点}，谁也没能吞噬谁。'],
    visual(ctx, S) {
      // a live trace on the left builds the candle on the right
      const keys = [0, .55, .2, 1.0, .35, -.25, -1.0, -.55, .3, -.1, .03];
      const T0 = S.beat(0), Tlen = S.beat(2) + .6 - T0;
      const u = clamp((S.t - T0) / Tlen), N = 220;
      const price = s => { const f = s * (keys.length - 1), i = Math.min(keys.length - 2, Math.floor(f)), w = easeInOut(f - i); return lerp(keys[i], keys[i + 1], w) + Math.sin(s * 70) * .04 * Math.sin(s * Math.PI); };
      const px = s => 300 + s * 560, py = v => 490 - v * 190;
      K.baseline(ctx, 300, 860, 740, { p: S.at(0, 0, 1), step: 56 });
      K.dash(ctx, 280, py(0), 1440, py(0), { alpha: .35, dash: [3, 7], p: S.at(0, 0, 1.2) });
      K.text(ctx, '开盘', 270, py(0) + 7, { font: F.serif(500, 18), color: C.gray, align: 'right', alpha: S.at(0, 0, 1) });
      const pts = []; let hi = 0, lo = 0;
      for (let i = 0; i <= N * u; i++) { const s = i / N, v = price(s); pts.push([px(s), py(v)]); hi = Math.max(hi, v); lo = Math.min(lo, v); }
      if (pts.length > 1) K.dotted(ctx, pts, 1, { gap: 6, r: 1.6 });
      const cur = price(u);
      // candle
      const cx = 1180, k = { o: 0, c: cur, h: hi, l: lo };
      const col = u >= 1 ? C.goldHi : (cur >= 0 ? C.red : C.green);
      if (u > 0) {
        ctx.save(); ctx.shadowColor = rgba(col, .5); ctx.shadowBlur = 22; ctx.strokeStyle = col; ctx.lineWidth = 3.5;
        ctx.beginPath(); ctx.moveTo(cx, py(hi)); ctx.lineTo(cx, py(lo)); ctx.stroke();
        ctx.fillStyle = col; const t0 = py(Math.max(0, cur)), b0 = py(Math.min(0, cur)); ctx.fillRect(cx - 55, t0, 110, Math.max(b0 - t0, 3.5));
        ctx.restore();
        // the live price dot linking trace & candle
        if (u < 1) { ctx.save(); ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 18; ctx.beginPath(); ctx.arc(px(u), py(cur), 5, 0, 6.2832); ctx.fill(); ctx.restore(); K.dash(ctx, px(u), py(cur), cx - 60, py(cur), { alpha: .5, dash: [2, 5] }); }
      }
      // doji horizontal bar when finished
      const done = S.at(1, .2, .8);
      if (u >= 1) {
        ctx.save(); ctx.globalAlpha = done; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 5; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(cx - 70, py(0)); ctx.lineTo(cx + 70, py(0)); ctx.stroke(); ctx.restore();
      }
      K.tag(ctx, cx, 205, '十字星 · DOJI', { alpha: S.at(1, .6, .7) });
      K.text(ctx, '开盘价 ≈ 收盘价', cx + 110, py(0) + 9, { font: F.serif(700, 24), color: C.goldHi, alpha: S.at(1, 1, .7) });
      // tug of war
      const war = S.at(3, 0, .8) * (1 - S.at(4, .8, .8)), osc = Math.sin((S.t - S.beat(3)) * 7) * 10;
      K.arrow(ctx, cx, py(0) - 40, cx, py(1) - 10 - osc, { p: war, alpha: war, color: C.red, width: 3 });
      K.arrow(ctx, cx, py(0) + 40, cx, py(-1) + 10 + osc, { p: war, alpha: war, color: C.green, width: 3 });
      K.text(ctx, '多', cx - 40, py(.8), { font: F.serif(900, 30), color: C.red, align: 'right', alpha: war });
      K.text(ctx, '空', cx - 40, py(-.8) + 20, { font: F.serif(900, 30), color: C.green, align: 'right', alpha: war });
      // back to origin
      const home = S.at(4, .3, 1.2), ring = clamp((S.t - S.beat(4) - .3) % 1.8 / 1.8);
      K.marker(ctx, cx, py(0), { alpha: home, r: 12, pulse: home > .99 ? ring : 0, label: '回到原点', pos: 'right', font: F.serif(700, 24) });
    } },

  /* ================= 模块二 ================= */
  { id: 'ch2', dur: 4.2, tr: 'sweep', visual: chapter('贰', 2, '秩序的轨迹', 'Reading the Trend', '上涨 · 下跌 · 震荡') },

  { id: 'runs', header: H2, tr: 'zoom',
    lines: ['市场不会直线运行。', '它通过{波段冲锋}（Runs）与{回调修正}（Pullbacks），', '以特定的秩序向前延伸。'],
    visual(ctx, S) {
      const wp = [[300, 720], [520, 520], [640, 600], [880, 410], [1000, 490], [1260, 320], [1380, 390], [1600, 250]];
      K.baseline(ctx, 280, 1660, 760, { p: S.at(0, 0, 1.2) });
      // a straight line that "fails", then the real path
      const st = S.at(0, .2, 1.2) * (1 - S.at(1, 0, .6));
      K.dash(ctx, 300, 720, 1600, 250, { p: st, alpha: st * .6, color: C.gray, dash: [6, 10] });
      K.text(ctx, '×  直线', 1620, 250, { font: F.serif(700, 24), color: C.gray, alpha: st });
      const p = S.lin(1, 0, 3.2);
      K.dotted(ctx, wp, easeInOut(p), { gap: 7, r: 2 });
      for (let i = 1; i < wp.length; i++) {
        const a = S.at(1, .3 + i * .38, .5); if (a <= 0) continue;
        const [x0, y0] = wp[i - 1], [x1, y1] = wp[i], up = y1 < y0, mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        K.text(ctx, up ? '冲锋' : '回调', mx + (up ? -30 : 30), my + (up ? 0 : 30), { font: F.serif(700, 22), color: up ? C.red : C.green, align: up ? 'right' : 'left', alpha: a });
        K.text(ctx, up ? 'RUN' : 'PULLBACK', mx + (up ? -30 : 30), my + (up ? 26 : 56), { font: F.latin(500, 15), color: C.gray, align: up ? 'right' : 'left', spacing: 3, alpha: a });
      }
      K.arrow(ctx, 1600, 250, 1680, 214, { p: S.at(2, 0, .8), alpha: S.at(2, 0, .8) });
    } },

  { id: 'up', header: H2, tr: ['push', 1], camera: { z0: 1.04, z1: 1.0, x0: 40, x1: -20 },
    lines: ['[上涨趋势]：高点更高（Higher High），低点更高（Higher Low）。', '画面呈现一波高过一波的{红色阳线潮}。', '多头掌控全局——', '顺应红色的群体动能，策略以{逢低做多}（Long）为主。'],
    visual(ctx, S) {
      const n = UP.candles.length;
      K.baseline(ctx, BOX.x, BOX.x + BOX.w, BOX.y + BOX.h + 30, { p: S.at(0, 0, 1) });
      chartUP.draw(ctx, S.lin(0, 0, 4.2) * n);
      K.dotted(ctx, zig(chartUP, UP), S.lin(1, 0, 2.2), { alpha: .9 });
      swings(ctx, S, chartUP, UP, s => s.type === 'H' ? 'HH' : 'HL', [1, .2]);
      const ga = S.at(2, 0, 1);
      if (ga > 0) { const g = ctx.createLinearGradient(0, BOX.y + BOX.h, 0, BOX.y); g.addColorStop(0, rgba(C.red, 0)); g.addColorStop(1, rgba(C.red, .1 * ga)); ctx.fillStyle = g; ctx.fillRect(BOX.x, BOX.y, BOX.w, BOX.h); }
      UP.swings.filter(s => s.type === 'L').forEach((s, j) => { const a = S.at(3, .2 + j * .25, .6); K.tag(ctx, chartUP.x(s.i), chartUP.y(s.price) + 80, '做多 LONG', { alpha: a, color: C.red, font: F.serif(700, 17) }); });
    } },

  { id: 'down', header: H2, tr: ['push', 1], camera: { z0: 1.04, z1: 1.0, x0: 40, x1: -20 },
    lines: ['<下跌趋势>：高点更低（Lower High），低点更低（Lower Low）。', '画面呈现一波低过一波的{绿色阴线潮}。', '空头用绿色撕扯市场——', '策略以{逢高做空}（Short）为主。'],
    visual(ctx, S) {
      const n = DOWN.candles.length;
      K.baseline(ctx, BOX.x, BOX.x + BOX.w, BOX.y + BOX.h + 30, { p: S.at(0, 0, 1) });
      chartDOWN.draw(ctx, S.lin(0, 0, 4.2) * n);
      K.dotted(ctx, zig(chartDOWN, DOWN), S.lin(1, 0, 2.2), { alpha: .9 });
      swings(ctx, S, chartDOWN, DOWN, s => s.type === 'H' ? 'LH' : 'LL', [1, .2]);
      const ga = S.at(2, 0, 1);
      if (ga > 0) { const g = ctx.createLinearGradient(0, BOX.y, 0, BOX.y + BOX.h); g.addColorStop(0, rgba(C.green, 0)); g.addColorStop(1, rgba(C.green, .1 * ga)); ctx.fillStyle = g; ctx.fillRect(BOX.x, BOX.y, BOX.w, BOX.h); }
      DOWN.swings.filter(s => s.type === 'H').forEach((s, j) => { const a = S.at(3, .2 + j * .25, .6); K.tag(ctx, chartDOWN.x(s.i), chartDOWN.y(s.price) - 80, '做空 SHORT', { alpha: a, color: C.green, font: F.serif(700, 17) }); });
    } },

  { id: 'range', header: H2, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05 },
    lines: ['{震荡市场}：价格在几乎相同的高点与低点之间横向移动。', '红绿交织、横向拉锯，像一场{泥潭战}。', '多空势均力敌，', '处于{筹码密集换手}的无序状态。'],
    visual(ctx, S) {
      const n = RANGE.candles.length, ch = chartRANGE;
      const yH = ch.y(115.6), yL = ch.y(100.4);
      const band = S.at(1, 0, 1.2);
      if (band > 0) { ctx.fillStyle = rgba(C.gold, .06 * band); ctx.fillRect(BOX.x, yH, BOX.w * band, yL - yH); }
      K.baseline(ctx, BOX.x, BOX.x + BOX.w, BOX.y + BOX.h + 30, { p: S.at(0, 0, 1) });
      ch.draw(ctx, S.lin(0, 0, 4.5) * n);
      const la = S.at(0, 2.4, 1.2);
      K.dash(ctx, BOX.x, yH, BOX.x + BOX.w, yH, { p: la, alpha: .8 });
      K.dash(ctx, BOX.x, yL, BOX.x + BOX.w, yL, { p: la, alpha: .8 });
      K.text(ctx, '相同高点 SAME HIGHS', BOX.x, yH - 16, { font: F.serif(700, 21), color: C.goldHi, alpha: la });
      K.text(ctx, '相同低点 SAME LOWS', BOX.x, yL + 34, { font: F.serif(700, 21), color: C.goldHi, alpha: la });
      // tug arrows inside the band
      const war = S.at(2, 0, .8), o = Math.sin((S.t) * 5) * 14;
      K.arrow(ctx, 960 + o, (yH + yL) / 2, 760 + o, (yH + yL) / 2, { p: war, alpha: war, color: C.green });
      K.arrow(ctx, 960 + o, (yH + yL) / 2, 1160 + o, (yH + yL) / 2, { p: war, alpha: war, color: C.red });
      K.tag(ctx, 960, BOX.y - 10, '筹码密集换手', { alpha: S.at(3, .2, .7) });
    } },

  { id: 'trio', header: H2, tr: 'zoom',
    lines: ['记住这三种秩序：', '[上涨]看更高的高低点，<下跌>看更低的高低点，', '{震荡}看相同的高低点。'],
    visual(ctx, S) {
      const names = [['上涨趋势', 'UPTREND', C.red, 'HH · HL', '逢低做多'], ['下跌趋势', 'DOWNTREND', C.green, 'LH · LL', '逢高做空'], ['震荡市场', 'RANGING', C.goldHi, 'SAME H · L', '多空拉锯']];
      MINI.forEach((ch, i) => {
        const a = S.at(0, .15 + i * .25, .9, easeBack), x0 = ch.box.x;
        ctx.save(); ctx.globalAlpha = clamp(a); ctx.translate(0, (1 - clamp(a)) * 40);
        ctx.strokeStyle = rgba(C.gold, .35); ctx.lineWidth = 1; ctx.strokeRect(x0 - 20, 250, 480, 520);
        const hl = i === 0 ? S.at(1, 0, .6) : i === 1 ? S.at(1, 1.6, .6) : S.at(2, 0, .6);
        ctx.strokeStyle = rgba(names[i][2], .9 * hl); ctx.lineWidth = 2; ctx.shadowColor = names[i][2]; ctx.shadowBlur = 20 * hl; ctx.strokeRect(x0 - 20, 250, 480, 520); ctx.shadowBlur = 0;
        K.text(ctx, names[i][0], x0 + 220, 300, { font: F.serif(900, 30), color: names[i][2], align: 'center' });
        K.text(ctx, names[i][1], x0 + 220, 708, { font: F.latin(500, 18), color: C.gray, align: 'center', spacing: 6 });
        K.text(ctx, names[i][3] + '  ·  ' + names[i][4], x0 + 220, 745, { font: F.serif(700, 20), color: C.white, align: 'center' });
        ch.draw(ctx, S.lin(0, .4 + i * .25, 2.2) * ch.k.length, { glow: .2 });
        ctx.restore();
      });
    } },

  /* ================= 模块三 ================= */
  { id: 'ch3', dur: 4.2, tr: 'sweep', visual: chapter('叁', 3, '博弈的温度', 'Momentum Gain & Loss', '动能增强 · 动能衰竭 · 反转信号') },

  { id: 'temp', header: H3, tr: ['iris', [960, 480]],
    lines: ['如何在{反转发生之前}，', '洞察人性的[贪婪]增涨，或<恐惧>离场？', '答案藏在K线的{颜色}与{实体大小}里。'],
    visual(ctx, S) {
      // a breathing row of candles: bodies swell (greed) then shrink (fear)
      const n = 13, a = S.at(0, 0, 1);
      for (let i = 0; i < n; i++) {
        const x = 420 + i * 90, ph = S.t * 1.6 - i * .45, s = .5 + .5 * Math.sin(ph);
        const up = i < 7, col = up ? C.red : C.green, hh = (40 + s * 190) * clamp(a * 1.4 - i * .03);
        ctx.save(); ctx.globalAlpha = clamp(a * 1.4 - i * .03); ctx.shadowColor = rgba(col, .45); ctx.shadowBlur = 18;
        ctx.strokeStyle = col; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x, 480 - hh / 2 - 30); ctx.lineTo(x, 480 + hh / 2 + 30); ctx.stroke();
        ctx.fillStyle = col; ctx.fillRect(x - 22, 480 - hh / 2, 44, hh); ctx.restore();
      }
      const g = S.at(1, 0, .7), f = S.at(1, 1.0, .7);
      K.text(ctx, '贪婪', 300, 500, { font: F.serif(900, 48), color: C.red, align: 'right', alpha: g, glow: .5, glowColor: C.red });
      K.text(ctx, '恐惧', 1620, 500, { font: F.serif(900, 48), color: C.green, alpha: f, glow: .5, glowColor: C.green });
      K.rule(ctx, 960, 760, 520, S.at(2, 0, 1.2));
      K.text(ctx, '颜色  ×  实体大小', 960, 230, { font: F.serif(700, 30), color: C.goldHi, align: 'center', spacing: 6, alpha: S.at(2, .2, .8) });
    } },

  { id: 'tight', header: { ...H3, sub: '动能增强 · Momentum Gain' }, tr: 'zoom', camera: { z0: 1.0, z1: 1.06, x1: -40 },
    lines: ['动能增强 · 形态一：{紧凑排列}（Tight Price Movement）。', 'K线紧密相连，一连串{没有杂色}的红线，', '中间没有剧烈的反向波动，也没有长影线。', '主导方{完全控盘}，对手盘甚至没有反抗的余地。'],
    visual(ctx, S) {
      const n = TIGHT.length, ch = chartTIGHT, c0 = chop.length;
      K.baseline(ctx, BOX.x, BOX.x + BOX.w, BOX.y + BOX.h + 30, { p: S.at(0, 0, 1) });
      const dim = S.at(3, 0, 1);
      ch.draw(ctx, S.lin(0, 0, 4.4) * n, { dim: i => i < c0 ? 1 - dim * .7 : 1 });
      const b = S.at(1, 0, 1);
      const yTop = Math.min(...tightRun.map(k => ch.y(k.h))) - 40;
      K.bracket(ctx, ch.x(c0) - 20, ch.x(n - 1) + 20, yTop, '紧凑排列', { p: b, sub: 'TIGHT · NO MIXED COLOURS' });
      // momentum line hugging the run
      const pts = tightRun.map((k, j) => [ch.x(c0 + j), ch.y(k.l) + 26]);
      K.dotted(ctx, pts, S.lin(2, 0, 1.6), { alpha: .8 });
      K.text(ctx, '无长影 · 无反向波动', ch.x(c0 + 10) + 30, ch.y(tightRun[10].l) + 70, { font: F.serif(700, 20), color: C.gray, align: 'left', alpha: S.at(2, .6, .8) });
      K.tag(ctx, ch.x(c0 + 7), ch.y(tightRun[7].l) + 140, '完全控盘', { alpha: S.at(3, .2, .7), color: C.red });
    } },

  { id: 'grow', header: { ...H3, sub: '动能增强 · Momentum Gain' }, tr: ['push', 1],
    lines: ['形态二：{实体放大}（Growing Candles）。', '连续同色K线的实体越来越大——', '[红色越来越大]，代表买盘疯狂；', '<绿色越来越大>，代表恐慌抛售。', '多头或空头正在{加速冲锋}，动能处于极盛期。'],
    visual(ctx, S) {
      const pair = [[chartGR, GROW_R, 2, C.red, '买盘疯狂'], [chartGG, GROW_G, 3, C.green, '恐慌抛售']];
      for (const [ch, ks, beat, col, word] of pair) {
        const r = S.lin(beat, -.4, 2.2) * ks.length;
        K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, 790, { p: S.at(1, 0, 1), step: 40 });
        ch.draw(ctx, r, { glow: .45 });
        // body-size meter under each candle
        ks.forEach((k, i) => { const g = clamp(r - i); if (g <= 0) return; const h = Math.abs(k.c - k.o) * 12 * easeOut(g); ctx.fillStyle = rgba(col, .65); ctx.fillRect(ch.x(i) - 10, 800, 20, h); });
        const pk = S.at(beat, 1.6, .7);
        K.arrow(ctx, ch.x(0), 840, ch.x(5) + 30, 840 + 0, { p: pk, alpha: pk * .8, color: col });
        K.text(ctx, word, ch.box.x + ch.box.w / 2, 235, { font: F.serif(900, 32), color: col, align: 'center', alpha: pk, glow: .4, glowColor: col });
      }
      const peak = S.at(4, 0, .9);
      K.tag(ctx, 960, 500, '动能极盛', { alpha: peak, color: C.gold, font: F.serif(700, 24) });
    }, subY: 1000 },

  { id: 'wide', header: { ...H3, sub: '动能衰竭 · Momentum Loss' }, tr: 'sweep', camera: { z0: 1.0, z1: 1.05 },
    lines: ['动能衰竭 · 信号一：{宽幅震荡}（Wide Swings）。', '在一段紧凑趋势后，突然出现剧烈的上下波动与长影线。', '主导方正在{失去绝对控制权}，', '对手盘大规模反扑，趋势随时可能{终结}。'],
    visual(ctx, S) {
      const ch = chartWIDE, n = WIDE.length, a0 = wideA.length;
      K.baseline(ctx, BOX.x, BOX.x + BOX.w, BOX.y + BOX.h + 30, { p: S.at(0, 0, 1) });
      const r = S.at(1, -.2, .01) > 0 ? a0 + S.lin(1, 0, 2.6) * (n - a0) : S.lin(0, 0, 2.2) * a0;
      // shake the camera a touch as the wide candles land
      const shake = r > a0 ? Math.sin(S.t * 31) * 2.5 * (1 - S.at(2, 0, 1)) : 0;
      ctx.save(); ctx.translate(shake, 0);
      ch.draw(ctx, r);
      ctx.restore();
      K.bracket(ctx, ch.x(0) - 10, ch.x(a0 - 1) + 10, ch.y(wideA[0].l) + 60, '紧凑趋势', { up: false, p: S.at(0, 1.6, .8), labelColor: C.gray });
      const zone = S.at(1, 1.4, .9);
      if (zone > 0) {
        const x0 = ch.x(a0) - 30, x1 = ch.x(n - 1) + 30;
        ctx.fillStyle = rgba(C.gold, .07 * zone); ctx.fillRect(x0, BOX.y - 20, (x1 - x0) * zone, BOX.h + 40);
        K.bracket(ctx, x0, x1, BOX.y - 30, '宽幅震荡', { p: zone, sub: 'WIDE SWINGS' });
      }
      const ctl = S.at(2, 0, .8);
      K.tag(ctx, ch.x(a0 + 3), BOX.y + BOX.h - 10, '控制权松动', { alpha: ctl, color: C.gold });
      const back = S.at(3, 0, .8);
      K.arrow(ctx, ch.x(n - 1) + 60, ch.y(WIDE[n - 1].h) - 10, ch.x(n - 1) + 60, ch.y(WIDE[n - 1].l) + 60, { p: back, alpha: back, color: C.green, width: 3 });
      K.text(ctx, '反扑', ch.x(n - 1) + 80, ch.y(WIDE[n - 1].l) + 40, { font: F.serif(900, 26), color: C.green, alpha: back });
    } },

  { id: 'shrink', header: { ...H3, sub: '动能衰竭 · Momentum Loss' }, tr: ['push', 1],
    lines: ['信号二：{实体缩小}（Shrinking Candles）。', '连续同色K线的实体越来越小，行进距离锐减。', '冲锋后劲不足——', '多头（[红色变小]）或空头（<绿色变小>）已{精疲力竭}。'],
    visual(ctx, S) {
      const ch = chartSHRINK, n = SHRINK.length;
      K.baseline(ctx, BOX.x, BOX.x + BOX.w, BOX.y + BOX.h + 30, { p: S.at(0, 0, 1) });
      ch.draw(ctx, S.lin(0, 0, 3.6) * n, { glow: .4 });
      // body-size curve: momentum fading
      const pts = SHRINK.map((k, i) => [ch.x(i), 880 - 34 - Math.abs(k.c - k.o) * 0]);
      const mpts = SHRINK.slice(2).map((k, i) => [ch.x(i + 2), BOX.y + BOX.h - 30 - Math.abs(k.c - k.o) * 34]);
      K.dotted(ctx, mpts, S.lin(1, 0, 2), { alpha: .9, r: 2 });
      K.text(ctx, '动能', mpts[0][0] - 20, mpts[0][1] + 6, { font: F.serif(700, 22), color: C.goldHi, align: 'right', alpha: S.at(1, 0, .6) });
      const ex = S.at(2, 0, .8);
      K.arrow(ctx, mpts[mpts.length - 1][0] + 30, mpts[mpts.length - 1][1] - 50, mpts[mpts.length - 1][0] + 30, mpts[mpts.length - 1][1] + 10, { p: ex, alpha: ex });
      K.bracket(ctx, ch.x(4) - 20, ch.x(n - 1) + 20, ch.y(SHRINK[n - 1].h) - 50, '行进距离锐减', { p: S.at(1, .8, .8) });
      K.tag(ctx, ch.x(n - 1) + 50, ch.y(SHRINK[n - 1].c), '精疲力竭', { alpha: S.at(3, .4, .7), color: C.gold, align: 'left' });
    } },

  { id: 'color', header: { ...H3, sub: '动能衰竭 · Momentum Loss' }, tr: 'zoom', camera: { z0: 1.0, z1: 1.08, x1: -60, y1: 10 },
    lines: ['信号三：{颜色突变}（Color Change）。', '在一连串汹涌的[红色阳线]之后，', '突然刺入一根<无法创出新高的绿色阴线>。', '原有的价格惯性未能延续——', '多空动能遭到{实质性阻断}。'],
    visual(ctx, S) {
      const ch = chartCC, n = CC.length, g = 7;
      K.baseline(ctx, BOX.x, BOX.x + BOX.w, BOX.y + BOX.h + 30, { p: S.at(0, 0, 1) });
      const r = S.after(2) ? g + S.lin(2, .3, .8) * (n - g) : S.lin(0, 0, 3.2) * g;
      ch.draw(ctx, r, { glow: .4, dim: i => i < g ? 1 - S.at(3, 0, 1) * .45 : 1 });
      const prevHi = Math.max(...CC.slice(0, g).map(k => k.h));
      const la = S.at(2, 0, .8);
      K.dash(ctx, ch.x(2) - 30, ch.y(prevHi), ch.x(n - 1) + 120, ch.y(prevHi), { p: la, alpha: .8 });
      K.text(ctx, '前高', ch.x(n - 1) + 140, ch.y(prevHi) + 8, { font: F.serif(700, 22), color: C.goldHi, alpha: la });
      const gx = ch.x(g), hit = S.at(2, 1.0, .5);
      K.marker(ctx, gx, ch.y(CC[g].h) - 16, { alpha: hit, label: '未创新高 ×', pos: 'left', color: C.green, labelColor: C.green, pulse: clamp((S.t - S.beat(2) - 1) % 1.5 / 1.5) * (hit > .99 ? 1 : 0) });
      // the momentum wall
      const wall = S.at(4, 0, .9);
      if (wall > 0) {
        ctx.save(); ctx.globalAlpha = wall; const gr = ctx.createLinearGradient(gx - 40, 0, gx + 40, 0);
        gr.addColorStop(0, rgba(C.goldHi, 0)); gr.addColorStop(.5, rgba(C.goldHi, .35)); gr.addColorStop(1, rgba(C.goldHi, 0));
        ctx.fillStyle = gr; ctx.fillRect(gx - 40, BOX.y - 40 + (1 - wall) * 300, 80, (BOX.h + 80) * wall); ctx.restore();
        K.line(ctx, gx, BOX.y - 40, gx, BOX.y + BOX.h + 40, { p: wall, glow: .8, color: C.goldHi, width: 2 });
        K.tag(ctx, gx, BOX.y + BOX.h + 72, '动能阻断', { alpha: wall, color: C.gold, font: F.serif(700, 22) });
      }
      const inertia = S.at(3, 0, 1) * (1 - S.at(4, 0, .6));
      K.dotted(ctx, CC.slice(2, g).map((k, i) => [ch.x(i + 2), ch.y(k.h) - 30]).concat([[ch.x(g) + 40, ch.y(prevHi) - 90]]), inertia, { alpha: inertia, color: C.red });
    } },

  /* ================= RECAP & END ================= */
  { id: 'recap', tr: 'dissolve', camera: { z0: 1.03, z1: 1.0 },
    lines: ['K线，是多空博弈的{情绪切片}；', '趋势，是市场运行的{秩序轨迹}；', '动能，是这场博弈的{温度}。', '读懂它们，才算真正读懂了{多空博弈}。'],
    visual(ctx, S) {
      const rows = [['壹', 'K线', '情绪切片', C.red], ['贰', '趋势', '秩序轨迹', C.goldHi], ['叁', '动能', '博弈温度', C.green]];
      rows.forEach(([n, a, b, col], i) => {
        const p = S.at(i, 0, .9), y = 330 + i * 140;
        ctx.save(); ctx.globalAlpha = p; ctx.translate((1 - p) * -60, 0);
        K.goldText(ctx, n, 640, y + 22, 64, { weight: 900 });
        K.text(ctx, a, 760, y + 18, { font: F.serif(900, 48), color: C.white });
        K.line(ctx, 900, y, 1120, y, { p, color: rgba(C.gold, .6) });
        K.text(ctx, b, 1150, y + 16, { font: F.serif(700, 40), color: col, glow: .4, glowColor: col });
        ctx.restore();
      });
      K.rule(ctx, 960, 760, 420, S.at(3, 0, 1.2));
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
      K.text(ctx, 'K线与动能博弈', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(1.2, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.6, 1) });
    } },
  ],
};
})();

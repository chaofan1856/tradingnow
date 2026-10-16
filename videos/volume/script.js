/* ============================================================
   《市场的测谎仪：成交量》 — content for the TradingNow film engine (index.html)

   A scene:
     { id, header?, lines?: [subtitle markup], visual?(ctx, S, K), tr?: transition into this scene,
       camera?: {z0,z1,x0,x1,y0,y1}, dur?: fixed seconds, noWatermark? }
   Subtitle markup:  {金色重点}  [红色/多头]  <绿色/空头>
   S (scene clock):  S.t, S.at(line, delay, dur) → eased 0..1, S.lin(...), S.p(sec, dur), S.beat(line)
   K (drawing kit):  see index.html — text, goldText, rich, candle, Chart, gen.path/seq, dotted, dash,
                     line, rule, arrow, marker, bracket, vbrace, tag, baseline
   Transitions:      'zoom' | ['push', ±1] | 'sweep' | ['iris', [x,y]] | 'dissolve'
   All visuals are original drawings (no photos, logos or portraits); people appear only as
   names or anonymous silhouettes; ticker symbols on the tape are generic placeholders.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, rgba, mix, F } = K;
const TITLE = '市场的测谎仪：成交量';

/* header presets */
const H0 = { label: '导言', sub: '价格与成交量', en: 'Volume · The Lie Detector', zh: '《市场的测谎仪》' };
const H1 = { label: '模块', num: 1, sub: '黑板、纸带与量价觉醒', en: 'Chalkboards & Ticker Tape', zh: '《量价的雏形》' };
const H2 = { label: '模块', num: 2, sub: '威科夫与主力资金', en: 'Richard Wyckoff', zh: '《主力的底牌》' };
const H3 = { label: '模块', num: 3, sub: '格兰维尔与 OBV 能量潮', en: 'On-Balance Volume', zh: '《价格的火车头》' };
const H4 = { label: '模块', num: 4, sub: '2021 游戏驿站逼空大战', en: 'The 2021 Short Squeeze', zh: '《成交量海啸》' };

/* ---------- shared visual pieces ---------- */
const easeBack = x => { x = clamp(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const hash = n => { let x = Math.imul((n | 0) ^ 0x9E3779B9, 0x85EBCA6B); x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
const fmt = n => (n < 0 ? '-' : '+') + Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/** chapter card: 壹/贰/叁/肆 → title → subtitle, with the gold rule */
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

/** volume bars drawn under a K.Chart, aligned to its candles */
function vbars(ctx, ch, vols, base, hmax, reveal, o = {}) {
  const vmax = o.vmax || Math.max(...vols), w = o.w || ch.cw;
  for (let i = 0; i < vols.length && i < Math.ceil(reveal); i++) {
    const g = easeOut(clamp(reveal - i)); if (g <= 0) continue;
    const k = ch.k[i], col = o.color ? o.color(i) : (k.c >= k.o ? C.red : C.green);
    const a = (o.alpha ?? .6) * (o.dim ? o.dim(i) : 1); if (a <= .002) continue;
    const h = vols[i] / vmax * hmax * g;
    ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col;
    if (o.glow) { ctx.shadowColor = rgba(col, o.glow); ctx.shadowBlur = 14; }
    ctx.fillRect(ch.x(i) - w / 2, base - h, w, h); ctx.restore();
  }
}

/** anonymous head-and-shoulders silhouette; (x,y) = head centre, s ≈ head radius. Spans y-s … y+4.25s */
function silhouette(ctx, x, y, s, o = {}) {
  const a = o.alpha ?? 1; if (a <= .002) return;
  const k = s / 40, col = o.color || C.gold;
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y); ctx.scale(k, k);
  ctx.fillStyle = o.fill || 'rgba(16,13,10,.94)'; ctx.strokeStyle = rgba(col, .9); ctx.lineWidth = 1.6 / k;
  ctx.shadowColor = rgba(col, .55); ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.moveTo(-18, 30); ctx.lineTo(-16, 58); ctx.bezierCurveTo(-70, 66, -112, 92, -120, 170); ctx.lineTo(120, 170);
  ctx.bezierCurveTo(112, 92, 70, 66, 16, 58); ctx.lineTo(18, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(0, 0, 36, 42, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
  ctx.restore();
}

/** a footprint (sole + heel) */
function footprint(ctx, x, y, s, rot, a, col = C.goldHi) {
  if (a <= .002) return;
  ctx.save(); ctx.globalAlpha *= clamp(a); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(s, s);
  ctx.fillStyle = col; ctx.shadowColor = rgba(col, .85); ctx.shadowBlur = 16;
  ctx.beginPath(); ctx.ellipse(0, -12, 11, 17, 0, 0, 6.2832); ctx.fill();
  ctx.beginPath(); ctx.ellipse(1, 18, 8, 10, 0, 0, 6.2832); ctx.fill();
  ctx.restore();
}

/** paper ticker tape: emerges at x0 and travels right; `off` = px of paper fed so far.
 *  item(n) → {sym, size, px}. o: {fs, h, hl (0..1 gold highlight on the share size), alpha} */
const INK = '#2A251E';
function tapeStrip(ctx, x0, x1, y, off, sp, item, o = {}) {
  const h = o.h || 74, xe = Math.min(x1, x0 + off); if (xe <= x0) return;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
  g.addColorStop(0, 'rgba(178,162,128,.92)'); g.addColorStop(.14, 'rgba(214,200,170,.9)'); g.addColorStop(.86, 'rgba(214,200,170,.9)'); g.addColorStop(1, 'rgba(160,144,112,.92)');
  ctx.fillStyle = g; ctx.shadowColor = 'rgba(0,0,0,.65)'; ctx.shadowBlur = 14; ctx.fillRect(x0, y - h / 2, xe - x0, h); ctx.shadowBlur = 0;
  ctx.beginPath(); ctx.rect(x0, y - h / 2, xe - x0, h); ctx.clip();
  const fs = o.fs || 24, nMax = Math.floor(off / sp), nMin = Math.max(0, Math.floor((off - (x1 - x0)) / sp) - 1);
  ctx.font = F.mono(fs);
  for (let n = nMin; n <= nMax; n++) {
    const it = item(n), left = x0 + off - (n + 1) * sp + 18;
    K.text(ctx, it.sym, left, y - h * .12, { font: F.mono(fs), color: INK });
    const sw = ctx.measureText(it.size).width;
    if (o.hl) { ctx.fillStyle = rgba(C.gold, .35 * o.hl); ctx.fillRect(left - 4, y + h * .14, sw + 8, fs * 1.05); }
    K.text(ctx, it.size, left, y + h * .36, { font: F.mono(fs), color: o.hl ? mix(INK, '#7A4E08', o.hl) : INK });
    K.text(ctx, it.px, left + sw + fs * .8, y + h * .36, { font: F.mono(fs), color: INK });
    ctx.fillStyle = rgba(INK, .35); ctx.fillRect(left - 18, y - h / 2 + 8, 1, h - 16);
  }
  ctx.restore();
}
const SYM = ['STKA', 'STKB', 'STKC', 'STKD', 'STKE', 'STKF'];
const tapeItem = (sizes, seed) => n => {
  const r = hash(n * 13 + seed), r2 = hash(n * 7 + seed * 3);
  return { sym: SYM[Math.floor(r * SYM.length)], size: sizes[Math.floor(r2 * sizes.length)], px: (40 + Math.floor(r * 2000) / 100).toFixed(2) };
};

/* ---------- data ---------- */
// cold open + finale charts
const OPEN = K.gen.path([100, 106, 102, 110, 105, 113, 108, 116], { per: [3, 3, 3, 3, 3, 3, 2], seed: 5, noise: .5 }).candles;
const chOPEN = new K.Chart(OPEN, { x: 260, y: 250, w: 1240, h: 270 });
const VR = (() => { const r = K.rng(404), a = []; for (let i = 0; i < 3000; i++) a.push(.1 + r() * .16 + (r() < .13 ? .35 + r() * .5 : 0)); return a; })();
const volTrace = s => { if (s < 0) return 0; const f = s / 15, i = Math.floor(f); return lerp(VR[i % 3000], VR[(i + 1) % 3000], f - i); };
const ma = (ks, n) => ks.map((_, i) => { const a = ks.slice(Math.max(0, i - n + 1), i + 1); return a.reduce((s, k) => s + k.c, 0) / a.length; });

// chapter 1 · volume bars under candles
const BARS = K.gen.seq(100, [[1.2, .4, .3], [.9, .3, .3], [-.4, .3, .3], [1.5, .4, .3], [1.3, .4, .3], [-.5, .3, .4], [1.8, .4, .3], [1.4, .5, .3], [1.6, .4, .3], [-.3, .3, .3],
  [.8, .4, .3], [.6, .5, .3], [-.3, .4, .3], [.6, .6, .3], [.4, .7, .3], [.35, .8, .3], [-.2, .6, .3], [.25, .9, .4], [-1.2, .4, .5], [-1.6, .3, .6], [-1.0, .4, .5]]);
const BARV = [60, 70, 45, 85, 95, 50, 110, 120, 130, 60, 70, 62, 40, 55, 48, 42, 35, 38, 70, 85, 80];
const chBARS = new K.Chart(BARS, { x: 260, y: 262, w: 1400, h: 300 });

// chapter 2 · effort vs result
const EFF = K.gen.seq(100, [[1.4, .4, .3], [-.5, .3, .4], [1.6, .4, .3], [1.2, .3, .3], [-.6, .4, .4], [1.8, .5, .3], [1.3, .4, .3], [-.4, .3, .4], [1.5, .4, .3], [1.1, .5, .4],
  [.25, .9, .7], [-.15, 1.0, .8], [.2, .8, .9], [-.25, .9, .7], [.1, 1.1, .8],
  [-1.4, .3, .4], [-1.8, .4, .5], [.5, .4, .3], [-1.6, .3, .5], [-1.2, .4, .4], [-1.5, .3, .5]]);
const EFFV = [52, 40, 58, 55, 38, 62, 57, 36, 60, 55, 170, 200, 175, 185, 160, 95, 110, 60, 105, 90, 100];
const chEFF = new K.Chart(EFF, { x: 260, y: 262, w: 1400, h: 300 });

// chapter 2 · the Composite Man
const CMK = K.gen.path([100, 96, 99.5, 96.2, 99.8, 96.5, 100.2, 111, 108, 111.8, 108.6, 111.5], { per: [3, 3, 3, 3, 3, 3, 4, 3, 3, 3, 3], seed: 31, noise: .35 }).candles;
const GI = [4, 10, 17, 19, 21, 26, 31];
const CMV = (() => { const r = K.rng(32); return CMK.map((k, i) => GI.includes(i) ? 160 + r() * 40 : (k.c >= k.o ? 38 + r() * 22 : 28 + r() * 16)); })();
const chCM = new K.Chart(CMK, { x: 250, y: 250, w: 1000, h: 250 });

// chapter 3 · OBV worked example (day 0 = reference)
const OB = K.gen.seq(100, [[.8, .4, .3], [1.3, .4, .3], [-.9, .3, .4], [1.6, .4, .3], [-.6, .3, .4], [-1.1, .3, .5], [1.8, .5, .3], [1.0, .4, .3]]);
const OBV_V = [900, 1200, 800, 1500, 600, 1000, 1800, 1300];
const obvOf = (ks, vs) => { const out = [0]; for (let i = 1; i < ks.length; i++) out.push(out[i - 1] + (ks[i].c > ks[i - 1].c ? vs[i] : ks[i].c < ks[i - 1].c ? -vs[i] : 0)); return out; };
const OB_OBV = obvOf(OB, OBV_V);
const chOB = new K.Chart(OB, { x: 360, y: 240, w: 1200, h: 180 });

// chapter 3 · the dam: flat price, rising OBV, then the breakout
const DAMA = K.gen.path([100, 103, 99.6, 103.2, 99.8, 103, 100, 103.3, 101.2], { per: 3, seed: 21, noise: .4, wick: .5 }).candles;
const DAMB = K.gen.seq(DAMA[23].c, [[2.6, .5, .3], [3.4, .6, .4], [1.8, .5, .4], [4.2, .7, .4], [2.4, .6, .5], [4.8, .8, .4], [2.2, .7, .5], [3.6, .8, .4]]);
const DAM = [...DAMA, ...DAMB];
const DAMV = (() => { const r = K.rng(64); return DAM.map((k, i) => i < 24 ? (k.c >= k.o ? 1000 + r() * 500 : 420 + r() * 260) : 1400 + r() * 600); })();
const DAM_OBV = obvOf(DAM, DAMV);
const chDAM = new K.Chart(DAM, { x: 260, y: 240, w: 1400, h: 230 });

// chapter 4 · GME (stylised, prices in USD)
const TSA = K.gen.seq(17.6, [[.6, .8, .5], [-.4, .6, .7], [.9, .7, .4], [-.5, .5, .6], [.3, .6, .5], [-.7, .4, .8], [.5, .9, .4], [.8, .6, .5], [-.3, .7, .6], [.6, .8, .4], [1.1, .9, .5]]);
const TSB = [{ o: 20.5, c: 31, h: 38, l: 20 }, { o: 31, c: 39.5, h: 43, l: 30 }, { o: 39.5, c: 43, h: 46, l: 36 }, { o: 43, c: 65, h: 76, l: 42 },
  { o: 65, c: 147, h: 159, l: 61 }, { o: 147, c: 347, h: 380, l: 140 }, { o: 350, c: 193, h: 483, l: 112 }];
const TS = [...TSA, ...TSB];
const TSV = [9, 7, 8, 6, 7, 9, 8, 10, 9, 12, 14, 140, 62, 48, 190, 178, 182, 96];
const chTS = new K.Chart(TS, { x: 300, y: 240, w: 1300, h: 370 }, { lo: 0, hi: 520 });

// finale
const QK = K.gen.path([100, 108, 103, 112, 106, 115, 110, 119], { per: 4, seed: 41, noise: .5 }).candles;
const QV = (() => { const r = K.rng(42); return QK.map((k, i) => 40 + r() * 50 + ([5, 11, 15, 20, 25].includes(i) ? 80 : 0)); })();
const chQ = new K.Chart(QK, { x: 300, y: 250, w: 1340, h: 290 });

/* chalkboard */
const CHALK = '#E9E5DA';
const BOARD = { x: 420, y: 240, w: 1100, h: 460 };
const BSYM = ['甲股', '乙股', '丙股', '丁股', '戊股', '己股'];
const BASEP = [42.5, 18.25, 96.75, 63.125, 27.5, 110.375];
const frac = p => { const f = Math.round(p * 8), w = Math.floor(f / 8), e = f % 8; const fr = ['', '1/8', '1/4', '3/8', '1/2', '5/8', '3/4', '7/8'][e]; return fr ? `${w} ${fr}` : `${w}`; };
const chalkPrice = (r, m) => { let p = BASEP[r]; for (let j = 0; j < m; j++) { let d = Math.floor(hash(r * 97 + j) * 7) - 3; if (d === 0) d = 1; p += d / 8; } return p; };
const tri = (ctx, x, y, up, col, a) => { if (a <= .002) return; ctx.save(); ctx.globalAlpha *= a; ctx.fillStyle = col; ctx.shadowColor = rgba(col, .6); ctx.shadowBlur = 8; ctx.beginPath();
  if (up) { ctx.moveTo(x, y - 9); ctx.lineTo(x + 8, y + 5); ctx.lineTo(x - 8, y + 5); } else { ctx.moveTo(x, y + 9); ctx.lineTo(x + 8, y - 5); ctx.lineTo(x - 8, y - 5); } ctx.fill(); ctx.restore(); };

window.FILM = {
  title: '市场的测谎仪：成交量',
  transition: 1.1,
  subtitle: { x: 220, y: 912, size: 42, maxW: 1480 },
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', camera: { z0: 1.07, z1: 1.0 }, lines: ['K线可以被{画出来}，均线可以被{扭曲}。', '但有一样东西，{很难伪装}——', '那就是{成交量}。'],
    visual(ctx, S) {
      const n = OPEN.length, ch = chOPEN, MA = ma(OPEN, 5);
      const wob = 1.4 * S.at(0, .8, 1.2) * (1 - S.at(1, .4, 1) * .6), dim = 1 - S.at(1, 0, 1) * .62;
      const rev = S.lin(0, -.5, 2.6) * n;
      for (let i = 0; i < n && i < Math.ceil(rev); i++) {
        const k = OPEN[i], d1 = Math.sin(S.t * 2.6 + i * 1.3) * wob, d2 = Math.cos(S.t * 2.1 + i * .7) * wob;
        const kk = { o: k.o + d1, c: k.c + d2, h: Math.max(k.h, k.o + d1, k.c + d2) + Math.abs(d1) * .3, l: Math.min(k.l, k.o + d1, k.c + d2) - Math.abs(d2) * .3 };
        K.candle(ctx, ch.x(i), kk, p => ch.y(p), { w: ch.cw, grow: clamp(rev - i), alpha: dim, glow: .35 });
      }
      const mp = MA.map((v, i) => [ch.x(i), ch.y(v) + Math.sin(S.t * 1.8 + i * .55) * 34 * S.at(0, 1.4, 1.2)]);
      K.dotted(ctx, mp, S.lin(0, .6, 2.4), { alpha: .75 * dim, color: C.gold });
      // polygraph paper
      const PX = 1500, base = 790, amp = 190, pa = S.p(.2, 1);
      ctx.save(); ctx.globalAlpha = pa * .5; ctx.strokeStyle = rgba(C.gold, .18); ctx.lineWidth = 1;
      for (let y = base; y >= base - amp; y -= 38) { ctx.beginPath(); ctx.moveTo(260, y); ctx.lineTo(PX + 20, y); ctx.stroke(); }
      ctx.restore();
      const feed = S.t * 230, hot = S.at(1, .2, 1.2);
      const col = mix(C.gray, C.goldHi, hot);
      ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 2 + hot; ctx.shadowColor = rgba(C.goldHi, .8 * hot); ctx.shadowBlur = 14 * hot; ctx.globalAlpha = pa * (.55 + .45 * hot);
      ctx.beginPath(); let st = false;
      for (let x = 260; x <= PX; x += 3) { const s = feed - (PX - x); if (s < 0) continue; const y = base - volTrace(s) * amp; if (!st) { ctx.moveTo(x, y); st = true; } else ctx.lineTo(x, y); }
      ctx.stroke(); ctx.restore();
      // the stylus
      const tipY = base - volTrace(feed) * amp, pv = [1700, 700];
      K.line(ctx, pv[0], pv[1], PX, tipY, { color: C.white, width: 2, alpha: pa * .9 });
      ctx.save(); ctx.globalAlpha = pa; ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(PX, tipY, 4.5, 0, 6.2832); ctx.fill(); ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(pv[0], pv[1], 12, 0, 6.2832); ctx.stroke(); ctx.restore();
      K.tag(ctx, 1640, 590, '成交量 · VOLUME', { alpha: S.at(2, 0, .8), color: C.gold, font: F.serif(700, 22) });
      K.text(ctx, '可以被伪装', 1530, 300, { font: F.serif(700, 24), color: C.gray, alpha: S.at(0, 1.6, .8) * (1 - S.at(2, 0, .8)) });
    } },

  /* ================= TITLE ================= */
  { id: 'title', dur: 5.2, tr: 'zoom', camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const cx = 960, r = K.rng(8);
      ctx.save(); ctx.globalAlpha = .15; ctx.fillStyle = C.gold;
      for (let i = 0; i < 42; i++) { const h = (40 + r() * 220 + (r() < .15 ? 180 : 0)) * easeOut(S.lin(0, -.2 + i * .03, 1.6)); ctx.fillRect(140 + i * 40, 840 - h, 22, h); }
      ctx.restore();
      K.text(ctx, 'VOLUME  ·  THE MARKET’S LIE DETECTOR', cx, 400, { font: F.latin(500, 24), color: C.gold, align: 'center', spacing: 10, alpha: S.p(.3, 1.2) });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 410, 1920, 150); ctx.clip();
      const tp = S.p(.5, 1.4, K.expo);
      K.goldText(ctx, TITLE, cx, 524 + (1 - tp) * 110, 96, { spacing: 12 });
      ctx.restore();
      const sw = clamp((S.t - 1.8) / 1.3);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(400, 1520, sw), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,240,200,.28)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, 410, 180, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 360, S.p(1.3, 1.4));
      K.text(ctx, '从黑板纸带到成交量海啸 · 四个篇章', cx, 650, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 8, alpha: S.p(2.0, 1.2) });
    } },

  /* ================= 导言 ================= */
  { id: 'intro', header: H0, tr: ['iris', [960, 470]],
    lines: ['价格告诉你，市场{发生了什么}；', '成交量告诉你，有多少{真金白银}当了真。', '一百多年来，交易者一直在学着{读懂它}。'],
    visual(ctx, S) {
      const N = 24, x0 = 340, dx = 55, base = 640, r = K.rng(12);
      const VI = Array.from({ length: N }, () => 40 + r() * 100 + (r() < .2 ? 50 : 0));
      const pts = Array.from({ length: N }, (_, i) => [x0 + i * dx, 420 - i * 3.2 - Math.sin(i * .9) * 28 - Math.sin(i * .37) * 20]);
      K.dotted(ctx, pts, S.lin(0, 0, 2.2), { r: 2 });
      K.text(ctx, '价格', 300, pts[0][1] + 8, { font: F.serif(700, 26), color: C.white, align: 'right', alpha: S.at(0, 0, .8) });
      K.text(ctx, '发生了什么', 300, pts[0][1] + 38, { font: F.serif(500, 18), color: C.gray, align: 'right', alpha: S.at(0, .4, .8) });
      K.baseline(ctx, x0 - 30, x0 + N * dx - 25, base + 8, { p: S.at(0, .3, 1.2), step: 55 });
      for (let i = 0; i < N; i++) {
        const fall = S.lin(1, i * .07, .55), grow = easeOut(S.lin(1, i * .07 + .45, .5)), h = VI[i] * grow, x = x0 + i * dx;
        if (h > 0) { ctx.save(); ctx.fillStyle = rgba(C.gold, .7); ctx.shadowColor = rgba(C.goldHi, .5); ctx.shadowBlur = 10; ctx.fillRect(x - 13, base - h, 26, h); ctx.restore(); }
        if (fall > 0 && fall < 1) {
          const y = lerp(250, base - 8, fall * fall);
          ctx.save(); ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 12; ctx.beginPath(); ctx.ellipse(x, y, 9, 4 + 3 * Math.abs(Math.sin(fall * 9)), 0, 0, 6.2832); ctx.fill(); ctx.restore();
        }
      }
      K.text(ctx, '成交量', 300, base - 30, { font: F.serif(700, 26), color: C.goldHi, align: 'right', alpha: S.at(1, 0, .8) });
      K.text(ctx, '真金白银', 300, base, { font: F.serif(500, 18), color: C.gray, align: 'right', alpha: S.at(1, .4, .8) });
      // timeline of the four chapters
      const ev = [['1867', '报价纸带'], ['1873—1934', '威科夫'], ['1963', 'OBV 能量潮'], ['2021', 'GME 逼空']];
      K.line(ctx, 380, 720, 1560, 720, { p: S.at(2, 0, 1.4), color: rgba(C.gold, .6) });
      ev.forEach(([y, n], i) => {
        const a = S.at(2, .3 + i * .3, .7), x = 440 + i * 360;
        K.marker(ctx, x, 720, { alpha: a, r: 7 });
        K.text(ctx, y, x, 765, { font: F.latin(500, 26), color: C.goldHi, align: 'center', alpha: a });
        K.text(ctx, n, x, 798, { font: F.serif(500, 20), color: C.gray, align: 'center', alpha: a });
      });
    } },

  /* ================= 模块一 ================= */
  { id: 'ch1', dur: 4.2, tr: 'sweep', visual: chapter('壹', 1, '量价的雏形', 'Chalkboards & Ticker Tape', '黑板 · 纸带 · 盘口解读') },

  { id: 'chalk', header: H1, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -20 },
    lines: ['19世纪的交易所，还没有今天的{成交量柱}。', '报价员站在黑板前，用粉笔不停改写价格；', '场下的人，只能看到{价格在跳}，', '却看不见每笔成交，究竟{有多少股}。'],
    visual(ctx, S) {
      const B = BOARD, a = S.p(0, 1);
      ctx.save(); ctx.globalAlpha = a;
      ctx.fillStyle = '#101512'; ctx.fillRect(B.x, B.y, B.w, B.h);
      ctx.beginPath(); ctx.rect(B.x, B.y, B.w, B.h); ctx.clip();
      const rs = K.rng(77);
      for (let i = 0; i < 14; i++) { const x = B.x + rs() * B.w, y = B.y + rs() * B.h, rr = 40 + rs() * 140, g = ctx.createRadialGradient(x, y, 0, x, y, rr);
        g.addColorStop(0, 'rgba(233,229,218,.05)'); g.addColorStop(1, 'rgba(233,229,218,0)'); ctx.fillStyle = g; ctx.fillRect(x - rr, y - rr, 2 * rr, 2 * rr); }
      ctx.restore();
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = rgba(C.goldDeep, .95); ctx.lineWidth = 8; ctx.strokeRect(B.x - 4, B.y - 4, B.w + 8, B.h + 8);
      ctx.strokeStyle = rgba(C.gold, .5); ctx.lineWidth = 1; ctx.strokeRect(B.x - 10, B.y - 10, B.w + 20, B.h + 20); ctx.restore();
      const cols = [580, 920, 1330];
      ['代码', '价格', '成交量'].forEach((s, i) => K.text(ctx, s, cols[i], 302, { font: F.serif(700, 28), color: CHALK, align: 'center', alpha: a * .85 }));
      K.line(ctx, B.x + 40, 322, B.x + B.w - 40, 322, { p: a, color: CHALK, alpha: .45 });
      // the clerk keeps rewriting prices
      const T0 = S.beat(1), DT = .55, kNow = Math.floor((S.t - T0) / DT);
      const cnt = [0, 0, 0, 0, 0, 0], last = [-9, -9, -9, -9, -9, -9];
      for (let k = 0; k <= kNow; k++) { const r = (k * 5 + 1) % 6; cnt[r]++; last[r] = T0 + k * DT; }
      const q = S.at(3, 0, .8), pulse = .5 + .5 * Math.sin(S.t * 5);
      for (let r = 0; r < 6; r++) {
        const y = 380 + r * 50, ra = S.p(.2 + r * .08, .6);
        K.text(ctx, BSYM[r], cols[0], y, { font: F.serif(700, 30), color: CHALK, align: 'center', alpha: ra * .9 });
        const m = cnt[r], since = S.t - last[r], cur = chalkPrice(r, m), prev = chalkPrice(r, Math.max(0, m - 1));
        const pf = { font: F.serif(700, 32), color: CHALK, align: 'center' };
        if (m > 0 && since < .45) {
          const e = clamp(since / .45);
          K.text(ctx, frac(prev), cols[1], y, { ...pf, alpha: ra * .9 * clamp(1 - e * 2.5) });
          ctx.save(); ctx.beginPath(); ctx.rect(cols[1] - 110, y - 40, 220 * e, 56); ctx.clip(); K.text(ctx, frac(cur), cols[1], y, { ...pf, alpha: ra * .9 }); ctx.restore();
          ctx.save(); ctx.fillStyle = rgba(CHALK, .9); ctx.shadowColor = CHALK; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(cols[1] - 110 + 220 * e, y - 10, 3, 0, 6.2832); ctx.fill(); ctx.restore();
        } else K.text(ctx, frac(cur), cols[1], y, { ...pf, alpha: ra * .9 });
        if (m > 0) tri(ctx, 1075, y - 10, cur >= prev, cur >= prev ? C.red : C.green, ra * clamp(since / .45));
        K.text(ctx, '?', cols[2], y, { font: F.latin(500, 36), color: mix(C.gray, C.goldHi, q * pulse), align: 'center', alpha: ra * (.45 + .5 * q) });
      }
      if (q > 0) { K.dash(ctx, 1210, 340, 1450, 340, { p: q, alpha: .9 }); K.dash(ctx, 1210, 646, 1450, 646, { p: q, alpha: .9 }); K.dash(ctx, 1210, 340, 1210, 646, { p: q, alpha: .9 }); K.dash(ctx, 1450, 340, 1450, 646, { p: q, alpha: .9 }); }
      K.tag(ctx, 1330, 674, '看不见 · 成交了多少股', { alpha: q, color: C.gold });
      // the clerk (anonymous) and the crowd below
      silhouette(ctx, 290, 410, 30, { alpha: S.at(1, 0, .8) });
      K.tag(ctx, 290, 610, '报价员', { alpha: S.at(1, .3, .7), font: F.serif(700, 18) });
      const ca = S.at(2, 0, .9) * (1 - q * .6);
      for (let i = 0; i < 6; i++) {
        const x = 560 + i * 160, ai = S.at(2, i * .08, .7);
        silhouette(ctx, x, 770, 12, { alpha: ai * (1 - q * .4) });
        K.dash(ctx, x, 752, cols[1], 380 + ((i * 2) % 6) * 50 + 14, { p: ai, alpha: ca * .35, dash: [2, 6] });
      }
    } },

  { id: 'tape', header: H1, tr: ['push', 1],
    lines: ['1867年，{股票报价纸带机}问世。', '细长的纸带上，打印着代码、价格——', '还有每一笔的{成交股数}。', '“量”，第一次被{记录}了下来。'],
    visual(ctx, S) {
      const x0 = 548, x1 = 1760, ty = 500, sp = 250, v = 260, tb = S.beat(1) + .4, tau = .55;
      const off = 120 + (S.t < tb ? v * S.t : v * tb + v * tau * (1 - Math.exp(-(S.t - tb) / tau)));
      const hl = S.at(2, .5, .8);
      // the machine: glass dome over a print wheel, on a small stand
      const ma = S.at(0, 0, 1);
      ctx.save(); ctx.globalAlpha = ma;
      ctx.strokeStyle = rgba(C.gold, .8); ctx.lineWidth = 2; ctx.fillStyle = rgba(C.goldHi, .04);
      ctx.beginPath(); ctx.ellipse(430, 560, 125, 175, 0, Math.PI, 0); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1A1612'; ctx.fillRect(290, 560, 280, 70); ctx.strokeRect(290, 560, 280, 70);
      ctx.beginPath(); ctx.moveTo(320, 630); ctx.lineTo(300, 730); ctx.moveTo(540, 630); ctx.lineTo(560, 730); ctx.moveTo(296, 730); ctx.lineTo(564, 730); ctx.stroke();
      ctx.translate(430, 500); ctx.rotate(off / 40);
      ctx.strokeStyle = rgba(C.goldHi, .85); ctx.beginPath(); ctx.arc(0, 0, 36, 0, 6.2832); ctx.stroke();
      for (let i = 0; i < 8; i++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(i * .785) * 36, Math.sin(i * .785) * 36); ctx.stroke(); }
      ctx.restore();
      K.text(ctx, 'TICKER', 430, 604, { font: F.latin(500, 18), color: C.gold, align: 'center', spacing: 6, alpha: ma });
      tapeStrip(ctx, x0, x1, ty, off, sp, tapeItem(['100', '200', '500', '300', '1000', '400'], 3), { hl, alpha: ma });
      K.goldText(ctx, '1867', 1440, 370, 92, { alpha: S.at(0, .3, 1), spacing: 6 });
      // annotate one entry once the tape slows
      const offEnd = 120 + v * tb + v * tau, nStar = Math.round((x0 + offEnd + 18 - 1000) / sp - 1), left = x0 + off - (nStar + 1) * sp + 18;
      ctx.save(); ctx.font = F.mono(24); const it = tapeItem(['100', '200', '500', '300', '1000', '400'], 3)(nStar), sw = ctx.measureText(it.size).width, pw = ctx.measureText(it.px).width, symw = ctx.measureText(it.sym).width; ctx.restore();
      const an = S.at(1, 1.0, .8);
      K.bracket(ctx, left - 4, left + symw + 4, ty - 46, '代码', { p: an, font: F.serif(700, 22) });
      K.bracket(ctx, left + sw + 19, left + sw + 19 + pw + 2, ty + 46, '价格', { p: S.at(1, 1.4, .8), up: false, font: F.serif(700, 22) });
      K.bracket(ctx, left - 4, left + sw + 4, ty + 76, '成交股数', { p: hl, up: false, font: F.serif(700, 24), color: C.goldHi });
      const vol = S.at(3, 0, .9);
      K.goldText(ctx, '量', 1380, 720, 84, { alpha: vol });
      K.text(ctx, 'VOLUME · 第一次被记录', 1440, 706, { font: F.serif(700, 24), color: C.goldHi, alpha: vol });
    } },

  { id: 'read', header: H1, tr: ['push', 1], camera: { z0: 1.0, z1: 1.04, x1: -16 },
    lines: ['{盘口解读}：顶尖交易员整天盯着纸带，', '比如{杰西·利弗莫尔}。他们发现——', '上涨时，纸带{吐得飞快}、成交股数巨大，', '这样的上涨，[才真正安全]。', '反之，纸带稀稀拉拉的上涨，往往<后继乏力>。', '这是人类对{成交量}最早的觉醒。'],
    visual(ctx, S) {
      const a = S.at(0, 0, .9), X0 = 440, X1 = 1720;
      K.text(ctx, '快纸带 · 大单密集', X0, 248, { font: F.serif(700, 22), color: C.red, alpha: a });
      K.text(ctx, '慢纸带 · 零星小单', X0, 518, { font: F.serif(700, 22), color: C.gray, alpha: a });
      tapeStrip(ctx, X0, X1, 288, 700 + S.t * 560, 210, tapeItem(['5,000', '8,000', '12,000', '6,500', '9,000'], 11), { h: 60, fs: 21, alpha: a, hl: S.at(2, 0, .8) });
      tapeStrip(ctx, X0, X1, 558, 900 + S.t * 110, 330, tapeItem(['100', '200', '100', '300'], 17), { h: 60, fs: 21, alpha: a });
      const p = S.lin(0, .4, Math.max(1, S.beat(3) - S.beat(0)));
      const N = 60, fast = [], slow = [];
      for (let i = 0; i <= N; i++) { const u = i / N, x = X0 + u * (X1 - 80 - X0); fast.push([x, 470 - u * 100 - Math.sin(i * .9) * 6]); slow.push([x, 735 - 46 * Math.sin(u * Math.PI * .95) - Math.sin(i * 1.3) * 4]); }
      K.dotted(ctx, fast, p, { color: C.red, r: 2 });
      K.dotted(ctx, slow, p, { color: mix(C.gray, C.green, S.at(4, 0, .8)), r: 2 });
      K.tag(ctx, 1600, 430, '真上涨 · 安全', { alpha: S.at(3, 0, .7), color: C.red });
      K.tag(ctx, 1600, 690, '后继乏力', { alpha: S.at(4, .3, .7), color: C.green });
      // the tape reader: an anonymous silhouette, named in text only
      const sa = S.at(1, 0, .9);
      silhouette(ctx, 270, 420, 30, { alpha: sa });
      K.text(ctx, '杰西·利弗莫尔', 270, 620, { font: F.serif(700, 22), color: C.goldHi, align: 'center', alpha: sa });
      K.text(ctx, 'TAPE READER', 270, 648, { font: F.latin(500, 16), color: C.gray, align: 'center', spacing: 4, alpha: sa });
      K.dash(ctx, 306, 405, X0 - 8, 300, { p: sa, alpha: .5, dash: [2, 6] });
      K.dash(ctx, 306, 425, X0 - 8, 552, { p: sa, alpha: .5, dash: [2, 6] });
      K.rule(ctx, 1080, 790, 380, S.at(5, 0, 1.2));
      K.text(ctx, '量价关系 · 最早的觉醒', 1080, 774, { font: F.serif(700, 24), color: C.goldHi, align: 'center', spacing: 4, alpha: S.at(5, .3, .8) });
    } },

  { id: 'bars', header: H1, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -24 },
    lines: ['把纸带的{速度}与{股数}画成柱子，', '就是今天K线下方的{成交量柱}。', '[放量上涨]，是真金白银在推；', '<缩量上涨>，则要多一分警惕。'],
    visual(ctx, S) {
      const ch = chBARS, n = BARS.length, base = 800;
      const r = S.lin(0, -.6, 4.6) * n;
      K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, base + 6, { p: S.p(0, 1) });
      ch.draw(ctx, r, { glow: .35 });
      vbars(ctx, ch, BARV, base, 175, r, { alpha: .7, dim: i => i >= 10 && i < 18 ? 1 - S.at(2, 0, .6) * .5 + S.at(3, 0, .6) * .5 : 1 });
      K.text(ctx, '价格', 245, 420, { font: F.serif(700, 24), color: C.white, align: 'right', alpha: S.at(0, .3, .8) });
      K.text(ctx, '成交量', 245, 720, { font: F.serif(700, 24), color: C.goldHi, align: 'right', alpha: S.at(1, 0, .8) });
      const vt = (i) => [ch.x(i), base - BARV[i] / 130 * 175 - 14];
      const up1 = S.at(2, 0, .9);
      K.bracket(ctx, ch.x(0) - 20, ch.x(9) + 20, ch.y(Math.max(...BARS.slice(0, 10).map(k => k.h))) - 34, '放量上涨', { p: up1, labelColor: C.red });
      K.dotted(ctx, [vt(0), vt(4), vt(8)], S.lin(2, .3, 1.2), { color: C.red, r: 2 });
      const up2 = S.at(3, 0, .9);
      K.bracket(ctx, ch.x(10) - 20, ch.x(17) + 20, ch.y(Math.max(...BARS.slice(10, 18).map(k => k.h))) - 30, '缩量上涨', { p: up2, labelColor: C.green });
      K.dotted(ctx, [vt(10), vt(13), vt(17)], S.lin(3, .3, 1.2), { color: C.green, r: 2 });
      K.marker(ctx, ch.x(17), base - 150, { alpha: S.at(3, .9, .6), label: '底气不足?', pos: 'right', color: C.goldHi, pulse: clamp((S.t - S.beat(3) - 1) % 1.6 / 1.6) * (S.at(3, .9, .6) > .99 ? 1 : 0) });
    } },

  /* ================= 模块二 ================= */
  { id: 'ch2', dur: 4.2, tr: 'sweep', visual: chapter('贰', 2, '主力的底牌', 'Richard Wyckoff', '供求 · 努力与结果 · 综合人') },

  { id: 'wyckoff', header: H2, tr: ['iris', [960, 450]],
    lines: ['{理查德·威科夫}（1873—1934），', '常与查尔斯·道、江恩、艾略特并称{技术分析巨头}。', '他的理论，灵魂就是{量价关系}。'],
    visual(ctx, S) {
      const a = S.at(0, 0, 1), lift = S.at(2, 0, 1.1, easeInOut);
      const cy = 440 + lift * 30;
      K.text(ctx, '理查德·威科夫', 960, cy, { font: F.serif(900, 64), color: C.white, align: 'center', spacing: 8, alpha: a, glow: .25 });
      K.text(ctx, 'RICHARD D. WYCKOFF', 960, cy + 48, { font: F.latin(500, 22), color: C.gray, align: 'center', spacing: 8, alpha: a });
      K.rule(ctx, 960, cy + 76, 260, S.at(0, .4, 1.2));
      K.text(ctx, '1873 — 1934', 960, cy + 120, { font: F.latin(500, 30), color: C.goldHi, align: 'center', spacing: 4, alpha: S.at(0, .7, .8) });
      const others = [['查尔斯·道', 'CHARLES DOW', 480], ['江恩', 'W. D. GANN', 960], ['艾略特', 'R. N. ELLIOTT', 1440]];
      const dimO = 1 - lift * .55;
      others.forEach(([zh, en, x], i) => {
        const oa = S.at(1, .2 + i * .25, .8) * dimO, y = 700;
        if (i !== 1) K.dash(ctx, x + (x < 960 ? 90 : -90), y - 30, 960 + (x < 960 ? -140 : 140), cy + 128, { p: oa, alpha: .5, dash: [3, 7] });
        K.text(ctx, zh, x, y, { font: F.serif(700, 32), color: C.white, align: 'center', alpha: oa });
        K.text(ctx, en, x, y + 32, { font: F.latin(500, 18), color: C.gray, align: 'center', spacing: 4, alpha: oa });
      });
      K.tag(ctx, 960, 640, '技术分析巨头', { alpha: S.at(1, 1.0, .7) * dimO, color: C.gold });
      // volume ⇄ price
      const vp = S.at(2, .3, .9);
      K.goldText(ctx, '量', 800, 310, 72, { alpha: vp });
      K.text(ctx, '价', 1120, 310, { font: F.serif(900, 72), color: C.white, align: 'center', alpha: vp, glow: .3 });
      K.arrow(ctx, 870, 266, 1050, 266, { p: S.at(2, .6, .8), alpha: vp });
      K.arrow(ctx, 1050, 296, 870, 296, { p: S.at(2, .9, .8), alpha: vp });
      K.text(ctx, '量价关系', 960, 340, { font: F.serif(700, 22), color: C.goldHi, align: 'center', spacing: 6, alpha: S.at(2, 1.2, .7) });
    } },

  { id: 'supply', header: H2, tr: ['push', 1], camera: { z0: 1.02, z1: 1.06 },
    lines: ['在他看来，股市的本质由{供求}决定，', '而成交量，就是供求关系的{度量衡}。'],
    visual(ctx, S) {
      const a = S.at(0, 0, .9), PV = [960, 340], L = 380;
      const red = [70, 110, 90, 130, 100], grn = [60, 80, 55];
      const rg = red.map((h, j) => h * easeOut(S.lin(0, .3 + j * .35, .5))), gg = grn.map((h, j) => h * easeOut(S.lin(0, .5 + j * .5, .5)));
      const wd = rg.reduce((s, v) => s + v, 0), ws = gg.reduce((s, v) => s + v, 0);
      const th = clamp((wd - ws) / 1400, -.2, .2) + Math.sin(S.t * 3) * .008;
      // stand
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = rgba(C.gold, .7); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(PV[0], PV[1]); ctx.lineTo(PV[0], 770); ctx.stroke();
      ctx.fillStyle = rgba(C.gold, .5); ctx.fillRect(860, 770, 200, 8); ctx.restore();
      const ends = [[PV[0] - L * Math.cos(th), PV[1] + L * Math.sin(th)], [PV[0] + L * Math.cos(th), PV[1] - L * Math.sin(th)]];
      K.line(ctx, ends[0][0], ends[0][1], ends[1][0], ends[1][1], { color: C.goldHi, width: 4, glow: .6, alpha: a });
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.goldHi; ctx.beginPath(); ctx.arc(PV[0], PV[1], 8, 0, 6.2832); ctx.fill(); ctx.restore();
      [[ends[0], rg, C.red, '需求 DEMAND'], [ends[1], gg, C.green, '供给 SUPPLY']].forEach(([[ex, ey], bars, col, lab]) => {
        const py = ey + 190;
        K.line(ctx, ex, ey, ex - 110, py, { alpha: a * .7, color: C.gold }); K.line(ctx, ex, ey, ex + 110, py, { alpha: a * .7, color: C.gold });
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.gold; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(ex - 125, py); ctx.quadraticCurveTo(ex, py + 34, ex + 125, py); ctx.stroke(); ctx.restore();
        bars.forEach((h, j) => { if (h <= 0) return; ctx.save(); ctx.fillStyle = rgba(col, .85); ctx.shadowColor = rgba(col, .5); ctx.shadowBlur = 12; ctx.fillRect(ex - (bars.length * 30) / 2 + j * 30 + 4, py + 6 - h, 22, h); ctx.restore(); });
        K.text(ctx, lab, ex, py + 64, { font: F.serif(700, 24), color: col, align: 'center', alpha: a });
      });
      // the gauge on the pivot: volume as the measure
      const g = S.at(1, 0, .9);
      if (g > 0) {
        ctx.save(); ctx.globalAlpha = g; ctx.strokeStyle = rgba(C.goldHi, .8); ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(PV[0], PV[1], 74, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
        for (let i = 0; i <= 10; i++) { const an = Math.PI * (1.2 + i * .06), r1 = i % 5 ? 66 : 60; ctx.beginPath(); ctx.moveTo(PV[0] + Math.cos(an) * r1, PV[1] + Math.sin(an) * r1); ctx.lineTo(PV[0] + Math.cos(an) * 74, PV[1] + Math.sin(an) * 74); ctx.stroke(); }
        ctx.restore();
        const an = -Math.PI / 2 - th * 3;
        K.line(ctx, PV[0], PV[1], PV[0] + Math.cos(an) * 64, PV[1] + Math.sin(an) * 64, { color: C.white, width: 2, alpha: g });
        K.tag(ctx, 960, 236, '度量衡 · 成交量', { alpha: g, color: C.gold, font: F.serif(700, 22) });
      }
    } },

  { id: 'effort', header: H2, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -10 },
    lines: ['核心法则之一：{努力与结果}。', '成交量是{努力}，价格的涨跌是{结果}。', '如果天量砸下去，价格却几乎不动——', '说明上方有人在源源不断地卖：<主力在出货>。'],
    visual(ctx, S) {
      const ch = chEFF, base = 800, n = EFF.length;
      const r = S.lin(0, -.6, 3.4) * 10 + S.lin(2, 0, 1.6) * 5 + S.lin(3, .4, 2) * 6;
      K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, base + 6, { p: S.p(0, 1) });
      const zone = S.at(3, 0, .9);
      if (zone > 0) { ctx.fillStyle = rgba(C.green, .07 * zone); ctx.fillRect(ch.x(10) - 30, ch.box.y - 10, ch.x(14) - ch.x(10) + 60, base - ch.box.y + 10); }
      ch.draw(ctx, r, { glow: .35 });
      vbars(ctx, ch, EFFV, base, 190, r, { alpha: .7, color: i => i >= 10 && i < 15 ? mix(C.gold, C.goldHi, S.at(2, .8, .6)) : (EFF[i].c >= EFF[i].o ? C.red : C.green), glow: .3 });
      K.text(ctx, '价格 · 结果', 245, 420, { font: F.serif(700, 22), color: C.white, align: 'right', alpha: S.at(1, 0, .8) });
      K.text(ctx, '成交量 · 努力', 245, 720, { font: F.serif(700, 22), color: C.goldHi, align: 'right', alpha: S.at(1, .4, .8) });
      const big = S.at(2, 1.2, .8);
      K.bracket(ctx, ch.x(10) - 22, ch.x(14) + 22, base - 200 - 14, '努力：天量', { p: big, color: C.goldHi });
      const topH = Math.max(...EFF.slice(10, 15).map(k => k.h));
      K.bracket(ctx, ch.x(10) - 22, ch.x(14) + 22, ch.y(topH) - 18, '结果：几乎不动', { p: S.at(2, 1.8, .8) });
      const out = S.at(3, 1.2, .8);
      K.arrow(ctx, ch.x(15), ch.y(EFF[15].h) - 6, ch.x(20) + 40, ch.y(EFF[20].l) + 10, { p: out, alpha: out, color: C.green, width: 2.5 });
      K.tag(ctx, ch.x(18) + 30, ch.box.y + 40, '派发 · 主力出货', { alpha: out, color: C.green });
    } },

  { id: 'composite', header: H2, tr: ['push', 1], camera: { z0: 1.0, z1: 1.04 },
    lines: ['威科夫还设想了一个{综合人}（Composite Man）：', '把所有主力资金，想象成{同一个人}。', '他吸筹或派发时，资金量实在太大，', '必然在成交量上留下{巨型脚印}。'],
    visual(ctx, S) {
      const ch = chCM, n = CMK.length, base = 790, hmax = 200;
      const r = S.lin(0, 0, S.beat(3) + 1 - S.beat(0)) * n;
      K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, base + 6, { p: S.at(0, 0, 1), step: 50 });
      ch.draw(ctx, r, { glow: .3 });
      vbars(ctx, ch, CMV, base, hmax, r, { alpha: .65, vmax: 200 });
      K.text(ctx, '吸筹', ch.x(8), ch.box.y + 70, { font: F.serif(700, 24), color: C.goldHi, align: 'center', alpha: S.at(2, 0, .7) });
      K.text(ctx, 'ACCUMULATION', ch.x(8), ch.box.y + 96, { font: F.latin(500, 16), color: C.gray, align: 'center', spacing: 3, alpha: S.at(2, 0, .7) });
      K.text(ctx, '派发', ch.x(28), ch.box.y + 190, { font: F.serif(700, 24), color: C.goldHi, align: 'center', alpha: S.at(2, .5, .7) });
      K.text(ctx, 'DISTRIBUTION', ch.x(28), ch.box.y + 216, { font: F.latin(500, 16), color: C.gray, align: 'center', spacing: 3, alpha: S.at(2, .5, .7) });
      // giant footprints stamped on the giant volume bars
      GI.forEach((i, j) => {
        if (r < i + 1) return;
        const st = S.at(3, .1 + j * .28, .45), h = CMV[i] / 200 * hmax, x = ch.x(i) + (j % 2 ? 9 : -9), y = base - h - 40;
        const s = lerp(1.9, 1, easeOut(st));
        footprint(ctx, x, y, s * 1.05, (j % 2 ? .18 : -.18), st);
        const rp = clamp((S.t - S.beat(3) - .1 - j * .28) / .9);
        if (rp > 0 && rp < 1) { ctx.save(); ctx.globalAlpha = 1 - rp; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(x, y + 30, 20 + rp * 50, 6 + rp * 14, 0, 0, 6.2832); ctx.stroke(); ctx.restore(); }
      });
      // the Composite Man: one anonymous silhouette made of many funds
      const sa = S.at(0, .6, 1.2), mx = 1500, my = 360;
      const gather = S.at(1, 0, 1.6, easeInOut), rr = K.rng(91);
      for (let i = 0; i < 90; i++) {
        const sx = 1290 + rr() * 420, sy = 240 + rr() * 560, ang = rr() * 6.2832, rad = rr();
        const tx = mx + Math.cos(ang) * 30 * rad, ty = my + 90 + Math.sin(ang) * 60 * rad;
        const a = S.at(1, -.2, .5) * (1 - gather * .9);
        if (a <= .01) continue;
        ctx.fillStyle = rgba(C.goldHi, a); ctx.beginPath(); ctx.arc(lerp(sx, tx, gather), lerp(sy, ty, gather), 2.2, 0, 6.2832); ctx.fill();
      }
      silhouette(ctx, mx, my, 52, { alpha: sa });
      K.text(ctx, '?', mx, my + 18, { font: F.latin(500, 52), color: C.goldHi, align: 'center', alpha: sa * .8 });
      K.text(ctx, '综合人', mx, 660, { font: F.serif(900, 34), color: C.goldHi, align: 'center', spacing: 6, alpha: sa });
      K.text(ctx, 'COMPOSITE MAN', mx, 694, { font: F.latin(500, 18), color: C.gray, align: 'center', spacing: 6, alpha: sa });
      K.text(ctx, '所有主力 = 一个人', mx, 740, { font: F.serif(700, 22), color: C.white, align: 'center', alpha: S.at(1, 1.2, .8) });
    } },

  /* ================= 模块三 ================= */
  { id: 'ch3', dur: 4.2, tr: 'sweep', visual: chapter('叁', 3, '价格的火车头', 'On-Balance Volume', '格兰维尔 · OBV · 能量潮') },

  { id: 'obv', header: H3, tr: ['iris', [960, 470]], camera: { z0: 1.0, z1: 1.03 },
    lines: ['1963年，{约瑟夫·格兰维尔}在著作中提出{OBV}，', '中文常称{能量潮}（On-Balance Volume）。', '规则很简单：[上涨日]，成交量记为正；', '<下跌日>，成交量记为负；', '逐日{累加}，就得到一条OBV曲线。'],
    visual(ctx, S) {
      const ch = chOB, n = OB.length, base = 515, hmax = 62, vmax = 1800;
      const r = S.lin(0, .2, 2) * n;
      ch.draw(ctx, r, { glow: .35 });
      const sUp = S.at(2, .2, .7), sDn = S.at(3, .2, .7);
      K.line(ctx, ch.box.x, base, ch.box.x + ch.box.w, base, { p: S.at(0, .3, 1), color: rgba(C.gold, .5) });
      for (let i = 0; i < n && i < Math.ceil(r); i++) {
        const g = easeOut(clamp(r - i)), h = OBV_V[i] / vmax * hmax * g, x = ch.x(i), w = 46;
        const up = i > 0 && OB[i].c > OB[i - 1].c, dn = i > 0 && OB[i].c < OB[i - 1].c;
        const flip = dn ? sDn : 0, col = i === 0 ? C.gray : up ? mix(C.gold, C.red, sUp) : dn ? mix(C.gold, C.green, sDn) : C.gold;
        const top = base - h * (1 - 2 * flip);
        ctx.save(); ctx.fillStyle = rgba(col, .8); ctx.shadowColor = rgba(col, .4); ctx.shadowBlur = 10; ctx.fillRect(x - w / 2, Math.min(top, base), w, Math.abs(base - top)); ctx.restore();
        const la = i === 0 ? S.at(2, 0, .6) : up ? sUp : sDn;
        K.text(ctx, i === 0 ? '起点' : fmt(up ? OBV_V[i] : -OBV_V[i]), x, 612, { font: i === 0 ? F.serif(700, 20) : F.latin(500, 24), color: i === 0 ? C.gray : up ? C.red : C.green, align: 'center', alpha: la * g });
      }
      K.text(ctx, '价格', 330, 340, { font: F.serif(700, 22), color: C.white, align: 'right', alpha: S.at(0, .2, .7) });
      K.text(ctx, '成交量', 330, 520, { font: F.serif(700, 22), color: C.white, align: 'right', alpha: S.at(0, .6, .7) });
      K.text(ctx, '± 计入', 330, 612, { font: F.serif(700, 22), color: C.goldHi, align: 'right', alpha: S.at(2, 0, .7) });
      K.tag(ctx, 1640, 300, 'OBV · 能量潮', { alpha: S.at(1, 0, .7), color: C.gold });
      // cumulative OBV line
      const mn = Math.min(...OB_OBV), mx = Math.max(...OB_OBV), oy = v => 790 - (v - mn) / (mx - mn) * 130;
      const ca = S.at(4, 0, .6), cp = S.lin(4, .1, 2.6);
      K.text(ctx, 'OBV', 330, 735, { font: F.latin(500, 26), color: C.goldHi, align: 'right', alpha: ca });
      K.dash(ctx, ch.box.x, oy(0), ch.box.x + ch.box.w, oy(0), { p: ca, alpha: .3, dash: [3, 7] });
      const pts = OB_OBV.map((v, i) => [ch.x(i), oy(v)]);
      K.dotted(ctx, pts, cp, { r: 2.2 });
      OB_OBV.forEach((v, i) => {
        const a = ca * clamp((cp * (n - 1) - i + .3) / .3); if (a <= 0) return;
        K.marker(ctx, pts[i][0], pts[i][1], { alpha: a, r: 6 });
        K.text(ctx, v === 0 ? '0' : v.toLocaleString('en-US'), pts[i][0], pts[i][1] - 16, { font: F.latin(500, 19), color: C.white, align: 'center', alpha: a });
      });
    } },

  { id: 'dam', header: H3, tr: ['push', 1], camera: { z0: 1.0, z1: 1.04, x1: -20 },
    lines: ['格兰维尔有句名言：{成交量是价格的火车头}。', '主力悄悄建仓时，股价横着不动，', '[OBV却像蓄水的堤坝]，一节节抬高——', '直到某一天{决口}，股价一飞冲天。'],
    visual(ctx, S) {
      const ch = chDAM, n = DAM.length, burst = S.at(3, 0, 1.2);
      const nA = S.lin(0, 0, Math.max(1, S.beat(2) - S.beat(0))) * 24, nB = S.lin(3, .2, 2.4) * 8;
      const rP = nA + nB, rO = Math.min(24, S.lin(2, 0, 2.6) * 24) + nB;
      K.text(ctx, '价格', 245, 380, { font: F.serif(700, 24), color: C.white, align: 'right', alpha: S.at(0, 0, .8) });
      const yTop = ch.y(Math.max(...DAMA.map(k => k.h)));
      K.dash(ctx, ch.x(0) - 20, yTop - 4, ch.x(23) + 20, yTop - 4, { p: S.at(1, 0, 1), alpha: .6 });
      K.bracket(ctx, ch.x(0) - 20, ch.x(23) + 20, yTop - 22, '股价横盘 · 几乎不涨', { p: S.at(1, .3, .9) });
      ch.draw(ctx, rP, { glow: .35 });
      K.tag(ctx, 960, 510, '成交量 = 价格的火车头', { alpha: S.at(0, .8, .8), color: C.gold });
      // OBV reservoir
      const mn = Math.min(...DAM_OBV), mx = Math.max(...DAM_OBV), BOT = 790, oy = v => BOT - 12 - (v - mn) / (mx - mn) * 215;
      const xw = (ch.x(23) + ch.x(24)) / 2;
      K.text(ctx, 'OBV', 245, 690, { font: F.latin(500, 26), color: C.goldHi, align: 'right', alpha: S.at(2, 0, .8) });
      K.line(ctx, ch.box.x, BOT, ch.box.x + ch.box.w, BOT, { p: S.at(0, .2, 1), color: rgba(C.gold, .5) });
      if (rO > 0) {
        const m = Math.min(n - 1, Math.floor(rO)), f = rO - m, pts = [];
        for (let i = 0; i <= m; i++) pts.push([ch.x(i), oy(DAM_OBV[i])]);
        if (m < n - 1 && f > 0) pts.push([lerp(ch.x(m), ch.x(m + 1), f), oy(lerp(DAM_OBV[m], DAM_OBV[m + 1], f))]);
        const wl = pts[pts.length - 1];
        ctx.save(); const g = ctx.createLinearGradient(0, 560, 0, BOT); g.addColorStop(0, rgba(C.goldHi, .5)); g.addColorStop(1, rgba(C.gold, .1));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(pts[0][0], BOT); pts.forEach(p => ctx.lineTo(p[0], p[1] + Math.sin(S.t * 3 + p[0] * .03) * 2));
        ctx.lineTo(wl[0], BOT); ctx.closePath(); ctx.fill(); ctx.restore();
        K.dotted(ctx, pts, 1, { r: 2.2, color: C.goldHi });
      }
      // the dam wall, then the burst
      const wa = S.at(2, .4, .8), wTop = oy(DAM_OBV[23]) - 34;
      if (wa > 0) for (const side of [-1, 1]) {
        const d = burst * 60 * side, rot = burst * .5 * side, al = wa * (1 - burst * .9);
        ctx.save(); ctx.globalAlpha = al; ctx.translate(xw + d, BOT - burst * 30); ctx.rotate(rot);
        ctx.fillStyle = '#2A241B'; ctx.strokeStyle = C.gold; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(side * 26, 0); ctx.lineTo(side * 12, wTop - BOT); ctx.lineTo(0, wTop - BOT); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
      }
      K.text(ctx, '堤坝', xw, wTop - 14, { font: F.serif(700, 22), color: C.goldHi, align: 'center', alpha: wa * (1 - burst) });
      if (burst > 0) {
        const rs = K.rng(7);
        for (let i = 0; i < 70; i++) { const ang = -Math.PI / 2 + (rs() - .3) * 1.6, sp = 120 + rs() * 260, life = clamp((S.t - S.beat(3)) / 1.6), x = xw + Math.cos(ang) * sp * life, y = wTop + 40 + Math.sin(ang) * sp * life + 260 * life * life;
          if (life >= 1) break; ctx.fillStyle = rgba(C.goldHi, .8 * (1 - life)); ctx.beginPath(); ctx.arc(x, Math.min(y, BOT), 2, 0, 6.2832); ctx.fill(); }
      }
      K.tag(ctx, ch.x(10), oy(DAM_OBV[20]) - 70, 'OBV 一节节抬高', { alpha: S.at(2, 1.2, .8), color: C.red });
      K.text(ctx, '一飞冲天', ch.x(26) - 30, ch.box.y + 60, { font: F.serif(900, 32), color: C.red, align: 'right', alpha: S.at(3, 1.4, .8), glow: .5, glowColor: C.red });
    } },

  /* ================= 模块四 ================= */
  { id: 'ch4', dur: 4.2, tr: 'sweep', visual: chapter('肆', 4, '成交量海啸', 'The 2021 Short Squeeze', '空头 · 散户 · 逼空') },

  { id: 'shorts', header: H4, tr: ['iris', [960, 470]],
    lines: ['2021年初，{游戏驿站}（GME）成了风暴眼。', '对冲基金大举{做空}这只股票，', '空头股数一度超过流通股的<140%>——', '卖空的股数，竟比市面上流通的股票还多。'],
    visual(ctx, S) {
      const X0 = 420, U = 800, a = S.at(0, 0, .9);
      K.text(ctx, '游戏驿站 · GME', 960, 278, { font: F.serif(900, 40), color: C.white, align: 'center', spacing: 6, alpha: a, glow: .2 });
      K.text(ctx, 'GAMESTOP · 2021', 960, 312, { font: F.latin(500, 18), color: C.gray, align: 'center', spacing: 6, alpha: a });
      const fl = S.at(0, .6, 1.2);
      K.text(ctx, '流通股 FLOAT', X0, 390, { font: F.serif(700, 24), color: C.goldHi, alpha: fl });
      ctx.save(); ctx.globalAlpha = fl; ctx.strokeStyle = C.gold; ctx.lineWidth = 1.5; ctx.fillStyle = rgba(C.gold, .22); ctx.fillRect(X0, 410, U * fl, 64); ctx.strokeRect(X0, 410, U * fl, 64); ctx.restore();
      K.text(ctx, '100%', X0 + U * fl + 16, 452, { font: F.latin(500, 30), color: C.goldHi, alpha: fl });
      const sh = S.at(1, .2, 2.4, easeInOut) * 1.42, sa = S.at(1, 0, .6);
      K.text(ctx, '空头持仓 SHORT INTEREST', X0, 560, { font: F.serif(700, 24), color: C.green, alpha: sa });
      if (sh > 0) {
        ctx.save(); ctx.fillStyle = rgba(C.green, .55); ctx.shadowColor = rgba(C.green, .5); ctx.shadowBlur = 16; ctx.fillRect(X0, 580, U * Math.min(sh, 1), 64);
        if (sh > 1) { ctx.fillStyle = rgba(C.green, .8); ctx.fillRect(X0 + U, 580, U * (sh - 1), 64);
          ctx.beginPath(); ctx.rect(X0 + U, 580, U * (sh - 1), 64); ctx.clip(); ctx.strokeStyle = rgba(C.red, .55); ctx.lineWidth = 3; ctx.shadowBlur = 0;
          for (let x = X0 + U - 64; x < X0 + U * sh; x += 18) { ctx.beginPath(); ctx.moveTo(x, 644); ctx.lineTo(x + 64, 580); ctx.stroke(); } }
        ctx.restore();
      }
      const pct = Math.round(sh * 100), done = S.at(2, 0, .6);
      K.text(ctx, done > .5 ? '>140%' : `${Math.min(pct, 140)}%`, X0 + U * sh + 18, 626, { font: F.latin(500, 44), color: C.green, alpha: sa, glow: .4, glowColor: C.green });
      const dl = S.at(1, 1.0, .8);
      K.dash(ctx, X0 + U, 390, X0 + U, 680, { p: dl, alpha: .8 });
      K.text(ctx, '流通股 100% 线', X0 + U, 710, { font: F.serif(700, 20), color: C.goldHi, align: 'center', alpha: dl });
      const ov = S.at(3, 0, .8), pu = .5 + .5 * Math.sin(S.t * 5);
      K.bracket(ctx, X0 + U + 4, X0 + U * 1.42, 662, '比流通股还多', { up: false, p: ov, color: C.red, labelColor: C.red });
      if (ov > 0) { ctx.save(); ctx.globalAlpha = ov * (.3 + .4 * pu); ctx.strokeStyle = C.red; ctx.lineWidth = 2; ctx.shadowColor = C.red; ctx.shadowBlur = 16; ctx.strokeRect(X0 + U, 576, U * .42, 72); ctx.restore(); }
    } },

  { id: 'crowd', header: H4, tr: ['push', 1],
    lines: ['另一边，Reddit 论坛 WallStreetBets 上的散户，', '在“咆哮小猫”（Roaring Kitty，Keith Gill）带动下，', '[集体买入，并且持有不卖]。'],
    visual(ctx, S) {
      const N = 400, rr = K.rng(2021), SX = 300, SY = 350, VX = 1390, VY = 420, VW = 250, VH = 340;
      K.tag(ctx, 900, 262, 'Reddit 论坛 · WallStreetBets', { alpha: S.at(0, 0, .8), color: C.gold, font: F.latin(500, 22) });
      const ring = S.t - S.beat(1) - .4, gather = i => S.at(2, (i % 40) * .04 + Math.floor(i / 40) * .03, 1.0, easeInOut);
      let arrived = 0;
      for (let i = 0; i < N; i++) {
        const x0 = 560 + rr() * 700, y0 = 310 + rr() * 470, ph = rr() * 6.28, jig = Math.sin(S.t * 2 + ph) * 3;
        const c = i % 20, rw = Math.floor(i / 20), tx = VX + 14 + c * 11.3, ty = VY + VH - 10 - rw * 15.5;
        const gg = gather(i); if (gg >= 1) arrived++;
        const x = lerp(x0 + jig, tx, gg), y = lerp(y0, ty, gg) - Math.sin(gg * Math.PI) * 60;
        const red = ring > 0 ? clamp((ring * 620 - Math.hypot(x0 - SX, y0 - SY) + 300) / 120) : 0;
        const a = S.at(0, .2 + (i % 50) * .015, .6);
        if (a <= .01) continue;
        ctx.fillStyle = rgba(mix(C.gray, C.red, red), a * (.65 + .35 * red)); ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 6.2832); ctx.fill();
      }
      if (ring > 0) for (let k = 0; k < 3; k++) { const rk = (ring - k * .5) * 620; if (rk <= 0 || rk > 1500) continue;
        ctx.save(); ctx.globalAlpha = .5 * (1 - rk / 1500); ctx.strokeStyle = C.goldHi; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(SX, SY, rk, -1.2, 1.4); ctx.stroke(); ctx.restore(); }
      const sa = S.at(1, 0, .9);
      silhouette(ctx, SX, SY, 30, { alpha: sa });
      K.text(ctx, 'Roaring Kitty', SX, 530, { font: F.latin(500, 24), color: C.goldHi, align: 'center', alpha: sa });
      K.text(ctx, '“咆哮小猫”', SX, 562, { font: F.serif(700, 22), color: C.white, align: 'center', alpha: sa });
      K.text(ctx, 'Keith Gill', SX, 592, { font: F.latin(500, 18), color: C.gray, align: 'center', spacing: 2, alpha: sa });
      // the vault: buy & hold
      const va = S.at(2, 0, .8);
      if (va > 0) {
        ctx.save(); ctx.globalAlpha = va; ctx.strokeStyle = C.gold; ctx.lineWidth = 2; ctx.strokeRect(VX, VY, VW, VH);
        const lv = arrived / N; ctx.fillStyle = rgba(C.red, .12); ctx.fillRect(VX, VY + VH * (1 - lv), VW, VH * lv);
        const lk = S.at(2, 2.2, .5), cx = VX + VW / 2;
        ctx.strokeStyle = C.goldHi; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(cx, VY - 36 + lk * 8, 18, Math.PI, 0); ctx.lineTo(cx + 18, VY - 36 + 10 + lk * 8); ctx.moveTo(cx - 18, VY - 36 + lk * 8); ctx.lineTo(cx - 18, VY - 26 + lk * 8); ctx.stroke();
        ctx.fillStyle = C.goldHi; ctx.fillRect(cx - 26, VY - 28, 52, 24); ctx.restore();
      }
      K.text(ctx, '买入 · 持有', VX + VW / 2, VY + VH + 40, { font: F.serif(900, 28), color: C.red, align: 'center', alpha: va, glow: .4, glowColor: C.red });
      K.text(ctx, 'BUY & HOLD', VX + VW / 2, VY + VH + 66, { font: F.latin(500, 17), color: C.gray, align: 'center', spacing: 5, alpha: va });
    } },

  { id: 'tsunami', header: H4, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -20 },
    lines: ['随之而来的，是一场{成交量海啸}。', '短短几天，股价从不到[20美元]，', '一度冲上盘中[483美元]。'],
    visual(ctx, S) {
      const ch = chTS, n = TS.length, base = 800, hmax = 170, vmax = 190;
      const r = S.lin(0, -.6, 2.4) * 11 + S.lin(1, .2, 2.4) * 5 + S.lin(2, 0, 1.4) * 2;
      K.baseline(ctx, ch.box.x, ch.box.x + ch.box.w, base + 6, { p: S.p(0, 1) });
      // the wave behind the bars
      const m = Math.min(n, Math.ceil(r));
      if (m > 1) {
        const top = i => base - TSV[i] / vmax * hmax * easeOut(clamp(r - i)) - 16;
        ctx.save(); const g = ctx.createLinearGradient(0, base - hmax - 30, 0, base); g.addColorStop(0, rgba(C.red, .34)); g.addColorStop(1, rgba(C.red, .02));
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ch.x(0) - 20, base); ctx.lineTo(ch.x(0) - 20, top(0));
        for (let i = 0; i < m - 1; i++) { const xm = (ch.x(i) + ch.x(i + 1)) / 2, ym = (top(i) + top(i + 1)) / 2; ctx.quadraticCurveTo(ch.x(i), top(i), xm, ym); }
        const fx = ch.x(m - 1), fy = top(m - 1);
        ctx.quadraticCurveTo(fx + 40, fy - 20, fx + 50, fy + 30); ctx.quadraticCurveTo(fx + 30, fy + 10, fx + 34, base); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = rgba(C.goldHi, .55); ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();
        if (m > 12) { const rs = K.rng(9); for (let i = 0; i < 40; i++) { const ph = (S.t * .7 + rs()) % 1, x = fx - 60 + rs() * 120 + ph * 40, y = fy - 10 - ph * (40 + rs() * 60);
          ctx.fillStyle = rgba(C.goldHi, .6 * (1 - ph)); ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.2832); ctx.fill(); } }
      }
      vbars(ctx, ch, TSV, base, hmax, r, { alpha: .8, vmax, glow: .3 });
      ch.draw(ctx, r, { glow: .45 });
      // skyscraper windows on the giant candle
      const sk = clamp(r - 16);
      if (sk >= 1) {
        const x = ch.x(16), t = ch.y(347), b = ch.y(147), wa = S.at(2, 0, .6);
        for (let yy = t + 10; yy < b - 10; yy += 18) for (let c = -1; c <= 1; c++) {
          const lit = hash(Math.floor(yy) * 3 + c) > .55; ctx.fillStyle = lit ? rgba(C.goldHi, .55 * wa) : rgba('#000000', .35 * wa); ctx.fillRect(x + c * 12 - 4, yy, 8, 10);
        }
      }
      K.text(ctx, '成交量', 285, 720, { font: F.serif(700, 24), color: C.goldHi, align: 'right', alpha: S.at(0, .3, .8) });
      const p20 = S.at(1, 0, .8);
      K.dash(ctx, ch.box.x, ch.y(20), ch.box.x + ch.box.w, ch.y(20), { p: p20, alpha: .6 });
      K.text(ctx, '不到 $20', 285, ch.y(20) + 8, { font: F.serif(700, 22), color: C.white, align: 'right', alpha: p20 });
      const pk = S.at(2, 1.0, .7);
      K.marker(ctx, ch.x(17), ch.y(483), { alpha: pk, label: '盘中 $483', pos: 'right', color: C.goldHi, font: F.serif(700, 28), pulse: pk > .99 ? clamp((S.t - S.beat(2) - 1.7) % 1.6 / 1.6) : 0 });
      K.tag(ctx, ch.x(16) - 150, ch.y(300), '摩天大楼', { alpha: S.at(2, .3, .7), color: C.red });
    } },

  { id: 'cover', header: H4, tr: ['push', 1],
    lines: ['空头被迫{高价回补}——买回股票平仓，', '而回补的买单，又把股价推得更高。', '顶级对冲基金如{梅尔文资本}巨亏数十亿美元，', '并于2022年{清盘}。'],
    visual(ctx, S) {
      const CX = 700, CY = 510, R0 = 200, a = S.at(0, 0, .9);
      const nodes = [[-Math.PI / 2, '股价上涨', C.red], [Math.PI / 6, '空头亏损扩大', C.green], [Math.PI * 5 / 6, '被迫买入回补', C.red]];
      for (let k = 0; k < 3; k++) {
        const a0 = nodes[k][0] + .5, a1 = nodes[(k + 1) % 3][0] + (k === 2 ? Math.PI * 2 : 0) - .56, pts = [];
        for (let s = 0; s <= 24; s++) { const an = lerp(a0, a1, s / 24); pts.push([CX + Math.cos(an) * R0, CY + Math.sin(an) * R0]); }
        const pk = S.at(k === 0 ? 0 : 1, k === 0 ? .4 : (k - 1) * .6, .9);
        K.dotted(ctx, pts, pk, { r: 2 });
        if (pk > .95) { const q = pts[24], p = pts[22]; K.arrow(ctx, p[0], p[1], q[0], q[1], { color: C.goldHi, head: 14 }); }
      }
      nodes.forEach(([an, lab, col], k) => K.tag(ctx, CX + Math.cos(an) * R0, CY + Math.sin(an) * R0, lab, { alpha: S.at(k === 0 ? 0 : 1, k === 0 ? 0 : (k - 1) * .6, .6), color: col, font: F.serif(700, 24) }));
      const sp = S.at(1, 1.4, .6);
      if (sp > 0) { const tt = S.t - S.beat(1) - 1.4, an = -Math.PI / 2 + Math.pow(Math.max(0, tt), 1.5) * 1.3;
        ctx.save(); ctx.globalAlpha = sp; ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 22; ctx.beginPath(); ctx.arc(CX + Math.cos(an) * R0, CY + Math.sin(an) * R0, 7, 0, 6.2832); ctx.fill(); ctx.restore(); }
      K.text(ctx, '逼空循环', CX, CY + 4, { font: F.serif(900, 34), color: C.goldHi, align: 'center', spacing: 4, alpha: a });
      K.text(ctx, 'SHORT SQUEEZE', CX, CY + 36, { font: F.latin(500, 17), color: C.gray, align: 'center', spacing: 5, alpha: a });
      // the fund (plain text only)
      const fa = S.at(2, 0, .8), lx = 1400;
      K.text(ctx, '梅尔文资本', lx, 330, { font: F.serif(900, 44), color: C.white, align: 'center', spacing: 6, alpha: fa });
      K.text(ctx, 'MELVIN CAPITAL', lx, 366, { font: F.latin(500, 20), color: C.gray, align: 'center', spacing: 6, alpha: fa });
      K.line(ctx, lx - 160, 400, lx + 160, 400, { p: fa, color: rgba(C.gold, .6) });
      const lh = 280 * S.at(2, .5, 1.6, easeInOut);
      if (lh > 0) { ctx.save(); const g = ctx.createLinearGradient(0, 400, 0, 680); g.addColorStop(0, rgba(C.green, .3)); g.addColorStop(1, rgba(C.green, .9)); ctx.fillStyle = g; ctx.shadowColor = rgba(C.green, .5); ctx.shadowBlur = 18; ctx.fillRect(lx - 60, 400, 120, lh); ctx.restore();
        K.arrow(ctx, lx + 100, 410, lx + 100, 400 + lh, { color: C.green, alpha: fa }); }
      K.text(ctx, '巨亏数十亿美元', lx, 730, { font: F.serif(700, 28), color: C.green, align: 'center', alpha: S.at(2, 1.6, .7), glow: .4, glowColor: C.green });
      const st = S.at(3, .1, .5);
      if (st > 0) { ctx.save(); ctx.globalAlpha = st; ctx.translate(lx, 540); ctx.rotate(-.12); const z = lerp(1.6, 1, easeOut(st)); ctx.scale(z, z);
        ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.shadowColor = C.red; ctx.shadowBlur = 14; ctx.strokeRect(-130, -40, 260, 80); ctx.restore();
        ctx.save(); ctx.globalAlpha = st; ctx.translate(lx, 540); ctx.rotate(-.12); const z2 = lerp(1.6, 1, easeOut(st)); ctx.scale(z2, z2);
        K.text(ctx, '2022 · 清盘', 0, 14, { font: F.serif(900, 38), color: C.red, align: 'center', spacing: 4 }); ctx.restore(); }
    } },

  /* ================= FINALE · THE TWO QUOTES ================= */
  { id: 'quote1', tr: 'dissolve', camera: { z0: 1.0, z1: 1.05 },
    lines: ['“庄家可以用对倒制造虚假的K线，', '可以用资金强行扭曲均线，', '但他们唯一无法隐藏的，', '就是真金白银砸出来的{成交量}。', '每一手成交，都是用真金白银铺出来的{路标}。”'],
    visual(ctx, S) {
      const ch = chQ, n = QK.length, base = 790, hmax = 170, vmax = Math.max(...QV), MA = ma(QK, 5);
      const fake = S.at(0, .3, 1) * (1 - S.at(2, 0, 1) * .7), dim = 1 - S.at(2, 0, 1) * .6;
      const rev = S.lin(0, 0, 2.2) * n;
      for (let i = 0; i < n && i < Math.ceil(rev); i++) {
        const k = QK[i], j1 = Math.sin(S.t * 6 + i * 1.7) * 1.2 * fake, j2 = Math.cos(S.t * 5 + i) * 1.2 * fake;
        const kk = { o: k.o + j1, c: k.c + j2, h: Math.max(k.h, k.o + j1, k.c + j2), l: Math.min(k.l, k.o + j1, k.c + j2) };
        K.candle(ctx, ch.x(i), kk, p => ch.y(p), { w: ch.cw, grow: clamp(rev - i), alpha: dim * (.75 + .25 * Math.sin(S.t * 9 + i * 3) * fake), glow: .3 });
      }
      K.tag(ctx, ch.x(4), ch.box.y + 10, '虚假的K线', { alpha: S.at(0, 1, .7) * (1 - S.at(2, 0, .8)), color: C.gray });
      const warp = S.at(1, 0, 1);
      K.dotted(ctx, MA.map((v, i) => [ch.x(i), ch.y(v) - 20 + Math.sin(S.t * 2.2 + i * .6) * 44 * warp]), S.lin(1, 0, 1.6), { alpha: .8 * dim, color: C.gold });
      K.tag(ctx, ch.x(n - 4), ch.box.y + 10, '被扭曲的均线', { alpha: warp * (1 - S.at(2, 0, .8)), color: C.gray });
      // the volume does not move with the lies
      const glow = S.at(2, .2, 1);
      vbars(ctx, ch, QV, base, hmax, S.lin(0, .4, 2.2) * n, { vmax, alpha: .45 + .5 * glow, color: () => mix(C.gold, C.goldHi, glow), glow: .2 + .6 * glow });
      K.tag(ctx, 960, 585, '真金白银 · 无法隐藏', { alpha: S.at(3, 0, .8) * (1 - S.at(4, 0, .6)), color: C.gold });
      // signposts on the heaviest bars
      const big = [5, 11, 15, 20, 25], sp = S.at(4, .2, 1);
      const flags = big.map(i => [ch.x(i), base - QV[i] / vmax * hmax - 50]);
      K.dotted(ctx, flags, S.lin(4, .6, 1.6), { r: 2, color: C.goldHi });
      big.forEach((i, j) => {
        const a = S.at(4, j * .2, .6), [x, y] = flags[j]; if (a <= 0) return;
        K.line(ctx, x, y + 50, x, y, { color: C.goldHi, width: 2, alpha: a });
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 12; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 26, y + 9); ctx.lineTo(x, y + 18); ctx.fill(); ctx.restore();
      });
      K.text(ctx, '路标', flags[4][0] + 40, flags[4][1] + 14, { font: F.serif(900, 28), color: C.goldHi, alpha: sp });
    } },

  { id: 'quote2', tr: 'dissolve', camera: { z0: 1.03, z1: 1.0 },
    lines: ['“价格是市场的{皮}，成交量才是市场的{骨}。', '皮相可以伪装，但骨骼{无法说谎}。', '成交量，就是市场最诚实的{测谎仪}。”'],
    visual(ctx, S) {
      const ch = chQ, n = QK.length, base = 790, hmax = 170, vmax = Math.max(...QV);
      const scanX = lerp(260, 1700, S.lin(0, .6, Math.max(1, S.beat(2) - S.beat(0) - .4))), a = S.at(0, 0, .9);
      for (let i = 0; i < n; i++) {
        const x = ch.x(i), xr = x < scanX, h = QV[i] / vmax * hmax;
        K.candle(ctx, x, QK[i], p => ch.y(p), { w: ch.cw, alpha: a * (xr ? .2 : .85), glow: xr ? 0 : .3, color: xr ? C.gray : undefined });
        // bones
        ctx.save(); ctx.globalAlpha = a * (xr ? 1 : .14);
        ctx.fillStyle = xr ? '#F4ECD8' : C.gray; if (xr) { ctx.shadowColor = rgba(C.goldHi, .8); ctx.shadowBlur = 18; }
        ctx.fillRect(x - 5, base - h + 6, 10, h - 12);
        for (const yy of [base - h + 6, base - 6]) { ctx.beginPath(); ctx.arc(x - 6, yy, 7, 0, 6.2832); ctx.arc(x + 6, yy, 7, 0, 6.2832); ctx.fill(); }
        ctx.restore();
      }
      if (scanX > 260 && scanX < 1700) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; const g = ctx.createLinearGradient(scanX - 60, 0, scanX + 6, 0);
        g.addColorStop(0, rgba(C.goldHi, 0)); g.addColorStop(1, rgba(C.goldHi, .25)); ctx.fillStyle = g; ctx.fillRect(scanX - 60, 240, 66, 570); ctx.restore();
        K.line(ctx, scanX, 240, scanX, 810, { color: C.goldHi, width: 2, glow: .9 });
      }
      K.text(ctx, '皮 · 价格', 280, 400, { font: F.serif(700, 24), color: C.white, align: 'right', alpha: S.at(0, .2, .7) });
      K.text(ctx, '骨 · 成交量', 280, 720, { font: F.serif(700, 24), color: C.goldHi, align: 'right', alpha: S.at(0, .6, .7) });
      // the lie detector: a needle traces the bones
      const tp = S.lin(2, 0, 2.4);
      if (tp > 0) {
        const pts = QK.map((_, i) => [ch.x(i), base - QV[i] / vmax * hmax - 22]);
        K.dotted(ctx, pts, tp, { r: 2.2, color: C.goldHi });
        const f = tp * (n - 1), i = Math.min(n - 2, Math.floor(f)), tx = lerp(pts[i][0], pts[i + 1][0], f - i), ty = lerp(pts[i][1], pts[i + 1][1], f - i);
        K.line(ctx, tx + 120, ty - 110, tx, ty, { color: C.white, width: 2, alpha: S.at(2, 0, .5) * (1 - S.at(2, 2.6, .5)) });
        K.tag(ctx, 960, 222, '测谎仪 · 骨骼无法说谎', { alpha: S.at(2, 1.0, .8), color: C.gold, font: F.serif(700, 24) });
      }
    } },

  /* ================= RECAP & END ================= */
  { id: 'recap', tr: 'dissolve', camera: { z0: 1.03, z1: 1.0 },
    lines: ['纸带，让人类第一次{看见}了成交量；', '威科夫，读懂了量里的{努力与结果}；', '格兰维尔，把量累加成了{OBV}；', 'GME，让世界见识了{成交量海啸}。'],
    visual(ctx, S) {
      const rows = [['壹', '纸带', '量价觉醒', C.goldHi], ['贰', '威科夫', '努力与结果', C.red], ['叁', 'OBV', '价格的火车头', C.goldHi], ['肆', 'GME', '成交量海啸', C.red]];
      rows.forEach(([nn, a, b, col], i) => {
        const p = S.at(i, 0, .9), y = 300 + i * 118;
        ctx.save(); ctx.globalAlpha = p; ctx.translate((1 - p) * -60, 0);
        K.goldText(ctx, nn, 600, y + 22, 60, { weight: 900 });
        K.text(ctx, a, 700, y + 18, { font: F.serif(900, 46), color: C.white });
        K.line(ctx, 900, y, 1100, y, { p, color: rgba(C.gold, .6) });
        K.text(ctx, b, 1130, y + 16, { font: F.serif(700, 40), color: col, glow: .4, glowColor: col });
        ctx.restore();
      });
      K.rule(ctx, 960, 780, 420, S.at(3, .4, 1.2));
    } },

  { id: 'end', dur: 5.5, tr: 'zoom', noWatermark: true,
    visual(ctx, S) {
      const a = S.p(.2, 1.2);
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
      K.text(ctx, TITLE, 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(1.2, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.6, 1) });
    } },
  ],
};
})();

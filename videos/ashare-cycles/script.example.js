/* ============================================================
   《K线形态深度课（三）》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py)

   Clock pinned to the music: the drop at 16.7 s is the gold lightning title,
   the quiet section (85.3–103.2 s) carries the broadening pattern's build-up,
   and the track's return at 103.2 s stamps the giant "stay out" X.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };

const H0 = { label: '引入', sub: '多空平衡与情绪失控', en: 'Balance & Euphoria', zh: '《K线形态深度课 · 三》' };
const HT = { label: '形态', num: 1, sub: '对称三角形 · 方向待定', en: 'Symmetrical Triangle', zh: '《压缩与爆发》' };
const HV = { label: '形态', num: 1, sub: '破位 vs 回调', en: 'Breakout vs Pullback', zh: '《压缩与爆发》' };
const HB = { label: '形态', num: 2, sub: '扩散形态 · 情绪陷阱', en: 'Broadening Formation', zh: '《情绪与吸筹》' };
const HC = { label: '形态', num: 3, sub: '杯柄形态 · 主力吸筹', en: 'Cup with Handle', zh: '《情绪与吸筹》' };
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

/* ---------------- data ---------------- */
// symmetrical triangle inside an uptrend: lower highs, higher lows, then the bull bar
const TRp = K.gen.path([100, 116, 108, 114.5, 109.8, 113.2, 110.8], { per: [6, 3, 3, 2, 2, 2], seed: 81, noise: .3, wick: .4 });
const TRK = [...TRp.candles, ...K.gen.seq(110.8, [[6.9, .5, .3], [-1.5, .4, .4], [-1.2, .3, .6], [2.6, .5, .3], [2.2, .5, .4], [1.6, .4, .4]])];
const [T_A, T_B, T_C, T_D, T_E, T_F] = TRp.swings, T_BRK = TRp.candles.length, T_RE = T_BRK + 2;
const triUp = railOf(T_A, T_C), triLo = railOf(T_B, T_D);
const TBOX = { x: 280, y: 380, w: 1360, h: 420 };
const chTR = new K.Chart(TRK, TBOX, { lo: 99, hi: 122 });
const miniL = new K.Chart(TRK, { x: 210, y: 400, w: 680, h: 300 }, { lo: 99, hi: 122 }), miniR = new K.Chart(TRK, { x: 1030, y: 400, w: 680, h: 300 }, { lo: 99, hi: 122 });

// broadening (megaphone): higher highs and lower lows
const BRp = K.gen.path([110, 114, 107, 117, 104, 120.5, 101, 123.5], { per: [2, 3, 3, 3, 3, 3, 3], seed: 91, noise: .3, wick: .5 });
const BRK_ = BRp.candles, BH = BRp.swings.filter(s => s.type === 'H'), BL = BRp.swings.filter(s => s.type === 'L');
const brUp = railOf(BH[0], BH[BH.length - 1]), brLo = railOf(BL[0], BL[BL.length - 1]);
const BBOX = { x: 300, y: 370, w: 1320, h: 450 };
const chBR = new K.Chart(BRK_, BBOX, { lo: 96, hi: 128 });

// cup with handle: panic drop → flat base (volume dries up) → recovery → handle → bull bar on volume
const CUP = (() => {
  const R = K.rng(101), out = []; let p = 130;
  const n = 22, cl = i => 110.5 + 19.5 * Math.pow(Math.abs(i - (n - 1) / 2) / ((n - 1) / 2), 1.7);
  for (let i = 0; i < n; i++) { const c = cl(i) + (i > 0 && i < n - 1 ? (R() - .5) * .9 : 0), o = p; out.push({ o, c, h: Math.max(o, c) + .3 + R() * .6, l: Math.min(o, c) - .3 - R() * .6 }); p = c; }
  return out;
})();
const CPK = [...CUP, ...K.gen.seq(CUP[CUP.length - 1].c, [[-1.0, .4, .4], [.4, .3, .4], [-1.2, .4, .4], [-.5, .3, .4]]), ];
const C_HAND0 = CUP.length, C_BRK = CPK.length;
CPK.push(...K.gen.seq(CPK[CPK.length - 1].c, [[7.6, .6, .3], [1.6, .5, .4], [-.7, .4, .5], [2.1, .5, .3], [1.8, .5, .4]]));
const C_RIM = 130, C_DEPTH = 130 - 110.5;
const CBOX = { x: 260, y: 360, w: 1400, h: 380 };
const chCP = new K.Chart(CPK, CBOX, { lo: 106, hi: 152 });
const CPV = [88, 92, 80, 70, 58, 46, 36, 28, 22, 18, 16, 15, 17, 20, 26, 32, 40, 48, 56, 60, 64, 66, 30, 26, 24, 22, 100, 70, 52, 60, 56];

/* ---------------- icons for the black-hole finale ---------------- */
const SHAPES = {
  tri: [[-1, .1], [-.6, -.7], [-.35, .55], [-.1, -.45], [.1, .3], [.3, -.2], [.45, .05], [1, -.9]],
  meg: [[-1, 0], [-.75, -.2], [-.5, .25], [-.2, -.5], [.1, .55], [.4, -.8], [.75, .85], [1, -.95]],
  cup: [[-1, -.7], [-.7, .35], [-.35, .7], [0, .75], [.35, .65], [.62, -.55], [.75, -.35], [.82, -.45], [1, -.95]],
};

window.FILM = {
  title: 'K线形态深度课（三）',
  transition: 1.2,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },
  scenes: [

  /* ================= 0:00 HOOK — heartbeat ================= */
  { id: 'hook', dur: 6.0, camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, cx = 960, cy = 520;
      const beats = [.3, 1.15, 1.95, 2.7, 3.4, 4.05, 4.65, 5.2];             // speeding up, like a racing pulse
      let pulse = 0; for (const b of beats) { const u = t - b; if (u >= 0 && u < .5) pulse = Math.max(pulse, Math.exp(-u * 9) + .6 * Math.exp(-Math.pow((u - .18) * 14, 2))); }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, 200, cx, cy, 1150); g.addColorStop(0, rgba(C.red, 0)); g.addColorStop(1, rgba(C.red, .32 * pulse));
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); ctx.restore();
      // ECG trace running under the question
      const ecg = []; for (let x = 0; x <= 1920; x += 6) { const ph = ((x / 1920) * 6 - t * 1.3) % 1, q = ph < 0 ? ph + 1 : ph; const y = q > .45 && q < .5 ? -70 * Math.sin((q - .45) / .05 * Math.PI) : q > .5 && q < .55 ? 40 * Math.sin((q - .5) / .05 * Math.PI) : 0; ecg.push([x, 760 + y]); }
      poly(ctx, ecg, 1, { color: C.red, width: 2, alpha: .45 * S.p(.2, 1), blur: 12, head: false });
      const [sx, sy] = [Math.sin(t * 61) * 6 * pulse, Math.cos(t * 53) * 6 * pulse];
      const p = clamp((t - .05) / .3), s = lerp(2.2, 1, easeOut(p)) * (1 + .035 * pulse);
      ctx.save(); ctx.translate(cx + sx, cy + sy); ctx.scale(s, s);
      ctx.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '为什么一追涨杀跌，你就成了接盘侠？', 0, 36, { font: F.serif(900, 50), color: C.white, align: 'center', alpha: p, glow: .65, glowColor: C.red, spacing: 2 });
      ctx.restore();
      K.rule(ctx, cx, 640, 380, S.p(1.4, 1.2));
      K.text(ctx, 'WHO IS LEFT HOLDING THE BAG ?', cx, 700, { font: F.latin(500, 20), color: C.gray, align: 'center', spacing: 10, alpha: S.p(1.8, 1.2) });
    } },

  /* ================= 0:06 THE SPRING SNAPS — triangle → megaphone ================= */
  { id: 'spring', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.03, z1: 1.0 }, subX: 960, subAlign: 'center', pre: 5.2,
    lines: [{ s: '动能看懂了，那{市场情绪}呢？', d: 5.0 }],
    visual(ctx, S) {
      const t = S.t, snap = 4.4, x0 = 520, x1 = 1560, cy = 500;
      const squeeze = smooth(clamp((t - .4) / 3.6)), u = clamp((t - snap) / 1.6), open = smooth(u);
      // the plates: converge (triangle), then swing open (megaphone)
      const half0 = 230, apex = lerp(220, 40, squeeze), spread = lerp(apex, 255, open);
      const L = x1 - x0, rightHalf = t < snap ? apex : spread;
      const yU = x => cy - lerp(t < snap ? half0 : lerp(40, 60, open), rightHalf, (x - x0) / L), yL = x => cy + lerp(t < snap ? half0 : lerp(40, 60, open), rightHalf, (x - x0) / L);
      K.line(ctx, x0, yU(x0), x1, yU(x1), { width: 3, color: t < snap ? C.goldHi : C.green, glow: .9, alpha: S.p(.1, .8) });
      K.line(ctx, x0, yL(x0), x1, yL(x1), { width: 3, color: t < snap ? C.goldHi : C.green, glow: .9, alpha: S.p(.1, .8) });
      // the coil: compressed between the plates, amplitude follows the gap
      if (t < snap + .05) {
        const pts = [], len = lerp(L, L * .62, squeeze), N = 26;
        for (let k = 0; k <= N; k++) { const x = x0 + len * k / N, amp = (yL(x) - yU(x)) / 2 - 14; pts.push([x, cy + (k % 2 ? -1 : 1) * Math.max(6, amp) * (k === 0 || k === N ? 0 : 1)]); }
        const tense = .5 + .5 * Math.sin(t * 40) * squeeze;
        poly(ctx, pts, 1, { color: mix(C.goldHi, C.red, squeeze * .6), width: 3.4, blur: 14 + 10 * tense, head: false });
        K.text(ctx, '对称三角 · 极致压缩', 960, cy + 300, { font: F.serif(900, 28), color: C.goldHi, align: 'center', alpha: S.p(1.2, .8) * (1 - clamp((t - snap + .2) / .3)), glow: .6 });
      }
      // snap: flash + fragments, then the price swings widen inside the megaphone
      flash(ctx, 960, cy, (t > snap ? 1 : 0) * clamp(1 - (t - snap) / .9), 800, C.goldHi);
      if (u > 0 && u < 1) { const R = K.rng(4); for (let k = 0; k < 40; k++) { const a = R() * 6.2832, v = 300 + R() * 700, e = easeOut(u); ctx.fillStyle = rgba(C.goldHi, .8 * (1 - u)); ctx.fillRect(960 + Math.cos(a) * v * e, cy + Math.sin(a) * v * e * .7, 3 + R() * 6, 2); } }
      if (t > snap) {
        const pts = [], N = 12;
        for (let k = 0; k <= N; k++) { const x = x0 + L * k / N, amp = (yL(x) - yU(x)) / 2 - 10; pts.push([x, cy + (k % 2 ? -1 : 1) * amp * (k ? 1 : 0)]); }
        poly(ctx, pts, smooth(clamp((t - snap - .2) / 1.8)), { color: C.green, width: 3.4, blur: 16 });
        const [sx, sy] = shake(t, snap + 1.2, 5, 1.2);
        K.text(ctx, '扩散形态 · 情绪失控', x0 + sx, cy - 255 + sy, { font: F.serif(900, 28), color: C.green, align: 'left', alpha: S.p(snap + 1.0, .8), glow: .6, glowColor: C.green });
      }
    } },

  /* ================= 0:16.7 LIGHTNING TITLE (music drop) ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.05 }, subX: 960, subAlign: 'center', pre: 3.4,
    lines: [{ s: '有时，主力在{“极致压缩”}中蓄势；', d: 2.3 }, { s: '有时，散户在<“极度亢奋”>中毁灭。', d: 2.3 }, { s: '今天直面最难驾驭的{3大高阶形态}！', d: 2.3 }],
    visual(ctx, S) {
      const t = S.t, z = .15;
      const R = K.rng(33), pts = []; let x = -60, y = 300, up = 1;
      while (x < 1980) { pts.push([x, y]); x += 70 + R() * 70; y += up * (50 + R() * 80) + 14; up = -up; }
      const bp = clamp((t - z) / .22), fade = clamp(1 - (t - z - .25) / .9);
      if (bp > 0 && fade > 0) {
        poly(ctx, pts, bp, { color: '#FFF3C4', width: 5, blur: 40, alpha: fade, head: false });
        poly(ctx, pts, bp, { color: C.goldHi, width: 14, blur: 60, alpha: fade * .35, head: false });
        flash(ctx, 960, 470, fade, 1100, C.goldHi);
      }
      const tp = S.p(z + .35, 1.2, K.expo);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 360, 1920, 170); ctx.clip();
      K.goldText(ctx, 'K线形态深度课 · 第三集', 960, 485 + (1 - tp) * 120, 58, { spacing: 10, alpha: tp });
      ctx.restore();
      const sw = clamp((t - 1.6) / 1.3);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const xx = lerp(380, 1540, sw), g = ctx.createLinearGradient(xx - 90, 0, xx + 90, 0);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,240,200,.28)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(xx - 90, 380, 180, 140); ctx.restore();
      }
      K.rule(ctx, 960, 560, 420, S.p(1.2, 1.4));
      K.text(ctx, '解锁：多空博弈的', 960 - 330, 640, { font: F.serif(700, 26), color: C.white, align: 'right', alpha: S.p(1.8, 1) });
      K.text(ctx, '“压缩爆发”', 960 - 320, 640, { font: F.serif(900, 30), color: C.goldHi, align: 'left', alpha: S.p(2.1, 1), glow: .7 });
      K.text(ctx, '与', 960 + 30, 640, { font: F.serif(700, 26), color: C.white, align: 'left', alpha: S.p(2.3, 1) });
      K.text(ctx, '“情绪陷阱”', 960 + 92, 640, { font: F.serif(900, 30), color: C.green, align: 'left', alpha: S.p(2.5, 1), glow: .7, glowColor: C.green });
    } },

  /* ================= PART 1 · SYMMETRICAL TRIANGLE ================= */
  { id: 'ch1', dur: 4.0, tr: 'sweep', visual: chapter('壹', 1, '对称三角形', 'Symmetrical Triangle', '多空势均力敌的压缩') },

  { id: 'tri', header: HT, dur: 26.0, tr: ['iris', [960, 580]], camera: { z0: 1.0, z1: 1.05, x1: -20, y1: 6 }, ...TOP,
    lines: [{ s: '形态 1：{对称三角形}（方向待定）', d: 4.6 }, { s: '高点渐低、低点渐高——{波动被压紧}！', d: 6.2 }, { s: '核心：[大阳突破]做多，<大阴跌破>做空！', d: 6.6 }, { s: '[巨型大阳线]刺破上轨：{破位做多点}', d: 7.5 }],
    visual(ctx, S) {
      const c = chTR, tB = S.beat(3) + .4;
      const r0 = T_BRK * smooth(S.lin(0, 0, 9.5)), r1 = clamp((S.t - tB) / .6), r2 = (TRK.length - T_BRK - 1) * smooth(clamp((S.t - tB - 1.6) / 4));
      const reveal = r0 + (r0 >= T_BRK ? r1 : 0) + (r1 >= 1 ? r2 : 0);
      const [sx, sy] = shake(S.t, tB, 7, 6);
      ctx.save(); ctx.translate(sx, sy);
      K.baseline(ctx, TBOX.x, TBOX.x + TBOX.w, TBOX.y + TBOX.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .5 });
      band(ctx, c, triUp, triLo, T_A.i - .4, T_BRK + .6, S.at(1, .3, 2.2));
      // the squeeze: the gap between the rails, measured as it narrows
      [T_A.i + .5, T_C.i + .5, T_E.i + .4].forEach((i, j) => {
        const a = S.at(1, 1.8 + j * .5, .5) * (1 - S.at(3, 0, .5)), x = c.x(i);
        K.line(ctx, x, c.y(triUp(i)) + 6, x, c.y(triLo(i)) - 6, { color: C.gray, width: 1.4, alpha: a * .9 });
      });
      drawChart(ctx, c, reveal, { dim: () => .85 });
      callout(ctx, '多空势均力敌 · 市场进入犹豫期', c.x((T_A.i + T_BRK) / 2), c.y(triLo((T_A.i + T_BRK) / 2)) + 96, S.at(1, 2.8, .6) * (1 - S.at(2, 0, .5)), S.t - S.beat(1) - 2.8, { size: 24, spacing: 2 });
      // both possible exits, then the one that happens
      const dA = S.at(2, .3, .9) * (1 - S.at(3, .2, .5)), ax = c.x(T_BRK + 1.2), ay = c.y((triUp(T_BRK) + triLo(T_BRK)) / 2);
      K.arrow(ctx, ax - 30, ay - 10, ax + 90, ay - 120, { p: dA, color: C.red, width: 4, head: 20, alpha: dA });
      K.arrow(ctx, ax - 30, ay + 10, ax + 90, ay + 120, { p: dA, color: C.green, width: 4, head: 20, alpha: dA });
      K.text(ctx, '大阳突破 · 做多', ax + 110, ay - 118, { font: F.serif(900, 22), color: C.red, alpha: dA });
      K.text(ctx, '大阴跌破 · 做空', ax + 110, ay + 136, { font: F.serif(900, 22), color: C.green, alpha: dA });
      const bx = c.x(T_BRK), bc = c.y(TRK[T_BRK].c);
      flash(ctx, bx, c.y(triUp(T_BRK)), (S.t >= tB ? 1 : 0) * clamp(1 - (S.t - tB) / 1.4), 420, C.red);
      ring(ctx, bx, c.y(triUp(T_BRK)), (S.t - tB) / 1.2, C.goldHi, 260);
      const ra = S.at(3, 1.6, .7);
      reticle(ctx, bx, bc, ra, S.t, C.red);
      tagAt(ctx, bx - 52, bc - 4, '破位做多点', { side: 'left', alpha: ra, color: C.goldHi, font: F.serif(900, 24) });
      ctx.restore();
    } },

  /* ---------- breakout vs pullback: split screen ---------- */
  { id: 'versus', header: HV, dur: 28.3, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP,
    lines: [{ s: '高阶辩证：{破位介入} vs {回调介入}', d: 4.6 }, { s: '破位：不错过主升浪，但易遇<假突破>', d: 6.4 }, { s: '回调：胜率高、止损小，但易<踏空>', d: 6.4 }, { s: '专业解法：{突破先建半仓，回踩再加仓}！', d: 10.2 }],
    visual(ctx, S) {
      const a0 = S.p(.2, 1.0), finale = S.at(3, .2, .9);
      const panel = (ch, x, w, title, en, k) => {
        const pa = S.p(.3 + k * .25, 1.0, easeOut);
        ctx.save(); ctx.globalAlpha = pa * (1 - .6 * finale);
        ctx.fillStyle = 'rgba(255,255,255,.02)'; ctx.strokeStyle = rgba(C.gold, .4); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect(x, 340, w, 540, 16); ctx.fill(); ctx.stroke();
        K.text(ctx, title, x + w / 2, 386, { font: F.serif(900, 26), color: C.white, align: 'center' });
        K.text(ctx, en, x + w / 2, 414, { font: F.latin(500, 14), color: C.gray, align: 'center', spacing: 4 });
        const rv = (T_BRK + 1 + (k ? 3 : 0)) * smooth(S.lin(0, .6 + k * .3, 3.2));
        band(ctx, ch, triUp, triLo, T_A.i - .4, T_BRK + (k ? 3 : .6), S.at(0, 1.0 + k * .3, 1.6), .8);
        ch.draw(ctx, rv, { glow: .35, dim: () => .85 });
        const i = k ? T_RE + 1 : T_BRK, ra = S.at(0, 3.8 + k * .3, .7);
        reticle(ctx, ch.x(i), ch.y(TRK[i].c), ra, S.t, k ? C.goldHi : C.red);
        if (k) poly(ctx, [[ch.x(T_BRK), ch.y(TRK[T_BRK].c)], [ch.x(T_RE), ch.y(triUp(T_RE)) + 4]], S.at(0, 3.2, 1), { color: C.goldHi, width: 2, dash: [7, 7], blur: 8, head: false });
        ctx.restore();
        const line = k ? 2 : 1, ta = S.at(line, .3, .6, easeBack) * (1 - .6 * finale), tb = S.at(line, 1.6, .6, easeBack) * (1 - .6 * finale);
        tagAt(ctx, x + w / 2, 790, k ? '优点：胜率高、止损小' : '优点：绝不错过主升浪', { alpha: clamp(ta), color: C.red, font: F.serif(900, 22) });
        tagAt(ctx, x + w / 2, 846, k ? '缺点：强势不回调，易踏空' : '缺点：容易遭遇假突破', { alpha: clamp(tb), color: C.green, font: F.serif(900, 22) });
      };
      panel(miniL, 170, 780, '破位介入', 'BREAKOUT ENTRY', 0);
      panel(miniR, 970, 780, '回调介入', 'PULLBACK ENTRY', 1);
      K.text(ctx, 'VS', 960, 620, { font: F.latin(500, 40), color: C.goldHi, align: 'center', alpha: a0 * (1 - finale), glow: .8, spacing: 4 });
      // the pro answer flashes across both halves
      if (finale > 0) {
        const t0 = S.t - S.beat(3) - .2, flick = t0 < 1 ? .55 + .45 * Math.cos(t0 * 24) * (1 - t0) : 1;
        ctx.save(); ctx.globalAlpha = finale; ctx.fillStyle = 'rgba(6,5,4,.78)'; ctx.beginPath(); ctx.roundRect(260, 520, 1400, 190, 18); ctx.fill();
        ctx.strokeStyle = rgba(C.goldHi, .8); ctx.lineWidth = 1.6; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 24; ctx.stroke(); ctx.restore();
        K.text(ctx, '专业级解法', 960, 572, { font: F.serif(700, 20), color: C.gold, align: 'center', spacing: 8, alpha: finale });
        ctx.save(); const s = lerp(1.25, 1, easeOut(finale)); ctx.translate(960, 660); ctx.scale(s, s);
        K.text(ctx, '突破先建半仓，回踩确认再加仓！', 0, 0, { font: F.serif(900, 38), color: '#FFE27A', align: 'center', alpha: finale * flick, glow: 1, glowColor: '#FFD34D', spacing: 3 });
        ctx.restore();
      }
    } },

  /* ================= PART 2 · BROADENING & CUP-WITH-HANDLE ================= */
  { id: 'ch2', dur: 4.0, tr: 'sweep', visual: chapter('贰', 2, '扩散与杯柄', 'Broadening & Cup with Handle', '情绪陷阱 · 主力吸筹') },

  { id: 'broad', header: HB, dur: 22.7, tr: ['iris', [960, 580]], camera: { z0: 1.0, z1: 1.04, x1: -16 }, ...TOP,
    lines: [{ s: '形态 2：{扩散形态}（<情绪陷阱>）', d: 4.8 }, { s: '波动越来越大——{多空分歧巨大}，常在高位', d: 8.4 }, { s: '保命法则：严禁{盲目预测}，先观望！', d: 8.6 }],
    visual(ctx, S) {
      const c = chBR, tX = S.beat(2);                                       // the big X lands when the music returns
      const reveal = BRK_.length * smooth(S.lin(0, 0, 9.0));
      const wild = smooth(S.lin(1, 1.4, 2)) * (1 - smooth(clamp((S.t - tX) / .6)));
      const [sx, sy] = [Math.sin(S.t * 23) * 9 * wild + Math.sin(S.t * 37) * 5 * wild, Math.cos(S.t * 19) * 7 * wild];
      const [kx, ky] = shake(S.t, tX, 16, 5);
      ctx.save(); ctx.translate(sx + kx, sy + ky);
      K.baseline(ctx, BBOX.x, BBOX.x + BBOX.w, BBOX.y + BBOX.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .5 });
      band(ctx, c, brUp, brLo, 0, BRK_.length - .4, S.at(0, 3.0, 3.4), .9);
      drawChart(ctx, c, reveal, { dim: () => .8 });
      const zz = [[c.x(0), c.y(BRK_[0].o)], ...BRp.swings.map(s => [c.x(s.i), c.y(s.price) + (s.type === 'H' ? -6 : 6)])];
      poly(ctx, zz, smooth(S.lin(0, .1, 9.0)), { color: C.green, width: 4.5, alpha: .95 });
      callout(ctx, '【 情绪极度亢奋 / 追涨杀跌频繁 】', 960, BBOX.y + 30, S.at(1, 1.4, .6) * (1 - S.at(2, 0, .4)), S.t - S.beat(1) - 1.4, { size: 30, color: '#FFE27A', spacing: 2 });
      ctx.restore();
      // giant X + warning
      const xa = clamp((S.t - tX) / .35);
      if (xa > 0) {
        ctx.save(); ctx.translate(960, 600); const r = lerp(520, 300, easeOut(xa));
        ctx.globalAlpha = clamp(xa * 1.4) * .92; ctx.strokeStyle = C.green; ctx.lineCap = 'round'; ctx.lineWidth = 34; ctx.shadowColor = rgba(C.green, .9); ctx.shadowBlur = 40;
        ctx.beginPath(); ctx.moveTo(-r, -r * .62); ctx.lineTo(r, r * .62); ctx.moveTo(r, -r * .62); ctx.lineTo(-r, r * .62); ctx.stroke(); ctx.restore();
        ring(ctx, 960, 600, (S.t - tX) / 1.2, C.green, 700);
        const wa = S.at(2, .9, .6, easeBack);
        ctx.save(); ctx.globalAlpha = clamp(wa); ctx.fillStyle = 'rgba(6,5,4,.82)'; ctx.beginPath(); ctx.roundRect(470, 830, 980, 96, 14); ctx.fill();
        ctx.strokeStyle = rgba(C.green, .9); ctx.lineWidth = 1.6; ctx.stroke(); ctx.restore();
        K.text(ctx, '极度危险，专业交易员选择观望！', 960, 892, { font: F.serif(900, 30), color: '#FFE27A', align: 'center', alpha: clamp(wa), glow: .8, glowColor: '#FFD34D' });
      }
    } },

  { id: 'cup', header: HC, dur: 31.8, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05, x1: -20, y1: 6 }, ...TOP,
    lines: [{ s: '形态 3：{杯柄形态}（[主力吸筹]）', d: 4.4 }, { s: '恐慌释放、横盘吸筹、信心恢复、回调洗盘', d: 7.6 }, { s: '[大阳线]放量突破杯柄：{主升浪起点}！', d: 7.4 }, { s: '目标：平移{杯身高度}；也可等{回踩}再进', d: 11.6 }],
    visual(ctx, S) {
      const c = chCP, tB = S.beat(2) + .5;
      const r0 = C_BRK * smooth(S.lin(0, 0, 10.5)), r1 = clamp((S.t - tB) / .6), r2 = (CPK.length - C_BRK - 1) * smooth(clamp((S.t - tB - 1.6) / 4));
      const reveal = r0 + (r0 >= C_BRK ? r1 : 0) + (r1 >= 1 ? r2 : 0);
      const [sx, sy] = shake(S.t, tB + .3, 6, 6);
      ctx.save(); ctx.translate(sx, sy);
      K.baseline(ctx, CBOX.x, CBOX.x + CBOX.w, CBOX.y + CBOX.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .5 });
      volume(ctx, c, CPV, reveal, 790, 100, { hot: C_BRK, base: S.at(0, .2, 1.2) });
      // rim resistance
      const rA = S.at(0, 2.2, 1.6);
      K.dash(ctx, c.x(0) - 20, c.y(C_RIM), CBOX.x + CBOX.w + 10, c.y(C_RIM), { p: rA, color: C.goldHi, width: 2, dash: [10, 8] });
      K.text(ctx, '阻力位', CBOX.x + CBOX.w + 10, c.y(C_RIM) - 14, { font: F.serif(900, 22), color: C.goldHi, align: 'right', alpha: rA * (1 - S.at(2, 0, .5)) });
      drawChart(ctx, c, reveal, { dim: () => .82 });
      // the cup: a round U in red, then the handle
      const U = []; for (let i = 0; i <= 21; i += .5) { const k = CUP[Math.min(21, Math.round(i))]; U.push([c.x(i), c.y((k.o + k.c) / 2 < 113 ? Math.min(k.o, k.c) - .4 : (k.o + k.c) / 2) + 10]); }
      const Us = U.map((p, j) => [p[0], c.y(110.5 + 19.5 * Math.pow(Math.abs(j / 2 - 10.5) / 10.5, 1.7)) + 14]);
      poly(ctx, Us, smooth(S.lin(0, .4, 9.6)), { color: C.red, width: 5, alpha: .9 });
      const stages = [['恐慌释放', 3, 118, 0], ['横盘吸筹', 10.5, 106.6, .7], ['信心恢复', 18, 118, 1.4], ['回调洗盘', C_HAND0 + 1.5, 132.6, 2.1]];
      stages.forEach(([lab, i, p, d]) => tagAt(ctx, c.x(i), c.y(p), lab, { alpha: S.at(1, d, .6, easeBack) * (1 - S.at(2, 0, .6)), color: lab === '回调洗盘' ? C.goldHi : C.red, font: F.serif(900, 20) }));
      tagAt(ctx, c.x(10.5), 770, '成交量萎缩', { alpha: S.at(1, 1.0, .6) * (1 - S.at(2, 0, .6)), color: C.gray, font: F.serif(900, 18) });
      // handle channel
      const hA = S.at(1, 2.6, 1.0), hUp = i => CPK[C_HAND0].h + (i - C_HAND0) * -.55 + .2, hLo = i => CPK[C_HAND0].h - 2.4 + (i - C_HAND0) * -.55;
      if (hA > 0) { K.line(ctx, c.x(C_HAND0 - .4), c.y(hUp(C_HAND0 - .4)), c.x(C_BRK - .3), c.y(hUp(C_BRK - .3)), { color: C.goldHi, width: 1.8, alpha: hA, p: hA });
        K.line(ctx, c.x(C_HAND0 - .4), c.y(hLo(C_HAND0 - .4)), c.x(C_BRK - .3), c.y(hLo(C_BRK - .3)), { color: C.goldHi, width: 1.8, alpha: hA, p: hA }); }
      // breakout on volume
      const bx = c.x(C_BRK), bc = c.y(CPK[C_BRK].c);
      flash(ctx, bx, c.y(C_RIM), (S.t >= tB ? 1 : 0) * clamp(1 - (S.t - tB - .3) / 1.3), 420, C.red);
      ring(ctx, bx, c.y(C_RIM), (S.t - tB - .3) / 1.2, C.goldHi, 260);
      tagAt(ctx, bx, 772, '放量！', { alpha: S.at(2, 1.0, .5) * (1 - S.at(3, 0, .5)), color: C.red, font: F.serif(900, 20) });
      const ra = S.at(2, 1.8, .7);
      reticle(ctx, bx, bc, ra * (1 - .6 * S.at(3, 5.6, .7)), S.t, C.red);
      tagAt(ctx, bx - 52, bc - 4, '主升浪起点', { side: 'left', alpha: ra, color: C.goldHi, font: F.serif(900, 24) });
      // target: the cup's depth, lifted onto the breakout
      const m = smooth(S.lin(3, .3, 2.4)), ma = S.at(3, 0, .6);
      if (ma > 0) {
        const dx0 = c.x(10.5), yb = c.y(110.5), yr = c.y(C_RIM), tx = c.x(C_BRK) + 26;
        const gx = lerp(dx0, tx, m), gb = lerp(yb, yr, m), gt = lerp(yr, c.y(C_RIM + C_DEPTH), m);
        K.vbrace(ctx, gx, gt, gb, '', { p: 1, alpha: ma, color: C.red });
        const lA = S.at(3, 2.8, .8), ty = c.y(C_RIM + C_DEPTH);
        K.dash(ctx, tx - 120, ty, CBOX.x + CBOX.w + 10, ty, { p: lA, color: C.goldHi, width: 1.8 });
        callout(ctx, '目标：平移杯身高度', tx - 140, ty + 10, lA, S.t - S.beat(3) - 2.8, { align: 'right', size: 24, spacing: 2 });
        const rb = S.at(3, 5.6, .7), ri = C_BRK + 2;
        reticle(ctx, c.x(ri), c.y(CPK[ri].l) + 6, rb, S.t, C.goldHi);
        tagAt(ctx, c.x(ri) + 10, c.y(CPK[ri].l) + 62, '回踩：阻力变支撑', { side: 'left', alpha: rb, color: C.goldHi, font: F.serif(900, 20) });
      }
      ctx.restore();
    } },

  /* ================= 2:23.8 PHILOSOPHY — the black hole ================= */
  { id: 'phil', dur: 26.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, cx = 960, cy = 520, col = smooth(clamp(t / 3.4));
      // three shapes spiral inward and vanish
      [['tri', 520, C.goldHi], ['meg', 960, C.green], ['cup', 1400, C.red]].forEach(([key, x0, cc], j) => {
        if (col >= 1) return;
        const ang = col * 4.5 + j * 2.1, rad = lerp(Math.abs(x0 - cx) + 1, 0, col), px = cx + Math.cos(ang) * rad * (x0 === cx ? 0 : 1), py = cy + Math.sin(ang) * rad * .5;
        const s = lerp(150, 4, col), P = SHAPES[key].map(([x, y]) => [px + (x * Math.cos(ang) - y * Math.sin(ang)) * s, py + (x * Math.sin(ang) + y * Math.cos(ang)) * s * .7]);
        poly(ctx, P, 1, { color: cc, width: 3.5, alpha: 1 - col * .7, blur: 18, head: false });
      });
      const H = smooth(clamp((t - .6) / 2.2)) * (1 - smooth(clamp((t - 4.4) / 2.4)));
      if (H > 0) {                                                       // accretion ring + event horizon
        ctx.save(); ctx.translate(cx, cy); ctx.rotate(-.12);
        for (let k = 0; k < 3; k++) { ctx.globalAlpha = H * (.5 - k * .12); ctx.strokeStyle = k ? C.gold : C.goldHi; ctx.lineWidth = 6 - k * 1.5; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 40;
          ctx.beginPath(); ctx.ellipse(0, 0, 260 + k * 46, 64 + k * 14, 0, 0, 6.2832); ctx.stroke(); }
        for (let k = 0; k < 24; k++) { const a = t * (1.6 + (k % 3) * .4) + k * .9, rr = 250 + (k % 4) * 26; ctx.globalAlpha = H * .8; ctx.fillStyle = C.goldHi; ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * .25, 2.2, 0, 6.2832); ctx.fill(); }
        ctx.restore();
        ctx.save(); ctx.globalAlpha = H; const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 170); g.addColorStop(0, '#000'); g.addColorStop(.7, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 170, 0, 6.2832); ctx.fill(); ctx.restore();
      }
      ctx.save(); ctx.fillStyle = `rgba(2,2,3,${(.86 * smooth(clamp((t - 4.2) / 2.8))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
      K.text(ctx, '【 交易哲理总结 】', 960, 300, { font: F.serif(700, 26), color: C.gold, align: 'center', spacing: 10, alpha: S.p(5.4, 1.4) * (1 - S.p(18.0, .8)) });
      // three screens; the last line alone, twice the size, with a sweep and an impact
      const screens = [[['弱者迷失于巨震，', 470, 6.6], ['智者静候于蓄势。', 570, 8.6]], [['平庸者盲目捕捉波动，', 470, 12.2], ['顶尖猎手，看清底牌才扣动扳机。', 570, 14.2]]];
      screens.forEach((lines, k) => {
        const out = 1 - smooth(clamp((t - (k ? 18.0 : 11.4)) / .8));
        for (const [str, y, t0] of lines) {
          const u = smooth(clamp((t - t0) / 1.5)); if (u <= .002 || out <= 0) continue;
          ctx.save(); ctx.translate(960, y - 20); const s = lerp(1.12, 1, u); ctx.scale(s, s); ctx.translate(-960, -(y - 20));
          ctx.filter = u < 1 ? `blur(${((1 - u) * 8).toFixed(1)}px)` : 'none';
          K.goldText(ctx, str, 960, y, 36, { alpha: u * out, glow: .9, spacing: 3 });
          ctx.restore();
        }
      });
      const tF = 19.0, u = clamp((t - tF) / .35);
      if (u > 0) {
        const [sx, sy] = shake(t, tF + .05, 18, 6);
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
      K.text(ctx, 'K线形态深度课（三）', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(1.2, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.6, 1) });
    } },
  ],
};
})();

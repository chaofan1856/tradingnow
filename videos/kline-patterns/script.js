/* ============================================================
   《K线形态深度课（一）》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py)

   Scene clock is pinned to the music: the drop at 16.7 s opens the pattern map,
   the breakdown (85.3–103.2 s) carries the flag's quiet consolidation, and the
   track's return at 103.2 s is the flag breakout.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };        // C2-continuous: no visible start/stop

/* header presets */
const H0 = { label: '引入', sub: '打破死记硬背的迷思', en: 'Beyond Memorization', zh: '《K线形态深度课》' };
const HW = { label: '形态', num: 1, sub: '双底形态 · W底', en: 'Double Bottom', zh: '《反转形态》' };
const HM = { label: '形态', num: 2, sub: '双顶形态 · M头', en: 'Double Top', zh: '《反转形态》' };
const HB = { label: '形态', num: 3, sub: '上升旗形', en: 'Bull Flag', zh: '《延续形态》' };
const HD = { label: '形态', num: 4, sub: '下降旗形', en: 'Bear Flag', zh: '《延续形态》' };

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

/* ---------------- the four pattern icons (cards, recap) ---------------- */
const ICON = {
  W: { col: C.red, name: '双底', en: 'DOUBLE BOTTOM', pts: [[-1, -.75], [-.5, .65], [0, -.1], [.5, .65], [1, -.95]] },
  M: { col: C.green, name: '双顶', en: 'DOUBLE TOP', pts: [[-1, .75], [-.5, -.65], [0, .1], [.5, -.65], [1, .95]] },
  BF: { col: C.red, name: '上升旗形', en: 'BULL FLAG', pts: [[-1, .9], [-.45, -.7], [-.3, -.45], [-.18, -.6], [-.02, -.32], [.12, -.47], [.28, -.2], [1, -1]], ch: [[-.47, -.82, .32, -.38], [-.47, -.48, .32, -.04]] },
  BR: { col: C.green, name: '下降旗形', en: 'BEAR FLAG', pts: [[-1, -.9], [-.45, .7], [-.3, .45], [-.18, .6], [-.02, .32], [.12, .47], [.28, .2], [1, 1]], ch: [[-.47, .82, .32, .38], [-.47, .48, .32, .04]] },
};
function icon(ctx, key, cx, cy, s, p, a = 1) {
  const I = ICON[key], P = I.pts.map(([x, y]) => [cx + x * s, cy + y * s * .8]);
  if (I.ch) for (const [x1, y1, x2, y2] of I.ch) K.dash(ctx, cx + x1 * s, cy + y1 * s * .8, cx + x2 * s, cy + y2 * s * .8, { p: clamp(p * 2 - .6), alpha: a * .8, color: C.gold, dash: [6, 6] });
  poly(ctx, P, p, { color: I.col, width: Math.max(2.5, s * .045), alpha: a, blur: 16 });
}

/* ---------------- data ---------------- */
// W bottom: downtrend → L1 → neck → L2 → neck → breakout bull bar → follow-through
const Wp = K.gen.path([130, 100, 114, 100.8, 114], { per: [8, 5, 5, 5], seed: 21, noise: .45, wick: .5 });
const WK = [...Wp.candles, ...K.gen.seq(114, [[6.4, .5, .3], [1.4, .5, .4], [-.7, .4, .5], [1.9, .4, .3], [1.6, .5, .4]])];
const WBOX = { x: 250, y: 380, w: 1400, h: 440 };   // subtitles sit above the chart in these scenes
const chW = new K.Chart(WK, WBOX, { lo: 92, hi: 134 });
const W_L1 = Wp.swings[0], W_NK = Wp.swings[1], W_L2 = Wp.swings[2];
const W_NECK = 114, W_BRK = 23, W_STOP = 98.6;

// M top: uptrend → H1 → neck → H2 → neck → breakdown bear bar → pullback to the neck → bearish engulfing → follow-through
const Mp = K.gen.path([100, 128, 114, 127.2, 114], { per: [8, 5, 5, 5], seed: 34, noise: .45, wick: .5 });
const MK = [...Mp.candles, ...K.gen.seq(114, [[-7.6, .3, .5], [2.3, .4, .3], [2.3, .5, .3], [2.4, .7, .3], [-9.4, .4, .5], [-1.6, .3, .4], [-1.3, .3, .5]])];
const chM = new K.Chart(MK, WBOX, { lo: 96, hi: 134 });
const M_H1 = Mp.swings[0], M_H2 = Mp.swings[2];
const M_NECK = 114, M_BRK = 23, M_ENG = 27;

// flags: pole → channel (volume dries up) → breakout bar → continuation
function flagData(dir) {
  const s = dir;                                         // +1 bull, −1 bear
  const pole = [[3.2, .3, .2], [3.8, .4, .3], [4.2, .3, .3], [3.6, .4, .2], [4.4, .5, .3], [3.0, .4, .3]].map(([d, u, l]) => s > 0 ? [d, u, l] : [-d, l, u]);
  const flag = [[-2.6, .7, .6], [1.2, .6, .5], [-2.4, .6, .7], [1.0, .7, .5], [-2.2, .6, .6], [1.1, .5, .5], [-2.0, .6, .6], [.8, .5, .5], [-1.6, .5, .6]].map(([d, u, l]) => s > 0 ? [d, u, l] : [-d, l, u]);
  const brk = s > 0 ? [[8.4, .5, .3]] : [[-8.6, .3, .5]];
  const cont = (s > 0 ? [[1.8, .5, .3], [2.2, .4, .4], [-.8, .4, .5], [2.6, .5, .3], [2.2, .5, .4]] : [[-1.8, .3, .5], [-2.2, .4, .4], [.8, .5, .4], [-2.4, .3, .5]]);
  const start = s > 0 ? 100 : 140;
  const k = K.gen.seq(start, [...pole, ...flag, ...brk, ...cont]);
  const vol = [70, 82, 90, 86, 95, 80, 56, 44, 38, 33, 28, 24, 20, 17, 15, 100, 72, 64, 50, 60, 56].slice(0, k.length);
  const P0 = 0, P1 = 5, F0 = 6, F1 = 14, B = 15;
  // channel: one slope through the flag, offset to hug the extremes
  const xs = [], hs = [], ls = []; for (let i = F0; i <= F1; i++) { xs.push(i); hs.push(k[i].h); ls.push(k[i].l); }
  const mid = i => (k[i].o + k[i].c) / 2, slope = (mid(F1) - mid(F0)) / (F1 - F0);
  const up = Math.max(...hs.map((h, j) => h - slope * (xs[j] - F0))), lo = Math.min(...ls.map((l, j) => l - slope * (xs[j] - F0)));
  const chan = { slope, up: i => up + slope * (i - F0), lo: i => lo + slope * (i - F0) };
  const poleLen = k[P1].c - k[P0].o;
  const brkLevel = s > 0 ? chan.up(B) : chan.lo(B);
  return { k, vol, P0, P1, F0, F1, B, chan, poleLen, brkLevel, target: brkLevel + poleLen, dir: s };
}
const BULL = flagData(1), BEAR = flagData(-1);
const FBOX = { x: 300, y: 360, w: 1260, h: 380 }, VBOX = { y: 800, h: 120 };
const chBull = new K.Chart(BULL.k, FBOX, { lo: 97, hi: 141 }), chBear = new K.Chart(BEAR.k, FBOX, { lo: 104, hi: 143 });

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

/* ---------------- flag scene (shared by bull / bear) ---------------- */
function flagScene(D, ch, o) {
  const s = D.dir, col = s > 0 ? C.red : C.green;
  return (ctx, S) => {
    const tB = S.beat(o.brkLine);                                       // breakout moment (pinned to the music)
    // reveal: pole on line 0, flag on line 1, breakout + continuation afterwards
    const rPole = (D.P1 + 1) * smooth(S.lin(0, .2, 2.4));
    const rFlag = (D.F1 - D.F0 + 1) * smooth(S.lin(1, .1, 3.6));
    const rBrk = clamp((S.t - tB) / .55);
    const rCont = (D.k.length - D.B - 1) * smooth(clamp((S.t - tB - 1.6) / 3.2));
    const reveal = rPole + (rPole >= D.P1 + 1 ? rFlag : 0) + (rFlag >= D.F1 - D.F0 + 1 ? rBrk : 0) + (rBrk >= 1 ? rCont : 0);
    const [sx, sy] = shake(S.t, tB, 7, 6);
    ctx.save(); ctx.translate(sx, sy);

    // volume panel
    const vTop = VBOX.y, vH = VBOX.h, dry = smooth(S.lin(2, .2, 2.2));       // line 2: volume dries up
    K.baseline(ctx, FBOX.x, FBOX.x + FBOX.w, vTop + vH, { p: S.at(0, 0, 1.4), step: 60, alpha: .8 });
    K.text(ctx, 'VOLUME', FBOX.x - 18, vTop + 18, { font: F.latin(500, 14), color: C.gray, align: 'right', spacing: 3, alpha: S.at(0, .3, 1) });
    for (let i = 0; i < D.k.length && i < Math.ceil(reveal); i++) {
      const g = clamp(reveal - i), inFlag = i >= D.F0 && i <= D.F1;
      const v = inFlag ? lerp(Math.max(D.vol[i], 62), D.vol[i], dry) : D.vol[i];
      const h = vH * v / 100 * easeOut(g), x = ch.x(i), w = ch.cw;
      const c = i === D.B ? col : inFlag ? mix(C.gold, C.gray, .3) : mix(col, C.gold, .25);
      ctx.save(); ctx.globalAlpha = .9 * easeOut(g); ctx.fillStyle = rgba(c, i === D.B ? .95 : .7);
      if (i === D.B) { ctx.shadowColor = col; ctx.shadowBlur = 18; }
      ctx.fillRect(x - w / 2, vTop + vH - h, w, h); ctx.restore();
    }
    // volume trend dots over the flag + highlight tag
    const vt = S.at(2, 1.0, 1.4);
    if (vt > 0) {
      const pts = []; for (let i = D.F0; i <= D.F1; i++) pts.push([ch.x(i), vTop + vH - vH * D.vol[i] / 100 - 10]);
      K.dotted(ctx, pts, vt, { color: C.goldHi, gap: 8, r: 2 });
      K.arrow(ctx, ch.x(D.F1) - 10, vTop + vH - vH * D.vol[D.F1] / 100 - 14, ch.x(D.F1) + 30, vTop + vH - vH * D.vol[D.F1] / 100 - 4, { p: vt, alpha: vt, head: 12, width: 1.6 });
    }

    // channel (flag) — translucent band + rails
    const cA = S.at(1, 1.6, 1.4);
    if (cA > 0) {
      const x0 = ch.x(D.F0) - ch.step * .5, x1 = lerp(x0, ch.x(D.F1) + ch.step * 1.1, smooth(cA));
      const yU = i => ch.y(D.chan.up(i)), yL = i => ch.y(D.chan.lo(i));
      const iAt = x => D.F0 + (x - ch.x(D.F0)) / ch.step;
      ctx.save(); ctx.globalAlpha = .1 * cA; ctx.fillStyle = C.gold;
      ctx.beginPath(); ctx.moveTo(x0, yU(iAt(x0))); ctx.lineTo(x1, yU(iAt(x1))); ctx.lineTo(x1, yL(iAt(x1))); ctx.lineTo(x0, yL(iAt(x0))); ctx.fill(); ctx.restore();
      K.line(ctx, x0, yU(iAt(x0)), x1, yU(iAt(x1)), { width: 1.8, color: C.goldHi, glow: .6, alpha: cA });
      K.line(ctx, x0, yL(iAt(x0)), x1, yL(iAt(x1)), { width: 1.8, color: C.goldHi, glow: .6, alpha: cA });
    }

    drawChart(ctx, ch, reveal, { dim: i => (i >= D.F0 && i <= D.F1) || S.t < tB ? 1 : (i === D.B ? 1 : .9) });

    // pole arrow + label
    const pA = S.at(0, 1.0, 1.4);
    const ax0 = ch.x(D.P0) - 52, ay0 = ch.y(D.k[D.P0].o), ax1 = ch.x(D.P1) - 52, ay1 = ch.y(D.k[D.P1].c);
    K.arrow(ctx, ax0, ay0, ax1, ay1, { p: pA, color: col, width: 9, head: 30 });
    callout(ctx, '旗杆', ax0 + (ax1 - ax0) * .5 - 40, (ay0 + ay1) / 2 + (s > 0 ? 12 : 64), S.at(0, 1.8, .6), S.t - S.beat(0) - 1.8, { align: 'right', size: 30 });
    // flag label
    const fx = (ch.x(D.F0) + ch.x(D.F1)) / 2, fy = s > 0 ? ch.y(D.chan.up((D.F0 + D.F1) / 2)) - 46 : ch.y(D.chan.lo((D.F0 + D.F1) / 2)) + 66;
    callout(ctx, o.flagLabel, fx, fy, S.at(1, 2.4, .6) * (1 - S.at(o.brkLine, 0, .6)), S.t - S.beat(1) - 2.4, { size: 26, spacing: 2 });
    // volume insight tag
    tagAt(ctx, (ch.x(D.F0) + ch.x(D.F1)) / 2, vTop - 20, o.volTag, { alpha: S.at(2, 1.5, .7), color: C.goldHi, font: F.serif(700, 19) });

    // breakout: flash, shock ring, label
    const bx = ch.x(D.B), by = ch.y(D.k[D.B].c);
    flash(ctx, bx, ch.y(D.brkLevel), clamp(1 - (S.t - tB) / 1.4) * (S.t >= tB ? 1 : 0), 420, col);
    ring(ctx, bx, ch.y(D.brkLevel), (S.t - tB) / 1.2, C.goldHi, 260);
    const bl = S.at(o.brkLine, .5, .7);
    tagAt(ctx, bx + 40, by + (s > 0 ? 62 : -62), o.brkLabel, { side: 'right', alpha: bl, color: col, font: F.serif(900, 24) });

    // measured move: the pole is copied and slid onto the breakout point
    if (o.target) {
      const m = smooth(S.lin(o.brkLine + 1, .2, 2.2)), ma = S.at(o.brkLine + 1, 0, .6);
      if (ma > 0) {
        const tx0 = ch.x(D.B), ty0 = ch.y(D.brkLevel), dx = ax1 - ax0, dy = ay1 - ay0;
        const gx0 = lerp(ax0, tx0, m), gy0 = lerp(ay0, ty0, m);
        ctx.save(); ctx.setLineDash([10, 8]); ctx.restore();
        K.arrow(ctx, gx0, gy0, gx0 + dx, gy0 + dy, { p: 1, color: mix(col, C.goldHi, .35), width: 7, head: 26, alpha: ma * .85 });
        const ty = ch.y(D.target), lA = S.at(o.brkLine + 1, 2.4, .8);
        K.dash(ctx, tx0 - 40, ty, FBOX.x + FBOX.w + 60, ty, { p: lA, color: C.goldHi, width: 1.6 });
        K.vbrace(ctx, FBOX.x + FBOX.w + 70, ty, ty0, '', { p: lA, alpha: .8 });
        callout(ctx, '预计涨幅目标', tx0 - 60, ty + 12, lA, S.t - S.beat(o.brkLine + 1) - 2.4, { align: 'right', size: 26, spacing: 2 });
      }
    }
    ctx.restore();
  };
}

window.FILM = {
  title: 'K线形态深度课（一）',
  transition: 1.2,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },
  scenes: [

  /* ================= 0:00 HOOK ================= */
  { id: 'hook', dur: 6.0, camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, slam = .3, cx = 960, cy = 520;
      const [sx, sy] = shake(t, slam, 26, 4.2);
      const R = K.rng(77);
      // impact flash + crack web radiating from the hit point
      flash(ctx, cx, cy, clamp(1 - (t - slam) / .8) * (t > slam ? 1 : 0), 700, '#FFFFFF');
      const crk = easeOut((t - slam) / .35);
      if (crk > 0) {
        ctx.save(); ctx.translate(sx * .6, sy * .6);
        ctx.strokeStyle = 'rgba(236,230,217,.55)'; ctx.lineWidth = 1.4; ctx.shadowColor = 'rgba(255,255,255,.6)'; ctx.shadowBlur = 6;
        for (let k = 0; k < 18; k++) {
          const ang = k / 18 * 6.2832 + R() * .3, len = (420 + R() * 620) * crk;
          let x = cx, y = cy; ctx.beginPath(); ctx.moveTo(x, y);
          for (let j = 1; j <= 6; j++) { const a2 = ang + (R() - .5) * .35; x = cx + Math.cos(a2) * len * j / 6; y = cy + Math.sin(a2) * len * j / 6; ctx.lineTo(x, y); }
          ctx.stroke();
        }
        ctx.globalAlpha = .35; for (let ri = 1; ri <= 3; ri++) { ctx.beginPath(); const rr = ri * 120 * crk; for (let k = 0; k <= 18; k++) { const a2 = k / 18 * 6.2832; const j = 1 + (R() - .5) * .2; k ? ctx.lineTo(cx + Math.cos(a2) * rr * j, cy + Math.sin(a2) * rr * j) : ctx.moveTo(cx + Math.cos(a2) * rr * j, cy + Math.sin(a2) * rr * j); } ctx.stroke(); }
        ctx.restore();
        // flying shards
        for (let k = 0; k < 40; k++) {
          const ang = R() * 6.2832, v = 300 + R() * 900, u = t - slam, x = cx + Math.cos(ang) * v * u, y = cy + Math.sin(ang) * v * u + 600 * u * u, sz = 4 + R() * 12, a = clamp(1 - u / 1.6);
          if (a <= 0) continue;
          ctx.save(); ctx.globalAlpha = a * .7; ctx.translate(x, y); ctx.rotate(u * (R() * 8 - 4)); ctx.fillStyle = 'rgba(236,230,217,.5)'; ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = .8;
          ctx.beginPath(); ctx.moveTo(0, -sz); ctx.lineTo(sz * .7, sz * .6); ctx.lineTo(-sz * .5, sz * .4); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
        }
      }
      // the question slams in: oversize → size, blur → sharp
      const p = clamp((t - .05) / .3), s = lerp(2.2, 1, easeOut(p));
      ctx.save(); ctx.translate(cx + sx, cy + sy); ctx.scale(s, s);
      ctx.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, '为什么你一实操就亏钱？', 0, 36, { font: F.serif(900, 62), color: C.white, align: 'center', alpha: p, glow: .55, glowColor: C.red, spacing: 4 });
      ctx.restore();
      K.rule(ctx, cx, 640, 360, S.p(1.4, 1.2));
      K.text(ctx, 'WHY DO YOU KEEP LOSING ?', cx, 700, { font: F.latin(500, 20), color: C.gray, align: 'center', spacing: 10, alpha: S.p(1.8, 1.2) });
    } },

  /* ================= 0:06 STOP MEMORIZING → THE BALANCE ================= */
  { id: 'rote', header: H0, subX: 960, subAlign: 'center', dur: 10.7, tr: 'zoom', camera: { z0: 1.04, z1: 1.0, x0: 20, x1: -10 }, pre: .5,
    lines: [{ s: '别再{死记硬背}K线图了！', d: 4.6 }, { s: '专业交易员，看的是{“多空博弈心理”}。', d: 5.4 }],
    visual(ctx, S) {
      // 1) a cluttered chart buried in "memorize" stickers, each struck out
      const clutter = 1 - S.at(1, -.3, 1.2, easeInOut);
      if (clutter > 0) {
        ctx.save(); ctx.globalAlpha = clutter;
        const z = lerp(.7, 1, clutter); ctx.translate(960, 500); ctx.scale(z, z); ctx.translate(-960, -500);
        for (let k = 0; k < 3; k++) {
          const p = K.gen.path([110 + k * 4, 125 - k * 3, 104 + k * 2, 121, 108 - k, 118 + k * 2], { per: 5, seed: 40 + k, noise: 1.2, wick: 1.1 });
          const c = new K.Chart(p.candles, { x: 220 + k * 40, y: 250 + k * 30, w: 1440, h: 470 });
          c.draw(ctx, p.candles.length * smooth(S.lin(0, -.4 + k * .3, 2.2)), { alpha: .35 + k * .12, glow: .2 });
        }
        const stickers = [[520, 330, -.12], [1290, 300, .1], [760, 640, .08], [1430, 620, -.09]];
        stickers.forEach(([x, y, rot], j) => {
          const a = S.at(0, .3 + j * .25, .5, easeBack);
          if (a <= 0) return;
          ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(lerp(1.4, 1, a), lerp(1.4, 1, a));
          K.tag(ctx, 0, 0, '死记硬背', { alpha: clamp(a), color: C.white, font: F.serif(900, 28) });
          const xa = S.at(0, 1.9 + j * .28, .32);                         // green X stamps
          if (xa > 0) {
            ctx.strokeStyle = C.green; ctx.lineCap = 'round'; ctx.lineWidth = 11; ctx.shadowColor = rgba(C.green, .8); ctx.shadowBlur = 22;
            const r = lerp(150, 92, easeOut(xa)); ctx.globalAlpha = clamp(xa * 1.4);
            ctx.beginPath(); ctx.moveTo(-r, -r * .55); ctx.lineTo(r, r * .55); ctx.moveTo(r, -r * .55); ctx.lineTo(-r, r * .55); ctx.stroke();
          }
          ctx.restore();
        });
        ctx.restore();
      }
      // 2) the balance: buyers vs sellers, swinging hard
      const b = S.at(1, .2, 1.4, easeInOut);
      if (b <= 0) return;
      const px = 960, py = 330, half = 400 * smooth(b), rope = 170;
      const tt = S.t - S.beat(1);
      const ang = (Math.sin(tt * 2.3) * .13 + Math.sin(tt * 3.7 + 1) * .05) * smooth(clamp(tt / 1.2));
      ctx.save(); ctx.globalAlpha = b;
      // post + base
      const g = ctx.createLinearGradient(0, py, 0, 760); g.addColorStop(0, C.goldHi); g.addColorStop(1, C.goldDeep);
      ctx.strokeStyle = g; ctx.lineWidth = 6; ctx.shadowColor = rgba(C.gold, .6); ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, lerp(py, 760, smooth(b))); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px - 120 * b, 760); ctx.lineTo(px + 120 * b, 760); ctx.stroke();
      // beam
      const ex = Math.cos(ang) * half, ey = Math.sin(ang) * half;
      ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(px - ex, py - ey); ctx.lineTo(px + ex, py + ey); ctx.stroke();
      ctx.fillStyle = C.goldHi; ctx.beginPath(); ctx.arc(px, py, 12, 0, 6.2832); ctx.fill();
      ctx.restore();
      // pans (always hang straight down) with candle weights
      const side = (sgn, col, lab, en, wts) => {
        const hx = px + sgn * ex, hy = py + sgn * ey, panY = hy + rope;
        ctx.save(); ctx.globalAlpha = b; ctx.strokeStyle = rgba(C.gold, .8); ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 110, panY); ctx.moveTo(hx, hy); ctx.lineTo(hx + 110, panY); ctx.stroke();
        ctx.strokeStyle = C.goldHi; ctx.lineWidth = 4; ctx.shadowColor = rgba(C.gold, .6); ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.moveTo(hx - 130, panY); ctx.quadraticCurveTo(hx, panY + 56, hx + 130, panY); ctx.stroke();
        ctx.restore();
        wts.forEach((h, j) => {                                          // candles stacked as weights
          const a = S.at(1, .9 + j * .15, .5, easeBack); if (a <= 0) return;
          const x = hx - 60 + j * 40, top = panY + 8 - h * clamp(a, 0, 1.2);
          ctx.save(); ctx.globalAlpha = clamp(a) * b; ctx.fillStyle = col; ctx.shadowColor = rgba(col, .7); ctx.shadowBlur = 18;
          ctx.fillRect(x - 13, top, 26, panY + 8 - top); ctx.fillRect(x - 1.5, top - 18, 3, 18); ctx.restore();
        });
        K.text(ctx, lab, hx, panY + 102, { font: F.serif(900, 30), color: col, align: 'center', alpha: S.at(1, 1.3, .8), glow: .5, glowColor: col });
        K.text(ctx, en, hx, panY + 138, { font: F.latin(500, 16), color: C.gray, align: 'center', spacing: 6, alpha: S.at(1, 1.6, .8) });
      };
      side(-1, C.red, '买方力量', 'BUYERS', [70, 96, 58, 82]);
      side(1, C.green, '卖方力量', 'SELLERS', [88, 64, 100, 72]);
    } },

  /* ================= 0:16.7 THE PATTERN MAP (music drop) ================= */
  { id: 'map', header: H0, subX: 960, subAlign: 'center', dur: 10.3, tr: ['iris', [960, 330]], camera: { z0: .98, z1: 1.03 }, pre: .9,
    lines: [{ s: '方向：[看涨]　或　<看跌>', d: 4.4 }, { s: '类型：{反转}　或　{延续}', d: 4.6 }],
    visual(ctx, S) {
      const keys = ['W', 'M', 'BF', 'BR'], xs = [420, 780, 1140, 1500], cy = 400, cw = 310, chh = 280;
      const dirA = S.at(0, .3, .8), typA = S.at(1, .3, .8);
      keys.forEach((key, j) => {
        const a = S.p(.15 + j * .14, .9, easeOut), x = xs[j], y = cy + (1 - a) * 60;
        if (a <= 0) return;
        const I = ICON[key], tint = dirA * (1 - typA * .55);
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = rgba(mix(C.gold, I.col, tint), .05 + .05 * tint); ctx.strokeStyle = rgba(mix(C.gold, I.col, tint), .55 + .3 * tint); ctx.lineWidth = 1.4;
        if (tint > .1) { ctx.shadowColor = rgba(I.col, .45 * tint); ctx.shadowBlur = 24; }
        ctx.beginPath(); ctx.roundRect(x - cw / 2, y - chh / 2, cw, chh, 14); ctx.fill(); ctx.stroke(); ctx.restore();
        icon(ctx, key, x, y - 34, 98, S.p(.4 + j * .14, 1.3, easeInOut), a);
        K.text(ctx, I.name, x, y + 84, { font: F.serif(900, 26), color: C.white, align: 'center', alpha: a });
        K.text(ctx, I.en, x, y + 116, { font: F.latin(500, 14), color: C.gray, align: 'center', spacing: 4, alpha: a });
      });
      // 方向: bullish / bearish chips under each card
      K.text(ctx, '方向', 230, 622, { font: F.serif(700, 20), color: C.gray, align: 'right', alpha: dirA });
      keys.forEach((key, j) => {
        const bull = key === 'W' || key === 'BF', a = S.at(0, .3 + j * .12, .6, easeBack);
        tagAt(ctx, xs[j], 610, bull ? '看涨' : '看跌', { alpha: clamp(a), color: bull ? C.red : C.green, font: F.serif(900, 22) });
      });
      // 类型: reversal (1–2) / continuation (3–4)
      K.text(ctx, '类型', 230, 708, { font: F.serif(700, 20), color: C.gray, align: 'right', alpha: typA });
      K.bracket(ctx, xs[0] - 120, xs[1] + 120, 684, '', { p: S.at(1, .3, .9), up: false });
      K.bracket(ctx, xs[2] - 120, xs[3] + 120, 684, '', { p: S.at(1, .6, .9), up: false });
      tagAt(ctx, (xs[0] + xs[1]) / 2, 734, '反转 · REVERSAL', { alpha: S.at(1, .8, .6), color: C.goldHi, font: F.serif(900, 22) });
      tagAt(ctx, (xs[2] + xs[3]) / 2, 734, '延续 · CONTINUATION', { alpha: S.at(1, 1.1, .6), color: C.goldHi, font: F.serif(900, 22) });
    } },

  /* ================= PART 1 · REVERSALS ================= */
  { id: 'ch1', dur: 4.0, tr: 'sweep', visual: chapter('壹', 1, '反转形态', 'Reversal Patterns', '精准捕捉趋势拐点 · 双底 · 双顶') },

  { id: 'wbot', header: HW, dur: 26.0, tr: ['iris', [960, 600]], subX: 960, subY: 275, subAlign: 'center', camera: { z0: 1.0, z1: 1.06, x1: -24, y1: -8 },
    lines: [{ s: '形态 1：{双底形态（W底）}', d: 4.7 }, { s: '两次探底不破——意味着{主力筑底完成}！', d: 6.1 }, { s: '入场信号：[大阳线]强势突破{颈线}！', d: 6.5 }, { s: '止损设在{第二个底部}下方，风险可控。', d: 7.3 }],
    visual(ctx, S) {
      const c = chW, tB = S.beat(2) + .5;
      const r0 = W_BRK * smooth(S.lin(0, 0, 4.4));
      const r1 = clamp((S.t - tB) / .6), r2 = (WK.length - W_BRK - 1) * smooth(S.lin(3, 1.2, 4));
      const reveal = r0 + (r0 >= W_BRK ? r1 : 0) + (r1 >= 1 ? r2 : 0);
      const [sx, sy] = shake(S.t, tB + .35, 6, 6);
      ctx.save(); ctx.translate(sx, sy);
      K.baseline(ctx, WBOX.x, WBOX.x + WBOX.w, WBOX.y + WBOX.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .7 });
      drawChart(ctx, c, reveal, { dim: () => .78 });
      // the W itself, drawn in red with the candles
      const wp = [[c.x(0), c.y(WK[0].h)], [c.x(W_L1.i), c.y(W_L1.price) + 6], [c.x(W_NK.i), c.y(W_NK.price) - 6], [c.x(W_L2.i), c.y(W_L2.price) + 6], [c.x(W_BRK - 1), c.y(W_NECK)]];
      poly(ctx, wp, smooth(S.lin(0, .1, 4.4)), { color: C.red, width: 5, alpha: .95 });
      // bottoms flash: "跌不动了！"
      [W_L1, W_L2].forEach((sw, j) => {
        const a = S.at(1, .3 + j * .5, .5), x = c.x(sw.i), y = c.y(sw.price) + 6;
        K.marker(ctx, x, y, { alpha: a, r: 12, pulse: ((S.t - S.beat(1)) * .9 + j * .3) % 1, color: C.goldHi });
        tagAt(ctx, x, y + 54, '跌不动了！', { alpha: a, color: C.goldHi, font: F.serif(900, 22) });
      });
      // neckline from the middle peak
      const nA = S.at(1, 2.6, 1.4), ny = c.y(W_NECK);
      K.dash(ctx, c.x(W_NK.i) - 30, ny, WBOX.x + WBOX.w + 20, ny, { p: nA, color: C.goldHi, width: 2.2, dash: [12, 9] });
      callout(ctx, '【 颈线 】', c.x(W_NK.i) + 10, ny - 22, S.at(1, 3.2, .4), S.t - S.beat(1) - 3.2, { size: 28 });
      // breakout bull bar: flash + ring, then the target reticle on its close
      const bx = c.x(W_BRK), bc = c.y(WK[W_BRK].c);
      flash(ctx, bx, ny, (S.t > tB ? 1 : 0) * clamp(1 - (S.t - tB - .3) / 1.2), 360, C.red);
      ring(ctx, bx, ny, (S.t - tB - .3) / 1.1, C.goldHi, 220);
      const ra = S.at(2, 1.9, .7);
      reticle(ctx, bx, bc, ra, S.t);
      tagAt(ctx, bx - 52, bc - 4, '做多入场点', { side: 'left', alpha: ra, color: C.goldHi, font: F.serif(900, 24) });
      // stop under the second bottom
      const sA = S.at(3, .2, 1.2), sy2 = c.y(W_STOP);
      K.line(ctx, c.x(W_L2.i) - 60, sy2, WBOX.x + WBOX.w + 20, sy2, { p: sA, color: C.green, width: 2.6, glow: .7 });
      callout(ctx, '止损位', WBOX.x + WBOX.w + 20, sy2 + 44, S.at(3, .9, .5), S.t - S.beat(3) - .9, { align: 'right', color: C.green, size: 26 });
      // follow-through arrow
      const fa = S.at(3, 3.2, 1.2);
      K.arrow(ctx, c.x(W_BRK) + 20, bc - 40, c.x(WK.length - 1) + 10, c.y(WK[WK.length - 1].h) - 40, { p: fa, alpha: fa, color: C.red, width: 3, head: 18 });
      ctx.restore();
    } },

  { id: 'mtop', header: HM, dur: 28.3, tr: ['push', 1], subX: 960, subY: 275, subAlign: 'center', camera: { z0: 1.0, z1: 1.06, x1: -24, y1: 6 },
    lines: [{ s: '形态 2：{双顶形态（M头）}', d: 4.5 }, { s: '上涨遭遇强阻力——<多头动能衰竭>！', d: 6.0 }, { s: '跌破颈线，<大阴线>砸穿：{入场点 1}。', d: 6.4 }, { s: '技巧：回踩颈线现{看跌信号}，再做空。', d: 10.4 }],
    visual(ctx, S) {
      const c = chM, tB = S.beat(2) + .5, tE = S.beat(3) + 4.4;
      const r0 = M_BRK * smooth(S.lin(0, 0, 4.2));
      const r1 = clamp((S.t - tB) / .6);
      const r2 = 3 * smooth(clamp((S.t - S.beat(3) - 1.4) / 2.6));                        // pullback to the neck
      const r3 = clamp((S.t - tE) / .6), r4 = 2 * smooth(clamp((S.t - tE - 3.2) / 2));
      const reveal = r0 + (r0 >= M_BRK ? r1 : 0) + (r1 >= 1 ? r2 : 0) + (r2 >= 3 ? r3 : 0) + (r3 >= 1 ? r4 : 0);
      const sh1 = shake(S.t, tB + .35, 6, 6), sh2 = shake(S.t, tE + .35, 5, 6);
      ctx.save(); ctx.translate(sh1[0] + sh2[0], sh1[1] + sh2[1]);
      K.baseline(ctx, WBOX.x, WBOX.x + WBOX.w, WBOX.y + WBOX.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .7 });
      drawChart(ctx, c, reveal, { dim: i => i === M_ENG ? 1 : .78 });
      const mp = [[c.x(0), c.y(MK[0].l)], [c.x(M_H1.i), c.y(M_H1.price) - 6], [c.x(Mp.swings[1].i), c.y(Mp.swings[1].price) + 6], [c.x(M_H2.i), c.y(M_H2.price) - 6], [c.x(M_BRK - 1), c.y(M_NECK)]];
      poly(ctx, mp, smooth(S.lin(0, .1, 4.2)), { color: C.green, width: 5, alpha: .95 });
      [M_H1, M_H2].forEach((sw, j) => {
        const a = S.at(1, .3 + j * .5, .5), x = c.x(sw.i), y = c.y(sw.price) - 6;
        K.marker(ctx, x, y, { alpha: a, r: 12, pulse: ((S.t - S.beat(1)) * .9 + j * .3) % 1, color: C.goldHi });
        tagAt(ctx, x, y - 50, '涨不动了！', { alpha: a, color: C.goldHi, font: F.serif(900, 22) });
      });
      const nA = S.at(1, 2.6, 1.4), ny = c.y(M_NECK);
      K.dash(ctx, c.x(Mp.swings[1].i) - 30, ny, WBOX.x + WBOX.w + 20, ny, { p: nA, color: C.goldHi, width: 2.2, dash: [12, 9] });
      callout(ctx, '【 颈线 】', c.x(Mp.swings[1].i) + 10, ny + 52, S.at(1, 3.2, .4), S.t - S.beat(1) - 3.2, { size: 28 });
      // entry 1: the breakdown bar
      const bx = c.x(M_BRK), bc = c.y(MK[M_BRK].c);
      flash(ctx, bx, ny, (S.t > tB ? 1 : 0) * clamp(1 - (S.t - tB - .3) / 1.2), 360, C.green);
      ring(ctx, bx, ny, (S.t - tB - .3) / 1.1, C.goldHi, 220);
      const ra = S.at(2, 1.9, .7);
      tagAt(ctx, bx - 52, bc + 4, '入场点1：做空', { side: 'left', alpha: ra * (1 - S.at(3, .0, .6)), color: C.goldHi, font: F.serif(900, 24) });
      // the pullback path (dashed), then the bearish engulfing bar
      const pb = S.at(3, .3, 1.6, easeInOut);
      if (pb > 0) poly(ctx, [[bx, bc], [c.x(M_ENG - 1), c.y(MK[M_ENG - 1].h) - 4]], pb, { color: C.goldHi, width: 2, dash: [8, 8], alpha: .9, blur: 8 });
      callout(ctx, '回踩颈线', c.x(M_ENG - 2), c.y(M_NECK) - 34, S.at(3, 2.6, .5) * (1 - S.at(3, 4.6, .5)), S.t - S.beat(3) - 2.6, { size: 22, spacing: 2 });
      const ex = c.x(M_ENG), eC = c.y(MK[M_ENG].c);
      const ea = S.at(3, 5.0, .6);
      if (ea > 0) {
        const k1 = MK[M_ENG - 1], k2 = MK[M_ENG], top = c.y(Math.max(k1.h, k2.h)) - 10, bot = c.y(Math.min(k2.l, k1.l)) + 10;
        ctx.save(); ctx.globalAlpha = ea; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 1.4; ctx.setLineDash([5, 5]); ctx.shadowColor = C.goldHi; ctx.shadowBlur = 10;
        ctx.strokeRect(c.x(M_ENG - 1) - c.cw, top, c.x(M_ENG) - c.x(M_ENG - 1) + c.cw * 2, bot - top); ctx.restore();
        K.text(ctx, '看跌吞没', (c.x(M_ENG - 1) + ex) / 2, top - 16, { font: F.serif(900, 22), color: C.green, align: 'center', alpha: ea, glow: .5, glowColor: C.green });
      }
      const rb = S.at(3, 5.8, .7);
      reticle(ctx, ex, eC, rb, S.t);
      tagAt(ctx, ex - 52, eC + 4, '入场点2：稳健回踩做空', { side: 'left', alpha: rb, color: C.goldHi, font: F.serif(900, 24) });
      reticle(ctx, bx, bc, ra * (1 - .55 * S.at(3, 0, .6)), S.t);
      ctx.restore();
    } },

  /* ================= PART 2 · CONTINUATIONS ================= */
  { id: 'ch2', dur: 4.0, tr: 'sweep', visual: chapter('贰', 2, '延续形态', 'Continuation Patterns', '顺势加仓的核武器 · 上升旗形 · 下降旗形') },

  { id: 'bflag', header: HB, dur: 30.0, tr: ['iris', [700, 560]], subX: 960, subY: 275, subAlign: 'center', camera: { z0: 1.0, z1: 1.05, x1: -20, y1: 10 },
    lines: [{ s: '形态 3：{上升旗形}', d: 3.5 }, { s: '拉升之后，进入下行通道{“中场休息”}', d: 4.8 }, { s: '高阶密码：回调时{成交量必须萎缩}！', d: 4.9 }, { s: '[红色大阳线]突破通道——{顺势做多}！', d: 7.1 }, { s: '把旗杆平移到突破点：{预计涨幅目标}。', d: 8.3 }],
    visual: flagScene(BULL, chBull, { brkLine: 3, flagLabel: '旗面 · 洗盘中', volTag: '散户获利回吐，主力并未离场！', brkLabel: '顺势做多！', target: true }) },

  { id: 'dflag', header: HD, dur: 24.5, tr: ['push', 1], subX: 960, subY: 275, subAlign: 'center', camera: { z0: 1.0, z1: 1.05, x1: -20, y1: -10 },
    lines: [{ s: '形态 4：{下降旗形}', d: 3.6 }, { s: '暴跌后的反弹，只是多头的{无效挣扎}。', d: 5.4 }, { s: '反弹途中，成交量同样{萎缩}。', d: 4.6 }, { s: '<大阴线>跌破通道——空头{疯狂延续}！', d: 9.4 }],
    visual: flagScene(BEAR, chBear, { brkLine: 3, flagLabel: '弱势反弹', volTag: '反弹无量，多头无力', brkLabel: '顺势做空！', target: false }) },

  /* ================= 2:23.8 PHILOSOPHY ================= */
  { id: 'phil', dur: 26.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.09 },
    visual(ctx, S) {
      // the four patterns contract into the centre and go dark
      const k = smooth(clamp(S.t / 2.8)), xs = [420, 780, 1140, 1500];
      ['W', 'M', 'BF', 'BR'].forEach((key, j) => {
        const x = lerp(xs[j], 960, k), y = lerp(440, 500, k), s = lerp(96, 6, k);
        if (k < 1) icon(ctx, key, x, y, s, 1, 1 - k);
      });
      ctx.save(); ctx.fillStyle = `rgba(0,0,0,${(.82 * smooth(clamp((S.t - 1.6) / 1.6))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
      // a shaft of gold light opens from the centre
      const L = smooth(clamp((S.t - 2.6) / 2.4));
      if (L > 0) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(960, 520, 0, 960, 520, 900 * L); g.addColorStop(0, rgba(C.goldHi, .22 * L)); g.addColorStop(.35, rgba(C.gold, .08 * L)); g.addColorStop(1, rgba(C.gold, 0));
        ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
        const v = ctx.createLinearGradient(960 - 260 * L, 0, 960 + 260 * L, 0); v.addColorStop(0, rgba(C.goldHi, 0)); v.addColorStop(.5, rgba(C.goldHi, .07 * L)); v.addColorStop(1, rgba(C.goldHi, 0));
        ctx.fillStyle = v; ctx.fillRect(0, 0, 1920, 1080); ctx.restore();
      }
      K.text(ctx, '【 交易哲理总结 】', 960, 300, { font: F.serif(700, 26), color: C.gold, align: 'center', spacing: 10, alpha: S.p(3.6, 1.4) });
      K.rule(ctx, 960, 340, 260, S.p(4.2, 1.4));
      const lines = [['图表上的每一根线条，都不是随机的涂鸦，', 446, 6.0], ['而是无数交易者在恐惧与贪婪中所留下的脚印。', 540, 9.2], ['专业交易员从不预测未来，', 676, 13.6], ['我们只是看懂主力的意图，然后与趋势同行。', 770, 16.8]];
      for (const [str, y, t0] of lines) {
        ctx.save(); ctx.font = F.serif(900, 34); ctx.letterSpacing = '3px'; const ws = [...str].map(ch => ctx.measureText(ch).width + 3); ctx.restore();
        let x = 960 - ws.reduce((a, b) => a + b, 0) / 2;
        [...str].forEach((ch, i) => {
          const u = clamp((S.t - t0 - i * .055) / .9), a = smooth(u);
          if (a > .002) {
            ctx.save(); ctx.filter = a < 1 ? `blur(${((1 - a) * 6).toFixed(1)}px)` : 'none';
            K.goldText(ctx, ch, x, y + (1 - a) * 18, 34, { align: 'left', alpha: a, glow: .9 });
            ctx.restore();
          }
          x += ws[i];
        });
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
      K.text(ctx, 'K线形态深度课（一）', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 8, alpha: S.p(1.2, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.6, 1) });
    } },
  ],
};
})();

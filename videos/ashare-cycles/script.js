/* ============================================================
   《解构A股的顶层因果与多周期博弈》 — content for the TradingNow film engine (index.html)
   2K60 · ≤ 3 min · soundtrack = the channel's own track (tools/music.py + sfx.json)

   Clock pinned to the music: the drop at 16.7 s is the lightning title, the quiet
   section (85.3–103.2 s) carries the tools chapter, and the track's return at 103.2 s
   opens chapter 肆 (multi-timeframe resonance).
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, expo, rgba, mix, F } = K;
const easeBack = x => { x = clamp(x); const c1 = 1.6, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
const smooth = x => { x = clamp(x); return x * x * x * (x * (x * 6 - 15) + 10); };

const H0 = { label: '引言', sub: '独特的博弈修罗场', en: 'The Arena', zh: '《解构A股》' };
const R1 = { label: '铁律', num: 1, sub: 'T+1 交易制度', en: 'The Time Lock', zh: '《时空的牢笼》' };
const R2 = { label: '铁律', num: 2, sub: '涨跌幅限制', en: 'The Gravity Cliff', zh: '《时空的牢笼》' };
const R3 = { label: '铁律', num: 3, sub: '一手 · 100股', en: 'The Board Lot', zh: '《时空的牢笼》' };
const HK = { label: '时间', sub: '集合竞价与交易时段', en: 'The Trading Clock', zh: '《钟表的精密博弈》' };
const HS = { label: '工具', sub: '融券与做空', en: 'Short Selling', zh: '《工具与载体》' };
const HI = { label: '工具', sub: '三大宏观晴雨表', en: 'Index Barometers', zh: '《工具与载体》' };
const HW = { label: '周期', num: 1, sub: '周线 · 宏观审判', en: 'Weekly', zh: '《三周期共振》' };
const HDy = { label: '周期', num: 2, sub: '日线 · 结构验证', en: 'Daily', zh: '《三周期共振》' };
const HH = { label: '周期', num: 3, sub: '60分钟 · 精准扳机', en: '60-Minute', zh: '《三周期共振》' };
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



/** quote card: a master's line, attributed as a paraphrase */
function quote(ctx, str, who, x, y, a, o = {}) {
  if (a <= .002) return;
  ctx.save(); ctx.font = F.serif(700, o.size || 22); const w = ctx.measureText(str).width + 60; ctx.restore();
  const s = lerp(.94, 1, easeOut(a));
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(8,7,5,.72)'; ctx.strokeStyle = rgba(C.gold, .55); ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.roundRect(-w / 2, -44, w, 104, 12); ctx.fill(); ctx.stroke();
  ctx.fillStyle = C.goldHi; ctx.fillRect(-w / 2, -44, 4, 104);
  ctx.restore();
  K.text(ctx, str, x, y + 4, { font: F.serif(700, o.size || 22), color: C.white, align: 'center', alpha: a });
  K.text(ctx, who, x, y + 42, { font: F.serif(500, 16), color: C.gold, align: 'center', alpha: a, spacing: 2 });
}
/** padlock icon */
function lock(ctx, x, y, s, a, col = C.goldHi) {
  if (a <= .002) return;
  ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = col; ctx.fillStyle = rgba(col, .18); ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.arc(0, -18, 14, Math.PI, 0); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(-20, -18, 40, 32, 5); ctx.fill(); ctx.stroke();
  ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, -4, 4, 0, 6.2832); ctx.fill(); ctx.restore();
}
/** smooth price path through anchor points (time 0..1 → price), sampled */
function pathPts(anchors, x0, x1, yOf, n = 120, seed = 3) {
  const R = K.rng(seed), out = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n; let j = 0; while (j < anchors.length - 2 && u > anchors[j + 1][0]) j++;
    const [u0, p0] = anchors[j], [u1, p1] = anchors[j + 1], f = smooth((u - u0) / (u1 - u0 || 1));
    out.push([lerp(x0, x1, u), yOf(lerp(p0, p1, f) + (R() - .5) * .6)]);
  }
  return out;
}

/* ---------------- data ---------------- */
// weekly: a long slide, the stop, then higher lows
const WKp = K.gen.path([150, 112, 121, 104, 116, 108, 124, 115, 136], { per: [7, 2, 4, 3, 2, 3, 2, 4], seed: 121, noise: .5, wick: .5 });
const chWK = new K.Chart(WKp.candles, { x: 260, y: 370, w: 1400, h: 430 }, { lo: 98, hi: 154 });
// daily: W bottom — volume dries up at the base, expands on the breakout
const DYp = K.gen.path([130, 108, 119, 109.5, 120], { per: [7, 5, 5, 5], seed: 131, noise: .4, wick: .45 });
const DYK = [...DYp.candles, ...K.gen.seq(120, [[6.4, .5, .3], [1.6, .5, .4], [-.8, .4, .5], [2.1, .5, .3]])];
const chDY = new K.Chart(DYK, { x: 260, y: 360, w: 1400, h: 380 }, { lo: 104, hi: 132 });
const DYV = [66, 70, 62, 60, 58, 52, 50, 40, 44, 48, 52, 56, 46, 40, 34, 28, 24, 20, 26, 32, 38, 44, 100, 74, 58, 66];
const DY_BRK = DYp.candles.length;
// 60-minute: tight base, then the breakout bar — and price holds above the entry into the close
const HRp = K.gen.path([100, 101.8, 100.4, 101.6, 100.6, 101.5, 100.8], { per: [3, 2, 2, 2, 2, 2], seed: 141, noise: .3, wick: .3 });
const HRK = [...HRp.candles, ...K.gen.seq(100.8, [[2.6, .4, .2], [.7, .4, .3], [-.3, .3, .4], [.8, .3, .3], [.5, .4, .3], [.6, .3, .3]])];
const chHR = new K.Chart(HRK, { x: 300, y: 360, w: 1320, h: 380 }, { lo: 98.6, hi: 106.8 });
const HRV = [40, 36, 34, 30, 32, 28, 26, 30, 24, 22, 26, 22, 20, 100, 60, 44, 48, 40, 42];
const HR_BRK = HRp.candles.length;

window.FILM = {
  title: '解构A股的顶层因果与多周期博弈',
  transition: 1.2,
  subtitle: { x: 160, y: 880, size: 48, maxW: 1600 },
  scenes: [

  /* ================= 0:00 HOOK — the arena ================= */
  { id: 'hook', dur: 6.0, camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const t = S.t, cx = 960, cy = 470, hit = .3;
      // a wall of red/green quotes scrolling behind — the size of the arena (示意)
      const R = K.rng(17);
      for (let row = 0; row < 11; row++) {
        const y = 120 + row * 86, sp = (row % 2 ? -1 : 1) * (40 + R() * 50), off = R() * 400;
        for (let k = 0; k < 9; k++) {
          const v = (R() - .45) * 20, x = ((k * 260 + off + t * sp) % 2340 + 2340) % 2340 - 210;
          K.text(ctx, (v >= 0 ? '+' : '') + v.toFixed(2) + '%', x, y, { font: F.latin(500, 18), color: v >= 0 ? C.red : C.green, alpha: .16 + .08 * Math.sin(t * 3 + k + row) });
        }
      }
      const g = ctx.createRadialGradient(cx, cy, 80, cx, cy, 900); g.addColorStop(0, 'rgba(8,8,10,.85)'); g.addColorStop(1, 'rgba(8,8,10,.1)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080);
      const [sx, sy] = shake(t, hit, 20, 4.5);
      const p = clamp((t - .05) / .3), s = lerp(2.2, 1, easeOut(p));
      ctx.save(); ctx.translate(cx + sx, cy + sy); ctx.scale(s, s);
      ctx.filter = p < 1 ? `blur(${((1 - p) * 10).toFixed(1)}px)` : 'none';
      K.text(ctx, 'A股：独特的博弈修罗场', 0, 36, { font: F.serif(900, 60), color: C.white, align: 'center', alpha: p, glow: .55, glowColor: C.gold, spacing: 4 });
      ctx.restore();
      flash(ctx, cx, cy, (t > hit ? 1 : 0) * clamp(1 - (t - hit) / .8), 700, C.goldHi);
      K.rule(ctx, cx, 600, 380, S.p(1.3, 1.2));
      K.text(ctx, '日成交额动辄数千亿乃至上万亿元', cx, 666, { font: F.serif(700, 24), color: C.gold, align: 'center', spacing: 6, alpha: S.p(1.8, 1.2) });
    } },

  /* ================= 0:06 THE FLOOD & THE BREAKWATER ================= */
  { id: 'arena', header: H0, dur: 10.7, tr: 'zoom', camera: { z0: 1.02, z1: 1.0 }, ...BOT, pre: 1.0,
    lines: [{ s: '高波动、高散户占比、受政策{精密规约}', d: 4.4 }, { s: '资金的{洪流}，制度的{防波堤}', d: 5.0 }],
    visual(ctx, S) {
      const t = S.t, hx = 960, hy = 380;
      // capital: thousands of gold motes converge into one hub
      const R = K.rng(23), flow = S.p(.2, 1.4);
      for (let k = 0; k < 260; k++) {
        const ang = R() * 6.2832, r0 = 700 + R() * 500, sp = .18 + R() * .25, ph = (R() + t * sp) % 1;
        const r = r0 * (1 - smooth(ph)), x = hx + Math.cos(ang + ph * 1.2) * r * 1.3, y = hy + Math.sin(ang + ph * 1.2) * r * .55;
        ctx.fillStyle = rgba(C.goldHi, flow * .7 * Math.min(1, ph * 4)); ctx.beginPath(); ctx.arc(x, y, 1.2 + R() * 1.6, 0, 6.2832); ctx.fill();
      }
      const hubA = S.p(.5, 1.0, easeBack);
      ctx.save(); ctx.globalAlpha = clamp(hubA); ctx.strokeStyle = C.goldHi; ctx.lineWidth = 2; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(hx, hy, 92 + 6 * Math.sin(t * 2.4), 0, 6.2832); ctx.stroke(); ctx.restore();
      K.text(ctx, '资金洪流', hx, hy - 4, { font: F.serif(900, 26), color: C.goldHi, align: 'center', alpha: clamp(hubA), glow: .6 });
      K.text(ctx, '人民币资产配置的核心枢纽', hx, hy + 136, { font: F.serif(500, 15), color: C.gray, align: 'center', alpha: clamp(hubA) });
      // the breakwater: three exchanges rise as one wall
      const ex = [['上交所', 'SSE'], ['深交所', 'SZSE'], ['北交所', 'BSE']];
      ex.forEach(([zh, en], j) => {
        const a = S.at(1, .2 + j * .25, .8, easeOut), x = 640 + j * 320, top = lerp(740, 610, a);
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a; const gg = ctx.createLinearGradient(0, top, 0, 740); gg.addColorStop(0, rgba(C.goldHi, .55)); gg.addColorStop(1, rgba(C.gold, .08));
        ctx.fillStyle = gg; ctx.fillRect(x - 120, top, 240, 740 - top); ctx.strokeStyle = rgba(C.goldHi, .8); ctx.strokeRect(x - 120, top, 240, 740 - top); ctx.restore();
        K.text(ctx, zh, x, top + 50, { font: F.serif(900, 24), color: C.white, align: 'center', alpha: a });
        K.text(ctx, en, x, top + 84, { font: F.latin(500, 15), color: C.gray, align: 'center', spacing: 4, alpha: a });
      });
      tagAt(ctx, 960, 574, '统一撮合 · 风控防火墙', { alpha: S.at(1, 1.4, .6), color: C.goldHi, font: F.serif(900, 20) });
    } },

  /* ================= 0:16.7 LIGHTNING TITLE (music drop) ================= */
  { id: 'title', header: H0, dur: 10.3, tr: 'dissolve', camera: { z0: 1.0, z1: 1.05 }, ...BOT, pre: 4.4,
    lines: [{ s: '盲目套用海外的自由交易策略，', d: 2.8 }, { s: '无异于{盲人骑瞎马}——先读懂{本土因果律}', d: 2.9 }],
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
      K.goldText(ctx, '解构A股的顶层因果与多周期博弈', 960, 485 + (1 - tp) * 120, 50, { spacing: 6, alpha: tp });
      ctx.restore();
      const sw = clamp((t - 1.6) / 1.3);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const xx = lerp(300, 1620, sw), g = ctx.createLinearGradient(xx - 90, 0, xx + 90, 0);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,240,200,.28)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(xx - 90, 380, 180, 140); ctx.restore();
      }
      K.rule(ctx, 960, 560, 420, S.p(1.2, 1.4));
      K.text(ctx, '“游戏规则变了，游戏也就变了。”', 960, 640, { font: F.serif(900, 28), color: C.white, align: 'center', alpha: S.p(1.8, 1), glow: .4 });
      K.text(ctx, '—— 利弗莫尔（大意）', 960, 690, { font: F.serif(500, 18), color: C.gold, align: 'center', spacing: 3, alpha: S.p(2.3, 1) });
    } },

  /* ================= 壹 · THREE IRON RULES ================= */
  { id: 'ch1', dur: 3.6, tr: 'sweep', visual: chapter('壹', 1, '三大硬铁律', 'Three Iron Rules', '时空的牢笼 · T+1 · 涨跌幅 · 一手') },

  { id: 'tplus', header: R1, dur: 12.4, tr: ['iris', [960, 560]], camera: { z0: 1.0, z1: 1.05, x1: -16 }, ...TOP, pre: .6,
    lines: [{ s: '铁律一：{T+1}——当日买入，当日不能卖', d: 4.2 }, { s: '冲动追高后，{没有任何反悔机会}', d: 3.8 }, { s: '在A股，{克制冲动}比任何指标都重要', d: 3.6 }],
    visual(ctx, S) {
      const x0 = 220, xm = 1020, x1 = 1700, yOf = p => 620 - (p - 100) * 26;
      // two trading days side by side
      const dA = S.p(0, 1);
      [[x0, xm - 40, '交易日 T'], [xm + 40, x1, '交易日 T+1']].forEach(([a, b, lab], j) => {
        ctx.save(); ctx.globalAlpha = dA; ctx.fillStyle = 'rgba(255,255,255,.02)'; ctx.strokeStyle = rgba(C.gold, .35); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.roundRect(a, 360, b - a, 440, 12); ctx.fill(); ctx.stroke(); ctx.restore();
        K.text(ctx, lab, (a + b) / 2, 396, { font: F.serif(900, 22), color: C.white, align: 'center', alpha: dA });
        K.text(ctx, '09:30', a + 16, 786, { font: F.latin(500, 14), color: C.gray, alpha: dA }); K.text(ctx, '15:00', b - 16, 786, { font: F.latin(500, 14), color: C.gray, align: 'right', alpha: dA });
      });
      // day T: a morning spike (the impulsive buy), then a tail sell-off into the close; T+1 gaps down
      const dayT = pathPts([[0, 100], [.18, 104.6], [.32, 103.2], [.62, 102.2], [.85, 101.2], [1, 98.6]], x0 + 20, xm - 60, yOf, 90, 5);
      const dayN = pathPts([[0, 97.4], [.3, 96.8], [.7, 97.6], [1, 97.2]], xm + 60, x1 - 20, yOf, 70, 6);
      const pr = smooth(S.lin(0, .3, 6.6));
      poly(ctx, dayT, clamp(pr * 1.5), { color: C.goldHi, width: 3, blur: 12 });
      if (pr > .66) poly(ctx, dayN, (pr - .66) / .34, { color: C.goldHi, width: 3, blur: 12 });
      const bx = dayT[16][0], by = dayT[16][1];
      const ba = S.at(0, 1.4, .5, easeBack);
      reticle(ctx, bx, by, clamp(ba), S.t, C.red);
      tagAt(ctx, bx, by - 64, '冲动追高 · 买入', { alpha: clamp(ba), color: C.red, font: F.serif(900, 20) });
      // the lock: from the buy until the next session
      const la = S.at(0, 2.4, 1.2);
      if (la > 0) {
        K.dash(ctx, bx, 742, lerp(bx, xm + 60, smooth(la)), 742, { color: C.goldHi, width: 2, dash: [8, 6] });
        K.dash(ctx, bx, by + 30, bx, 742, { p: la, color: C.goldHi, width: 1.4, dash: [4, 5] });
        lock(ctx, bx + 60, 742, 1.0, la);
        K.text(ctx, 'T+1 锁定：当日不可卖出', bx + 96, 750, { font: F.serif(900, 20), color: C.goldHi, alpha: la });
      }
      tagAt(ctx, dayT[86][0] - 30, dayT[86][1] - 50, '尾盘杀跌', { side: 'left', alpha: S.at(1, .2, .6) * (1 - S.at(2, 0, .5)), color: C.green, font: F.serif(900, 20) });
      tagAt(ctx, xm + 70, dayN[2][1] + 56, '隔夜风险 · 低开', { side: 'right', alpha: S.at(1, .8, .6), color: C.green, font: F.serif(900, 20) });
      quote(ctx, '“错误时刻丧失行动自由，就沦为情绪的囚徒。”', '—— 道格拉斯（大意）', 960, 870, S.at(1, 2.0, .8), { size: 20 });
    } },

  { id: 'limit', header: R2, dur: 11.0, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05 }, ...TOP, pre: .5,
    lines: [{ s: '铁律二：主板{±10%}，双创{±20%}', d: 4.0 }, { s: '一旦触板封死，{流动性瞬间锁死}', d: 3.4 }, { s: '封板博弈：对{贪婪与恐惧}的极端试炼', d: 3.0 }],
    visual(ctx, S) {
      // left: the ruler of limits
      const rx = 360, y0 = 620, k = 12, ra = S.p(.1, .9);
      K.line(ctx, rx, y0 - 20 * k, rx, y0 + 20 * k, { color: C.gray, width: 1.4, alpha: ra });
      [[10, '主板', C.goldHi], [20, '创业板 / 科创板', C.gold]].forEach(([v, lab, col], j) => {
        const a = S.at(0, .4 + j * .7, .7);
        [[-1, C.green], [1, C.red]].forEach(([sg, cc]) => {
          const y = y0 - sg * v * k;
          K.line(ctx, rx - 40, y, rx + 40, y, { color: cc, width: 3, glow: .8, alpha: a });
          K.text(ctx, (sg > 0 ? '+' : '−') + v + '%', rx - 56, y + 8, { font: F.latin(500, 22), color: cc, align: 'right', alpha: a });
        });
        K.text(ctx, lab, rx + 60, y0 - v * k + 8 + (j ? 0 : 0), { font: F.serif(900, 20), color: col, alpha: a });
      });
      // right: price slams into the +10% ceiling and the order queue piles up
      const cx0 = 760, cx1 = 1600, yOf = p => 720 - p * 26, ceil = yOf(10);
      const pa = S.p(.4, .8);
      K.line(ctx, cx0, ceil, cx1, ceil, { color: C.red, width: 2.6, glow: .9, alpha: pa });
      K.text(ctx, '涨停 +10%', cx0, ceil - 14, { font: F.serif(900, 22), color: C.red, alpha: pa });
      const pts = pathPts([[0, 0], [.25, 3.2], [.45, 2.4], [.7, 7.8], [.82, 10], [1, 10]], cx0, cx1, yOf, 100, 9);
      poly(ctx, pts, smooth(S.lin(0, .8, 3.2)), { color: C.goldHi, width: 3.4, blur: 14 });
      const q = S.at(1, 0, 2.4), hit = S.beat(1);
      flash(ctx, cx0 + (cx1 - cx0) * .82, ceil, (S.t > hit ? 1 : 0) * clamp(1 - (S.t - hit) / 1.1), 320, C.red);
      for (let i = 0; i < 26; i++) {                                       // the queue of buy orders sealing the board
        const a = clamp(q * 26 - i), x = cx0 + (cx1 - cx0) * .84 + (i % 13) * 20, y = ceil - 14 - Math.floor(i / 13) * 18;
        if (a <= 0) continue;
        ctx.save(); ctx.globalAlpha = a * .85; ctx.fillStyle = C.red; ctx.shadowColor = C.red; ctx.shadowBlur = 8; ctx.fillRect(x, y - lerp(30, 0, easeOut(a)), 16, 12); ctx.restore();
      }
      tagAt(ctx, cx0 + (cx1 - cx0) * .9, ceil - 74, '海量挂单 · 封死', { alpha: S.at(1, .8, .6), color: C.red, font: F.serif(900, 20) });
      // liquidity "oxygen" gauge drains
      const ox = 1180, oy = 790, lv = 1 - S.at(1, .4, 2.0, easeInOut);
      ctx.save(); ctx.globalAlpha = S.p(.6, .8); ctx.strokeStyle = rgba(C.gold, .6); ctx.strokeRect(ox - 240, oy - 16, 480, 32);
      ctx.fillStyle = mix(C.red, C.goldHi, lv); ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 14; ctx.fillRect(ox - 238, oy - 14, 476 * lv, 28); ctx.restore();
      K.text(ctx, '流动性', ox - 260, oy + 8, { font: F.serif(900, 20), color: C.white, align: 'right', alpha: S.p(.6, .8) });
      quote(ctx, '“流动性就像氧气，消失时你才会注意到它。”', '—— 巴菲特（大意）', 960, 900, S.at(2, .1, .8), { size: 20 });
    } },

  { id: 'lot', header: R3, dur: 6.0, tr: ['push', 1], camera: { z0: 1.0, z1: 1.04 }, ...TOP, pre: .6,
    lines: [{ s: '铁律三：买入以{一手（100股）}为单位', d: 5.0 }],
    visual(ctx, S) {
      const gx = 960 - 9 * 26 / 2 - 13, gy = 400;
      for (let i = 0; i < 100; i++) {                                       // 100 shares assemble into one lot
        const a = clamp(S.p(.3, 1.6) * 100 / 1 - i * .9) / 1, r = i / 10 | 0, c = i % 10;
        const u = smooth(clamp((S.t - .3 - i * .012) / .6)), R = K.rng(i + 5), fx = 960 + (R() - .5) * 1600, fy = 540 + (R() - .5) * 900;
        const x = lerp(fx, gx + c * 26, u), y = lerp(fy, gy + r * 26, u);
        ctx.fillStyle = rgba(C.goldHi, .25 + .65 * u); ctx.fillRect(x, y, 20, 20);
      }
      const ba = S.p(2.0, .8, easeBack);
      ctx.save(); ctx.globalAlpha = clamp(ba); ctx.strokeStyle = C.goldHi; ctx.lineWidth = 2.4; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 24;
      ctx.strokeRect(gx - 14, gy - 14, 26 * 10 + 22, 26 * 10 + 22); ctx.restore();
      K.text(ctx, '1 手 = 100 股', 960, gy + 330, { font: F.serif(900, 30), color: C.goldHi, align: 'center', alpha: clamp(ba), glow: .7 });
      K.text(ctx, '资金必须契合这个“最小粒子”，才能在规则之内获得调配权', 960, gy + 378, { font: F.serif(500, 18), color: C.white, align: 'center', alpha: S.p(2.6, .8) });
      K.text(ctx, '注：科创板单笔买入不少于 200 股', 960, gy + 414, { font: F.serif(500, 15), color: C.gray, align: 'center', alpha: S.p(3.0, .8) });
    } },

  /* ================= 贰 · THE TRADING CLOCK ================= */
  { id: 'ch2', dur: 3.6, tr: 'sweep', visual: chapter('贰', 2, '时间编年史', 'The Trading Clock', '钟表的精密博弈 · 每个时间切片出清特定的群体心理') },

  { id: 'clock', header: HK, dur: 21.7, tr: ['iris', [520, 580]], camera: { z0: 1.0, z1: 1.04 }, ...TOP, pre: .6,
    lines: [{ s: '{09:15–09:20} 预期的虚妄：允许撤单', d: 5.2 }, { s: '{09:20–09:25} 真实的审判：不准撤单', d: 5.2 }, { s: '{09:30–10:00} 盛夏的冲锋：情绪最炽热', d: 5.2 }, { s: '{14:57–15:00} 秋后的清算：一锤定音', d: 5.0 }],
    visual(ctx, S) {
      const cx = 480, cy = 600, R0 = 210, li = Math.max(0, S.line());
      // the dial: hand sweeps to each slice
      const da = S.p(.1, .9);
      ctx.save(); ctx.globalAlpha = da; ctx.strokeStyle = rgba(C.goldHi, .8); ctx.lineWidth = 2.4; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 18;
      ctx.beginPath(); ctx.arc(cx, cy, R0, 0, 6.2832); ctx.stroke(); ctx.shadowBlur = 0;
      for (let k = 0; k < 60; k++) { const a = k / 60 * 6.2832, r1 = k % 5 ? R0 - 10 : R0 - 22; ctx.lineWidth = k % 5 ? 1 : 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); ctx.lineTo(cx + Math.cos(a) * (R0 - 4), cy + Math.sin(a) * (R0 - 4)); ctx.stroke(); }
      ctx.restore();
      const mins = [[555, 560], [560, 565], [570, 600], [897, 900]];            // minutes after midnight
      const toAng = m => ((m % 60) / 60) * 6.2832 - Math.PI / 2, toAngH = m => ((m / 60) % 12) / 12 * 6.2832 - Math.PI / 2;
      let m = 555; for (let j = 0; j <= li; j++) { const [a, b] = mins[j], u = j < li ? 1 : smooth(S.lin(j, 0, 1.6)); m = j ? lerp(mins[j - 1][1], b, u) : lerp(a, b, u); }
      const slice = mins[li], sa = toAng(slice[0]), sb = toAng(slice[1]) + (slice[1] - slice[0] >= 30 ? 0 : 0);
      ctx.save(); ctx.globalAlpha = .28; ctx.fillStyle = [C.gray, C.goldHi, C.red, C.gold][li]; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R0 - 26, sa, sb + (sb < sa ? 6.2832 : 0)); ctx.closePath(); ctx.fill(); ctx.restore();
      K.line(ctx, cx, cy, cx + Math.cos(toAngH(m)) * 110, cy + Math.sin(toAngH(m)) * 110, { color: C.white, width: 5, alpha: da });
      K.line(ctx, cx, cy, cx + Math.cos(toAng(m)) * 170, cy + Math.sin(toAng(m)) * 170, { color: C.goldHi, width: 3, glow: .8, alpha: da });
      ctx.fillStyle = C.goldHi; ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 6.2832); ctx.fill();
      const hh = Math.floor(m / 60), mm = Math.floor(m % 60);
      K.text(ctx, `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, cx, cy + R0 + 56, { font: F.latin(500, 30), color: C.goldHi, align: 'center', alpha: da, spacing: 4 });
      // the four slices as cards on the right, each with its own little scene
      const cards = [['预期的虚妄', '允许撤单 · 虚假申报试探情绪'], ['真实的审判', '不准撤单 · 筹码硬碰硬，锁定开盘价'], ['盛夏的冲锋', '前 30 分钟 · 资金与情绪最炽热'], ['秋后的清算', '收盘集合竞价 · 欲望被封存']];
      cards.forEach(([t1, t2], j) => {
        const y = 380 + j * 120, on = S.at(j, 0, .6) * (j < li ? .45 : 1), a = S.at(j, 0, .6);
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = j === li ? rgba(C.gold, .1) : 'rgba(255,255,255,.02)'; ctx.strokeStyle = rgba(C.goldHi, j === li ? .9 : .3); ctx.lineWidth = 1.4;
        if (j === li) { ctx.shadowColor = C.goldHi; ctx.shadowBlur = 20; }
        ctx.beginPath(); ctx.roundRect(840, y - 46, 860, 100, 12); ctx.fill(); ctx.stroke(); ctx.restore();
        K.text(ctx, t1, 880, y + 2, { font: F.serif(900, 26), color: j === li ? C.goldHi : C.white, alpha: on });
        K.text(ctx, t2, 880, y + 36, { font: F.serif(500, 16), color: C.gray, alpha: on });
        // mini scene per slice
        const sx = 1500, tt = S.t - S.beat(j);
        if (j === 0) for (let k = 0; k < 5; k++) { const vis = .5 + .5 * Math.sin(tt * 3 + k * 1.7); ctx.save(); ctx.globalAlpha = on * vis; ctx.setLineDash([4, 4]); ctx.strokeStyle = k % 2 ? C.red : C.green; ctx.strokeRect(sx + k * 30, y - 20 + (k % 2) * 8, 22, 26); ctx.restore(); }
        if (j === 1) { const c2 = smooth(clamp(tt / 1.6)); ctx.save(); ctx.globalAlpha = on; ctx.fillStyle = C.red; ctx.fillRect(sx + lerp(-10, 60, c2), y - 16, 40, 26); ctx.fillStyle = C.green; ctx.fillRect(sx + lerp(150, 100, c2), y - 16, 40, 26); ctx.restore(); if (c2 >= 1) flash(ctx, sx + 100, y - 3, on * .6, 60, C.goldHi); }
        if (j === 2) for (let k = 0; k < 7; k++) { const hgt = (20 + 30 * Math.abs(Math.sin(tt * 4 + k))) * on; ctx.save(); ctx.globalAlpha = on; ctx.fillStyle = mix(C.red, C.goldHi, k / 7); ctx.fillRect(sx + k * 24, y + 20 - hgt, 16, hgt); ctx.restore(); }
        if (j === 3) { const st = clamp(tt / .5); ctx.save(); ctx.globalAlpha = on; ctx.translate(sx + 80, y); ctx.scale(lerp(1.6, 1, easeOut(st)), lerp(1.6, 1, easeOut(st))); ctx.strokeStyle = C.red; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 30, 0, 6.2832); ctx.stroke(); ctx.restore();
          K.text(ctx, '收', sx + 80, y + 9, { font: F.serif(900, 22), color: C.red, align: 'center', alpha: on * st }); }
      });
    } },

  /* ================= 叁 · TOOLS & BAROMETERS (quiet section) ================= */
  { id: 'ch3', dur: 3.6, tr: 'sweep', visual: chapter('叁', 3, '工具与载体', 'Tools & Barometers', '融券做空 · 三大宏观晴雨表') },

  { id: 'short', header: HS, dur: 6.4, tr: ['iris', [960, 580]], camera: { z0: 1.0, z1: 1.04 }, ...TOP, pre: .5,
    lines: [{ s: '融券做空{门槛极高}，券源受严格监管', d: 3.0 }, { s: '学会借力{指数与行业ETF}，避开暴雷', d: 2.8 }],
    visual(ctx, S) {
      const a = S.p(.1, .8);
      // two doors: wide long, narrow short
      const door = (x, w, lab, col, open) => {
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.shadowColor = col; ctx.shadowBlur = 18; ctx.strokeRect(x - w / 2, 400, w, 300);
        ctx.fillStyle = rgba(col, .08 + .1 * open); ctx.fillRect(x - w / 2, 400, w, 300); ctx.restore();
        K.text(ctx, lab, x, 744, { font: F.serif(900, 26), color: col, align: 'center', alpha: a });
      };
      door(560, 300, '做多', C.red, 1);
      door(960, 90, '做空', C.green, 0);
      lock(ctx, 960, 560, 1.4, S.at(0, .6, .5, easeBack), C.green);
      tagAt(ctx, 960, 790, '门槛极高 · 券源受限', { alpha: S.at(0, 1.0, .5), color: C.green, font: F.serif(900, 20) });
      const ea = S.at(1, .1, .8);
      K.arrow(ctx, 1060, 550, 1260, 550, { p: ea, color: C.goldHi, width: 3, head: 18 });
      ctx.save(); ctx.globalAlpha = ea; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 3; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 20;
      ctx.beginPath(); ctx.moveTo(1400, 430); ctx.lineTo(1500, 470); ctx.lineTo(1500, 580); ctx.quadraticCurveTo(1500, 660, 1400, 700); ctx.quadraticCurveTo(1300, 660, 1300, 580); ctx.lineTo(1300, 470); ctx.closePath(); ctx.stroke(); ctx.restore();
      K.text(ctx, '指数/ETF', 1400, 575, { font: F.serif(900, 18), color: C.goldHi, align: 'center', alpha: ea });
      K.text(ctx, '“做空比做多更难”—— 巴菲特（大意）', 1400, 750, { font: F.serif(500, 16), color: C.gray, align: 'center', alpha: S.at(1, .8, .6) });
    } },

  { id: 'index', header: HI, dur: 7.9, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 }, ...TOP, pre: .5,
    lines: [{ s: '三大晴雨表：{上证 · 沪深300 · 双创}', d: 7.2 }],
    visual(ctx, S) {
      const cards = [['上证指数', '国央企与大蓝筹', '国家大逻辑的重力沉淀', [[0, 50], [.3, 46], [.6, 52], [1, 55]], C.goldHi],
        ['沪深300', '核心资产的代言人', '中国经济顶层免疫力的缩影', [[0, 48], [.4, 54], [.7, 51], [1, 58]], C.gold],
        ['创业板指 / 科创50', '科技 · 新能源', '时代狂热与泡沫的放大器', [[0, 46], [.25, 60], [.5, 44], [.75, 62], [1, 50]], C.red]];
      cards.forEach(([t1, t2, t3, an, col], j) => {
        const a = S.p(.3 + j * .35, .8, easeOut), x = 400 + j * 560, y = 560 + (1 - a) * 50;
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(255,255,255,.025)'; ctx.strokeStyle = rgba(col, .7); ctx.lineWidth = 1.4; ctx.shadowColor = col; ctx.shadowBlur = 16;
        ctx.beginPath(); ctx.roundRect(x - 250, y - 190, 500, 380, 16); ctx.fill(); ctx.stroke(); ctx.restore();
        K.text(ctx, t1, x, y - 136, { font: F.serif(900, 28), color: C.white, align: 'center', alpha: a });
        const pts = pathPts(an, x - 200, x + 200, v => y + 40 - (v - 50) * 7, 80, 30 + j);
        poly(ctx, pts, S.p(.8 + j * .35, 1.6, easeInOut), { color: col, width: 3, blur: 12 });
        K.text(ctx, '示意', x + 220, y - 90, { font: F.serif(500, 13), color: C.gray, align: 'right', alpha: a * .8 });
        K.text(ctx, t2, x, y + 120, { font: F.serif(900, 20), color: col, align: 'center', alpha: a });
        K.text(ctx, t3, x, y + 156, { font: F.serif(500, 17), color: C.gray, align: 'center', alpha: a });
      });
    } },

  /* ================= 肆 · MULTI-TIMEFRAME RESONANCE (music returns) ================= */
  { id: 'ch4', dur: 3.6, tr: 'sweep', visual: chapter('肆', 4, '三周期共振', 'Multi-Timeframe Resonance', '周线 · 日线 · 60分钟 · 时空降维打击') },

  { id: 'weekly', header: HW, dur: 12.0, tr: ['iris', [960, 580]], camera: { z0: 1.0, z1: 1.1, x1: -150, y1: 30 }, ...TOP, pre: .6,
    lines: [{ s: '周线：{宏观审判}，锁定不可违背的引力', d: 5.4 }, { s: '阴跌后止跌，{底比底高}——确立多头偏见', d: 5.8 }],
    visual(ctx, S) {
      const c = chWK, rv = WKp.candles.length * smooth(S.lin(0, 0, 6.5));
      K.text(ctx, 'WEEKLY', c.box.x, c.box.y - 14, { font: F.latin(500, 18), color: C.gray, spacing: 6, alpha: S.p(.1, .8) });
      K.baseline(ctx, c.box.x, c.box.x + c.box.w, c.box.y + c.box.h + 12, { p: S.at(0, 0, 1.4), step: 60, alpha: .5 });
      const lows = WKp.swings.filter(s => s.type === 'L').slice(1);
      const za = S.at(1, .2, 1.0);
      if (za > 0) { const x0 = c.x(lows[0].i) - 30, x1 = c.x(WKp.candles.length - 1) + 30;
        ctx.save(); ctx.globalAlpha = .12 * za; ctx.fillStyle = C.red; ctx.fillRect(x0, c.y(126), x1 - x0, c.y(100) - c.y(126)); ctx.restore();
        K.text(ctx, '机构建仓区', x1, c.y(100) + 30, { font: F.serif(900, 20), color: C.red, align: 'right', alpha: za }); }
      drawChart(ctx, c, rv, { dim: () => .85 });
      poly(ctx, lows.map(s => [c.x(s.i), c.y(s.price) + 10]), S.at(1, .8, 1.4), { color: C.red, width: 3.4, blur: 14 });
      lows.forEach((s, j) => K.marker(ctx, c.x(s.i), c.y(s.price) + 10, { alpha: S.at(1, 1.0 + j * .4, .5), r: 9, color: C.red }));
      tagAt(ctx, c.x(lows[lows.length - 1].i) + 40, c.y(lows[lows.length - 1].price) + 54, '底比底高 · 多头偏见', { side: 'right', alpha: S.at(1, 2.2, .6), color: C.red, font: F.serif(900, 20) });
    } },

  { id: 'daily', header: HDy, dur: 12.0, tr: 'zoom', camera: { z0: 1.0, z1: 1.08, x1: -120, y1: 20 }, ...TOP, pre: .6,
    lines: [{ s: '日线：{结构验证}，看清主力洗盘踪迹', d: 5.4 }, { s: '打底{缩量}，突破{放量}——结构健康', d: 5.8 }],
    visual(ctx, S) {
      const c = chDY, tB = S.beat(1) + 1.6;
      const r0 = DY_BRK * smooth(S.lin(0, 0, 6)), r1 = clamp((S.t - tB) / .6), r2 = 3 * smooth(clamp((S.t - tB - 1) / 2));
      const rv = r0 + (r0 >= DY_BRK ? r1 : 0) + (r1 >= 1 ? r2 : 0);
      K.text(ctx, 'DAILY', c.box.x, c.box.y - 14, { font: F.latin(500, 18), color: C.gray, spacing: 6, alpha: S.p(.1, .8) });
      volume(ctx, c, DYV, rv, 790, 100, { hot: DY_BRK, base: S.at(0, .2, 1) });
      const W = [[c.x(0), c.y(DYK[0].o)], ...DYp.swings.map(s => [c.x(s.i), c.y(s.price) + (s.type === 'H' ? -6 : 6)])];
      drawChart(ctx, c, rv, { dim: () => .85 });
      poly(ctx, W, smooth(S.lin(0, .2, 6)), { color: C.red, width: 4, alpha: .9 });
      const neck = DYp.swings[1].price;
      K.dash(ctx, c.x(DYp.swings[1].i) - 20, c.y(neck), c.box.x + c.box.w, c.y(neck), { p: S.at(0, 3.0, 1.2), color: C.goldHi, width: 2 });
      quote(ctx, '“价格总是沿着阻力最小的方向移动。”', '—— 利弗莫尔', 960, 950, S.at(0, 3.4, .8) * (1 - S.at(1, 1.2, .6)), { size: 20 });
      tagAt(ctx, c.x(16), 770, '打底缩量', { alpha: S.at(1, .3, .6), color: C.gray, font: F.serif(900, 18) });
      tagAt(ctx, c.x(DY_BRK), 770, '突破放量', { alpha: S.at(1, 1.8, .6), color: C.red, font: F.serif(900, 18) });
      flash(ctx, c.x(DY_BRK), c.y(neck), (S.t > tB ? 1 : 0) * clamp(1 - (S.t - tB) / 1.2), 340, C.red);
      ring(ctx, c.x(DY_BRK), c.y(neck), (S.t - tB) / 1.1, C.goldHi, 220);
    } },

  { id: 'hourly', header: HH, dur: 13.0, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -20 }, ...TOP, pre: .5,
    lines: [{ s: '60分钟：放量突破的{一瞬间}扣动扳机', d: 4.6 }, { s: '大周期巨浪护航，{当天大概率保持红盘}', d: 4.2 }, { s: '脱离成本区，{规避隔夜被套}', d: 3.6 }],
    visual(ctx, S) {
      const c = chHR, tB = S.beat(0) + 2.6;
      const r0 = HR_BRK * smooth(S.lin(0, 0, 2.6)), r1 = clamp((S.t - tB) / .5), r2 = (HRK.length - HR_BRK - 1) * smooth(clamp((S.t - tB - .8) / 5));
      const rv = r0 + (r0 >= HR_BRK ? r1 : 0) + (r1 >= 1 ? r2 : 0);
      // the two higher timeframes as slow tides underneath (the moat)
      const wa = S.at(1, 0, 1.2);
      [[C.red, 860, 40, .5, '周线浪'], [C.gold, 830, 26, .9, '日线浪']].forEach(([col, y, amp, f, lab], j) => {
        const pts = []; for (let x = 200; x <= 1720; x += 10) pts.push([x, y - amp * Math.sin(x / 240 * f + S.t * .8 + j) - (x - 200) * .05]);
        poly(ctx, pts, 1, { color: col, width: 2.6, alpha: wa * .8, blur: 14, head: false });
        K.text(ctx, lab, 200 + j * 150, pts[0][1] + 34, { font: F.serif(900, 16), color: col, alpha: wa });
      });
      K.text(ctx, '60 MIN', c.box.x, c.box.y - 14, { font: F.latin(500, 18), color: C.gray, spacing: 6, alpha: S.p(.1, .8) });
      drawChart(ctx, c, rv, { dim: () => .88 });
      const bx = c.x(HR_BRK), bc = c.y(HRK[HR_BRK].c), entry = HRK[HR_BRK].c - .9;
      flash(ctx, bx, c.y(101.9), (S.t > tB ? 1 : 0) * clamp(1 - (S.t - tB) / 1.2), 340, C.red);
      ring(ctx, bx, c.y(101.9), (S.t - tB) / 1.1, C.goldHi, 220);
      const ra = S.at(0, 3.2, .7);
      reticle(ctx, bx, bc, ra, S.t, C.red);
      tagAt(ctx, bx - 52, bc - 4, '放量突破 · 买点', { side: 'left', alpha: ra, color: C.goldHi, font: F.serif(900, 22) });
      // the cost line, and the day closing safely above it
      const ca = S.at(2, 0, 1);
      if (ca > 0) { const y = c.y(entry);
        ctx.save(); ctx.globalAlpha = .12 * ca; ctx.fillStyle = C.green; ctx.fillRect(bx, y, c.box.x + c.box.w - bx, 40); ctx.restore();
        K.dash(ctx, bx, y, c.box.x + c.box.w, y, { p: ca, color: C.goldHi, width: 2 });
        K.text(ctx, '成本线', c.box.x + c.box.w, y + 30, { font: F.serif(900, 18), color: C.goldHi, align: 'right', alpha: ca });
        tagAt(ctx, c.x(HRK.length - 2), c.y(HRK[HRK.length - 2].h) - 44, '脱离成本危险区', { alpha: S.at(2, .8, .6), color: C.red, font: F.serif(900, 20) }); }
    } },

  /* ================= 2:23.8 FINALE — bilingual ================= */
  { id: 'phil', dur: 26.5, tr: 'dissolve', camera: { z0: 1.0, z1: 1.07 },
    visual(ctx, S) {
      const t = S.t;
      ctx.save(); ctx.fillStyle = `rgba(3,3,4,${(.8 * smooth(clamp(t / 2.4))).toFixed(3)})`; ctx.fillRect(-200, -200, 2320, 1480); ctx.restore();
      // the cage of T+1 (behind line one) and the resonance rings (behind line two)
      const cg = smooth(clamp((t - 1.5) / 2)) * (1 - .7 * smooth(clamp((t - 8) / 3)));
      for (let k = 0; k < 9; k++) K.line(ctx, 640 + k * 80, 300, 640 + k * 80, 460, { color: C.gray, width: 2, alpha: cg * .3 });
      const rg = smooth(clamp((t - 6) / 2));
      for (let k = 0; k < 3; k++) { const u = ((t * .25 + k / 3) % 1); ctx.save(); ctx.globalAlpha = rg * (1 - u) * .35; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(960, 520, 200 + u * 700, 50 + u * 160, 0, 0, 6.2832); ctx.stroke(); ctx.restore(); }
      const lines = [['平庸的交易者，在 T+1 的时空牢笼里随波逐流；', 410, 3.0], ['顶尖的捕猎者，在多周期的共振矩阵中借力而行。', 520, 7.0]];
      for (const [str, y, t0] of lines) {
        const u = smooth(clamp((t - t0) / 2.0)); if (u <= .002) continue;
        ctx.save(); ctx.filter = u < 1 ? `blur(${((1 - u) * 8).toFixed(1)}px)` : 'none';
        K.text(ctx, str, 960, y, { font: F.serif(700, 34), color: '#F4EFE6', align: 'center', alpha: u, spacing: 3, glow: .25, glowColor: '#FFFFFF' });
        ctx.restore();
      }
      const en = ['The mediocre trader drifts aimlessly', 'inside the space-time cage of T+1;', 'the elite hunter moves effortlessly, harnessing power', 'from the resonance of multi-timeframe matrices.'];
      en.forEach((str, j) => {
        const u = smooth(clamp((t - 11.5 - j * .9) / 1.8));
        K.text(ctx, str, 960, 650 + j * 46, { font: `italic ${F.latin(500, 22)}`, color: C.gray, align: 'center', alpha: u, spacing: .5 });
      });
      K.rule(ctx, 960, 600, 360, S.p(10.5, 1.4));
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
      K.text(ctx, '解构A股的顶层因果与多周期博弈', 960, 625, { font: F.serif(700, 26), color: C.white, align: 'center', spacing: 6, alpha: S.p(1.2, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.6, 1) });
    } },
  ],
};
})();

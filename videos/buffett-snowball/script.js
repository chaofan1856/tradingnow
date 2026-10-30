/* ============================================================
   《股神巴菲特》 — content for the TradingNow film engine (index.html)

   A scene:
     { id, header?, lines?: [subtitle markup], visual?(ctx, S, K), tr?: transition into this scene,
       camera?: {z0,z1,x0,x1,y0,y1}, dur?: fixed seconds, noWatermark? }
   Subtitle markup:  {金色重点}  [红色/多头]  <绿色/空头>
   S (scene clock):  S.t, S.at(line, delay, dur) → eased 0..1, S.lin(...), S.p(sec, dur), S.beat(line)
   Transitions:      'zoom' | ['push', ±1] | 'sweep' | ['iris', [x,y]] | 'dissolve'

   One continuous story (no modules), paced to end with the supplied track (≈ 58 s).
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, rgba, mix, F } = K;

/* the portrait (assets/portrait.jpg, supplied with the brief) — added to the page so ASSETS_READY waits for it */
const PHOTO = new Image(); PHOTO.src = 'assets/portrait.jpg'; PHOTO.hidden = true; document.body.appendChild(PHOTO);

/* one constant header for the whole story: no modules, only the book-title corner (label ' ' hides the module tag) */
const HD = { label: ' ', en: 'Warren Buffett', zh: '《时间的玫瑰》' };

/* ---------- shared visual pieces ---------- */
const easeBack = x => { x = clamp(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

/** the photo, toned to the film (warm monochrome), cropped from source rect s into dest rect d */
function photo(ctx, d, s, o = {}) {
  if (!PHOTO.naturalWidth || (o.alpha ?? 1) <= .002) return;
  ctx.save(); ctx.globalAlpha *= o.alpha ?? 1;
  ctx.beginPath(); ctx.rect(d.x, d.y, d.w, d.h); ctx.clip();
  ctx.filter = `grayscale(1) sepia(${o.sepia ?? .38}) brightness(${o.b ?? .92}) contrast(1.12)`;
  ctx.drawImage(PHOTO, s.x, s.y, s.w, s.h, d.x, d.y, d.w, d.h);
  ctx.filter = 'none';
  const v = ctx.createRadialGradient(d.x + d.w / 2, d.y + d.h * .42, Math.min(d.w, d.h) * .25, d.x + d.w / 2, d.y + d.h / 2, Math.max(d.w, d.h) * .72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(0,0,0,${o.vig ?? .7})`);
  ctx.fillStyle = v; ctx.fillRect(d.x, d.y, d.w, d.h);
  ctx.restore();
}
/** source rect of the photo: zoom z around focus (fx,fy) at the dest aspect */
function crop(z, fx, fy, aspect) {
  const W0 = PHOTO.naturalWidth || 1000, H0_ = PHOTO.naturalHeight || 1332;
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
/** Catmull-Rom through waypoints → dense polyline */
function spline(P, n = 24) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(j => .5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)));
    }
  }
  out.push(P[P.length - 1]); return out;
}
/** a paper card (certificates, notes) */
function card(ctx, x, y, w, h, a, rot = 0) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x + w / 2, y + h / 2); ctx.rotate(rot); ctx.translate(-w / 2, -h / 2);
  ctx.fillStyle = 'rgba(28,23,15,.92)'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = rgba(C.gold, .55); ctx.lineWidth = 1.2; ctx.strokeRect(0, 0, w, h);
  ctx.strokeStyle = rgba(C.gold, .25); ctx.strokeRect(10, 10, w - 20, h - 20);
  return () => ctx.restore();
}

/* ---------- data ---------- */
// ten minutes vs ten years
const TEN = K.gen.path([20, 34, 29, 52, 45, 70, 62, 92, 84, 118], { per: [4, 2, 4, 2, 4, 2, 4, 2, 4], seed: 81, noise: .4 });
const TBOX = { x: 260, y: 300, w: 1100, h: 430 };
const chartTEN = new K.Chart(TEN.candles, TBOX, { lo: 10, hi: 125 });
// 2008
const C08 = K.gen.seq(100, [[1.5, 1, 1], [-2, 1, 1.5], [1, 1, 1], [-4, 1, 2], [-3, 1.5, 2], [1.5, 1, 1], [-7, 1, 3], [-9, 2, 4], [-5, 2, 3], [2, 2, 1],
  [-6, 1, 3], [-4, 2, 2], [3, 1, 1], [-2, 2, 2], [4, 1, 1], [3, 1, 1.5], [5, 1, 1], [4, 1.5, 1], [6, 1, 1]]);
const CBOX = { x: 260, y: 300, w: 900, h: 430 };
const chart08 = new K.Chart(C08, CBOX);
const low08 = C08.reduce((m, k, i) => k.l < C08[m].l ? i : m, 0);
// Berkshire: the long bull (illustrative)
const BRK = K.gen.path([8, 14, 11, 22, 18, 34, 29, 50, 43, 72, 63, 98, 88, 130], { per: [3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3], seed: 91, noise: .35 });
const BBOX = { x: 260, y: 290, w: 1400, h: 450 };
const chartBRK = new K.Chart(BRK.candles, BBOX, { lo: 0, hi: 136 });

window.FILM = {
  title: '股神巴菲特',
  transition: 1.1,
  fontScale: 1.55,
  subtitle: { x: 220, y: 912, size: 42, maxW: 1480 },     // 42 × FS 1.55 = 65px
  timing: { perChar: .115, base: .74, minLine: 2.0, pre: .3, post: .3 },   // one continuous story, paced to the track
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', dur: 4.4, camera: { z0: 1.08, z1: 1.0 }, lines: ['在别人<恐惧>时{贪婪}，', '在别人[贪婪]时{恐惧}。'],
    visual(ctx, S) {
      // gold price dots trace one fear-to-greed swing and condense into candles
      const N = 150, R2 = K.rng(21);
      const curve = u => 380 + 230 * Math.sin(u * Math.PI * 1.5 + .2) * (u < .85 ? 1 : 1);
      const pts = []; let w = 0;
      for (let i = 0; i < N; i++) { w = w * .8 + (R2() - .5) * 14; pts.push([180 + i * 10.4, curve(i / N) + 140 + w * .8]); }
      // curve(): high at u≈.2 (greed of the last cycle) → low at u≈.53 (fear) → high at u≈.87 (greed)
      const reveal = S.lin(0, -.3, 1.9);
      K.baseline(ctx, 180, 1740, 780, { p: S.at(0, 0, 1.4), step: 52, alpha: .9 });
      for (let i = 0; i < N * reveal; i++) {
        const [x, y] = pts[i], cond = S.at(1, .1 + i * .003, .7), gx = 180 + Math.floor(i / 6) * 62.4 + 31;
        ctx.fillStyle = rgba(C.goldHi, .85 - cond * .5); ctx.shadowColor = C.gold; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.arc(lerp(x, gx, cond), y, 1.8, 0, 6.2832); ctx.fill();
      }
      ctx.shadowBlur = 0;
      const ca = S.at(1, .7, 1.0);
      if (ca > 0) for (let g = 0; g < N / 6; g++) {
        const seg = pts.slice(g * 6, g * 6 + 6), ys = seg.map(q => q[1]);
        K.candle(ctx, 180 + g * 62.4 + 31, { o: -seg[0][1], c: -seg[5][1], h: -Math.min(...ys), l: -Math.max(...ys) }, v => -v, { w: 26, alpha: ca, grow: clamp(ca * 1.6 - g * .02), glow: .4 });
      }
      const lo = pts.reduce((m, p, i) => p[1] > pts[m][1] ? i : m, 0), hi = pts.reduce((m, p, i) => i > lo && p[1] < pts[m][1] ? i : m, lo);
      const fa = S.at(0, .9, .6), ga = S.at(1, .5, .6);
      K.marker(ctx, pts[lo][0], pts[lo][1] + 24, { alpha: fa, r: 10, color: C.green, label: '恐惧', pos: 'below', font: F.serif(900, 24), labelColor: C.green });
      K.tag(ctx, pts[lo][0], pts[lo][1] - 70, '他：贪婪 · 买入', { alpha: fa, color: C.gold });
      K.marker(ctx, pts[hi][0], pts[hi][1] - 24, { alpha: ga, r: 10, color: C.red, label: '贪婪', pos: 'above', font: F.serif(900, 24), labelColor: C.red });
      K.tag(ctx, pts[hi][0] - 40, pts[hi][1] + 80, '他：恐惧 · 卖出', { alpha: ga, color: C.gold });
    } },

  /* ================= TITLE ================= */
  { id: 'title', dur: 3.8, tr: 'zoom', camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const cx = 960;
      const bg = K.gen.path([100, 104, 102, 109, 106, 115, 112, 122, 119, 130], { per: 5, seed: 6 });
      const ch = new K.Chart(bg.candles, { x: 120, y: 200, w: 1680, h: 640 });
      ch.draw(ctx, S.lin(0, -.2, 2.6) * bg.candles.length, { alpha: .16, glow: 0, color: () => C.gold });
      K.text(ctx, 'WARREN  BUFFETT', cx, 384, { font: F.latin(500, 22), color: C.gold, align: 'center', spacing: 12, alpha: S.p(.2, 1.0) });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 405, 1920, 160); ctx.clip();
      const tp = S.p(.35, 1.2, K.expo);
      K.goldText(ctx, '时间的玫瑰', cx, 528 + (1 - tp) * 110, 72, { spacing: 20 });
      ctx.restore();
      const sw = clamp((S.t - 1.4) / 1.1);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(560, 1360, sw), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,240,200,.28)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, 410, 180, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 330, S.p(1.0, 1.2));
      K.text(ctx, '世纪股神 · 沃伦·巴菲特', cx, 650, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 8, alpha: S.p(1.5, 1.0) });
    } },

  /* ================= 人物画像 ================= */
  { id: 'intro', header: HD, tr: ['iris', [500, 500]], camera: { z0: 1.0, z1: 1.04, x1: -16 },
    lines: ['他是全球投资界无可争议的{精神图腾}，', '用80年的坚守，把投资变成{时间的艺术}。'],
    visual(ctx, S) {
      const d = { x: 300, y: 236, w: 400, h: 534 }, rv = S.p(0, 1.1, easeInOut);
      ctx.save(); ctx.beginPath(); const hh = d.h * rv; ctx.rect(d.x - 20, d.y + (d.h - hh) / 2, d.w + 40, hh); ctx.clip();
      photo(ctx, d, crop(lerp(1.0, 1.1, S.t / S.dur), .5, .4, d.w / d.h));
      ctx.restore();
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.5, .8));
      const x0 = 800, nm = S.p(.25, .9);
      K.text(ctx, '沃伦·巴菲特', x0, 318 + (1 - nm) * 20, { font: F.serif(900, 40), color: C.white, alpha: nm, spacing: 4 });
      K.text(ctx, 'WARREN BUFFETT · OMAHA', x0 + 2, 362, { font: F.latin(500, 19), color: C.gray, spacing: 6, alpha: S.p(.5, .8) });
      K.tag(ctx, x0, 410, '世纪股神', { align: 'left', alpha: S.p(.7, .7), color: C.gold });
      const q = S.at(0, .3, .8);
      K.text(ctx, '“', x0 - 6, 545, { font: F.latin(500, 64), color: C.gold, alpha: q * .9 });
      K.rich(ctx, '在别人<恐惧>时贪婪，', { x: x0 + 70, y: 510, size: 30, weight: 700, t: S.t - S.beat(0) - .3, anchorTop: true });
      K.rich(ctx, '在别人[贪婪]时恐惧。', { x: x0 + 70, y: 572, size: 30, weight: 700, t: S.t - S.beat(0) - .7, anchorTop: true });
      // eighty years, as a ruler
      const r = S.at(1, 0, 1.4), y = 700;
      K.line(ctx, x0, y, x0 + 760, y, { p: r, color: rgba(C.gold, .6) });
      K.marker(ctx, x0, y, { alpha: S.at(1, 0, .5), r: 6 });
      K.marker(ctx, x0 + 760, y, { alpha: S.at(1, 1.2, .5), r: 8, color: C.goldHi });
      K.text(ctx, '1941', x0, y + 40, { font: F.latin(500, 20), color: C.gray, align: 'center', alpha: S.at(1, 0, .5), spacing: 2 });
      K.text(ctx, '今天', x0 + 760, y + 40, { font: F.serif(700, 19), color: C.gray, align: 'center', alpha: S.at(1, 1.2, .5) });
      K.text(ctx, '80 年 · 时间的艺术', x0 + 380, y - 18, { font: F.serif(900, 24), color: C.goldHi, align: 'center', spacing: 4, alpha: S.at(1, .8, .6), glow: .5 });
    } },

  { id: 'eleven', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -20 },
    lines: ['{11岁}，他买下人生第一张股票，', '后拜师{价值投资}鼻祖格雷厄姆。'],
    visual(ctx, S) {
      // a lifetime ruler with two stops: the first share, the teacher
      const y = 760, X = yr => lerp(300, 1620, (yr - 1930) / 30), ra = S.p(0, .9);
      K.baseline(ctx, 300, 1620, y, { p: ra, step: 44 });
      [[1930, '出生'], [1941, '11岁'], [1950, '20岁']].forEach(([yr, lb], i) => {
        const a = i === 0 ? ra : i === 1 ? S.at(0, .2, .6) : S.at(1, 0, .6);
        K.marker(ctx, X(yr), y, { alpha: a, r: i ? 8 : 6, color: i ? C.goldHi : C.gold });
        K.text(ctx, String(yr), X(yr), y + 40, { font: F.latin(500, 20), color: C.gray, align: 'center', alpha: a, spacing: 2 });
        K.text(ctx, lb, X(yr), y - 22, { font: F.serif(700, 19), color: i ? C.white : C.gray, align: 'center', alpha: a });
      });
      // the first share (1941): three shares, $38 each
      const c1 = S.at(0, .3, .8, easeBack);
      if (c1 > 0) {
        const done = card(ctx, 360, 300 + (1 - clamp(c1)) * 30, 520, 320, clamp(c1), -.03);
        K.text(ctx, 'STOCK CERTIFICATE', 260, 62, { font: F.latin(500, 18), color: C.gold, align: 'center', spacing: 8 });
        K.text(ctx, '人生第一张股票', 260, 130, { font: F.serif(900, 34), color: C.white, align: 'center', spacing: 4 });
        K.text(ctx, '3 股 × $38', 260, 200, { font: F.serif(900, 30), color: C.goldHi, align: 'center' });
        K.text(ctx, '1941 · 11 岁', 260, 262, { font: F.latin(500, 20), color: C.gray, align: 'center', spacing: 4 });
        done();
        K.dash(ctx, 620, 620, X(1941), y - 46, { p: S.at(0, .9, .6), alpha: .6, dash: [3, 6] });
      }
      // the teacher (1950)
      const c2 = S.at(1, .2, .8, easeBack);
      if (c2 > 0) {
        const done = card(ctx, 1020, 300 + (1 - clamp(c2)) * 30, 540, 320, clamp(c2), .025);
        K.text(ctx, 'MENTOR', 270, 62, { font: F.latin(500, 18), color: C.gold, align: 'center', spacing: 8 });
        K.text(ctx, '本杰明·格雷厄姆', 270, 130, { font: F.serif(900, 34), color: C.white, align: 'center', spacing: 2 });
        K.text(ctx, '价值投资鼻祖', 270, 200, { font: F.serif(900, 30), color: C.goldHi, align: 'center', spacing: 4 });
        K.text(ctx, '1950 · 拜师', 270, 262, { font: F.serif(700, 20), color: C.gray, align: 'center', spacing: 4 });
        done();
        K.dash(ctx, 1290, 620, X(1950), y - 46, { p: S.at(1, .8, .6), alpha: .6, dash: [3, 6] });
      }
    } },

  { id: 'moat', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05 },
    lines: ['他从不落入{短期投机}的陷阱，', '死死咬住{复利}与{护城河}。'],
    visual(ctx, S) {
      const cx = 760, cy = 560;
      // speculation: a jittery tape that frays and fades
      const sp = S.at(0, 0, .6) * (1 - S.at(1, .2, .7)), R3 = K.rng(7);
      if (sp > 0) {
        const pts = []; for (let i = 0; i < 90; i++) pts.push([300 + i * 15, 470 + (R3() - .5) * 160 * Math.sin(i * .7 + S.t * 3)]);
        ctx.save(); ctx.globalAlpha = sp; ctx.strokeStyle = rgba(C.gray, .8); ctx.lineWidth = 1.6; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(...p) : ctx.moveTo(...p)); ctx.stroke(); ctx.restore();
        K.tag(ctx, 960, 290, '短期投机', { alpha: sp, color: C.green });
        const x = S.at(0, .8, .5);
        ctx.save(); ctx.globalAlpha = sp * x; ctx.strokeStyle = C.white; ctx.lineWidth = 5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(880, 390); ctx.lineTo(1040, 550); ctx.moveTo(1040, 390); ctx.lineTo(880, 550); ctx.stroke(); ctx.restore();
      }
      // the castle and its moat
      const ca = S.at(1, 0, .9, easeBack);
      if (ca > 0) {
        ctx.save(); ctx.globalAlpha = clamp(ca); ctx.translate(cx, cy); ctx.scale(.9 + .1 * clamp(ca), .9 + .1 * clamp(ca));
        ctx.strokeStyle = rgba(C.goldHi, .8); ctx.lineWidth = 2; ctx.setLineDash([3, 7]);
        for (const r of [250, 220]) { ctx.beginPath(); ctx.ellipse(0, 70, r, r * .3, 0, 0, 6.2832); ctx.stroke(); }
        ctx.setLineDash([]);
        const g = ctx.createLinearGradient(0, -160, 0, 80); g.addColorStop(0, '#F5DFA0'); g.addColorStop(1, '#8A6A2E');
        ctx.fillStyle = g; ctx.shadowColor = rgba(C.gold, .5); ctx.shadowBlur = 24;
        const wall = new Path2D(); wall.moveTo(-150, 80); wall.lineTo(-150, -40);
        for (let i = 0; i < 6; i++) { const x = -150 + i * 50; wall.lineTo(x, -60); wall.lineTo(x + 25, -60); wall.lineTo(x + 25, -40); wall.lineTo(x + 50, -40); }
        wall.lineTo(150, 80); wall.closePath(); ctx.fill(wall);
        ctx.fillRect(-45, -160, 90, 130); for (let i = 0; i < 3; i++) ctx.fillRect(-45 + i * 35, -180, 20, 22);
        ctx.fillStyle = '#1A1408'; ctx.beginPath(); ctx.moveTo(-26, 80); ctx.lineTo(-26, 20); ctx.arc(0, 20, 26, Math.PI, 0); ctx.lineTo(26, 80); ctx.fill();
        ctx.restore();
        K.text(ctx, '护城河', cx, cy + 190, { font: F.serif(900, 28), color: C.goldHi, align: 'center', spacing: 10, alpha: S.at(1, .5, .6), glow: .5 });
      }
      // compounding: a curve that starts slow and never stops
      const cp = S.at(1, .5, 1.6, x => x), pts = [];
      for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([1150 + u * 500, 760 - (Math.pow(1.065, i) - 1) / (Math.pow(1.065, 60) - 1) * 440]); }
      K.baseline(ctx, 1150, 1650, 770, { p: S.at(1, .4, .8), step: 50 });
      K.dotted(ctx, pts, cp, { gap: 7, r: 2 });
      K.text(ctx, '复利', 1650, 290, { font: F.serif(900, 28), color: C.red, align: 'right', spacing: 10, alpha: S.at(1, 1.6, .6), glow: .5, glowColor: C.red });
    } },

  { id: 'tenyears', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -20 },
    lines: ['“如果你不想持有一只股票{十年}，', '那就连{十分钟}都不要持有。”'],
    visual(ctx, S) {
      const ch = chartTEN, n = TEN.candles.length;
      K.baseline(ctx, TBOX.x, TBOX.x + TBOX.w, TBOX.y + TBOX.h + 30, { p: S.at(0, 0, 1) });
      ch.draw(ctx, S.lin(0, 0, 2.4) * n, { glow: .4 });
      K.bracket(ctx, ch.x(0), ch.x(n - 1), TBOX.y + TBOX.h + 54, '十年', { up: false, p: S.at(0, 1.2, .8), font: F.serif(900, 26) });
      // a magnifier on ten minutes of it: nothing but noise
      const m = S.at(1, 0, .8, easeBack), mx = 1560, my = 470, R = 150, ax = ch.x(14), ay = ch.y(TEN.candles[14].c);
      if (m > 0) {
        K.dash(ctx, ax, ay, mx - R * .8, my + R * .3, { p: clamp(m), alpha: .7 });
        K.marker(ctx, ax, ay, { alpha: clamp(m), r: 12 });
        ctx.save(); ctx.globalAlpha = clamp(m); ctx.beginPath(); ctx.arc(mx, my, R * clamp(m), 0, 6.2832);
        ctx.fillStyle = 'rgba(10,9,7,.92)'; ctx.fill(); ctx.strokeStyle = C.goldHi; ctx.lineWidth = 2; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 14; ctx.stroke(); ctx.shadowBlur = 0; ctx.clip();
        const R4 = K.rng(10); let p = 0;
        for (let i = 0; i < 14; i++) { const o = p; p += (R4() - .5) * 26; const x = mx - 120 + i * 18.5, c = p;
          K.candle(ctx, x, { o, c, h: Math.max(o, c) + R4() * 12, l: Math.min(o, c) - R4() * 12 }, v => my - v, { w: 10, glow: .2 }); }
        ctx.restore();
        K.text(ctx, '十分钟', mx, my + R + 46, { font: F.serif(900, 26), color: C.gray, align: 'center', spacing: 6, alpha: S.at(1, .5, .6) });
      }
    } },

  { id: 'crisis', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -16 },
    lines: ['2008年金融海啸，全美<恐慌>踩踏，', '他却狂掷{百亿美金}逆流抄底，', '稳坐[全球首富]宝座。'],
    visual(ctx, S) {
      const ch = chart08, n = C08.length;
      const r = S.lin(0, 0, S.beat(1) + .2) * (low08 + 1) + S.lin(1, .4, 1.6) * (n - low08 - 1);
      const sh = r > 6 && r < low08 + 1 ? Math.sin(S.t * 34) * 3 : 0;
      ctx.save(); ctx.translate(sh, 0);
      K.baseline(ctx, CBOX.x, CBOX.x + CBOX.w, CBOX.y + CBOX.h + 30, { p: S.at(0, 0, 1) });
      K.text(ctx, '2008', CBOX.x, CBOX.y + CBOX.h + 66, { font: F.latin(500, 20), color: C.gray, spacing: 4, alpha: S.at(0, .2, .8) });
      K.text(ctx, '美股 · 示意', CBOX.x + CBOX.w, CBOX.y + CBOX.h + 66, { font: F.serif(500, 16), color: C.gray, align: 'right', alpha: S.at(0, .2, .8) });
      ch.draw(ctx, r, { glow: .4 });
      K.text(ctx, '恐慌踩踏', ch.x(7), ch.y(C08[8].l) + 70, { font: F.serif(900, 26), color: C.green, align: 'center', alpha: S.at(0, 1.4, .6), glow: .4, glowColor: C.green });
      ctx.restore();
      // he buys while everyone sells
      const b = S.at(1, 0, .6), lx = ch.x(low08), ly = ch.y(C08[low08].l);
      K.marker(ctx, lx, ly + 18, { alpha: b, r: 11, color: C.red, label: '逆流抄底', pos: 'below', font: F.serif(900, 22), labelColor: C.red });
      ring(ctx, lx, ly + 18, S.lin(1, 0, 1.0), C.red, 120);
      ['高盛', '通用电气', '比亚迪'].forEach((nm, i) => K.tag(ctx, 1380, 380 + i * 64, nm, { alpha: S.at(1, .4 + i * .25, .5) * (1 - S.at(2, 0, .4)), color: C.gold, align: 'left' }));
      const mv = S.at(1, .3, 1.4), v = Math.round(easeOut(clamp((S.t - S.beat(1) - .3) / 1.4)) * 10000000000);
      if (mv > 0) K.goldText(ctx, '$' + v.toLocaleString('en-US'), 1500, 320, 34, { alpha: mv * (1 - S.at(2, 0, .5)), glow: 1 });
      // richest man in the world
      const rk = S.at(2, .3, .7, easeBack);
      if (rk > 0) {
        ctx.save(); ctx.globalAlpha = clamp(rk); ctx.translate(1500, 420); ctx.scale(clamp(rk), clamp(rk));
        ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 20; ctx.beginPath();
        ctx.moveTo(-50, 20); ctx.lineTo(-56, -26); ctx.lineTo(-28, -2); ctx.lineTo(0, -36); ctx.lineTo(28, -2); ctx.lineTo(56, -26); ctx.lineTo(50, 20); ctx.closePath(); ctx.fill();
        ctx.restore();
        K.text(ctx, '全球首富', 1500, 500, { font: F.serif(900, 30), color: C.red, align: 'center', spacing: 8, alpha: clamp(rk), glow: .5, glowColor: C.red });
      }
    } },

  { id: 'circle', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05 },
    lines: ['他证明了：{不熟不做}，', '{复利}才是世界第八大奇迹。'],
    visual(ctx, S) {
      // the circle of competence
      const cx = 640, cy = 520, R = 220, a = S.at(0, 0, .9), sh = 1 - S.at(1, 0, .6) * .35;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 2; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.arc(cx, cy, R * easeOut(a), 0, 6.2832); ctx.stroke(); ctx.restore();
      K.text(ctx, '能力圈', cx, cy - R - 26, { font: F.serif(900, 26), color: C.goldHi, align: 'center', spacing: 8, alpha: a });
      [['可乐', -80, -60], ['保险', 70, -30], ['银行', -40, 70]].forEach(([w, dx, dy], i) => K.tag(ctx, cx + dx, cy + dy, w, { alpha: S.at(0, .4 + i * .15, .5), color: C.gold }));
      [['看不懂', -330, -170], ['不熟悉', 300, 190], ['热门概念', 290, -200]].forEach(([w, dx, dy], i) => K.text(ctx, w, cx + dx, cy + dy, { font: F.serif(700, 20), color: C.gray, align: 'center', alpha: S.at(0, .7 + i * .15, .5) * .7 * sh }));
      K.text(ctx, '不熟不做', cx, cy + R + 60, { font: F.serif(900, 28), color: C.white, align: 'center', spacing: 8, alpha: S.at(0, 1.0, .6) });
      // the eighth wonder: doubling, doubling, doubling
      const pts = [], cp = S.at(1, .1, 1.6, x => x);
      for (let i = 0; i <= 80; i++) { const u = i / 80; pts.push([1060 + u * 600, 760 - (Math.pow(2, u * 6) - 1) / 63 * 460]); }
      K.baseline(ctx, 1060, 1660, 770, { p: S.at(1, 0, .8), step: 50 });
      K.dotted(ctx, pts, cp, { gap: 7, r: 2.2 });
      [1, 2, 4, 8, 16, 32, 64].forEach((v, k) => {
        const u = k / 6, x = 1060 + u * 600, y = 760 - (v - 1) / 63 * 460, al = clamp((cp - u + .02) * 12);
        if (k > 2) K.text(ctx, '×' + v, x - 14, y - 18, { font: F.latin(500, 20), color: C.goldHi, align: 'right', alpha: al });
        K.marker(ctx, x, y, { alpha: al, r: 5 });
      });
      K.text(ctx, '复利 · 第八大奇迹', 1360, 290, { font: F.serif(900, 26), color: C.red, align: 'center', spacing: 4, alpha: S.at(1, .9, .6), glow: .5, glowColor: C.red });
    } },

  { id: 'time', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.05, x1: -16 },
    lines: ['股神的一生，是与{时间做朋友}的一生。', '他从未在暴富中迷失，在奥马哈{滚着雪球}。'],
    visual(ctx, S) {
      const ch = chartBRK, n = BRK.candles.length;
      K.baseline(ctx, BBOX.x, BBOX.x + BBOX.w, BBOX.y + BBOX.h + 30, { p: S.at(0, 0, 1) });
      K.text(ctx, '伯克希尔 · 长牛 · 示意', BBOX.x + BBOX.w, BBOX.y + BBOX.h + 66, { font: F.serif(500, 16), color: C.gray, align: 'right', alpha: S.at(0, .2, .8) });
      ch.draw(ctx, S.lin(0, 0, 4.4) * n, { glow: .4 });
      const tr = BRK.swings.filter(s => s.type === 'L').map(s => [ch.x(s.i), ch.y(s.price) + 26]);
      K.dotted(ctx, [[ch.x(0), ch.y(BRK.candles[0].l) + 26], ...tr], S.lin(0, 1.2, 2.4), { alpha: .85 });
      K.tag(ctx, 560, 300, '与时间做朋友', { alpha: S.at(0, 1.4, .6), color: C.gold, font: F.serif(900, 22) });
      K.tag(ctx, 560, 360, '奥马哈', { alpha: S.at(1, .3, .6), color: C.gold });
    } },

  { id: 'snow', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.05 },
    lines: ['人生就像{滚雪球}，', '最重要的是发现{很湿的雪}和{很长的坡}。'],
    visual(ctx, S) {
      // a long slope, and a snowball that grows as it rolls
      const sx = 280, sy = 360, ex = 1660, ey = 760, sl = S.at(0, 0, 1.2);
      K.line(ctx, sx, sy, ex, ey, { p: sl, color: rgba(C.goldHi, .8), width: 2, glow: .6 });
      ctx.save(); ctx.globalAlpha = .1 * sl; ctx.fillStyle = C.goldHi; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.lineTo(sx, ey); ctx.closePath(); ctx.fill(); ctx.restore();
      const u = S.at(0, .5, S.dur - 1.2, x => x * x * (3 - 2 * x)), ang = Math.atan2(ey - sy, ex - sx);
      const r = 14 + 74 * u, bx = lerp(sx + 40, ex - 120, u), by = lerp(sy + 40 * (ey - sy) / (ex - sx), ey - 120 * (ey - sy) / (ex - sx), u);
      const cx = bx - Math.sin(ang) * r, cy = by - r / Math.cos(ang) * Math.cos(ang) - Math.cos(ang) * 0;
      // the track it leaves behind
      K.dotted(ctx, [[sx + 40, sy + 40 * (ey - sy) / (ex - sx) - 4], [bx, by - 4]], 1, { gap: 6, r: 1.4, alpha: .6 * sl });
      ctx.save(); const g = ctx.createRadialGradient(cx - r * .35, cy - r * .35, r * .1, cx, cy, r);
      g.addColorStop(0, '#FFFBF0'); g.addColorStop(.6, '#EDE3CF'); g.addColorStop(1, '#B9A57E');
      ctx.globalAlpha = S.at(0, .3, .5); ctx.fillStyle = g; ctx.shadowColor = rgba(C.goldHi, .6); ctx.shadowBlur = 30;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 6.2832); ctx.fill(); ctx.restore();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(u * 18); ctx.strokeStyle = 'rgba(150,130,90,.5)'; ctx.lineWidth = 1.5;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.arc(0, 0, r * (.3 + k * .22), k, k + 1.6); ctx.stroke(); } ctx.restore();
      K.tag(ctx, 760, 760, '很湿的雪', { alpha: S.at(1, .3, .6), color: C.gold, font: F.serif(900, 22) });
      K.tag(ctx, 1220, 500, '很长的坡', { alpha: S.at(1, .9, .6), color: C.gold, font: F.serif(900, 22) });
      K.goldText(ctx, '慢慢变富 · 永恒传奇', 1240, 300, 38, { alpha: S.at(1, 1.6, .9), spacing: 8 });
    } },

  /* ================= END ================= */
  { id: 'end', dur: 4.4, tr: 'zoom', noWatermark: true,
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
      K.text(ctx, '股神巴菲特 · 完', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 6, alpha: S.p(1.0, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.4, 1) });
    } },
  ],
};
})();

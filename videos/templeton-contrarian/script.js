/* ============================================================
   《逆向投资先驱邓普顿》 — content for the TradingNow film engine (index.html)

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
const HD = { label: ' ', en: 'Sir John Templeton', zh: '《逆向投资先驱》' };

/* ---------- shared visual pieces ---------- */
const easeBack = x => { x = clamp(x); const c1 = 1.5, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };

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
  const W0 = PHOTO.naturalWidth || 1048, H0_ = PHOTO.naturalHeight || 768;
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
/** a small arrow glyph pointing in direction dir (±1), centred at x,y */
function chevron(ctx, x, y, dir, col, a, s = 1) {
  if (a <= .002) return;
  ctx.save(); ctx.globalAlpha *= a; ctx.strokeStyle = col; ctx.lineWidth = 2.4 * s; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 18 * s * dir, y); ctx.lineTo(x + 18 * s * dir, y); ctx.moveTo(x + 6 * s * dir, y - 11 * s); ctx.lineTo(x + 18 * s * dir, y); ctx.lineTo(x + 6 * s * dir, y + 11 * s); ctx.stroke();
  ctx.restore();
}

/* ---------- data ---------- */
// the sentiment cycle: 绝望 → 半信半疑 → 憧憬 → 狂热 → 毁灭
const CYC = [[300, 700], [520, 600], [720, 470], [920, 400], [1120, 300], [1240, 280], [1380, 470], [1560, 690]];
const CYCP = spline(CYC);
// 1939: 104 stocks under one dollar
const R104 = K.rng(39), STK = Array.from({ length: 104 }, () => ({ h: .25 + R104() * .7, up: 1.4 + R104() * 2.6, d: R104() }));
// Japan: a long climb from the low everyone sold
const JP = K.gen.path([12, 9, 15, 12, 26, 21, 44, 37, 70, 60, 112], { per: [3, 2, 3, 2, 3, 2, 3, 2, 3, 2], seed: 61, noise: .35 });
const JBOX = { x: 260, y: 300, w: 980, h: 430 };
const chartJP = new K.Chart(JP.candles, JBOX, { lo: 0, hi: 120 });
// 2000: the tech bubble as a line
const BUBP = (() => { const pts = []; for (let i = 0; i <= 120; i++) { const u = i / 120; let v;
  if (u < .62) v = 18 + 30 * u + 260 * Math.pow(u / .62, 6); else v = 308 - 230 * easeOut((u - .62) / .38) + Math.sin(u * 60) * 8 * (u - .62);
  v += Math.sin(u * 47) * 5 + Math.sin(u * 13) * 7; pts.push([260 + u * 1000, 740 - v * 1.35]); } return pts; })();
const BPK = BUBP.reduce((m, p, i) => p[1] < BUBP[m][1] ? i : m, 0);

window.FILM = {
  title: '逆向投资先驱邓普顿',
  transition: 1.1,
  fontScale: 1.55,
  subtitle: { x: 220, y: 912, size: 42, maxW: 1480 },     // 42 × FS 1.55 = 65px
  timing: { perChar: .1, base: .62, minLine: 2.0, pre: .3, post: .3 },   // one continuous story, paced to the track
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', dur: 4.4, camera: { z0: 1.08, z1: 1.0 }, lines: ['行情总在<绝望>中诞生，', '在{半信半疑}中成长。'],
    visual(ctx, S) {
      // gold price dots pour down into despair, then climb out — and condense into candles
      const N = 150, R2 = K.rng(12);
      const curve = u => u < .42 ? 290 + 360 * Math.pow(u / .42, 1.6) : 650 - 260 * Math.pow((u - .42) / .58, .9);
      const pts = []; let w = 0;
      for (let i = 0; i < N; i++) { w = w * .8 + (R2() - .5) * 16; pts.push([180 + i * 10.4, curve(i / N) + w * (1 - Math.exp(-((i / N - .42) ** 2) * 40) * .7)]); }
      const reveal = S.lin(0, -.3, 1.9);
      K.baseline(ctx, 180, 1740, 770, { p: S.at(0, 0, 1.4), step: 52, alpha: .9 });
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
      // the bottom, and the first doubtful climb
      const bi = Math.round(N * .42), bx = pts[bi][0], by = Math.max(...pts.slice(bi - 6, bi + 6).map(q => q[1]));
      const ba = S.at(0, 1.0, .7);
      K.marker(ctx, bx, by + 22, { alpha: ba, r: 10, color: C.green, label: '绝望', pos: 'below', font: F.serif(900, 24), pulse: clamp(((S.t - 1.3) % 1.4) / 1.4) * (ba > .99 ? 1 : 0) });
      K.text(ctx, '半信半疑', 1400, 430, { font: F.serif(900, 24), color: C.goldHi, align: 'center', alpha: S.at(1, .9, .7), glow: .5 });
    } },

  /* ================= TITLE ================= */
  { id: 'title', dur: 3.8, tr: 'zoom', camera: { z0: 1.0, z1: 1.06 },
    visual(ctx, S) {
      const cx = 960;
      const bg = K.gen.path([128, 115, 121, 104, 110, 100, 112, 108, 124], { per: 6, seed: 4 });
      const ch = new K.Chart(bg.candles, { x: 120, y: 200, w: 1680, h: 640 });
      ch.draw(ctx, S.lin(0, -.2, 2.6) * bg.candles.length, { alpha: .16, glow: 0, color: () => C.gold });
      K.text(ctx, 'SIR  JOHN  TEMPLETON', cx, 384, { font: F.latin(500, 22), color: C.gold, align: 'center', spacing: 12, alpha: S.p(.2, 1.0) });
      ctx.save(); ctx.beginPath(); ctx.rect(0, 405, 1920, 160); ctx.clip();
      const tp = S.p(.35, 1.2, K.expo);
      K.goldText(ctx, '逆向投资先驱', cx, 528 + (1 - tp) * 110, 72, { spacing: 16 });
      ctx.restore();
      const sw = clamp((S.t - 1.4) / 1.1);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(520, 1400, sw), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, 'rgba(255,240,200,.28)'); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, 410, 180, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 330, S.p(1.0, 1.2));
      K.text(ctx, '二十世纪全球逆向投资大师 · 约翰·邓普顿', cx, 650, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 6, alpha: S.p(1.5, 1.0) });
    } },

  /* ================= 人物画像 ================= */
  { id: 'intro', header: HD, dur: 5.0, tr: ['iris', [530, 480]], camera: { z0: 1.0, z1: 1.04, x1: -16 },
    lines: ['他是二十世纪最伟大的{全球逆向投资}大师。'],
    visual(ctx, S) {
      const d = { x: 250, y: 280, w: 560, h: 410 }, rv = S.p(0, 1.1, easeInOut);
      ctx.save(); ctx.beginPath(); const ww = d.w * rv; ctx.rect(d.x + (d.w - ww) / 2, d.y - 20, ww, d.h + 40); ctx.clip();
      photo(ctx, d, crop(lerp(1.0, 1.1, S.t / S.dur), .55, .4, d.w / d.h));
      ctx.restore();
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.5, .8));
      K.text(ctx, '1912 — 2008', d.x + d.w / 2, d.y + d.h + 44, { font: F.latin(500, 18), color: C.goldHi, align: 'center', spacing: 6, alpha: S.p(.9, .8) });
      const x0 = 900, nm = S.p(.25, .9);
      K.text(ctx, '约翰·邓普顿', x0, 340 + (1 - nm) * 20, { font: F.serif(900, 40), color: C.white, alpha: nm, spacing: 4 });
      K.text(ctx, 'SIR JOHN TEMPLETON', x0 + 2, 384, { font: F.latin(500, 19), color: C.gray, spacing: 6, alpha: S.p(.5, .8) });
      K.tag(ctx, x0, 432, '全球逆向投资先驱', { align: 'left', alpha: S.p(.7, .7), color: C.gold });
      const q = S.at(0, .6, .8);
      K.text(ctx, '“', x0 - 6, 565, { font: F.latin(500, 64), color: C.gold, alpha: q * .9 });
      K.rich(ctx, '行情总在<绝望>中诞生，', { x: x0 + 70, y: 530, size: 30, weight: 700, t: S.t - S.beat(0) - .6, anchorTop: true });
      K.rich(ctx, '在{半信半疑}中成长。', { x: x0 + 70, y: 592, size: 30, weight: 700, t: S.t - S.beat(0) - 1.0, anchorTop: true });
      K.line(ctx, x0, 634, x0 + 720, 634, { p: q, color: rgba(C.gold, .4) });
    } },

  { id: 'cycle', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05, x1: -20 },
    lines: ['他断言：行情在{憧憬}中成熟，', '在[狂热]中毁灭。'],
    visual(ctx, S) {
      // the whole sentiment cycle, drawn as the house particle line
      const n = CYCP.length, peakAt = CYCP.findIndex(p => p[0] >= 1240);
      const p = S.lin(0, -.2, 1.2) * (peakAt * .55) / n + S.lin(0, .6, 1.4) * (peakAt * .45) / n + S.lin(1, 0, 1.0) * (n - peakAt) / n;
      K.baseline(ctx, 260, 1660, 760, { p: S.at(0, 0, 1) });
      // warm the rising side, cool the collapse
      const up = CYCP.slice(0, Math.min(n, Math.round(p * n)));
      if (up.length > 2) {
        ctx.save(); ctx.beginPath(); ctx.moveTo(up[0][0], 760); up.forEach(q => ctx.lineTo(q[0], q[1])); ctx.lineTo(up[up.length - 1][0], 760); ctx.closePath();
        const g = ctx.createLinearGradient(0, 280, 0, 760); g.addColorStop(0, rgba(C.gold, .14)); g.addColorStop(1, rgba(C.gold, 0)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      }
      K.dotted(ctx, CYCP, p, { gap: 7, r: 2 });
      const st = [['绝望', CYC[0], C.green, 'below', S.p(.1, .6)], ['半信半疑', CYC[2], C.goldHi, 'right', S.p(.5, .6)],
                  ['憧憬', CYC[3], C.goldHi, 'above', S.at(0, 1.1, .6)], ['狂热', CYC[5], C.red, 'above', S.at(1, 0, .6)], ['毁灭', CYC[7], C.green, 'below', S.at(1, .8, .6)]];
      for (const [lb, [x, y], col, pos, a] of st)
        K.marker(ctx, x, y + (pos === 'below' ? 14 : pos === 'above' ? -14 : 0), { alpha: a, r: 9, color: col, label: lb, pos, font: F.serif(900, 24), labelColor: col });
      ring(ctx, CYC[5][0], CYC[5][1] - 14, S.lin(1, .1, 1.1), C.red, 120);
      K.arrow(ctx, 1300, 330, 1420, 560, { p: S.at(1, .5, .7), alpha: S.at(1, .5, .7), color: C.green, width: 3 });
    } },

  { id: 'y1939', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -16 },
    lines: ['1939年二战爆发，全美陷入<恐慌>，', '他逆流而上，借钱买下所有跌破{1美元}的股票。'],
    visual(ctx, S) {
      // the extra edition
      const na = S.at(0, -.1, .8, easeBack), sh = Math.sin(S.t * 30) * 3 * (1 - S.at(0, 1.2, .8)) * na;
      ctx.save(); ctx.translate(480 + sh, 500); ctx.rotate(-.04); ctx.globalAlpha = clamp(na); ctx.scale(lerp(.9, 1, clamp(na)), lerp(.9, 1, clamp(na)));
      ctx.fillStyle = 'rgba(28,23,15,.92)'; ctx.fillRect(-210, -230, 420, 430); ctx.strokeStyle = rgba(C.gold, .55); ctx.lineWidth = 1.2; ctx.strokeRect(-210, -230, 420, 430);
      K.text(ctx, '号  外', 0, -160, { font: F.serif(900, 44), color: C.white, align: 'center', spacing: 10 });
      K.line(ctx, -180, -138, 180, -138, { color: rgba(C.gold, .6) });
      K.text(ctx, '1939 · 9', 0, -110, { font: F.latin(500, 20), color: C.gray, align: 'center', spacing: 6 });
      K.text(ctx, '欧战爆发', 0, -22, { font: F.serif(900, 40), color: C.goldHi, align: 'center', spacing: 8 });
      ctx.fillStyle = rgba(C.gray, .28);
      for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) ctx.fillRect(-180 + c * 190, 22 + r * 26, 170 - (r * 37 + c * 53) % 60, 8);
      ctx.restore();
      K.tag(ctx, 480, 760, '全美恐慌', { alpha: S.at(0, 1.0, .6) * (1 - S.at(1, 1.2, .6)), color: C.green });
      // 104 stocks below one dollar → bought → rising above it
      const x0 = 820, x1 = 1660, yB = 720, yD = 470, step = (x1 - x0) / 104;
      const show = S.at(0, .6, 1.0), buy = S.lin(1, .2, 1.6), rise = S.at(1, 1.9, 1.0);
      K.baseline(ctx, x0, x1, yB + 4, { p: show, step: 42 });
      K.dash(ctx, x0 - 10, yD, x1 + 10, yD, { p: show, alpha: .85, color: C.goldHi });
      K.text(ctx, '$1', x0 - 22, yD + 8, { font: F.latin(500, 24), color: C.goldHi, align: 'right', alpha: show });
      STK.forEach((s, i) => {
        const a = clamp(show * 1.4 - s.d * .4); if (a <= 0) return;
        const bought = buy * 1.15 > i / 104, hh = lerp((yB - yD) * s.h, (yB - yD) + (yD - 340) * (s.up - 1.4) / 2.6, rise);
        ctx.fillStyle = bought ? (rise > .02 ? mix(C.gold, C.red, rise) : C.goldHi) : rgba(C.gray, .55);
        ctx.globalAlpha = a; ctx.fillRect(x0 + i * step + 1, yB - hh, step - 2.5, hh); ctx.globalAlpha = 1;
      });
      K.tag(ctx, 1060, 270, `买入 ${Math.min(104, Math.floor(buy * 1.15 * 104))} / 104 家`, { alpha: S.at(1, .2, .5), color: C.gold });
      K.tag(ctx, 1440, 270, '借钱入市', { alpha: S.at(1, .2, .5) * (1 - rise), color: C.gold });
      K.tag(ctx, 1440, 270, '一战成名', { alpha: rise, color: C.red });
    } },

  { id: 'global', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.04 },
    lines: ['他打破华尔街的地域限制，{首创全球化分散投资}。'],
    visual(ctx, S) {
      // a dotted globe turning slowly; from Wall Street, routes reach out to the world
      const cx = 960, cy = 500, R = 230, rot = S.t * .25, a0 = S.p(0, .9);
      ctx.save(); ctx.globalAlpha = a0; ctx.strokeStyle = rgba(C.gold, .55); ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 6.2832); ctx.stroke();
      ctx.setLineDash([2, 7]); ctx.strokeStyle = rgba(C.gold, .4);
      for (let k = -2; k <= 2; k++) { const y = cy + k * R * .33, rx = Math.sqrt(R * R - (y - cy) ** 2); ctx.beginPath(); ctx.ellipse(cx, y, rx, rx * .12, 0, 0, 6.2832); ctx.stroke(); }
      for (let k = 0; k < 6; k++) { const s = Math.sin(rot + k * Math.PI / 6); ctx.beginPath(); ctx.ellipse(cx, cy, Math.abs(s) * R, R, 0, 0, 6.2832); ctx.stroke(); }
      ctx.restore();
      const ny = [cx - 150, cy - 40];
      K.marker(ctx, ny[0], ny[1], { alpha: S.p(.3, .6), r: 9, label: '华尔街', pos: 'left', font: F.serif(900, 22) });
      const dest = [['欧洲', [cx + 30, cy - 150]], ['日本', [cx + 360, cy - 60]], ['亚洲', [cx + 300, cy + 120]], ['拉美', [cx - 60, cy + 200]], ['加拿大', [cx - 330, cy - 170]]];
      dest.forEach(([lb, [x, y]], i) => {
        const p = S.at(0, .4 + i * .35, .9);
        if (p <= 0) return;
        const mx = (ny[0] + x) / 2, my = Math.min(ny[1], y) - 120, pts = [];
        for (let k = 0; k <= 30; k++) { const t = k / 30; pts.push([(1 - t) ** 2 * ny[0] + 2 * (1 - t) * t * mx + t * t * x, (1 - t) ** 2 * ny[1] + 2 * (1 - t) * t * my + t * t * y]); }
        K.dotted(ctx, pts, p, { gap: 7, r: 1.8 });
        K.marker(ctx, x, y, { alpha: clamp(p * 2 - 1), r: 7, label: lb, pos: x > cx + 100 ? 'right' : y > cy ? 'below' : 'above', font: F.serif(700, 22) });
      });
      K.tag(ctx, cx, 220, '全球化分散投资', { alpha: S.at(0, 1.8, .6), color: C.gold });
    } },

  { id: 'rule', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.05 },
    lines: ['法则：“寻找{极度悲观}的点，就是{财富的起点}。”'],
    visual(ctx, S) {
      // the sentiment gauge: the needle falls to the far end of pessimism — and that is where the money starts
      const cx = 960, cy = 700, R = 330, a0 = S.p(0, .8);
      ctx.save(); ctx.globalAlpha = a0; ctx.lineWidth = 16; ctx.lineCap = 'butt';
      for (let i = 0; i < 60; i++) {
        const t0 = Math.PI + i / 60 * Math.PI, t1 = t0 + Math.PI / 60 * .82, u = i / 59;
        ctx.strokeStyle = u < .5 ? mix(C.green, C.gold, u * 2) : mix(C.gold, C.red, (u - .5) * 2);
        ctx.beginPath(); ctx.arc(cx, cy, R, t0, t1); ctx.stroke();
      }
      ctx.lineWidth = 1; ctx.strokeStyle = rgba(C.gold, .45);
      for (let i = 0; i <= 10; i++) { const t = Math.PI + i / 10 * Math.PI; ctx.beginPath(); ctx.moveTo(cx + Math.cos(t) * (R - 26), cy + Math.sin(t) * (R - 26)); ctx.lineTo(cx + Math.cos(t) * (R - 40), cy + Math.sin(t) * (R - 40)); ctx.stroke(); }
      ctx.restore();
      K.text(ctx, '极度悲观', cx - R, cy + 52, { font: F.serif(900, 24), color: C.green, align: 'center', alpha: a0 });
      K.text(ctx, '极度乐观', cx + R, cy + 52, { font: F.serif(900, 24), color: C.red, align: 'center', alpha: a0 });
      K.text(ctx, '市场情绪', cx, cy + 52, { font: F.serif(500, 20), color: C.gray, align: 'center', spacing: 6, alpha: a0 });
      // the needle: wavers near optimism, then drops to the far left
      const u = S.at(0, .5, 1.6, easeInOut), ang = lerp(-.35, -Math.PI + .1, u) + Math.sin(S.t * 6) * .04 * (1 - u);
      K.arrow(ctx, cx, cy, cx + Math.cos(ang) * (R - 50), cy + Math.sin(ang) * (R - 50), { alpha: a0, color: C.goldHi, width: 3.4, head: 22 });
      ctx.save(); ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 16; ctx.globalAlpha = a0; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 6.2832); ctx.fill(); ctx.restore();
      const hit = S.at(0, 2.0, .6), tx = cx + Math.cos(Math.PI + .1) * R, ty = cy + Math.sin(Math.PI + .1) * R;
      ring(ctx, tx, ty, S.lin(0, 2.0, 1.0), C.goldHi, 140);
      K.marker(ctx, tx, ty, { alpha: hit, r: 14, color: C.goldHi, pulse: hit > .99 ? clamp(((S.t - 2.6) % 1.4) / 1.4) : 0 });
      K.tag(ctx, tx + 40, ty - 70, '财富的起点', { alpha: hit, color: C.gold, align: 'left', font: F.serif(900, 24) });
    } },

  { id: 'japan', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -20 },
    lines: ['上世纪60年代，人人都在<看空日本>，', '他率先{重仓日本}，狂赚[百倍]！'],
    visual(ctx, S) {
      const ch = chartJP, n = JP.candles.length;
      const r = S.lin(0, 0, S.beat(1)) * 6 + S.lin(1, 0, 1.8) * (n - 6);
      K.baseline(ctx, JBOX.x, JBOX.x + JBOX.w, JBOX.y + JBOX.h + 30, { p: S.at(0, 0, 1) });
      K.text(ctx, '日本股市 · 示意', JBOX.x + JBOX.w, JBOX.y + JBOX.h + 66, { font: F.serif(500, 16), color: C.gray, align: 'right', alpha: S.at(0, .2, .8) });
      ch.draw(ctx, r, { glow: .4 });
      // everyone else: bearish
      const bear = S.at(0, .5, .6) * (1 - S.at(1, .6, .6));
      [[ch.x(1), 520], [ch.x(3) + 30, 450], [ch.x(5) + 60, 540]].forEach(([x, y], i) => K.tag(ctx, x, y, '看空', { alpha: bear * clamp((S.t - S.beat(0) - .5 - i * .25) / .4), color: C.green }));
      // him: all in at the low
      const lo = JP.swings[0], la = S.at(1, 0, .6);
      K.marker(ctx, ch.x(lo.i), ch.y(lo.price) + 16, { alpha: la, r: 10, color: C.red, label: '重仓', pos: 'below', font: F.serif(900, 22), labelColor: C.red });
      ring(ctx, ch.x(lo.i), ch.y(lo.price) + 16, S.lin(1, 0, 1.0), C.red, 100);
      // a hundredfold
      const m = S.at(1, .4, 1.6), k = Math.max(1, Math.round(Math.pow(100, easeOut(clamp((S.t - S.beat(1) - .4) / 1.8)))));
      if (m > 0) {
        K.goldText(ctx, '×' + k, 1450, 470, 64, { alpha: m, glow: 1.2 });
        K.text(ctx, '狂赚百倍', 1450, 548, { font: F.serif(900, 30), color: C.red, align: 'center', alpha: S.at(1, 1.2, .6), glow: .5, glowColor: C.red });
        ring(ctx, 1450, 440, S.lin(1, 2.0, 1.0), C.goldHi, 200);
      }
    } },

  { id: 'bubble', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.05 },
    lines: ['2000年互联网泡沫最狂热时，', '他精准{做空科技股}，大获全胜。'],
    visual(ctx, S) {
      const n = BUBP.length, p = S.lin(0, 0, S.beat(1) + .2) * (BPK / n) + S.lin(1, .1, 1.4) * ((n - BPK) / n);
      K.baseline(ctx, 260, 1260, 770, { p: S.at(0, 0, 1) });
      K.text(ctx, '2000', 260, 806, { font: F.latin(500, 20), color: C.gray, spacing: 4, alpha: S.at(0, .2, .8) });
      K.text(ctx, '纳斯达克 · 示意', 1260, 806, { font: F.serif(500, 16), color: C.gray, align: 'right', alpha: S.at(0, .2, .8) });
      const vis = BUBP.slice(0, Math.max(2, Math.round(p * n)));
      ctx.save(); ctx.beginPath(); ctx.moveTo(vis[0][0], 770); vis.forEach(q => ctx.lineTo(q[0], q[1])); ctx.lineTo(vis[vis.length - 1][0], 770); ctx.closePath();
      const after = vis.length > BPK + 1, g = ctx.createLinearGradient(0, 300, 0, 770);
      g.addColorStop(0, rgba(after ? mix(C.red, C.green, S.at(1, .3, 1)) : C.red, .22)); g.addColorStop(1, rgba(C.red, 0)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      K.dotted(ctx, BUBP, p, { gap: 6, r: 2 });
      const [px, py] = BUBP[BPK], pk = clamp((p * n - BPK) / 6);
      K.marker(ctx, px, py - 14, { alpha: pk, r: 10, color: C.red, label: '狂热', pos: 'left', font: F.serif(900, 24), labelColor: C.red });
      const sa = S.at(1, 0, .6);
      K.tag(ctx, px + 60, py + 10, '做空 SHORT', { alpha: sa, color: C.green, align: 'left' });
      K.arrow(ctx, px + 120, py + 40, px + 120, py + 170, { p: sa, alpha: sa, color: C.green, width: 3 });
      const win = S.at(1, 1.4, .7);
      K.goldText(ctx, '大获全胜', 1500, 520, 44, { alpha: win, glow: 1.1 });
      K.text(ctx, '逃顶科技泡沫', 1500, 584, { font: F.serif(700, 22), color: C.gray, align: 'center', spacing: 6, alpha: S.at(1, 1.8, .6) });
    } },

  { id: 'crowd', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.05, x1: -16 },
    lines: ['大众盲从的地方，往往就是{陷阱}；', '大众绝望的地方，才是{天堂}。'],
    visual(ctx, S) {
      // the same hill: the crowd climbs to the top, one man walks down to the bottom
      const hill = spline([[260, 640], [460, 720], [700, 600], [980, 420], [1240, 300], [1460, 420], [1660, 560]]);
      K.dotted(ctx, hill, S.at(0, -.2, 1.0), { gap: 7, r: 1.8, alpha: .9 });
      const at = x => { let best = hill[0]; for (const q of hill) if (Math.abs(q[0] - x) < Math.abs(best[0] - x)) best = q; return best[1]; };
      const R5 = K.rng(55), climb = S.at(0, .2, 2.2, easeInOut);
      for (let i = 0; i < 46; i++) {
        const sx = 420 + R5() * 560, ex = 1180 + R5() * 120, x = lerp(sx, ex, clamp(climb * 1.2 - R5() * .2)), y = at(x) - 14 - R5() * 20;
        ctx.fillStyle = rgba(C.gray, .8 * S.at(0, 0, .6)); ctx.beginPath(); ctx.arc(x, y, 4.2, 0, 6.2832); ctx.fill();
      }
      const trap = S.at(0, 1.6, .6);
      if (trap > 0) {
        const g = ctx.createRadialGradient(1240, 280, 0, 1240, 280, 170); g.addColorStop(0, rgba(C.red, .28 * trap)); g.addColorStop(1, rgba(C.red, 0));
        ctx.fillStyle = g; ctx.fillRect(1070, 110, 340, 340);
        K.text(ctx, '陷阱', 1240, 236, { font: F.serif(900, 34), color: C.red, align: 'center', spacing: 10, alpha: trap, glow: .5, glowColor: C.red });
      }
      // him: alone, down to where everyone despairs
      const go = S.at(1, 0, 1.4, easeInOut), hx = lerp(1000, 470, go), hy = at(hx) - 16;
      const ha = S.at(0, .8, .6);
      ctx.save(); ctx.globalAlpha = ha; ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(hx, hy, 7, 0, 6.2832); ctx.fill(); ctx.restore();
      if (go > 0 && go < 1) chevron(ctx, hx - 40, hy - 30, -1, C.goldHi, ha);
      const hv = S.at(1, 1.2, .7);
      if (hv > 0) {
        const g = ctx.createRadialGradient(470, 690, 0, 470, 690, 200); g.addColorStop(0, rgba(C.goldHi, .25 * hv)); g.addColorStop(1, rgba(C.goldHi, 0));
        ctx.fillStyle = g; ctx.fillRect(270, 490, 400, 400);
        K.text(ctx, '天堂', 470, 800, { font: F.serif(900, 34), color: C.goldHi, align: 'center', spacing: 10, alpha: hv, glow: .6 });
      }
    } },

  { id: 'life', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    lines: ['这位英国{爵士}，2008年以{95岁}高龄离世。'],
    visual(ctx, S) {
      // a lifetime ruler over a slow sunset
      const hz = 690, sy = lerp(560, 650, S.t / S.dur);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 0, 1920, hz); ctx.clip();
      const sun = ctx.createRadialGradient(960, sy, 0, 960, sy, 420);
      sun.addColorStop(0, 'rgba(255,214,140,.9)'); sun.addColorStop(.18, 'rgba(241,190,110,.55)'); sun.addColorStop(.45, 'rgba(201,140,70,.16)'); sun.addColorStop(1, 'rgba(201,140,70,0)');
      ctx.fillStyle = sun; ctx.fillRect(500, sy - 420, 920, 840);
      ctx.fillStyle = 'rgba(255,226,170,.95)'; ctx.shadowColor = '#F1C27A'; ctx.shadowBlur = 50; ctx.beginPath(); ctx.arc(960, sy, 110, 0, 6.2832); ctx.fill();
      ctx.restore();
      for (let i = 0; i < 7; i++) {                                         // the reflection on the water
        const y = hz + 12 + i * 14, w = (220 - i * 26) * (.85 + .15 * Math.sin(S.t * 2 + i));
        ctx.fillStyle = `rgba(241,200,130,${(.32 - i * .04).toFixed(2)})`; ctx.fillRect(960 - w / 2, y, w, 3);
      }
      K.line(ctx, 260, hz, 1660, hz, { color: rgba(C.goldHi, .7), glow: .6 });
      // the ruler
      const y = 280, x0 = 300, x1 = 1620, X = yr => lerp(x0, x1, (yr - 1912) / (2008 - 1912)), ra = S.p(.1, .9);
      K.line(ctx, x0, y, x1, y, { p: ra, color: rgba(C.gold, .6) });
      [[1912, '出生'], [1939, '逆市扫货'], [1954, '创立基金'], [1987, '获封爵士'], [2008, '95岁离世']].forEach(([yr, lb], i) => {
        const a = S.at(0, .2 + i * .3, .6), hi = yr === 1987 || yr === 2008;
        K.marker(ctx, X(yr), y, { alpha: a, r: hi ? 9 : 6, color: hi ? C.goldHi : C.gold });
        K.text(ctx, String(yr), X(yr), y - 22, { font: F.latin(500, 20), color: hi ? C.goldHi : C.gray, align: 'center', alpha: a, spacing: 2 });
        K.text(ctx, lb, X(yr), y + 44, { font: F.serif(700, 19), color: hi ? C.white : C.gray, align: 'center', alpha: a });
      });
    } },

  { id: 'final', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.05 },
    lines: ['他用一生告诉我们：投资是一场{反人性}的战役。', '想跑赢别人，就必须做得和别人{截然不同}。'],
    visual(ctx, S) {
      // the crowd all points one way; one gold arrow points the other — and goes
      const a0 = S.p(0, .8), drift = (S.t * 40) % 120;
      for (let r = 0; r < 5; r++) for (let c = 0; c < 12; c++) {
        if (r === 2 && c === 6) continue;
        const x = 330 + c * 115 + drift * (r % 2 ? .6 : 1) - 60, y = 420 + r * 78;
        chevron(ctx, x, y, 1, rgba(C.gray, .6), a0 * clamp(1 - Math.abs(x - 960) / 760));
      }
      const go = S.at(1, .2, 1.8, easeInOut), gx = lerp(1020, 430, go), gy = 420 + 2 * 78;
      if (go > 0) K.dotted(ctx, [[1020, gy], [gx + 30, gy]], 1, { gap: 8, r: 2, alpha: .9 });
      chevron(ctx, gx, gy, -1, C.goldHi, Math.max(a0, .001) * S.at(0, .6, .6), 1.6);
      ctx.save(); ctx.globalAlpha = S.at(0, .6, .6); ctx.fillStyle = rgba(C.goldHi, .16); ctx.beginPath(); ctx.arc(gx, gy, 46, 0, 6.2832); ctx.fill(); ctx.restore();
      K.tag(ctx, 960, 330, '反人性', { alpha: S.at(0, 1.2, .6) * (1 - S.at(1, 0, .5)), color: C.gold, font: F.serif(900, 24) });
      K.goldText(ctx, '世纪大师 · 功德圆满', 960, 300, 40, { alpha: S.at(1, 1.0, .9), spacing: 8 });
    } },

  /* ================= END ================= */
  { id: 'end', dur: 4.2, tr: 'zoom', noWatermark: true,
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
      K.text(ctx, '逆向投资先驱邓普顿 · 完', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 6, alpha: S.p(1.0, 1) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.4, 1) });
    } },
  ],
};
})();

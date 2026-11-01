/* ============================================================
   《价值投资之父格雷厄姆》 — content for the TradingNow film engine (index.html)

   A scene:
     { id, header?, lines?: [subtitle markup], visual?(ctx, S, K), tr?: transition into this scene,
       camera?: {z0,z1,x0,x1,y0,y1}, dur?: fixed seconds, noWatermark? }
   Subtitle markup:  {金色重点}  [红色/多头]  <绿色/空头>
   S (scene clock):  S.t, S.at(line, delay, dur) → eased 0..1, S.lin(...), S.p(sec, dur), S.beat(line)
   Transitions:      'zoom' | ['push', ±1] | 'sweep' | ['iris', [x,y]] | 'dissolve'

   One continuous story (no modules), paced to end with the supplied track (≈ 58 s).
   Smoother than the earlier films: longer transition overlap (1.4 s), gentler cameras, only soft eases
   (no overshoot, no screen shake), and a title card whose characters rise out of a blur.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, rgba, mix, F } = K;
const soft = x => { x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10); };      // smootherstep: zero velocity at both ends

/* the portrait (assets/portrait.jpg, supplied with the brief) — added to the page so ASSETS_READY waits for it */
const PHOTO = new Image(); PHOTO.src = 'assets/portrait.jpg'; PHOTO.hidden = true; document.body.appendChild(PHOTO);

/* one constant header for the whole story: no modules, only the book-title corner (label ' ' hides the module tag) */
const HD = { label: ' ', en: 'Benjamin Graham', zh: '《价值投资之父》' };

/* ---------- shared visual pieces ---------- */
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
  const W0 = PHOTO.naturalWidth || 1000, H0_ = PHOTO.naturalHeight || 1236;
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
/** a soft burst ring */
function ring(ctx, x, y, p, col = C.goldHi, R = 140) {
  if (p <= 0 || p >= 1) return;
  ctx.save(); ctx.strokeStyle = rgba(col, .7 * Math.sin(Math.PI * p)); ctx.lineWidth = 1.6; ctx.shadowColor = col; ctx.shadowBlur = 18;
  ctx.beginPath(); ctx.arc(x, y, 12 + soft(p) * R, 0, 6.2832); ctx.stroke(); ctx.restore();
}
/** a paper card */
function card(ctx, x, y, w, h, a) {
  ctx.save(); ctx.globalAlpha *= a; ctx.translate(x, y);
  ctx.fillStyle = 'rgba(28,23,15,.92)'; ctx.fillRect(0, 0, w, h); ctx.strokeStyle = rgba(C.gold, .55); ctx.lineWidth = 1.2; ctx.strokeRect(0, 0, w, h);
  ctx.strokeStyle = rgba(C.gold, .25); ctx.strokeRect(10, 10, w - 20, h - 20);
  return () => ctx.restore();
}
/** gold display text, character by character: each one rises out of a soft blur */
function riseText(ctx, str, cx, y, size, t, o = {}) {
  const chars = [...str], sp = o.spacing ?? 0, st = o.stagger ?? .12, d = o.dur ?? 1.2;
  ctx.save(); ctx.font = F.serif(900, size); const ws = chars.map(c => ctx.measureText(c).width + sp); ctx.restore();
  let x = cx - (ws.reduce((a, b) => a + b, 0) - sp) / 2;
  chars.forEach((c, i) => {
    const p = soft((t - i * st) / d);
    if (p > .002) {
      ctx.save(); if (p < .98) ctx.filter = `blur(${((1 - p) * 10).toFixed(2)}px)`;
      K.goldText(ctx, c, x, y + (1 - p) * 34, size, { align: 'left', alpha: p * (o.alpha ?? 1), glow: o.glow ?? 1 });
      ctx.restore();
    }
    x += ws[i];
  });
}

/* ---------- data ---------- */
// 1929–32: the fund falls ~70 %, then he wakes up
const CR = (() => { const pts = [], R = K.rng(29); for (let i = 0; i <= 90; i++) { const u = i / 90;
  let v = u < .22 ? 100 + 30 * soft(u / .22) : u < .7 ? 130 - 92 * soft((u - .22) / .48) : 38 + 30 * soft((u - .7) / .3);
  v += (R() - .5) * 5; pts.push([300 + u * 1000, 740 - v * 3.2]); } return pts; })();
const CRLO = CR.reduce((m, p, i) => p[1] > CR[m][1] ? i : m, 0);
// voting machine: short-term noise
const NOISE = K.gen.path([100, 108, 94, 106, 97, 111, 92, 104, 99], { per: 3, seed: 17, noise: 1.4, wick: .9 });
const chartNOISE = new K.Chart(NOISE.candles, { x: 260, y: 360, w: 560, h: 330 });

window.FILM = {
  title: '价值投资之父格雷厄姆',
  transition: 1.4,                                          // a longer, softer overlap between scenes
  fontScale: 1.55,
  subtitle: { x: 220, y: 912, size: 42, maxW: 1480 },     // 42 × FS 1.55 = 65px
  timing: { perChar: .104, base: .7, minLine: 2.0, pre: .3, post: .3 },   // one continuous story, paced to the track
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', dur: 4.6, camera: { z0: 1.05, z1: 1.0 }, lines: ['买股票，', '就是买{公司的一部分}。'],
    visual(ctx, S) {
      // a tape of gold price dots drifts in, then settles into the shape of a company
      const N = 168, R2 = K.rng(31), pts = []; let w = 0;
      for (let i = 0; i < N; i++) { w = w * .82 + (R2() - .5) * 18; pts.push([180 + i * 9.4, 520 + Math.sin(i * .09) * 60 + w]); }
      const cols = 14, rows = 10, gw = 34, bx = 960 - cols * gw / 2 + gw / 2, by = 420;
      const grid = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) grid.push([bx + c * gw, by + r * gw]);
      for (let k = 0; k < 28; k++) { const t = k / 27, half = cols * gw / 2 + 10; grid.push([960 - half + t * half * 2, by - 40 - (1 - Math.abs(t * 2 - 1)) * 120]); }   // the roof
      const reveal = S.lin(0, -.4, 1.6), form = (i) => soft((S.t - S.beat(1) - .1 - (i % 23) * .02) / 1.3);
      const mine = 4 * cols + 6;
      for (let i = 0; i < N * reveal && i < grid.length; i++) {
        const [x0, y0] = pts[i], [x1, y1] = grid[i], f = form(i);
        const own = i === mine, col = own ? mix(C.goldHi, C.red, f) : C.goldHi;
        ctx.fillStyle = rgba(col, .85 - f * .2 + (own ? f * .35 : 0)); ctx.shadowColor = own ? C.red : C.gold; ctx.shadowBlur = own ? 16 * f + 6 : 6;
        ctx.beginPath(); ctx.arc(lerp(x0, x1, f), lerp(y0, y1, f), lerp(1.8, own ? 7 : 3.2, f), 0, 6.2832); ctx.fill();
      }
      ctx.shadowBlur = 0;
      K.baseline(ctx, 180, 1740, 790, { p: S.at(0, 0, 1.6, soft), step: 52, alpha: .9 });
      const la = S.at(1, 1.3, .9, soft), [mx, my] = grid[mine];
      K.dash(ctx, mx + 12, my, 1460, my - 60, { p: la, alpha: .7, dash: [3, 6] });
      K.tag(ctx, 1470, my - 60, '你的一份', { alpha: la, color: C.red, align: 'left' });
      K.text(ctx, '公司', 960, by - 190, { font: F.serif(900, 30), color: C.goldHi, align: 'center', spacing: 14, alpha: S.at(1, 1.0, .9, soft), glow: .5 });
    } },

  /* ================= TITLE (the smooth one) ================= */
  { id: 'title', dur: 4.6, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    visual(ctx, S) {
      const cx = 960, t = S.t;
      // candle silhouettes fade in slowly behind, drifting left
      const bg = K.gen.path([100, 106, 103, 112, 109, 118, 114, 124, 121, 132], { per: 5, seed: 8 });
      const ch = new K.Chart(bg.candles, { x: 140 - t * 10, y: 210, w: 1700, h: 620 });
      ch.draw(ctx, bg.candles.length, { alpha: .14 * soft(t / 2.2), glow: 0, color: () => C.gold });
      // the English line tracks in: wide letter-spacing settling to its rest
      const e = soft((t - .1) / 1.8);
      K.text(ctx, 'BENJAMIN  GRAHAM', cx, 384, { font: F.latin(500, 22), color: C.gold, align: 'center', spacing: lerp(30, 12, e), alpha: e });
      // the title: each character rises out of a blur
      riseText(ctx, '价值投资之父', cx, 528, 72, t - .45, { spacing: 18, stagger: .13, dur: 1.3 });
      // one slow light sweep
      const sw = soft((t - 1.9) / 1.8);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(470, 1450, sw), g = ctx.createLinearGradient(x - 120, 0, x + 120, 0), a = .26 * Math.sin(Math.PI * sw);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, `rgba(255,240,200,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 120, 410, 240, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 340, soft((t - 1.2) / 1.8));
      const s = soft((t - 1.9) / 1.4);
      K.text(ctx, '华尔街无冕之王 · 本杰明·格雷厄姆', cx, 650 + (1 - s) * 14, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 6, alpha: s });
    } },

  /* ================= 人物画像 ================= */
  { id: 'intro', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03, x1: -12 },
    lines: ['他是华尔街无冕之王，{巴菲特}的终身恩师。', '他用绝对的{理性}，为华尔街注入{科学的骨骼}。'],
    visual(ctx, S) {
      const d = { x: 300, y: 236, w: 420, h: 520 }, rv = S.p(0, 1.6, soft);
      ctx.save(); ctx.beginPath(); const hh = d.h * rv; ctx.rect(d.x - 20, d.y + (d.h - hh) / 2, d.w + 40, hh); ctx.clip();
      photo(ctx, d, crop(lerp(1.0, 1.08, S.t / S.dur), .52, .4, d.w / d.h));
      ctx.restore();
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.6, 1.0, soft));
      K.text(ctx, '1894 — 1976', d.x + d.w / 2, d.y + d.h + 44, { font: F.latin(500, 18), color: C.goldHi, align: 'center', spacing: 6, alpha: S.p(1.0, 1.0, soft) });
      const x0 = 820, nm = S.p(.3, 1.2, soft);
      K.text(ctx, '本杰明·格雷厄姆', x0, 318 + (1 - nm) * 16, { font: F.serif(900, 40), color: C.white, alpha: nm, spacing: 4 });
      K.text(ctx, 'BENJAMIN GRAHAM', x0 + 2, 362, { font: F.latin(500, 19), color: C.gray, spacing: 6, alpha: S.p(.6, 1.0, soft) });
      K.tag(ctx, x0, 410, '价值投资之父', { align: 'left', alpha: S.p(.8, .9, soft), color: C.gold });
      K.tag(ctx, x0 + 230, 410, '巴菲特的老师', { align: 'left', alpha: S.at(0, 1.0, .9, soft), color: C.gold });
      const q = S.at(0, .4, 1.0, soft);
      K.text(ctx, '“', x0 - 6, 545, { font: F.latin(500, 64), color: C.gold, alpha: q * .9 });
      K.rich(ctx, '买股票，', { x: x0 + 70, y: 510, size: 30, weight: 700, t: S.t - S.beat(0) - .4, anchorTop: true, stagger: .04 });
      K.rich(ctx, '就是买{公司的一部分}。', { x: x0 + 70, y: 572, size: 30, weight: 700, t: S.t - S.beat(0) - .8, anchorTop: true, stagger: .04 });
      // the skeleton: a fine gold blueprint grid drawn under the quote
      const g = S.at(1, 0, 1.8, soft), y0 = 640, y1 = 740, x1 = x0 + 800;
      ctx.save(); ctx.globalAlpha = g; ctx.strokeStyle = rgba(C.gold, .35); ctx.lineWidth = 1;
      for (let k = 0; k <= 4; k++) { const y = y0 + k * 25; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(lerp(x0, x1, g), y); ctx.stroke(); }
      for (let k = 0; k <= 32; k++) { const x = x0 + k * 25; if (x > lerp(x0, x1, g)) break; ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
      ctx.restore();
      K.tag(ctx, x0 + 400, 690, '理性 · 科学的骨骼', { alpha: S.at(1, 1.0, .9, soft), color: C.gold, font: F.serif(900, 22) });
    } },

  { id: 'crash', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03, x1: -12 },
    lines: ['1929年大萧条，他{九死一生}，', '历经<巨亏>后彻底觉醒。'],
    visual(ctx, S) {
      const p = S.lin(0, 0, S.beat(1) + .3) * (CRLO / CR.length) + S.lin(1, .3, 1.8) * (1 - CRLO / CR.length);
      K.baseline(ctx, 300, 1300, 770, { p: S.at(0, 0, 1.2, soft) });
      K.text(ctx, '1929', 300, 806, { font: F.latin(500, 20), color: C.gray, spacing: 4, alpha: S.at(0, .2, .9, soft) });
      K.text(ctx, '基金净值 · 示意', 1300, 806, { font: F.serif(500, 16), color: C.gray, align: 'right', alpha: S.at(0, .2, .9, soft) });
      const vis = CR.slice(0, Math.max(2, Math.round(p * CR.length)));
      ctx.save(); ctx.beginPath(); ctx.moveTo(vis[0][0], 770); vis.forEach(q => ctx.lineTo(q[0], q[1])); ctx.lineTo(vis[vis.length - 1][0], 770); ctx.closePath();
      const g = ctx.createLinearGradient(0, 300, 0, 770); g.addColorStop(0, rgba(C.green, .16)); g.addColorStop(1, rgba(C.green, 0)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      K.dotted(ctx, CR, p, { gap: 6, r: 2 });
      const [lx, ly] = CR[CRLO], la = clamp((p * CR.length - CRLO) / 8);
      K.marker(ctx, lx, ly + 16, { alpha: la, r: 10, color: C.green, label: '巨亏 −70%', pos: 'below', font: F.serif(900, 22), labelColor: C.green });
      K.dash(ctx, CR[20][0], CR[20][1], 1320, CR[20][1], { p: S.at(0, 1.2, 1.2, soft), alpha: .4, dash: [3, 8] });
      // the awakening: a light comes on at the bottom
      const aw = S.at(1, .4, 1.4, soft);
      if (aw > 0) {
        const r = ctx.createRadialGradient(lx, ly, 0, lx, ly, 260); r.addColorStop(0, rgba(C.goldHi, .3 * aw)); r.addColorStop(1, rgba(C.goldHi, 0));
        ctx.fillStyle = r; ctx.fillRect(lx - 260, ly - 260, 520, 520);
        ring(ctx, lx, ly, S.lin(1, .4, 1.6), C.goldHi, 160);
      }
      K.goldText(ctx, '觉 醒', 1520, 500, 52, { alpha: S.at(1, .9, 1.2, soft), glow: 1 });
      K.text(ctx, '九死一生', 1520, 566, { font: F.serif(700, 22), color: C.gray, align: 'center', spacing: 8, alpha: S.at(0, 1.0, 1.0, soft) });
    } },

  { id: 'margin', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['他提出名震天下的“{安全边际}”法则：', '用四折甚至三折的价格，去买公司。'],
    visual(ctx, S) {
      // intrinsic value vs price: the gap is the margin of safety
      const base = 770, top = 300, H = base - top, a = S.at(0, 0, 1.2, soft);
      const vx = 640, px = 1040, w = 220;
      ctx.save(); ctx.globalAlpha = a;
      const gv = ctx.createLinearGradient(0, top, 0, base); gv.addColorStop(0, '#F5DFA0'); gv.addColorStop(1, '#8A6A2E');
      ctx.fillStyle = gv; ctx.shadowColor = rgba(C.gold, .4); ctx.shadowBlur = 24; ctx.fillRect(vx - w / 2, base - H * a, w, H * a);
      ctx.restore();
      K.text(ctx, '内在价值', vx, base + 46, { font: F.serif(900, 26), color: C.goldHi, align: 'center', spacing: 6, alpha: a });
      K.text(ctx, '100', vx, top - 20, { font: F.latin(500, 30), color: C.goldHi, align: 'center', alpha: a });
      // the price falls: 100 → 40 → 30
      const f1 = S.at(0, .9, 1.6, soft), f2 = S.at(1, .4, 1.4, soft), pv = 100 - 60 * f1 - 10 * f2, ph = H * pv / 100;
      ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = rgba(C.white, .82); ctx.fillRect(px - w / 2, base - ph, w, ph); ctx.restore();
      K.text(ctx, '买入价格', px, base + 46, { font: F.serif(900, 26), color: C.white, align: 'center', spacing: 6, alpha: a });
      K.text(ctx, String(Math.round(pv)), px, base - ph - 20, { font: F.latin(500, 30), color: C.white, align: 'center', alpha: a });
      K.dash(ctx, vx + w / 2, top, px + w / 2 + 40, top, { p: f1, alpha: .6, dash: [4, 7] });
      const mg = clamp(f1 * 1.4 - .3);
      K.vbrace(ctx, px + w / 2 + 50, top, base - ph, '安全边际', { p: mg, labelColor: C.goldHi, sub: 'MARGIN OF SAFETY' });
      K.text(ctx, f2 > .5 ? '三 折' : '四 折', 1560, 640, { font: F.serif(900, 40), color: C.red, align: 'center', spacing: 6, alpha: S.at(1, 0, .9, soft), glow: .5, glowColor: C.red });
    } },

  { id: 'weigh', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03 },
    lines: ['“股市短期是{投票机}，', '长期是{称重机}。”'],
    visual(ctx, S) {
      // left: the voting machine — noise, every candle a vote
      const a = S.at(0, 0, 1.0, soft);
      ctx.save(); ctx.globalAlpha = a * (1 - S.at(1, .2, 1.2, soft) * .55);
      chartNOISE.draw(ctx, S.lin(0, 0, 1.8) * NOISE.candles.length, { glow: .25 });
      ctx.restore();
      K.text(ctx, '投票机', 540, 300, { font: F.serif(900, 30), color: C.white, align: 'center', spacing: 10, alpha: a });
      K.text(ctx, '短期 · 情绪', 540, 760, { font: F.serif(700, 20), color: C.gray, align: 'center', spacing: 6, alpha: a });
      // right: the weighing machine — a balance that swings, then settles level
      const b = S.at(1, 0, 1.0, soft), cx = 1340, cy = 470, L = 220;
      const ang = .32 * Math.exp(-Math.max(0, S.t - S.beat(1)) * 1.1) * Math.cos(Math.max(0, S.t - S.beat(1)) * 4.2) * b + .32 * (1 - b);
      ctx.save(); ctx.globalAlpha = b; ctx.strokeStyle = C.goldHi; ctx.fillStyle = C.goldHi; ctx.lineWidth = 3; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 14;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx - 60, 740); ctx.lineTo(cx + 60, 740); ctx.closePath(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - 120, 740); ctx.lineTo(cx + 120, 740); ctx.stroke();
      const ex = Math.cos(ang) * L, ey = Math.sin(ang) * L;
      ctx.beginPath(); ctx.moveTo(cx - ex, cy - ey); ctx.lineTo(cx + ex, cy + ey); ctx.stroke();
      for (const s of [-1, 1]) {
        const hx = cx + s * ex, hy = cy + s * ey;
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - 50, hy + 90); ctx.moveTo(hx, hy); ctx.lineTo(hx + 50, hy + 90); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(hx, hy + 92, 70, 12, 0, 0, Math.PI); ctx.stroke();
      }
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, 6.2832); ctx.fill();
      ctx.restore();
      K.text(ctx, '称重机', cx, 300, { font: F.serif(900, 30), color: C.goldHi, align: 'center', spacing: 10, alpha: b, glow: .5 });
      K.text(ctx, '长期 · 价值', cx, 800, { font: F.serif(700, 20), color: C.gray, align: 'center', spacing: 6, alpha: b });
    } },

  { id: 'cigar', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['大萧条后的黑暗年代，他独创“{烟蒂投资法}”，', '带领基金创造[年化17%]的奇迹。'],
    visual(ctx, S) {
      // the cigar butt on the pavement: one free puff left
      const a = S.at(0, 0, 1.2, soft), cx = 560, cy = 560;
      ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.rotate(-.12);
      const g = ctx.createLinearGradient(0, -22, 0, 22); g.addColorStop(0, '#8A6A3E'); g.addColorStop(.5, '#C9A26A'); g.addColorStop(1, '#5A4222');
      ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-130, -22, 200, 44, 10); ctx.fill();
      ctx.fillStyle = rgba(C.white, .85); ctx.fillRect(-130, -22, 46, 44);
      const fl = .75 + .25 * Math.sin(S.t * 5) * Math.sin(S.t * 2.3);
      const em = ctx.createRadialGradient(72, 0, 0, 72, 0, 40); em.addColorStop(0, `rgba(255,170,90,${.95 * fl})`); em.addColorStop(1, 'rgba(229,72,77,0)');
      ctx.fillStyle = em; ctx.beginPath(); ctx.arc(72, 0, 40, 0, 6.2832); ctx.fill();
      ctx.restore();
      for (let k = 0; k < 4; k++) {                                       // smoke, curling up
        const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push([cx + 70 + Math.sin(u * 7 + S.t * 1.6 + k) * 20 * u + k * 6, cy - 20 - u * 240]); }
        K.dotted(ctx, pts, 1, { gap: 9, r: 1.4, alpha: .35 * a * (1 - k * .2), glow: false, color: C.gray });
      }
      K.text(ctx, '最后一口 · 几乎免费', cx, 680, { font: F.serif(700, 22), color: C.gray, align: 'center', spacing: 6, alpha: S.at(0, .9, 1.0, soft) });
      K.tag(ctx, cx, 300, '烟蒂投资法', { alpha: S.at(0, 1.4, .9, soft), color: C.gold, font: F.serif(900, 24) });
      // seventeen percent a year, compounding
      const p = S.at(1, 0, 2.0, x => soft(x)), pts = [];
      for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([980 + u * 660, 760 - (Math.pow(1.17, u * 20) - 1) / (Math.pow(1.17, 20) - 1) * 430]); }
      K.baseline(ctx, 980, 1640, 770, { p: S.at(1, 0, 1.0, soft), step: 44 });
      K.dotted(ctx, pts, p, { gap: 7, r: 2.2 });
      K.text(ctx, '基金收益 · 示意', 1640, 806, { font: F.serif(500, 16), color: C.gray, align: 'right', alpha: S.at(1, 0, 1.0, soft) });
      const n = S.at(1, .6, 1.4, soft);
      K.goldText(ctx, Math.round(17 * n) + '%', 1150, 420, 64, { alpha: n, glow: 1.1 });
      K.text(ctx, '年化收益', 1150, 480, { font: F.serif(900, 24), color: C.red, align: 'center', spacing: 8, alpha: n });
    } },

  { id: 'mrmarket', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03 },
    lines: ['他不听内幕，只看{资产负债表}；', '{理性}，是对抗“市场先生”的终极武器。'],
    visual(ctx, S) {
      // the balance sheet
      const a = S.at(0, 0, 1.2, soft);
      if (a > 0) {
        const done = card(ctx, 260, 280, 560, 440, a);
        K.text(ctx, 'BALANCE SHEET', 280, 60, { font: F.latin(500, 18), color: C.gold, align: 'center', spacing: 8 });
        K.text(ctx, '资产负债表', 280, 116, { font: F.serif(900, 32), color: C.white, align: 'center', spacing: 6 });
        [['资产', .92, C.goldHi], ['负债', .38, C.green], ['净资产', .54, C.red]].forEach(([lb, v, col], i) => {
          const y = 190 + i * 76, p = S.at(0, .5 + i * .25, 1.0, soft);
          K.text(ctx, lb, 50, y + 10, { font: F.serif(700, 22), color: C.gray });
          ctx.fillStyle = rgba(col, .8); ctx.fillRect(170, y - 12, 330 * v * p, 22);
        });
        done();
      }
      K.tag(ctx, 540, 770, '× 内幕消息', { alpha: S.at(0, 1.4, .9, soft), color: C.gray });
      // Mr. Market's moods vs. one steady line
      const b = S.at(1, 0, 1.0, soft), x0 = 960, x1 = 1660, ym = 520, pts = [];
      for (let i = 0; i <= 140; i++) { const u = i / 140; pts.push([x0 + u * (x1 - x0), ym + Math.sin(u * 15 + S.t * 1.4) * 150 * (.6 + .4 * Math.sin(u * 4))]); }
      K.dotted(ctx, pts, b, { gap: 6, r: 1.6, color: C.gray, glow: false, alpha: .8 });
      K.text(ctx, '狂喜', x1 + 4, ym - 150, { font: F.serif(700, 20), color: C.red, alpha: b * .9 });
      K.text(ctx, '沮丧', x1 + 4, ym + 170, { font: F.serif(700, 20), color: C.green, alpha: b * .9 });
      K.text(ctx, '市场先生', (x0 + x1) / 2, 300, { font: F.serif(900, 28), color: C.white, align: 'center', spacing: 8, alpha: b });
      const r = S.at(1, .8, 1.4, soft);
      K.line(ctx, x0, ym, x1, ym, { p: r, color: C.goldHi, width: 3, glow: .9 });
      K.tag(ctx, (x0 + x1) / 2, ym + 220, '理性', { alpha: S.at(1, 1.4, .9, soft), color: C.gold, font: F.serif(900, 24) });
    } },

  { id: 'legacy', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03 },
    lines: ['1976年，一代宗师传奇落幕。', '他留下的《证券分析》《聪明的投资者》，', '至今仍是投资者的{圣经}。'],
    visual(ctx, S) {
      // a lifetime ruler, then the two books rise
      const y = 300, X = yr => lerp(420, 1500, (yr - 1894) / (1976 - 1894)), ra = S.at(0, 0, 1.4, soft);
      K.line(ctx, 420, y, lerp(420, 1500, ra), y, { color: rgba(C.gold, .6) });
      [[1894, '出生'], [1934, '《证券分析》'], [1949, '《聪明的投资者》'], [1976, '落幕']].forEach(([yr, lb], i) => {
        const a = i === 0 || i === 3 ? S.at(0, .2 + i * .3, .9, soft) : S.at(1, (i - 1) * .5, .9, soft);
        K.marker(ctx, X(yr), y, { alpha: a, r: i === 3 ? 9 : 6, color: i === 3 ? C.goldHi : C.gold });
        K.text(ctx, String(yr), X(yr), y - 22, { font: F.latin(500, 20), color: C.gray, align: 'center', alpha: a, spacing: 2 });
        K.text(ctx, lb, X(yr), y + (i === 2 ? 80 : 44), { font: F.serif(700, 19), color: i === 1 || i === 2 ? C.goldHi : C.gray, align: 'center', alpha: a });
      });
      [['证券分析', 'SECURITY ANALYSIS', 1934, 760], ['聪明的投资者', 'THE INTELLIGENT INVESTOR', 1949, 1160]].forEach(([zh, en, yr, x], i) => {
        const p = S.at(1, .2 + i * .5, 1.4, soft);
        if (p <= 0) return;
        const bw = 280, bh = 360, bx = x - bw / 2, by = 440 + (1 - p) * 40;
        ctx.save(); ctx.globalAlpha = p;
        const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#2A2113'); g.addColorStop(.08, '#3A2E1A'); g.addColorStop(1, '#1E180E');
        ctx.fillStyle = g; ctx.shadowColor = rgba(C.gold, .35); ctx.shadowBlur = 30; ctx.fillRect(bx, by, bw, bh); ctx.shadowBlur = 0;
        ctx.strokeStyle = rgba(C.gold, .7); ctx.lineWidth = 1.2; ctx.strokeRect(bx + 14, by + 14, bw - 28, bh - 28);
        ctx.restore();
        K.text(ctx, zh, x, by + 150, { font: F.serif(900, zh.length > 4 ? 26 : 30), color: C.goldHi, align: 'center', spacing: 4, alpha: p });
        K.text(ctx, en, x, by + 198, { font: F.latin(500, 10), color: C.gold, align: 'center', spacing: 1, alpha: p });
        K.text(ctx, String(yr), x, by + bh - 40, { font: F.latin(500, 18), color: C.gray, align: 'center', spacing: 4, alpha: p });
      });
      const gl = S.at(2, .2, 1.4, soft);
      if (gl > 0) { const r = ctx.createRadialGradient(960, 600, 0, 960, 600, 520); r.addColorStop(0, rgba(C.goldHi, .14 * gl)); r.addColorStop(1, rgba(C.goldHi, 0)); ctx.fillStyle = r; ctx.fillRect(440, 260, 1040, 640); }
      K.tag(ctx, 1520, 600, '投资圣经', { alpha: gl, color: C.gold, font: F.serif(900, 24) });
    } },

  { id: 'final', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    lines: ['市场永远在变，', '但格雷厄姆的{底层逻辑}，永不过时。'],
    visual(ctx, S) {
      // the book, close: the film rests on it
      const p = S.p(0, 1.6, soft), bx = 300, by = 250, bw = 420, bh = 540;
      ctx.save(); ctx.globalAlpha = p;
      const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#2A2113'); g.addColorStop(.06, '#3A2E1A'); g.addColorStop(1, '#1E180E');
      ctx.fillStyle = g; ctx.shadowColor = rgba(C.gold, .4); ctx.shadowBlur = 40; ctx.fillRect(bx, by, bw, bh); ctx.shadowBlur = 0;
      ctx.strokeStyle = rgba(C.gold, .75); ctx.lineWidth = 1.4; ctx.strokeRect(bx + 18, by + 18, bw - 36, bh - 36);
      ctx.restore();
      K.text(ctx, '聪明的投资者', bx + bw / 2, by + 230, { font: F.serif(900, 34), color: C.goldHi, align: 'center', spacing: 4, alpha: p });
      K.text(ctx, 'THE INTELLIGENT INVESTOR', bx + bw / 2, by + 284, { font: F.latin(500, 12), color: C.gold, align: 'center', spacing: 2, alpha: p });
      K.text(ctx, 'BENJAMIN GRAHAM', bx + bw / 2, by + bh - 60, { font: F.latin(500, 16), color: C.gray, align: 'center', spacing: 6, alpha: p });
      const sw = soft((S.t - 1.0) / 2.2);
      if (sw > 0 && sw < 1) { ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(bx - 150, bx + bw + 150, sw), gg = ctx.createLinearGradient(x - 110, 0, x + 110, 0), a = .2 * Math.sin(Math.PI * sw);
        gg.addColorStop(0, 'rgba(255,236,190,0)'); gg.addColorStop(.5, `rgba(255,236,190,${a.toFixed(3)})`); gg.addColorStop(1, 'rgba(255,236,190,0)');
        ctx.fillStyle = gg; ctx.fillRect(x - 110, by, 220, bh); ctx.restore(); }
      riseText(ctx, '奠基华尔街 · 永恒教父', 1230, 420, 40, S.t - S.beat(1) - .2, { spacing: 6, stagger: .08, dur: 1.1 });
      const q = S.at(1, 1.4, 1.2, soft);
      K.rule(ctx, 1230, 470, 300, q);
      K.text(ctx, '“投资是一场智力游戏，', 1230, 560, { font: F.serif(700, 26), color: C.white, align: 'center', alpha: q });
      K.text(ctx, '而不是情绪的狂欢。”', 1230, 616, { font: F.serif(700, 26), color: C.white, align: 'center', alpha: q });
    } },

  /* ================= END ================= */
  { id: 'end', dur: 4.4, tr: 'dissolve', noWatermark: true,
    visual(ctx, S) {
      const a = S.p(.3, 1.4, soft);
      ctx.save(); ctx.translate(960, 470); const z = lerp(.95, 1, soft(S.t / 2.6)); ctx.scale(z, z);
      const L = document.getElementById('logo'), lw = 760, lh = lw * L.naturalHeight / L.naturalWidth;   // the channel's own logo
      ctx.globalAlpha = a; ctx.shadowColor = rgba(C.goldHi, .35); ctx.shadowBlur = 40;
      ctx.drawImage(L, -lw / 2, -lh / 2, lw, lh); ctx.shadowBlur = 0;
      const sw = soft((S.t - 1.0) / 1.8);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.beginPath(); ctx.rect(-lw / 2, -lh / 2, lw, lh); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(-lw / 2 - 120, lw / 2 + 120, sw), g = ctx.createLinearGradient(x - 90, 0, x + 90, 0);
        g.addColorStop(0, 'rgba(255,236,190,0)'); g.addColorStop(.5, 'rgba(255,236,190,.22)'); g.addColorStop(1, 'rgba(255,236,190,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 90, -lh / 2, 180, lh); ctx.restore();
      }
      ctx.restore();
      K.rule(ctx, 960, 560, 340, S.p(.8, 1.4, soft));
      K.text(ctx, '价值投资之父格雷厄姆 · 完', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 6, alpha: S.p(1.1, 1.2, soft) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.5, 1.2, soft) });
    } },
  ],
};
})();

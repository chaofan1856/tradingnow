/* ============================================================
   《量化之王詹姆斯西蒙斯》 — content for the TradingNow film engine (index.html)

   A scene:
     { id, header?, lines?: [subtitle markup], visual?(ctx, S, K), tr?: transition into this scene,
       camera?: {z0,z1,x0,x1,y0,y1}, dur?: fixed seconds, noWatermark? }
   Subtitle markup:  {金色重点}  [红色/多头]  <绿色/空头>
   S (scene clock):  S.t, S.at(line, delay, dur) → eased 0..1, S.lin(...), S.p(sec, dur), S.beat(line)
   Transitions:      'zoom' | ['push', ±1] | 'sweep' | ['iris', [x,y]] | 'dissolve'

   One continuous story (no modules), paced to end with the supplied track (≈ 58 s).
   Same smooth motion as the earlier master films: 1.4 s transitions, gentle cameras, only soft eases,
   a title whose characters rise out of a blur.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, rgba, mix, F } = K;
const soft = x => { x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10); };      // smootherstep: zero velocity at both ends

/* the portrait (assets/portrait.jpg, supplied with the brief) — added to the page so ASSETS_READY waits for it */
const PHOTO = new Image(); PHOTO.src = 'assets/portrait.jpg'; PHOTO.hidden = true; document.body.appendChild(PHOTO);

/* one constant header for the whole story: no modules, only the book-title corner (label ' ' hides the module tag) */
const HD = { label: ' ', en: 'James Simons', zh: '《量化之王》' };

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
  const W0 = PHOTO.naturalWidth || 1072, H0_ = PHOTO.naturalHeight || 1324;
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

/** a book, face on */
function book(ctx, x, y, w, h, a, zh, en, foot, zs = 30) {
  if (a <= .002) return;
  ctx.save(); ctx.globalAlpha *= a;
  const g = ctx.createLinearGradient(x, 0, x + w, 0); g.addColorStop(0, '#2A2113'); g.addColorStop(.06, '#3A2E1A'); g.addColorStop(1, '#1E180E');
  ctx.fillStyle = g; ctx.shadowColor = rgba(C.gold, .4); ctx.shadowBlur = 34; ctx.fillRect(x, y, w, h); ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba(C.gold, .75); ctx.lineWidth = 1.4; ctx.strokeRect(x + 16, y + 16, w - 32, h - 32); ctx.restore();
  K.text(ctx, zh, x + w / 2, y + h * .42, { font: F.serif(900, zs), color: C.goldHi, align: 'center', spacing: 4, alpha: a });
  K.text(ctx, en, x + w / 2, y + h * .42 + 48, { font: F.latin(500, 12), color: C.gold, align: 'center', spacing: 2, alpha: a });
  K.text(ctx, foot, x + w / 2, y + h - 46, { font: F.latin(500, 15), color: C.gray, align: 'center', spacing: 4, alpha: a });
}

/* ---------- data ---------- */
// a bull and a bear market (illustrative), and one steady equity line through both
const MKT = []; for (let i = 0; i <= 120; i++) { const u = i / 120;
  const v = u < .45 ? 40 + 260 * Math.sin(u / .45 * Math.PI / 2) : 300 - 230 * Math.sin((u - .45) / .55 * Math.PI / 2 * 1.1);
  MKT.push([280 + u * 1100, 740 - v + Math.sin(i * .9) * 14 + Math.sin(i * .37) * 22]); }
const EQ = []; for (let i = 0; i <= 120; i++) { const u = i / 120; EQ.push([280 + u * 1100, 740 - 20 - 380 * (Math.pow(1.6, u * 5) - 1) / (Math.pow(1.6, 5) - 1) + Math.sin(i * .7) * 3]); }

window.FILM = {
  title: '量化之王詹姆斯西蒙斯',
  transition: 1.4,                                          // a longer, softer overlap between scenes
  fontScale: 1.55,
  subtitle: { x: 220, y: 912, size: 42, maxW: 1480 },     // 42 × FS 1.55 = 65px
  timing: { perChar: .115, base: .78, minLine: 2.0, pre: .3, post: .3 },   // one continuous story, paced to the track
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', dur: 4.6, camera: { z0: 1.05, z1: 1.0 }, lines: ['不靠运气，', '只靠{概率}和{模型}。'],
    visual(ctx, S) {
      // random dots rain down and settle into a bell curve
      const R2 = K.rng(91), bins = 31, bw = 40, x0 = 960 - bins * bw / 2, base = 740;
      const counts = Array.from({ length: bins }, (_, i) => Math.round(26 * Math.exp(-(((i - 15) / 5.2) ** 2))));
      let k = 0;
      counts.forEach((c, i) => { for (let j = 0; j < c; j++, k++) {
        const d = R2() * 1.8, t = soft((S.t - d) / 1.2), sx = 300 + R2() * 1320, sy = 240 + R2() * 120;
        const tx = x0 + i * bw + bw / 2, ty = base - 8 - j * 15, settle = S.at(1, -.2, 1.4, soft);
        const x = lerp(sx + (R2() - .5) * 200, lerp(sx, tx, .3), t), y = lerp(sy, sy + 220, t);
        const fx = lerp(x, tx, settle), fy = lerp(y, ty, settle);
        ctx.fillStyle = rgba(settle > .5 ? C.goldHi : C.white, (.4 + .5 * t) * clamp(t * 3)); ctx.beginPath(); ctx.arc(fx, fy, 3.2, 0, 6.2832); ctx.fill();
      } });
      const curve = []; for (let i = 0; i <= 120; i++) { const u = i / 120 * (bins - 1); curve.push([x0 + u * bw + bw / 2, base - 8 - 26 * Math.exp(-(((u - 15) / 5.2) ** 2)) * 15 - 14]); }
      K.dotted(ctx, curve, S.at(1, .9, 1.4, soft), { gap: 7, r: 2 });
      K.baseline(ctx, x0, x0 + bins * bw, base + 4, { p: S.at(0, 0, 1.2, soft), step: 40 });
      K.text(ctx, '运气', 520, 300, { font: F.serif(700, 24), color: C.gray, align: 'center', spacing: 8, alpha: S.at(0, .3, .8, soft) * (1 - S.at(1, 0, .8, soft)) });
      K.text(ctx, '概率', 960, 300, { font: F.serif(900, 30), color: C.goldHi, align: 'center', spacing: 10, alpha: S.at(1, 1.0, 1.0, soft), glow: .6 });
    } },

  /* ================= TITLE ================= */
  { id: 'title', dur: 4.6, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    visual(ctx, S) {
      const cx = 960, t = S.t;
      const bg = K.gen.path([100, 108, 104, 116, 112, 126, 121, 138, 133, 152], { per: 5, seed: 17 });
      const ch = new K.Chart(bg.candles, { x: 140 - t * 10, y: 210, w: 1700, h: 620 });
      ch.draw(ctx, bg.candles.length, { alpha: .14 * soft(t / 2.2), glow: 0, color: () => C.gold });
      const e = soft((t - .1) / 1.8);
      K.text(ctx, 'JAMES  SIMONS', cx, 384, { font: F.latin(500, 22), color: C.gold, align: 'center', spacing: lerp(30, 12, e), alpha: e });
      riseText(ctx, '量化之王', cx, 528, 72, t - .45, { spacing: 26, stagger: .15, dur: 1.3 });
      const sw = soft((t - 1.9) / 1.8);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(560, 1360, sw), g = ctx.createLinearGradient(x - 120, 0, x + 120, 0), a = .26 * Math.sin(Math.PI * sw);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, `rgba(255,240,200,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 120, 410, 240, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 340, soft((t - 1.2) / 1.8));
      const s = soft((t - 1.9) / 1.4);
      K.text(ctx, '用数学征服华尔街 · 詹姆斯·西蒙斯', cx, 650 + (1 - s) * 14, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 6, alpha: s });
    } },

  /* ================= 人物画像 ================= */
  { id: 'intro', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03, x1: -12 },
    lines: ['他是华尔街最神秘的{量化之王}，', '一位用代码征服金融市场的{顶级数学家}。'],
    visual(ctx, S) {
      const d = { x: 300, y: 236, w: 420, h: 520 }, rv = S.p(0, 1.6, soft);
      ctx.save(); ctx.beginPath(); const hh = d.h * rv; ctx.rect(d.x - 20, d.y + (d.h - hh) / 2, d.w + 40, hh); ctx.clip();
      photo(ctx, d, crop(lerp(1.35, 1.45, S.t / S.dur), .48, .3, d.w / d.h));
      ctx.restore();
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.6, 1.0, soft));
      K.text(ctx, '1938 — 2024', d.x + d.w / 2, d.y + d.h + 44, { font: F.latin(500, 18), color: C.goldHi, align: 'center', spacing: 6, alpha: S.p(1.0, 1.0, soft) });
      const x0 = 840, nm = S.p(.3, 1.2, soft);
      K.text(ctx, '詹姆斯·西蒙斯', x0, 318 + (1 - nm) * 16, { font: F.serif(900, 40), color: C.white, alpha: nm, spacing: 4 });
      K.text(ctx, 'JAMES SIMONS', x0 + 2, 362, { font: F.latin(500, 19), color: C.gray, spacing: 6, alpha: S.p(.6, 1.0, soft) });
      K.tag(ctx, x0, 410, '量化投资之王', { align: 'left', alpha: S.p(.8, .9, soft), color: C.gold });
      K.tag(ctx, x0 + 230, 410, '顶级数学家', { align: 'left', alpha: S.at(1, .3, .9, soft), color: C.gold });
      const q = S.at(0, .4, 1.0, soft);
      K.text(ctx, '“', x0 - 6, 545, { font: F.latin(500, 64), color: C.gold, alpha: q * .9 });
      K.rich(ctx, '不靠运气，', { x: x0 + 70, y: 510, size: 30, weight: 700, t: S.t - S.beat(0) - .4, anchorTop: true, stagger: .04 });
      K.rich(ctx, '只靠{概率}和{模型}。', { x: x0 + 70, y: 572, size: 30, weight: 700, t: S.t - S.beat(0) - .8, anchorTop: true, stagger: .04 });
      K.line(ctx, x0, 614, x0 + 760, 614, { p: q, color: rgba(C.gold, .4) });
    } },

  { id: 'math', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03 },
    lines: ['他曾是破译密码的专家，', '与陈省身共同提出“{陈-西蒙斯理论}”。'],
    visual(ctx, S) {
      // a cipher strip decodes, then the blackboard fills
      const plain = 'PATTERNS', R3 = K.rng(13), dec = S.at(0, .4, 1.6, soft);
      [...plain].forEach((ch, i) => {
        const done = dec * plain.length > i + .5, c = done ? ch : 'XQJZKVWY'[(i * 3 + Math.floor(S.t * 12)) % 8];
        const x = 560 + i * 100, a = S.at(0, i * .06, .6, soft);
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = rgba(done ? C.goldHi : C.gray, .8); ctx.lineWidth = 1.2; ctx.strokeRect(x - 38, 250, 76, 90); ctx.restore();
        K.text(ctx, c, x, 312, { font: F.latin(500, 36), color: done ? C.goldHi : C.gray, align: 'center', alpha: a });
      });
      K.text(ctx, '密码破译', 1460, 312, { font: F.serif(900, 24), color: C.gray, align: 'left', spacing: 6, alpha: S.at(0, .6, .8, soft) });
      const b = S.at(1, 0, 1.2, soft);
      ctx.save(); ctx.globalAlpha = b; ctx.fillStyle = 'rgba(16,20,16,.85)'; ctx.fillRect(380, 420, 1160, 330); ctx.strokeStyle = rgba(C.gold, .55); ctx.lineWidth = 2; ctx.strokeRect(380, 420, 1160, 330); ctx.restore();
      const w = S.at(1, .3, 1.8, x => x);
      ctx.save(); ctx.beginPath(); ctx.rect(380, 420, 400 + 760 * w, 330); ctx.clip();
      K.text(ctx, 'CS(A) = ∫ tr( A∧dA + 2/3 A∧A∧A )', 960, 560, { font: `italic ${F.latin(500, 34)}`, color: C.white, align: 'center', alpha: b });
      ctx.restore();
      K.text(ctx, '陈-西蒙斯理论 · CHERN–SIMONS', 960, 680, { font: F.serif(900, 26), color: C.goldHi, align: 'center', spacing: 4, alpha: S.at(1, 1.2, 1.0, soft), glow: .5 });
    } },

  { id: 'medallion', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['40岁转行金融，创立{大奖章基金}。', '只招{数学家}和{物理学家}，不要华尔街出身的人。'],
    visual(ctx, S) {
      // the medal
      const m = S.at(0, .2, 1.4, soft), cx = 560, cy = 520;
      if (m > 0) {
        ctx.save(); ctx.globalAlpha = m;
        ctx.fillStyle = rgba(C.red, .8); ctx.beginPath(); ctx.moveTo(cx - 60, cy - 250); ctx.lineTo(cx - 10, cy - 130); ctx.lineTo(cx - 50, cy - 130); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + 60, cy - 250); ctx.lineTo(cx + 10, cy - 130); ctx.lineTo(cx + 50, cy - 130); ctx.closePath(); ctx.fill();
        const g = ctx.createRadialGradient(cx - 40, cy - 40, 20, cx, cy, 150); g.addColorStop(0, '#FFF3CC'); g.addColorStop(.6, '#E2BE73'); g.addColorStop(1, '#8A6A2E');
        ctx.fillStyle = g; ctx.shadowColor = rgba(C.goldHi, .6); ctx.shadowBlur = 40; ctx.beginPath(); ctx.arc(cx, cy, 140 * (.9 + .1 * m), 0, 6.2832); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(122,90,36,.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, 112, 0, 6.2832); ctx.stroke();
        ctx.restore();
        K.text(ctx, 'MEDALLION', cx, cy - 6, { font: F.latin(500, 24), color: '#3A2A10', align: 'center', spacing: 4, alpha: m });
        K.text(ctx, '1988', cx, cy + 40, { font: F.latin(500, 22), color: '#3A2A10', align: 'center', spacing: 4, alpha: m });
        K.text(ctx, '大奖章基金', cx, cy + 210, { font: F.serif(900, 28), color: C.goldHi, align: 'center', spacing: 8, alpha: m });
      }
      // the team
      [['数学家', 1160, 360], ['物理学家', 1460, 360], ['统计学家', 1160, 500], ['计算机科学家', 1460, 500]].forEach(([nm, x, y], i) => {
        const a = S.at(1, .1 + i * .2, .8, soft);
        K.tag(ctx, x, y, nm, { alpha: a, color: C.gold, font: F.serif(900, 22) });
      });
      const ws = S.at(1, 1.0, .8, soft), cr = S.at(1, 1.5, .5, soft);
      K.tag(ctx, 1310, 650, '华尔街交易员', { alpha: ws * (1 - cr * .5), color: C.gray, font: F.serif(700, 22) });
      if (cr > 0) K.line(ctx, 1200, 650, 1420, 650, { p: cr, color: C.red, width: 3 });
    } },

  { id: 'machine', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03 },
    lines: ['他们捕获市场里{微小的规律}，', '打造出一台没有感情的{超级印钞机}。'],
    visual(ctx, S) {
      // a slow rain of digits; small repeating patterns light up
      const R4 = K.rng(23), cols = 34, a0 = S.at(0, 0, 1.2, soft);
      for (let c = 0; c < cols; c++) {
        const x = 280 + c * 41, sp = 60 + R4() * 90, off = R4() * 600;
        for (let r = 0; r < 12; r++) {
          const y = 250 + ((off + S.t * sp + r * 46) % 560), dg = String(Math.floor(R4() * 10));
          const hot = S.at(0, .8, .8, soft) > 0 && (c % 7 === 3) && r % 4 === 1;
          K.text(ctx, dg, x, y, { font: F.latin(500, 18), color: hot ? C.goldHi : C.gray, align: 'center', alpha: a0 * (hot ? 1 : .35) * clamp((y - 250) / 60) * clamp((810 - y) / 60) });
        }
      }
      // the machine: tiny edges that add up
      const n = Math.floor(S.lin(1, .2, 2.4) * 40);
      const pts = []; for (let i = 0; i <= n; i++) pts.push([520 + i * 17, 660 - i * 6 - Math.sin(i * 1.7) * 6]);
      if (pts.length > 1) K.dotted(ctx, pts, 1, { gap: 6, r: 2.2, color: C.red });
      K.tag(ctx, 1460, 330, '+0.01% × 千万次', { alpha: S.at(1, .4, .9, soft), color: C.gold, font: F.serif(900, 22) });
      K.goldText(ctx, '超级印钞机', 1470, 620, 44, { alpha: S.at(1, 1.2, 1.0, soft), glow: 1.1 });
    } },

  { id: 'return66', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['30年里，大奖章基金{费前年化约66%}，', '收益远超{巴菲特}。'],
    visual(ctx, S) {
      const base = 760, H = 440, bars = [['大奖章基金', 66, C.goldHi, 0], ['巴菲特 · 伯克希尔', 20, C.white, 1], ['标普500', 10, C.gray, 1]];
      K.baseline(ctx, 340, 1580, base + 4, { p: S.at(0, 0, 1.2, soft), step: 52 });
      bars.forEach(([nm, v, col, ln], i) => {
        const p = ln === 0 ? S.at(0, .4, 1.8, soft) : S.at(1, (i - 1) * .3, 1.2, soft), h = H * v / 66 * p, x = 520 + i * 440;
        ctx.save(); ctx.globalAlpha = Math.max(.001, clamp(p * 2));
        if (i === 0) { const g = ctx.createLinearGradient(0, base - H, 0, base); g.addColorStop(0, '#F5DFA0'); g.addColorStop(1, '#8A6A2E'); ctx.fillStyle = g; ctx.shadowColor = rgba(C.goldHi, .5); ctx.shadowBlur = 30; }
        else ctx.fillStyle = rgba(col, .75);
        ctx.fillRect(x - 90, base - h, 180, h); ctx.restore();
        K.text(ctx, Math.round(v * p) + '%', x, base - h - 22, { font: F.serif(900, i ? 28 : 40), color: col, align: 'center', alpha: clamp(p * 2) });
        K.text(ctx, nm, x, base + 46, { font: F.serif(900, 22), color: col, align: 'center', alpha: clamp(p * 2) });
      });
      K.text(ctx, '年化收益 · 示意（大奖章为费前，1988—2018）', 1580, 300, { font: F.serif(500, 16), color: C.gray, align: 'right', alpha: S.at(0, .4, 1.0, soft) });
    } },

  { id: 'calm', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03, x1: -12 },
    lines: ['无论牛熊，模型都在{冷静运转}，', '被誉为华尔街最强的壁垒。'],
    visual(ctx, S) {
      const p = S.at(0, 0, 2.4, soft);
      K.baseline(ctx, 280, 1380, 750, { p: S.at(0, 0, 1.2, soft), step: 48 });
      K.dotted(ctx, MKT, p, { gap: 7, r: 1.8, color: C.gray, glow: false });
      K.text(ctx, '牛市', MKT[40][0], MKT[40][1] - 34, { font: F.serif(900, 22), color: C.red, align: 'center', alpha: S.at(0, 1.0, .8, soft) });
      K.text(ctx, '熊市', MKT[100][0], MKT[100][1] - 34, { font: F.serif(900, 22), color: C.green, align: 'center', alpha: S.at(0, 1.8, .8, soft) });
      K.dotted(ctx, EQ, S.at(0, .4, 2.6, soft), { gap: 6, r: 2.4, color: C.goldHi });
      K.text(ctx, '模型 · 示意', EQ[EQ.length - 1][0] - 20, EQ[EQ.length - 1][1] - 30, { font: F.serif(900, 22), color: C.goldHi, align: 'right', alpha: S.at(0, 2.4, .8, soft) });
      const w = S.at(1, .2, 1.4, soft);
      if (w > 0) { ctx.save(); ctx.globalAlpha = w; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 3; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 20;
        ctx.beginPath(); ctx.moveTo(1560, 280); ctx.lineTo(1660, 320); ctx.lineTo(1660, 450); ctx.quadraticCurveTo(1660, 540, 1560, 590); ctx.quadraticCurveTo(1460, 540, 1460, 450); ctx.lineTo(1460, 320); ctx.closePath(); ctx.stroke(); ctx.restore();
        K.text(ctx, '壁垒', 1560, 450, { font: F.serif(900, 30), color: C.goldHi, align: 'center', spacing: 6, alpha: w }); }
    } },

  { id: 'legacy', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03 },
    lines: ['2024年，这位传奇落幕，', '他掀起的{量化风暴}彻底颠覆了华尔街。'],
    visual(ctx, S) {
      const y = 340, X = yr => lerp(300, 1620, (yr - 1938) / 86), ra = S.at(0, -.2, 1.6, soft);
      K.line(ctx, 300, y, lerp(300, 1620, ra), y, { color: rgba(C.gold, .7), width: 2 });
      [[1938, '出生'], [1964, '密码破译'], [1974, '陈-西蒙斯理论'], [1988, '大奖章基金'], [2024, '86岁 · 落幕']].forEach(([yr, lb], i) => {
        const a = S.at(0, i * .25, .9, soft), hi = i === 4;
        K.marker(ctx, X(yr), y, { alpha: a, r: hi ? 10 : 6, color: hi ? C.goldHi : C.gold });
        K.text(ctx, String(yr), X(yr), y - 24, { font: F.latin(500, 20), color: C.gray, align: 'center', alpha: a, spacing: 2 });
        K.text(ctx, lb, X(yr), y + (i % 2 ? 84 : 48), { font: F.serif(700, 20), color: hi ? C.goldHi : C.white, align: 'center', alpha: a });
      });
      // the storm: rings spreading from where he started
      const st = S.at(1, 0, .8, soft);
      for (let k = 0; k < 4; k++) ring(ctx, 960, 640, ((S.t - S.beat(1)) / 2.4 + k / 4) % 1 * (st > 0 ? 1 : 0), C.goldHi, 260);
      K.text(ctx, 'QUANT', 960, 652, { font: F.latin(500, 34), color: C.goldHi, align: 'center', spacing: 14, alpha: st });
    } },

  { id: 'final', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    lines: ['市场情绪在变，', '但数学和概率，{永不说谎}。'],
    visual(ctx, S) {
      const d = { x: 260, y: 270, w: 520, h: 520 }, a = S.p(0, 1.6, soft);
      photo(ctx, d, crop(lerp(2.4, 2.6, S.t / S.dur), .45, .2, 1), { alpha: a, vig: .75 });
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.6, 1.0, soft));
      riseText(ctx, '以数学征服华尔街', 1290, 420, 40, S.t - S.beat(0) - .4, { spacing: 6, stagger: .08, dur: 1.1 });
      const q = S.at(1, .2, 1.2, soft);
      K.rule(ctx, 1290, 470, 300, q);
      K.text(ctx, '“趋势会结束，', 1290, 560, { font: F.serif(700, 25), color: C.white, align: 'center', alpha: q });
      K.text(ctx, '但规律和概率永远存在。”', 1290, 614, { font: F.serif(700, 25), color: C.white, align: 'center', alpha: q });
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
      K.text(ctx, '量化之王詹姆斯西蒙斯 · 完', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 6, alpha: S.p(1.1, 1.2, soft) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.5, 1.2, soft) });
    } },
  ],
};
})();

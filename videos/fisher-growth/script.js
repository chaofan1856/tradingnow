/* ============================================================
   《成长股教父菲利普费舍》 — content for the TradingNow film engine (index.html)

   A scene:
     { id, header?, lines?: [subtitle markup], visual?(ctx, S, K), tr?: transition into this scene,
       camera?: {z0,z1,x0,x1,y0,y1}, dur?: fixed seconds, noWatermark? }
   Subtitle markup:  {金色重点}  [红色/多头]  <绿色/空头>
   S (scene clock):  S.t, S.at(line, delay, dur) → eased 0..1, S.lin(...), S.p(sec, dur), S.beat(line)
   Transitions:      'zoom' | ['push', ±1] | 'sweep' | ['iris', [x,y]] | 'dissolve'

   One continuous story (no modules), paced to end with the supplied track (≈ 58 s).
   Same smooth motion as the Graham, Lynch and Munger films: 1.4 s transitions, gentle cameras, only soft eases,
   a title whose characters rise out of a blur.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, rgba, mix, F } = K;
const soft = x => { x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10); };      // smootherstep: zero velocity at both ends

/* the portrait (assets/portrait.jpg, supplied with the brief) — added to the page so ASSETS_READY waits for it */
const PHOTO = new Image(); PHOTO.src = 'assets/portrait.jpg'; PHOTO.hidden = true; document.body.appendChild(PHOTO);

/* one constant header for the whole story: no modules, only the book-title corner (label ' ' hides the module tag) */
const HD = { label: ' ', en: 'Philip Fisher', zh: '《成长股教父》' };

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
  const W0 = PHOTO.naturalWidth || 1280, H0_ = PHOTO.naturalHeight || 960;
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
  K.text(ctx, en, x + w / 2, y + h * .42 + 48, { font: F.latin(500, 10), color: C.gold, align: 'center', spacing: 1, alpha: a });
  K.text(ctx, foot, x + w / 2, y + h - 46, { font: F.latin(500, 15), color: C.gray, align: 'center', spacing: 4, alpha: a });
}

/* ---------- data ---------- */
// the market: a field of ordinary companies, one great one
const FIELD = (() => { const R = K.rng(58), a = []; for (let i = 0; i < 220; i++) a.push([260 + R() * 1400, 280 + R() * 470, R()]); return a; })();
const STAR = [1240, 470];
// Motorola, 1955 onwards (illustrative): a long, steep climb
const MOT = K.gen.path([5, 9, 7, 16, 13, 28, 23, 46, 38, 70, 60, 104, 92, 140], { per: [3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3, 2, 3], seed: 71, noise: .35 });
const MBOX = { x: 260, y: 300, w: 980, h: 430 };
const chartMOT = new K.Chart(MOT.candles, MBOX, { lo: 0, hi: 146 });

window.FILM = {
  title: '成长股教父菲利普费舍',
  transition: 1.4,                                          // a longer, softer overlap between scenes
  fontScale: 1.55,
  subtitle: { x: 220, y: 912, size: 42, maxW: 1480 },     // 42 × FS 1.55 = 65px
  timing: { perChar: .125, base: .82, minLine: 2.0, pre: .3, post: .3 },   // one continuous story, paced to the track
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', dur: 4.6, camera: { z0: 1.05, z1: 1.0 }, lines: ['在股票市场里，', '寻找{伟大的公司}比什么都重要。'],
    visual(ctx, S) {
      // a field of ordinary companies; a searchlight sweeps, then settles on the one
      const a = S.at(0, -.3, 1.2, soft), find = S.at(1, 0, 1.6, soft);
      const lx = lerp(500, STAR[0], find) + Math.sin(S.t * 1.6) * 180 * (1 - find), ly = lerp(520, STAR[1], find) + Math.cos(S.t * 1.3) * 90 * (1 - find);
      FIELD.forEach(([x, y, r]) => {
        const d = Math.hypot(x - lx, y - ly), lit = clamp(1 - d / 160);
        ctx.fillStyle = rgba(C.white, (.4 + .5 * lit) * a * (1 - find * .4)); ctx.beginPath(); ctx.arc(x, y, 2 + r * 1.5, 0, 6.2832); ctx.fill();
      });
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, 170); g.addColorStop(0, rgba(C.goldHi, .16 * a)); g.addColorStop(1, rgba(C.goldHi, 0));
      ctx.fillStyle = g; ctx.fillRect(lx - 170, ly - 170, 340, 340);
      const st = S.at(1, .9, 1.2, soft);
      if (st > 0) {
        ctx.save(); ctx.fillStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 40 * st; ctx.globalAlpha = st;
        ctx.beginPath(); ctx.arc(STAR[0], STAR[1], 8 + 16 * st, 0, 6.2832); ctx.fill(); ctx.restore();
        ring(ctx, STAR[0], STAR[1], S.lin(1, .9, 1.6), C.goldHi, 180);
        K.text(ctx, '伟大的公司', STAR[0], STAR[1] - 64, { font: F.serif(900, 28), color: C.goldHi, align: 'center', spacing: 8, alpha: st, glow: .6 });
      }
    } },

  /* ================= TITLE ================= */
  { id: 'title', dur: 4.6, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    visual(ctx, S) {
      const cx = 960, t = S.t;
      const bg = K.gen.path([100, 104, 102, 112, 108, 122, 116, 136, 130, 156], { per: 5, seed: 15 });
      const ch = new K.Chart(bg.candles, { x: 140 - t * 10, y: 210, w: 1700, h: 620 });
      ch.draw(ctx, bg.candles.length, { alpha: .14 * soft(t / 2.2), glow: 0, color: () => C.gold });
      const e = soft((t - .1) / 1.8);
      K.text(ctx, 'PHILIP  FISHER', cx, 384, { font: F.latin(500, 22), color: C.gold, align: 'center', spacing: lerp(30, 12, e), alpha: e });
      riseText(ctx, '成长股教父', cx, 528, 72, t - .45, { spacing: 20, stagger: .14, dur: 1.3 });
      const sw = soft((t - 1.9) / 1.8);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(520, 1400, sw), g = ctx.createLinearGradient(x - 120, 0, x + 120, 0), a = .26 * Math.sin(Math.PI * sw);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, `rgba(255,240,200,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 120, 410, 240, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 340, soft((t - 1.2) / 1.8));
      const s = soft((t - 1.9) / 1.4);
      K.text(ctx, '成长股投资开山鼻祖 · 菲利普·费舍', cx, 650 + (1 - s) * 14, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 6, alpha: s });
    } },

  /* ================= 人物画像 ================= */
  { id: 'intro', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03, x1: -12 },
    lines: ['他是现代成长股投资的{开山鼻祖}，', '也被誉为科技股的{终极教父}。'],
    visual(ctx, S) {
      const d = { x: 220, y: 290, w: 600, h: 450 }, rv = S.p(0, 1.6, soft);
      ctx.save(); ctx.beginPath(); const ww = d.w * rv; ctx.rect(d.x + (d.w - ww) / 2, d.y - 20, ww, d.h + 40); ctx.clip();
      photo(ctx, d, crop(lerp(1.0, 1.08, S.t / S.dur), .58, .4, d.w / d.h));
      ctx.restore();
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.6, 1.0, soft));
      K.text(ctx, '1907 — 2004', d.x + d.w / 2, d.y + d.h + 44, { font: F.latin(500, 18), color: C.goldHi, align: 'center', spacing: 6, alpha: S.p(1.0, 1.0, soft) });
      const x0 = 900, nm = S.p(.3, 1.2, soft);
      K.text(ctx, '菲利普·费舍', x0, 340 + (1 - nm) * 16, { font: F.serif(900, 40), color: C.white, alpha: nm, spacing: 4 });
      K.text(ctx, 'PHILIP FISHER', x0 + 2, 384, { font: F.latin(500, 19), color: C.gray, spacing: 6, alpha: S.p(.6, 1.0, soft) });
      K.tag(ctx, x0, 432, '成长股投资教头', { align: 'left', alpha: S.p(.8, .9, soft), color: C.gold });
      K.tag(ctx, x0 + 270, 432, '科技股教父', { align: 'left', alpha: S.at(1, .3, .9, soft), color: C.red });
      const q = S.at(0, .4, 1.0, soft);
      K.text(ctx, '“', x0 - 6, 565, { font: F.latin(500, 64), color: C.gold, alpha: q * .9 });
      K.rich(ctx, '在股票市场里，寻找', { x: x0 + 70, y: 530, size: 30, weight: 700, t: S.t - S.beat(0) - .4, anchorTop: true, stagger: .04 });
      K.rich(ctx, '{伟大的公司}比什么都重要。', { x: x0 + 70, y: 592, size: 30, weight: 700, t: S.t - S.beat(0) - .8, anchorTop: true, stagger: .04 });
      K.line(ctx, x0, 634, x0 + 720, 634, { p: q, color: rgba(C.gold, .4) });
    } },

  { id: 'scuttle', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03 },
    lines: ['1931年，他创立了自己的投资公司，', '首创“{闲聊调研法}”，向员工和对手打听真相。'],
    visual(ctx, S) {
      // the company in the middle; the people around it talk
      const cx = 960, cy = 540, a0 = S.at(0, 0, 1.0, soft);
      ctx.save(); ctx.globalAlpha = a0; ctx.fillStyle = rgba(C.gold, .12); ctx.strokeStyle = C.goldHi; ctx.lineWidth = 2; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 16;
      ctx.beginPath(); ctx.roundRect(cx - 120, cy - 60, 240, 120, 8); ctx.fill(); ctx.stroke(); ctx.restore();
      K.text(ctx, '目标公司', cx, cy + 12, { font: F.serif(900, 28), color: C.goldHi, align: 'center', spacing: 6, alpha: a0 });
      K.text(ctx, 'FISHER & CO. · 1931', cx, 290, { font: F.latin(500, 20), color: C.gold, align: 'center', spacing: 6, alpha: S.at(0, .4, 1.0, soft) });
      const who = [['员工', 520, 400], ['竞争对手', 1400, 400], ['客户', 520, 700], ['供应商', 1400, 700]];
      who.forEach(([nm, x, y], i) => {
        const a = S.at(1, .1 + i * .3, 1.0, soft); if (a <= 0) return;
        K.dotted(ctx, [[x, y], [cx + (x < cx ? -120 : 120), cy + (y < cy ? -30 : 30)]], a, { gap: 7, r: 1.8, alpha: .9 });
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(28,23,15,.92)'; ctx.strokeStyle = rgba(C.gold, .8); ctx.lineWidth = 1.4;
        const w = 200, h = 70, bx = x - w / 2, by = y - h / 2;
        ctx.beginPath(); ctx.roundRect(bx, by, w, h, 16); ctx.fill(); ctx.stroke();
        ctx.beginPath(); const tx = x < cx ? bx + w - 40 : bx + 40; ctx.moveTo(tx - 10, by + h); ctx.lineTo(tx, by + h + 18); ctx.lineTo(tx + 10, by + h); ctx.fill(); ctx.restore();
        K.text(ctx, nm, x, y + 9, { font: F.serif(900, 22), color: C.white, align: 'center', alpha: a });
      });
      K.tag(ctx, cx, 790, '闲聊调研法 · SCUTTLEBUTT', { alpha: S.at(1, 1.4, 1.0, soft), color: C.gold, font: F.serif(900, 20) });
    } },

  { id: 'hold', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['他的法则只有一条：', '“抱紧对的公司，直到它{发生根本改变}。”'],
    visual(ctx, S) {
      // a holding bar that just keeps going, until the business itself changes
      const y = 540, x0 = 300, x1 = 1600, a = S.at(0, 0, 1.0, soft), run = S.at(0, .4, S.beat(1) + 1.6, soft);
      K.baseline(ctx, x0, x1, y + 120, { p: a, step: 52 });
      [1955, 1965, 1975, 1985, 1995].forEach((yr, i) => K.text(ctx, String(yr), lerp(x0, x1 - 160, i / 4), y + 160, { font: F.latin(500, 18), color: C.gray, align: 'center', alpha: a, spacing: 2 }));
      const xe = lerp(x0, x1 - 160, run);
      ctx.save(); const g = ctx.createLinearGradient(x0, 0, xe, 0); g.addColorStop(0, rgba(C.gold, .3)); g.addColorStop(1, rgba(C.goldHi, .9));
      ctx.fillStyle = g; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 20; ctx.fillRect(x0, y - 18, Math.max(0, xe - x0), 36); ctx.restore();
      K.marker(ctx, x0, y, { alpha: a, r: 10, color: C.red, label: '买入', pos: 'above', font: F.serif(900, 22), labelColor: C.red });
      K.text(ctx, '抱紧 · 持有', (x0 + xe) / 2, y + 9, { font: F.serif(900, 22), color: '#1A1408', align: 'center', spacing: 8, alpha: clamp(run * 3 - .6) });
      const ch = S.at(1, 1.4, 1.0, soft), cx = x1 - 100;
      if (ch > 0) {
        ctx.save(); ctx.globalAlpha = ch; ctx.strokeStyle = C.green; ctx.lineWidth = 3; ctx.setLineDash([6, 6]); ctx.beginPath(); ctx.moveTo(cx, y - 120); ctx.lineTo(cx, y + 100); ctx.stroke(); ctx.restore();
        K.text(ctx, '根本改变', cx, y - 176, { font: F.serif(900, 24), color: C.green, align: 'center', spacing: 4, alpha: ch });
        K.text(ctx, '才卖出', cx, y - 138, { font: F.serif(700, 20), color: C.gray, align: 'center', alpha: ch });
      }
    } },

  { id: 'motorola', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03, x1: -12 },
    lines: ['50年代，他早早重仓{摩托罗拉}、{德州仪器}，', '一拿几十年，获得超过[百倍]的回报！'],
    visual(ctx, S) {
      const ch = chartMOT, n = MOT.candles.length;
      K.baseline(ctx, MBOX.x, MBOX.x + MBOX.w, MBOX.y + MBOX.h + 30, { p: S.at(0, 0, 1.2, soft) });
      K.text(ctx, '1955', MBOX.x, MBOX.y + MBOX.h + 66, { font: F.latin(500, 20), color: C.gray, spacing: 4, alpha: S.at(0, .2, .9, soft) });
      K.text(ctx, '长期持有 · 示意', MBOX.x + MBOX.w, MBOX.y + MBOX.h + 66, { font: F.serif(500, 16), color: C.gray, align: 'right', alpha: S.at(0, .2, .9, soft) });
      ch.draw(ctx, S.lin(0, .2, S.beat(1) - .2) * 6 + S.lin(1, 0, 2.2) * (n - 6), { glow: .4 });
      K.marker(ctx, ch.x(1), ch.y(MOT.candles[1].l) + 16, { alpha: S.at(0, .8, .8, soft), r: 9, color: C.red, label: '重仓', pos: 'below', font: F.serif(900, 20), labelColor: C.red });
      K.tag(ctx, 1460, 330, '摩托罗拉', { alpha: S.at(0, .9, .9, soft), color: C.gold, font: F.serif(900, 22) });
      K.tag(ctx, 1460, 390, '德州仪器', { alpha: S.at(0, 1.4, .9, soft), color: C.gold, font: F.serif(900, 22) });
      const m = S.at(1, .3, 2.0, soft), k = Math.max(1, Math.round(Math.pow(100, m)));
      if (m > 0) {
        K.goldText(ctx, '×' + k, 1460, 560, 72, { alpha: clamp(m * 2), glow: 1.2 });
        K.text(ctx, '超过百倍', 1460, 630, { font: F.serif(900, 26), color: C.red, align: 'center', spacing: 8, alpha: S.at(1, 1.4, 1.0, soft), glow: .5, glowColor: C.red });
      }
    } },

  { id: 'focus', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['买100只平庸的股票，', '也抵不上{坚定持有一只伟大的企业}。'],
    visual(ctx, S) {
      // a hundred grey dots vs. one gold sun
      const a = S.at(0, 0, 1.2, soft), dim = S.at(1, 0, 1.2, soft);
      for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
        const i = r * 10 + c, p = clamp(a * 1.6 - i * .006);
        ctx.fillStyle = rgba(C.gray, .75 * p * (1 - dim * .5)); ctx.beginPath(); ctx.arc(320 + c * 46, 340 + r * 44, 11, 0, 6.2832); ctx.fill();
      }
      K.text(ctx, '100 只平庸的股票', 527, 810, { font: F.serif(700, 22), color: C.gray, align: 'center', spacing: 4, alpha: a });
      K.text(ctx, '<', 960, 580, { font: F.latin(500, 80), color: C.goldHi, align: 'center', alpha: S.at(1, .4, 1.0, soft) });
      const b = S.at(1, .2, 1.6, soft), R = 40 + 120 * b;
      if (b > 0) {
        const g = ctx.createRadialGradient(1380, 540, R * .1, 1380, 540, R); g.addColorStop(0, '#FFF3CC'); g.addColorStop(.6, '#E2BE73'); g.addColorStop(1, '#8A6A2E');
        ctx.save(); ctx.globalAlpha = b; ctx.fillStyle = g; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 50; ctx.beginPath(); ctx.arc(1380, 540, R, 0, 6.2832); ctx.fill(); ctx.restore();
        K.text(ctx, '1 家伟大的企业', 1380, 810, { font: F.serif(900, 24), color: C.goldHi, align: 'center', spacing: 4, alpha: b, glow: .5 });
      }
    } },

  { id: 'legacy', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03 },
    lines: ['2004年，这位{96岁}的老人走完传奇一生。', '巴菲特自称：“我身上有{15%}是费舍。”'],
    visual(ctx, S) {
      const y = 300, X = yr => lerp(300, 1620, (yr - 1907) / 97), ra = S.at(0, 0, 1.4, soft);
      K.line(ctx, 300, y, lerp(300, 1620, ra), y, { color: rgba(C.gold, .6) });
      [[1907, '出生'], [1931, '创立公司'], [1955, '重仓摩托罗拉'], [2004, '96岁 · 落幕']].forEach(([yr, lb], i) => {
        const a = S.at(0, .2 + i * .25, .9, soft), hi = i === 3;
        K.marker(ctx, X(yr), y, { alpha: a, r: hi ? 9 : 6, color: hi ? C.goldHi : C.gold });
        K.text(ctx, String(yr), X(yr), y - 22, { font: F.latin(500, 20), color: C.gray, align: 'center', alpha: a, spacing: 2 });
        K.text(ctx, lb, X(yr), y + 46, { font: F.serif(700, 19), color: hi ? C.goldHi : C.white, align: 'center', alpha: a });
      });
      // Buffett: 85 % Graham, 15 % Fisher
      const p = S.at(1, .1, 1.6, soft), cx = 960, cy = 610, R = 130;
      if (p > 0) {
        ctx.save(); ctx.globalAlpha = p; ctx.lineWidth = 40;
        ctx.strokeStyle = rgba(C.gray, .6); ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2 + Math.PI * 2 * .15, -Math.PI / 2 + Math.PI * 2 * (.15 + .85 * p)); ctx.stroke();
        ctx.strokeStyle = C.goldHi; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 20; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * .15 * p); ctx.stroke();
        ctx.restore();
        K.text(ctx, '巴菲特', cx, cy + 10, { font: F.serif(900, 28), color: C.white, align: 'center', spacing: 6, alpha: p });
        K.text(ctx, '15% 费舍', cx + R + 70, cy - 70, { font: F.serif(900, 26), color: C.goldHi, align: 'left', alpha: S.at(1, .9, .9, soft), glow: .5 });
        K.text(ctx, '85% 格雷厄姆', cx - R - 70, cy + 70, { font: F.serif(700, 22), color: C.gray, align: 'right', alpha: S.at(1, 1.2, .9, soft) });
      }
    } },

  { id: 'final', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    lines: ['别把精力分散在平庸的公司里，', '找到{能改变世界的公司}，和它一起慢慢变富。'],
    visual(ctx, S) {
      book(ctx, 300, 260, 380, 520, S.p(0, 1.6, soft), '怎样选择成长股', 'COMMON STOCKS AND UNCOMMON PROFITS', 'PHILIP FISHER · 1958', 28);
      const sw = soft((S.t - 1.0) / 2.2);
      if (sw > 0 && sw < 1) { ctx.save(); ctx.beginPath(); ctx.rect(300, 260, 380, 520); ctx.clip(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(150, 830, sw), gg = ctx.createLinearGradient(x - 110, 0, x + 110, 0), a = .2 * Math.sin(Math.PI * sw);
        gg.addColorStop(0, 'rgba(255,236,190,0)'); gg.addColorStop(.5, `rgba(255,236,190,${a.toFixed(3)})`); gg.addColorStop(1, 'rgba(255,236,190,0)');
        ctx.fillStyle = gg; ctx.fillRect(x - 110, 260, 220, 520); ctx.restore(); }
      riseText(ctx, '一代宗师 · 启迪巴王', 1230, 420, 40, S.t - S.beat(0) - .4, { spacing: 6, stagger: .08, dur: 1.1 });
      const q = S.at(1, .2, 1.2, soft);
      K.rule(ctx, 1230, 470, 300, q);
      K.text(ctx, '“与其买一大堆平庸的公司，', 1230, 560, { font: F.serif(700, 25), color: C.white, align: 'center', alpha: q });
      K.text(ctx, '不如专注少数几家杰出的企业。”', 1230, 614, { font: F.serif(700, 25), color: C.white, align: 'center', alpha: q });
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
      K.text(ctx, '成长股教父菲利普费舍 · 完', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 6, alpha: S.p(1.1, 1.2, soft) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.5, 1.2, soft) });
    } },
  ],
};
})();

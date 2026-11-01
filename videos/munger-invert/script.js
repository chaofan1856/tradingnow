/* ============================================================
   《终极智者查理芒格》 — content for the TradingNow film engine (index.html)

   A scene:
     { id, header?, lines?: [subtitle markup], visual?(ctx, S, K), tr?: transition into this scene,
       camera?: {z0,z1,x0,x1,y0,y1}, dur?: fixed seconds, noWatermark? }
   Subtitle markup:  {金色重点}  [红色/多头]  <绿色/空头>
   S (scene clock):  S.t, S.at(line, delay, dur) → eased 0..1, S.lin(...), S.p(sec, dur), S.beat(line)
   Transitions:      'zoom' | ['push', ±1] | 'sweep' | ['iris', [x,y]] | 'dissolve'

   One continuous story (no modules), paced to end with the supplied track (≈ 58 s).
   Same smooth motion as the Graham and Lynch films: 1.4 s transitions, gentle cameras, only soft eases,
   a title whose characters rise out of a blur.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, rgba, mix, F } = K;
const soft = x => { x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10); };      // smootherstep: zero velocity at both ends

/* the portrait (assets/portrait.jpg, supplied with the brief) — added to the page so ASSETS_READY waits for it */
const PHOTO = new Image(); PHOTO.src = 'assets/portrait.jpg'; PHOTO.hidden = true; document.body.appendChild(PHOTO);

/* one constant header for the whole story: no modules, only the book-title corner (label ' ' hides the module tag) */
const HD = { label: ' ', en: 'Charlie Munger', zh: '《终极智者》' };

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
  const W0 = PHOTO.naturalWidth || 1148, H0_ = PHOTO.naturalHeight || 1070;
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
// the maze for "invert": a forward search that wanders into dead ends, and the clean path traced back from the goal
const START = [300, 560], GOAL = [1620, 520];
const ROUTE = [[300, 560], [520, 560], [520, 400], [820, 400], [820, 640], [1120, 640], [1120, 460], [1380, 460], [1380, 520], [1620, 520]];
const DEADS = [[[520, 560], [520, 720], [700, 720]], [[820, 400], [820, 300], [1000, 300]], [[1120, 640], [1300, 640], [1300, 760]], [[520, 400], [380, 400], [380, 300]]];
// Berkshire: tens of thousands of times (illustrative)
const BRK = []; for (let i = 0; i <= 90; i++) { const u = i / 90, w = Math.sin(i * .7) * .03 + Math.sin(i * .23) * .05; BRK.push([280 + u * 940, 740 - (Math.pow(10, u * 4.5) * (1 + w) - 1) / (Math.pow(10, 4.5) - 1) * 430]); }

window.FILM = {
  title: '终极智者查理芒格',
  transition: 1.4,                                          // a longer, softer overlap between scenes
  fontScale: 1.55,
  subtitle: { x: 220, y: 912, size: 42, maxW: 1480 },     // 42 × FS 1.55 = 65px
  timing: { perChar: .1, base: .68, minLine: 2.0, pre: .3, post: .3 },   // one continuous story, paced to the track
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', dur: 4.6, camera: { z0: 1.05, z1: 1.0 }, lines: ['反过来想，', '总是{反过来想}。'],
    visual(ctx, S) {
      // searching forward wanders into dead ends; starting from the goal, the way back is clean
      const f = S.at(0, -.3, 1.6, soft), b = S.at(1, .1, 1.6, soft);
      DEADS.forEach((d, i) => K.dotted(ctx, d, clamp(f * 1.4 - i * .15), { gap: 7, r: 1.6, color: C.gray, glow: false, alpha: .8 * (1 - b * .6) }));
      K.dotted(ctx, ROUTE.slice(0, 4), f, { gap: 7, r: 1.6, color: C.gray, glow: false, alpha: .8 * (1 - b * .6) });
      [[700, 720], [1000, 300], [1300, 760], [380, 300]].forEach(([x, y], i) => K.text(ctx, '×', x + 18, y + 8, { font: F.latin(500, 24), color: C.gray, alpha: clamp(f * 1.4 - i * .15 - .6) * (1 - b) }));
      K.dotted(ctx, [...ROUTE].reverse(), b, { gap: 7, r: 2.4 });
      K.marker(ctx, START[0], START[1], { alpha: S.at(0, 0, .8, soft), r: 9, label: '起点', pos: 'left', font: F.serif(700, 22) });
      K.marker(ctx, GOAL[0], GOAL[1], { alpha: S.at(0, .2, .8, soft), r: 12, color: C.goldHi, label: '目标', pos: 'right', font: F.serif(900, 24), pulse: b > .99 ? clamp(((S.t - 2) % 1.4) / 1.4) : 0 });
      K.text(ctx, '← 从结果倒推', 960, 250, { font: F.serif(900, 28), color: C.goldHi, align: 'center', spacing: 6, alpha: S.at(1, .5, 1.0, soft), glow: .5 });
    } },

  /* ================= TITLE ================= */
  { id: 'title', dur: 4.6, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    visual(ctx, S) {
      const cx = 960, t = S.t;
      const bg = K.gen.path([100, 106, 102, 114, 109, 124, 118, 136, 130, 150], { per: 5, seed: 14 });
      const ch = new K.Chart(bg.candles, { x: 140 - t * 10, y: 210, w: 1700, h: 620 });
      ch.draw(ctx, bg.candles.length, { alpha: .14 * soft(t / 2.2), glow: 0, color: () => C.gold });
      const e = soft((t - .1) / 1.8);
      K.text(ctx, 'CHARLIE  MUNGER', cx, 384, { font: F.latin(500, 22), color: C.gold, align: 'center', spacing: lerp(30, 12, e), alpha: e });
      riseText(ctx, '终极智者', cx, 528, 72, t - .45, { spacing: 26, stagger: .15, dur: 1.3 });
      const sw = soft((t - 1.9) / 1.8);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(560, 1360, sw), g = ctx.createLinearGradient(x - 120, 0, x + 120, 0), a = .26 * Math.sin(Math.PI * sw);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, `rgba(255,240,200,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 120, 410, 240, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 340, soft((t - 1.2) / 1.8));
      const s = soft((t - 1.9) / 1.4);
      K.text(ctx, '传奇投资思想家 · 查理·芒格', cx, 650 + (1 - s) * 14, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 8, alpha: s });
    } },

  /* ================= 人物画像 ================= */
  { id: 'intro', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03, x1: -12 },
    lines: ['他是华尔街的传奇智者，{巴菲特}唯一的灵魂合伙人。', '用近百年的智慧，把投资变成{认知的修行}。'],
    visual(ctx, S) {
      const d = { x: 280, y: 250, w: 480, h: 450 }, rv = S.p(0, 1.6, soft);
      ctx.save(); ctx.beginPath(); const hh = d.h * rv; ctx.rect(d.x - 20, d.y + (d.h - hh) / 2, d.w + 40, hh); ctx.clip();
      photo(ctx, d, crop(lerp(1.0, 1.08, S.t / S.dur), .5, .42, d.w / d.h));
      ctx.restore();
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.6, 1.0, soft));
      K.text(ctx, '1924 — 2023', d.x + d.w / 2, d.y + d.h + 44, { font: F.latin(500, 18), color: C.goldHi, align: 'center', spacing: 6, alpha: S.p(1.0, 1.0, soft) });
      const x0 = 860, nm = S.p(.3, 1.2, soft);
      K.text(ctx, '查理·芒格', x0, 318 + (1 - nm) * 16, { font: F.serif(900, 40), color: C.white, alpha: nm, spacing: 4 });
      K.text(ctx, 'CHARLIE MUNGER', x0 + 2, 362, { font: F.latin(500, 19), color: C.gray, spacing: 6, alpha: S.p(.6, 1.0, soft) });
      K.tag(ctx, x0, 410, '传奇投资思想家', { align: 'left', alpha: S.p(.8, .9, soft), color: C.gold });
      K.tag(ctx, x0 + 270, 410, '巴菲特的合伙人', { align: 'left', alpha: S.at(0, 1.0, .9, soft), color: C.gold });
      const q = S.at(0, .4, 1.0, soft);
      K.text(ctx, '“', x0 - 6, 545, { font: F.latin(500, 64), color: C.gold, alpha: q * .9 });
      K.rich(ctx, '反过来想，', { x: x0 + 70, y: 510, size: 30, weight: 700, t: S.t - S.beat(0) - .4, anchorTop: true, stagger: .04 });
      K.rich(ctx, '总是{反过来想}。', { x: x0 + 70, y: 572, size: 30, weight: 700, t: S.t - S.beat(0) - .8, anchorTop: true, stagger: .04 });
      K.line(ctx, x0, 614, x0 + 760, 614, { p: q, color: rgba(C.gold, .4) });
      K.tag(ctx, x0 + 380, 690, '近百年 · 认知的修行', { alpha: S.at(1, .4, 1.0, soft), color: C.gold, font: F.serif(900, 22) });
    } },

  { id: 'lawyer', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03, x1: -12 },
    lines: ['他曾是律师，历经{丧子之痛}，', '却在投资界{重获新生}。'],
    visual(ctx, S) {
      const y = 560, X = yr => lerp(300, 1620, (yr - 1924) / 42), ra = S.p(0, 1.4, soft);
      const dark = S.at(0, 1.0, 1.2, soft), light = S.at(1, .2, 1.6, soft);
      K.line(ctx, 300, y, lerp(300, X(1959), ra), y, { color: rgba(C.gray, .6), width: 2 });
      K.line(ctx, X(1959), y, lerp(X(1959), 1620, light), y, { color: C.goldHi, width: 3, glow: .8 });
      [[1924, '出生', 0, 0], [1948, '哈佛法学院 · 律师', 0, .3], [1955, '痛失爱子', 0, 1.0], [1959, '结识巴菲特', 1, .2], [1965, '投资合伙', 1, .7]].forEach(([yr, lb, ln, dl], i) => {
        const a = S.at(ln, dl + .2, 1.0, soft), hi = yr >= 1959, sad = yr === 1955;
        K.marker(ctx, X(yr), y, { alpha: a, r: hi ? 9 : 6, color: hi ? C.goldHi : sad ? C.green : C.gold });
        K.text(ctx, String(yr), X(yr), y + 44, { font: F.latin(500, 20), color: C.gray, align: 'center', alpha: a, spacing: 2 });
        K.text(ctx, lb, X(yr), y - (i % 2 ? 66 : 28), { font: F.serif(700, 20), color: hi ? C.goldHi : sad ? C.green : C.white, align: 'center', alpha: a });
      });
      if (dark > 0) { const g = ctx.createRadialGradient(X(1955), y, 0, X(1955), y, 220); g.addColorStop(0, rgba(C.green, .12 * dark * (1 - light))); g.addColorStop(1, rgba(C.green, 0)); ctx.fillStyle = g; ctx.fillRect(X(1955) - 220, y - 220, 440, 440); }
      if (light > 0) { const g = ctx.createRadialGradient(X(1962), y, 0, X(1962), y, 360); g.addColorStop(0, rgba(C.goldHi, .2 * light)); g.addColorStop(1, rgba(C.goldHi, 0)); ctx.fillStyle = g; ctx.fillRect(X(1962) - 360, y - 360, 720, 720); }
      K.goldText(ctx, '重获新生', 1360, 330, 48, { alpha: S.at(1, .9, 1.2, soft), glow: 1 });
    } },

  { id: 'greatco', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['他扭转了巴菲特的“{捡烟蒂}”思维：', '“以合理的价格，买入{伟大的公司}。”'],
    visual(ctx, S) {
      const pa = S.at(0, 0, 1.0, soft), pb = S.at(1, 0, 1.2, soft), dim = S.at(1, 0, 1.0, soft);
      // left: the cigar butt — cheap, mediocre
      ctx.save(); ctx.globalAlpha = pa * (1 - dim * .55); ctx.strokeStyle = rgba(C.gold, .3); ctx.lineWidth = 1; ctx.strokeRect(260, 300, 600, 440); ctx.restore();
      ctx.save(); ctx.globalAlpha = pa * (1 - dim * .55); ctx.translate(560, 500); ctx.rotate(-.1);
      ctx.fillStyle = '#8A6A3E'; ctx.beginPath(); ctx.roundRect(-110, -18, 170, 36, 8); ctx.fill(); ctx.fillStyle = rgba(C.white, .8); ctx.fillRect(-110, -18, 38, 36); ctx.restore();
      K.text(ctx, '捡烟蒂', 560, 380, { font: F.serif(900, 30), color: C.white, align: 'center', spacing: 8, alpha: pa * (1 - dim * .55) });
      K.text(ctx, '便宜 · 平庸', 560, 640, { font: F.serif(700, 22), color: C.gray, align: 'center', spacing: 6, alpha: pa * (1 - dim * .55) });
      // right: the great company, at a fair price
      ctx.save(); ctx.globalAlpha = pb; ctx.strokeStyle = rgba(C.goldHi, .9); ctx.lineWidth = 2; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 20 * pb; ctx.strokeRect(1060, 300, 600, 440); ctx.restore();
      if (pb > 0) {
        ctx.save(); ctx.globalAlpha = pb; ctx.translate(1360, 500); const s = .9 + .1 * pb; ctx.scale(s, s);
        const g = ctx.createLinearGradient(0, -80, 0, 80); g.addColorStop(0, '#FBEBC0'); g.addColorStop(1, '#B8893C');
        ctx.fillStyle = g; ctx.shadowColor = rgba(C.goldHi, .6); ctx.shadowBlur = 30;
        ctx.beginPath(); ctx.moveTo(-90, -30); ctx.lineTo(-50, -80); ctx.lineTo(50, -80); ctx.lineTo(90, -30); ctx.lineTo(0, 90); ctx.closePath(); ctx.fill();
        ctx.shadowBlur = 0; ctx.strokeStyle = 'rgba(122,90,36,.6)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(-90, -30); ctx.lineTo(90, -30); ctx.moveTo(-50, -80); ctx.lineTo(-25, -30); ctx.lineTo(0, 90); ctx.lineTo(25, -30); ctx.lineTo(50, -80); ctx.stroke();
        ctx.restore();
      }
      K.text(ctx, '伟大的公司', 1360, 380, { font: F.serif(900, 30), color: C.goldHi, align: 'center', spacing: 8, alpha: pb, glow: .5 });
      K.text(ctx, '合理的价格', 1360, 660, { font: F.serif(700, 22), color: C.white, align: 'center', spacing: 6, alpha: S.at(1, .6, 1.0, soft) });
      K.arrow(ctx, 880, 520, 1040, 520, { p: S.at(1, .2, 1.0, soft), alpha: S.at(1, .2, 1.0, soft), color: C.goldHi, width: 2.4 });
    } },

  { id: 'models', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03 },
    lines: ['他独创“{多元思维模型}”，', '用跨学科的智慧，{降维打击}资本市场。'],
    visual(ctx, S) {
      const cx = 960, cy = 548, R = 270;
      const names = ['心理学', '数学', '物理', '生物', '经济学', '历史'];
      names.forEach((nm, i) => {
        const ang = -Math.PI / 2 + i * Math.PI / 3, x = cx + Math.cos(ang) * R * 1.25, y = cy + Math.sin(ang) * R * .8;
        const a = S.at(0, .2 + i * .18, 1.0, soft), ln = S.at(1, i * .12, 1.0, soft);
        K.dotted(ctx, [[x, y], [cx, cy]], ln, { gap: 7, r: 1.8, alpha: .9 });
        ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = rgba(C.gold, .8); ctx.lineWidth = 1.4; ctx.fillStyle = 'rgba(28,23,15,.9)';
        ctx.beginPath(); ctx.arc(x, y, 54, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.restore();
        K.text(ctx, nm, x, y + 9, { font: F.serif(900, nm.length > 2 ? 18 : 22), color: C.white, align: 'center', alpha: a });
      });
      const c = S.at(1, .8, 1.2, soft);
      ctx.save(); ctx.globalAlpha = Math.max(.25, c); ctx.fillStyle = rgba(C.goldHi, .16 + .2 * c); ctx.strokeStyle = C.goldHi; ctx.lineWidth = 2; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 30 * c;
      ctx.beginPath(); ctx.arc(cx, cy, 70, 0, 6.2832); ctx.fill(); ctx.stroke(); ctx.restore();
      K.text(ctx, '决策', cx, cy + 12, { font: F.serif(900, 30), color: C.goldHi, align: 'center', spacing: 6, alpha: S.at(0, 0, 1.0, soft) });
      ring(ctx, cx, cy, S.lin(1, 1.0, 1.6), C.goldHi, 300);
      K.tag(ctx, cx, 222, '多元思维模型', { alpha: S.at(0, .9, 1.0, soft), color: C.gold, font: F.serif(900, 22) });
    } },

  { id: 'berkshire', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['辅佐巴菲特半个多世纪，', '共同缔造了增长{数万倍}的伯克希尔帝国。'],
    visual(ctx, S) {
      const p = S.at(0, .1, 2.4, soft) * .55 + S.at(1, 0, 1.8, soft) * .45;
      K.baseline(ctx, 280, 1220, 750, { p: S.at(0, 0, 1.2, soft), step: 46 });
      K.text(ctx, '1965', 280, 786, { font: F.latin(500, 20), color: C.gray, spacing: 4, alpha: S.at(0, .2, .9, soft) });
      K.text(ctx, '伯克希尔 · 示意', 1220, 786, { font: F.serif(500, 16), color: C.gray, align: 'right', alpha: S.at(0, .2, .9, soft) });
      const vis = BRK.slice(0, Math.max(2, Math.round(p * BRK.length)));
      ctx.save(); ctx.beginPath(); ctx.moveTo(vis[0][0], 750); vis.forEach(q => ctx.lineTo(q[0], q[1])); ctx.lineTo(vis[vis.length - 1][0], 750); ctx.closePath();
      const g = ctx.createLinearGradient(0, 300, 0, 750); g.addColorStop(0, rgba(C.red, .16)); g.addColorStop(1, rgba(C.red, 0)); ctx.fillStyle = g; ctx.fill(); ctx.restore();
      K.dotted(ctx, BRK, p, { gap: 6, r: 2.2 });
      const n = S.at(1, .3, 1.8, soft), v = Math.round(Math.pow(10, 4.5 * n) / 100) * 100;
      K.goldText(ctx, '×' + Math.max(1, v).toLocaleString('en-US'), 1500, 430, 60, { alpha: n, glow: 1.1 });
      K.text(ctx, '数万倍 · 伯克希尔帝国', 1500, 500, { font: F.serif(900, 22), color: C.red, align: 'center', spacing: 4, alpha: n });
    } },

  { id: 'crisis', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03 },
    lines: ['每一次危机，他都用冷静的{逆向思维}避开灾难。'],
    visual(ctx, S) {
      // a road through the decades; the pits are crises, and the gold line steps around every one
      const pits = [[600, 560, '1973'], [960, 560, '1987'], [1320, 560, '2008']], y = 560;
      K.baseline(ctx, 260, 1660, y + 90, { p: S.at(0, 0, 1.2, soft), step: 48 });
      pits.forEach(([x, py, yr], i) => {
        const a = S.at(0, .2 + i * .2, 1.0, soft);
        ctx.save(); ctx.globalAlpha = a; const g = ctx.createRadialGradient(x, py, 0, x, py, 110); g.addColorStop(0, rgba(C.green, .45)); g.addColorStop(1, rgba(C.green, 0));
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, py, 110, 46, 0, 0, 6.2832); ctx.fill(); ctx.restore();
        K.text(ctx, '危机 ' + yr, x, py + 90, { font: F.serif(700, 20), color: C.green, align: 'center', alpha: a });
      });
      const pts = []; for (let i = 0; i <= 140; i++) { const x = 260 + i * 10; let yy = y; pits.forEach(([px]) => { yy -= 150 * Math.exp(-(((x - px) / 90) ** 2)); }); pts.push([x, yy]); }
      K.dotted(ctx, pts, S.at(0, .6, 2.2, soft), { gap: 6, r: 2.2 });
      K.tag(ctx, 960, 290, '冷静 · 逆向', { alpha: S.at(0, 1.6, 1.0, soft), color: C.gold, font: F.serif(900, 22) });
    } },

  { id: 'compound', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['他证明了：{知识的复利}，', '才是最可怕的财富印钞机。'],
    visual(ctx, S) {
      // books stacking up — each row twice the last
      const rows = [1, 2, 4, 8], base = 770, bw = 48, bh = 84;
      let k = 0;
      rows.forEach((n, r) => {
        const y = base - (r + 1) * (bh + 8), x0 = 640 - n * (bw + 4) / 2;
        for (let j = 0; j < n; j++, k++) {
          const a = S.at(r < 2 ? 0 : 1, (r < 2 ? r * .5 : (r - 2) * .6) + j * .05 + .2, .8, soft);
          if (a <= 0) continue;
          ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 20);
          const col = [C.gold, '#A07A3E', C.goldHi, '#7A5A24'][k % 4];
          ctx.fillStyle = rgba(col, .85); ctx.fillRect(x0 + j * (bw + 4), y, bw, bh);
          ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(x0 + j * (bw + 4), y + 12, bw, 4); ctx.fillRect(x0 + j * (bw + 4), y + bh - 16, bw, 4);
          ctx.restore();
        }
        K.text(ctx, '×' + n, 640 + n * (bw + 4) / 2 + 30, y + bh / 2 + 8, { font: F.latin(500, 22), color: C.goldHi, alpha: S.at(r < 2 ? 0 : 1, (r < 2 ? r * .5 : (r - 2) * .6) + .6, .8, soft) });
      });
      K.baseline(ctx, 300, 980, base + 6, { p: S.at(0, 0, 1.0, soft), step: 40 });
      K.text(ctx, '知识', 640, 290, { font: F.serif(900, 30), color: C.goldHi, align: 'center', spacing: 10, alpha: S.at(0, .3, 1.0, soft), glow: .5 });
      // the money printer: a compounding curve
      const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([1080 + u * 560, 760 - (Math.pow(2, u * 7) - 1) / 127 * 440]); }
      K.baseline(ctx, 1080, 1640, 770, { p: S.at(1, 0, 1.0, soft), step: 44 });
      K.dotted(ctx, pts, S.at(1, .2, 1.8, soft), { gap: 7, r: 2.2, color: C.red });
      K.goldText(ctx, '财富印钞机', 1360, 330, 40, { alpha: S.at(1, 1.0, 1.0, soft), glow: 1 });
    } },

  { id: 'farewell', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03 },
    lines: ['2023年底，这位{99岁}的智者安详离世。', '他留下的《{穷查理宝典}》，启迪了无数人。'],
    visual(ctx, S) {
      // an empty chair under a soft light
      const a = S.p(0, 1.6, soft), cx = 640, fy = 740;
      const L = ctx.createRadialGradient(cx, 300, 10, cx, 560, 420); L.addColorStop(0, rgba(C.goldHi, .2 * a)); L.addColorStop(1, rgba(C.goldHi, 0));
      ctx.fillStyle = L; ctx.beginPath(); ctx.moveTo(cx - 40, 240); ctx.lineTo(cx + 40, 240); ctx.lineTo(cx + 300, fy); ctx.lineTo(cx - 300, fy); ctx.closePath(); ctx.fill();
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.moveTo(cx - 90, fy); ctx.lineTo(cx - 90, 590); ctx.lineTo(cx + 90, 590); ctx.lineTo(cx + 90, fy);   // legs + seat
      ctx.moveTo(cx - 100, 590); ctx.lineTo(cx + 100, 590);
      ctx.moveTo(cx + 90, 590); ctx.lineTo(cx + 110, 400); ctx.moveTo(cx - 90, 590); ctx.lineTo(cx - 70, 400);   // back posts
      ctx.moveTo(cx - 70, 400); ctx.lineTo(cx + 110, 400); ctx.moveTo(cx - 76, 460); ctx.lineTo(cx + 104, 460);
      ctx.stroke(); ctx.restore();
      K.line(ctx, cx - 320, fy, cx + 320, fy, { color: rgba(C.gold, .5) });
      K.text(ctx, '1924 — 2023', cx, 800, { font: F.latin(500, 22), color: C.goldHi, align: 'center', spacing: 8, alpha: S.at(0, .6, 1.0, soft) });
      K.text(ctx, '99 岁', cx, 300, { font: F.serif(900, 28), color: C.white, align: 'center', spacing: 8, alpha: S.at(0, 1.0, 1.0, soft) });
      book(ctx, 1180, 300, 360, 470, S.at(1, .2, 1.4, soft), '穷查理宝典', "POOR CHARLIE'S ALMANACK", 'CHARLIE MUNGER', 32);
    } },

  { id: 'final', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    lines: ['想得到某样东西，最可靠的办法，', '是让你自己{配得上它}。'],
    visual(ctx, S) {
      const d = { x: 260, y: 270, w: 520, h: 520 }, a = S.p(0, 1.6, soft);
      photo(ctx, d, crop(lerp(1.6, 1.75, S.t / S.dur), .5, .4, 1), { alpha: a, vig: .75 });
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.6, 1.0, soft));
      riseText(ctx, '传奇落幕 · 智慧永存', 1290, 420, 40, S.t - S.beat(0) - .4, { spacing: 6, stagger: .08, dur: 1.1 });
      const q = S.at(1, .2, 1.2, soft);
      K.rule(ctx, 1290, 470, 300, q);
      K.text(ctx, '“想得到某样东西，', 1290, 560, { font: F.serif(700, 25), color: C.white, align: 'center', alpha: q });
      K.text(ctx, '最可靠的办法是让你自己配得上它。”', 1290, 614, { font: F.serif(700, 25), color: C.white, align: 'center', alpha: q });
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
      K.text(ctx, '终极智者查理芒格 · 完', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 6, alpha: S.p(1.1, 1.2, soft) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.5, 1.2, soft) });
    } },
  ],
};
})();

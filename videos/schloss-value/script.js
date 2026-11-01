/* ============================================================
   《价值苦行僧沃尔特施洛斯》 — content for the TradingNow film engine (index.html)

   A scene:
     { id, header?, lines?: [subtitle markup], visual?(ctx, S, K), tr?: transition into this scene,
       camera?: {z0,z1,x0,x1,y0,y1}, dur?: fixed seconds, noWatermark? }
   Subtitle markup:  {金色重点}  [红色/多头]  <绿色/空头>
   S (scene clock):  S.t, S.at(line, delay, dur) → eased 0..1, S.lin(...), S.p(sec, dur), S.beat(line)
   Transitions:      'zoom' | ['push', ±1] | 'sweep' | ['iris', [x,y]] | 'dissolve'

   One continuous story (no modules), paced to end with the supplied track (≈ 58 s).
   Same smooth motion as the Graham, Lynch, Munger and Fisher films: 1.4 s transitions, gentle cameras, only soft eases,
   a title whose characters rise out of a blur.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, rgba, mix, F } = K;
const soft = x => { x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10); };      // smootherstep: zero velocity at both ends

/* the portrait (assets/portrait.jpg, supplied with the brief) — added to the page so ASSETS_READY waits for it */
const PHOTO = new Image(); PHOTO.src = 'assets/portrait.jpg'; PHOTO.hidden = true; document.body.appendChild(PHOTO);

/* one constant header for the whole story: no modules, only the book-title corner (label ' ' hides the module tag) */
const HD = { label: ' ', en: 'Walter Schloss', zh: '《价值苦行僧》' };

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
  const W0 = PHOTO.naturalWidth || 996, H0_ = PHOTO.naturalHeight || 1008;
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
// 47 years of compounding (illustrative): ~15 % a year vs. the index's ~10 %
const FUND = [], SPX = [];
for (let i = 0; i <= 94; i++) { const u = i / 94, y = u * 47, w = Math.sin(i * .8) * .04 + Math.sin(i * .21) * .06;
  FUND.push([280 + u * 900, 740 - (Math.pow(1.153, y) * (1 + w) - 1) / (Math.pow(1.153, 47) - 1) * 430]);
  SPX.push([280 + u * 900, 740 - (Math.pow(1.10, y) * (1 + w * .6) - 1) / (Math.pow(1.153, 47) - 1) * 430]); }

window.FILM = {
  title: '价值苦行僧沃尔特施洛斯',
  transition: 1.4,                                          // a longer, softer overlap between scenes
  fontScale: 1.55,
  subtitle: { x: 220, y: 912, size: 42, maxW: 1480 },     // 42 × FS 1.55 = 65px
  timing: { perChar: .14, base: .9, minLine: 2.0, pre: .3, post: .3 },   // one continuous story, paced to the track
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', dur: 4.6, camera: { z0: 1.05, z1: 1.0 }, lines: ['投资的第一条铁律：', '{永远不要亏钱}。'],
    visual(ctx, S) {
      // falling price dots meet a gold floor and stop; nothing gets through
      const fy = 640, floor = S.at(1, 0, 1.2, soft), R2 = K.rng(66);
      K.line(ctx, 260, fy, lerp(260, 1660, floor), fy, { color: C.goldHi, width: 3, glow: .9 });
      for (let i = 0; i < 90; i++) {
        const x = 300 + R2() * 1320, d = R2() * 1.6, sp = 160 + R2() * 140, t = Math.max(0, S.t - d);
        let y = 240 + t * sp; const hit = y >= fy - 6 && floor > (x - 260) / 1400;
        if (hit) y = fy - 6 - Math.abs(Math.sin((t - (fy - 246) / sp) * 6)) * 30 * Math.exp(-(t - (fy - 246) / sp) * 3);
        y = Math.min(y, hit ? fy - 6 : 820);
        const a = clamp(t * 2) * (y > 800 ? 0 : 1);
        ctx.fillStyle = rgba(hit ? C.goldHi : C.green, .8 * a); ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 6.2832); ctx.fill();
      }
      K.text(ctx, '不 亏 钱', 960, fy + 70, { font: F.serif(900, 30), color: C.goldHi, align: 'center', spacing: 10, alpha: S.at(1, .8, 1.0, soft), glow: .6 });
      K.text(ctx, '第一条铁律', 960, 300, { font: F.serif(700, 24), color: C.gray, align: 'center', spacing: 10, alpha: S.at(0, .2, 1.0, soft) });
    } },

  /* ================= TITLE ================= */
  { id: 'title', dur: 4.6, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    visual(ctx, S) {
      const cx = 960, t = S.t;
      const bg = K.gen.path([100, 103, 101, 107, 105, 112, 110, 118, 116, 126], { per: 5, seed: 16 });
      const ch = new K.Chart(bg.candles, { x: 140 - t * 10, y: 210, w: 1700, h: 620 });
      ch.draw(ctx, bg.candles.length, { alpha: .14 * soft(t / 2.2), glow: 0, color: () => C.gold });
      const e = soft((t - .1) / 1.8);
      K.text(ctx, 'WALTER  SCHLOSS', cx, 384, { font: F.latin(500, 22), color: C.gold, align: 'center', spacing: lerp(30, 12, e), alpha: e });
      riseText(ctx, '价值苦行僧', cx, 528, 72, t - .45, { spacing: 20, stagger: .14, dur: 1.3 });
      const sw = soft((t - 1.9) / 1.8);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(520, 1400, sw), g = ctx.createLinearGradient(x - 120, 0, x + 120, 0), a = .26 * Math.sin(Math.PI * sw);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, `rgba(255,240,200,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 120, 410, 240, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 340, soft((t - 1.2) / 1.8));
      const s = soft((t - 1.9) / 1.4);
      K.text(ctx, '纯粹的深度价值投资者 · 沃尔特·施洛斯', cx, 650 + (1 - s) * 14, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 6, alpha: s });
    } },

  /* ================= 人物画像 ================= */
  { id: 'intro', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03, x1: -12 },
    lines: ['他是华尔街最朴素的价值苦行僧，', '只要能做到{不亏钱}，赚钱就是顺理成章的事。'],
    visual(ctx, S) {
      const d = { x: 280, y: 250, w: 460, h: 470 }, rv = S.p(0, 1.6, soft);
      ctx.save(); ctx.beginPath(); const hh = d.h * rv; ctx.rect(d.x - 20, d.y + (d.h - hh) / 2, d.w + 40, hh); ctx.clip();
      photo(ctx, d, crop(lerp(1.0, 1.08, S.t / S.dur), .45, .4, d.w / d.h));
      ctx.restore();
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.6, 1.0, soft));
      K.text(ctx, '1916 — 2012', d.x + d.w / 2, d.y + d.h + 44, { font: F.latin(500, 18), color: C.goldHi, align: 'center', spacing: 6, alpha: S.p(1.0, 1.0, soft) });
      const x0 = 860, nm = S.p(.3, 1.2, soft);
      K.text(ctx, '沃尔特·施洛斯', x0, 318 + (1 - nm) * 16, { font: F.serif(900, 40), color: C.white, alpha: nm, spacing: 4 });
      K.text(ctx, 'WALTER SCHLOSS', x0 + 2, 362, { font: F.latin(500, 19), color: C.gray, spacing: 6, alpha: S.p(.6, 1.0, soft) });
      K.tag(ctx, x0, 410, '价值苦行僧', { align: 'left', alpha: S.p(.8, .9, soft), color: C.gold });
      K.tag(ctx, x0 + 200, 410, '巴菲特公开致敬', { align: 'left', alpha: S.at(0, 1.0, .9, soft), color: C.gold });
      const q = S.at(0, .4, 1.0, soft);
      K.text(ctx, '“', x0 - 6, 545, { font: F.latin(500, 64), color: C.gold, alpha: q * .9 });
      K.rich(ctx, '投资的第一条铁律：', { x: x0 + 70, y: 510, size: 30, weight: 700, t: S.t - S.beat(0) - .4, anchorTop: true, stagger: .04 });
      K.rich(ctx, '{永远不要亏钱}。', { x: x0 + 70, y: 572, size: 30, weight: 700, t: S.t - S.beat(0) - .8, anchorTop: true, stagger: .04 });
      K.line(ctx, x0, 614, x0 + 760, 614, { p: q, color: rgba(C.gold, .4) });
      K.tag(ctx, x0 + 380, 690, '不亏钱 → 赚钱', { alpha: S.at(1, .4, 1.0, soft), color: C.gold, font: F.serif(900, 22) });
    } },

  { id: 'disciple', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03 },
    lines: ['他是{格雷厄姆}的得意门生，', '没有豪华办公室，不看盘，不听内幕。'],
    visual(ctx, S) {
      const c = S.at(0, .1, 1.2, soft);
      if (c > 0) {
        const done = card(ctx, 640, 270 + (1 - c) * 24, 640, 230, c);
        K.text(ctx, 'GRAHAM-NEWMAN · 1946 — 1955', 320, 62, { font: F.latin(500, 18), color: C.gold, align: 'center', spacing: 5 });
        K.text(ctx, '师从格雷厄姆', 320, 134, { font: F.serif(900, 40), color: C.white, align: 'center', spacing: 6 });
        K.text(ctx, '与巴菲特同门', 320, 192, { font: F.serif(700, 22), color: C.goldHi, align: 'center', spacing: 6 });
        done();
      }
      [['豪华办公室', 520], ['盯盘', 960], ['内幕消息', 1400]].forEach(([nm, x], i) => {
        const a = S.at(1, .1 + i * .35, .9, soft), cr = S.at(1, .5 + i * .35, .6, soft);
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a * (1 - cr * .4); ctx.strokeStyle = rgba(C.gray, .7); ctx.lineWidth = 1.2; ctx.strokeRect(x - 150, 610, 300, 110); ctx.restore();
        K.text(ctx, nm, x, 676, { font: F.serif(900, 28), color: C.white, align: 'center', spacing: 4, alpha: a * (1 - cr * .4) });
        if (cr > 0) { ctx.save(); ctx.strokeStyle = C.red; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.globalAlpha = cr;
          ctx.beginPath(); ctx.moveTo(x - 60, 625); ctx.lineTo(lerp(x - 60, x + 60, cr), lerp(625, 705, cr)); ctx.moveTo(x + 60, 625); ctx.lineTo(lerp(x + 60, x - 60, cr), lerp(625, 705, cr)); ctx.stroke(); ctx.restore(); }
      });
    } },

  { id: 'cheap', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['他只翻财务报表，寻找价格{跌破净资产}的公司，', '“不了解就不要盲从，{便宜就是硬道理}。”'],
    visual(ctx, S) {
      // the annual report, then the arithmetic: price below book value
      const r = S.at(0, 0, 1.2, soft);
      for (let k = 0; k < 4; k++) {
        const x = 360 + k * 18, y = 300 + k * 14, a = r * (1 - k * .15);
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(236,230,217,.9)'; ctx.fillRect(x, y, 300, 400); ctx.strokeStyle = rgba(C.gold, .6); ctx.strokeRect(x, y, 300, 400);
        if (k === 3) { ctx.fillStyle = rgba(C.gray, .6); for (let l = 0; l < 10; l++) ctx.fillRect(x + 30, y + 80 + l * 28, 240 - (l * 37) % 90, 8); }
        ctx.restore();
      }
      K.text(ctx, '财务报表', 564, 400, { font: F.serif(900, 30), color: '#1A1408', align: 'center', spacing: 8, alpha: r });
      const base = 760, top = 320, H = base - top, b = S.at(0, 1.2, 1.2, soft), f = S.at(1, 0, 1.4, soft);
      ctx.save(); ctx.globalAlpha = b; const gv = ctx.createLinearGradient(0, top, 0, base); gv.addColorStop(0, '#F5DFA0'); gv.addColorStop(1, '#8A6A2E');
      ctx.fillStyle = gv; ctx.fillRect(1040, base - H * b, 180, H * b); ctx.restore();
      K.text(ctx, '净资产', 1130, base + 44, { font: F.serif(900, 24), color: C.goldHi, align: 'center', spacing: 6, alpha: b });
      const pv = lerp(1, .55, f), ph = H * pv;
      ctx.save(); ctx.globalAlpha = b; ctx.fillStyle = rgba(C.white, .82); ctx.fillRect(1320, base - ph, 180, ph); ctx.restore();
      K.text(ctx, '股价', 1410, base + 44, { font: F.serif(900, 24), color: C.white, align: 'center', spacing: 6, alpha: b });
      K.dash(ctx, 1040, top, 1560, top, { p: f, alpha: .6, dash: [4, 7] });
      K.tag(ctx, 1410, base - ph - 40, '破产价 · 便宜', { alpha: S.at(1, .8, .9, soft), color: C.red, font: F.serif(900, 20) });
    } },

  { id: 'record', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03 },
    lines: ['47年，他的基金长期{跑赢标普500}，', '平稳复利，累计回报[上百倍]。'],
    visual(ctx, S) {
      const p = S.at(0, .1, 2.6, soft) * .6 + S.at(1, 0, 1.8, soft) * .4;
      K.baseline(ctx, 280, 1180, 750, { p: S.at(0, 0, 1.2, soft), step: 46 });
      K.text(ctx, '1955', 280, 786, { font: F.latin(500, 20), color: C.gray, spacing: 4, alpha: S.at(0, .2, .9, soft) });
      K.text(ctx, '2002', 1180, 786, { font: F.latin(500, 20), color: C.gray, align: 'right', spacing: 4, alpha: S.at(0, .2, .9, soft) });
      K.dotted(ctx, SPX, p, { gap: 7, r: 1.6, color: C.gray, glow: false });
      K.dotted(ctx, FUND, p, { gap: 6, r: 2.2, color: C.goldHi });
      K.text(ctx, '施洛斯基金', FUND[FUND.length - 1][0] - 10, FUND[FUND.length - 1][1] - 26, { font: F.serif(900, 22), color: C.goldHi, align: 'right', alpha: S.at(1, 1.2, .8, soft) });
      K.text(ctx, '标普500 · 示意', SPX[SPX.length - 1][0], SPX[SPX.length - 1][1] - 18, { font: F.serif(700, 18), color: C.gray, align: 'right', alpha: S.at(1, 1.2, .8, soft) });
      K.goldText(ctx, '47 年', 1480, 420, 64, { alpha: S.at(0, .4, 1.2, soft), glow: 1.1 });
      const n = S.at(1, .3, 1.8, soft);
      K.text(ctx, '×' + Math.max(1, Math.round(Math.pow(100, n))) + (n > .98 ? '+' : ''), 1480, 540, { font: F.serif(900, 44), color: C.red, align: 'center', alpha: n, glow: .5, glowColor: C.red });
      K.text(ctx, '累计回报', 1480, 600, { font: F.serif(700, 22), color: C.gray, align: 'center', spacing: 8, alpha: n });
    } },

  { id: 'dumb', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['笨人有笨方法：', '老老实实{买便宜货}，时间会给你最丰厚的回报。'],
    visual(ctx, S) {
      // a staircase, one cheap stock per step
      const n = 8, x0 = 340, y0 = 760, sw = 150, sh = 54;
      for (let i = 0; i < n; i++) {
        const a = S.at(i < 3 ? 0 : 1, (i < 3 ? i * .35 : (i - 3) * .32) + .2, .9, soft);
        if (a <= 0) continue;
        const x = x0 + i * sw, y = y0 - (i + 1) * sh;
        ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = rgba(C.gold, .14 + i * .03); ctx.strokeStyle = rgba(C.goldHi, .8); ctx.lineWidth = 1.4;
        ctx.fillRect(x, y + (1 - a) * 20, sw - 6, y0 - y - (1 - a) * 20); ctx.strokeRect(x, y + (1 - a) * 20, sw - 6, y0 - y - (1 - a) * 20); ctx.restore();
        K.text(ctx, '便宜货', x + (sw - 6) / 2, y + 34, { font: F.serif(700, 16), color: C.goldHi, align: 'center', alpha: a });
      }
      const top = S.at(1, 2.4, 1.0, soft);
      K.goldText(ctx, '时间的回报', 1560, 300, 40, { alpha: top, glow: 1 });
      K.text(ctx, '笨方法 · 一步一个台阶', 640, 300, { font: F.serif(900, 26), color: C.white, align: 'center', spacing: 6, alpha: S.at(0, .3, 1.0, soft) });
    } },

  { id: 'legacy', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03 },
    lines: ['2012年，他以{95岁}高龄离世。'],
    visual(ctx, S) {
      const y = 500, X = yr => lerp(300, 1620, (yr - 1916) / 96), ra = S.at(0, -.2, 1.6, soft);
      K.line(ctx, 300, y, lerp(300, 1620, ra), y, { color: rgba(C.gold, .7), width: 2 });
      [[1916, '出生'], [1946, '加入格雷厄姆'], [1955, '自立门户'], [2002, '退休'], [2012, '95岁 · 离世']].forEach(([yr, lb], i) => {
        const a = S.at(0, i * .3, .9, soft), hi = i === 4;
        K.marker(ctx, X(yr), y, { alpha: a, r: hi ? 10 : 6, color: hi ? C.goldHi : C.gold });
        K.text(ctx, String(yr), X(yr), y - (i % 2 ? 60 : 24), { font: F.latin(500, 20), color: C.gray, align: 'center', alpha: a, spacing: 2 });
        K.text(ctx, lb, X(yr), y + (i % 2 ? 84 : 48), { font: F.serif(700, 20), color: hi ? C.goldHi : C.white, align: 'center', alpha: a });
      });
      K.bracket(ctx, X(1955), X(2002), y - 110, '47 年 · 长寿与长牛', { p: S.at(0, 1.2, 1.2, soft), font: F.serif(900, 24) });
    } },

  { id: 'final', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    lines: ['拒绝诱惑，保持简单，', '市场终会奖赏{守纪律的老实人}。'],
    visual(ctx, S) {
      const d = { x: 260, y: 270, w: 520, h: 520 }, a = S.p(0, 1.6, soft);
      photo(ctx, d, crop(lerp(1.5, 1.65, S.t / S.dur), .45, .38, 1), { alpha: a, vig: .75 });
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.6, 1.0, soft));
      riseText(ctx, '大智若愚 · 功德圆满', 1290, 420, 40, S.t - S.beat(0) - .4, { spacing: 6, stagger: .08, dur: 1.1 });
      const q = S.at(1, .2, 1.2, soft);
      K.rule(ctx, 1290, 470, 300, q);
      K.text(ctx, '“保持简单，保持诚实，', 1290, 560, { font: F.serif(700, 25), color: C.white, align: 'center', alpha: q });
      K.text(ctx, '市场终会给老实人应有的奖赏。”', 1290, 614, { font: F.serif(700, 25), color: C.white, align: 'center', alpha: q });
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
      K.text(ctx, '价值苦行僧沃尔特施洛斯 · 完', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 6, alpha: S.p(1.1, 1.2, soft) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.5, 1.2, soft) });
    } },
  ],
};
})();

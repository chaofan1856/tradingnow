/* ============================================================
   《公募基金第一人彼得林奇》 — content for the TradingNow film engine (index.html)

   A scene:
     { id, header?, lines?: [subtitle markup], visual?(ctx, S, K), tr?: transition into this scene,
       camera?: {z0,z1,x0,x1,y0,y1}, dur?: fixed seconds, noWatermark? }
   Subtitle markup:  {金色重点}  [红色/多头]  <绿色/空头>
   S (scene clock):  S.t, S.at(line, delay, dur) → eased 0..1, S.lin(...), S.p(sec, dur), S.beat(line)
   Transitions:      'zoom' | ['push', ±1] | 'sweep' | ['iris', [x,y]] | 'dissolve'

   One continuous story (no modules), paced to end with the supplied track (≈ 58 s).
   Same smooth motion as the Graham film: 1.4 s transitions, gentle cameras, only soft eases,
   a title whose characters rise out of a blur.
   ============================================================ */
(() => {
const { C, clamp, lerp, easeOut, easeInOut, rgba, mix, F } = K;
const soft = x => { x = clamp(x); return x * x * x * (x * (6 * x - 15) + 10); };      // smootherstep: zero velocity at both ends

/* the portrait (assets/portrait.jpg, supplied with the brief) — added to the page so ASSETS_READY waits for it */
const PHOTO = new Image(); PHOTO.src = 'assets/portrait.jpg'; PHOTO.hidden = true; document.body.appendChild(PHOTO);

/* one constant header for the whole story: no modules, only the book-title corner (label ' ' hides the module tag) */
const HD = { label: ' ', en: 'Peter Lynch', zh: '《公募基金第一人》' };

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
  const W0 = PHOTO.naturalWidth || 1408, H0_ = PHOTO.naturalHeight || 792;
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
// Magellan vs. the market, 1977–1990 (illustrative): 29 % a year against the index
const MAG = [], SPX = [];
for (let i = 0; i <= 78; i++) { const u = i / 78, y = u * 13, w = Math.sin(i * .9) * .05 + Math.sin(i * .37) * .07;
  MAG.push([280 + u * 920, 740 - (Math.pow(1.29, y) * (1 + w) - 1) / (Math.pow(1.29, 13) - 1) * 420]);
  SPX.push([280 + u * 920, 740 - (Math.pow(1.155, y) * (1 + w * .6) - 1) / (Math.pow(1.29, 13) - 1) * 420]); }
// 1987: Black Monday, then the climb back
const C87 = K.gen.seq(100, [[1.5, 1, .8], [-1, 1, 1], [1.2, 1, .8], [-2, 1, 1.5], [-3, 1, 2], [-6, 1, 2], [-22.6, 1, 3], [3, 2, 1], [2, 1, 2],
  [3, 1, 1], [-1, 1, 1], [2.5, 1, 1], [3, 1, 1], [2, 1, 1], [3, 1, 1.5], [2.5, 1, 1], [3, 1, 1]]);
const CBOX = { x: 260, y: 300, w: 900, h: 430 };
const chart87 = new K.Chart(C87, CBOX);

window.FILM = {
  title: '公募基金第一人彼得林奇',
  transition: 1.4,                                          // a longer, softer overlap between scenes
  fontScale: 1.55,
  subtitle: { x: 220, y: 912, size: 42, maxW: 1480 },     // 42 × FS 1.55 = 65px
  timing: { perChar: .112, base: .79, minLine: 2.0, pre: .3, post: .3 },   // one continuous story, paced to the track
  scenes: [

  /* ================= COLD OPEN ================= */
  { id: 'open', dur: 4.6, camera: { z0: 1.05, z1: 1.0 }, lines: ['常识，', '往往比华尔街的{专业分析}更有用。'],
    visual(ctx, S) {
      // a tangle of "professional" lines; out of it, gold dots gather into a light bulb
      const R2 = K.rng(41), tang = S.at(0, -.2, 1.2, soft) * (1 - S.at(1, .4, 1.2, soft) * .8);
      ctx.save(); ctx.globalAlpha = tang * .6; ctx.strokeStyle = C.gray; ctx.lineWidth = 1;
      for (let k = 0; k < 9; k++) { ctx.beginPath(); let y = 380 + R2() * 300;
        for (let i = 0; i <= 60; i++) { y += (R2() - .5) * 40; y = clamp(y, 300, 760); const x = 200 + i * 25; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      ctx.restore();
      K.text(ctx, '专业分析', 1600, 300, { font: F.serif(700, 22), color: C.gray, align: 'center', spacing: 6, alpha: tang });
      // the bulb: 140 dots from random places to its outline
      const N = 140, f = S.at(1, 0, 1.6, soft), cx = 960, cy = 470, R = 150, pts = [];
      for (let i = 0; i < N; i++) {
        const u = i / N; let x, y;
        if (u < .72) { const a = Math.PI * .72 + u / .72 * Math.PI * 1.56; x = cx + Math.cos(a) * R; y = cy + Math.sin(a) * R; }
        else { const k = (u - .72) / .28, row = Math.floor(k * 4); x = cx - 70 + (k * 4 - row) * 140; y = cy + R * .95 + 24 + row * 26; }
        pts.push([x, y]);
      }
      const R3 = K.rng(42);
      pts.forEach(([x1, y1], i) => {
        const x0 = 200 + R3() * 1520, y0 = 300 + R3() * 460, p = soft(f * 1.25 - R3() * .25);
        ctx.fillStyle = rgba(C.goldHi, .5 + .4 * p); ctx.shadowColor = C.gold; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(lerp(x0, x1, p), lerp(y0, y1, p), lerp(1.4, 2.6, p), 0, 6.2832); ctx.fill();
      });
      ctx.shadowBlur = 0;
      const glow = S.at(1, 1.0, 1.2, soft);
      if (glow > 0) { const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 300); g.addColorStop(0, rgba(C.goldHi, .3 * glow)); g.addColorStop(1, rgba(C.goldHi, 0)); ctx.fillStyle = g; ctx.fillRect(cx - 300, cy - 300, 600, 600); }
      K.text(ctx, '常 识', cx, cy + 14, { font: F.serif(900, 34), color: C.goldHi, align: 'center', spacing: 8, alpha: glow, glow: .6 });
    } },

  /* ================= TITLE ================= */
  { id: 'title', dur: 4.6, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    visual(ctx, S) {
      const cx = 960, t = S.t;
      const bg = K.gen.path([100, 108, 104, 118, 112, 130, 124, 146, 138, 165], { per: 5, seed: 12 });
      const ch = new K.Chart(bg.candles, { x: 140 - t * 10, y: 210, w: 1700, h: 620 });
      ch.draw(ctx, bg.candles.length, { alpha: .14 * soft(t / 2.2), glow: 0, color: () => C.gold });
      const e = soft((t - .1) / 1.8);
      K.text(ctx, 'PETER  LYNCH', cx, 384, { font: F.latin(500, 22), color: C.gold, align: 'center', spacing: lerp(30, 12, e), alpha: e });
      riseText(ctx, '公募基金第一人', cx, 528, 72, t - .45, { spacing: 16, stagger: .12, dur: 1.3 });
      const sw = soft((t - 1.9) / 1.8);
      if (sw > 0 && sw < 1) {
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const x = lerp(430, 1490, sw), g = ctx.createLinearGradient(x - 120, 0, x + 120, 0), a = .26 * Math.sin(Math.PI * sw);
        g.addColorStop(0, 'rgba(255,240,200,0)'); g.addColorStop(.5, `rgba(255,240,200,${a.toFixed(3)})`); g.addColorStop(1, 'rgba(255,240,200,0)');
        ctx.fillStyle = g; ctx.fillRect(x - 120, 410, 240, 150); ctx.restore();
      }
      K.rule(ctx, cx, 590, 340, soft((t - 1.2) / 1.8));
      const s = soft((t - 1.9) / 1.4);
      K.text(ctx, '传奇基金经理 · 彼得·林奇', cx, 650 + (1 - s) * 14, { font: F.serif(500, 26), color: C.gray, align: 'center', spacing: 8, alpha: s });
    } },

  /* ================= 人物画像 ================= */
  { id: 'intro', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03, x1: -12 },
    lines: ['他是公募基金史上最耀眼的战神，', '散户的{逆袭偶像}，用{生活智慧}打破机构神话。'],
    visual(ctx, S) {
      const d = { x: 220, y: 300, w: 640, h: 380 }, rv = S.p(0, 1.6, soft);
      ctx.save(); ctx.beginPath(); const ww = d.w * rv; ctx.rect(d.x + (d.w - ww) / 2, d.y - 20, ww, d.h + 40); ctx.clip();
      photo(ctx, d, crop(lerp(1.15, 1.25, S.t / S.dur), .66, .42, d.w / d.h));
      ctx.restore();
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.6, 1.0, soft));
      K.text(ctx, 'MAGELLAN FUND · 1977 — 1990', d.x + d.w / 2, d.y + d.h + 44, { font: F.latin(500, 18), color: C.goldHi, align: 'center', spacing: 4, alpha: S.p(1.0, 1.0, soft) });
      const x0 = 940, nm = S.p(.3, 1.2, soft);
      K.text(ctx, '彼得·林奇', x0, 340 + (1 - nm) * 16, { font: F.serif(900, 40), color: C.white, alpha: nm, spacing: 4 });
      K.text(ctx, 'PETER LYNCH', x0 + 2, 384, { font: F.latin(500, 19), color: C.gray, spacing: 6, alpha: S.p(.6, 1.0, soft) });
      K.tag(ctx, x0, 432, '传奇基金经理', { align: 'left', alpha: S.p(.8, .9, soft), color: C.gold });
      K.tag(ctx, x0 + 236, 432, '散户之王', { align: 'left', alpha: S.at(1, .2, .9, soft), color: C.red });
      const q = S.at(0, .4, 1.0, soft);
      K.text(ctx, '“', x0 - 6, 565, { font: F.latin(500, 64), color: C.gold, alpha: q * .9 });
      K.rich(ctx, '常识往往比华尔街的', { x: x0 + 70, y: 530, size: 30, weight: 700, t: S.t - S.beat(0) - .4, anchorTop: true, stagger: .04 });
      K.rich(ctx, '{专业分析}更有用。', { x: x0 + 70, y: 592, size: 30, weight: 700, t: S.t - S.beat(0) - .8, anchorTop: true, stagger: .04 });
      K.line(ctx, x0, 634, x0 + 720, 634, { p: q, color: rgba(C.gold, .4) });
    } },

  { id: 'caddie', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03, x1: -12 },
    lines: ['他从{高尔夫球童}做起，', '1977年，接管{麦哲伦基金}。'],
    visual(ctx, S) {
      const y = 760, X = yr => lerp(300, 1620, (yr - 1944) / 46), ra = S.p(0, 1.2, soft);
      K.baseline(ctx, 300, 1620, y, { p: ra, step: 44 });
      [[1944, '出生', 0, 0], [1955, '球童', 0, .3], [1969, '加入富达', 1, -.3], [1977, '接管麦哲伦', 1, .2]].forEach(([yr, lb, ln, dl]) => {
        const a = S.at(ln, Math.max(0, dl) + .2, 1.0, soft), hi = yr === 1977;
        K.marker(ctx, X(yr), y, { alpha: a, r: hi ? 9 : 6, color: hi ? C.goldHi : C.gold });
        K.text(ctx, String(yr), X(yr), y + 40, { font: F.latin(500, 20), color: C.gray, align: 'center', alpha: a, spacing: 2 });
        K.text(ctx, lb, X(yr), y - 22, { font: F.serif(700, 19), color: hi ? C.goldHi : C.white, align: 'center', alpha: a });
      });
      // the caddie: a flag on a green
      const c1 = S.at(0, .3, 1.2, soft), fx = 560, fy = 600;
      if (c1 > 0) {
        ctx.save(); ctx.globalAlpha = c1;
        ctx.strokeStyle = rgba(C.goldHi, .7); ctx.setLineDash([3, 7]); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.ellipse(fx, fy + 6, 190, 30, 0, 0, 6.2832); ctx.stroke(); ctx.setLineDash([]);
        ctx.strokeStyle = C.goldHi; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - 250); ctx.stroke();
        ctx.fillStyle = C.red; const wv = Math.sin(S.t * 3) * 8;
        ctx.beginPath(); ctx.moveTo(fx, fy - 250); ctx.quadraticCurveTo(fx + 60, fy - 236 + wv, fx + 120, fy - 220); ctx.lineTo(fx, fy - 190); ctx.closePath(); ctx.fill();
        ctx.fillStyle = C.white; ctx.beginPath(); ctx.arc(fx - 60, fy - 2, 9, 0, 6.2832); ctx.fill();
        ctx.restore();
        K.text(ctx, '高尔夫球童', fx, 300, { font: F.serif(900, 28), color: C.goldHi, align: 'center', spacing: 8, alpha: c1 });
      }
      // the fund
      const c2 = S.at(1, .3, 1.2, soft);
      if (c2 > 0) {
        const done = card(ctx, 1040, 300 + (1 - c2) * 24, 520, 300, c2);
        K.text(ctx, 'MAGELLAN FUND', 260, 66, { font: F.latin(500, 20), color: C.gold, align: 'center', spacing: 8 });
        K.text(ctx, '麦哲伦基金', 260, 150, { font: F.serif(900, 40), color: C.white, align: 'center', spacing: 6 });
        K.text(ctx, '1977 · 接管', 260, 222, { font: F.serif(700, 22), color: C.goldHi, align: 'center', spacing: 6 });
        done();
        K.dash(ctx, 1300, 600 + (1 - c2) * 24, X(1977), y - 50, { p: S.at(1, .9, .8, soft), alpha: .6, dash: [3, 6] });
      }
    } },

  { id: 'mall', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['最好的股票，就藏在{日常生活}里。', '逛超市、逛商场，就能发现[十倍牛股]。'],
    visual(ctx, S) {
      // a street of shops; a magnifier strolls along and one shop lights up
      const shops = [['超市', 380], ['餐厅', 700], ['商场', 1020], ['品牌店', 1340]], y0 = 430, w = 260, h = 260;
      shops.forEach(([nm, x], i) => {
        const a = S.at(0, .1 + i * .18, 1.0, soft), lit = i === 2 ? S.at(1, .9, 1.0, soft) : 0;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(0, (1 - a) * 20);
        ctx.fillStyle = rgba(lit ? C.goldHi : C.gold, .08 + lit * .14); ctx.fillRect(x - w / 2, y0, w, h);
        ctx.strokeStyle = rgba(lit ? C.goldHi : C.gold, .6 + lit * .4); ctx.lineWidth = 1.4; ctx.strokeRect(x - w / 2, y0, w, h);
        for (let k = 0; k < 6; k++) { ctx.fillStyle = rgba(k % 2 ? C.gold : (lit ? C.red : C.gray), .7); ctx.beginPath(); ctx.moveTo(x - w / 2 + k * w / 6, y0); ctx.lineTo(x - w / 2 + (k + 1) * w / 6, y0); ctx.lineTo(x - w / 2 + (k + .5) * w / 6, y0 + 30); ctx.closePath(); ctx.fill(); }
        ctx.strokeStyle = rgba(C.gold, .5); ctx.strokeRect(x - 40, y0 + h - 110, 80, 110);
        ctx.restore();
        K.text(ctx, nm, x, y0 - 22, { font: F.serif(900, 24), color: lit ? C.goldHi : C.white, align: 'center', spacing: 6, alpha: a });
      });
      K.baseline(ctx, 220, 1500, y0 + h + 4, { p: S.at(0, 0, 1.2, soft), step: 48 });
      // the magnifier
      const m = S.at(0, 1.0, .8, soft), mx = lerp(380, 1020, S.at(1, -.4, 1.6, soft)), my = 560;
      if (m > 0) {
        ctx.save(); ctx.globalAlpha = m; ctx.strokeStyle = C.goldHi; ctx.lineWidth = 4; ctx.shadowColor = C.goldHi; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(mx, my, 58, 0, 6.2832); ctx.stroke(); ctx.beginPath(); ctx.moveTo(mx + 41, my + 41); ctx.lineTo(mx + 90, my + 90); ctx.stroke(); ctx.restore();
      }
      // the tenbagger
      const t = S.at(1, 1.4, 1.4, soft), pts = [];
      for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([1520 + u * 160, 690 - (Math.pow(10, u) - 1) / 9 * 340]); }
      K.dotted(ctx, pts, t, { gap: 6, r: 2.2, color: C.red });
      K.goldText(ctx, '×10', 1600, 330, 52, { alpha: S.at(1, 2.0, 1.0, soft), glow: 1.1 });
      ring(ctx, 1020, 560, S.lin(1, .9, 1.6), C.goldHi, 200);
    } },

  { id: 'poker', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03 },
    lines: ['但他也警告散户：', '“不进行研究的投资，就像打扑克{从不看牌}。”'],
    visual(ctx, S) {
      // five cards face down; on the rule, they turn over — research is looking at your cards
      const cw = 170, ch = 240, xs = [600, 780, 960, 1140, 1320], y = 340;
      xs.forEach((x, i) => {
        const a = S.at(0, i * .12, 1.0, soft), fl = S.at(1, .9 + i * .16, .9, soft), sx = Math.abs(Math.cos(fl * Math.PI)), front = fl > .5;
        if (a <= 0) return;
        ctx.save(); ctx.globalAlpha = a; ctx.translate(x, y + ch / 2 + (1 - a) * 30); ctx.rotate((i - 2) * .06); ctx.scale(Math.max(.02, sx), 1);
        ctx.fillStyle = front ? '#F2EADB' : '#1E180E'; ctx.strokeStyle = rgba(C.gold, .8); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.roundRect(-cw / 2, -ch / 2, cw, ch, 12); ctx.fill(); ctx.stroke();
        if (!front) { ctx.strokeStyle = rgba(C.gold, .35); ctx.lineWidth = 1; for (let k = -6; k <= 6; k++) { ctx.beginPath(); ctx.moveTo(-cw / 2 + 12, k * 18); ctx.lineTo(cw / 2 - 12, k * 18 + 40); ctx.stroke(); } }
        else { const r = ['A', 'K', 'Q', 'J', '10'][i], red = i % 2 === 0;
          ctx.fillStyle = red ? C.red : '#1A1408'; ctx.font = F.latin(500, 40); ctx.textAlign = 'center'; ctx.fillText(r, 0, 20);
          ctx.font = F.latin(500, 18); ctx.textAlign = 'left'; ctx.fillText(r, -cw / 2 + 12, -ch / 2 + 30); }
        ctx.restore();
      });
      const q = S.at(1, .1, 1.0, soft) * (1 - S.at(1, 1.6, .8, soft));
      K.text(ctx, '? ? ?', 960, 680, { font: F.latin(500, 40), color: C.gray, align: 'center', spacing: 20, alpha: q });
      K.tag(ctx, 960, 700, '研究，就是看牌', { alpha: S.at(1, 2.0, .9, soft), color: C.gold, font: F.serif(900, 24) });
    } },

  { id: 'return29', header: HD, tr: ['push', 1], camera: { z0: 1.0, z1: 1.03 },
    lines: ['执掌基金13年，他创造了[年化29%]的神话，', '基金规模从1800万美元涨到{140亿美元}。'],
    visual(ctx, S) {
      const p = S.at(0, .1, 2.4, soft);
      K.baseline(ctx, 280, 1200, 750, { p: S.at(0, 0, 1.2, soft), step: 46 });
      K.text(ctx, '1977', 280, 786, { font: F.latin(500, 20), color: C.gray, spacing: 4, alpha: S.at(0, .2, .9, soft) });
      K.text(ctx, '1990', 1200, 786, { font: F.latin(500, 20), color: C.gray, align: 'right', spacing: 4, alpha: S.at(0, .2, .9, soft) });
      K.dotted(ctx, SPX, p, { gap: 7, r: 1.6, color: C.gray, glow: false });
      K.dotted(ctx, MAG, p, { gap: 6, r: 2.2, color: C.goldHi });
      K.text(ctx, '麦哲伦基金', MAG[MAG.length - 1][0] - 10, MAG[MAG.length - 1][1] - 26, { font: F.serif(900, 22), color: C.goldHi, align: 'right', alpha: S.at(0, 2.2, .8, soft) });
      K.text(ctx, '大盘 · 示意', SPX[SPX.length - 1][0], SPX[SPX.length - 1][1] - 18, { font: F.serif(700, 18), color: C.gray, align: 'right', alpha: S.at(0, 2.2, .8, soft) });
      const n = S.at(0, .6, 1.8, soft);
      K.goldText(ctx, Math.round(29 * n) + '%', 1500, 420, 72, { alpha: n * (1 - S.at(1, 0, .8, soft) * .6), glow: 1.1 });
      K.text(ctx, '13 年年化', 1500, 488, { font: F.serif(900, 24), color: C.red, align: 'center', spacing: 8, alpha: n * (1 - S.at(1, 0, .8, soft) * .6) });
      // the fund's size: two circles, $18 million → $14 billion (area to scale would be invisible; shown as a jump)
      const g = S.at(1, .2, 1.8, soft);
      if (g > 0) {
        ctx.save(); ctx.globalAlpha = g;
        ctx.fillStyle = rgba(C.gray, .7); ctx.beginPath(); ctx.arc(1360, 680, 10, 0, 6.2832); ctx.fill();
        const r = lerp(10, 110, g), gg = ctx.createRadialGradient(1580, 680 - r * .3, r * .1, 1580, 680, r); gg.addColorStop(0, '#F5DFA0'); gg.addColorStop(1, '#8A6A2E');
        ctx.fillStyle = gg; ctx.shadowColor = rgba(C.gold, .5); ctx.shadowBlur = 24; ctx.beginPath(); ctx.arc(1580, 680, r, 0, 6.2832); ctx.fill();
        ctx.restore();
        K.text(ctx, '1800万', 1360, 640, { font: F.serif(700, 20), color: C.gray, align: 'center', alpha: g });
        K.text(ctx, '140亿美元', 1580, 680 + 8, { font: F.serif(900, 24), color: '#1A1408', align: 'center', alpha: clamp(g * 2 - 1) });
        K.arrow(ctx, 1385, 680, 1580 - r - 14, 680, { p: g, alpha: g, color: C.goldHi, width: 2 });
      }
    } },

  { id: 'crash87', header: HD, tr: 'zoom', camera: { z0: 1.0, z1: 1.03, x1: -12 },
    lines: ['即便遭遇1987年全球股灾，', '他证明了：选对公司，{暴跌就是送钱机会}。'],
    visual(ctx, S) {
      const ch = chart87, n = C87.length;
      const r = S.lin(0, 0, S.beat(1) + .2) * 8 + S.lin(1, .2, 1.8, soft) * (n - 8);
      K.baseline(ctx, CBOX.x, CBOX.x + CBOX.w, CBOX.y + CBOX.h + 30, { p: S.at(0, 0, 1.2, soft) });
      K.text(ctx, '1987', CBOX.x, CBOX.y + CBOX.h + 66, { font: F.latin(500, 20), color: C.gray, spacing: 4, alpha: S.at(0, .2, .9, soft) });
      K.text(ctx, '道琼斯 · 示意', CBOX.x + CBOX.w, CBOX.y + CBOX.h + 66, { font: F.serif(500, 16), color: C.gray, align: 'right', alpha: S.at(0, .2, .9, soft) });
      ch.draw(ctx, r, { glow: .4 });
      const bm = clamp((r - 6.6) / 1.2), bx = ch.x(6), by = ch.y(C87[6].l);
      K.marker(ctx, bx, by + 16, { alpha: bm, r: 10, color: C.green, label: '黑色星期一 −22.6%', pos: 'left', font: F.serif(900, 20), labelColor: C.green });
      // buying the fall
      [7, 8, 9].forEach((i, k) => K.marker(ctx, ch.x(i), ch.y(C87[i].l) + 14, { alpha: S.at(1, .4 + k * .25, .8, soft), r: 7, color: C.red }));
      K.tag(ctx, ch.x(9) + 40, ch.y(C87[12].h) - 70, '逆势买入', { alpha: S.at(1, 1.0, .9, soft), color: C.red, align: 'left' });
      const gift = S.at(1, 1.6, 1.0, soft);
      K.goldText(ctx, '送钱机会', 1460, 470, 52, { alpha: gift, glow: 1.1 });
      K.text(ctx, '选对公司 · 越跌越买', 1460, 536, { font: F.serif(700, 22), color: C.gray, align: 'center', spacing: 6, alpha: gift });
    } },

  { id: 'retire', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.03 },
    lines: ['46岁巅峰隐退，留下《{战胜华尔街}》等传世之作。'],
    visual(ctx, S) {
      // the peak: a career curve that stops at the top
      const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([260 + u * 760, 740 - Math.pow(u, 1.6) * 400]); }
      const p = S.at(0, -.2, 1.8, soft);
      K.baseline(ctx, 260, 1060, 750, { p: S.at(0, 0, 1.2, soft), step: 46 });
      K.dotted(ctx, pts, p, { gap: 6, r: 2.2 });
      const [px, py] = pts[pts.length - 1], pk = S.at(0, 1.4, 1.0, soft);
      K.marker(ctx, px, py, { alpha: pk, r: 12, color: C.goldHi, label: '1990 · 46岁 · 巅峰隐退', pos: 'left', font: F.serif(900, 22) });
      // the book
      const b = S.at(0, 1.0, 1.6, soft), bx = 1220, by = 280 + (1 - b) * 30, bw = 340, bh = 460;
      if (b > 0) {
        ctx.save(); ctx.globalAlpha = b;
        const g = ctx.createLinearGradient(bx, 0, bx + bw, 0); g.addColorStop(0, '#2A2113'); g.addColorStop(.06, '#3A2E1A'); g.addColorStop(1, '#1E180E');
        ctx.fillStyle = g; ctx.shadowColor = rgba(C.gold, .4); ctx.shadowBlur = 34; ctx.fillRect(bx, by, bw, bh); ctx.shadowBlur = 0;
        ctx.strokeStyle = rgba(C.gold, .75); ctx.lineWidth = 1.4; ctx.strokeRect(bx + 16, by + 16, bw - 32, bh - 32); ctx.restore();
        K.text(ctx, '战胜华尔街', bx + bw / 2, by + 200, { font: F.serif(900, 32), color: C.goldHi, align: 'center', spacing: 4, alpha: b });
        K.text(ctx, 'BEATING THE STREET', bx + bw / 2, by + 250, { font: F.latin(500, 13), color: C.gold, align: 'center', spacing: 3, alpha: b });
        K.text(ctx, 'PETER LYNCH · 1993', bx + bw / 2, by + bh - 50, { font: F.latin(500, 15), color: C.gray, align: 'center', spacing: 4, alpha: b });
      }
    } },

  { id: 'final', header: HD, tr: 'dissolve', camera: { z0: 1.0, z1: 1.04 },
    lines: ['投资是一场长跑，', '跟对自己的常识，你就是{自己的股神}。'],
    visual(ctx, S) {
      // the smile, close: the film rests on it
      const d = { x: 260, y: 270, w: 520, h: 520 }, a = S.p(0, 1.6, soft);
      photo(ctx, d, crop(lerp(2.0, 2.2, S.t / S.dur), .655, .3, 1), { alpha: a, vig: .75 });
      frame(ctx, d.x, d.y, d.w, d.h, S.p(.6, 1.0, soft));
      riseText(ctx, '巅峰隐退 · 散户之王', 1290, 420, 40, S.t - S.beat(0) - .4, { spacing: 6, stagger: .08, dur: 1.1 });
      const q = S.at(1, .4, 1.2, soft);
      K.rule(ctx, 1290, 470, 300, q);
      K.text(ctx, '“投资是艺术，也是科学，', 1290, 560, { font: F.serif(700, 25), color: C.white, align: 'center', alpha: q });
      K.text(ctx, '但最终战胜市场的是坚韧的性格。”', 1290, 614, { font: F.serif(700, 25), color: C.white, align: 'center', alpha: q });
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
      K.text(ctx, '公募基金第一人彼得林奇 · 完', 960, 625, { font: F.serif(700, 28), color: C.white, align: 'center', spacing: 6, alpha: S.p(1.1, 1.2, soft) });
      K.text(ctx, '内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。', 960, 940, { font: F.serif(500, 19), color: C.gray, align: 'center', spacing: 2, alpha: S.p(1.5, 1.2, soft) });
    } },
  ],
};
})();

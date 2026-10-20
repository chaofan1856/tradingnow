// 《占有欲》 scenes. Every function is a pure function of time t (seconds).
import {
  W, H, CX, CY, C, clamp, lerp, prog, smooth, eio, eoutExpo, einExpo, eoutCubic, einCubic, eoutQuart, eoutBack,
  eioExpo, spring, rand, hash, pulse, sinceLast, envAt, EV, BEAT, rotX, rotY, rotZ, project, neonLine, font,
  neonText, scramble, heartPath, corners, hudText,
} from './lib.js';

/* =====================================================================================
   cached glyph sprites (big type is drawn once, then blitted / sliced)
   ===================================================================================== */
const glyphCache = new Map();
export function glyph(str, size, { weight = 900, fam = 'SC', color = '#fff', stroke = 0, spacing = 0 } = {}) {
  const key = [str, size, weight, fam, color, stroke, spacing].join('|');
  if (glyphCache.has(key)) return glyphCache.get(key);
  const c = document.createElement('canvas');
  const x = c.getContext('2d');
  x.font = font(weight, size, fam);
  if (spacing) x.letterSpacing = `${spacing}px`;
  const w = Math.ceil(x.measureText(str).width + size * 0.3 + stroke * 2);
  const h = Math.ceil(size * 1.35 + stroke * 2);
  c.width = w; c.height = h;
  x.font = font(weight, size, fam);
  if (spacing) x.letterSpacing = `${spacing}px`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  if (stroke) {
    x.lineJoin = 'round'; x.strokeStyle = color; x.lineWidth = stroke;
    x.strokeText(str, w / 2 + spacing / 2, h / 2);
  } else {
    x.fillStyle = color; x.fillText(str, w / 2 + spacing / 2, h / 2);
  }
  const g = { c, w, h };
  glyphCache.set(key, g);
  return g;
}
function blit(ctx, g, x, y, s = 1, alpha = 1, comp) {
  if (alpha <= 0.002) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (comp) ctx.globalCompositeOperation = comp;
  ctx.drawImage(g.c, x - (g.w * s) / 2, y - (g.h * s) / 2, g.w * s, g.h * s);
  ctx.restore();
}
// glyph assembled from horizontal slices flying in from alternating sides
function sliceIn(ctx, g, x, y, p, { slices = 16, dist = 900, s = 1, alpha = 1, seed = 1 } = {}) {
  const sh = g.h / slices;
  ctx.save();
  ctx.globalAlpha *= alpha;
  for (let i = 0; i < slices; i++) {
    const d = clamp(p * 1.6 - hash(seed + i) * 0.6);
    const e = eoutExpo(d);
    const dir = i % 2 ? 1 : -1;
    const off = (1 - e) * dist * dir * (0.6 + hash(seed * 3 + i));
    if (d <= 0) continue;
    ctx.globalAlpha = alpha * clamp(d * 3);
    ctx.drawImage(g.c, 0, i * sh, g.w, sh + 0.5, x - (g.w * s) / 2 + off, y - (g.h * s) / 2 + i * sh * s, g.w * s, (sh + 0.5) * s);
  }
  ctx.restore();
}
// glyph cut into horizontal bands that slide apart
function sliceOut(ctx, g, x, y, p, { slices = 12, dist = 1200, s = 1, alpha = 1, seed = 5 } = {}) {
  const sh = g.h / slices;
  ctx.save();
  for (let i = 0; i < slices; i++) {
    const e = einCubic(clamp(p * 1.4 - hash(seed + i) * 0.4));
    const off = e * dist * (i % 2 ? 1 : -1) * (0.5 + hash(seed * 7 + i));
    ctx.globalAlpha = alpha * (1 - e);
    ctx.drawImage(g.c, 0, i * sh, g.w, sh + 0.5, x - (g.w * s) / 2 + off, y - (g.h * s) / 2 + i * sh * s, g.w * s, (sh + 0.5) * s);
  }
  ctx.restore();
}
// RGB-split neon word: magenta/cyan offset copies behind a white-hot core
function splitWord(ctx, str, x, y, size, { split = 8, alpha = 1, color = C.red, s = 1, weight = 900, fam = 'SC', spacing = 0 } = {}) {
  const gm = glyph(str, size, { color: C.magenta, weight, fam, spacing });
  const gc = glyph(str, size, { color: C.cyan, weight, fam, spacing });
  const gr = glyph(str, size, { color, weight, fam, spacing });
  const gw = glyph(str, size, { color: '#fff', weight, fam, spacing });
  blit(ctx, gm, x - split, y, s, alpha * 0.85, 'lighter');
  blit(ctx, gc, x + split, y, s, alpha * 0.75, 'lighter');
  blit(ctx, gr, x, y, s, alpha);
  blit(ctx, gw, x, y, s, alpha * 0.22);
}

/* =====================================================================================
   shared elements
   ===================================================================================== */
const RAIN = (() => {
  const r = rand(99);
  return Array.from({ length: 520 }, () => ({ x: r() * (W + 600) - 300, y: r() * (H + 400), l: 50 + r() * 120, a: 0.08 + r() * 0.3, sp: 0.7 + r() * 0.6, w: r() < 0.15 ? 2.2 : 1.2 }));
})();
function rain(ctx, t, { speed = 2600, alpha = 1, slant = 0.22, color = '200,240,255' } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const d of RAIN) {
    const y = ((d.y + t * speed * d.sp) % (H + 400)) - 200;
    const x = d.x - y * slant;
    ctx.strokeStyle = `rgba(${color},${d.a * alpha})`;
    ctx.lineWidth = d.w;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - d.l * slant, y - d.l); ctx.stroke();
  }
  ctx.restore();
}

const DUST = (() => {
  const r = rand(4242);
  return Array.from({ length: 140 }, () => ({ x: r() * W, y: r() * H, z: 0.3 + r() * 1.4, s: 1 + r() * 3, ph: r() * 7, c: r() < 0.5 ? C.cyan : r() < 0.6 ? C.magenta : '#ffffff' }));
})();
function dust(ctx, t, { alpha = 1, drift = 30, bokeh = false } = {}) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const d of DUST) {
    const x = (d.x + Math.sin(t * 0.3 + d.ph) * 40 * d.z + t * drift * d.z) % W;
    const y = (d.y - t * 18 * d.z + H * 4) % H;
    const tw = 0.5 + 0.5 * Math.sin(t * 2.3 + d.ph * 3);
    ctx.globalAlpha = alpha * (0.15 + 0.5 * tw) * (bokeh ? 0.35 : 1);
    ctx.fillStyle = d.c;
    ctx.beginPath(); ctx.arc(x, y, d.s * d.z * (bokeh ? 6 : 1), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function vignetteFill(ctx, strength = 0.8) {
  const g = ctx.createRadialGradient(CX, CY, H * 0.25, CX, CY, H * 1.05);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}

// caption: chars reveal one by one (blur-in from below), exit by spreading + fading
function caption(ctx, str, t, t0, t1, { y = H * 0.83, size = 64, weight = 300, color = '#f4f1ff', spacing = 26, stagger = 0.07, sub, subSize = 26 } = {}) {
  if (t < t0 - 0.01 || t > t1 + 0.01) return;
  ctx.save();
  ctx.font = font(weight, size, 'SC');
  const chars = [...str];
  const widths = chars.map(c => ctx.measureText(c).width);
  const out = prog(t, t1 - 0.4, t1);
  const sp = spacing + eoutCubic(out) * 30;
  const total = widths.reduce((a, b) => a + b, 0) + sp * (chars.length - 1);
  let x = CX - total / 2;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  chars.forEach((ch, i) => {
    const p = eoutCubic(prog(t, t0 + i * stagger, t0 + i * stagger + 0.45));
    const a = p * (1 - out);
    if (a > 0.003) {
      const dy = (1 - p) * 26;
      ctx.globalAlpha = a * 0.35;
      ctx.fillStyle = C.magenta;
      ctx.fillText(ch, x - 2 - (1 - p) * 10, y + dy);
      ctx.fillStyle = C.cyan;
      ctx.fillText(ch, x + 2 + (1 - p) * 10, y + dy);
      ctx.globalAlpha = a;
      ctx.fillStyle = color;
      ctx.fillText(ch, x, y + dy);
    }
    x += widths[i] + sp;
  });
  if (sub) {
    const p = eoutCubic(prog(t, t0 + 0.35, t0 + 0.9));
    ctx.globalAlpha = p * (1 - out) * 0.7;
    ctx.font = font(300, subSize, 'Inter');
    ctx.letterSpacing = `${10 + out * 10}px`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#c9c3e8';
    ctx.fillText(sub, CX, y + size * 0.95);
  }
  ctx.restore();
}

// ---- the eye (S1 intro, montage, outro) ----
const FIBERS = (() => { const r = rand(31); return Array.from({ length: 150 }, () => ({ a: r() * Math.PI * 2, r0: 0.36 + r() * 0.12, r1: 0.7 + r() * 0.3, c: r() < 0.55 ? C.red : r() < 0.6 ? C.magenta : C.hot, w: 1 + r() * 2.5 })); })();
export function eye(ctx, x, y, s, t, { open = 1, iris = 1, lockP = 1, pupil = 1, hud = 1, color = C.red, lidColor } = {}) {
  const hw = 760 * s, lid = 340 * s * open;
  const lidY = u => Math.pow(clamp(1 - u * u), 0.85);
  const up = [], lo = [];
  for (let i = 0; i <= 80; i++) {
    const u = i / 40 - 1;
    up.push([x + u * hw, y - lid * lidY(u)]);
    lo.push([x + u * hw, y + lid * 0.82 * lidY(u)]);
  }
  ctx.save();
  // interior
  if (open > 0.02) {
    ctx.save();
    ctx.beginPath();
    up.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
    for (let i = lo.length - 1; i >= 0; i--) ctx.lineTo(lo[i][0], lo[i][1]);
    ctx.closePath();
    ctx.clip();
    const sclera = ctx.createRadialGradient(x, y, 0, x, y, hw);
    sclera.addColorStop(0, 'rgba(60,10,40,0.9)');
    sclera.addColorStop(1, 'rgba(8,4,18,0.95)');
    ctx.fillStyle = sclera; ctx.fillRect(x - hw, y - lid, hw * 2, lid * 2);
    // faint cyber grid in the sclera
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 1;
    for (let gx = -hw; gx <= hw; gx += 48 * s) { ctx.beginPath(); ctx.moveTo(x + gx, y - lid); ctx.lineTo(x + gx, y + lid); ctx.stroke(); }
    for (let gy = -lid; gy <= lid; gy += 48 * s) { ctx.beginPath(); ctx.moveTo(x - hw, y + gy); ctx.lineTo(x + hw, y + gy); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (iris > 0) {
      const R = 300 * s * eoutBack(clamp(iris), 1.4);
      const pr = R * (0.33 + 0.07 * pupil);
      ctx.globalCompositeOperation = 'lighter';
      const ig = ctx.createRadialGradient(x, y, pr * 0.8, x, y, R);
      ig.addColorStop(0, 'rgba(255,23,68,0.95)');
      ig.addColorStop(0.5, 'rgba(160,10,70,0.55)');
      ig.addColorStop(1, 'rgba(255,43,214,0.25)');
      ctx.fillStyle = ig; ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
      for (const f of FIBERS) {
        const a = f.a + t * 0.05;
        ctx.strokeStyle = f.c; ctx.globalAlpha = 0.35; ctx.lineWidth = f.w * s;
        ctx.beginPath();
        ctx.moveTo(x + Math.cos(a) * R * f.r0, y + Math.sin(a) * R * f.r0);
        ctx.lineTo(x + Math.cos(a + 0.05) * R * f.r1, y + Math.sin(a + 0.05) * R * f.r1);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // rotating HUD rings
      const rings = [[1.02, 0.6, 4, C.red, 0.4], [0.86, -0.9, 2.5, C.magenta, 0.25], [0.62, 1.4, 2, C.hot, 0.15]];
      rings.forEach(([rr, sp, lw, col, gap], k) => {
        const segs = 6 + k * 3;
        for (let j = 0; j < segs; j++) {
          const a0 = t * sp + (j / segs) * Math.PI * 2;
          ctx.strokeStyle = col; ctx.lineWidth = lw * s * 1.4; ctx.globalAlpha = 0.9 * lockP + 0.3;
          ctx.beginPath(); ctx.arc(x, y, R * rr, a0, a0 + (Math.PI * 2 / segs) * (1 - gap)); ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      // pupil
      ctx.fillStyle = '#020005';
      ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = C.red; ctx.lineWidth = 5 * s; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.arc(x, y, pr, 0, Math.PI * 2); ctx.stroke();
      // catch-light
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.ellipse(x - pr * 0.45, y - pr * 0.5, pr * 0.16, pr * 0.1, -0.6, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
  // lids
  const lc = lidColor || color;
  neonLine(ctx, up, lc, 5 * Math.max(s, 0.4), 1);
  neonLine(ctx, lo, lc, 4 * Math.max(s, 0.4), 1);
  // lash ticks on the upper lid
  if (open > 0.3) {
    ctx.save();
    ctx.strokeStyle = lc; ctx.lineWidth = 3 * s; ctx.globalAlpha = (open - 0.3) * 1.2;
    for (let i = 12; i <= 68; i += 7) {
      const p = up[i], q = up[i + 1];
      const nx = q[1] - p[1], ny = -(q[0] - p[0]);
      const nl = Math.hypot(nx, ny) || 1;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] + (nx / nl) * 40 * s, p[1] + (ny / nl) * 40 * s); ctx.stroke();
    }
    ctx.restore();
  }
  // tick crown
  if (hud > 0 && iris > 0) {
    ctx.save();
    ctx.globalAlpha = hud;
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 2 * s;
    const R = 430 * s;
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2 - t * 0.15;
      const l = i % 6 === 0 ? 26 : 10;
      ctx.globalAlpha = hud * (i % 6 === 0 ? 0.9 : 0.45);
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * R * s / s, y + Math.sin(a) * R);
      ctx.lineTo(x + Math.cos(a) * (R + l * s), y + Math.sin(a) * (R + l * s));
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
  return { hw, lid };
}

// ---- heart ----
function neonHeart(ctx, x, y, s, { alpha = 1, fill = 0.5, lw = 6, color = C.red, t = 0 } = {}) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  heartPath(ctx, x, y, s);
  if (fill > 0) {
    const g = ctx.createRadialGradient(x, y - s * 0.1, s * 0.1, x, y, s * 1.2);
    g.addColorStop(0, `rgba(255,80,120,${fill})`);
    g.addColorStop(1, `rgba(120,0,40,${fill * 0.3})`);
    ctx.fillStyle = g; ctx.fill();
  }
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color; ctx.lineWidth = lw * 3; ctx.globalAlpha *= 0.3; ctx.stroke();
  ctx.globalAlpha /= 0.3;
  ctx.lineWidth = lw; ctx.stroke();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = lw * 0.35; ctx.stroke();
  // inner echo
  heartPath(ctx, x, y, s * 0.72);
  ctx.strokeStyle = C.magenta; ctx.lineWidth = lw * 0.5; ctx.globalAlpha *= 0.6; ctx.stroke();
  ctx.restore();
}

// ---- wire polyhedra ----
const CUBE_V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
const CUBE_E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
const CUBE_F = [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [2, 3, 7, 6], [1, 2, 6, 5], [0, 3, 7, 4]];
const OCTA_V = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
const OCTA_E = [[0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [2, 4], [4, 3], [3, 5], [5, 2]];
function wire(ctx, V, E, { x = CX, y = CY, size = 500, ry = 0, rx = 0, rz = 0, color = C.cyan, lw = 4, alpha = 1, assemble = 1, seed = 3, f = 1500, zoff = 1800, faces, faceAlpha = 0 } = {}) {
  const P = V.map(v => {
    let p = [v[0] * size, v[1] * size, v[2] * size];
    p = rotY(rotX(rotZ(p, rz), rx), ry);
    return p;
  });
  const proj = p => project(p, { f, z: zoff, cx: x, cy: y });
  ctx.save();
  ctx.globalAlpha *= alpha;
  if (faces && faceAlpha > 0) {
    ctx.globalCompositeOperation = 'lighter';
    for (const fc of faces) {
      const pts = fc.map(i => proj(P[i]));
      if (pts.some(p => !p)) continue;
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      const g = ctx.createLinearGradient(pts[0][0], pts[0][1], pts[2][0], pts[2][1]);
      g.addColorStop(0, `rgba(0,240,255,${faceAlpha})`);
      g.addColorStop(1, `rgba(143,61,255,${faceAlpha * 0.4})`);
      ctx.fillStyle = g; ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  E.forEach(([a, b], k) => {
    const d = clamp(assemble * 1.5 - hash(seed + k) * 0.5);
    if (d <= 0) return;
    const e = eoutExpo(d);
    const fly = (1 - e);
    const off = [(hash(seed + k * 3) - 0.5) * 5000 * fly, (hash(seed + k * 5) - 0.5) * 3000 * fly, -2500 * fly];
    const pa = proj([P[a][0] + off[0], P[a][1] + off[1], P[a][2] + off[2]]);
    const pb = proj([P[b][0] + off[0], P[b][1] + off[1], P[b][2] + off[2]]);
    if (!pa || !pb) return;
    const depth = (pa[2] + pb[2]) / 2;
    neonLine(ctx, [pa, pb], color, lw * depth, 1);
    // corner nodes
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = alpha * e;
    ctx.beginPath(); ctx.arc(pa[0], pa[1], lw * depth * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = alpha;
  });
  ctx.restore();
}

// ---- neon tunnel (frames pass the lens exactly on each beat) ----
function tunnel(ctx, t, { colors = [C.magenta, C.cyan], dz = 600, n = 22, size = 1000, twist = 0.35, alpha = 1, speedMul = 1, kick = 0, roll = 0, cx = CX, cy = CY, shape = 4 } = {}) {
  const speed = (dz / BEAT) * speedMul;
  const travel = t * speed;
  const base = Math.floor(travel / dz);
  const off = travel - base * dz;
  const near = 120;
  const frames = [];
  for (let i = 0; i < n; i++) {
    const z = i * dz - off + near;
    const k = base + i;
    const ang = roll + k * twist * 0.25 + (shape === 6 ? 0 : Math.PI / 4);
    const pts = [];
    for (let j = 0; j < shape; j++) {
      const a = ang + (j / shape) * Math.PI * 2;
      const p = project([Math.cos(a) * size, Math.sin(a) * size, z], { f: 1300, cx, cy });
      if (!p) { pts.length = 0; break; }
      pts.push(p);
    }
    frames.push({ z, k, pts });
  }
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = frames.length - 1; i >= 0; i--) {
    const F = frames[i];
    if (!F.pts.length) continue;
    const fade = clamp(1 - F.z / (n * dz)) * clamp((F.z - near) / 500 + 0.2);
    const col = colors[((F.k % colors.length) + colors.length) % colors.length];
    const sc = F.pts[0][2];
    const flash = 1 + kick * 1.5 * clamp(1 - F.z / 2500);
    ctx.globalAlpha = alpha * fade * Math.min(1, 0.55 * flash);
    neonLine(ctx, F.pts, col, Math.max(1, 3.2 * sc), 0.9, true);
    // rails to the next frame
    const G = frames[i + 1];
    if (G && G.pts.length) {
      ctx.globalAlpha = alpha * fade * 0.25;
      ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, 1.6 * sc);
      ctx.beginPath();
      for (let j = 0; j < shape; j++) { ctx.moveTo(F.pts[j][0], F.pts[j][1]); ctx.lineTo(G.pts[j][0], G.pts[j][1]); }
      ctx.stroke();
    }
    // light dots at mid-edges
    ctx.globalAlpha = alpha * fade * 0.9;
    ctx.fillStyle = '#fff';
    for (let j = 0; j < shape; j++) {
      const a = F.pts[j], b = F.pts[(j + 1) % shape];
      ctx.beginPath(); ctx.arc((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.max(1.2, 4 * sc), 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function speedLines(ctx, t, amt, { color = '255,255,255', seed = 1, cx = CX, cy = CY } = {}) {
  if (amt <= 0.01) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (let i = 0; i < 90; i++) {
    const a = hash(seed + i) * Math.PI * 2;
    const ph = (hash(seed * 7 + i) + t * (1.5 + hash(i) * 2)) % 1;
    const r0 = 200 + ph * 1600, r1 = r0 + 120 + 400 * ph;
    ctx.strokeStyle = `rgba(${color},${amt * ph * 0.6})`;
    ctx.lineWidth = 1 + ph * 3;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

function shockRing(ctx, x, y, age, { color = C.red, maxR = 1600, dur = 0.7, lw = 10 } = {}) {
  if (age < 0 || age > dur) return;
  const p = age / dur;
  const r = eoutExpo(p) * maxR;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = (1 - p) ** 1.5;
  ctx.strokeStyle = color; ctx.lineWidth = lw * (1 - p) + 1;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha *= 0.5;
  ctx.lineWidth = lw * 3 * (1 - p) + 1;
  ctx.beginPath(); ctx.arc(x, y, r * 0.92, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

// HUD frame used across scenes
function hudFrame(ctx, t, { alpha = 1, label = 'POSSESSION.EXE', rec = true } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  corners(ctx, 80, 70, W - 160, H - 140, 70, 'rgba(0,240,255,0.7)', 3);
  hudText(ctx, label, 120, 128, { size: 24, color: C.cyan, alpha: 0.8 });
  const tc = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}:${String(Math.floor((t % 1) * 60)).padStart(2, '0')}`;
  hudText(ctx, `TC ${tc}`, W - 120, 128, { size: 24, color: C.cyan, align: 'right', alpha: 0.8 });
  if (rec && Math.floor(t * 2) % 2 === 0) {
    ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(W - 400, 120, 9, 0, Math.PI * 2); ctx.fill();
    hudText(ctx, 'REC', W - 380, 128, { size: 24, color: C.red });
  }
  hudText(ctx, `BPM ${120}  //  SYNC ${String(Math.floor(t * 2) % 4 + 1)}/4`, 120, H - 104, { size: 22, color: C.magenta, alpha: 0.75 });
  hudText(ctx, 'ID:0x5F3C·占有欲', W - 120, H - 104, { size: 22, color: C.magenta, align: 'right', alpha: 0.75 });
  ctx.restore();
}

/* =====================================================================================
   S1  0–8   ECG → eye → zoom through the pupil
   ===================================================================================== */
function ecg(tau) {
  const g = (m, a, w) => a * Math.exp(-((tau - m) ** 2) / (2 * w * w));
  return g(-0.16, 0.12, 0.025) + g(-0.025, -0.14, 0.008) + g(0, 1, 0.011) + g(0.03, -0.38, 0.012) + g(0.22, 0.26, 0.045);
}
function ecgSignal(s) {
  let v = 0;
  for (const h of EV.heart || []) if (Math.abs(s - h) < 0.5) v += ecg(s - h);
  return v;
}
export function sIntro(ctx, t) {
  const headX = W * 0.66, pps = 1000, amp = 300;
  const morph = eio(prog(t, 4.25, 5.6));
  const zoom = prog(t, 7.0, 8.0);
  const zs = Math.exp(Math.log(28) * einExpo(zoom));
  ctx.save();
  // background: deep gradient + faint grid
  const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, W * 0.7);
  bg.addColorStop(0, '#120420'); bg.addColorStop(1, '#030108');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.translate(CX, CY); ctx.scale(zs, zs); ctx.translate(-CX, -CY);
  ctx.globalAlpha = 0.07 + 0.05 * pulse('heart', t, 0.3);
  ctx.strokeStyle = C.red; ctx.lineWidth = 1;
  for (let gx = 0; gx <= W; gx += 80) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = 0; gy <= H; gy += 80) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
  ctx.globalAlpha = 1;

  // ECG trace (fades as the eye takes over)
  const ecgA = 1 - prog(t, 5.2, 6.0);
  if (ecgA > 0) {
    const segs = 14;
    const per = Math.ceil(headX / segs);
    for (let sg = 0; sg < segs; sg++) {
      const pts = [];
      for (let px = sg * per; px <= Math.min(headX, (sg + 1) * per); px += 3) {
        const s = t - (headX - px) / pps;
        let y = CY - (s >= 0 ? ecgSignal(s) : 0) * amp * (1 - morph);
        const u = (px - CX) / 760;
        if (Math.abs(u) < 1 && morph > 0) y -= 340 * Math.pow(1 - u * u, 0.85) * morph * 0.0; // straightened by morph
        pts.push([px, y]);
      }
      const age = (headX - (sg + 0.5) * per) / pps;
      ctx.globalAlpha = ecgA * clamp(1 - age / 2.4) * clamp(t * 4);
      neonLine(ctx, pts, C.red, 5, 1);
    }
    ctx.globalAlpha = ecgA * clamp(t * 4);
    // flat continuation right of head + head dot
    const yh = CY - ecgSignal(t) * amp * (1 - morph);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(headX, yh, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = C.red; ctx.globalAlpha *= 0.5;
    ctx.beginPath(); ctx.arc(headX, yh, 26, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  }

  // eye grows out of the line
  const open = eio(prog(t, 4.3, 5.7));
  if (t > 4.2) {
    const iris = prog(t, 5.3, 5.95);
    const lock = prog(t, 6.0, 6.3);
    const heartK = pulse('heart', t, 0.25, 6);
    eye(ctx, CX, CY, 1, t, { open: open * (0.98 + 0.02 * Math.sin(t * 3)), iris, lockP: lock, pupil: 1 - heartK * 0.5, hud: prog(t, 5.6, 6.2), lidColor: C.red });
    // reticle snaps in on the lock beat
    if (t > 5.9) {
      const k = eoutBack(prog(t, 6.0, 6.25), 2.2);
      const bw = lerp(1500, 1180, k), bh = lerp(1000, 760, k);
      ctx.globalAlpha = clamp((t - 5.9) * 8);
      corners(ctx, CX - bw / 2, CY - bh / 2, bw, bh, 70, C.cyan, 4);
      const lockTxt = t > 6.0 ? 'TARGET LOCKED' : 'ACQUIRING';
      hudText(ctx, scramble(lockTxt, prog(t, 6.0, 6.35), 4), CX - bw / 2, CY - bh / 2 - 26, { size: 30, color: C.cyan, weight: 300 });
      hudText(ctx, scramble('目标已锁定 // 0x00FF3C', prog(t, 6.1, 6.5), 9), CX + bw / 2, CY + bh / 2 + 52, { size: 28, color: C.red, align: 'right', fam: 'SC', weight: 500 });
      ctx.globalAlpha = 1;
    }
  }

  // HUD (pre-zoom)
  const hudA = clamp(t * 2 - 0.4) * (1 - zoom);
  ctx.globalAlpha = hudA;
  hudText(ctx, scramble('NEURAL LINK // ESTABLISHED', prog(t, 0.4, 1.4), 2), 140, 160, { size: 26, color: C.cyan });
  hudText(ctx, `HEART RATE  ${String(60 + Math.round(pulse('heart', t, 0.4) * 22)).padStart(3, '0')} BPM`, 140, 204, { size: 26, color: C.red });
  hudText(ctx, scramble('SUBJECT: YOU', prog(t, 1.4, 2.2), 3), W - 140, 160, { size: 26, color: C.cyan, align: 'right' });
  ctx.globalAlpha = 1;
  ctx.restore();

  caption(ctx, '从第一眼开始', t, 0.9, 3.75, { sub: 'FROM THE VERY FIRST GLANCE' });
  caption(ctx, '我就锁定了你', t, 4.0, 6.9, { sub: 'I LOCKED ON YOU' });

  // portal: the city lives inside the pupil
  if (zoom > 0) {
    const pr = 300 * 0.4 * zs;
    ctx.save();
    ctx.beginPath(); ctx.arc(CX, CY, pr, 0, Math.PI * 2); ctx.clip();
    const inner = lerp(0.55, 1, eoutCubic(zoom));
    ctx.translate(CX, CY); ctx.scale(inner, inner); ctx.translate(-CX, -CY);
    sCity(ctx, t);
    ctx.restore();
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = C.red; ctx.lineWidth = 6 + 20 * zoom; ctx.globalAlpha = 0.8 * (1 - zoom * 0.5);
    ctx.beginPath(); ctx.arc(CX, CY, pr, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

/* =====================================================================================
   S2  8–16  surveillance city
   ===================================================================================== */
const CITY = (() => {
  const r = rand(2024);
  const layers = [
    { k: 0.004, top: 0.1, bot: 0.26, n: 46, wmin: 50, wmax: 150, col: '#0d0718', lit: 0.25, win: 'rgba(143,61,255,' },
    { k: 0.012, top: 0.16, bot: 0.36, n: 34, wmin: 80, wmax: 220, col: '#0a0514', lit: 0.3, win: 'rgba(0,240,255,' },
    { k: 0.03, top: 0.24, bot: 0.5, n: 22, wmin: 140, wmax: 320, col: '#07030f', lit: 0.35, win: 'rgba(255,43,214,' },
  ];
  for (const L of layers) {
    L.b = [];
    let x = -W * 0.4;
    while (x < W * 1.4) {
      const w = L.wmin + r() * (L.wmax - L.wmin);
      const h = H * (L.top + r() * (L.bot - L.top));
      const wins = [];
      const cols = Math.max(2, Math.floor(w / 18)), rows = Math.floor(h / 22);
      for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) if (r() < L.lit) wins.push([i, j, r()]);
      L.b.push({ x, w, h, wins, cols, rows, ant: r() < 0.3, sign: null });
      x += w + r() * 30;
    }
  }
  const words = ['欲', '锁', '你', '爱', '我', '囚', '心', '占'];
  layers[2].b.forEach((b, i) => { if (i % 3 === 1) b.sign = { ch: words[i % words.length], col: [C.magenta, C.cyan, C.red, C.yellow][i % 4], seed: i }; });
  return layers;
})();

export function city(ctx, t, { camT = 0, speed = 1, fog = 1, horizon = H * 0.6, kick = 0, signs = 1 } = {}) {
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#04020a'); sky.addColorStop(0.6, '#1a0730'); sky.addColorStop(1, '#4a0f4f');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizon + 2);
  // horizon glow
  const hg = ctx.createRadialGradient(CX, horizon, 10, CX, horizon, W * 0.55);
  hg.addColorStop(0, 'rgba(255,43,214,0.55)'); hg.addColorStop(0.4, 'rgba(143,61,255,0.18)'); hg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = hg; ctx.fillRect(0, 0, W, H);

  for (const [li, L] of CITY.entries()) {
    const sc = 1 + camT * L.k * speed * 1.5;
    ctx.save();
    ctx.translate(CX, horizon); ctx.scale(sc, sc); ctx.translate(-CX, -horizon);
    for (const b of L.b) {
      const bx = b.x, by = horizon - b.h;
      ctx.fillStyle = L.col; ctx.fillRect(bx, by, b.w, b.h);
      // rim light
      ctx.fillStyle = li === 2 ? 'rgba(255,43,214,0.35)' : 'rgba(0,240,255,0.18)';
      ctx.fillRect(bx, by, b.w, 2);
      ctx.fillRect(bx + b.w - 2, by, 2, b.h);
      // windows
      const ww = b.w / b.cols;
      for (const [i, j, rr] of b.wins) {
        const fl = rr > 0.93 ? (hash(Math.floor(t * 8) + rr * 99) > 0.5 ? 1 : 0.2) : 1;
        ctx.fillStyle = `${L.win}${(0.25 + rr * 0.5) * fl})`;
        ctx.fillRect(bx + i * ww + ww * 0.3, by + 12 + j * 22, ww * 0.4, 8);
      }
      if (b.ant) {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(bx + b.w / 2, by); ctx.lineTo(bx + b.w / 2, by - 60); ctx.stroke();
        if (Math.floor(t * 2 + b.x) % 2 === 0) { ctx.fillStyle = C.red; ctx.beginPath(); ctx.arc(bx + b.w / 2, by - 60, 5, 0, Math.PI * 2); ctx.fill(); }
      }
      if (b.sign && signs > 0) {
        const s = b.sign;
        const on = hash(Math.floor(t * 14) + s.seed * 13) > 0.08 ? 1 : 0.15;
        const sx = bx + b.w * 0.5, sy = by + 110, sw = 120, sh = 230;
        ctx.save();
        ctx.globalAlpha = on * signs;
        ctx.strokeStyle = s.col; ctx.lineWidth = 4;
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeRect(sx - sw / 2, sy - sh / 2, sw, sh);
        ctx.font = font(900, 96, 'SC'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = s.col; ctx.fillText(s.ch, sx, sy);
        ctx.globalAlpha *= 0.5; ctx.fillStyle = '#fff'; ctx.fillText(s.ch, sx, sy);
        ctx.restore();
      }
    }
    ctx.restore();
  }
  // fog band
  const fg = ctx.createLinearGradient(0, horizon - 260, 0, horizon + 40);
  fg.addColorStop(0, 'rgba(60,10,80,0)'); fg.addColorStop(1, `rgba(120,20,120,${0.35 * fog})`);
  ctx.fillStyle = fg; ctx.fillRect(0, horizon - 260, W, 300);

  // ground + grid
  const gg = ctx.createLinearGradient(0, horizon, 0, H);
  gg.addColorStop(0, '#1a0628'); gg.addColorStop(1, '#030107');
  ctx.fillStyle = gg; ctx.fillRect(0, horizon, W, H - horizon);
  const camH = 320, f = 1300, sp = 420;
  const camZ = camT * 900 * speed;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const bright = 0.5 + kick * 0.7;
  for (let i = 0; i < 46; i++) {
    const z = i * sp - (camZ % sp) + 60;
    if (z <= 30) continue;
    const y = horizon + (camH * f) / z;
    if (y > H + 10) continue;
    const a = clamp(1 - z / (46 * sp)) * bright;
    ctx.strokeStyle = `rgba(255,43,214,${a})`; ctx.lineWidth = Math.max(1, 3 * (f / z) * 0.25);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  for (let i = -24; i <= 24; i++) {
    const xw = i * sp;
    const pn = [CX + (xw * f) / 80, horizon + (camH * f) / 80];
    const pf = [CX + (xw * f) / 20000, horizon + (camH * f) / 20000];
    const lg = ctx.createLinearGradient(pn[0], pn[1], pf[0], pf[1]);
    lg.addColorStop(0, `rgba(255,43,214,${0.8 * bright})`); lg.addColorStop(1, 'rgba(255,43,214,0)');
    ctx.strokeStyle = lg; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(pn[0], pn[1]); ctx.lineTo(pf[0], pf[1]); ctx.stroke();
  }
  // wet reflections of the signs
  for (const b of CITY[2].b) {
    if (!b.sign) continue;
    const sc = 1 + camT * CITY[2].k * speed * 1.5;
    const x = CX + (b.x + b.w / 2 - CX) * sc;
    const rg = ctx.createLinearGradient(0, horizon, 0, horizon + 420);
    rg.addColorStop(0, `${b.sign.col}55`); rg.addColorStop(1, `${b.sign.col}00`);
    ctx.fillStyle = rg;
    ctx.fillRect(x - 40 * sc, horizon, 80 * sc, 420);
  }
  ctx.restore();
}

const ITEMS = [['定位', 'LOCATION'], ['行程', 'ROUTE'], ['通讯录', 'CONTACTS'], ['聊天记录', 'MESSAGES'], ['心率', 'HEART RATE'], ['所有权', 'OWNERSHIP']];
export function sCity(ctx, t) {
  const lt = t - 8;
  // camera: dolly forward, accelerating into the drop
  const accel = einCubic(prog(t, 13.5, 16));
  const camT = lt + accel * 2.2;
  const kick = pulse('kick', t, 0.12, 7.9);
  ctx.save();
  const pump = 1 + kick * 0.012 + accel * 0.04;
  ctx.translate(CX, CY); ctx.scale(pump, pump); ctx.translate(-CX, -CY);
  city(ctx, t, { camT, kick, speed: 1 });
  rain(ctx, t, { speed: 2600 + accel * 2000, alpha: 0.9 });

  // the target: a lone silhouette on the street
  const tx = CX + Math.sin(lt * 0.7) * 30, ty = H * 0.74;
  const bob = Math.abs(Math.sin(lt * 5)) * 6;
  const fs = 1 + accel * 0.8;
  ctx.save();
  ctx.translate(tx, ty - bob); ctx.scale(fs, fs);
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(0,240,255,0.9)';
  ctx.beginPath(); ctx.arc(0, -150, 24, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.roundRect(-30, -118, 60, 112, 22); ctx.fill();
  ctx.fillRect(-26, -10, 20, 70); ctx.fillRect(6, -10, 20, 70);
  ctx.globalAlpha = 0.4;
  const sh = ctx.createRadialGradient(0, 60, 2, 0, 60, 120);
  sh.addColorStop(0, 'rgba(0,240,255,0.8)'); sh.addColorStop(1, 'rgba(0,240,255,0)');
  ctx.fillStyle = sh; ctx.fillRect(-140, 30, 280, 60);
  ctx.restore();
  ctx.restore();

  // reticle: shrinks on every beat (stepwise), jitters, then locks
  const beats = Math.max(0, Math.floor((t - 8) / BEAT));
  const bp = eoutExpo(prog((t - 8) % BEAT, 0, 0.18));
  const sz = (b) => lerp(560, 200, clamp(b / 15));
  const rs = lerp(sz(beats), sz(beats + 1), bp) * (1 + accel * 0.6);
  const jit = (1 - clamp((t - 8) / 6)) * 18;
  const rx = tx + Math.sin(t * 13) * jit, ry = ty - 90 + Math.cos(t * 11) * jit;
  const ra = clamp((t - 8.05) * 5);
  ctx.save();
  ctx.globalAlpha = ra;
  const lockCol = t > 14 ? C.red : C.cyan;
  corners(ctx, rx - rs / 2, ry - rs / 2, rs, rs, rs * 0.22, lockCol, 4);
  ctx.strokeStyle = lockCol; ctx.lineWidth = 1.5; ctx.globalAlpha = ra * 0.45;
  ctx.beginPath(); ctx.moveTo(0, ry); ctx.lineTo(rx - rs / 2 - 20, ry); ctx.moveTo(rx + rs / 2 + 20, ry); ctx.lineTo(W, ry);
  ctx.moveTo(rx, 0); ctx.lineTo(rx, ry - rs / 2 - 20); ctx.moveTo(rx, ry + rs / 2 + 20); ctx.lineTo(rx, H); ctx.stroke();
  ctx.globalAlpha = ra;
  ctx.beginPath(); ctx.arc(rx, ry, 8 + kick * 10, 0, Math.PI * 2); ctx.stroke();
  const dist = Math.max(0.6, 12.8 - beats * 0.8).toFixed(1);
  hudText(ctx, `TARGET // 你`, rx + rs / 2 + 22, ry - rs / 2 + 26, { size: 26, color: lockCol, fam: 'SC', weight: 500 });
  hudText(ctx, `DIST ${dist}m`, rx + rs / 2 + 22, ry - rs / 2 + 62, { size: 24, color: lockCol });
  hudText(ctx, `SIG ${(0.62 + 0.3 * envAt('rms', t)).toFixed(2)}`, rx + rs / 2 + 22, ry - rs / 2 + 94, { size: 24, color: lockCol, alpha: 0.7 });
  ctx.restore();

  // left panel: data harvested one item per beat
  ctx.save();
  const px = 150, py = 300;
  ctx.globalAlpha = clamp((t - 8.2) * 4);
  ctx.fillStyle = 'rgba(5,3,15,0.55)'; ctx.fillRect(px - 30, py - 60, 560, 520);
  ctx.strokeStyle = 'rgba(0,240,255,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(px - 30, py - 60, 560, 520);
  hudText(ctx, 'SURVEILLANCE // 监视中', px, py - 16, { size: 26, color: C.cyan, fam: 'SC', weight: 500 });
  ITEMS.forEach(([zh, en], i) => {
    const at = 9 + i;
    const p = prog(t, at, at + 0.25);
    if (p <= 0) return;
    const y = py + 52 + i * 70;
    ctx.globalAlpha = clamp(p * 2);
    hudText(ctx, zh, px, y, { size: 30, color: '#fff', fam: 'SC', weight: 500 });
    hudText(ctx, en, px + 160, y, { size: 20, color: '#8a86a8' });
    const last = i === ITEMS.length - 1;
    const bw = 140 * eoutExpo(p);
    ctx.fillStyle = last ? C.red : C.cyan; ctx.globalAlpha = 0.25; ctx.fillRect(px + 330, y - 26, 170, 34);
    ctx.globalAlpha = 1; ctx.fillRect(px + 330, y - 26, bw + 30 * eoutExpo(p), 34);
    hudText(ctx, last ? '100%' : '已获取', px + 345, y, { size: 24, color: '#05030b', fam: 'SC', weight: 900 });
  });
  ctx.restore();

  // right panel: live spectrum bars
  ctx.save();
  ctx.globalAlpha = clamp((t - 8.3) * 4);
  const bx = W - 640, by = 360;
  hudText(ctx, 'AUDIO FEED // 窃听', bx, by - 20, { size: 24, color: C.magenta, fam: 'SC', weight: 500 });
  for (let i = 0; i < 32; i++) {
    const v = envAt(i < 10 ? 'low' : i < 22 ? 'rms' : 'high', t - i * 0.01) * (0.4 + 0.6 * hash(i + Math.floor(t * 30) * 0.001));
    const h = 10 + v * 180 * (0.6 + 0.4 * Math.sin(i * 1.3 + t * 9) ** 2);
    ctx.fillStyle = i % 2 ? C.magenta : C.cyan;
    ctx.globalAlpha = 0.85;
    ctx.fillRect(bx + i * 16, by + 220 - h, 10, h);
  }
  ctx.globalAlpha = 0.7;
  hudText(ctx, `LAT 31.2304  LON 121.4737`, bx, by + 270, { size: 22, color: C.cyan });
  hudText(ctx, `PING ${Math.floor(12 + hash(Math.floor(t * 4)) * 30)}ms`, bx, by + 306, { size: 22, color: C.cyan });
  ctx.restore();

  caption(ctx, '你的每一步', t, 8.5, 11.75, { size: 92, weight: 500, sub: 'EVERY STEP YOU TAKE' });
  caption(ctx, '我都知道', t, 12.0, 15.45, { size: 92, weight: 500, sub: 'I KNOW', color: '#ffd6e0' });
  hudFrame(ctx, t, { alpha: clamp((t - 8) * 3) * 0.9, label: 'CAM-07 // 你' });
  vignetteFill(ctx, 0.55);
}

/* =====================================================================================
   S3  16–32  drop A: kinetic type, then the cage
   ===================================================================================== */
function dropBG(ctx, t, { colors = [C.magenta, C.cyan], alpha = 1, speedMul = 1, roll = 0 } = {}) {
  ctx.fillStyle = '#05030b'; ctx.fillRect(0, 0, W, H);
  const kick = pulse('kick', t, 0.12);
  tunnel(ctx, t, { colors, kick, alpha, speedMul, roll: roll + t * 0.08 });
  speedLines(ctx, t, 0.35 + pulse('crash', t, 0.6) * 0.8 + pulse('impact', t, 0.6));
}

const MARQ = 'MINE · MINE · MINE · MINE · MINE · ';
export function sDropA(ctx, t) {
  const kick = pulse('kick', t, 0.12);
  const snare = pulse('snare', t, 0.18);
  const cage = t >= 23.9;
  dropBG(ctx, t, { colors: cage ? [C.red, C.magenta] : [C.magenta, C.cyan], alpha: cage ? 0.45 : 1 });
  const pump = 1 + kick * 0.025;
  ctx.save();
  ctx.translate(CX, CY); ctx.scale(pump, pump); ctx.translate(-CX, -CY);

  // 16–18  你
  if (t < 18.1) {
    const p = prog(t, 16, 16.2);
    const s = lerp(2.4, 1, eoutExpo(p));
    const g = glyph('你', 820, { color: '#fff' });
    for (let k = 4; k >= 1; k--) blit(ctx, glyph('你', 820, { color: C.red }), CX, CY, s * (1 + k * 0.06 * (1 - p)), 0.12 * (1 - p), 'lighter');
    // snare echoes
    for (const sn of EV.snare) {
      const age = t - sn;
      if (sn < 16 || sn > 18 || age < 0 || age > 0.6) continue;
      blit(ctx, glyph('你', 820, { color: C.cyan, stroke: 6 }), CX, CY, 1 + eoutCubic(age / 0.6) * 0.6, (1 - age / 0.6) * 0.9, 'lighter');
    }
    if (t < 17.8) splitWord(ctx, '你', CX, CY, 820, { s, split: 6 + kick * 20, color: C.red });
    else sliceOut(ctx, glyph('你', 820, { color: '#fff' }), CX, CY, prog(t, 17.8, 18.05));
    hudText(ctx, 'YOU ARE', CX, CY - 500, { size: 42, color: C.cyan, align: 'center', fam: 'Inter', weight: 600, spacing: 30, alpha: eoutCubic(prog(t, 16.1, 16.4)) * (1 - prog(t, 17.8, 18)) });
  }
  // 18–20  只能看我 (one char per beat)
  if (t >= 18 && t < 20.1) {
    const word = ['只', '能', '看', '我'];
    word.forEach((ch, i) => {
      const at = 18 + i * 0.5;
      const p = prog(t, at, at + 0.22);
      if (p <= 0) return;
      const x = CX + (i - 1.5) * 500;
      const y = CY + (1 - eoutBack(p, 2)) * -260;
      const out = prog(t, 19.85, 20.05);
      const col = i === 3 ? C.red : '#fff';
      if (out > 0) sliceOut(ctx, glyph(ch, 440, { color: col }), x, CY, out, { seed: i * 9 });
      else splitWord(ctx, ch, x, y, 440, { split: 4 + pulse('kick', t, 0.1) * 14, color: i === 3 ? C.red : '#b9b2ff', alpha: clamp(p * 3) });
      // land flash bar
      const age = t - at;
      if (age < 0.3) { ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - age / 0.3)})`; ctx.fillRect(x - 230, CY + 270, 460 * eoutExpo(age / 0.3), 6); }
    });
    hudText(ctx, scramble('ONLY  LOOK  AT  ME', prog(t, 18.1, 19.6), 77), CX, CY + 380, { size: 36, color: C.cyan, align: 'center', fam: 'Inter', weight: 300, spacing: 26 });
  }
  // 20–22  只属于我 with chain bands
  if (t >= 20 && t < 22.1) {
    chainBand(ctx, t, CY - 330, 1, 0.8);
    chainBand(ctx, t, CY + 330, -1, 0.8);
    const word = ['只', '属', '于', '我'];
    word.forEach((ch, i) => {
      const at = 20 + i * 0.5;
      const p = prog(t, at, at + 0.35);
      if (p <= 0) return;
      const x = CX + (i - 1.5) * 500;
      const out = prog(t, 21.85, 22.05);
      const g = glyph(ch, 440, { color: i === 3 ? C.red : C.hot });
      if (out > 0) { sliceOut(ctx, g, x, CY, out, { seed: 31 + i }); return; }
      sliceIn(ctx, g, x, CY, p, { seed: 11 + i * 5, dist: 700 });
      if (p >= 1) blit(ctx, glyph(ch, 440, { color: '#fff' }), x, CY, 1, 0.15 + kick * 0.2);
    });
    hudText(ctx, 'BELONGS  ONLY  TO  ME', CX, CY + 470, { size: 34, color: '#ffb3c6', align: 'center', fam: 'Inter', weight: 300, spacing: 26, alpha: prog(t, 20.2, 20.6) * (1 - prog(t, 21.8, 22)) });
  }
  // 22–24  MINE (outline fills letter by letter) over marquee rows
  if (t >= 22 && t < 24.1) {
    const inA = prog(t, 22, 22.2) * (1 - prog(t, 23.85, 24.05));
    ctx.save();
    ctx.globalAlpha = 0.22 * inA;
    for (let r = 0; r < 7; r++) {
      const dir = r % 2 ? 1 : -1;
      const g = glyph(MARQ, 150, { fam: 'Inter', weight: 900, color: r % 3 === 0 ? C.magenta : C.cyan, stroke: 3 });
      const off = ((t * 520 * dir) % g.w + g.w) % g.w;
      for (let k = -1; k < 3; k++) ctx.drawImage(g.c, k * g.w - off, 60 + r * 200 - g.h / 2 + 30);
    }
    ctx.restore();
    const letters = ['M', 'I', 'N', 'E'];
    const xs = [-690, -270, 120, 560];
    letters.forEach((L, i) => {
      const at = 22 + i * 0.5;
      const x = CX + xs[i];
      const g = glyph(L, 760, { fam: 'Inter', weight: 900, color: C.cyan, stroke: 8 });
      const s = 1 + (1 - eoutExpo(prog(t, 22, 22.25))) * 0.4;
      blit(ctx, g, x, CY, s, inA);
      if (t >= at) {
        const p = eoutExpo(prog(t, at, at + 0.15));
        blit(ctx, glyph(L, 760, { fam: 'Inter', weight: 900, color: i === 3 ? C.red : C.magenta }), x, CY, s * lerp(1.2, 1, p), inA * p);
        blit(ctx, glyph(L, 760, { fam: 'Inter', weight: 900, color: '#fff' }), x, CY, s, inA * p * 0.15);
      }
    });
  }
  ctx.restore();
  // 24–32  the cage
  if (cage) cageScene(ctx, t);
  hudFrame(ctx, t, { alpha: 0.85, label: 'PROTOCOL // 占有' });
  vignetteFill(ctx, 0.6);
}

function chainBand(ctx, t, y, dir, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = alpha;
  const lw = 150, off = ((t * 400 * dir) % lw + lw) % lw;
  for (let x = -lw * 2 + off; x < W + lw; x += lw) {
    for (const [i, xo] of [[0, 0], [1, lw / 2]]) {
      ctx.strokeStyle = i ? C.magenta : C.cyan;
      ctx.lineWidth = 9;
      ctx.beginPath();
      if (i) ctx.ellipse(x + xo, y, 54, 20, 0, 0, Math.PI * 2);
      else ctx.ellipse(x + xo, y, 60, 34, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2; ctx.stroke();
    }
  }
  ctx.restore();
}

function cageScene(ctx, t, { push = 0 } = {}) {
  const kick = pulse('kick', t, 0.14);
  const lt = t - 24;
  const assemble = prog(t, 24, 25.2);
  const tight = eio(prog(t, 30, 32));
  const ry = lt * 0.6 + einCubic(prog(t, 30, 32)) * 3;
  const rx = 0.45 + Math.sin(lt * 0.4) * 0.15;
  const size = lerp(520, 400, tight);
  // laser rays on every snare
  for (const sn of EV.snare) {
    const age = t - sn;
    if (sn < 24 || age < 0 || age > 0.4) continue;
    const r = rand(Math.floor(sn * 100));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < 8; k++) {
      const a = r() * Math.PI * 2;
      const x0 = CX + Math.cos(a) * 2200, y0 = CY + Math.sin(a) * 1400;
      ctx.globalAlpha = (1 - age / 0.4) ** 2;
      neonLine(ctx, [[x0, y0], [CX, CY]], C.red, 3, 1);
    }
    ctx.restore();
  }
  // HUD ring
  ctx.save();
  ctx.globalAlpha = prog(t, 25.5, 26.2) * 0.8;
  ctx.strokeStyle = C.cyan; ctx.lineWidth = 2;
  const R = 640 - tight * 80;
  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2 + lt * 0.2;
    const l = i % 10 === 0 ? 40 : 14;
    ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R); ctx.lineTo(CX + Math.cos(a) * (R + l), CY + Math.sin(a) * (R + l)); ctx.stroke();
  }
  ctx.restore();
  // heart
  const hb = 1 + kick * 0.14 - tight * 0.12;
  neonHeart(ctx, CX, CY, 230 * hb, { fill: 0.55 + kick * 0.3, lw: 7 });
  // cages
  wire(ctx, CUBE_V, CUBE_E, { size, ry, rx, color: C.cyan, lw: 4.5, assemble, seed: 7 });
  if (t > 27.9) wire(ctx, OCTA_V, OCTA_E, { size: size * 1.55, ry: -ry * 1.3, rx: rx + 0.3, rz: lt * 0.2, color: C.magenta, lw: 3.5, assemble: prog(t, 28, 28.9), seed: 21 });
  // orbiting chain of links
  if (t > 27.9) {
    const n = 22, a0 = prog(t, 28, 29);
    ctx.save();
    for (let i = 0; i < n * a0; i++) {
      const a = (i / n) * Math.PI * 2 + lt * 0.9;
      let p = [Math.cos(a) * 820, 0, Math.sin(a) * 820];
      p = rotX(rotZ(p, 0.35), 0.25);
      const q = project(p, { f: 1500, z: 1800 });
      if (!q) continue;
      ctx.strokeStyle = i % 2 ? C.red : C.hot; ctx.lineWidth = 6 * q[2];
      ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.ellipse(q[0], q[1], 34 * q[2], (i % 2 ? 14 : 22) * q[2], a + Math.PI / 2, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  // text
  if (t > 27.95) {
    const p = prog(t, 28, 28.5);
    const out = prog(t, 31.5, 31.8);
    ctx.save();
    ctx.globalAlpha = eoutCubic(p) * (1 - out);
    ctx.font = font(900, 130, 'SC'); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.letterSpacing = `${lerp(160, 70, eoutExpo(p))}px`;
    ctx.fillStyle = C.red;
    ctx.fillText('逃不掉', CX + 35, CY + 560);
    ctx.globalAlpha *= 0.35; ctx.fillStyle = '#fff';
    ctx.fillText('逃不掉', CX + 35, CY + 560);
    ctx.restore();
    hudText(ctx, scramble('NO  ESCAPE', p, 8), CX, CY + 650, { size: 30, color: '#ffb3c6', align: 'center', fam: 'Inter', weight: 600, spacing: 30, alpha: 1 - out });
  }
  shockRing(ctx, CX, CY, t - 24, { color: C.red, dur: 0.8 });
  shockRing(ctx, CX, CY, t - 28, { color: C.magenta, dur: 0.8 });
}

/* =====================================================================================
   S4  32–40  break: the heart in a glass box, rain in slow motion
   ===================================================================================== */
export function sBreak(ctx, t) {
  const lt = t - 32;
  const push = einCubic(prog(t, 37.6, 39.5));
  ctx.fillStyle = '#04020a'; ctx.fillRect(0, 0, W, H);
  ctx.save();
  const zs = 1 + push * 0.7 + lt * 0.012;
  ctx.translate(CX, CY); ctx.scale(zs, zs); ctx.rotate(push * 0.06); ctx.translate(-CX, -CY);
  ctx.globalAlpha = 0.5;
  city(ctx, t, { camT: 5 + lt * 0.08, speed: 0.3, kick: 0, signs: 0.6 });
  ctx.globalAlpha = 1;
  ctx.fillStyle = 'rgba(4,2,10,0.55)'; ctx.fillRect(0, 0, W, H);
  dust(ctx, t, { alpha: 0.8, bokeh: true, drift: 8 });
  rain(ctx, t, { speed: 520, alpha: 0.6, slant: 0.1 });

  const hk = pulse('heart', t, 0.35, 31.9);
  // ripple from each heartbeat
  for (const h of EV.heart) if (h >= 32 && h < 40) {
    shockRing(ctx, CX, CY, t - h, { color: C.red, dur: 1.6, maxR: 900, lw: 4 });
  }
  // glass box
  const ry = lt * 0.35 + push * 2.5, rx = 0.5 + Math.sin(lt * 0.5) * 0.08;
  neonHeart(ctx, CX, CY, 210 * (1 + hk * 0.12), { fill: 0.5 + hk * 0.4, lw: 6 });
  wire(ctx, CUBE_V, CUBE_E, { size: 400, ry, rx, color: C.cyan, lw: 3.5, faces: CUBE_F, faceAlpha: 0.05 });
  // bell sparks rising off the box
  for (const [bt, f] of EV.bell) {
    const age = t - bt;
    if (bt < 31.9 || bt > 40 || age < 0 || age > 2.2) continue;
    const r = rand(Math.floor(bt * 1000));
    const x = CX + (r() - 0.5) * 700, y0 = CY - 300;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (1 - age / 2.2) ** 1.5;
    ctx.fillStyle = f > 1000 ? '#ffffff' : C.cyan;
    const y = y0 - eoutCubic(age / 2.2) * 420;
    ctx.beginPath(); ctx.arc(x, y, 6 * (1 - age / 2.2) + 2, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha *= 0.3;
    ctx.beginPath(); ctx.arc(x, y, 26, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }
  // snare roll: tightening cage lines around the box
  const roll = prog(t, 38, 39.5);
  if (roll > 0) {
    for (const sn of EV.snare) {
      const age = t - sn;
      if (sn < 38 || sn > 39.6 || age < 0 || age > 0.25) continue;
      const r = rand(Math.floor(sn * 333));
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = (1 - age / 0.25) * roll;
      const a = r() * Math.PI * 2;
      neonLine(ctx, [[CX + Math.cos(a) * 2000, CY + Math.sin(a) * 2000], [CX - Math.cos(a) * 2000, CY - Math.sin(a) * 2000]], C.red, 3, 1);
      ctx.restore();
    }
  }
  ctx.restore();
  caption(ctx, '我不是爱你', t, 32.6, 35.7, { size: 78, spacing: 40, sub: "I DON'T LOVE YOU", y: H * 0.84 });
  caption(ctx, '我是想拥有你', t, 36.0, 39.35, { size: 78, spacing: 40, sub: 'I WANT TO OWN YOU', y: H * 0.84, color: '#ffc2d1' });
  hudFrame(ctx, t, { alpha: 0.5 * (1 - push), label: 'MEMORY // 03:12' });
  vignetteFill(ctx, 0.75);
}

// 39.5–40 blackout: one flickering glyph
export function sBlack(ctx, t) {
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  const on = hash(Math.floor(t * 40)) > 0.45 ? 1 : 0.15;
  const p = prog(t, 39.5, 40);
  blit(ctx, glyph('占', 520, { color: C.red, stroke: 4 }), CX, CY, 1 + p * 0.15, on * (0.3 + 0.6 * p), 'lighter');
  ctx.fillStyle = `rgba(255,23,68,${0.5 * on})`;
  ctx.fillRect(0, CY + (hash(Math.floor(t * 30)) - 0.5) * 600, W, 2);
}

/* =====================================================================================
   S5  40–52  drop B: title, the lock, the montage
   ===================================================================================== */
const TITLE = ['占', '有', '欲'];
export function sTitle(ctx, t) {
  const kick = pulse('kick', t, 0.12);
  dropBG(ctx, t, { colors: [C.red, C.magenta, C.violet], speedMul: 1, roll: 0.3 });
  const push = 1 + eio(prog(t, 41.5, 44)) * 0.08;
  ctx.save();
  ctx.translate(CX, CY); ctx.scale(push, push); ctx.translate(-CX, -CY);
  TITLE.forEach((ch, i) => {
    const at = 40 + i * 0.5;
    const p = prog(t, at, at + 0.4);
    if (p <= 0) return;
    const x = CX + (i - 1) * 660, y = CY - 40;
    if (p < 1) {
      sliceIn(ctx, glyph(ch, 600, { color: '#fff' }), x, y, p, { seed: 50 + i * 7, slices: 18, dist: 1100 });
      blit(ctx, glyph(ch, 600, { color: C.red }), x, y, 1 + (1 - p) * 0.5, (1 - p) * 0.5, 'lighter');
    } else {
      const sp = 7 + kick * 26 + pulse('glitch', t, 0.08) * 40;
      splitWord(ctx, ch, x, y, 600, { split: sp, color: C.red });
      const jit = hash(Math.floor(t * 20) + i) < 0.06 ? 1 : 0;
      if (jit) sliceOut(ctx, glyph(ch, 600, { color: C.cyan }), x + 20, y, 0.15, { seed: Math.floor(t * 20), alpha: 0.45 });
    }
    shockRing(ctx, x, y, t - at, { color: i === 2 ? C.red : C.magenta, dur: 0.6, maxR: 900, lw: 8 });
  });
  // underline sweep + english
  const up = eoutExpo(prog(t, 41.5, 42.2));
  ctx.fillStyle = C.red; ctx.fillRect(CX - 1000 * up, CY + 330, 2000 * up, 6);
  ctx.fillStyle = '#fff'; ctx.globalAlpha = 0.8; ctx.fillRect(CX - 1000 * up, CY + 331, 2000 * up, 2); ctx.globalAlpha = 1;
  hudText(ctx, scramble('POSSESSIVENESS', prog(t, 41.5, 42.4), 61), CX, CY + 420, { size: 54, color: '#fff', align: 'center', fam: 'Inter', weight: 300, spacing: 44 });
  hudText(ctx, scramble('/ 一种名为爱的禁锢 /', prog(t, 42.0, 42.8), 62), CX, CY + 490, { size: 32, color: C.magenta, align: 'center', fam: 'SC', weight: 300, spacing: 18 });
  ctx.restore();
  hudFrame(ctx, t, { alpha: 0.9, label: 'TITLE // 占有欲' });
  vignetteFill(ctx, 0.55);
}

function lockShape(ctx, x, y, s, draw, shackle, { color = C.cyan, lw = 10 } = {}) {
  // body + shackle as one stroke path, revealed by dash offset
  const bw = 560 * s, bh = 430 * s, r = 60 * s;
  const sw = 190 * s, shY = y - bh / 2 - lerp(150, 0, shackle) * s;
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const path = new Path2D();
  path.roundRect(x - bw / 2, y - bh / 2, bw, bh, r);
  const sh = new Path2D();
  sh.moveTo(x - sw, y - bh / 2 + 10 * s - (shY - (y - bh / 2)) * -1 * 0);
  sh.moveTo(x - sw, shY + 40 * s);
  sh.lineTo(x - sw, shY - 120 * s);
  sh.arc(x, shY - 120 * s, sw, Math.PI, 0);
  sh.lineTo(x + sw, shY + 70 * s);
  const len = 2600 * s;
  for (const [p, total] of [[path, 2 * (bw + bh)], [sh, len * 0.5]]) {
    ctx.setLineDash([total * draw, total * 2]);
    ctx.strokeStyle = color; ctx.globalAlpha = 0.3; ctx.lineWidth = lw * 3 * s; ctx.stroke(p);
    ctx.globalAlpha = 1; ctx.lineWidth = lw * s; ctx.stroke(p);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = lw * 0.35 * s; ctx.stroke(p);
    ctx.strokeStyle = color;
  }
  ctx.setLineDash([]);
  if (draw > 0.6) {
    ctx.globalAlpha = (draw - 0.6) * 2.5 * 0.18;
    ctx.fillStyle = color; ctx.fill(path);
  }
  ctx.restore();
  return { bw, bh };
}

export function sLock(ctx, t) {
  const kick = pulse('kick', t, 0.12);
  dropBG(ctx, t, { colors: [C.cyan, C.violet], speedMul: 1, roll: -0.2, alpha: 0.7 });
  const draw = eoutCubic(prog(t, 44.0, 45.4));
  const snap = t < 46 ? 0 : eoutBack(prog(t, 46, 46.12), 3);
  const locked = t >= 46;
  const s = 1 + kick * 0.02 + (locked ? pulse('lock', t, 0.3) * 0.06 : 0);
  const x = CX, y = CY + 150;
  // chains from the corners
  const ch = eoutCubic(prog(t, 44.5, 46));
  ctx.save();
  for (const [cx0, cy0] of [[0, 0], [W, 0], [0, H], [W, H]]) {
    const n = 14;
    for (let i = 0; i < n * ch; i++) {
      const u = i / n;
      const px = lerp(cx0, x, u * 0.82), py = lerp(cy0, y, u * 0.82) + Math.sin(u * Math.PI) * 60;
      const a = Math.atan2(y - cy0, x - cx0);
      ctx.strokeStyle = i % 2 ? C.magenta : C.violet; ctx.lineWidth = 7; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.ellipse(px, py, 42, i % 2 ? 14 : 24, a, 0, Math.PI * 2); ctx.stroke();
    }
  }
  ctx.restore();
  lockShape(ctx, x, y, s, draw, snap, { color: locked ? C.red : C.cyan });
  // keyhole heart
  const hk = prog(t, 45.2, 45.6);
  if (hk > 0) neonHeart(ctx, x, y + 10, 95 * eoutBack(hk) * (1 + kick * 0.12), { fill: 0.7, lw: 5, color: locked ? C.red : C.hot });
  if (locked) {
    shockRing(ctx, x, y - 200, t - 46, { color: C.red, dur: 0.9, maxR: 2000, lw: 14 });
    shockRing(ctx, x, y - 200, t - 46.08, { color: '#ffffff', dur: 0.7, maxR: 1500, lw: 6 });
    const p = eoutExpo(prog(t, 46, 46.3));
    neonText(ctx, 'LOCKED', CX, 250, { size: 170, fam: 'Inter', weight: 900, color: C.red, spacing: lerp(120, 40, p), alpha: p });
    hudText(ctx, scramble('已上锁 · 永不解开', prog(t, 46.2, 46.9), 3), CX, 360, { size: 40, color: '#fff', align: 'center', fam: 'SC', weight: 500, spacing: 20 });
  } else {
    hudText(ctx, scramble('ENCRYPTING HEART.DAT', prog(t, 44.2, 45.2), 15), CX, 300, { size: 40, color: C.cyan, align: 'center', spacing: 10 });
    const pct = Math.floor(clamp(prog(t, 44.2, 45.95)) * 100);
    hudText(ctx, `${String(pct).padStart(3, '0')}%`, CX, 360, { size: 34, color: C.cyan, align: 'center' });
  }
  caption(ctx, '你是我的', t, 46.5, 47.92, { size: 84, weight: 900, spacing: 50, y: H * 0.9, sub: 'YOU ARE MINE', color: '#fff', stagger: 0.05 });
  hudFrame(ctx, t, { alpha: 0.9, label: 'LOCK // 0xDEAD' });
  vignetteFill(ctx, 0.55);
}

// 48–52 montage: cuts on the grid (beat → 8th → 16th)
const MONT = ['eye', '你', 'heart', '我', 'lock', 'MINE', 'city', '占', 'eye', '有', 'heart', '欲', 'lock', '你', 'eye', '我', 'heart', '占', 'MINE', '欲'];
export function cutsAt(t) {
  // returns [index, cutStart, cutLen]
  if (t < 50) { const i = Math.floor((t - 48) / 0.5); return [i, 48 + i * 0.5, 0.5]; }
  if (t < 51) { const i = Math.floor((t - 50) / 0.25); return [4 + i, 50 + i * 0.25, 0.25]; }
  const i = Math.floor((t - 51) / 0.125); return [8 + i, 51 + i * 0.125, 0.125];
}
export function sMontage(ctx, t) {
  const [i, at, len] = cutsAt(t);
  const lp = (t - at) / len;
  const what = MONT[i % MONT.length];
  const inv = i % 4 === 3;
  ctx.fillStyle = inv ? '#e8003d' : '#05030b'; ctx.fillRect(0, 0, W, H);
  const kick = pulse('kick', t, 0.1);
  if (!inv) tunnel(ctx, t, { colors: i % 2 ? [C.red, C.magenta] : [C.cyan, C.violet], kick, speedMul: 1.5, roll: i * 0.4, alpha: 0.8 });
  const s = lerp(1.18, 1, eoutExpo(clamp(lp * 1.4))) * (1 + (t - 48) * 0.03);
  ctx.save();
  ctx.translate(CX, CY); ctx.scale(s, s); ctx.rotate((hash(i) - 0.5) * 0.06); ctx.translate(-CX, -CY);
  const fg = inv ? '#05030b' : '#fff';
  if (what === 'eye') eye(ctx, CX, CY, 1.1, t, { open: 1, iris: 1, lockP: 1, hud: 1, lidColor: inv ? '#05030b' : C.red });
  else if (what === 'heart') { neonHeart(ctx, CX, CY, 330 * (1 + kick * 0.1), { fill: 0.7, lw: 9, color: inv ? '#05030b' : C.red }); wire(ctx, CUBE_V, CUBE_E, { size: 560, ry: t * 1.5, rx: 0.5, color: inv ? '#05030b' : C.cyan, lw: 5 }); }
  else if (what === 'lock') lockShape(ctx, CX, CY + 110, 1.15, 1, 1, { color: inv ? '#05030b' : C.red, lw: 12 });
  else if (what === 'city') { city(ctx, t, { camT: 6 + (t - 48) * 3, kick, speed: 1 }); rain(ctx, t, { speed: 4000 }); }
  else if (what === 'MINE') splitWord(ctx, 'MINE', CX, CY, 620, { fam: 'Inter', color: inv ? '#05030b' : C.magenta, split: inv ? 0 : 14 });
  else {
    if (inv) blit(ctx, glyph(what, 900, { color: fg }), CX, CY, 1);
    else splitWord(ctx, what, CX, CY, 900, { split: 10 + kick * 20, color: C.red });
  }
  ctx.restore();
  // frame counter strip
  hudText(ctx, `CUT ${String(i + 1).padStart(2, '0')}  ·  ${what.toUpperCase()}`, 130, H - 110, { size: 26, color: inv ? '#05030b' : C.cyan });
  if (!inv) hudFrame(ctx, t, { alpha: 0.8, label: 'OVERRIDE // 失控' });
  vignetteFill(ctx, 0.5);
}

/* =====================================================================================
   S6  52–56  outro: the eye returns, the title, the eye shuts into a flatline
   ===================================================================================== */
export function sOutro(ctx, t) {
  ctx.fillStyle = '#05020a'; ctx.fillRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, W * 0.6);
  bg.addColorStop(0, 'rgba(60,5,40,0.8)'); bg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  dust(ctx, t, { alpha: 0.6, drift: 6 });
  const shrink = eio(prog(t, 52.9, 53.8));
  const ey = lerp(CY, CY - 210, shrink), es = lerp(1.15, 0.6, shrink);
  const open = eoutCubic(prog(t, 52.15, 52.8)) * (1 - eioExpo(prog(t, 55.0, 55.25)));
  const hk = pulse('heart', t, 0.3, 52.5);
  eye(ctx, CX, ey, es, t, { open, iris: prog(t, 52.4, 52.9), lockP: 1, pupil: 1 - hk * 0.6, hud: 1 - prog(t, 54.9, 55.2), lidColor: C.red });
  // title card
  const tp = prog(t, 53.0, 53.6);
  if (tp > 0) {
    const fl = t > 55 ? (hash(Math.floor(t * 30)) > 0.35 ? 1 : 0.2) : 1;
    const g = glyph('占有欲', 230, { color: '#ffe3ea', spacing: 70 });
    const ty = CY + 250;
    if (tp < 1) sliceIn(ctx, g, CX, ty, tp, { seed: 77, slices: 12, dist: 500 });
    else {
      blit(ctx, glyph('占有欲', 230, { color: C.red, spacing: 70 }), CX - 5, ty, 1, 0.8 * fl, 'lighter');
      blit(ctx, glyph('占有欲', 230, { color: C.cyan, spacing: 70 }), CX + 5, ty, 1, 0.5 * fl, 'lighter');
      blit(ctx, g, CX, ty, 1, fl);
    }
    hudText(ctx, scramble('P O S S E S S I V E', prog(t, 53.4, 54.2), 5), CX, ty + 200, { size: 40, color: '#d8d3f5', align: 'center', fam: 'Inter', weight: 300, spacing: 18, alpha: fl });
    hudText(ctx, scramble('你，逃不掉的。', prog(t, 54.0, 54.6), 6), CX, ty + 270, { size: 34, color: C.red, align: 'center', fam: 'SC', weight: 300, spacing: 16, alpha: fl });
  }
  // flatline when the eye shuts
  const fl = prog(t, 55.05, 55.6);
  if (fl > 0) {
    const half = eoutExpo(fl) * W * 0.5;
    ctx.save();
    ctx.globalAlpha = 1 - prog(t, 55.6, 56);
    neonLine(ctx, [[CX - half, ey], [CX + half, ey]], C.red, 5, 1);
    ctx.restore();
  }
  shockRing(ctx, CX, CY, t - 52, { color: '#ffffff', dur: 1.0, maxR: 2200, lw: 16 });
  shockRing(ctx, CX, ey, t - 55, { color: C.red, dur: 0.8, maxR: 1400, lw: 8 });
  vignetteFill(ctx, 0.7);
}

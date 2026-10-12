// 声音合成：零依赖（Node 22），确定性（种子 PRNG）。配乐为原创合成，无任何第三方音源。
//   node tools/sound.mjs                 → sfx/*.wav + bgm.wav（全片 78s）+ 混音.wav（全片）
//   node tools/sound.mjs --frames 420    → 混音.wav 只到第 420 帧（预览用）
// 音效提示表直接从 index.html 里的 /*CUES*/[...]/*END*/ 读取，画面与声音单一来源。
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SR = 48000, FPS = 30, TOTAL_FRAMES = 2340;
const argv = process.argv.slice(2);
const FRAMES = argv.includes('--frames') ? parseInt(argv[argv.indexOf('--frames') + 1], 10) : TOTAL_FRAMES;
const html = fs.readFileSync(path.join(DIR, 'index.html'), 'utf8');
const cuesFile = path.join(DIR, 'cues.json');            // render.mjs 导出的完整提示表（含表盘跳秒）
const CUES = fs.existsSync(cuesFile) ? JSON.parse(fs.readFileSync(cuesFile, 'utf8'))
  : JSON.parse(html.match(/\/\*CUES\*\/([\s\S]*?)\/\*END\*\//)[1]);

const TAU = Math.PI * 2;
const dB = d => Math.pow(10, d / 20);
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

/* ---------- 基础 DSP ---------- */
const buf = sec => new Float32Array(Math.ceil(sec * SR));
function onePoleLP(x, fc) { const a = Math.exp(-TAU * fc / SR); let y = 0; for (let i = 0; i < x.length; i++) { y = (1 - a) * x[i] + a * y; x[i] = y; } return x; }
function onePoleHP(x, fc) { const a = Math.exp(-TAU * fc / SR); let y = 0, px = 0; for (let i = 0; i < x.length; i++) { y = a * (y + x[i] - px); px = x[i]; x[i] = y; } return x; }
function bandRes(x, fc, q) {            // 二阶带通（RBJ）
  const w = TAU * fc / SR, al = Math.sin(w) / (2 * q), a0 = 1 + al;
  const b0 = al / a0, b2 = -al / a0, a1 = -2 * Math.cos(w) / a0, a2 = (1 - al) / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) { const y = b0 * x[i] + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x[i]; y2 = y1; y1 = y; x[i] = y; }
  return x;
}
function normalize(x, peak = 1) { let m = 0; for (const v of x) m = Math.max(m, Math.abs(v)); if (m > 0) for (let i = 0; i < x.length; i++) x[i] *= peak / m; return x; }
function fadeOut(x, sec) { const n = Math.min(x.length, Math.round(sec * SR)); for (let i = 0; i < n; i++) x[x.length - 1 - i] *= i / n; return x; }
/* Freeverb 式混响：8 梳状 + 4 全通，长尾 */
function reverb(x, { room = 0.9, damp = 0.3, wet = 0.4, spread = 0 } = {}) {
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(n => Math.round((n + spread) * SR / 44100));
  const apT = [556, 441, 341, 225].map(n => Math.round((n + spread) * SR / 44100));
  const y = new Float32Array(x.length);
  for (const L of combT) {
    const d = new Float32Array(L); let idx = 0, f = 0;
    for (let i = 0; i < x.length; i++) { const o = d[idx]; f = o * (1 - damp) + f * damp; d[idx] = x[i] * 0.015 + f * room; idx = (idx + 1) % L; y[i] += o; }
  }
  for (const L of apT) {
    const d = new Float32Array(L); let idx = 0;
    for (let i = 0; i < y.length; i++) { const b = d[idx], v = y[i]; y[i] = -v + b; d[idx] = v + b * 0.5; idx = (idx + 1) % L; }
  }
  const outB = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) outB[i] = x[i] * (1 - wet) + y[i] * wet * 3;
  return outB;
}
function writeWav(file, L, R = L) {
  const n = L.length, b = Buffer.alloc(44 + n * 4);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28);
  b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i])) * 32767), 44 + i * 4);
    b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, R[i])) * 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, b);
}

/* ---------- 音效（每个 0.3–1.2s） ---------- */
const SFX = {
  tick() {           // 时钟滴答：两段高频共振短咔
    const x = buf(0.3), rnd = mulberry32(11);
    for (const [t0, g] of [[0, 1], [0.012, 0.45]]) for (let i = 0; i < 0.004 * SR; i++) x[Math.round(t0 * SR) + i] += (rnd() * 2 - 1) * g * (1 - i / (0.004 * SR));
    const a = bandRes(Float32Array.from(x), 3800, 9), b = bandRes(Float32Array.from(x), 2100, 6);
    for (let i = 0; i < x.length; i++) x[i] = a[i] + 0.6 * b[i];
    return normalize(fadeOut(x, 0.1));
  },
  dust() {           // 星尘细响：稀疏高频颗粒 + 玻璃泛音，缓起缓落
    const x = buf(1.1), rnd = mulberry32(23);
    for (let k = 0; k < 90; k++) {
      const t0 = Math.floor(rnd() * (x.length - 4000)), fr = 5200 + rnd() * 5200, g = 0.2 + rnd() * 0.8, dec = 0.01 + rnd() * 0.03;
      for (let i = 0; i < 0.08 * SR; i++) x[t0 + i] += Math.sin(TAU * fr * i / SR) * g * Math.exp(-i / SR / dec);
    }
    for (let i = 0; i < x.length; i++) { const t = i / x.length; x[i] *= Math.sin(Math.PI * t) ** 1.5; x[i] += 0.12 * Math.sin(TAU * 2637 * i / SR) * Math.sin(Math.PI * t) ** 3; }
    return normalize(reverb(onePoleHP(x, 3000), { room: 0.8, wet: 0.5 }));
  },
  snap() {           // 咬合「咔」：瞬态 + 双共振体 + 低频顿感
    const x = buf(0.35), rnd = mulberry32(37);
    for (let i = 0; i < 0.003 * SR; i++) x[i] = (rnd() * 2 - 1);
    const a = bandRes(Float32Array.from(x), 1250, 5), b = bandRes(Float32Array.from(x), 3400, 7);
    for (let i = 0; i < x.length; i++) { const t = i / SR; x[i] = 2 * a[i] + b[i] + 0.7 * Math.sin(TAU * 90 * t) * Math.exp(-t / 0.05); }
    return normalize(fadeOut(x, 0.15));
  },
  whoosh() {         // 扩散：低频冲击 + 由暗到亮的风声扫频
    const x = buf(1.2), rnd = mulberry32(41);
    let lp = 0;
    for (let i = 0; i < x.length; i++) {
      const t = i / SR, env = Math.min(1, t / 0.03) * Math.exp(-t / 0.42);
      const fc = 300 + 4200 * Math.min(1, t / 0.5); const a = Math.exp(-TAU * fc / SR);
      lp = (1 - a) * (rnd() * 2 - 1) + a * lp;
      x[i] = lp * env * 1.6 + 0.9 * Math.sin(TAU * (48 + 30 * Math.exp(-t / 0.08)) * t) * Math.exp(-t / 0.25);
    }
    return normalize(reverb(x, { room: 0.85, wet: 0.35 }));
  },
  chain() {          // 链环「叮」：非谐金属泛音
    const x = buf(0.7);
    for (const [fr, g, d] of [[2093, 1, 0.25], [5340, 0.5, 0.12], [7920, 0.25, 0.07], [3150, 0.3, 0.18]])
      for (let i = 0; i < x.length; i++) x[i] += g * Math.sin(TAU * fr * i / SR) * Math.exp(-i / SR / d);
    return normalize(reverb(x, { room: 0.7, wet: 0.25 }));
  },
  coin() {           // 硬币落「叮当」：几次递减的弹落
    const x = buf(0.9);
    for (const [t0, g] of [[0, 1], [0.13, 0.55], [0.22, 0.32], [0.28, 0.18], [0.32, 0.1]]) {
      const s = Math.round(t0 * SR);
      for (const [fr, pg, d] of [[4186, 1, 0.12], [6912, 0.6, 0.07], [9150, 0.35, 0.05], [2640, 0.25, 0.09]])
        for (let i = 0; s + i < x.length; i++) x[s + i] += g * pg * Math.sin(TAU * fr * i / SR) * Math.exp(-i / SR / d);
    }
    return normalize(reverb(x, { room: 0.6, wet: 0.2 }));
  },
  quote() {          // 报价刷新「嗒」：短促木质
    const x = buf(0.3), rnd = mulberry32(53);
    for (let i = 0; i < 0.002 * SR; i++) x[i] = rnd() * 2 - 1;
    const a = bandRes(Float32Array.from(x), 1650, 4);
    for (let i = 0; i < x.length; i++) x[i] = a[i] + 0.3 * Math.sin(TAU * 820 * i / SR) * Math.exp(-i / SR / 0.02);
    return normalize(fadeOut(x, 0.2));
  },
};

/* ---------- 配乐：原创电影感配乐（A 小调）——管风琴母题 + 钢琴琶音 + 暖垫 + 心跳低频 + 钟声 ----------
   段落：S0 管风琴音头与撞击 → S1 钢琴动机 → S2 八分音符琶音（像秒针）→ 黑场 → S3 十六分琶音 + 心跳 + 钟声
         → 黑场 → S4 和声垫 + 高音对位旋律 → 黑场 → S5 只留管风琴与钢琴长尾 */
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const SAW = (() => { const n = 4096, t = new Float32Array(n); for (let i = 0; i < n; i++) { let v = 0; for (let k = 1; k <= 24; k++) v += Math.sin(TAU * k * i / n) / k; t[i] = v * 0.55; } return t; })();
const CHORDS = {
  Am: { b: 45, v: [57, 60, 64, 71] }, F: { b: 41, v: [53, 57, 60, 67] }, C: { b: 48, v: [52, 55, 60, 64] },
  G: { b: 43, v: [50, 55, 59, 62] }, E: { b: 40, v: [52, 56, 59, 64] }, Dm: { b: 38, v: [50, 53, 57, 64] },
};
function bgm() {
  const END = TOTAL_FRAMES / FPS, n = Math.ceil((END + 4) * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  const add = (i, l, r) => { if (i >= 0 && i < n) { L[i] += l; R[i] += r; } };
  const smooth = (t, a, b) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
  /* 钢琴式音色：泛音略带非谐、高次泛音衰减更快 */
  function piano(t0, m, vel, dur = 3, pan = 0) {
    const f0 = mtof(m), s0 = Math.round(t0 * SR), len = Math.round(dur * SR);
    const parts = [1, 2, 3, 4, 5, 6].map(k => ({ f: f0 * k * (1 + 0.0004 * k * k), a: vel / Math.pow(k, 1.35), d: 0.55 + 0.5 * k }));
    for (let i = 0; i < len; i++) {
      const t = i / SR, att = Math.min(1, t / 0.004); let v = 0;
      for (const p of parts) v += p.a * Math.sin(TAU * p.f * t) * Math.exp(-t * p.d);
      v *= att * (i > len - 2400 ? (len - i) / 2400 : 1);
      add(s0 + i, v * (1 - pan) * 0.5 + v * 0.5, v * (1 + pan) * 0.5 + v * 0.5);
    }
  }
  /* 暖垫：三声部失谐锯齿波 + 缓开的低通 */
  function pad(t0, t1, notes, gain, bright = 900) {
    const s0 = Math.round(t0 * SR), s1 = Math.round(t1 * SR), fade = 1.2 * SR;
    const voices = []; notes.forEach((m, j) => [-0.08, 0, 0.09].forEach((dt, k) => voices.push({ inc: mtof(m + dt) * SAW.length / SR, ph: (j * 977 + k * 331) % SAW.length, pan: (k - 1) * 0.6 })));
    let lpL = 0, lpR = 0, l2L = 0, l2R = 0;
    for (let i = s0 - fade; i < s1 + fade * 1.5; i++) {
      if (i < 0 || i >= n) continue;
      const env = Math.min(1, (i - (s0 - fade)) / (2 * fade)) * Math.min(1, Math.max(0, (s1 + fade * 1.5 - i) / (2.5 * fade)));
      let l = 0, r = 0;
      for (const v of voices) { v.ph = (v.ph + v.inc) % SAW.length; const x = SAW[v.ph | 0]; l += x * (1 - v.pan); r += x * (1 + v.pan); }
      const fc = bright * (0.7 + 0.3 * Math.sin(TAU * 0.07 * i / SR)), a = Math.exp(-TAU * fc / SR);
      lpL = (1 - a) * l + a * lpL; lpR = (1 - a) * r + a * lpR;          // 两级低通：更暗、更柔
      l2L = (1 - a) * lpL + a * l2L; l2R = (1 - a) * lpR + a * l2R;
      add(i, l2L * gain * 0.6 * env / voices.length * 2, l2R * gain * 0.6 * env / voices.length * 2);
    }
  }
  const organ = (f, t) => Math.sin(TAU * f * t) + 0.5 * Math.sin(TAU * 2 * f * t) + 0.28 * Math.sin(TAU * 3 * f * t) + 0.16 * Math.sin(TAU * 4 * f * t) + 0.06 * Math.sin(TAU * 6 * f * t);
  function organChord(t0, t1, notes, gain) {
    const s0 = Math.round(t0 * SR), s1 = Math.round(t1 * SR), fa = 0.6 * SR;
    for (let i = s0; i < s1 + fa * 2; i++) {
      const t = i / SR, env = Math.min(1, (i - s0) / fa) * Math.min(1, Math.max(0, (s1 + fa * 2 - i) / (fa * 2)));
      const trem = 1 - 0.18 * (0.5 + 0.5 * Math.sin(TAU * 0.17 * t));
      let v = 0; for (const m of notes) v += organ(mtof(m), t);
      v *= gain * env * trem / notes.length;
      add(i, v, v * 0.96);
    }
  }
  function bell(t0, m, vel) {
    const f0 = mtof(m), s0 = Math.round(t0 * SR);
    for (let i = 0; i < 3.5 * SR; i++) {
      const t = i / SR; let v = 0;
      for (const [k, a, d] of [[1, 1, 1.6], [2.76, 0.45, 0.9], [5.4, 0.25, 0.5], [8.93, 0.12, 0.3]]) v += a * Math.sin(TAU * f0 * k * t) * Math.exp(-t / d);
      v *= vel * Math.min(1, t / 0.002); add(s0 + i, v * 0.8, v);
    }
  }
  function heart(t0, vel) {                                  // 心跳式低频：两下（lub-dub）
    for (const [dt, g] of [[0, 1], [0.24, 0.6]]) {
      const s0 = Math.round((t0 + dt) * SR);
      for (let i = 0; i < 0.5 * SR; i++) { const t = i / SR, f = 46 + 22 * Math.exp(-t / 0.04); const v = vel * g * Math.sin(TAU * f * t) * Math.exp(-t / 0.16); add(s0 + i, v, v); }
    }
  }
  function boom(t0, vel) {
    const s0 = Math.round(t0 * SR), rnd = mulberry32(Math.round(t0 * 1000)); let lp = 0, ph = 0;
    for (let i = 0; i < 3 * SR; i++) {
      const t = i / SR, f = 32 + 48 * Math.exp(-t / 0.18); ph += TAU * f / SR;
      lp = 0.97 * lp + 0.03 * (rnd() * 2 - 1);
      const v = vel * (Math.sin(ph) * Math.exp(-t / 1.1) + 2.2 * lp * Math.exp(-t / 0.5));
      add(s0 + i, v, v);
    }
  }
  function riser(t0, t1, vel) {                              // 反向空气声：进黑场前吸气，然后戛然而止
    const s0 = Math.round(t0 * SR), s1 = Math.round(t1 * SR), rnd = mulberry32(s0); let lp = 0, hp = 0, px = 0;
    for (let i = s0; i < s1; i++) {
      const u = (i - s0) / (s1 - s0), fc = 400 + 5000 * u * u, a = Math.exp(-TAU * fc / SR);
      const x = rnd() * 2 - 1; lp = (1 - a) * x + a * lp; hp = 0.995 * (hp + lp - px); px = lp;
      const v = vel * hp * u * u * u; add(i, v * (1 - 0.3 * Math.sin(u * 9)), v * (1 + 0.3 * Math.sin(u * 9)));
    }
  }

  /* ---- S0：管风琴极低音头（0–0.6s 几乎无声）→ 加压 → 2.33s 撞击 ---- */
  for (let i = 0; i < 4.6 * SR; i++) {
    const t = i / SR;
    const head = Math.min(1, t / 0.08) * Math.exp(-t / 0.35);
    const body = smooth(t, 0.6, 2.33) * 0.5 * (1 - smooth(t, 3.6, 4.6) * 0.5);
    const v = (head * 0.9 + body) * (organ(55, t) * 0.5 + organ(110, t) * 0.3) * 0.5;
    add(i, v, v * 0.97);
  }
  boom(2.33, 0.55); bell(2.36, 88, 0.12); bell(2.9, 93, 0.06);
  /* ---- S1：A 小调暖垫 + 钢琴动机 ---- */
  pad(4.0, 14.0, CHORDS.Am.v, 0.16, 700);
  organChord(4.0, 14.0, [33, 45], 0.10);
  [[4.6, 69], [5.4, 76], [6.2, 72], [7.0, 71], [9.0, 69], [9.8, 76], [10.6, 74], [11.4, 72], [12.6, 64]].forEach(([t, m]) => piano(t, m, 0.22, 3.2, 0.1));
  /* ---- S2：八分音符琶音，像秒针在走 ---- */
  const S2c = ['Am', 'F', 'C', 'G'], S2d = 13 / 4;
  S2c.forEach((k, ci) => {
    const t0 = 14 + ci * S2d, v = CHORDS[k].v;
    pad(t0, t0 + S2d, v, 0.15, 800); organChord(t0, t0 + S2d, [CHORDS[k].b - 12, CHORDS[k].b], 0.1);
    const pat = [v[0], v[2], v[3], v[1] + 12, v[2] + 12, v[3], v[2], v[1] + 12];
    pat.forEach((m, j) => piano(t0 + j * S2d / 8, m, 0.13 * (j % 2 ? 0.75 : 1), 1.8, j % 2 ? 0.25 : -0.25));
    heart(t0, 0.18);
  });
  riser(25.4, 26.93, 0.35);
  /* ---- S3：十六分琶音 + 心跳 + 管风琴和弦 + 钟声标记每个市场 ---- */
  boom(27.07, 0.5);
  const S3c = ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E'], S3d = 25 / 8;
  S3c.forEach((k, ci) => {
    const t0 = 27 + ci * S3d, v = CHORDS[k].v, end = Math.min(t0 + S3d, 50.6);
    pad(t0, end, v, 0.17, 1100); organChord(t0, end, [CHORDS[k].b - 12, ...v.slice(0, 3)], 0.12);
    piano(t0, CHORDS[k].b, 0.22, 3.0);
    for (let j = 0; j < 16; j++) { const t = t0 + j * S3d / 16; if (t > 50.4) break; piano(t, v[j % 4] + 12 + (j % 8 >= 4 ? 12 : 0), 0.075 * (j % 4 === 0 ? 1.3 : 1), 1.2, ((j % 4) - 1.5) * 0.3); }
    heart(t0, 0.3); if (t0 + S3d / 2 < 50.4) heart(t0 + S3d / 2, 0.2);
  });
  [[33.33, 81], [39.0, 84], [45.0, 79], [50.75, 76]].forEach(([t, m]) => bell(t, m, 0.13));
  riser(50.3, 51.93, 0.4); boom(50.75, 0.35);
  /* ---- S4：和声垫 + 高音对位旋律（更宽、更暖） ---- */
  boom(52.07, 0.45);
  const S4c = ['Dm', 'F', 'Am', 'G', 'Dm', 'F', 'E', 'E'], S4d = 19 / 8;
  const mel = [81, 84, 76, 79, 81, 77, 80, 76];
  S4c.forEach((k, ci) => {
    const t0 = 52 + ci * S4d, v = CHORDS[k].v, end = Math.min(t0 + S4d, 70.6);
    pad(t0, end, v.concat([v[0] + 12]), 0.2, 1400); organChord(t0, end, [CHORDS[k].b - 12, CHORDS[k].b], 0.1);
    piano(t0 + 0.05, mel[ci], 0.17, 3.2, 0.2);
    for (let j = 0; j < 8; j++) { const t = t0 + j * S4d / 8; if (t > 70.4) break; piano(t, v[(j * 3) % 4] + 12, 0.07, 1.4, j % 2 ? 0.3 : -0.3); }
    heart(t0, 0.22);
  });
  riser(69.4, 70.93, 0.35);
  /* ---- S5：收干净，只留管风琴与钢琴长尾 ---- */
  boom(71.07, 0.35);
  organChord(71.0, 76.0, [33, 45, 57, 64], 0.2);
  pad(71.0, 75.5, CHORDS.Am.v, 0.13, 600);
  [[71.4, 57], [71.8, 64], [72.2, 69], [72.6, 72], [73.4, 76]].forEach(([t, m]) => piano(t, m, 0.18, 4.5));
  bell(75.0, 93, 0.07); bell(76.7, 81, 0.06);
  /* 黑场：三处真正的静默（与画面黑场同步） */
  for (const b of [27.0, 52.0, 71.0]) for (let i = Math.round((b - 0.12) * SR); i < Math.round((b + 0.07) * SR); i++) {
    const u = Math.abs(i / SR - b + 0.025) / 0.1; const g = Math.min(1, u * u); if (i >= 0 && i < n) { L[i] *= g; R[i] *= g; }
  }
  const fadeTail = Math.round((END - 0.6) * SR);
  for (let i = fadeTail; i < n; i++) { const g = Math.max(0, 1 - (i - fadeTail) / (0.6 * SR)); L[i] *= g; R[i] *= g; }
  const outL = reverb(onePoleLP(L, 6000), { room: 0.9, damp: 0.4, wet: 0.32 });
  const outR = reverb(onePoleLP(R, 6000), { room: 0.9, damp: 0.4, wet: 0.32, spread: 23 });
  let m = 0; for (let i = 0; i < n; i++) m = Math.max(m, Math.abs(outL[i]), Math.abs(outR[i]));
  for (let i = 0; i < n; i++) { outL[i] /= m; outR[i] /= m; }
  return [outL.subarray(0, Math.ceil(END * SR)), outR.subarray(0, Math.ceil(END * SR))];
}

/* ---------- 生成 ---------- */
fs.mkdirSync(path.join(DIR, 'sfx'), { recursive: true });
const sfx = {};
for (const [k, fn] of Object.entries(SFX)) { sfx[k] = fn(); writeWav(path.join(DIR, 'sfx', `${k}.wav`), sfx[k]); }
const [bL, bR] = bgm();
writeWav(path.join(DIR, 'bgm.wav'), bL, bR);

/* ---------- 混音：音效 -8dB，配乐 -20dB；音效出现处配乐自动压低 4dB ---------- */
const N = Math.ceil(FRAMES / FPS * SR);
const fxL = new Float32Array(N), fxR = new Float32Array(N), duck = new Float32Array(N);
for (const c of CUES) {
  if (c.f >= FRAMES) continue;
  let s = sfx[c.s]; if (c.rev) s = Float32Array.from(s).reverse();
  const start = Math.round(c.f / FPS * SR) - (c.rev ? s.length : 0);
  const pan = c.pan ?? 0, g = (c.g ?? 1) * dB(-8);
  for (let i = 0; i < s.length; i++) {
    const j = start + i; if (j < 0 || j >= N) continue;
    fxL[j] += s[i] * g * (1 - Math.max(0, pan)); fxR[j] += s[i] * g * (1 + Math.min(0, pan));
    duck[j] = 1;
  }
}
/* 压低包络：起 15ms，释放 300ms */
const att = Math.exp(-1 / (0.015 * SR)), rel = Math.exp(-1 / (0.3 * SR));
let e = 0;
const mixL = new Float32Array(N), mixR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  e = duck[i] > e ? duck[i] + (e - duck[i]) * att : duck[i] + (e - duck[i]) * rel;
  const gb = dB(-20) * dB(-4 * e);
  mixL[i] = (bL[i] ?? 0) * gb + fxL[i]; mixR[i] = (bR[i] ?? 0) * gb + fxR[i];
}
/* 总线：整体响度对齐到约 -18 dBFS RMS（相对电平不变），峰值用软限幅收在 -1 dBFS 以内 */
let ss = 0; for (let i = 0; i < N; i++) ss += mixL[i] * mixL[i] + mixR[i] * mixR[i];
const rms = Math.sqrt(ss / (2 * N)) || 1, mg = dB(-18) / rms, ceil = dB(-1);
const lim = x => { const a = Math.abs(x); return a < 0.7 * ceil ? x : Math.sign(x) * (0.7 * ceil + 0.3 * ceil * Math.tanh((a - 0.7 * ceil) / (0.3 * ceil))); };
for (let i = 0; i < N; i++) { mixL[i] = lim(mixL[i] * mg); mixR[i] = lim(mixR[i] * mg); }
writeWav(path.join(DIR, '混音.wav'), mixL, mixR);
console.log(`sfx ×${Object.keys(sfx).length}, bgm.wav ${(bL.length / SR).toFixed(2)}s, 混音.wav ${(N / SR).toFixed(2)}s (${FRAMES} frames)`);

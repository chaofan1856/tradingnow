// 声音合成：零依赖（Node 22），确定性（种子 PRNG）。
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
const CUES = JSON.parse(html.match(/\/\*CUES\*\/([\s\S]*?)\/\*END\*\//)[1]);

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

/* ---------- 配乐：管风琴低频铺底（55 / 110Hz），段落逐步加层 ---------- */
function bgm() {
  const dur = TOTAL_FRAMES / FPS + 4, n = Math.ceil(dur * SR);
  const L = new Float32Array(n), R = new Float32Array(n);
  const sec = s => s;                                  // 段落时间点（秒）
  const S2 = 420 / FPS, S3 = 810 / FPS, S4 = 1560 / FPS, S5 = 2130 / FPS, END = TOTAL_FRAMES / FPS;
  const smooth = (t, a, b) => { const u = Math.min(1, Math.max(0, (t - a) / (b - a))); return u * u * (3 - 2 * u); };
  const organ = (f, t, ph) => {                         // 管风琴音栓：基音 + 八度 + 十二度 + 十五度
    return Math.sin(TAU * f * t + ph) + 0.5 * Math.sin(TAU * 2 * f * t + ph * 2) + 0.28 * Math.sin(TAU * 3 * f * t)
      + 0.16 * Math.sin(TAU * 4 * f * t) + 0.06 * Math.sin(TAU * 6 * f * t);
  };
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    /* 0–0.6s：只有一个极低的音头，随即退到几乎无声 */
    const head = Math.min(1, t / 0.08) * Math.exp(-t / 0.35) * (t < 1.2 ? 1 : 0);
    /* 主体：0.6s 起缓慢加压，2.33s 撞击处鼓起，S0–S2 只有管风琴单音（A 的八度叠加） */
    let body = smooth(t, 0.6, 2.4) * 0.45 + 0.25 * smooth(t, 2.33, 2.9) * Math.exp(-Math.max(0, t - 2.9) / 6) + 0.3 * smooth(t, 3, S3);
    body *= 1 - 0.85 * (1 - smooth(Math.abs(t - S3), 0, 0.25)) * (t > S3 - 1 && t < S3 + 1 ? 1 : 0);   // 0:27 黑场呼吸
    body *= 1 - 0.85 * (1 - smooth(Math.abs(t - S5), 0, 0.25)) * (t > S5 - 1 && t < S5 + 1 ? 1 : 0);   // 1:11 黑场呼吸
    const tail = t > S5 ? Math.exp(-(t - S5) / 3.5) : 1;                                               // S5 收干净
    const trem = 1 - 0.22 * (0.5 + 0.5 * Math.sin(TAU * 0.17 * t));                                    // 极慢呼吸
    let l = 0, r = 0;
    const a1 = organ(55, t, 0) * 0.5 + organ(110, t, 0.3) * 0.35, a2 = organ(55.12, t, 1) * 0.5 + organ(110.2, t, 1.2) * 0.35;
    l += (head * 0.9 + body * trem * tail) * a1; r += (head * 0.9 + body * trem * tail) * a2;
    /* S3：节奏性高频点缀（刻度般清脆，每拍一下，72bpm） */
    if (t > S3 && t < S5) {
      const beat = 60 / 72, ph = (t - S3) % beat, k = Math.floor((t - S3) / beat);
      const fr = [1760, 2637, 2217, 2637][k % 4];
      const v = 0.07 * Math.sin(TAU * fr * ph) * Math.exp(-ph / 0.05) * smooth(t, S3, S3 + 2) * (t > S4 ? 0.7 : 1);
      l += v * (k % 2 ? 0.6 : 1); r += v * (k % 2 ? 1 : 0.6);
    }
    /* S4：和声层（A 大三和弦 C#/E），缓入 */
    if (t > S4 - 1) {
      const hg = 0.18 * smooth(t, S4, S4 + 3) * tail;
      const hv = Math.sin(TAU * 138.6 * t) + 0.6 * Math.sin(TAU * 164.8 * t) + 0.3 * Math.sin(TAU * 220 * t);
      l += hg * hv * trem; r += hg * hv * (2 - trem) * 0.9;
    }
    /* S0 撞击（2.33s）：低频鼓起 */
    const hit = t > 2.33 ? Math.exp(-(t - 2.33) / 1.2) * 0.5 * Math.sin(TAU * 41 * (t - 2.33)) : 0;
    l += hit; r += hit;
    const fade = smooth(END + 3.5 - t, 0, 3.5);
    L[i] = l * fade; R[i] = r * fade;
  }
  const outL = reverb(onePoleLP(L, 1800), { room: 0.92, damp: 0.35, wet: 0.45 });
  const outR = reverb(onePoleLP(R, 1800), { room: 0.92, damp: 0.35, wet: 0.45, spread: 23 });
  const m = Math.max(...[outL, outR].map(a => a.reduce((s, v) => Math.max(s, Math.abs(v)), 0)));
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
/* 总线：整体增益到 -1dBFS 峰值（相对电平不变） */
let pk = 0; for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(mixL[i]), Math.abs(mixR[i]));
const mg = dB(-1) / pk; for (let i = 0; i < N; i++) { mixL[i] *= mg; mixR[i] *= mg; }
writeWav(path.join(DIR, '混音.wav'), mixL, mixR);
console.log(`sfx ×${Object.keys(sfx).length}, bgm.wav ${(bL.length / SR).toFixed(2)}s, 混音.wav ${(N / SR).toFixed(2)}s (${FRAMES} frames)`);

"""Synthesise the film's audio (deterministic, seeded): bgm.wav + sfx/*.wav.
The final mix (levels, offsets) is done by ffmpeg in build.sh.

    python3 tools/score.py
"""
import os, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, FPS, DUR = 48000, 30, 78.0
rng = np.random.default_rng(1754)
YEAR_FRAMES = [214, 454, 814, 1174, 1474, 1774, 2164]          # 年份块浮现
HARP_NOTES = [440.0, 523.25, 659.26, 587.33, 493.88, 440.0, 659.26]


def write(path, x):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.max(np.abs(x)) + 1e-9) * 0.98                       # every stem peaks at ~0 dBFS; ffmpeg sets levels
    pcm = (x * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def bandpass(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def harpsichord(freq, sec=1.6):
    """基频 + 2/3/4 次谐波，attack 快、decay 快（不用方波）"""
    t = t_(sec); y = np.zeros_like(t)
    for k, a in zip([1, 2, 3, 4], [1.0, 0.55, 0.36, 0.24]):
        y += a * np.sin(2 * np.pi * freq * k * t * (1 + 0.0004 * k)) * np.exp(-t * (5.5 + 2.6 * k))
    y *= np.minimum(1, t / 0.003)
    click = bandpass(rng.standard_normal(len(t)), 2000, 7000) * np.exp(-t * 300) * 0.15
    return y + click


# ---------------- BGM ----------------
t = t_(DUR); n = len(t)
trem = 1 + 0.15 * np.sin(2 * np.pi * 0.11 * t)                     # 极慢 tremolo
bow = 1 + 0.03 * np.sin(2 * np.pi * 0.37 * t + 1.2)
bass = (np.sin(2 * np.pi * 55 * t) + 0.7 * np.sin(2 * np.pi * 110 * t + 0.4) + 0.12 * np.sin(2 * np.pi * 165 * t + 1.1)) * trem * bow
bass *= np.clip((t - 1.2) / 3.0, 0, 1) * np.clip((DUR - t) / 2.0, 0, 1)
duck = np.ones(n)
for fr in YEAR_FRAMES:                                               # 年份块浮现：配乐压低 3dB 一拍
    s = fr / FPS; env = np.exp(-0.5 * ((t - s - 0.25) / 0.18) ** 2)
    duck *= 1 - (1 - 10 ** (-3 / 20)) * env
bgm = bass * duck * 0.55
for fr, f0 in zip(YEAR_FRAMES, HARP_NOTES):
    h = harpsichord(f0) * 0.5; i = int(fr / FPS * SR); bgm[i:i + len(h)] += h[:n - i]
# S7 尾段：极轻的弦乐升调
s7 = 72.0; ts = np.clip(t - s7, 0, None); m = t >= s7
glide = 220 * (1.5 ** np.clip(ts / 4.0, 0, 1))
strings = np.zeros(n)
for k, det in enumerate([-0.004, -0.0015, 0.0, 0.002, 0.0045]):
    ph = 2 * np.pi * np.cumsum(glide * (1 + det) * (1 + 0.004 * np.sin(2 * np.pi * 5.2 * t + k))) / SR
    strings += np.sin(ph) + 0.35 * np.sin(2 * ph) + 0.18 * np.sin(3 * ph)
strings *= m * np.clip(ts / 2.5, 0, 1) * np.clip((DUR - t) / 2.0, 0, 1) * 0.06
bgm += strings
write(os.path.join(ROOT, 'bgm.wav'), bgm)

# ---------------- SFX ----------------
SFX = os.path.join(ROOT, 'sfx'); os.makedirs(SFX, exist_ok=True)

# 硬币「叮」：非谐分音 + 轻微拍频
t = t_(2.6); ding = np.zeros_like(t)
for r, a, d in [(1, 1.0, 1.4), (2.76, 0.5, 2.2), (5.40, 0.28, 3.4), (8.93, 0.14, 5.0)]:
    ding += a * (np.sin(2 * np.pi * 1960 * r * t) + 0.5 * np.sin(2 * np.pi * (1960 * r + 3.1) * t)) * np.exp(-t * d)
ding *= np.minimum(1, t / 0.002)
write(os.path.join(SFX, 'coin_ding.wav'), ding)

# 纸展开「沙」
t = t_(1.1); env = np.zeros_like(t)
for k in range(26):
    c = rng.uniform(0.0, 0.85); w = rng.uniform(0.01, 0.05); env += rng.uniform(0.3, 1.0) * np.exp(-0.5 * ((t - c) / w) ** 2)
paper = bandpass(rng.standard_normal(len(t)), 1500, 9000) * env * np.clip((1.1 - t) / 0.3, 0, 1)
write(os.path.join(SFX, 'paper.wav'), paper)

# 天平「吱…」：摩擦脉冲串，频率由慢到快
t = t_(0.9); creak = np.zeros_like(t); pos = 0.0
while pos < 0.75:
    i = int(pos * SR); tt = t_(0.02)
    pulse = np.sin(2 * np.pi * 1350 * tt) * np.exp(-tt * 260) + 0.5 * np.sin(2 * np.pi * 2900 * tt) * np.exp(-tt * 400)
    creak[i:i + len(pulse)] += pulse[:len(creak) - i] * (0.5 + 0.5 * np.sin(np.pi * pos / 0.75))
    pos += 0.024 - 0.014 * pos / 0.75 + rng.uniform(-0.002, 0.002)
write(os.path.join(SFX, 'balance_creak.wav'), creak)
# 天平「咔」：木质短击
t = t_(0.25)
click = (np.sin(2 * np.pi * 820 * t) * np.exp(-t * 90) + 0.6 * bandpass(rng.standard_normal(len(t)), 1200, 6000) * np.exp(-t * 220))
write(os.path.join(SFX, 'balance_click.wav'), click)

# 米粒落仓「沙沙」：颗粒点击 + 细嘶声，密度跟随画面（帧 1038–1112）
t = t_(2.9); rice = np.zeros_like(t)
for k in range(900):
    c = rng.uniform(0, 2.4) ** 1.0; i = int(c * SR); tt = t_(0.006)
    g = bandpass(rng.standard_normal(len(tt) + 64), 2500, 10000)[:len(tt)] * np.exp(-tt * 900) * rng.uniform(0.2, 1)
    rice[i:i + len(g)] += g[:len(rice) - i]
rice += 0.12 * bandpass(rng.standard_normal(len(t)), 3000, 9000) * np.clip(t / 0.3, 0, 1) * np.clip((2.5 - t) / 0.5, 0, 1)
write(os.path.join(SFX, 'rice.wav'), rice)

# 金链断裂「铿」
t = t_(2.2); clang = np.zeros_like(t)
for f0, a, d in [(523, 1.0, 1.8), (1307, 0.7, 2.6), (2210, 0.45, 3.5), (3480, 0.3, 5.0), (4930, 0.18, 7.0)]:
    clang += a * np.sin(2 * np.pi * f0 * t + rng.uniform(0, 6)) * np.exp(-t * d)
clang += 0.8 * bandpass(rng.standard_normal(len(t)), 1500, 9000) * np.exp(-t * 60)
clang *= np.minimum(1, t / 0.0015)
write(os.path.join(SFX, 'chain_break.wav'), clang)

# 按键「嗒」
t = t_(0.3)
tap = 0.9 * np.sin(2 * np.pi * 180 * t) * np.exp(-t * 45) + 0.7 * bandpass(rng.standard_normal(len(t)), 1800, 8000) * np.exp(-t * 350)
write(os.path.join(SFX, 'button_tap.wav'), tap)
print('wrote bgm.wav + sfx/*.wav')

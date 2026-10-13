"""Synthesise the film's sound: bgm.wav + sfx/*.wav (48 kHz, deterministic).

    python3 tools/score.py

bgm  — contrabass drone (55 Hz + 110 Hz sines, very slow tremolo, re-bowed at
       each scene), a harpsichord overtone at every year block (fundamental +
       2nd/3rd/4th harmonics, fast attack, fast decay — never a square wave),
       the bed dipping 3 dB for one beat as each year appears, and a faint
       rising string layer under S7.
sfx  — coin "叮", paper "沙", balance "吱…咔", rice "沙沙", chain "铿", key "嗒".
The mix itself (sfx −8 dB, bgm −20 dB) happens in ffmpeg — see build.sh.
"""
import os, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR, FPS, DUR = 48000, 30, 98.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(1754)

# year blocks appear at scene start + 8 frames (see SCN in index.html)
SCENE_STARTS = [244, 600, 870, 1170, 1320, 1470, 1620, 1770, 1920, 2130, 2460]
YEAR_AT = [(s + 8) / FPS for s in SCENE_STARTS]


def write(path, x, stereo=True):
    x = np.asarray(x, dtype=np.float64)
    peak = np.max(np.abs(x)) or 1.0
    x = x / peak * 10 ** (-1 / 20)                     # normalise to −1 dBFS
    data = np.stack([x, x], axis=1) if stereo and x.ndim == 1 else x
    pcm = (np.clip(data, -1, 1) * 32767).astype('<i2')
    with wave.open(path, 'wb') as w:
        w.setnchannels(pcm.shape[1] if pcm.ndim == 2 else 1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(f'{os.path.relpath(path, ROOT)}  {len(x) / SR:.2f}s')


def env_ar(n, a, r):                                  # attack/exponential-release envelope
    tt = np.arange(n) / SR
    return np.minimum(1, tt / max(a, 1e-4)) * np.exp(-tt / r)


def bandpass(x, lo, hi):                              # brick-ish FFT band-pass (offline, deterministic)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.clip((f - lo * 0.8) / (lo * 0.2 + 1e-9), 0, 1) * np.clip((hi * 1.25 - f) / (hi * 0.25), 0, 1)
    return np.fft.irfft(X * m, len(x))


def smoothstep(x):
    x = np.clip(x, 0, 1); return x * x * (3 - 2 * x)


# ------------------------------------------------------------------ bgm
# contrabass drone
trem = 1 - 0.16 * (0.5 + 0.5 * np.sin(2 * np.pi * 0.11 * t))
drone = (np.sin(2 * np.pi * 55 * t) * 0.8 + np.sin(2 * np.pi * 110 * t + 0.4) * 0.45) * trem
bow = np.ones(N)
for s in SCENE_STARTS:                                # re-bow: a soft dip and swell at each scene
    x = (t - s / FPS)
    bow *= 1 - 0.22 * np.exp(-((x + 0.15) / 0.18) ** 2) + 0.12 * np.exp(-((x - 0.9) / 0.8) ** 2)
open_env = smoothstep((t - 1.2) / 4.8)                # silence while the screen is black
close_env = 1 - smoothstep((t - 96.0) / 2.0)          # follows the close to black
bed = drone * bow

# S7: faint strings rising a whole tone under the ending
u = np.clip((t - 92.0) / 5.5, 0, 1)
glide = 2 ** (2 / 12 * smoothstep(u))
vib = 1 + 0.003 * np.sin(2 * np.pi * 5.2 * t)
strings = np.zeros(N)
for f0, amp in ((220.0, 1.0), (329.63, 0.7), (440.0, 0.55)):
    ph = 2 * np.pi * np.cumsum(f0 * glide * vib) / SR
    for h in range(1, 7):
        strings += amp / h * np.sin(h * ph + h * 0.7)
strings *= 0.07 * smoothstep((t - 92.0) / 2.5)
bed = bed + strings

# −3 dB for one beat as each year block appears
duck = np.ones(N)
for y in YEAR_AT:
    x = t - y
    dip = np.where(x < 0, 0, np.where(x < 0.05, x / 0.05, np.where(x < 0.4, 1, np.clip(1 - (x - 0.4) / 0.2, 0, 1))))
    duck *= 1 - (1 - 10 ** (-3 / 20)) * dip
bed *= duck

# harpsichord overtone at each year block
harp = np.zeros(N)
NOTES = [440.0, 659.26, 523.25, 587.33, 392.0, 440.0, 523.25, 659.26, 587.33, 440.0, 659.26]
for y, f0 in zip(YEAR_AT, NOTES):
    i0, n = int(y * SR), int(1.6 * SR)
    tt = np.arange(n) / SR
    tone = np.zeros(n)
    for h, amp in ((1, 1.0), (2, 0.55), (3, 0.38), (4, 0.24)):
        tone += amp * np.sin(2 * np.pi * f0 * h * tt) * np.exp(-tt / (0.55 / h ** 0.8))
    tone *= np.minimum(1, tt / 0.002)
    click = bandpass(rng.standard_normal(n) * np.exp(-tt / 0.004), 2500, 9000) * 0.15
    seg = (tone + click)[: N - i0]
    harp[i0:i0 + len(seg)] += seg
bgm = (bed * 1.0 + harp * 0.32) * open_env * close_env
write(os.path.join(ROOT, 'bgm.wav'), bgm)

# harpsichord-only layer: laid over a user-supplied track (music/) so the year blocks keep their chime
os.makedirs(os.path.join(ROOT, 'sfx'), exist_ok=True)
write(os.path.join(ROOT, 'sfx', 'years.wav'), harp * close_env)

# ------------------------------------------------------------------ sfx
SFX = os.path.join(ROOT, 'sfx'); os.makedirs(SFX, exist_ok=True)

# 硬币「叮」 — inharmonic metal partials, long ring
n = int(2.6 * SR); tt = np.arange(n) / SR
ding = sum(a * np.sin(2 * np.pi * f * tt + p) * np.exp(-tt / d) for f, a, d, p in
           ((2093, 1.0, 1.5, 0), (4856, 0.45, 0.8, 1.1), (8895, 0.22, 0.35, 2.0), (1046.5, 0.25, 0.9, 0.3), (2101, 0.4, 1.4, 0.7)))
ding *= np.minimum(1, tt / 0.0015)
ding += bandpass(rng.standard_normal(n) * np.exp(-tt / 0.003), 3000, 12000) * 0.3
write(os.path.join(SFX, 'ding.wav'), ding)

# 纸展开「沙」 — crinkled band-limited noise
n = int(0.9 * SR); tt = np.arange(n) / SR
grains = np.repeat(rng.random(n // 240 + 1) ** 3, 240)[:n]
paper = bandpass(rng.standard_normal(n), 1200, 7000) * (0.35 + grains) * np.minimum(1, tt / 0.06) * np.exp(-np.maximum(0, tt - 0.25) / 0.22)
write(os.path.join(SFX, 'paper.wav'), paper)

# 天平「吱…咔」 — stick-slip creak, then the click of the beam settling (≈2 s later)
n = int(2.3 * SR); tt = np.arange(n) / SR
fr = 430 + 60 * np.sin(2 * np.pi * 1.3 * tt) + 25 * np.cumsum(rng.standard_normal(n)) / np.sqrt(SR) * 4
ph = 2 * np.pi * np.cumsum(fr) / SR
stick = (np.sin(2 * np.pi * 38 * tt) > 0.2).astype(float)
creak = bandpass(np.sign(np.sin(ph)) * 0.5 + np.sin(ph) * 0.5, 300, 3200) * (0.4 + 0.6 * stick)
creak *= np.minimum(1, tt / 0.05) * np.exp(-tt / 0.45) * (tt < 1.2)
k0 = int(1.95 * SR); kt = np.arange(n - k0) / SR
click = np.zeros(n)
click[k0:] = (np.sin(2 * np.pi * 2600 * kt) * np.exp(-kt / 0.012) * 0.8 + bandpass(rng.standard_normal(n - k0), 1500, 8000) * np.exp(-kt / 0.006) * 0.6)
write(os.path.join(SFX, 'scale.wav'), creak * 0.8 + click)

# 米粒落仓「沙沙」 — thousands of tiny grains
n = int(2.4 * SR); rice = np.zeros(n)
tt = np.arange(n) / SR
shape = smoothstep(tt / 0.15) * (1 - smoothstep((tt - 1.8) / 0.5))
for k in range(2200):
    i = int(rng.random() * (n - 400))
    if rng.random() > shape[i]: continue
    m = 160 + int(rng.random() * 200); g = np.arange(m) / SR
    f = 2200 + rng.random() * 5000
    rice[i:i + m] += np.sin(2 * np.pi * f * g + rng.random() * 6) * np.exp(-g / 0.0015) * (0.3 + rng.random())
rice = bandpass(rice + rng.standard_normal(n) * 0.04 * shape, 900, 10000)
write(os.path.join(SFX, 'rice.wav'), rice)

# 金链断裂「铿」
n = int(1.8 * SR); tt = np.arange(n) / SR
chain = sum(a * np.sin(2 * np.pi * f * tt + p) * np.exp(-tt / d) for f, a, d, p in
            ((612, 1.0, 0.6, 0), (1493, 0.7, 0.45, 0.6), (2717, 0.5, 0.3, 1.3), (4102, 0.3, 0.18, 2.2), (931, 0.4, 0.5, 0.2)))
chain *= np.minimum(1, tt / 0.001)
chain += bandpass(rng.standard_normal(n) * np.exp(-tt / 0.01), 1500, 9000) * 0.7
write(os.path.join(SFX, 'chain.wav'), chain)

# 按键「嗒」
n = int(0.35 * SR); tt = np.arange(n) / SR
tap = np.sin(2 * np.pi * 1400 * tt) * np.exp(-tt / 0.018) * 0.7 + np.sin(2 * np.pi * 180 * tt) * np.exp(-tt / 0.035) + \
      bandpass(rng.standard_normal(n) * np.exp(-tt / 0.004), 2000, 9000) * 0.5
write(os.path.join(SFX, 'tap.wav'), tap)

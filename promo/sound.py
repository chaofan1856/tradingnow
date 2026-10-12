"""Synthesised soundtrack for the 10s promo, hit-synced to index.html's timeline.

    python3 sound.py  -> out/sound.wav (48 kHz stereo)
"""
import os
import wave
import numpy as np

SR = 48000
DUR = 10.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(7)
L = np.zeros(N)
R = np.zeros(N)


def env(a, d, s_len=0.0, at=0.0, curve=4.0):
    """attack/decay envelope starting at `at` seconds."""
    x = t - at
    e = np.zeros(N)
    up = (x >= 0) & (x < a)
    e[up] = (x[up] / a) ** 2
    hold = (x >= a) & (x < a + s_len)
    e[hold] = 1
    dn = x >= a + s_len
    e[dn] = np.exp(-curve * (x[dn] - a - s_len) / d)
    return e


def onepole_lp(x, fc):
    """time-varying one-pole low-pass; fc scalar or array (Hz)."""
    fc = np.broadcast_to(np.asarray(fc, float), x.shape)
    a = 1 - np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc += a[i] * (x[i] - acc)
        y[i] = acc
    return y


def hp(x, fc):
    return x - onepole_lp(x, fc)


def add(sig, gain=1.0, pan=0.0):
    global L, R
    L += sig * gain * np.sqrt((1 - pan) / 2)
    R += sig * gain * np.sqrt((1 + pan) / 2)


def saw(f, phase=0.0):
    ph = np.cumsum(np.broadcast_to(f, t.shape)) / SR + phase
    return 2 * (ph % 1) - 1


def sine(f, phase=0.0):
    ph = np.cumsum(np.broadcast_to(f, t.shape)) / SR + phase
    return np.sin(2 * np.pi * ph)


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


# ---------- pad: Dmaj9 voicing, swells, ducks under hits ----------
pad_env = np.clip(t / 1.6, 0, 1) ** 1.5 * (1 - 0.35 * np.exp(-((t - 5.1) / 0.25) ** 2))
pad_cut = 600 + 2600 * np.clip((t - 1.5) / 3.0, 0, 1) - 1800 * np.exp(-((t - 5.05) / 0.3) ** 2) + 1500 * np.clip((t - 7.9) / 0.5, 0, 1)
for n in (50, 57, 62, 64, 66, 69, 73):
    for det, pan in ((-0.08, -0.7), (0.08, 0.7)):
        v = saw(midi(n + det), rng.random())
        add(onepole_lp(v, pad_cut) * pad_env, 0.018, pan)
add(sine(midi(38)) * pad_env * np.clip((t - 2) / 1.0, 0, 1) * (1 - np.clip((t - 7.0) / 0.9, 0, 1)), 0.08)

# ---------- opening ping as the pulse appears ----------
for f, g in ((midi(86), 0.09), (midi(93), 0.05)):
    add(sine(f) * env(0.004, 1.4, at=0.15), g, 0.2)

# ---------- driving pulse (120 bpm) during the chart + cards ----------
def kick(at, g=0.55):
    x = np.clip(t - at, 0, None)
    f = 45 + 120 * np.exp(-x * 30)
    ph = np.cumsum(f) / SR
    return np.sin(2 * np.pi * ph) * env(0.002, 0.35, at=at, curve=5) * g


for b in np.arange(2.0, 7.0, 0.5):
    if 4.6 < b < 5.4:
        continue
    add(kick(b, 0.42))
noise = rng.standard_normal(N)
hat_src = hp(noise, 7000)
for i, b in enumerate(np.arange(2.0, 7.0, 0.125)):
    if 4.45 < b < 5.3:
        continue
    acc = 0.035 if i % 2 else 0.018
    add(hat_src * env(0.001, 0.05, at=b, curve=6), acc, 0.35 if i % 4 < 2 else -0.35)

# ---------- whooshes ----------
def whoosh(start, length, f0, f1, g, pan_from=-0.6, pan_to=0.6):
    x = np.clip((t - start) / length, 0, 1)
    shape = np.sin(np.pi * x) ** 2 * ((t >= start) & (t <= start + length))
    band = onepole_lp(hp(rng.standard_normal(N), 200), f0 + (f1 - f0) * x ** 2)
    for side, p in ((1, pan_from), (1, pan_to)):
        add(band * shape * 0.5, g, p * (1 - x) + pan_to * x)


whoosh(1.55, 1.3, 400, 3500, 0.28)           # camera pull-back
whoosh(6.85, 1.1, 600, 5000, 0.22, 0.6, -0.6)  # cards swirl in

# ---------- riser into the zoom-through, then the drop ----------
rx = np.clip((t - 3.9) / 1.15, 0, 1)
riser_g = rx ** 3 * (t < 5.06)
add(onepole_lp(hp(rng.standard_normal(N), 800), 1200 + 9000 * rx ** 2) * riser_g, 0.22)
add(sine(220 * 2 ** (rx * 2.2)) * riser_g, 0.05)
add(kick(5.06, 0.9))
add(onepole_lp(rng.standard_normal(N), 1800) * env(0.003, 0.6, at=5.06), 0.18)

# ---------- UI blips as cards land + count ----------
for k, at in enumerate((5.15, 5.27, 5.39)):
    f = midi(81 + k * 4)
    add(sine(f) * env(0.002, 0.18, at=at, curve=5), 0.06, (k - 1) * 0.6)
    add(sine(f * 2) * env(0.002, 0.08, at=at, curve=5), 0.025, (k - 1) * 0.6)
for i, at in enumerate(np.arange(5.45, 6.35, 0.06)):
    add(hp(noise, 3000) * env(0.0005, 0.012, at=at, curve=6), 0.03 * (1 - i / 16), 0.2)

# ---------- reverse swell -> brand impact at 7.93 ----------
T0 = 7.93
rs = np.clip((t - 6.9) / (T0 - 6.9), 0, 1) ** 4 * (t < T0)
add(onepole_lp(rng.standard_normal(N), 2500 + 8000 * rs) * rs, 0.3)
x = np.clip(t - T0, 0, None)
boom_f = 32 + 90 * np.exp(-x * 9)
add(np.sin(2 * np.pi * np.cumsum(boom_f) / SR) * env(0.003, 2.2, at=T0, curve=4), 0.75)
add(onepole_lp(rng.standard_normal(N), 4000) * env(0.002, 0.9, at=T0, curve=6), 0.25)
# shimmer chord for the lock-up
for n, p in ((74, -0.5), (78, 0.5), (81, -0.2), (85, 0.3), (88, 0.0)):
    v = sine(midi(n)) + 0.3 * sine(midi(n) * 2.01)
    add(v * env(0.04, 2.0, at=T0 + 0.02, curve=3), 0.035, p)
# wordmark letters + light sweep sparkle
for i in range(10):
    at = 8.12 + i * 0.04
    add(sine(midi(96 + (i % 5) * 2)) * env(0.001, 0.12, at=at, curve=5), 0.012, -0.6 + i * 0.13)
add(hp(rng.standard_normal(N), 6000) * np.sin(np.pi * np.clip((t - 8.95) / 0.75, 0, 1)) ** 2, 0.03, 0.4)

# ---------- room: convolve with a short stereo noise tail ----------
def reverb(sig, seed):
    n = int(SR * 1.8)
    ir = np.random.default_rng(seed).standard_normal(n) * np.exp(-np.arange(n) / SR * 3.2)
    ir = onepole_lp(ir, 5000) if False else ir
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(sig) + n)))
    return np.fft.irfft(np.fft.rfft(sig, size) * np.fft.rfft(ir, size), size)[: len(sig)]


wetL, wetR = reverb(L, 1), reverb(R, 2)
L, R = L + 0.22 * wetL, R + 0.22 * wetR

# master: gentle fade-in, tail fade-out, soft clip, normalise
fade = np.clip(t / 0.05, 0, 1) * np.clip((DUR - t) / 0.6, 0, 1)
mix = np.stack([L, R], 1) * fade[:, None]
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix *= 0.89 / np.max(np.abs(mix))

os.makedirs(os.path.join(os.path.dirname(__file__), 'out'), exist_ok=True)
path = os.path.join(os.path.dirname(__file__), 'out', 'sound.wav')
with wave.open(path, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', path)

"""Sound design: synthesise every cue the page exports (build/cues.json) and mix it with the score.

    python3 tools/sfx.py          -> build/sfx.wav, build/mix.wav

All sounds are synthesised here (no samples): soft swells and low impacts for titles, a wooden
"tock" for trade prints, thuds, a heartbeat, risers/drops for optimism/fear, sea ambience and
waves for the iceberg. No bells (short decays only), every sound has a click-free envelope,
noise sources are band-limited and gentle, and the bus gets one shared small-room reverb.
"""
import json, os, subprocess
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
B = os.path.join(ROOT, 'build')
SR = 48000
R = np.random.default_rng(7)
cues = json.load(open(os.path.join(B, 'cues.json')))
total = json.load(open(os.path.join(ROOT, 'timeline.json')))['total']


def lp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), 'low', output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f / (SR / 2), 'high', output='sos'), x)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)
def tt(d): return np.arange(int(d * SR)) / SR
def fade(x, a=0.005, b=0.03):
    n = len(x); ia, ib = int(a * SR), int(b * SR)
    if ia: x[:ia] *= np.linspace(0, 1, ia)
    if ib: x[-ib:] *= np.linspace(1, 0, ib)
    return x
def sweep_sine(f0, f1, d, curve=1.0):
    t = tt(d); f = f0 + (f1 - f0) * (t / d) ** curve
    return np.sin(2 * np.pi * np.cumsum(f) / SR)
def sweep_band(noise, c0, c1, d, q=1.6, steps=24):
    """band-pass noise whose centre glides c0→c1 (log), processed in overlapping blocks"""
    out = np.zeros_like(noise); n = len(noise); blk = n // steps + 1
    win = np.hanning(2 * blk)
    for k in range(steps * 2):
        a = k * blk // 2; seg = noise[a:a + 2 * blk]
        if len(seg) < 8: break
        c = c0 * (c1 / c0) ** min(1, a / n)
        y = bp(seg, c / q, min(c * q, SR / 2 - 100)) * win[:len(seg)]
        out[a:a + len(seg)] += y
    return out / 1.0


def impact():
    t = tt(3.2); f = 36 + 26 * np.exp(-t * 2.2)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 1.0)
    x += 0.35 * np.sin(2 * np.pi * np.cumsum(2 * f) / SR) * np.exp(-t / 0.35)
    body = lp(R.standard_normal(len(t)), 220, 4) * np.exp(-t / 0.08) * 0.6
    return fade(x + body, 0.006, 0.4) * 0.42
def swell(d=1.8):
    t = tt(d); n = lp(R.standard_normal(len(t)), 6000)
    x = sweep_band(n, 250, 2600, d) * (t / d) ** 2.2
    x += 0.25 * sweep_sine(110, 220, d) * (t / d) ** 2
    return fade(x, 0.01, 0.12) * 0.55
def whoosh(d=1.0):
    t = tt(d); n = R.standard_normal(len(t))
    x = sweep_band(n, 350, 1600, d * 0.55)
    x = np.concatenate([x, sweep_band(R.standard_normal(int(d * 0.45 * SR)), 1600, 500, d * 0.45)])[:len(t)]
    return fade(x * np.sin(np.pi * t / d) ** 1.5, 0.005, 0.05) * 0.6
def thud():
    t = tt(0.6); x = sweep_sine(96, 58, 0.6, 0.4) * np.exp(-t / 0.16)
    x += lp(R.standard_normal(len(t)), 900, 4) * np.exp(-t / 0.018) * 0.4
    return fade(x, 0.002, 0.05)
def tock():
    t = tt(0.25)
    x = np.sin(2 * np.pi * 612 * t) * np.exp(-t / 0.045) + 0.45 * np.sin(2 * np.pi * 1574 * t) * np.exp(-t / 0.018)
    x += 0.3 * np.sin(2 * np.pi * 180 * t) * np.exp(-t / 0.05)
    x += lp(R.standard_normal(len(t)), 3000, 2) * np.exp(-t / 0.003) * 0.3
    return fade(x, 0.001, 0.03) * 0.8
def tick():
    t = tt(0.12); x = np.sin(2 * np.pi * 1180 * t) * np.exp(-t / 0.012) + lp(R.standard_normal(len(t)), 4000) * np.exp(-t / 0.002) * 0.2
    return fade(x, 0.001, 0.02) * 0.5
def slide():
    t = tt(0.5); x = sweep_band(R.standard_normal(len(t)), 900, 2200, 0.5, q=2.2) * np.sin(np.pi * t / 0.5) ** 2
    return fade(x, 0.005, 0.05) * 0.5
def heart(d=1.8):
    out = np.zeros(int(d * SR))
    for k in range(int(d / 0.81) + 1):
        for off, amp in ((0.0, 1.0), (0.17, 0.7)):
            s = int((k * 0.81 + off) * SR); t = tt(0.3); th = np.sin(2 * np.pi * 52 * t) * np.exp(-t / 0.07) * amp
            out[s:s + len(th)] += th[:max(0, len(out) - s)]
    return fade(out, 0.002, 0.2) * 0.9
def riser(d=2.0):
    t = tt(d); x = sweep_sine(130, 420, d, 1.6) * 0.5 + sweep_band(R.standard_normal(len(t)), 300, 3000, d) * 0.8
    return fade(x * (t / d) ** 1.8, 0.01, 0.15) * 0.6
def drop(d=1.8):
    t = tt(d); x = sweep_sine(360, 60, d, 0.5) * 0.6 + sweep_band(R.standard_normal(len(t)), 1800, 200, d) * 0.6
    return fade(x * np.exp(-t / (d * 0.55)), 0.01, 0.2) * 0.7
def sea(d):
    n = int(d * SR); t = np.arange(n) / SR; ch = []
    for c in range(2):
        x = np.cumsum(R.standard_normal(n)); x = hp(x, 30); x = lp(x, 520, 4)
        x /= np.abs(x).max() + 1e-9
        am = 0.55 + 0.3 * np.sin(2 * np.pi * 0.11 * t + c) + 0.15 * np.sin(2 * np.pi * 0.047 * t + 2 * c)
        ch.append(x * am)
    y = np.stack(ch, 1); fi = int(2.5 * SR); y[:fi] *= np.linspace(0, 1, fi)[:, None]; y[-fi:] *= np.linspace(1, 0, fi)[:, None]
    return y * 0.8
def wave():
    d = 3.2; t = tt(d); n = lp(R.standard_normal(len(t)), 5000)
    x = sweep_band(n, 260, 1900, d * 0.45)
    x = np.concatenate([x, sweep_band(lp(R.standard_normal(int(d * 0.55 * SR)), 5000), 1900, 350, d * 0.55)])[:len(t)]
    env = np.where(t < 0.9, (t / 0.9) ** 2, np.exp(-(t - 0.9) / 0.9))
    return fade(x * env, 0.01, 0.2) * 0.75
def deep(d=6):
    t = tt(d); x = (np.sin(2 * np.pi * 55 * t) + 0.5 * np.sin(2 * np.pi * 82.5 * t) + 0.2 * np.sin(2 * np.pi * 110.3 * t)) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t))
    env = np.minimum(1, t / 1.5) * np.minimum(1, (d - t) / 1.5)
    return x * env * 0.35

GEN = dict(impact=impact, swell=swell, whoosh=whoosh, thud=thud, tock=tock, tick=tick, slide=slide, heart=heart,
           riser=riser, drop=drop, wave=wave, deep=deep)

bus = np.zeros((int((total + 4) * SR), 2))
for c in cues:
    if c['type'] == 'sea':
        y = sea(c['dur'])
    else:
        f = GEN[c['type']]
        y = f(c['dur']) if 'dur' in c and c['type'] in ('heart', 'riser', 'drop', 'deep', 'swell', 'whoosh') else f()
        y = np.stack([y, y], 1) if y.ndim == 1 else y
    y = y * 10 ** (c['gain'] / 20)
    s = int(c['at'] * SR)
    if s < 0: y, s = y[-s:], 0
    e = min(len(bus), s + len(y)); bus[s:e] += y[:e - s]

# one shared small room so the sounds sit in the same space as the score
ir_t = tt(1.6); ir = R.standard_normal((len(ir_t), 2)) * np.exp(-ir_t / 0.35)[:, None]
ir = np.stack([lp(ir[:, 0], 5000), lp(ir[:, 1], 5000)], 1); ir /= np.sqrt((ir ** 2).sum(0))
wet = np.stack([fftconvolve(bus[:, k], ir[:, k])[:len(bus)] for k in range(2)], 1)
bus = bus + 0.22 * wet
bus = bus[:int(total * SR)]
peak = np.abs(bus).max()
if peak > 0.9: bus *= 0.9 / peak
sf.write(os.path.join(B, 'sfx.wav'), bus.astype(np.float32), SR)

# mix: score (bells removed) + SFX bus, loudness-normalised
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(B, 'music.wav'), '-i', os.path.join(B, 'sfx.wav'), '-filter_complex',
                '[0:a]volume=0.8[m];[1:a]volume=0.9[s];[m][s]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95:attack=5:release=80,loudnorm=I=-15:TP=-1.2:LRA=11[o]',
                '-map', '[o]', '-ar', str(SR), os.path.join(B, 'mix.wav')], check=True)
print(f'{len(cues)} cues  sfx peak {peak:.2f}  -> build/sfx.wav, build/mix.wav')

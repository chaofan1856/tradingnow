"""Original score for the film → bgm.wav (48 kHz stereo), timed from timeline.json.

Dark, cinematic, unhurried — the TradingNow knowledge-film mood:
  · warm string-pad chords (D minor world, lifting to F/B♭ for each chapter)
  · a soft felt-piano motif in eighths that thins out under dense explanations
  · a sub-pulse heartbeat (the "momentum" motif), faster in Module 3
  · a riser + low hit + shimmer on every chapter card, a soft swell on every scene transition
Everything is synthesised here, so the music is 100% original and Content-ID safe.

    python3 tools/score.py        (run `node render.mjs --timeline` first)
"""
import json, os, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TL = json.load(open(os.path.join(ROOT, 'timeline.json')))
SR = 48000
DUR = TL['seconds']
N = int(SR * DUR) + 1
L = np.zeros(N); R = np.zeros(N)
rng = np.random.default_rng(42)
scenes = TL['scenes']


def hz(note):
    names = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)


def place(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig = sig[-i:]; i = 0
    seg = sig[: N - i]
    L[i:i + len(seg)] += seg * gain * np.sqrt((1 - pan) / 2)
    R[i:i + len(seg)] += seg * gain * np.sqrt((1 + pan) / 2)


def pad(f, dur, attack=1.8, release=2.5):
    n = int((dur + release) * SR); x = np.arange(n) / SR
    tone = np.zeros(n)
    for det in (-0.06, 0.0, 0.07):                      # detuned saw-ish stack, low-passed by harmonic roll-off
        ff = f * 2 ** (det / 12)
        for k in range(1, 9):
            tone += np.sin(2 * np.pi * ff * k * x + k * 1.3 + det * 40) / (k ** 1.6)
    env = np.clip(x / attack, 0, 1) ** 2 * np.where(x > dur, np.exp(-(x - dur) / (release / 3)), 1.0)
    trem = 1 + 0.06 * np.sin(2 * np.pi * 0.17 * x)
    return tone * env * trem / 3


def piano(f, length=3.2, vel=1.0):
    n = int(length * SR); x = np.arange(n) / SR
    tone = np.zeros(n)
    for k, a, d in ((1, 1.0, 2.2), (2, .45, 3.4), (3, .22, 5.0), (4, .12, 7.0), (5, .06, 9.0)):
        tone += a * np.sin(2 * np.pi * f * k * 1.0007 ** k * x) * np.exp(-x * d)
    hammer = rng.standard_normal(n) * np.exp(-x * 320) * .05
    return (tone + hammer) * (1 - np.exp(-x * 900)) * vel


def thump(f0=48, length=0.9):
    n = int(length * SR); x = np.arange(n) / SR
    f = f0 + 30 * np.exp(-x * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 - np.exp(-x * 300)) * np.exp(-x * 7)


def riser(length=2.4):
    n = int(length * SR); x = np.arange(n) / SR
    noise = rng.standard_normal(n)
    # crude band-pass sweep: moving-average difference with shrinking window
    out = np.zeros(n); w0 = 400
    cs = np.cumsum(noise)
    for i in range(0, n, 2400):
        w = max(4, int(w0 * (1 - i / n) ** 2) + 4)
        j = np.arange(i, min(n, i + 2400))
        lo = np.clip(j - w, 0, n - 1)
        out[j] = (cs[j] - cs[lo]) / w
    return out * (x / length) ** 2.5 * 2.2


def shimmer(length=4.0):
    out = np.zeros(int(length * SR))
    for k, n in enumerate(['D6', 'A6', 'F6', 'D7', 'E6']):
        p = piano(hz(n), length - k * .08, .25)
        out[int(k * .08 * SR):int(k * .08 * SR) + len(p)] += p[: len(out) - int(k * .08 * SR)]
    return out


# ---------------------------------------------------------------- harmony per section
sec = lambda sid: next(s for s in scenes if s['id'] == sid)
mod_start = {m: sec(c)['start'] for m, c in ((1, 'ch1'), (2, 'ch2'), (3, 'ch3'))}
recap = sec('recap')['start']
PROGS = {
    0: [['D3', 'A3', 'F4'], ['Bb2', 'F3', 'D4'], ['F2', 'C4', 'A3'], ['C3', 'G3', 'E4']],      # Dm Bb F C
    1: [['D3', 'A3', 'F4'], ['G2', 'D3', 'Bb3'], ['Bb2', 'F3', 'D4'], ['A2', 'E3', 'C#4']],    # Dm Gm Bb A
    2: [['F2', 'C3', 'A3'], ['C3', 'G3', 'E4'], ['D3', 'A3', 'F4'], ['Bb2', 'F3', 'D4']],      # F C Dm Bb  (order)
    3: [['D3', 'A3', 'F4'], ['Bb2', 'F3', 'D4'], ['G2', 'D3', 'Bb3'], ['A2', 'E3', 'C#4']],    # tension
    4: [['Bb2', 'F3', 'D4'], ['F2', 'C3', 'A3'], ['C3', 'G3', 'E4'], ['D3', 'A3', 'F4']],      # resolve
}
def section(t):
    if t >= recap: return 4
    if t >= mod_start[3]: return 3
    if t >= mod_start[2]: return 2
    if t >= mod_start[1]: return 1
    return 0

BAR = 4.0                                  # 60 bpm, 4/4 → one chord per bar
end_music = DUR - 3.0
t = 0.0; bar = 0
while t < end_music:
    s = section(t); chord = PROGS[s][bar % 4]
    dur = min(BAR, end_music - t)
    for j, n in enumerate(chord):
        place(pad(hz(n), dur, attack=1.5 if bar else 3.0), t, 0.030, (-0.5, 0.5, 0.0)[j])
    place(pad(hz(chord[0]) / 2, dur, attack=2.0), t, 0.034)            # bass
    # piano motif: broken chord in eighths (0.5 s), sparser in module 1, busier in module 3
    up = [hz(n) * 2 for n in chord] + [hz(chord[1]) * 4]
    pattern = [0, 2, 1, 3, 2, 1, 3, 2] if s != 1 else [0, None, 2, None, 1, None, 3, None]
    if s == 3: pattern = [0, 2, 1, 3, 2, 3, 1, 2]
    for k, idx in enumerate(pattern):
        if idx is None or t + k * .5 >= end_music: continue
        vel = 0.9 if k == 0 else 0.55 + 0.15 * ((k * 7) % 3) / 2
        place(piano(up[idx], 3.0, vel), t + k * .5, 0.050, (-.35, .35)[k % 2])
    # heartbeat sub-pulse: from module 2 on, quickens in module 3
    if s >= 2 and s != 4:
        step = 1.0 if s == 2 else 0.5
        for q in np.arange(0, dur, step):
            place(thump(46), t + q, 0.16 if q % 1 == 0 else 0.09)
    t += BAR; bar += 1

# final chord + piano under the end card
place(pad(hz('D2'), 4.0, attack=0.8, release=3.0), end_music, 0.05)
for n in ('D3', 'A3', 'F4', 'A4'):
    place(pad(hz(n), 3.5, attack=0.6, release=3.0), end_music, 0.026)
place(piano(hz('D5'), 5.0, 1.0), end_music + .1, 0.07)

# ---------------------------------------------------------------- hits
for s in scenes:
    if s['id'].startswith('ch'):
        place(riser(2.4), s['start'] - 2.0, 0.05)
        place(thump(38, 2.2), s['start'] + 0.35, 0.55)
        place(shimmer(4.0), s['start'] + 0.35, 0.9, 0.1)
    elif s['start'] > 0:
        place(riser(1.1), s['start'] - 0.8, 0.018)                     # whoosh into each transition
place(thump(36, 2.6), sec('title')['start'] + .5, 0.6)
place(shimmer(4.0), sec('title')['start'] + .5, 1.0)

# ---------------------------------------------------------------- room + master
def reverb(sig, seed, secs=3.2):
    n = int(SR * secs)
    ir = np.random.default_rng(seed).standard_normal(n) * np.exp(-np.arange(n) / SR * 2.0)
    ir[: int(0.03 * SR)] *= np.linspace(0, 1, int(0.03 * SR))
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(sig) + n)))
    return np.fft.irfft(np.fft.rfft(sig, size) * np.fft.rfft(ir, size), size)[: len(sig)]

L, R = L + 0.45 * reverb(L, 1), R + 0.45 * reverb(R, 2)
tt = np.arange(N) / SR
fade = np.clip(tt / 1.5, 0, 1) * np.clip((DUR - tt) / 2.0, 0, 1)
mix = np.stack([L, R], 1) * fade[:, None]
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix *= 0.89 / np.max(np.abs(mix))

out = os.path.join(ROOT, 'bgm.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print(f'wrote {out}  ({DUR:.1f} s)')

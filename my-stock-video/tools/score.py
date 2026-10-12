"""Score for 《什么是股票》 → bgm.wav (48 kHz stereo, exactly 60 s).

Organ chord progression + a moving arpeggio ostinato (the forward pull),
a soft clock tick on every second (the "time" motif), and a low boom on
every scene cut. All cuts sit on whole seconds, so they land on a tick.

    python3 tools/score.py
"""
import os
import wave
import numpy as np

SR = 48000
DUR = 60.0
N = int(SR * DUR)
t = np.arange(N) / SR
rng = np.random.default_rng(1602)
L = np.zeros(N)
R = np.zeros(N)
CUTS = [3, 7, 12, 18, 25, 31, 39, 45, 51, 59]


def hz(note):
    names = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((names[n] + 12 * (o + 1) - 69) / 12)


def place(sig, start, gain=1.0, pan=0.0):
    i = int(start * SR)
    if i >= N:
        return
    seg = sig[: N - i]
    L[i:i + len(seg)] += seg * gain * np.sqrt((1 - pan) / 2)
    R[i:i + len(seg)] += seg * gain * np.sqrt((1 + pan) / 2)


def organ(f, dur, attack=0.6, release=1.2, bright=1.0):
    n = int((dur + release) * SR)
    x = np.arange(n) / SR
    tone = np.zeros(n)
    for k, a in ((1, 1.0), (2, 0.55 * bright), (3, 0.3 * bright), (4, 0.18 * bright), (6, 0.08 * bright)):
        tone += a * np.sin(2 * np.pi * f * k * x + k * 0.7)
    tone += 0.5 * np.sin(2 * np.pi * f * 1.003 * x)                  # slow beating = pipe chorus
    env = np.clip(x / attack, 0, 1) ** 1.5
    env *= np.where(x > dur, np.exp(-(x - dur) / (release / 3)), 1.0)
    return tone * env


def pluck(f, length=1.4):
    n = int(length * SR)
    x = np.arange(n) / SR
    tone = np.sin(2 * np.pi * f * x) + 0.35 * np.sin(2 * np.pi * 2 * f * x) * np.exp(-x * 6) + 0.12 * np.sin(2 * np.pi * 3.01 * f * x) * np.exp(-x * 9)
    return tone * (1 - np.exp(-x * 400)) * np.exp(-x * 3.2)


# ---------------------------------------------------------------- harmony
# (start, end, chord) — A minor world, darkening for the bubble, opening at the end
PROG = []
loop = [['A2', 'E3', 'A3', 'C4'], ['F2', 'C3', 'A3', 'C4'], ['C3', 'G3', 'C4', 'E4'], ['G2', 'D3', 'G3', 'B3']]
for i, s in enumerate(range(3, 31, 2)):                              # 3–31 s: Am F C G, 2 s each
    PROG.append((s, s + 2, loop[i % 4]))
bubble = [['D3', 'A3', 'D4', 'F4'], ['A2', 'E3', 'A3', 'C4'], ['E2', 'B2', 'E3', 'G#3'], ['A2', 'E3', 'A3', 'C4']]
for i, s in enumerate(range(31, 39, 2)):                             # 31–39 s: Dm Am E Am — tension
    PROG.append((s, s + 2, bubble[i]))
PROG.append((39, 45, ['F2', 'C3', 'A3', 'C4']))                       # 39–45 s: the scale settles — one long chord
rise = [['A2', 'E3', 'A3', 'C4'], ['F2', 'C3', 'A3', 'C4'], ['C3', 'G3', 'C4', 'E4']]
for i, s in enumerate(range(45, 51, 2)):                             # 45–51 s: the skyline climbs
    PROG.append((s, s + 2, rise[i]))
PROG.append((51, 55, ['F2', 'C3', 'A3', 'E4']))                       # 51–59 s: Fmaj7 → A (picardy) resolution
PROG.append((55, 59.5, ['A2', 'E3', 'A3', 'C#4']))

# opening swell under the title
for n in ['A1', 'E2', 'A2', 'E3']:
    place(organ(hz(n), 3.0, attack=1.6, release=0.8, bright=0.6), 0.0, 0.05)

for s, e, chord in PROG:
    for j, n in enumerate(chord):
        place(organ(hz(n), e - s, attack=0.35, release=0.9, bright=0.8), s, 0.045 if j else 0.06, (-0.35, 0.35, -0.15, 0.15)[j])
    place(organ(hz(chord[0]) / 2, e - s, attack=0.3, release=0.9, bright=0.4), s, 0.07)     # pedal

# ---------------------------------------------------------------- arpeggio ostinato (8ths at 4 per second)
def arp_notes(chord):
    up = [hz(n) * 2 for n in chord]
    return [up[0], up[1], up[2], up[3], up[2], up[1], up[2], up[3]]


for s, e, chord in PROG:
    if 39 <= s < 45:                       # the balance scene breathes without it
        continue
    notes = arp_notes(chord)
    step = 0.125 if 31 <= s < 39 else 0.25  # doubles up for the bubble
    k = 0
    for tt in np.arange(s, min(e, 58.0), step):
        lvl = 0.05 if s < 25 else 0.06
        if s >= 51:
            lvl *= max(0.0, 1 - (tt - 51) / 7)
        place(pluck(notes[k % len(notes)]), tt, lvl, 0.45 if k % 2 else -0.45)
        k += 1

# ---------------------------------------------------------------- clock tick (every second, last second silent)
for sec in range(1, 59):
    n = int(0.03 * SR)
    x = np.arange(n) / SR
    click = rng.standard_normal(n) * np.exp(-x * 260)
    click = np.convolve(click, np.ones(6) / 6, mode='same')           # soften the edge
    body = np.sin(2 * np.pi * (1800 if sec % 2 else 1500) * x) * np.exp(-x * 140)
    place(click * 0.5 + body * 0.6, sec, 0.06, 0.25 if sec % 2 else -0.25)

# ---------------------------------------------------------------- low boom on each cut
for c in CUTS:
    n = int(3.0 * SR)
    x = np.arange(n) / SR
    f = 30 + 26 * np.exp(-x * 5)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * (1 - np.exp(-x * 60)) * np.exp(-x * 1.4)
    rumble = np.convolve(rng.standard_normal(n), np.ones(400) / 400, mode='same') * np.exp(-x * 2.2) * 6
    place(boom + rumble, c, 0.32 if c != 59 else 0.2)

# ---------------------------------------------------------------- room + master
def reverb(sig, seed, secs=2.6):
    n = int(SR * secs)
    ir = np.random.default_rng(seed).standard_normal(n) * np.exp(-np.arange(n) / SR * 2.4)
    ir[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(sig) + n)))
    return np.fft.irfft(np.fft.rfft(sig, size) * np.fft.rfft(ir, size), size)[: len(sig)]


L, R = L + 0.35 * reverb(L, 1), R + 0.35 * reverb(R, 2)
fade = np.clip(t / 0.4, 0, 1) * np.clip((DUR - t) / 1.2, 0, 1)
mix = np.stack([L, R], 1) * fade[:, None]
mix = np.tanh(mix * 1.6) / np.tanh(1.6)
mix *= 0.89 / np.max(np.abs(mix))

out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'bgm.wav')
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('wrote', out)

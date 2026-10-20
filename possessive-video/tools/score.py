"""《占有欲》original score -> out/score.wav + events.json

Darksynth, 120 BPM, D minor (Dm - Bb - Gm - A, harmonic-minor dominant).
28 bars x 2 s = 56 s. Every visual hit in index.html reads events.json,
so picture and sound share one clock.

  bars  0-3   0-8 s   intro   : heartbeat, music box, filtered pad, riser
  bars  4-7   8-16 s  build   : four-on-floor, 16th bass opening up, stutter
  bars  8-15 16-32 s  drop A  : full kit, supersaw hook, gated snare
  bars 16-19 32-40 s  break   : choir + bell hook, heartbeat, roll, cut
  bars 20-25 40-52 s  drop B  : hook up an octave, arps, crashes, roll
  bars 26-27 52-56 s  outro   : impact, final chord, heartbeat, lock click

    pip install numpy scipy numba
    python3 tools/score.py
"""
import json
import os
import wave

import numpy as np
from numba import njit
from scipy.signal import fftconvolve

SR = 48000
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
S16 = BEAT / 4
DUR = 56.0
N = int(SR * DUR)
FPS = 60
rng = np.random.default_rng(520)
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)

NAMES = {'C': 0, 'C#': 1, 'D': 2, 'D#': 3, 'E': 4, 'F': 5, 'F#': 6, 'G': 7, 'G#': 8, 'A': 9, 'A#': 10, 'B': 11}


def hz(note):
    n, o = note[:-1], int(note[-1])
    return 440.0 * 2 ** ((NAMES[n] + 12 * (o + 1) - 69) / 12)


def bar_t(b, beat=0.0):
    return b * BAR + beat * BEAT


# ------------------------------------------------------------------ DSP kernels
@njit(cache=True)
def _saw_blep(freq, phase0):
    n = len(freq)
    out = np.empty(n)
    ph = phase0
    for i in range(n):
        dt = freq[i] / SR
        ph += dt
        if ph >= 1.0:
            ph -= 1.0
        v = 2.0 * ph - 1.0
        if ph < dt:
            x = ph / dt
            v -= x + x - x * x - 1.0
        elif ph > 1.0 - dt:
            x = (ph - 1.0) / dt
            v -= x * x + x + x + 1.0
        out[i] = v
    return out


@njit(cache=True)
def _svf(x, fc, q, mode):
    n = len(x)
    out = np.empty(n)
    ic1 = 0.0
    ic2 = 0.0
    k = 1.0 / q
    for i in range(n):
        f = min(fc[i], SR * 0.45)
        g = np.tan(np.pi * f / SR)
        a1 = 1.0 / (1.0 + g * (g + k))
        a2 = g * a1
        a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1
        ic2 = 2.0 * v2 - ic2
        if mode == 0:
            out[i] = v2
        elif mode == 1:
            out[i] = v1
        else:
            out[i] = x[i] - k * v1 - v2
    return out


@njit(cache=True)
def _duck(n, kicks, depth, rel):
    env = np.ones(n)
    for k in kicks:
        i0 = int(k * SR)
        for j in range(int(rel * 5 * SR)):
            i = i0 + j
            if i >= n:
                break
            x = j / SR
            a = min(x / 0.004, 1.0)
            v = 1.0 - depth * a * np.exp(-x / rel) if x > 0.004 else 1.0 - depth * a
            if v < env[i]:
                env[i] = v
    return env


def saw(freq, phase=None):
    freq = np.ascontiguousarray(np.broadcast_to(np.asarray(freq, float), (len(freq),)) if np.ndim(freq) else freq, dtype=float)
    return _saw_blep(freq, rng.random() if phase is None else phase)


def svf(x, fc, q=0.707, mode='lp'):
    fc = np.ascontiguousarray(np.broadcast_to(np.asarray(fc, float), x.shape), dtype=float)
    return _svf(np.ascontiguousarray(x, dtype=float), fc, q, {'lp': 0, 'bp': 1, 'hp': 2}[mode])


def adsr(n, a, d, s, r, gate):
    """gate in seconds; returns length-n envelope."""
    x = np.arange(n) / SR
    e = np.where(x < a, x / max(a, 1e-6), s + (1 - s) * np.exp(-(x - a) / max(d, 1e-6)))
    rel = x >= gate
    e_at = (gate / a) if gate < a else s + (1 - s) * np.exp(-(gate - a) / max(d, 1e-6))
    e[rel] = e_at * np.exp(-(x[rel] - gate) / max(r, 1e-6))
    return e


# ------------------------------------------------------------------ buses
class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, sig, start, gain=1.0, pan=0.0):
        i = int(round(start * SR))
        if i >= N or i + len(sig) <= 0:
            return
        if i < 0:
            sig = sig[-i:]
            i = 0
        seg = sig[: N - i]
        self.L[i:i + len(seg)] += seg * gain * np.sqrt((1 - pan) / 2) * 1.4142
        self.R[i:i + len(seg)] += seg * gain * np.sqrt((1 + pan) / 2) * 1.4142

    def add_st(self, l, r, start, gain=1.0):
        i = int(round(start * SR))
        seg = min(len(l), N - i)
        if seg <= 0:
            return
        self.L[i:i + seg] += l[:seg] * gain
        self.R[i:i + seg] += r[:seg] * gain

    def mul(self, env):
        self.L *= env
        self.R *= env

    def st(self):
        return np.stack([self.L, self.R])


drums, bass, music, lead, fx, verb_send, hall_send = (Bus() for _ in range(7))

# ------------------------------------------------------------------ harmony
LOOP = {
    'Dm': ['D3', 'F3', 'A3', 'D4', 'F4'],
    'Bb': ['D3', 'F3', 'A#3', 'D4', 'F4'],
    'Gm': ['D3', 'G3', 'A#3', 'D4', 'G4'],
    'A': ['C#3', 'E3', 'A3', 'C#4', 'E4'],
}
ROOTS = {'Dm': 'D1', 'Bb': 'A#0', 'Gm': 'G0', 'A': 'A0'}
ORDER = ['Dm', 'Bb', 'Gm', 'A']


def chord_of(b):
    if b >= 26:
        return 'Dm'
    if b in (24,):
        return 'Gm'
    if b in (25,):
        return 'A'
    return ORDER[b % 4]


SECTION = {}
for b in range(28):
    SECTION[b] = ('intro' if b < 4 else 'build' if b < 8 else 'dropA' if b < 16 else
                  'break' if b < 20 else 'dropB' if b < 26 else 'outro')
DROP = lambda b: SECTION[b] in ('dropA', 'dropB')

events = {'bpm': BPM, 'bar': BAR, 'kick': [], 'snare': [], 'hat': [], 'ohat': [], 'crash': [], 'impact': [],
          'heart': [], 'lead': [], 'bell': [], 'lock': [], 'glitch': [], 'riser': [], 'stutter': [], 'cut': []}

# ------------------------------------------------------------------ instruments
def kick(gain=1.0, at=0.0, hard=True):
    n = int(0.55 * SR)
    x = np.arange(n) / SR
    f = 46 + 170 * np.exp(-x / 0.035) + 40 * np.exp(-x / 0.004)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-x / 0.22) * (1 - np.exp(-x / 0.0008))
    click = svf(rng.standard_normal(n), 3500, 0.8, 'bp') * np.exp(-x / 0.004) * 0.6
    s = body + click
    if hard:
        s = np.tanh(s * 2.2) / np.tanh(2.2)
    drums.add(s, at, 0.62 * gain)
    events['kick'].append(round(at, 4))


def snare(gain=1.0, at=0.0, big=True, ev=True):
    n = int(0.45 * SR)
    x = np.arange(n) / SR
    tone = (np.sin(2 * np.pi * 185 * x) + 0.5 * np.sin(2 * np.pi * 330 * x)) * np.exp(-x / 0.05)
    nz = rng.standard_normal(n)
    nz = svf(nz, 5200, 0.6, 'bp') * 0.8 + svf(nz, 1800, 0.9, 'bp') * 0.6
    s = tone * 0.6 + nz * np.exp(-x / (0.13 if big else 0.06))
    s = np.tanh(s * 1.6)
    drums.add(s, at, 0.5 * gain)
    verb_send.add(s, at, (0.55 if big else 0.2) * gain)
    if ev:
        events['snare'].append(round(at, 4))


def clap(gain=1.0, at=0.0):
    n = int(0.35 * SR)
    x = np.arange(n) / SR
    nz = svf(rng.standard_normal(n), 1400, 1.2, 'bp')
    env = np.zeros(n)
    for o in (0, 0.009, 0.018, 0.026):
        m = x >= o
        env[m] += np.exp(-(x[m] - o) / (0.008 if o < 0.026 else 0.12))
    s = nz * env
    drums.add(s, at, 0.32 * gain, pan=0.1)
    verb_send.add(s, at, 0.35 * gain)


def hat(gain=1.0, at=0.0, open_=False, pan=0.25):
    n = int((0.35 if open_ else 0.06) * SR)
    x = np.arange(n) / SR
    nz = rng.standard_normal(n)
    metal = sum(np.sign(np.sin(2 * np.pi * f * x)) for f in (317, 421, 563, 709, 911, 1201)) / 6
    s = svf(nz * 0.7 + metal * 0.5, 8500, 0.7, 'hp')
    s *= np.exp(-x / (0.11 if open_ else 0.014)) * (1 - np.exp(-x / 0.0005))
    drums.add(s, at, (0.2 if open_ else 0.16) * gain, pan)
    (events['ohat'] if open_ else events['hat']).append(round(at, 4))


def crash(gain=1.0, at=0.0):
    n = int(2.6 * SR)
    x = np.arange(n) / SR
    nz = rng.standard_normal((2, n))
    s = [svf(c, 6000, 0.5, 'hp') * np.exp(-x / 0.75) * (1 - np.exp(-x / 0.002)) for c in nz]
    drums.add_st(s[0], s[1], at, 0.14 * gain)
    hall_send.add_st(s[0], s[1], at, 0.08 * gain)
    events['crash'].append(round(at, 4))


def impact(gain=1.0, at=0.0):
    n = int(3.5 * SR)
    x = np.arange(n) / SR
    f = 32 + 90 * np.exp(-x / 0.08)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.9)
    nz = svf(rng.standard_normal(n), 900 + 6000 * np.exp(-x / 0.05), 0.7, 'lp') * np.exp(-x / 0.35)
    s = np.tanh(boom * 1.8) * 0.9 + nz * 0.45
    fx.add(s, at, 0.85 * gain)
    hall_send.add(nz, at, 0.5 * gain)
    events['impact'].append(round(at, 4))


def heartbeat(at, gain=1.0):
    for o, g in ((0, 1.0), (0.24, 0.65)):
        n = int(0.5 * SR)
        x = np.arange(n) / SR
        f = 40 + 55 * np.exp(-x / 0.03)
        s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-x / 0.11) * (1 - np.exp(-x / 0.003))
        s += svf(rng.standard_normal(n), 220, 1.0, 'lp') * np.exp(-x / 0.03) * 0.6
        fx.add(np.tanh(s * 1.5), at + o, 0.75 * g * gain)
    events['heart'].append(round(at, 4))


def riser(start, dur, gain=1.0, ev=True):
    n = int(dur * SR)
    x = np.arange(n) / SR
    p = x / dur
    nz = rng.standard_normal((2, n))
    fc = 300 * (40 ** p)
    s = [svf(c, fc, 2.5, 'bp') for c in nz]
    env = p ** 2.2
    tone = saw(110 * (2 ** (p * 3.0))) * 0.15 + saw(110 * 1.01 * (2 ** (p * 3.0))) * 0.15
    tone = svf(tone, 400 + 6000 * p ** 2, 1.5)
    fx.add_st((s[0] * 0.5 + tone) * env, (s[1] * 0.5 + tone) * env, start, 0.35 * gain)
    hall_send.add_st(s[0] * env, s[1] * env, start, 0.15 * gain)
    if ev:
        events['riser'].append([round(start, 4), round(dur, 4)])


def downlifter(at, dur=2.0, gain=1.0):
    n = int(dur * SR)
    x = np.arange(n) / SR
    p = x / dur
    nz = rng.standard_normal(n)
    s = svf(nz, 9000 * (0.02 ** p), 2.0, 'bp') * (1 - p) ** 2
    fx.add(s, at, 0.35 * gain, -0.2)
    hall_send.add(s, at, 0.25 * gain)


def glitch_blip(at, gain=1.0, kind=0):
    n = int(0.12 * SR)
    x = np.arange(n) / SR
    if kind == 0:
        f = 2400 * np.exp(-x / 0.02) + 300
        s = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
    else:
        s = np.round(rng.standard_normal(n) * 2) / 2
        s = svf(s, 3000, 3.0, 'bp')
    s = np.round(s * 6) / 6 * np.exp(-x / 0.04)
    fx.add(s, at, 0.07 * gain, pan=rng.uniform(-0.7, 0.7))
    events['glitch'].append(round(at, 4))


def lock_click(at, gain=1.0):
    n = int(0.9 * SR)
    x = np.arange(n) / SR
    s = np.zeros(n)
    for o, g in ((0.0, 1.0), (0.045, 0.7)):
        m = x >= o
        xo = x[m] - o
        s[m] += g * (svf(rng.standard_normal(m.sum()), 4200, 4.0, 'bp')[: m.sum()] * np.exp(-xo / 0.006)
                     + sum(np.sin(2 * np.pi * f * xo) * np.exp(-xo / d) for f, d in ((2730, 0.08), (4110, 0.05), (6320, 0.03))) * 0.25)
    fx.add(s, at, 0.55 * gain, 0.05)
    hall_send.add(s, at, 0.4 * gain)
    events['lock'].append(round(at, 4))


def pad_note(f, dur, a=0.6, r=1.0, cutoff=1200.0, voices=3, detune=0.12):
    n = int((dur + r) * SR)
    sig = np.zeros(n)
    for v in range(voices):
        d = (v - (voices - 1) / 2) * detune
        sig += saw(np.full(n, f * 2 ** (d / 12)))
    sig /= voices
    cut = np.broadcast_to(cutoff, (n,)) if np.ndim(cutoff) == 0 else cutoff[:n]
    sig = svf(sig, cut, 0.9)
    return sig * adsr(n, a, 1.0, 0.85, r / 3, dur)


def choir_note(f, dur, a=0.8, r=1.2):
    n = int((dur + r) * SR)
    x = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.1 * x + rng.random() * 6)
    src = (saw(f * vib) + saw(f * 1.006 * vib)) * 0.5
    out = sum(svf(src, F, F / bw, 'bp') * g for F, bw, g in ((760, 90, 1.0), (1150, 110, 0.55), (2850, 160, 0.3), (3450, 220, 0.12)))
    return out * adsr(n, a, 1.5, 0.9, r / 3, dur)


def bell(f, at, gain=1.0, pan=0.0, length=2.4):
    n = int(length * SR)
    x = np.arange(n) / SR
    mod = np.sin(2 * np.pi * f * 3.5 * x) * 2.2 * np.exp(-x / 0.35)
    s = np.sin(2 * np.pi * f * x + mod) * np.exp(-x / 0.9) * (1 - np.exp(-x / 0.002))
    s += 0.25 * np.sin(2 * np.pi * f * 2.0 * x) * np.exp(-x / 0.3)
    music.add(s, at, 0.12 * gain, pan)
    hall_send.add(s, at, 0.18 * gain, pan)
    events['bell'].append([round(at, 4), f])


def lead_note(f, at, dur, gain=1.0, cutoff=5200.0, octave_dbl=False):
    rel = 0.18
    n = int((dur + rel) * SR)
    x = np.arange(n) / SR
    vib = 1 + 0.0045 * np.sin(2 * np.pi * 5.6 * x) * np.clip((x - 0.25) / 0.3, 0, 1)
    L = np.zeros(n)
    R = np.zeros(n)
    det = (-0.22, -0.14, -0.06, 0.0, 0.06, 0.14, 0.22)
    for i, d in enumerate(det):
        v = saw(f * 2 ** (d / 12) * vib)
        p = (i / (len(det) - 1)) * 2 - 1
        L += v * np.sqrt((1 - p) / 2)
        R += v * np.sqrt((1 + p) / 2)
    if octave_dbl:
        v = saw(f / 2 * vib)
        L += v * 0.6
        R += v * 0.6
    fc = cutoff * (0.55 + 0.45 * np.exp(-x / 0.25)) + 600
    env = adsr(n, 0.006, 0.4, 0.75, rel / 3, dur)
    L = svf(L / 4, fc, 1.1) * env
    R = svf(R / 4, fc, 1.1) * env
    lead.add_st(L, R, at, 0.55 * gain)
    events['lead'].append([round(at, 4), round(dur, 4), round(f, 2)])


def bass_bar(b, cutoff_from, cutoff_to, gain=1.0, pattern=None, accent=True):
    root = hz(ROOTS[chord_of(b)]) * 2  # octave 1
    pattern = pattern or [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, 0, 12, 0, 12]
    for s, semi in enumerate(pattern):
        if semi is None:
            continue
        at = bar_t(b) + s * S16
        dur = S16 * 0.82
        n = int((dur + 0.03) * SR)
        x = np.arange(n) / SR
        p = (at - bar_t(b)) / BAR
        cbase = cutoff_from + (cutoff_to - cutoff_from) * p
        f = root * 2 ** (semi / 12)
        osc = saw(np.full(n, f)) * 0.7 + saw(np.full(n, f * 1.004)) * 0.5
        osc += np.sin(2 * np.pi * f * x) * 0.45
        acc = 1.25 if (accent and s % 4 == 2) else 1.0
        fc = cbase * (0.5 + 1.8 * acc * np.exp(-x / 0.045))
        v = svf(osc, fc, 2.2) * adsr(n, 0.002, 0.08, 0.7, 0.008, dur)
        bass.add(np.tanh(v * 1.4), at, 0.22 * gain)


# ------------------------------------------------------------------ melody
HOOK = [(0, 1, 'D5'), (1, .5, 'A4'), (1.5, .5, 'D5'), (2, .5, 'E5'), (2.5, 1, 'F5'), (3.5, .5, 'E5'),
        (4, 1.5, 'D5'), (5.5, .5, 'C5'), (6, 1, 'D5'), (7, 1, 'F4'),
        (8, .5, 'G4'), (8.5, .5, 'A#4'), (9, 1, 'D5'), (10, 1, 'G5'), (11, .5, 'F5'), (11.5, .5, 'E5'),
        (12, 1.5, 'E5'), (13.5, .5, 'D5'), (14, 1.5, 'C#5'), (15.5, .5, 'A4')]
ANSWER = HOOK[:10] + [(8, .5, 'D5'), (8.5, .5, 'G5'), (9, 1, 'A#5'), (10, 1, 'A5'), (11, 1, 'G5'),
                      (12, 1.5, 'A5'), (13.5, .5, 'G5'), (14, 2, 'E5')]


def up(note, k=1):
    return note[:-1] + str(int(note[-1]) + k)


def play_phrase(phrase, bar0, octave=0, beats=(0, 16), **kw):
    for beat, d, nt in phrase:
        if beats[0] <= beat < beats[1]:
            lead_note(hz(up(nt, octave)), bar_t(bar0, beat), d * BEAT * 0.94, **kw)


# ------------------------------------------------------------------ arrangement
print('composing…')
# pads: whole song, cutoff per section
for b in range(28):
    sec = SECTION[b]
    ch = LOOP[chord_of(b)]
    dur = BAR if b < 26 else 4.0
    if b == 27:
        continue
    cut = {'intro': 500 + 160 * b, 'build': 900 + 250 * (b - 4), 'dropA': 2600, 'break': 1300,
           'dropB': 3200, 'outro': 2200}[sec]
    g = {'intro': 0.9, 'build': 0.9, 'dropA': 0.75, 'break': 1.0, 'dropB': 0.75, 'outro': 1.1}[sec]
    for j, nt in enumerate(ch):
        sig = pad_note(hz(nt), dur, a=0.25 if DROP(b) else 0.7, r=1.6 if b >= 26 else 0.7, cutoff=cut)
        music.add(sig, bar_t(b), 0.055 * g, (-0.6, 0.6, -0.3, 0.3, 0.0)[j])
        hall_send.add(sig, bar_t(b), 0.02 * g)
    if sec in ('break', 'dropB', 'outro'):
        for j, nt in enumerate(ch[1:4]):
            c = choir_note(hz(up(nt)), dur, r=1.6 if b >= 26 else 1.0)
            music.add(c, bar_t(b), 0.07 * (1.0 if sec == 'break' else 0.8), (-0.5, 0.5, 0.0)[j])
            hall_send.add(c, bar_t(b), 0.05)
    if sec in ('intro', 'break', 'outro'):  # sub drone
        n = int((dur + 0.5) * SR)
        x = np.arange(n) / SR
        sub = np.sin(2 * np.pi * hz(ROOTS[chord_of(b)]) * 2 * x) * adsr(n, 0.4, 1, 0.9, 0.2, dur)
        bass.add(sub, bar_t(b), 0.09)

# heartbeat: intro, break, outro
for b in range(0, 4):
    heartbeat(bar_t(b), 1.0)
for b in range(16, 19):
    heartbeat(bar_t(b), 0.8)
heartbeat(53.0, 0.9)
heartbeat(54.0, 0.7)

# music box in intro (skeleton of the hook)
INTRO_BELL = [(0, 'D6'), (1.5, 'A5'), (2.5, 'F5'), (4, 'D6'), (5.5, 'C6'), (6, 'A#5'),
              (8, 'G5'), (9, 'A#5'), (10, 'D6'), (12, 'C#6'), (13.5, 'E6'), (14, 'A5')]
for beat, nt in INTRO_BELL:
    bell(hz(nt), beat * BEAT, 0.9, pan=rng.uniform(-0.4, 0.4))
# break: full hook on bell, octave up
for beat, d, nt in HOOK:
    bell(hz(up(nt)), bar_t(16, beat), 1.0, pan=rng.uniform(-0.35, 0.35))
# outro: falling arpeggio
for i, nt in enumerate(['D6', 'A5', 'F5', 'D5', 'A4']):
    bell(hz(nt), 52.0 + 0.5 * i + 0.5, 1.0 - 0.12 * i, pan=(-0.3, 0.3)[i % 2], length=3.0)

# risers / fx
riser(4.0, 4.0, 0.8)
riser(12.0, 4.0, 1.0)
riser(36.0, 3.5, 1.1)
riser(48.0, 4.0, 1.0)
impact(1.0, 16.0)
impact(1.1, 40.0)
impact(1.25, 52.0)
downlifter(32.0, 2.5)
downlifter(52.0, 3.0, 1.2)
for t in (6.0, 7.5, 7.75, 11.75, 15.5, 23.75, 27.75, 31.5, 35.75, 39.5, 43.75, 47.5, 47.75, 51.75):
    glitch_blip(t, 1.0, int(t * 4) % 2)
lock_click(46.0, 1.0)
lock_click(55.0, 1.2)

# drums
for b in range(4, 26):
    sec = SECTION[b]
    if sec == 'break':
        continue
    for q in range(4):
        t0 = bar_t(b, q)
        last_beat_cut = (b == 15 and q == 3)
        if not last_beat_cut:
            kick(1.0 if sec != 'build' else 0.9, t0)
        if sec == 'build':
            hat(1.2 + 0.8 * (b - 4) / 3, t0 + BEAT / 2)
            if b >= 6:
                hat(0.5, t0 + BEAT / 4, pan=0.35)
                hat(0.5, t0 + 3 * BEAT / 4, pan=0.35)
        if DROP(b):
            if q in (1, 3):
                snare(1.0, t0)
                clap(1.0, t0)
            hat(0.9, t0 + BEAT / 2, open_=True, pan=-0.2)
            for s in (0, 1, 3):
                hat(0.55 + (0.25 if s == 1 else 0), t0 + s * S16, pan=0.3)
    if b in (8, 12, 20, 22, 24):
        crash(1.0, bar_t(b))

# fills
for s in range(4):   # build bar 7: snare 8ths then 16ths
    snare(0.45 + 0.1 * s, bar_t(7, s * 0.5), big=False)
for s in range(4):
    snare(0.75 + 0.06 * s, bar_t(7, 2 + s * 0.25), big=False)
for s in range(4):   # drop A end fill
    snare(0.8 + 0.08 * s, bar_t(15, 3 + s * 0.25), big=False)
for s in range(14):  # break roll 38.0 - 39.75
    snare(0.25 + 0.75 * (s / 13) ** 1.5, 38.0 + s * S16, big=False)
for s in range(8):   # drop B end roll
    snare(0.6 + 0.4 * s / 7, bar_t(25, 2 + s * 0.25), big=False)
events['cut'].append(39.5)

# bass
for b in range(4, 8):
    bass_bar(b, 260 + 300 * (b - 4), 560 + 400 * (b - 4), 0.85 + 0.05 * (b - 4))
for b in range(8, 16):
    pat = None if b != 15 else [0, 0, 12, 0, 0, 0, 12, 0, 0, 0, 12, 0, None, None, None, None]
    bass_bar(b, 1700, 1900, 1.0, pat)
for b in range(16, 20):  # break: half-time, dark
    bass_bar(b, 260, 320, 0.5, [0, None, None, None, None, None, 0, None, None, None, 12, None, None, None, None, None], accent=False)
for b in range(20, 26):
    bass_bar(b, 2100, 2400, 1.0)

# lead
play_phrase(HOOK, 8, 0, cutoff=4200)
play_phrase(ANSWER, 12, 0, cutoff=5000)
play_phrase(HOOK, 20, 1, cutoff=6200, octave_dbl=True, gain=0.85)
play_phrase(HOOK, 22, 1, beats=(0, 8), cutoff=6200, octave_dbl=True, gain=0.85)
play_phrase([(beat - 8, d, nt) for beat, d, nt in ANSWER if beat >= 8], 24, 1, cutoff=6800, octave_dbl=True, gain=0.85)
lead_note(hz('D6'), 52.0, 1.5, 0.8, cutoff=5000, octave_dbl=True)

# arp in drop B (16ths, ping-pong)
for b in range(20, 26):
    ch = LOOP[chord_of(b)]
    tones = [hz(up(n_)) for n_ in ch[1:5]]
    seq = tones + tones[::-1][1:-1]
    for s in range(16):
        f = seq[s % len(seq)] * (2 if s % 8 >= 4 else 1)
        n = int(0.16 * SR)
        x = np.arange(n) / SR
        v = np.sign(np.sin(2 * np.pi * f * x)) * 0.5 + saw(np.full(n, f * 1.003)) * 0.5
        v = svf(v, 1400 + 5000 * np.exp(-x / 0.03), 1.3) * np.exp(-x / 0.06) * (1 - np.exp(-x / 0.001))
        music.add(v, bar_t(b) + s * S16, 0.08, pan=(-0.55, 0.55)[s % 2])
        verb_send.add(v, bar_t(b) + s * S16, 0.05)

# ------------------------------------------------------------------ mix
print('mixing…')
kicks = np.array(sorted(events['kick']))
duck_hard = _duck(N, kicks, 0.82, 0.11)
duck_soft = _duck(N, kicks, 0.45, 0.16)
bass.mul(duck_hard)
music.mul(duck_soft)
lead.mul(_duck(N, kicks, 0.3, 0.12))

# lead: dotted-8th ping-pong delay
dl = int(0.75 * BEAT * SR)
LdL, LdR = np.zeros(N), np.zeros(N)
srcL, srcR = lead.L.copy(), lead.R.copy()
fb = 0.38
for k in range(1, 6):
    sh = dl * k
    g = 0.42 * fb ** (k - 1)
    tgtL, tgtR = (LdR, LdL) if k % 2 else (LdL, LdR)
    tgtL[sh:] += srcL[:-sh] * g
    tgtR[sh:] += srcR[:-sh] * g
LdL = svf(LdL, 3500, 0.7)
LdR = svf(LdR, 3500, 0.7)
lead.L += LdL
lead.R += LdR
hall_send.add_st(lead.L, lead.R, 0, 0.22)


def make_ir(seconds, damp, seed):
    r = np.random.default_rng(seed)
    n = int(seconds * SR)
    x = np.arange(n) / SR
    out = []
    for c in range(2):
        nz = r.standard_normal(n)
        lo = svf(nz, damp, 0.6)
        hi = nz - lo
        ir = (lo * np.exp(-x / (seconds / 6.9 * 1.0)) + hi * np.exp(-x / (seconds / 6.9 * 0.35)))
        ir *= np.clip(x / 0.012, 0, 1)
        ir[: int(0.018 * SR)] *= 0.3
        out.append(ir / np.sqrt(np.sum(ir ** 2)))
    return out


def reverb(bus, seconds, damp, seed, wet):
    ir = make_ir(seconds, damp, seed)
    l = fftconvolve(bus.L, ir[0])[:N]
    r = fftconvolve(bus.R, ir[1])[:N]
    return np.stack([l, r]) * wet


print('reverb…')
plate = reverb(verb_send, 1.6, 5000, 11, 0.9)
hall = reverb(hall_send, 3.8, 3500, 12, 1.0)

mix = drums.st() + bass.st() + music.st() + lead.st() * 0.85 + fx.st() + plate + hall

# stutter 15.5 - 16.0: retrigger 1/32 slices of the bar, rising
a, b_ = int(15.5 * SR), int(16.0 * SR)
sl = int(S16 / 2 * SR)
src = mix[:, a - sl * 2:a - sl].copy()
for i in range((b_ - a) // sl):
    seg = src * (0.6 + 0.4 * i / 8)
    ratio = 1 + i * 0.06
    idx = np.clip((np.arange(sl) * ratio).astype(int), 0, sl - 1)
    mix[:, a + i * sl:a + (i + 1) * sl] = seg[:, idx] * np.hanning(sl * 2)[sl // 2: sl // 2 + sl] ** 0.2
events['stutter'].append([15.5, 16.0])

# hard cut 39.5 - 40.0: only a reversed swell
a, b_ = int(39.5 * SR), int(40.0 * SR)
fade = np.linspace(1, 0, int(0.02 * SR))
mix[:, a:a + len(fade)] *= fade
mix[:, a + len(fade):b_] = 0
n = b_ - a
x = np.arange(n) / SR
sw = svf(rng.standard_normal(n), 400 + 8000 * (x / 0.5) ** 3, 1.5, 'bp') * (x / 0.5) ** 3
mix[0, a:b_] += sw * 0.3
mix[1, a:b_] += sw * 0.3

# master: dc/rumble cut, gentle glue, soft clip, fade, normalise
for c in range(2):
    mix[c] = svf(mix[c], 28, 0.7, 'hp')
env = np.abs(mix).max(0)
env = np.convolve(env, np.ones(480) / 480, mode='same')
gr = np.minimum(1, (0.55 / np.maximum(env, 1e-6)) ** 0.35)
mix *= gr
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
fo = int(1.2 * SR)
mix[:, -fo:] *= np.linspace(1, 0, fo) ** 1.5
mix[:, :int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
mix /= np.abs(mix).max() / 0.93

os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
pcm = (np.clip(mix.T, -1, 1) * 32767).astype('<i2')
with wave.open(os.path.join(ROOT, 'out', 'score.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

# ------------------------------------------------------------------ analysis for visuals
hop = SR // FPS
frames = N // hop


def env_of(sig, smooth=1):
    m = np.abs(sig[: frames * hop]).reshape(frames, hop)
    v = np.sqrt((m ** 2).mean(1))
    v = v / (v.max() + 1e-9)
    return [round(float(x), 3) for x in v]


mono = mix.mean(0)
low = svf(mono, 150, 0.7)
high = svf(mono, 5000, 0.7, 'hp')
events['env'] = {'rms': env_of(mono), 'low': env_of(low), 'high': env_of(high)}
events['duration'] = DUR
events['fps'] = FPS
for k in ('kick', 'snare', 'hat', 'ohat', 'crash', 'impact', 'heart', 'lock', 'glitch'):
    events[k] = sorted(set(events[k]))
with open(os.path.join(ROOT, 'events.json'), 'w') as f:
    json.dump(events, f, separators=(',', ':'))

peak_db = 20 * np.log10(np.abs(mix).max())
rms_db = 20 * np.log10(np.sqrt((mix ** 2).mean()))
print(f'wrote out/score.wav ({DUR}s)  peak {peak_db:.1f} dBFS  rms {rms_db:.1f} dBFS')

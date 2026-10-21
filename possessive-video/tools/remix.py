"""《占有欲》remix: the user's song, extended to 152 beats, with drums cut to the picture.

    python3 tools/remix.py music-in/src.wav
      -> out/remix.wav          the soundtrack (48 kHz stereo)
      -> timemap.json           output-time -> film-time map for render.mjs --timemap
      -> events.remix.json      events.json with env arrays re-measured from the remix

The song is 154 BPM and built from 16-beat phrases (verse A, verse A', chorus C,
each loop point scoring 0.95-1.0 beat-synchronous similarity), so it is rebuilt by
cutting only on phrase boundaries. The film (events.json, 120 BPM grid) is warped
onto the song: drops run one film beat per song beat, intro / break / outro run
half-time. Every drum hit is the original film event moved through the same warp,
so each cut still lands on a hit.
"""
import json
import os
import sys
import wave

import librosa
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, 'music-in', 'src.wav')

# ---------------------------------------------------------------- song grid
SR = 48000
y, _ = librosa.load(SRC, sr=SR, mono=False)
song = np.atleast_2d(y)
if song.shape[0] == 1:
    song = np.vstack([song, song])
mono = librosa.to_mono(song)
tempo, bt = librosa.beat.beat_track(y=mono, sr=SR, units='time', tightness=400)
k = np.arange(len(bt))
P, T0 = np.linalg.lstsq(np.vstack([k, np.ones_like(k)]).T, bt, rcond=None)[0]
on = librosa.onset.onset_strength(y=mono, sr=SR, hop_length=256)
ot = librosa.frames_to_time(np.arange(len(on)), sr=SR, hop_length=256)
best = max(((np.interp(T0 + dT + (P + dP) * np.arange(55), ot, on).sum(), P + dP, T0 + dT)
            for dP in np.linspace(-0.004, 0.004, 41) for dT in np.linspace(-0.04, 0.04, 81)))
_, P, T0 = best
print(f'song grid: {60 / P:.2f} BPM, first beat {T0:.3f}s')

# source phrases (beat indices into the song)
VERSE_A = list(range(7, 23))
VERSE_B = list(range(23, 39))     # ends on the pickup into the chorus
CHORUS = list(range(39, 55))
ARR = (VERSE_A + VERSE_A          # intro    32 beats (film 0-8 s, half-time)
       + VERSE_B                  # build    16       (film 8-16)
       + CHORUS + CHORUS          # drop A   32       (film 16-32)
       + VERSE_A + VERSE_B        # break    32       (film 32-40, half-time)
       + CHORUS + CHORUS[:8]      # drop B   24       (film 40-52)
       + VERSE_A)                 # outro    16       (film 52-56, half-time)
assert len(ARR) == 152
DUR = len(ARR) * P

# film time <-> output time (piecewise linear on section boundaries)
FILM_KNOTS = [0, 8, 16, 32, 40, 52, 56]
OUT_KNOTS = [b * P for b in (0, 32, 48, 80, 112, 136, 152)]
to_out = lambda tv: float(np.interp(tv, FILM_KNOTS, OUT_KNOTS))
to_film = lambda to: float(np.interp(to, OUT_KNOTS, FILM_KNOTS))

# ---------------------------------------------------------------- drum + fx synths
# reuse the instrument code from score.py (everything above its pad section), sized to this length
src = open(os.path.join(HERE, 'score.py'), encoding='utf-8').read()
prefix = src[: src.index('def pad_note')].replace('DUR = 56.0', f'DUR = {DUR!r}')
verb = src[src.index('def make_ir'): src.index("print('reverb")]
synth = {'__name__': 'score_synth', '__file__': os.path.join(HERE, 'score.py')}
exec(compile(prefix + '\n' + verb, os.path.join(HERE, 'score.py'), 'exec'), synth)
N = synth['N']
drums, fx, verb_send, hall_send = synth['drums'], synth['fx'], synth['verb_send'], synth['hall_send']

film = json.load(open(os.path.join(ROOT, 'events.json')))
S = synth
for t in film['kick']:
    S['kick'](0.72, to_out(t))
for t in film['snare']:
    big = 16 <= t < 32 or 40 <= t < 52
    late = 38 <= t < 39.6 or 51 <= t < 52 or 14 <= t < 16 or 31.5 <= t < 32
    S['snare'](0.55 if late else 0.8, to_out(t), big=big and not late)
    if big and not late:
        S['clap'](0.9, to_out(t))
for t in film['hat']:
    S['hat'](0.5, to_out(t))
for t in film['ohat']:
    S['hat'](0.5, to_out(t), open_=True, pan=-0.2)
for t in film['crash']:
    S['crash'](1.0, to_out(t))
for t, g in zip(film['impact'], (1.0, 1.1, 1.25)):
    S['impact'](g, to_out(t))
for t in film['heart']:
    S['heartbeat'](to_out(t), 0.75)
for t in film['lock']:
    S['lock_click'](to_out(t), 1.1)
for t in film['glitch']:
    S['glitch_blip'](to_out(t), 0.9, int(t * 4) % 2)
for st, d in film['riser']:
    a, b = to_out(st), to_out(st + d)
    S['riser'](a, b - a, 0.55 if st < 8 else 0.9)
S['downlifter'](to_out(32.0), 2.5)
S['downlifter'](to_out(52.0), 3.0, 1.2)

# ---------------------------------------------------------------- song bed
bed = np.zeros((2, N))
fade = int(0.012 * SR)
pos = 0
for i, b in enumerate(ARR):
    a0 = int(round((T0 + b * P) * SR))
    jump = i > 0 and ARR[i - 1] + 1 != b
    if i == 0 or jump:
        # copy the whole contiguous run, with an equal-power crossfade at the seam
        run = 1
        while i + run < len(ARR) and ARR[i + run] == ARR[i + run - 1] + 1:
            run += 1
        o0 = int(round(i * P * SR))
        o1 = int(round((i + run) * P * SR))
        seg = song[:, a0 - fade: a0 + (o1 - o0) + fade]
        if seg.shape[1] < (o1 - o0) + 2 * fade:
            seg = np.pad(seg, ((0, 0), (0, (o1 - o0) + 2 * fade - seg.shape[1])))
        w = np.ones(seg.shape[1])
        ramp = np.sin(np.linspace(0, np.pi / 2, 2 * fade)) ** 2
        w[: 2 * fade] = ramp
        w[-2 * fade:] = ramp[::-1]
        s0 = o0 - fade
        lo = max(0, s0)
        hi = min(N, s0 + seg.shape[1])
        bed[:, lo:hi] += (seg * w)[:, lo - s0: hi - s0]
bed[:, : int(0.5 * SR)] *= np.linspace(0, 1, int(0.5 * SR)) ** 2

# level: bed to a fixed RMS, ducked under the added kicks
bed *= 0.16 / (np.sqrt((bed ** 2).mean()) + 1e-9)
kicks = np.array(sorted(to_out(t) for t in film['kick']))
bed *= synth['_duck'](N, kicks, 0.35, 0.1)

# section shaping: intro opens up, outro fades, the cut before drop B is silent
tt = np.arange(N) / SR
intro_lp = np.clip(tt / OUT_KNOTS[1], 0, 1)
bed[:, tt < OUT_KNOTS[1]] *= (0.55 + 0.45 * intro_lp[tt < OUT_KNOTS[1]])
o_cut0, o_cut1 = to_out(39.5), to_out(40.0)
m = (tt >= o_cut0) & (tt < o_cut1)
bed[:, m] = 0
out_fade0 = OUT_KNOTS[-1] - 2.6
m = tt >= out_fade0
bed[:, m] *= np.clip(1 - (tt[m] - out_fade0) / 2.6, 0, 1) ** 1.6

plate = synth['reverb'](verb_send, 1.6, 5000, 11, 0.9)
hall = synth['reverb'](hall_send, 3.8, 3500, 12, 1.0)
mix = bed + drums.st() + fx.st() + plate + hall

# stutter on the last half beat of the build (1/8-beat slices)
a, b_ = int(to_out(15.5) * SR), int(to_out(16.0) * SR)
sl = int(P / 8 * SR)
src_sl = mix[:, a - sl: a].copy()
for i in range((b_ - a) // sl + 1):
    s0 = a + i * sl
    s1 = min(b_, s0 + sl)
    if s1 <= s0:
        break
    ratio = 1 + i * 0.06
    idx = np.clip((np.arange(s1 - s0) * ratio).astype(int), 0, sl - 1)
    mix[:, s0:s1] = src_sl[:, idx] * (0.6 + 0.4 * i / 8)

# the hard cut: silence, then a reversed swell into drop B
a, b_ = int(o_cut0 * SR), int(o_cut1 * SR)
mix[:, a:b_] *= 0
n = b_ - a
x = np.arange(n) / SR
sw = synth['svf'](np.random.default_rng(3).standard_normal(n), 400 + 8000 * (x / (n / SR)) ** 3, 1.5, 'bp') * (x / (n / SR)) ** 3
mix[:, a:b_] += sw * 0.3

# master
for c in range(2):
    mix[c] = synth['svf'](mix[c], 28, 0.7, 'hp')
env = np.convolve(np.abs(mix).max(0), np.ones(480) / 480, mode='same')
mix *= np.minimum(1, (0.55 / np.maximum(env, 1e-6)) ** 0.35)
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
mix[:, -int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))
mix /= np.abs(mix).max() / 0.93

os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
with wave.open(os.path.join(ROOT, 'out', 'remix.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.clip(mix.T, -1, 1) * 32767).astype('<i2').tobytes())

# ---------------------------------------------------------------- picture maps
FPS = 60
frames = int(round(DUR * FPS))
tmap = [round(to_film(i / FPS), 6) for i in range(frames)]
json.dump({'fps': FPS, 'duration': DUR, 'bpm': 60 / P, 'film': tmap}, open(os.path.join(ROOT, 'timemap.json'), 'w'))

# env arrays in film time, measured from the remix
m_mono = mix.mean(0)
low = synth['svf'](m_mono, 150, 0.7)
high = synth['svf'](m_mono, 5000, 0.7, 'hp')
hop = SR // FPS


def env_film(sig):
    nfr = len(sig) // hop
    r = np.sqrt((sig[: nfr * hop].reshape(nfr, hop) ** 2).mean(1))
    r /= r.max() + 1e-9
    ft = np.arange(56 * FPS) / FPS
    return [round(float(r[min(nfr - 1, int(to_out(t) * FPS))]), 3) for t in ft]


ev = dict(film)
ev['env'] = {'rms': env_film(m_mono), 'low': env_film(low), 'high': env_film(high)}
json.dump(ev, open(os.path.join(ROOT, 'events.remix.json'), 'w'), separators=(',', ':'))
print(f'wrote out/remix.wav ({DUR:.2f}s, {len(ARR)} beats), timemap.json ({frames} frames), events.remix.json')

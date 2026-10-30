"""Soundtrack for 《华尔街投机之王利弗莫尔》 → bgm.wav (48 kHz stereo), timed from timeline.json.

The music is the track supplied with the brief (assets/music.m4a, ≈ 57.9 s of audio). The film's cuts
were placed on its sections: loud intro 0–11.3 s · breakdown 11.3–29.2 s · build 29.2–39.5 s · drop 39.5–56 s.
On top of it, synthesised here (no third-party samples):
  · a soft whoosh centred on every scene transition
  · riser → low hit → shimmer on each chapter card
  · a low hit + long shimmer pad under the logo page, carrying the film past the end of the track

    python3 tools/music.py        (run `node render.mjs --timeline` first)
"""
import json, os, subprocess, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
tl = json.load(open(os.path.join(ROOT, 'timeline.json')))
T, scenes, TR = tl['seconds'], tl['scenes'], 1.1
N = int(round(T * SR))

src = os.path.join(ROOT, 'music_src.wav')
if not os.path.exists(src):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(ROOT, 'assets', 'music.m4a'), '-ac', '2', '-ar', str(SR), src], check=True)
w = wave.open(src)
a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32) / 32768
END = 57.68                                                   # the track's last note; after it the file is silence
a = a[:int(END * SR)]
a[-int(.25 * SR):] *= np.linspace(1, 0, int(.25 * SR))[:, None]   # no click at the cut
a = np.pad(a, ((0, max(0, N - len(a))), (0, 0)))[:N] * .9

R = np.random.default_rng(11)
def place(sig, t0, gain, pan=0.0):
    s0 = int(t0 * SR); n = max(0, min(len(sig), N - s0))
    if n <= 0 or s0 < 0: return
    a[s0:s0 + n, 0] += sig[:n] * gain * np.sqrt((1 - pan) / 2) * 1.41
    a[s0:s0 + n, 1] += np.roll(sig, 24)[:n] * gain * np.sqrt((1 + pan) / 2) * 1.41

def lp(x, k): return np.convolve(x, np.ones(k) / k, 'same')
def whoosh(d=1.1):
    L = int(d * SR); t = np.arange(L) / SR; env = np.sin(np.pi * t / d) ** 2
    return lp(R.standard_normal(L), 24) * 5 * env
def riser(d=1.0):
    L = int(d * SR); t = np.arange(L) / SR; f = 180 * 2 ** (t / d * 2.2)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .35 + lp(R.standard_normal(L), 8) * 1.2) * (t / d) ** 2
def hit(d=1.6):
    L = int(d * SR); t = np.arange(L) / SR
    return np.sin(2 * np.pi * 46 * t * (1 - t * .25)) * np.exp(-t * 4.5) + (R.standard_normal(L) - lp(R.standard_normal(L), 6)) * np.exp(-t * 35) * .35
def shimmer(d=2.4, base=587.33):                              # D5 — sits on the track's D-minor colour
    L = int(d * SR); t = np.arange(L) / SR; out = np.zeros(L)
    for k, f in enumerate((base, base * 1.5, base * 2, base * 3)):
        out += np.sin(2 * np.pi * f * t + k) * np.exp(-t * (1.6 + k * .5)) / (k + 1)
    return out * np.minimum(1, t / .01)
def pad(d, notes=(73.42, 110.0, 146.83, 174.61, 220.0)):      # D minor: D2 A2 D3 F3 A3
    L = int(d * SR); t = np.arange(L) / SR; out = np.zeros(L)
    for f in notes:
        for det in (-.004, .004):
            out += np.sin(2 * np.pi * f * (1 + det) * t) + .3 * np.sin(4 * np.pi * f * (1 + det) * t)
    return out / len(notes) / 2 * np.minimum(1, t / .4) * np.minimum(1, (d - t) / 1.6)

for s in scenes[1:]:                                          # every transition (centred on the boundary)
    place(whoosh(), s['start'] - TR / 2, .10, pan=.3)
for s in scenes:
    if s['id'].startswith('ch'):                              # chapter cards
        place(riser(), s['start'] - 1.0, .07)
        place(hit(), s['start'], .55)
        place(shimmer(), s['start'] + .5, .05, pan=-.2)
end = next(s for s in scenes if s['id'] == 'end')
place(hit(2.2), end['start'] + .2, .6)
place(shimmer(3.5), end['start'] + .6, .1)
tail0 = END - 1.2
place(pad(T - tail0 + .2), tail0, .34)                        # carries the logo page after the track ends

a[-int(1.4 * SR):] *= np.linspace(1, 0, int(1.4 * SR))[:, None] ** 1.5   # follows the picture's fade-out
peak = np.abs(a).max()
if peak > .98: a *= .98 / peak
out = wave.open(os.path.join(ROOT, 'bgm.wav'), 'wb'); out.setnchannels(2); out.setsampwidth(2); out.setframerate(SR)
out.writeframes((a * 32767).astype(np.int16).tobytes()); out.close()
print(f'bgm.wav {T:.1f} s · supplied track (ends {END} s) + transitions/chapter hits/end pad')

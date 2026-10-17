"""Soundtrack for this film: the channel's own uploaded track (music_src.wav), cut to the film length
with a soft tail fade, plus a synthesized heartbeat on the opening and a thunder crack on the lightning title.

    python3 tools/music.py     → bgm.wav (48 kHz stereo)
"""
import json, os, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tl = json.load(open(os.path.join(ROOT, 'timeline.json')))
SR, T = 48000, tl['seconds']
w = wave.open(os.path.join(ROOT, 'music_src.wav')); assert w.getframerate() == SR
a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32) / 32768
n = int(round(T * SR)); a = a[:n] if len(a) >= n else np.pad(a, ((0, n - len(a)), (0, 0)))
fade = int(3.0 * SR); a[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5

# alarm siren on the opening slam + a thunder crack on the lightning title (both synthesized, deterministic)
R = np.random.default_rng(7)
def place(fx, t0, gain):
    s0 = int(t0 * SR); n_ = min(len(fx), len(a) - s0)
    a[s0:s0 + n_, 0] += fx[:n_] * gain; a[s0:s0 + n_, 1] += np.roll(fx, 30)[:n_] * gain
    seg = a[s0:s0 + n_]; a[s0:s0 + n_] = np.where(np.abs(seg) > .8, np.sign(seg) * (.8 + .18 * np.tanh((np.abs(seg) - .8) / .18)), seg)
for tb in [.3, 1.15, 1.95, 2.7, 3.4, 4.05, 4.65, 5.2]:                               # heartbeat: lub-dub, speeding up
    Lh = int(.5 * SR); th = np.arange(Lh) / SR
    lub = np.sin(2 * np.pi * 52 * th) * np.exp(-th * 22) + np.sin(2 * np.pi * 47 * (th - .17)) * np.exp(-np.maximum(0, th - .17) * 26) * (th > .17) * .75
    place(lub, tb, 0.85)
L2 = int(2.2 * SR); t2 = np.arange(L2) / SR; nz = R.standard_normal(L2)
crack = (nz - np.convolve(nz, np.ones(5) / 5, 'same')) * np.exp(-t2 * 16) * .9
rumble = np.convolve(R.standard_normal(L2), np.ones(400) / 400, 'same') * 18 * np.exp(-t2 * 2.2)
place(crack + rumble, 16.85, 0.38)
peak = np.abs(a).max()
out = wave.open(os.path.join(ROOT, 'bgm.wav'), 'wb'); out.setnchannels(2); out.setsampwidth(2); out.setframerate(SR)
out.writeframes((a * 32767).astype(np.int16).tobytes()); out.close()
print(f'bgm.wav {T:.1f} s (music + heartbeat + thunder), peak {peak:.2f}')

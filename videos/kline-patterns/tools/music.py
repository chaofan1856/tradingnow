"""Soundtrack for this film: the channel's own uploaded track (music_src.wav), cut to the film length
with a soft tail fade, plus one synthesized glass-shatter hit on the opening slam.

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

# glass shatter: bright noise burst + ringing shards, deterministic
R = np.random.default_rng(7); t0 = 0.35; L = int(1.6 * SR); t = np.arange(L) / SR
noise = R.standard_normal(L)
hp = noise - np.convolve(noise, np.ones(6) / 6, 'same')                       # crude high-pass: glassy hiss
crack = hp * np.exp(-t * 9) * 0.9
shards = sum(np.sin(2 * np.pi * f * t + R.uniform(0, 6)) * np.exp(-(t - d) * 14) * (t > d) * R.uniform(.15, .35)
             for f, d in zip(R.uniform(2400, 7800, 26), R.uniform(0, .5, 26)))
thump = np.sin(2 * np.pi * 70 * t) * np.exp(-t * 18) * 0.8
fx = (crack + shards + thump) * 0.32
s = int(t0 * SR); a[s:s + L, 0] += fx[:len(a) - s]; a[s:s + L, 1] += np.roll(fx, 40)[:len(a) - s]
peak = np.abs(a).max()
seg = a[s:s + L]; a[s:s + L] = np.where(np.abs(seg) > .8, np.sign(seg) * (.8 + .18 * np.tanh((np.abs(seg) - .8) / .18)), seg)   # soft-limit only the hit; the music keeps its level
out = wave.open(os.path.join(ROOT, 'bgm.wav'), 'wb'); out.setnchannels(2); out.setsampwidth(2); out.setframerate(SR)
out.writeframes((a * 32767).astype(np.int16).tobytes()); out.close()
print(f'bgm.wav {T:.1f} s (music + shatter), peak {peak:.2f}')

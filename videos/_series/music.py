"""Soundtrack for a 《K线形态深度课》 episode.

The channel's own track (videos/_series/assets/channel_music.m4a) cut to the film length with a soft
tail fade, plus synthesized one-shot effects listed in the episode's sfx.json, e.g.

    [{"type": "heartbeat", "t": [0.3, 1.15, 1.95, 2.7, 3.4, 4.05, 4.65, 5.2]},
     {"type": "thunder",   "t": 16.85}]

types: shatter (glass) · siren (alarm) · heartbeat (lub-dub) · thunder (crack + rumble) · impact (low hit) · whoosh

    python3 tools/music.py     → bgm.wav (48 kHz stereo)
"""
import json, os, subprocess, wave
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
tl = json.load(open(os.path.join(ROOT, 'timeline.json'))); T = tl['seconds']

src = os.path.join(ROOT, 'music_src.wav')
if not os.path.exists(src):                                           # decode the channel track once
    m4a = os.path.join(ROOT, '..', '_series', 'assets', 'channel_music.m4a')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', m4a, '-ac', '2', '-ar', str(SR), src], check=True)
w = wave.open(src); assert w.getframerate() == SR
a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32) / 32768
n = int(round(T * SR)); a = a[:n] if len(a) >= n else np.pad(a, ((0, n - len(a)), (0, 0)))
fade = int(3.0 * SR); a[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5

R = np.random.default_rng(7)
def place(fx, t0, gain):                                              # mix in, soft-limit only where the effect lands
    s0 = int(t0 * SR); n_ = max(0, min(len(fx), len(a) - s0))
    a[s0:s0 + n_, 0] += fx[:n_] * gain; a[s0:s0 + n_, 1] += np.roll(fx, 30)[:n_] * gain
    seg = a[s0:s0 + n_]; a[s0:s0 + n_] = np.where(np.abs(seg) > .8, np.sign(seg) * (.8 + .18 * np.tanh((np.abs(seg) - .8) / .18)), seg)

def hp(x): return x - np.convolve(x, np.ones(6) / 6, 'same')
def fx_shatter():
    L = int(1.6 * SR); t = np.arange(L) / SR
    sh = sum(np.sin(2 * np.pi * f * t + R.uniform(0, 6)) * np.exp(-(t - d) * 14) * (t > d) * R.uniform(.15, .35) for f, d in zip(R.uniform(2400, 7800, 26), R.uniform(0, .5, 26)))
    return (hp(R.standard_normal(L)) * np.exp(-t * 9) * .9 + sh + np.sin(2 * np.pi * 70 * t) * np.exp(-t * 18) * .8), .32
def fx_siren():
    L = int(2.6 * SR); t = np.arange(L) / SR; f = 760 + 380 * (.5 + .5 * np.sin(2 * np.pi * 1.5 * t - np.pi / 2)); ph = 2 * np.cumsum(np.pi * f / SR)
    return (np.sin(ph) * .6 + np.sign(np.sin(ph)) * .15) * np.minimum(1, t / .05) * np.exp(-np.maximum(0, t - 1.8) * 4) + np.sin(2 * np.pi * 60 * t) * np.exp(-t * 14) * .9, .30
def fx_heartbeat():
    L = int(.5 * SR); t = np.arange(L) / SR
    return np.sin(2 * np.pi * 52 * t) * np.exp(-t * 22) + np.sin(2 * np.pi * 47 * (t - .17)) * np.exp(-np.maximum(0, t - .17) * 26) * (t > .17) * .75, .85
def fx_thunder():
    L = int(2.2 * SR); t = np.arange(L) / SR
    return hp(R.standard_normal(L)) * np.exp(-t * 16) * .9 + np.convolve(R.standard_normal(L), np.ones(400) / 400, 'same') * 18 * np.exp(-t * 2.2), .38
def fx_impact():
    L = int(1.2 * SR); t = np.arange(L) / SR
    return np.sin(2 * np.pi * 48 * t * (1 - t * .3)) * np.exp(-t * 6) + hp(R.standard_normal(L)) * np.exp(-t * 30) * .3, .6
def fx_whoosh():
    L = int(1.0 * SR); t = np.arange(L) / SR; env = np.sin(np.pi * t / 1.0) ** 2
    return np.convolve(R.standard_normal(L), np.ones(30) / 30, 'same') * 6 * env, .25
FX = dict(shatter=fx_shatter, siren=fx_siren, heartbeat=fx_heartbeat, thunder=fx_thunder, impact=fx_impact, whoosh=fx_whoosh)

sfx_path = os.path.join(ROOT, 'sfx.json')
for e in (json.load(open(sfx_path)) if os.path.exists(sfx_path) else []):
    for t0 in (e['t'] if isinstance(e['t'], list) else [e['t']]):
        sig, g = FX[e['type']](); place(sig, t0, g * e.get('gain', 1))

out = wave.open(os.path.join(ROOT, 'bgm.wav'), 'wb'); out.setnchannels(2); out.setsampwidth(2); out.setframerate(SR)
out.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); out.close()
print(f'bgm.wav {T:.1f} s · channel track + {sum(1 for _ in (json.load(open(sfx_path)) if os.path.exists(sfx_path) else []))} sfx group(s)')

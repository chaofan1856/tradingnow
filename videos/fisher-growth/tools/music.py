"""Soundtrack for 《成长股教父菲利普费舍》 → bgm.wav (48 kHz stereo), timed from timeline.json.

Only the track supplied with the brief (assets/music.m4a, ≈ 57.7 s of audio), unchanged from start to
end — no added effects. The film is paced to end with it (logo page under its last bars); a short
fade only follows the picture's fade-out.

    python3 tools/music.py        (run `node render.mjs --timeline` first)
"""
import json, os, subprocess, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
T = json.load(open(os.path.join(ROOT, 'timeline.json')))['seconds']
N = int(round(T * SR))

src = os.path.join(ROOT, 'music_src.wav')
if not os.path.exists(src):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', os.path.join(ROOT, 'assets', 'music.m4a'), '-ac', '2', '-ar', str(SR), src], check=True)
w = wave.open(src)
a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32) / 32768
END = 57.68                                                   # the track's last note; after it the file is silence
a = np.pad(a[:int(END * SR)], ((0, max(0, N - int(END * SR))), (0, 0)))[:N]
f0 = int((min(END, T) - .9) * SR)                             # fade the last bar out with the picture
a[f0:int(min(END, T) * SR)] *= np.linspace(1, 0, int(min(END, T) * SR) - f0)[:, None] ** 1.5
a[int(min(END, T) * SR):] = 0
out = wave.open(os.path.join(ROOT, 'bgm.wav'), 'wb'); out.setnchannels(2); out.setsampwidth(2); out.setframerate(SR)
out.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); out.close()
print(f'bgm.wav {T:.1f} s · supplied track only (ends {END} s)')

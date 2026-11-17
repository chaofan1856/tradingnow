"""The soundtrack: only the narration, each sentence placed on its subtitle beat → bgm.wav (48 kHz stereo).

    python3 tools/mix.py        (after tools/narr.py and `node render.mjs --timeline`)

No music, no effects. Sentence k of a scene starts at scene.start + pre + (durations of the lines before it).
"""
import json, os, subprocess, sys, wave
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voice
ROOT = voice.ROOT; V = voice.V; SR = 48000; PRE = .5
TL = json.load(open(os.path.join(ROOT, 'timeline.json'))); T = TL['seconds']
start = {s['id']: s['start'] for s in TL['scenes']}
timing = json.load(open(os.path.join(V, 'timing.json')))
N = json.load(open(os.path.join(ROOT, 'src', 'narration.json'), encoding='utf-8'))
out = np.zeros(int(round(T * SR)) + SR, dtype=np.float32); peak = 0
for sid, sents in N.items():
    t = start[sid] + PRE; li = 0
    for k, s in enumerate(sents):
        raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', os.path.join(V, f't_{sid}_{k}.wav'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
        a = np.frombuffer(raw, dtype=np.float32); a = a / max(1e-6, np.sqrt(np.mean(a * a))) * .09          # even loudness sentence to sentence
        i = int(round(t * SR)); out[i:i + len(a)] += a; peak = max(peak, float(np.abs(a).max()))
        t += sum(timing[sid][li:li + len(s)]); li += len(s)
out = np.tanh(out[:int(round(T * SR))] * 1.6) * .93                                                         # gentle limiter
w = wave.open(os.path.join(ROOT, 'bgm.wav'), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((np.repeat(out[:, None], 2, 1) * 32767).astype(np.int16).tobytes()); w.close()
print(f'bgm.wav {T:.1f} s · narration only')

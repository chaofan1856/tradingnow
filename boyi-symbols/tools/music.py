"""Extend the reference track to the film's length without changing a note.

    python3 tools/music.py REFERENCE.mp4

The score repeats a 56-beat phrase (~29.76 s) and has a 32-beat sub-phrase
(~17.01 s); the self-similarity of beat-synchronous chroma/MFCC around those
beats is > 0.9, so jumping back by one phrase on a beat is inaudible. A short
equal-power crossfade sits just before each beat's attack.
Writes build/music.wav (48 kHz stereo) and build/music.json {"length": s}.
"""
import json, os, subprocess, sys
import numpy as np, soundfile as sf, librosa

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.path.join(ROOT, 'build'); os.makedirs(BUILD, exist_ok=True)
SR = 48000

src = os.path.join(BUILD, 'ref_audio.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', sys.argv[1], '-vn', '-ac', '2', '-ar', str(SR), src], check=True)
y, _ = sf.read(src, dtype='float32')

mono = librosa.resample(y.mean(1), orig_sr=SR, target_sr=22050)
_, beats = librosa.beat.beat_track(y=mono, sr=22050, hop_length=256, start_bpm=112, tightness=400)
bt = librosa.frames_to_time(beats, sr=22050, hop_length=256)

# (play until beat j, then continue from beat i)
LONG, SHORT = (118, 62), (76, 44)
JUMPS = [SHORT, LONG, LONG, SHORT, LONG, LONG, LONG, LONG]

XF = int(0.06 * SR)         # crossfade length
PRE = int(0.025 * SR)       # cut slightly before the attack
fade_in = np.sin(np.linspace(0, np.pi / 2, XF))[:, None].astype(np.float32)
fade_out = np.cos(np.linspace(0, np.pi / 2, XF))[:, None].astype(np.float32)

out, pos = [], 0
for j, i in JUMPS:
    a, b = int(bt[j] * SR) - PRE, int(bt[i] * SR) - PRE
    out.append(y[pos:a])
    out.append(y[a:a + XF] * fade_out + y[b:b + XF] * fade_in)
    pos = b + XF
out.append(y[pos:])
music = np.concatenate(out)
sf.write(os.path.join(BUILD, 'music.wav'), music, SR)
length = len(music) / SR
json.dump(dict(length=round(length, 3)), open(os.path.join(BUILD, 'music.json'), 'w'))
print(f'music {length:.2f}s  (source {len(y) / SR:.2f}s, beat {np.diff(bt).mean():.4f}s)')
for j, i in JUMPS: print(f'  jump {bt[j]:.2f} -> {bt[i]:.2f}')

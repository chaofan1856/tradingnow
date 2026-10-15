"""Extend the owner's track ('We Never (Remix)', instrumental, 112 BPM) to the film's length without changing a note.

    python3 tools/music.py TRACK.mp4 TARGET_SECONDS

The track's second half (from ~88 s) replays the arrangement of its opening (~3 s) 160 beats earlier: over
8 beats either side of beat 170 -> beat 10, beat-synchronous MFCC / mel / chroma similarity is ~0.86 and every
band is within 2 dB, so one jump back there replays intro -> build -> main section once (+85.1 s) with a
single seam. The main section also repeats every 32 beats (8 bars, similarity 0.99), so shorter films use one or
two 8-bar repeats there, or the track as it is. The music ends at ~185.4 s; the platform sting after 5 s of
silence (~190.8 s) is cut. A short equal-power crossfade sits just before each beat's attack.
Writes build/music.wav (48 kHz stereo) and build/music.json {"length": s}.
"""
import json, os, subprocess, sys
import numpy as np, soundfile as sf, librosa

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BUILD = os.environ.get('OUT_DIR') or os.path.join(ROOT, 'build'); os.makedirs(BUILD, exist_ok=True)
SR = 48000
END = 185.6                 # music has faded out by 185.38 s; a platform sting follows at 190.84 s

src = os.path.join(BUILD, 'track_audio.wav')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', sys.argv[1], '-vn', '-ac', '2', '-ar', str(SR), src], check=True)
y, _ = sf.read(src, dtype='float32')
assert 190 < len(y) / SR < 196, f'unexpected track length {len(y) / SR:.2f}s'
y = y[:int(END * SR)]

mono = librosa.resample(y.mean(1), orig_sr=SR, target_sr=22050)
oenv = librosa.onset.onset_strength(y=mono, sr=22050, hop_length=256)
_, beats = librosa.beat.beat_track(onset_envelope=oenv, sr=22050, hop_length=256, start_bpm=112, tightness=400)
bt = librosa.frames_to_time(beats, sr=22050, hop_length=256)
period = np.median(np.diff(bt))
assert abs(period - 0.534) < 0.004 and len(bt) > 300, (period, len(bt))
beat = lambda s: int(np.argmin(np.abs(bt - s)))

# (play until beat j, then continue from beat i), checked against the analysis times
MAIN, CHORUS = (beat(90.85), beat(5.75)), (beat(68.51), beat(51.50))
assert MAIN[0] - MAIN[1] == 160 and CHORUS[0] - CHORUS[1] == 32, (MAIN, CHORUS)
target = float(sys.argv[2])
gain = lambda jumps: sum(bt[j] - bt[i] for j, i in jumps)
# the shortest arrangement that reaches the target (the closing tail may give up to 1 s): the track as it is,
# then 8-bar chorus repeats, then the long section repeat
OPTIONS = sorted(([], [CHORUS], [CHORUS, CHORUS], [MAIN], [CHORUS, MAIN], [CHORUS, CHORUS, MAIN], [CHORUS, CHORUS, CHORUS, MAIN]),
                 key=lambda j: (len(y) / SR + gain(j), len(j)))
JUMPS = next((j for j in OPTIONS if len(y) / SR + gain(j) >= target - 1.0), OPTIONS[-1])

XF = int(0.06 * SR)         # crossfade length
PRE = int(0.025 * SR)       # cut slightly before the attack
fade_in = np.sin(np.linspace(0, np.pi / 2, XF))[:, None].astype(np.float32)
fade_out = np.cos(np.linspace(0, np.pi / 2, XF))[:, None].astype(np.float32)

out, pos = [], 0
for j, i in JUMPS:
    a, b = int(bt[j] * SR) - PRE, int(bt[i] * SR) - PRE
    assert a > pos
    out.append(y[pos:a])
    out.append(y[a:a + XF] * fade_out + y[b:b + XF] * fade_in)
    pos = b + XF
out.append(y[pos:])
music = np.concatenate(out)
sf.write(os.path.join(BUILD, 'music.wav'), music, SR)
length = len(music) / SR
json.dump(dict(length=round(length, 3)), open(os.path.join(BUILD, 'music.json'), 'w'))
print(f'music {length:.2f}s  (track {len(y) / SR:.2f}s, beat {period:.4f}s)')
for j, i in JUMPS: print(f'  jump {bt[j]:.2f} -> {bt[i]:.2f}')

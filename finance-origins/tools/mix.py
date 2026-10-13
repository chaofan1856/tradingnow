"""Mux out/video-only.mp4 with music + sfx → out/金融的起源.mp4

    python3 tools/mix.py                       # synthesised bgm.wav
    MUSIC=path/to/track.mp4 python3 tools/mix.py   # any audio/video file's audio as the bed
    MUSIC_START=12 SFX_DB=-22 …                # where to cut the track, sound-effect level
"""
import os, subprocess, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)
FPS, DUR = 30, 98.0
YEARS = [244, 600, 870, 1170, 1320, 1470, 1620, 1770, 1920, 2130, 2460]   # SCN starts (year blocks appear +8f)
CUES = [('tap', 232), ('rice', 390), ('rice', 506), ('scale', 640), ('paper', 884), ('paper', 1176),
        ('ding', 1582), ('tap', 1660), ('tap', 1672), ('tap', 1684), ('tap', 1846), ('paper', 1920), ('paper', 2134)]
song = os.environ.get('MUSIC') or next(iter(sorted(glob.glob('music/*.*'))), None)
if song and song.endswith('.md'): song = None
start, sfx_db = float(os.environ.get('MUSIC_START', 0)), float(os.environ.get('SFX_DB', -22))

duck = ','.join(f"volume=-3dB:enable='between(t,{(s + 8) / FPS:.3f},{(s + 8) / FPS + 0.45:.3f})'" for s in YEARS)
inputs = ['-i', 'out/video-only.mp4']
if song:
    print('music:', song, f'(from {start}s)')
    inputs += ['-i', song, '-i', 'sfx/years.wav']
    bed = (f"[1:a]atrim=start={start}:duration={DUR},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,"
           f"loudnorm=I=-27:TP=-3:LRA=11,afade=t=in:st=1.2:d=3,afade=t=out:st={DUR - 2}:d=2,{duck}[bed];[2:a]volume=-14dB[yr];[bed][yr]amix=inputs=2:normalize=0[bgm]")
else:
    print('music: bgm.wav (synthesised)')
    inputs += ['-i', 'bgm.wav', '-i', 'bgm.wav']
    bed = '[1:a]volume=-20dB[bgm]'
parts, labels = [bed], ['[bgm]']
for k, (name, f) in enumerate(CUES):
    inputs += ['-i', f'sfx/{name}.wav']
    ms = round(f / FPS * 1000)
    parts.append(f'[{3 + k}:a]adelay={ms}:all=1,volume={sfx_db}dB[s{k}]'); labels.append(f'[s{k}]')
parts.append(''.join(labels) + f'amix=inputs={len(labels)}:normalize=0:duration=first,volume=8dB,alimiter=limit=0.9:level=disabled,apad,atrim=duration={DUR}[aout]')
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', ';'.join(parts), '-map', '0:v', '-map', '[aout]',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', str(DUR), '-movflags', '+faststart', 'out/金融的起源.mp4'], check=True)
print('wrote out/金融的起源.mp4')

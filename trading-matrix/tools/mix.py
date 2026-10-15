"""No sound effects in this film: the mix is the (bell-free, extended) score alone, loudness-normalised.
    python3 tools/mix.py   -> build/mix.wav"""
import os, subprocess
B = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'build')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', os.path.join(B, 'music.wav'), '-af',
                'alimiter=limit=0.95:attack=5:release=80,loudnorm=I=-15:TP=-1.2:LRA=11', '-ar', '48000', os.path.join(B, 'mix.wav')], check=True)
print('build/mix.wav')

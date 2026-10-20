"""Per-bar loudness and band balance of out/score.wav (mix sanity check)."""
import wave, numpy as np
from scipy.signal import butter, sosfilt
w = wave.open('out/score.wav'); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, 2).astype(float) / 32768; m = x.mean(1)
SR = 48000
bands = {'sub<80': butter(4, 80, 'lp', fs=SR, output='sos'), '80-250': butter(4, [80, 250], 'bp', fs=SR, output='sos'),
         '250-2k': butter(4, [250, 2000], 'bp', fs=SR, output='sos'), '2k-6k': butter(4, [2000, 6000], 'bp', fs=SR, output='sos'),
         '>6k': butter(4, 6000, 'hp', fs=SR, output='sos')}
B = {k: sosfilt(s, m) for k, s in bands.items()}
db = lambda v: 20 * np.log10(np.sqrt((v ** 2).mean()) + 1e-9)
print('bar   t   rms  peak | ' + ' '.join(f'{k:>6}' for k in bands) + ' | side')
for b in range(28):
    s = slice(b * 2 * SR, (b + 1) * 2 * SR)
    side = db((x[s, 0] - x[s, 1]) / 2) - db(m[s])
    print(f'{b:3d} {b*2:3d} {db(m[s]):6.1f} {20*np.log10(abs(m[s]).max()+1e-9):5.1f} | ' + ' '.join(f'{db(B[k][s]):6.1f}' for k in bands) + f' | {side:5.1f}')

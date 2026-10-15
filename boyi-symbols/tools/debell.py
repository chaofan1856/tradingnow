"""Remove the recurring bell / chime hits ("叮") from the reference score, keep everything else.

    python3 tools/debell.py IN.wav OUT.wav

A bell hit is a struck, ringing harmonic stack: at one instant several narrow partials
(each standing well above its spectral neighbours, in the harmonic layer, not drums) jump
up together, then ring. Each partial of such an event is "repaired" for as long as it rings:
its magnitude is pulled back to the background level that bin had just before the strike,
so the bell vanishes without leaving a hole. Drums, bass, pads and risers pass untouched.
"""
import sys
import numpy as np, soundfile as sf, librosa
from scipy.ndimage import median_filter, uniform_filter1d

src, dst = sys.argv[1], sys.argv[2]
y, sr = sf.read(src, dtype='float32')
if y.ndim == 1: y = y[:, None]
N, HOP = 4096, 512
fps = sr / HOP
X = [librosa.stft(y[:, c], n_fft=N, hop_length=HOP) for c in range(y.shape[1])]
S = np.mean([np.abs(x) for x in X], 0)
f = librosa.fft_frequencies(sr=sr, n_fft=N)
L = 20 * np.log10(S + 1e-7)
F, T = L.shape

Mh, _ = librosa.decompose.hpss(S, margin=1.5, mask=True)
peaky = L - 20 * np.log10(median_filter(S, size=(25, 1)) + 1e-7)        # dB above local spectral floor
prev = np.concatenate([np.full((F, 4), -140.0), L[:, :-4]], 1)
rise = L - prev                                                          # dB jump over ~45 ms
band = (f > 300) & (f < 10000)
cand = (rise > 12) & (peaky > 12) & (Mh > 0.5) & band[:, None]
# keep spectral maxima only (one bin per partial)
cand &= (L >= np.roll(L, 1, 0)) & (L >= np.roll(L, -1, 0))

# an event = >= 3 partials struck within 2 frames of each other
cnt = uniform_filter1d(cand.sum(0).astype(float), size=3) * 3
events = [j for j in range(T) if cand[:, j].any() and cnt[j] >= 3]

G = np.ones_like(S)
pre = int(0.30 * fps)
nev, nparts = 0, 0
for tj in events:
    for fi in np.where(cand[:, tj])[0]:
        lvl = L[fi, tj]
        # ring length: until the partial has decayed 24 dB or merged into the background
        bg = np.median(S[max(0, fi - 1):fi + 2, max(0, tj - pre):max(1, tj - 2)], axis=1) if tj > 2 else S[fi - 1:fi + 2, 0]
        bgL = 20 * np.log10(np.max(bg) + 1e-7)
        end = tj
        while end + 1 < T and end - tj < int(3.0 * fps) and L[fi, end + 1] > max(lvl - 24, bgL + 4):
            end += 1
        if end - tj < int(0.12 * fps): continue                         # not a ringing tone
        for k, b in zip(range(max(0, fi - 1), min(F, fi + 2)), bg):
            seg = slice(max(0, tj - 1), end + 1)
            G[k, seg] = np.minimum(G[k, seg], np.clip(b * 1.2 / (S[k, seg] + 1e-9), 0.03, 1))
        nparts += 1
    nev += 1
G = uniform_filter1d(G, size=3, axis=1)                                  # no zipper noise
out = np.stack([librosa.istft(x * G, hop_length=HOP, length=len(y)) for x in X], 1)
sf.write(dst, out.astype(np.float32), sr)
times = sorted({round(tj / fps, 1) for tj in events})
print(f'{nev} struck events ({nparts} partials) repaired; level change {10 * np.log10(((S * G) ** 2).sum() / (S ** 2).sum()):.2f} dB')
print('first event times:', times[:12], '...')

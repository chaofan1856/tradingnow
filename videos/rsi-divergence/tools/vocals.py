"""MDX-Net vocal separation (Kim_Vocal_2.onnx): python mdx.py in.wav(44.1k stereo) out_vocals.wav"""
import sys, numpy as np, torch, onnxruntime as ort, soundfile as sf
N_FFT, HOP, DIM_F, DIM_T = 7680, 1024, 3072, 256
CH = HOP * (DIM_T - 1); TRIM = N_FFT // 2; GEN = CH - 2 * TRIM; NB = N_FFT // 2 + 1
win = torch.hann_window(N_FFT, periodic=True)
def stft(x):
    b = x.shape[0]; x = x.reshape(-1, CH)
    X = torch.view_as_real(torch.stft(x, N_FFT, HOP, window=win, center=True, return_complex=True)).permute(0, 3, 1, 2)
    return X.reshape(b, 2, 2, NB, DIM_T).reshape(b, 4, NB, DIM_T)[:, :, :DIM_F]
def istft(X):
    b = X.shape[0]; X = torch.cat([X, torch.zeros(b, 4, NB - DIM_F, DIM_T)], 2)
    X = X.reshape(b, 2, 2, NB, DIM_T).reshape(-1, 2, NB, DIM_T).permute(0, 2, 3, 1).contiguous()
    return torch.istft(torch.view_as_complex(X), N_FFT, HOP, window=win, center=True).reshape(b, 2, CH)
a, sr = sf.read(sys.argv[1], always_2d=True); assert sr == 44100
mix = a.T.astype(np.float32); n = mix.shape[1]
pad = GEN - n % GEN
mp = np.concatenate([np.zeros((2, TRIM), np.float32), mix, np.zeros((2, pad), np.float32), np.zeros((2, TRIM), np.float32)], 1)
sess = ort.InferenceSession(sys.argv[3] if len(sys.argv) > 3 else 'Kim_Vocal_2.onnx', providers=['CPUExecutionProvider'])
out = []
for i in range(0, n + pad, GEN):
    x = torch.from_numpy(mp[:, i:i + CH])[None]; S = stft(x).numpy()
    y = (sess.run(None, {sess.get_inputs()[0].name: S})[0] - sess.run(None, {sess.get_inputs()[0].name: -S})[0]) * .5
    out.append(istft(torch.from_numpy(y))[0, :, TRIM:-TRIM].numpy()); print('chunk', i // GEN, flush=True)
v = np.concatenate(out, 1)[:, :n] * 1.009
sf.write(sys.argv[2], v.T, sr); sf.write(sys.argv[2].replace('.wav', '_music.wav'), (mix - v).T, sr)

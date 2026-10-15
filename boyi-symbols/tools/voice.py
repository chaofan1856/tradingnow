"""Narration: Kokoro (sherpa-onnx, offline) → deep documentary voice → timeline.

    python3 tools/voice.py MODELS_DIR            all lines
    python3 tools/voice.py MODELS_DIR 5,7        regenerate only these line indices

MODELS_DIR holds kokoro-multi-lang-v1_1/ and sherpa-onnx-paraformer-zh-2024-03-09/
(both from github.com/k2-fsa/sherpa-onnx/releases). Writes
  build/voice/NN.wav    processed clip per line
  build/narration.wav   all clips placed on the timeline (48 kHz stereo)
  timeline.json         line + scene timings consumed by index.html and the mixer
  build/subtitles.srt
and prints an ASR round-trip per line so mispronunciations show up as text.
"""
import json, os, re, subprocess, sys
import numpy as np, soundfile as sf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from script import LINES, FINALE  # noqa: E402

MODELS = sys.argv[1]
ONLY = {int(x) for x in sys.argv[2].split(',')} if len(sys.argv) > 2 else None
SID = 71
SPEEDS = (0.9, 0.94, 0.86, 0.98)  # deterministic model: vary the speed to get a different take
SR = 48000
VOICE = os.path.join(ROOT, 'build', 'voice')
os.makedirs(VOICE, exist_ok=True)

# silence before the first line of each scene (title card / chapter cards live in these gaps)
SCENE_PRE = dict(open=2.6, sumer=10.2, babylon=1.8, zhou=5.4, tang=1.8, song=1.6, piaohao=1.6,
                 chain=1.4, voc=5.2, years=1.0, candle=1.8, consensus=1.4)
TAIL = 15.5  # minimum after the last line: breath, finale card, fade (stretched to the music's end)

# voice chain: lower the pitch (and formants) ~2 semitones, warm low end, tame 3 kHz, light room
FX = ('highpass=f=70,rubberband=pitch=0.885:tempo=1:pitchq=quality,'
      'equalizer=f=120:t=q:w=0.9:g=3.5,equalizer=f=320:t=q:w=1.2:g=-1.5,'
      'equalizer=f=3200:t=q:w=1.4:g=-2,highshelf=f=7500:g=1.5,'
      'acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=2,'
      'aecho=0.85:0.5:38|61|89:0.10|0.07|0.045')

plain = lambda s: s.replace('【', '').replace('】', '')


def models():
    import sherpa_onnx
    d = os.path.join(MODELS, 'kokoro-multi-lang-v1_1')
    tts = sherpa_onnx.OfflineTts(sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(
        kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
            model=f'{d}/model.onnx', voices=f'{d}/voices.bin', tokens=f'{d}/tokens.txt',
            data_dir=f'{d}/espeak-ng-data', dict_dir=f'{d}/dict',
            lexicon=f'{d}/lexicon-us-en.txt,{d}/lexicon-zh.txt'), num_threads=4),
        rule_fsts=f'{d}/number-zh.fst'))
    m = os.path.join(MODELS, 'sherpa-onnx-paraformer-zh-2024-03-09')
    asr = sherpa_onnx.OfflineRecognizer.from_paraformer(paraformer=f'{m}/model.int8.onnx', tokens=f'{m}/tokens.txt', num_threads=4)
    return tts, asr


def cer(ref, hyp):
    a, b = re.sub(r'[^\u4e00-\u9fffA-Za-z0-9]', '', ref).lower(), re.sub(r'[^\u4e00-\u9fffA-Za-z0-9]', '', hyp).lower()
    dp = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        prev, dp[0] = dp[0], i
        for j in range(1, len(b) + 1):
            prev, dp[j] = dp[j], min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] != b[j - 1]))
    return dp[-1] / max(1, len(a))


def trim(y, sr, thr=0.012, pad=0.04):
    idx = np.where(np.abs(y) > thr)[0]
    if not len(idx): return y
    a, b = max(0, idx[0] - int(pad * sr)), min(len(y), idx[-1] + int(pad * 1.5 * sr))
    return y[a:b]


def process(raw_path, out_path):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', raw_path, '-af', FX + f',aresample={SR}', '-ac', '1', out_path], check=True)


def main():
    tts, asr = models()
    import librosa
    for i, L in enumerate(LINES):
        out = f'{VOICE}/{i:02d}.wav'
        if ONLY is not None and i not in ONLY and os.path.exists(out): continue
        text = plain(L.get('tts', L['sub']))
        best = None
        for speed in SPEEDS:  # keep the take the recogniser reads back best
            a = tts.generate(text, sid=SID, speed=speed)
            y = trim(np.array(a.samples, dtype=np.float32), a.sample_rate)
            raw = f'{VOICE}/{i:02d}.raw.wav'
            sf.write(raw, y, a.sample_rate)
            process(raw, raw + '.fx.wav'); os.remove(raw)
            z, _ = sf.read(raw + '.fx.wav', dtype='float32')
            s = asr.create_stream(); s.accept_waveform(16000, librosa.resample(z, orig_sr=SR, target_sr=16000)); asr.decode_stream(s)
            e = cer(plain(L['sub']), s.result.text)
            if best is None or e < best[0] - 0.02:
                best = (e, s.result.text); os.replace(raw + '.fx.wav', out)
            else:
                os.remove(raw + '.fx.wav')
            if e == 0: break
        z, _ = sf.read(out, dtype='float32')
        print(f'{i:02d} {len(z) / SR:5.2f}s  cer {best[0]:.2f}  {plain(L["sub"])}\n      asr: {best[1]}', flush=True)

    # ---- timeline ----
    t, scene, lines, scenes = 0.0, None, [], []
    for i, L in enumerate(LINES):
        if L['scene'] != scene:
            t += SCENE_PRE[L['scene']]
            if scenes: scenes[-1]['end'] = round(t - SCENE_PRE[L['scene']] + 0.0, 3)
            scenes.append(dict(id=L['scene'], start=round(t, 3)))
            scene = L['scene']
        z, _ = sf.read(f'{VOICE}/{i:02d}.wav', dtype='float32')
        d = len(z) / SR
        lines.append(dict(i=i, scene=scene, sub=L['sub'], start=round(t, 3), end=round(t + d, 3)))
        t += d + L.get('gap', 0.3)
    scenes[-1]['end'] = round(t, 3)
    mj = os.path.join(ROOT, 'build', 'music.json')  # the film ends with the (extended) score
    total = round(max(t + TAIL, json.load(open(mj))['length'] if os.path.exists(mj) else 0), 3)
    json.dump(dict(total=total, fps=30, lines=lines, scenes=scenes, finale=FINALE, voice_end=round(t, 3)),
              open(os.path.join(ROOT, 'timeline.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

    mix = np.zeros(int(total * SR) + SR, dtype=np.float32)
    for L in lines:
        z, _ = sf.read(f'{VOICE}/{L["i"]:02d}.wav', dtype='float32')
        k = int(L['start'] * SR); mix[k:k + len(z)] += z
    mix /= max(1e-6, np.abs(mix).max()) / 0.89
    sf.write(os.path.join(ROOT, 'build', 'narration.wav'), np.stack([mix, mix], 1), SR)

    def ts(x):
        ms = int(round(x * 1000)); return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'
    srt = [f'{n + 1}\n{ts(L["start"])} --> {ts(L["end"] + 0.25)}\n{plain(L["sub"])}\n' for n, L in enumerate(lines)]
    fs, fe = t + 5.0, total - 2.0
    srt.append(f'{len(lines) + 1}\n{ts(fs)} --> {ts(fe)}\n{FINALE}\n')
    open(os.path.join(ROOT, 'build', 'subtitles.srt'), 'w', encoding='utf-8').write('\n'.join(srt))
    print(f'total {total:.1f}s  ({len(lines)} lines, voice ends {t:.1f}s)')


if __name__ == '__main__':
    main()

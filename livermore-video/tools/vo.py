"""First-person narration in an older, low male voice (offline Kokoro v1.1-zh via sherpa-onnx),
laid out on the film's beat-snapped timeline. Writes assets/vo.wav and timeline.js (cue times
that index.html reads for subtitles and sub-scene cuts).

    KOKORO_DIR=/path/to/kokoro-int8-multi-lang-v1_1 python3 tools/vo.py

Model: https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/kokoro-int8-multi-lang-v1_1.tar.bz2
"""
import json, os, subprocess, tempfile
import numpy as np, soundfile as sf, librosa, sherpa_onnx

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.environ.get('KOKORO_DIR', '').rstrip('/') + '/'
SID = 84            # deepest of the zh male speakers (median f0 ≈ 90 Hz)
SR = 24000
DUR = 58.0

# Beat grid of the score (librosa beat_track on assets/music.flac, ~103 BPM).
BEATS = [0.91, 1.49, 2.07, 2.65, 3.25, 3.81, 4.41, 4.99, 5.57, 6.15, 6.76, 7.34, 7.92, 8.5, 9.1, 9.68, 10.26, 10.87,
         11.47, 12.05, 12.63, 13.24, 13.82, 14.42, 15.14, 15.74, 16.32, 16.93, 17.53, 18.16, 18.78, 19.37, 19.97, 20.55,
         21.11, 21.66, 22.22, 22.78, 23.34, 23.89, 24.43, 24.96, 25.5, 26.1, 26.7, 27.28, 27.84, 28.44, 29.02, 29.61,
         30.19, 30.77, 31.37, 31.93, 32.53, 33.11, 33.72, 34.3, 34.88, 35.46, 36.06, 36.64, 37.24, 37.83, 38.41, 38.99,
         39.57, 40.15, 40.73, 41.29, 41.87, 42.45, 43.03, 43.61, 44.19, 44.74, 45.35, 45.91, 46.49, 47.07, 47.65, 48.23,
         48.81, 49.37, 49.97, 50.53, 51.11, 51.69, 52.27, 52.85, 53.43, 53.99, 54.57, 55.15, 55.73, 56.31, 56.89, 57.49]

# Scene cuts: the brief's 6/30/38/46/51 s snapped to the nearest beat.
CUTS = {'cover': 0.0, 'bio': 6.15, 'q12': 30.19, 'q34': 38.41, 'q5': 46.49, 'end': 51.11}

# (key, scene, spoken line, on-screen line, speed). Spoken = his own voice, first person;
# on-screen = the brief's copy.
LINES = [
    ('v00', 'cover', '我是杰西利弗莫尔。人们叫我，投机之王。', '', 1.0),
    ('v01', 'bio', '十四岁那年，我走进了市场。', '杰西·利弗莫尔，投机史上传奇大作手，14岁进入市场。', 1.1),
    ('v02', 'bio', '我从不靠内幕消息，只研判价格的趋势。', '他不靠内幕消息，只研判价格趋势。', 1.1),
    ('v03', 'bio', '我一生四次崛起，又四次破产。', '一生四次崛起，四次破产。', 1.1),
    ('v04', 'bio', '一九二九年美股大崩盘，我提前做空，斩获巨额财富。', '1929美股大崩盘，提前做空，斩获巨额财富。', 1.1),
    ('v05', 'bio', '纵使深谙规律，我也曾数次因傲慢，重仓爆仓。', '纵使深谙市场规律，却数次因傲慢重仓爆仓。', 1.1),
    ('v06', 'bio', '我把这一切，写进了股票大作手回忆录。', '著作《股票大作手回忆录》，是交易者必读经典。', 1.1),
    ('q1', 'q12', '华尔街没有新鲜事，投机如同群山一般古老。', '华尔街没有新鲜事，投机如同群山一般古老。', 1.1),
    ('q2', 'q12', '市场永远不会错，错的只有人。', '市场永远不会错，错的只有人。', 1.05),
    ('q3', 'q34', '牛和熊都可以赚钱，但猪会被杀掉。', '牛和熊都可以赚钱，但猪会被杀掉。', 1.1),
    ('q4', 'q34', '赚大钱靠的不是频繁交易，而是耐心持仓等待。', '赚大钱靠的不是频繁交易，而是耐心持仓等待。', 1.1),
    ('q5', 'q5', '绝不要在亏损的头寸上，加码摊低成本。', '绝不要在亏损的头寸上加码摊低成本。', 1.0),
]
LEAD, GAP, TAIL = 0.3, 0.16, 0.12   # silence after a cut / between lines

# Voice character: ~1 semitone down, warm low end, a little presence and a small room.
VOICE_FX = ('asetrate=24000*0.94,aresample=24000,atempo=1.0638,highpass=f=70,'
            'equalizer=f=160:t=q:w=1:g=3,equalizer=f=3200:t=q:w=1.2:g=2,'
            'acompressor=threshold=-20dB:ratio=3:attack=5:release=120,aecho=0.85:0.6:38|67:0.10|0.06')


def tts():
    k = sherpa_onnx.OfflineTtsKokoroModelConfig(
        model=M + 'model.int8.onnx', voices=M + 'voices.bin', tokens=M + 'tokens.txt', data_dir=M + 'espeak-ng-data',
        dict_dir=M + 'dict', lexicon=M + 'lexicon-us-en.txt,' + M + 'lexicon-zh.txt')
    cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(kokoro=k, num_threads=4),
                                       rule_fsts=M + 'date-zh.fst,' + M + 'number-zh.fst')
    return sherpa_onnx.OfflineTts(cfg)


def fx(y):
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, 'a.wav'), os.path.join(d, 'b.wav')
        sf.write(a, y, SR)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', a, '-af', VOICE_FX, '-ar', str(SR), '-ac', '1', b], check=True)
        return sf.read(b, dtype='float32')[0]


def stretch(y, f):
    with tempfile.TemporaryDirectory() as d:
        a, b = os.path.join(d, 'a.wav'), os.path.join(d, 'b.wav')
        sf.write(a, y, SR)
        subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', a, '-af', f'atempo={f:.4f}', b], check=True)
        return sf.read(b, dtype='float32')[0]


def main():
    engine = tts()
    clips = {}
    for key, scene, said, shown, speed in LINES:
        g = engine.generate(said, sid=SID, speed=speed)
        y = librosa.resample(np.asarray(g.samples, np.float32), orig_sr=g.sample_rate, target_sr=SR)
        y, _ = librosa.effects.trim(y, top_db=38)
        clips[key] = fx(y)

    # Fit each scene's lines between its cut and the next one: speed up (pitch kept) only as much as needed.
    order = list(CUTS)
    for scene in order[:-1]:
        keys = [l[0] for l in LINES if l[1] == scene]
        if not keys:
            continue
        start = CUTS[scene] + (0.7 if scene == 'cover' else LEAD)
        room = CUTS[order[order.index(scene) + 1]] - TAIL - start - GAP * (len(keys) - 1)
        need = sum(len(clips[k]) for k in keys) / SR
        if need > room:
            f = need / room
            print(f'{scene}: stretch x{f:.3f}')
            for k in keys:
                clips[k] = stretch(clips[k], f)

    out = np.zeros(int(DUR * SR), np.float32)
    cues, t, prev_scene = [], 0.0, None
    for key, scene, said, shown, speed in LINES:
        if scene != prev_scene:
            t = CUTS[scene] + (0.7 if scene == 'cover' else LEAD)
            prev_scene = scene
        y = clips[key]
        d = len(y) / SR
        i = int(t * SR)
        out[i:i + len(y)] += y[:len(out) - i]
        cues.append({'key': key, 'scene': scene, 'text': shown, 'start': round(t, 3), 'end': round(t + d, 3)})
        print(f'{key} {t:6.2f} → {t + d:6.2f}  ({d:.2f}s)')
        t += d + GAP

    peak = np.abs(out).max()
    out *= 0.89 / peak
    sf.write(os.path.join(ROOT, 'assets', 'vo.wav'), out, SR)
    with open(os.path.join(ROOT, 'timeline.js'), 'w', encoding='utf-8') as f:
        f.write('// generated by tools/vo.py — do not edit\n')
        f.write('window.TIMELINE = ' + json.dumps({'duration': DUR, 'beats': BEATS, 'cuts': CUTS, 'cues': cues},
                                                  ensure_ascii=False, indent=1) + ';\n')


if __name__ == '__main__':
    main()

"""Check every synthesised sentence against its text and time the subtitle lines → voice/timing.json

    python3 tools/align.py          (needs faster-whisper; run after tools/voice.py)

Each sentence wav is trimmed of leading / trailing silence (→ voice/t_<key>.wav), transcribed with word
timestamps, and compared with the text; the line breaks inside a sentence are placed at the word whose
character position matches. Prints the sentences whose transcript is off so they can be re-made.
"""
import json, os, re, subprocess, sys, wave
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voice
from faster_whisper import WhisperModel
ROOT = voice.ROOT; V = voice.V; SR = 24000
GAP = .32                                                    # breath between sentences
def load(p):
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', p, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()
def trim(a):
    e = np.sqrt(np.convolve(a * a, np.ones(480) / 480, 'same')); on = np.where(e > .012)[0]
    i0 = max(0, on[0] - int(.04 * SR)); i1 = min(len(a), on[-1] + int(.10 * SR)); a = a[i0:i1].copy()
    f = int(.01 * SR); a[:f] *= np.linspace(0, 1, f); a[-f:] *= np.linspace(1, 0, f); return a
han = lambda s: re.sub(r'[^一-鿿A-Za-z]', '', s)
M = WhisperModel('medium', device='cpu', compute_type='int8')
cache_p = os.path.join(V, 'align.json'); cache = json.load(open(cache_p)) if os.path.exists(cache_p) else {}
meta = json.load(open(os.path.join(V, 'meta.json')))
timing, bad = {}, []
for key, lines in voice.sentences():
    sid = key.rsplit('_', 1)[0]; p = os.path.join(V, key + '.wav')
    if not os.path.exists(p): bad.append((key, 'missing')); continue
    tag = meta[key]['h'] + str(meta[key]['seed'])
    if cache.get(key, {}).get('tag') != tag:
        a = trim(load(p)); w = wave.open(os.path.join(V, 't_' + key + '.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(a, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
        a16 = np.interp(np.arange(0, len(a), SR / 16000), np.arange(len(a)), a).astype(np.float32)
        segs, _ = M.transcribe(a16, language='zh', word_timestamps=True, initial_prompt='以下是普通话的句子，讲的是股票技术指标RSI、背离、超买、超卖。')
        words = [(x.word, x.start) for s in segs for x in s.words]
        cache[key] = {'tag': tag, 'sec': len(a) / SR, 'words': words}; json.dump(cache, open(cache_p, 'w'), ensure_ascii=False)
    c = cache[key]; sec = c['sec']; heard = han(''.join(w for w, _ in c['words'])); want = han(voice.spoken(lines))
    ratio = len(heard) / max(1, len(want)); cps = len(want) / sec
    if not (.8 <= ratio <= 1.2) or not (2.6 <= cps <= 6.5): bad.append((key, f'ratio {ratio:.2f} cps {cps:.1f} heard={heard}'))
    # line boundaries: by character share of the spoken text, snapped to the nearest heard word start
    spoke = [len(han(voice.spoken([l]))) for l in lines]; tot = sum(spoke); cuts = []; acc = 0
    starts = []; n = 0
    for w, t in c['words']: starts.append((n, t)); n += len(han(w))
    for k in range(len(lines) - 1):
        acc += spoke[k]; target = acc / tot * max(1, n)
        j = min(range(len(starts)), key=lambda i: abs(starts[i][0] - target)) if starts else 0
        t = starts[j][1] if starts and abs(starts[j][0] - target) <= 2 else acc / tot * sec
        cuts.append(min(max(t - .06, (cuts[-1] if cuts else 0) + .5), sec - .4))
    edges = [0] + cuts + [sec + GAP]
    timing.setdefault(sid, []).extend(round(edges[i + 1] - edges[i], 3) for i in range(len(lines)))
    print(f'{key:10s} {sec:5.2f}s {cps:4.1f}c/s  {heard}')
json.dump(timing, open(os.path.join(V, 'timing.json'), 'w'), indent=1)
print('\nBAD:' if bad else '\nall sentences match'); [print(' ', *b) for b in bad]

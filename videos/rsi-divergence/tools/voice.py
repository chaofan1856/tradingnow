"""Narration → voice/<scene>_<k>.wav, one file per sentence (F5-TTS zero-shot, CPU).

    <venv-with-f5-tts>/bin/python tools/voice.py [--redo scene_k,scene_k] [--seed 11]

voice/ref.wav + REF_TEXT are the reference sample of the narrator's voice (not committed).
Digits are spelled out for the synthesiser; the subtitles keep the digits.
"""
import json, os, re, sys, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
V = os.path.join(ROOT, 'voice')
REF_TEXT = '中国的首批国家公园，它们是完美的系统，也是正在生长的传奇。'
SPOKEN = [('1978年', '一九七八年'), ('2024年', '二零二四年'), ('0到100', '零到一百'), ('6、12、24', '六、十二、二十四'), ('12日或14日', '十二日或十四日'),
          ('2724点', '两千七百二十四点'), ('2635点', '两千六百三十五点'), ('400点', '四百点'), ('2月5日', '二月五日'), ('1月', '一月'), ('3月', '三月'),
          ('20日', '二十日'), ('50年', '五十年'), ('70', '七十'), ('30', '三十'), ('50', '五十'), ('设为9', '设为九'), ('——', '，'), ('「', ''), ('」', ''), ('《', ''), ('》', '')]
def spoken(lines):
    t = re.sub(r'[{}\[\]<>]', '', ''.join(lines))
    for a, b in SPOKEN: t = t.replace(a, b)
    assert not re.search(r'\d', t), t
    return t
def sentences():
    N = json.load(open(os.path.join(ROOT, 'src', 'narration.json'), encoding='utf-8'))
    return [(f'{sid}_{k}', s) for sid, ss in N.items() for k, s in enumerate(ss)]
if __name__ == '__main__':
    arg = lambda n, d=None: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
    redo = set((arg('--redo') or '').split(',')) - {''}; seed = int(arg('--seed', '7'))
    from f5_tts.api import F5TTS
    tts = F5TTS(device='cpu')
    meta_p = os.path.join(V, 'meta.json'); meta = json.load(open(meta_p)) if os.path.exists(meta_p) else {}
    for key, lines in sentences():
        text = spoken(lines); h = hashlib.sha1(text.encode()).hexdigest()[:10]; out = os.path.join(V, key + '.wav')
        if key not in redo and os.path.exists(out) and meta.get(key, {}).get('h') == h: continue
        wav, sr, _ = tts.infer(os.path.join(V, 'ref.wav'), REF_TEXT, text, speed=1.0, nfe_step=20, file_wave=out, seed=seed, show_info=lambda *a, **k: None)
        meta[key] = {'h': h, 'text': text, 'seed': seed, 'sec': round(len(wav) / sr, 2)}
        json.dump(meta, open(meta_p, 'w'), ensure_ascii=False, indent=1)
        print(key, meta[key]['sec'], text, flush=True)

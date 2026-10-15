"""Timeline for a film without narration: reading time sets each line, the score sets the total.

    python3 tools/timeline.py REFERENCE.mp4

1. natural timing: each line stays 1.3 s + 0.17 s per character (+ its `hold`),
   scenes open with breathing room for cards and visual beats;
2. tools/music.py extends the reference score (bells removed) to at least that long;
3. the surplus is spread over the lines (more reading time), capped, the rest goes to the finale.
Writes timeline.json and build/subtitles.srt.
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)
from script import LINES, FINALE  # noqa: E402

SCENE_PRE = dict(open=1.8, barter=11.0, print=1.4, past=1.4, book=5.4, mood=1.6, berg=5.6, bubble=1.4,
                 panic=1.4, revert=1.4, value=5.6, trend=1.6, summary=2.2)
GAP = 0.55
TAIL_MIN = 11.0          # finale card + fade
plain = lambda s: s.replace('【', '').replace('】', '').replace('|', '')
nchar = lambda s: len(re.sub(r'[，。、；：！？「」——…\s]', '', plain(s)))


def build(extra_per_line=0.0):
    t, scene, lines, scenes = 0.0, None, [], []
    for i, L in enumerate(LINES):
        if L['scene'] != scene:
            if scenes: scenes[-1]['end'] = round(t, 3)
            t += SCENE_PRE[L['scene']]
            scenes.append(dict(id=L['scene'], start=round(t, 3)))
            scene = L['scene']
        d = 1.3 + 0.17 * nchar(L['sub']) + L.get('hold', 0) + extra_per_line
        lines.append(dict(i=i, scene=scene, sub=L['sub'], start=round(t, 3), end=round(t + d, 3), **{k: L[k] for k in ('pos', 'y', 'size') if k in L}))
        t += d + GAP
    scenes[-1]['end'] = round(t, 3)
    return t, lines, scenes


natural, _, _ = build()
os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
subprocess.run([sys.executable, os.path.join(ROOT, 'tools', 'music.py'), sys.argv[1], str(natural + TAIL_MIN)], check=True)
total = json.load(open(os.path.join(ROOT, 'build', 'music.json')))['length']
extra = min(0.6, max(0.0, (total - natural - TAIL_MIN) / len(LINES)))
end, lines, scenes = build(extra)
json.dump(dict(total=total, fps=60, lines=lines, scenes=scenes, finale=FINALE, voice_end=round(end, 3)),
          open(os.path.join(ROOT, 'timeline.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


def ts(x):
    ms = int(round(x * 1000)); return f'{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}'
srt = [f'{n + 1}\n{ts(L["start"])} --> {ts(L["end"])}\n{plain(L["sub"])}\n' for n, L in enumerate(lines)]
srt.append(f'{len(lines) + 1}\n{ts(end + 3.0)} --> {ts(total - 2.0)}\n{plain(FINALE)}\n')
open(os.path.join(ROOT, 'build', 'subtitles.srt'), 'w', encoding='utf-8').write('\n'.join(srt))
print(f'natural {natural:.1f}s  music {total:.1f}s  +{extra:.2f}s/line  text ends {end:.1f}s  finale {total - end:.1f}s')
for s in scenes: print(f"  {s['id']:8s} {s['start']:6.1f} – {s['end']:6.1f}")

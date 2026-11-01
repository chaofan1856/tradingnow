"""After render.mjs: build the deliverables from the cached chunks.

  成片/K线与动能博弈_4K60.mp4           full master (video stream-copied, original score mixed in)
  成片/K线与动能博弈_4K60_P1..P4.mp4    the same film in four parts, each cut on a scene boundary
                                         and independently playable (video stream-copied, audio sliced)

    python3 tools/assemble.py [--parts 4]
"""
import json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SEG = os.path.join(ROOT, 'segs')
OUT = os.path.join(ROOT, '成片')
NPARTS = int(sys.argv[sys.argv.index('--parts') + 1]) if '--parts' in sys.argv else 0   # 0 = master only
os.makedirs(OUT, exist_ok=True)

tl = json.load(open(os.path.join(ROOT, 'timeline.json')))
TITLE = tl['title']
fps, total = tl['fps'], tl['frames']
chunks = sorted((int(m.group(2)), int(m.group(3)), f) for f in os.listdir(SEG)
                if (m := re.match(r'c(\d+)_(\d+)-(\d+)\.mp4$', f)))
assert chunks and chunks[0][0] == 0 and chunks[-1][1] == total, 'render incomplete'
assert all(a[1] == b[0] for a, b in zip(chunks, chunks[1:])), 'gap between chunks'

starts = [s['f0'] for s in tl['scenes']]
cuts = [0] + [min(starts, key=lambda x: abs(x - total * k / NPARTS)) for k in range(1, NPARTS)] + [total] if NPARTS else []

def run(*a): subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *a], check=True)

def build(a, b, out):
    lst = os.path.join(SEG, f'list_{a}_{b}.txt')
    open(lst, 'w').write('\n'.join(f"file '{f}'" for x, y, f in chunks if a <= x < b))
    run('-f', 'concat', '-safe', '0', '-i', lst, '-ss', f'{a / fps:.4f}', '-t', f'{(b - a) / fps:.4f}', '-i', os.path.join(ROOT, 'bgm.wav'),
        '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '384k', '-ar', '48000',
        '-metadata', f'title={TITLE}', '-metadata', 'artist=TradingNow', '-movflags', '+faststart', out)
    print(f'{os.path.relpath(out, ROOT)}  {(b - a) / fps:6.1f} s  {os.path.getsize(out) / 1048576:7.1f} MB')

# the full master: concat ALL chunks, full score
lst = os.path.join(SEG, 'list.txt')
open(lst, 'w').write('\n'.join(f"file '{f}'" for _, _, f in chunks))
master = os.path.join(OUT, f'{TITLE}_4K60.mp4')
run('-f', 'concat', '-safe', '0', '-i', lst, '-i', os.path.join(ROOT, 'bgm.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
    '-c:a', 'aac', '-b:a', '384k', '-ar', '48000', '-metadata', f'title={TITLE}', '-metadata', 'artist=TradingNow', '-movflags', '+faststart', '-shortest', master)
print(f'{os.path.relpath(master, ROOT)}  {total / fps:6.1f} s  {os.path.getsize(master) / 1048576:7.1f} MB')
for i in range(NPARTS):
    build(cuts[i], cuts[i + 1], os.path.join(OUT, f'{TITLE}_4K60_P{i + 1}.mp4'))

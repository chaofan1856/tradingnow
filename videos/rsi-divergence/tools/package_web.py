"""Build the download page: split the final master into ≤14 MB byte slices (published alongside
the page), embed size + SHA-256 so the browser can rebuild and verify the exact original file.

    python3 tools/package_web.py 成片/K线与动能博弈_4K.mp4
"""
import hashlib, html, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, '成片', 'K线与动能博弈_4K.mp4')
OUT = os.path.join(ROOT, 'web', 'dist')
PART = 19 * 1024 * 1024          # artifact asset store takes ≤ 20 MiB per file

os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT):
    os.remove(os.path.join(OUT, f))
data = open(SRC, 'rb').read()
sha = hashlib.sha256(data).hexdigest()
parts = []
for i in range(0, len(data), PART):
    name = f'part{len(parts) + 1:02d}.mp4'
    open(os.path.join(OUT, name), 'wb').write(data[i:i + PART])
    parts.append({'path': name, 'size': len(data[i:i + PART])})

tl = json.load(open(os.path.join(ROOT, 'timeline.json')))
start = {s['id']: s['start'] for s in tl['scenes']}
mmss = lambda s: f'{int(s) // 60:02d}:{int(s) % 60:02d}'
secs = tl['seconds']

# poster: the title card at full 4K, scaled to 1920 for a light page
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(start['title'] + 3.6), '-i', SRC, '-frames:v', '1',
                '-vf', 'scale=1920:-1', '-q:v', '3', os.path.join(OUT, 'poster.jpg')], check=True)

prompt = open(os.path.join(ROOT, 'STYLE_PROMPT.md'), encoding='utf-8').read()
body = re.search(r'```\n(.*?)\n```', prompt, re.S).group(1)

page = open(os.path.join(ROOT, 'web', 'template.html'), encoding='utf-8').read()
chapters = '\n'.join([f'00:00 开场', f'{mmss(start["intro"])} 导言：博弈符号的本质',
                      f'{mmss(start["ch1"])} 模块一：多空符号的解构（实体 · 影线 · 十字星）',
                      f'{mmss(start["ch2"])} 模块二：秩序的轨迹（上涨 · 下跌 · 震荡）',
                      f'{mmss(start["ch3"])} 模块三：博弈的温度（动能增强与衰竭）',
                      f'{mmss(start["recap"])} 回顾'])
page = re.sub(r'00:00 导言.*?\n04:28 回顾', chapters, page, flags=re.S)
for k, v in {'__PARTS_JSON__': json.dumps(parts), '__TOTAL__': str(len(data)), '__SHA__': sha, '__SHA_SHORT__': sha[:16],
             '__SIZE_MB__': f'{len(data) / 1048576:.1f}', '__NPARTS__': str(len(parts)),
             '__DURATION__': f'{int(secs) // 60} 分 {int(secs) % 60:02d} 秒', '__PROMPT__': html.escape(body)}.items():
    page = page.replace(k, v)
open(os.path.join(OUT, 'index.html'), 'w', encoding='utf-8').write(page)
print(f'{len(parts)} parts, {len(data) / 1048576:.1f} MB, sha256 {sha}')

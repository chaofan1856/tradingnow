"""Fill web/template_assets.html → web/save.html. Asset URLs come from web/asset_urls.json ({piece name: url})."""
import html, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = lambda *p: os.path.join(ROOT, 'web', *p)
man = json.load(open(W('pieces.json')))
urls = json.load(open(W('asset_urls.json'))) if os.path.exists(W('asset_urls.json')) else {}
pieces = [{'url': urls[p['name']], 'size': p['size'], 'sha': p['sha']} for p in man['pieces']] if len(urls) == len(man['pieces']) else []
tl = json.load(open(os.path.join(ROOT, 'timeline.json')))
start = {s['id']: s['start'] for s in tl['scenes']}
mmss = lambda s: f'{int(s) // 60:02d}:{int(s) % 60:02d}'
prompt = open(os.path.join(ROOT, 'STYLE_PROMPT.md'), encoding='utf-8').read()
body = re.search(r'```\n(.*?)\n```', prompt, re.S).group(1)
page = open(W('template_assets.html'), encoding='utf-8').read()
chapters = '\n'.join(['00:00 开场', f'{mmss(start["intro"])} 导言：博弈符号的本质',
                      f'{mmss(start["ch1"])} 模块一：多空符号的解构（实体 · 影线 · 十字星）',
                      f'{mmss(start["ch2"])} 模块二：秩序的轨迹（上涨 · 下跌 · 震荡）',
                      f'{mmss(start["ch3"])} 模块三：博弈的温度（动能增强与衰竭）', f'{mmss(start["recap"])} 回顾'])
page = re.sub(r'00:00 导言.*?\n04:28 回顾', chapters, page, flags=re.S)
secs = tl['seconds']
for k, v in {'__PIECES__': json.dumps(pieces), '__TOTAL__': str(man['size']), '__SHA_SHORT__': man['sha'][:16],
             '__SIZE_MB__': f"{man['size'] / 1048576:.1f}", '__NPARTS__': str(len(man['pieces'])),
             '__DURATION__': f'{int(secs) // 60} 分 {int(secs) % 60:02d} 秒', '__PROMPT__': html.escape(body),
             'H.264 High@5.2 · CRF 16': 'H.264 High@5.2 · CRF 12 · 56 Mbps'}.items():
    page = page.replace(k, v)
open(W('save.html'), 'w', encoding='utf-8').write(page)
print('pieces wired:', len(pieces), '/', len(man['pieces']))

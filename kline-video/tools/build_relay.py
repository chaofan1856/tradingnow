"""Build web/page_a.html (pieces 1..SPLIT) and web/page_b.html (the rest + part-1 check + upload kit)."""
import html, json, os, re, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = lambda *p: os.path.join(ROOT, 'web', *p)
SPLIT = 53
man = json.load(open(W('pieces.json'))); urls = json.load(open(W('asset_urls.json')))
urls_b = json.load(open(W('asset_urls_b.json'))) if os.path.exists(W('asset_urls_b.json')) else {}
links = json.load(open(W('links.json'))) if os.path.exists(W('links.json')) else {}
P = man['pieces']; A, B = P[:SPLIT], P[SPLIT:]
own = lambda ps, u: [{'url': u[p['name']], 'size': p['size'], 'sha': p['sha']} for p in ps] if all(p['name'] in u for p in ps) else []
tl = json.load(open(os.path.join(ROOT, 'timeline.json'))); s = {x['id']: x['start'] for x in tl['scenes']}
mm = lambda t: f'{int(t) // 60:02d}:{int(t) % 60:02d}'
prompt = re.search(r'```\n(.*?)\n```', open(os.path.join(ROOT, 'STYLE_PROMPT.md'), encoding='utf-8').read(), re.S).group(1)
desc = f"""每一根 K 线，都是多空双方用真金白银博弈后留下的情绪切片与信用脚印。

00:00 开场
{mm(s['intro'])} 导言：博弈符号的本质
{mm(s['ch1'])} 模块一：多空符号的解构（实体 · 影线 · 十字星）
{mm(s['ch2'])} 模块二：秩序的轨迹（上涨 · 下跌 · 震荡）
{mm(s['ch3'])} 模块三：博弈的温度（动能增强与衰竭）
{mm(s['recap'])} 回顾

内容仅供学习交流，不构成任何投资建议。市场有风险，投资需谨慎。

#K线 #技术分析 #趋势交易 #动能 #TradingNow"""
extra = f"""<section aria-labelledby="yt-h"><h2 id="yt-h">YouTube 发布信息 <small>Upload kit</small></h2>
<pre id="yt-title">K线与动能博弈｜看懂红绿K线、三大趋势与动能衰竭信号（4K60）</pre>
<pre id="yt-desc">{html.escape(desc)}</pre>
<div class="row"><button class="ghost" data-copy="yt-title">复制标题</button><button class="ghost" data-copy="yt-desc">复制简介</button></div></section>
<section aria-labelledby="pr-h"><h2 id="pr-h">同风格视频提示词 <small>Reusable prompt</small></h2>
<p class="hint">把整段发给 Claude，只改最后的「视频标题」「目标时长」「知识点」，就能做出同样风格的视频。</p>
<pre id="prompt">{html.escape(prompt)}</pre>
<div class="row"><button class="ghost" data-copy="prompt">复制提示词</button><button class="ghost" id="save-md">保存为 .md 文件</button></div></section>"""
ctrl = '<button class="primary" id="go"{dis}>{label}</button><div class="bar" aria-hidden="true"><i id="fill"></i></div><p class="status" id="status" role="status">{msg}</p>'
la, lb = links.get('A', '#'), links.get('B', '#')
for mode in 'AB':
    page = open(W('relay.html'), encoding='utf-8').read()
    if mode == 'A':
        a_body = ctrl.format(dis='', label='保存前半部分', msg='点按钮开始下载，全部校验通过后弹出保存窗口。')
        b_body = f'<p><a href="{lb}" target="_blank" rel="noopener">打开网页 B →</a></p>'
    else:
        a_body = f'<p><a href="{la}" target="_blank" rel="noopener">还没保存？打开网页 A →</a></p>'
        b_body = ('<label class="file">选择「前半部分」文件<input type="file" id="pick" accept="video/mp4,.mp4"></label>'
                  + ctrl.format(dis=' disabled', label='合成并保存完整原片', msg='先选择第 1 步保存的文件。'))
    rep = {'__TITLE__': 'K线原片 · 网页' + mode, '__SUB__': '4K 60fps 原片 · ' + ('第 1 步：保存前半部分' if mode == 'A' else '第 2 步：合成完整原片'),
           '__A_HERE__': 'here' if mode == 'A' else '', '__B_HERE__': 'here' if mode == 'B' else '', '__A_BODY__': a_body, '__B_BODY__': b_body,
           '__FULL_MB__': f"{man['size'] / 1048576:.1f}", '__EXTRA__': extra if mode == 'B' else '', '__MODE__': mode,
           '__OWN__': json.dumps(own(A, urls) if mode == 'A' else own(B, urls_b)),
           '__PRIOR__': json.dumps([{'size': p['size'], 'sha': p['sha']} for p in A]) if mode == 'B' else '[]', '__FULL__': str(man['size'])}
    for k, v in rep.items(): page = page.replace(k, v)
    open(W(f'page_{mode.lower()}.html'), 'w', encoding='utf-8').write(page)
print('A pieces:', len(own(A, urls)), 'B pieces:', len(own(B, urls_b)), '/', len(B))

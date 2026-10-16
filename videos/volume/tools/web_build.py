"""Build web/page_{k}.html from web/plan.json.

Needs  web/asset_urls.json  {piece name: "/_blob/<id>"}  — every asset piece's url from the upload results
       web/links.json       ["https://claude.ai/artifact/…", …]  — page 1..N urls (may be partial at first publish)
Published-file pieces are referenced by their own name (they are published next to the page).

    python3 tools/web_build.py
"""
import html, json, os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W = lambda *p: os.path.join(ROOT, 'web', *p)
plan = json.load(open(W('plan.json')))
urls = json.load(open(W('asset_urls.json'))) if os.path.exists(W('asset_urls.json')) else {}
links = json.load(open(W('links.json'))) if os.path.exists(W('links.json')) else []
yt = json.load(open(W('youtube.json'), encoding='utf-8')) if os.path.exists(W('youtube.json')) else {}
tl = json.load(open(os.path.join(ROOT, 'timeline.json')))
title, N, pages = plan['title'], len(plan['pages']), plan['pages']
entries = lambda pg: [{'url': urls.get(p['name'], '__MISSING__'), 'size': p['size'], 'sha': p['sha']} for p in pg['assets']] + \
                     [{'url': p['name'], 'size': p['size'], 'sha': p['sha']} for p in pg['files']]
prompt = re.search(r'```\n(.*?)\n```', open(os.path.join(ROOT, 'STYLE_PROMPT.md'), encoding='utf-8').read(), re.S).group(1)
secs = tl['seconds']
missing = 0
for k in range(1, N + 1):
    own = entries(pages[k - 1]); missing += sum(e['url'] == '__MISSING__' for e in own)
    prior = [{'size': e['size'], 'sha': e['sha']} for pg in pages[:k - 1] for e in entries(pg)]
    steps = []
    for j in range(1, N + 1):
        here = ' here' if j == k else ''
        what = '保存第 1 段' if j == 1 else ('合成完整原片' if j == N else f'接上第 {j} 段')
        if j == k:
            ctl = ('' if k == 1 else '<label class="file">选择上一步保存的文件<input type="file" id="pick" accept="video/mp4,.mp4"></label>') + \
                  f'<button class="primary" id="go"{" disabled" if k > 1 else ""}>{"保存完整原片" if k == N else "下载并保存"}</button>' + \
                  '<div class="bar" aria-hidden="true"><i id="fill"></i></div><p class="status" id="status" role="status">' + \
                  ('点按钮开始下载，全部校验通过后弹出保存窗口。' if k == 1 else '先选择上一步保存的文件。') + '</p>'
        else:
            href = links[j - 1] if j - 1 < len(links) else '#'
            ctl = f'<p><a href="{href}" target="_blank" rel="noopener">打开第 {j} 步网页 →</a></p>'
        desc = '保存后先不用打开，下一步要用到它。' if j < N else '得到一个完整的 MP4，可直接上传 YouTube。'
        steps.append(f'<div class="step{here}"><span class="n">STEP {j} / {N}</span><h3>{what}</h3><p>{desc}</p>{ctl}</div>')
    extra = ''
    if k == N:
        extra = f'''<section aria-labelledby="yt-h"><h2 id="yt-h">YouTube 发布信息 <small>Upload kit</small></h2>
<pre id="yt-title">{html.escape(yt.get('title', title))}</pre><pre id="yt-desc">{html.escape(yt.get('description', ''))}</pre>
<div class="row"><button class="ghost" data-copy="yt-title">复制标题</button><button class="ghost" data-copy="yt-desc">复制简介</button></div></section>
<section aria-labelledby="pr-h"><h2 id="pr-h">同风格视频提示词 <small>Reusable prompt</small></h2>
<p class="hint">把整段发给 Claude，只改最后的「视频标题」「目标时长」「知识点」，就能做出同样风格的视频。</p>
<pre id="prompt">{html.escape(prompt)}</pre>
<div class="row"><button class="ghost" data-copy="prompt">复制提示词</button><button class="ghost" id="save-md">保存为 .md 文件</button></div></section>'''
    page = open(W('page_template.html'), encoding='utf-8').read()
    for a, b in {'__PAGE_TITLE__': f'{title[:12]} 原片 {k}/{N}', '__TITLE_JSON__': json.dumps(title, ensure_ascii=False), '__TITLE__': html.escape(title),
                 '__K__': str(k), '__N__': str(N), '__STEPS__': ''.join(steps), '__EXTRA__': extra,
                 '__DURATION__': f'{int(secs) // 60} 分 {int(secs) % 60:02d} 秒', '__FULL_MB__': f"{plan['size'] / 1048576:.1f}",
                 '__OWN__': json.dumps(own), '__PRIOR__': json.dumps(prior), '__FULL__': str(plan['size'])}.items():
        page = page.replace(a, b)
    open(W(f'page_{k}.html'), 'w', encoding='utf-8').write(page)
print(f'{N} pages built; asset urls missing: {missing}')

"""Scaffold a new film from the 《K线与动能博弈》 engine (same watermark, background, motion, score, end-card logo).

    python3 kline-video/tools/new_video.py <slug> "<中文标题>"     → videos/<slug>/
"""
import os, shutil, sys
SRC = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
slug, title = sys.argv[1], sys.argv[2]
DST = os.path.join(os.path.dirname(SRC), 'videos', slug)
os.makedirs(os.path.join(DST, 'web'), exist_ok=True)
for f in ('index.html', 'render.mjs', 'STYLE_PROMPT.md'):
    shutil.copy(os.path.join(SRC, f), DST)
shutil.copytree(os.path.join(SRC, 'tools'), os.path.join(DST, 'tools'), dirs_exist_ok=True)
shutil.copytree(os.path.join(SRC, 'assets'), os.path.join(DST, 'assets'), dirs_exist_ok=True)
shutil.copy(os.path.join(SRC, 'web', 'page_template.html'), os.path.join(DST, 'web'))
shutil.copy(os.path.join(SRC, 'script.js'), os.path.join(DST, 'script.example.js'))   # the reference film: read it, reuse its patterns
src = open(os.path.join(SRC, 'script.js'), encoding='utf-8').read()
src = src.replace("title: 'K线与动能博弈'", f"title: {title!r}")
open(os.path.join(DST, 'script.js'), 'w', encoding='utf-8').write(src)                # start from the reference; rewrite the scenes
print('created', os.path.relpath(DST, os.path.dirname(SRC)))

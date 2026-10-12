"""Subset the film's fonts to exactly the glyphs index.html uses and inline them
(base64 woff2) between the /*@fonts-begin*/ /*@fonts-end*/ markers, so the page
stays one self-contained file. Re-run after editing on-screen text.

    python3 tools/fonts.py
"""
import base64, io, os, re
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'fonts-src')
HTML = os.path.join(ROOT, 'index.html')

FACES = [  # family, weight, style, file
    ('Song', 400, 'normal', 'noto-serif-sc-chinese-simplified-400-normal.woff2'),   # 思源宋体
    ('SongB', 600, 'normal', 'noto-serif-sc-chinese-simplified-600-normal.woff2'),
    ('SongJP', 400, 'normal', 'noto-serif-jp-47-400-normal.woff2'),                 # 只为「匁」
    ('Play', 400, 'normal', 'playfair-display-latin-400-normal.woff2'),             # 年份与数字
    ('GaraI', 400, 'italic', 'eb-garamond-latin-400-italic.woff2'),                 # 拉丁文书名
    ('Gara', 400, 'normal', 'eb-garamond-latin-400-normal.woff2'),
]

def freeze(font, feats):
    """Canvas 2D can't set font-variant-numeric, so remap the cmap through the
    font's own single-substitution lookups for the given features."""
    gsub = font['GSUB'].table
    for tag in feats:
        idx = {i for fr in gsub.FeatureList.FeatureRecord if fr.FeatureTag == tag for i in fr.Feature.LookupListIndex}
        for li in sorted(idx):
            for st in gsub.LookupList.Lookup[li].SubTable:
                st = st.ExtSubTable if hasattr(st, 'ExtSubTable') else st
                if not hasattr(st, 'mapping'): continue
                for t in font['cmap'].tables:
                    for cp, g in list(t.cmap.items()):
                        if g in st.mapping: t.cmap[cp] = st.mapping[g]

html = open(HTML, encoding='utf-8').read()
body = re.sub(r'/\*@fonts-begin\*/.*?/\*@fonts-end\*/', '', html, flags=re.S)
text = ''.join(sorted(set(body) | set(chr(c) for c in range(0x20, 0x7F))))

css = []
for fam, wt, style, fn in FACES:
    font = TTFont(os.path.join(SRC, fn))
    if fam == 'Play': freeze(font, ['lnum', 'tnum'])   # lining + tabular digits baked into the cmap
    cmap = font.getBestCmap()
    used = ''.join(c for c in text if ord(c) in cmap)
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']
    sub = subset.Subsetter(opts); sub.populate(text=used); sub.subset(font)
    buf = io.BytesIO(); font.flavor = 'woff2'; font.save(buf)
    b64 = base64.b64encode(buf.getvalue()).decode()
    css.append(f"@font-face{{font-family:'{fam}';font-weight:{wt};font-style:{style};src:url(data:font/woff2;base64,{b64}) format('woff2')}}")
    print(f'{fam:7s} {wt} {style:6s} {len(used):5d} glyphs  {len(buf.getvalue()) // 1024} KB')

block = '/*@fonts-begin*/\n' + '\n'.join(css) + '\n/*@fonts-end*/'
html = re.sub(r'/\*@fonts-begin\*/.*?/\*@fonts-end\*/', lambda m: block, html, flags=re.S)
open(HTML, 'w', encoding='utf-8').write(html)

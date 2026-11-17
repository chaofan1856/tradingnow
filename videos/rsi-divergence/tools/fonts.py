"""Subset the film's fonts to exactly the glyphs index.html + script.js use and inline
them (base64 woff2) between the /*@fonts-begin*/ /*@fonts-end*/ markers, so the page
stays self-contained. Re-run after editing any on-screen text.

    python3 tools/fonts.py
"""
import base64, io, os, re
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'fonts-src')
HTML = os.path.join(ROOT, 'index.html')

FACES = [  # family, weight, file, which glyphs
    ('SerifSC', 500, 'noto-serif-sc-chinese-simplified-500-normal.woff2', 'all'),
    ('SerifSC', 700, 'noto-serif-sc-chinese-simplified-700-normal.woff2', 'all'),
    ('SerifSC', 900, 'noto-serif-sc-chinese-simplified-900-normal.woff2', 'all'),
    ('LatinSerif', 500, 'cormorant-garamond-latin-500-normal.woff2', 'latin'),
    ('MonoL', 300, 'ibm-plex-mono-latin-300-normal.woff2', 'latin'),
    ('BrandSans', 600, 'InterDisplay-SemiBold.otf', 'latin'),
]

html = open(HTML, encoding='utf-8').read()
body = re.sub(r'/\*@fonts-begin\*/.*?/\*@fonts-end\*/', '', html, flags=re.S) + open(os.path.join(ROOT, 'script.js'), encoding='utf-8').read()
latin = ''.join(chr(c) for c in range(0x20, 0x7F)) + '·—–‘’“”…×≈'
used = ''.join(sorted({c for c in body if ord(c) > 0x7F} | set(latin)))

css = []
for fam, wt, fn, which in FACES:
    font = TTFont(os.path.join(SRC, fn))
    opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']
    sub = subset.Subsetter(opts); sub.populate(text=used if which == 'all' else latin); sub.subset(font)
    buf = io.BytesIO(); font.flavor = 'woff2'; font.save(buf)
    b64 = base64.b64encode(buf.getvalue()).decode()
    css.append(f"@font-face{{font-family:'{fam}';font-weight:{wt};src:url(data:font/woff2;base64,{b64}) format('woff2')}}")
    print(f'{fam} {wt}: {len(buf.getvalue()) // 1024} KB')

block = '/*@fonts-begin*/\n' + '\n'.join(css) + '\n/*@fonts-end*/'
html = re.sub(r'/\*@fonts-begin\*/.*?/\*@fonts-end\*/', lambda m: block, html, flags=re.S)
open(HTML, 'w', encoding='utf-8').write(html)
print('glyphs:', len(used))

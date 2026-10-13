"""Subset the film's fonts to exactly the glyphs index.html uses and inline them
(base64 woff2) between the /*@fonts-begin*/ /*@fonts-end*/ markers, so the page
stays a single self-contained file. Re-run after editing on-screen text.

    ./tools/fetch-fonts.sh   # once: source fonts from npm into tools/fonts-src/
    python3 tools/fonts.py

Noto Serif SC ships as ~100 unicode slices (plus one Noto Serif JP slice for
the kokuji 匁, which the SC build lacks); every slice that holds a glyph we
need becomes its own @font-face with an exact unicode-range.
"""
import base64, glob, io, os, re
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'tools', 'fonts-src')
HTML = os.path.join(ROOT, 'index.html')

FACES = [  # family, weight, style, source glob(s)
    ('SongSC', 400, 'normal', ['noto-serif-sc-*-400-normal.woff2', 'noto-serif-jp-47-400-normal.woff2']),
    ('SongSC', 600, 'normal', ['noto-serif-sc-*-600-normal.woff2', 'noto-serif-jp-47-600-normal.woff2']),
    ('Play', 400, 'normal', ['playfair-display-latin-400-normal.woff2', 'playfair-display-latin-ext-400-normal.woff2']),
    ('Play', 400, 'italic', ['playfair-display-latin-400-italic.woff2', 'playfair-display-latin-ext-400-italic.woff2']),
]

html = open(HTML, encoding='utf-8').read()
body = re.sub(r'/\*@fonts-begin\*/.*?/\*@fonts-end\*/', '', html, flags=re.S)
need = sorted({c for c in body if ord(c) >= 0x20 and c not in '\r\n\t'} | set(chr(c) for c in range(0x20, 0x7F)))

css, total = [], 0
for fam, wt, style, globs in FACES:
    files = [f for g in globs for f in sorted(glob.glob(os.path.join(SRC, g)))]   # glob order = priority
    left, per_file = list(need), {}
    for fn in files:
        cmap = TTFont(fn).getBestCmap()
        hit = [c for c in left if ord(c) in cmap]
        if hit:
            per_file[fn] = hit
            left = [c for c in left if c not in hit]
    if fam == 'SongSC':
        miss = [c for c in left if ord(c) > 0x2000]
        if miss: print(f'  !! {fam} {wt} missing: {"".join(miss)}')
    for fn, chars in per_file.items():
        font = TTFont(fn)
        opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']
        sub = subset.Subsetter(opts); sub.populate(text=''.join(chars)); sub.subset(font)
        buf = io.BytesIO(); font.flavor = 'woff2'; font.save(buf)
        total += len(buf.getvalue())
        rng = ','.join(f'U+{ord(c):04X}' for c in chars)
        b64 = base64.b64encode(buf.getvalue()).decode()
        css.append(f"@font-face{{font-family:'{fam}';font-weight:{wt};font-style:{style};unicode-range:{rng};"
                   f"src:url(data:font/woff2;base64,{b64}) format('woff2')}}")
    print(f'{fam} {wt} {style}: {len(per_file)} slice(s)')

block = '/*@fonts-begin*/\n' + '\n'.join(css) + '\n/*@fonts-end*/'
html = re.sub(r'/\*@fonts-begin\*/.*?/\*@fonts-end\*/', lambda m: block, html, flags=re.S)
open(HTML, 'w', encoding='utf-8').write(html)
print(f'glyph set: {len(need)} chars, fonts total {total // 1024} KB')

"""Build-time prep for index.html:
  1. timeline.json -> build/timeline.js  (window.TL, so the page works from file://)
  2. fonts.css: Noto Serif SC + Cormorant Garamond subset to exactly the glyphs the film uses,
     inlined as base64 woff2. Font sources come from the @fontsource npm packages:
       npm pack @fontsource/noto-serif-sc @fontsource/cormorant-garamond   (extract, pass the dir)

    python3 tools/prep.py [FONTSOURCE_DIR]     (fonts are only rebuilt when the dir is given)
"""
import base64, glob, io, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(ROOT, 'build'), exist_ok=True)
TL = json.load(open(os.path.join(ROOT, 'timeline.json'), encoding='utf-8'))
open(os.path.join(ROOT, 'build', 'timeline.js'), 'w', encoding='utf-8').write('window.TL = ' + json.dumps(TL, ensure_ascii=False) + ';\n')
print('build/timeline.js', TL['total'], 's')

if len(sys.argv) > 1:
    from fontTools import subset
    from fontTools.ttLib import TTFont
    src = sys.argv[1]
    find = lambda name: glob.glob(os.path.join(src, '**', name), recursive=True)[0]
    corpus = ''.join(open(p, encoding='utf-8').read() for p in
                     [os.path.join(ROOT, 'index.html'), *glob.glob(os.path.join(ROOT, 'src', '*.js'))]) + json.dumps(TL, ensure_ascii=False)
    cjk = ''.join(sorted({c for c in corpus if ord(c) > 0x2000})) + '，。、；：？！「」《》—…·（）'
    latin = ''.join(chr(c) for c in range(0x20, 0x7F)) + '·—–‘’“”…×⅓%€£¥₿↑↓→'
    FACES = [('NotoSerifSub', 300, 'normal', 'noto-serif-sc-chinese-simplified-300-normal.woff2', cjk),
             ('NotoSerifSub', 400, 'normal', 'noto-serif-sc-chinese-simplified-400-normal.woff2', cjk),
             ('NotoSerifSub', 500, 'normal', 'noto-serif-sc-chinese-simplified-500-normal.woff2', cjk),
             ('NotoSerifSub', 600, 'normal', 'noto-serif-sc-chinese-simplified-600-normal.woff2', cjk),
             ('NotoSerifSub', 700, 'normal', 'noto-serif-sc-chinese-simplified-700-normal.woff2', cjk),
             ('CormorantSub', 300, 'italic', 'cormorant-garamond-latin-300-italic.woff2', latin),
             ('CormorantSub', 400, 'normal', 'cormorant-garamond-latin-400-normal.woff2', latin),
             ('CormorantSub', 500, 'normal', 'cormorant-garamond-latin-500-normal.woff2', latin),
             ('CormorantSub', 400, 'italic', 'cormorant-garamond-latin-400-italic.woff2', latin),
             ('CormorantSub', 500, 'italic', 'cormorant-garamond-latin-500-italic.woff2', latin)]
    css = []
    for fam, wt, st, fn, chars in FACES:
        font = TTFont(find(fn))
        cmap = font.getBestCmap()
        missing = [c for c in chars if ord(c) not in cmap and not c.isspace()]
        if missing: print(f'  {fn}: no glyph for {"".join(missing)}')
        opts = subset.Options(); opts.flavor = 'woff2'; opts.layout_features = ['*']; opts.name_IDs = ['*']
        s = subset.Subsetter(opts); s.populate(text=chars); s.subset(font)
        buf = io.BytesIO(); font.flavor = 'woff2'; font.save(buf)
        css.append(f"@font-face{{font-family:'{fam}';font-weight:{wt};font-style:{st};src:url(data:font/woff2;base64,{base64.b64encode(buf.getvalue()).decode()}) format('woff2')}}")
        print(f'{fam} {wt} {st}: {len(buf.getvalue()) // 1024} KB')
        # rare characters live in fontsource's numbered unicode-range files
        if fam == 'NotoSerifSub' and missing:
            for f in sorted(glob.glob(os.path.join(src, '**', f'noto-serif-sc-[0-9]*-{wt}-normal.woff2'), recursive=True)):
                ft = TTFont(f); have = ''.join(c for c in missing if ord(c) in ft.getBestCmap())
                if not have: continue
                s2 = subset.Subsetter(opts); s2.populate(text=have); s2.subset(ft); b2 = io.BytesIO(); ft.flavor = 'woff2'; ft.save(b2)
                rng_ = ','.join(f'U+{ord(c):X}' for c in have)
                css.append(f"@font-face{{font-family:'{fam}';font-weight:{wt};font-style:{st};unicode-range:{rng_};src:url(data:font/woff2;base64,{base64.b64encode(b2.getvalue()).decode()}) format('woff2')}}")
                print(f'   + {have} from {os.path.basename(f)}')
    # serif CJK fallback for the Latin glyphs inside Chinese text
    open(os.path.join(ROOT, 'fonts.css'), 'w').write('\n'.join(css) + '\n')
    print('CJK glyphs:', len(cjk))

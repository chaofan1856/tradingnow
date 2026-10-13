"""Contact sheet of stills/: python3 tools/sheet.py out.png s00090 s00300 …"""
import sys, os
from PIL import Image, ImageDraw
out, names = sys.argv[1], sys.argv[2:]
W, H, cols = 640, 360, 3
rows = (len(names) + cols - 1) // cols
sheet = Image.new('RGB', (W * cols, H * rows), (40, 40, 40))
d = ImageDraw.Draw(sheet)
for i, n in enumerate(names):
    im = Image.open(os.path.join('stills', n + '.png')).convert('RGB').resize((W, H), Image.LANCZOS)
    sheet.paste(im, ((i % cols) * W, (i // cols) * H))
    d.text(((i % cols) * W + 6, (i // cols) * H + 4), n, fill=(255, 80, 80))
sheet.save(out)

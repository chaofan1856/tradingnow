"""Plan the download pages for the master: split it into pieces and assign them to pages.

Each page = up to ASSETS pieces of 19 MiB (artifact asset store, ~1 GB per page)
          + up to FILES pieces of 15 MiB (published alongside the page, ≤16 MB each, ≤256 MB per page).
Writes web/pieces/pg{k}_a{nn}.mp4 / pg{k}_f{nn}.mp4 and web/plan.json.

    python3 tools/web_plan.py            (after tools/assemble.py)
"""
import hashlib, json, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tl = json.load(open(os.path.join(ROOT, 'timeline.json')))
SRC = os.path.join(ROOT, '成片', f"{tl['title']}_4K60.mp4")
A, F, ASSETS, FILES = 19 << 20, 15 << 20, 40, 17          # 17 × 15 MiB = 255 MiB of published files per page (limit 256)
out = os.path.join(ROOT, 'web', 'pieces'); os.makedirs(out, exist_ok=True)
for f in os.listdir(out): os.remove(os.path.join(out, f))
size, full, pages = os.path.getsize(SRC), hashlib.sha256(), []
with open(SRC, 'rb') as fh:
    while fh.tell() < size:
        k = len(pages) + 1; pg = {'assets': [], 'files': []}
        for kind, cap, n in (('assets', A, ASSETS), ('files', F, FILES)):
            for i in range(n):
                b = fh.read(cap)
                if not b: break
                full.update(b); name = f"pg{k}_{kind[0]}{i + 1:02d}.mp4"
                open(os.path.join(out, name), 'wb').write(b)
                pg[kind].append({'name': name, 'size': len(b), 'sha': hashlib.sha256(b).hexdigest()})
        pages.append(pg)
json.dump({'title': tl['title'], 'size': size, 'sha': full.hexdigest(), 'pages': pages}, open(os.path.join(ROOT, 'web', 'plan.json'), 'w'), ensure_ascii=False, indent=1)
print(f"{size / 1048576:.0f} MB → {len(pages)} pages: " + ', '.join(f"p{k + 1}: {len(p['assets'])} assets + {len(p['files'])} files" for k, p in enumerate(pages)))

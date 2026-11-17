# Make sure no download piece starts with '<' (the asset store refuses those as markup): move bytes onto the previous piece.
import json, hashlib, os, sys
W = sys.argv[1]; p = json.load(open(f'{W}/plan.json')); A = p['pages'][0]['assets']
for i in range(1, len(A)):
    cur = open(f"{W}/pieces/{A[i]['name']}", 'rb').read()
    k = 0
    while cur[k:k + 1] in (b'<', b' ', b'\t', b'\n', b'\r'): k += 1
    if k:
        prev = open(f"{W}/pieces/{A[i-1]['name']}", 'rb').read() + cur[:k]; cur = cur[k:]
        open(f"{W}/pieces/{A[i-1]['name']}", 'wb').write(prev); open(f"{W}/pieces/{A[i]['name']}", 'wb').write(cur)
        for j, d in ((i - 1, prev), (i, cur)): A[j]['size'] = len(d); A[j]['sha'] = hashlib.sha256(d).hexdigest()
        print('moved', k, 'byte(s) into', A[i-1]['name'])
json.dump(p, open(f'{W}/plan.json', 'w'), ensure_ascii=False, indent=1)
h = hashlib.sha256(); n = 0
for e in A: d = open(f"{W}/pieces/{e['name']}", 'rb').read(); h.update(d); n += len(d)
print('ok' if n == p['size'] and h.hexdigest() == p['sha'] else 'MISMATCH')

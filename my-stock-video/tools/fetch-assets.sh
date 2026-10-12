#!/usr/bin/env bash
# Download the five public-domain / CC0 prints from Wikimedia Commons into 素材/.
# Wikimedia rate-limits originals and non-standard sizes by IP, so the photos come from the
# standard 1280px thumbnail tier on upload.wikimedia.org (URL derived from the file name's md5),
# with a descriptive User-Agent and a pause between requests.
set -euo pipefail
cd "$(dirname "$0")/../素材"
UA="what-is-a-stock-video/1.0 (https://github.com/chaofan1856/tradingnow; educational explainer)"
url() {  # $1 = Commons file name, $2 = thumbnail width (empty = original)
  python3 - "$1" "$2" <<'EOF'
import hashlib, sys, urllib.parse
f = sys.argv[1].replace(' ', '_'); h = hashlib.md5(f.encode()).hexdigest(); q = urllib.parse.quote(f)
base = 'https://upload.wikimedia.org/wikipedia/commons'
print(f'{base}/thumb/{h[0]}/{h[:2]}/{q}/{sys.argv[2]}px-{q}' if sys.argv[2] else f'{base}/{h[0]}/{h[:2]}/{q}')
EOF
}
get() {  # $1 = local name, $2 = Commons file name, $3 = width (empty = original)
  [ -s "$1" ] && { echo "have $1"; return 0; }
  local u code; u=$(url "$2" "${3-}")
  for i in 1 2 3 4; do
    code=$(curl -sS -L -A "$UA" -o "$1.part" -w '%{http_code}' "$u") || code=000
    if [ "$code" = 200 ]; then mv "$1.part" "$1"; echo "ok   $1"; sleep 2; return 0; fi
    echo "  $1: HTTP $code, retry in $((i * 15))s" >&2; sleep $((i * 15))
  done
  rm -f "$1.part"; echo "FAIL $1  ($u)" >&2; return 1
}
get share-certificate.jpg        "Share certificate of Oriental Bank Corporation.jpg" 1280
get amsterdam-exchange.jpg       "Engraving depicting the Amsterdam Stock Exchange, built by Hendrik de Keyser c. 1612.jpg" 1280
get hogarth-south-sea-scheme.jpg "William Hogarth, The South Sea Scheme, 1721, NGA 30435.jpg" 1280
get newton-kneller.jpg           "GodfreyKneller-IsaacNewton-1689.jpg" 1280
get voc.svg                      "VOC.svg"

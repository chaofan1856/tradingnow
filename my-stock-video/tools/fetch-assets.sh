#!/usr/bin/env bash
# Download the five public-domain / CC0 prints from Wikimedia Commons into 素材/.
set -euo pipefail
cd "$(dirname "$0")/../素材"
get() {  # $1 = local name, $2 = Commons file name
  local enc; enc=$(python3 -c 'import sys,urllib.parse;print(urllib.parse.quote(sys.argv[1]))' "$2")
  curl -fSL --retry 3 -A "what-is-a-stock-video/1.0" -o "$1" "https://commons.wikimedia.org/wiki/Special:FilePath/${enc}?width=1400"
  echo "ok  $1"
}
get share-certificate.jpg        "Share certificate of Oriental Bank Corporation.jpg"
get amsterdam-exchange.jpg       "Engraving depicting the Amsterdam Stock Exchange, built by Hendrik de Keyser c. 1612.jpg"
get hogarth-south-sea-scheme.jpg "William Hogarth, The South Sea Scheme, 1721, NGA 30435.jpg"
get newton-kneller.jpg           "GodfreyKneller-IsaacNewton-1689.jpg"
curl -fSL --retry 3 -A "what-is-a-stock-video/1.0" -o voc.svg "https://commons.wikimedia.org/wiki/Special:FilePath/VOC.svg" && echo "ok  voc.svg"

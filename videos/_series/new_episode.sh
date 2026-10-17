#!/usr/bin/env bash
# Scaffold the next 《K线形态深度课》 episode from the latest one (2K60 engine, watermark, fonts, music, download page).
#   bash videos/_series/new_episode.sh <slug> "<中文标题>"      e.g.  kline-patterns-4 "K线形态深度课（四）"
set -euo pipefail
SLUG="$1"; TITLE="$2"
V="$(cd "$(dirname "$0")/.." && pwd)"; SRC="$V/kline-patterns-3"; DST="$V/$SLUG"
[ -e "$DST" ] && { echo "exists: $DST"; exit 1; }
mkdir -p "$DST/web"
cp "$SRC/index.html" "$SRC/render.mjs" "$SRC/STYLE_PROMPT.md" "$DST/"
cp -r "$SRC/tools" "$SRC/assets" "$DST/"
cp "$V/_series/music.py" "$DST/tools/music.py"
cp "$SRC/web/page_template.html" "$DST/web/"
cp "$SRC/script.js" "$DST/script.example.js"          # the reference episode: reuse its helpers, scene builders and finale
echo '[]' > "$DST/sfx.json"
sed "s/K线形态深度课（三）/$TITLE/g" "$SRC/script.js" > "$DST/script.js"
echo "created videos/$SLUG — rewrite script.js (and sfx.json), then: bash videos/_series/render.sh $SLUG"

#!/usr/bin/env bash
# Render the two covers: cover-3x4.png (1500×2000) and cover-4x3.png (2000×1500).
set -euo pipefail
cd "$(dirname "$0")"
CHROME="${CHROME_PATH:-$(ls /opt/pw-browsers/chromium-*/chrome-linux*/chrome 2>/dev/null | head -1 || true)}"
[[ -x "$CHROME" ]] || CHROME=$(command -v chromium || command -v google-chrome)
# headless Chrome's viewport is a little shorter than --window-size, so render taller and crop to the exact size
shot() { "$CHROME" --headless=new --no-sandbox --hide-scrollbars --force-device-scale-factor=1 --allow-file-access-from-files \
  --virtual-time-budget=4000 --window-size="$2,$(( $3 + 300 ))" --screenshot="$PWD/.tmp.png" "file://$PWD/cover.html?r=$1" 2>/dev/null
  ffmpeg -loglevel error -y -i .tmp.png -vf "crop=$2:$3:0:0" "$4"; rm -f .tmp.png; }
shot 34 1500 2000 cover-3x4.png
shot 43 2000 1500 cover-4x3.png
for f in cover-3x4 cover-4x3; do ffmpeg -loglevel error -y -i $f.png -q:v 2 $f.jpg; done
ls -la cover-*

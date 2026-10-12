#!/usr/bin/env bash
# 一步出片：帧 → 声音 → mp4
#   ./build.sh            整片 2340 帧   → 成片/market.mp4
#   ./build.sh --to 420   只做前 N 帧    → 成片/preview-0-420.mp4
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "需要 ffmpeg"; exit 1; }
command -v node   >/dev/null || { echo "需要 Node 22+"; exit 1; }

N=2340; OUT="成片/market.mp4"
if [[ "${1:-}" == "--to" ]]; then N="$2"; OUT="成片/preview-0-${2}.mp4"; fi

node render.mjs "$@"
node tools/sound.mjs --frames "$N"
mkdir -p 成片
ffmpeg -y -loglevel error -framerate 30 -i frames/f%05d.jpg -i 混音.wav \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset medium -movflags +faststart \
  -c:a aac -b:a 192k -shortest "$OUT"
echo "wrote $OUT"

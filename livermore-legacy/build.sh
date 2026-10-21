#!/usr/bin/env bash
# 华尔街唯一的投机之王 · 杰西·利弗莫尔 — 58 s, 2560×1440 @30fps, music only.
#   ./build.sh                     full film → 成片/livermore-legacy-2k.mp4
#   ./build.sh --stills 30,300     spot-check frames → stills/
# Portrait: assets/photos/portrait.jpg (framing in assets/photos/framing.js).
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "ffmpeg not found"; exit 1; }
command -v node   >/dev/null || { echo "node (22+) not found"; exit 1; }
node render.mjs "$@"
[[ "${1:-}" == "--stills" ]] && exit 0
OUT="成片/livermore-legacy-2k.mp4"
if [[ "${1:-}" == "--to" ]]; then OUT="成片/preview-first-${2}.mp4"; fi
mkdir -p 成片
ffmpeg -y -loglevel error -framerate 30 -i frames/f%05d.jpg -i assets/music.flac \
  -c:v libx264 -pix_fmt yuv420p -crf 19 -preset slow -tune grain -profile:v high -level 5.1 -movflags +faststart \
  -c:a aac -b:a 256k -shortest "$OUT"
echo "wrote $OUT"

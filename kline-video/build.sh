#!/usr/bin/env bash
# One step: timeline → original score → parallel 4K segments → final mp4 for YouTube.
#   ./build.sh                    full 4K 60fps film (4 parallel workers)                → 成片/K线与动能博弈_4K.mp4
#   ./build.sh --preview          fast 1080p check             → 成片/preview-1080p.mp4
#   ./build.sh --only up,down     re-render just those scenes (rest from cache), then re-stitch
#   ./build.sh --workers 6        more parallel tabs on a bigger machine
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "ffmpeg not found"; exit 1; }
command -v node   >/dev/null || { echo "node 22+ not found"; exit 1; }

python3 tools/fonts.py >/dev/null            # re-subset fonts in case on-screen text changed
node render.mjs --timeline
python3 tools/score.py                       # music is re-timed to the current timeline
node render.mjs --workers 4 "$@"

mkdir -p 成片
if [[ " $* " == *" --preview "* ]]; then IN=video-preview.mp4; OUT="成片/preview-1080p.mp4"; AB=192k
else IN=video.mp4; OUT="成片/K线与动能博弈_4K.mp4"; AB=384k; fi
ffmpeg -y -loglevel error -i "$IN" -i bgm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a "$AB" -ar 48000 \
  -metadata title="K线与动能博弈" -metadata artist="TradingNow" -movflags +faststart -shortest "$OUT"
echo "wrote $OUT"

#!/usr/bin/env bash
# 大师列传 · 杰西·利弗莫尔 — 58 s, 2560×1440 @30fps.
#   ./build.sh            full film       → 成片/livermore-2k.mp4
#   ./build.sh --to 300   first N frames  → 成片/preview-first-300.mp4
#   ./build.sh --stills 1,200,900   spot-check frames → stills/
# Narration (assets/vo.wav + timeline.js) is pre-generated; re-make it with
#   KOKORO_DIR=… python3 tools/vo.py
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "ffmpeg not found"; exit 1; }
command -v node   >/dev/null || { echo "node (22+) not found"; exit 1; }

node render.mjs "$@"
[[ "${1:-}" == "--stills" ]] && exit 0

# Mix: score ducked under the narration (sidechain), narration on top, limiter.
ffmpeg -y -loglevel error -i assets/music.flac -i assets/vo.wav -filter_complex \
  "[1:a]aresample=44100,aformat=channel_layouts=stereo,asplit=2[vo][key];\
   [0:a]volume=0.85[m];[m][key]sidechaincompress=threshold=0.025:ratio=6:attack=15:release=380:makeup=1[md];\
   [md][vo]amix=inputs=2:normalize=0,alimiter=limit=0.94[a]" -map "[a]" -t 58 mix.wav

OUT="成片/livermore-2k.mp4"
if [[ "${1:-}" == "--to" ]]; then OUT="成片/preview-first-${2}.mp4"; fi
mkdir -p 成片
ffmpeg -y -loglevel error -framerate 30 -i frames/f%05d.jpg -i mix.wav \
  -c:v libx264 -pix_fmt yuv420p -crf 16 -preset slow -profile:v high -level 5.1 -movflags +faststart \
  -c:a aac -b:a 256k -shortest "$OUT"
echo "wrote $OUT"

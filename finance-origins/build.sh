#!/usr/bin/env bash
# 《金融的起源》 one-step build: score (if missing) → deterministic CDP frame render → encode → mix
#   ./build.sh            → out/金融的起源.mp4
#   ./build.sh --mix      only re-mix audio (e.g. after putting a track in music/ or MUSIC=…)
set -euo pipefail
cd "$(dirname "$0")"
if [[ "${1:-}" == "--mix" ]]; then python3 tools/mix.py; exit 0; fi
[[ -f bgm.wav && -f sfx/years.wav ]] || python3 tools/score.py
node render.mjs                                   # → frames/f00000.jpg … f02939.jpg (resumable)
mkdir -p out
ffmpeg -y -loglevel error -framerate 30 -i frames/f%05d.jpg -frames:v 2940 \
  -c:v libx264 -preset medium -crf 17 -pix_fmt yuv420p -r 30 -movflags +faststart out/video-only.mp4
python3 tools/mix.py

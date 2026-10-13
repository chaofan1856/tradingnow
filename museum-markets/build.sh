#!/usr/bin/env bash
# 《认识交易市场》 one-step build:
#   score (if missing) → deterministic CDP frame render → ffmpeg mux/mix
#   ./build.sh                 → out/认识交易市场.mp4
#   ./build.sh --score         only re-synthesise bgm.wav + sfx/
#   ./build.sh --mix           only re-mix audio onto out/video-only.mp4 (e.g. after adding music/)
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "ffmpeg not found"; exit 1; }
command -v node >/dev/null || { echo "node 22+ not found"; exit 1; }

if [[ "${1:-}" == "--score" ]]; then python3 tools/score.py; exit 0; fi
if [[ "${1:-}" == "--mix" ]]; then ./tools/mix.sh; exit 0; fi
[[ -f bgm.wav && -f sfx/ding.wav ]] || python3 tools/score.py

node render.mjs                                   # → frames/f00000.jpg … f02339.jpg (resumable)
mkdir -p out
ffmpeg -y -loglevel error -framerate 30 -i frames/f%05d.jpg -frames:v 2340 \
  -c:v libx264 -preset medium -crf 17 -pix_fmt yuv420p -r 30 -movflags +faststart out/video-only.mp4
./tools/mix.sh

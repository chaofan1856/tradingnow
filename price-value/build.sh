#!/usr/bin/env bash
# 《重新理解价格与价值》 one-step build.
#   ./build.sh REFERENCE.mp4 [FONTSOURCE_DIR]
# Needs: ffmpeg, node 22 + playwright, python3 with numpy scipy soundfile librosa (fonttools brotli for fonts).
set -euo pipefail
cd "$(dirname "$0")"
REF="$1"; FONTS="${2:-}"
mkdir -p build out
python3 tools/timeline.py "$REF"          # score (bells removed, extended on-beat) + reading-time timeline
python3 tools/prep.py $FONTS              # build/timeline.js (+ fonts.css)
node tools/cues.mjs                       # sound cues from the page → build/cues.json
python3 tools/sfx.py                      # synthesised sound design + mix → build/mix.wav
tools/master4k.sh                         # 4K60: 4 GOP-aligned segments rendered + encoded, joined losslessly
cp build/subtitles.srt out/重新理解价格与价值.srt
echo "wrote out/重新理解价格与价值_4K60.mp4"

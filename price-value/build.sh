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
node render.mjs                           # 60 fps frames
VF="[1:v]format=rgba,fade=in:st=0.6:d=1.0:alpha=1[wm];[0:v][wm]overlay=80:0:shortest=1,format=yuv420p[v]"
ffmpeg -v error -y -framerate 60 -i build/frames/f%05d.jpg -loop 1 -framerate 60 -i watermark.png -filter_complex "$VF" \
  -map "[v]" -c:v libx264 -preset medium -b:v 6000k -maxrate 10M -bufsize 20M -profile:v high -tune film -g 120 -pass 1 -passlogfile build/x2 -an -f null /dev/null
ffmpeg -v error -y -framerate 60 -i build/frames/f%05d.jpg -loop 1 -framerate 60 -i watermark.png -i build/mix.wav -filter_complex "$VF" \
  -map "[v]" -map 2:a -c:v libx264 -preset medium -b:v 6000k -maxrate 10M -bufsize 20M -profile:v high -tune film -g 120 -pass 2 -passlogfile build/x2 \
  -c:a aac -b:a 192k -shortest -movflags +faststart out/重新理解价格与价值.mp4
cp build/subtitles.srt out/重新理解价格与价值.srt
echo "wrote out/重新理解价格与价值.mp4"

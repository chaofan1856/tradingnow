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
# delivery: HEVC Main10 (no banding in the dark gradients), 2-pass sized for a ~250 MB file
VF="[1:v]format=rgba,fade=in:st=0.6:d=1.0:alpha=1[wm];[0:v][wm]overlay=80:0:shortest=1,format=yuv420p10le[v]"
XP="keyint=120:min-keyint=60:vbv-maxrate=14000:vbv-bufsize=28000:aq-mode=3:psy-rd=2.0:psy-rdoq=1.5:no-sao=1:deblock=-1,-1:log-level=error"
ffmpeg -v error -y -framerate 60 -i build/frames/f%05d.jpg -loop 1 -framerate 60 -i watermark.png -filter_complex "$VF" -map "[v]" \
  -c:v libx265 -preset medium -b:v 7500k -x265-params "pass=1:stats=build/hevc.stats:$XP" -an -f null /dev/null
ffmpeg -v error -y -framerate 60 -i build/frames/f%05d.jpg -loop 1 -framerate 60 -i watermark.png -i build/mix.wav -filter_complex "$VF" -map "[v]" -map 2:a \
  -c:v libx265 -preset medium -b:v 7500k -x265-params "pass=2:stats=build/hevc.stats:$XP" -tag:v hvc1 \
  -c:a aac -b:a 256k -shortest -movflags +faststart out/重新理解价格与价值.mp4
cp build/subtitles.srt out/重新理解价格与价值.srt
echo "wrote out/重新理解价格与价值.mp4"

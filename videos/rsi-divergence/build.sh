#!/usr/bin/env bash
# One step: voice-timed script → timeline → narration track → parallel 2K segments → final mp4.
#   ./build.sh                    full 2560×1440 60fps film (4 parallel workers)   → 成片/RSI背离实战_2K60.mp4
#   ./build.sh --preview          fast 1080p check                                 → 成片/preview-1080p.mp4
#   ./build.sh --only top,case2   re-render just those scenes (rest from cache), then re-stitch
# The narration (voice/t_*.wav + voice/timing.json) comes from tools/voice.py and tools/align.py.
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "ffmpeg not found"; exit 1; }
command -v node   >/dev/null || { echo "node 22+ not found"; exit 1; }
export DSF=${DSF:-1.3333333333}                 # the 4K canvas is supersampled down to 2560×1440

python3 tools/narr.py
python3 tools/fonts.py >/dev/null
node render.mjs --timeline
python3 tools/mix.py                            # narration only: no music, no effects
node render.mjs --workers 4 "$@"

mkdir -p 成片
TITLE=$(python3 -c "import json;print(json.load(open('timeline.json'))['title'])")
if [[ " $* " == *" --preview "* ]]; then IN=video-preview.mp4; OUT="成片/preview-1080p.mp4"; AB=192k
else IN=video.mp4; OUT="成片/${TITLE}_2K60.mp4"; AB=320k; fi
ffmpeg -y -loglevel error -i "$IN" -i bgm.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a "$AB" -ar 48000 \
  -metadata title="$TITLE" -metadata artist="TradingNow" -movflags +faststart -shortest "$OUT"
echo "wrote $OUT"

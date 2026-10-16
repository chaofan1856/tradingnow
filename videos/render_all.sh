#!/usr/bin/env bash
# Segmented 4K60 rendering of several films in this container, one after another (4 cores → one film at a time is fastest).
# Each film: 4 shards (each shard = 4 parallel tabs, chunk cache, hang watchdog) → stitch → assemble master → plan download pieces.
#   setsid nohup videos/render_all.sh kline-history moving-average volume > videos/render_all.log 2>&1 &
set -uo pipefail
cd "$(dirname "$0")"
for SLUG in "$@"; do
  D="$PWD/$SLUG"; echo "=== $SLUG  $(date +%H:%M)"
  for K in 1 2 3 4; do
    for TRY in 1 2 3; do
      echo "--- $SLUG shard $K/4 try $TRY  $(date +%H:%M)"
      (cd "$D" && node render.mjs --shard $K/4 --workers 4 > "render-s$K.log" 2>&1) && break
      tail -3 "$D/render-s$K.log"; pkill -9 -x chrome 2>/dev/null; sleep 5
    done
  done
  (cd "$D" && node render.mjs --workers 4 > render-stitch.log 2>&1 && tail -2 render-stitch.log \
     && python3 tools/assemble.py && python3 tools/web_plan.py \
     && ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,nb_frames -of compact "成片/$(python3 -c "import json;print(json.load(open('timeline.json'))['title'])")_4K60.mp4" \
     && rm -rf segs video.mp4) || echo "!!! $SLUG assemble failed"
  echo "=== $SLUG done $(date +%H:%M)"
done
echo ALL DONE

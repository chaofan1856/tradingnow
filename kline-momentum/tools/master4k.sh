#!/usr/bin/env bash
# 4K60 YouTube master: the film in N GOP-aligned segments (default 4), joined losslessly.
#   tools/master4k.sh            render + encode every segment, then join
#   tools/master4k.sh --join     join existing build/seg_*.mp4 (e.g. rendered on other machines)
set -euo pipefail
cd "$(dirname "$0")/.."
TOTAL=$(node -e "const t=require('./timeline.json');console.log(Math.round(t.total*60))")
NSEG=${NSEG:-4}
B=(0); for k in $(seq 1 $((NSEG - 1))); do B+=($(( (TOTAL * k / NSEG) / 120 * 120 ))); done; B+=($TOTAL)
if [[ "${1:-}" != "--join" ]]; then
  for k in $(seq 0 $((NSEG - 1))); do tools/segment.sh ${B[$k]} ${B[$((k + 1))]} $k $([[ $k == 0 ]] && echo 1 || echo 0); done
fi
: > build/segs.txt; for k in $(seq 0 $((NSEG - 1))); do echo "file 'seg_$k.mp4'" >> build/segs.txt; done
mkdir -p out
ffmpeg -v error -y -f concat -safe 0 -i build/segs.txt -i build/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 \
  -movflags +faststart "out/交易的矩阵_4K60.mp4"
ffprobe -v error -count_packets -select_streams v -show_entries stream=nb_read_packets,width,height,r_frame_rate -of compact "out/交易的矩阵_4K60.mp4"
echo "expected frames: $TOTAL"
echo MASTER_DONE

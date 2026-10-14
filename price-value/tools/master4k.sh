#!/usr/bin/env bash
# 4K60 YouTube master. Single machine:  tools/master4k.sh
# Distributed: run tools/segment.sh on several machines for the ranges below, put the seg_*.mp4
# files into build/, then:            tools/master4k.sh --join
# Segments: A 0–3720 (watermark fade-in) · B 3720–7440 · C 7440–11160 · D 11160–end
set -euo pipefail
cd "$(dirname "$0")/.."
TOTAL=$(node -e "const t=require('./timeline.json');console.log(Math.round(t.total*60))")
if [[ "${1:-}" != "--join" ]]; then
  tools/segment.sh 0 3720 A 1; tools/segment.sh 3720 7440 B; tools/segment.sh 7440 11160 C; tools/segment.sh 11160 "$TOTAL" D
fi
printf "file 'seg_A.mp4'\nfile 'seg_B.mp4'\nfile 'seg_C.mp4'\nfile 'seg_D.mp4'\n" > build/segs.txt
mkdir -p out
ffmpeg -v error -y -f concat -safe 0 -i build/segs.txt -i build/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 \
  -movflags +faststart "out/重新理解价格与价值_4K60.mp4"
ffprobe -v error -count_frames -select_streams v -show_entries stream=nb_read_frames,width,height,r_frame_rate -of compact "out/重新理解价格与价值_4K60.mp4"
echo "expected frames: $TOTAL"
echo MASTER_DONE

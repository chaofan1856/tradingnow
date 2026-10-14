#!/usr/bin/env bash
# Render + encode one GOP-aligned 4K60 video segment (no audio). Segments from different machines
# use identical settings, so tools/master4k.sh can join them losslessly with the concat demuxer.
#   tools/segment.sh FROM TO NAME [WATERMARK_FADE=0]   → build/seg_NAME.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
FROM=$1; TO=$2; NAME=$3; FADEIN=${4:-0}
COLOR="scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p,eq=brightness=0.02:gamma=1.16:saturation=1.08"
X264="-c:v libx264 -preset medium -crf 13 -maxrate 38M -bufsize 76M -profile:v high -level 5.2 -g 120 -keyint_min 120 -sc_threshold 0 -x264-params aq-mode=3:aq-strength=0.9 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
FR="build/frames_$NAME"
rm -rf "$FR" && mkdir -p "$FR"
FRAMES_DIR="$FR" DPR=2 JPEGQ=95 WORKERS=${WORKERS:-4} node render.mjs --from "$FROM" --to "$TO" > "build/render_$NAME.log" 2>&1
FADE=""; [[ "$FADEIN" == 1 ]] && FADE=",fade=in:st=0.6:d=1.0:alpha=1"
ffmpeg -v error -y -framerate 60 -start_number "$FROM" -i "$FR/f%05d.jpg" -loop 1 -framerate 60 -i watermark.png \
  -filter_complex "[1:v]scale=640:200:flags=lanczos,format=rgba$FADE[wm];[0:v][wm]overlay=160:0:shortest=1,$COLOR[v]" \
  -map "[v]" $X264 -an "build/seg_$NAME.mp4"
rm -rf "$FR"
echo "SEGMENT_DONE $NAME $(stat -c %s build/seg_$NAME.mp4)"

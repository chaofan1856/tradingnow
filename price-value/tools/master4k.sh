#!/usr/bin/env bash
# 4K60 master for YouTube: native 3840×2160 frames (rendered in two halves to bound disk use),
# H.264 High CRF 13 capped at 38 Mbps, BT.709 tagged, midtone lift; music+SFX at AAC 320k.
#   tools/master4k.sh            (after timeline/prep/cues/sfx)
set -euo pipefail
cd "$(dirname "$0")/.."
TOTAL=$(node -e "const t=require('./timeline.json');console.log(Math.round(t.total*60))")
HALF=$(( (TOTAL / 2 / 120) * 120 ))          # split on a GOP boundary
COLOR="scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p,eq=gamma=1.08:saturation=1.04"
X264="-c:v libx264 -preset medium -crf 13 -maxrate 38M -bufsize 76M -profile:v high -level 5.2 -g 120 -keyint_min 120 -sc_threshold 0 -x264-params aq-mode=3:aq-strength=0.9 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
seg () {  # $1 name  $2 from  $3 to  $4 watermark-fade(1/0)
  rm -rf build/frames
  DPR=2 JPEGQ=95 WORKERS=4 node render.mjs --from "$2" --to "$3" > "build/render_$1.log" 2>&1
  local FADE=""; [[ "$4" == 1 ]] && FADE=",fade=in:st=0.6:d=1.0:alpha=1"
  ffmpeg -v error -y -framerate 60 -start_number "$2" -i build/frames/f%05d.jpg -loop 1 -framerate 60 -i watermark.png \
    -filter_complex "[1:v]scale=640:200:flags=lanczos,format=rgba$FADE[wm];[0:v][wm]overlay=160:0:shortest=1,$COLOR[v]" \
    -map "[v]" $X264 -an "build/seg_$1.mp4"
  rm -rf build/frames
}
seg A 0 "$HALF" 1
seg B "$HALF" "$TOTAL" 0
printf "file 'seg_A.mp4'\nfile 'seg_B.mp4'\n" > build/segs.txt
mkdir -p out
ffmpeg -v error -y -f concat -safe 0 -i build/segs.txt -i build/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 320k -ar 48000 \
  -movflags +faststart "out/重新理解价格与价值_4K60.mp4"
ffprobe -v error -show_entries format=duration,bit_rate,size:stream=codec_name,width,height,r_frame_rate,pix_fmt,color_space -of compact "out/重新理解价格与价值_4K60.mp4"
echo MASTER_DONE

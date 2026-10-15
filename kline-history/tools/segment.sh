#!/usr/bin/env bash
# Render + encode one GOP-aligned 4K60 video segment (no audio). Segments from different machines
# use identical settings, so tools/master4k.sh can join them losslessly with the concat demuxer.
#   tools/segment.sh FROM TO NAME [WATERMARK_FADE=0]   → build/seg_NAME.mp4
set -euo pipefail
cd "$(dirname "$0")/.."
FROM=$1; TO=$2; NAME=$3; FADEIN=${4:-0}
# grade: eq lifts luma (brightness +0.02, gamma 1.16); saturation x1.08 is an exact chroma LUT, because
# eq's own fixed-point saturation maps neutral 128 -> 127 (dark greys drift olive) and overshoots 16-240
SAT="clip(128+(val-128)*1.08+0.5,16,240)"
# grade: true black stays at 16; a soft S-curve on luma (0.62 linear + 0.38 smoothstep) for contrast,
# saturation x1.10 as an exact chroma LUT
YC="st(0,clip((val-16)/219,0,1));16+219*(0.62*ld(0)+0.38*ld(0)*ld(0)*(3-2*ld(0)))+0.5"
SAT="clip(128+(val-128)*1.10+0.5,16,240)"
COLOR="scale=out_color_matrix=bt709:out_range=tv:flags=lanczos+accurate_rnd+full_chroma_int,format=yuv420p,lutyuv=y='$YC':u='$SAT':v='$SAT'"
# film grain needs tune=grain; CRF 13 with a 36 Mbps cap keeps the 4K60 master near 1.25 GB
X264="-c:v libx264 -preset ${PRESET:-medium} -tune grain -crf 13 -maxrate 36M -bufsize 72M -profile:v high -level 5.2 -g 120 -keyint_min 120 -sc_threshold 0 -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv"
FR="build/frames_$NAME"
rm -rf "$FR" && mkdir -p "$FR"
FRAMES_DIR="$FR" DPR=2 JPEGQ=95 WORKERS=${WORKERS:-4} node render.mjs --from "$FROM" --to "$TO" > "build/render_$NAME.log" 2>&1
FADE=""; [[ "$FADEIN" == 1 ]] && FADE=",fade=in:st=0.6:d=1.0:alpha=1"
# film grain, generated at 1080 and upscaled (one grain ≈ 2 px at 4K), new every frame:
#   overlay-blended mid-grey noise textures mid-tones/highlights, screen-blended dark noise adds specks to pure black
GRAIN="color=c=0x808080:s=1920x1080:r=60,format=gray,noise=c0s=60:c0f=t:all_seed=$((7 + FROM)),scale=3840:2160:flags=bicubic,format=gbrp[go];\
color=c=black:s=1920x1080:r=60,format=gray,noise=c0s=16:c0f=t:all_seed=$((91 + FROM)),scale=3840:2160:flags=bicubic,format=gbrp[gs]"
# grain stays off the type: a soft luma key from the un-grained frame (dilated 1 px, feathered) lets anything
# brighter than near-black come through clean, so letters no longer shimmer while the black keeps its grain
LUMA="colorchannelmixer=rr=0.2126:rg=0.7152:rb=0.0722:gr=0.2126:gg=0.7152:gb=0.0722:br=0.2126:bg=0.7152:bb=0.0722"
RAMP="st(0,clip((val-6)/30,0,1));255*ld(0)*ld(0)*(3-2*ld(0))"
KEY="$LUMA,dilation,gblur=sigma=1,lutrgb=r='$RAMP':g='$RAMP':b='$RAMP'"
ffmpeg -v error -y -framerate 60 -start_number "$FROM" -i "$FR/f%05d.jpg" -loop 1 -framerate 60 -i watermark.png \
  -filter_complex "[1:v]scale=640:200:flags=lanczos,format=rgba$FADE[wm];[0:v][wm]overlay=160:0:shortest=1,format=gbrp,split=3[base][bc][bk];$GRAIN;\
[base][go]blend=all_mode=overlay:all_opacity=0.42:shortest=1[b1];[b1][gs]blend=all_mode=screen:shortest=1[gr];\
[bk]$KEY[km];[gr][bc][km]maskedmerge,$COLOR[v]" \
  -map "[v]" $X264 -an "build/seg_$NAME.mp4"
rm -rf "$FR"
echo "SEGMENT_DONE $NAME $(stat -c %s build/seg_$NAME.mp4)"

#!/usr/bin/env bash
# 《博弈的符号》 one-step build.
#   ./build.sh REFERENCE.mp4 MODELS_DIR [FONTSOURCE_DIR]
# REFERENCE.mp4  the reference video (its music is reused, extended on-beat)
# MODELS_DIR     kokoro-multi-lang-v1_1/ + sherpa-onnx-paraformer-zh-2024-03-09/ (k2-fsa/sherpa-onnx releases)
# FONTSOURCE_DIR extracted `npm pack @fontsource/noto-serif-sc @fontsource/cormorant-garamond` (only to rebuild fonts.css)
# Needs: ffmpeg, node 22 + playwright, python3 with sherpa-onnx soundfile librosa (fonttools brotli for fonts).
set -euo pipefail
cd "$(dirname "$0")"
REF="$1"; MODELS="$2"; FONTS="${3:-}"
mkdir -p build out
python3 tools/music.py "$REF"                   # build/music.wav  (length = film length)
python3 tools/voice.py "$MODELS"                # build/voice/*, build/narration.wav, timeline.json, build/subtitles.srt
python3 tools/prep.py $FONTS                    # build/timeline.js (+ fonts.css)
node render.mjs                                 # build/frames/f*.jpg
# soundtrack: music only by default; NARRATION=1 mixes the narrator in (music ducked under it)
if [[ "${NARRATION:-0}" != 1 ]]; then
ffmpeg -v error -y -i build/music.wav -af "loudnorm=I=-16:TP=-1.2:LRA=11" -ar 48000 build/mix.wav
else
ffmpeg -v error -y -i build/music.wav -i build/narration.wav -filter_complex \
  "[0:a]volume=0.62[m];[1:a]asplit=2[v][sc];[m][sc]sidechaincompress=threshold=0.04:ratio=3.5:attack=40:release=600:makeup=1[md];[md][v]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-15:TP=-1.2:LRA=11[out]" \
  -map "[out]" -ar 48000 build/mix.wav
fi
# frames + the reference's top-left watermark (alpha matte, same position, fades in like the original)
ffmpeg -v error -y -framerate 30 -i build/frames/f%05d.jpg -loop 1 -framerate 30 -i watermark.png -i build/mix.wav \
  -filter_complex "[1:v]format=rgba,fade=in:st=0.6:d=1.0:alpha=1[wm];[0:v][wm]overlay=80:0:shortest=1,format=yuv420p[v]" \
  -map "[v]" -map 2:a -c:v libx264 -preset medium -crf 19 -maxrate 12M -bufsize 24M -profile:v high -tune film -movflags +faststart \
  -c:a aac -b:a 256k -shortest out/博弈的符号_1080p.mp4
cp build/subtitles.srt out/博弈的符号.srt
echo "wrote out/博弈的符号_1080p.mp4"

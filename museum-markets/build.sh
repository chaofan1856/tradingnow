#!/usr/bin/env bash
# 《认识交易市场》 one-step build:
#   score (if missing) → deterministic CDP frame render → ffmpeg mux/mix
#   ./build.sh                 → out/认识交易市场.mp4
#   ./build.sh --score         only re-synthesise bgm.wav + sfx/
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "ffmpeg not found"; exit 1; }
command -v node >/dev/null || { echo "node 22+ not found"; exit 1; }

if [[ "${1:-}" == "--score" ]]; then python3 tools/score.py; exit 0; fi
[[ -f bgm.wav && -f sfx/ding.wav ]] || python3 tools/score.py

node render.mjs                                   # → out/video-only.mp4 (2340 frames @30fps)

# sfx cues: frame → ms (frame / 30 * 1000)
cue() { python3 -c "print(round($1/30*1000))"; }
D_DING=$(cue 168); D_SCALE=$(cue 262); D_PAPER1=$(cue 448); D_PAPER2=$(cue 1478)
D_RICE=$(cue 1068); D_CHAIN=$(cue 1268); D_TAP=$(cue 2290)

ffmpeg -y -loglevel error -i out/video-only.mp4 -i bgm.wav \
  -i sfx/ding.wav -i sfx/scale.wav -i sfx/paper.wav -i sfx/paper.wav -i sfx/rice.wav -i sfx/chain.wav -i sfx/tap.wav \
  -filter_complex "\
[1]volume=-20dB[bgm];\
[2]adelay=${D_DING}:all=1,volume=-8dB[a2];\
[3]adelay=${D_SCALE}:all=1,volume=-8dB[a3];\
[4]adelay=${D_PAPER1}:all=1,volume=-8dB[a4];\
[5]adelay=${D_PAPER2}:all=1,volume=-8dB[a5];\
[6]adelay=${D_RICE}:all=1,volume=-8dB[a6];\
[7]adelay=${D_CHAIN}:all=1,volume=-8dB[a7];\
[8]adelay=${D_TAP}:all=1,volume=-8dB[a8];\
[bgm][a2][a3][a4][a5][a6][a7][a8]amix=inputs=8:normalize=0:duration=first,volume=8dB,alimiter=limit=0.9:level=disabled[aout]" \
  -map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -ar 48000 -t 78 -movflags +faststart "out/认识交易市场.mp4"
echo "wrote out/认识交易市场.mp4"

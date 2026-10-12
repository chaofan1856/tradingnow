#!/usr/bin/env bash
# One step: score (if missing) → frames → mp4.
#   ./build.sh            full film       → 成片/what-is-a-stock.mp4
#   ./build.sh --to 300   first N frames  → 成片/preview-first-300.mp4
#   ./build.sh --bgm      only (re)synthesise bgm.wav
set -euo pipefail
cd "$(dirname "$0")"

command -v ffmpeg >/dev/null || { echo "ffmpeg not found — install it first (brew install ffmpeg / winget install ffmpeg)"; exit 1; }
command -v node   >/dev/null || { echo "node (22+) not found"; exit 1; }

# Score: organ chord progression + arpeggio ostinato + one clock tick per second
# + a low boom on every cut (all cuts sit on whole seconds). Synthesised by tools/score.py.
make_bgm() { python3 tools/score.py; }

if [[ "${1:-}" == "--bgm" ]]; then make_bgm; exit 0; fi
[[ -f bgm.wav ]] || make_bgm

node render.mjs "$@"

OUT="成片/what-is-a-stock.mp4"
if [[ "${1:-}" == "--to" ]]; then OUT="成片/preview-first-${2}.mp4"; fi
mkdir -p 成片
ffmpeg -y -loglevel error -framerate 30 -i frames/f%05d.jpg -i bgm.wav \
  -c:v libx264 -pix_fmt yuv420p -crf 18 -preset medium -movflags +faststart \
  -c:a aac -b:a 192k -shortest "$OUT"
echo "wrote $OUT"

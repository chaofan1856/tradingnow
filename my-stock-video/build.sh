#!/usr/bin/env bash
# One step: score (if missing) → frames → mp4.
#   ./build.sh            full film       → 成片/what-is-a-stock.mp4
#   ./build.sh --to 300   first N frames  → 成片/preview-first-300.mp4
#   ./build.sh --bgm      only (re)synthesise bgm.wav
set -euo pipefail
cd "$(dirname "$0")"

command -v ffmpeg >/dev/null || { echo "ffmpeg not found — install it first (brew install ffmpeg / winget install ffmpeg)"; exit 1; }
command -v node   >/dev/null || { echo "node (22+) not found"; exit 1; }

# ---------------------------------------------------------------------------
# Score: low pipe-organ pad (A minor, slow 8 s breath) + one clock tick per
# second (the "time" motif) + a low boom on every scene change.
# Scene changes fall on whole seconds, so every cut lands on a tick.
# ---------------------------------------------------------------------------
make_bgm() {
  local CUTS="4 10 17 25 32 40 47 53"
  # organ voice: fundamental + 3 pipe partials
  voice() { local f=$1 g=$2; echo "$g*(sin(2*PI*$f*t)+0.5*sin(4*PI*$f*t)+0.28*sin(6*PI*$f*t)+0.16*sin(8*PI*$f*t))"; }
  local breath="(0.62+0.38*sin(2*PI*t/8-PI/2))"
  local fade="min(t/3\,1)*min((60-t)/3.5\,1)"
  local organL="$(voice 55 0.30)+$(voice 82.41 0.20)+$(voice 110 0.16)+$(voice 130.81 0.10)+$(voice 164.81 0.07)+gte(t\,25)*min((t-25)/6\,1)*$(voice 329.63 0.025)"
  local organR="$(voice 55.08 0.30)+$(voice 82.35 0.20)+$(voice 110.1 0.16)+$(voice 130.7 0.10)+$(voice 164.95 0.07)+gte(t\,25)*min((t-25)/6\,1)*$(voice 329.4 0.025)"
  local boom="0"
  for c in $CUTS; do
    boom="$boom+gte(t\,$c)*exp(-1.5*max(t-$c\,0))*(1-exp(-30*max(t-$c\,0)))*(sin(2*PI*34*t)+0.45*sin(2*PI*51*t))"
  done
  # tick/tock: bright click + short wooden body, alternating pitch; silent in the last second
  local tick="between(t\,0.5\,59)*(exp(-90*mod(t\,1))*sin(2*PI*if(mod(floor(t)\,2)\,2050\,2650)*t)*0.55+exp(-45*mod(t\,1))*sin(2*PI*if(mod(floor(t)\,2)\,560\,640)*t)*0.35)"

  ffmpeg -y -loglevel error -filter_complex "
    aevalsrc='($organL)*$breath*$fade*0.55+($boom)*0.5|($organR)*$breath*$fade*0.55+($boom)*0.5':s=48000:d=60,
      lowpass=f=1400,aecho=0.8:0.6:180|420:0.30|0.18[pad];
    aevalsrc='$tick*0.4|$tick*0.4':s=48000:d=60,
      highpass=f=300,aecho=0.7:0.5:90|230:0.22|0.12[tk];
    [pad][tk]amix=inputs=2:normalize=0,alimiter=limit=0.89,loudnorm=I=-20:TP=-1.5:LRA=11,atrim=0:60,apad=whole_dur=60,afade=t=out:st=58.5:d=1.5[out]" \
    -map "[out]" -ar 48000 -ac 2 -c:a pcm_s16le bgm.wav
  echo "wrote bgm.wav"
}

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

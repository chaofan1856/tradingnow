#!/usr/bin/env bash
# 《认识交易市场》 one-step build: score → deterministic frames (CDP) → ffmpeg mix + mux.
#   ./build.sh              full film  → 成片/认识交易市场-1920x1080.mp4
#   ./build.sh --audio      only re-synthesise + re-mix audio, reuse frames/
set -euo pipefail
cd "$(dirname "$0")"
command -v ffmpeg >/dev/null || { echo "ffmpeg not found"; exit 1; }
command -v node   >/dev/null || { echo "node 22+ not found"; exit 1; }

python3 tools/score.py
[[ "${1:-}" == "--audio" ]] || node render.mjs --workers "${WORKERS:-4}"

# ---- mix: 配乐 -20dB，音效 -8dB；每条音效按帧号对齐（ms = frame / 30 * 1000）----
declare -a SFX=(
  "coin_ding:168"       # 硬币「叮」
  "balance_creak:250"   # 天平「吱…」
  "balance_click:308"   # 天平「咔」
  "paper:478"           # S2 纸展开「沙」
  "rice:1038"           # S3 米粒落仓「沙沙」
  "chain_break:1280"    # S4 金链断裂「铿」
  "paper:1474"          # S5 纸展开「沙」
  "button_tap:2290"     # S7 按键「嗒」
)
inputs=(-i bgm.wav); fc="[0]volume=-20dB[b];"; labels="[b]"
for i in "${!SFX[@]}"; do
  name=${SFX[$i]%%:*}; frame=${SFX[$i]##*:}; ms=$(( frame * 1000 / 30 )); k=$((i + 1))
  inputs+=(-i "sfx/$name.wav"); fc+="[$k]adelay=${ms}|${ms},volume=-8dB[s$k];"; labels+="[s$k]"
done
fc+="${labels}amix=inputs=$(( ${#SFX[@]} + 1 )):normalize=0:duration=first[m]"
ffmpeg -y -loglevel error "${inputs[@]}" -filter_complex "$fc" -map "[m]" -ar 48000 mix_raw.wav
# uniform make-up gain (keeps the -8/-20 balance) so the loudest peak sits at -1 dBFS
peak=$(ffmpeg -hide_banner -i mix_raw.wav -af volumedetect -f null - 2>&1 | sed -n 's/.*max_volume: \(-\?[0-9.]*\) dB/\1/p')
gain=$(python3 -c "print(round(-1.0 - float('$peak'), 2))")
ffmpeg -y -loglevel error -i mix_raw.wav -af "volume=${gain}dB" -ac 2 mix.wav && rm mix_raw.wav
echo "mix peak ${peak} dB → make-up ${gain} dB"

mkdir -p 成片
OUT="成片/认识交易市场-1920x1080.mp4"
ffmpeg -y -loglevel error -framerate 30 -i frames/f%05d.jpg -i mix.wav \
  -c:v libx264 -pix_fmt yuv420p -crf 19 -maxrate 9M -bufsize 18M -preset medium -r 30 -fps_mode cfr -movflags +faststart \
  -c:a aac -b:a 192k -shortest "$OUT"
echo "wrote $OUT"

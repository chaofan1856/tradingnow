#!/usr/bin/env bash
# Fonts → timeline → soundtrack → 2K60 render (4 workers, retries) → master MP4 → download pieces.
# Runs detached so it survives long sessions; follow it with:  tail -f videos/<slug>/render.log  and  cat /tmp/<slug>.done
#   bash videos/_series/render.sh <slug>
set -euo pipefail
SLUG="$1"; D="$(cd "$(dirname "$0")/.." && pwd)/$SLUG"
cd "$D"
python3 tools/fonts.py | tail -1
node render.mjs --timeline | tail -1
python3 tools/music.py
rm -rf segs video.mp4 web/pieces
cat > /tmp/$SLUG.job <<EOF
#!/usr/bin/env bash
cd "$D"
for T in 1 2 3; do node render.mjs --workers 4 > render.log 2>&1 && break; done
python3 tools/assemble.py && python3 tools/web_plan.py && rm -rf segs video.mp4 && echo "DONE \$(date +%H:%M)" > /tmp/$SLUG.done || echo FAILED > /tmp/$SLUG.done
EOF
chmod +x /tmp/$SLUG.job; rm -f /tmp/$SLUG.done
setsid nohup /tmp/$SLUG.job > /tmp/$SLUG.joblog 2>&1 < /dev/null &
echo "rendering $SLUG in the background (≈35 min for 3 min of 2K60)"

#!/usr/bin/env bash
# Push this session's rendered chunks to a throw-away branch so the video session can collect them.
#   tools/shard_push.sh <slug> <k>        → branch render/<slug>/s<k>   (chunks are < 100 MB each)
set -euo pipefail
cd "$(dirname "$0")/.."
SLUG=$1; K=$2; REMOTE=$(git remote get-url origin)
T=$(mktemp -d); cp segs/c*.mp4 "$T"/; cp segs/manifest.json "$T"/manifest-s$K.json
cd "$T"; git init -q; git checkout -q -b tmp; git add -A
git -c user.name=render -c user.email=render@local commit -q -m "render $SLUG shard $K"
for i in 1 2 3 4; do git push -q -f "$REMOTE" tmp:refs/heads/render/$SLUG/s$K && break || sleep $((2**i)); done
cd /; rm -rf "$T"; echo "pushed render/$SLUG/s$K"

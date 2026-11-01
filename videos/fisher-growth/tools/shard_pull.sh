#!/usr/bin/env bash
# Collect all shard branches into segs/ (waits until all N exist), then delete them from the remote.
#   tools/shard_pull.sh <slug> [N=4]
set -euo pipefail
cd "$(dirname "$0")/.."
SLUG=$1; N=${2:-4}; REMOTE=$(git remote get-url origin)
until [ "$(git ls-remote "$REMOTE" "refs/heads/render/$SLUG/*" | wc -l)" -ge "$N" ]; do sleep 30; done
mkdir -p segs
for K in $(seq 1 "$N"); do
  T=$(mktemp -d); git clone -q --depth 1 --single-branch -b "render/$SLUG/s$K" "$REMOTE" "$T"
  cp "$T"/c*.mp4 segs/; python3 -c "import json,sys;m=json.load(open('segs/manifest.json')) if __import__('os').path.exists('segs/manifest.json') else {};m.update(json.load(open(sys.argv[1])));json.dump(m,open('segs/manifest.json','w'))" "$T/manifest-s$K.json"
  rm -rf "$T"
done
for K in $(seq 1 "$N"); do git push -q "$REMOTE" --delete "render/$SLUG/s$K" || true; done
echo "collected $(ls segs/c*.mp4 | wc -l) chunks"

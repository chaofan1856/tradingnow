#!/usr/bin/env bash
# Pull the source fonts from npm (fontsource packages) into tools/fonts-src/.
# Only needed before re-running tools/fonts.py — index.html already carries
# the subsetted faces inline.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p fonts-src .pkgs
cd .pkgs
for p in @fontsource/noto-serif-sc@5.3.1 @fontsource/noto-serif-jp@5.3.1 @fontsource/playfair-display@5.3.0; do npm pack "$p" --silent >/dev/null; done
for t in *.tgz; do tar xzf "$t" --wildcards 'package/files/*-400-*.woff2' 'package/files/*-600-normal.woff2' 2>/dev/null || true; done
cp package/files/noto-serif-sc-*-400-normal.woff2 package/files/noto-serif-sc-*-600-normal.woff2 ../fonts-src/
cp package/files/noto-serif-jp-47-400-normal.woff2 package/files/noto-serif-jp-47-600-normal.woff2 ../fonts-src/   # 匁
cp package/files/playfair-display-latin-400-normal.woff2 package/files/playfair-display-latin-400-italic.woff2 \
   package/files/playfair-display-latin-ext-400-italic.woff2 package/files/playfair-display-latin-ext-400-normal.woff2 ../fonts-src/
cd .. && rm -rf .pkgs
echo "fonts-src: $(ls fonts-src | wc -l) files"

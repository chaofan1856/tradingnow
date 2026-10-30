# 逆向投资先驱邓普顿

58.0 s · 3840×2160 · 60 fps · TradingNow knowledge-film engine (copied from `kline-video/`) → `成片/逆向投资先驱邓普顿_4K60.mp4`

- Content: `script.js` only — one continuous story, no modules: cold open (绝望 → 半信半疑) → title → portrait → the sentiment
  cycle → 1939 (104 stocks under $1) → global diversification → the pessimism gauge → Japan ×100 → the 2000 bubble →
  crowd vs. contrarian → sunset & lifetime ruler → the one arrow that points the other way → logo page.
  `index.html` is the unchanged engine.
- Portrait: `assets/portrait.jpg` (the photo supplied with the brief, upscaled 4×), loaded from `script.js`.
- Music: `assets/music.m4a` (not committed — third-party music in a public repo; same track as `videos/livermore-king`).
  `tools/music.py` plays it unchanged from start to end; the film is paced to end with it. Expect a YouTube Content ID claim.
- Covers: `covers/cover-4x3.*` (2000×1500) and `covers/cover-3x4.*` (1500×2000), from `covers/cover.html` via `covers/render.sh`.

```
./build.sh                       # fonts → timeline → music → 4K render (cached chunks) → 成片/…_4K60.mp4
./build.sh --only y1939,crowd    # re-render just those scenes
node render.mjs --stills 12,40   # spot-check frames → stills/
```

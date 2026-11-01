# 终极智者查理芒格

58.3 s · 3840×2160 · 60 fps · TradingNow knowledge-film engine (copied from `kline-video/`) → `成片/终极智者查理芒格_4K60.mp4`

- Content: `script.js` only — one continuous story, no modules: cold open (searching forward hits dead ends; tracing back
  from the goal finds the way) → title → portrait → lawyer, loss, rebirth → cigar butt vs. great company → the latticework
  of mental models → Berkshire's tens-of-thousands-fold climb → stepping around crises → compounding knowledge →
  the empty chair & *Poor Charlie's Almanack* → the portrait → logo page. `index.html` is the unchanged engine.
- Same smooth motion as `videos/graham-value` (1.4 s transitions, soft eases, blur-in title).
- Facts adjusted from the brief: he died at 99 (not 100); "独眼智者" is told as "传奇智者". Charts are marked 示意.
- Portrait: `assets/portrait.jpg` (the photo supplied with the brief, upscaled 2×), loaded from `script.js`.
- Music: `assets/music.m4a` (not committed — third-party music in a public repo; same track as `videos/livermore-king`).
  `tools/music.py` plays it unchanged from start to end; the film is paced to end with it. Expect a YouTube Content ID claim.
- Covers: `covers/cover-4x3.*` (2000×1500) and `covers/cover-3x4.*` (1500×2000), from `covers/cover.html` via `covers/render.sh`.

```
./build.sh                         # fonts → timeline → music → 4K render (cached chunks) → 成片/…_4K60.mp4
./build.sh --only models,farewell  # re-render just those scenes
node render.mjs --stills 12,40     # spot-check frames → stills/
```

# 成长股教父菲利普费舍

58.3 s · 3840×2160 · 60 fps · TradingNow knowledge-film engine (copied from `kline-video/`) → `成片/成长股教父菲利普费舍_4K60.mp4`

- Content: `script.js` only — one continuous story, no modules: cold open (a searchlight over a field of companies finds the
  great one) → title → portrait → Fisher & Co. 1931 and the scuttlebutt method → hold until it fundamentally changes →
  Motorola / Texas Instruments ×100 → 100 mediocre stocks vs. one great company → 1907–2004 & Buffett's 85/15 →
  *Common Stocks and Uncommon Profits* → logo page. `index.html` is the unchanged engine.
- Same smooth motion as the Graham, Lynch and Munger films (1.4 s transitions, soft eases, blur-in title). Charts are marked 示意.
- Portrait: `assets/portrait.jpg` (the photo supplied with the brief, upscaled 2×), loaded from `script.js`.
- Music: `assets/music.m4a` (not committed — third-party music in a public repo; same track as `videos/livermore-king`).
  `tools/music.py` plays it unchanged from start to end; the film is paced to end with it. Expect a YouTube Content ID claim.
- Covers: `covers/cover-4x3.*` (2000×1500) and `covers/cover-3x4.*` (1500×2000), from `covers/cover.html` via `covers/render.sh`.

```
./build.sh                       # fonts → timeline → music → 4K render (cached chunks) → 成片/…_4K60.mp4
./build.sh --only scuttle,focus  # re-render just those scenes
node render.mjs --stills 12,40   # spot-check frames → stills/
```

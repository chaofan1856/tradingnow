# 价值苦行僧沃尔特施洛斯

58.0 s · 3840×2160 · 60 fps · TradingNow knowledge-film engine (copied from `kline-video/`) → `成片/价值苦行僧沃尔特施洛斯_4K60.mp4`

- Content: `script.js` only — one continuous story, no modules: cold open (falling prices stop on a gold floor: don't lose
  money) → title → portrait → Graham's disciple, no office / no screens / no tips → the annual report and price below book →
  47 years ahead of the S&P 500 → a staircase of cheap stocks → 1916–2012 → the portrait → logo page.
  `index.html` is the unchanged engine.
- Same smooth motion as the Graham, Lynch, Munger and Fisher films. Charts are marked 示意.
- Fact adjusted from the brief: "奇迹般的超低回撤" is not claimed (his fund had losing years, e.g. 1973–74).
- Portrait: `assets/portrait.jpg` (the photo supplied with the brief, upscaled 2×), loaded from `script.js`.
- Music: `assets/music.m4a` (not committed — third-party music in a public repo; same track as `videos/livermore-king`).
  `tools/music.py` plays it unchanged from start to end; the film is paced to end with it. Expect a YouTube Content ID claim.
- Covers: `covers/cover-4x3.*` (2000×1500) and `covers/cover-3x4.*` (1500×2000), from `covers/cover.html` via `covers/render.sh`.

```
./build.sh                       # fonts → timeline → music → 4K render (cached chunks) → 成片/…_4K60.mp4
./build.sh --only cheap,record   # re-render just those scenes
node render.mjs --stills 12,40   # spot-check frames → stills/
```

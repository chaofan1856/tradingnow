# 价值投资之父格雷厄姆

58.1 s · 3840×2160 · 60 fps · TradingNow knowledge-film engine (copied from `kline-video/`) → `成片/价值投资之父格雷厄姆_4K60.mp4`

- Content: `script.js` only — one continuous story, no modules: cold open (price dots settle into a company) → title →
  portrait → 1929 (−70 %, awakening) → margin of safety → voting vs. weighing machine → cigar butts & 17 % a year →
  balance sheet vs. Mr. Market → the two books → *The Intelligent Investor* → logo page. `index.html` is the unchanged engine.
- Smoother motion than the earlier films: `FILM.transition` 1.4 s, gentle cameras (≤ 4 % push-in), only smootherstep /
  ease-out entrances (no overshoot, no screen shake); the title's characters rise out of a blur one by one.
- Portrait: `assets/portrait.jpg` (the photo supplied with the brief, upscaled 4×), loaded from `script.js`.
- Music: `assets/music.m4a` (not committed — third-party music in a public repo; same track as `videos/livermore-king`).
  `tools/music.py` plays it unchanged from start to end; the film is paced to end with it. Expect a YouTube Content ID claim.
- Covers: `covers/cover-4x3.*` (2000×1500) and `covers/cover-3x4.*` (1500×2000), from `covers/cover.html` via `covers/render.sh`.

```
./build.sh                       # fonts → timeline → music → 4K render (cached chunks) → 成片/…_4K60.mp4
./build.sh --only margin,weigh   # re-render just those scenes
node render.mjs --stills 12,40   # spot-check frames → stills/
```

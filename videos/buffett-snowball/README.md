# 股神巴菲特

58.1 s · 3840×2160 · 60 fps · TradingNow knowledge-film engine (copied from `kline-video/`) → `成片/股神巴菲特_4K60.mp4`

- Content: `script.js` only — one continuous story, no modules: cold open (恐惧时贪婪 / 贪婪时恐惧) → title → portrait →
  first share & Graham → moat & compounding → ten years vs. ten minutes → 2008 → circle of competence & the eighth
  wonder → the long Berkshire bull → the snowball → logo page. `index.html` is the unchanged engine.
- Portrait: `assets/portrait.jpg` (the photo supplied with the brief, upscaled 4×), loaded from `script.js`.
- Music: `assets/music.m4a` (not committed — third-party music in a public repo; same track as `videos/livermore-king`).
  `tools/music.py` plays it unchanged from start to end; the film is paced to end with it. Expect a YouTube Content ID claim.
- Covers: `covers/cover-4x3.*` (2000×1500) and `covers/cover-3x4.*` (1500×2000), from `covers/cover.html` via `covers/render.sh`.

```
./build.sh                       # fonts → timeline → music → 4K render (cached chunks) → 成片/…_4K60.mp4
./build.sh --only crisis,snow    # re-render just those scenes
node render.mjs --stills 12,40   # spot-check frames → stills/
```

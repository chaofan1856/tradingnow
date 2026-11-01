# 量化之王詹姆斯西蒙斯

58.0 s · 3840×2160 · 60 fps · TradingNow knowledge-film engine (copied from `kline-video/`) → `成片/量化之王詹姆斯西蒙斯_4K60.mp4`

- Content: `script.js` only — one continuous story, no modules: cold open (dots settle into a bell curve: luck → probability)
  → title → portrait and quote → codebreaker and the Chern–Simons blackboard → Medallion and its team of scientists →
  digit rain and a tiny edge repeated millions of times → Medallion vs. the market (66% fee-before) → a steady line
  through bull and bear markets → 1938–2024 → the portrait → logo page. `index.html` is the unchanged engine.
- Same smooth motion as the Graham, Lynch, Munger, Fisher and Schloss films. Charts are marked 示意.
- Facts adjusted from the brief: 66% is labelled as before fees (about 39% after fees); "never hires anyone who knows Wall
  Street" is softened to "mostly mathematicians and physicists"; "always profits in any market" is not claimed; the
  closing line is shown as a quote of the film, not attributed to Simons.
- Portrait: `assets/portrait.jpg` (the photo supplied with the brief, upscaled 2×), loaded from `script.js`.
- Music: `assets/music.m4a` (not committed — third-party music in a public repo; same track as `videos/livermore-king`).
  `tools/music.py` plays it unchanged from start to end; the film is paced to end with it. Expect a YouTube Content ID claim.
- Covers: `covers/cover-4x3.*` (2000×1500) and `covers/cover-3x4.*` (1500×2000), from `covers/cover.html` via `covers/render.sh`.

```
./build.sh                          # fonts → timeline → music → 4K render (cached chunks) → 成片/…_4K60.mp4
./build.sh --only machine,return66  # re-render just those scenes
node render.mjs --stills 12,40      # spot-check frames → stills/
```

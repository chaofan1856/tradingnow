# 公募基金第一人彼得林奇

58.2 s · 3840×2160 · 60 fps · TradingNow knowledge-film engine (copied from `kline-video/`) → `成片/公募基金第一人彼得林奇_4K60.mp4`

- Content: `script.js` only — one continuous story, no modules: cold open (a tangle of analysis vs. a bulb of common sense) →
  title → portrait → caddie to Magellan → shops & the tenbagger → poker cards → 29 % a year, $18 M → $14 B → 1987 →
  retiring at 46 & *Beating the Street* → the smile → logo page. `index.html` is the unchanged engine.
- Same smooth motion as `videos/graham-value` (1.4 s transitions, soft eases, blur-in title).
- Facts adjusted from the brief: fund size shown as $18 million → $14 billion (the brief's "2000×" overstates it), and 1987
  is told as getting through the crash rather than "harvesting" it. Charts are marked 示意 (illustrative).
- Portrait: `assets/portrait.jpg` (the photo supplied with the brief, upscaled 2×), loaded from `script.js`.
- Music: `assets/music.m4a` (not committed — third-party music in a public repo; same track as `videos/livermore-king`).
  `tools/music.py` plays it unchanged from start to end; the film is paced to end with it. Expect a YouTube Content ID claim.
- Covers: `covers/cover-4x3.*` (2000×1500) and `covers/cover-3x4.*` (1500×2000), from `covers/cover.html` via `covers/render.sh`.

```
./build.sh                       # fonts → timeline → music → 4K render (cached chunks) → 成片/…_4K60.mp4
./build.sh --only mall,poker     # re-render just those scenes
node render.mjs --stills 12,40   # spot-check frames → stills/
```

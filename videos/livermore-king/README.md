# 华尔街投机之王利弗莫尔

58.0 s · 3840×2160 · 60 fps · TradingNow knowledge-film engine (copied from `kline-video/`) → `成片/华尔街投机之王利弗莫尔_4K60.mp4`

- Content: `script.js` only — one continuous story, no modules: cold open → title → portrait → 14岁/四落四起 → 坐等法则 →
  1929 做空 → 1940 → 灯塔/眼睛特写 → logo page. `index.html` is the unchanged engine.
- Portrait: `assets/portrait.jpg` (the photo supplied for the earlier Livermore film), loaded from `script.js`.
- Music: `assets/music.m4a` (not committed — it is third-party music in a public repo): the audio of the track supplied with the brief
  (《拉夫劳伦进行曲》; `ffmpeg -i <supplied>.mp4 -vn -c:a copy assets/music.m4a`). Expect a
  YouTube Content ID claim. `tools/music.py` plays it unchanged from start to end (no added effects); the film is paced to end with it.
  To swap in the engine's original score instead, replace `python3 tools/music.py` with `python3 tools/score.py` in `build.sh`.
- The logo page sits under the track's last bars; the track ends at 57.68 s, the film at 58.0 s.

```
./build.sh                       # fonts → timeline → music → 4K render (cached chunks) → 成片/…_4K60.mp4
./build.sh --only crash,legacy   # re-render just those scenes
node render.mjs --stills 12,40   # spot-check frames → stills/
```

# 华尔街投机之王利弗莫尔

62.6 s · 3840×2160 · 60 fps · TradingNow knowledge-film engine (copied from `kline-video/`) → `成片/华尔街投机之王利弗莫尔_4K60.mp4`

- Content: `script.js` only (13 scenes: cold open → title → 导言 → 3 modules → recap → logo page). `index.html` is the unchanged engine.
- Portrait: `assets/portrait.jpg` (the photo supplied for the earlier Livermore film), loaded from `script.js`.
- Music: `assets/music.m4a` (not committed — it is third-party music in a public repo): the audio of the track supplied with the brief
  (《拉夫劳伦进行曲》; `ffmpeg -i <supplied>.mp4 -vn -c:a copy assets/music.m4a`). Expect a
  YouTube Content ID claim. `tools/music.py` cuts it to the timeline and adds synthesised whooshes, chapter hits and an end pad.
  To swap in the engine's original score instead, replace `python3 tools/music.py` with `python3 tools/score.py` in `build.sh`.
- Cuts sit on the track's sections: breakdown 11.3 s · build 29 s · drop 39.51 s (= 模块三 card) · track ends 57.68 s (= logo page).

```
./build.sh                       # fonts → timeline → music → 4K render (cached chunks) → 成片/…_4K60.mp4
./build.sh --only crash,legacy   # re-render just those scenes
node render.mjs --stills 12,40   # spot-check frames → stills/
```

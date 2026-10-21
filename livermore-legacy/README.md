# 华尔街唯一的投机之王 · 杰西·利弗莫尔

58 s · 2560×1440 · 30 fps · music only → `成片/livermore-legacy-2k.mp4`

Style: 1920s archive — monochrome photo with slow push-ins, film grain and gate weave, Noto Serif SC in cream and gold ink,
a lifetime ruler 1877→1940 (top right) that moves with the story. Shots change on the score's beats with soft cross-dissolves.
Text is sized for phone viewing (subtitles 74 px at 2K, wrapping to two lines when long).

- Portrait (opening 10 s only): `assets/photos/portrait.jpg` (upscaled 3× from the supplied photo); focus points in `assets/photos/framing.js`. Later shots are drawn period illustrations: ticker machine, 1929 front pages, banknote stacks, compass, a figure under a street lamp in the rain.
- Optional extra photos, used automatically if present: `wallst.jpg`, `crash1929.jpg`, `bucketshop.jpg`, `desk.jpg`, `rain.jpg`.
- Copy: screen text and the brief's narration (as subtitles) live in `index.html` (`shot(...)` blocks and `CAPS`).

```
./build.sh                    # full film
./build.sh --stills 150,900   # spot-check frames
```

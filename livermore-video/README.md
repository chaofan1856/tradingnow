# 大师列传 · 杰西·利弗莫尔

58 s · 2560×1440 · 30 fps · cyberpunk HUD → `成片/livermore-2k.mp4`

- Scene cuts sit on the score's beats (6.15 / 30.19 / 38.41 / 46.49 / 51.11 s); HUD brackets, grid and beat meter pulse on every beat; glitch transition on each cut.
- Narration: first person in a low male voice (offline Kokoro v1.1-zh, speaker 84, pitched down ~1 semitone + warm EQ). `tools/vo.py` regenerates `assets/vo.wav` and `timeline.js`.
- Watermark top-left: `assets/logo.png`; disclaimer fixed at the bottom for the whole film.

## Portrait
Drop photos here and rebuild; they replace the drawn hologram bust automatically (cyan hologram treatment):
- `assets/livermore.jpg` — cover portrait
- `assets/livermore-young.jpg` — scene "14岁 · 报价板" (optional; falls back to the hologram)

## Build
```
./build.sh                 # full film
./build.sh --stills 150,900  # spot-check frames
```

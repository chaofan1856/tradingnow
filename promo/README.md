# TradingNow — 10s promo

1920×1080 · 60 fps · ~10 s · motion-blurred, with a synced synthesized soundtrack.

| Time | Beat |
|------|------|
| 0.0–1.7 | A single pulse traces the market; camera follows it close — "市场，从不停歇" |
| 1.7–4.3 | Camera pulls back; candlesticks rise in a wave behind the line; live HUD + ticker |
| 4.3–5.5 | Dive into the line's head → light flash → portal opens onto the next scene |
| 5.0–7.0 | Three glass feature cards land, count up, and catch a light sweep |
| 7.0–7.95 | Cards swirl together and fuse into the logo mark (impact + shock ring) |
| 7.95–10 | Wordmark rises through a mask, tagline, light sweep, risk notice |

## Build

```bash
node render.mjs                  # frames -> out/video-silent.mp4 (Playwright + ffmpeg)
python3 sound.py                 # out/sound.wav
ffmpeg -i out/video-silent.mp4 -i out/sound.wav -c:v copy -c:a aac -b:a 256k -shortest out/tradingnow-promo.mp4
```

Open `index.html` through any static server for a real-time preview (`?t=6.4` freezes on a moment).
Every frame is a pure function of time, so preview and render are identical.
Chart figures are illustrative.

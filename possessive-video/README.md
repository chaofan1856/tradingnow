# 占有欲 · POSSESSIVE

56 s · 2560×1440 (2K) · 60 fps · cyberpunk motion graphics, cut to an original darksynth score.

| Time | Section | Picture | Sound |
|------|---------|---------|-------|
| 0–8 | intro | ECG trace bends into an eye, iris locks on, zoom through the pupil into the city | heartbeat, music box, filtered pad, riser |
| 8–16 | build | rain-soaked neon city, surveillance HUD tracking "你", data harvested one item per beat, stutter | four-on-floor, 16th bass opening up, snare fill, 1/32 stutter |
| 16–32 | drop A | 你 / 只能看我 / 只属于我 / MINE land on the beat over a beat-locked tunnel; heart caged by wire polyhedra and chains | full kit, supersaw hook, gated snare |
| 32–40 | break | heart in a glass box, slow rain; 我不是爱你 · 我是想拥有你; blackout | choir, bell hook, heartbeat, snare roll, hard cut |
| 40–52 | drop B | 占 · 有 · 欲 assemble from slices; padlock snaps shut on the click; montage cutting beat → 8th → 16th | hook up an octave, arps, crashes, lock click, roll |
| 52–56 | outro | the eye returns, title card, the eye shuts into a flatline | impact, final chord, heartbeat, lock click |

All picture hits read `events.json`, which `tools/score.py` writes alongside the audio, so sound and image share one clock.

## Build

```bash
pip install numpy scipy numba
python3 tools/score.py           # out/score.wav + events.json
node render.mjs --stills 6.5,17  # spot-check frames -> out/stills/
node render.mjs                  # frames -> out/占有欲.mp4 (Playwright Chromium + ffmpeg)
```

Open `index.html` through any static server for a real-time preview (click to play audio; `?t=17` freezes on a moment).

- `js/scenes.js` — every scene, a pure function of time
- `js/post.js` — WebGL2 post: transitions, chromatic aberration, glitch blocks, bloom, grain, scanlines
- `tools/score.py` — the synthesised score (no samples)

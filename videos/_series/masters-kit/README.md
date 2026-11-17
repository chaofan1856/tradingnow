# 大师列传 kit (helpers used for the 60-second master portraits)

Reference film: `videos/simons-quant/` (copy its build.sh, .gitignore, tools/music.py, covers/ for a new person).

- `munger_head.js` + `helpers4.js` + `<person>_body.js` → concatenated into `script.js` (`simons_body.js` is the latest example body).
- `sheet.py stills <outdir>` — contact sheets from `node render.mjs --stills …`.
- `fixlt.py web` — after `tools/web_plan.py`: a piece may not start with `<` (the asset store rejects it as markup).
- `wrap.py web/page_1.html web/index.html` — wraps the built page in a full-doctype document for publishing.

Per film: new_video.py → body JS → fonts.py → `node render.mjs --timeline` (tune FILM.timing to ≈58.0 s; the track ends at 57.68 s)
→ stills + contact sheets → `./build.sh` (≈25 min) → covers (`covers/render.sh`) → README + web/youtube.json → web_plan, fixlt,
poster, web_build, wrap → publish page, upload the pieces 3 per call, check sha256 against plan.json, rebuild, republish.

`assets/music.m4a` is never committed (third-party track, public repo): the user supplies the mp4 again in a new session.

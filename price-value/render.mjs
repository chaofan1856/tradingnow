// Frame renderer: Playwright Chromium, N pages in parallel, JPEG frames to build/frames/.
//   node render.mjs                     all frames
//   node render.mjs --stills 27.5,40    spot-check times (seconds) -> build/stills/
//   WORKERS=4 node render.mjs --from 0 --to 900
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const DIR = path.dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), arg = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const WORKERS = Number(process.env.WORKERS || 4);
const url = pathToFileURL(path.join(DIR, 'index.html')).href;

const browser = await pw.chromium.launch({ args: ['--force-color-profile=srgb', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const newPage = async () => {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  p.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  await p.goto(url); const total = await p.evaluate(() => window.ready); return { p, total };
};
const first = await newPage();
const total = first.total;
let frames, outDir, name;
if (arg('--stills')) {
  const fps = await first.p.evaluate(() => window.FPS_OUT);
  frames = arg('--stills').split(',').map(s => Math.round(parseFloat(s) * fps));
  outDir = path.join(DIR, 'build', 'stills'); name = f => `f${String(f).padStart(5, '0')}.jpg`;
} else {
  const from = +(arg('--from') ?? 0), to = Math.min(total, +(arg('--to') ?? total));
  frames = Array.from({ length: to - from }, (_, i) => from + i);
  outDir = path.join(DIR, 'build', 'frames'); name = f => `f${String(f).padStart(5, '0')}.jpg`;
}
fs.mkdirSync(outDir, { recursive: true });
if (process.env.SKIP_EXISTING) frames = frames.filter(f => !fs.existsSync(path.join(outDir, name(f))));
console.log(frames.length, 'frames to render');
const pages = [first.p];
for (let i = 1; i < Math.min(WORKERS, frames.length); i++) pages.push((await newPage()).p);
const t0 = Date.now(); let done = 0;
const chunk = Math.ceil(frames.length / pages.length);
await Promise.all(pages.map(async (p, w) => {
  for (const f of frames.slice(w * chunk, (w + 1) * chunk)) {
    await p.evaluate(f => window.seek(f), f);
    fs.writeFileSync(path.join(outDir, name(f)), await p.screenshot({ type: 'jpeg', quality: 94 }));
    if (++done % 150 === 0) console.log(`${done}/${frames.length}  ${((Date.now() - t0) / done).toFixed(0)} ms/frame avg`);
  }
}));
console.log(`done ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${path.relative(DIR, outDir)}`);
await browser.close();

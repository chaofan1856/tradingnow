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
const DPR = Number(process.env.DPR || 2);
const url = pathToFileURL(path.join(DIR, 'index.html')).href + `?dpr=${DPR}`;

const browser = await pw.chromium.launch({ args: ['--force-color-profile=srgb', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'] });
const newPage = async () => {
  const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: DPR });
  p.on('pageerror', e => { console.error('page error:', e.message); process.exitCode = 1; });
  await p.goto(url); const total = await p.evaluate(() => window.ready);
  p._cdp = await p.context().newCDPSession(p);           // direct CDP capture: ~2× faster than page.screenshot at 4K
  return { p, total };
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
  outDir = process.env.FRAMES_DIR ? path.resolve(DIR, process.env.FRAMES_DIR) : path.join(DIR, 'build', 'frames'); name = f => `f${String(f).padStart(5, '0')}.jpg`;
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
    // capture only after the compositor has committed this frame: capturing straight after seek() raced it and
    // left single frames with characters missing or stale (two renders of the same range differed)
    await p.evaluate(f => new Promise(r => { window.seek(f); requestAnimationFrame(() => requestAnimationFrame(r)); }), f);
    const { data } = await p._cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: Number(process.env.JPEGQ || 95), optimizeForSpeed: true, clip: { x: 0, y: 0, width: 1920, height: 1080, scale: DPR }, captureBeyondViewport: false, fromSurface: true });
    fs.writeFileSync(path.join(outDir, name(f)), Buffer.from(data, 'base64'));
    if (++done % 150 === 0) console.log(`${done}/${frames.length}  ${((Date.now() - t0) / done).toFixed(0)} ms/frame avg`);
  }
}));
console.log(`done ${frames.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${path.relative(DIR, outDir)}`);
await browser.close();

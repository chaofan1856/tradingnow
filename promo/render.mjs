// Renders promo/index.html frame-by-frame into an MP4.
//   node render.mjs                -> out/tradingnow-promo.mp4
//   node render.mjs --stills 1,4.8  -> out/still-*.png (quick look)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(DIR, 'out');
fs.mkdirSync(OUT, { recursive: true });
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;

const TYPES = { '.html': 'text/html', '.woff2': 'font/woff2', '.otf': 'font/otf', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  const p = path.join(DIR, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(DIR) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, r));
const url = `http://127.0.0.1:${server.address().port}/index.html?render`;

const browser = await playwright.chromium.launch({ args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
page.on('pageerror', e => console.error('page error:', e.message));
await page.goto(url);
await page.evaluate(() => window.ready);
const clip = { x: 0, y: 0, width: 1920, height: 1080 };

if (stillsArg) {
  for (const t of stillsArg.split(',').map(Number)) {
    await page.evaluate(t => window.renderFrame(t), t);
    await page.screenshot({ path: path.join(OUT, `still-${t.toFixed(2)}.png`), clip });
  }
} else {
  // frames to disk across parallel pages, then one encode
  const { DURATION, FPS } = await page.evaluate(() => ({ DURATION: window.DURATION, FPS: window.FPS }));
  const frames = Math.round(DURATION * FPS);
  const FR = path.join(OUT, 'frames');
  fs.mkdirSync(FR, { recursive: true });
  const WORKERS = Number(process.env.WORKERS || 3);
  const pages = [page];
  for (let i = 1; i < WORKERS; i++) {
    const p = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    p.on('pageerror', e => console.error('page error:', e.message));
    await p.goto(url); await p.evaluate(() => window.ready); pages.push(p);
  }
  const t0 = Date.now(); let done = 0, next = 0;
  await Promise.all(pages.map(async pg => {
    while (next < frames) {
      const f = next++;
      const file = path.join(FR, `f${String(f).padStart(4, '0')}.png`);
      if (fs.existsSync(file)) { done++; continue; }
      await pg.evaluate(([t, f]) => window.renderFrame(t, f), [f / FPS, f]);
      await pg.screenshot({ path: file + '.tmp.png', type: 'png', clip });
      fs.renameSync(file + '.tmp.png', file);
      if (++done % 30 === 0) console.log(`frame ${done}/${frames}  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
    }
  }));
  const silent = path.join(OUT, 'video-silent.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(FR, 'f%04d.png'),
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-pix_fmt', 'yuv420p', '-tune', 'film', '-movflags', '+faststart', silent], { stdio: 'inherit' });
  await new Promise(r => ff.on('close', r));
  console.log('wrote', silent);
}
await browser.close();
server.close();

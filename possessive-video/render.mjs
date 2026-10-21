// Renders index.html frame-by-frame (2560×1440, 60 fps) and muxes out/score.wav.
//   node render.mjs                     -> out/占有欲.mp4
//   node render.mjs --stills 3,6.2,17   -> out/stills/*.jpg (quick look)
//   WORKERS=4 node render.mjs           parallel pages (default 4)
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
const W = 2560, H = 1440;
const args = process.argv.slice(2);
const stillsArg = args.includes('--stills') ? args[args.indexOf('--stills') + 1] : null;
const rangeArg = args.includes('--range') ? args[args.indexOf('--range') + 1].split(',').map(Number) : null;

const TYPES = { '.html': 'text/html', '.woff2': 'font/woff2', '.otf': 'font/otf', '.js': 'text/javascript', '.json': 'application/json', '.wav': 'audio/wav' };
const server = http.createServer((req, res) => {
  const p = path.join(DIR, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (!p.startsWith(DIR) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});
await new Promise(r => server.listen(0, r));
const EVENTS = args.includes('--events') ? args[args.indexOf('--events') + 1] : null;
const url = `http://127.0.0.1:${server.address().port}/index.html?render${EVENTS ? '&events=' + encodeURIComponent(EVENTS) : ''}`;
const timemapArg = args.includes('--timemap') ? args[args.indexOf('--timemap') + 1] : null;

const browser = await playwright.chromium.launch({ args: ['--force-color-profile=srgb', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
async function openPage() {
  const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  p.on('pageerror', e => console.error('page error:', e.message));
  p.on('console', m => { if (m.type() === 'error') console.error('console:', m.text()); });
  await p.goto(url);
  await p.evaluate(() => window.ready);
  return p;
}
const clip = { x: 0, y: 0, width: W, height: H };

if (timemapArg) {
  // retimed cut: one output frame per entry, at the film time the map gives.
  // Drops (film runs faster than real time) reuse the nearest master frame;
  // half-time sections render their in-between frames fresh.
  const tm = JSON.parse(fs.readFileSync(path.join(DIR, timemapArg), 'utf8'));
  const FR = path.join(OUT, 'frames'), FO = path.join(OUT, 'frames-remix');
  fs.mkdirSync(FO, { recursive: true });
  const master = f => path.join(FR, `f${String(f).padStart(5, '0')}.jpg`);
  const todo = [];
  tm.film.forEach((tv, i) => {
    const file = path.join(FO, `f${String(i).padStart(5, '0')}.jpg`);
    if (fs.existsSync(file)) return;
    const n = Math.round(tv * 60);
    const exact = Math.abs(tv * 60 - n) < 1e-3;
    const fast = (tv >= 8 && tv < 32) || (tv >= 40 && tv < 52);
    if ((exact || fast) && fs.existsSync(master(n))) fs.linkSync(master(n), file);
    else todo.push([i, tv, file]);
  });
  console.log(`timemap: ${tm.film.length} frames, ${tm.film.length - todo.length} reused, ${todo.length} to render`);
  const WORKERS = Number(process.env.WORKERS || 4);
  const pages = [];
  for (let i = 0; i < WORKERS; i++) pages.push(await openPage());
  const t0 = Date.now(); let done = 0, next = 0;
  await Promise.all(pages.map(async pg => {
    while (next < todo.length) {
      const [, tv, file] = todo[next++];
      await pg.evaluate(t => window.renderFrame(t), tv);
      await pg.screenshot({ path: file + '.tmp.jpg', type: 'jpeg', quality: 96, clip });
      fs.renameSync(file + '.tmp.jpg', file);
      if (++done % 60 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`frame ${done}/${todo.length}  ${el.toFixed(0)}s  eta ${((el / done) * (todo.length - done)).toFixed(0)}s`);
      }
    }
  }));
  const mp4 = path.join(OUT, '占有欲_remix_master.mp4');
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(tm.fps), '-i', path.join(FO, 'f%05d.jpg'), '-i', path.join(OUT, 'remix.wav'),
    '-c:v', 'libx264', '-preset', 'slow', '-b:v', '12M', '-maxrate', '20M', '-bufsize', '24M', '-tune', 'grain', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
  await new Promise(r => ff.on('close', r));
  console.log('wrote', mp4);
} else if (stillsArg) {
  const page = await openPage();
  const SD = path.join(OUT, 'stills');
  fs.mkdirSync(SD, { recursive: true });
  for (const t of stillsArg.split(',').map(Number)) {
    const t0 = Date.now();
    await page.evaluate(t => window.renderFrame(t), t);
    await page.screenshot({ path: path.join(SD, `s-${t.toFixed(2)}.jpg`), type: 'jpeg', quality: 88, clip });
    console.log(`still ${t}  ${Date.now() - t0}ms`);
  }
} else {
  const page = await openPage();
  const { DURATION, FPS } = await page.evaluate(() => ({ DURATION: window.DURATION, FPS: window.FPS }));
  const frames = Math.round(DURATION * FPS);
  const [f0, f1] = rangeArg ? [Math.round(rangeArg[0] * FPS), Math.round(rangeArg[1] * FPS)] : [0, frames];
  const FR = path.join(OUT, 'frames');
  fs.mkdirSync(FR, { recursive: true });
  const WORKERS = Number(process.env.WORKERS || 4);
  const pages = [page];
  for (let i = 1; i < WORKERS; i++) pages.push(await openPage());
  const t0 = Date.now(); let done = 0, next = f0;
  await Promise.all(pages.map(async pg => {
    while (next < f1) {
      const f = next++;
      const file = path.join(FR, `f${String(f).padStart(5, '0')}.jpg`);
      if (fs.existsSync(file)) { done++; continue; }
      await pg.evaluate(t => window.renderFrame(t), f / FPS);
      await pg.screenshot({ path: file + '.tmp.jpg', type: 'jpeg', quality: 96, clip });
      fs.renameSync(file + '.tmp.jpg', file);
      if (++done % 60 === 0) {
        const el = (Date.now() - t0) / 1000;
        console.log(`frame ${done}/${f1 - f0}  ${el.toFixed(0)}s  eta ${((el / done) * (f1 - f0 - done)).toFixed(0)}s`);
      }
    }
  }));
  if (!rangeArg) {
    const mp4 = path.join(OUT, '占有欲.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(FR, 'f%05d.jpg'), '-i', path.join(OUT, 'score.wav'),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-tune', 'film',
      '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', mp4], { stdio: 'inherit' });
    await new Promise(r => ff.on('close', r));
    console.log('wrote', mp4);
  }
}
await browser.close();
server.close();

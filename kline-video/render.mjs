// Parallel, segmented 4K renderer: headless Chrome over raw CDP (Node 22 built-in WebSocket) → ffmpeg.
// Zero npm dependencies.
//
// The film is cut into chunks (≤ CHUNK frames, never crossing a scene boundary). N browser tabs pull
// chunks from a queue; each tab pipes its JPEG frames straight into its own ffmpeg (no frames on disk).
// Finished chunks are cached by content hash, so editing one scene only re-renders that scene.
//
//   node render.mjs                     full film, 4K 60fps          -> segs/*.mp4 + video.mp4 + timeline.json
//   node render.mjs --workers 4         number of parallel tabs (default: CPU count − 1, min 2)
//   node render.mjs --only up,down      re-render just these scene ids (others come from the cache)
//   node render.mjs --preview           1080p, fast encode       -> 成片/preview-1080p.mp4 (separate cache)
//   node render.mjs --stills 3.5,40     PNG-quality JPEG stills at these seconds -> stills/
//   node render.mjs --timeline          only write timeline.json (for the score)
//   node render.mjs --shard 2/4         render only quarter 2 of 4 (multi-session rendering, see PIPELINE.md); no stitch
import { spawn, execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = 9341;
const W = 1920, H = 1080, FPS = 60, CHUNK = 300;

const argv = process.argv.slice(2);
const arg = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const PREVIEW = argv.includes('--preview');
const DSF = PREVIEW ? 1 : 2;
const WORKERS = parseInt(arg('--workers') || String(Math.max(2, os.cpus().length - 1)), 10);
const ONLY = arg('--only')?.split(',');
const STILLS = arg('--stills')?.split(',').map(Number).filter(Number.isFinite);
const TIMELINE_ONLY = argv.includes('--timeline');
const SHARD = arg('--shard')?.split('/').map(Number);      // --shard 2/4 → render only the 2nd of 4 contiguous quarters (for multi-session rendering)
const STALL_MS = 120000;                                    // a frame that takes longer than this = hung tab → reopen it and redo the chunk
const SEG_DIR = path.join(DIR, PREVIEW ? 'segs-preview' : 'segs');

/* ---------- browser ---------- */
function onPath(name) { try { return execFileSync('which', [name], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || null; } catch { return null; } }
function findBrowser() {
  const c = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', onPath('google-chrome'), onPath('chromium'), onPath('chromium-browser'), onPath('chrome')];
  for (const p of c) if (p && fs.existsSync(p)) return p;
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(os.homedir(), '.cache/ms-playwright')].filter(Boolean)) {
    if (!fs.existsSync(root)) continue;
    if (fs.existsSync(path.join(root, 'chromium')) && fs.statSync(path.join(root, 'chromium')).isFile()) return path.join(root, 'chromium');
    for (const d of fs.readdirSync(root).filter(d => /^chromium-\d+$/.test(d)).sort().reverse())
      for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome']) { const p = path.join(root, d, rel); if (fs.existsSync(p)) return p; }
  }
  throw new Error('No Chrome/Chromium found. Set CHROME_PATH.');
}

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.listeners = []; }
  open() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = resolve; this.ws.onerror = e => reject(e.error || new Error('CDP socket error'));
      this.ws.onmessage = ev => {
        const m = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
        if (m.id && this.pending.has(m.id)) { const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result); }
        else if (m.method) for (const l of this.listeners) l(m);
      };
    });
  }
  send(method, params = {}, sessionId) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })); return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject })); }
  once(method, sessionId) { return new Promise(r => { const l = m => { if (m.method === method && m.sessionId === sessionId) { this.listeners.splice(this.listeners.indexOf(l), 1); r(m.params); } }; this.listeners.push(l); }); }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function openPage(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => cdp.send(m, p, sessionId);
  await S('Page.enable'); await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DSF, mobile: false });
  const loaded = cdp.once('Page.loadEventFired', sessionId);
  await S('Page.navigate', { url: pathToFileURL(path.join(DIR, 'index.html')).href });
  await loaded;
  const evalJS = async expr => {
    const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  await evalJS('window.ASSETS_READY');
  const shot = async f => {
    let timer;
    const stall = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`stalled on frame ${f}`)), STALL_MS); });
    try {
      return await Promise.race([stall, (async () => {
        await evalJS(`window.seek(${f})`);
        const { data } = await S('Page.captureScreenshot', { format: 'jpeg', quality: PREVIEW ? 88 : +(process.env.JPEGQ || 100), optimizeForSpeed: true, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
        return Buffer.from(data, 'base64');
      })()]);
    } finally { clearTimeout(timer); }
  };
  const close = () => cdp.send('Target.closeTarget', { targetId }).catch(() => {});
  return { evalJS, shot, close };
}

/* ---------- encoder per chunk ---------- */
function encoder(file) {
  const v = PREVIEW
    ? ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20']
    : ['-c:v', 'libx264', '-preset', process.env.PRESET || 'medium', '-crf', process.env.CRF || '12', '-tune', 'grain', '-profile:v', 'high', '-level', '5.2'];
  const p = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
    ...v, '-threads', process.env.X264_THREADS || '1', '-g', String(FPS * 2), '-bf', '2', '-pix_fmt', 'yuv420p', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-vf', 'scale=in_range=full:out_range=tv:in_color_matrix=bt709:out_color_matrix=bt709', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((res, rej) => p.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));
  const write = buf => new Promise(r => p.stdin.write(buf) ? r() : p.stdin.once('drain', r));
  return { write, end: () => { p.stdin.end(); return done; } };
}

async function main() {
  const exe = findBrowser();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'kline-chrome-'));
  const flags = ['--headless=new', `--remote-debugging-port=${PORT}`, '--force-color-profile=srgb', `--user-data-dir=${profile}`, '--no-first-run',
    '--hide-scrollbars', '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--enable-gpu-rasterization', '--ignore-gpu-blocklist'];
  if (process.getuid?.() === 0) flags.push('--no-sandbox');
  const chrome = spawn(exe, [...flags, 'about:blank'], { stdio: 'ignore' });
  let cdp;
  try {
    let ver; for (let i = 0; i < 100 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(100); } }
    cdp = new CDP(ver.webSocketDebuggerUrl); await cdp.open();

    const first = await openPage(cdp);
    const total = await first.evalJS('window.TOTAL_FRAMES');
    const timeline = await first.evalJS('window.TIMELINE');
    const title = await first.evalJS('window.FILM.title');
    fs.writeFileSync(path.join(DIR, 'timeline.json'), JSON.stringify({ title, fps: FPS, frames: total, seconds: total / FPS, scenes: timeline }, null, 1));
    console.log(`film: ${total} frames = ${(total / FPS).toFixed(1)} s, ${timeline.length} scenes, ${DSF === 2 ? '3840×2160' : '1920×1080'}`);
    if (TIMELINE_ONLY) return;

    if (STILLS) {
      fs.mkdirSync(path.join(DIR, 'stills'), { recursive: true });
      for (const s of STILLS) { fs.writeFileSync(path.join(DIR, 'stills', `t${s.toFixed(2)}.jpg`), await first.shot(Math.round(s * FPS))); }
      console.log('stills →', STILLS.length); return;
    }

    /* chunk plan + cache */
    const src = fs.readFileSync(path.join(DIR, 'index.html')) + fs.readFileSync(path.join(DIR, 'script.js'));
    const hash = crypto.createHash('sha1').update(src).update(String(DSF)).digest('hex').slice(0, 10);
    fs.mkdirSync(SEG_DIR, { recursive: true });
    const manPath = path.join(SEG_DIR, 'manifest.json');
    const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : {};
    const chunks = [];
    for (const sc of timeline) for (let a = sc.f0; a < sc.f1; a += CHUNK) chunks.push({ scene: sc.id, a, b: Math.min(a + CHUNK, sc.f1) });
    chunks.forEach((c, i) => { c.file = path.join(SEG_DIR, `c${String(i).padStart(4, '0')}_${c.a}-${c.b}.mp4`); c.key = `${c.a}-${c.b}`; });
    // a chunk is fresh if: same range, file exists, and (it belongs to a scene we're not forcing) and (hash matches OR --only given and scene not listed)
    let todo = chunks.filter(c => {
      const ok = fs.existsSync(c.file) && man[c.key];
      if (ONLY) return ONLY.includes(c.scene) || !ok;
      return !(ok && man[c.key] === hash);
    });
    if (SHARD) {                                            // contiguous, frame-balanced quarter of the film
      const [k, n] = SHARD, lo = Math.round(total * (k - 1) / n), hi = Math.round(total * k / n);
      const mine = new Set(chunks.filter(c => { const mid = (c.a + c.b) / 2; return mid >= lo && mid < hi; }).map(c => c.key));
      todo = todo.filter(c => mine.has(c.key));
      console.log(`shard ${k}/${n}: frames ~${lo}-${hi}, ${mine.size} chunks`);
    }
    console.log(`chunks: ${chunks.length} total, ${todo.length} to render, ${WORKERS} workers`);

    const pages = [first]; for (let i = 1; i < Math.min(WORKERS, todo.length); i++) pages.push(await openPage(cdp));
    const t0 = performance.now(); let framesDone = 0; const framesTodo = todo.reduce((s, c) => s + c.b - c.a, 0);
    let next = 0;
    await Promise.all(pages.map(async (pg, w) => {
      while (next < todo.length) {
        const c = todo[next++];
        for (let attempt = 1; ; attempt++) {
          const enc = encoder(c.file + '.part.mp4'); let n = 0;
          try {
            for (let f = c.a; f < c.b; f++) {
              await enc.write(await pg.shot(f)); n++;
              if (++framesDone % 150 === 0) {
                const s = (performance.now() - t0) / 1000, fps = framesDone / s;
                console.log(`${framesDone}/${framesTodo} frames  ${fps.toFixed(2)} fps  ETA ${((framesTodo - framesDone) / fps / 60).toFixed(1)} min`);
              }
            }
            await enc.end();
            break;
          } catch (e) {                                     // hung or crashed tab: fresh tab, redo this chunk
            if (attempt >= 4) throw e;
            console.log(`worker ${w}: ${e.message} — retrying chunk ${c.key} (attempt ${attempt + 1})`);
            framesDone -= n; enc.end().catch(() => {}); await pg.close();
            pg = pages[w] = await openPage(cdp);
          }
        }
        fs.renameSync(c.file + '.part.mp4', c.file);
        man[c.key] = hash; fs.writeFileSync(manPath, JSON.stringify(man));
      }
    }));
    console.log(`rendered ${framesTodo} frames in ${((performance.now() - t0) / 60000).toFixed(1)} min`);

    if (SHARD) { console.log('shard done (no stitch)'); return; }
    /* stitch: stream-copy concat (all chunks share encoder settings and start on a keyframe) */
    const list = path.join(SEG_DIR, 'list.txt');
    fs.writeFileSync(list, chunks.map(c => `file '${path.basename(c.file)}'`).join('\n'));
    const out = path.join(DIR, PREVIEW ? 'video-preview.mp4' : 'video.mp4');
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', '-movflags', '+faststart', out]);
    console.log('stitched →', path.relative(DIR, out));
  } finally {
    try { await Promise.race([cdp?.send('Browser.close'), sleep(1500)]); } catch {}
    try { chrome.kill(); } catch {}
    await sleep(300); fs.rmSync(profile, { recursive: true, force: true });
  }
}
main().catch(e => { console.error(e); process.exit(1); });

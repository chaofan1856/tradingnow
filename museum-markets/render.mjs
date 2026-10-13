// Deterministic frame-by-frame renderer: headless Chromium driven over raw CDP
// (Node 22 built-in WebSocket, zero npm deps). Every frame = window.seek(n) →
// Page.captureScreenshot. No screen recording anywhere.
//
//   node render.mjs                     all frames → piped into ffmpeg → out/video-only.mp4
//   node render.mjs --stills 90,300     spot-check  → stills/s00090.png …
//   node render.mjs --workers 4         parallel tabs (default: min(4, cpus))
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = 9341, W = 1920, H = 1080, FPS = 30;

const argv = process.argv.slice(2);
const arg = n => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const STILLS = arg('--stills')?.split(',').map(Number).filter(Number.isFinite);
const WORKERS = Number(arg('--workers') ?? Math.min(4, os.cpus().length));
const FROM = Number(arg('--from') ?? 0), TO = arg('--to') ? Number(arg('--to')) : undefined;

function findBrowser() {
  const ok = p => p && fs.existsSync(p) ? p : null;
  if (ok(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  for (const n of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { const p = execFileSync('which', [n], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); if (ok(p)) return p; } catch {}
  }
  for (const p of ['/opt/pw-browsers/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome']) if (ok(p)) return p;
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || path.join(os.homedir(), '.cache/ms-playwright');
  if (fs.existsSync(root)) for (const d of fs.readdirSync(root).filter(d => /^chromium-\d+$/.test(d)).sort().reverse())
    for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome']) if (ok(path.join(root, d, rel))) return path.join(root, d, rel);
  throw new Error('No Chromium found — set CHROME_PATH');
}

class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.listeners = []; }
  open() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => res();
      this.ws.onerror = e => rej(e.error || new Error('CDP socket error'));
      this.ws.onmessage = ev => {
        const m = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
        if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); }
        else if (m.method) for (const l of [...this.listeners]) l(m);
      };
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((res, rej) => this.pending.set(id, { res, rej }));
  }
  once(method, sessionId) {
    return new Promise(res => { const l = m => { if (m.method === method && m.sessionId === sessionId) { this.listeners.splice(this.listeners.indexOf(l), 1); res(m.params); } }; this.listeners.push(l); });
  }
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function openPage(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => cdp.send(m, p, sessionId);
  await S('Page.enable'); await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  const loaded = cdp.once('Page.loadEventFired', sessionId);
  await S('Page.navigate', { url: pathToFileURL(path.join(DIR, 'index.html')).href });
  await loaded;
  const evalJS = async expr => {
    const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const total = await evalJS('window.READY.then(() => window.TOTAL_FRAMES)');
  const shot = async (f, format) => {
    const got = await evalJS(`window.seek(${f})`);
    if (got !== f) throw new Error(`seek(${f}) returned ${got}`);
    const { data } = await S('Page.captureScreenshot', { format, ...(format === 'jpeg' ? { quality: 96 } : {}), clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
    return Buffer.from(data, 'base64');
  };
  return { total, shot };
}

async function main() {
  const exe = findBrowser();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'museum-chrome-'));
  const flags = ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1',
    '--force-color-profile=srgb', `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
    '--allow-file-access-from-files'];
  if (process.getuid?.() === 0) flags.push('--no-sandbox');
  const chrome = spawn(exe, [...flags, 'about:blank'], { stdio: 'ignore' });
  let cdp;
  try {
    let ver;
    for (let i = 0; i < 100 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(100); } }
    if (!ver) throw new Error('DevTools endpoint did not come up');
    cdp = new CDP(ver.webSocketDebuggerUrl); await cdp.open();

    if (STILLS) {
      const pg = await openPage(cdp);
      fs.mkdirSync(path.join(DIR, 'stills'), { recursive: true });
      for (const f of STILLS) fs.writeFileSync(path.join(DIR, 'stills', `s${String(f).padStart(5, '0')}.png`), await pg.shot(f, 'png'));
      console.log('stills →', STILLS.join(','));
      return;
    }

    const pages = await Promise.all(Array.from({ length: WORKERS }, () => openPage(cdp)));
    const total = pages[0].total, last = Math.min(TO ?? total, total);
    fs.mkdirSync(path.join(DIR, 'out'), { recursive: true });
    const outFile = path.join(DIR, 'out', 'video-only.mp4');
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-c:v', 'mjpeg', '-framerate', String(FPS), '-i', '-',
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
    const ffDone = new Promise((res, rej) => ff.on('close', c => c === 0 ? res() : rej(new Error('ffmpeg exit ' + c))));

    // workers render interleaved frames; the writer emits them strictly in order
    const done = new Map(); let next = FROM, written = FROM, t0 = performance.now();
    let wake = null;
    const writer = (async () => {
      while (written < last) {
        if (!done.has(written)) { await new Promise(r => (wake = r)); continue; }
        const buf = done.get(written); done.delete(written);
        if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
        written++;
        if (written % 90 === 0 || written === last) console.log(`${written}/${last}  ${((performance.now() - t0) / (written - FROM)).toFixed(0)} ms/frame`);
      }
      ff.stdin.end();
    })();
    await Promise.all(pages.map(async pg => {
      while (next < last) {
        const f = next++;
        while (done.size > WORKERS * 6) await sleep(5);
        done.set(f, await pg.shot(f, 'jpeg'));
        wake?.(); wake = null;
      }
    }));
    await writer; await ffDone;
    console.log('done →', path.relative(DIR, outFile));
  } finally {
    try { await Promise.race([cdp?.send('Browser.close'), sleep(1500)]); } catch {}
    try { chrome.kill(); } catch {}
    await sleep(300);
    fs.rmSync(profile, { recursive: true, force: true });
  }
}
main().catch(e => { console.error(e); process.exit(1); });

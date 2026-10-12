// Frame-by-frame renderer: headless Chrome driven over raw CDP (Node 22 built-in WebSocket).
// Zero npm dependencies.
//
//   node render.mjs                 all frames      -> frames/f00000.jpg …
//   node render.mjs --to 300        first 300 frames only
//   node render.mjs --stills 1,300  spot-check      -> stills/s00001.jpg …
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = 9333;
const W = 1920, H = 1080;

/* ---------- args ---------- */
const argv = process.argv.slice(2);
const arg = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const TO = arg('--to') ? parseInt(arg('--to'), 10) : undefined;
const STILLS = arg('--stills') ? arg('--stills').split(',').map(s => parseInt(s, 10)).filter(Number.isFinite) : undefined;

/* ---------- ① find a browser: CHROME_PATH → Chrome → Edge → Playwright cache ---------- */
function onPath(name) {
  try { return execFileSync(process.platform === 'win32' ? 'where' : 'which', [name], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split(/\r?\n/)[0].trim() || null; }
  catch { return null; }
}
function findBrowser() {
  const exists = p => p && fs.existsSync(p) ? p : null;
  if (exists(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const pf = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.LOCALAPPDATA].filter(Boolean);
  const chrome = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    ...pf.map(p => path.join(p, 'Google/Chrome/Application/chrome.exe')),
    onPath('google-chrome'), onPath('google-chrome-stable'), onPath('chromium'), onPath('chromium-browser'), onPath('chrome'),
  ];
  const edge = [
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    ...pf.map(p => path.join(p, 'Microsoft/Edge/Application/msedge.exe')),
    onPath('microsoft-edge'), onPath('microsoft-edge-stable'), onPath('msedge'),
  ];
  for (const c of [...chrome, ...edge]) if (exists(c)) return c;
  const caches = [
    process.env.PLAYWRIGHT_BROWSERS_PATH,
    path.join(os.homedir(), '.cache/ms-playwright'),
    path.join(os.homedir(), 'Library/Caches/ms-playwright'),
    process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, 'ms-playwright'),
  ].filter(Boolean);
  for (const root of caches) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => +b.split('-')[1] - +a.split('-')[1]);
    for (const d of dirs) for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium',
      'chrome-mac-arm64/Chromium.app/Contents/MacOS/Chromium', 'chrome-win/chrome.exe', 'chrome-win64/chrome.exe']) {
      const p = path.join(root, d, rel); if (fs.existsSync(p)) return p;
    }
  }
  throw new Error('No Chrome/Edge/Chromium found. Set CHROME_PATH to a Chromium-based browser.');
}

/* ---------- minimal CDP client over the built-in WebSocket ---------- */
class CDP {
  constructor(url) { this.url = url; this.id = 0; this.pending = new Map(); this.listeners = []; }
  open() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
      this.ws.onopen = () => resolve();
      this.ws.onerror = e => reject(e.error || new Error('CDP socket error'));
      this.ws.onmessage = ev => {
        const msg = JSON.parse(typeof ev.data === 'string' ? ev.data : Buffer.from(ev.data).toString());
        if (msg.id && this.pending.has(msg.id)) {
          const { resolve, reject } = this.pending.get(msg.id); this.pending.delete(msg.id);
          msg.error ? reject(new Error(`${msg.error.message} (${msg.error.code})`)) : resolve(msg.result);
        } else if (msg.method) for (const l of this.listeners) l(msg);
      };
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  once(method, sessionId) {
    return new Promise(resolve => {
      const l = m => { if (m.method === method && (!sessionId || m.sessionId === sessionId)) { this.listeners.splice(this.listeners.indexOf(l), 1); resolve(m.params); } };
      this.listeners.push(l);
    });
  }
  close() { try { this.ws.close(); } catch {} }
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const exe = findBrowser();
  console.log('browser:', exe);
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'stock-video-chrome-'));

  /* ② launch */
  const flags = [
    '--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`,
    '--force-device-scale-factor=1', '--force-color-profile=srgb', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--hide-scrollbars', '--mute-audio',
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
  ];
  if (process.platform === 'linux' && process.getuid && process.getuid() === 0) flags.push('--no-sandbox');
  const chrome = spawn(exe, [...flags, 'about:blank'], { stdio: 'ignore' });
  let cdp;

  const cleanup = async () => {
    try { if (cdp) await Promise.race([cdp.send('Browser.close'), sleep(1500)]); } catch {}
    cdp?.close();
    try { chrome.kill(); } catch {}
    await sleep(300);
    try { fs.rmSync(profile, { recursive: true, force: true }); } catch (e) { console.warn('profile cleanup skipped:', e.code || e.message); } // EBUSY on Windows
  };

  try {
    /* ③ discover the browser websocket */
    let ver;
    for (let i = 0; i < 100 && !ver; i++) {
      try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(100); }
    }
    if (!ver) throw new Error('Chrome did not expose the DevTools endpoint');
    cdp = new CDP(ver.webSocketDebuggerUrl);
    await cdp.open();

    /* ④ target + session + metrics + navigate */
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const S = (m, p) => cdp.send(m, p, sessionId);
    await S('Page.enable'); await S('Runtime.enable');
    await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    await S('Emulation.setDefaultBackgroundColorOverride', { color: { r: 5, g: 7, b: 14, a: 1 } });
    const loaded = cdp.once('Page.loadEventFired', sessionId);
    await S('Page.navigate', { url: pathToFileURL(path.join(DIR, 'index.html')).href });
    await loaded;

    /* ⑤ fonts + every <img> decoded */
    const evalJS = async expr => {
      const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
      return r.result.value;
    };
    const total = await evalJS(`document.fonts.ready
      .then(() => Promise.all([...document.images].map(i => i.decode().catch(() => null))))
      .then(() => window.TOTAL_FRAMES)`);

    /* ⑥ frames */
    const list = STILLS ?? Array.from({ length: Math.min(TO ?? total, total) }, (_, i) => i);
    const outDir = path.join(DIR, STILLS ? 'stills' : 'frames');
    fs.mkdirSync(outDir, { recursive: true });
    if (!STILLS) for (const f of fs.readdirSync(outDir)) if (/^f\d{5}\.jpg$/.test(f)) fs.rmSync(path.join(outDir, f));
    const t0 = performance.now();
    for (let n = 0; n < list.length; n++) {
      const f = list[n];
      await evalJS(`window.seek(${f})`);
      const { data } = await S('Page.captureScreenshot', { format: 'jpeg', quality: 95, clip: { x: 0, y: 0, width: W, height: H, scale: 1 } });
      fs.writeFileSync(path.join(outDir, `${STILLS ? 's' : 'f'}${String(f).padStart(5, '0')}.jpg`), Buffer.from(data, 'base64'));
      if ((n + 1) % 60 === 0 || n === list.length - 1) {
        const ms = (performance.now() - t0) / (n + 1);
        console.log(`${n + 1}/${list.length} frames  ${ms.toFixed(0)} ms/frame`);
      }
    }
    console.log('done →', path.relative(DIR, outDir));
  } finally {
    /* ⑧ close + clean the temp profile */
    await cleanup();
  }
}

main().catch(e => { console.error(e); process.exit(1); });

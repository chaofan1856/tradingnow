// Deterministic frame-by-frame renderer: headless Chrome over raw CDP (Node 22 built-in WebSocket).
// Every frame = window.seek(n) → Page.captureScreenshot. No screen recording, zero npm dependencies.
//
//   node render.mjs                         all frames      -> frames/f00000.jpg …
//   node render.mjs --stills 90,300,500     spot-check      -> stills/s00090.jpg …
//   node render.mjs --only 2338,2339        re-render given frames into frames/
//   node render.mjs --workers 3             parallel tabs (default: 3)
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PORT = 9341;
const W = 1920, H = 1080;

const argv = process.argv.slice(2);
const arg = name => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const STILLS = arg('--stills') ? arg('--stills').split(',').map(s => parseInt(s, 10)).filter(Number.isFinite) : undefined;
const ONLY = arg('--only') ? arg('--only').split(',').map(s => parseInt(s, 10)).filter(Number.isFinite) : undefined;
const WORKERS = parseInt(arg('--workers') ?? '3', 10);
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout after ${ms}ms: ${what}`)), ms))]);

function onPath(name) {
  try { return execFileSync(process.platform === 'win32' ? 'where' : 'which', [name], { stdio: ['ignore', 'pipe', 'ignore'] }).toString().split(/\r?\n/)[0].trim() || null; }
  catch { return null; }
}
function findBrowser() {
  const exists = p => p && fs.existsSync(p) ? p : null;
  const cands = [process.env.CHROME_PATH, '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    onPath('google-chrome'), onPath('google-chrome-stable'), onPath('chromium'), onPath('chromium-browser'), onPath('chrome')];
  for (const c of cands) if (exists(c)) return c;
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, path.join(os.homedir(), '.cache/ms-playwright')].filter(Boolean)) {
    if (!fs.existsSync(root)) continue;
    const dirs = fs.readdirSync(root).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => +b.split('-')[1] - +a.split('-')[1]);
    for (const d of dirs) for (const rel of ['chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium'])
      if (exists(path.join(root, d, rel))) return path.join(root, d, rel);
  }
  throw new Error('No Chrome/Chromium found. Set CHROME_PATH.');
}

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

async function openTab(cdp) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => cdp.send(m, p, sessionId);
  await S('Page.enable'); await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await S('Emulation.setDefaultBackgroundColorOverride', { color: { r: 14, g: 11, b: 8, a: 1 } });
  const loaded = cdp.once('Page.loadEventFired', sessionId);
  await S('Page.navigate', { url: pathToFileURL(path.join(DIR, 'index.html')).href });
  await loaded;
  const evalJS = async expr => {
    const r = await S('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('page error: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  };
  const total = await evalJS('Promise.resolve(window.ASSETS_READY).then(() => window.TOTAL_FRAMES)');
  return { S, evalJS, total };
}

async function main() {
  const exe = findBrowser();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'market-museum-chrome-'));
  const flags = ['--headless=new', `--remote-debugging-port=${PORT}`, `--window-size=${W},${H}`, '--force-device-scale-factor=1',
    '--force-color-profile=srgb', `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', '--hide-scrollbars',
    '--mute-audio', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'];
  if (process.platform === 'linux' && process.getuid?.() === 0) flags.push('--no-sandbox');
  const chrome = spawn(exe, [...flags, 'about:blank'], { stdio: 'ignore' });
  let cdp;
  try {
    let ver;
    for (let i = 0; i < 100 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(100); } }
    if (!ver) throw new Error('Chrome did not expose the DevTools endpoint');
    cdp = new CDP(ver.webSocketDebuggerUrl); await cdp.open();

    const tabs = await Promise.all(Array.from({ length: STILLS ? 1 : WORKERS }, () => openTab(cdp)));
    const total = tabs[0].total;
    const list = STILLS ?? ONLY ?? Array.from({ length: total }, (_, i) => i);
    const outDir = path.join(DIR, STILLS ? 'stills' : 'frames');
    fs.mkdirSync(outDir, { recursive: true });
    if (!STILLS && !ONLY) for (const f of fs.readdirSync(outDir)) if (/^f\d{5}\.(jpg|png)$/.test(f)) fs.rmSync(path.join(outDir, f));

    let next = 0, done = 0; const t0 = performance.now();
    await Promise.all(tabs.map(async tab => {
      while (next < list.length) {
        const f = list[next++];
        await withTimeout(tab.evalJS(`window.seek(${f})`), 30000, `seek ${f}`);
        const { data } = await withTimeout(tab.S('Page.captureScreenshot', { format: STILLS ? 'png' : 'jpeg', quality: STILLS ? undefined : 94, clip: { x: 0, y: 0, width: W, height: H, scale: 1 }, captureBeyondViewport: false }), 30000, `capture ${f}`);
        fs.writeFileSync(path.join(outDir, `${STILLS ? 's' : 'f'}${String(f).padStart(5, '0')}.${STILLS ? 'png' : 'jpg'}`), Buffer.from(data, 'base64'));
        if (++done % 120 === 0 || done === list.length) console.log(`${done}/${list.length}  ${((performance.now() - t0) / done).toFixed(0)} ms/frame`);
      }
    }));
    const red = await tabs[0].evalJS('window.redUsage()');
    console.log('red ledger (tab 0):', JSON.stringify(red));
    console.log('done →', path.relative(DIR, outDir));
  } finally {
    try { if (cdp) await Promise.race([cdp.send('Browser.close'), sleep(1500)]); } catch {}
    cdp?.close(); try { chrome.kill(); } catch {}
    await sleep(300); try { fs.rmSync(profile, { recursive: true, force: true }); } catch {}
  }
}
main().catch(e => { console.error(e); process.exit(1); });

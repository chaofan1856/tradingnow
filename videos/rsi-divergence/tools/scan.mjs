// Crash scan: seek every 2nd frame (no screenshots) and print page exceptions. Usage: node tools/scan.mjs <film dir>
// Seek every frame (no screenshot) to catch page exceptions before a full render hits them.
import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
const dir = process.argv[2], PORT = 9900 + Math.floor(Math.random() * 90);
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'scan-'));
const ch = spawn('/opt/pw-browsers/chromium', ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${prof}`, '--no-sandbox', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ver; for (let i = 0; i < 100 && !ver; i++) { try { ver = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json(); } catch { await sleep(100); } }
const ws = new WebSocket(ver.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}, sessionId) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
const { result: { targetId } } = await send('Target.createTarget', { url: pathToFileURL(path.join(dir, 'index.html')).href });
const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
await sleep(3000);
const ev = async e => (await send('Runtime.evaluate', { expression: e, awaitPromise: true, returnByValue: true }, sessionId)).result;
await ev('window.ASSETS_READY');
const r = await ev(`(() => { const bad = []; for (let f = 0; f < window.TOTAL_FRAMES; f += 2) { try { window.seek(f); } catch (e) { bad.push(f + ': ' + e.message); if (bad.length > 20) break; } } return bad; })()`);
console.log(dir, JSON.stringify(r.result?.value ?? r.exceptionDetails));
ch.kill(); fs.rmSync(prof, { recursive: true, force: true }); process.exit(0);

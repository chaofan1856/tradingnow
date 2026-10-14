// Dump the page's sound cues (window.CUES) to build/cues.json.
import { createRequire } from 'node:module';
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const require = createRequire(import.meta.url);
let pw; try { pw = require('playwright'); } catch { pw = require('/opt/node22/lib/node_modules/playwright'); }
const DIR = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const b = await pw.chromium.launch(); const p = await b.newPage();
await p.goto(pathToFileURL(path.join(DIR, 'index.html')).href); await p.evaluate(() => window.ready);
const cues = await p.evaluate(() => window.CUES);
fs.writeFileSync(path.join(DIR, 'build', 'cues.json'), JSON.stringify(cues, null, 1));
console.log(cues.length, 'cues'); await b.close();

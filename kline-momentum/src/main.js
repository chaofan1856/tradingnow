'use strict';
/* Timeline, DOM typography (subtitles, header, cards, section headings, finale) and the frame entry point window.seek(frame). */
const FPS = 60;
window.TOTAL_FRAMES = Math.round(TL.total * FPS);
window.FPS_OUT = FPS;

/* ---------- typography: split into per-character spans ---------- */
const MASTERS = FILM.masters;
function charSpans(el, str, { keyClass = 'k' } = {}) {
  el.innerHTML = '';
  const out = [], kws = []; let key = false, kw = null;
  const name = MASTERS.find(m => str.startsWith(m + '：') || str.startsWith(m + '「'));
  let idx = 0;
  for (const ch of str) {
    if (ch === '【') { key = true; kw = document.createElement('span'); kw.className = 'kw'; el.appendChild(kw); kws.push({ el: kw, chars: [] }); continue; }
    if (ch === '】') { key = false; kw = null; continue; }
    if (ch === '|') { el.appendChild(document.createElement('br')); continue; }
    const s = document.createElement('span');
    s.className = 'c' + (key ? ' ' + keyClass : '') + (name && idx < name.length ? ' nm' : '');
    s.textContent = ch === ' ' ? '\u00a0' : ch;
    (kw || el).appendChild(s); out.push(s); if (kw) kws[kws.length - 1].chars.push(s);
    idx++;
  }
  out.kws = kws;
  return out;
}
// Chromium's software blur is a box blur whose window is rounded to whole pixels: below ~0.4 css px (DPR 2) it
// renders as no blur at all, so a blur that eases to 0 at the very end snaps the glyph into focus in one frame
// (a visible flicker). Entrances let the blur reach 0 by q = end, while the character is still moving and fading;
// exits start blurring only once the fade is under way.
const blurPx = (inPx, q, end = 0.8, outPx = 0, o = 0, start = 0.2) =>
  inPx * Math.pow(clamp(1 - q / end), 1.5) + outPx * Math.pow(clamp((o - start) / (1 - start)), 1.5);
const blurCss = (...a) => { const b = blurPx(...a); return b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none'; };
function charIn(s, p, { dy = 18, blur = 12, sc = 0 } = {}) {
  const q = clamp(p);
  s.style.opacity = q.toFixed(3);
  s.style.transform = `translate3d(0,${((1 - q) * dy).toFixed(2)}px,0)${sc ? ` scale(${(1 + (1 - q) * sc).toFixed(4)})` : ''}`;
  s.style.filter = blurCss(blur, q);
}

/* ---------- subtitles ---------- */
const POS = {
  B: { cls: 'pB', base: 'translateX(-50%)' }, T: { cls: 'pT', base: 'translateX(-50%)' },
  C: { cls: 'pC', base: 'translate(-50%,-50%)' }, L: { cls: 'pL', base: 'none' }, R: { cls: 'pR', base: 'none' },
};
// entrance per line: the position decides first, the bottom lines rotate through four treatments
const STYLES_B = ['rise', 'flip', 'wipe', 'gather'];
const SUBS = TL.lines.map((L, n) => {
  const P = POS[L.pos || 'B'];
  const el = document.createElement('div'); el.className = 'sub ' + P.cls; $('subs').appendChild(el);
  if (L.y != null) el.style.top = L.y + 'px';
  if (L.size) el.style.fontSize = L.size + 'px';
  const chars = charSpans(el, L.sub);
  const next = TL.lines[n + 1];
  const outAt = next ? Math.min(L.end + 0.35, next.start - 0.32) : L.end + 1.4;
  const pos = L.pos || 'B';
  const style = pos === 'C' ? 'zoom' : pos === 'T' ? 'track' : pos === 'L' || pos === 'R' ? 'wipe' : STYLES_B[n % 4];
  const R = rng(n * 131 + 7), jit = chars.map(() => [R() * 2 - 1, R() * 2 - 1, R() * 2 - 1]);
  return { L, el, chars, outAt, base: P.base, style, jit, dir: pos === 'R' ? -1 : 1 };
});
function enter(S, t) {
  const { L, chars, style, jit, el } = S, n = chars.length;
  const span = Math.min(1.1, (L.end - L.start) * 0.45), step = span / Math.max(1, n - 1);
  if (style === 'wipe') {                          // a soft-edged light curtain opens across the line
    const u = ease(t, L.start - 0.1, 1.15, SOFT), edge = lerp(-12, 112, u);
    const g = S.dir > 0 ? `linear-gradient(90deg,#000 ${edge - 12}%,rgba(0,0,0,.35) ${edge - 4}%,transparent ${edge}%)` : `linear-gradient(270deg,#000 ${edge - 12}%,rgba(0,0,0,.35) ${edge - 4}%,transparent ${edge}%)`;
    el.style.webkitMaskImage = el.style.maskImage = u < 0.999 ? g : 'none';
    chars.forEach((s, i) => { const q = ease(t, L.start - 0.1 + (S.dir > 0 ? i : n - 1 - i) * step * 0.8, 0.7, EXPO); s.style.opacity = 1; s.style.filter = 'none'; s.style.transform = `translate3d(${((1 - q) * -10 * S.dir).toFixed(2)}px,0,0)`; });
    return;
  }
  el.style.webkitMaskImage = el.style.maskImage = 'none';
  if (style === 'track') {                         // tracking collapses from wide to the line's own spacing
    const u = ease(t, L.start - 0.1, 1.3, EXPO);
    el.style.letterSpacing = lerp(0.55, 0.05, u).toFixed(4) + 'em';
    chars.forEach((s, i) => charIn(s, ease(t, L.start - 0.1 + i * step * 0.5, 0.8, EXPO), { dy: 0, blur: 10 }));
    return;
  }
  el.style.letterSpacing = '';
  chars.forEach((s, i) => {
    if (style === 'flip') {                        // each character hinges up from its baseline
      const q = ease(t, L.start - 0.08 + i * step, 0.75, EXPO);
      s.style.opacity = clamp(q * 1.4).toFixed(3);
      s.style.transform = `perspective(500px) rotateX(${((1 - q) * 84).toFixed(2)}deg)`;
      s.style.filter = blurCss(5, q, 0.6);
    } else if (style === 'gather') {               // characters drift in from scattered positions
      const q = ease(t, L.start - 0.1 + i * step * 0.6, 0.95, EXPO), [a, b, c] = jit[i];
      s.style.opacity = q.toFixed(3);
      s.style.transform = `translate3d(${((1 - q) * a * 46).toFixed(2)}px,${((1 - q) * b * 34).toFixed(2)}px,0) rotate(${((1 - q) * c * 14).toFixed(2)}deg)`;
      s.style.filter = blurCss(10, q);
    } else if (style === 'zoom') {                 // centre-out: the middle characters land first
      const d = Math.abs(i - (n - 1) / 2), q = ease(t, L.start - 0.1 + d * step * 0.9, 0.9, EXPO);
      s.style.opacity = q.toFixed(3);
      s.style.transform = `scale(${(1 + (1 - q) * 0.55).toFixed(4)})`;
      s.style.filter = blurCss(14, q);
    } else charIn(s, ease(t, L.start - 0.08 + i * step, 0.62, EXPO));
  });
}
function runSubs(t) {
  for (const S of SUBS) {
    const { L, el, chars, outAt, base } = S;
    if (t < L.start - 0.2 || t > outAt + 0.5) { el.style.opacity = 0; continue; }
    el.style.opacity = 1;
    enter(S, t);
    // keywords: once the line has landed, a hairline draws under them and a highlight sweeps across
    const land = L.start + Math.min(1.1, (L.end - L.start) * 0.45) + 0.35;
    chars.kws.forEach((K, j) => {
      const u = ease(t, land + j * 0.25, 0.7, EXPO);
      K.el.style.setProperty('--u', u.toFixed(4)); K.el.style.setProperty('--uo', (0.9 * clamp(u * 3)).toFixed(3));
      K.chars.forEach((s, i) => {
        const sw = ease(t, land + j * 0.25 + 0.15 + i * 0.06, 0.55, SOFT);
        s.style.setProperty('--sx', (lerp(105, -5, sw)).toFixed(2) + '%');
      });
    });
    const o = ease(t, outAt, 0.42, SOFT), b0 = base === 'none' ? '' : base + ' ';
    if (o > 0) { el.style.opacity = (1 - o).toFixed(3); el.style.filter = blurCss(0, 1, 0.8, 8, o); el.style.transform = `${b0}translateY(${(-o * 10).toFixed(2)}px)`; }
    else { el.style.filter = 'none'; el.style.transform = base; }
  }
}

/* ---------- scene windows (seconds) ---------- */
const SC = id => TL.scenes.find(s => s.id === id);
const LN = i => TL.lines[i];
const LS = id => TL.lines.filter(l => l.scene === id);          // lines of a scene, in order
const SECTIONS = FILM.sections;
const WIN = (() => {
  const w = {};
  w.open = [0, SC('open').end];
  w.title = [w.open[1], w.open[1] + 5.9];
  let prev = w.title[1];
  SECTIONS.forEach((id, k) => { w[id] = [prev, SC(id).end + (k === SECTIONS.length - 1 ? 1.6 : 0.6)]; prev = w[id][1]; });
  w.finale = [prev, TL.total];
  return w;
})();

/* ---------- header: odometer + place + citation ---------- */
const SEC = FILM.sec;
const HEAD = [];
for (const id of SECTIONS) HEAD.push({ at: WIN[id][0] + 0.2, ...SEC[id] });   // switches while the heading is still centre stage
// second master inside a section: the citation turns over when the quote starts
const cite2 = (id, k, lat, zh, note) => HEAD.push({ at: LS(id)[k].start - 0.3, ...SEC[id], lat, zh, note });
FILM.cites.forEach(c => cite2(...c));
HEAD.sort((a, b) => a.at - b.at);
const HIDE = [[-1, HEAD[0].at], [WIN.finale[0] - 1.6, 1e9]];
const DIGITS = [0, 1, 2, 3].map(() => {
  const d = document.createElement('span'); d.className = 'dg';
  const strip = document.createElement('span');
  for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) { const i = document.createElement('i'); i.textContent = k; strip.appendChild(i); }
  d.appendChild(strip); $('eraNum').appendChild(d); return { d, strip };
});
const digitW = (() => { const m = document.createElement('canvas').getContext('2d'); return k => { m.font = "500 96px 'CormorantSub'"; return m.measureText(String(k)).width + 2; }; })();
function headerState(t) {
  let i = 0; while (i + 1 < HEAD.length && t >= HEAD[i + 1].at) i++;
  return { cur: HEAD[i], prev: HEAD[Math.max(0, i - 1)], k: i, u: i === 0 ? ease(t, HEAD[0].at, 1.2) : ease(t, HEAD[i].at, 1.6, SWIFT) };
}
function runHeader(t) {
  const { cur, prev, k, u } = headerState(t);
  let vis = 1;
  for (const [a, b] of HIDE) vis = Math.min(vis, 1 - Math.min(ease(t, a, 0.8, SOFT), 1 - ease(t, b - 0.2, 1.0, SOFT)));
  let busyL = 0;
  for (const S of SUBS) if (S.L.pos === 'L' && (S.L.y ?? 300) < 460) busyL = Math.max(busyL, Math.min(ease(t, S.L.start - 0.5, 0.5, SOFT), 1 - ease(t, S.outAt, 0.5, SOFT)));
  // the section heading is flying into the place slot: keep the slot empty until it lands
  const fly = SECTIONS.some(id => t > WIN[id][0] - 0.1 && t < WIN[id][0] + 2.25);
  $('era').style.opacity = (vis * (1 - busyL)).toFixed(3); $('cite').style.opacity = vis.toFixed(3);
  $('place').style.visibility = busyL > 0.98 || fly ? 'hidden' : 'visible';
  if (vis <= 0.001) { $('place').style.opacity = 0; return; }
  const from = String(prev.num).padStart(4, ' '), to = String(cur.num).padStart(4, ' ');
  DIGITS.forEach((D, j) => {
    const a = from[j] === ' ' ? 0 : +from[j], b = to[j] === ' ' ? 0 : +to[j];
    const still = k === 0 || from[j] === to[j];
    const stagger = (3 - j) * 0.09, q = k === 0 ? 1 : SWIFT(clamp((u - stagger) / (1 - 0.27)));
    const spins = still ? 0 : 1 + (j % 2);
    const pos = lerp(a, b + 10 * spins, q);
    D.strip.style.transform = `translateY(${(-pos * 96).toFixed(2)}px)`;
    const speed = still ? 0 : Math.abs(Math.sin(Math.PI * q));
    D.strip.style.filter = speed > 0.05 ? `blur(${(speed * 2.2).toFixed(2)}px)` : 'none';
    const showA = from[j] !== ' ', showB = to[j] !== ' ';
    const wA = showA ? digitW(a) : 0, wB = showB ? digitW(b) : 0;
    D.d.style.width = lerp(wA, wB, q).toFixed(2) + 'px';
    D.d.style.opacity = lerp(showA ? 1 : 0, showB ? 1 : 0, q).toFixed(3);
  });
  const swap = (id, a, b, k2 = id === 'place' ? vis * (1 - busyL) : 1) => {
    const el = $(id), q = k === 0 ? 1 : u;
    const txt = q < 0.5 ? a : b, o = q < 0.5 ? 1 - SOFT(q * 2) : SOFT(q * 2 - 1);
    if (el.textContent !== txt) el.textContent = txt;
    el.style.opacity = ((a === b ? 1 : o) * k2).toFixed(3);
    el.style.filter = a === b ? 'none' : blurCss(7, o);
  };
  swap('eraPre', prev.pre, cur.pre); swap('place', prev.place, cur.place);
  swap('citeLat', prev.lat, cur.lat); swap('citeZh', prev.zh, cur.zh); swap('citeNote', prev.note, cur.note);
  $('seal').style.opacity = (0.9 * (k === 0 ? 1 : Math.abs(u * 2 - 1))).toFixed(3);
}

/* ---------- title + part cards ---------- */
const T_CH = charSpans($('tMain'), FILM.title);
const T_LAT = charSpans($('tLatin'), FILM.latin);
const T_SUB = charSpans($('tSub'), FILM.sub);
function runTitle(t) {
  const [a, b] = WIN.title, on = t > a - 0.5 && t < b + 0.5;
  for (const id of ['tMain', 'tLatin', 'tSub']) $(id).style.visibility = on ? 'visible' : 'hidden';
  if (!on) return;
  const out = ease(t, b - 1.1, 1.0, SOFT);
  T_CH.forEach((s, i) => {
    const p = ease(t, a + 0.35 + i * 0.12, 1.5, EXPO), q = ease(t, b - 1.15 + i * 0.05, 0.9, SOFT);
    s.style.opacity = (p * (1 - q)).toFixed(3);
    s.style.transform = `translate3d(0,${((1 - p) * 26 - q * 30).toFixed(2)}px,0) scale(${(1 + (1 - p) * 0.12).toFixed(4)})`;
    s.style.filter = blurCss(16, p, 0.8, 14, q);
  });
  T_LAT.forEach((s, i) => charIn(s, ease(t, a + 1.2 + i * 0.03, 1.0) * (1 - out), { dy: 8, blur: 8 }));
  T_SUB.forEach((s, i) => charIn(s, ease(t, a + 2.0 + i * 0.05, 1.0) * (1 - out), { dy: 10, blur: 8 }));
}
function runPart() {}                              // no part cards in this film

/* ---------- section heading: appears large in the centre, then flies into the header's place slot ---------- */
const SECH = SECTIONS.map(id => {
  const box = document.createElement('div'); box.className = 'sech';
  const num = document.createElement('div'); num.className = 'shNum'; num.textContent = `${SEC[id].pre} · ${String(SEC[id].num).padStart(2, '0')}`;
  const ttl = document.createElement('div'); ttl.className = 'shTitle';
  const sub = document.createElement('div'); sub.className = 'shSub'; sub.textContent = SEC[id].sub;
  const veil = document.createElement('div'); veil.className = 'shVeil';
  box.append(veil, num, ttl, sub); $('secs').appendChild(box);
  return { id, box, veil, num, ttl, sub, chars: charSpans(ttl, SEC[id].place) };
});
function runSections(t) {
  for (const S of SECH) {
    const a = WIN[S.id][0], on = t > a - 0.2 && t < a + 2.4;
    S.box.style.visibility = on ? 'visible' : 'hidden';
    if (!on) continue;
    // 0 → 1.3 s: characters rise in; 1.3 → 2.2 s: the title glides to (126,200) and shrinks to the place size
    S.chars.forEach((s, i) => charIn(s, ease(t, a + i * 0.07, 0.9, EXPO), { dy: 22, blur: 14 }));
    const deco = ease(t, a + 0.25, 0.8) * (1 - ease(t, a + 1.25, 0.45, SOFT));
    S.num.style.opacity = deco.toFixed(3); S.sub.style.opacity = deco.toFixed(3);
    S.veil.style.opacity = (ease(t, a, 0.6, SOFT) * (1 - ease(t, a + 1.3, 0.8, SOFT))).toFixed(3);
    S.num.style.transform = `translate3d(0,${((1 - deco) * 10).toFixed(2)}px,0)`;
    const f = ease(t, a + 1.3, 0.9, SWIFT);
    const w = S.ttl.offsetWidth, x0 = 960 - w / 2, y0 = 470, s1 = 38 / 88;
    const x = lerp(x0, 126, f), y = lerp(y0, 200, f), sc = lerp(1, s1, f);
    S.ttl.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${sc.toFixed(4)})`;
    S.ttl.style.color = f < 0.5 ? '' : `rgba(239,232,220,${lerp(1, 0.58, (f - 0.5) * 2).toFixed(3)})`;
    S.ttl.style.opacity = (1 - ease(t, a + 2.15, 0.2, SOFT)).toFixed(3);
  }
}

/* ---------- finale: white classical light serif, no blur ---------- */
const FIN = charSpans($('finale'), TL.finale);
const FIN_EN = $('finaleEn'); FIN_EN.textContent = TL.finale_en;
function runFinale(t) {
  const a = WIN.finale[0] + 0.6, on = t > a - 0.2;
  $('finale').style.visibility = $('finaleEn').style.visibility = on ? 'visible' : 'hidden';
  if (!on) return;
  const out = ease(t, TL.total - 2.6, 2.0, SOFT);
  FIN.forEach((s, i) => {
    const p = ease(t, a + i * 0.06, 1.4, SOFT);
    s.style.opacity = (p * (1 - out)).toFixed(3);
    s.style.transform = `translate3d(0,${((1 - p) * 12).toFixed(2)}px,0)`;
  });
  const e = ease(t, a + FIN.length * 0.06 + 0.6, 2.2, SOFT);
  FIN_EN.style.opacity = (e * (1 - out) * 0.82).toFixed(3);
  FIN_EN.style.transform = `translate3d(-50%,${((1 - e) * 10).toFixed(2)}px,0)`;
}

/* ---------- entry ---------- */
window.CUES = [];                                  // no sound effects in this film: the score alone
window.seek = function (f) {
  const t = f / FPS;
  resetCam(ctx);
  drawScenes(ctx, t);
  resetCam(ctx);
  drawPost(t);
  runSubs(t); runHeader(t); runTitle(t); runPart(t); runSections(t); runFinale(t);
};
window.ready = Promise.all([...document.fonts].map(f => f.load().catch(() => null))).then(() => document.fonts.ready)
  .then(() => { window.seek(0); return window.TOTAL_FRAMES; });
const qs = new URLSearchParams(location.search);
if (qs.has('t')) window.ready.then(() => window.seek(Math.round(+qs.get('t') * FPS)));

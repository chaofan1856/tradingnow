'use strict';
/* Timeline, DOM typography (subtitles, header, cards) and the frame entry point window.seek(frame). */
const FPS = 60;                                   // rendered at 60 fps for smooth motion
window.TOTAL_FRAMES = Math.round(TL.total * FPS);
window.FPS_OUT = FPS;

/* ---------- typography: split into per-character spans ---------- */
function charSpans(el, str, { keyClass = 'k' } = {}) {
  el.innerHTML = '';
  const out = []; let key = false;
  for (const ch of str) {
    if (ch === '【') { key = true; continue; }
    if (ch === '】') { key = false; continue; }
    if (ch === '|') { el.appendChild(document.createElement('br')); continue; }
    const s = document.createElement('span'); s.className = 'c' + (key ? ' ' + keyClass : ''); s.textContent = ch === ' ' ? '\u00a0' : ch;
    el.appendChild(s); out.push(s);
  }
  return out;
}
/* a character drifting in out of a blur */
function charIn(s, p, { dy = 18, blur = 12, sc = 0 } = {}) {
  const q = clamp(p);
  s.style.opacity = q.toFixed(3);
  s.style.transform = `translate3d(0,${((1 - q) * dy).toFixed(2)}px,0)${sc ? ` scale(${(1 + (1 - q) * sc).toFixed(4)})` : ''}`;
  s.style.filter = q < 0.995 ? `blur(${((1 - q) * blur).toFixed(2)}px)` : 'none';
}

/* ---------- subtitles ---------- */
/* placement presets: text sits where the composition has room, not always at the bottom */
const POS = {
  B: { cls: 'pB', base: 'translateX(-50%)' },
  T: { cls: 'pT', base: 'translateX(-50%)' },
  C: { cls: 'pC', base: 'translate(-50%,-50%)' },
  L: { cls: 'pL', base: 'none' },
  R: { cls: 'pR', base: 'none' },
};
const SUBS = TL.lines.map((L, n) => {
  const P = POS[L.pos || 'B'];
  const el = document.createElement('div'); el.className = 'sub ' + P.cls; $('subs').appendChild(el);
  if (L.y != null) el.style.top = L.y + 'px';
  if (L.size) el.style.fontSize = L.size + 'px';
  const chars = charSpans(el, L.sub);
  const next = TL.lines[n + 1];
  const outAt = next ? Math.min(L.end + 0.35, next.start - 0.32) : L.end + 1.4;
  return { L, el, chars, outAt, base: P.base };
});
function runSubs(t) {
  for (const S of SUBS) {
    const { L, el, chars, outAt, base } = S;
    if (t < L.start - 0.2 || t > outAt + 0.5) { el.style.opacity = 0; continue; }
    el.style.opacity = 1;
    const span = Math.min(1.1, (L.end - L.start) * 0.45), step = span / Math.max(1, chars.length - 1);
    const o = ease(t, outAt, 0.42, SOFT);
    chars.forEach((s, i) => charIn(s, ease(t, L.start - 0.08 + i * step, 0.62, EXPO)));
    const b0 = base === 'none' ? '' : base + ' ';
    if (o > 0) { el.style.opacity = (1 - o).toFixed(3); el.style.filter = `blur(${(o * 8).toFixed(2)}px)`; el.style.transform = `${b0}translateY(${(-o * 10).toFixed(2)}px)`; }
    else { el.style.filter = 'none'; el.style.transform = base; }
  }
}

/* ---------- scene windows (seconds) ---------- */
const SC = id => TL.scenes.find(s => s.id === id);
const LN = i => TL.lines[i];
const WIN = (() => {
  const w = {};
  w.open = [0, SC('open').end];
  w.title = [w.open[1], w.open[1] + 5.9];
  w.ch1 = [w.title[1], SC('barter').start - 0.7];
  w.barter = [w.ch1[1], SC('barter').end + 0.5];
  w.print = [w.barter[1], SC('print').end + 0.5];
  w.past = [w.print[1], SC('past').end + 0.3];
  w.ch2 = [w.past[1], SC('book').start - 0.6];
  w.book = [w.ch2[1], SC('book').end + 0.6];
  w.mood = [w.book[1], SC('mood').end + 0.3];
  w.ch3 = [w.mood[1], SC('berg').start - 0.6];
  w.ocean = [w.ch3[1], SC('revert').end + 0.3];
  w.ch4 = [w.ocean[1], SC('value').start - 0.6];
  w.value = [w.ch4[1], SC('value').end + 0.6];
  w.trend = [w.value[1], SC('trend').end + 0.6];
  w.summary = [w.trend[1], TL.voice_end + 2.4];
  w.finale = [w.summary[1], TL.total];
  return w;
})();

/* ---------- header: era odometer + place + citation ---------- */
const HEAD = [
  { at: WIN.barter[0] + 0.3, pre: '第', num: 1, suf: '章', place: '价格的本质', lat: 'The Wealth of Nations', zh: '《国富论》', note: '亚当·斯密 · 1776' },
  { at: WIN.book[0] + 0.3, pre: '第', num: 2, suf: '章', place: '价格的形成', lat: 'Principles of Economics', zh: '《经济学原理》', note: '马歇尔 · 1890' },
  { at: WIN.ocean[0] + 0.3, pre: '第', num: 3, suf: '章', place: '价格与价值', lat: 'The Intelligent Investor', zh: '《聪明的投资者》', note: '格雷厄姆 · 1949' },
  { at: WIN.value[0] + 0.3, pre: '第', num: 4, suf: '章', place: '价值投资', lat: 'Letter to Shareholders', zh: '《致股东的信》', note: '巴菲特 · 2008' },
  { at: WIN.trend[0] + 0.2, pre: '第', num: 4, suf: '章', place: '趋势交易', lat: 'Reminiscences of a Stock Operator', zh: '《股票作手回忆录》', note: '勒菲弗 · 1923' },
  { at: WIN.summary[0] + 0.2, pre: '第', num: 5, suf: '章', place: '终极总结', lat: 'The Intelligent Investor', zh: '《聪明的投资者》', note: '格雷厄姆 · 1949' },
];
const HIDE = [[-1, WIN.barter[0] + 0.3], [WIN.ch2[0] - 0.1, WIN.book[0] + 0.3], [WIN.ch3[0] - 0.1, WIN.ocean[0] + 0.3], [WIN.ch4[0] - 0.1, WIN.value[0] + 0.3], [WIN.finale[0] - 1.2, 1e9]];
const DIGITS = [0, 1, 2, 3].map(() => {
  const d = document.createElement('span'); d.className = 'dg';
  const strip = document.createElement('span');
  for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) { const i = document.createElement('i'); i.textContent = k; strip.appendChild(i); }
  d.appendChild(strip); $('eraNum').appendChild(d); return { d, strip, w: 0 };
});
const digitW = (() => { const m = document.createElement('canvas').getContext('2d'); return k => { m.font = "500 96px 'CormorantSub'"; return m.measureText(String(k)).width + 2; }; })();
function headerState(t) {
  let i = 0; while (i + 1 < HEAD.length && t >= HEAD[i + 1].at) i++;
  return { cur: HEAD[i], prev: HEAD[Math.max(0, i - 1)], k: i, u: i === 0 ? ease(t, HEAD[0].at, 1.2) : ease(t, HEAD[i].at, 1.6, SWIFT) };
}
let lastHeadKey = -1;
function runHeader(t) {
  const { cur, prev, k, u } = headerState(t);
  let vis = 1;
  for (const [a, b] of HIDE) vis = Math.min(vis, 1 - Math.min(ease(t, a, 0.8, SOFT), 1 - ease(t, b - 0.2, 1.0, SOFT)));
  // the left header steps aside while a text block occupies the upper-left corner
  let busyL = 0;
  for (const S of SUBS) if (S.L.pos === 'L' && (S.L.y ?? 300) < 460) busyL = Math.max(busyL, Math.min(ease(t, S.L.start - 0.5, 0.5, SOFT), 1 - ease(t, S.outAt, 0.5, SOFT)));
  $('era').style.opacity = (vis * (1 - busyL)).toFixed(3); $('cite').style.opacity = vis.toFixed(3);
  $('place').style.visibility = busyL > 0.98 ? 'hidden' : 'visible';
  if (vis <= 0.001) return;
  // odometer: each wheel spins from the previous digit to the new one, staggered right-to-left
  const from = String(prev.num).padStart(4, ' '), to = String(cur.num).padStart(4, ' ');
  DIGITS.forEach((D, j) => {
    const a = from[j] === ' ' ? 0 : +from[j], b = to[j] === ' ' ? 0 : +to[j];
    const stagger = (3 - j) * 0.09, q = k === 0 ? 1 : SWIFT(clamp((u - stagger) / (1 - 0.27)));
    const spins = k === 0 ? 0 : 1 + (j % 2);
    const pos = lerp(a, b + 10 * spins + (b < a ? 0 : 0), q);
    D.strip.style.transform = `translateY(${(-pos * 96).toFixed(2)}px)`;
    const speed = k === 0 ? 0 : Math.abs(Math.sin(Math.PI * q));
    D.strip.style.filter = speed > 0.05 ? `blur(${(speed * 2.2).toFixed(2)}px)` : 'none';
    const showA = from[j] !== ' ', showB = to[j] !== ' ';
    const wA = showA ? digitW(a) : 0, wB = showB ? digitW(b) : 0, ww = lerp(wA, wB, q);
    D.d.style.width = ww.toFixed(2) + 'px';
    D.d.style.opacity = lerp(showA ? 1 : 0, showB ? 1 : 0, q).toFixed(3);
  });
  // text fields cross-blur
  const swap = (id, a, b, k2 = id === 'place' ? vis * (1 - busyL) : 1) => {
    const el = $(id), q = k === 0 ? 1 : u;
    const txt = q < 0.5 ? a : b, o = q < 0.5 ? 1 - SOFT(q * 2) : SOFT(q * 2 - 1);
    if (el.textContent !== txt) el.textContent = txt;
    el.style.opacity = ((a === b ? 1 : o) * k2).toFixed(3);
    el.style.filter = a === b || o > 0.99 ? 'none' : `blur(${((1 - o) * 7).toFixed(2)}px)`;
  };
  swap('eraPre', prev.pre, cur.pre); swap('eraSuf', prev.suf, cur.suf); swap('place', prev.place, cur.place);
  swap('citeLat', prev.lat, cur.lat); swap('citeZh', prev.zh, cur.zh); swap('citeNote', prev.note, cur.note);
  $('seal').style.opacity = (0.9 * (k === 0 ? 1 : Math.abs(u * 2 - 1))).toFixed(3);
  $('eraPre').style.display = (u < 0.5 ? prev.pre : cur.pre) ? '' : 'none';
}

/* ---------- title + chapter cards ---------- */
const T_CH = charSpans($('tMain'), '重新理解价格与价值');
const T_LAT = charSpans($('tLatin'), 'PRICE IS WHAT YOU PAY · VALUE IS WHAT YOU GET');
const T_SUB = charSpans($('tSub'), '成交记录 · 供需博弈 · 冰山模型');
function runTitle(t) {
  const [a, b] = WIN.title, on = t > a - 0.5 && t < b + 0.5;
  for (const id of ['tMain', 'tLatin', 'tSub']) $(id).style.visibility = on ? 'visible' : 'hidden';
  if (!on) return;
  const out = ease(t, b - 1.1, 1.0, SOFT);
  T_CH.forEach((s, i) => {
    const p = ease(t, a + 0.35 + i * 0.1, 1.5, EXPO), q = ease(t, b - 1.15 + i * 0.05, 0.9, SOFT);
    s.style.opacity = (p * (1 - q)).toFixed(3);
    s.style.transform = `translate3d(0,${((1 - p) * 26 - q * 30).toFixed(2)}px,0) scale(${(1 + (1 - p) * 0.12).toFixed(4)})`;
    s.style.filter = `blur(${((1 - p) * 16 + q * 14).toFixed(2)}px)`;
  });
  T_LAT.forEach((s, i) => charIn(s, ease(t, a + 1.2 + i * 0.025, 1.0) * (1 - out), { dy: 8, blur: 8 }));
  T_SUB.forEach((s, i) => charIn(s, ease(t, a + 2.0 + i * 0.04, 1.0) * (1 - out), { dy: 10, blur: 8 }));
}
const CHAPTERS = [
  { win: 'ch1', num: '壹', lat: 'CAPITULUM · I', title: '价格的本质', sub: '它只是一条「成交记录」' },
  { win: 'ch2', num: '贰', lat: 'CAPITULUM · II', title: '价格的形成', sub: '供需与预期的博弈' },
  { win: 'ch3', num: '叁', lat: 'CAPITULUM · III', title: '价格与价值', sub: '水上尖角与水下冰山' },
  { win: 'ch4', num: '肆', lat: 'CAPITULUM · IV', title: '交易的起点', sub: '看懂表象与内核' },
];
let chBuilt = -1, chSpans = null;
function runChapter(t) {
  const n = CHAPTERS.findIndex(c => t > WIN[c.win][0] - 0.3 && t < WIN[c.win][1] + 0.3);
  for (const id of ['chNum', 'chLat', 'chTitle', 'chSub']) $(id).style.visibility = n < 0 ? 'hidden' : 'visible';
  if (n < 0) return;
  const c = CHAPTERS[n], [a, b] = WIN[c.win];
  if (chBuilt !== n) { chSpans = { num: charSpans($('chNum'), c.num), lat: charSpans($('chLat'), c.lat), title: charSpans($('chTitle'), c.title), sub: charSpans($('chSub'), c.sub) }; chBuilt = n; }
  const out = ease(t, b - 0.85, 0.8, SOFT);
  const fx = (arr, at, st, o) => arr.forEach((s, i) => {
    const p = ease(t, a + at + i * st, 1.1);
    s.style.opacity = (p * (1 - out)).toFixed(3);
    s.style.transform = `translate3d(0,${((1 - p) * 16 - out * 14).toFixed(2)}px,0)`;
    s.style.filter = `blur(${((1 - p) * o + out * 10).toFixed(2)}px)`;
  });
  fx(chSpans.num, 0.1, 0, 14); fx(chSpans.lat, 0.45, 0.02, 8); fx(chSpans.title, 0.6, 0.09, 14); fx(chSpans.sub, 1.2, 0.04, 8);
}

/* ---------- finale ---------- */
const FIN = charSpans($('finale'), TL.finale);
function runFinale(t) {
  const a = WIN.finale[0] + 1.6, on = t > a - 0.2;
  $('finale').style.visibility = on ? 'visible' : 'hidden';
  if (!on) return;
  const out = ease(t, TL.total - 5.6, 3.2, SOFT);
  FIN.forEach((s, i) => {
    const p = ease(t, a + i * 0.13, 2.2, SOFT);
    s.style.opacity = (p * (1 - out)).toFixed(3);
    s.style.transform = `translate3d(0,${((1 - p) * 10).toFixed(2)}px,0)`;
    s.style.filter = `blur(${((1 - p) * 10 + out * 9).toFixed(2)}px)`;
  });
}

/* ---------- entry ---------- */
window.CUES = buildCues();
window.seek = function (f) {
  const t = f / FPS;
  resetCam(ctx);
  drawScenes(ctx, t);
  resetCam(ctx);
  drawPost(t);
  runSubs(t); runHeader(t); runTitle(t); runChapter(t); runFinale(t);
};
// canvas text needs every face loaded up front (DOM-only usage would load them lazily)
window.ready = Promise.all([...document.fonts].map(f => f.load().catch(() => null))).then(() => document.fonts.ready)
  .then(() => { window.seek(0); return window.TOTAL_FRAMES; });
const qs = new URLSearchParams(location.search);
if (qs.has('t')) window.ready.then(() => window.seek(Math.round(+qs.get('t') * FPS)));

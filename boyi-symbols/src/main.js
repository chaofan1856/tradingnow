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
const SUBS = TL.lines.map((L, n) => {
  const el = document.createElement('div'); el.className = 'sub'; $('subs').appendChild(el);
  const chars = charSpans(el, L.sub);
  const next = TL.lines[n + 1];
  const outAt = next ? Math.min(L.end + 0.35, next.start - 0.32) : L.end + 1.4;
  return { L, el, chars, outAt };
});
function runSubs(t) {
  for (const S of SUBS) {
    const { L, el, chars, outAt } = S;
    if (t < L.start - 0.2 || t > outAt + 0.5) { el.style.opacity = 0; continue; }
    el.style.opacity = 1;
    const span = Math.min(0.9, (L.end - L.start) * 0.45), step = span / Math.max(1, chars.length - 1);
    const o = ease(t, outAt, 0.42, SOFT);
    chars.forEach((s, i) => charIn(s, ease(t, L.start - 0.08 + i * step, 0.62, EXPO)));
    if (o > 0) { el.style.opacity = (1 - o).toFixed(3); el.style.filter = `blur(${(o * 8).toFixed(2)}px)`; el.style.transform = `translateX(-50%) translateY(${(-o * 10).toFixed(2)}px)`; }
    else { el.style.filter = 'none'; el.style.transform = 'translateX(-50%)'; }
  }
}

/* ---------- scene windows (seconds) ---------- */
const SC = id => TL.scenes.find(s => s.id === id);
const LN = i => TL.lines[i];
const WIN = (() => {
  const w = {};
  w.open = [0, SC('open').end];
  w.title = [w.open[1], w.open[1] + 5.9];
  w.ch1 = [w.title[1], SC('sumer').start - 0.7];
  w.sumer = [w.ch1[1], SC('sumer').end + 0.8];
  w.babylon = [w.sumer[1], SC('babylon').end + 0.2];
  w.ch2 = [w.babylon[1], SC('zhou').start - 0.6];
  w.zhou = [w.ch2[1], SC('zhou').end + 0.7];
  w.scroll = [w.zhou[1], SC('piaohao').end + 0.5];
  w.chain = [w.scroll[1], SC('chain').end + 0.2];
  w.ch3 = [w.chain[1], SC('voc').start - 0.6];
  w.voc = [w.ch3[1], SC('voc').end + 0.2];
  w.years = [w.voc[1], SC('years').end + 0.8];
  w.candle = [w.years[1], SC('candle').end + 0.6];
  w.consensus = [w.candle[1], TL.voice_end + 2.6];
  w.finale = [w.consensus[1], TL.total];
  return w;
})();

/* ---------- header: era odometer + place + citation ---------- */
const HEAD = [
  { at: 1.2, pre: '', num: 2026, suf: '', place: '此刻 · K 线', lat: 'Sakata Senpō', zh: '《酒田战法》', note: '本间宗久 · 18 世纪' },
  { at: WIN.sumer[0] + 0.6, pre: '公元前', num: 3000, suf: '', place: '苏美尔 · 今伊拉克', lat: 'Cuneiform Loan Tablet', zh: '《楔形文字借贷泥板》', note: '苏美尔神庙 · 约 3000 BC' },
  { at: WIN.babylon[0] + 0.4, pre: '公元前', num: 1754, suf: '', place: '古巴比伦', lat: 'Codex Hammurabi', zh: '《汉谟拉比法典》', note: '利息条款 · 约 1754 BC' },
  { at: WIN.zhou[0] + 0.4, pre: '约公元前', num: 650, suf: '', place: '中国 · 春秋战国', lat: 'Guanzi · Qingzhong', zh: '《管子·轻重》', note: '齐 · 管仲学派' },
  { at: WIN.scroll[0] + 0.6, pre: '约', num: 806, suf: '', place: '中国 · 唐 · 长安', lat: 'Xin Tangshu · Shihuo Zhi', zh: '《新唐书·食货志》', note: '欧阳修 等 · 1060' },
  { at: SC('song').start - 1.4, pre: '', num: 1023, suf: '', place: '中国 · 北宋 · 益州', lat: 'Song Shi · Shihuo Zhi', zh: '《宋史·食货志》', note: '脱脱 等 · 1345' },
  { at: SC('piaohao').start - 1.4, pre: '', num: 1823, suf: '', place: '中国 · 清 · 平遥', lat: 'Rishengchang', zh: '《日升昌票号》', note: '平遥 · 1823' },
  { at: WIN.chain[0] + 0.4, pre: '', num: 1200, suf: '年', place: '从飞钱 · 到数字资产', lat: 'Liquidity', zh: '效率的进化', note: '流动性 ↑ · 交易成本 ↓' },
  { at: WIN.voc[0] + 0.3, pre: '', num: 1602, suf: '', place: '荷兰 · 阿姆斯特丹', lat: 'Octrooi van de VOC', zh: '《荷兰东印度公司特许状》', note: '荷兰议会 · 1602' },
  { at: WIN.years[0] + 0.2, pre: '', num: 400, suf: '年', place: '现代资本市场', lat: 'A History of Interest Rates', zh: '《利率史》', note: '霍默 · 西勒 · 1963' },
  { at: WIN.candle[0] + 0.3, pre: '', num: 2026, suf: '', place: '此刻 · K 线', lat: 'Sakata Senpō', zh: '《酒田战法》', note: '本间宗久 · 18 世纪' },
];
const HIDE = [[WIN.title[0] - 0.4, WIN.sumer[0] + 0.4], [WIN.zhou[1] - 1.4, WIN.scroll[0] + 1.2], [WIN.ch2[0] - 0.1, WIN.zhou[0] + 0.3], [WIN.ch3[0] - 0.1, WIN.voc[0] + 0.2], [WIN.finale[0] - 1.2, 1e9]];
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
  let vis = ease(t, HEAD[0].at, 1.4, SOFT);
  for (const [a, b] of HIDE) vis = Math.min(vis, 1 - Math.min(ease(t, a, 0.8, SOFT), 1 - ease(t, b - 0.2, 1.0, SOFT)));
  for (const id of ['era', 'place', 'cite']) $(id).style.opacity = vis.toFixed(3);
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
  const swap = (id, a, b, k2 = id === 'place' ? vis : 1) => {
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
const T_CH = charSpans($('tMain'), '博弈的符号');
const T_LAT = charSpans($('tLatin'), 'THE SYMBOLS OF THE GAME');
const T_SUB = charSpans($('tSub'), '五千年金融史 · 一根 K 线的前世今生');
function runTitle(t) {
  const [a, b] = WIN.title, on = t > a - 0.5 && t < b + 0.5;
  for (const id of ['tMain', 'tLatin', 'tSub']) $(id).style.visibility = on ? 'visible' : 'hidden';
  if (!on) return;
  const out = ease(t, b - 1.1, 1.0, SOFT);
  T_CH.forEach((s, i) => {
    const p = ease(t, a + 0.35 + i * 0.16, 1.5, EXPO), q = ease(t, b - 1.15 + i * 0.07, 0.9, SOFT);
    s.style.opacity = (p * (1 - q)).toFixed(3);
    s.style.transform = `translate3d(0,${((1 - p) * 26 - q * 30).toFixed(2)}px,0) scale(${(1 + (1 - p) * 0.12).toFixed(4)})`;
    s.style.filter = `blur(${((1 - p) * 16 + q * 14).toFixed(2)}px)`;
  });
  T_LAT.forEach((s, i) => charIn(s, ease(t, a + 1.2 + i * 0.025, 1.0) * (1 - out), { dy: 8, blur: 8 }));
  T_SUB.forEach((s, i) => charIn(s, ease(t, a + 2.0 + i * 0.04, 1.0) * (1 - out), { dy: 10, blur: 8 }));
}
const CHAPTERS = [
  { win: 'ch1', num: '壹', lat: 'CAPITULUM · I', title: '世界金融的起点', sub: '从「对抗自然」到「秩序确立」' },
  { win: 'ch2', num: '贰', lat: 'CAPITULUM · II', title: '中国金融的演进', sub: '信用与效率' },
  { win: 'ch3', num: '叁', lat: 'CAPITULUM · III', title: '博弈登场', sub: '一六〇二 · 现代股市的诞生' },
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

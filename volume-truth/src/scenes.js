'use strict';
/* Scene choreography. Pure functions of t.
   One persistent field of 720 light points re-forms into every diagram, so the film never cuts.
   Shared skeleton (lattice open, title, finale, matrix scheduler, frame) + this film's sections (FILM SECTIONS below). */

const N = 720;
const L_ = (id, k) => LS(id)[k];                    // line k of a scene
const lt = (id, k) => LS(id)[k].start;
const le = (id, k) => LS(id)[k].end;
const lon = (id, k, fi = 0.8, fo = 0.8, pre = 0.2, post = 0.3) => (t) => life(t, lt(id, k) - pre, le(id, k) + post, fi, fo);
const TAU = Math.PI * 2;
const COL = ['#F0D9A8', '#EFE8DC', '#D9786A', '#7DB898', '#9FCFC9', '#C9A66B'];   // goldHi, ivory, up, down, teal, gold
const GOLDHI = 0, IVORY = 1, UP = 2, DOWN = 3, TEAL = 4, GOLD = 5;

/* ---------- glow sprites: one per colour, drawn with drawImage (cheap at 4K) ---------- */
const SPR = COL.map(c => {
  const s = offscreen(64, 64), x = s.getContext('2d'), gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, '#FFFBF0'); gr.addColorStop(0.1, rgba(c, 1)); gr.addColorStop(0.22, rgba(c, 0.55)); gr.addColorStop(0.5, rgba(c, 0.12)); gr.addColorStop(1, rgba(c, 0));
  x.fillStyle = gr; x.fillRect(0, 0, 64, 64); return s;
});
function dot(g, x, y, r, a, c) {
  if (a <= 0.004 || r <= 0.05) return;
  g.globalAlpha = Math.min(1, a); g.drawImage(SPR[c], x - r * 4, y - r * 4, r * 8, r * 8);
}

/* ---------- per-particle constants ---------- */
const P = Array.from({ length: N }, (_, i) => { const R = rng(i * 7919 + 13); return { r1: R(), r2: R(), r3: R(), r4: R(), r5: R(), r6: R() }; });

const inWin = (t, id, pre = 0.6, post = 0.6) => t > WIN[id][0] - pre && t < WIN[id][1] + post;
const sec = id => SECTIONS.indexOf(id);

/* =====================================================================
   SHARED FORMATIONS — each writes [x, y, radius, alpha, colour] for particle i at time t into o
   ===================================================================== */
function fLattice(i, t, o) {
  const c = i % 30, r = Math.floor(i / 30), u = c / 29 - 0.5, v = r / 23;
  const rot = 0.1 * Math.sin(t * 0.09) + 0.04;
  let X = u * 2600, Z = 520 + v * 1900;
  const xr = X * Math.cos(rot) - (Z - 1300) * Math.sin(rot), zr = 1300 + X * Math.sin(rot) + (Z - 1300) * Math.cos(rot);
  const Y = 230 + 26 * Math.sin(X * 0.0024 + t * 0.7) * Math.cos(Z * 0.002 - t * 0.5);
  const f = 900, sx = 960 + xr * f / zr, sy = 430 + Y * f / zr;
  const scan = Math.exp(-Math.pow((zr - (500 + ((t * 260) % 2300))) / 140, 2));
  const tw = 0.6 + 0.4 * Math.sin(t * (1.2 + P[i].r1) + P[i].r2 * TAU);
  const fog = clamp(1.4 - zr / 2100);
  o[0] = sx; o[1] = sy; o[2] = Math.max(0.6, 2.6 * f / zr); o[3] = fog * (0.32 * tw + 0.75 * scan) * (sx > -40 && sx < 1960 ? 1 : 0); o[4] = scan > 0.4 ? GOLDHI : GOLD;
}

function fFinale(i, t, o) {
  const p = P[i], a = WIN.finale[0], k = t - a, th = p.r1 * TAU, R = 200 + p.r2 * 700 + k * (8 + p.r3 * 14);
  o[0] = 960 + Math.cos(th) * R * 1.4; o[1] = 520 + Math.sin(th) * R * 0.7; o[2] = 1 + p.r4; o[3] = 0.4 * (1 - ease(t, a + 0.5, 3.5, SOFT)); o[4] = GOLD;
}


/* =====================================================================
   FILM SECTIONS — formations + line-art for this film (see README)
   ===================================================================== */
// FILM_FORM: extra formations by name; FILM_SCHED(): [[time, formation], …] for the body of the film;
// FILM_ART: { sectionId: (g, t) => … } line-art drawn over the field while the section is on screen
const FILM_FORM = {};
function FILM_SCHED() { return SECTIONS.map(id => [WIN[id][0] - 0.2, 'lattice']); }
const FILM_ART = {};

/* =====================================================================
   SCHEDULER
   ===================================================================== */
const FORM = { lattice: fLattice, finale: fFinale, ...FILM_FORM };
let SCHED_ = null;
function sched() { return SCHED_ || (SCHED_ = [[-1, 'lattice'], ...FILM_SCHED(), [WIN.finale[0] - 0.6, 'finale']]); }
const OA = [0, 0, 0, 0, 0], OB = [0, 0, 0, 0, 0];
function formAlpha(t) {                            // the field steps back behind the title card
  return (1 - 0.55 * life(t, WIN.title[0] - 0.2, WIN.title[1] + 0.2, 0.8, 0.8)) * ease(t, 0.1, 1.6, SOFT);
}
function drawMatrix(g, t) {
  const S = sched(); let k = 0; while (k + 1 < S.length && t >= S[k + 1][0]) k++;
  const cur = S[k], prev = S[Math.max(0, k - 1)], fa = formAlpha(t);
  for (let i = 0; i < N; i++) {
    const p = P[i], u = k === 0 ? 1 : SWIFT(clamp((t - cur[0] - p.r1 * 0.5) / 1.5));
    FORM[cur[1]](i, t, OB);
    if (u < 1) {
      FORM[prev[1]](i, t, OA);
      const x = lerp(OA[0], OB[0], u), y = lerp(OA[1], OB[1], u) - Math.sin(Math.PI * u) * (20 + p.r2 * 40), r = lerp(OA[2], OB[2], u);
      if (OA[4] === OB[4]) dot(g, x, y, r, lerp(OA[3], OB[3], u) * fa, OB[4]);
      else { dot(g, x, y, r, OA[3] * (1 - u) * fa, OA[4]); dot(g, x, y, r, OB[3] * u * fa, OB[4]); }
    } else dot(g, OB[0], OB[1], OB[2], OB[3] * fa, OB[4]);
  }
  g.globalAlpha = 1;
}

/* =====================================================================
   LINE-ART: open + title (shared)
   ===================================================================== */
function artOpen(g, t) {
  const a = ease(t, 0.6, 1.4, SOFT) * (1 - ease(t, WIN.open[1] - 0.8, 1.2, SOFT));
  if (a <= 0) return;
  // a ticker ribbon drifting along the horizon
  const R = rng(5);
  for (let k = 0; k < 16; k++) {
    const x = ((k * 160 + t * 40) % 2560) - 320, v = (32 + R() * 4).toFixed(2), up = R() > 0.45;
    text(g, v, x, 404 + (k % 2) * 16, { font: 'latin', size: 20, color: up ? '#E08A7E' : '#8FC0A6', a: a * 0.5, track: 0.04 });
  }
  goldStroke(g, [[0, 430], [1920, 430]], ease(t, 0.4, 2.2, SOFT), { w: 1, a: a * 0.5, glow: 0.4 });
}
function artTitle(g, t) {
  const [a, b] = WIN.title, al = life(t, a - 0.1, b + 0.1, 1.2, 1.0), r = ease(t, a + 1.6, 1.6) * al;
  goldStroke(g, [[960 - 280 * r, 604], [960 + 280 * r, 604]], 1, { w: 1, a: 0.7 * r, glow: 0.3 });
  glowDot(g, 960, 604, 2, r);
}

/* =====================================================================
   FRAME
   ===================================================================== */
function drawScenes(g, t) {
  drawBackground(g, t);
  // a slow, continuous camera drift keeps the whole frame breathing
  const s = 1.012 + 0.01 * Math.sin(t * 0.11), dx = 7 * Math.sin(t * 0.07), dy = 5 * Math.sin(t * 0.09 + 1);
  camera(g, s, 960, 540, dx, dy);
  drawMatrix(g, t);
  if (inWin(t, 'open', 0, 0.8)) artOpen(g, t);
  if (inWin(t, 'title', 0.2, 0.2)) artTitle(g, t);
  for (const id of SECTIONS) if (FILM_ART[id] && inWin(t, id, 0.3, 0.6)) FILM_ART[id](g, t);
  resetCam(g);
}

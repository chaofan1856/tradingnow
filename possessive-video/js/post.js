// WebGL2 post-processing: transition mix, lens/chromatic aberration, glitch blocks,
// multi-level bloom, filmic tone curve, scanlines, grain, vignette.
import { W, H } from './lib.js';

const VS = `#version 300 es
in vec2 p; out vec2 uv;
void main(){ uv = p*0.5+0.5; gl_Position = vec4(p,0.,1.); }`;

const HDR = `#version 300 es
precision highp float;
in vec2 uv; out vec4 o;
float h1(float n){ return fract(sin(n*91.345)*47453.5453); }
float h2(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
`;

// pass 1: scene A/B -> composite
const COMP = HDR + `
uniform sampler2D A, B;
uniform float mixv, ttype, ca, glitch, seed, zblur, barrel, time;
uniform vec2 shake;
vec2 lens(vec2 u){ vec2 d = u-0.5; float r2 = dot(d,d); return 0.5 + d*(1.0 + barrel*r2); }
vec3 scA(vec2 u){ return texture(A, u).rgb; }
vec3 scB(vec2 u){ return texture(B, u).rgb; }
vec3 scene(vec2 u){
  if (ttype < 0.5) return scA(u);
  float m = mixv;
  if (ttype < 1.5) {                     // zoom-through crossfade
    vec2 ua = 0.5 + (u-0.5) / (1.0 + m*m*1.6);
    vec2 ub = 0.5 + (u-0.5) * (1.0 + (1.0-m)*(1.0-m)*0.9);
    return mix(scA(ua), scB(ub), smoothstep(0.25, 0.75, m));
  }
  if (ttype < 2.5) {                     // glitch slice wipe
    float row = floor(u.y*48.0 + h1(floor(u.x*3.0)+seed)*2.0);
    float th = h1(row*1.7 + seed*3.1);
    float off = (h1(row + seed*7.0)-0.5) * 0.2 * sin(m*3.14159);
    return th < m ? scB(u + vec2(off, 0.)) : scA(u - vec2(off, 0.));
  }
  // luma-keyed burn: B appears through bright parts of A first
  vec3 a = scA(u), b = scB(u);
  float l = dot(a, vec3(0.3,0.59,0.11));
  float k = smoothstep(m*1.4-0.4, m*1.4, l + h2(u*vec2(W_,H_)*0.25)*0.08 + m*0.2);
  return mix(a, b, max(k*step(0.02, m), smoothstep(0.7, 1.0, m)));
}
void main(){
  vec2 u = uv;
  u = vec2(u.x, 1.0-u.y);                // canvas textures are top-down
  u += shake;
  // glitch: blocky displacement
  if (glitch > 0.001) {
    float t = floor(time*30.0);
    vec2 blk = floor(u*vec2(16.0, 34.0));
    float r = h2(blk + t + seed);
    float r2 = h1(blk.y*13.0 + t);
    if (r2 < glitch*0.55) u.x += (h1(blk.y + t*2.0)-0.5) * 0.12 * glitch;
    if (r < glitch*0.12) u = floor(u*vec2(80.,45.))/vec2(80.,45.);
  }
  u = lens(u);
  vec2 d = (u-0.5);
  float c = ca * (0.4 + 2.2*dot(d,d)) + glitch*0.006;
  vec3 col;
  if (zblur > 0.001) {
    vec3 acc = vec3(0.); float wsum = 0.;
    for (int i = 0; i < 14; i++) {
      float f = float(i)/13.0;
      float s = 1.0 - zblur*f*0.18;
      float w = 1.0 - f*0.6;
      vec2 uu = 0.5 + d*s;
      acc += vec3(scene(uu + d*c*1.0).r, scene(uu).g, scene(uu - d*c*1.0).b) * w;
      wsum += w;
    }
    col = acc / wsum;
  } else {
    vec2 off = normalize(d + 1e-5) * c;
    col = vec3(scene(u + off).r, scene(u).g, scene(u - off).b);
  }
  if (glitch > 0.001) {                  // occasional channel-swapped stripes
    float t = floor(time*24.0);
    float row = floor(u.y*90.0);
    if (h1(row*3.3 + t) < glitch*0.08) col = col.gbr*1.4;
  }
  o = vec4(col, 1.0);
}`.replaceAll('W_', String(W.toFixed(1))).replaceAll('H_', String(H.toFixed(1)));

// bloom: bright extract + downsample (4 taps)
const DOWN = HDR + `
uniform sampler2D S; uniform vec2 px; uniform float thresh;
void main(){
  vec3 c = texture(S, uv + px*vec2(-1,-1)).rgb + texture(S, uv + px*vec2(1,-1)).rgb
         + texture(S, uv + px*vec2(-1,1)).rgb + texture(S, uv + px*vec2(1,1)).rgb;
  c *= 0.25;
  float l = max(c.r, max(c.g, c.b));
  c *= smoothstep(thresh, thresh + 0.35, l);
  o = vec4(c, 1.0);
}`;
const BLUR = HDR + `
uniform sampler2D S; uniform vec2 dir;
void main(){
  vec3 c = texture(S, uv).rgb * 0.1964825501511404;
  c += (texture(S, uv + dir*1.411764705882353).rgb + texture(S, uv - dir*1.411764705882353).rgb) * 0.2969069646728344;
  c += (texture(S, uv + dir*3.2941176470588234).rgb + texture(S, uv - dir*3.2941176470588234).rgb) * 0.09447039785044732;
  c += (texture(S, uv + dir*5.176470588235294).rgb + texture(S, uv - dir*5.176470588235294).rgb) * 0.010381362401148057;
  o = vec4(c, 1.0);
}`;
const FINAL = HDR + `
uniform sampler2D S, B1, B2, B3;
uniform float bloom, time, flash, vign, grain, scan, fade, sat;
uniform vec3 flashCol, tint;
vec3 aces(vec3 x){ return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0., 1.); }
void main(){
  vec3 c = texture(S, uv).rgb;
  vec3 b = texture(B1, uv).rgb*0.55 + texture(B2, uv).rgb*0.8 + texture(B3, uv).rgb*1.1;
  vec3 col = c + b*bloom;
  col = mix(col, aces(col*1.08), 0.55);
  float l = dot(col, vec3(0.299,0.587,0.114));
  col = mix(vec3(l), col, sat);
  col += tint * (1.0 - l) * 0.06;                     // lift shadows toward violet
  col += flashCol * flash;
  float y = gl_FragCoord.y;
  col *= 1.0 - scan * (0.5 + 0.5*sin(y*3.14159/2.0));  // 4px scanline pitch
  vec2 d = uv - 0.5;
  col *= 1.0 - vign * smoothstep(0.25, 0.95, length(d*vec2(1.0, 0.82))*1.25);
  float g = h2(gl_FragCoord.xy*0.5 + fract(time*7.13)*vec2(311.,173.)) - 0.5;
  col += g * grain;
  col *= fade;
  o = vec4(col, 1.0);
}`;

export class Post {
  constructor(canvas) {
    const gl = (this.gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true, antialias: false, alpha: false }));
    if (!gl) throw new Error('WebGL2 unavailable');
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    this.prog = {
      comp: this.program(COMP), down: this.program(DOWN), blur: this.program(BLUR), final: this.program(FINAL),
    };
    this.texA = this.tex(W, H); this.texB = this.tex(W, H);
    this.comp = this.fbo(W, H);
    const lv = [4, 8, 16];
    this.lv = lv.map(d => ({ a: this.fbo(W / d, H / d), b: this.fbo(W / d, H / d), w: W / d, h: H / d }));
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  }
  program(fs) {
    const gl = this.gl;
    const sh = (type, src) => {
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) + '\n' + src);
      return s;
    };
    const p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(p, 0, 'p');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i); u[info.name] = gl.getUniformLocation(p, info.name); }
    return { p, u };
  }
  tex(w, h) {
    const gl = this.gl, t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }
  fbo(w, h) {
    const gl = this.gl, t = this.tex(w, h), f = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
    return { f, t, w, h };
  }
  upload(tex, canvas) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }
  run(prog, target, tex, uni) {
    const gl = this.gl;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.f : null);
    gl.viewport(0, 0, target ? target.w : W, target ? target.h : H);
    gl.useProgram(prog.p);
    let unit = 0;
    for (const [name, t] of Object.entries(tex)) {
      gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t);
      gl.uniform1i(prog.u[name], unit++);
    }
    for (const [name, v] of Object.entries(uni)) {
      const loc = prog.u[name];
      if (loc == null) continue;
      if (Array.isArray(v)) (v.length === 2 ? gl.uniform2fv : gl.uniform3fv).call(gl, loc, v);
      else gl.uniform1f(loc, v);
    }
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  render(canvasA, canvasB, fx) {
    this.upload(this.texA, canvasA);
    if (canvasB && fx.ttype > 0) this.upload(this.texB, canvasB);
    const P = this.prog;
    this.run(P.comp, this.comp, { A: this.texA, B: this.texB }, {
      mixv: fx.mix ?? 0, ttype: canvasB ? fx.ttype ?? 0 : 0, ca: fx.ca ?? 0.002, glitch: fx.glitch ?? 0,
      seed: fx.seed ?? 0, zblur: fx.zblur ?? 0, barrel: fx.barrel ?? 0.04, time: fx.time ?? 0, shake: fx.shake ?? [0, 0],
    });
    let src = this.comp;
    for (let i = 0; i < this.lv.length; i++) {
      const L = this.lv[i];
      this.run(P.down, L.a, { S: src.t }, { px: [0.5 / src.w * (i ? 1 : 2), 0.5 / src.h * (i ? 1 : 2)], thresh: i ? 0.0 : fx.thresh ?? 0.45 });
      this.run(P.blur, L.b, { S: L.a.t }, { dir: [1 / L.w, 0] });
      this.run(P.blur, L.a, { S: L.b.t }, { dir: [0, 1 / L.h] });
      src = L.a;
    }
    this.run(P.final, null, { S: this.comp.t, B1: this.lv[0].a.t, B2: this.lv[1].a.t, B3: this.lv[2].a.t }, {
      bloom: fx.bloom ?? 1.2, time: fx.time ?? 0, flash: fx.flash ?? 0, flashCol: fx.flashCol ?? [1, 1, 1],
      vign: fx.vign ?? 0.55, grain: fx.grain ?? 0.035, scan: fx.scan ?? 0.06, fade: fx.fade ?? 1, sat: fx.sat ?? 1.05,
      tint: fx.tint ?? [0.35, 0.1, 0.6],
    });
  }
}

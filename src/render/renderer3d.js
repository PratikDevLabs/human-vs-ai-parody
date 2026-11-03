// ============================================================
// src/render/renderer3d.js — Three.js renderer, 2.5D side-view camera,
// post chain: RenderPass → UnrealBloom → FX(vignette+grain+CA+distortion)
// → OutputPass (ACES). Quality tiers drive DPR / bloom / shadows / grain.
// ============================================================
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ARENA, QUALITY } from '../config.js';

// custom post shader: chromatic aberration (hits/glitches), heat distortion
// (shockwaves), vignette, film grain, flash — all uniform-driven, decayed in update.
const FXShader = {
  uniforms: {
    tDiffuse: { value: null },
    time: { value: 0 },
    ca: { value: 0 },          // chromatic aberration amount
    distortion: { value: 0 },  // heat distortion amount
    vignette: { value: 0.55 },
    grain: { value: 0.05 },
    flash: { value: 0 },
    tint: { value: new THREE.Color(0x000000) },
    tintAmt: { value: 0 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float time, ca, distortion, vignette, grain, flash, tintAmt;
    uniform vec3 tint;
    varying vec2 vUv;
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      vec2 c = uv - 0.5;
      float r2 = dot(c,c);
      // heat distortion: radial wobble
      uv += c * distortion * (0.35 + 0.65*r2) * sin(uv.y*46.0 - time*22.0) * 0.02;
      // chromatic aberration
      vec2 dir = c * ca * 0.012;
      float rr = texture2D(tDiffuse, uv + dir).r;
      float gg = texture2D(tDiffuse, uv).g;
      float bb = texture2D(tDiffuse, uv - dir).b;
      vec3 col = vec3(rr, gg, bb);
      // vignette
      col *= 1.0 - vignette * smoothstep(0.25, 0.95, r2*1.6);
      // grain
      col += (hash(uv*vec2(1920.0,1080.0) + fract(time)*7.0) - 0.5) * grain;
      // tint + flash
      col = mix(col, tint, tintAmt);
      col += flash * vec3(1.0, 0.85, 0.6);
      gl_FragColor = vec4(col, 1.0);
    }
  `,
};

export class Renderer3D {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: false, stencil: false, depth: true,
      powerPreference: 'high-performance',
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x07060F);
    this.scene.fog = new THREE.FogExp2(0x0a0718, 0.028);

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120);
    this.camX = 0; this.shakeAmt = 0;
    this.basePos = new THREE.Vector3(0, ARENA.camY, ARENA.camBaseZ);
    this.look = new THREE.Vector3(0, ARENA.lookY, 0);
    this._v = new THREE.Vector3();

    // post chain
    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.55, 0.82);
    this.fxPass = new ShaderPass(FXShader);
    this.outputPass = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.fxPass);
    this.composer.addPass(this.outputPass);

    this.caTarget = 0; this.distTarget = 0; this.flashVal = 0; this.bloomSpike = 0;
    this.tierDef = QUALITY.HIGH;
    this.width = 1; this.height = 1;
    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.width = w; this.height = h;
    this.renderer.setSize(w, h, false);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  applyQuality(tier, def) {
    this.tierDef = def;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, def.dpr));
    this.bloom.enabled = def.bloom;
    this.bloom.strength = def.bloomStrength;
    this.renderer.shadowMap.enabled = def.shadows;
    if (this.sun) this.sun.castShadow = def.shadows;
    this.fxPass.uniforms.grain.value = def.grain ? 0.05 : 0.0;
    this.resize();
  }

  setSun(sun) { this.sun = sun; }

  // ---- dynamic 2.5D camera: frames all combatants, reacts to shake ----
  updateCamera(sim, dt, t) {
    let minX = 0, maxX = 0, n = 0;
    for (const f of sim.fighters) {
      if (!f.alive && f.isPlayer) continue;
      if (!f.alive && f.koT > 1.5) continue;
      if (n === 0) { minX = maxX = f.x; } else { minX = Math.min(minX, f.x); maxX = Math.max(maxX, f.x); }
      n++;
    }
    const center = (minX + maxX) / 2;
    const spread = Math.max(3.5, maxX - minX + 4);
    const targetX = center * 0.55;
    let targetZ = ARENA.camBaseZ + Math.min(4.5, spread * 0.38);
    // cinematic camera push during ultimates (chai sip / claude ascend)
    let push = 0, lookUp = 0;
    const u = sim.ult;
    if (u && (u.phase === 'lift' || u.phase === 'sip' || u.phase === 'charge')) { push = 2.0; lookUp = 0.8; }
    else if (u && u.key === 'claude' && (u.phase === 'ascend' || u.phase === 'compile')) { push = 1.4; lookUp = 0.6; }
    else if (u && u.phase === 'blast') { push = 0.6; }
    this.camX += (targetX - this.camX) * Math.min(1, dt * 3);
    this._push = (this._push || 0) + (push - (this._push || 0)) * Math.min(1, dt * 2.5);
    this._lookUp = (this._lookUp || 0) + (lookUp - (this._lookUp || 0)) * Math.min(1, dt * 2.5);
    const cx = this.camX, cz = this.basePos.z + (targetZ - ARENA.camBaseZ) - this._push;
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.2);
    const s = this.shakeAmt * 0.12 + (sim.shake || 0) * 0.10;
    const shx = s > 0 ? (Math.random() - 0.5) * s : 0;
    const shy = s > 0 ? (Math.random() - 0.5) * s * 0.7 : 0;
    this.camera.position.set(cx + shx, ARENA.camY + shy + this._lookUp * 0.4, cz);
    this.look.set(cx * 0.85, ARENA.lookY + this._lookUp, 0);
    this.camera.lookAt(this.look);
  }

  // world → CSS pixels (for DOM overlays: banners, damage numbers)
  project(x, y, z, out) {
    this._v.set(x, y, z).project(this.camera);
    out.x = (this._v.x * 0.5 + 0.5) * this.width;
    out.y = (-this._v.y * 0.5 + 0.5) * this.height;
    out.behind = this._v.z > 1;
    return out;
  }

  // ---- one-shot post impulses ----
  setCA(v) { this.caTarget = Math.max(this.caTarget, v); }
  setDistortion(v) { this.distTarget = Math.max(this.distTarget, v); }
  flash(v) { this.flashVal = Math.max(this.flashVal, v); }
  bloomSpikeFx(v) { this.bloomSpike = Math.max(this.bloomSpike, v); }
  tint(colorHex, amt, dur) {
    this.fxPass.uniforms.tint.value.set(colorHex);
    this.fxPass.uniforms.tintAmt.value = amt;
    this._tintDur = dur || 0.4;
  }

  render(dt, t) {
    // decay impulses
    this.caTarget = Math.max(0, this.caTarget - dt * 3.2);
    this.distTarget = Math.max(0, this.distTarget - dt * 2.0);
    this.flashVal = Math.max(0, this.flashVal - dt * 2.4);
    this.bloomSpike = Math.max(0, this.bloomSpike - dt * 1.6);
    const u = this.fxPass.uniforms;
    u.time.value = t;
    u.ca.value += (this.caTarget - u.ca.value) * Math.min(1, dt * 14);
    u.distortion.value += (this.distTarget - u.distortion.value) * Math.min(1, dt * 10);
    u.flash.value = this.flashVal;
    if (this._tintDur > 0) { this._tintDur -= dt; if (this._tintDur <= 0) u.tintAmt.value = 0; }
    if (this.tierDef.bloom) this.bloom.strength = this.tierDef.bloomStrength + this.bloomSpike * 1.6;
    this.composer.render();
  }

  get drawCalls() { return this.renderer.info.render.calls; }
  dispose() { this.renderer.dispose(); }
}

export function webglAvailable() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

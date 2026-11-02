// ============================================================
// src/render/fx3d.js — all 3D effects. InstancedMesh sparks, Points
// embers, pooled rings/decals/beam/slab/panels, chai ult visuals,
// impact lights, afterimage ghosts, floor light pools.
// Everything pooled — zero allocations in the frame loop.
// ============================================================
import * as THREE from 'three';
import { COLORS } from '../config.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

function codeTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 512;
  const g = c.getContext('2d');
  const chars = '{}<>/NaN404∑∞λπfn()=>;0xNaNnullTrue01def while True git push --force e^(iπ)+1=0 ∇·E=ρ/ε₀ O(n log n)'.split(' ');
  g.fillStyle = '#0a0612'; g.fillRect(0, 0, 128, 512);
  for (let y = 0; y < 512; y += 22) {
    g.font = '700 16px monospace';
    g.fillStyle = Math.random() < 0.5 ? '#FF8A2B' : '#ffc9a0';
    g.globalAlpha = 0.5 + Math.random() * 0.5;
    let line = '';
    for (let i = 0; i < 4; i++) line += chars[(Math.random() * chars.length) | 0] + ' ';
    g.fillText(line, 4, y);
  }
  g.globalAlpha = 1;
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function essayTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(240,255,248,0.96)'; g.fillRect(0, 0, 256, 512);
  g.fillStyle = '#065f46';
  g.font = '800 26px Georgia, serif'; g.textAlign = 'center';
  g.fillText('ESSAY', 128, 40);
  g.font = '700 15px Georgia, serif'; g.textAlign = 'left';
  const words = ['In conclusion,', 'Furthermore,', 'It is evident', 'that the human', 'clearly stands no', 'chance versus the', 'overwhelming might', 'of artificial', 'intelligence. QED.', 'Word count: 10000'];
  let y = 80;
  for (const w of words) { g.fillText(w, 18, y); y += 30; }
  g.strokeStyle = '#dc2626'; g.lineWidth = 4; g.strokeRect(20, 430, 216, 44);
  g.fillStyle = '#dc2626'; g.font = '800 22px Georgia'; g.textAlign = 'center';
  g.fillText('YOU LOSE', 128, 460);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function panelTexture() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(20,8,4,0.92)'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#FF8A2B'; g.lineWidth = 4; g.strokeRect(4, 4, 120, 120);
  g.fillStyle = '#ffd9b0'; g.font = '800 44px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(['{ }', '</>', 'NaN', 'null', '404', '∑', '∞', '0x'][ (Math.random()*8)|0 ], 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function ghostTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 64, 6, 32, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0.85)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
  const t = new THREE.CanvasTexture(c); return t;
}
function poolTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, 128);
  gr.addColorStop(0, 'rgba(255,255,255,0.55)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 128);
  return new THREE.CanvasTexture(c);
}

const SPARKS = 240, RINGS = 12, DECALS = 8, PROJ = 14, GHOSTS = 8, LIGHTS = 4, CRACKS = 10, RUBBLE = 8, EMBERS = 160, SPIRAL = 130;

export class FX3D {
  constructor(scene, r3d) {
    this.scene = scene; this.r3d = r3d;
    this.t = 0;

    // --- sparks (instanced) ---
    this.sparkMesh = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.055, 0.055, 0.055),
      new THREE.MeshBasicMaterial({ toneMapped: false }), SPARKS);
    this.sparkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.sparkMesh.frustumCulled = false;
    scene.add(this.sparkMesh);
    this.sp = new Float32Array(SPARKS * 3);   // pos
    this.sv = new Float32Array(SPARKS * 3);   // vel
    this.sl = new Float32Array(SPARKS);        // life
    this.sm = new Float32Array(SPARKS);        // max life
    this.sc = new Float32Array(SPARKS * 3);    // color
    this.si = 0;
    this._dummy = new THREE.Object3D();
    this._col = new THREE.Color();
    for (let i = 0; i < SPARKS; i++) { this.sl[i] = 0; this._dummy.scale.setScalar(0); this._dummy.updateMatrix(); this.sparkMesh.setMatrixAt(i, this._dummy.matrix); }

    // --- embers (points) ---
    const eg = new THREE.BufferGeometry();
    this.emberPos = new Float32Array(EMBERS * 3);
    for (let i = 0; i < EMBERS; i++) {
      this.emberPos[i * 3] = (Math.random() - 0.5) * 26;
      this.emberPos[i * 3 + 1] = Math.random() * 7;
      this.emberPos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 4;
    }
    eg.setAttribute('position', new THREE.BufferAttribute(this.emberPos, 3));
    this.embers = new THREE.Points(eg, new THREE.PointsMaterial({
      color: 0xFFC24A, size: 0.045, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    this.embers.frustumCulled = false;
    scene.add(this.embers);

    // --- rings pool ---
    this.rings = [];
    for (let i = 0; i < RINGS; i++) {
      const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 44),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.04; m.visible = false;
      scene.add(m);
      this.rings.push({ m, life: 0, max: 1, maxR: 1, grow: 8 });
    }

    // --- telegraph decals pool ---
    this.decals = [];
    for (let i = 0; i < DECALS; i++) {
      const grp = new THREE.Group();
      const fill = new THREE.Mesh(new THREE.CircleGeometry(1, 40),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      fill.rotation.x = -Math.PI / 2; fill.position.y = 0.03;
      const edge = new THREE.Mesh(new THREE.RingGeometry(0.94, 1, 40),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      edge.rotation.x = -Math.PI / 2; edge.position.y = 0.035;
      grp.add(fill, edge); grp.visible = false;
      scene.add(grp);
      this.decals.push({ grp, fill, edge, active: -1 });
    }

    // --- projectile meshes pool ---
    this.projMeshes = [];
    for (let i = 0; i < PROJ; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.22),
        new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      m.visible = false; scene.add(m);
      this.projMeshes.push(m);
    }

    // --- ghost afterimages ---
    const gt = ghostTexture();
    this.ghosts = [];
    for (let i = 0; i < GHOSTS; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 1.7),
        new THREE.MeshBasicMaterial({ map: gt, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      m.visible = false; scene.add(m);
      this.ghosts.push({ m, life: 0 });
    }

    // --- impact lights pool ---
    this.lights = [];
    for (let i = 0; i < LIGHTS; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 9, 2);
      scene.add(l);
      this.lights.push({ l, life: 0 });
    }

    // --- claude beam ---
    this.codeTex = codeTexture();
    this.beam = new THREE.Group();
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 10, 12, 1, true),
      new THREE.MeshBasicMaterial({ map: this.codeTex, color: 0xFF8A2B, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    outer.position.y = 5;
    const coreB = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 10, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff3e0, toneMapped: false, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }));
    coreB.position.y = 5;
    this.beamLight = new THREE.PointLight(0xFF8A2B, 0, 14, 1.8);
    this.beam.add(outer, coreB, this.beamLight);
    this.beam.visible = false;
    scene.add(this.beam);
    this.beamSubs = [];
    for (let i = 0; i < 2; i++) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8, 8, 1, true),
        new THREE.MeshBasicMaterial({ map: this.codeTex, color: 0xff5a2b, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      s.position.y = 4; s.visible = false;
      this.beam.add(s); this.beamSubs.push(s);
    }

    // --- claude ult holo rings (3 counter-rotating panel rings) ---
    this.holoRings = new THREE.Group();
    this.holoPanels = [];
    for (let r = 0; r < 3; r++) {
      const ring = new THREE.Group();
      for (let i = 0; i < 8; i++) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.4),
          new THREE.MeshBasicMaterial({ map: panelTexture(), color: 0xFF8A2B, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
        const a = i / 8 * Math.PI * 2;
        p.position.set(Math.cos(a) * (1.3 + r * 0.35), 0, Math.sin(a) * (1.3 + r * 0.35));
        p.lookAt(0, p.position.y, 0);
        ring.add(p); this.holoPanels.push(p);
      }
      this.holoRings.add(ring);
      ring.userData.r = r;
    }
    this.holoRings.visible = false;
    scene.add(this.holoRings);
    // ground sigil
    this.sigil = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.05, 48),
      new THREE.MeshBasicMaterial({ map: this.codeTex, color: 0xFF8A2B, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    this.sigil.rotation.x = -Math.PI / 2; this.sigil.position.y = 0.05;
    scene.add(this.sigil);

    // --- essay slab ---
    this.slab = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 0.35),
      new THREE.MeshBasicMaterial({ map: essayTexture(), transparent: true, opacity: 0.92, side: THREE.DoubleSide }));
    this.slab.castShadow = true;
    this.slab.visible = false;
    scene.add(this.slab);
    // rubble
    this.rubble = [];
    for (let i = 0; i < RUBBLE; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.34, 0.3),
        new THREE.MeshStandardMaterial({ map: essayTexture(), color: 0xffffff, roughness: 0.9 }));
      m.visible = false; scene.add(m);
      this.rubble.push({ m, life: 0, vx: 0, vz: 0, vr: 0 });
    }

    // --- chai ult visuals ---
    const sg = new THREE.BufferGeometry();
    this.spiralPos = new Float32Array(SPIRAL * 3);
    sg.setAttribute('position', new THREE.BufferAttribute(this.spiralPos, 3));
    this.spiral = new THREE.Points(sg, new THREE.PointsMaterial({
      color: 0xFFC24A, size: 0.09, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    this.spiral.visible = false; this.spiral.frustumCulled = false;
    scene.add(this.spiral);
    // teacup in hand
    this.teacup = new THREE.Group();
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.13, 14),
      new THREE.MeshStandardMaterial({ color: 0xfff6e8, emissive: 0xFFC24A, emissiveIntensity: 0.7, roughness: 0.25 }));
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 8, 14, Math.PI),
      new THREE.MeshStandardMaterial({ color: 0xfff6e8, emissive: 0xFFC24A, emissiveIntensity: 0.5 }));
    handle.position.set(0.1, 0, 0); handle.rotation.z = -Math.PI / 2;
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 14),
      new THREE.MeshStandardMaterial({ color: 0xfff6e8, emissive: 0xFFC24A, emissiveIntensity: 0.4 }));
    saucer.position.y = -0.08;
    this.teacup.add(cup, handle, saucer);
    this.teacup.visible = false;
    scene.add(this.teacup);
    // steam points for the cup
    const stg = new THREE.BufferGeometry();
    this.steamPos = new Float32Array(24 * 3);
    stg.setAttribute('position', new THREE.BufferAttribute(this.steamPos, 3));
    this.steam = new THREE.Points(stg, new THREE.PointsMaterial({
      color: 0xffffff, size: 0.06, transparent: true, opacity: 0.5,
      blending: THREE.AdditiveBlending, depthWrite: false }));
    this.steam.visible = false; this.steam.frustumCulled = false;
    scene.add(this.steam);
    // shockwave torus
    this.shock = new THREE.Mesh(new THREE.TorusGeometry(1, 0.14, 12, 72),
      new THREE.MeshBasicMaterial({ color: 0xFFC24A, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.shock.rotation.x = Math.PI / 2; this.shock.position.y = 0.15; this.shock.visible = false;
    scene.add(this.shock);
    // ground cracks
    this.cracks = [];
    for (let i = 0; i < CRACKS; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 2.6),
        new THREE.MeshBasicMaterial({ color: 0xFFC24A, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      m.rotation.x = -Math.PI / 2; m.visible = false;
      scene.add(m);
      this.cracks.push({ m, life: 0 });
    }

    // --- floor light pools + reflection streaks per fighter ---
    this.poolTex = poolTexture();
    this.pools = {};
    this.streaks = {};
  }

  ensurePools(sim, qualityDef) {
    for (const f of sim.fighters) {
      if (!this.pools[f.id]) {
        const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4),
          new THREE.MeshBasicMaterial({ map: this.poolTex, color: new THREE.Color(f.color), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false }));
        p.rotation.x = -Math.PI / 2; p.position.y = 0.02;
        this.scene.add(p);
        this.pools[f.id] = p;
      }
      if (qualityDef.reflections && !this.streaks[f.id]) {
        const s = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 2.2),
          new THREE.MeshBasicMaterial({ map: this.poolTex, color: new THREE.Color(f.color), transparent: true, opacity: 0.10, blending: THREE.AdditiveBlending, depthWrite: false }));
        s.rotation.x = -Math.PI / 2; s.position.y = 0.015;
        this.scene.add(s);
        this.streaks[f.id] = s;
      } else if (!qualityDef.reflections && this.streaks[f.id]) {
        this.scene.remove(this.streaks[f.id]); delete this.streaks[f.id];
      }
    }
  }

  setQuality(def) {
    this.particleScale = def.particles;
    this.sparkMesh.count = Math.floor(SPARKS * def.particles) + 40;
  }

  // ---------- spawners ----------
  burst(x, y, z, colorHex, n, spd, life) {
    const col = this._col.set(colorHex);
    for (let k = 0; k < n; k++) {
      const i = this.si; this.si = (this.si + 1) % SPARKS;
      this.sp[i * 3] = x; this.sp[i * 3 + 1] = y; this.sp[i * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2, v = spd * (0.3 + Math.random() * 0.7);
      this.sv[i * 3] = Math.cos(a) * v;
      this.sv[i * 3 + 1] = Math.sin(a) * v * 0.7 + spd * 0.35;
      this.sv[i * 3 + 2] = Math.sin(a) * v * 0.4;
      this.sl[i] = life * (0.6 + Math.random() * 0.7);
      this.sm[i] = this.sl[i];
      this.sc[i * 3] = col.r; this.sc[i * 3 + 1] = col.g; this.sc[i * 3 + 2] = col.b;
    }
  }
  ring(x, z, colorHex, maxR, life, y) {
    for (const r of this.rings) {
      if (r.life <= 0) {
        r.life = life; r.max = life; r.maxR = maxR;
        r.m.position.set(x, y || 0.05, z);
        r.m.material.color.set(colorHex);
        r.m.visible = true;
        return;
      }
    }
  }
  light(x, y, z, colorHex, intensity) {
    for (const L of this.lights) {
      if (L.life <= 0) {
        L.life = 0.35;
        L.l.position.set(x, y, z);
        L.l.color.set(colorHex);
        L.l.intensity = intensity;
        return;
      }
    }
  }
  ghost(x, y, z, face, colorHex) {
    for (const g of this.ghosts) {
      if (g.life <= 0) {
        g.life = 0.28;
        g.m.position.set(x, y + 0.95, z);
        g.m.rotation.y = face === 1 ? -Math.PI / 2 : Math.PI / 2;
        g.m.material.color.set(colorHex);
        g.m.visible = true;
        return;
      }
    }
  }

  bindBus(bus, sim, rigs) {
    bus.on('fx:impact', (e) => {
      this.burst(e.x, e.y, e.z, e.color, e.heavy ? 26 : 14, e.heavy ? 7 : 5, 0.5);
      this.ring(e.x, e.z, e.color, e.heavy ? 2.6 : 1.6, 0.4);
      this.light(e.x, e.y, e.z, e.color, e.heavy ? 90 : 55);
      this.r3d.setCA(e.heavy ? 0.9 : 0.5);
    });
    bus.on('fx:spark', (e) => this.burst(e.x, e.y, e.z, e.color, e.n || 12, 5, 0.45));
    bus.on('fx:ko', (f) => {
      this.burst(f.x, f.y + 1, f.z, f.color, 40, 8, 0.9);
      this.ring(f.x, f.z, f.color, 3.4, 0.7);
      this.light(f.x, 1.2, f.z, f.color, 120);
      this.r3d.setCA(1.1); this.r3d.bloomSpikeFx(0.5);
    });
    bus.on('fx:perfect', (e) => {
      this.ring(e.x, e.z, '#7DF9FF', 2.2, 0.5);
      this.burst(e.x, e.y, e.z, '#7DF9FF', 18, 4, 0.6);
      this.r3d.setCA(0.7);
    });
    bus.on('fx:dodge', (f) => { f._ghostT = 0; });
    bus.on('fx:land', (f) => this.burst(f.x, 0.1, f.z, '#8a93c9', 6, 2, 0.3));
    bus.on('fx:slamwind', (e) => { this.ring(e.x, e.z, e.color, 3.0, 0.45); this.burst(e.x, 0.4, e.z, e.color, 16, 5, 0.5); });
    bus.on('fx:roastHit', (e) => {
      this.burst(e.x, e.y, e.z, '#FF3B4A', 22, 6, 0.6);
      this.r3d.tint('#FF3B4A', 0.35, 0.5);
      this.r3d.setDistortion(0.8); this.r3d.setCA(1.2);
    });
    bus.on('ult:start', (e) => {
      this.r3d.tint(e.key === 'chai' ? '#FFC24A' : e.owner.color, 0.22, 1.2);
      this.r3d.setDistortion(0.5);
    });
    bus.on('ult:blast', (e) => {
      const o = e.owner;
      this.shock.visible = true; this.shock.position.set(o.x, 0.2, o.z);
      this.shock.scale.setScalar(0.5); this.shock.material.opacity = 1;
      this._shockLife = 1.0;
      for (const c of this.cracks) {
        c.life = 1.2;
        c.m.visible = true;
        c.m.position.set(o.x + (Math.random() - 0.5) * 6, 0.06, o.z + (Math.random() - 0.5) * 2.5);
        c.m.rotation.z = Math.random() * Math.PI;
        c.m.material.color.set(0xFFC24A);
      }
      this.burst(o.x, o.y + 1, o.z, '#FFC24A', 60, 11, 1.0);
      this.burst(o.x, o.y + 1, o.z, '#ffffff', 24, 7, 0.7);
      this.ring(o.x, o.z, '#FFC24A', 11, 1.1);
      this.r3d.bloomSpikeFx(1.0); this.r3d.setDistortion(1.4); this.r3d.flash(0.85); this.r3d.setCA(0.8);
    });
    bus.on('ult:wave', (e) => {
      this.ring(e.owner.x, e.owner.z, e.owner.color, 9, 1.6);
      this.r3d.setDistortion(0.9);
      this.r3d.tint('#FF3B4A', 0.25, 0.7);
    });
    bus.on('ult:slabFall', (s) => { /* slab mesh synced per-frame */ });
    bus.on('ult:slabImpact', (s) => {
      this.ring(s.x, s.z, s.color, 6, 0.8);
      this.burst(s.x, 0.6, s.z, s.color, 30, 7, 0.8);
      this.r3d.setCA(0.9); this.r3d.setDistortion(0.8);
      let n = 0;
      for (const r of this.rubble) {
        if (r.life > 0) continue;
        r.life = 3; r.m.visible = true;
        r.m.position.set(s.x + (Math.random() - 0.5) * s.w, 0.2, s.z + (Math.random() - 0.5) * 1.5);
        r.m.rotation.set(Math.random() * 0.6, Math.random() * 3, Math.random() * 0.6);
        r.vx = (Math.random() - 0.5) * 3; r.vz = (Math.random() - 0.5) * 2; r.vr = (Math.random() - 0.5) * 4;
        if (++n >= 6) break;
      }
    });
    bus.on('ult:glitch', () => {
      this.r3d.setCA(2.2); this.r3d.setDistortion(0.6);
      this.r3d.tint('#FF8A2B', 0.3, 0.6);
    });
    bus.on('fx:rubble', () => {});
    this._sim = sim; this._rigs = rigs;
  }

  // ---------- per-frame ----------
  sync(sim, t, dt) {
    this.t = t;
    // sparks
    for (let i = 0; i < SPARKS; i++) {
      if (this.sl[i] > 0) {
        this.sl[i] -= dt;
        this.sp[i * 3] += this.sv[i * 3] * dt;
        this.sp[i * 3 + 1] += this.sv[i * 3 + 1] * dt;
        this.sp[i * 3 + 2] += this.sv[i * 3 + 2] * dt;
        this.sv[i * 3 + 1] -= 12 * dt;
        const k = clamp(this.sl[i] / this.sm[i], 0, 1);
        this._dummy.position.set(this.sp[i * 3], this.sp[i * 3 + 1], this.sp[i * 3 + 2]);
        this._dummy.scale.setScalar(k * (0.6 + (1 - k) * 0.6));
        this._dummy.rotation.set(t * 9 + i, t * 7 + i * 2, 0);
        this._dummy.updateMatrix();
        this.sparkMesh.setMatrixAt(i, this._dummy.matrix);
        this.sparkMesh.setColorAt(i, this._col.setRGB(this.sc[i * 3] * k, this.sc[i * 3 + 1] * k, this.sc[i * 3 + 2] * k));
      } else {
        this._dummy.scale.setScalar(0); this._dummy.updateMatrix();
        this.sparkMesh.setMatrixAt(i, this._dummy.matrix);
      }
    }
    this.sparkMesh.instanceMatrix.needsUpdate = true;
    if (this.sparkMesh.instanceColor) this.sparkMesh.instanceColor.needsUpdate = true;

    // embers
    for (let i = 0; i < EMBERS; i++) {
      let y = this.emberPos[i * 3 + 1] + dt * (0.25 + (i % 5) * 0.08);
      if (y > 7) y = 0;
      this.emberPos[i * 3 + 1] = y;
      this.emberPos[i * 3] += Math.sin(t * 1.3 + i) * dt * 0.3;
    }
    this.embers.geometry.attributes.position.needsUpdate = true;

    // rings
    for (const r of this.rings) {
      if (r.life > 0) {
        r.life -= dt;
        const k = 1 - r.life / r.max;
        const s = 0.2 + (r.maxR - 0.2) * (1 - Math.pow(1 - k, 2.2));
        r.m.scale.setScalar(s);
        r.m.material.opacity = (1 - k) * 0.85;
        if (r.life <= 0) r.m.visible = false;
      }
    }

    // telegraph decals from sim.zones
    let zi = 0;
    for (const z of sim.zones) {
      if (!z.alive || zi >= DECALS) continue;
      const d = this.decals[zi++];
      d.grp.visible = true;
      d.grp.position.set(z.x, 0, z.z);
      const prog = z.dur > 0 ? z.t / z.dur : 1;
      const pulse = 0.25 + 0.2 * Math.sin(t * 14);
      if (z.kind === 'lane') {
        d.grp.scale.set(9, 1, 1.6);
        d.fill.material.color.set(0xFF3B4A);
        d.fill.material.opacity = 0.28;
        d.edge.material.opacity = 0.9;
      } else if (z.kind === 'slabshadow') {
        d.grp.scale.setScalar(z.r * (0.7 + prog * 0.3));
        d.fill.material.color.set(0x000000);
        d.fill.material.blending = THREE.NormalBlending;
        d.fill.material.opacity = 0.55;
        d.edge.material.color.set(z.color);
        d.edge.material.opacity = 0.8 * pulse + 0.3;
      } else {
        d.grp.scale.setScalar(z.r * (0.85 + prog * 0.15));
        d.fill.material.blending = THREE.AdditiveBlending;
        d.fill.material.color.set(z.color);
        d.fill.material.opacity = 0.22 * pulse + 0.12;
        d.edge.material.color.set(z.color);
        d.edge.material.opacity = 0.55 + prog * 0.45;
      }
      d.edge.material.color.copy(d.fill.material.color).lerp(new THREE.Color(0xffffff), 0.3);
      if (z.kind !== 'slabshadow') { d.edge.material.color.set(z.color); d.edge.material.blending = THREE.AdditiveBlending; }
    }
    for (; zi < DECALS; zi++) this.decals[zi].grp.visible = false;

    // projectiles
    let pi = 0;
    for (const q of sim.projectiles) {
      if (!q.alive || q.delay > 0 || pi >= PROJ) continue;
      const m = this.projMeshes[pi++];
      m.visible = true;
      m.position.set(q.x, q.y, q.z);
      m.material.color.set(q.color);
      m.rotation.set(t * 8, t * 11, 0);
      const s = q.kind === 'panel' ? 2.2 : 1;
      m.scale.setScalar(s);
    }
    for (; pi < PROJ; pi++) this.projMeshes[pi].visible = false;

    // ghosts (dodge afterimages)
    for (const f of sim.fighters) {
      if (f.state === 'dodge' && f.alive) {
        f._ghostT = (f._ghostT || 0) - dt;
        if (f._ghostT <= 0) { f._ghostT = 0.035; this.ghost(f.x, f.y, f.z, f.face, f.color); }
      }
    }
    for (const g of this.ghosts) {
      if (g.life > 0) {
        g.life -= dt;
        g.m.material.opacity = Math.max(0, g.life / 0.28) * 0.4;
        if (g.life <= 0) g.m.visible = false;
      }
    }

    // impact lights decay
    for (const L of this.lights) {
      if (L.life > 0) { L.life -= dt; L.l.intensity *= Math.pow(0.001, dt); if (L.life <= 0) L.l.intensity = 0; }
    }

    // beam + holo rings + sigil (claude ult)
    const u = sim.ult;
    const claudeUlt = u && u.key === 'claude';
    this.beam.visible = !!(claudeUlt && u.phase === 'execute' && u.beam);
    this.holoRings.visible = !!(claudeUlt && (u.phase === 'ascend' || u.phase === 'compile' || u.phase === 'execute'));
    this.sigil.material.opacity = claudeUlt ? 0.75 : 0;
    if (claudeUlt) {
      const o = u.owner;
      this.holoRings.position.set(o.x, o.y + 1.6, o.z);
      this.sigil.position.set(o.x, 0.05, o.z);
      this.sigil.rotation.z = t * 2.2;
      this.codeTex.offset.y = -t * 0.7;
      for (const ring of this.holoRings.children) {
        const r = ring.userData.r;
        ring.rotation.y = t * (1.6 + r * 0.7) * (r % 2 ? -1 : 1);
        ring.rotation.x = Math.sin(t * 0.9 + r) * 0.35;
        ring.position.y = Math.sin(t * 1.7 + r * 2) * 0.3;
      }
      if (u.beam && this.beam.visible) {
        const bx = u.beamX !== undefined ? u.beamX : o.x + 4;
        const bz = u.beamZ !== undefined ? u.beamZ : o.z;
        this._beamDir || (this._beamDir = new THREE.Vector3());
        this._beamDir.set(bx - o.x, 1.0 - (o.y + 1.4), bz - o.z);
        const len = this._beamDir.length();
        this._beamDir.normalize();
        this.beam.position.set(o.x, o.y + 1.4, o.z);
        this.beam.quaternion.setFromUnitVectors(this._up || (this._up = new THREE.Vector3(0, 1, 0)), this._beamDir);
        this.beam.scale.set(1, Math.max(0.1, len / 10), 1); // children span y 0..10
        this.beamLight.intensity = 60 + Math.sin(t * 40) * 20;
        const nSub = sim.diff.subBeams || 0;
        for (let i = 0; i < this.beamSubs.length; i++) {
          const s = this.beamSubs[i];
          s.visible = i < nSub;
          if (s.visible) {
            s.position.set(Math.cos(t * 5 + i) * 0.5, 4, Math.sin(t * 5 + i) * 0.5);
          }
        }
      }
    }

    // slab
    let slabShown = false;
    for (const s of sim.slabs) {
      if (!s.alive) continue;
      slabShown = true;
      this.slab.visible = true;
      this.slab.position.set(s.x, Math.max(0.2, s.y) + s.h / 2 - 0.2, s.z);
      this.slab.scale.set(s.w / 3.4, s.h / 2.6, 1);
      this.slab.rotation.z = Math.sin(t * 3) * 0.05;
    }
    if (!slabShown) this.slab.visible = false;

    // rubble
    for (const r of this.rubble) {
      if (r.life > 0) {
        r.life -= dt;
        r.m.position.x += r.vx * dt; r.m.position.z += r.vz * dt;
        r.m.rotation.y += r.vr * dt;
        if (r.life <= 0) r.m.visible = false;
      }
    }

    // chai ult visuals
    const chaiUlt = u && u.key === 'chai';
    const owner = chaiUlt ? u.owner : null;
    this.spiral.visible = !!(chaiUlt && (u.phase === 'lift' || u.phase === 'sip' || u.phase === 'charge'));
    this.teacup.visible = !!(chaiUlt && u.phase === 'sip');
    this.steam.visible = this.teacup.visible;
    if (chaiUlt) {
      for (let i = 0; i < SPIRAL; i++) {
        const a = t * 7 + i * 0.24;
        const rad = 1.5 - (i / SPIRAL) * 1.0 + Math.sin(t * 9 + i) * 0.08;
        this.spiralPos[i * 3] = owner.x + Math.cos(a) * rad;
        this.spiralPos[i * 3 + 1] = owner.y + (i / SPIRAL) * 3.2 + Math.sin(t * 5 + i) * 0.1;
        this.spiralPos[i * 3 + 2] = owner.z + Math.sin(a) * rad * 0.6;
      }
      this.spiral.geometry.attributes.position.needsUpdate = true;
      if (this.teacup.visible && this._rigs) {
        const hp = this._rigs.handWorld(owner, 'R', this._v || (this._v = new THREE.Vector3()));
        this.teacup.position.copy(hp);
        this.teacup.position.y -= 0.1;
        // steam
        for (let i = 0; i < 24; i++) {
          this.steamPos[i * 3] = hp.x + (Math.random() - 0.5) * 0.12;
          this.steamPos[i * 3 + 1] = hp.y + 0.1 + (i % 8) * 0.05 + Math.sin(t * 6 + i) * 0.02;
          this.steamPos[i * 3 + 2] = hp.z + (Math.random() - 0.5) * 0.12;
        }
        this.steam.geometry.attributes.position.needsUpdate = true;
      }
    }
    // shockwave
    if (this._shockLife > 0) {
      this._shockLife -= dt * 1.4;
      const k = 1 - Math.max(0, this._shockLife);
      this.shock.scale.setScalar(0.5 + k * 12);
      this.shock.material.opacity = Math.max(0, this._shockLife) * 0.9;
      if (this._shockLife <= 0) this.shock.visible = false;
    }
    // cracks
    for (const c of this.cracks) {
      if (c.life > 0) {
        c.life -= dt;
        c.m.material.opacity = Math.max(0, c.life / 1.2) * 0.8;
        if (c.life <= 0) c.m.visible = false;
      }
    }

    // fighter floor pools / streaks
    for (const f of sim.fighters) {
      const p = this.pools[f.id];
      if (p) {
        p.position.set(f.x, 0.02, f.z);
        p.material.opacity = 0.14 + (f.flashT > 0 ? f.flashT * 2.2 : 0) + (f.alive ? Math.sin(t * 3 + f.x) * 0.02 : 0);
      }
      const st = this.streaks[f.id];
      if (st) {
        st.position.set(f.x, 0.015, f.z);
        st.material.opacity = 0.10 + (f.flashT > 0 ? f.flashT * 1.6 : 0);
        st.scale.y = 1 + f.y * 0.4;
      }
    }
  }
}

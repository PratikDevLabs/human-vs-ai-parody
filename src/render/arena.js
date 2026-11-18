// ============================================================
// src/render/arena.js — "NEO-DELHI 2099" five-layer parallax arena:
// sky(moon/stars/smog/lightning) → far skyline(towers+shikhara+minarets)
// → mid city(windows, holo billboards, power lines) → near street
// (chai tapri neon teacup-glyph sign, paan shop, auto-rickshaw, tube lights)
// → foreground fog. Wet neon-grid floor + light pools.
// ============================================================
import * as THREE from 'three';
import { COLORS, ARENA } from '../config.js';

function makeCanvas(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  fn(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function rand(a, b) { return a + Math.random() * (b - a); }

// ---------- floor: wet asphalt + neon grid + puddles ----------
function floorTexture() {
  return makeCanvas(1024, 1024, (g, w, h) => {
    g.fillStyle = '#07090e'; g.fillRect(0, 0, w, h);
    // asphalt noise
    for (let i = 0; i < 9000; i++) {
      const v = 8 + Math.random() * 18;
      g.fillStyle = `rgb(${v},${v},${v + 8})`;
      g.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    // puddle streaks
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * w, y = Math.random() * h, r = rand(18, 70);
      const gr = g.createRadialGradient(x, y, 2, x, y, r);
      gr.addColorStop(0, 'rgba(30,40,80,0.55)');
      gr.addColorStop(1, 'rgba(10,8,23,0)');
      g.fillStyle = gr;
      g.beginPath(); g.ellipse(x, y, r, r * 0.35, Math.random() * 3, 0, 7); g.fill();
    }
  });
}
function floorGlowTexture() {
  return makeCanvas(1024, 1024, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    // crisp subtle cyan/magenta neon lane lines on wet asphalt
    for (let i = 0; i < 10; i++) {
      const t = i / 9, y = Math.pow(t, 1.8) * h;
      g.strokeStyle = `rgba(39,230,255,${0.07 + t * 0.16})`;
      g.lineWidth = 1 + t * 1.6;
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    for (let i = -10; i <= 10; i++) {
      g.strokeStyle = 'rgba(39,230,255,0.10)';
      g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(w / 2 + i * 40, 0); g.lineTo(w / 2 + i * 120, h); g.stroke();
    }
    // magenta lane edge lines
    g.strokeStyle = 'rgba(255,59,240,0.22)';
    g.lineWidth = 2.4;
    g.beginPath(); g.moveTo(0, h * 0.10); g.lineTo(w, h * 0.10); g.stroke();
    g.beginPath(); g.moveTo(0, h * 0.86); g.lineTo(w, h * 0.86); g.stroke();
  });
}

// ---------- holo billboards: ABSTRACT neon shapes only — zero readable text in the 3D world ----------
const AD_COLORS = [COLORS.chai, '#FF3B4A', '#27E6FF', '#2CFFA7', '#FF8A2B'];
function adTexture(color, seed) {
  return makeCanvas(256, 128, (g, w, h) => {
    g.fillStyle = 'rgba(8,10,26,0.92)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 3; g.strokeRect(3, 3, w - 6, h - 6);
    g.shadowColor = color; g.shadowBlur = 18;
    g.strokeStyle = color; g.lineWidth = 5; g.lineCap = 'round';
    const r = (a, b) => a + ((seed * 9301 + 49297) % 233280 % (b - a)) / 1 + (b - a) * 0; // deterministic-ish
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    if (seed % 3 === 0) {
      // abstract bars
      for (let i = 0; i < 4; i++) {
        const bw = 24 + rnd() * 90;
        g.globalAlpha = 0.5 + rnd() * 0.5;
        g.fillStyle = color;
        g.fillRect(28 + i * 56, 30 + rnd() * 40, bw * 0.4, 10 + rnd() * 26);
      }
    } else if (seed % 3 === 1) {
      // abstract ring + slash
      g.beginPath(); g.arc(w / 2, h / 2, 26 + rnd() * 14, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(w / 2 - 34, h / 2 + 26); g.lineTo(w / 2 + 34, h / 2 - 26); g.stroke();
    } else {
      // abstract chevrons
      for (let i = 0; i < 3; i++) {
        g.globalAlpha = 0.6 - i * 0.15;
        g.beginPath();
        g.moveTo(w / 2 - 40 + i * 14, h / 2 + 24);
        g.lineTo(w / 2 + i * 14, h / 2 - 8);
        g.lineTo(w / 2 + 40 + i * 14, h / 2 + 24);
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  });
}
// neon shop sign: drawn teacup glyph (vector path, NO characters)
function teacupSignTexture(color) {
  return makeCanvas(160, 160, (g, w, h) => {
    g.fillStyle = 'rgba(5,4,12,0.92)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8);
    g.shadowColor = color; g.shadowBlur = 26;
    g.strokeStyle = color; g.lineWidth = 9; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(46, 66); g.lineTo(104, 66); g.lineTo(96, 116); g.lineTo(54, 116); g.closePath(); g.stroke();
    g.beginPath(); g.arc(114, 84, 14, -1.2, 1.2); g.stroke();
    g.lineWidth = 6;
    g.beginPath(); g.moveTo(64, 48); g.quadraticCurveTo(58, 36, 66, 24); g.moveTo(86, 48); g.quadraticCurveTo(80, 36, 88, 24); g.stroke();
  });
}
// paan shop sign: abstract leaf-diamond glyph (no text)
function paanSignTexture(color) {
  return makeCanvas(160, 160, (g, w, h) => {
    g.fillStyle = 'rgba(5,4,12,0.92)'; g.fillRect(0, 0, w, h);
    g.strokeStyle = color; g.lineWidth = 5; g.strokeRect(4, 4, w - 8, h - 8);
    g.shadowColor = color; g.shadowBlur = 26;
    g.strokeStyle = color; g.lineWidth = 8; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(80, 30); g.lineTo(116, 80); g.lineTo(80, 130); g.lineTo(44, 80); g.closePath(); g.stroke();
    g.beginPath(); g.moveTo(80, 30); g.lineTo(80, 130); g.stroke();
  });
}
function windowTexture() {
  // sparse, dim cool slit-windows on near-black facades — no rainbow pixels
  return makeCanvas(128, 256, (g, w, h) => {
    g.fillStyle = '#07070f'; g.fillRect(0, 0, w, h);
    for (let y = 8; y < h - 8; y += 22) {
      for (let x = 8; x < w - 8; x += 20) {
        if (Math.random() < 0.16) {
          g.fillStyle = Math.random() < 0.7 ? '#3d5a80' : '#27E6FF';
          g.globalAlpha = 0.25 + Math.random() * 0.35;
          g.fillRect(x, y, 7, 13);
        }
      }
    }
    g.globalAlpha = 1;
  });
}

export function buildArena(scene) {
  const root = new THREE.Group();
  scene.add(root);

  // ---- lights ----
  const hemi = new THREE.HemisphereLight(0x33406e, 0x0a0714, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0x8fb4ff, 1.6);
  sun.position.set(6, 12, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -12; sun.shadow.camera.right = 12;
  sun.shadow.camera.top = 12; sun.shadow.camera.bottom = -4;
  sun.shadow.camera.far = 40;
  sun.shadow.bias = -0.0015;
  scene.add(sun);
  const neonCyan = new THREE.PointLight(0x27E6FF, 30, 22, 1.8);
  neonCyan.position.set(-6.5, 2.6, -7);
  scene.add(neonCyan);
  const neonWarm = new THREE.PointLight(0xFFC24A, 22, 16, 1.8);
  neonWarm.position.set(-5.2, 2.2, -6.5);
  scene.add(neonWarm);

  // ================= LAYER 1 — SKY (z = -46) =================
  const sky = new THREE.Group(); sky.position.z = -46; root.add(sky);
  const moonTex = makeCanvas(256, 256, (g, w, h) => {
    const gr = g.createRadialGradient(128, 128, 20, 128, 128, 128);
    gr.addColorStop(0, 'rgba(255,214,140,1)');
    gr.addColorStop(0.55, 'rgba(255,170,90,0.85)');
    gr.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(7, 48),
    new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, fog: false })
  );
  moon.position.set(9, 9.5, 0); sky.add(moon);
  // stars
  {
    const n = 260, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = rand(-60, 60); pos[i * 3 + 1] = rand(2, 26); pos[i * 3 + 2] = rand(-4, 4);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const stars = new THREE.Points(geo, new THREE.PointsMaterial({
      color: 0xcdd8ff, size: 0.09, sizeAttenuation: true, transparent: true, opacity: 0.85, fog: false,
    }));
    sky.add(stars);
  }
  // volumetric spotlight beams from the upper sky (additive cones)
  const spotTex = makeCanvas(64, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(150,180,255,0.30)');
    gr.addColorStop(1, 'rgba(150,180,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    const side = g.createLinearGradient(0, 0, w, 0);
    side.addColorStop(0, 'rgba(0,0,0,1)'); side.addColorStop(0.5, 'rgba(0,0,0,0)'); side.addColorStop(1, 'rgba(0,0,0,1)');
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = side; g.fillRect(0, 0, w, h);
  });
  const spots = [];
  for (let i = 0; i < 4; i++) {
    const c = new THREE.Mesh(new THREE.ConeGeometry(rand(1.6, 3.2), rand(16, 22), 12, 1, true),
      new THREE.MeshBasicMaterial({ map: spotTex, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
    c.position.set(-28 + i * 17 + rand(-4, 4), 12, rand(-3, 1));
    c.rotation.z = rand(0.12, 0.3);
    sky.add(c); spots.push(c);
  }
  sky.userData.spots = spots;
  // smog planes
  const smogTex = makeCanvas(256, 128, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, 'rgba(40,30,80,0)');
    gr.addColorStop(0.6, 'rgba(60,40,110,0.16)');
    gr.addColorStop(1, 'rgba(30,20,60,0.3)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const smogs = [];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(rand(30, 50), rand(6, 10)),
      new THREE.MeshBasicMaterial({ map: smogTex, transparent: true, depthWrite: false, fog: false })
    );
    m.position.set(rand(-40, 40), rand(3, 12), rand(-2, 2));
    sky.add(m); smogs.push(m);
  }

  // ================= LAYER 2 — FAR SKYLINE (z = -34) — one merged mesh =================
  const far = new THREE.Group(); far.position.z = -34; root.add(far);
  {
    // single extruded silhouette with towers, shikhara spires, domes, minarets
    const shape = new THREE.Shape();
    let x = -46;
    shape.moveTo(x, 0);
    const features = [];
    while (x < 46) {
      const w = rand(2.2, 5), h = rand(3, 11);
      shape.lineTo(x, h); shape.lineTo(x + w, h);
      const kind = Math.random();
      if (kind < 0.22) features.push({ x: x + w / 2, h, t: 'spire', w });
      else if (kind < 0.34) features.push({ x: x + w / 2, h, t: 'dome', w });
      else if (kind < 0.44) features.push({ x: x + w / 2, h, t: 'minaret', w });
      x += w + rand(0.2, 1.2);
    }
    shape.lineTo(x, 0); shape.lineTo(-46, 0);
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 2, bevelEnabled: false });
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x0d0a22, fog: true }));
    mesh.position.z = -1;
    far.add(mesh);
    const fg = new THREE.Group();
    const dark = new THREE.MeshBasicMaterial({ color: 0x0d0a22 });
    for (const f of features) {
      if (f.t === 'spire') {
        const s = new THREE.Mesh(new THREE.ConeGeometry(f.w * 0.28, rand(2.5, 4.5), 4), dark);
        s.position.set(f.x, f.h + 2, 0); s.rotation.y = Math.PI / 4; fg.add(s);
      } else if (f.t === 'dome') {
        const d = new THREE.Mesh(new THREE.SphereGeometry(f.w * 0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), dark);
        d.position.set(f.x, f.h, 0); fg.add(d);
      } else {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.36, rand(4, 7), 8), dark);
        m.position.set(f.x, f.h + 3, 0); fg.add(m);
        const cap = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), dark);
        cap.position.set(f.x, f.h + 6.2, 0); fg.add(cap);
      }
    }
    far.add(fg);
    // blinking aircraft lights
    const blinkGeo = new THREE.BufferGeometry();
    const bn = 24, bpos = new Float32Array(bn * 3);
    for (let i = 0; i < bn; i++) { bpos[i * 3] = rand(-44, 44); bpos[i * 3 + 1] = rand(9, 20); bpos[i * 3 + 2] = 0; }
    blinkGeo.setAttribute('position', new THREE.BufferAttribute(bpos, 3));
    const blinks = new THREE.Points(blinkGeo, new THREE.PointsMaterial({ color: 0xff4455, size: 0.14, transparent: true, fog: false }));
    far.add(blinks);
    far.userData.blinks = blinks;
  }

  // ================= LAYER 3 — MID CITY (z = -20) =================
  const mid = new THREE.Group(); mid.position.z = -20; root.add(mid);
  {
    const winTex = windowTexture();
    winTex.wrapS = winTex.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0a0a16, roughness: 0.92, metalness: 0.15,
      emissive: 0xffffff, emissiveMap: winTex, emissiveIntensity: 0.5,
    });
    let x = -42;
    while (x < 42) {
      const w = rand(2.5, 4.5), h = rand(4, 12), d = rand(2, 3);
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(x + w / 2, h / 2, rand(-1, 1));
      mid.add(b);
      x += w + rand(0.6, 2.2);
    }
    // holo billboards
    const boards = [];
    for (let i = 0; i < 5; i++) {
      const color = AD_COLORS[i % AD_COLORS.length];
      const tex = adTexture(color, 7 + i * 13);
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(4.6, 2.3),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
      );
      m.position.set(-30 + i * 14 + rand(-2, 2), rand(6.5, 9.5), -0.5);
      m.rotation.y = rand(-0.12, 0.12);
      mid.add(m); boards.push(m);
    }
    mid.userData.boards = boards;
    // volumetric-looking light shafts
    const shaftTex = makeCanvas(64, 256, (g, w, h) => {
      const gr = g.createLinearGradient(0, 0, 0, h);
      gr.addColorStop(0, 'rgba(160,190,255,0.35)');
      gr.addColorStop(1, 'rgba(160,190,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, w, h);
      const gr2 = g.createLinearGradient(0, 0, w, 0);
      gr2.addColorStop(0, 'rgba(0,0,0,1)'); gr2.addColorStop(0.5, 'rgba(0,0,0,0)'); gr2.addColorStop(1, 'rgba(0,0,0,1)');
      g.globalCompositeOperation = 'destination-out';
      g.fillStyle = gr2; g.fillRect(0, 0, w, h);
    });
    const shafts = [];
    for (let i = 0; i < 4; i++) {
      const sh = new THREE.Mesh(new THREE.PlaneGeometry(rand(1.2, 2.4), rand(10, 16)),
        new THREE.MeshBasicMaterial({ map: shaftTex, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      sh.position.set(-24 + i * 15 + rand(-3, 3), 8, rand(-1, 1));
      sh.rotation.z = 0.28 + rand(-0.06, 0.06);
      mid.add(sh); shafts.push(sh);
    }
    mid.userData.shafts = shafts;
    // hanging power lines between building tops
    const lineMat = new THREE.LineBasicMaterial({ color: 0x05040c, transparent: true, opacity: 0.9 });
    for (let i = 0; i < 7; i++) {
      const x0 = -36 + i * 11, y0 = rand(8, 11), x1 = x0 + rand(6, 10), y1 = rand(7, 10);
      const pts = [];
      for (let k = 0; k <= 12; k++) {
        const t = k / 12;
        pts.push(new THREE.Vector3(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 1.6, rand(-0.4, 0.4)));
      }
      const lg = new THREE.BufferGeometry().setFromPoints(pts);
      mid.add(new THREE.Line(lg, lineMat));
    }
  }

  // ================= LAYER 4 — NEAR STREET (z = -9) =================
  const near = new THREE.Group(); near.position.z = -9; root.add(near);
  {
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0e0c22, roughness: 0.9, metalness: 0.1 });
    // chai tapri stall
    const tapri = new THREE.Group(); tapri.position.set(-5.6, 0, 0); near.add(tapri);
    const stall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.1, 1.6), darkMat);
    stall.position.y = 1.05; tapri.add(stall);
    const counter = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.16, 1.8),
      new THREE.MeshStandardMaterial({ color: 0x2a1a10, roughness: 0.6, metalness: 0.3 }));
    counter.position.y = 2.2; tapri.add(counter);
    // striped awning
    const awnTex = makeCanvas(128, 32, (g, w, h) => {
      for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#FF8A2B' : '#1a1030'; g.fillRect(i * 16, 0, 16, h); }
    });
    const awn = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.08, 1.2),
      new THREE.MeshStandardMaterial({ map: awnTex, roughness: 0.8 }));
    awn.position.set(0, 2.75, 0.5); awn.rotation.x = -0.35; tapri.add(awn);
    // neon teacup-glyph sign (drawn path, no characters)
    const signTex = teacupSignTexture(COLORS.chai);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5),
      new THREE.MeshBasicMaterial({ map: signTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    sign.position.set(0, 3.6, 0.85); tapri.add(sign);
    near.userData.chaiSign = sign;
    // paan shop
    const paan = new THREE.Mesh(new THREE.BoxGeometry(2.0, 2.4, 1.4), darkMat);
    paan.position.set(-8.6, 1.2, 0.4); near.add(paan);
    const paanSign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.3),
      new THREE.MeshBasicMaterial({ map: paanSignTexture('#FF3B4A'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    paanSign.position.set(-8.6, 3.2, 1.15); near.add(paanSign);
    // auto-rickshaw silhouette
    const auto = new THREE.Group(); auto.position.set(5.8, 0, 0.6); near.add(auto);
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.2, 1.1), darkMat);
    body.position.y = 0.95; auto.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.9, 1.05), darkMat);
    cab.position.set(-0.1, 1.85, 0); auto.add(cab);
    const wheelG = new THREE.CylinderGeometry(0.28, 0.28, 0.16, 10);
    for (const wx of [-0.6, 0.6]) {
      const w = new THREE.Mesh(wheelG, darkMat);
      w.rotation.x = Math.PI / 2; w.position.set(wx, 0.28, 0.55); auto.add(w);
      const w2 = w.clone(); w2.position.z = -0.55; auto.add(w2);
    }
    // light rain streaks
    const RN = 240;
    const rg = new THREE.BufferGeometry();
    const rpos = new Float32Array(RN * 3);
    for (let i = 0; i < RN; i++) {
      rpos[i * 3] = rand(-24, 24); rpos[i * 3 + 1] = rand(0, 12); rpos[i * 3 + 2] = rand(-2, 6);
    }
    rg.setAttribute('position', new THREE.BufferAttribute(rpos, 3));
    const rain = new THREE.Points(rg, new THREE.PointsMaterial({
      color: 0x9db8ff, size: 0.05, transparent: true, opacity: 0.4,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    }));
    rain.frustumCulled = false;
    near.add(rain);
    near.userData.rain = rain;
    // tube lights (flicker)
    near.userData.tubes = [];
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xbfe9ff }));
      t.position.set(-10 + i * 6.5, 3.4, 1.2);
      near.add(t); near.userData.tubes.push(t);
    }
  }

  // ================= LAYER 5 — FOREGROUND FOG (z = +4.5, in front) =================
  const fore = new THREE.Group(); fore.position.z = 4.5; root.add(fore);
  const fogTex = makeCanvas(256, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 8, w / 2, h / 2, w / 2);
    gr.addColorStop(0, 'rgba(120,110,200,0.10)');
    gr.addColorStop(1, 'rgba(120,110,200,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });
  const fogs = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(rand(16, 26), rand(5, 8)),
      new THREE.MeshBasicMaterial({ map: fogTex, transparent: true, depthWrite: false, opacity: 0.8 }));
    m.position.set(rand(-20, 20), rand(0.4, 2.4), 0);
    fore.add(m); fogs.push(m);
  }

  // ================= FLOOR =================
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 46),
    new THREE.MeshStandardMaterial({
      color: 0x07090e, map: floorTexture(), roughness: 0.28, metalness: 0.88,
      emissive: 0xffffff, emissiveMap: floorGlowTexture(), emissiveIntensity: 0.42,
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, 0, -8);
  floor.receiveShadow = true;
  scene.add(floor);

  // arena bounds walls (subtle neon rails)
  const railMat = new THREE.MeshBasicMaterial({ color: 0x27E6FF, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false });
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 6), railMat);
    rail.position.set(sx * ARENA.width / 2, 0.05, 0);
    scene.add(rail);
  }

  // ---------- per-frame update ----------
  let lightningT = 0, lightningFlash = 0;
  function update(t, dt, camX) {
    // parallax: layers shift opposite to camera with different factors
    sky.position.x = -camX * 0.06;
    far.position.x = -camX * 0.14;
    mid.position.x = -camX * 0.30;
    near.position.x = -camX * 0.55;
    fore.position.x = -camX * 0.85;
    // spotlights sway slowly
    if (sky.userData.spots) for (let i = 0; i < sky.userData.spots.length; i++) {
      sky.userData.spots[i].rotation.z = 0.2 + Math.sin(t * 0.18 + i * 2.1) * 0.07;
      sky.userData.spots[i].material.opacity = 0.28 + Math.sin(t * 0.31 + i) * 0.09;
    }
    // smog drift
    for (let i = 0; i < smogs.length; i++) {
      smogs[i].position.x += dt * (0.3 + i * 0.12);
      if (smogs[i].position.x > 55) smogs[i].position.x = -55;
    }
    // foreground fog drift
    for (let i = 0; i < fogs.length; i++) {
      fogs[i].position.x -= dt * (0.5 + i * 0.2);
      if (fogs[i].position.x < -30) fogs[i].position.x = 30;
    }
    // light shafts sway
    const shafts = mid.userData.shafts;
    if (shafts) for (let i = 0; i < shafts.length; i++) {
      shafts[i].material.opacity = 0.11 + Math.sin(t * 0.5 + i * 1.7) * 0.06;
      shafts[i].rotation.z = 0.28 + Math.sin(t * 0.23 + i) * 0.05;
    }
    // rain
    const rain = near.userData.rain;
    if (rain) {
      const rp = rain.geometry.attributes.position.array;
      for (let i = 0; i < rp.length; i += 3) {
        rp[i + 1] -= dt * 16;
        rp[i] -= dt * 2.2; // slant
        if (rp[i + 1] < 0) { rp[i + 1] = 12; rp[i] = rand(-24, 24); }
      }
      rain.geometry.attributes.position.needsUpdate = true;
    }
    // billboard flicker
    const boards = mid.userData.boards;
    for (let i = 0; i < boards.length; i++) {
      const b = boards[i];
      b.material.opacity = 0.82 + Math.sin(t * 7 + i * 2.4) * 0.06 + (Math.random() < 0.012 ? -0.5 : 0);
    }
    // chai sign pulse
    near.userData.chaiSign.material.opacity = 0.75 + Math.sin(t * 3.2) * 0.25;
    // tube light flicker
    const tubes = near.userData.tubes;
    for (let i = 0; i < tubes.length; i++) {
      tubes[i].visible = Math.random() > 0.06 || Math.sin(t * 31 + i * 9) > -0.7;
    }
    // aircraft blink
    far.userData.blinks.material.opacity = (Math.sin(t * 2.2) > 0.2) ? 1 : 0.15;
    // lightning flickers
    lightningT -= dt;
    if (lightningT <= 0) {
      lightningT = rand(4, 11);
      lightningFlash = rand(0.5, 1.6);
    }
    if (lightningFlash > 0) {
      lightningFlash -= dt * 3;
      hemi.intensity = 0.85 + Math.max(0, lightningFlash) * 1.4;
    } else hemi.intensity = 0.85;
  }

  return { root, update, sun, floor };
}

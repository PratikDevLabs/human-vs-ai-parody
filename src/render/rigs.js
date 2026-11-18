// ============================================================
// src/render/rigs.js — procedural articulated cyber-fighter rigs.
// Distinct silhouettes + face branding per fighter (spec §2):
//  YOU      — human skin head, amber eyes, crimson bandana, red-gold
//             gamchha, sleeveless jacket, amber teacup chest core,
//             brass gauntlets.
//  GROK     — obsidian armor, crimson edge trim, big glowing X-slash
//             visor, red shoulder blades.
//  CHATGPT  — 1.35x bulk, titanium pauldrons + gauntlets, rotating
//             hex-knot halo crown.
//  CLAUDE   — tall regal monk, charcoal/terracotta, floating cape
//             panels, razor-thin golden laser visor.
// Each rig carries a light group (rim + under-glow; shared key light
// is the scene directional) for 3-point lighting. Loader-friendly:
// buildRig(def) can be swapped for glTF later without touching the sim.
// ============================================================
import * as THREE from 'three';
import { COLORS } from '../config.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

function teacupTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.strokeStyle = '#FFC24A'; g.fillStyle = '#FFC24A'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(14, 24); g.lineTo(44, 24); g.lineTo(40, 50); g.lineTo(18, 50); g.closePath(); g.stroke();
  g.beginPath(); g.arc(49, 33, 7, -1.2, 1.2); g.stroke();
  g.lineWidth = 4;
  g.beginPath(); g.moveTo(24, 16); g.quadraticCurveTo(22, 9, 26, 5); g.moveTo(34, 16); g.quadraticCurveTo(32, 9, 36, 5); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function xVisorTexture() {
  // bold Grok/X slash visor: crimson X on white-hot plate
  const c = document.createElement('canvas'); c.width = 96; c.height = 40;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f6ff'; g.fillRect(0, 0, 96, 40);
  g.strokeStyle = '#ff1e42'; g.lineWidth = 11; g.lineCap = 'round';
  g.beginPath(); g.moveTo(16, 6); g.lineTo(80, 34); g.moveTo(80, 6); g.lineTo(16, 34); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildRig(def) {
  const color = new THREE.Color(def.color);
  const id = def.id;

  // ---- per-fighter material recipes ----
  let armor, trim, skin = null, helm = null;
  if (id === 'you') {
    armor = new THREE.MeshPhysicalMaterial({ color: 0x232030, metalness: 0.55, roughness: 0.5, clearcoat: 0.4 }); // jacket
    trim = new THREE.MeshStandardMaterial({ color: 0x27E6FF, emissive: color, emissiveIntensity: 1.5, metalness: 0.5, roughness: 0.35 });
    skin = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.skin), roughness: 0.62, metalness: 0.05 });
  } else if (id === 'grok') {
    armor = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(COLORS.obsidian), metalness: 0.9, roughness: 0.3, clearcoat: 0.8 });
    trim = new THREE.MeshStandardMaterial({ color: 0x2a0a10, emissive: new THREE.Color('#ff1e42'), emissiveIntensity: 2.0, metalness: 0.6, roughness: 0.3 });
    helm = armor;
  } else if (id === 'chatgpt') {
    armor = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(COLORS.titanium), metalness: 0.95, roughness: 0.24, clearcoat: 0.9, clearcoatRoughness: 0.2 });
    trim = new THREE.MeshStandardMaterial({ color: 0x06231a, emissive: new THREE.Color('#10a37f'), emissiveIntensity: 1.8, metalness: 0.5, roughness: 0.35 });
  } else {
    armor = new THREE.MeshPhysicalMaterial({ color: 0x1a1a1e, metalness: 0.8, roughness: 0.38, clearcoat: 0.6 });
    trim = new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.terracotta), emissive: new THREE.Color(COLORS.terracotta), emissiveIntensity: 1.2, metalness: 0.7, roughness: 0.3 });
  }
  const visorMat = new THREE.MeshStandardMaterial({ color: 0x050508, emissive: color, emissiveIntensity: 2.4, roughness: 0.15, metalness: 0.7 });

  const h = def.height;
  const legH = h * 0.46, torsoH = h * 0.36, headR = h * 0.085;
  const bulk = id === 'chatgpt' ? 1.35 : id === 'grok' ? 0.78 : 1.0;
  const tall = id === 'claude' ? 1.1 : 1.0;

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const box = (w, hh, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat);
    m.position.set(x, y, z); m.castShadow = true; return m;
  };

  // ---- hips + legs ----
  const hips = new THREE.Group(); hips.position.y = legH; body.add(hips);
  const legW = 0.13 * bulk;
  const legL = new THREE.Group(); legL.position.set(-0.14 * bulk, 0, 0); hips.add(legL);
  const legR = new THREE.Group(); legR.position.set(0.14 * bulk, 0, 0); hips.add(legR);
  for (const leg of [legL, legR]) {
    leg.add(box(legW, legH * 0.55, legW, armor, 0, -legH * 0.27, 0));
    const shin = new THREE.Group(); shin.position.y = -legH * 0.55; leg.add(shin);
    shin.add(box(legW * 0.9, legH * 0.45, legW * 0.9, armor, 0, -legH * 0.22, 0));
    shin.add(box(legW * 1.1, 0.07, legW * 1.9, trim, 0, -legH * 0.47, 0.05)); // boots
    leg.add(box(legW * 1.02, 0.03, legW * 1.02, trim, 0, -legH * 0.1, 0));    // trim strip
    leg.userData.shin = shin;
  }
  hips.add(box(0.34 * bulk, 0.16, 0.22, armor, 0, 0.02, 0));

  // ---- torso ----
  const torso = new THREE.Group(); torso.position.y = 0.1; hips.add(torso);
  const torsoW = 0.42 * bulk, torsoD = 0.26 * bulk;
  torso.add(box(torsoW, torsoH, torsoD, armor, 0, torsoH / 2, 0));
  torso.add(box(torsoW * 1.06, torsoH * 0.4, torsoD * 1.04, armor, 0, torsoH * 0.62, 0)); // chest plate
  // crimson edge trim (grok) / terracotta seams (claude) / cyan seams (you)
  torso.add(box(torsoW * 1.08, 0.03, torsoD * 1.06, trim, 0, torsoH * 0.34, 0));
  if (id === 'grok') {
    torso.add(box(0.03, torsoH * 0.8, torsoD * 1.07, trim, -torsoW / 2 - 0.01, torsoH / 2, 0));
    torso.add(box(0.03, torsoH * 0.8, torsoD * 1.07, trim, torsoW / 2 + 0.01, torsoH / 2, 0));
  }
  // chest core (amber teacup for YOU, brand-colored for AIs)
  const coreMat = id === 'you'
    ? new THREE.MeshStandardMaterial({ color: 0x2a1503, emissive: new THREE.Color(COLORS.chai), emissiveIntensity: 1.8, emissiveMap: teacupTexture(), metalness: 0.4, roughness: 0.3 })
    : trim.clone();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 14), coreMat);
  core.position.set(0, torsoH * 0.62, torsoD / 2 + 0.015);
  torso.add(core);

  // ---- head ----
  const head = new THREE.Group(); head.position.y = torsoH + headR * 1.15; torso.add(head);
  let visor;
  if (id === 'you') {
    // human head: warm skin + amber eyes + crimson bandana
    const skull = new THREE.Mesh(new THREE.SphereGeometry(headR, 20, 16), skin);
    skull.scale.set(0.92, 1.05, 0.95); skull.castShadow = true; head.add(skull);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x140a02, emissive: new THREE.Color('#FFB03A'), emissiveIntensity: 3.2 });
    for (const sx of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.14, 10, 8), eyeMat);
      eye.position.set(sx * headR * 0.36, headR * 0.08, headR * 0.78); head.add(eye);
    }
    const bandana = box(headR * 2.05, 0.09, headR * 1.95, new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.crimson), roughness: 0.85 }), 0, headR * 0.32, 0);
    head.add(bandana);
    const knot = box(0.09, 0.12, 0.09, bandana.material, 0, headR * 0.28, -headR * 0.95);
    head.add(knot);
  } else if (id === 'grok') {
    const skull = new THREE.Mesh(new THREE.SphereGeometry(headR, 20, 16), helm || armor);
    skull.scale.set(0.95, 1.02, 0.95); skull.castShadow = true; head.add(skull);
    // MANDATORY: bold glowing X-slash visor across the whole face plate
    visor = new THREE.Mesh(new THREE.BoxGeometry(headR * 2.3, headR * 0.7, 0.04),
      new THREE.MeshStandardMaterial({ color: 0x0a0a0e, emissive: new THREE.Color('#ff1e42'), emissiveIntensity: 1.6, emissiveMap: xVisorTexture(), roughness: 0.2, metalness: 0.6 }));
    visor.position.set(0, 0.02, headR * 0.84);
    head.add(visor);
  } else if (id === 'chatgpt') {
    // smooth armored dome head
    const dome = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.05, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.62), armor);
    dome.castShadow = true; head.add(dome);
    visor = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.9, headR * 0.3, 0.03), visorMat);
    visor.position.set(0, 0.05, headR * 0.88); head.add(visor);
  } else {
    // claude: sleek elongated helm + razor-thin golden laser visor
    const skull = new THREE.Mesh(new THREE.SphereGeometry(headR, 20, 16), armor);
    skull.scale.set(0.85, 1.15, 0.9); skull.castShadow = true; head.add(skull);
    visor = new THREE.Mesh(new THREE.BoxGeometry(headR * 2.0, headR * 0.12, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x0a0805, emissive: new THREE.Color(COLORS.gold), emissiveIntensity: 3.4, roughness: 0.1, metalness: 0.8 }));
    visor.position.set(0, 0.06, headR * 0.86); head.add(visor);
  }
  if (id !== 'you' && id !== 'grok') {
    head.add(box(0.03, 0.2, 0.03, trim, 0, headR + 0.08, -headR * 0.4)); // antenna
  }

  // ---- arms ----
  const arms = {};
  for (const side of ['L', 'R']) {
    const s = side === 'L' ? -1 : 1;
    const arm = new THREE.Group(); arm.position.set(s * (torsoW / 2 + 0.02), torsoH * 0.92, 0); torso.add(arm);
    const armW = 0.095 * bulk;
    // upper arm: skin for the human (sleeveless), armor for AIs
    arm.add(box(armW, 0.34 * h / 1.8, armW, id === 'you' ? skin : armor, 0, -0.16, 0));
    const elbow = new THREE.Group(); elbow.position.y = -0.34 * h / 1.8; arm.add(elbow);
    elbow.add(box(armW * 0.88, 0.3 * h / 1.8, armW * 0.88, id === 'you' ? skin : armor, 0, -0.14, 0));
    const hand = new THREE.Group(); hand.position.y = -0.3 * h / 1.8 - 0.02; elbow.add(hand);
    // gauntlets: brass energized for YOU, thick titanium for CHATGPT, blades for GROK
    let gaunt;
    if (id === 'you') {
      gaunt = box(armW * 1.35, 0.13, armW * 1.35, new THREE.MeshStandardMaterial({ color: new THREE.Color(COLORS.brass), metalness: 1.0, roughness: 0.25, emissive: color, emissiveIntensity: 0.55 }), 0, -0.05, 0);
    } else if (id === 'chatgpt') {
      gaunt = box(armW * 1.7, 0.2, armW * 1.7, armor, 0, -0.06, 0);
    } else if (id === 'grok') {
      gaunt = new THREE.Mesh(new THREE.ConeGeometry(armW * 0.9, 0.22, 4), trim);
      gaunt.rotation.z = Math.PI; gaunt.position.set(0, -0.14, 0);
    } else {
      gaunt = box(armW * 1.25, 0.11, armW * 1.25, trim, 0, -0.05, 0);
    }
    hand.add(gaunt);
    arm.userData = { elbow, hand };
    arms[side] = arm;
  }
  // chatgpt pauldrons (heavy shoulder armor)
  if (id === 'chatgpt') {
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), armor);
      p.scale.set(1.2, 0.75, 1.2);
      p.position.set(s * (torsoW / 2 + 0.05), torsoH * 0.95, 0);
      p.castShadow = true; torso.add(p);
    }
  }

  // ---- signature extras ----
  const extras = new THREE.Group(); body.add(extras);
  let scarf = null, halo = null, cape = null, shards = null, flask = null;
  if (id === 'you') {
    // red-and-gold woven tech-gamchha draped at the neck, flows with physics
    scarf = [];
    let parent = torso, first = true;
    const gamchhaMats = [
      new THREE.MeshStandardMaterial({ color: 0x7a0f22, emissive: new THREE.Color('#ff2244'), emissiveIntensity: 0.25, side: THREE.DoubleSide, roughness: 0.9 }),
      new THREE.MeshStandardMaterial({ color: 0x8a6a10, emissive: new THREE.Color(COLORS.chai), emissiveIntensity: 0.3, side: THREE.DoubleSide, roughness: 0.85 }),
    ];
    for (let i = 0; i < 5; i++) {
      const seg = new THREE.Group(); seg.position.set(0, first ? torsoH * 0.92 : -0.15, first ? -0.12 : -0.14);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.24, 0.17), gamchhaMats[i % 2]);
      seg.add(m); parent.add(seg); parent = seg; scarf.push(seg); first = false;
    }
    // chai flask on the belt
    flask = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a2408, emissive: new THREE.Color(COLORS.chai), emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.3 }));
    flask.position.set(0.2 * bulk, 0.06, 0.14); hips.add(flask);
  } else if (id === 'grok') {
    // sharp red angular shoulder blades
    shards = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.44, 4), trim);
      sh.position.set(s * (torsoW / 2 + 0.08), torsoH * 1.0, -0.02);
      sh.rotation.z = s * -0.55; sh.castShadow = true;
      torso.add(sh); shards.push(sh);
    }
  } else if (id === 'chatgpt') {
    // MANDATORY: rotating hexagonal knot halo crown behind/above the head
    halo = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.75, 0.045, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x06231a, emissive: new THREE.Color('#10a37f'), emissiveIntensity: 2.2, metalness: 0.6, roughness: 0.25 }));
    halo.position.set(0, torsoH + headR * 1.7, -headR * 1.3);
    torso.add(halo);
  } else if (id === 'claude') {
    // floating geometric energy cape-panels behind the back
    cape = [];
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.32 - i * 0.06, 0.52 - i * 0.08, 0.025), armor);
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.34 - i * 0.06, 0.03, 0.03), trim);
      edge.position.y = (0.52 - i * 0.08) / 2;
      p.add(edge);
      p.position.set(0, torsoH * (0.75 - i * 0.28), -torsoD / 2 - 0.1 - i * 0.1);
      p.castShadow = true; torso.add(p); cape.push(p);
    }
  }

  // ---- per-fighter 3-point lighting: rim (behind, brand color) + under-glow; key = shared directional ----
  const lightGroup = new THREE.Group();
  const rim = new THREE.PointLight(color, 14, 7, 1.8);
  rim.position.set(0, 2.4, -1.6);
  const under = new THREE.PointLight(color, 9, 4.5, 2);
  under.position.set(0, 0.12, 0.35);
  lightGroup.add(rim, under);
  root.add(lightGroup);

  root.traverse(o => { if (o.isMesh) o.castShadow = true; });

  return {
    def, root, body, hips, torso, head, arms, core, lightGroup, rim, under,
    extras: { scarf, halo, cape, shards, flask },
    mats: { bodyMat: armor, accentMat: trim, visorMat, coreMat },
    baseEmissive: 1.5,
    phase: Math.random() * 6,
    faceCur: 1,
  };
}

const _e = new THREE.Euler();
function setArm(arm, rx, rz) {
  arm.rotation.x = rx; arm.rotation.z = rz || 0;
}

export class RigManager {
  constructor(scene) {
    this.scene = scene;
    this.rigs = {};
  }
  buildAll(fighterDefs) {
    for (const def of fighterDefs) {
      const rig = buildRig(def);
      this.scene.add(rig.root);
      this.rigs[def.id] = rig;
    }
  }
  rigFor(f) { return this.rigs[f.id]; }
  setQuality(def) {
    // LOW tier drops the per-fighter rim/under lights (perf budget)
    const on = !!def.shadows;
    for (const id in this.rigs) {
      const r = this.rigs[id];
      r.lightGroup.visible = on;
    }
  }

  sync(sim, t, dt) {
    for (const f of sim.fighters) {
      const rig = this.rigs[f.id];
      if (!rig) continue;
      const root = rig.root, body = rig.body;
      root.position.set(f.x, f.y, f.z);
      // smooth turn toward face
      const targetY = f.face === 1 ? -Math.PI / 2 : Math.PI / 2;
      let dy = targetY - root.rotation.y;
      while (dy > Math.PI) dy -= 2 * Math.PI;
      while (dy < -Math.PI) dy += 2 * Math.PI;
      root.rotation.y += dy * Math.min(1, dt * 12);
      rig.faceCur = f.face;

      const atk = f.atk;
      const prog = atk ? clamp(atk.t / atk.dur, 0, 1) : 0;
      // reset pose
      body.rotation.set(0, 0, 0);
      body.position.y = 0;
      rig.hips.rotation.set(0, 0, 0);
      setArm(rig.arms.L, 0, 0.12); setArm(rig.arms.R, 0, -0.12);
      rig.arms.L.userData.elbow.rotation.x = -0.25;
      rig.arms.R.userData.elbow.rotation.x = -0.25;
      const legL = rig.hips.children[0], legR = rig.hips.children[1];
      legL.rotation.x = 0; legR.rotation.x = 0;
      legL.userData.shin.rotation.x = 0; legR.userData.shin.rotation.x = 0;
      rig.torso.rotation.set(0, 0, 0);

      if (!f.alive) {
        // KO fall (ragdoll-lite)
        const e = 1 - Math.pow(1 - clamp(f.koT * 1.6, 0, 1), 3);
        body.rotation.x = -1.45 * e;
        body.position.y = -0.35 * e;
      } else if (f.state === 'ult') {
        setArm(rig.arms.L, -2.7, 0.5); setArm(rig.arms.R, -2.7, -0.5);
        rig.arms.L.userData.elbow.rotation.x = -0.4;
        rig.arms.R.userData.elbow.rotation.x = -0.4;
        body.rotation.x = -0.12;
      } else if (f.state === 'cast') {
        const p = clamp(f.cast ? f.cast.t / f.cast.dur : 0, 0, 1);
        setArm(rig.arms.L, -2.2 - p * 0.3, 0.45);
        setArm(rig.arms.R, -2.2 - p * 0.3, -0.45);
        rig.torso.rotation.x = -0.15 - p * 0.1;
      } else if (atk) {
        if (atk.type === 'punch') {
          const v = atk.variant || 0; // 0 jab, 1 cross, 2 hook
          const extW = [1.45, 1.7, 1.35][v];
          const twist = [0.15, 0.55, 0.2][v];
          const arc = [0, 0, 0.9][v];
          let ext = 0, wind = 0;
          if (prog < 0.28) wind = prog / 0.28;
          else if (prog < 0.62) ext = Math.sin((prog - 0.28) / 0.34 * Math.PI);
          else ext = 1 - (prog - 0.62) / 0.38;
          setArm(rig.arms.R, -wind * 0.9 - ext * extW, -0.1 + ext * arc);
          rig.arms.R.userData.elbow.rotation.x = -wind * 1.2 + ext * 0.15;
          rig.torso.rotation.x = wind * 0.1 + ext * 0.3;
          rig.torso.rotation.y = -ext * twist;
          setArm(rig.arms.L, -0.3, 0.35);
        } else {
          // kick
          let ext = 0, wind = 0;
          if (prog < 0.3) wind = prog / 0.3;
          else if (prog < 0.66) ext = Math.sin((prog - 0.3) / 0.36 * Math.PI);
          else ext = 1 - (prog - 0.66) / 0.34;
          legR.rotation.x = -wind * 0.5 - ext * 2.4;
          legR.userData.shin.rotation.x = wind * 0.4 + ext * 0.5;
          rig.torso.rotation.x = -wind * 0.15 + ext * 0.12;
          rig.torso.rotation.z = ext * 0.12;
          setArm(rig.arms.L, -0.8 * ext, 0.7);
          setArm(rig.arms.R, -0.8 * ext, -0.7);
        }
        body.position.y = Math.abs(Math.sin(f.walkPhase)) * 0.03;
      } else if (f.state === 'victory') {
        const b = Math.abs(Math.sin(t * 5 + rig.phase));
        setArm(rig.arms.L, -2.9, 0.55); setArm(rig.arms.R, -2.9, -0.55);
        rig.arms.L.userData.elbow.rotation.x = -0.3;
        rig.arms.R.userData.elbow.rotation.x = -0.3;
        rig.torso.rotation.x = -0.18;
        body.position.y = b * 0.12;
      } else if (f.state === 'dodge') {
        body.rotation.x = -0.55;
        body.position.y = 0.05;
        setArm(rig.arms.L, -0.6, 0.6); setArm(rig.arms.R, -0.6, -0.6);
      } else if (f.hurtT > 0 || f.stunT > 0) {
        body.rotation.x = f.stunT > 0 ? Math.sin(t * 26 + rig.phase) * 0.1 : 0.32;
        if (f.stunT > 0) body.rotation.z = Math.sin(t * 30) * 0.09;
        setArm(rig.arms.L, -0.4, 0.5); setArm(rig.arms.R, -0.4, -0.5);
      } else if (f.state === 'walk') {
        const s = Math.sin(f.walkPhase), s2 = Math.sin(f.walkPhase + Math.PI);
        legL.rotation.x = s * 0.7; legR.rotation.x = s2 * 0.7;
        legL.userData.shin.rotation.x = Math.max(0, -s) * 0.5;
        legR.userData.shin.rotation.x = Math.max(0, -s2) * 0.5;
        setArm(rig.arms.L, s2 * 0.45, 0.12); setArm(rig.arms.R, s * 0.45, -0.12);
        rig.torso.rotation.x = 0.09;
        body.position.y = Math.abs(Math.sin(f.walkPhase * 2)) * 0.045;
      } else {
        // idle breathing (boxing stance for the human)
        const b = Math.sin(t * 2.1 + rig.phase);
        rig.torso.rotation.x = b * 0.035;
        setArm(rig.arms.L, (id === 'you' ? -0.7 : 0) + b * 0.07, 0.35);
        setArm(rig.arms.R, (id === 'you' ? -0.7 : 0) - b * 0.07, -0.35);
        rig.arms.L.userData.elbow.rotation.x = -0.9 + b * 0.03;
        rig.arms.R.userData.elbow.rotation.x = -0.9 - b * 0.03;
        legL.rotation.x = id === 'you' ? 0.22 : 0.04; legR.rotation.x = id === 'you' ? -0.14 : -0.04;
        body.position.y = b * 0.02;
        if (id === 'claude') body.position.y += Math.sin(t * 1.4) * 0.05; // hover bob
        if (id === 'grok' && Math.random() < dt * 6) {
          body.rotation.z = (Math.random() - 0.5) * 0.06; // micro-glitch jitter
        }
      }

      // extras animation
      const ex = rig.extras;
      if (ex.scarf) {
        for (let i = 0; i < ex.scarf.length; i++) {
          ex.scarf[i].rotation.x = Math.sin(t * 5 - i * 0.9 + rig.phase) * 0.4 + 0.3 + Math.abs(f.vx || 0) * 0.06;
        }
      }
      if (ex.halo) { ex.halo.rotation.z = t * 1.6; ex.halo.rotation.x = Math.sin(t * 0.8) * 0.25; }
      if (ex.cape) {
        for (let i = 0; i < ex.cape.length; i++) {
          ex.cape[i].rotation.x = Math.sin(t * 3.1 - i * 0.7) * 0.24 + 0.2;
          ex.cape[i].position.z = -torsoD / 2 - 0.1 - i * 0.1 - Math.abs(f.vx || 0) * 0.02;
        }
      }
      if (ex.shards) {
        for (const s of ex.shards) s.rotation.x = Math.sin(t * 9 + rig.phase) * 0.14;
      }

      // hit flash + low-hp crack flicker on emissive materials
      const flash = f.flashT > 0 ? f.flashT * 26 : 0;
      const lowHp = f.alive && f.hp < f.maxHp * 0.35;
      const flick = lowHp && Math.random() < dt * 7 ? 3.5 : 0;
      const em = rig.baseEmissive + flash + flick;
      rig.mats.accentMat.emissiveIntensity = em;
      rig.mats.visorMat.emissiveIntensity = 2.4 + flash + flick;
      rig.core.material.emissiveIntensity = (id === 'you' ? 1.8 : 1.5) + flash * 1.4 + flick;
      // core pulse rate = health (faster as HP drops)
      if (f.alive) {
        const hpPct = f.hp / f.maxHp;
        const pulse = 0.6 + (1 - hpPct) * 2.6;
        rig.core.scale.setScalar(1 + Math.sin(t * pulse * 3) * 0.12);
      }
      // under-glow breathes with hp; chai core steams handled in fx3d
      if (rig.under) rig.under.intensity = 5 + (f.alive ? (1 - f.hp / f.maxHp) * 6 : 2) + (f.flashT > 0 ? 10 : 0);
    }
  }

  handWorld(f, side, out) {
    const rig = this.rigs[f.id];
    const hand = rig.arms[side].userData.hand;
    return hand.getWorldPosition(out);
  }
}

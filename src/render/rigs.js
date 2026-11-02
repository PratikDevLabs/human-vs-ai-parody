// ============================================================
// src/render/rigs.js — procedural articulated cyber-fighter rigs.
// Hips → torso → head / arms / legs + cloth & armour extras.
// MeshPhysicalMaterial (carbon/metal/clearcoat/emissive strips).
// Distinct silhouettes per fighter. Loader-friendly: buildRig(def)
// can later be swapped for glTF without touching the sim.
// ============================================================
import * as THREE from 'three';
import { COLORS } from '../config.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = t => 1 - Math.pow(1 - t, 3);

function teacupTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  g.strokeStyle = '#FFC24A'; g.fillStyle = '#FFC24A'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(14, 24); g.lineTo(44, 24); g.lineTo(40, 48); g.lineTo(18, 48); g.closePath(); g.stroke();
  g.beginPath(); g.arc(48, 32, 6, -1.2, 1.2); g.stroke();
  g.beginPath(); g.moveTo(24, 16); g.quadraticCurveTo(22, 10, 26, 6); g.moveTo(34, 16); g.quadraticCurveTo(32, 10, 36, 6); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function xVisorTexture(color) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 32;
  const g = c.getContext('2d');
  g.strokeStyle = color; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(12, 8); g.lineTo(52, 24); g.moveTo(52, 8); g.lineTo(12, 24); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function buildRig(def) {
  const color = new THREE.Color(def.color);
  const dark = color.clone().multiplyScalar(0.16).lerp(new THREE.Color(0x0a0a14), 0.6);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: dark, metalness: 0.85, roughness: 0.34,
    clearcoat: 0.7, clearcoatRoughness: 0.28,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: color.clone().multiplyScalar(0.35), emissive: color, emissiveIntensity: 1.4, metalness: 0.4, roughness: 0.4,
  });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x050510, emissive: color, emissiveIntensity: 2.2, roughness: 0.2, metalness: 0.6,
  });

  const h = def.height;
  const legH = h * 0.46, torsoH = h * 0.36, shoulderY = h * 0.78, headR = h * 0.085;
  const bulk = def.id === 'chatgpt' ? 1.35 : def.id === 'grok' ? 0.78 : 1.0;
  const tall = def.id === 'claude' ? 1.1 : 1.0;

  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);

  const box = (w, hh, d, mat, x, y, z) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, hh, d), mat);
    m.position.set(x, y, z); m.castShadow = true; return m;
  };

  // hips + legs
  const hips = new THREE.Group(); hips.position.y = legH; body.add(hips);
  const legW = 0.13 * bulk;
  const legL = new THREE.Group(); legL.position.set(-0.14 * bulk, 0, 0); hips.add(legL);
  const legR = new THREE.Group(); legR.position.set(0.14 * bulk, 0, 0); hips.add(legR);
  for (const [leg, s] of [[legL, -1], [legR, 1]]) {
    const thigh = box(legW, legH * 0.55, legW, bodyMat, 0, -legH * 0.27, 0);
    leg.add(thigh);
    const shin = new THREE.Group(); shin.position.y = -legH * 0.55; leg.add(shin);
    shin.add(box(legW * 0.9, legH * 0.45, legW * 0.9, bodyMat, 0, -legH * 0.22, 0));
    const foot = box(legW * 1.1, 0.07, legW * 1.9, accentMat, 0, -legH * 0.47, 0.05);
    shin.add(foot);
    const strip = box(legW * 1.02, 0.03, legW * 1.02, accentMat, 0, -legH * 0.1, 0);
    leg.add(strip);
    leg.userData.shin = shin;
  }
  hips.add(box(0.34 * bulk, 0.16, 0.22, bodyMat, 0, 0.02, 0));

  // torso
  const torso = new THREE.Group(); torso.position.y = 0.1; hips.add(torso);
  const torsoW = 0.42 * bulk, torsoD = 0.26 * bulk;
  torso.add(box(torsoW, torsoH, torsoD, bodyMat, 0, torsoH / 2, 0));
  // armour plates
  torso.add(box(torsoW * 1.06, torsoH * 0.4, torsoD * 1.04, bodyMat, 0, torsoH * 0.62, 0));
  // glowing chest core
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 14), accentMat.clone());
  core.position.set(0, torsoH * 0.62, torsoD / 2 + 0.015);
  torso.add(core);
  if (def.id === 'you') { core.material.emissiveMap = teacupTexture(); core.material.emissiveIntensity = 1.6; }
  // emissive strip
  torso.add(box(torsoW * 1.02, 0.035, torsoD * 1.02, accentMat, 0, torsoH * 0.34, 0));

  // head
  const head = new THREE.Group(); head.position.y = torsoH + headR * 1.15; torso.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(headR, 20, 16), bodyMat);
  skull.scale.set(0.92, 1.05, 0.95); skull.castShadow = true; head.add(skull);
  // visor
  let visor;
  if (def.id === 'grok') {
    visor = new THREE.Mesh(new THREE.BoxGeometry(headR * 2.1, headR * 0.62, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x050508, emissive: color, emissiveIntensity: 1.2, map: null, roughness: 0.25, metalness: 0.5 }));
    visor.material.emissiveMap = xVisorTexture(def.color);
    visor.position.set(0, 0.02, headR * 0.82);
  } else if (def.id === 'claude') {
    visor = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.9, headR * 0.22, 0.03), visorMat);
    visor.position.set(0, 0.03, headR * 0.85);
  } else {
    visor = new THREE.Mesh(new THREE.BoxGeometry(headR * 1.85, headR * 0.42, 0.03), visorMat);
    visor.position.set(0, 0.02, headR * 0.85);
  }
  head.add(visor);
  // crest / antenna
  if (def.id !== 'you') {
    const ant = box(0.03, 0.22, 0.03, accentMat, 0, headR + 0.1, -headR * 0.4);
    head.add(ant);
  } else {
    // human: hair + headband
    const hair = new THREE.Mesh(new THREE.SphereGeometry(headR * 0.98, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      new THREE.MeshStandardMaterial({ color: 0x17101f, roughness: 0.9 }));
    hair.position.y = 0.03; head.add(hair);
    const band = box(headR * 2.0, 0.045, headR * 1.9, accentMat, 0, 0.06, 0);
    head.add(band);
  }

  // arms
  const arms = {};
  for (const side of ['L', 'R']) {
    const s = side === 'L' ? -1 : 1;
    const arm = new THREE.Group(); arm.position.set(s * (torsoW / 2 + 0.02), torsoH * 0.92, 0); torso.add(arm);
    const armW = 0.095 * bulk;
    arm.add(box(armW, 0.34 * h / 1.8, armW, bodyMat, 0, -0.16, 0));
    const elbow = new THREE.Group(); elbow.position.y = -0.34 * h / 1.8; arm.add(elbow);
    elbow.add(box(armW * 0.88, 0.3 * h / 1.8, armW * 0.88, bodyMat, 0, -0.14, 0));
    const hand = new THREE.Group(); hand.position.y = -0.3 * h / 1.8 - 0.02; elbow.add(hand);
    const gaunt = box(armW * 1.25, 0.11, armW * 1.25, accentMat, 0, -0.05, 0);
    hand.add(gaunt);
    arm.userData = { elbow, hand };
    arms[side] = arm;
  }

  // ---- silhouette extras ----
  const extras = new THREE.Group(); body.add(extras);
  let scarf = null, halo = null, cape = null, shards = null, flask = null;
  if (def.id === 'you') {
    // gamchha scarf: chained segments trailing behind neck
    scarf = [];
    let parent = torso, py = torsoH * 0.9;
    for (let i = 0; i < 4; i++) {
      const seg = new THREE.Group(); seg.position.set(0, i === 0 ? py - 0.05 : -0.14, i === 0 ? -0.1 : -0.13);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.15), new THREE.MeshStandardMaterial({ color: 0x1a2b4a, emissive: color, emissiveIntensity: 0.25, side: THREE.DoubleSide, roughness: 0.9 }));
      seg.add(m); parent.add(seg); parent = seg; scarf.push(seg);
    }
    // chai flask on belt
    flask = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.2, 10),
      new THREE.MeshStandardMaterial({ color: 0x3a2408, emissive: new THREE.Color(COLORS.chai), emissiveIntensity: 0.9, metalness: 0.6, roughness: 0.3 }));
    flask.position.set(0.2 * bulk, 0.06, 0.14); hips.add(flask);
  } else if (def.id === 'grok') {
    // shard shoulder plates
    shards = [];
    for (const s of [-1, 1]) {
      const sh = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 4), bodyMat);
      sh.position.set(s * (torsoW / 2 + 0.06), torsoH * 0.98, -0.02);
      sh.rotation.z = s * -0.5; sh.castShadow = true;
      torso.add(sh); shards.push(sh);
    }
  } else if (def.id === 'chatgpt') {
    // rotating hex-knot halo behind head
    halo = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.7, 0.035, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x062015, emissive: color, emissiveIntensity: 1.8, metalness: 0.5, roughness: 0.3 }));
    halo.position.set(0, torsoH + headR * 1.2, -headR * 1.4);
    torso.add(halo);
  } else if (def.id === 'claude') {
    // floating cape panels
    cape = [];
    for (let i = 0; i < 3; i++) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3 - i * 0.06, 0.5 - i * 0.08, 0.02), bodyMat);
      p.position.set(0, torsoH * (0.75 - i * 0.28), -torsoD / 2 - 0.1 - i * 0.09);
      p.castShadow = true; torso.add(p); cape.push(p);
    }
  }

  root.traverse(o => { if (o.isMesh) o.castShadow = true; });

  return {
    def, root, body, hips, torso, head, arms, core,
    extras: { scarf, halo, cape, shards, flask },
    mats: { bodyMat, accentMat, visorMat, coreMat: core.material },
    baseEmissive: 1.4,
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
        const e = easeOut(clamp(f.koT * 1.6, 0, 1));
        body.rotation.x = -1.45 * e;
        body.position.y = -0.35 * e + Math.max(0, f.y);
        root.position.y = f.y;
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
          let ext = 0, wind = 0;
          if (prog < 0.28) wind = prog / 0.28;
          else if (prog < 0.62) ext = Math.sin((prog - 0.28) / 0.34 * Math.PI);
          else ext = 1 - (prog - 0.62) / 0.38;
          setArm(rig.arms.R, -wind * 0.9 - ext * 1.65, -0.1);
          rig.arms.R.userData.elbow.rotation.x = -wind * 1.2 + ext * 0.15;
          rig.torso.rotation.x = wind * 0.1 + ext * 0.3;
          rig.torso.rotation.y = -ext * 0.25;
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
        // idle breathing
        const b = Math.sin(t * 2.1 + rig.phase);
        rig.torso.rotation.x = b * 0.035;
        setArm(rig.arms.L, b * 0.07, 0.12); setArm(rig.arms.R, -b * 0.07, -0.12);
        rig.arms.L.userData.elbow.rotation.x = -0.25 + b * 0.03;
        rig.arms.R.userData.elbow.rotation.x = -0.25 - b * 0.03;
        legL.rotation.x = 0.04; legR.rotation.x = -0.04;
        body.position.y = b * 0.02;
        if (f.id === 'claude') body.position.y += Math.sin(t * 1.4) * 0.05; // hover bob
        if (f.id === 'grok' && Math.random() < dt * 6) {
          body.rotation.z = (Math.random() - 0.5) * 0.06; // micro-glitch jitter
        }
      }

      // extras animation
      const ex = rig.extras;
      if (ex.scarf) {
        for (let i = 0; i < ex.scarf.length; i++) {
          ex.scarf[i].rotation.x = Math.sin(t * 5 - i * 0.9 + rig.phase) * 0.35 + 0.25 + Math.abs(f.vx) * 0.05;
        }
      }
      if (ex.halo) { ex.halo.rotation.z = t * 1.6; ex.halo.rotation.x = Math.sin(t * 0.8) * 0.25; }
      if (ex.cape) {
        for (let i = 0; i < ex.cape.length; i++) {
          ex.cape[i].rotation.x = Math.sin(t * 3.1 - i * 0.7) * 0.22 + 0.18;
          ex.cape[i].position.z = -rig.torso.children[0].geometry.parameters.depth / 2 - 0.1 - i * 0.09 - Math.abs(f.vx) * 0.02;
        }
      }
      if (ex.shards) {
        for (const s of ex.shards) s.rotation.x = Math.sin(t * 9 + rig.phase) * 0.12;
      }

      // hit flash + low-hp crack flicker on emissive materials
      const flash = f.flashT > 0 ? f.flashT * 26 : 0;
      const lowHp = f.alive && f.hp < f.maxHp * 0.35;
      const flick = lowHp && Math.random() < dt * 7 ? 3.5 : 0;
      const em = rig.baseEmissive + flash + flick;
      rig.mats.accentMat.emissiveIntensity = em;
      rig.mats.visorMat.emissiveIntensity = 2.2 + flash + flick;
      rig.core.material.emissiveIntensity = 1.6 + flash * 1.4 + flick;
      // core pulse rate = health
      if (f.alive) {
        const hpPct = f.hp / f.maxHp;
        const pulse = 0.6 + (1 - hpPct) * 2.6; // faster as HP drops
        rig.core.scale.setScalar(1 + Math.sin(t * pulse * 3) * 0.12);
      }
    }
  }

  handWorld(f, side, out) {
    const rig = this.rigs[f.id];
    const hand = rig.arms[side].userData.hand;
    return hand.getWorldPosition(out);
  }
}

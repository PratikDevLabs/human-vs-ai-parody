// ============================================================
// src/game/ults.js — cinematic ultimate timelines (gameplay side).
// Rendering reacts to bus events: ult:start / ult:phase / ult:blast /
// ult:beam / ult:wave / ult:slabFall / ult:slabImpact / ult:glitch / ult:end
// One ult at a time (sim.ultLock). Pure JS.
// ============================================================
import { ULTS, COMBAT, ARENA } from '../config.js';
import { bus } from '../core/bus.js';
import { applyDamage, livingAIs } from './sim.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export function canUlt(sim, owner) {
  return !sim.ult && sim.state === 'fight' && owner.alive;
}

export function startUlt(sim, owner, key) {
  if (!canUlt(sim, owner)) return false;
  const U = ULTS[key];
  sim.ultLock = true;
  sim.ult = {
    key, owner, t: 0, dur: U.dur, phase: 'start',
    beam: null, fired: {},
  };
  owner.state = 'ult'; owner.stateT = 0; owner.ultInvuln = key !== 'claude' ? true : false;
  owner.atk = null; owner.cast = null;
  if (key === 'chai') {
    owner.chai = 0;
    sim.stats.chaiUlts++;
    bus.emit('voice:speak', { char: 'you', event: 'ult', priority: true });
  } else {
    owner.ultCd = sim.diff.ultCd[0] + Math.random() * (sim.diff.ultCd[1] - sim.diff.ultCd[0]);
    bus.emit('voice:speak', { char: owner.id, event: 'ult', priority: true });
  }
  bus.emit('ult:start', { key, owner });
  bus.emit('sfx:ultriser', key);
  return true;
}

export function stepUlt(sim, dt) {
  const u = sim.ult;
  if (!u) return;
  u.t += dt;
  const owner = u.owner;
  const U = ULTS[u.key];
  const p = sim.player;
  const ph = U.phases;

  if (u.key === 'chai') stepChai(sim, u, U, dt);
  else if (u.key === 'claude') stepClaude(sim, u, U, ph, dt);
  else if (u.key === 'grok') stepGrok(sim, u, U, dt);
  else if (u.key === 'chatgpt') stepChatgpt(sim, u, U, dt);

  if (u.t >= u.dur) {
    owner.state = 'idle'; owner.ultInvuln = false; owner.bonusTaken = 0;
    if (u.key === 'chai') owner.y = 0;
    sim.ult = null; sim.ultLock = false;
    bus.emit('ult:end', { key: u.key, owner });
  }
}

// ---------------- GUJARATI CHAI BRAHMASTRA ----------------
function stepChai(sim, u, U, dt) {
  const o = u.owner;
  const H = 2.9; // lift height in world units ≈ 20% of visible arena height (resolution-independent)
  const t = u.t;
  const ph = U.phases;
  o.ultInvuln = true;
  if (t < ph.lift) {
    u.phase = 'lift';
    o.y += ((H - o.y) * Math.min(1, dt * 7));
    o.vy = 0;
  } else if (t < ph.lift + ph.sip) {
    u.phase = 'sip';
    o.y = H + Math.sin(t * 6) * 0.06;
    if (!u.fired.sip) { u.fired.sip = 1; bus.emit('ult:phase', { key: 'chai', phase: 'sip', owner: o }); bus.emit('sfx:sip'); }
  } else if (t < ph.lift + ph.sip + ph.charge) {
    u.phase = 'charge';
    if (!u.fired.charge) { u.fired.charge = 1; bus.emit('ult:phase', { key: 'chai', phase: 'charge', owner: o }); }
  } else if (!u.fired.blast) {
    u.fired.blast = 1;
    u.phase = 'blast';
    bus.emit('ult:blast', { owner: o });
    bus.emit('sfx:chaiblast');
    bus.emit('voice:speak', { char: 'you', event: 'ultHit', priority: true });
    sim.shake = Math.max(sim.shake, 0.9);
    sim.hitstopT = Math.max(sim.hitstopT, 0.16);
    // heal + stamina
    const heal = Math.round(o.maxHp * COMBAT.chaiHealPct);
    o.hp = clamp(o.hp + heal, 0, o.maxHp);
    o.stam = 100;
    bus.emit('ui:float', { x: o.x, y: o.y + o.height + 0.5, text: '+' + heal + ' HP', color: '#FFC24A', big: true });
    // shockwave hits ALL 3 AIs simultaneously
    const dmg = Math.round(U.shockDmg * (sim.diffKey === 'easy' ? 1.3 : sim.diffKey === 'hard' ? 0.9 : 1));
    for (const a of livingAIs()) {
      applyDamage(a, dmg, o, { kind: 'blast', knock: Math.sign(a.x - o.x || 1) * U.shockKnock, stun: U.shockStun, launch: true });
      bus.emit('ui:float', { x: a.x, y: a.y + a.height + 0.4, text: '-' + dmg, color: '#FFC24A', big: true });
      bus.emit('ui:feed', { text: `YOU > ${a.name}  -${dmg}  CHAI BRAHMASTRA`, color: '#FFC24A' });
    }
  }
}

// ---------------- CLAUDE — CODE MATRIX: COMPILE & EXECUTE ----------------
function stepClaude(sim, u, U, ph, dt) {
  const o = u.owner;
  const p = sim.player;
  const t = u.t;
  const H = 2.9;
  if (t < ph.ascend) {
    u.phase = 'ascend';
    o.y += (H - o.y) * Math.min(1, dt * 4);
  } else if (t < ph.ascend + ph.compile) {
    u.phase = 'compile';
    o.y = H + Math.sin(t * 5) * 0.05;
    if (!u.fired.compile) {
      u.fired.compile = 1;
      // red lane telegraph on the floor — fair dodge window
      u.laneX = p.alive ? p.x : o.x + o.face * 3;
      u.laneT = 0;
      bus.emit('ult:phase', { key: 'claude', phase: 'compile', owner: o });
      let z = null; for (const zz of sim.zones) if (!zz.alive) { z = zz; break; }
      if (z) { z.alive = true; z.kind = 'lane'; z.owner = o; z.x = u.laneX; z.z = p.z; z.r = 0.9; z.color = '#FF3B4A'; z.t = 0; z.dur = ph.execute; z.label = 'EXECUTING…'; }
      bus.emit('ui:telegraph', { owner: o, label: 'EXECUTING…', dur: ph.execute, color: '#FF3B4A', lane: true });
      bus.emit('sfx:beamcharge');
    }
    u.laneT += dt;
    u.laneX += ((p.alive ? p.x : u.laneX) - u.laneX) * Math.min(1, dt * 1.2); // lane tracks slowly
  } else if (t < ph.ascend + ph.compile + ph.execute) {
    u.phase = 'execute';
    if (!u.beam) {
      u.beam = { x: o.x, z: o.z, ang: Math.atan2(p.z - o.z, p.x - o.x), hitT: 0, glitched: false };
      bus.emit('ult:beam', { owner: o, on: true });
      bus.emit('sfx:beam');
    }
    const b = u.beam;
    // limited turn rate toward player
    const targetAng = Math.atan2(p.alive ? p.z - o.z : 0, p.alive ? p.x - o.x : 1);
    let da = targetAng - b.ang;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    b.ang += clamp(da, -U.beamTurn * dt, U.beamTurn * dt);
    b.hitT -= dt;
    if (p.alive && b.hitT <= 0) {
      b.hitT = 0.18;
      // beam is a vertical-ish lance at beamX on the lane; hits if player near beam line and low
      const bx = o.x + Math.cos(b.ang) * 4.5;
      const bz = o.z + Math.sin(b.ang) * 4.5;
      u.beamX = bx; u.beamZ = bz;
      if (Math.hypot(p.x - bx, p.z - bz) < 0.85 && p.y < 2.2 && p.dodgeT <= 0) {
        applyDamage(p, Math.round(U.beamDps * 0.18 * sim.diff.aiDmg * 3), o, { kind: 'beam', knock: 0.5 });
        bus.emit('ui:float', { x: p.x, y: p.y + p.height + 0.3, text: '-' + Math.round(U.beamDps * 0.54 * sim.diff.aiDmg), color: o.color });
        if (!b.glitched) {
          b.glitched = true;
          bus.emit('ult:glitch', { msg: 'TypeError: human is not defined' });
          bus.emit('sfx:glitch');
        }
      }
    }
    // Hard: sub-beams
    if (sim.diff.subBeams > 0 && !u.fired.sub) {
      u.fired.sub = 1;
      bus.emit('ult:beam', { owner: o, on: true, sub: sim.diff.subBeams });
    }
    // Medium/Hard: code barrage — homing panels the player can punch
    if (sim.diff.barrage > 0 && !u.fired.barrage) {
      u.fired.barrage = 1;
      for (let i = 0; i < sim.diff.barrage; i++) spawnPanel(sim, o, i * 0.25);
      bus.emit('ult:barrage', { owner: o });
    }
  } else {
    u.phase = 'overheat';
    o.y += (0 - o.y) * Math.min(1, dt * 5);
    if (!u.fired.overheat) {
      u.fired.overheat = 1;
      o.stunT = Math.max(o.stunT, 0.9);
      o.bonusTaken = U.overheatBonus; // takes bonus damage — reward window
      bus.emit('ult:phase', { key: 'claude', phase: 'overheat', owner: o });
      bus.emit('ui:float', { x: o.x, y: o.y + o.height + 0.5, text: 'COMPILATION FAILED', color: o.color, big: true });
      if (u.beam) { u.beam = null; bus.emit('ult:beam', { owner: o, on: false }); }
    }
  }
}

function spawnPanel(sim, owner, delay) {
  for (const q of sim.projectiles) if (!q.alive) {
    q.alive = true; q.kind = 'panel'; q.owner = owner; q.color = owner.color;
    q.x = owner.x + (Math.random() - 0.5) * 4; q.y = 3.4 + Math.random() * 1.5; q.z = owner.z + (Math.random() - 0.5) * 1.5;
    q.vx = 0; q.vy = -1.2; q.vz = 0;
    q.dmg = Math.round(8 * sim.diff.aiDmg);
    q.life = 4; q.delay = delay; q.homing = 0.55; q.hit = false;
    return;
  }
}

// ---------------- GROK — ROAST WAVE ----------------
function stepGrok(sim, u, U, dt) {
  const o = u.owner;
  const t = u.t;
  if (t < 0.5) { u.phase = 'taunt'; }
  else {
    u.phase = 'rings';
    for (let i = 0; i < U.rings; i++) {
      const start = 0.5 + i * U.ringGap;
      if (t >= start && !u.fired['r' + i]) {
        u.fired['r' + i] = 1;
        for (const w of sim.waves) if (!w.alive) {
          w.alive = true; w.x = o.x; w.z = o.z; w.r = 0.4; w.vr = U.ringSpeed;
          w.color = o.color; w.owner = o; w.h = U.ringH;
          w.dmg = Math.round(U.dmg * sim.diff.aiDmg); w.stamDrain = U.stamDrain; w.stun = U.stun;
          w.life = 3; w.hitDone = false;
          break;
        }
        bus.emit('ult:wave', { owner: o, ring: i });
        bus.emit('sfx:roastwave');
      }
    }
  }
}

// ---------------- CHATGPT — ESSAY DROP ----------------
function stepChatgpt(sim, u, U, dt) {
  const o = u.owner;
  const p = sim.player;
  const t = u.t;
  if (t < U.telegraph) {
    u.phase = 'telegraph';
    if (!u.fired.tele) {
      u.fired.tele = 1;
      u.slabX = p.alive ? p.x : o.x + 2;
      u.slabZ = p.alive ? p.z : o.z;
      let z = null; for (const zz of sim.zones) if (!zz.alive) { z = zz; break; }
      if (z) { z.alive = true; z.kind = 'slabshadow'; z.owner = o; z.x = u.slabX; z.z = u.slabZ; z.r = U.slabW / 2; z.color = o.color; z.t = 0; z.dur = U.telegraph; z.label = 'ESSAY DROP'; }
      bus.emit('ui:telegraph', { owner: o, label: 'ESSAY DROP', dur: U.telegraph, color: o.color, big: true });
      bus.emit('sfx:slabwarn');
    }
  } else if (!u.fired.drop) {
    u.fired.drop = 1;
    u.phase = 'drop';
    for (const s of sim.slabs) if (!s.alive) {
      s.alive = true; s.state = 'tele'; s.t = 0; s.tele = 0.01;
      s.x = u.slabX; s.z = u.slabZ; s.w = U.slabW; s.h = U.slabH;
      s.owner = o; s.color = o.color; s.dmg = Math.round(U.dmg * sim.diff.aiDmg);
      s.y = 7.5; s.vy = 0;
      // force immediate fall
      s.state = 'fall';
      bus.emit('ult:slabFall', s);
      break;
    }
  }
}

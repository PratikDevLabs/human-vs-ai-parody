// ============================================================
// src/game/sim.js — fixed-timestep 2.5D fighting simulation.
// PURE JS (no three.js): renderers read this state, it never imports them.
// 60 Hz fixed step, zero-allocation hot path (pooled objects).
// ============================================================
import { FIGHTERS, COMBAT, ARENA, DIFFICULTIES, AI_ATTACKS, SIM_DT } from '../config.js';
import { bus } from '../core/bus.js';
import { updateAI } from './ai.js';
import { startUlt, stepUlt } from './ults.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const TAU = Math.PI * 2;

// ---------- pooled fx containers ----------
const POOL = 96;
function makePool() {
  const arr = new Array(POOL);
  for (let i = 0; i < POOL; i++) arr[i] = { alive: false };
  return arr;
}

export const sim = {
  state: 'menu',            // menu | vs | countdown | fight | result
  diff: DIFFICULTIES.medium,
  diffKey: 'medium',
  time: 0, timeLeft: COMBAT.matchTime,
  timeScale: 1, slowmoT: 0, hitstopT: 0,
  fighters: [], byId: {}, player: null,
  zones: makePool(),        // telegraph decals
  projectiles: makePool(),  // bolts / code / panels
  waves: makePool(),        // roast rings
  slabs: makePool(),        // essay slabs
  ult: null, ultLock: false,
  combo: 0, comboT: 0,
  shake: 0,
  stats: null,
  result: null,
  countdownT: 0,
  input: { ax: 0 },
  buffer: {},               // action -> time pressed
  eventT: 0,
};

function freshStats() {
  return { dealt: 0, taken: 0, hits: 0, swings: 0, maxCombo: 0, perfect: 0, chaiUlts: 0, kos: 0, roastsTaken: 0, time: 0 };
}

export function resetMatch(diffKey) {
  sim.diffKey = diffKey;
  sim.diff = DIFFICULTIES[diffKey] || DIFFICULTIES.medium;
  sim.time = 0; sim.timeLeft = COMBAT.matchTime;
  sim.timeScale = 1; sim.slowmoT = 0; sim.hitstopT = 0;
  sim.ult = null; sim.ultLock = false;
  sim.combo = 0; sim.comboT = 0; sim.shake = 0;
  sim.result = null; sim.countdownT = 3.6;
  sim.stats = freshStats();
  sim.fighters.length = 0; sim.byId = {};
  const D = sim.diff;
  const defs = [
    ['you', -4.6, 0.0, 1],
    ['claude', 0.6, 0.95, -1],
    ['grok', 3.4, -0.95, -1],
    ['chatgpt', 6.1, 0.25, -1],
  ];
  for (const [id, x, z, face] of defs) {
    const base = FIGHTERS[id];
    const isP = id === 'you';
    const maxHp = Math.round(base.hp * (isP ? 1 : D.aiHp));
    const f = {
      id, name: base.name, title: base.title, color: base.color, isPlayer: isP,
      base,
      x, y: 0, z, vx: 0, vy: 0, face,
      hp: maxHp, maxHp,
      stam: 100,
      alive: true, state: 'idle', stateT: 0, walkPhase: Math.random() * 6,
      atk: null, atkCd: { punch: 0, kick: 0 }, chain: 0, chainT: 0,
      dodgeT: 0, dodgeAge: 0, dodgeCd: 0,
      stunT: 0, hurtT: 0, flashT: 0, graceT: 0, cast: null,
      specialCd: 2.5 + Math.random() * 3, ultCd: (D.ultCd[0] + Math.random() * (D.ultCd[1] - D.ultCd[0])),
      thinkT: Math.random() * 0.3,
      aiMode: 'approach', targetX: x, slotZ: z,
      chai: isP ? 0 : 0, lowWarned: false, koT: 0,
      onGround: true, ultInvuln: false, bonusTaken: 0, // bonusTaken>0 = overheat window
      // render-side refs (filled by rigs.js)
      rig: null, glow: null,
    };
    sim.fighters.push(f); sim.byId[id] = f;
  }
  sim.player = sim.byId.you;
  for (const z of sim.zones) z.alive = false;
  for (const p of sim.projectiles) p.alive = false;
  for (const w of sim.waves) w.alive = false;
  for (const s of sim.slabs) s.alive = false;
  bus.emit('sim:reset');
}

export function livingAIs() {
  const out = [];
  for (const f of sim.fighters) if (!f.isPlayer && f.alive) out.push(f);
  return out;
}

// ---------- input ----------
export function setAxis(ax) { sim.input.ax = clamp(ax, -1, 1); }
export function press(action) { sim.buffer[action] = sim.time; }
function consume(action) {
  const t = sim.buffer[action];
  if (t !== undefined && sim.time - t <= COMBAT.inputBuffer) { delete sim.buffer[action]; return true; }
  return false;
}

// ---------- combat helpers ----------
function spendStam(f, n) {
  if (!f.isPlayer) return true;
  if (f.stam < n) return false;
  f.stam -= n; return true;
}

export function startAttack(f, type) {
  if (!f.alive || f.stunT > 0 || f.hurtT > 0.05 || f.state === 'cast' || f.state === 'ult' || f.state === 'ko') return false;
  let spec = f.base[type];
  let variant = 0;
  if (f.isPlayer && type === 'punch') {
    // 3-hit string: jab -> cross -> hook, cycles while the chain window is open
    variant = f.chain || 0;
    spec = COMBAT.punchString[variant];
    f.chain = (variant + 1) % COMBAT.punchString.length;
    f.chainT = COMBAT.chainWindow;
  }
  if (f.atkCd[type] > 0) return false;
  if (!spendStam(f, spec.stam)) { bus.emit('ui:denied', type); return false; }
  f.atk = { type, t: 0, dur: spec.dur, hitDone: false, spec, variant };
  f.atkCd[type] = spec.cd;
  f.state = 'attack';
  f.face = f.isPlayer ? (nearestEnemy(f) ? Math.sign(nearestEnemy(f).x - f.x) || f.face : f.face) : (sim.player.alive ? Math.sign(sim.player.x - f.x) || f.face : f.face);
  if (f.isPlayer) sim.stats.swings++;
  bus.emit('sfx:whiff', f);
  return true;
}

function nearestEnemy(f) {
  let best = null, bd = 1e9;
  for (const t of sim.fighters) {
    if (t === f || !t.alive) continue;
    if (f.isPlayer && t.isPlayer) continue;
    if (!f.isPlayer && !t.isPlayer) continue;
    const d = Math.abs(t.x - f.x);
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}

function resolveHit(f) {
  const a = f.atk, spec = a.spec;
  const reach = spec.reach * (f.height / 1.8);
  const hx = f.x + f.face * reach;
  const hy = f.y + f.height * 0.62;
  const targets = f.isPlayer ? livingAIs() : (sim.player.alive ? [sim.player] : []);
  let hits = [];
  for (const t of targets) {
    const dx = Math.abs(t.x - hx);
    const dy = Math.abs((t.y + t.height * 0.55) - hy);
    const dz = Math.abs(t.z - f.z);
    if (dx < 0.55 + t.radius && dy < 1.15 && dz < 1.35) hits.push(t);
  }
  if (a.type === 'punch' && hits.length > 1) {
    hits.sort((p, q) => Math.abs(p.x - f.x) - Math.abs(q.x - f.x));
    hits = [hits[0]];
  }
  // player can also punch AI ult projectiles out of the air
  if (f.isPlayer) {
    for (const p of sim.projectiles) {
      if (!p.alive || p.owner === f) continue;
      if (p.kind !== 'panel') continue;
      if (Math.abs(p.x - hx) < 0.7 && Math.abs(p.y - hy) < 0.8 && Math.abs(p.z - f.z) < 1.2) {
        p.alive = false;
        sim.player.chai = clamp(sim.player.chai + 6, 0, 100);
        bus.emit('fx:spark', { x: p.x, y: p.y, z: p.z, color: p.color, n: 14 });
        bus.emit('ui:float', { x: p.x, y: p.y + 0.4, text: 'PARRIED +CHAI', color: '#FFC24A' });
        bus.emit('sfx:parry');
      }
    }
  }
  let any = false;
  for (const t of hits) {
    const dmgBase = spec.dmg * (f.isPlayer ? 1 : sim.diff.aiDmg);
    const comboScale = f.isPlayer ? 1 + Math.min(sim.combo * COMBAT.comboDmgScale, COMBAT.comboDmgCap) : 1;
    const dmg = Math.max(1, Math.round(dmgBase * comboScale * (0.9 + Math.random() * 0.2)));
    const dealt = applyDamage(t, dmg, f, { kind: a.type, knock: spec.knock * f.face, hitstop: spec.hitstop });
    if (dealt > 0) {
      any = true;
      bus.emit('fx:impact', { x: hx, y: hy, z: (t.z + f.z) / 2, color: f.color, heavy: a.type === 'kick', dmg });
      bus.emit('ui:float', { x: t.x + (Math.random() - 0.5) * 0.4, y: t.y + t.height + 0.35, text: '-' + dealt, color: f.color, big: a.type === 'kick' });
      bus.emit('ui:feed', { text: `${f.name} > ${t.name}  -${dealt}  ${a.type.toUpperCase()}`, color: f.color });
    }
  }
  if (any) {
    sim.hitstopT = Math.max(sim.hitstopT, a.type === 'kick' ? COMBAT.hitstopHeavy : COMBAT.hitstopLight);
    sim.shake = Math.max(sim.shake, a.type === 'kick' ? 0.35 : 0.18);
    bus.emit(a.type === 'kick' ? 'sfx:kickHit' : 'sfx:punchHit', { heavy: a.type === 'kick' });
    if (f.isPlayer) bus.emit('haptic', a.type === 'kick' ? 30 : 12);
  }
}

export function applyDamage(t, amt, src, opts) {
  opts = opts || {};
  if (!t.alive || sim.state !== 'fight') return 0;
  if (t.ultInvuln) return 0;
  const dodging = t.dodgeT > 0;
  if (dodging) {
    if (t.dodgeAge <= COMBAT.perfectDodgeWindow) {
      // PERFECT DODGE
      if (t.isPlayer) {
        sim.stats.perfect++;
        t.stam = clamp(t.stam + 30, 0, 100);
        t.chai = clamp(t.chai + COMBAT.chaiGainPerfect, 0, 100);
        sim.slowmoT = COMBAT.perfectSlowmo;
        bus.emit('fx:perfect', { x: t.x, y: t.y + t.height * 0.6, z: t.z, color: t.color });
        bus.emit('ui:float', { x: t.x, y: t.y + t.height + 0.3, text: 'PERFECT DODGE', color: '#7DF9FF', big: true });
        bus.emit('sfx:perfect');
        bus.emit('haptic', 18);
      }
      return 0;
    }
    bus.emit('ui:float', { x: t.x, y: t.y + t.height + 0.2, text: 'DODGED', color: '#B9C4E8' });
    return 0;
  }
  if (t.isPlayer && (opts.kind === 'punch' || opts.kind === 'kick') && t.graceT > 0) return 0;
  t.hp = clamp(t.hp - amt, 0, t.maxHp);
  t.flashT = 0.12;
  t.hurtT = Math.max(t.hurtT, opts.kind === 'kick' || opts.kind === 'slam' || opts.kind === 'blast' ? 0.24 : 0.16);
  if (opts.knock) t.vx += opts.knock;
  if (opts.stun) t.stunT = Math.max(t.stunT, opts.stun);
  if (opts.launch) { t.vy = 7.5; t.onGround = false; }
  if (t.isPlayer) t.graceT = COMBAT.meleeGrace;
  // interrupt wind-up
  if (t.cast && (opts.kind === 'kick' || opts.kind === 'blast' || Math.random() < 0.5)) {
    t.cast = null; t.state = 'idle'; t.specialCd = Math.max(t.specialCd, 1.4);
    bus.emit('ui:float', { x: t.x, y: t.y + t.height + 0.5, text: 'INTERRUPTED', color: '#FFE9A8' });
    bus.emit('ui:feed', { text: `${src ? src.name : 'FX'} interrupted ${t.name}`, color: '#FFE9A8' });
  }
  bus.emit('fx:hurtflash', t);
  if (t.isPlayer) {
    sim.stats.taken += amt;
    t.chai = clamp(t.chai + amt * COMBAT.chaiGainTaken * 0.28, 0, 100);
    sim.shake = Math.max(sim.shake, opts.kind === 'punch' || opts.kind === 'kick' ? 0.22 : 0.4);
    bus.emit('sfx:hurt');
    bus.emit('ui:hurt', { amt, fromX: src ? src.x : undefined });
    bus.emit('haptic', 16);
    if (t.hp <= t.maxHp * COMBAT.lowHpPct && !t.lowWarned && t.hp > 0) {
      t.lowWarned = true;
      bus.emit('ui:lowhp', true);
      const alive = livingAIs();
      if (alive.length) bus.emit('voice:speak', { char: alive[(Math.random() * alive.length) | 0].id, event: 'lowhp' });
    }
  } else if (src && src.isPlayer) {
    sim.stats.dealt += amt;
    sim.stats.hits++;
    sim.combo++; sim.comboT = COMBAT.comboWindow;
    sim.stats.maxCombo = Math.max(sim.stats.maxCombo, sim.combo);
    sim.player.chai = clamp(sim.player.chai + amt * COMBAT.chaiGainHit * 0.34, 0, 100);
    if (Math.random() < 0.15) bus.emit('voice:speak', { char: t.id, event: 'hurt' });
  }
  if (t.hp <= 0) killFighter(t, src, opts);
  return amt;
}

function killFighter(t, src, opts) {
  t.alive = false; t.state = 'ko'; t.koT = 0; t.vx = (src ? src.face : 1) * 3.4; t.atk = null; t.cast = null;
  bus.emit('fx:ko', t);
  bus.emit('sfx:ko');
  sim.shake = Math.max(sim.shake, 0.55);
  sim.hitstopT = Math.max(sim.hitstopT, 0.09);
  bus.emit('voice:speak', { char: t.id, event: 'ko', priority: true });
  bus.emit('ui:feed', { text: `${t.name}  K.O.`, color: t.color });
  if (t.isPlayer) {
    sim.result = { win: false, how: 'ko' };
    const alive = livingAIs();
    bus.emit('voice:speak', { char: alive.length ? alive[0].id : 'grok', event: 'win', priority: true });
    endMatch();
  } else {
    sim.stats.kos++;
    if (livingAIs().length === 0) {
      sim.result = { win: true, how: 'allko' };
      bus.emit('voice:speak', { char: 'you', event: 'win', priority: true });
      endMatch();
    }
  }
}

function endMatch() {
  if (sim.state === 'result') return;
  sim.state = 'result';
  sim.stats.time = sim.time;
  bus.emit('sim:result', sim.result);
}

function timeUp() {
  if (sim.state !== 'fight') return;
  const pPct = sim.player.hp / sim.player.maxHp;
  const ais = livingAIs();
  const aPct = ais.reduce((s, a) => s + a.hp / a.maxHp, 0) / Math.max(1, 3);
  const win = pPct > aPct || sim.stats.kos >= 2;
  sim.result = { win, how: 'time' };
  if (!win) bus.emit('voice:speak', { char: 'grok', event: 'win', priority: true });
  else bus.emit('voice:speak', { char: 'you', event: 'win', priority: true });
  endMatch();
}

// ---------- casts (AI wind-ups with telegraph zones) ----------
export function startCast(f, atkKey) {
  const A = AI_ATTACKS[atkKey];
  const dur = A.telegraph * sim.diff.telegraph;
  f.state = 'cast'; f.cast = { key: atkKey, t: 0, dur, atk: A };
  f.face = sim.player.alive ? Math.sign(sim.player.x - f.x) || f.face : f.face;
  // telegraph zone
  let z = null;
  for (const zz of sim.zones) if (!zz.alive) { z = zz; break; }
  if (z) {
    z.alive = true;
    z.kind = atkKey === 'slam' ? 'slam' : 'point';
    z.owner = f; z.x = atkKey === 'slam' ? sim.player.x : f.x + f.face * 1.6; z.z = atkKey === 'slam' ? sim.player.z : f.z;
    z.r = atkKey === 'slam' ? A.radius : 0.5;
    z.color = f.color; z.t = 0; z.dur = dur; z.label = A.name;
  }
  bus.emit('ui:telegraph', { owner: f, label: A.name, dur, color: f.color });
  bus.emit('sfx:cast', f);
  bus.emit('voice:speak', { char: f.id, event: 'attack' });
  return true;
}

function executeCast(f) {
  const c = f.cast; if (!c) return;
  const A = c.atk;
  if (c.key === 'roastBolt') {
    spawnProjectile(f, 'bolt', A.dmg, A.speed, 0);
  } else if (c.key === 'codeVolley') {
    const n = sim.diff.key === 'easy' ? 3 : sim.diff.key === 'medium' ? 5 : 7;
    for (let i = 0; i < n; i++) {
      spawnProjectile(f, 'code', A.dmg, A.speed * (0.9 + Math.random() * 0.25), i * 0.09);
    }
  } else if (c.key === 'slam') {
    const zx = sim.player.x, zz = sim.player.z;
    bus.emit('fx:slamwind', { x: zx, z: zz, color: f.color });
    if (sim.player.alive && Math.abs(sim.player.x - zx) < A.radius && Math.abs(sim.player.z - zz) < 1.4 && sim.player.y < 0.6) {
      applyDamage(sim.player, Math.round(A.dmg * sim.diff.aiDmg), f, { kind: 'slam', knock: Math.sign(sim.player.x - f.x) * 4, stun: 0.4, launch: true });
      bus.emit('ui:float', { x: sim.player.x, y: sim.player.y + sim.player.height + 0.3, text: '-' + Math.round(A.dmg * sim.diff.aiDmg), color: f.color, big: true });
      bus.emit('ui:feed', { text: `${f.name} > YOU  -${Math.round(A.dmg * sim.diff.aiDmg)}  ${A.name}`, color: f.color });
    }
    sim.shake = Math.max(sim.shake, 0.4);
    bus.emit('sfx:slam');
  }
  f.cast = null; f.state = 'recover'; f.stateT = 0;
  f.specialCd = A.cd[0] + Math.random() * (A.cd[1] - A.cd[0]);
}

function spawnProjectile(f, kind, dmg, speed, delay) {
  let p = null;
  for (const q of sim.projectiles) if (!q.alive) { p = q; break; }
  if (!p) return;
  const t = sim.player;
  const sx = f.x + f.face * 0.7, sy = f.y + f.height * 0.62, sz = f.z;
  const tx = t.x, ty = t.y + t.height * 0.55, tz = t.z;
  const dx = tx - sx, dy = ty - sy, dz = tz - sz;
  const d = Math.hypot(dx, dy, dz) || 1;
  const sp = speed;
  p.alive = true; p.kind = kind; p.owner = f; p.color = f.color;
  p.x = sx; p.y = sy; p.z = sz;
  p.vx = dx / d * sp; p.vy = dy / d * sp; p.vz = dz / d * sp;
  p.dmg = Math.round(dmg * sim.diff.aiDmg);
  p.life = 3.2; p.delay = delay || 0;
  p.homing = kind === 'code' ? sim.diff.homing : 0;
  p.hit = false;
  bus.emit('sfx:shoot', f);
}

// ---------- dodge / jump ----------
export function doDodge(f, dir) {
  if (!f.alive || f.dodgeCd > 0 || f.stunT > 0 || f.state === 'cast' || f.state === 'ult') return false;
  if (f.isPlayer && !spendStam(f, COMBAT.dodgeStam)) { bus.emit('ui:denied', 'dodge'); return false; }
  f.state = 'dodge'; f.dodgeT = COMBAT.dodgeTime; f.dodgeAge = 0;
  f.dodgeCd = f.isPlayer ? COMBAT.dodgeCd : 1.4;
  f.vx = (dir || -f.face) * COMBAT.dodgeSpeed;
  f.atk = null;
  bus.emit('fx:dodge', f);
  bus.emit('sfx:dodge');
  return true;
}
export function doJump(f) {
  if (!f || !f.alive || !f.onGround || f.stunT > 0 || f.state === 'cast' || f.state === 'ult') return;
  f.vy = f.base.jumpV; f.onGround = false;
  bus.emit('sfx:jump', f);
}

// ---------- chai ult (player) ----------
export function tryChaiUlt() {
  const p = sim.player;
  if (sim.state !== 'fight' || !p.alive || p.state === 'ult') return false;
  if (p.chai < 100) { bus.emit('ui:denied', 'chai'); return false; }
  startUlt(sim, p, 'chai');
  return true;
}

// ---------- main fixed step ----------
export function stepSim(dt) {
  if (sim.state === 'countdown') {
    const prev = Math.ceil(sim.countdownT);
    sim.countdownT -= dt;
    const now = Math.ceil(sim.countdownT);
    if (now !== prev && now > 0) bus.emit('ui:count', now);
    if (sim.countdownT <= 0) { sim.state = 'fight'; bus.emit('ui:count', 'fight'); }
    return;
  }
  if (sim.state !== 'fight' && sim.state !== 'result' && sim.state !== 'vs') return;
  if (sim.state === 'result') { stepAmbient(dt); return; }

  // hit-stop freezes the sim briefly
  if (sim.hitstopT > 0) { sim.hitstopT -= dt; return; }
  // slow-mo time scale
  let sdt = dt;
  let ts = 1;
  if (sim.slowmoT > 0) { sim.slowmoT -= dt; ts = COMBAT.perfectSlowmoScale; }
  if (sim.ult) ts = Math.min(ts, COMBAT.ultTimeScale[sim.ult.key] || 0.6); // cinematic slow-mo during ults
  sdt = dt * ts;
  sim.timeScale = ts;

  sim.time += sdt;
  sim.timeLeft -= sdt;
  if (sim.timeLeft <= 0) { sim.timeLeft = 0; timeUp(); }

  // player input
  const p = sim.player;
  if (p.alive && p.state !== 'ult') {
    if (p.stunT <= 0 && p.state !== 'cast') {
      if (p.state !== 'dodge' && p.hurtT <= 0.05) {
        p.vx = sim.input.ax * p.base.speed * (p.atk ? 0.25 : 1);
        if (sim.input.ax !== 0) { p.face = sim.input.ax > 0 ? 1 : -1; if (!p.atk) p.state = 'walk'; }
        else if (!p.atk && p.state !== 'dodge') p.state = 'idle';
      }
      if (consume('jump')) doJump(p);
      if (consume('punch')) startAttack(p, 'punch');
      else if (consume('kick')) startAttack(p, 'kick');
      if (consume('dodge')) doDodge(p, sim.input.ax !== 0 ? Math.sign(sim.input.ax) : -p.face);
      if (consume('ult')) tryChaiUlt();
    }
  }

  // fighters
  for (const f of sim.fighters) stepFighter(f, sdt);

  // pushboxes
  separate();

  // systems
  stepProjectiles(sdt);
  stepZones(sdt);
  stepWaves(sdt);
  stepSlabs(sdt);
  if (sim.ult) stepUlt(sim, dt); // ult timeline runs in real time while the world is slowed

  // combo decay
  if (sim.comboT > 0) { sim.comboT -= sdt; if (sim.comboT <= 0) sim.combo = 0; }
  // chai trickle
  if (p.alive) p.chai = clamp(p.chai + COMBAT.chaiTrickle * sdt, 0, 100);
  if (p.alive && p.chai >= 100) bus.emit('ui:chaiReady'); // hud listens, fires once per fill

  sim.shake = Math.max(0, sim.shake - sdt * 1.6);
}

function stepAmbient(dt) {
  for (const f of sim.fighters) {
    f.hurtT = Math.max(0, f.hurtT - dt); f.flashT = Math.max(0, f.flashT - dt); f.stunT = Math.max(0, f.stunT - dt);
    if (!f.alive) { f.koT += dt; f.vy -= COMBAT.gravity * dt; f.y = Math.max(0, f.y + f.vy * dt); f.x += f.vx * dt; f.vx *= 0.98; }
    else {
      f.y = Math.max(0, f.y); if (f.y === 0) { f.vy = 0; f.onGround = true; }
      f.walkPhase += dt * 2;
      if (sim.result && sim.result.win && f.isPlayer && f.alive) f.state = 'victory';
      else if (f.state === 'victory') f.state = 'idle';
    }
  }
}

function stepFighter(f, dt) {
  // timers
  f.atkCd.punch -= dt; f.atkCd.kick -= dt; f.dodgeCd -= dt; f.specialCd -= dt; f.ultCd -= dt;
  if (f.chainT > 0) { f.chainT -= dt; if (f.chainT <= 0) f.chain = 0; }
  f.hurtT -= dt; f.stunT -= dt; f.flashT -= dt; f.graceT -= dt;
  f.stateT += dt;
  if (f.dodgeT > 0) {
    f.dodgeAge += dt; f.dodgeT -= dt;
    if (f.dodgeT <= 0 && f.state === 'dodge') f.state = 'idle';
  }
  if (f.isPlayer && f.state !== 'ult') f.stam = clamp(f.stam + 24 * dt, 0, 100);

  // ult state owns the fighter
  if (f.state === 'ult') {
    f.vx *= 0.8;
    f.x = clamp(f.x + f.vx * dt, -ARENA.width / 2 + 0.4, ARENA.width / 2 - 0.4);
    return;
  }

  // attack progress
  if (f.atk) {
    const a = f.atk;
    a.t += dt;
    // lunge toward target — real physical approach
    const t = nearestEnemy(f);
    const dir = t ? Math.sign(t.x - f.x) || f.face : f.face;
    const prog = a.t / a.dur;
    f.vx = dir * 5.2 * Math.sin(Math.min(prog * 1.5, 1) * Math.PI * 0.5);
    if (!a.hitDone && a.t >= a.dur * 0.45) { a.hitDone = true; resolveHit(f); }
    if (a.t >= a.dur) { f.atk = null; if (f.state === 'attack') f.state = 'idle'; }
  }

  // cast (wind-up) progress
  if (f.cast) {
    f.cast.t += dt; f.vx *= 0.8;
    if (f.cast.t >= f.cast.dur) executeCast(f);
  }
  if (f.state === 'recover') {
    f.vx *= 0.8;
    if (f.stateT > 0.35) f.state = 'idle';
  }

  // AI brain
  if (!f.isPlayer && f.alive && f.stunT <= 0 && f.state !== 'cast' && f.state !== 'ult') updateAI(sim, f, dt);

  // physics
  if (!f.onGround || f.vy !== 0) {
    f.vy -= COMBAT.gravity * dt;
    f.y += f.vy * dt;
    if (f.y <= 0) { f.y = 0; f.vy = 0; f.onGround = true; bus.emit('fx:land', f); }
  }
  f.x += f.vx * dt;
  f.x = clamp(f.x, -ARENA.width / 2 + 0.4, ARENA.width / 2 - 0.4);
  // gentle z drift back to slot
  f.z += (f.slotZ - f.z) * Math.min(1, dt * 2);
  if (f.state !== 'dodge' && f.hurtT <= 0 && f.stunT <= 0 && !f.atk) f.vx *= Math.pow(0.0001, dt);
  if (Math.abs(f.vx) > 0.4 && f.onGround && f.state !== 'attack') f.walkPhase += dt * Math.abs(f.vx) * 1.6;
  if (!f.alive) { f.koT += dt; }
}

function separate() {
  const all = sim.fighters;
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const a = all[i], b = all[j];
      if (!a.alive || !b.alive) continue;
      if (Math.abs(a.y - b.y) > 0.9) continue;
      const dx = b.x - a.x;
      const min = a.base.radius + b.base.radius + COMBAT.pushbox;
      if (Math.abs(dx) < min && Math.abs(a.z - b.z) < 1.4) {
        const push = (min - Math.abs(dx)) / 2 * (dx >= 0 ? 1 : -1);
        a.x -= push; b.x += push;
      }
    }
  }
}

function stepProjectiles(dt) {
  const p = sim.player;
  for (const q of sim.projectiles) {
    if (!q.alive) continue;
    if (q.delay > 0) { q.delay -= dt; continue; }
    q.life -= dt;
    if (q.homing > 0 && p.alive) {
      const dx = p.x - q.x, dy = (p.y + p.height * 0.55) - q.y, dz = p.z - q.z;
      const d = Math.hypot(dx, dy, dz) || 1;
      const sp = Math.hypot(q.vx, q.vy, q.vz);
      const tx = dx / d * sp, ty = dy / d * sp, tz = dz / d * sp;
      q.vx += (tx - q.vx) * q.homing * dt * 3;
      q.vy += (ty - q.vy) * q.homing * dt * 3;
      q.vz += (tz - q.vz) * q.homing * dt * 3;
    }
    q.x += q.vx * dt; q.y += q.vy * dt; q.z += q.vz * dt;
    bus.emit('fx:projtrail', q);
    if (p.alive && !q.hit && Math.abs(q.x - p.x) < p.base.radius + 0.3 && q.y > p.y - 0.1 && q.y < p.y + p.height && Math.abs(q.z - p.z) < 1.2) {
      q.hit = true; q.alive = false;
      applyDamage(p, q.dmg, q.owner, { kind: q.kind, knock: Math.sign(q.vx) * 1.6 });
      bus.emit('fx:impact', { x: q.x, y: q.y, z: q.z, color: q.color, heavy: false, dmg: q.dmg });
      bus.emit('ui:float', { x: p.x, y: p.y + p.height + 0.3, text: '-' + q.dmg, color: q.color });
      bus.emit('ui:feed', { text: `${q.owner ? q.owner.name : 'FX'} > YOU  -${q.dmg}  ${(q.kind || '').toUpperCase()}`, color: q.color });
    }
    if (q.life <= 0 || q.y < -0.5 || Math.abs(q.x) > ARENA.width) q.alive = false;
  }
}

function stepZones(dt) {
  for (const z of sim.zones) {
    if (!z.alive) continue;
    z.t += dt;
    if (z.t >= z.dur) {
      if (z.kind === 'slow') { /* slow zones just expire */ }
      z.alive = false;
    }
  }
}

function stepWaves(dt) {
  const p = sim.player;
  for (const w of sim.waves) {
    if (!w.alive) continue;
    w.r += w.vr * dt;
    w.life -= dt;
    if (p.alive && !w.hitDone) {
      const d = Math.hypot(p.x - w.x, p.z - w.z);
      if (Math.abs(d - w.r) < 0.55 && p.y < w.h && p.dodgeT <= 0) {
        w.hitDone = true;
        applyDamage(p, w.dmg, w.owner, { kind: 'roast', knock: Math.sign(p.x - w.x) * 2.4, stun: w.stun });
        p.stam = clamp(p.stam - w.stamDrain, 0, 100);
        sim.stats.roastsTaken++;
        bus.emit('fx:roastHit', { x: p.x, y: p.y + p.height * 0.6, z: p.z });
        bus.emit('ui:float', { x: p.x, y: p.y + p.height + 0.35, text: 'MIND BROKEN -' + w.dmg, color: w.color, big: true });
        bus.emit('ui:feed', { text: `${w.owner ? w.owner.name : 'GROK'} > YOU  -${w.dmg}  ROAST WAVE`, color: w.color });
        bus.emit('sfx:roast');
      }
    }
    if (w.life <= 0 || w.r > 16) w.alive = false;
  }
}

function stepSlabs(dt) {
  const p = sim.player;
  for (const s of sim.slabs) {
    if (!s.alive) continue;
    s.t += dt;
    if (s.state === 'tele') {
      if (s.t >= s.tele) { s.state = 'fall'; s.y = 7.5; s.vy = 0; bus.emit('ult:slabFall', s); }
    } else if (s.state === 'fall') {
      s.vy += 30 * dt; s.y -= s.vy * dt;
      if (s.y <= 0) {
        s.y = 0; s.state = 'land'; s.alive = false;
        bus.emit('ult:slabImpact', s);
        sim.shake = Math.max(sim.shake, 0.6); sim.hitstopT = Math.max(sim.hitstopT, 0.12);
        bus.emit('sfx:slam');
        const r = s.w / 2 + 0.6;
        if (p.alive && Math.abs(p.x - s.x) < r && Math.abs(p.z - s.z) < 1.6 && p.y < 0.8) {
          const dmg = Math.round(s.dmg);
          applyDamage(p, dmg, s.owner, { kind: 'slab', knock: Math.sign(p.x - s.x || 1) * 4.5, stun: 0.8, launch: true });
          bus.emit('ui:float', { x: p.x, y: p.y + p.height + 0.35, text: '-' + dmg, color: s.color, big: true });
          bus.emit('ui:feed', { text: `${s.owner ? s.owner.name : 'CHATGPT'} > YOU  -${dmg}  ESSAY DROP`, color: s.color });
        }
        // rubble slow zone
        let z = null; for (const zz of sim.zones) if (!zz.alive) { z = zz; break; }
        if (z) { z.alive = true; z.kind = 'slow'; z.owner = s.owner; z.x = s.x; z.z = s.z; z.r = r; z.color = s.color; z.t = 0; z.dur = 3.0; z.slow = 0.45; }
        bus.emit('fx:rubble', s);
      }
    }
  }
  // apply slow zones (read next frame by player movement)
  for (const z of sim.zones) {
    if (!z.alive || z.kind !== 'slow') continue;
    if (p.alive && Math.abs(p.x - z.x) < z.r && Math.abs(p.z - z.z) < 1.6 && p.y < 0.5) {
      p.slowed = z.slow;
    }
  }
}

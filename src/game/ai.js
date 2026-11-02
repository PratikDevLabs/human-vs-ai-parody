// ============================================================
// src/game/ai.js — finite-state machine: approach / circle / poke /
// wind-up / attack / recover / ult. Attack tokens limit simultaneous
// attackers. Pure JS.
// ============================================================
import { ARENA, AI_ATTACKS } from '../config.js';
import { bus } from '../core/bus.js';
import { startAttack, startCast, doDodge, livingAIs } from './sim.js';
import { startUlt } from './ults.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

function activeAttackers(sim) {
  let n = 0;
  for (const f of sim.fighters) {
    if (f.isPlayer || !f.alive) continue;
    if (f.state === 'cast' || f.state === 'attack' || f.state === 'ult') n++;
  }
  return n;
}

export function updateAI(sim, f, dt) {
  const D = sim.diff;
  const p = sim.player;
  f.thinkT -= dt;
  const dx = p.alive ? p.x - f.x : 0;
  const adx = Math.abs(dx);
  const dy = Math.abs(p.y - f.y);

  if (f.thinkT <= 0) {
    f.thinkT = D.think * (0.8 + Math.random() * 0.5);
    // react to player attack: dodge
    if (p.atk && adx < 2.2 && dy < 1.2 && Math.random() < 0.35) { doDodge(f, dx > 0 ? -1 : 1); return; }
    // ULT decision — never overlaps (global lock in startUlt)
    if (f.ultCd <= 0 && !sim.ult && Math.random() < D.aggression * 0.55) {
      startUlt(sim, f, f.id === 'grok' ? 'grok' : f.id === 'chatgpt' ? 'chatgpt' : 'claude');
      return;
    }
    // special attack decision
    if (f.specialCd <= 0 && p.alive && activeAttackers(sim) < D.attackTokens) {
      const roll = Math.random();
      if (f.id === 'grok' && adx < 9 && roll < 0.6) { startCast(f, 'roastBolt'); return; }
      if (f.id === 'chatgpt' && adx < 7 && roll < 0.55) { startCast(f, adx < 3.2 ? 'slam' : 'slam'); return; }
      if (f.id === 'claude' && adx < 10 && roll < 0.65) { startCast(f, 'codeVolley'); return; }
    }
    // melee poke
    if (adx < 1.5 * f.base.punch.reach && dy < 1.0 && activeAttackers(sim) < D.attackTokens && Math.random() < D.aggression) {
      f.face = dx >= 0 ? 1 : -1;
      startAttack(f, Math.random() < 0.35 ? 'kick' : 'punch');
      return;
    }
    // movement intent
    const order = livingAIs(sim);
    const idx = order.indexOf(f);
    const slots = [-1.1, 1.1, -0.5, 0.6];
    f.slotZ = slots[idx % slots.length];
    if (adx > 2.0) { f.aiMode = 'approach'; f.targetX = p.x + (dx > 0 ? -0.9 : 0.9); }
    else if (Math.random() < 0.3) { f.aiMode = 'circle'; f.targetX = p.x + (Math.random() < 0.5 ? -2.2 : 2.2); }
    else { f.aiMode = 'circle'; f.targetX = f.x + (Math.random() - 0.5) * 2; }
    if (f.hp < f.maxHp * 0.22 && Math.random() < 0.4) { f.aiMode = 'retreat'; f.targetX = f.x + (dx > 0 ? -3 : 3); }
  }

  if (f.state === 'cast' || f.state === 'recover') { f.vx *= 0.8; return; }
  const tdx = f.targetX - f.x;
  const spd = f.base.speed * D.aiSpeed * (f.aiMode === 'retreat' ? 1.1 : 1) * (p.slowed ? 1 : 1);
  if (Math.abs(tdx) > 0.25) {
    f.vx = clamp(tdx * 5, -spd, spd);
    f.face = p.alive && Math.abs(p.x - f.x) > 0.1 ? Math.sign(p.x - f.x) : f.face;
    if (!f.atk) f.state = 'walk';
  } else {
    f.vx *= 0.7;
    if (!f.atk) f.state = 'idle';
  }
  // hop occasionally
  if (f.onGround && Math.random() < 0.004 && adx > 2.5) { f.vy = f.base.jumpV * 0.8; f.onGround = false; }
}

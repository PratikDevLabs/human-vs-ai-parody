// ============================================================
// HUMAN vs AI — OVERLORD ARENA · src/config.js
// ALL tuning numbers live here. No magic numbers in game code.
// ============================================================

export const VERSION = '3.0.0';

export const COLORS = {
  ink:      '#07060F',
  ink2:     '#120B24',
  you:      '#27E6FF',   // neon cyan
  grok:     '#FF3B4A',   // signal red
  chatgpt:  '#2CFFA7',   // emerald
  claude:   '#FF8A2B',   // ember orange
  chai:     '#FFC24A',   // chai gold
  txt:      '#EEF1FF',
  dim:      '#9AA3C7',
};

export const ARENA = {
  width: 15,          // lane length in world units (x: -7.5 .. 7.5)
  zDepth: 2.6,        // shallow z lane for fighter separation
  floorY: 0,
  camBaseZ: 9.2,
  camY: 2.35,
  lookY: 1.45,
};

export const FIGHTERS = {
  you: {
    id: 'you', name: 'YOU', title: 'THE HUMAN', color: COLORS.you,
    hp: 220, speed: 5.6, jumpV: 11.5, radius: 0.42, height: 1.78,
    punch: { dmg: 9,  dur: 0.30, cd: 0.34, reach: 1.05, stam: 9,  hitstop: 0.06, knock: 2.2 },
    kick:  { dmg: 15, dur: 0.46, cd: 0.58, reach: 1.30, stam: 15, hitstop: 0.10, knock: 4.2 },
  },
  grok: {
    id: 'grok', name: 'GROK', title: 'THE DESI TROLL', color: COLORS.grok,
    hp: 175, speed: 4.6, jumpV: 10.5, radius: 0.40, height: 1.72,
    punch: { dmg: 8,  dur: 0.30, cd: 0.55, reach: 1.00, stam: 0, hitstop: 0.06, knock: 2.0 },
    kick:  { dmg: 13, dur: 0.48, cd: 0.95, reach: 1.25, stam: 0, hitstop: 0.10, knock: 3.8 },
  },
  chatgpt: {
    id: 'chatgpt', name: 'CHATGPT', title: 'THE OVER-SMART OVERLORD', color: COLORS.chatgpt,
    hp: 205, speed: 3.9, jumpV: 9.0, radius: 0.55, height: 2.05,
    punch: { dmg: 12, dur: 0.42, cd: 0.80, reach: 1.10, stam: 0, hitstop: 0.09, knock: 3.4 },
    kick:  { dmg: 18, dur: 0.60, cd: 1.25, reach: 1.35, stam: 0, hitstop: 0.14, knock: 5.2 },
  },
  claude: {
    id: 'claude', name: 'CLAUDE', title: 'THE SILENT STRIKER', color: COLORS.claude,
    hp: 185, speed: 4.3, jumpV: 10.0, radius: 0.42, height: 1.98,
    punch: { dmg: 10, dur: 0.36, cd: 0.65, reach: 1.25, stam: 0, hitstop: 0.07, knock: 2.6 },
    kick:  { dmg: 15, dur: 0.52, cd: 1.05, reach: 1.45, stam: 0, hitstop: 0.11, knock: 4.4 },
  },
};

export const COMBAT = {
  gravity: 26,
  inputBuffer: 0.10,        // s
  perfectDodgeWindow: 0.12, // s of i-frames at dodge start
  dodgeCd: 0.85, dodgeSpeed: 9.5, dodgeStam: 16, dodgeTime: 0.30,
  perfectSlowmo: 0.30, perfectSlowmoScale: 0.35,
  comboWindow: 2.2, comboDmgScale: 0.06, comboDmgCap: 0.5, // +6% per combo hit, max +50%
  meleeGrace: 0.40,          // anti-stunlock window after being melee-hit
  hitstopLight: 0.07, hitstopHeavy: 0.14,
  pushbox: 0.05,
  matchTime: 180,            // 3:00
  lowHpPct: 0.25,
  chaiGainHit: 3.2, chaiGainTaken: 1.1, chaiGainPerfect: 10, chaiTrickle: 1.0, // per s
  chaiHealPct: 0.34,
  chaiUltDmg: 34,
  // player 3-hit punch string: jab -> cross -> hook (cycles while chainT alive)
  punchString: [
    { dmg: 7,  dur: 0.26, cd: 0.30, reach: 1.00, stam: 8,  hitstop: 0.05, knock: 1.8, anim: 'jab' },
    { dmg: 10, dur: 0.32, cd: 0.36, reach: 1.06, stam: 10, hitstop: 0.07, knock: 2.4, anim: 'cross' },
    { dmg: 15, dur: 0.44, cd: 0.52, reach: 1.12, stam: 13, hitstop: 0.10, knock: 3.6, anim: 'hook' },
  ],
  chainWindow: 0.9,        // s to continue the string
  ultTimeScale: { chai: 0.5, claude: 0.6, grok: 0.75, chatgpt: 0.75 },
};

export const DIFFICULTIES = {
  easy: {
    key: 'easy', label: 'EASY',
    aiDmg: 0.60, aiHp: 0.82, aiSpeed: 0.78, think: 0.34,
    telegraph: 1.45, reaction: 0.28, aggression: 0.55,
    ultCd: [7.5, 11], attackTokens: 1, homing: 0, subBeams: 0, barrage: 0,
    readout: 'Slower AI · longer telegraphs · less damage · 1 attacker at a time',
  },
  medium: {
    key: 'medium', label: 'MEDIUM',
    aiDmg: 1.00, aiHp: 1.00, aiSpeed: 1.00, think: 0.20,
    telegraph: 1.00, reaction: 0.16, aggression: 0.75,
    ultCd: [6, 9.5], attackTokens: 2, homing: 0.25, subBeams: 0, barrage: 3,
    readout: 'The real fight · 2 attackers at a time · homing code · beam + barrage',
  },
  hard: {
    key: 'hard', label: 'HARD',
    aiDmg: 1.38, aiHp: 1.22, aiSpeed: 1.16, think: 0.12,
    telegraph: 0.72, reaction: 0.08, aggression: 0.95,
    ultCd: [4.5, 7.5], attackTokens: 3, homing: 0.6, subBeams: 2, barrage: 5,
    readout: 'Overlord mode · 3 attackers · fast telegraphs · triple beam · brutal damage',
  },
};

// ---- Ultimates (cinematic timelines; visuals driven by events) ----
export const ULTS = {
  chai: {
    key: 'chai', name: 'GUJARATI CHAI BRAHMASTRA', dur: 3.5, liftH: 0.20, // 20% of arena height
    phases: { lift: 0.7, sip: 1.7, charge: 0.4, blast: 0.7 },
    shockDmg: COMBAT.chaiUltDmg, shockStun: 1.2, shockKnock: 7.0,
  },
  claude: {
    key: 'claude', name: 'CODE MATRIX — COMPILE & EXECUTE', dur: 4.5,
    phases: { ascend: 1.4, compile: 0.8, execute: 1.4, overheat: 0.9 },
    beamDps: 14, beamTurn: 2.6, overheatBonus: 1.5,
  },
  grok: {
    key: 'grok', name: 'ROAST WAVE', dur: 2.6,
    rings: 3, ringSpeed: 7.5, ringGap: 0.42, ringH: 0.55,
    dmg: 20, stamDrain: 30, stun: 0.7,
  },
  chatgpt: {
    key: 'chatgpt', name: 'ESSAY DROP', dur: 3.0,
    telegraph: 1.0, slabW: 3.4, slabH: 2.6, dmg: 26, slowZone: 2.6, slowFactor: 0.45, slowDur: 3.0,
  },
};

// ---- AI regular attacks ----
export const AI_ATTACKS = {
  roastBolt:  { dmg: 7,  speed: 9.0, cd: [2.2, 3.6], telegraph: 0.55, name: 'ROAST BOLT' },
  slam:       { dmg: 14, radius: 2.2, cd: [3.2, 5.0], telegraph: 0.9, name: 'ESSAY SLAM' },
  codeVolley: { dmg: 7,  count: 5, speed: 7.5, cd: [2.6, 4.2], telegraph: 0.6, name: 'CODE BURST' },
};

// ---- Quality tiers (auto + manual) ----
export const QUALITY = {
  tiers: ['LOW', 'MED', 'HIGH'],
  HIGH: { dpr: 2.0, bloom: true,  bloomStrength: 0.85, particles: 1.0, shadows: true,  grain: true,  reflections: true },
  MED:  { dpr: 1.5, bloom: true,  bloomStrength: 0.65, particles: 0.6, shadows: true,  grain: true,  reflections: false },
  LOW:  { dpr: 1.0, bloom: false, bloomStrength: 0.0,  particles: 0.35, shadows: false, grain: false, reflections: false },
  fpsStepDown: 45, fpsStepWindow: 3.0,
};

export const SIM_DT = 1 / 60;          // fixed 60 Hz simulation
export const MAX_DRAWCALLS = 150;

export const INSTAGRAM_URL = 'https://www.instagram.com/pratik_roy_820?rpxt=MTIyNncxaDZ4bXhhbg==';

export const STORE_KEYS = {
  settings: 'hva_settings_v3',
  best: 'hva_best_v3',
  tutorial: 'hva_tutorial_seen_v3',
};

export const DEFAULT_SETTINGS = {
  master: 0.9, music: 0.5, sfx: 0.9, voice: 1.0,
  quality: 'auto',           // auto | LOW | MED | HIGH
  lang: 'hinglish',          // hinglish | en | hi
  leftHanded: false,
  buttonSize: 1.0,           // scale
  reduceMotion: false,
  haptics: true,
  colorblind: false,         // colour-blind-safe palette
  subtitles: true,
  installPromptSeen: false,
};

// ============================================================
// src/audio/audio.js — single WebAudio graph:
// sources → buses (Music/SFX/Voice) → Master(gain) → Compressor(limiter)
// → Convolver reverb send → destination. Lazy init after first gesture.
// Layered synth SFX + a dark synthwave sequencer. Ducking under
// voice/ults. All nodes created once; per-hit nodes are short-lived.
// ============================================================
import { bus } from '../core/bus.js';

let ctx = null;
let master, comp, musicBus, sfxBus, voiceBus, verb, verbGain, dry;
let noiseBuf = null;
let started = false;
let musicTimer = null, musicStep = 0, nextT = 0;
let volumes = { master: 0.9, music: 0.5, sfx: 0.9, voice: 1.0 };
let duckT = 0, duckAmt = 0;

export function audioReady() { return !!ctx; }

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) { console.warn('no webaudio', e); return; }
  master = ctx.createGain();
  comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 22; comp.ratio.value = 10;
  comp.attack.value = 0.004; comp.release.value = 0.24;
  master.connect(comp); comp.connect(ctx.destination);
  // reverb (generated impulse)
  verb = ctx.createConvolver();
  verb.buffer = makeImpulse(2.2, 2.8);
  verbGain = ctx.createGain(); verbGain.gain.value = 0.32;
  verb.connect(verbGain); verbGain.connect(master);
  dry = ctx.createGain(); dry.gain.value = 1; dry.connect(master);
  musicBus = ctx.createGain(); musicBus.connect(dry); musicBus.connect(verb);
  sfxBus = ctx.createGain(); sfxBus.connect(dry);
  const sfxSend = ctx.createGain(); sfxSend.gain.value = 0.5; sfxBus.connect(sfxSend); sfxSend.connect(verb);
  voiceBus = ctx.createGain(); voiceBus.connect(dry);
  const vSend = ctx.createGain(); vSend.gain.value = 0.6; voiceBus.connect(vSend); vSend.connect(verb);
  // noise buffer
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  setVolumes(volumes);
  bindBus();
  started = true;
}

export function setVolumes(v) {
  volumes = { ...volumes, ...v };
  if (!ctx) return;
  master.gain.value = volumes.master;
  musicBus.gain.value = volumes.music * 0.5;
  sfxBus.gain.value = volumes.sfx;
  voiceBus.gain.value = volumes.voice;
}

export function voiceBusNode() { return voiceBus; }
export function audioCtx() { return ctx; }
export function reverbSend(node, amt) {
  if (!ctx) return;
  const g = ctx.createGain(); g.gain.value = amt;
  node.connect(g); g.connect(verb);
}

function makeImpulse(dur, decay) {
  const rate = ctx.sampleRate, len = Math.floor(rate * dur);
  const buf = ctx.createBuffer(2, len, rate);
  for (let c = 0; c < 2; c++) {
    const ch = buf.getChannelData(c);
    for (let i = 0; i < len; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

// duck music under voice/ults
export function duck(amount, dur) {
  if (!ctx) return;
  duckAmt = amount; duckT = dur;
}

// ---------------- SFX synth helpers ----------------
function env(g, t0, a, peak, d, sustain = 0) {
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.linearRampToValueAtTime(peak, t0 + a);
  g.gain.exponentialRampToValueAtTime(Math.max(sustain, 0.0001), t0 + a + d);
}
function osc(type, freq, t0, dur, peak, dest, freqEnd) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (freqEnd) o.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
  const g = ctx.createGain();
  env(g, t0, 0.004, peak, dur);
  o.connect(g); g.connect(dest || sfxBus);
  o.start(t0); o.stop(t0 + dur + 0.05);
  return o;
}
function noise(t0, dur, peak, dest, filterFreq, type = 'lowpass', q = 1) {
  if (!ctx) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = filterFreq; f.Q.value = q;
  const g = ctx.createGain();
  env(g, t0, 0.003, peak, dur);
  src.connect(f); f.connect(g); g.connect(dest || sfxBus);
  src.start(t0); src.stop(t0 + dur + 0.05);
}

export const sfx = {
  whiff() { if (!ctx) return; const t = ctx.currentTime; noise(t, 0.12, 0.25, null, 2400, 'bandpass', 1.4); osc('sine', 300, t, 0.1, 0.12, null, 140); },
  punchHit(o) { if (!ctx) return; const t = ctx.currentTime; const h = o && o.heavy;
    const j = () => 0.88 + Math.random() * 0.24; // randomised variant per hit
    noise(t, h ? 0.22 : 0.14, h ? 0.7 : 0.5, null, (h ? 900 : 1400) * j(), 'lowpass');
    osc('sine', (h ? 130 : 180) * j(), t, h ? 0.2 : 0.12, h ? 0.8 : 0.55, null, 45);
    osc('square', (h ? 90 : 120) * j(), t, 0.08, 0.25, null, 40);
    osc('triangle', (h ? 65 : 90) * j(), t + 0.01, 0.1, 0.2, null, 30); }, // metallic ring layer
  hurt() { if (!ctx) return; const t = ctx.currentTime; const j = 0.88 + Math.random() * 0.24; osc('sawtooth', 220 * j, t, 0.18, 0.3, null, 90); noise(t, 0.15, 0.3, null, 700 * j); },
  ko() { if (!ctx) return; const t = ctx.currentTime; osc('sine', 160, t, 0.7, 0.7, null, 30); noise(t, 0.6, 0.5, null, 500); osc('square', 70, t + 0.1, 0.5, 0.3, null, 25); },
  perfect() { if (!ctx) return; const t = ctx.currentTime; osc('sine', 880, t, 0.12, 0.35, null, 1320); osc('sine', 1320, t + 0.08, 0.2, 0.3, null, 1760); noise(t, 0.1, 0.15, null, 6000, 'highpass'); },
  dodge() { if (!ctx) return; const t = ctx.currentTime; noise(t, 0.18, 0.3, null, 3000, 'bandpass', 2); osc('sine', 500, t, 0.15, 0.15, null, 900); },
  jump() { if (!ctx) return; const t = ctx.currentTime; osc('sine', 240, t, 0.16, 0.2, null, 620); },
  land() { if (!ctx) return; const t = ctx.currentTime; noise(t, 0.1, 0.25, null, 300); },
  cast() { if (!ctx) return; const t = ctx.currentTime; osc('sawtooth', 110, t, 0.5, 0.2, null, 440); noise(t, 0.4, 0.12, null, 2000, 'highpass'); },
  shoot() { if (!ctx) return; const t = ctx.currentTime; osc('square', 700, t, 0.14, 0.25, null, 180); noise(t, 0.1, 0.2, null, 2600, 'bandpass'); },
  slam() { if (!ctx) return; const t = ctx.currentTime; osc('sine', 90, t, 0.4, 0.9, null, 28); noise(t, 0.35, 0.6, null, 400); },
  roast() { if (!ctx) return; const t = ctx.currentTime; osc('sawtooth', 300, t, 0.3, 0.3, null, 120); osc('sawtooth', 450, t + 0.05, 0.25, 0.2, null, 200); noise(t, 0.2, 0.2, null, 1800, 'bandpass'); },
  roastwave() { if (!ctx) return; const t = ctx.currentTime; for (let i = 0; i < 3; i++) { osc('sawtooth', 220 + i * 60, t + i * 0.12, 0.3, 0.25, null, 110); noise(t + i * 0.12, 0.25, 0.25, null, 900); } },
  beam() { if (!ctx) return; const t = ctx.currentTime; osc('sawtooth', 180, t, 1.2, 0.3, null, 900); osc('square', 90, t, 1.2, 0.2, null, 450); noise(t, 1.0, 0.15, null, 3200, 'bandpass', 3); },
  beamcharge() { if (!ctx) return; const t = ctx.currentTime; osc('sine', 60, t, 0.8, 0.4, null, 600); noise(t, 0.7, 0.1, null, 5000, 'highpass'); },
  glitch() { if (!ctx) return; const t = ctx.currentTime; for (let i = 0; i < 6; i++) { osc('square', 200 + Math.random() * 1200, t + i * 0.05, 0.06, 0.22); } noise(t, 0.35, 0.3, null, 2000, 'bandpass', 6); },
  sip() { if (!ctx) return; const t = ctx.currentTime; noise(t, 0.25, 0.2, null, 1200, 'bandpass', 2); osc('sine', 600, t + 0.1, 0.2, 0.15, null, 900); },
  chaiblast() { if (!ctx) return; const t = ctx.currentTime; osc('sine', 60, t, 1.1, 1.0, null, 22); noise(t, 0.9, 0.7, null, 2400); osc('sawtooth', 523, t, 0.5, 0.25, null, 784); osc('sawtooth', 659, t + 0.08, 0.5, 0.22, null, 988); osc('sawtooth', 784, t + 0.16, 0.7, 0.25, null, 1175); duck(0.7, 1.2); },
  ultriser(key) { if (!ctx) return; const t = ctx.currentTime; const base = key === 'chai' ? 392 : key === 'claude' ? 220 : key === 'grok' ? 311 : 262;
    osc('sawtooth', base, t, 0.7, 0.3, null, base * 2); osc('sawtooth', base * 1.5, t + 0.12, 0.6, 0.25, null, base * 3); noise(t, 0.5, 0.15, null, 5200, 'highpass'); duck(0.5, 1.0); },
  slabwarn() { if (!ctx) return; const t = ctx.currentTime; osc('sine', 55, t, 0.9, 0.5, null, 40); noise(t, 0.8, 0.2, null, 300); },
  parry() { if (!ctx) return; const t = ctx.currentTime; osc('square', 1200, t, 0.08, 0.3, null, 900); osc('sine', 1800, t + 0.03, 0.12, 0.2, null, 1200); },
  denied() { if (!ctx) return; const t = ctx.currentTime; osc('square', 140, t, 0.12, 0.2, null, 100); },
  count(n) { if (!ctx) return; const t = ctx.currentTime; osc('sine', n === 'fight' ? 880 : 440, t, n === 'fight' ? 0.35 : 0.12, 0.3, null, n === 'fight' ? 1320 : 440); },
  uiClick() { if (!ctx) return; const t = ctx.currentTime; osc('sine', 700, t, 0.06, 0.15, null, 500); },
};

function bindBus() {
  const map = {
    'sfx:whiff': () => sfx.whiff(),
    'sfx:punchHit': (o) => sfx.punchHit(o),
    'sfx:kickHit': (o) => sfx.punchHit(o),
    'sfx:hurt': () => sfx.hurt(),
    'sfx:ko': () => sfx.ko(),
    'sfx:perfect': () => sfx.perfect(),
    'sfx:dodge': () => sfx.dodge(),
    'sfx:jump': () => sfx.jump(),
    'sfx:land': () => sfx.land(),
    'sfx:cast': () => sfx.cast(),
    'sfx:shoot': () => sfx.shoot(),
    'sfx:slam': () => sfx.slam(),
    'sfx:roast': () => sfx.roast(),
    'sfx:roastwave': () => sfx.roastwave(),
    'sfx:beam': () => sfx.beam(),
    'sfx:beamcharge': () => sfx.beamcharge(),
    'sfx:glitch': () => sfx.glitch(),
    'sfx:sip': () => sfx.sip(),
    'sfx:chaiblast': () => sfx.chaiblast(),
    'sfx:ultriser': (k) => sfx.ultriser(k),
    'sfx:slabwarn': () => sfx.slabwarn(),
    'sfx:parry': () => sfx.parry(),
    'ui:denied': () => sfx.denied(),
    'ui:count': (n) => sfx.count(n),
  };
  for (const k in map) bus.on(k, map[k]);
  bus.on('haptic', (ms) => {
    try { if (navigator.vibrate && window.__haptics !== false) navigator.vibrate(ms); } catch (e) {}
  });
}

// ---------------- music sequencer (dark synthwave) ----------------
const BPM = 126;
const STEP = 60 / BPM / 2; // 8ths
const BASS = [0, 0, 12, 0, 10, 0, 12, 7, 0, 0, 12, 0, 15, 12, 10, 7]; // semitone offsets from A1
const ROOT = 55; // A1
function note(freq, t, dur, type, peak, dest) { osc(type, freq, t, dur, peak, dest || musicBus); }
function musicTick() {
  if (!ctx) return;
  while (nextT < ctx.currentTime + 0.25) {
    const s = musicStep % 16;
    const t = nextT;
    // bass
    const semi = BASS[s];
    note(ROOT * Math.pow(2, semi / 12), t, STEP * 0.9, 'sawtooth', 0.30);
    note(ROOT * Math.pow(2, semi / 12) / 2, t, STEP * 0.9, 'sine', 0.35);
    // hat
    noise(t + STEP * 0.5, 0.04, s % 4 === 2 ? 0.16 : 0.08, musicBus, 8000, 'highpass');
    // kick on quarters
    if (s % 4 === 0) { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12); const g = ctx.createGain(); env(g, t, 0.003, 0.7, 0.16); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.2); }
    // pad chord every 2 bars (32 steps)
    if (musicStep % 32 === 0) {
      const chord = [0, 3, 7, 10];
      for (const ch of chord) note(ROOT * 4 * Math.pow(2, ch / 12), t, STEP * 30, 'triangle', 0.06);
    }
    // lead pluck occasionally
    if (s % 8 === 6 && Math.random() < 0.7) {
      const semi2 = [12, 15, 19, 22, 24][(Math.random() * 5) | 0];
      note(ROOT * 8 * Math.pow(2, semi2 / 12), t, STEP * 1.6, 'square', 0.08);
    }
    nextT += STEP;
    musicStep++;
  }
  // ducking
  if (duckT > 0) {
    duckT -= 0.1;
    musicBus.gain.setTargetAtTime(volumes.music * 0.5 * (1 - duckAmt), ctx.currentTime, 0.05);
  } else {
    musicBus.gain.setTargetAtTime(volumes.music * 0.5, ctx.currentTime, 0.2);
  }
}

export function startMusic() {
  if (!ctx || musicTimer) return;
  musicStep = 0; nextT = ctx.currentTime + 0.1;
  musicTimer = setInterval(musicTick, 90);
}
export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
}

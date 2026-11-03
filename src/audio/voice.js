// ============================================================
// src/audio/voice.js — voice director.
// Priority 1: pre-rendered clips assets/audio/voice/{char}_{event}_{n}.mp3
//   played through voiceBus with HP 70Hz → low-shelf +4dB@180Hz →
//   compressor → reverb send (see tools/VOICE_GENERATION.md).
// Priority 2: speechSynthesis with async getVoices() scoring
//   (hi-IN > en-IN > male en; female-name penalty). pitch 0.80–0.95,
//   rate 0.88–0.95 (never < 0.7). cancel-before-speak, one at a time,
//   per-char cooldowns, ults interrupt, subtitles for every line.
// ============================================================
import { bus } from '../core/bus.js';
import { DIALOGUE, t, UI } from '../data/dialogue.js';
import { FIGHTERS, COLORS } from '../config.js';
import { voiceBusNode, audioCtx, reverbSend, duck } from './audio.js';

const SPEAKERS = {
  you:     { name: 'YOU', color: COLORS.you, pitch: 0.95, rate: 0.95 },
  grok:    { name: 'GROK', color: COLORS.grok, pitch: 0.82, rate: 1.02 },  // raspy fast — via clip EQ
  chatgpt: { name: 'CHATGPT', color: COLORS.chatgpt, pitch: 0.88, rate: 0.90 }, // calm deep
  claude:  { name: 'CLAUDE', color: COLORS.claude, pitch: 0.80, rate: 0.88 },  // low soft
};
const COOLDOWN = 1.1;
// spec §7: prefer male-suggesting Indian/English names; penalise female-suggesting ones
const MALE_HINTS = ['madhur', 'prabhat', 'ravi', 'hemant', 'rishi', 'male', 'david', 'daniel', 'alex', 'fred', 'arvind'];
const FEMALE_HINTS = ['neerja', 'swara', 'heera', 'veena', 'kalpana', 'lekha', 'female', 'zira', 'susan', 'samantha', 'karen', 'moira', 'tessa', 'google हिन्दी'];

export class VoiceDirector {
  constructor() {
    this.manifest = {};       // file -> url
    this.buffers = {};        // file -> AudioBuffer
    this.lastLine = {};       // char+event -> last index
    this.cooldownUntil = {};
    this.current = null;      // {char, until}
    this.voices = [];
    this.voiceMode = {};      // char -> 'clip' | 'tts' | 'silent'
    this.debug = { last: null, voice: null, mode: null };
    this.enabled = true;
    this.subtitlesOn = true;
    this._loadManifest();
    this._loadVoices();
    bus.on('voice:speak', (e) => this.speak(e));
    bus.on('ult:start', () => this.interrupt());
    bus.on('sim:reset', () => { this.cooldownUntil = {}; });
  }

  async _loadManifest() {
    try {
      const r = await fetch('assets/audio/voice/manifest.json');
      if (!r.ok) throw 0;
      this.manifest = await r.json();
    } catch (e) { this.manifest = {}; }
  }

  async _loadVoices() {
    if (!('speechSynthesis' in window)) return;
    const load = () => { this.voices = speechSynthesis.getVoices() || []; };
    load();
    speechSynthesis.onvoiceschanged = load;
    // some browsers populate async
    setTimeout(load, 800);
    setTimeout(load, 2500);
  }

  pickVoice(char) {
    if (!this.voices.length) return null;
    const wantLang = char === 'you' ? 'hi' : 'en'; // AIs speak English-ish lines with Indian accent
    let best = null, bestScore = -1e9;
    for (const v of this.voices) {
      const name = v.name.toLowerCase();
      let s = 0;
      const lang = v.lang.toLowerCase();
      if (lang.startsWith('hi-in')) s += 100;        // hi-IN first
      else if (lang.startsWith('hi')) s += 85;
      else if (lang.startsWith('en-in')) s += 75;     // then en-IN
      else if (lang.startsWith('en-gb') || lang.startsWith('en-us')) s += 45; // then en-GB/en-US (male preferred below)
      else if (lang.startsWith('en')) s += 30;
      else s -= 50;
      if (FEMALE_HINTS.some(h => name.includes(h))) s -= 60;  // never the robotic female default
      if (MALE_HINTS.some(h => name.includes(h))) s += 25;
      if (v.localService) s += 5;
      if (s > bestScore) { bestScore = s; best = v; }
    }
    return best;
  }

  pickLine(char, event) {
    const set = DIALOGUE[char] && DIALOGUE[char][event];
    if (!set || !set.length) return null;
    const key = char + ':' + event;
    let i = (Math.random() * set.length) | 0;
    if (set.length > 1 && i === this.lastLine[key]) i = (i + 1) % set.length;
    this.lastLine[key] = i;
    return set[i];
  }

  async _playClip(file) {
    const AC = audioCtx();
    if (!AC) return false;
    try {
      if (!this.buffers[file]) {
        const url = this.manifest[file];
        if (!url) return false;
        const r = await fetch(url);
        if (!r.ok) return false;
        this.buffers[file] = await AC.decodeAudioData(await r.arrayBuffer());
      }
      const src = AC.createBufferSource();
      src.buffer = this.buffers[file];
      // clip EQ chain: HP 70Hz → low-shelf +4dB @180 → compressor → voiceBus (+reverb)
      const hp = AC.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 70;
      const shelf = AC.createBiquadFilter(); shelf.type = 'lowshelf'; shelf.frequency.value = 180; shelf.gain.value = 4;
      const comp = AC.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.005; comp.release.value = 0.2;
      src.connect(hp); hp.connect(shelf); shelf.connect(comp); comp.connect(voiceBusNode());
      reverbSend(comp, 0.5);
      src.start();
      return true;
    } catch (e) { return false; }
  }

  async speak(e) {
    if (!this.enabled) return;
    const char = e.char, event = e.event;
    const sp = SPEAKERS[char] || SPEAKERS.you;
    const now = performance.now() / 1000;
    if ((this.cooldownUntil[char] || 0) > now) return;
    if (e.priority) this.interrupt();
    else if (this.current && this.current.until > now) return; // one voice at a time
    const line = this.pickLine(char, event);
    if (!line) return;
    this.cooldownUntil[char] = now + COOLDOWN + line.length * 0.045;
    if (this.subtitlesOn) {
      bus.emit('ui:subtitle', { speaker: sp.name, color: sp.color, text: line, char });
    }
    duck(0.55, Math.min(2.2, 0.6 + line.length * 0.05));
    // priority 1: pre-rendered clip
    const rows = (DIALOGUE[char] && DIALOGUE[char][event]) || [];
    const idx = this.lastLine[char + ':' + event] || 0;
    const file = `${char}_${event}_${idx + 1}.mp3`;
    let played = false;
    if (this.manifest[file]) {
      this.current = { char, until: now + Math.min(4, 0.5 + line.length * 0.05) };
      played = await this._playClip(file);
      if (played) { this.voiceMode[char] = 'clip'; this.debug = { last: file, mode: 'clip', voice: 'prerendered', line }; return; }
    }
    // priority 2: speechSynthesis fallback (silent on failure)
    this.voiceMode[char] = 'tts';
    this.debug = { last: null, mode: 'tts', voice: this.pickVoice(char) ? this.pickVoice(char).name : 'default', line };
    if ('speechSynthesis' in window) {
      try {
        speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(line);
        const v = this.pickVoice(char);
        if (v) u.voice = v;
        u.pitch = sp.pitch;         // 0.80–0.95, never < 0.7
        u.rate = Math.min(sp.rate, 0.95); // 0.88–0.95
        u.volume = 1;
        this.current = { char, until: now + Math.min(4, line.length * 0.055) };
        speechSynthesis.speak(u);
      } catch (err) { /* silent fallback */ }
    }
  }

  interrupt() {
    try { if ('speechSynthesis' in window) speechSynthesis.cancel(); } catch (e) {}
    this.current = null;
  }
}

export const voice = new VoiceDirector();

// ============================================================
// src/main.js — boot + state machine + fixed-step loop.
// BOOT → MENU → VS_INTRO → COUNTDOWN → FIGHT → (ULT) → RESULT.
// Fixed 60Hz sim decoupled from render; pause on visibilitychange;
// quality manager; debug overlay (?debug=1); wake lock; fullscreen;
// PWA install; share card; error toasts.
// ============================================================
import { SIM_DT, QUALITY, VERSION, FIGHTERS } from './config.js';
import { bus } from './core/bus.js';
import { initErrorHandling } from './core/errors.js';
import { storage } from './core/storage.js';
import { setLang, getLang, tr } from './core/i18n.js';
import { quality } from './core/quality.js';
import { t } from './data/dialogue.js';
import { resetMatch, stepSim, sim, setAxis, press, livingAIs } from './game/sim.js';
import { updateAI } from './game/ai.js';
import { Renderer3D, webglAvailable } from './render/renderer3d.js';
import { Renderer2D } from './render/canvas2d.js';
import { buildArena } from './render/arena.js';
import { RigManager } from './render/rigs.js';
import { FX3D } from './render/fx3d.js';
import { HUD } from './ui/hud.js';
import { Controls } from './ui/controls.js';
import { Screens, scoreFor, gradeFor } from './ui/screens.js';
import { Tutorial } from './ui/tutorial.js';
import { icon } from './ui/icons.js';
import { initAudio, setVolumes, startMusic, stopMusic, sfx, audioReady } from './audio/audio.js';
import { voice } from './audio/voice.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const DEBUG = params.get('debug') === '1';

const settings = storage.getSettings();
let renderer, arena, rigs, fx, hud, controls, screens, tutorial;
let running = false, paused = false;
let acc = 0, lastT = 0, frameCount = 0, benchFps = [];
let appState = 'BOOT'; // BOOT MENU VS COUNTDOWN FIGHT RESULT
let resultAt = 0, chaiReadyAnnounced = false;
let wakeLock = null;
let deferredPrompt = null;

// ---------------- boot ----------------
async function boot() {
  initErrorHandling();
  setLang(settings.lang);
  document.body.classList.toggle('cb', !!settings.colourblind);
  document.body.classList.toggle('reduceMotion', !!settings.reduceMotion);
  document.body.classList.toggle('leftHanded', !!settings.leftHanded);
  window.__haptics = settings.haptics;

  screens = new Screens({
    bus, storage, settings, cbs: {
      onPlay: (diff) => startMatch(diff),
      onResume: () => togglePause(false),
      onRestart: () => startMatch(sim.diffKey),
      onQuitToMenu: () => toMenu(),
      onTutorial: () => { if (!tutorial.startIfNeeded()) { /* already seen: quick replay */ tutorial.startIfNeeded() || forceTutorial(); } },
      onInstall: () => { if (deferredPrompt) { deferredPrompt.prompt(); } },
      onShare: () => shareResult(),
      onSettings: () => applySettings(),
      onSkipVS: () => { clearTimeout(startMatch._t); if (appState === 'VS') { sim.state = 'countdown'; appState = 'COUNTDOWN'; controls.setEnabled(true); acquireWakeLock(); if (!tutorial.startIfNeeded()) screens.toast(tr('mission')); } },
    },
  });
  screens.setLoading(8);

  // renderer (3D or 2D fallback)
  const canvas = $('gameCanvas');
  const use3D = webglAvailable();
  if (use3D) {
    try {
      renderer = new Renderer3D(canvas);
    } catch (e) {
      console.error('WebGL init failed, falling back', e);
      renderer = new Renderer2D(canvas);
    }
  } else {
    renderer = new Renderer2D(canvas);
  }
  if (renderer instanceof Renderer2D) screens.toast(tr('webglFallback'));
  screens.setLoading(30);

  if (use3D && renderer instanceof Renderer3D) {
    arena = buildArena(renderer.scene);
    renderer.setSun(arena.sun);
    rigs = new RigManager(renderer.scene);
  }
  // sim in menu state with fighters posed
  resetMatch('medium');
  sim.state = 'menu';
  if (rigs) rigs.buildAll(Object.values(FIGHTERS));
  screens.setLoading(45);

  fx = use3D && renderer instanceof Renderer3D ? new FX3D(renderer.scene, renderer) : null;
  if (fx) fx.bindBus(bus, sim, rigs);
  if (fx) fx.ensurePools(sim, QUALITY.HIGH);

  hud = new HUD(bus, settings);
  hud.setLangRef(getLang);
  controls = new Controls($('touchLayer'), (action, phase) => {
    if (phase === 'down') {
      bus.emit('input:action', action);
      if (appState === 'FIGHT' && !paused) press(action);
      if (action === 'pause') togglePause();
    }
  });
  controls.setButtonSize(Math.round(64 * settings.buttonSize));
  controls.refreshLabels();

  tutorial = new Tutorial(bus, storage, () => {});
  screens.setLoading(60);

  // quality manager
  quality.setApplier((tier, def) => {
    if (renderer.applyQuality) renderer.applyQuality(tier, def);
    if (fx && fx.setQuality) fx.setQuality(def);
    if (fx && fx.ensurePools) fx.ensurePools(sim, def);
    if (DEBUG) console.log('[quality]', tier, JSON.stringify(def));
  });
  quality.setMode(settings.quality || 'auto');
  if (quality.mode === 'auto') quality.apply(); // start HIGH, benchmark will adjust
  else quality.apply();

  // audio lazy on first gesture
  const gesture = () => {
    initAudio();
    setVolumes(settings);
    startMusic();
    window.removeEventListener('pointerdown', gesture);
    window.removeEventListener('keydown', gesture);
  };
  window.addEventListener('pointerdown', gesture);
  window.addEventListener('keydown', gesture);

  bindGlobal();
  screens.refreshLang();
  screens.showMenu();
  screens.setLoading(100);
  setTimeout(() => screens.showMenu(), 350);

  window.addEventListener('resize', () => { renderer.resize(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && (appState === 'FIGHT' || appState === 'COUNTDOWN')) togglePause(true);
    else if (!document.hidden && paused && appState !== 'MENU') { /* stay paused until user resumes */ }
  });

  // PWA
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    $('btnInstall').classList.remove('hidden');
  });

  lastT = performance.now();
  running = true;
  requestAnimationFrame(loop);
  if (DEBUG) $('debug').classList.remove('hidden');
}

function forceTutorial() {
  // replay: clear flag then start
  storage.setTutorialSeen();
  // re-create to allow replay
  tutorial = new Tutorial(bus, { tutorialSeen: () => false, setTutorialSeen: () => {} }, () => {});
  tutorial.startIfNeeded();
}

// ---------------- state machine ----------------
function toMenu() {
  appState = 'MENU';
  resetMatch(sim.diffKey || 'medium');
  sim.state = 'menu';
  controls.setEnabled(false);
  hud.hide();
  screens.showMenu();
  stopUltVisuals();
  releaseWakeLock();
  startMusic();
}

function startMatch(diffKey) {
  stopMusic();
  resetMatch(diffKey);
  sim.state = 'vs';
  appState = 'VS';
  chaiReadyAnnounced = false;
  screens.showVS(diffKey);
  hud.buildCards(sim, getLang());
  hud.show();
  voice.interrupt();
  // VS intro 2.5s, skippable
  clearTimeout(startMatch._t);
  startMatch._t = setTimeout(() => {
    if (appState !== 'VS') return;
    sim.state = 'countdown';
    appState = 'COUNTDOWN';
    controls.setEnabled(true);
    acquireWakeLock();
    const tut = tutorial.startIfNeeded();
    if (!tut) screens.toast(tr('mission'));
  }, 2500);
}

function onSimStateChange() {
  if (sim.state === 'result' && appState === 'FIGHT') {
    appState = 'RESULT';
    resultAt = performance.now();
    controls.setEnabled(false);
    releaseWakeLock();
    setTimeout(() => showResult(), 1400);
  }
}

function showResult() {
  if (appState !== 'RESULT') return;
  const win = sim.result.win;
  const hpPct = sim.player.alive ? sim.player.hp / sim.player.maxHp : 0;
  const score = scoreFor(win, sim.stats, hpPct);
  const grade = gradeFor(win, sim.stats, hpPct);
  const prev = storage.getBest();
  const isNewBest = !prev || score > prev.score;
  const best = prev || { score: 0, wins: 0, losses: 0, draws: 0 };
  if (isNewBest || !prev) {
    best.score = Math.max(best.score, score);
    if (win) best.wins = (best.wins || 0) + 1;
    else if (sim.result.how === 'draw') best.draws = (best.draws || 0) + 1;
    else best.losses = (best.losses || 0) + 1;
    storage.saveBest(best);
  } else if (win) { best.wins = (best.wins || 0) + 1; storage.saveBest(best); }
  else if (sim.result.how === 'draw') { best.draws = (best.draws || 0) + 1; storage.saveBest(best); }
  else { best.losses = (best.losses || 0) + 1; storage.saveBest(best); }
  screens.showResult(sim.result, sim, score, grade, best, isNewBest);
  startMusic();
}

async function shareResult() {
  const win = sim.result ? sim.result.win : false;
  const hpPct = sim.player.alive ? sim.player.hp / sim.player.maxHp : 0;
  const score = scoreFor(win, sim.stats, hpPct);
  const grade = gradeFor(win, sim.stats, hpPct);
  const blob = await screens.drawShareCard({ win, score, grade, stats: sim.stats, diffKey: sim.diffKey });
  if (!blob) return;
  const file = new File([blob], 'human-vs-ai-score.png', { type: 'image/png' });
  try {
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'HUMAN vs AI — Overlord Arena', text: `Score ${score} (${grade}) — ${tr('ctaButton')}` });
      return;
    }
  } catch (e) { /* fall through to download */ }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'human-vs-ai-score.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

// ---------------- pause / wake lock / fullscreen ----------------
function togglePause(force) {
  if (appState !== 'FIGHT' && appState !== 'COUNTDOWN' && appState !== 'VS') return;
  paused = force === undefined ? !paused : force;
  if (paused) { screens.showPause(); stopMusic(); }
  else { screens.hidePause(); startMusic(); lastT = performance.now(); }
}
async function acquireWakeLock() {
  try {
    if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen');
  } catch (e) {}
}
function releaseWakeLock() {
  try { if (wakeLock) { wakeLock.release(); wakeLock = null; } } catch (e) {}
}
function toggleFullscreen() {
  try {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  } catch (e) {}
}

function stopUltVisuals() {
  // hide fx leftovers on menu
  if (fx) { fx.beam.visible = false; fx.holoRings.visible = false; fx.spiral.visible = false; fx.teacup.visible = false; fx.slab.visible = false; fx.shock.visible = false; }
}

// ---------------- global bindings ----------------
function bindGlobal() {
  $('btnFull').innerHTML = icon('full');
  $('btnUlt').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    bus.emit('input:action', 'ult');
    if (appState === 'FIGHT' && !paused) press('ult');
  });
  $('loadEmblem').innerHTML = icon('emblemYou');
  $('vsYouEmblem').innerHTML = icon('emblemYou');
  $('btnPause').onclick = () => togglePause();
  $('btnFull').onclick = () => toggleFullscreen();
  $('btnSound').onclick = () => {
    settings.muted = !settings.muted;
    $('btnSound').innerHTML = icon(settings.muted ? 'mute' : 'sound');
    if (audioReady()) setVolumes({ master: settings.muted ? 0 : settings.master });
    sfx.uiClick();
  };
  bus.on('ui:lang', () => {
    controls.refreshLabels();
    if (sim.state !== 'menu') hud.buildCards(sim, getLang());
  });
  bus.on('ui:chaiReady', () => {
    if (!chaiReadyAnnounced && sim.player.chai >= 100) {
      chaiReadyAnnounced = true;
      hud.banner(tr('chaiReady'), '#FFC24A', 1400);
      sfx.perfect();
    }
    if (sim.player.chai < 100) chaiReadyAnnounced = false;
  });
  bus.on('ui:quality', () => {});
  bus.on('haptic', () => {});
  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') togglePause();
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
  });
  // settings changes applied live
  bus.on('ui:settings', applySettings);
  // first-frame gesture for audio is bound in boot
  window.addEventListener('pointerdown', () => { if (audioReady()) setVolumes(settings); }, { once: true });
}

function applySettings() {
  storage.saveSettings(settings);
  setLang(settings.lang);
  setVolumes(settings);
  if (audioReady()) setVolumes({ master: settings.muted ? 0 : settings.master });
  document.body.classList.toggle('cb', !!settings.colourblind);
  document.body.classList.toggle('reduceMotion', !!settings.reduceMotion);
  document.body.classList.toggle('leftHanded', !!settings.leftHanded);
  window.__haptics = settings.haptics;
  controls.setButtonSize(Math.round(64 * settings.buttonSize));
  quality.setMode(settings.quality || 'auto');
  voice.subtitlesOn = settings.subtitles !== false;
  voice.enabled = settings.voice > 0.02;
}

// wrap cbs.onSettings to also apply
// ---------------- main loop ----------------
function loop(now) {
  if (!running) return;
  requestAnimationFrame(loop);
  let dt = (now - lastT) / 1000;
  lastT = now;
  if (dt > 0.25) dt = 0.25;
  frameCount++;

  // benchmark: after 90 frames, sample fps
  if (frameCount === 90 && quality.mode === 'auto' && !quality.benchmarkDone) {
    const fps = frameCount / ((now - bootT) / 1000);
    quality.benchmark(fps);
  }
  quality.tick(dt);

  // fixed-step sim
  if (!paused && (appState === 'COUNTDOWN' || appState === 'FIGHT' || appState === 'RESULT')) {
    if (appState === 'FIGHT' || appState === 'COUNTDOWN') {
      setAxis(controls.poll());
      if (Math.abs(controls.poll()) > 0.2) tutorial.onMove();
    }
    acc += dt;
    let n = 0;
    while (acc >= SIM_DT && n < 5) {
      if (appState === 'FIGHT' || appState === 'COUNTDOWN' || appState === 'RESULT') {
        stepSim(SIM_DT);
        // AI only in fight
        if (appState === 'FIGHT') for (const f of sim.fighters) if (!f.isPlayer && f.alive) updateAI(sim, f, SIM_DT);
      }
      acc -= SIM_DT; n++;
    }
    if (n === 5) acc = 0; // drop backlog after hitches
    onSimStateChange();
  }

  // menu background drift
  const t = now / 1000;
  if (appState === 'MENU' || appState === 'BOOT') {
    renderer.updateCamera(sim, dt, t);
    // slow dolly
    renderer.camX += Math.sin(t * 0.1) * dt * 0.4;
  } else {
    renderer.updateCamera(sim, dt, t);
  }
  if (arena) arena.update(t, dt, renderer.camX);
  if (rigs) rigs.sync(sim, t, settings.reduceMotion ? dt * 0.2 : dt);
  if (fx) {
    fx.ensurePools(sim, quality.get().def);
    fx.sync(sim, t, settings.reduceMotion ? dt * 0.3 : dt);
  }
  if (renderer.render) renderer.render(dt, t);
  if (hud && (appState === 'FIGHT' || appState === 'COUNTDOWN' || appState === 'RESULT')) {
    hud.update(sim, dt, renderer, getLang());
  }
  if (DEBUG) updateDebug(dt);
}

let bootT = performance.now();

function updateDebug(dt) {
  const el = $('debug');
  const q = quality.get();
  el.innerHTML = [
    `v${VERSION}`,
    `fps ${Math.round(1 / Math.max(dt, 1e-4))} (ema ${q.emaFps})`,
    `draw ${renderer.drawCalls || 0} / 150`,
    `tier ${q.tier}${q.mode === 'auto' ? '' : ' (manual)'}`,
    `state ${appState}/${sim.state}`,
    `t ${sim.time.toFixed(1)}s left ${Math.ceil(sim.timeLeft)}`,
    `voice ${voice.debug.mode || '-'}:${voice.debug.voice || '-'}`,
    `ult ${sim.ult ? sim.ult.key + ':' + sim.ult.phase : '-'}`,
    `you hp ${Math.round(sim.player.hp)} chai ${Math.round(sim.player.chai)}`,
  ].join('<br>');
}

// expose for debug console
window.__game = { sim, bus, quality, settings, get renderer() { return renderer; } };

boot().catch((e) => {
  console.error(e);
  const el = $('loadPct');
  if (el) el.textContent = 'Error: ' + (e.message || e);
});

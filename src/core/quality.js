// Auto quality tiers: short benchmark at boot + rolling FPS monitor.
// Steps down if avg FPS < threshold for a window. Manual override via settings.
import { QUALITY } from '../config.js';
import { bus } from './bus.js';

export class QualityManager {
  constructor() {
    this.tier = 'HIGH';            // current applied tier key
    this.mode = 'auto';            // 'auto' | tier key (manual)
    this.emaFps = 60;
    this.lowSince = 0;
    this.benchmarkDone = false;
    this.applyFn = null;           // set by renderer: (tierKey, def) => void
    this.onTier = null;
  }
  setApplier(fn) { this.applyFn = fn; }
  setMode(mode) {
    this.mode = mode;
    if (mode !== 'auto') { this.tier = mode; this.apply(); }
    bus.emit('ui:quality', this.get());
  }
  // called once after renderer boots: measure ~1s of frames
  benchmark(sampleFps) {
    this.benchmarkDone = true;
    if (this.mode !== 'auto') return;
    if (sampleFps >= 55) this.tier = 'HIGH';
    else if (sampleFps >= 38) this.tier = 'MED';
    else this.tier = 'LOW';
    this.apply();
  }
  // called every frame with real dt
  tick(dt) {
    if (this.mode !== 'auto' || !this.benchmarkDone) return;
    const fps = 1 / Math.max(dt, 1e-4);
    this.emaFps += (fps - this.emaFps) * 0.05;
    if (this.emaFps < QUALITY.fpsStepDown) {
      if (!this.lowSince) this.lowSince = performance.now();
      else if (performance.now() - this.lowSince > QUALITY.fpsStepWindow * 1000) {
        this.lowSince = 0;
        const order = QUALITY.tiers;
        const i = order.indexOf(this.tier);
        if (i < order.length - 1) { this.tier = order[i + 1]; this.apply(); }
      }
    } else this.lowSince = 0;
  }
  apply() {
    const def = QUALITY[this.tier];
    if (this.applyFn) this.applyFn(this.tier, def);
    if (this.onTier) this.onTier(this.tier, def);
    bus.emit('ui:quality', this.get());
  }
  get() { return { mode: this.mode, tier: this.tier, def: QUALITY[this.tier], emaFps: Math.round(this.emaFps) }; }
}
export const quality = new QualityManager();

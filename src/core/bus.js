// Tiny event bus. Events are low-frequency (hits, ults, UI) — never per-frame hot path.
export class Bus {
  constructor() { this.map = new Map(); }
  on(evt, fn) {
    let l = this.map.get(evt);
    if (!l) { l = []; this.map.set(evt, l); }
    l.push(fn);
    return () => this.off(evt, fn);
  }
  off(evt, fn) {
    const l = this.map.get(evt);
    if (l) { const i = l.indexOf(fn); if (i >= 0) l.splice(i, 1); }
  }
  emit(evt, a, b, c) {
    const l = this.map.get(evt);
    if (!l) return;
    for (let i = 0; i < l.length; i++) {
      try { l[i](a, b, c); } catch (e) { console.error('[bus]', evt, e); }
    }
  }
}
export const bus = new Bus();

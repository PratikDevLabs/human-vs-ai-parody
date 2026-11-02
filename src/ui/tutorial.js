// ============================================================
// src/ui/tutorial.js — 30s skippable first-run tutorial (once, stored).
// Steps advance on real inputs; a global 30s cap ends it. Highlight box
// points at the relevant control.
// ============================================================
import { tr } from '../core/i18n.js';
import { icon } from './icons.js';

const $ = (id) => document.getElementById(id);

const STEPS = [
  { key: 'tut_1', wait: 'move', target: '#stickBase', timeout: 6 },
  { key: 'tut_2', wait: 'punch', target: '#btn_punch', timeout: 6 },
  { key: 'tut_3', wait: 'dodge', target: '#btn_dodge', timeout: 8 },
  { key: 'tut_4', wait: 'ult', target: '#btn_ult', timeout: 8 },
  { key: 'tut_5', wait: null, target: null, timeout: 5 },
  { key: 'tut_6', wait: null, target: null, timeout: 5 },
];

export class Tutorial {
  constructor(bus, storage, onDone) {
    this.bus = bus; this.storage = storage; this.onDone = onDone;
    this.el = $('tutorial');
    this.txt = $('tutText');
    this.box = $('tutBox');
    this.idx = 0;
    this.active = false;
    this._t0 = 0;
    $('tutSkip').innerHTML = icon('close') + `<span>${tr('tutorialSkip')}</span>`;
    $('tutNext').innerHTML = `<span>${tr('tutorialNext')}</span>`;
    $('tutSkip').onclick = () => this.end();
    $('tutNext').onclick = () => this.next();
    bus.on('input:action', (a) => { if (this.active) this._onAction(a); });
    bus.on('ui:lang', () => { if (this.active) this._render(); });
  }

  startIfNeeded() {
    if (this.storage.tutorialSeen()) return false;
    this.active = true;
    this.idx = 0;
    this._t0 = performance.now();
    this.el.classList.remove('hidden');
    document.body.classList.add('tutorialOn');
    this._render();
    this._timer = setInterval(() => {
      if (!this.active) return;
      const s = STEPS[this.idx];
      if (s && s.timeout && performance.now() - this._stepT > s.timeout * 1000) this.next();
      if (performance.now() - this._t0 > 30000) this.end();
    }, 250);
    return true;
  }

  _render() {
    const s = STEPS[this.idx];
    if (!s) return this.end();
    this.txt.textContent = tr(s.key);
    this._stepT = performance.now();
    const tgt = s.target && $(s.target.slice(1));
    if (tgt) {
      const r = tgt.getBoundingClientRect();
      this.box.classList.remove('hidden');
      this.box.style.left = (r.left - 10) + 'px';
      this.box.style.top = (r.top - 10) + 'px';
      this.box.style.width = (r.width + 20) + 'px';
      this.box.style.height = (r.height + 20) + 'px';
    } else {
      this.box.classList.add('hidden');
    }
  }

  _onAction(a) {
    const s = STEPS[this.idx];
    if (s && s.wait === a) this.next();
    else if (s && s.wait === 'move' && Math.abs(a) > 0) this.next();
  }
  onMove() { if (this.active) this._onAction('move'); }

  next() {
    this.idx++;
    if (this.idx >= STEPS.length) this.end();
    else this._render();
  }

  end() {
    if (!this.active) return;
    this.active = false;
    this.el.classList.add('hidden');
    document.body.classList.remove('tutorialOn');
    this.box.classList.add('hidden');
    clearInterval(this._timer);
    this.storage.setTutorialSeen();
    this.onDone && this.onDone();
  }
}

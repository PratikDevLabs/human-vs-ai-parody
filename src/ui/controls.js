// ============================================================
// src/ui/controls.js — keyboard + multitouch. Dynamic joystick where
// the thumb lands, ≥56px action buttons, left-handed swap, button
// size setting. Feeds a plain input object consumed by main.js.
// ============================================================
import { icon } from './icons.js';
import { tr } from '../core/i18n.js';

export class Controls {
  constructor(layerEl, onAction) {
    this.layer = layerEl;
    this.onAction = onAction; // (action, phase) phase: 'down'|'up'
    this.axis = 0;
    this.keys = {};
    this.stick = null; // {id, ox, oy, dx, dy, el, nub}
    this.enabled = false;
    this._buildButtons();
    this._bindKeys();
    this._bindTouch();
  }

  _buildButtons() {
    const mk = (id, iconName, label) => {
      const b = document.createElement('button');
      b.className = 'abtn';
      b.id = 'btn_' + id;
      b.innerHTML = icon(iconName) + `<span class="albl">${label}</span>`;
      b.dataset.act = id;
      this.layer.appendChild(b);
      return b;
    };
    this.btns = {
      punch: mk('punch', 'punch', 'PUNCH'),
      kick: mk('kick', 'kick', 'KICK'),
      jump: mk('jump', 'jump', 'JUMP'),
      dodge: mk('dodge', 'dodge', 'DODGE'),
      ult: mk('ult', 'chai', 'ULT'),
    };
    // joystick visuals
    this.stickBase = document.createElement('div');
    this.stickBase.id = 'stickBase';
    this.stickNub = document.createElement('div');
    this.stickNub.id = 'stickNub';
    this.stickBase.appendChild(this.stickNub);
    this.stickBase.classList.add('hidden');
    this.layer.appendChild(this.stickBase);
    this.layer.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  _bindKeys() {
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      this.keys[k] = true;
      if (!this.enabled) return;
      const map = {
        a: ['axis', -1], d: ['axis', 1], arrowleft: ['axis', -1], arrowright: ['axis', 1],
        j: 'punch', z: 'punch', x: 'kick', k: 'kick', ' ': 'jump', arrowup: 'jump', w: 'jump',
        s: 'dodge', arrowdown: 'dodge', l: 'dodge', c: 'ult', v: 'ult', q: 'ult',
      };
      const m = map[k];
      if (m) {
        if (m[0] === 'axis') this._keyAxis = m[1];
        else this.onAction(m[0] === 'axis' ? m[0] : m, 'down');
        e.preventDefault();
      }
    });
    window.addEventListener('keyup', (e) => {
      const k = e.key.toLowerCase();
      this.keys[k] = false;
      if ((k === 'a' || k === 'arrowleft') && this._keyAxis === -1) this._keyAxis = this.keys['d'] || this.keys['arrowright'] ? 1 : 0;
      if ((k === 'd' || k === 'arrowright') && this._keyAxis === 1) this._keyAxis = this.keys['a'] || this.keys['arrowleft'] ? -1 : 0;
      const map = { j: 'punch', z: 'punch', x: 'kick', k: 'kick', ' ': 'jump', arrowup: 'jump', w: 'jump', s: 'dodge', arrowdown: 'dodge', l: 'dodge', c: 'ult', v: 'ult', q: 'ult' };
      if (this.enabled && map[k]) this.onAction(map[k], 'up');
    });
  }

  _bindTouch() {
    const L = this.layer;
    L.addEventListener('pointerdown', (e) => {
      if (!this.enabled) return;
      e.preventDefault();
      const t = e.target;
      const btn = t.closest && t.closest('.abtn');
      if (btn) {
        btn.classList.add('on');
        btn.setPointerCapture && e.pointerId !== undefined && btn.setPointerCapture(e.pointerId);
        this.onAction(btn.dataset.act, 'down');
        return;
      }
      // joystick: pointer lands on the move half of the screen
      const rect = L.getBoundingClientRect();
      const leftHanded = document.body.classList.contains('leftHanded');
      const moveHalfIsLeft = !leftHanded;
      const isLeft = (e.clientX - rect.left) < rect.width * 0.55;
      if (isLeft === moveHalfIsLeft && !this.stick) {
        this.stick = { id: e.pointerId, ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 };
        this.stickBase.classList.remove('hidden');
        this.stickBase.style.left = (e.clientX - rect.left) + 'px';
        this.stickBase.style.top = (e.clientY - rect.top) + 'px';
        this._stickRect = rect;
        L.setPointerCapture && L.setPointerCapture(e.pointerId);
      }
    }, { passive: false });

    L.addEventListener('pointermove', (e) => {
      if (!this.enabled || !this.stick || e.pointerId !== this.stick.id) return;
      e.preventDefault();
      const dx = e.clientX - this.stick.ox, dy = e.clientY - this.stick.oy;
      const max = 52;
      const len = Math.hypot(dx, dy) || 1;
      const cl = Math.min(len, max);
      this.stick.dx = (dx / len) * cl; this.stick.dy = (dy / len) * cl;
      this.stickNub.style.transform = `translate(${this.stick.dx}px, ${this.stick.dy}px)`;
      this.axis = Math.abs(this.stick.dx) > 10 ? this.stick.dx / max : 0;
      // swipe up = jump
      if (dy < -max * 0.9 && !this.stick.jumped) { this.stick.jumped = true; this.onAction('jump', 'down'); }
    }, { passive: false });

    const end = (e) => {
      const btn = e.target.closest && e.target.closest('.abtn');
      if (btn && btn.classList.contains('on')) {
        btn.classList.remove('on');
        this.onAction(btn.dataset.act, 'up');
      }
      if (this.stick && e.pointerId === this.stick.id) {
        this.stick = null;
        this.axis = this._keyAxis || 0;
        this.stickBase.classList.add('hidden');
        this.stickNub.style.transform = 'translate(0,0)';
      }
    };
    L.addEventListener('pointerup', end);
    L.addEventListener('pointercancel', end);
    L.addEventListener('lostpointercapture', end);
  }

  setEnabled(v) {
    this.enabled = v;
    this.layer.classList.toggle('hidden', !v);
    if (!v) {
      this.axis = 0; this._keyAxis = 0;
      if (this.stick) { this.stick = null; this.stickBase.classList.add('hidden'); }
      for (const k in this.btns) this.btns[k].classList.remove('on');
    }
  }

  // called each frame by main
  poll() {
    if (this.stick) return this.axis;
    let a = this._keyAxis || 0;
    if (this.keys['a'] || this.keys['arrowleft']) a = -1;
    if (this.keys['d'] || this.keys['arrowright']) a = 1;
    return a;
  }

  refreshLabels() {
    const map = { punch: tr('kb_punch'), kick: tr('kb_kick'), jump: tr('kb_jump'), dodge: tr('kb_dodge'), ult: tr('kb_ult') };
    for (const k in this.btns) {
      const lbl = this.btns[k].querySelector('.albl');
      if (lbl) lbl.textContent = map[k];
    }
  }

  setButtonSize(px) {
    this.layer.style.setProperty('--abtn', px + 'px');
  }
}

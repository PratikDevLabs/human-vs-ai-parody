// ============================================================
// src/render/canvas2d.js — reduced Canvas2D fallback when WebGL is
// unavailable. Same public surface as Renderer3D so main.js can swap
// transparently. Simplified but fully playable: skyline, floor grid,
// telegraph zones, fighters, projectiles, particles, HP bars.
// ============================================================
import { ARENA } from '../config.js';

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export class Renderer2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.width = 1; this.height = 1;
    this.camX = 0;
    this.parts = []; // {x,y,vx,vy,life,color}
    this.t = 0;
    this.skyline = [];
    for (let i = 0; i < 40; i++) this.skyline.push({ x: -50 + i * 2.6, w: 2 + Math.random() * 2, h: 3 + Math.random() * 9 });
    this.resize();
  }
  resize() {
    this.width = window.innerWidth; this.height = window.innerHeight;
    this.canvas.width = this.width; this.canvas.height = this.height;
  }
  applyQuality() {}
  updateCamera(sim, dt) {
    let minX = 0, maxX = 0, n = 0;
    for (const f of sim.fighters) {
      if (!f.alive) continue;
      if (n === 0) { minX = maxX = f.x; } else { minX = Math.min(minX, f.x); maxX = Math.max(maxX, f.x); }
      n++;
    }
    this.camX += (((minX + maxX) / 2) * 0.55 - this.camX) * Math.min(1, dt * 3);
  }
  project(x, y, z, out) {
    const k = 90; // px per world unit at z=0
    out.x = this.width / 2 + (x - this.camX) * k;
    out.y = this.height * 0.72 - y * k;
    out.behind = false;
    return out;
  }
  setCA() {} setDistortion() {} flash() {} bloomSpikeFx() {} tint() {}
  get drawCalls() { return 40; }
  burst(x, y, z, color, n, spd) {
    for (let i = 0; i < n; i++) {
      if (this.parts.length > 220) this.parts.shift();
      const a = Math.random() * Math.PI * 2;
      this.parts.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd * 0.7 + spd * 0.4, life: 0.5, color });
    }
  }

  render(sim, t, dt) {
    this.t = t;
    const g = this.g, W = this.width, H = this.height;
    const k = 90, horizon = H * 0.72;
    const X = (x) => W / 2 + (x - this.camX) * k;
    const Y = (y) => horizon - y * k;

    // sky
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, '#07060f'); sky.addColorStop(0.7, '#141033'); sky.addColorStop(1, '#241a4d');
    g.fillStyle = sky; g.fillRect(0, 0, W, horizon);
    // moon
    g.fillStyle = '#ffd68c';
    g.beginPath(); g.arc(W * 0.78, H * 0.16, 34, 0, 7); g.fill();
    g.fillStyle = 'rgba(255,150,80,0.25)';
    g.beginPath(); g.arc(W * 0.78, H * 0.16, 52, 0, 7); g.fill();
    // stars
    g.fillStyle = 'rgba(205,216,255,0.7)';
    for (let i = 0; i < 60; i++) {
      const sx = ((i * 197.3) % W), sy = ((i * 89.7) % (horizon * 0.8));
      g.fillRect(sx, sy, 2, 2);
    }
    // far skyline
    g.fillStyle = '#0d0a22';
    for (const b of this.skyline) g.fillRect(X(b.x) - b.w * k / 2, Y(b.h), b.w * k, b.h * k);
    // mid buildings + windows
    for (let i = 0; i < 12; i++) {
      const bx = -40 + i * 7, bh = 4 + ((i * 37) % 8);
      g.fillStyle = '#141130';
      g.fillRect(X(bx), Y(bh), 4.6 * k, bh * k);
      g.fillStyle = 'rgba(255,194,74,0.5)';
      for (let wy = 0; wy < bh * k; wy += 14) {
        if ((i * 13 + wy) % 3 === 0) g.fillRect(X(bx) + 6, Y(bh) + wy + 5, 7, 9);
      }
    }
    // floor
    const fl = g.createLinearGradient(0, horizon, 0, H);
    fl.addColorStop(0, '#131034'); fl.addColorStop(1, '#07060f');
    g.fillStyle = fl; g.fillRect(0, horizon, W, H - horizon);
    g.strokeStyle = 'rgba(39,230,255,0.25)'; g.lineWidth = 1;
    for (let i = -14; i <= 14; i++) {
      g.beginPath(); g.moveTo(W / 2 + i * 26 - this.camX * k * 0.3, horizon); g.lineTo(W / 2 + i * 90 - this.camX * k * 0.3, H); g.stroke();
    }
    for (let i = 1; i < 8; i++) {
      const y = horizon + Math.pow(i / 8, 1.7) * (H - horizon);
      g.strokeStyle = `rgba(39,230,255,${0.08 + i * 0.03})`;
      g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
    }
    // arena rails
    g.fillStyle = 'rgba(39,230,255,0.6)';
    g.fillRect(X(-ARENA.width / 2) - 2, horizon - 4, 4, 6);
    g.fillRect(X(ARENA.width / 2) - 2, horizon - 4, 4, 6);

    // telegraph zones
    for (const z of sim.zones) {
      if (!z.alive) continue;
      const prog = z.dur > 0 ? z.t / z.dur : 1;
      g.strokeStyle = z.color; g.globalAlpha = 0.4 + prog * 0.5;
      g.lineWidth = 3;
      const rx = z.r * k, rz = z.kind === 'lane' ? z.r * 4 * k : z.r * k * 0.5;
      g.beginPath(); g.ellipse(X(z.x), Y(0.02), rx, Math.max(6, rz * 0.35), 0, 0, 7); g.stroke();
      if (z.kind === 'slabshadow') {
        g.globalAlpha = 0.4; g.fillStyle = '#000';
        g.beginPath(); g.ellipse(X(z.x), Y(0.02), rx, Math.max(8, rz * 0.35), 0, 0, 7); g.fill();
      }
      g.globalAlpha = 1;
    }

    // slabs
    for (const s of sim.slabs) {
      if (!s.alive) continue;
      g.save();
      g.translate(X(s.x), Y(s.y + s.h / 2));
      g.fillStyle = 'rgba(240,255,248,0.92)';
      g.strokeStyle = '#dc2626'; g.lineWidth = 3;
      g.fillRect(-s.w * k / 2, -s.h * k / 2, s.w * k, s.h * k);
      g.strokeRect(-s.w * k / 2, -s.h * k / 2, s.w * k, s.h * k);
      g.fillStyle = '#065f46'; g.font = `700 ${Math.max(10, 0.5 * k)}px Georgia`;
      g.textAlign = 'center'; g.fillText('ESSAY', 0, -s.h * k / 4);
      g.fillStyle = '#dc2626'; g.font = `800 ${Math.max(12, 0.62 * k)}px Georgia`;
      g.fillText('YOU LOSE', 0, s.h * k / 4);
      g.restore();
    }

    // projectiles
    for (const q of sim.projectiles) {
      if (!q.alive || q.delay > 0) continue;
      g.fillStyle = q.color;
      g.shadowColor = q.color; g.shadowBlur = 12;
      const s = (q.kind === 'panel' ? 0.5 : 0.22) * k;
      g.fillRect(X(q.x) - s / 2, Y(q.y) - s / 2, s, s);
      g.shadowBlur = 0;
    }

    // fighters
    for (const f of sim.fighters) {
      const x = X(f.x), gy = Y(0), yTop = Y(f.y + f.height);
      const s = f.height * k;
      // shadow pool
      g.fillStyle = f.color; g.globalAlpha = 0.18 + (f.flashT > 0 ? f.flashT : 0);
      g.beginPath(); g.ellipse(x, gy, s * 0.28, s * 0.07, 0, 0, 7); g.fill();
      g.globalAlpha = 1;
      if (!f.alive) {
        // fallen
        g.fillStyle = f.color;
        g.globalAlpha = 0.7;
        g.beginPath(); g.ellipse(x, gy - 4, s * 0.45, s * 0.1, 0, 0, 7); g.fill();
        g.globalAlpha = 1;
      } else {
        const lean = f.state === 'dodge' ? -0.5 : f.hurtT > 0 ? 0.3 : f.atk && f.atk.type === 'kick' ? 0.15 : 0.05;
        g.save();
        g.translate(x, yTop);
        g.rotate(lean * 0.3);
        g.strokeStyle = f.color; g.fillStyle = f.color;
        g.lineWidth = Math.max(3, s * 0.045); g.lineCap = 'round';
        // legs
        const wp = Math.sin(f.walkPhase || 0);
        g.beginPath();
        g.moveTo(0, -s * 0.45); g.lineTo(wp * s * 0.12, -s * 0.02);
        g.moveTo(0, -s * 0.45); g.lineTo(-wp * s * 0.12, -s * 0.02);
        g.stroke();
        // torso
        g.beginPath(); g.moveTo(0, -s * 0.45); g.lineTo(0, -s * 0.82); g.stroke();
        // arms
        let armA = 0.3;
        if (f.atk) {
          const p = clamp(f.atk.t / f.atk.dur, 0, 1);
          armA = p < 0.28 ? -0.8 * (p / 0.28) : p < 0.62 ? -1.5 * Math.sin((p - 0.28) / 0.34 * Math.PI) : 0;
        } else if (f.state === 'cast' || f.state === 'ult') armA = -2.4;
        g.beginPath();
        g.moveTo(0, -s * 0.78); g.lineTo(Math.cos(armA) * s * 0.2, -s * 0.78 + Math.sin(armA) * s * 0.2);
        g.moveTo(0, -s * 0.78); g.lineTo(-Math.cos(0.4) * s * 0.18, -s * 0.78 - Math.sin(0.4) * s * 0.18);
        g.stroke();
        // head
        g.beginPath(); g.arc(0, -s * 0.9, s * 0.07, 0, 7); g.fill();
        g.restore();
      }
      // hp bar above head
      if (f.alive) {
        const bw = Math.max(40, s * 0.5);
        g.fillStyle = 'rgba(0,0,0,0.55)';
        g.fillRect(x - bw / 2, yTop - 12, bw, 6);
        g.fillStyle = f.color;
        g.fillRect(x - bw / 2, yTop - 12, bw * clamp(f.hp / f.maxHp, 0, 1), 6);
      }
    }

    // particles
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 9 * dt;
      g.globalAlpha = clamp(p.life * 2, 0, 1);
      g.fillStyle = p.color;
      g.fillRect(X(p.x) - 2, Y(p.y) - 2, 4, 4);
    }
    g.globalAlpha = 1;
  }
  dispose() {}
}

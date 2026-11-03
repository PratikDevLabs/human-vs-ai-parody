// ============================================================
// src/ui/hud.js — in-fight HUD: segmented HP bar + damage trail +
// numeric, stamina, chai ring, enemy cards with state chips, wind-up
// pulse, telegraph banners (projected), edge arrows, kill feed,
// floating damage numbers, combo, timer, subtitles, hit direction.
// ============================================================
import { icon } from './icons.js';
import { t } from '../data/dialogue.js';
import { FIGHTERS } from '../config.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export class HUD {
  constructor(bus, settings) {
    this.bus = bus;
    this.settings = settings;
    this.el = {
      hud: $('hud'), timer: $('timer'), comboWrap: $('comboWrap'), comboNum: $('comboNum'),
      score: $('scoreNum'), cards: $('cards'),
      pHpFill: $('pHpFill'), pHpTrail: $('pHpTrail'), pHpNum: $('pHpNum'),
      pStamFill: $('pStamFill'), chaiRing: $('chaiRing'), chaiFill: $('chaiFill'), chaiCore: $('chaiCore'),
      banner: $('banner'), feed: $('feed'), floaters: $('floaters'),
      telegraphs: $('telegraphs'), edgeArrows: $('edgeArrows'),
      hitDir: $('hitDir'), subtitles: $('subtitles'), subSpeaker: $('subSpeaker'), subText: $('subText'),
      countBig: $('countBig'), lowHpFx: $('lowHpFx'),
      btnUlt: $('btnUlt'), btnPause: $('btnPause'), btnSound: $('btnSound'),
    };
    this.el.btnPause.innerHTML = icon('pause');
    this.el.btnUlt.innerHTML = icon('chai', 'chaiIc') + '<span class="ultLbl" id="ultLbl"></span>';
    this.el.btnSound.innerHTML = icon('sound');
    this._trail = 1;
    this._floatPool = [];
    for (let i = 0; i < 14; i++) {
      const d = document.createElement('div');
      d.className = 'floater hidden';
      this.el.floaters.appendChild(d);
      this._floatPool.push({ d, life: 0, x: 0, y: 0, z: 0, vy: 0 });
    }
    this._telePool = [];
    for (let i = 0; i < 4; i++) {
      const d = document.createElement('div');
      d.className = 'tele hidden';
      d.innerHTML = '<div class="teleRing"></div><div class="teleName"></div>';
      this.el.telegraphs.appendChild(d);
      this._telePool.push({ d, ring: d.firstChild, name: d.lastChild, key: '' });
    }
    this._arrowPool = [];
    for (let i = 0; i < 3; i++) {
      const d = document.createElement('div');
      d.className = 'edgeArrow hidden';
      d.innerHTML = '<svg viewBox="0 0 24 24" class="ic"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      this.el.edgeArrows.appendChild(d);
      this._arrowPool.push(d);
    }
    this._feedN = 0;
    this._subT = null;

    bus.on('ui:float', (e) => this.addFloat(e.x, e.y, e.z, e.text, e.color, e.big));
    bus.on('ui:feed', (e) => this.addFeed(e.text, e.color));
    bus.on('ui:hurt', (e) => this.hitFrom(e.fromX));
    bus.on('ui:telegraph', (e) => { if (e.lane || e.big) this.banner(e.label, e.color, (e.dur || 0.8) * 1000); });
    bus.on('ui:subtitle', (e) => this.subtitle(e));
    bus.on('ui:count', (e) => this.count(e === 'fight' ? t(this.langRef(), 'fight') : String(e)));
    bus.on('ui:banner', (e) => this.banner(e.text, e.color, e.dur));
    this.langRef = () => 'hinglish';
  }

  buildCards(sim, lang) {
    this.el.cards.innerHTML = '';
    this._cards = {};
    for (const f of sim.fighters) {
      if (f.isPlayer) continue;
      const def = FIGHTERS[f.id];
      const card = document.createElement('div');
      card.className = 'ecard';
      card.style.setProperty('--c', f.color);
      card.innerHTML = `
        <div class="eEmb">${icon('emblem' + def.id[0].toUpperCase() + def.id.slice(1))}</div>
        <div class="eMid">
          <div class="eName">${t(lang, 'name_' + f.id)}</div>
          <div class="eHp"><div class="eHpFill"></div></div>
        </div>
        <div class="eChip">IDLE</div>`;
      this.el.cards.appendChild(card);
      this._cards[f.id] = { card, fill: card.querySelector('.eHpFill'), chip: card.querySelector('.eChip'), f };
    }
  }

  show() { this.el.hud.classList.remove('hidden'); }
  hide() { this.el.hud.classList.add('hidden'); }

  addFloat(x, y, z, text, color, big) {
    for (const fl of this._floatPool) {
      if (fl.life <= 0) {
        fl.life = 0.9; fl.x = x; fl.y = y + 0.3; fl.z = z; fl.vy = 1.6;
        fl.d.textContent = text;
        fl.d.style.color = color || '#fff';
        fl.d.classList.toggle('big', !!big);
        fl.d.classList.remove('hidden');
        fl.d.style.opacity = 1;
        return;
      }
    }
  }
  addFeed(text, color) {
    const d = document.createElement('div');
    d.className = 'feedItem';
    d.style.color = color || '#cdd6ff';
    d.textContent = text;
    this.el.feed.prepend(d);
    while (this.el.feed.children.length > 4) this.el.feed.lastChild.remove();
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, 2400);
  }
  hitFrom(fromX) {
    const d = this.el.hitDir;
    d.classList.remove('hidden');
    const fx = fromX === undefined ? (Math.random() < 0.5 ? 1 : -1) : fromX;
    d.classList.toggle('left', fx > 0); // attacker to the right → indicator points left
    clearTimeout(this._hitT);
    this._hitT = setTimeout(() => d.classList.add('hidden'), 450);
  }
  subtitle(e) {
    const s = this.el.subtitles;
    this.el.subSpeaker.textContent = e.speaker;
    this.el.subSpeaker.style.color = e.color || '#fff';
    this.el.subText.textContent = e.text;
    s.classList.remove('hidden');
    clearTimeout(this._subT);
    this._subT = setTimeout(() => s.classList.add('hidden'), Math.max(1800, e.text.length * 55));
  }
  banner(text, color, dur) {
    const b = this.el.banner;
    b.textContent = text;
    b.style.color = color || '#fff';
    b.style.textShadow = `0 0 18px ${color || '#fff'}`;
    b.classList.remove('hidden');
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    clearTimeout(this._banT);
    this._banT = setTimeout(() => b.classList.add('hidden'), dur || 900);
  }
  count(text) {
    const c = this.el.countBig;
    c.textContent = text;
    c.classList.remove('hidden');
    c.classList.remove('pop'); void c.offsetWidth; c.classList.add('pop');
    clearTimeout(this._countT);
    if (text !== 'FIGHT!') this._countT = setTimeout(() => c.classList.add('hidden'), 800);
    else this._countT = setTimeout(() => c.classList.add('hidden'), 900);
  }

  setLangRef(fn) { this.langRef = fn; }
  update(sim, dt, r, lang) {
    const p = sim.player;
    // timer
    const tl = Math.max(0, sim.timeLeft);
    const mm = Math.floor(tl / 60), ss = Math.floor(tl % 60);
    this.el.timer.textContent = `${mm}:${String(ss).padStart(2, '0')}`;
    this.el.timer.classList.toggle('low', tl <= 30);
    // combo
    if (sim.combo >= 2) {
      this.el.comboWrap.classList.remove('hidden');
      this.el.comboNum.textContent = sim.combo;
    } else this.el.comboWrap.classList.add('hidden');
    // score live
    const score = Math.floor(sim.stats.dealt) + sim.stats.kos * 100 + sim.stats.perfect * 25;
    this.el.score.textContent = String(score);
    // player hp
    const hpPct = clamp(p.hp / p.maxHp, 0, 1);
    this.el.pHpFill.style.width = (hpPct * 100) + '%';
    this._trail += (hpPct - this._trail) * Math.min(1, dt * 1.4);
    this.el.pHpTrail.style.width = (clamp(this._trail, 0, 1) * 100) + '%';
    this.el.pHpNum.textContent = Math.ceil(p.hp) + ' / ' + p.maxHp;
    this.el.pHpFill.classList.toggle('low', hpPct < 0.3);
    this.el.lowHpFx.classList.toggle('on', hpPct < 0.3 && p.alive);
    // stamina
    this.el.pStamFill.style.width = (clamp(p.stamina / p.maxStamina, 0, 1) * 100) + '%';
    // chai
    const cp = clamp(p.chai / 100, 0, 1);
    this.el.chaiFill.style.width = (cp * 100) + '%';
    this.el.chaiRing.style.background = `conic-gradient(var(--chai) ${cp * 360}deg, rgba(255,194,74,0.12) 0deg)`;
    this.el.chaiRing.classList.toggle('ready', cp >= 1);
    this.el.btnUlt.classList.toggle('ready', cp >= 1);
    $('ultLbl').textContent = t(lang, 'ult_name');
    // enemy cards
    for (const id in this._cards) {
      const c = this._cards[id];
      const f = c.f;
      c.fill.style.width = (clamp(f.hp / f.maxHp, 0, 1) * 100) + '%';
      let chip = 'IDLE', cls = '';
      if (!f.alive) { chip = 'KO'; cls = 'ko'; }
      else if (f.state === 'ult') { chip = t(lang, 'chip_ult'); cls = 'ult'; }
      else if (f.state === 'cast') { chip = t(lang, 'chip_cast'); cls = 'cast'; }
      else if (f.atk) { chip = t(lang, f.atk.type === 'punch' ? 'chip_atk' : 'chip_atk'); cls = f.atk.t / f.atk.dur < 0.3 ? 'windup' : 'atk'; }
      else if (f.stunT > 0) { chip = t(lang, 'chip_stun'); cls = 'stun'; }
      else if (f.state === 'dodge') { chip = t(lang, 'chip_dodge'); cls = 'dodge'; }
      c.chip.textContent = chip;
      c.card.className = 'ecard ' + cls;
    }
    // telegraph banners (projected)
    let ti = 0;
    const W = r.width;
    for (const f of sim.fighters) {
      if (f.isPlayer || !f.alive || ti >= this._telePool.length) continue;
      const casting = f.state === 'cast' || f.state === 'ult' || (f.atk && f.atk.t / f.atk.dur < 0.32);
      if (!casting) continue;
      const tp = this._telePool[ti++];
      const name = f.state === 'ult' ? t(lang, 'ult_' + f.id)
        : f.state === 'cast' ? t(lang, 'cast_' + (f.cast ? f.cast.key : f.id))
        : t(lang, 'atk_' + f.atk.type);
      const key = f.id + name;
      if (tp.key !== key) { tp.key = key; tp.name.textContent = name; }
      const pr = r.project(f.x, f.y + f.height + 0.55, f.z, HUD._p || (HUD._p = { x: 0, y: 0 }));
      tp.d.style.transform = `translate(${pr.x}px, ${pr.y}px) translate(-50%,-100%)`;
      tp.d.classList.remove('hidden');
      tp.d.style.setProperty('--tc', f.color);
      const prog = f.atk ? clamp(f.atk.t / f.atk.dur, 0, 1) : f.cast ? clamp(f.cast.t / f.cast.dur, 0, 1) : 0;
      tp.ring.style.background = `conic-gradient(${f.color} ${prog * 360}deg, rgba(255,255,255,0.12) 0deg)`;
      tp.d.classList.toggle('off', pr.x < -40 || pr.x > W + 40);
    }
    for (; ti < this._telePool.length; ti++) { this._telePool[ti].d.classList.add('hidden'); this._telePool[ti].key = ''; }
    // edge arrows for off-screen threats
    let ai = 0;
    for (const f of sim.fighters) {
      if (f.isPlayer || !f.alive || ai >= this._arrowPool.length) continue;
      if (!(f.state === 'cast' || f.state === 'ult' || f.atk)) continue;
      const pr = r.project(f.x, f.y + 1, f.z, HUD._p);
      if (pr.x >= -20 && pr.x <= W + 20) continue;
      const d = this._arrowPool[ai++];
      d.classList.remove('hidden');
      d.style.color = f.color;
      const left = pr.x < 0;
      d.style.left = left ? '6px' : '';
      d.style.right = left ? '' : '6px';
      d.style.top = clamp(pr.y, 80, r.height - 160) + 'px';
      d.style.transform = left ? 'scaleX(-1)' : '';
    }
    for (; ai < this._arrowPool.length; ai++) this._arrowPool[ai].classList.add('hidden');
    // floaters
    for (const fl of this._floatPool) {
      if (fl.life > 0) {
        fl.life -= dt;
        fl.y += fl.vy * dt;
        const pr = r.project(fl.x, fl.y, fl.z, HUD._p);
        fl.d.style.transform = `translate(${pr.x}px, ${pr.y}px) translate(-50%,-50%)`;
        fl.d.style.opacity = clamp(fl.life / 0.9, 0, 1);
        if (fl.life <= 0) fl.d.classList.add('hidden');
      }
    }
  }
}

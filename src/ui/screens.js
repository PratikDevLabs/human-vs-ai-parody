// ============================================================
// src/ui/screens.js — screen state machine UI: loading, menu (live 3D
// bg behind it), fighter cards, difficulty segmented control, VS intro,
// result scorecard with count-up + grade + Instagram CTA (exact copy),
// pause, settings modal, 1080x1920 share card via canvas + Web Share.
// ============================================================
import { FIGHTERS, DIFFICULTIES, INSTAGRAM_URL, ULTS, COLORS } from '../config.js';
import { t, UI } from '../data/dialogue.js';
import { icon } from './icons.js';
import { tr, getLang, setLang } from '../core/i18n.js';

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

export function gradeFor(win, stats, hpLeftPct) {
  let s = stats.dealt + stats.kos * 100 + stats.perfect * 25 + stats.chaiUlts * 60 + (win ? 300 : 0) + Math.round(hpLeftPct * 120);
  if (!win) s = Math.min(s, 320);
  if (s >= 900) return 'S';
  if (s >= 700) return 'A';
  if (s >= 520) return 'B';
  if (s >= 360) return 'C';
  return 'D';
}
export function scoreFor(win, stats, hpLeftPct) {
  return Math.floor(stats.dealt) + stats.kos * 100 + stats.perfect * 25 + stats.chaiUlts * 60 + (win ? 300 : 0) + Math.round(hpLeftPct * 120);
}

export class Screens {
  constructor({ bus, storage, settings, cbs }) {
    this.bus = bus; this.storage = storage; this.settings = settings; this.cbs = cbs;
    this.diffKey = 'medium';
    this.el = {};
    ['screen-loading', 'screen-menu', 'screen-vs', 'screen-result', 'screen-pause', 'modal-settings',
      'menuTitle', 'menuTag', 'fighterCards', 'diffSeg', 'diffReadout', 'diffLbl', 'btnPlay',
      'btnSettings', 'btnHelp', 'btnInstall', 'statsRow', 'credit', 'loadBar', 'loadPct',
      'vsYouName', 'vsEnemyWrap', 'vsSkip', 'resVerdict', 'resGrade', 'resStats', 'resBest', 'resNewBest',
      'btnRetry', 'btnChangeDiff', 'btnShare', 'btnResMenu', 'btnResume', 'btnRestart', 'btnPauseSettings', 'btnQuit',
      'setBody', 'ctaHeading', 'ctaBody', 'ctaBtn', 'pauseTitle', 'pauseHint',
    ].forEach(id => this.el[id] = $(id));
    this.el.ctaBtn.href = INSTAGRAM_URL;
    this.el.ctaBtn.target = '_blank';
    this.el.ctaBtn.rel = 'noopener noreferrer';
    this._buildMenu();
    this._buildSettings();
    this._bind();
    bus.on('ui:lang', () => this.refreshLang());
    bus.on('ui:error', (msg) => this.toast(msg));
  }

  // ---------- toast ----------
  toast(msg) {
    let el = $('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = String(msg).slice(0, 120);
    el.classList.add('show');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => el.classList.remove('show'), 3200);
  }

  // ---------- menu ----------
  _buildMenu() {
    // fighter cards
    const wrap = this.el.fighterCards;
    wrap.innerHTML = '';
    for (const id of ['grok', 'chatgpt', 'claude']) {
      const f = FIGHTERS[id];
      const card = document.createElement('div');
      card.className = 'fcard';
      card.style.setProperty('--c', f.color);
      card.innerHTML = `
        <div class="fEmb">${icon('emblem' + id[0].toUpperCase() + id.slice(1))}</div>
        <div class="fName">${f.name}</div>
        <div class="fTitle">${f.title}</div>
        <div class="fUlt">${icon('bolt')} ${ULTS[id].name}</div>
        <div class="fHp"><i style="width:${Math.round(f.hp / 220 * 100)}%"></i></div>`;
      wrap.appendChild(card);
    }
    // difficulty segmented
    const seg = this.el.diffSeg;
    seg.innerHTML = '';
    this._diffBtns = {};
    for (const key of ['easy', 'medium', 'hard']) {
      const b = document.createElement('button');
      b.className = 'segBtn';
      b.dataset.diff = key;
      b.textContent = tr('diff_' + key);
      b.onclick = () => this.setDiff(key);
      seg.appendChild(b);
      this._diffBtns[key] = b;
    }
    this.setDiff(this.diffKey);
    // play
    this.el.btnPlay.innerHTML = icon('play') + `<span>${tr('play')}</span>`;
    this.el.btnPlay.onclick = () => this.cbs.onPlay(this.diffKey);
    this.el.btnSettings.innerHTML = icon('gear') + `<span>${tr('settings')}</span>`;
    this.el.btnSettings.onclick = () => this.openSettings();
    this.el.btnHelp.innerHTML = icon('help') + `<span>${tr('help')}</span>`;
    this.el.btnHelp.onclick = () => this.cbs.onTutorial();
    this.el.btnInstall.innerHTML = icon('full') + `<span>${tr('install')}</span>`;
    this.el.btnInstall.onclick = () => this.cbs.onInstall();
  }

  setDiff(key) {
    this.diffKey = key;
    for (const k in this._diffBtns) this._diffBtns[k].classList.toggle('on', k === key);
    this.el.diffReadout.textContent = tr('diffDesc_' + key) + ' — ' + DIFFICULTIES[key].readout;
  }

  refreshStats() {
    const b = this.storage.getBest();
    const row = this.el.statsRow;
    if (!b) { row.innerHTML = `<span class="statChip">${icon('trophy')} ${tr('best')}: —</span>`; return; }
    row.innerHTML = `
      <span class="statChip best">${icon('trophy')} ${tr('best')}: ${b.score}</span>
      <span class="statChip win">${icon('star')} ${tr('wins')}: ${b.wins || 0}</span>
      <span class="statChip lose">${icon('skull')} ${tr('losses')}: ${b.losses || 0}</span>`;
  }

  // ---------- settings modal ----------
  _buildSettings() {
    const body = this.el.setBody;
    body.innerHTML = '';
    const S = this.settings;
    const row = (label, ctrl) => {
      const r = document.createElement('div');
      r.className = 'setRow';
      r.innerHTML = `<div class="setLbl">${label}</div>`;
      r.appendChild(ctrl);
      body.appendChild(r);
      return r;
    };
    const slider = (key, lbl) => {
      const w = document.createElement('div');
      w.className = 'sliderWrap';
      w.innerHTML = `<span class="sliderName">${lbl}</span>`;
      const inp = document.createElement('input');
      inp.type = 'range'; inp.min = 0; inp.max = 1; inp.step = 0.05;
      inp.value = S[key];
      const val = document.createElement('span');
      val.className = 'sliderVal'; val.textContent = Math.round(S[key] * 100) + '%';
      inp.oninput = () => { S[key] = parseFloat(inp.value); val.textContent = Math.round(S[key] * 100) + '%'; this.cbs.onSettings(); };
      w.appendChild(inp); w.appendChild(val);
      return w;
    };
    const toggle = (key, lbl) => {
      const b = document.createElement('button');
      b.className = 'tgl' + (S[key] ? ' on' : '');
      b.innerHTML = `<span>${lbl}</span><i></i>`;
      b.onclick = () => { S[key] = !S[key]; b.classList.toggle('on', S[key]); this.cbs.onSettings(); };
      return b;
    };
    row(tr('volumes'), document.createElement('div')).classList.add('setHead');
    body.appendChild(Object.assign(document.createElement('div'), { className: 'setGroup' }));
    const g1 = body.lastChild;
    g1.appendChild(slider('master', tr('master')));
    g1.appendChild(slider('music', tr('music')));
    g1.appendChild(slider('sfx', tr('sfx')));
    g1.appendChild(slider('voice', tr('voice')));
    // quality segmented
    const qWrap = document.createElement('div');
    qWrap.className = 'seg';
    for (const q of ['auto', 'LOW', 'MED', 'HIGH']) {
      const b = document.createElement('button');
      b.className = 'segBtn';
      b.textContent = q === 'auto' ? tr('quality_auto') : tr('quality_' + q.toLowerCase());
      b.dataset.q = q;
      b.onclick = () => { S.quality = q; this.cbs.onSettings(); this._refreshQualitySeg(q); };
      qWrap.appendChild(b);
    }
    this._qSeg = qWrap;
    this._refreshQualitySeg(S.quality);
    row(tr('quality'), qWrap);
    // language segmented
    const lWrap = document.createElement('div');
    lWrap.className = 'seg';
    for (const l of ['hinglish', 'en', 'hi']) {
      const b = document.createElement('button');
      b.className = 'segBtn';
      b.textContent = tr('lang_' + l);
      b.onclick = () => { S.lang = l; setLang(l); this.cbs.onSettings(); this._refreshLangSeg(l); };
      lWrap.appendChild(b);
    }
    this._lSeg = lWrap;
    this._refreshLangSeg(S.lang);
    row(tr('language'), lWrap);
    // toggles
    const g2 = document.createElement('div');
    g2.className = 'setGroup';
    g2.appendChild(toggle('leftHanded', tr('leftHanded')));
    g2.appendChild(toggle('reduceMotion', tr('motion')));
    g2.appendChild(toggle('haptics', tr('haptics')));
    g2.appendChild(toggle('colourblind', tr('colourblind')));
    g2.appendChild(toggle('subtitles', tr('subtitles')));
    // button size slider
    const bs = document.createElement('div');
    bs.className = 'sliderWrap';
    bs.innerHTML = `<span class="sliderName">${tr('buttonSize')}</span>`;
    const bInp = document.createElement('input');
    bInp.type = 'range'; bInp.min = 0.8; bInp.max = 1.4; bInp.step = 0.05; bInp.value = S.buttonSize;
    const bVal = document.createElement('span');
    bVal.className = 'sliderVal'; bVal.textContent = Math.round(S.buttonSize * 100) + '%';
    bInp.oninput = () => { S.buttonSize = parseFloat(bInp.value); bVal.textContent = Math.round(S.buttonSize * 100) + '%'; this.cbs.onSettings(); };
    bs.appendChild(bInp); bs.appendChild(bVal);
    g2.appendChild(bs);
    body.appendChild(g2);
    // close
    const close = document.createElement('button');
    close.className = 'mbtn wide';
    close.innerHTML = icon('close') + `<span>${tr('back')}</span>`;
    close.onclick = () => this.closeSettings();
    body.appendChild(close);
  }
  _refreshQualitySeg(q) {
    if (!this._qSeg) return;
    for (const b of this._qSeg.children) b.classList.toggle('on', b.dataset.q === q);
  }
  _refreshLangSeg(l) {
    if (!this._lSeg) return;
    for (const b of this._lSeg.children) b.classList.toggle('on', b.dataset.lang === l || (l === 'en' && b.textContent === tr('lang_en')));
  }
  openSettings() { this.el['modal-settings'].classList.add('open'); }
  closeSettings() { this.el['modal-settings'].classList.remove('open'); }

  // ---------- bindings ----------
  _bind() {
    this.el.vsSkip.innerHTML = icon('play') + '<span>SKIP</span>';
    this.el.vsSkip.onclick = () => this.cbs.onSkipVS();
    this.el['screen-pause'].addEventListener('click', (e) => { if (e.target === this.el['screen-pause']) this.cbs.onResume(); });
    this.el.btnRetry.onclick = () => this.cbs.onRetry();
    this.el.btnChangeDiff.onclick = () => { this.show('menu'); this.cbs.onQuitToMenu(); };
    this.el.btnShare.onclick = () => this.cbs.onShare();
    this.el.btnResMenu.onclick = () => { this.show('menu'); this.cbs.onQuitToMenu(); };
    this.el.btnResume.onclick = () => this.cbs.onResume();
    this.el.btnRestart.onclick = () => this.cbs.onRestart();
    this.el.btnPauseSettings.onclick = () => this.openSettings();
    this.el.btnQuit.onclick = () => { this.show('menu'); this.cbs.onQuitToMenu(); };
    this.el['modal-settings'].addEventListener('click', (e) => { if (e.target === this.el['modal-settings']) this.closeSettings(); });
  }

  // ---------- screens ----------
  show(name) {
    for (const s of document.querySelectorAll('.screen')) s.classList.remove('active');
    const el = $('screen-' + name);
    if (el) el.classList.add('active');
    document.body.dataset.screen = name;
  }
  setLoading(pct, label) {
    this.show('loading');
    this.el.loadBar.style.width = pct + '%';
    this.el.loadPct.textContent = Math.floor(pct) + '%';
  }
  showMenu() { this.show('menu'); this.refreshStats(); this.refreshLang(); }

  showVS(diffKey) {
    this.show('vs');
    this.el.vsYouName.textContent = tr('name_you');
    const wrap = this.el.vsEnemyWrap;
    wrap.innerHTML = '';
    for (const id of ['grok', 'chatgpt', 'claude']) {
      const f = FIGHTERS[id];
      const d = document.createElement('div');
      d.className = 'vsCard';
      d.style.setProperty('--c', f.color);
      d.style.animationDelay = (0.15 + ['grok', 'chatgpt', 'claude'].indexOf(id) * 0.18) + 's';
      d.innerHTML = `<div class="vsEmb">${icon('emblem' + id[0].toUpperCase() + id.slice(1))}</div><div class="vsName">${tr('name_' + id)}</div><div class="vsTitle">${f.title}</div>`;
      wrap.appendChild(d);
    }
  }

  showResult(result, sim, score, grade, best, isNewBest) {
    this.show('result');
    const win = result.win;
    this.el.resVerdict.textContent = win ? tr('victory') : (result.how === 'draw' ? tr('result_draw') : tr('defeat'));
    this.el.resVerdict.className = win ? 'win' : 'lose';
    this.el.resGrade.textContent = grade;
    this.el.resGrade.dataset.g = grade;
    this.el.resNewBest.classList.toggle('hidden', !isNewBest);
    this.el.resBest.textContent = `${tr('best')}: ${best ? best.score : score}`;
    // count-up stats
    const st = sim.stats;
    const rows = [
      [tr('st_dealt'), Math.floor(st.dealt)],
      [tr('st_taken'), Math.floor(st.taken)],
      [tr('st_combo'), 'x' + st.maxCombo],
      [tr('st_perfect'), st.perfect],
      [tr('st_chai'), st.chaiUlts],
      [tr('st_kos'), st.kos + ' / 3'],
      [tr('st_time'), Math.floor(st.time) + 's'],
      ['SCORE', score],
    ];
    const wrap = this.el.resStats;
    wrap.innerHTML = '';
    rows.forEach(([label, val], i) => {
      const d = document.createElement('div');
      d.className = 'resRow';
      d.innerHTML = `<span>${label}</span><b data-val="${val}">0</b>`;
      wrap.appendChild(d);
      const b = d.querySelector('b');
      const target = typeof val === 'number' ? val : parseInt(String(val).replace(/[^\d]/g, ''), 10) || 0;
      const t0 = performance.now() + i * 90;
      const dur = 700;
      const step = (now) => {
        const k = clamp((now - t0) / dur, 0, 1);
        const eased = 1 - Math.pow(1 - k, 3);
        b.textContent = String(val).replace(/\d+/, String(Math.round(target * eased)));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    this.refreshLang();
  }

  showPause() { this.el['screen-pause'].classList.add('active'); }
  hidePause() { this.el['screen-pause'].classList.remove('active'); }

  refreshLang() {
    const L = getLang();
    this.el.menuTitle.textContent = t(L, 'menuTitle');
    this.el.menuTag.textContent = t(L, 'menuTag');
    this.el.diffLbl.textContent = t(L, 'difficulty');
    this.el.btnPlay.querySelector('span').textContent = t(L, 'play');
    this.el.btnSettings.querySelector('span').textContent = t(L, 'settings');
    this.el.btnHelp.querySelector('span').textContent = t(L, 'help');
    this.el.btnInstall.querySelector('span').textContent = t(L, 'install');
    this.el.credit.textContent = t(L, 'credit');
    const fl = $('fightLbl'); if (fl) fl.textContent = t(L, 'fighters');
    const mh = document.querySelector('.modalCard h3'); if (mh) mh.textContent = t(L, 'settings');
    this.el.ctaHeading.textContent = t(L, 'ctaHeading');
    this.el.ctaBody.textContent = t(L, 'ctaBody');
    this.el.ctaBtn.textContent = t(L, 'ctaButton');
    this.el.pauseTitle.textContent = t(L, 'paused');
    this.el.pauseHint.textContent = t(L, 'pauseHint');
    this.el.btnResume.innerHTML = icon('play') + `<span>${t(L, 'resume')}</span>`;
    this.el.btnRestart.innerHTML = icon('back') + `<span>${t(L, 'restart')}</span>`;
    this.el.btnPauseSettings.innerHTML = icon('gear') + `<span>${t(L, 'settings')}</span>`;
    this.el.btnQuit.innerHTML = icon('close') + `<span>${t(L, 'quit')}</span>`;
    this.el.btnRetry.innerHTML = icon('play') + `<span>${t(L, 'retry')}</span>`;
    this.el.btnChangeDiff.innerHTML = icon('gauge') + `<span>${t(L, 'changeDiff')}</span>`;
    this.el.btnShare.innerHTML = icon('share') + `<span>${t(L, 'shareCard')}</span>`;
    this.el.btnResMenu.innerHTML = icon('back') + `<span>${t(L, 'quit')}</span>`;
    for (const key of ['easy', 'medium', 'hard']) this._diffBtns[key].textContent = t(L, 'diff_' + key);
    this.setDiff(this.diffKey);
    this.refreshStats();
    // fighter cards
    const wrap = this.el.fighterCards;
    if (wrap.children.length) {
      ['grok', 'chatgpt', 'claude'].forEach((id, i) => {
        wrap.children[i].querySelector('.fName').textContent = t(L, 'name_' + id);
      });
    }
  }

  // ---------- share card 1080x1920 ----------
  async drawShareCard({ win, score, grade, stats, diffKey }) {
    const W = 1080, H = 1920;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    // bg
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#0b0820'); bg.addColorStop(0.6, '#141033'); bg.addColorStop(1, '#07060f');
    g.fillStyle = bg; g.fillRect(0, 0, W, H);
    // neon grid
    g.strokeStyle = 'rgba(39,230,255,0.20)';
    for (let i = 0; i < 12; i++) { g.lineWidth = 1 + i * 0.2; g.beginPath(); g.moveTo(0, 900 + i * i * 9); g.lineTo(W, 900 + i * i * 9); g.stroke(); }
    for (let i = -10; i <= 10; i++) { g.beginPath(); g.moveTo(W / 2 + i * 60, 900); g.lineTo(W / 2 + i * 190, H); g.stroke(); }
    // moon
    const mg = g.createRadialGradient(W * 0.72, 300, 30, W * 0.72, 300, 190);
    mg.addColorStop(0, 'rgba(255,214,140,1)'); mg.addColorStop(0.5, 'rgba(255,170,90,0.6)'); mg.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = mg; g.beginPath(); g.arc(W * 0.72, 300, 190, 0, 7); g.fill();
    g.fillStyle = '#ffd68c'; g.beginPath(); g.arc(W * 0.72, 300, 110, 0, 7); g.fill();
    // title
    const chai = COLORS.chai;
    g.textAlign = 'center';
    g.fillStyle = '#27E6FF';
    g.font = '700 92px Teko, Rajdhani, sans-serif';
    g.shadowColor = '#27E6FF'; g.shadowBlur = 30;
    g.fillText('HUMAN vs AI', W / 2, 210);
    g.shadowBlur = 0;
    g.fillStyle = chai;
    g.font = '600 54px Rajdhani, "Noto Sans Devanagari", sans-serif';
    g.fillText('OVERLORD ARENA — NEO-DELHI 2099', W / 2, 285);
    // emblem: big teacup
    g.strokeStyle = chai; g.fillStyle = chai; g.lineWidth = 14; g.lineCap = 'round';
    g.beginPath(); g.moveTo(W / 2 - 130, 430); g.lineTo(W / 2 + 130, 430); g.lineTo(W / 2 + 100, 590); g.lineTo(W / 2 - 100, 590); g.closePath(); g.stroke();
    g.beginPath(); g.arc(W / 2 + 160, 490, 42, -1.2, 1.2); g.stroke();
    g.beginPath(); g.moveTo(W / 2 - 60, 390); g.quadraticCurveTo(W / 2 - 80, 340, W / 2 - 40, 300); g.moveTo(W / 2 + 40, 390); g.quadraticCurveTo(W / 2 + 20, 340, W / 2 + 60, 300); g.stroke();
    // verdict
    g.font = '800 150px Teko, Rajdhani, sans-serif';
    g.fillStyle = win ? '#FFC24A' : '#FF3B4A';
    g.shadowColor = g.fillStyle; g.shadowBlur = 40;
    g.fillText(win ? 'VICTORY!' : 'DEFEAT', W / 2, 830);
    g.shadowBlur = 0;
    // grade ring
    g.font = '800 190px Teko, sans-serif';
    g.strokeStyle = '#cdd6ff'; g.lineWidth = 10;
    g.beginPath(); g.arc(W / 2, 1060, 130, 0, 7); g.stroke();
    g.fillStyle = win ? '#FFC24A' : '#FF3B4A';
    g.fillText(grade, W / 2, 1125);
    // score
    g.fillStyle = '#ffffff';
    g.font = '700 120px Teko, Rajdhani, sans-serif';
    g.fillText('SCORE  ' + score, W / 2, 1310);
    // stats
    g.font = '600 44px Rajdhani, sans-serif';
    g.fillStyle = '#cdd6ff';
    const lines = [
      `${t(getLang(), 'st_dealt')}: ${Math.floor(stats.dealt)}`,
      `${t(getLang(), 'st_combo')}: x${stats.maxCombo}`,
      `${t(getLang(), 'st_perfect')}: ${stats.perfect}`,
      `${t(getLang(), 'st_chai')}: ${stats.chaiUlts}`,
      `${t(getLang(), 'difficulty')}: ${t(getLang(), 'diff_' + diffKey)}`,
    ];
    lines.forEach((l, i) => g.fillText(l, W / 2, 1420 + i * 62));
    // footer CTA
    g.fillStyle = chai;
    g.font = '700 46px Rajdhani, "Noto Sans Devanagari", sans-serif';
    g.fillText('AI se badla pura nahi hua? Follow karo & score bhejo!', W / 2, 1810);
    return new Promise((res) => c.toBlob((b) => res(b), 'image/png'));
  }
}

import { STORE_KEYS, DEFAULT_SETTINGS } from '../config.js';

function read(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch (e) { return fallback; }
}
function write(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
}

export const storage = {
  getSettings() {
    return { ...DEFAULT_SETTINGS, ...read(STORE_KEYS.settings, {}) };
  },
  saveSettings(s) { write(STORE_KEYS.settings, s); },
  getBest() { return read(STORE_KEYS.best, null); },
  saveBest(b) { write(STORE_KEYS.best, b); },
  tutorialSeen() { return !!read(STORE_KEYS.tutorial, false); },
  setTutorialSeen() { write(STORE_KEYS.tutorial, true); },
};

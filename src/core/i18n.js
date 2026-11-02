import { t } from '../data/dialogue.js';
import { bus } from './bus.js';

let lang = 'hinglish';
export function setLang(l) { lang = l; bus.emit('ui:lang'); }
export function getLang() { return lang; }
export function tr(key) { return t(lang, key); }

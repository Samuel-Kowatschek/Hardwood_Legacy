// Mini-i18n: t('pfad.zum.key', {param}). Fallback: Englisch. Neue Sprache = neue Datei + Eintrag in LANGS.
import en from './en.js';
import de from './de.js';
import bs from './bs.js';
import { input } from '../input.js';

export const LANGS = { en, de, bs };
export const LANG_LIST = Object.keys(LANGS);
let cur = 'en';

export function setLang(l) { if (LANGS[l]) cur = l; }
export const lang = () => cur;

function lookup(dict, key) {
  let v = dict;
  for (const part of key.split('.')) { if (v == null) return undefined; v = v[part]; }
  return v;
}

// Tastennamen je nach Eingabegeraet (Tastatur: SPACE/ESC/S, Touch: OK/BACK/STATS)
export function keyNames() {
  const d = LANGS[cur].keys || en.keys;
  return input.device === 'touch' ? d.touch : d.kb;
}

export function t(key, params = {}) {
  let v = lookup(LANGS[cur], key);
  if (v === undefined) v = lookup(en, key);
  if (v === undefined) return key;
  if (typeof v === 'function') return v(params);
  if (typeof v !== 'string') return v;
  const all = { ...keyNames(), ...params };
  return v.replace(/\{(\w+)\}/g, (m, k) => (k in all ? all[k] : m));
}

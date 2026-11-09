// localStorage-Persistenz (Meta-Progress, Hall of Fame, Settings). Immer in try/catch.

const KEYS = { meta: 'hwl_meta_v1', hof: 'hwl_hof_v1', settings: 'hwl_settings_v1' };

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : { ...fallback };
  } catch { return { ...fallback }; }
}
function readArr(key) {
  try { const raw = localStorage.getItem(key); const v = raw ? JSON.parse(raw) : []; return Array.isArray(v) ? v : []; }
  catch { return []; }
}
function write(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* Storage blockiert: Spiel laeuft trotzdem */ }
}

const META_DEFAULT = { runs: 0, best: 0, totalRings: 0, fmvps: 0, bestTier: 0, unlocked: [] };

export const save = {
  meta() { return read(KEYS.meta, META_DEFAULT); },
  setMeta(m) { write(KEYS.meta, m); },
  hof() { return readArr(KEYS.hof); },
  addHof(entry) {
    const list = readArr(KEYS.hof);
    list.push(entry);
    list.sort((a, b) => b.score - a.score);
    write(KEYS.hof, list.slice(0, 10));
    return list.indexOf(entry);
  },
  settings() { return read(KEYS.settings, { mute: false }); },
  setSettings(s) { write(KEYS.settings, s); },
};

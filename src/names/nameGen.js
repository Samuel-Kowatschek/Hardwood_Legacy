// Parodie-Namensgenerator: echte NBA-Namen nur als Rohmaterial, im UI erscheint nie das Original.
// Strategien (seed-basiert gemischt): 1) Buchstaben tauschen 2) Silbe ersetzen/einfuegen
// 3) Wort-Pun aus overrides.json 4) Vor-/Nachname verschiedener Spieler mischen.

const MAX_LAST = 14;
const MAX_FIRST = 10;

export function normalize(s) {
  return String(s).normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9' -]/g, '').trim();
}

function cleanLast(last) {
  let l = normalize(last).replace(/\s+(Jr|Sr|II|III|IV|V)\.?$/i, '').replace(/\s+(Jr|Sr|II|III|IV)$/i, '');
  if (l.length > MAX_LAST && l.includes('-')) l = l.split('-')[0];
  if (l.length > MAX_LAST && l.includes(' ')) l = l.split(' ').pop();
  return l;
}

// Regeln fuer Nachnamen (auf Kleinbuchstaben angewendet)
const LETTER_RULES = [
  [/um$/, 'er'], [/y$/, 'ie'], [/ie$/, 'y'], [/ic$/, 'ick'], [/ich$/, 'ick'], [/ck/, 'k'],
  [/ph/, 'f'], [/ee/, 'ea'], [/ea/, 'ee'], [/oo/, 'u'], [/ou/, 'oo'], [/son$/, 'sen'],
  [/sen$/, 'son'], [/ton$/, 'tan'], [/man$/, 'mann'], [/s$/, 'z'], [/er$/, 'ah'],
  [/el$/, 'elle'], [/ard$/, 'erd'], [/ell$/, 'el'], [/ll/, 'l'], [/tt/, 't'], [/x/, 'ks'],
  [/qu/, 'kw'], [/ai/, 'ay'], [/ay/, 'ai'], [/ey$/, 'y'], [/en$/, 'in'], [/in$/, 'en'],
  [/on$/, 'un'], [/a$/, 'ah'], [/o$/, 'oh'], [/ie/, 'ee'], [/c([aou])/, 'k$1'], [/k([aou])/, 'c$1'],
  [/([^aeiou])y([^aeiou])/, '$1i$2'], [/([aeiou])s([aeiou])/, '$1z$2'], [/th/, 't'], [/ng$/, 'nk'],
  [/ts$/, 'tz'], [/ks$/, 'x'], [/w([aeiou])/, 'wh$1'],
];
const FIRST_RULES = [
  [/y/, 'i'], [/([^aeiou])i([^aeiou])/, '$1y$2'], [/c([aou])/, 'k$1'], [/k([aou])/, 'c$1'], [/ph/, 'f'],
  [/([^aeiouy])e$/, '$1ey'], [/n$/, 'nn'], [/a$/, 'ah'], [/o$/, 'oh'], [/ie$/, 'y'], [/([^aeiou])y$/, '$1ie'], [/s$/, 'z'],
  [/ee/, 'ea'], [/ck/, 'k'], [/ll/, 'l'],
];
const VOWELS = 'aeiou';

function applyRule(lower, rules, rng) {
  const ok = rules.filter(([re]) => re.test(lower));
  if (!ok.length) return null;
  const [re, rep] = rng.pick(ok);
  return lower.replace(re, rep);
}

// Silbe einfuegen/ersetzen: "jokic" -> "jolkic", "doncic" -> "donkic"
function syllableTweak(lower, rng) {
  const opts = [];
  const m = lower.match(/^([^aeiou]*[aeiou])([^aeiou])/);
  if (m) opts.push(() => m[1] + rng.pick(['l', 'r', 'n']) + lower.slice(m[1].length));
  const inner = lower.slice(1).search(/c(?=[^h])/);
  if (inner >= 0) opts.push(() => lower.slice(0, inner + 1) + 'k' + lower.slice(inner + 2));
  // letzten Vokal tauschen
  let lv = -1;
  for (let i = lower.length - 1; i > 0; i--) if (VOWELS.includes(lower[i])) { lv = i; break; }
  if (lv > 0) opts.push(() => {
    const repl = rng.pick(VOWELS.replace(lower[lv], '').split(''));
    return lower.slice(0, lv) + repl + lower.slice(lv + 1);
  });
  // Konsonant verdoppeln
  const dbl = lower.slice(1).search(/[aeiou][bdgklmnprtz][aeiou]/);
  if (dbl >= 0) opts.push(() => lower.slice(0, dbl + 3) + lower[dbl + 2] + lower.slice(dbl + 3));
  if (!opts.length) return null;
  return rng.pick(opts)();
}

// Gross-/Kleinschreibung vom Original uebernehmen (DeRozan, McCollum ...)
function restoreCase(orig, res) {
  let out = '';
  for (let i = 0; i < res.length; i++) {
    const c = res[i];
    const o = orig[i];
    if (i === 0 || res[i - 1] === '-' || res[i - 1] === ' ' || res[i - 1] === "'") out += c.toUpperCase();
    else if (o && o !== o.toLowerCase() && o.toLowerCase() === c) out += c.toUpperCase();
    else out += c;
  }
  return out;
}

export function createNameGen(data, overrides = {}) {
  const players = data.players.map(p => ({ first: normalize(p.first), last: cleanLast(p.last), rawLast: p.last }))
    .filter(p => p.first && p.last);
  const realFull = new Set(data.players.map(p => (normalize(p.first) + ' ' + normalize(p.last)).toLowerCase()));
  for (const p of players) realFull.add((p.first + ' ' + p.last).toLowerCase());
  const realLast = new Set(players.map(p => p.last.toLowerCase()));
  const realFirst = new Set(players.map(p => p.first.toLowerCase()));
  const realNick = new Set(data.teams.map(t => t.nickname.toLowerCase()));
  const realAbbr = new Set(data.teams.map(t => t.abbr));
  const lastOv = overrides.last || {};
  const nickOv = overrides.nickname || {};
  const famous = players.filter(p => lastOv[p.last]);

  function validLast(orig, cand) {
    if (!cand) return false;
    const c = cand.toLowerCase();
    return c !== orig.toLowerCase() && !realLast.has(c) && cand.length <= MAX_LAST && cand.length >= 2 && /^[A-Za-z][A-Za-z' -]*$/.test(cand);
  }

  function parodyLast(last, rng) {
    if (lastOv[last]) {
      const c = rng.pick(lastOv[last]);
      if (validLast(last, c)) return c;
    }
    const lower = last.toLowerCase();
    const strategies = rng.shuffle(['letter', 'syllable', 'letter', 'syllable', 'letter2']);
    for (let tries = 0; tries < 8; tries++) {
      const s = strategies[tries % strategies.length];
      let r = null;
      if (s === 'letter') r = applyRule(lower, LETTER_RULES, rng);
      else if (s === 'syllable') r = syllableTweak(lower, rng);
      else { r = applyRule(lower, LETTER_RULES, rng); if (r) r = syllableTweak(r, rng) || r; }
      if (r) {
        const cand = restoreCase(last, r);
        if (validLast(last, cand)) return cand;
      }
    }
    return null;
  }

  function parodyFirst(first, rng) {
    for (let tries = 0; tries < 5; tries++) {
      const r = applyRule(first.toLowerCase(), FIRST_RULES, rng);
      if (r) {
        const cand = restoreCase(first, r);
        if (cand.toLowerCase() !== first.toLowerCase() && cand.length <= MAX_FIRST) return cand;
      }
    }
    return null;
  }

  function isSafe(first, last) {
    return !realFull.has((first + ' ' + last).toLowerCase()) && last.length <= MAX_LAST;
  }

  // Liefert {first, last, src} – src (Vorlage) nur fuer Debug/Tests, nie im UI anzeigen.
  function player(rng, { famousBias = 0 } = {}) {
    for (let attempt = 0; attempt < 30; attempt++) {
      const pool = famous.length && rng.chance(famousBias) ? famous : players;
      const p = rng.pick(pool);
      let first = p.first.length > MAX_FIRST ? p.first.slice(0, MAX_FIRST) : p.first;
      let last;
      const mode = rng.next();
      if (mode < 0.08) {
        // Strategie 4: Vor- und Nachname verschiedener Spieler mischen, Nachname leicht veraendert
        const q = rng.pick(players);
        last = parodyLast(q.last, rng);
      } else {
        last = parodyLast(p.last, rng);
      }
      if (!last) continue;
      if (rng.chance(0.3)) first = parodyFirst(first, rng) || first;
      if (!isSafe(first, last)) continue;
      return { first, last, src: p.first + ' ' + p.last };
    }
    // Fallback: garantiert kein echter Name
    const p = rng.pick(players);
    return { first: p.first.slice(0, MAX_FIRST), last: (p.last.slice(0, MAX_LAST - 1) + 'z'), src: p.first + ' ' + p.last };
  }

  function parodyNick(nick, rng) {
    if (nickOv[nick]) return rng.pick(nickOv[nick]);
    for (let i = 0; i < 8; i++) {
      const r = applyRule(nick.toLowerCase(), LETTER_RULES, rng) || syllableTweak(nick.toLowerCase(), rng);
      if (r) {
        const c = restoreCase(nick, r);
        if (c.toLowerCase() !== nick.toLowerCase() && !realNick.has(c.toLowerCase())) return c;
      }
    }
    return nick + 'z';
  }

  function makeAbbr(city, nick, used) {
    const C = city.toUpperCase().replace(/[^A-Z]/g, '');
    const N = nick.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cons = N.slice(1).replace(/[AEIOU0-9]/g, '');
    const cands = [C[0] + N[0] + (cons[0] || N[1]), N.slice(0, 3), C.slice(0, 2) + N[0], C[0] + N.slice(0, 2), C[0] + N[0] + (cons[1] || N[2])];
    for (const c of cands) if (c && c.length === 3 && !used.has(c) && !realAbbr.has(c)) return c;
    for (let i = 0; i < 26; i++) {
      const c = C[0] + N[0] + String.fromCharCode(65 + i);
      if (!used.has(c) && !realAbbr.has(c)) return c;
    }
    return 'XXX';
  }

  function teams(rng) {
    const used = new Set();
    return data.teams.map(t => {
      const nick = parodyNick(t.nickname, rng);
      const city = (overrides.city || {})[t.city] || normalize(t.city);
      const abbr = makeAbbr(city, nick, used);
      used.add(abbr);
      return { city, nick, abbr, srcAbbr: t.abbr };
    });
  }

  return { player, teams, parodyLast, realFull, realLast, realFirst };
}

export async function loadNameGen() {
  const [data, ov] = await Promise.all([
    fetch('data/nba_names.json').then(r => r.json()),
    fetch('src/names/overrides.json').then(r => r.json()).catch(() => ({})),
  ]);
  return createNameGen(data, ov);
}

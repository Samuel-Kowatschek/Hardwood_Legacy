// Entscheidungs- und Event-Karten (datengetrieben). Texte stehen in src/i18n/cards.<lang>.js.
// when: 'off' (Offseason) | 'mid' (Saisonmitte) | 'late' (Saisonende) | 'any' (mid oder late)
// Option: fx = Aenderungen, risk = { p, fx, msg } (versteckt), special = Sonderaktion, mystery = Hinweis '???'
// Jede Karte kommt pro Run hoechstens einmal (erst wenn der Pool leer ist, wieder von vorn).
import { clamp } from '../systems/rng.js';
import { injuryChance } from '../systems/sim.js';
import { t } from '../i18n/index.js';

const SKILLS = ['sho', 'pla', 'def', 'ath', 'clu'];
const CORE = ['form', 'body', 'chem', 'fame'];
const SEASON = ['power', 'playoffPower', 'usage', 'injuryGames', 'rivalBoost'];

const T = (run, id = run.p.teamId) => run.teams[id];
const others = run => run.teams.filter(x => x.id !== run.p.teamId);
const byBase = arr => arr.slice().sort((a, b) => b.base - a.base);
const age = r => r.p.age;

export function moveTeam(run, teamId) {
  const p = run.p;
  p.teamId = teamId;
  if (!p.teamsPlayed.includes(teamId)) p.teamsPlayed.push(teamId);
  p.chem = 45;
}

// Wendet Aenderungen an und liefert eine lesbare Zusammenfassung
export function fx(run, ch) {
  const p = run.p, out = [];
  for (const [k, v] of Object.entries(ch)) {
    if (!v) continue;
    const sg = v > 0 ? '+' : '';
    if (SKILLS.includes(k)) { p.skills[k] = clamp(p.skills[k] + v, 0, 99); out.push(`${t('stat.' + k)}${sg}${v}`); }
    else if (CORE.includes(k)) { p[k] = clamp(p[k] + v, 0, k === 'form' ? 99 : 100); out.push(`${t('stat.' + k)}${sg}${v}`); }
    else if (k === 'base') { T(run).base = clamp(T(run).base + v, 30, 88); out.push(`${t('hintLbl.team')}${sg}${v}`); }
    else if (SEASON.includes(k)) {
      run.cur[k] = (run.cur[k] || 0) + v;
      if (k === 'usage' && v > 0) out.push(t('hintLbl.pts') + '+');
      if (k === 'power' || k === 'playoffPower') out.push(t(k === 'power' ? 'hintLbl.wins' : 'hintLbl.playoffs') + (v > 0 ? '+' : '-'));
    }
  }
  if ('fame' in ch) p.peakFame = Math.max(p.peakFame, p.fame);
  return out.join(' ');
}

// Hinweis-Text aus den sichtbaren Effekten (+ / ++ / -), Risiken nur als 'RISK?'
const HINT_KEY = { base: 'team', power: 'wins', playoffPower: 'playoffs', usage: 'pts', injuryGames: 'rest', rivalBoost: 'rival' };
export function hintFor(opt) {
  if (opt.mystery) return '???';
  const parts = [];
  for (const k of opt.hint || []) parts.push(t('hintLbl.' + k));
  for (const [k, v] of Object.entries(opt.fx || {})) {
    if (!v || k === 'injuryGames' || k === 'rivalBoost') continue;
    const lbl = HINT_KEY[k] ? t('hintLbl.' + HINT_KEY[k]) : t('stat.' + k);
    parts.push(lbl + (v > 0 ? (v >= 8 ? '++' : '+') : '-'));
  }
  if (opt.risk) parts.push(t('hintLbl.risk'));
  return parts.slice(0, 3).join(' ');
}

const SPECIAL = {
  maxdeal: r => { const x = r.rng.pick(byBase(others(r)).slice(8, 20)); moveTeam(r, x.id); r.p.ringChase = false; return t('cardx.move', { abbr: x.abbr }); },
  superteam: r => { const x = byBase(others(r))[r.rng.int(0, 1)]; moveTeam(r, x.id); r.p.ringChase = true; return t('cardx.move', { abbr: x.abbr }); },
  trade: r => { const x = r.rng.pick(byBase(others(r)).slice(0, 14)); moveTeam(r, x.id); r.p.ringChase = false; return t('cardx.traded', { nick: x.nick }); },
  traderandom: r => { const x = r.rng.pick(others(r)); moveTeam(r, x.id); r.p.ringChase = false; return t('cardx.traded', { nick: x.nick }); },
  mentor: r => { if (r.rng.chance(0.4)) { r.cur.rivalBoost += 2; return t('cardx.jealous', { name: r.rival.last }); } return ''; },
  coin: r => fx(r, { chem: r.rng.chance(0.5) ? 6 : -6 }),
  // Zum Team des Rivalen wechseln (gemeinsam statt gegeneinander)
  joinrival: r => {
    const id = r.rival.teamId !== r.p.teamId ? r.rival.teamId : byBase(others(r))[0].id;
    moveTeam(r, id); r.p.ringChase = true; r.rival.teamId = byBase(others(r))[0].id;
    return t('cardx.move', { abbr: r.teams[id].abbr });
  },
  // Zurueck in die Heimat: ein eher schwaches Team
  hometown: r => { const x = r.rng.pick(byBase(others(r)).slice(-12)); moveTeam(r, x.id); r.p.ringChase = false; return t('cardx.move', { abbr: x.abbr }); },
  // Grossstadt-Team (New York / Los Angeles), sonst ein beliebiges
  bigmarket: r => {
    const big = others(r).filter(x => /New York|Los Angeles|Brooklyn/.test(x.city));
    const x = r.rng.pick(big.length ? big : others(r)); moveTeam(r, x.id); r.p.ringChase = false;
    return t('cardx.move', { abbr: x.abbr });
  },
};

// Bedingungs-Helfer
const weak = r => T(r).base < 52, strong = r => T(r).base >= 60;

export const CARDS = [
  // ---------------- OFFSEASON ----------------
  { id: 'training', when: 'off', w: 1.5, opts: [{ fx: { sho: 4, clu: 1 } }, { fx: { ath: 3, body: 4 } }, { fx: { def: 3, pla: 2 } }] },
  { id: 'freeagency', when: 'off', w: r => (r.seasonNo >= 3 && r.seasonNo % 3 === 0 ? 30 : 0),
    opts: [{ special: 'maxdeal', fx: { fame: 6 }, hint: ['newTeam'] }, { special: 'superteam', fx: { fame: -5 }, hint: ['ring'] }, { fx: { chem: 8 }, hint: ['loyal'] }] },
  { id: 'traderequest', when: 'off', cond: r => r.seasonNo >= 2 && T(r).base < 55, w: 3,
    opts: [{ special: 'trade', fx: { fame: -3 }, hint: ['newTeam'] }, { fx: { chem: 6, base: 3 } }] },
  { id: 'mentor', when: 'off', cond: r => age(r) <= 24, opts: [{ special: 'mentor', fx: { clu: 4, pla: 2, form: 2 }, hint: ['rivalQ'] }, { fx: { ath: 2 } }] },
  { id: 'loadmgmt', when: 'off', cond: r => age(r) >= 30, w: 2, opts: [{ fx: { body: 10, form: -2, chem: -3, injuryGames: 10 } }, { fx: { form: 2, body: -8 } }] },
  { id: 'national', when: 'off', cond: r => r.seasonNo >= 2 && age(r) <= 31, opts: [{ fx: { fame: 8, clu: 2, body: -6 } }, { fx: { body: 4, fame: -2 } }] },
  { id: 'shoe', when: 'off', cond: r => r.p.fame >= 50, opts: [{ fx: { fame: 12, form: -2 } }, { fx: { form: 2 } }] },
  { id: 'diet', when: 'off', opts: [{ fx: { body: 7, chem: -2 } }, { fx: { chem: 5, body: -3 } }] },
  { id: 'summerleague', when: 'off', cond: r => r.seasonNo <= 2, opts: [{ fx: { form: 3, body: -3 } }, { fx: { body: 3 } }] },
  { id: 'skillsguru', when: 'off', opts: [{ fx: { pla: 3, sho: 2, body: -2 } }, { fx: { chem: 3 } }] },
  { id: 'yoga', when: 'off', cond: r => age(r) >= 26, opts: [{ fx: { body: 5, clu: 2 } }, { fx: { form: 1, chem: -2 } }] },
  { id: 'hometown', when: 'off', opts: [{ fx: { fame: 5, form: -1 } }, { fx: { form: 1 } }] },
  { id: 'agent', when: 'off', opts: [{ fx: { fame: 6, chem: -4 } }, { fx: { chem: 3 } }] },
  { id: 'podcast', when: 'off', cond: r => r.p.fame >= 30, opts: [{ fx: { fame: 8, form: -2 } }, { fx: { form: 1 } }] },
  { id: 'extension', when: 'off', cond: r => r.seasonNo >= 2 && r.seasonNo % 3 !== 0, opts: [{ fx: { chem: 8, fame: -2 }, hint: ['loyal'] }, { fx: { form: 2, chem: -3 } }] },
  { id: 'altitude', when: 'off', opts: [{ fx: { ath: 3, body: 2, chem: -2 } }, { fx: { chem: 2 } }] },
  { id: 'shootcoach', when: 'off', opts: [{ fx: { sho: 6, form: -3 }, risk: { p: 0.25, fx: { sho: -3 }, msg: 'cardx.backfire' } }, { fx: { sho: 2 } }] },
  { id: 'bulkup', when: 'off', opts: [{ fx: { def: 3, ath: -2, body: 3 } }, { fx: { ath: 2 } }] },
  { id: 'vacation', when: 'off', opts: [{ fx: { fame: 4, form: -2, chem: 2 } }, { fx: { form: 2, chem: -1 } }] },
  { id: 'rookiementor', when: 'off', cond: r => age(r) >= 29, opts: [{ fx: { chem: 8, fame: 2 } }, { fx: { form: 1, chem: -5 } }] },
  { id: 'surgery', when: 'off', cond: r => r.p.body < 65, w: 2, opts: [{ fx: { body: 15, form: -3, injuryGames: 8 } }, { fx: { body: 5 } }] },
  { id: 'movie', when: 'off', cond: r => r.p.fame >= 55, opts: [{ fx: { fame: 12, form: -3, body: -2 } }, { fx: { form: 1 } }] },
  { id: 'charity', when: 'off', opts: [{ fx: { fame: 5, chem: 3, body: -2 } }, { fx: { form: 1 } }] },
  { id: 'newcoach', when: 'off', opts: [{ fx: { ath: 2, chem: 4 } }, { fx: { form: 1, chem: -3 } }] },
  { id: 'traderumor', when: 'off', cond: r => r.seasonNo >= 2, opts: [{ fx: { chem: 5, fame: -2 } }, { fx: { fame: 6, chem: -6 } }, { special: 'traderandom', hint: ['newTeam'], mystery: true }] },
  { id: 'brotherhood', when: 'off', opts: [{ fx: { chem: 6, body: -1 } }, { fx: { form: 2 } }] },
  { id: 'esports', when: 'off', cond: r => age(r) <= 27, opts: [{ fx: { fame: 5, body: -2 } }, { fx: { body: 2 } }] },

  // ---------------- SAISON-EVENTS ----------------
  { id: 'injury', when: 'late', w: r => injuryChance(r.p) * 12, opts: [{ fx: { body: -10, playoffPower: 4, chem: 3 }, risk: { p: 0.3, fx: { form: -4, body: -6 }, msg: 'cardx.ouch' } }, { fx: { body: 4, playoffPower: -3, injuryGames: 12 } }] },
  { id: 'backspasm', when: 'any', w: r => injuryChance(r.p) * 8, opts: [{ fx: { body: -6, power: 1 } }, { fx: { body: 3, power: -1, injuryGames: 4 } }] },
  { id: 'hamstring', when: 'any', w: r => injuryChance(r.p) * 8, opts: [{ fx: { body: -7, form: 1 }, risk: { p: 0.25, fx: { body: -6, injuryGames: 10 }, msg: 'cardx.ouch' } }, { fx: { body: 4, injuryGames: 6 } }] },
  { id: 'flu', when: 'any', opts: [{ fx: { fame: 6, body: -4, clu: 2 } }, { fx: { body: 2, power: -1 } }] },
  { id: 'media', when: 'any', w: r => 0.6 + r.p.fame / 60, opts: [{ fx: { fame: 10, chem: -8 } }, { fx: { fame: -3 } }, { fx: { chem: 5, fame: -4 } }] },
  { id: 'shots', when: 'mid', opts: [{ fx: { usage: 4, chem: -10, fame: 4 } }, { fx: { chem: 6, pla: 1 } }] },
  { id: 'sponsor', when: 'any', opts: [{ fx: { fame: 10, form: -3 } }, { fx: { form: 1, chem: 2 } }] },
  { id: 'chem', when: 'any', w: r => (r.p.chem < 50 ? 2 : 0.8), opts: [{ fx: { chem: 10, body: -1 } }, { fx: { chem: -6, form: 1 } }, { special: 'coin', mystery: true }] },
  { id: 'rival', when: 'any', opts: [{ fx: { fame: 8, clu: 3, rivalBoost: 1 } }, { fx: { form: 2 } }] },
  { id: 'party', when: 'any', cond: r => age(r) <= 31, opts: [{ fx: { fame: 8, body: -4 }, risk: { p: 0.25, fx: { form: -3, chem: -5 }, msg: 'cardx.photos' } }, { fx: { body: 3 } }] },
  { id: 'rookiewall', when: 'mid', cond: r => r.seasonNo === 1, w: 4, opts: [{ fx: { form: 3, body: -5 } }, { fx: { body: 5 } }] },
  { id: 'viral', when: 'any', cond: r => r.p.skills.ath >= 58, opts: [{ fx: { fame: 10 } }, { fx: { chem: 5, fame: 3 } }] },
  { id: 'coachfired', when: 'mid', cond: weak, w: 2, opts: [{ fx: { base: 4, chem: -4 } }, { fx: { chem: 7 } }] },
  { id: 'deadline', when: 'late', cond: r => strong(r) && r.seasonNo >= 2, w: 2, opts: [{ fx: { power: 4, playoffPower: 2, chem: -2, base: -3 } }, { fx: { chem: 4 } }] },
  { id: 'slump', when: 'mid', opts: [{ fx: { sho: 3, body: -3 } }, { fx: { clu: 3, form: 1 } }] },
  { id: 'hotstreak', when: 'mid', opts: [{ fx: { power: 2, body: -3 } }, { fx: { chem: 5 } }] },
  { id: 'allstarvote', when: 'mid', cond: r => r.p.fame >= 45, opts: [{ fx: { fame: 6, chem: -3 } }, { fx: { form: 1 } }] },
  { id: 'dunkcontest', when: 'mid', cond: r => r.p.skills.ath >= 60 && age(r) <= 28, opts: [{ fx: { fame: 10, body: -3 }, risk: { p: 0.15, fx: { body: -8, injuryGames: 6 }, msg: 'cardx.ouch' } }, { fx: { body: 2 } }] },
  { id: 'threecontest', when: 'mid', cond: r => r.p.skills.sho >= 62, opts: [{ fx: { fame: 6, sho: 2 } }, { fx: { body: 3 } }] },
  { id: 'refrant', when: 'any', opts: [{ fx: { fame: 5, chem: 3, form: -1 } }, { fx: { chem: 2 } }] },
  { id: 'costar', when: 'any', cond: r => r.p.chem < 70, opts: [{ fx: { chem: 8, usage: -2 } }, { fx: { usage: 3, chem: -8 } }] },
  { id: 'backtoback', when: 'any', cond: r => age(r) >= 28, opts: [{ fx: { body: -5, power: 1, form: 1 } }, { fx: { body: 4, power: -1 } }] },
  { id: 'fankid', when: 'any', opts: [{ fx: { fame: 5, chem: 2 } }, { fx: { form: 1 } }] },
  { id: 'lastshot', when: 'mid', opts: [{ fx: { clu: 3, fame: 4, chem: -4 } }, { fx: { chem: 6, pla: 1 } }] },
  { id: 'snowstorm', when: 'any', opts: [{ fx: { chem: 6 } }, { fx: { body: 3 } }] },
  { id: 'contractyear', when: 'mid', cond: r => r.seasonNo % 3 === 2, opts: [{ fx: { usage: 3, chem: -5, fame: 3 } }, { fx: { chem: 4, power: 1 } }] },
  { id: 'tanking', when: 'mid', cond: r => T(r).base < 50, opts: [{ fx: { fame: 3, base: 2, chem: -3 } }, { fx: { chem: 2 } }] },
  { id: 'legend', when: 'any', opts: [{ fx: { clu: 2, pla: 2 } }, { fx: { fame: 3, ath: 1 } }] },
  { id: 'hacked', when: 'any', opts: [{ fx: { fame: 3 } }, { fx: { chem: -1, form: 1 } }] },
  { id: 'tvgame', when: 'any', opts: [{ fx: { usage: 3, fame: 5, chem: -3 } }, { fx: { chem: 4, power: 1 } }] },
  { id: 'benched', when: 'any', opts: [{ fx: { fame: 4, chem: -8 } }, { fx: { chem: 4, form: -1 } }] },
  { id: 'newshooter', when: 'mid', opts: [{ fx: { chem: 4, power: 2 } }, { fx: { usage: 2, chem: -4 } }] },
  { id: 'sleep', when: 'any', opts: [{ fx: { body: 4, form: 1, chem: -1 } }, { fx: { chem: 1 } }] },
  { id: 'missedft', when: 'late', opts: [{ fx: { clu: 3, body: -2 } }, { fx: { form: 1, fame: -2 } }] },
  { id: 'baby', when: 'any', cond: r => age(r) >= 24, opts: [{ fx: { chem: 3, power: -1, fame: 2 } }, { fx: { power: 1, chem: -2 } }] },
  { id: 'playoffpush', when: 'late', opts: [{ fx: { power: 2, body: -6 } }, { fx: { body: 3 } }] },
  { id: 'cover', when: 'any', cond: r => r.p.fame >= 40, opts: [{ fx: { fame: 8 }, risk: { p: 0.25, fx: { body: -8 }, msg: 'cardx.curse' } }, { fx: { form: 1 } }] },
  { id: 'mascot', when: 'any', opts: [{ fx: { fame: 4 }, risk: { p: 0.5, fx: { clu: 2, fame: 3 }, msg: 'cardx.halfcourt' } }, { fx: { chem: 1 } }] },
  { id: 'rookiehazing', when: 'any', cond: r => r.seasonNo <= 2, opts: [{ fx: { chem: 6, fame: -1 } }, { fx: { chem: -5, fame: 2 } }] },
  { id: 'veteranday', when: 'any', cond: r => age(r) >= 31, opts: [{ fx: { fame: 4, chem: 3 } }, { fx: { form: 1, body: 1 } }] },
  { id: 'nightlife', when: 'any', cond: r => age(r) <= 26, opts: [{ fx: { fame: 5, form: -2 } }, { fx: { form: 2, fame: -1 } }] },
  { id: 'teamdinner', when: 'any', opts: [{ fx: { chem: 5, fame: -1 } }, { fx: { form: 1 } }] },
  { id: 'filmsession', when: 'any', opts: [{ fx: { def: 2, pla: 2, chem: -2 } }, { fx: { chem: 2 } }] },
  { id: 'heatcheck', when: 'late', opts: [{ fx: { usage: 2, clu: 2 } }, { fx: { pla: 2, chem: 3 } }] },
  { id: 'jerseyswap', when: 'any', opts: [{ fx: { fame: 3, rivalBoost: -1 } }, { fx: { clu: 2, rivalBoost: 1 } }] },
  { id: 'charityfine', when: 'any', opts: [{ fx: { fame: 4, chem: 2 } }, { fx: { fame: -3 } }] },

  // ---------------- Erweiterung: Free Agency, Trades, Coach, Karriere ----------------
  { id: 'farival', when: 'off', cond: r => r.seasonNo >= 3 && r.rival.teamId !== r.p.teamId, w: 1.5,
    opts: [{ special: 'joinrival', fx: { fame: -4 }, hint: ['newTeam', 'ring'] }, { fx: { clu: 3, chem: 3 } }] },
  { id: 'fahometown', when: 'off', cond: r => r.seasonNo >= 3, opts: [{ special: 'hometown', fx: { fame: 6, chem: 6 }, hint: ['newTeam'] }, { fx: { chem: 3 } }] },
  { id: 'fabigmarket', when: 'off', cond: r => r.seasonNo >= 2, opts: [{ special: 'bigmarket', fx: { fame: 10, chem: -2 }, hint: ['newTeam'] }, { fx: { chem: 4 }, hint: ['loyal'] }] },
  { id: 'tradeask', when: 'off', cond: r => r.seasonNo >= 2, w: 1.5,
    opts: [{ special: 'trade', fx: { fame: -3 }, hint: ['newTeam'] }, { fx: { chem: 5 } }, { fx: { fame: 5, chem: -8 }, risk: { p: 0.5, special: 'trade', msg: 'cardx.leaked' } }] },
  { id: 'coachcrit', when: 'any', w: 1.5,
    opts: [{ fx: { fame: 6, chem: -8 }, risk: { p: 0.4, fx: { base: -2, chem: 4 }, msg: 'cardx.coachOut' } }, { fx: { chem: 4, usage: 1 } }, { fx: { form: 1, chem: 1 } }] },
  { id: 'holdout', when: 'off', cond: r => r.seasonNo >= 2, opts: [{ fx: { fame: 5, form: -4, chem: -6 } }, { fx: { chem: 4 } }] },
  { id: 'newarena', when: 'off', opts: [{ fx: { fame: 6, body: -1 } }, { fx: { form: 1 } }] },
  { id: 'olympics', when: 'off', cond: r => r.p.age >= 22 && r.p.age <= 32 && r.seasonNo % 4 === 2, w: 2,
    opts: [{ fx: { fame: 10, clu: 3, body: -6 }, risk: { p: 0.15, fx: { body: -8 }, msg: 'cardx.ouch' } }, { fx: { body: 4 } }] },
  { id: 'slimdown', when: 'off', cond: r => r.p.arch === 'big', opts: [{ fx: { ath: 3, def: -1 } }, { fx: { def: 2 } }] },
  { id: 'newrange', when: 'off', cond: r => r.p.skills.sho < 60, opts: [{ fx: { sho: 5, form: -2 } }, { fx: { ath: 2 } }] },
  { id: 'captain', when: 'off', cond: r => r.p.age >= 26, opts: [{ fx: { chem: 8, fame: 3 } }, { fx: { form: 1 } }] },
  { id: 'startup', when: 'off', cond: r => r.p.fame >= 40, opts: [{ fx: { fame: 3 }, risk: { p: 0.35, fx: { fame: -6 }, msg: 'cardx.flop' } }, { fx: { form: 1 } }] },
  { id: 'family', when: 'off', opts: [{ fx: { body: 5, chem: 2 } }, { fx: { fame: 6, body: -3 } }] },
  { id: 'streetball', when: 'off', cond: r => r.p.age <= 28, opts: [{ fx: { fame: 5, ath: 1 }, risk: { p: 0.15, fx: { body: -6 }, msg: 'cardx.ouch' } }, { fx: { body: 2 } }] },
  { id: 'documentary', when: 'off', cond: r => r.p.fame >= 45, opts: [{ fx: { fame: 10, chem: -5 } }, { fx: { chem: 2 } }] },
  { id: 'stardown', when: 'any', opts: [{ fx: { usage: 4, body: -4 } }, { fx: { chem: 3, power: -2 } }] },
  { id: 'speech', when: 'late', opts: [{ fx: { chem: 8 }, risk: { p: 0.3, fx: { chem: -12 }, msg: 'cardx.flat' } }, { fx: { form: 1 } }] },
  { id: 'heckler', when: 'any', opts: [{ fx: { fame: 4, chem: -3 }, risk: { p: 0.35, fx: { injuryGames: 5, fame: -4 }, msg: 'cardx.suspended' } }, { fx: { clu: 2 } }] },
  { id: 'statchase', when: 'late', opts: [{ fx: { usage: 2, chem: -4, fame: 4 } }, { fx: { chem: 3 } }] },
  { id: 'homecoming', when: 'any', opts: [{ fx: { usage: 2, fame: 5 } }, { fx: { chem: 4 } }] },
  { id: 'hotrookie', when: 'any', cond: r => r.p.age >= 24, opts: [{ fx: { chem: 3, fame: 2 } }, { fx: { clu: 3, fame: 3, chem: -2 } }] },
  { id: 'gmmeeting', when: 'mid', opts: [{ fx: { power: 3, chem: -4 } }, { fx: { chem: 5 } }] },
  { id: 'mri', when: 'late', cond: r => r.p.age >= 26, opts: [{ fx: { injuryGames: 5, body: 6 } }, { fx: { form: 1 }, risk: { p: 0.35, fx: { body: -10 }, msg: 'cardx.ouch' } }] },
  { id: 'redeye', when: 'any', opts: [{ fx: { body: 3 } }, { fx: { fame: 2, body: -2 } }] },
  { id: 'farewell', when: 'late', cond: r => r.p.age >= 33, opts: [{ fx: { fame: 10, chem: 5 } }, { fx: { form: 1 } }] },
  { id: 'charitygame', when: 'any', opts: [{ fx: { fame: 5, body: -2 } }, { fx: { body: 1 } }] },
  { id: 'playercoach', when: 'mid', cond: r => r.p.age >= 27, opts: [{ fx: { pla: 3, chem: 4, body: -1 } }, { fx: { form: 1 } }] },
  { id: 'billboard', when: 'any', cond: r => r.p.fame >= 50, opts: [{ fx: { fame: 6, chem: -2 } }, { fx: { chem: 2 } }] },
  { id: 'globalgame', when: 'mid', opts: [{ fx: { fame: 4, body: -3 } }, { fx: { form: 1 } }] },
  { id: 'protege', when: 'any', cond: r => r.p.age >= 30, opts: [{ fx: { chem: 6, usage: -2 } }, { fx: { usage: 2, chem: -4, form: 1 } }] },
  { id: 'rivalhurt', when: 'any', opts: [{ fx: { fame: 4, chem: 2 } }, { fx: { fame: 6, rivalBoost: 2 } }] },
  { id: 'refscandal', when: 'any', opts: [{ fx: { fame: 3, chem: 2 } }, { fx: { form: 1 } }] },
  { id: 'nbajam', when: 'any', cond: r => r.p.skills.ath >= 60, opts: [{ fx: { fame: 5, ath: 1 } }, { fx: { body: 2 } }] },
  { id: 'clubhouse', when: 'mid', opts: [{ fx: { chem: 5, fame: -1 } }, { fx: { form: 1, chem: -2 } }] },
  { id: 'gametape', when: 'any', opts: [{ fx: { def: 3, body: -1 } }, { fx: { sho: 2 } }] },

  // ---------------- Erweiterung 2: 100+ weitere Karten ----------------
  { id: 'agentdrama', when: 'off', opts: [{ fx: { chem: 2, fame: -2 } }, { risk: { p: 0.3, fx: { fame: -6 }, msg: 'cardx.scandal' } }] },
  { id: 'colorway', when: 'off', cond: 'fame35', opts: [{ fx: { fame: 6, form: -1 } }, { fx: { form: 1 } }] },
  { id: 'coachclinic', when: 'off', cond: 'vet', opts: [{ fx: { pla: 3, body: -1 } }, { fx: { body: 3 } }] },
  { id: 'boxing', when: 'off', opts: [{ fx: { def: 3, body: -2 } }, { fx: { body: 2 } }] },
  { id: 'pool', when: 'off', opts: [{ fx: { body: 5, ath: -1 } }, { fx: { ath: 2, body: -2 } }] },
  { id: 'chef', when: 'off', cond: 'fame30', opts: [{ fx: { body: 4, fame: 1 } }, { fx: { chem: 1 } }] },
  { id: 'eurotour', when: 'off', opts: [{ fx: { fame: 7, body: -3 } }, { fx: { body: 3 } }] },
  { id: 'asiatour', when: 'off', cond: 'fame45', opts: [{ fx: { fame: 8, body: -4 } }, { fx: { form: 1 } }] },
  { id: 'playground', when: 'off', cond: 'young', opts: [{ fx: { fame: 4, clu: 2 } }, { fx: { body: 1 } }] },
  { id: 'psych', when: 'off', opts: [{ fx: { clu: 4, fame: -1 } }, { fx: { form: 1 } }] },
  { id: 'incentives', when: 'off', cond: 's2', opts: [{ fx: { form: 2, chem: -2 } }, { fx: { chem: 3 } }] },
  { id: 'number', when: 'off', opts: [{ fx: { fame: 3 } }, { fx: { chem: 2 } }] },
  { id: 'newlook', when: 'off', opts: [{ fx: { fame: 3 } }, { fx: { chem: 1 } }] },
  { id: 'reunion', when: 'off', opts: [{ fx: { chem: 3, fame: 2 } }, { fx: { form: 1 } }] },
  { id: 'rehab', when: 'off', cond: 'hurt', opts: [{ fx: { body: 8, form: -2 } }, { fx: { form: 2, body: -4 } }] },
  { id: 'countryside', when: 'off', opts: [{ fx: { body: 4, fame: -2 } }, { fx: { fame: 4, body: -1 } }] },
  { id: 'tradebait', when: 'off', cond: 's2', opts: [{ fx: { chem: -3, fame: 2 } }, { fx: { chem: 2 }, risk: { p: 0.4, msg: 'cardx.blockbuster', special: 'traderandom' } }] },
  { id: 'recruit', when: 'off', cond: 'strong', opts: [{ fx: { base: 3, fame: 2, body: -1 } }, { fx: { chem: 1 } }] },
  { id: 'wedding', when: 'off', opts: [{ fx: { chem: 5, body: -2 } }, { fx: { form: 1, chem: -2 } }] },
  { id: 'rating', when: 'off', opts: [{ fx: { clu: 2, fame: 2 } }, { fx: { chem: 1 } }] },
  { id: 'degree', when: 'off', opts: [{ fx: { fame: 3, form: -1 } }, { fx: { form: 1 } }] },
  { id: 'trainerquit', when: 'off', opts: [{ fx: { body: 3, fame: -1 } }, { fx: { chem: 3 } }] },
  { id: 'beach', when: 'off', opts: [{ fx: { ath: 3, body: -1 } }, { fx: { body: 2 } }] },
  { id: 'dance', when: 'off', opts: [{ fx: { ath: 2, fame: 2 } }, { fx: { chem: 1 } }] },
  { id: 'chess', when: 'off', opts: [{ fx: { pla: 2, clu: 1 } }, { fx: { form: 1 } }] },
  { id: 'nightclub', when: 'off', cond: 'fame40', opts: [{ fx: { fame: 5, form: -2 } }, { fx: { form: 1 } }] },
  { id: 'lefthand', when: 'off', opts: [{ fx: { pla: 2, sho: 1, form: -1 } }, { fx: { form: 1 } }] },
  { id: 'scrimmage', when: 'off', opts: [{ fx: { form: 3, body: -3 } }, { fx: { body: 2 } }] },
  { id: 'visualization', when: 'off', opts: [{ fx: { clu: 3 } }, { fx: { chem: 2 } }] },
  { id: 'hothead', when: 'any', opts: [{ fx: { chem: 3, fame: -2 } }, { fx: { fame: 4 }, risk: { p: 0.3, fx: { injuryGames: 4 }, msg: 'cardx.suspended' } }] },
  { id: 'topplay', when: 'any', opts: [{ fx: { fame: 5 } }, { fx: { chem: 3 } }] },
  { id: 'mateslump', when: 'any', opts: [{ fx: { chem: 5, form: -1 } }, { fx: { form: 1 } }] },
  { id: 'salaryenvy', when: 'any', opts: [{ fx: { chem: 4 } }, { fx: { form: 1, chem: -4 } }] },
  { id: 'tripledouble', when: 'late', opts: [{ fx: { fame: 4, chem: -3 } }, { fx: { chem: 3 } }] },
  { id: 'brace', when: 'any', cond: 'hurt', opts: [{ fx: { body: 4, ath: -1 } }, { fx: { ath: 1 }, risk: { p: 0.35, fx: { body: -6 }, msg: 'cardx.ouch' } }] },
  { id: 'sushi', when: 'any', opts: [{ fx: { fame: 4, body: -5 } }, { fx: { power: -1, body: 2 } }] },
  { id: 'proposal', when: 'any', opts: [{ fx: { fame: 3, chem: 2 } }, { fx: { form: 1 } }] },
  { id: 'blackout', when: 'any', opts: [{ fx: { fame: 3 } }, { fx: { body: 2 } }] },
  { id: 'refgrudge', when: 'any', opts: [{ fx: { fame: 2 }, risk: { p: 0.3, fx: { chem: -3 }, msg: 'cardx.fined' } }, { fx: { clu: 2 } }] },
  { id: 'mvpchants', when: 'any', cond: 'fame50', opts: [{ fx: { fame: 5, chem: -2 } }, { fx: { chem: 4 } }] },
  { id: 'coachvote', when: 'mid', opts: [{ fx: { chem: 5 } }, { fx: { fame: 2, chem: -5 } }] },
  { id: 'minutes', when: 'mid', cond: 'young', opts: [{ fx: { usage: 2, chem: -4 } }, { fx: { form: 2 } }] },
  { id: 'nickname', when: 'any', opts: [{ fx: { fame: 5 } }, { fx: { chem: 1 } }] },
  { id: 'jerseysales', when: 'any', cond: 'fame50', opts: [{ fx: { fame: 4 } }, { fx: { chem: 3 } }] },
  { id: 'potw', when: 'any', opts: [{ fx: { fame: 4 } }, { fx: { chem: 4 } }] },
  { id: 'benchmob', when: 'any', opts: [{ fx: { chem: 6 } }, { fx: { form: 2, chem: -2 } }] },
  { id: 'stolenshoes', when: 'any', opts: [{ fx: { form: -1, fame: 2 } }, { fx: { chem: 1 } }] },
  { id: 'tunnel', when: 'any', opts: [{ fx: { fame: 3 }, risk: { p: 0.3, fx: { injuryGames: 3 }, msg: 'cardx.suspended' } }, { fx: { chem: 2 } }] },
  { id: 'oldcoach', when: 'any', opts: [{ fx: { fame: 3, clu: 1 } }, { fx: { chem: 1 } }] },
  { id: 'collision', when: 'any', opts: [{ fx: { chem: 4 } }, { fx: { form: 1 } }] },
  { id: 'scoringstreak', when: 'any', opts: [{ fx: { usage: 2, fame: 3, chem: -2 } }, { fx: { chem: 4 } }] },
  { id: 'ftyips', when: 'any', opts: [{ fx: { clu: 3, form: -1 } }, { risk: { p: 0.4, fx: { clu: -2 }, msg: 'cardx.yips' } }] },
  { id: 'dunkoty', when: 'any', cond: 'ath', opts: [{ fx: { fame: 5 } }, { fx: { chem: 1 } }] },
  { id: 'naming', when: 'any', opts: [{ fx: { fame: 3, chem: -1 } }, { fx: { form: 1 } }] },
  { id: 'fight', when: 'any', opts: [{ fx: { chem: 8 }, risk: { p: 0.35, fx: { injuryGames: 5 }, msg: 'cardx.suspended' } }, { fx: { fame: 1, chem: 2 } }] },
  { id: 'ritual', when: 'any', opts: [{ fx: { clu: 2 } }, { fx: { chem: 1 } }] },
  { id: 'delay', when: 'any', opts: [{ fx: { body: -3, fame: 2 } }, { fx: { power: -1, body: 2 } }] },
  { id: 'superfan', when: 'any', opts: [{ fx: { fame: 3, chem: 1 } }, { fx: { form: 1 } }] },
  { id: 'staterror', when: 'any', opts: [{ fx: { chem: 2 } }, { fx: { fame: 2 } }] },
  { id: 'rivaldm', when: 'any', opts: [{ fx: { fame: 5, rivalBoost: 1 } }, { fx: { clu: 2 } }] },
  { id: 'materetire', when: 'late', opts: [{ fx: { chem: 6 } }, { fx: { form: 1 } }] },
  { id: 'hospital', when: 'any', opts: [{ fx: { fame: 3, chem: 3 } }, { fx: { form: 1 } }] },
  { id: 'mascothit', when: 'any', opts: [{ fx: { fame: 4 } }, { fx: { fame: -1 } }] },
  { id: 'walkout', when: 'any', opts: [{ fx: { fame: 2, clu: 1 } }, { fx: { chem: 1 } }] },
  { id: 'lateshow', when: 'any', cond: 'fame45', opts: [{ fx: { fame: 6, body: -1 } }, { fx: { form: 1 } }] },
  { id: 'anklebreaker', when: 'any', opts: [{ fx: { fame: 5 } }, { fx: { chem: 2 } }] },
  { id: 'posterized', when: 'any', opts: [{ fx: { chem: 2 } }, { fx: { def: 2, fame: 1 } }] },
  { id: 'defchallenge', when: 'any', opts: [{ fx: { def: 3, body: -2 } }, { fx: { chem: -3, fame: 2 } }] },
  { id: 'leak', when: 'any', opts: [{ fx: { chem: -2, power: 1 } }, { fx: { chem: 2 } }] },
  { id: 'cover', when: 'any', opts: [{ fx: { chem: 5 }, risk: { p: 0.35, fx: { fame: -4 }, msg: 'cardx.exposed' } }, { fx: { chem: -5, power: 1 } }] },
  { id: 'fanletter', when: 'any', opts: [{ fx: { fame: 3, chem: 1 } }, { fx: { chem: 1 } }] },
  { id: 'recordcrowd', when: 'any', opts: [{ fx: { fame: 3, power: 1 } }, { fx: { chem: 1 } }] },
  { id: 'ironstreak', when: 'any', cond: 'vet', opts: [{ fx: { fame: 3, body: -4 } }, { fx: { body: 4 } }] },
  { id: 'prototype', when: 'any', opts: [{ fx: { ath: 1 }, risk: { p: 0.3, fx: { body: -4 }, msg: 'cardx.ouch' } }, { fx: { chem: 1 } }] },
  { id: 'opphurt', when: 'any', opts: [{ fx: { fame: 3, chem: 1 } }, { fx: { form: 1 } }] },
  { id: 'airball', when: 'any', opts: [{ fx: { fame: 3 } }, { fx: { sho: 2, body: -1 } }] },
  { id: 'rerumor', when: 'any', cond: 's2', opts: [{ fx: { chem: 3 } }, { fx: { fame: 3, chem: -3 } }] },
  { id: 'clutchdebate', when: 'any', opts: [{ fx: { fame: 3, clu: 2 } }, { fx: { form: 1 } }] },
  { id: 'powerrank', when: 'any', cond: 'strong', opts: [{ fx: { chem: 3, power: 1 } }, { fx: { fame: 3, chem: -1 } }] },
  { id: 'losingstreak', when: 'any', opts: [{ fx: { chem: 6 }, risk: { p: 0.3, fx: { chem: -6 }, msg: 'cardx.flat' } }, { fx: { fame: 2, chem: -5 } }] },
  { id: 'newgm', when: 'mid', cond: 'weak', opts: [{ fx: { chem: 3, base: -2 } }, { fx: { fame: 2, chem: -3 }, risk: { p: 0.35, msg: 'cardx.blockbuster', special: 'trade' } }] },
  { id: 'walkpress', when: 'any', opts: [{ fx: { fame: 4, chem: -1 } }, { fx: { chem: 2 } }] },
  { id: 'legendcrit', when: 'any', opts: [{ fx: { fame: 5, clu: 1 } }, { fx: { chem: 2 } }] },
  { id: 'stiffneck', when: 'any', opts: [{ fx: { body: -3 } }, { fx: { power: -1, body: 2 } }] },
  { id: 'drinkbrand', when: 'any', cond: 'fame55', opts: [{ fx: { fame: 6, form: -2 } }, { fx: { form: 1 } }] },
  { id: 'puppy', when: 'any', opts: [{ fx: { chem: 2, body: -1, fame: 2 } }, { fx: { form: 1 } }] },
  { id: 'scoutrival', when: 'any', opts: [{ fx: { clu: 2, def: 2, body: -1 } }, { fx: { form: 1 } }] },
  { id: 'garbagetime', when: 'any', opts: [{ fx: { fame: 2, chem: -3 } }, { fx: { body: 3 } }] },
  { id: 'anthem', when: 'any', opts: [{ fx: { fame: 5 }, risk: { p: 0.4, fx: { fame: -6 }, msg: 'cardx.offkey' } }, { fx: { chem: 1 } }] },
  { id: 'allaccess', when: 'any', opts: [{ fx: { fame: 4, chem: -2 } }, { fx: { chem: 1 } }] },
  { id: 'turnover', when: 'any', opts: [{ fx: { chem: 5 } }, { fx: { fame: 2, chem: -3 } }] },
  { id: 'missedwinner', when: 'any', opts: [{ fx: { clu: 3, body: -2 } }, { fx: { body: 2 } }] },
  { id: 'prankwar', when: 'any', opts: [{ fx: { chem: 5, fame: 1 } }, { fx: { form: 1 } }] },
  { id: 'tvgig', when: 'any', cond: 'fame40', opts: [{ fx: { fame: 4, body: -1 } }, { fx: { form: 1 } }] },
  { id: 'buyout', when: 'late', cond: 'vet', opts: [{ special: 'superteam', fx: { fame: -2 }, hint: ['newTeam', 'ring'] }, { fx: { chem: 3 } }] },
  { id: 'celebbet', when: 'any', opts: [{ fx: { usage: 2, fame: 4, chem: -2 } }, { fx: { chem: 1 } }] },
  { id: 'mombday', when: 'any', opts: [{ fx: { chem: 2, body: -2 } }, { fx: { body: 1 } }] },
  { id: 'heatwave', when: 'any', opts: [{ fx: { body: -3, clu: 2 } }, { fx: { body: 1 } }] },
  { id: 'restweek', when: 'late', cond: 'strong', opts: [{ fx: { body: 6, power: -1 } }, { fx: { form: 1, power: 1, body: -3 } }] },
  { id: 'rookiecamp', when: 'mid', cond: 'young', opts: [{ fx: { form: 2, body: -2 } }, { fx: { chem: 2 } }] },
  { id: 'sponsorclash', when: 'any', cond: 'fame40', opts: [{ fx: { fame: 3, chem: -2 } }, { fx: { chem: 2, fame: -1 } }] },
  { id: 'jerseyfan', when: 'any', opts: [{ fx: { fame: 2, chem: 2 } }, { fx: { form: 1 } }] },
  { id: 'injuredmate2', when: 'any', opts: [{ fx: { usage: 3, body: -3, fame: 2 } }, { fx: { chem: 3 } }] },
  { id: 'coachtimeout', when: 'late', opts: [{ fx: { chem: -4, clu: 3 } }, { fx: { chem: 3 } }] },
];

export const cardById = id => CARDS.find(c => c.id === id);

// Kurz-Bedingungen fuer Karten (cond: 'young' usw.)
const COND = {
  young: r => r.p.age <= 25, vet: r => r.p.age >= 30, hurt: r => r.p.body < 65, s2: r => r.seasonNo >= 2,
  strong: r => T(r).base >= 60, weak: r => T(r).base < 52, ath: r => r.p.skills.ath >= 60,
  fame30: r => r.p.fame >= 30, fame35: r => r.p.fame >= 35, fame40: r => r.p.fame >= 40,
  fame45: r => r.p.fame >= 45, fame50: r => r.p.fame >= 50, fame55: r => r.p.fame >= 55,
};

function weightOf(c, run) {
  const cond = typeof c.cond === 'string' ? COND[c.cond] : c.cond;
  if (cond && !cond(run)) return 0;
  return typeof c.w === 'function' ? c.w(run) : (c.w ?? 1);
}

// phase: 'off' | 'mid' | 'late'. Bereits gezogene Karten werden im Run nicht wiederholt.
export function drawCard(run, phase) {
  run.usedCards = run.usedCards || [];
  const fits = c => (phase === 'off' ? c.when === 'off' : c.when === phase || c.when === 'any');
  let pool = CARDS.filter(c => fits(c) && !run.usedCards.includes(c.id) && weightOf(c, run) > 0);
  if (!pool.length) pool = CARDS.filter(c => fits(c) && weightOf(c, run) > 0);
  const card = run.rng.weighted(pool, c => weightOf(c, run));
  run.usedCards.push(card.id);
  return card;
}

export function cardText(run, card) {
  const team = T(run);
  return t(`cards.${card.id}.x`, { name: `${run.rival.first} ${run.rival.last}`, nick: team.nick, city: team.city });
}

// Option anwenden -> Ergebnis-Text
export function applyOption(run, card, i) {
  const opt = card.opts[i];
  const parts = [];
  if (opt.special) { const s = SPECIAL[opt.special](run); if (s) parts.push(s); }
  if (opt.fx) { const s = fx(run, opt.fx); if (s) parts.push(s); }
  if (opt.risk && run.rng.chance(opt.risk.p)) {
    const extra = opt.risk.special ? SPECIAL[opt.risk.special](run) : '';
    parts.push([t(opt.risk.msg), extra, opt.risk.fx ? fx(run, opt.risk.fx) : ''].filter(Boolean).join(' '));
  }
  return parts.join(' ') || t('cardx.nothing');
}

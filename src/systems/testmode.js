// Testmodus (Seed "TESTING"): Einblicke in die verdeckten Werte und geschaetzte Chancen
// (Awards, Playoffs, Ring) sowie wie Entscheidungen diese Chancen veraendern.
// Die Formeln spiegeln computeRegularAwards (awards.js) und die Season-Sim (sim.js) analytisch wider.
import { BALANCE } from '../data/balance.js';
import { perkSum } from '../data/perks.js';
import { archetypeById } from '../data/archetypes.js';
import { RNG, clamp } from './rng.js';
import { ovr, myPower, aiPower, freshSeason, injuryChance } from './sim.js';
import { legacy } from './legacy.js';

const S = BALANCE.sim;
export const TEST_SEED = 'TESTING';

// Normalverteilung: P(X < z)
function phi(z) {
  const t = 1 / (1 + 0.2316419 * Math.abs(z));
  const d = 0.3989423 * Math.exp(-z * z / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return z > 0 ? 1 - p : p;
}
const P = (mean, sd) => phi(mean / sd);

// Best-of-7: Serienchance aus Spielchance g
function seriesProb(g) {
  let s = 0;
  for (let k = 0; k <= 3; k++) s += comb(3 + k, k) * g ** 4 * (1 - g) ** k;
  return s;
}
const comb = (n, k) => { let r = 1; for (let i = 1; i <= k; i++) r = r * (n - k + i) / i; return r; };

// Hochrechnung der laufenden Season (oder der kommenden, wenn noch nichts gespielt ist)
export function projection(run) {
  const p = run.p, cur = run.cur || freshSeason(), st = cur.st;
  const o = ovr(p), arch = archetypeById(p.arch);
  const teams = run.teams;
  const avg = teams.reduce((s, x) => s + (x.id === p.teamId ? myPower(run) : aiPower(x)), 0) / teams.length;
  const g = st ? st.g : 0, left = S.games - g, prog = g / S.games;
  const expPct = id => clamp(0.5 + ((id === p.teamId ? myPower(run) : aiPower(teams[id])) - avg) * S.winSlope, 0.1, 0.9);
  const pctOf = id => {
    const r = st && st.recs[id];
    return r && g ? (r.w + expPct(id) * left) / S.games : expPct(id);
  };
  const conf = teams[p.teamId].conf;
  const table = teams.filter(x => x.conf === conf).map(x => ({ id: x.id, pct: pctOf(x.id) })).sort((a, b) => b.pct - a.pct);
  const rank = table.findIndex(r => r.id === p.teamId) + 1;
  const pct = pctOf(p.teamId);
  // Erwartete Spiele: bisherige + Rest minus Ausfaelle (geplante Pausen, Verletzungsrisiko)
  const planned = Math.max(0, (cur.injuryGames || 0) - (st ? st.restApplied : 0)) + (st ? st.out : 0);
  const injRisk = st && st.injury ? 0 : injuryChance(p) * 1.2 * (left / S.games) * 17;
  const gp = Math.max(0, (st ? st.gp : 0) + left - planned - injRisk);
  let ppg = clamp(4 + (o - 45) * 0.75 + arch.ppg + (cur.usage || 0), 2, 38);
  if (st && st.gp) ppg = (st.pts + ppg * Math.max(0, gp - st.gp)) / Math.max(1, gp);
  return { o, pct, rank, gp, ppg, prog, table, conf, avg };
}

// Geschaetzte Chancen in Prozent-Brueche (0..1)
export function odds(run) {
  const p = run.p, cur = run.cur || freshSeason(), pr = projection(run);
  const ab = cur.award || { all: 0, mvp: 0, dpoy: 0, ppg: 0 };
  const rb = (cur.rivalBoost || 0) * 2;
  const played = pr.gp >= 50 ? 1 : pr.gp >= 44 ? 0.5 : 0;
  const pctSd = 0.05 * (1 - pr.prog) + 0.01;
  const o = pr.o;
  const out = {};
  if (run.seasonNo === 1) out.roy = played * P(o - 58, Math.sqrt(18));
  out.allStar = (pr.gp >= 30 ? 1 : 0) * P(o + (p.fame - 50) * 0.1 + (pr.pct - 0.5) * 10 + ab.all - S.allStarCut, Math.hypot(2, pctSd * 10));
  out.mvp = played * P(o + (pr.pct - 0.5) * 25 + ab.mvp - S.aiMvpBase - rb, Math.hypot(2, 2, pctSd * 25))
    + (1 - played) * P(o + (pr.pct - 0.5) * 25 + ab.mvp - 20 - S.aiMvpBase - rb, Math.hypot(2, 2));
  out.dpoy = P(p.skills.def * 0.8 + o * 0.2 + perkSum(p.perks, 'dpoy') + ab.dpoy - (played ? 0 : 20) - S.aiDpoyBase, Math.hypot(3, 2));
  out.scoring = played * P(pr.ppg + ab.ppg - S.aiScoringBase - rb * 0.5, Math.hypot(1.5, 1.5 * (1 - pr.prog) + 0.3));
  // Playoffs: Abstand zum 6. bzw. 10. Platz der eigenen Conference
  const others = pr.table.filter(r => r.id !== p.teamId);
  const sd = 0.04 * (1 - pr.prog) + 0.008;
  const top6 = P(pr.pct - others[5].pct, sd), top10 = P(pr.pct - others[9].pct, sd);
  // Play-In grob: zwei Spiele gegen aehnlich starke Teams
  const mp = myPower(run, true);
  const gameVs = pw => clamp(0.5 + (mp - pw) * S.playoffGameSlope, 0.08, 0.92);
  const confPow = pr.table.filter(r => r.id !== p.teamId).map(r => aiPower(run.teams[r.id]));
  const playIn = gameVs(confPow[6] ?? confPow[confPow.length - 1]) * 0.75;
  out.playoffs = top6 + (top10 - top6) * playIn;
  // Ring: vier Serien gegen zunehmend starke Gegner
  const otherConf = run.teams.filter(x => x.conf !== pr.conf).map(aiPower).sort((a, b) => b - a);
  const sortedConf = confPow.slice().sort((a, b) => b - a);
  const opp = [avgOf(sortedConf.slice(2, 6)), avgOf(sortedConf.slice(0, 3)), sortedConf[0], otherConf[0]];
  out.series = opp.map(pw => seriesProb(gameVs(pw)));
  out.ring = out.playoffs * out.series.reduce((a, b) => a * b, 1);
  out.fmvp = out.ring * clamp(0.4 + (o - 75) * 0.03 + 0.4 * 0.35, 0, 1);
  out.gameVsBest = gameVs(Math.max(sortedConf[0], otherConf[0]));
  return { ...out, pr };
}
const avgOf = a => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);

export const ODDS_KEYS = ['allStar', 'mvp', 'dpoy', 'scoring', 'roy', 'playoffs', 'ring', 'fmvp'];

// Kopie des Runs fuer Was-waere-wenn (eigener RNG-Strom, Original bleibt unberuehrt)
export function cloneRun(run) {
  const c = { ...run, p: structuredClone(run.p), teams: structuredClone(run.teams), rival: { ...run.rival }, cur: structuredClone(run.cur || freshSeason()) };
  c.rng = new RNG(0); c.rng.seed = run.rng.seed; c.rng.state = run.rng.state;
  return c;
}

// Chancen-Aenderung in Prozentpunkten (nur relevante, gerundet), z. B. "MVP 12>18 RING 3>4"
export function oddsDiff(a, b, labels, max = 4) {
  const parts = [];
  for (const k of ODDS_KEYS) {
    if (a[k] == null) continue;
    const x = Math.round(a[k] * 100), y = Math.round(b[k] * 100);
    if (x !== y) parts.push(`${labels[k]} ${x}>${y}`);
  }
  return parts.slice(0, max).join(' ');
}

export const legacyNow = run => legacy(run).score;

// ---- Entscheidungen analysieren ----
import { fx, SPECIAL } from '../data/cards.js';
import { t } from '../i18n/index.js';

const RAW = { base: 'TEAM', power: 'WIN', playoffPower: 'PO', usage: 'USG', injuryGames: 'OUT', rivalBoost: 'RIV' };
// Genaue Werte statt "+/++"
export function exactFx(ch = {}) {
  return Object.entries(ch).filter(([, v]) => v).map(([k, v]) => `${RAW[k] || t('stat.' + k)}${v > 0 ? '+' : ''}${v}`).join(' ');
}
export const oddsLabels = () => Object.fromEntries(ODDS_KEYS.map(k => [k, t('test.o.' + k)]));

// Was passiert bei Option i? Liefert genaue Effekte und die Chancen davor/danach
export function analyzeOption(run, card, i) {
  const opt = card.opts[i], before = odds(run), L = oddsLabels();
  const res = { exact: exactFx(opt.fx), lines: [] };
  if (opt.special) res.exact = (`[${opt.special.toUpperCase()}] ` + res.exact).trim();
  if (opt.pickTeam) res.exact = t('test.pickTeam');
  const after = mod => {
    const c = cloneRun(run);
    if (opt.special) { try { SPECIAL[opt.special](c); } catch { /* nur Vorschau */ } }
    if (opt.fx) fx(c, opt.fx);
    if (mod) fx(c, mod);
    return odds(c);
  };
  const main = after(null);
  res.lines.push(oddsDiff(before, main, L) || t('test.noChange'));
  if (opt.risk) {
    res.risk = `${Math.round(opt.risk.p * 100)}%: ${exactFx(opt.risk.fx) || (opt.risk.special || '').toUpperCase()}`;
    if (opt.risk.fx) res.lines.push(t('test.ifRisk') + ' ' + (oddsDiff(before, after(opt.risk.fx), L) || t('test.noChange')));
  }
  if (opt.arcade) {
    const a = opt.arcade;
    res.exact = `${exactFx(opt.fx)} ${t('test.mini')} ${a.kind.toUpperCase()} ${t('test.need', { n: Math.round((a.need ?? 0.5) * 100) })}`.trim();
    res.good = exactFx(a.good); res.bad = exactFx(a.bad);
    res.lines = [t('test.ifGood') + ' ' + (oddsDiff(before, after(a.good), L) || t('test.noChange')),
      t('test.ifBad') + ' ' + (oddsDiff(before, after(a.bad), L) || t('test.noChange'))];
  }
  return res;
}

// Free Agency: Chancen bei Wechsel zu Team tm
export function analyzeTeam(run, tm, signWith) {
  const before = odds(run), c = cloneRun(run);
  if (tm) signWith(c, tm); else fx(c, { chem: 8 });
  return oddsDiff(before, odds(c), oddsLabels(), 5) || t('test.noChange');
}

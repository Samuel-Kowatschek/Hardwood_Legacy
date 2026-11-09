// Season-Sim: OVR, Teamstaerke, Record, Stats, Verletzungen, Playoff-Bracket, Altersverlauf.
import { clamp } from './rng.js';
import { BALANCE } from '../data/balance.js';
import { archetypeById } from '../data/archetypes.js';
import { perkSum, perkProduct } from '../data/perks.js';

const S = BALANCE.sim;

export function ovr(p) {
  const w = archetypeById(p.arch).weights;
  let sk = 0;
  for (const k in w) sk += w[k] * Math.min(99, p.skills[k]);
  return clamp(Math.round(0.5 * p.form + 0.5 * sk), 1, 99);
}

export function freshSeason() {
  return { power: 0, playoffPower: 0, usage: 0, injuryGames: 0, rivalBoost: 0, events: [], award: { all: 0, mvp: 0, dpoy: 0, ppg: 0 } };
}

export function myPower(run, playoffs = false) {
  const p = run.p, t = run.teams[p.teamId], cur = run.cur || freshSeason();
  return t.base * S.teamWeight + ovr(p) * (1 - S.teamWeight) + (p.chem - 50) * S.chemFactor
    + perkSum(p.perks, 'power') + cur.power + (playoffs ? cur.playoffPower : 0);
}
export function aiPower(t) { return t.base * S.teamWeight + S.leagueStarOvr * (1 - S.teamWeight); }
export const powerOf = (run, id, playoffs) => (id === run.p.teamId ? myPower(run, playoffs) : aiPower(run.teams[id]));

export function injuryChance(p) {
  let c = 0.06 + (100 - p.body) * 0.004 + (p.age > 30 ? (p.age - 30) * 0.015 : 0);
  return clamp(c * perkProduct(p.perks, 'injury'), 0.02, 0.6);
}

// ---- Season in Abschnitten simulieren (fuer Unterbrechungen durch Events) ----
export function startSeason(run) {
  return {
    g: 0, out: 0, restApplied: 0, injury: null,
    recs: run.teams.map(t => ({ id: t.id, w: 0, l: 0, pct: 0, conf: t.conf })),
    pts: 0, reb: 0, ast: 0, gp: 0,
  };
}

// Simuliert bis Spiel toGame (inkl.). Liefert ggf. eine neue Verletzung zurueck.
export function simTo(run, st, toGame) {
  const { p, rng } = run;
  const n = Math.min(S.games, toGame) - st.g;
  if (n <= 0) return null;
  // Geplante Pausen aus Karten (Load Management etc.)
  const rest = (run.cur.injuryGames || 0) - st.restApplied;
  if (rest > 0) { st.out += rest; st.restApplied += rest; }
  let injury = null;
  if (!st.injury && rng.chance(injuryChance(p) * n / S.games * 1.2)) {
    const major = rng.chance(0.25);
    injury = { major, games: major ? rng.int(25, 50) : rng.int(5, 16) };
    st.injury = injury;
    st.out += injury.games;
    p.body = clamp(p.body - (major ? 14 : 5), 0, 100);
    if (major) p.form = clamp(p.form - 3, 20, 99);
  }
  const outNow = Math.min(n, st.out);
  st.out -= outNow;
  const played = n - outNow;
  const teams = run.teams;
  const avg = teams.reduce((sum, t) => sum + powerOf(run, t.id), 0) / teams.length;
  for (const r of st.recs) {
    let pw = powerOf(run, r.id);
    if (r.id === p.teamId && n) pw -= (outNow / n) * (ovr(p) - S.leagueStarOvr) * (1 - S.teamWeight) + (outNow / n) * 1.5;
    const pct = clamp(0.5 + (pw - avg) * S.winSlope + rng.gauss(0, 0.05), 0.1, 0.9);
    for (let g = 0; g < n; g++) if (rng.next() < pct) r.w++; else r.l++;
    r.pct = r.w / Math.max(1, r.w + r.l);
  }
  const o = ovr(p), arch = archetypeById(p.arch);
  const ppg = clamp(4 + (o - 45) * 0.75 + arch.ppg + run.cur.usage + rng.gauss(0, 1.5), 2, 38);
  const rpg = clamp(2.5 + (o - 45) * 0.12 + arch.rpg + perkSum(p.perks, 'rpg') + rng.gauss(0, 0.8), 1, 16);
  const apg = clamp(1.5 + (o - 45) * 0.1 + arch.apg + perkSum(p.perks, 'apg') + rng.gauss(0, 0.7), 0.5, 12);
  st.pts += ppg * played; st.reb += rpg * played; st.ast += apg * played; st.gp += played;
  st.g += n;
  return injury;
}

export function standingsOf(st) {
  const standings = { E: [], W: [] };
  st.recs.slice().sort((a, b) => b.pct - a.pct || b.w - a.w || b.id - a.id).forEach(r => standings[r.conf].push(r));
  return standings;
}

export function finishSeason(run, st) {
  const p = run.p;
  const standings = standingsOf(st);
  const conf = run.teams[p.teamId].conf;
  const rank = standings[conf].findIndex(r => r.id === p.teamId) + 1;
  const mine = st.recs[p.teamId];
  const gp = Math.max(1, st.gp);
  return {
    recs: st.recs, standings, conf, rank, w: mine.w, l: mine.l, pct: mine.pct, gp: st.gp,
    ppg: st.pts / gp, rpg: st.reb / gp, apg: st.ast / gp, ovr: ovr(p), injury: st.injury,
  };
}

// Kompletter Durchlauf (Tests/Balancing)
export function simulateSeason(run) {
  const st = startSeason(run);
  simTo(run, st, S.games);
  return finishSeason(run, st);
}

// Siegchance eines einzelnen Playoff-Spiels (aus Sicht Team a)
export function gameProb(run, a, b, aHome) {
  const d = powerOf(run, a, true) - powerOf(run, b, true);
  return clamp(0.5 + d * S.playoffGameSlope + (aHome ? S.homeEdge : -S.homeEdge), 0.08, 0.92);
}

// Serie komplett simulieren (fuer KI-Serien)
export function simSeries(run, a, b, aHomeAdv) {
  let wa = 0, wb = 0, g = 0;
  const homeA = [true, true, false, false, true, false, true];
  while (wa < 4 && wb < 4) {
    const home = aHomeAdv ? homeA[g] : !homeA[g];
    if (run.rng.next() < gameProb(run, a, b, home)) wa++; else wb++;
    g++;
  }
  return { winner: wa === 4 ? a : b, wa, wb };
}

// Conference-Bracket (Top 8). Liefert Paarungen + simulierte Gegner-Pfade.
export function confSeeds(standings, conf, n = 8) { return standings[conf].slice(0, n).map(r => r.id); }

// Pairings: (1,8) (4,5) | (2,7) (3,6)
export const PAIRS = [[0, 7], [3, 4], [1, 6], [2, 5]];

// Altersverlauf am Ende der Season. Liefert Deltas fuer Anzeige.
export function applyAging(run) {
  const { p, rng } = run;
  const a = p.age;
  let df;
  // Wachstum bis zum (verdeckten) Potenzial, danach Plateau und Abbau
  const room = clamp((p.potential - p.form) / 12, 0, 1.2);
  if (a <= 22) df = Math.round(rng.int(3, 7) * room);
  else if (a <= 26) df = Math.round(rng.int(1, 5) * room);
  else if (a <= 29) df = rng.int(-2, 1) + (room > 0.5 ? 1 : 0);
  else if (a <= 32) df = rng.int(-5, -2);
  else df = rng.int(-8, -4);
  df += perkSum(p.perks, 'formSeason');
  if (p.body < 40) df -= 2;
  let db;
  if (a < 27) db = 1; else if (a <= 29) db = -7; else if (a <= 32) db = -13; else db = -18;
  db += rng.int(-2, 1);
  if (db < 0) db = Math.round(db * perkProduct(p.perks, 'bodyDecay'));
  const before = ovr(p);
  p.form = clamp(p.form + df, 20, 99);
  p.body = clamp(p.body + db, 0, 100);
  // Skills: Wachstum bis 26, Athletik-Abbau ab 30
  const w = archetypeById(p.arch).weights;
  const top = Object.keys(w).sort((x, y) => w[y] - w[x]).slice(0, 2);
  if (a <= 26) top.forEach(k => { p.skills[k] = clamp(p.skills[k] + rng.int(0, 2), 0, 99); });
  if (a >= 30) p.skills.ath = clamp(p.skills.ath - rng.int(2, 4), 20, 99);
  if (a >= 28) p.skills.clu = clamp(p.skills.clu + 1, 0, 99);
  p.chem = clamp(p.chem + perkSum(p.perks, 'chemSeason'), Math.max(0, perkSum(p.perks, 'chemFloor')), 100);
  p.fame = clamp(p.fame - 3 + perkSum(p.perks, 'fameSeason'), 0, 100);
  p.age++;
  return { df, db, dOvr: ovr(p) - before };
}

// Teams driften jede Season leicht (Regression zur Mitte)
export function driftTeams(run) {
  for (const t of run.teams) t.base = clamp(Math.round(t.base + (59 - t.base) * 0.15 + run.rng.gauss(0, 4)), 36, 84);
}

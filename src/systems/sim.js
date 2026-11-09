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
  return { power: 0, playoffPower: 0, usage: 0, injuryGames: 0, rivalBoost: 0, events: [] };
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

export function simulateSeason(run) {
  const { p, rng } = run;
  const teams = run.teams;
  const avg = teams.reduce((s, t) => s + powerOf(run, t.id), 0) / teams.length;
  const recs = teams.map(t => {
    const pw = powerOf(run, t.id);
    const pct = clamp(0.5 + (pw - avg) * S.winSlope + rng.gauss(0, 0.04), 0.12, 0.88);
    let w = 0;
    for (let g = 0; g < S.games; g++) if (rng.next() < pct) w++;
    return { id: t.id, w, l: S.games - w, pct: w / S.games, conf: t.conf };
  });
  // Verletzung waehrend der Saison
  let injury = null;
  let gp = S.games - run.cur.injuryGames;
  if (rng.chance(injuryChance(p))) {
    const major = rng.chance(0.25);
    const games = major ? rng.int(30, 55) : rng.int(6, 20);
    injury = { major, games };
    gp -= games;
    p.body = clamp(p.body - (major ? 14 : 5), 0, 100);
    if (major) p.form = clamp(p.form - 3, 20, 99);
  }
  gp = clamp(gp, 5, S.games);
  // Eigenes Team: Record leicht nach Ausfaellen korrigieren
  const mine = recs[p.teamId];
  if (gp < S.games) {
    const miss = S.games - gp;
    const lost = Math.round(miss * 0.15);
    mine.w = clamp(mine.w - lost, 5, S.games); mine.l = S.games - mine.w; mine.pct = mine.w / S.games;
  }
  const o = ovr(p), arch = archetypeById(p.arch);
  const ppg = clamp(4 + (o - 45) * 0.75 + arch.ppg + run.cur.usage + rng.gauss(0, 1.5), 2, 38);
  const rpg = clamp(2.5 + (o - 45) * 0.12 + arch.rpg + perkSum(p.perks, 'rpg') + rng.gauss(0, 0.8), 1, 16);
  const apg = clamp(1.5 + (o - 45) * 0.1 + arch.apg + rng.gauss(0, 0.7), 0.5, 12);
  const standings = { E: [], W: [] };
  recs.slice().sort((a, b) => b.pct - a.pct || b.id - a.id).forEach(r => standings[r.conf].push(r));
  const conf = teams[p.teamId].conf;
  const rank = standings[conf].findIndex(r => r.id === p.teamId) + 1;
  return { recs, standings, conf, rank, w: mine.w, l: mine.l, pct: mine.pct, gp, ppg, rpg, apg, ovr: o, injury };
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

// Season-Awards (MVP, DPOY, All-Star, Scoring Title, ROY, FMVP) + Meilensteine.
import { BALANCE } from '../data/balance.js';
import { perkSum } from '../data/perks.js';

const S = BALANCE.sim;

function aiName(run, exclude, rng = run.rng) {
  const pool = run.teams.filter(t => t.id !== exclude && t.id !== run.p.teamId);
  const t = rng.pick(pool);
  return `${t.star.first[0]}. ${t.star.last}`;
}
// Gewinner-Namen fuer verlorene/fremde Awards: eigener Teilstrom, damit der Haupt-RNG (Seed) unveraendert bleibt
function otherWinner(run, names, label, rookie) {
  const r = run.rng.fork(label + run.seasonNo);
  if (rookie && names) { const n = names.player(r); return `${n.first[0]}. ${n.last}`; }
  return aiName(run, -1, r);
}
const rivalName = run => `${run.rival.first[0]}. ${run.rival.last}`;

// Ergebnis eines Regular-Season-Minigames (q 0..1) verschiebt die Award-Chancen dieser Season.
// Playoff-Minigames zaehlen dagegen nur fuer Siegchance (Ring) und Finals MVP.
export function applyRegularArcade(run, kind, q, weight = 1) {
  const a = run.cur.award, d = (q - 0.5) * weight;
  a.all += d * 6; a.mvp += d * 6;
  if (kind === 'defense' || kind === 'rebound') a.dpoy += d * 10;
  if (['shot', 'clutch', 'ft', 'drive', 'fast'].includes(kind)) a.ppg += d * 3;
  if (kind === 'pass') { a.all += d * 2; a.mvp += d * 2; }
}

// Regular-Season-Awards (direkt nach der Regular Season verkuendet)
export function computeRegularAwards(run, season, names = null) {
  const { p, rng } = run;
  const o = season.ovr;
  const list = []; // {id, label, won, winner}
  const played = season.gp >= 50;
  const rb = run.cur.rivalBoost * 2;
  const ab = run.cur.award || { all: 0, mvp: 0, dpoy: 0, ppg: 0 }; // Boni aus Regular-Season-Minigames

  // ROY: in der eigenen Rookie-Season Chance; jedes Jahr wird der Gewinner gezeigt
  if (run.seasonNo === 1) {
    const won = played && o + rng.gauss(0, 3) > 58 + rng.gauss(0, 3);
    if (won) p.awards.roy++;
    list.push({ id: 'roy', won, winner: won ? null : otherWinner(run, names, 'roy', true) });
  } else list.push({ id: 'roy', won: false, winner: otherWinner(run, names, 'roy', true) });
  const asScore = o + (p.fame - 50) * 0.1 + (season.pct - 0.5) * 10 + ab.all + rng.gauss(0, 2);
  const allStar = season.gp >= 30 && asScore >= S.allStarCut;
  if (allStar) { p.awards.allStar++; p.fame += 6; list.push({ id: 'allStar', won: true }); }

  const mvpScore = o + (season.pct - 0.5) * 25 + ab.mvp + rng.gauss(0, 2) - (played ? 0 : 20);
  const aiMvp = S.aiMvpBase + rb + rng.gauss(0, 2);
  const mvp = mvpScore > aiMvp;
  if (mvp) { p.awards.mvp++; p.fame += 15; }
  list.push({ id: 'mvp', won: mvp, winner: mvp ? null : (rng.chance(0.5) ? rivalName(run) : aiName(run)) });

  const dScore = p.skills.def * 0.8 + o * 0.2 + perkSum(p.perks, 'dpoy') + ab.dpoy + rng.gauss(0, 3) - (played ? 0 : 20);
  const dpoy = dScore > S.aiDpoyBase + rng.gauss(0, 2);
  if (dpoy) { p.awards.dpoy++; p.fame += 5; }
  list.push({ id: 'dpoy', won: dpoy, winner: dpoy ? null : otherWinner(run, names, 'dpoy', false) });

  const scoring = played && season.ppg + ab.ppg > S.aiScoringBase + rb * 0.5 + rng.gauss(0, 1.5);
  if (scoring) { p.awards.scoring++; p.fame += 5; list.push({ id: 'scoring', won: true }); }
  if (run.cur.contest?.won) { p.awards.contests = (p.awards.contests || 0) + 1; list.push({ id: 'contest_' + run.cur.contest.id, won: true }); }
  p.fame = Math.min(100, p.fame);
  p.peakFame = Math.max(p.peakFame, p.fame);
  return { list, allStar, mvp, dpoy, scoring };
}

// Playoff-Awards (Ring, Finals MVP) + Karriere-Stats und Meilensteine (nach den Playoffs)
export function computePlayoffAwards(run, season, po) {
  const { p, rng } = run;
  const o = season.ovr;
  const list = [];
  if (po.champion) {
    p.awards.rings++;
    p.fame += 18;
    if (p.ringChase) p.ringsChased++;
    list.push({ id: 'ring', won: true });
    const fmvpChance = 0.4 + (o - 75) * 0.03 + (po.finalsQuality ?? 0.4) * 0.35;
    const fmvp = rng.next() < fmvpChance;
    if (fmvp) { p.awards.fmvp++; p.fame += 6; }
    list.push({ id: 'fmvp', won: fmvp, winner: fmvp ? null : '@teammate' });
  }
  p.fame = Math.min(100, p.fame);
  p.peakFame = Math.max(p.peakFame, p.fame);

  // Karriere-Stats + Meilensteine
  p.career.pts += Math.round(season.ppg * season.gp);
  p.career.games += season.gp;
  p.career.seasons++;
  const newMs = [];
  for (const m of BALANCE.milestones) {
    if (!p.milestones.includes(m.id) && m.test(p)) { p.milestones.push(m.id); newMs.push(m.id); }
  }
  return { list, ring: !!po.champion, fmvp: list.some(a => a.id === 'fmvp' && a.won), newMs };
}

// Beides zusammen (Balancing/Tests)
export function computeAwards(run, season, po) {
  const reg = computeRegularAwards(run, season), post = computePlayoffAwards(run, season, po);
  return { ...reg, ...post, list: reg.list.concat(post.list) };
}

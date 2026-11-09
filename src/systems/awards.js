// Season-Awards (MVP, DPOY, All-Star, Scoring Title, ROY, FMVP) + Meilensteine.
import { BALANCE } from '../data/balance.js';
import { perkSum } from '../data/perks.js';

const S = BALANCE.sim;

function aiName(run, exclude) {
  const pool = run.teams.filter(t => t.id !== exclude && t.id !== run.p.teamId);
  const t = run.rng.pick(pool);
  return `${t.star.first[0]}. ${t.star.last}`;
}
const rivalName = run => `${run.rival.first[0]}. ${run.rival.last}`;

export function computeAwards(run, season, po) {
  const { p, rng } = run;
  const o = season.ovr;
  const list = []; // {id, label, won, winner}
  const played = season.gp >= 50;
  const rb = run.cur.rivalBoost * 2;

  if (run.seasonNo === 1) {
    const won = played && o + rng.gauss(0, 3) > 58 + rng.gauss(0, 3);
    if (won) { p.awards.roy++; list.push({ id: 'roy', label: 'ROOKIE OF THE YEAR', won }); }
  }
  const asScore = o + (p.fame - 50) * 0.1 + (season.pct - 0.5) * 10 + rng.gauss(0, 2);
  const allStar = season.gp >= 30 && asScore >= S.allStarCut;
  if (allStar) { p.awards.allStar++; p.fame += 6; list.push({ id: 'allStar', label: 'ALL-STAR', won: true }); }

  const mvpScore = o + (season.pct - 0.5) * 25 + rng.gauss(0, 2) - (played ? 0 : 20);
  const aiMvp = S.aiMvpBase + rb + rng.gauss(0, 2);
  const mvp = mvpScore > aiMvp;
  if (mvp) { p.awards.mvp++; p.fame += 15; }
  list.push({ id: 'mvp', label: 'MVP', won: mvp, winner: mvp ? null : (rng.chance(0.5) ? rivalName(run) : aiName(run)) });

  const dScore = p.skills.def * 0.8 + o * 0.2 + perkSum(p.perks, 'dpoy') + rng.gauss(0, 3) - (played ? 0 : 20);
  const dpoy = dScore > S.aiDpoyBase + rng.gauss(0, 2);
  if (dpoy) { p.awards.dpoy++; p.fame += 5; list.push({ id: 'dpoy', label: 'DPOY', won: true }); }

  const scoring = played && season.ppg > S.aiScoringBase + rb * 0.5 + rng.gauss(0, 1.5);
  if (scoring) { p.awards.scoring++; p.fame += 5; list.push({ id: 'scoring', label: 'SCORING TITLE', won: true }); }

  if (po.champion) {
    p.awards.rings++;
    p.fame += 18;
    if (p.ringChase) p.ringsChased++;
    list.push({ id: 'ring', label: 'CHAMPION!', won: true });
    const fmvpChance = 0.4 + (o - 75) * 0.03 + (po.finalsQuality ?? 0.4) * 0.35;
    const fmvp = rng.next() < fmvpChance;
    if (fmvp) { p.awards.fmvp++; p.fame += 6; }
    list.push({ id: 'fmvp', label: 'FINALS MVP', won: fmvp, winner: fmvp ? null : 'Mitspieler' });
  }
  p.fame = Math.min(100, p.fame);
  p.peakFame = Math.max(p.peakFame, p.fame);

  // Karriere-Stats + Meilensteine
  p.career.pts += Math.round(season.ppg * season.gp);
  p.career.games += season.gp;
  p.career.seasons++;
  const newMs = [];
  for (const m of BALANCE.milestones) {
    if (!p.milestones.includes(m.id) && m.test(p)) { p.milestones.push(m.id); newMs.push(m.label); }
  }
  return { list, allStar, mvp, dpoy, scoring, ring: !!po.champion, fmvp: list.some(a => a.id === 'fmvp' && a.won), newMs };
}

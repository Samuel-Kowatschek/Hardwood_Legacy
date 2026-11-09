// Legacy-Score + Retire-Multiplikator (Went Out On Top, Last Dance, Overstayed).
import { BALANCE, tierFor } from '../data/balance.js';

const B = BALANCE;

export function retireMultiplier(run) {
  const last = run.log[run.log.length - 1];
  const parts = [];
  let m = 1;
  if (last && (last.ring || last.mvp || last.fmvp)) { m += B.retire.onTop; parts.push(['onTop', B.retire.onTop]); }
  if (last && last.ring && run.log.length >= 2) { m += B.retire.lastDance; parts.push(['lastDance', B.retire.lastDance]); }
  if (run.retire.overstay > 0) { m -= run.retire.overstay; parts.push(['overstay', -run.retire.overstay]); }
  m = Math.max(B.retire.minMult, Math.round(m * 100) / 100);
  return { mult: m, parts };
}

export function legacy(run) {
  const p = run.p, a = p.awards, s = B.score;
  const parts = [];
  const add = (label, n, per) => { if (n > 0) parts.push([label, n, n * per]); };
  add('rings', a.rings, s.ring);
  add('mvp', a.mvp, s.mvp);
  add('fmvp', a.fmvp, s.fmvp);
  add('dpoy', a.dpoy, s.dpoy);
  add('scoring', a.scoring, s.scoring);
  add('allStar', a.allStar, s.allStar);
  add('roy', a.roy, s.roy);
  add('milestones', p.milestones.length, s.milestone);
  if (p.ringsChased > 0) parts.push(['ringChase', p.ringsChased, -Math.round(p.ringsChased * s.ring * (1 - B.ringChaseFactor))]);
  const seasons = p.career.seasons;
  if (p.teamsPlayed.length === 1 && seasons >= B.loyaltyMinSeasons) parts.push(['oneTeam', seasons, seasons * B.loyaltyPerSeason]);
  const fame = Math.round(p.peakFame * B.fameBonusFactor);
  if (fame > 0) parts.push(['fame', p.peakFame, fame]);
  const base = parts.reduce((sum, x) => sum + x[2], 0);
  const rm = retireMultiplier(run);
  const score = Math.max(0, Math.round(base * rm.mult));
  return { parts, base, mult: rm.mult, multParts: rm.parts, score, tier: tierFor(score) };
}

// Overstayed: jede schwache Season in Folge kostet kumulativ mehr; eine starke Season halbiert den Malus
export function updateOverstay(run, aw, aging, season, po) {
  const p = run.p;
  const weak = (p.age >= 29 && !aw.allStar && (aging.dOvr < 0 || po.reached === 'LOTTERY')) || season.gp < 40;
  if (weak) {
    run.retire.weakStreak++;
    run.retire.overstay = Math.round((run.retire.overstay + BALANCE.retire.overstayStep * run.retire.weakStreak) * 100) / 100;
  } else {
    run.retire.weakStreak = 0;
    run.retire.overstay = Math.round(run.retire.overstay * 50) / 100;
  }
  return weak;
}

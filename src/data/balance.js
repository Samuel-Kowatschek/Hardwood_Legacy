// Alle Tuning-Werte an einer Stelle.
export const BALANCE = {
  score: { ring: 100, mvp: 60, fmvp: 40, dpoy: 25, scoring: 20, allStar: 8, milestone: 15, roy: 10 },
  loyaltyMinSeasons: 5,
  loyaltyPerSeason: 10,
  fameBonusFactor: 0.6, // * Peak-Fame
  ringChaseFactor: 0.6, // Ringe nach Superteam-Wechsel zaehlen nur 60 %
  retire: { onTop: 0.25, lastDance: 0.15, overstayStep: 0.1, minMult: 0.4 },
  maxSeasons: 15,
  tiers: [
    [0, 'Role Player'],
    [100, 'All-Star'],
    [300, 'Franchise Legend'],
    [600, 'Hall of Famer'],
    [1000, 'GOAT-Debatte'],
  ],
  perkAfterSeasons: [1, 3, 6, 9, 12],
  milestones: [
    { id: 'pts10', test: p => p.career.pts >= 10000 },
    { id: 'pts20', test: p => p.career.pts >= 20000 },
    { id: 'pts30', test: p => p.career.pts >= 30000 },
    { id: 'fifty', test: p => p.flags.fifty },
    { id: 'as10', test: p => p.awards.allStar >= 10 },
  ],
  sim: {
    games: 82,
    teamWeight: 0.7, // Teamstaerke vs. eigener OVR
    winSlope: 0.035,
    chemFactor: 0.1,
    leagueStarOvr: 60,
    playoffGameSlope: 0.012,
    homeEdge: 0.03,
    aiMvpBase: 88,
    aiScoringBase: 29,
    aiDpoyBase: 86,
    allStarCut: 72,
  },
  arcade: { swing: 0.35, neutral: 0.4 }, // Siegchance += (Qualitaet - neutral) * swing
};

export function tierFor(score) {
  let idx = 0;
  BALANCE.tiers.forEach(([min], i) => { if (score >= min) idx = i; });
  return { idx, name: BALANCE.tiers[idx][1] }; // Anzeigename: i18n 'tiers'[idx]
}

// Archetypen: Skill-Verteilung + Gewichtung der 4 Kernwerte (Form, Koerper, Chemie, Fame).
// sho=Shooting pla=Playmaking def=Defense ath=Athleticism clu=Clutch
export const ARCHETYPES = [
  {
    id: 'sharp', name: 'Sharpshooter', pos: 'SG',
    skills: { sho: 72, pla: 50, def: 40, ath: 50, clu: 60 },
    weights: { sho: 0.4, clu: 0.2, pla: 0.15, ath: 0.15, def: 0.1 },
    core: { form: 0, body: 2, chem: 0, fame: 2 },
    games: { shot: 4, ft: 3, clutch: 2, pass: 1, drive: 1, fast: 1, defense: 1, rebound: 1 }, ppg: 2, rpg: 0, apg: 0,
  },
  {
    id: 'slasher', name: 'Slasher', pos: 'SF',
    skills: { sho: 50, pla: 50, def: 45, ath: 72, clu: 55 },
    weights: { ath: 0.4, sho: 0.2, clu: 0.15, pla: 0.15, def: 0.1 },
    core: { form: 0, body: -4, chem: 0, fame: 4 },
    games: { fast: 4, drive: 4, shot: 2, ft: 1, defense: 1, rebound: 1, pass: 1 }, ppg: 2, rpg: 1, apg: 0,
  },
  {
    id: 'big', name: 'Big Man', pos: 'C',
    skills: { sho: 35, pla: 40, def: 66, ath: 68, clu: 45 },
    weights: { ath: 0.35, def: 0.35, sho: 0.1, pla: 0.1, clu: 0.1 },
    core: { form: 2, body: -6, chem: 4, fame: 0 },
    games: { rebound: 4, defense: 3, fast: 3, ft: 1, shot: 1, drive: 1, pass: 1 }, ppg: -2, rpg: 6, apg: -1,
  },
  {
    id: 'play', name: 'Playmaker', pos: 'PG',
    skills: { sho: 58, pla: 74, def: 42, ath: 55, clu: 62 },
    weights: { pla: 0.4, sho: 0.2, clu: 0.2, ath: 0.1, def: 0.1 },
    core: { form: 0, body: 2, chem: 8, fame: 0 },
    games: { pass: 4, drive: 3, shot: 2, ft: 1, defense: 1, fast: 1, rebound: 1 }, ppg: -1, rpg: 0, apg: 5,
    unlock: { key: 'runs1', test: m => m.runs >= 1 },
  },
  {
    id: 'lock', name: 'Lockdown', pos: 'SF',
    skills: { sho: 45, pla: 45, def: 72, ath: 62, clu: 50 },
    weights: { def: 0.45, ath: 0.25, clu: 0.1, sho: 0.1, pla: 0.1 },
    core: { form: 0, body: 0, chem: 6, fame: -4 },
    games: { defense: 5, rebound: 2, fast: 2, shot: 1, ft: 1, drive: 1, pass: 1 }, ppg: -4, rpg: 1, apg: 0,
    unlock: { key: 'ring', test: m => m.totalRings >= 1 },
  },
];

export const archetypeById = id => ARCHETYPES.find(a => a.id === id);

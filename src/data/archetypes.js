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
    unlock: { key: 'allstar', test: m => !!m.ach?.allstar },
  },
  {
    id: 'lock', name: 'Lockdown', pos: 'SF',
    skills: { sho: 45, pla: 45, def: 72, ath: 62, clu: 50 },
    weights: { def: 0.45, ath: 0.25, clu: 0.1, sho: 0.1, pla: 0.1 },
    core: { form: 0, body: 0, chem: 6, fame: -4 },
    games: { defense: 5, rebound: 2, fast: 2, shot: 1, ft: 1, drive: 1, pass: 1 }, ppg: -4, rpg: 1, apg: 0,
    unlock: { key: 'dpoy', test: m => !!m.ach?.dpoy },
  },
  // ---- Freischaltbare Archetypen (schwere Bedingungen) ----
  {
    id: 'stretch', name: 'Stretch Big', pos: 'PF',
    skills: { sho: 64, pla: 45, def: 58, ath: 55, clu: 52 },
    weights: { sho: 0.3, def: 0.25, ath: 0.2, clu: 0.15, pla: 0.1 },
    core: { form: 0, body: -2, chem: 2, fame: 0 },
    games: { shot: 3, rebound: 3, defense: 2, ft: 2, drive: 1, fast: 1, pass: 1 }, ppg: 0, rpg: 4, apg: 0,
    unlock: { key: 'mvp', test: m => !!m.ach?.mvp },
  },
  {
    id: 'twoway', name: 'Two-Way Wing', pos: 'SF',
    skills: { sho: 60, pla: 48, def: 66, ath: 64, clu: 54 },
    weights: { def: 0.3, sho: 0.25, ath: 0.25, pla: 0.1, clu: 0.1 },
    core: { form: 1, body: 0, chem: 3, fame: 0 },
    games: { defense: 3, shot: 3, fast: 2, drive: 2, ft: 1, rebound: 1, pass: 1 }, ppg: 1, rpg: 1, apg: 0,
    unlock: { key: 'ring', test: m => !!m.ach?.ring },
  },
  {
    id: 'scorer', name: 'Bucket Getter', pos: 'SG',
    skills: { sho: 70, pla: 45, def: 36, ath: 58, clu: 70 },
    weights: { sho: 0.35, clu: 0.3, ath: 0.15, pla: 0.1, def: 0.1 },
    core: { form: 2, body: 0, chem: -4, fame: 4 },
    games: { shot: 3, clutch: 3, drive: 3, ft: 2, fast: 1, pass: 1, defense: 1, rebound: 1 }, ppg: 4, rpg: 0, apg: -1,
    unlock: { key: 'legacy1000', test: m => !!m.ach?.legacy1000 },
  },
  {
    id: 'unicorn', name: 'Unicorn', pos: 'C',
    skills: { sho: 62, pla: 58, def: 66, ath: 68, clu: 58 },
    weights: { sho: 0.2, pla: 0.2, def: 0.2, ath: 0.2, clu: 0.2 },
    core: { form: 3, body: -6, chem: 2, fame: 4 },
    games: { rebound: 2, shot: 2, fast: 2, defense: 1, drive: 1, pass: 1, ft: 1, clutch: 1 }, ppg: 2, rpg: 5, apg: 2,
    unlock: { key: 'hundred', test: m => !!m.ach?.hundred },
  },
];

export const archetypeById = id => ARCHETYPES.find(a => a.id === id);

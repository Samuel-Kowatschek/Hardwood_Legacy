// Perks/Items: wirken auf Sim (power, Koerper, Form ...) und Arcade-Minigames (zone, time, fast, def, pass, drive, reb, ft).
// Beschreibungen: i18n 'perks.<id>'. Namen bleiben englisch.
export const PERKS = [
  { id: 'deep', name: 'Deep Threat', skills: { sho: 5 }, arcade: { zone: 0.25, ft: 0.15 } },
  { id: 'spacing', name: 'Spacing', power: 3 },
  { id: 'anchor', name: 'Defensive Anchor', skills: { def: 8 }, dpoy: 4, arcade: { def: 0.15 } },
  { id: 'boards', name: 'Rebound Machine', power: 2, rpg: 3, arcade: { reb: 0.3 } },
  { id: 'sneakers', name: 'Pro Sneakers', skills: { ath: 2 }, bodyDecay: 0.6 },
  { id: 'coach', name: 'Star Coach', chemSeason: 6 },
  { id: 'trainer', name: 'Personal Trainer', formSeason: 2 },
  { id: 'hops', name: 'Spring Legs', skills: { ath: 5 }, arcade: { fast: 0.25, reb: 0.15 } },
  { id: 'media', name: 'Media Darling', fameSeason: 6 },
  { id: 'iron', name: 'Iron Man', injury: 0.5 },
  { id: 'film', name: 'Film Study', skills: { def: 4 }, arcade: { def: 0.3 } },
  { id: 'vision', name: 'Court Vision', skills: { pla: 5 }, apg: 2, arcade: { pass: 0.35 } },
  { id: 'handles', name: 'Handles', skills: { pla: 2, ath: 2 }, arcade: { drive: 0.35 } },
  { id: 'signature', name: 'Signature Move', skills: { clu: 5 }, arcade: { zone: 0.15 }, unlock: { key: 'hof', test: m => m.bestTier >= 3 } },
  { id: 'iceveins', name: 'Ice Veins', skills: { clu: 8 }, arcade: { time: 1.5, ft: 0.2 }, unlock: { key: 'fmvp', test: m => m.fmvps >= 1 || !!m.ach?.fmvp } },
  { id: 'leader', name: 'Leader', power: 2, chemFloor: 45, unlock: { key: 'runs5', test: m => m.runs >= 5 } },
  { id: 'clutchgene', name: 'Clutch Gene', skills: { clu: 6 }, arcade: { time: 1, zone: 0.1 }, unlock: { key: 'rings3', test: m => !!m.ach?.rings3 } },
  { id: 'motor', name: 'Endless Motor', bodyDecay: 0.75, rpg: 2, unlock: { key: 'seasons15', test: m => !!m.ach?.seasons15 } },
  { id: 'showtime', name: 'Showtime', fameSeason: 8, arcade: { fast: 0.15, zone: 0.05 }, unlock: { key: 'contest', test: m => !!m.ach?.contest } },
  { id: 'gymrat', name: 'Gym Rat', formSeason: 1, skills: { sho: 2, pla: 2, def: 2, ath: 2, clu: 2 }, unlock: { key: 'ovr90', test: m => !!m.ach?.ovr90 } },
];

export const SYNERGIES = [
  { id: 'splash', name: 'Splash Offense', needs: ['deep', 'spacing'], power: 3, arcade: { zone: 0.1 } },
  { id: 'fortress', name: 'Fortress', needs: ['anchor', 'boards'], power: 3, dpoy: 4, arcade: { reb: 0.1 } },
  { id: 'clutch', name: 'Mr. Clutch', needs: ['signature', 'iceveins'], arcade: { time: 1, zone: 0.1 } },
  { id: 'flyer', name: 'Highflyer', needs: ['hops', 'sneakers'], arcade: { fast: 0.2 }, bodyDecay: 0.8 },
  { id: 'general', name: 'Floor General', needs: ['vision', 'handles'], power: 2, arcade: { pass: 0.15, drive: 0.15 } },
  { id: 'brand', name: 'Global Brand', needs: ['media', 'coach'], power: 2 },
];

export const perkById = id => PERKS.find(p => p.id === id);

export function activeSynergies(perks) {
  return SYNERGIES.filter(s => s.needs.every(n => perks.includes(n)));
}

export function perkSum(perks, field, init = 0) {
  let v = init;
  for (const id of perks) { const p = perkById(id); if (p && typeof p[field] === 'number') v += p[field]; }
  for (const s of activeSynergies(perks)) if (typeof s[field] === 'number') v += s[field];
  return v;
}
export function perkProduct(perks, field) {
  let v = 1;
  for (const id of perks) { const p = perkById(id); if (p && typeof p[field] === 'number') v *= p[field]; }
  for (const s of activeSynergies(perks)) if (typeof s[field] === 'number') v *= s[field];
  return v;
}
// Arcade-Modifikatoren + Liste der Quellen (fuer die Anzeige im Minigame-Intro)
export function arcadeMods(perks) {
  const m = { zone: 0, time: 0, fast: 0, def: 0, pass: 0, drive: 0, reb: 0, ft: 0, src: {} };
  const add = (a, name) => {
    if (!a) return;
    for (const k in a) { m[k] += a[k]; (m.src[k] = m.src[k] || []).push(name); }
  };
  for (const id of perks) { const p = perkById(id); add(p?.arcade, p?.name); }
  for (const s of activeSynergies(perks)) add(s.arcade, s.name);
  return m;
}

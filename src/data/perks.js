// Perks/Items: wirken auf Sim (power, Koerper, Form ...) und Arcade (zone, time ...).
export const PERKS = [
  { id: 'deep', name: 'Deep Threat', desc: 'Wurf +5. Groessere Treffer-Zone.', skills: { sho: 5 }, arcade: { zone: 0.2 } },
  { id: 'spacing', name: 'Spacing-Kollegen', desc: 'Shooter im Team. Team-Power +3.', power: 3 },
  { id: 'anchor', name: 'Defensive Anchor', desc: 'Defense +8. Bessere DPOY-Chance.', skills: { def: 8 }, dpoy: 4 },
  { id: 'boards', name: 'Rebound-Maschine', desc: 'Rebounds +3. Team-Power +2.', power: 2, rpg: 3 },
  { id: 'sneakers', name: 'Pro-Sneakers', desc: 'Koerper altert 40% langsamer.', skills: { ath: 2 }, bodyDecay: 0.6 },
  { id: 'coach', name: 'Star-Coach', desc: 'Chemie +6 pro Season.', chemSeason: 6 },
  { id: 'trainer', name: 'Personal Trainer', desc: 'Form waechst schneller, faellt langsamer.', formSeason: 2 },
  { id: 'hops', name: 'Sprungkraft', desc: 'Athletik +5. Fast-Breaks leichter.', skills: { ath: 5 }, arcade: { fast: 0.25 } },
  { id: 'media', name: 'Media Darling', desc: 'Fame +6 pro Season.', fameSeason: 6 },
  { id: 'iron', name: 'Iron Man', desc: 'Verletzungsrisiko halbiert.', injury: 0.5 },
  { id: 'film', name: 'Film Study', desc: 'Defense +4. Defense-Stops leichter.', skills: { def: 4 }, arcade: { def: 0.3 } },
  { id: 'signature', name: 'Signature Move', desc: 'Clutch +5. Zone +15%.', skills: { clu: 5 }, arcade: { zone: 0.15 },
    unlock: { text: 'Hall of Famer werden', test: m => m.bestTier >= 3 } },
  { id: 'iceveins', name: 'Ice Veins', desc: 'Clutch +8. Mehr Zeit beim Buzzer.', skills: { clu: 8 }, arcade: { time: 1.5 },
    unlock: { text: 'Einen FMVP holen', test: m => m.fmvps >= 1 } },
  { id: 'leader', name: 'Leader', desc: 'Chemie nie unter 45. Power +2.', power: 2, chemFloor: 45,
    unlock: { text: '3 Karrieren spielen', test: m => m.runs >= 3 } },
];

export const SYNERGIES = [
  { id: 'splash', name: 'Splash-Offense', needs: ['deep', 'spacing'], power: 3, arcade: { zone: 0.1 } },
  { id: 'fortress', name: 'Festung', needs: ['anchor', 'boards'], power: 3, dpoy: 4 },
  { id: 'clutch', name: 'Mr. Clutch', needs: ['signature', 'iceveins'], arcade: { time: 1, zone: 0.1 } },
  { id: 'flyer', name: 'Highflyer', needs: ['hops', 'sneakers'], arcade: { fast: 0.2 }, bodyDecay: 0.8 },
  { id: 'brand', name: 'Marke', needs: ['media', 'coach'], power: 2 },
];

export const perkById = id => PERKS.find(p => p.id === id);

export function activeSynergies(perks) {
  return SYNERGIES.filter(s => s.needs.every(n => perks.includes(n)));
}

// Summiert ein numerisches Feld ueber Perks + Synergien
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
export function arcadeMods(perks) {
  const m = { zone: 0, time: 0, fast: 0, def: 0 };
  const add = a => { if (a) for (const k in a) m[k] += a[k]; };
  for (const id of perks) add(perkById(id)?.arcade);
  for (const s of activeSynergies(perks)) add(s.arcade);
  return m;
}

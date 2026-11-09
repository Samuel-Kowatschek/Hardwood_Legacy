// Run-Erzeugung: Liga (Parodie-Teams), Spieler, Stars je Team, Rivale.
import { RNG, clamp } from './rng.js';
import { rollLook } from '../sprites/spriteGen.js';
import { TEAM_COLORS } from '../sprites/palette.js';
import { archetypeById } from '../data/archetypes.js';
import { BALANCE } from '../data/balance.js';

const EAST = ['ATL', 'BOS', 'CLE', 'CHI', 'MIA', 'MIL', 'BKN', 'NYK', 'ORL', 'IND', 'PHI', 'TOR', 'WAS', 'DET', 'CHA'];

export function createLeague(rng, names) {
  const teams = names.teams(rng.fork('teams')).map((t, id) => ({
    id, city: t.city, nick: t.nick, abbr: t.abbr,
    conf: EAST.includes(t.srcAbbr) ? 'E' : 'W',
    colors: TEAM_COLORS[t.srcAbbr] || ['#888888', '#ffffff'],
    base: clamp(Math.round(rng.gauss(59, 10)), 38, 82),
  }));
  // Franchise-Stars (fuer Award-Rennen, Gegner in Key Games)
  const srng = rng.fork('stars');
  teams.forEach(t => {
    const n = names.player(srng, { famousBias: 0.5 });
    t.star = { first: n.first, last: n.last, look: rollLook(srng) };
  });
  return teams;
}

export function newPlayer(rng, names, archId, look, name) {
  const arch = archetypeById(archId);
  const draftPick = rng.weighted(Array.from({ length: 60 }, (_, i) => i + 1), p => (p <= 14 ? 3 : p <= 30 ? 2 : 1));
  const talent = (60 - draftPick) / 60; // 0..1
  const skills = {};
  for (const k of Object.keys(arch.skills)) skills[k] = clamp(Math.round(arch.skills[k] + rng.gauss(0, 3) + talent * 4 - 2), 25, 90);
  const c = arch.core;
  return {
    first: name.first, last: name.last, look, arch: archId, pos: arch.pos,
    age: rng.int(19, 20), skills,
    form: clamp(Math.round(44 + talent * 14 + c.form + rng.gauss(0, 2)), 35, 70),
    potential: clamp(Math.round(rng.gauss(72 + talent * 12, 7)), 58, 97),
    body: clamp(94 + c.body + rng.int(-3, 4), 70, 100),
    chem: 50 + c.chem, fame: clamp(20 + Math.round(talent * 20) + c.fame, 5, 60), peakFame: 0,
    teamId: -1, teamsPlayed: [], draftPick, perks: [],
    career: { pts: 0, games: 0, seasons: 0 },
    awards: { rings: 0, mvp: 0, fmvp: 0, dpoy: 0, scoring: 0, allStar: 0, roy: 0 },
    milestones: [], flags: { fifty: false }, ringChase: false, ringsChased: 0,
  };
}

export function createRun(seedStr, names, { archId, look, name, hof = [] }) {
  const rng = new RNG(seedStr);
  const teams = createLeague(rng.fork('league'), names);
  const prng = rng.fork('player');
  const p = newPlayer(prng, names, archId, look, name);
  // Draft: hoher Pick -> schwaches Team
  const byBase = teams.slice().sort((a, b) => a.base - b.base);
  const idx = clamp(((p.draftPick - 1) % 30) + rng.int(-2, 2), 0, 29);
  p.teamId = byBase[idx].id;
  p.teamsPlayed = [p.teamId];
  // Rivale: Star eines starken Teams; manchmal ein Spieler aus einem frueheren Run (persistenter Rivale)
  const rrng = rng.fork('rival');
  const strong = teams.filter(t => t.id !== p.teamId).sort((a, b) => b.base - a.base).slice(0, 6);
  const rivalTeam = rrng.pick(strong);
  let rival = { ...rivalTeam.star, teamId: rivalTeam.id, fromHof: false };
  if (hof.length && rrng.chance(0.35)) {
    const h = rrng.pick(hof);
    if (h.look) {
      rival = { first: h.first, last: h.last, look: h.look, teamId: rivalTeam.id, fromHof: true };
      rivalTeam.star = { first: h.first, last: h.last, look: h.look };
    }
  }
  return {
    seed: seedStr, rng, teams, p, rival,
    seasonNo: 1, year: new Date().getFullYear(),
    log: [], retire: { weakStreak: 0, overstay: 0 }, cur: null,
    usedCards: [], lastKinds: [],
  };
}

export const teamOf = (run, id = run.p.teamId) => run.teams[id];
export const maxSeasons = () => BALANCE.maxSeasons;

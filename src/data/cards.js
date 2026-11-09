// Entscheidungs- (Offseason) und Event-Karten. Gewichtet gezogen, mit Bedingungen (Alter, Team, Awards).
import { clamp } from '../systems/rng.js';
import { injuryChance } from '../systems/sim.js';

const LABEL = { form: 'FORM', body: 'KOERPER', chem: 'CHEMIE', fame: 'FAME', sho: 'WURF', pla: 'PLAY', def: 'DEF', ath: 'ATH', clu: 'CLUTCH' };
const SKILLS = ['sho', 'pla', 'def', 'ath', 'clu'];

// Wendet Aenderungen an und liefert lesbare Zusammenfassung
export function fx(run, ch) {
  const p = run.p, out = [];
  for (const [k, v] of Object.entries(ch)) {
    if (!v) continue;
    if (SKILLS.includes(k)) p.skills[k] = clamp(p.skills[k] + v, 0, 99);
    else if (k in LABEL) p[k] = clamp(p[k] + v, 0, k === 'form' ? 99 : 100);
    else { run.cur[k] = (run.cur[k] || 0) + v; continue; }
    out.push(`${LABEL[k]}${v > 0 ? '+' : ''}${v}`);
  }
  if ('fame' in ch) p.peakFame = Math.max(p.peakFame, p.fame);
  return out.join(' ');
}

export function moveTeam(run, teamId) {
  const p = run.p;
  p.teamId = teamId;
  if (!p.teamsPlayed.includes(teamId)) p.teamsPlayed.push(teamId);
  p.chem = 45;
}
const T = (run, id = run.p.teamId) => run.teams[id];
const tname = t => `${t.city} ${t.nick}`;
const others = run => run.teams.filter(t => t.id !== run.p.teamId);
const byBase = arr => arr.slice().sort((a, b) => b.base - a.base);
const rivalN = run => `${run.rival.first} ${run.rival.last}`;

export const CARDS = [
  // ---------------- OFFSEASON ----------------
  {
    id: 'training', type: 'off', title: 'TRAININGSCAMP', weight: () => 3,
    text: () => 'Der Sommer ist lang. Worauf legst du den Fokus?',
    options: [
      { label: 'Wurftraining', hint: 'WURF+', apply: r => fx(r, { sho: 4, clu: 1 }) },
      { label: 'Kraftraum', hint: 'ATH+ KOERPER+', apply: r => fx(r, { ath: 3, body: 4 }) },
      { label: 'Film-Studium', hint: 'DEF+ PLAY+', apply: r => fx(r, { def: 3, pla: 2 }) },
    ],
  },
  {
    id: 'freeagency', type: 'off', title: 'FREE AGENCY',
    weight: r => (r.seasonNo >= 3 && r.seasonNo % 3 === 0 ? 8 : r.seasonNo >= 3 ? 1 : 0),
    text: () => 'Dein Vertrag laeuft aus. Drei Angebote liegen auf dem Tisch.',
    options: [
      {
        label: 'Max-Deal', hint: 'FAME+ NEUES TEAM',
        apply: r => {
          const mids = byBase(others(r)).slice(8, 20);
          const t = r.rng.pick(mids); moveTeam(r, t.id); r.p.ringChase = false;
          return `-> ${t.abbr}! ` + fx(r, { fame: 6 });
        },
      },
      {
        label: 'Pay-Cut Superteam', hint: 'RING-CHANCE+ FAME-',
        apply: r => {
          const t = byBase(others(r))[r.rng.int(0, 1)]; moveTeam(r, t.id); r.p.ringChase = true;
          return `-> ${t.abbr}! ` + fx(r, { fame: -5 });
        },
      },
      { label: 'Bleiben', hint: 'CHEMIE+ TREUE', apply: r => fx(r, { chem: 8 }) },
    ],
  },
  {
    id: 'traderequest', type: 'off', title: 'TRADE-WUNSCH?',
    weight: r => (r.seasonNo >= 2 && T(r).base < 55 ? 4 : 0),
    text: r => `Die ${T(r).nick} verlieren. Fans und Presse werden ungeduldig.`,
    options: [
      {
        label: 'Trade fordern', hint: 'NEUES TEAM ?',
        apply: r => {
          const t = r.rng.pick(byBase(others(r)).slice(0, 14)); moveTeam(r, t.id); r.p.ringChase = false;
          return `Trade zu den ${t.nick}! ` + fx(r, { fame: -3 });
        },
      },
      {
        label: 'Loyal bleiben', hint: 'CHEMIE+',
        apply: r => { T(r).base = clamp(T(r).base + 3, 30, 85); return 'Das Front Office investiert. ' + fx(r, { chem: 6 }); },
      },
    ],
  },
  {
    id: 'mentor', type: 'off', title: 'MENTOR', weight: r => (r.p.age <= 24 ? 3 : 0),
    text: () => 'Ein alter Veteran will dich unter seine Fittiche nehmen.',
    options: [
      {
        label: 'Annehmen', hint: 'SKILL+ RIVALE?',
        apply: r => {
          let s = fx(r, { clu: 4, pla: 2, form: 2 });
          if (r.rng.chance(0.4)) { r.cur.rivalBoost += 2; s += ` ${r.rival.last} ist neidisch!`; }
          return s;
        },
      },
      { label: 'Allein trainieren', hint: 'ATH+', apply: r => fx(r, { ath: 2 }) },
    ],
  },
  {
    id: 'loadmgmt', type: 'off', title: 'ALTERNDE KNIE', weight: r => (r.p.age >= 30 ? 5 : 0),
    text: () => 'Der Doc raet zu Load Management in der Regular Season.',
    options: [
      { label: 'Load Management', hint: 'KOERPER+ FORM-', apply: r => fx(r, { body: 10, form: -2, chem: -3, injuryGames: 10 }) },
      { label: 'Volle Pulle', hint: 'FORM+ RISIKO!', apply: r => fx(r, { form: 2, body: -8 }) },
    ],
  },
  {
    id: 'national', type: 'off', title: 'NATIONALTEAM', weight: r => (r.p.age <= 31 && r.seasonNo >= 2 ? 2 : 0),
    text: () => 'Der Verband ruft dich fuer das Sommerturnier.',
    options: [
      { label: 'Zusagen', hint: 'FAME+ KOERPER-', apply: r => fx(r, { fame: 8, clu: 2, body: -6 }) },
      { label: 'Absagen', hint: 'KOERPER+', apply: r => fx(r, { body: 4, fame: -2 }) },
    ],
  },
  {
    id: 'shoe', type: 'off', title: 'SCHUH-DEAL', weight: r => (r.p.fame >= 50 ? 3 : 0),
    text: () => 'Eine Sneaker-Marke will deinen eigenen Signature-Schuh.',
    options: [
      { label: 'Unterschreiben', hint: 'FAME++ FORM-', apply: r => fx(r, { fame: 12, form: -2 }) },
      { label: 'Nur Basketball', hint: 'FORM+', apply: r => fx(r, { form: 2 }) },
    ],
  },
  {
    id: 'diet', type: 'off', title: 'ERNAEHRUNG', weight: () => 1.5,
    text: () => 'Der Trainer schlaegt einen radikalen Ernaehrungsplan vor.',
    options: [
      { label: 'Durchziehen', hint: 'KOERPER+', apply: r => fx(r, { body: 7, chem: -2 }) },
      { label: 'Pizza bleibt', hint: 'CHEMIE+ KOERPER-', apply: r => fx(r, { chem: 5, body: -3 }) },
    ],
  },

  // ---------------- EVENTS ----------------
  {
    id: 'injury', type: 'event', title: 'VERLETZUNG!', weight: r => injuryChance(r.p) * 20,
    text: () => 'Dein Knoechel ist angeknackst. Die Playoffs ruecken naeher.',
    options: [
      {
        label: 'Durchspielen', hint: 'RING-CHANCE+ RISIKO!',
        apply: r => {
          let s = fx(r, { body: -10, playoffPower: 4, chem: 3 });
          if (r.rng.chance(0.3)) s += ' AUTSCH! ' + fx(r, { form: -4, body: -6 });
          return s;
        },
      },
      { label: 'Load Management', hint: 'KOERPER+ SIEG-', apply: r => fx(r, { body: 4, playoffPower: -3, injuryGames: 12 }) },
    ],
  },
  {
    id: 'media', type: 'event', title: 'MEDIEN-DRAMA', weight: r => 1 + r.p.fame / 40,
    text: () => 'Ein Reporter zitiert dich falsch. Das Netz explodiert.',
    options: [
      { label: 'Zurueckschiessen', hint: 'FAME+ CHEMIE-', apply: r => fx(r, { fame: 10, chem: -8 }) },
      { label: 'Ignorieren', hint: 'FAME-', apply: r => fx(r, { fame: -3 }) },
      { label: 'Entschuldigen', hint: 'CHEMIE+ FAME-', apply: r => fx(r, { chem: 5, fame: -4 }) },
    ],
  },
  {
    id: 'shots', type: 'event', title: 'MEHR WUERFE?', weight: () => 2,
    text: () => 'Du fuehlst dich heiss. Forderst du mehr Wuerfe vom Coach?',
    options: [
      { label: 'Ball her!', hint: 'STATS+ CHEMIE-', apply: r => 'PUNKTE+ ' + fx(r, { usage: 4, chem: -10, fame: 4 }) },
      { label: 'Teamplay', hint: 'CHEMIE+', apply: r => fx(r, { chem: 6, pla: 1 }) },
    ],
  },
  {
    id: 'sponsor', type: 'event', title: 'SPONSOR-DEAL', weight: () => 1.5,
    text: () => 'Ein Energy-Drink will dich fuer seine Werbekampagne.',
    options: [
      { label: 'Unterschreiben', hint: 'FAME+ FORM-', apply: r => fx(r, { fame: 10, form: -3 }) },
      { label: 'Ablehnen', hint: 'FORM+', apply: r => fx(r, { form: 1, chem: 2 }) },
    ],
  },
  {
    id: 'chem', type: 'event', title: 'TEAMCHEMIE', weight: r => (r.p.chem < 50 ? 3 : 1),
    text: () => 'In der Kabine kriselt es. Zwei Mitspieler streiten.',
    options: [
      { label: 'Team-Dinner', hint: 'CHEMIE+', apply: r => fx(r, { chem: 10, body: -1 }) },
      { label: 'Raushalten', hint: 'CHEMIE-', apply: r => fx(r, { chem: -6, form: 1 }) },
      { label: 'Coach regelt das', hint: '???', apply: r => fx(r, { chem: r.rng.chance(0.5) ? 6 : -6 }) },
    ],
  },
  {
    id: 'rival', type: 'event', title: 'RIVALE', weight: () => 1.5,
    text: r => `${rivalN(r)} nennt dich im Interview ueberbewertet.`,
    options: [
      { label: 'Trash-Talk', hint: 'FAME+ CLUTCH+', apply: r => fx(r, { fame: 8, clu: 3, rivalBoost: 1 }) },
      { label: 'Mit Leistung', hint: 'FORM+', apply: r => fx(r, { form: 2 }) },
    ],
  },
  {
    id: 'party', type: 'event', title: 'PARTY-NACHT', weight: r => (r.p.age <= 30 ? 1.5 : 0.5),
    text: () => 'Ein Rapper laedt dich zu seiner Album-Release-Party ein.',
    options: [
      {
        label: 'Hingehen', hint: 'FAME+ RISIKO?',
        apply: r => {
          let s = fx(r, { fame: 8, body: -4 });
          if (r.rng.chance(0.25)) s += ' Die Fotos... ' + fx(r, { form: -3, chem: -5 });
          return s;
        },
      },
      { label: 'Frueh ins Bett', hint: 'KOERPER+', apply: r => fx(r, { body: 3 }) },
    ],
  },
  {
    id: 'rookiewall', type: 'event', title: 'ROOKIE-WALL', weight: r => (r.seasonNo === 1 ? 6 : 0),
    text: () => 'Die lange Saison schlaucht. Deine Beine sind schwer.',
    options: [
      { label: 'Extra-Schichten', hint: 'FORM+ KOERPER-', apply: r => fx(r, { form: 3, body: -5 }) },
      { label: 'Ausruhen', hint: 'KOERPER+', apply: r => fx(r, { body: 5 }) },
    ],
  },
  {
    id: 'viral', type: 'event', title: 'VIRAL!', weight: r => (r.p.skills.ath >= 62 ? 2 : 0.3),
    text: () => 'Dein Poster-Dunk geht viral. Millionen Klicks ueber Nacht.',
    options: [
      { label: 'Geniessen', hint: 'FAME+', apply: r => fx(r, { fame: 10 }) },
      { label: 'Bescheiden', hint: 'CHEMIE+', apply: r => fx(r, { chem: 5, fame: 3 }) },
    ],
  },
  {
    id: 'coachfired', type: 'event', title: 'COACH GEFEUERT', weight: r => (T(r).base < 52 ? 2.5 : 0),
    text: () => 'Nach der Pleitenserie fliegt der Coach. Du darfst mitreden.',
    options: [
      { label: 'Star-Coach holen', hint: 'TEAM+ CHEMIE-', apply: r => { T(r).base = clamp(T(r).base + 4, 30, 85); return 'TEAM+4 ' + fx(r, { chem: -4 }); } },
      { label: 'Assistent hoch', hint: 'CHEMIE+', apply: r => fx(r, { chem: 7 }) },
    ],
  },
  {
    id: 'deadline', type: 'event', title: 'TRADE DEADLINE', weight: r => (T(r).base >= 58 && r.seasonNo >= 2 ? 2 : 0),
    text: () => 'Das Front Office kann einen Veteranen holen. Kostet aber junge Talente.',
    options: [
      { label: 'All-in!', hint: 'JETZT+ ZUKUNFT-', apply: r => { T(r).base = clamp(T(r).base - 3, 30, 85); return 'TEAM-3 (spaeter) ' + fx(r, { power: 4, playoffPower: 2, chem: -2 }); } },
      { label: 'Geduld', hint: 'CHEMIE+', apply: r => fx(r, { chem: 4 }) },
    ],
  },
];

export function drawCard(run, type, exclude = []) {
  const pool = CARDS.filter(c => c.type === type && !exclude.includes(c.id) && c.weight(run) > 0);
  return run.rng.weighted(pool, c => c.weight(run));
}

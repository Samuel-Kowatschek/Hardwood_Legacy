// Free Agency: jedes Team waehlbar, Konsequenzen haengen von Teamstaerke, Markt und Rivale ab.
import { fx, moveTeam } from '../data/cards.js';

const BIG_CITY = /New York|Los Angeles|Brooklyn|Golden State/;

// Profil eines Ziel-Teams: Rang nach Staerke (1 = bestes), Effekte, Tags fuer die Anzeige
export function faProfile(run, team) {
  const sorted = run.teams.slice().sort((a, b) => b.base - a.base || a.id - b.id);
  const rank = sorted.findIndex(x => x.id === team.id) + 1;
  const eff = {}, tags = [];
  let ringChase = false;
  if (rank <= 4) { eff.fame = -5; eff.usage = -2; ringChase = true; tags.push('super'); }      // Superteam: Ring-Chance, aber Paycut + weniger Wuerfe, Ringe zaehlen weniger
  else if (rank <= 10) { eff.fame = -1; eff.usage = -1; tags.push('contender'); }              // Contender: gute Chancen, kleiner Paycut
  else if (rank <= 20) { eff.fame = 4; tags.push('fair'); }                                    // Mittelfeld: fairer Vertrag
  else { eff.fame = 8; eff.usage = 3; eff.form = 1; tags.push('money'); }                      // Schwaches Team: viel Geld, viele Wuerfe
  if (BIG_CITY.test(team.city)) { eff.fame = (eff.fame || 0) + 5; tags.push('city'); }
  const rival = team.id === run.rival.teamId;
  if (rival) { eff.clu = 2; tags.push('rival'); }
  if (run.p.teamsPlayed.includes(team.id)) { eff.chem = 6; tags.push('return'); }
  return { rank, eff, ringChase, tags, rival };
}

// Wechsel vollziehen; liefert die Effekt-Zusammenfassung
export function signWith(run, team) {
  const pr = faProfile(run, team);
  const back = run.p.teamsPlayed.includes(team.id);
  moveTeam(run, team.id);
  if (back) run.p.chem = 55; // Rueckkehr: man kennt sich
  run.p.ringChase = pr.ringChase;
  if (pr.rival) {
    // Rivale wird Mitspieler -> neuer Rivale beim besten anderen Team
    const other = run.teams.filter(x => x.id !== team.id).sort((a, b) => b.base - a.base)[0];
    run.rival.teamId = other.id;
  }
  return fx(run, pr.eff);
}

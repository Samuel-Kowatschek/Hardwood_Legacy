// Run-Ablauf (Director): Draft -> [Offseason-Karte, Events, Sim, Playoffs, Awards, Retire-Gamble] -> Legacy.
import { C, text, tiny, box } from './gfx.js';
import { bigText } from './ui.js';
import { clamp } from './systems/rng.js';
import { BALANCE } from './data/balance.js';
import { archetypeById } from './data/archetypes.js';
import { drawCard } from './data/cards.js';
import { arcadeMods } from './data/perks.js';
import { ovr, freshSeason, simulateSeason, gameProb, simSeries, confSeeds, PAIRS, applyAging, driftTeams } from './systems/sim.js';
import { computeAwards } from './systems/awards.js';
import { updateOverstay } from './systems/legacy.js';
import { playMusic, sfx } from './systems/audio.js';
import { drawSprite, idleFrame } from './sprites/spriteGen.js';
import { MessageScene } from './scenes/message.js';
import { CardScene } from './scenes/card.js';
import { SimScene } from './scenes/sim.js';
import { LogScene } from './scenes/log.js';
import { AwardsScene } from './scenes/awards.js';
import { PerkScene } from './scenes/perk.js';
import { RetireScene } from './scenes/retire.js';
import { LegacyScene } from './scenes/legacy.js';
import { ArcadeScene } from './arcade/arcadeScene.js';

const HOME = [true, true, false, false, true, false, true];
const ROUNDS = [
  { name: 'ERSTE RUNDE', short: 'R1' },
  { name: 'CONF-HALBFINALE', short: 'R2' },
  { name: 'CONF FINALS', short: 'CF' },
  { name: 'FINALS', short: 'FIN' },
];

function teamBanner(run, line1, line2) {
  return (ctx, t) => {
    const p = run.p, team = run.teams[p.teamId];
    box(ctx, 8, 8, 144, 82);
    drawSprite(ctx, p.look, team.colors, 16, 26, { frame: idleFrame(t), scale: 2, age: p.age });
    text(ctx, team.abbr, 56, 20, C.ORANGE);
    tiny(ctx, team.city.toUpperCase().slice(0, 22), 56, 32);
    tiny(ctx, team.nick.toUpperCase(), 56, 39);
    tiny(ctx, line1, 56, 54, C.WHITE);
    tiny(ctx, line2, 56, 62, C.ORANGE);
  };
}

export async function playRun(game, run) {
  const p = run.p;
  playMusic('season');
  const team = run.teams[p.teamId];
  await game.show(new MessageScene(
    `Mit dem ${p.draftPick}. Pick waehlen die ${team.city} ${team.nick}... ${p.first} ${p.last}!`,
    teamBanner(run, `PICK #${p.draftPick}`, `${archetypeById(p.arch).name.toUpperCase()} ${p.pos}`),
  ));
  const rv = run.rival, rt = run.teams[rv.teamId];
  await game.show(new MessageScene(
    rv.fromHof
      ? `Ein alter Bekannter: ${rv.first} ${rv.last} aus einer frueheren Aera spielt fuer ${rt.abbr}. Er ist dein Rivale!`
      : `Dein Rivale: ${rv.first} ${rv.last} von den ${rt.nick}. Der will auch alles.`,
    (ctx, t) => {
      box(ctx, 8, 8, 144, 82);
      drawSprite(ctx, rv.look, rt.colors, 112, 18, { frame: idleFrame(t), scale: 2 });
      tiny(ctx, 'RIVALE', 16, 18, C.ORANGE);
      tiny(ctx, rv.first.toUpperCase(), 16, 28);
      text(ctx, rv.last.slice(0, 11), 16, 36, C.WHITE);
      tiny(ctx, `${rt.abbr} ${rt.nick.toUpperCase()}`, 16, 50);
      if (rv.fromHof) tiny(ctx, 'AUS DEINER HALL OF FAME', 16, 76, C.ORANGE);
    },
  ), 'none');

  for (;;) {
    run.cur = freshSeason();
    playMusic('season');
    // 1. Offseason
    await game.show(new CardScene(run, drawCard(run, 'off'), 'OFFSEASON'));
    // 2. Regular-Season-Events
    const nEv = run.rng.chance(0.35) ? 2 : 1, used = [];
    for (let i = 0; i < nEv; i++) {
      const c = drawCard(run, 'event', used);
      used.push(c.id);
      await game.show(new CardScene(run, c, 'EVENT'), 'none');
    }
    // 3. Season-Sim
    const season = simulateSeason(run);
    await game.show(new SimScene(run, season));
    // Career-Milestone-Game (50-Punkte-Chance)
    if (!p.flags.fifty && season.ovr >= 72 && season.gp >= 40 && run.rng.chance(0.35)) await fiftyGame(game, run);
    // 4. Playoffs
    const po = await playoffs(game, run, season);
    // 5. Awards + Altersverlauf
    const aw = computeAwards(run, season, po);
    const aging = applyAging(run);
    const weak = updateOverstay(run, aw, aging, season, po);
    run.log.push({
      season: run.seasonNo, year: run.year, age: p.age - 1, teamId: p.teamId, ovr: season.ovr,
      ppg: season.ppg, w: season.w, l: season.l, reached: po.reached,
      ring: aw.ring, mvp: aw.mvp, fmvp: aw.fmvp, allStar: aw.allStar, weak,
    });
    await game.show(new AwardsScene(run, season, po, aw, aging));
    driftTeams(run);
    // 6. Retire-Gamble
    let forced = null;
    if (p.body <= 0) forced = 'Dein Koerper gibt auf. Zeit, die Schuhe an den Nagel zu haengen.';
    else if (run.seasonNo >= BALANCE.maxSeasons) forced = `Nach ${BALANCE.maxSeasons} Seasons ist Schluss. Dein Koerper streikt.`;
    const choice = await game.show(new RetireScene(run, forced));
    if (choice === 'retire') break;
    run.seasonNo++;
    run.year++;
    if (BALANCE.perkAfterSeasons.includes(run.seasonNo - 1)) await game.show(new PerkScene(run));
  }
  await game.show(new LegacyScene(run));
}

const arcadeAdj = q => (q - BALANCE.arcade.neutral) * BALANCE.arcade.swing;

function pickArcadeKind(run, clutch) {
  if (clutch) return 'clutch';
  const games = archetypeById(run.p.arch).games;
  return games[run.arcadeCount++ % games.length];
}

async function keyGame(game, run, back, opts) {
  const q = await game.show(new ArcadeScene(run, { ...opts, mods: arcadeMods(run.p.perks) }), 'flash');
  playMusic('season');
  if (back) game.set(back, 'wipe');
  return q;
}

async function fiftyGame(game, run) {
  const opp = run.rng.pick(run.teams.filter(t => t.id !== run.p.teamId));
  await game.show(new MessageScene('Du bist heute heiss! 44 Punkte nach drei Vierteln. Holst du dir die 50?',
    teamBanner(run, 'MILESTONE-GAME', '44 PUNKTE')));
  const q = await keyGame(game, run, null, {
    kind: pickArcadeKind(run, false), title: '50-PUNKTE-CHANCE', opp, pressure: 0.05,
    situation: '44 PUNKTE, Q4', scoreLine: [104, 96],
  });
  const ok = q >= 0.55;
  if (ok) { run.p.flags.fifty = true; run.p.fame = clamp(run.p.fame + 6, 0, 100); }
  await game.show(new MessageScene(ok ? '52 PUNKTE! Ein Abend fuer die Geschichtsbuecher. Meilenstein!' : '48 Punkte. So knapp an der 50 vorbei...',
    teamBanner(run, ok ? '50+ PUNKTE!' : '48 PUNKTE', ok ? 'MEILENSTEIN' : 'NAECHSTES MAL')), 'wipe');
}

// Kompletter Bracket einer Conference (KI), liefert Champion-ID
function simConf(run, seeds) {
  let ids = PAIRS.map(([a, b]) => simSeries(run, seeds[a], seeds[b], true).winner);
  while (ids.length > 1) {
    const nx = [];
    for (let i = 0; i < ids.length; i += 2) nx.push(simSeries(run, ids[i], ids[i + 1], seeds.indexOf(ids[i]) < seeds.indexOf(ids[i + 1])).winner);
    ids = nx;
  }
  return ids[0];
}

async function playoffs(game, run, season) {
  const me = run.p.teamId, rng = run.rng;
  const res = { champion: false, reached: 'LOTTERY', finalsQuality: null };
  const log = new LogScene(run, 'PLAYOFFS', String(run.year));
  game.set(log, 'wipe');
  const { rank, conf, standings } = season;
  if (rank > 10) {
    await log.line('KEINE PLAYOFFS', C.ORANGE);
    await log.msg('Die Saison ist vorbei. Lottery statt Playoffs. Zeit zum Nachdenken.');
    return res;
  }
  const top10 = confSeeds(standings, conf, 10);
  let seeds = top10.slice(0, 8);
  if (rank >= 7) {
    res.reached = 'PLAY-IN';
    const oppId = rank === 7 ? top10[7] : rank === 8 ? top10[6] : rank === 9 ? top10[9] : top10[8];
    const opp = run.teams[oppId];
    await log.line(`PLAY-IN #${rank}`, C.ORANGE);
    await log.msg(`Platz ${rank}: Play-In gegen die ${opp.nick}. Verlieren heisst Urlaub!`);
    const q = await keyGame(game, run, log, { kind: pickArcadeKind(run, false), title: 'PLAY-IN', opp, pressure: 0.15, situation: 'ALLES ODER NICHTS', scoreLine: [88, 90] });
    const win = rng.next() < clamp(gameProb(run, me, oppId, rank <= 8) + arcadeAdj(q), 0.05, 0.95);
    await log.line(`PLAY-IN ${opp.abbr} ${win ? 'SIEG' : 'AUS'}`, win ? C.WHITE : C.ORANGE);
    if (!win) { sfx.sad(); await log.msg('Aus im Play-In. Bitter. Der Sommer beginnt frueh.'); return res; }
    const seedIdx = rank === 7 ? 6 : 7;
    seeds = top10.slice(0, 6);
    const otherPlayIn = top10.slice(6, 10).filter(id => id !== me && id !== oppId)[0];
    if (seedIdx === 6) seeds.push(me, otherPlayIn ?? top10[7]);
    else seeds.push(top10[6] === me || top10[6] === oppId ? otherPlayIn : top10[6], me);
  } else {
    await log.line(`SEED #${rank} ${conf === 'E' ? 'OSTEN' : 'WESTEN'}`, C.ORANGE);
  }
  const otherConf = conf === 'E' ? 'W' : 'E';
  const otherChamp = simConf(run, confSeeds(standings, otherConf, 8));
  const mySeed = seeds.indexOf(me);
  const pairIdx = PAIRS.findIndex(pr => pr.includes(mySeed));
  // Gegner pro Runde
  const partner = PAIRS[pairIdx][0] === mySeed ? PAIRS[pairIdx][1] : PAIRS[pairIdx][0];
  const adjPair = PAIRS[pairIdx ^ 1];
  const otherHalf = pairIdx < 2 ? [PAIRS[2], PAIRS[3]] : [PAIRS[0], PAIRS[1]];
  const winOf = pr => simSeries(run, seeds[pr[0]], seeds[pr[1]], true).winner;
  const oppFns = [
    () => seeds[partner],
    () => winOf(adjPair),
    () => { const a = winOf(otherHalf[0]), b = winOf(otherHalf[1]); return simSeries(run, a, b, seeds.indexOf(a) < seeds.indexOf(b)).winner; },
    () => otherChamp,
  ];
  for (let r = 0; r < 4; r++) {
    const oppId = oppFns[r]();
    const myHome = r === 3 ? season.recs[me].pct >= season.recs[oppId].pct : mySeed < seeds.indexOf(oppId);
    res.reached = ROUNDS[r].short;
    const out = await playSeries(game, run, log, oppId, r, myHome);
    if (r === 3) res.finalsQuality = out.q;
    if (!out.won) {
      sfx.sad();
      const o = run.teams[oppId];
      const rivalTxt = run.rival.teamId === oppId ? ` ${run.rival.last} grinst.` : '';
      await log.msg(`Aus in den ${ROUNDS[r].name} gegen die ${o.nick}.${rivalTxt}`);
      return res;
    }
  }
  res.champion = true;
  res.reached = 'CHAMP';
  sfx.fanfare(); sfx.crowd(2);
  await log.line('CHAMPIONS!!!', C.ORANGE);
  await log.msg(`CHAMPIONS! Die ${run.teams[me].nick} holen den Titel und du hast einen Ring!`);
  return res;
}

async function playSeries(game, run, log, oppId, round, myHome) {
  const me = run.p.teamId, rng = run.rng, opp = run.teams[oppId];
  let w = 0, l = 0, g = 0, arc = 0, q = null;
  const isKeyRound = round >= 2;
  const maxArc = round === 3 ? 2 : 1;
  if (isKeyRound) {
    const rv = run.rival.teamId === oppId ? ` Mit deinem Rivalen ${run.rival.last}!` : '';
    await log.msg(`${ROUNDS[round].name} gegen die ${opp.city} ${opp.nick}.${rv}`);
  }
  while (w < 4 && l < 4) {
    const home = myHome ? HOME[g] : !HOME[g];
    let prob = gameProb(run, me, oppId, home);
    const decisive = w === 3 || l === 3;
    if (isKeyRound && decisive && arc < maxArc && (arc === 0 || (w === 3 && l === 3))) {
      arc++;
      const g7 = w === 3 && l === 3;
      const situation = g7 ? 'SPIEL 7' : w === 3 ? 'MATCHBALL' : 'ELIMINATION';
      await log.line(`${ROUNDS[round].short} SPIEL ${g + 1} (${w}-${l})`, C.ORANGE);
      await log.msg(g7 ? `Spiel 7! Ein Spiel entscheidet alles.` : w === 3 ? `Spiel ${g + 1}, ${w}-${l}. Matchball!` : `Spiel ${g + 1}, ${w}-${l}. Verlieren heisst raus!`);
      const clutch = round === 3 && (g7 || w === 3);
      const behind = rng.int(1, 3);
      const base = rng.int(92, 108);
      q = await keyGame(game, run, log, {
        kind: pickArcadeKind(run, clutch), title: `${ROUNDS[round].short === 'FIN' ? 'FINALS' : 'CONF FINALS'} G${g + 1}`, opp,
        pressure: round === 3 ? (g7 ? 0.5 : 0.35) : 0.2, situation, scoreLine: [base, base + behind],
      });
      prob = clamp(prob + arcadeAdj(q), 0.05, 0.95);
    }
    if (rng.next() < prob) w++; else l++;
    g++;
  }
  const won = w === 4;
  await log.line(`${ROUNDS[round].short} ${opp.abbr} ${w}-${l} ${won ? 'WEITER' : 'RAUS'}`, won ? C.WHITE : C.ORANGE);
  return { won, q };
}

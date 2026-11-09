// Run-Ablauf (Director): Draft -> [Offseason-Karte, Season-Sim mit Event-Unterbrechungen, Playoffs, Awards, Retire] -> Legacy.
import { C, text, tiny, box } from './gfx.js';
import { clamp } from './systems/rng.js';
import { BALANCE } from './data/balance.js';
import { archetypeById } from './data/archetypes.js';
import { drawCard } from './data/cards.js';
import { arcadeMods } from './data/perks.js';
import { ovr, freshSeason, startSeason, finishSeason, gameProb, simSeries, confSeeds, PAIRS, applyAging, driftTeams } from './systems/sim.js';
import { computeAwards } from './systems/awards.js';
import { updateOverstay } from './systems/legacy.js';
import { playMusic, sfx } from './systems/audio.js';
import { t } from './i18n/index.js';
import { drawSprite, idleFrame } from './sprites/spriteGen.js';
import { MessageScene } from './scenes/message.js';
import { CardScene } from './scenes/card.js';
import { SimScene } from './scenes/sim.js';
import { LogScene } from './scenes/log.js';
import { AwardsScene } from './scenes/awards.js';
import { PerkScene } from './scenes/perk.js';
import { RetireScene } from './scenes/retire.js';
import { LegacyScene } from './scenes/legacy.js';
import { ArcadeScene, ARCADE_KINDS } from './arcade/arcadeScene.js';

const HOME = [true, true, false, false, true, false, true];
const ROUND_KEYS = ['R1', 'R2', 'CF', 'FIN'];

function teamBanner(run, line1, line2) {
  return (ctx, tt) => {
    const p = run.p, team = run.teams[p.teamId];
    box(ctx, 8, 8, 144, 82);
    drawSprite(ctx, p.look, team.colors, 16, 26, { frame: idleFrame(tt), scale: 2, age: p.age });
    text(ctx, team.abbr, 56, 20, C.ORANGE);
    tiny(ctx, team.city.toUpperCase().slice(0, 22), 56, 32);
    tiny(ctx, team.nick.toUpperCase().slice(0, 22), 56, 39);
    tiny(ctx, line1, 56, 54, C.WHITE);
    tiny(ctx, line2, 56, 62, C.ORANGE);
  };
}

export async function playRun(game, run) {
  const p = run.p;
  game.run = run;
  playMusic('season');
  const team = run.teams[p.teamId];
  await game.show(new MessageScene(
    t('flow.draft', { pick: p.draftPick, city: team.city, nick: team.nick, name: `${p.first} ${p.last}` }),
    teamBanner(run, t('flow.draftL1', { n: p.draftPick }), `${archetypeById(p.arch).name.toUpperCase()} ${p.pos}`),
  ));
  const rv = run.rival, rt = run.teams[rv.teamId];
  await game.show(new MessageScene(
    rv.fromHof
      ? t('flow.rivalHof', { name: `${rv.first} ${rv.last}`, abbr: rt.abbr })
      : t('flow.rival', { name: `${rv.first} ${rv.last}`, nick: rt.nick }),
    (ctx, tt) => {
      box(ctx, 8, 8, 144, 82);
      drawSprite(ctx, rv.look, rt.colors, 112, 18, { frame: idleFrame(tt), scale: 2 });
      tiny(ctx, t('flow.rivalTag'), 16, 18, C.ORANGE);
      tiny(ctx, rv.first.toUpperCase(), 16, 28);
      text(ctx, rv.last.slice(0, 11), 16, 36, C.WHITE);
      tiny(ctx, `${rt.abbr} ${rt.nick.toUpperCase()}`.slice(0, 22), 16, 50);
      if (rv.fromHof) tiny(ctx, t('flow.fromHof'), 16, 76, C.ORANGE);
    },
  ), 'none');

  for (;;) {
    run.cur = freshSeason();
    playMusic('season');
    // 1. Offseason-Entscheidung
    await game.show(new CardScene(run, drawCard(run, 'off'), 'off'));
    // 2. Regular Season, unterbrochen von Events
    const season = await regularSeason(game, run);
    // 3. Playoffs
    const po = await playoffs(game, run, season);
    // 4. Awards + Altersverlauf
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
    // 5. Retire-Gamble
    let forced = null;
    if (p.body <= 0) forced = t('flow.bodyGone');
    else if (run.seasonNo >= BALANCE.maxSeasons) forced = t('flow.capReached', { n: BALANCE.maxSeasons });
    const choice = await game.show(new RetireScene(run, forced));
    if (choice === 'retire') break;
    run.seasonNo++;
    run.year++;
    if (BALANCE.perkAfterSeasons.includes(run.seasonNo - 1)) await game.show(new PerkScene(run));
  }
  await game.show(new LegacyScene(run));
}

// Regular Season in Abschnitten: Unterbrechung ca. bei 35 % (Saisonmitte) und 70 % (Saisonende)
async function regularSeason(game, run) {
  const st = startSeason(run);
  const sim = new SimScene(run, st);
  game.set(sim, 'wipe');
  const stops = [
    { at: rngStop(run, 0.3, 0.42), phase: 'mid', chance: 1 },
    { at: rngStop(run, 0.62, 0.78), phase: 'late', chance: 0.6 },
  ];
  let fiftyDone = false;
  for (const stop of stops) {
    await sim.playTo(stop.at);
    // Milestone-Game als Saison-Event
    if (!fiftyDone && !run.p.flags.fifty && ovr(run.p) >= 72 && st.out === 0 && run.rng.chance(0.25)) {
      fiftyDone = true;
      await fiftyGame(game, run);
      game.set(sim, 'wipe');
      continue;
    }
    if (!run.rng.chance(stop.chance)) continue;
    await game.show(new CardScene(run, drawCard(run, stop.phase), stop.phase), 'wipe');
    game.set(sim, 'wipe');
  }
  await sim.playTo(1);
  const season = finishSeason(run, st);
  const confName = season.conf === 'E' ? t('sim.east') : t('sim.west');
  let msg = t('sim.summary', { w: season.w, l: season.l, rank: season.rank, conf: confName });
  msg += season.rank <= 6 ? t('sim.playoffs') : season.rank <= 10 ? t('sim.playin') : t('sim.none');
  if (season.injury) msg += ' ' + t('sim.injured', { g: season.injury.games });
  await sim.summary(msg);
  return season;
}
const rngStop = (run, a, b) => run.rng.float(a, b);

const arcadeAdj = q => (q - BALANCE.arcade.neutral) * BALANCE.arcade.swing;

// Jeder Archetyp bekommt alle Minigames, nur unterschiedlich gewichtet; direkte Wiederholung wird vermieden.
function pickArcadeKind(run, clutchMoment) {
  if (clutchMoment && run.rng.chance(0.6)) return 'clutch';
  const prefs = archetypeById(run.p.arch).games;
  const last = run.lastKinds || [];
  const kind = run.rng.weighted(ARCADE_KINDS.filter(k => k !== 'clutch'), k => (prefs[k] || 1) * (last.includes(k) ? 0.15 : 1));
  run.lastKinds = [kind, ...last].slice(0, 2);
  return kind;
}

async function keyGame(game, run, back, opts) {
  const q = await game.show(new ArcadeScene(run, { ...opts, mods: arcadeMods(run.p.perks) }), 'flash');
  playMusic('season');
  if (back) game.set(back, 'wipe');
  return q;
}

async function fiftyGame(game, run) {
  const opp = run.rng.pick(run.teams.filter(x => x.id !== run.p.teamId));
  await game.show(new MessageScene(t('flow.fiftyIntro'), teamBanner(run, t('flow.fiftyL1'), t('flow.fiftyL2'))));
  const q = await keyGame(game, run, null, {
    kind: pickArcadeKind(run, false), title: t('flow.fiftyTitle'), opp, pressure: 0.05,
    situation: t('flow.fiftySit'), scoreLine: [104, 96],
  });
  const ok = q >= 0.55;
  if (ok) { run.p.flags.fifty = true; run.p.fame = clamp(run.p.fame + 6, 0, 100); }
  await game.show(new MessageScene(ok ? t('flow.fiftyOk') : t('flow.fiftyNo'),
    teamBanner(run, ok ? t('flow.fiftyOkL1') : t('flow.fiftyNoL1'), ok ? t('flow.fiftyOkL2') : t('flow.fiftyNoL2'))), 'wipe');
}

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
    await log.line(t('flow.noPlayoffs'), C.ORANGE);
    await log.msg(t('flow.noPlayoffsMsg'));
    return res;
  }
  const top10 = confSeeds(standings, conf, 10);
  let seeds = top10.slice(0, 8);
  if (rank >= 7) {
    res.reached = 'PLAY-IN';
    const oppId = rank === 7 ? top10[7] : rank === 8 ? top10[6] : rank === 9 ? top10[9] : top10[8];
    const opp = run.teams[oppId];
    await log.line(t('flow.playIn', { n: rank }), C.ORANGE);
    await log.msg(t('flow.playInMsg', { n: rank, nick: opp.nick }));
    const q = await keyGame(game, run, log, { kind: pickArcadeKind(run, false), title: t('flow.playInTitle'), opp, pressure: 0.15, situation: t('flow.allOrNothing'), scoreLine: [88, 90] });
    const win = rng.next() < clamp(gameProb(run, me, oppId, rank <= 8) + arcadeAdj(q), 0.05, 0.95);
    await log.line(t('flow.playInRes', { abbr: opp.abbr, res: win ? t('flow.win') : t('flow.out') }), win ? C.WHITE : C.ORANGE);
    if (!win) { sfx.sad(); await log.msg(t('flow.playInLost')); return res; }
    const seedIdx = rank === 7 ? 6 : 7;
    seeds = top10.slice(0, 6);
    const otherPlayIn = top10.slice(6, 10).filter(id => id !== me && id !== oppId)[0];
    if (seedIdx === 6) seeds.push(me, otherPlayIn ?? top10[7]);
    else seeds.push(top10[6] === me || top10[6] === oppId ? otherPlayIn : top10[6], me);
  } else {
    await log.line(t('flow.seed', { n: rank, conf: conf === 'E' ? t('flow.east') : t('flow.west') }), C.ORANGE);
  }
  const otherConf = conf === 'E' ? 'W' : 'E';
  const otherChamp = simConf(run, confSeeds(standings, otherConf, 8));
  const mySeed = seeds.indexOf(me);
  const pairIdx = PAIRS.findIndex(pr => pr.includes(mySeed));
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
    res.reached = ROUND_KEYS[r];
    const out = await playSeries(game, run, log, oppId, r, myHome);
    if (r === 3) res.finalsQuality = out.q;
    if (!out.won) {
      sfx.sad();
      const o = run.teams[oppId];
      const grin = run.rival.teamId === oppId ? t('flow.rivalGrin', { name: run.rival.last }) : '';
      await log.msg(t('flow.lostRound', { round: t('flow.rounds.' + ROUND_KEYS[r]), nick: o.nick }) + grin);
      return res;
    }
  }
  res.champion = true;
  res.reached = 'CHAMP';
  sfx.fanfare(); sfx.crowd(2);
  await log.line(t('flow.champions'), C.ORANGE);
  await log.msg(t('flow.champMsg', { nick: run.teams[me].nick }));
  return res;
}

async function playSeries(game, run, log, oppId, round, myHome) {
  const me = run.p.teamId, rng = run.rng, opp = run.teams[oppId];
  const rk = ROUND_KEYS[round];
  let w = 0, l = 0, g = 0, arc = 0, q = null;
  const isKeyRound = round >= 2;
  const maxArc = round === 3 ? 2 : 1;
  if (isKeyRound) {
    const rv = run.rival.teamId === oppId ? t('flow.seriesRival', { name: run.rival.last }) : '';
    await log.msg(t('flow.seriesIntro', { round: t('flow.rounds.' + rk), city: opp.city, nick: opp.nick }) + rv);
  }
  while (w < 4 && l < 4) {
    const home = myHome ? HOME[g] : !HOME[g];
    let prob = gameProb(run, me, oppId, home);
    const decisive = w === 3 || l === 3;
    if (isKeyRound && decisive && arc < maxArc && (arc === 0 || (w === 3 && l === 3))) {
      arc++;
      const g7 = w === 3 && l === 3;
      await log.line(t('flow.gameLine', { r: rk, g: g + 1, w, l }), C.ORANGE);
      await log.msg(g7 ? t('flow.g7') : w === 3 ? t('flow.closeOut', { g: g + 1, w, l }) : t('flow.elim', { g: g + 1, w, l }));
      const clutch = round === 3 && (g7 || w === 3);
      const behind = rng.int(1, 3), base = rng.int(92, 108);
      q = await keyGame(game, run, log, {
        kind: pickArcadeKind(run, clutch), title: round === 3 ? t('flow.keyFin', { g: g + 1 }) : t('flow.keyCf', { g: g + 1 }), opp,
        pressure: round === 3 ? (g7 ? 0.5 : 0.35) : 0.2,
        situation: g7 ? t('flow.sitG7') : w === 3 ? t('flow.sitClose') : t('flow.sitElim'), scoreLine: [base, base + behind],
      });
      prob = clamp(prob + arcadeAdj(q), 0.05, 0.95);
    }
    if (rng.next() < prob) w++; else l++;
    g++;
  }
  const won = w === 4;
  await log.line(t('flow.seriesRes', { r: rk, abbr: opp.abbr, w, l, res: won ? t('flow.next') : t('flow.out') }), won ? C.WHITE : C.ORANGE);
  return { won, q };
}

// Testmodus-Seiten im Stats-Overlay: Chancen, Liga, Entscheidung (Karte / Free Agency).
import { C, tiny, bar } from '../gfx.js';
import { t } from '../i18n/index.js';
import { BALANCE } from '../data/balance.js';
import { ovr, myPower, aiPower, injuryChance } from '../systems/sim.js';
import { odds, ODDS_KEYS, analyzeOption, analyzeTeam, legacyNow } from '../systems/testmode.js';
import { signWith } from '../systems/freeagency.js';

const S = BALANCE.sim;
const pc = x => `${Math.round(x * 100)}%`;

// Welche Seiten gibt es gerade?
export function testPages(run, scene) {
  const pages = ['odds', 'league'];
  const name = scene && scene.constructor.name;
  if ((name === 'CardScene' && scene.phase !== 'result') || (name === 'FreeAgencyScene' && !scene.box)) pages.push('decision');
  return pages;
}

function head(ctx, st, title) {
  tiny(ctx, t('test.badge'), 9, 6, C.ORANGE);
  tiny(ctx, title, 80, 6, C.WHITE, 'center');
  tiny(ctx, `${st.page + 1}/${st.pages.length}`, 151, 6, C.WHITE, 'right');
  tiny(ctx, t('test.nav', { i: st.page + 1, n: st.pages.length }), 80, 134, C.ORANGE, 'center');
}

export function drawTestPage(ctx, st, page) {
  const run = st.run;
  if (!st.cache || st.cache.page !== page) st.cache = { page, data: compute(run, st.scene, page) };
  const d = st.cache.data;
  head(ctx, st, t('test.p.' + page));
  if (page === 'odds') drawOdds(ctx, run, d);
  else if (page === 'league') drawLeague(ctx, run, d);
  else drawDecision(ctx, run, d);
}

function compute(run, scene, page) {
  if (page === 'decision') {
    if (scene.constructor.name === 'CardScene') {
      const labels = t(`cards.${scene.card.id}.o`);
      return { kind: 'card', opts: scene.card.opts.map((o, i) => ({ label: labels[i], ...analyzeOption(run, scene.card, i) })) };
    }
    const tm = scene.i === 0 ? null : scene.teams[scene.i - 1];
    return { kind: 'fa', label: tm ? `${tm.abbr} ${tm.nick}`.toUpperCase() : t('fa.stay'), line: analyzeTeam(run, tm, signWith) };
  }
  return odds(run);
}

function drawOdds(ctx, run, o) {
  const p = run.p, pr = o.pr;
  let y = 15;
  for (const k of ODDS_KEYS) {
    if (o[k] == null) continue;
    tiny(ctx, t('test.o.' + k), 9, y);
    bar(ctx, 40, y, 80, 5, o[k]);
    tiny(ctx, pc(o[k]), 151, y, C.ORANGE, 'right');
    y += 7;
  }
  y += 2;
  const w = Math.round(pr.pct * S.games);
  tiny(ctx, t('test.proj', { w, l: S.games - w, r: pr.rank, ppg: pr.ppg.toFixed(1), gp: Math.round(pr.gp) }), 9, y); y += 7;
  tiny(ctx, t('test.hidden', { pot: p.potential, inj: pc(injuryChance(p)), pw: myPower(run).toFixed(1), avg: pr.avg.toFixed(1) }), 9, y); y += 7;
  const ab = run.cur?.award || { all: 0, mvp: 0, dpoy: 0, ppg: 0 };
  tiny(ctx, t('test.bonus', { a: ab.all.toFixed(1), m: ab.mvp.toFixed(1), d: ab.dpoy.toFixed(1), s: ab.ppg.toFixed(1) }), 9, y); y += 7;
  tiny(ctx, t('test.series', { x: o.series.map(pc).join(' ') }), 9, y); y += 7;
  tiny(ctx, t('test.legacy', { n: legacyNow(run), g: pc(o.gameVsBest) }), 9, y);
}

function drawLeague(ctx, run, o) {
  const p = run.p, cur = run.cur || {};
  const rb = (cur.rivalBoost || 0) * 2;
  // Messlatten der KI vs. eigener Wert
  tiny(ctx, t('test.bars'), 9, 15, C.ORANGE);
  tiny(ctx, t('test.bar1', { m: S.aiMvpBase + rb, a: S.allStarCut, o: ovr(p) }), 9, 22);
  tiny(ctx, t('test.bar2', { d: S.aiDpoyBase, def: p.skills.def, s: S.aiScoringBase + rb * 0.5, ppg: o.pr.ppg.toFixed(1) }), 9, 29);
  tiny(ctx, t('test.rows'), 9, 38, C.ORANGE);
  const st = cur.st, rival = run.rival.teamId;
  const list = run.teams.map(x => ({ x, pw: x.id === p.teamId ? myPower(run) : aiPower(x) })).sort((a, b) => b.pw - a.pw);
  const mine = list.findIndex(r => r.x.id === p.teamId);
  let rows = list.slice(0, 13);
  if (mine >= 13) rows = rows.slice(0, 12).concat(list[mine]);
  rows.forEach((r, i) => {
    const y = 45 + i * 6, x = r.x;
    const col = x.id === p.teamId ? C.ORANGE : C.WHITE;
    const rec = st && st.g ? `${st.recs[x.id].w}-${st.recs[x.id].l}` : '';
    tiny(ctx, `${list.indexOf(r) + 1}.`, 17, y, col, 'right');
    tiny(ctx, `${x.abbr} ${x.conf}`, 20, y, col);
    tiny(ctx, r.pw.toFixed(1), 54, y, col);
    tiny(ctx, `${x.star.first[0]}.${x.star.last}`.toUpperCase().slice(0, 12) + (x.id === rival ? '*' : ''), 76, y, x.id === rival ? C.ORANGE : col);
    tiny(ctx, rec, 151, y, col, 'right');
  });
}

function drawDecision(ctx, run, d) {
  let y = 15;
  const line = (s, col = C.WHITE) => { for (let k = 0; k < s.length && y < 128; k += 35) { tiny(ctx, s.slice(k, k + 35), 9, y, col); y += 6; } };
  if (d.kind === 'fa') { line(d.label, C.ORANGE); line(d.line); return; }
  for (const o of d.opts) {
    line(o.label.toUpperCase(), C.ORANGE);
    if (o.exact) line(o.exact);
    if (o.risk) line(t('test.risk') + ' ' + o.risk);
    if (o.good) line(t('test.good') + ' ' + o.good);
    if (o.bad) line(t('test.bad') + ' ' + o.bad);
    for (const l of o.lines) line(l);
    y += 3;
  }
}

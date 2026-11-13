// Stats-Overlay (Taste S / STATS-Button): alle Werte, Skills, Perks, Karriere.
import { C, text, tiny, box, bar } from '../gfx.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';
import { ovr } from '../systems/sim.js';
import { archetypeById } from '../data/archetypes.js';
import { perkById, activeSynergies } from '../data/perks.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';
import { drawTestPage, testPages } from './testpages.js';

export class StatsScene {
  // scene = aktuelle Szene (Testmodus: Entscheidungs-Seite fuer Karten/Free Agency)
  constructor(run, scene = null) {
    this.run = run; this.t = 0; this.page = 0; this.scene = scene; sfx.select();
    this.pages = run.test ? ['player', ...testPages(run, scene)] : ['player'];
  }
  update(game) {
    const n = this.pages.length;
    if (n > 1 && (input.pressed('right') || this.nav === 1)) { this.page = (this.page + 1) % n; sfx.blip(); }
    if (n > 1 && (input.pressed('left') || this.nav === -1)) { this.page = (this.page + n - 1) % n; sfx.blip(); }
    this.nav = 0;
    if (this.t > 2 && (input.pressed('stats') || input.pressed('b') || input.pressed('a') || this.clickClose)) { sfx.back(); game.overlay = null; }
  }
  draw(ctx) {
    const run = this.run, p = run.p, team = run.teams[p.teamId];
    ctx.fillStyle = C.BG; ctx.fillRect(0, 0, 160, 144);
    if (this.pages.length > 1) {
      // Testmodus: Rand links/rechts = Seite wechseln, Mitte = schliessen
      input.region(0, 0, 28, 144, null, () => { this.nav = -1; });
      input.region(132, 0, 28, 144, null, () => { this.nav = 1; });
      input.region(28, 0, 104, 144, null, () => { this.clickClose = true; });
    } else input.region(0, 0, 160, 144, null, () => { this.clickClose = true; });
    box(ctx, 0, 0, 160, 144);
    if (this.page > 0) return drawTestPage(ctx, this, this.pages[this.page]);
    drawSprite(ctx, p.look, team.colors, 8, 7, { frame: idleFrame(this.t), age: p.age });
    text(ctx, `${p.first[0]}. ${p.last}`.slice(0, 12), 27, 8, C.WHITE);
    tiny(ctx, t('stats.age', { a: p.age, pos: p.pos, arch: archetypeById(p.arch).name.toUpperCase() }), 27, 18);
    tiny(ctx, t('stats.team', { abbr: team.abbr, n: team.base }), 27, 25);
    text(ctx, String(ovr(p)), 151, 8, C.ORANGE, 'right');
    tiny(ctx, t('stat.ovr'), 151, 18, C.WHITE, 'right');
    // Kernwerte
    tiny(ctx, t('stats.core'), 9, 33, C.ORANGE);
    ['form', 'body', 'chem', 'fame'].forEach((k, i) => {
      const y = 40 + i * 7;
      tiny(ctx, t('stat.' + k), 9, y);
      bar(ctx, 36, y, 28, 5, p[k] / 100);
      tiny(ctx, String(Math.round(p[k])), 77, y, C.ORANGE, 'right');
    });
    // Skills
    tiny(ctx, t('stats.skills'), 84, 33, C.ORANGE);
    ['sho', 'pla', 'def', 'ath', 'clu'].forEach((k, i) => {
      const y = 40 + i * 7;
      tiny(ctx, t('stat.' + k), 84, y);
      bar(ctx, 112, y, 26, 5, p.skills[k] / 99);
      tiny(ctx, String(p.skills[k]), 151, y, C.ORANGE, 'right');
    });
    // Perks
    tiny(ctx, t('stats.perks'), 9, 77, C.ORANGE);
    const names = p.perks.map(id => perkById(id).name);
    const pl = names.length ? names.join(', ') : t('stats.none');
    tiny(ctx, pl.slice(0, 35), 9, 84); if (pl.length > 35) tiny(ctx, pl.slice(35, 70), 9, 90);
    const syn = activeSynergies(p.perks);
    if (syn.length) tiny(ctx, t('stats.synergy', { x: syn.map(s => s.name).join(', ') }).slice(0, 35), 9, 96, C.ORANGE);
    // Karriere
    const a = p.awards;
    tiny(ctx, t('stats.career'), 9, 104, C.ORANGE);
    tiny(ctx, t('stats.careerLine', { s: p.career.seasons, p: p.career.pts }), 9, 111);
    tiny(ctx, t('stats.awardsLine', { r: a.rings, m: a.mvp, f: a.fmvp, d: a.dpoy }), 9, 118);
    tiny(ctx, t('stats.awardsLine2', { a: a.allStar, s: a.scoring, y: a.roy }), 9, 125);
    tiny(ctx, this.pages.length > 1 ? t('test.nav', { i: 1, n: this.pages.length }) : t('stats.close'), 80, 134, this.pages.length > 1 ? C.ORANGE : C.WHITE, 'center');
  }
}

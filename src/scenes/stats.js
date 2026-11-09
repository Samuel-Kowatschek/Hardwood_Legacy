// Stats-Overlay (Taste S / STATS-Button): alle Werte, Skills, Perks, Karriere.
import { C, text, tiny, box, bar } from '../gfx.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';
import { ovr } from '../systems/sim.js';
import { archetypeById } from '../data/archetypes.js';
import { perkById, activeSynergies } from '../data/perks.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

export class StatsScene {
  constructor(run) { this.run = run; this.t = 0; sfx.select(); }
  update(game) {
    if (this.t > 2 && (input.pressed('stats') || input.pressed('b') || input.pressed('a') || this.clickClose)) { sfx.back(); game.overlay = null; }
  }
  draw(ctx) {
    const run = this.run, p = run.p, team = run.teams[p.teamId];
    ctx.fillStyle = C.BG; ctx.fillRect(0, 0, 160, 144);
    input.region(0, 0, 160, 144, null, () => { this.clickClose = true; });
    box(ctx, 0, 0, 160, 144);
    drawSprite(ctx, p.look, team.colors, 6, 5, { frame: idleFrame(this.t), age: p.age });
    text(ctx, `${p.first[0]}. ${p.last}`.slice(0, 14), 25, 6, C.WHITE);
    tiny(ctx, t('stats.age', { a: p.age, pos: p.pos, arch: archetypeById(p.arch).name.toUpperCase() }), 25, 16);
    tiny(ctx, t('stats.team', { abbr: team.abbr, n: team.base }), 25, 23);
    text(ctx, String(ovr(p)), 154, 6, C.ORANGE, 'right');
    tiny(ctx, t('stat.ovr'), 154, 16, C.WHITE, 'right');
    // Kernwerte
    tiny(ctx, t('stats.core'), 6, 33, C.ORANGE);
    ['form', 'body', 'chem', 'fame'].forEach((k, i) => {
      const y = 40 + i * 7;
      tiny(ctx, t('stat.' + k), 6, y);
      bar(ctx, 34, y, 30, 5, p[k] / 100);
      tiny(ctx, String(Math.round(p[k])), 76, y, C.ORANGE, 'right');
    });
    // Skills
    tiny(ctx, t('stats.skills'), 84, 33, C.ORANGE);
    ['sho', 'pla', 'def', 'ath', 'clu'].forEach((k, i) => {
      const y = 40 + i * 7;
      tiny(ctx, t('stat.' + k), 84, y);
      bar(ctx, 112, y, 28, 5, p.skills[k] / 99);
      tiny(ctx, String(p.skills[k]), 154, y, C.ORANGE, 'right');
    });
    // Perks
    tiny(ctx, t('stats.perks'), 6, 77, C.ORANGE);
    const names = p.perks.map(id => perkById(id).name);
    const pl = names.length ? names.join(', ') : t('stats.none');
    tiny(ctx, pl.slice(0, 37), 6, 84); if (pl.length > 37) tiny(ctx, pl.slice(37, 74), 6, 90);
    const syn = activeSynergies(p.perks);
    if (syn.length) tiny(ctx, t('stats.synergy', { x: syn.map(s => s.name).join(', ') }).slice(0, 37), 6, 96, C.ORANGE);
    // Karriere
    const a = p.awards;
    tiny(ctx, t('stats.career'), 6, 104, C.ORANGE);
    tiny(ctx, t('stats.careerLine', { s: p.career.seasons, p: p.career.pts }), 6, 111);
    tiny(ctx, t('stats.awardsLine', { r: a.rings, m: a.mvp, f: a.fmvp, d: a.dpoy }), 6, 118);
    tiny(ctx, t('stats.awardsLine2', { a: a.allStar, s: a.scoring, y: a.roy }), 6, 125);
    tiny(ctx, t('stats.close'), 80, 134, C.WHITE, 'center');
  }
}

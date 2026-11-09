// Retire-Gamble: Score bleibt verdeckt. Sichtbar: Multiplikator jetzt, Trend, Risiko, Resume.
import { Scene } from './scene.js';
import { C, text, tiny, box, bar } from '../gfx.js';
import { header, Menu, TextBox, bigText } from '../ui.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';
import { BALANCE } from '../data/balance.js';
import { retireMultiplier } from '../systems/legacy.js';
import { ovr, injuryChance } from '../systems/sim.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

function projection(age) {
  if (age <= 22) return 3; if (age <= 26) return 2; if (age <= 29) return 0; if (age <= 32) return -2; return -3;
}

export class RetireScene extends Scene {
  constructor(run, forced) {
    super();
    this.run = run; this.forced = forced;
    this.rm = retireMultiplier(run);
    this.menu = new Menu([{ label: t('retire.retire') }, { label: t('retire.more') }], { rowH: 12, hint: false });
    this.menu.i = 1;
    this.box = forced ? new TextBox(forced) : null;
  }
  update() {
    if (this.box) { if (this.box.update()) { sfx.sad(); this.finish('retire'); } return; }
    const i = this.menu.update();
    if (i === 0) this.finish('retire');
    else if (i === 1) this.finish('continue');
  }
  draw(ctx) {
    const run = this.run, p = run.p, rm = this.rm;
    const last = run.log[run.log.length - 1];
    header(ctx, t('retire.title'), t('retire.season', { n: run.seasonNo, m: BALANCE.maxSeasons }));
    drawSprite(ctx, p.look, run.teams[p.teamId].colors, 6, 16, { frame: idleFrame(this.t), scale: 2, age: p.age });
    const x = 44, o = ovr(p), d = last ? o - last.ovr : 0, pr = projection(p.age);
    tiny(ctx, t('retire.age', { n: p.age }), x, 17);
    tiny(ctx, `${t('stat.ovr')} ${o}`, x, 25); tiny(ctx, t('retire.trend', { d: (d > 0 ? '+' : '') + d }), x + 40, 25, d < 0 ? C.ORANGE : C.WHITE);
    tiny(ctx, t('retire.body'), x, 33); bar(ctx, x + 32, 33, 50, 5, p.body / 100, p.body < 35 ? C.ORANGE : C.WHITE);
    const a = p.awards;
    tiny(ctx, t('retire.resume', { r: a.rings, m: a.mvp, f: a.fmvp }), x, 41);
    tiny(ctx, t('retire.resume2', { a: a.allStar, p: p.career.pts }), x, 49);
    tiny(ctx, t('retire.forecast', { d: (pr >= 0 ? '+' : '') + pr, i: Math.round(injuryChance(p) * 100) }), x, 57, C.ORANGE);

    box(ctx, 0, 66, 160, 46);
    tiny(ctx, t('retire.legacy') + ': ???', 80, 71, C.WHITE, 'center');
    tiny(ctx, t('retire.multNow'), 80, 79, C.WHITE, 'center');
    bigText(ctx, 'X' + rm.mult.toFixed(2), 80, 86, rm.mult > 1 ? C.ORANGE : C.WHITE, 2);
    const mp = rm.parts.map(([n, v]) => `${t('mult.' + n)} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`).join(' ');
    const warn = run.retire.weakStreak ? t('retire.warnNext', { p: Math.round(BALANCE.retire.overstayStep * (run.retire.weakStreak + 1) * 100) }) : t('retire.warn');
    tiny(ctx, (mp || warn).slice(0, 38), 80, 104, mp ? C.ORANGE : C.WHITE, 'center');

    if (this.box) this.box.draw(ctx, this.t);
    else {
      box(ctx, 0, 112, 160, 32);
      this.menu.draw(ctx, 8, 118);
    }
  }
}

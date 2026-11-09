import { Scene } from './scene.js';
import { C, text, tiny, box, cursor, bar } from '../gfx.js';
import { header } from '../ui.js';
import { input } from '../input.js';
import { RNG } from '../systems/rng.js';
import { save } from '../systems/save.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { drawSprite, idleFrame, rollLook } from '../sprites/spriteGen.js';
import { createRun } from '../systems/league.js';
import { playRun } from '../flow.js';

const SK = ['sho', 'pla', 'def', 'ath', 'clu'];

export class CreateScene extends Scene {
  constructor(seed, daily = false) { super(); this.seed = seed; this.daily = daily; this.noStats = true; }
  enter(game) {
    this.game = game;
    this.meta = save.meta();
    this.rerolls = 3;
    this.roll(0);
    this.locked = ARCHETYPES.map(a => !!a.unlock && !a.unlock.test(this.meta) && !this.meta.unlocked.includes(a.id));
    this.i = 0; this.arch = 0; this.msg = '';
  }
  roll(n) {
    const r = new RNG(this.seed).fork('create' + n);
    this.name = this.game.names.player(r);
    this.look = rollLook(r);
  }
  get rows() { return ARCHETYPES.length + 2; } // + REROLL + BACK
  update(game) {
    if (input.pressed('down')) { this.i = (this.i + 1) % this.rows; sfx.blip(); this.msg = ''; }
    if (input.pressed('up')) { this.i = (this.i + this.rows - 1) % this.rows; sfx.blip(); this.msg = ''; }
    if (this.i < ARCHETYPES.length) this.arch = this.i;
    if (input.pressed('b')) return this.back();
    const clicked = this.clickRow != null;
    if (clicked) { this.i = this.clickRow; this.clickRow = null; if (this.i < ARCHETYPES.length) this.arch = this.i; }
    if (!input.pressed('a') && !clicked) return;
    if (this.i === ARCHETYPES.length) {
      if (this.rerolls > 0) { this.rerolls--; this.roll(3 - this.rerolls); sfx.select(); } else sfx.back();
      return;
    }
    if (this.i === ARCHETYPES.length + 1) return this.back();
    if (this.locked[this.i]) { sfx.back(); this.msg = t('create.locked', { x: t('unlock.' + ARCHETYPES[this.i].unlock.key) }); return; }
    sfx.select();
    const run = createRun(this.seed, game.names, {
      archId: ARCHETYPES[this.i].id, look: this.look, name: { first: this.name.first, last: this.name.last }, hof: save.hof(),
    });
    run.daily = this.daily;
    playRun(game, run);
  }
  back() { sfx.back(); import('./title.js').then(m => this.game.set(new m.TitleScene())); }
  draw(ctx) {
    header(ctx, t('create.title'));
    const a = ARCHETYPES[this.arch], lk = this.locked[this.arch];
    box(ctx, 2, 15, 42, 54);
    drawSprite(ctx, this.look, ['#ffffff', '#f97316'], 7, 18, { frame: idleFrame(this.t), scale: 2 });
    const fits = s => s.length <= 13;
    if (fits(this.name.first)) text(ctx, this.name.first, 48, 16); else tiny(ctx, this.name.first, 48, 17);
    if (fits(this.name.last)) text(ctx, this.name.last, 48, 26, C.ORANGE); else tiny(ctx, this.name.last, 48, 27, C.ORANGE);
    tiny(ctx, t('create.pos', { p: lk ? '?' : a.pos }), 48, 37);
    tiny(ctx, lk ? (this.msg || t('create.locked', { x: t('unlock.' + a.unlock.key) })).slice(0, 27) : t('arch.' + a.id).slice(0, 27), 48, 45, lk ? C.ORANGE : C.WHITE);
    tiny(ctx, (this.daily ? t('create.daily', { s: this.seed }) : t('create.seed', { s: this.seed })), 48, 53, C.WHITE);
    tiny(ctx, t('create.start'), 48, 61, C.ORANGE);

    box(ctx, 0, 70, 160, 74);
    const labels = ARCHETYPES.map((ar, k) => (this.locked[k] ? '???' : ar.name))
      .concat([t('create.reroll', { n: this.rerolls }), t('create.back')]);
    labels.forEach((l, k) => {
      const y = 75 + k * 9;
      input.region(4, y - 1, 104, 9, () => { if (this.i !== k) { this.i = k; this.msg = ''; sfx.blip(); } }, () => { this.clickRow = k; });
      if (k === this.i) cursor(ctx, 6, y);
      const dis = (k < ARCHETYPES.length && this.locked[k]) || (k === ARCHETYPES.length && !this.rerolls);
      const col = dis ? C.DARK : k === this.i ? C.ORANGE : C.WHITE;
      if (k < ARCHETYPES.length) text(ctx, l, 13, y, col); else tiny(ctx, l, 13, y + 1, col);
    });
    SK.forEach((k, j) => {
      const y = 76 + j * 10;
      tiny(ctx, t('stat.' + k).slice(0, 6), 112, y);
      tiny(ctx, lk ? '?' : String(a.skills[k]), 156, y, C.ORANGE, 'right');
      bar(ctx, 112, y + 6, 44, 3, lk ? 0 : a.skills[k] / 90);
    });
  }
}

import { Scene } from './scene.js';
import { C, text, tiny, box, cursor, bar, upArrow, downArrow } from '../gfx.js';
import { header } from '../ui.js';
import { input } from '../input.js';
import { RNG } from '../systems/rng.js';
import { save } from '../systems/save.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { drawSprite, idleFrame, rollLook } from '../sprites/spriteGen.js';
import { TeamSelectScene } from './teamselect.js';

const SK = ['sho', 'pla', 'def', 'ath', 'clu'];
const VIS = 5; // sichtbare Archetypen (Liste scrollt)

export class CreateScene extends Scene {
  constructor(seed, daily = false) { super(); this.seed = seed; this.daily = daily; this.noStats = true; }
  enter(game) {
    this.game = game;
    if (this.name) return; // Rueckkehr aus der Teamwahl
    this.meta = save.meta();
    // Normale Runs: unbegrenzt neu wuerfeln, Daily Seed: 3x (fairer Vergleich)
    this.rerolls = this.daily ? 3 : Infinity;
    this.rollN = 0;
    this.roll();
    this.locked = ARCHETYPES.map(a => !!a.unlock && !a.unlock.test(this.meta) && !this.meta.unlocked.includes(a.id));
    this.i = 0; this.arch = 0; this.msg = ''; this.scroll = 0;
  }
  roll() {
    const r = new RNG(this.seed).fork('create' + this.rollN++);
    this.name = this.game.names.player(r);
    this.look = rollLook(r);
  }
  get N() { return ARCHETYPES.length; }
  get rows() { return this.N + 2; } // + REROLL + BACK
  update() {
    if (input.pressed('down')) { this.i = (this.i + 1) % this.rows; sfx.blip(); this.msg = ''; }
    if (input.pressed('up')) { this.i = (this.i + this.rows - 1) % this.rows; sfx.blip(); this.msg = ''; }
    if (input.pressed('b')) return this.back();
    const clicked = this.clickRow != null;
    if (clicked) { this.i = this.clickRow; this.clickRow = null; }
    if (this.i < this.N) {
      this.arch = this.i;
      if (this.i < this.scroll) this.scroll = this.i;
      if (this.i >= this.scroll + VIS) this.scroll = this.i - VIS + 1;
    }
    if (!input.pressed('a') && !clicked) return;
    if (this.i === this.N) {
      if (this.rerolls > 0) { this.rerolls--; this.roll(); sfx.select(); } else sfx.back();
      return;
    }
    if (this.i === this.N + 1) return this.back();
    if (this.locked[this.i]) { sfx.back(); this.msg = t('create.locked', { x: t('unlock.' + ARCHETYPES[this.i].unlock.key) }); return; }
    sfx.select();
    this.game.set(new TeamSelectScene(this, {
      seed: this.seed, daily: this.daily, archId: ARCHETYPES[this.i].id, look: this.look,
      name: { first: this.name.first, last: this.name.last },
    }));
  }
  back() { sfx.back(); import('./title.js').then(m => this.game.set(new m.TitleScene())); }
  draw(ctx) {
    header(ctx, t('create.title'), '', () => this.back());
    const a = ARCHETYPES[this.arch], lk = this.locked[this.arch];
    box(ctx, 2, 15, 42, 56);
    drawSprite(ctx, this.look, ['#ffffff', '#f97316'], 7, 19, { frame: idleFrame(this.t), scale: 2 });
    const fits = s => s.length <= 13;
    if (fits(this.name.first)) text(ctx, this.name.first, 48, 16); else tiny(ctx, this.name.first, 48, 17);
    if (fits(this.name.last)) text(ctx, this.name.last, 48, 26, C.ORANGE); else tiny(ctx, this.name.last, 48, 27, C.ORANGE);
    tiny(ctx, t('create.pos', { p: lk ? '?' : a.pos }), 48, 37);
    tiny(ctx, lk ? (this.msg || t('create.locked', { x: t('unlock.' + a.unlock.key) })).slice(0, 27) : t('arch.' + a.id).slice(0, 27), 48, 45, lk ? C.ORANGE : C.WHITE);
    tiny(ctx, (this.daily ? t('create.daily', { s: this.seed }) : t('create.seed', { s: this.seed })), 48, 53, C.WHITE);
    tiny(ctx, t('create.start'), 48, 61, C.ORANGE);

    box(ctx, 0, 72, 160, 72);
    // Archetypen (5 sichtbar, scrollbar)
    for (let v = 0; v < VIS; v++) {
      const k = this.scroll + v;
      if (k >= this.N) break;
      const y = 79 + v * 10;
      input.region(7, y - 2, 96, 10, () => { if (this.i !== k) { this.i = k; this.msg = ''; sfx.blip(); } }, () => { this.clickRow = k; });
      if (k === this.i) cursor(ctx, 8, y);
      const col = this.locked[k] ? C.DARK : k === this.i ? C.ORANGE : C.WHITE;
      text(ctx, this.locked[k] ? '???' : ARCHETYPES[k].name.slice(0, 12), 15, y, col);
    }
    if (this.scroll > 0) upArrow(ctx, 100, 76);
    if (this.scroll + VIS < this.N) downArrow(ctx, 97, 125, 0);
    // REROLL + BACK
    const rr = this.rerolls === Infinity ? t('create.rerollInf') : t('create.reroll', { n: this.rerolls });
    [[this.N, rr, 15, 44], [this.N + 1, t('create.back'), 62, 40]].forEach(([k, l, x, w]) => {
      const y = 131;
      input.region(x - 8, y - 2, w, 9, () => { if (this.i !== k) { this.i = k; sfx.blip(); } }, () => { this.clickRow = k; });
      if (k === this.i) cursor(ctx, x - 7, y - 1);
      const dis = k === this.N && !this.rerolls;
      tiny(ctx, l, x, y, dis ? C.DARK : k === this.i ? C.ORANGE : C.WHITE);
    });
    SK.forEach((k, j) => {
      const y = 79 + j * 11;
      tiny(ctx, t('stat.' + k).slice(0, 6), 113, y);
      tiny(ctx, lk ? '?' : String(a.skills[k]), 152, y, C.ORANGE, 'right');
      bar(ctx, 113, y + 6, 40, 3, lk ? 0 : a.skills[k] / 90);
    });
  }
}

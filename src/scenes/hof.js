import { Scene } from './scene.js';
import { C, text, tiny, box } from '../gfx.js';
import { header } from '../ui.js';
import { input } from '../input.js';
import { save } from '../systems/save.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

export class HofScene extends Scene {
  enter() { this.list = save.hof(); this.scroll = 0; }
  update(game) {
    if (input.pressed('down') && this.scroll < Math.max(0, this.list.length - 3)) { this.scroll++; sfx.blip(); }
    if (input.pressed('up') && this.scroll > 0) { this.scroll--; sfx.blip(); }
    if (input.pressed('b') || input.pressed('a') || this.backClick) {
      sfx.back();
      import('./title.js').then(m => game.set(new m.TitleScene()));
    }
  }
  draw(ctx) {
    header(ctx, t('hof.title'), `${this.list.length}/10`, () => { this.backClick = true; });
    if (!this.list.length) {
      box(ctx, 8, 40, 144, 50);
      text(ctx, t('hof.empty'), 80, 52, C.WHITE, 'center');
      tiny(ctx, t('hof.empty2'), 80, 68, C.WHITE, 'center');
      tiny(ctx, t('hof.empty3'), 80, 76, C.WHITE, 'center');
    }
    // 3 Eintraege pro Ansicht, mit Innenabstand zum Rahmen
    this.list.slice(this.scroll, this.scroll + 3).forEach((e, k) => {
      const i = this.scroll + k, y = 16 + k * 38;
      box(ctx, 2, y, 156, 36);
      if (e.look) drawSprite(ctx, e.look, e.colors || ['#888888', '#ffffff'], 9, y + 6, { frame: idleFrame(this.t + i * 9), age: e.age || 30 });
      text(ctx, `${i + 1}.`, 30, y + 7, C.ORANGE);
      tiny(ctx, `${e.first} ${e.last}`.slice(0, 20), 50, y + 8);
      tiny(ctx, String(e.tier || ''), 30, y + 17, C.WHITE);
      tiny(ctx, t('hof.line', { r: e.rings, a: e.arch || '', s: e.seed || '' }).slice(0, 29), 30, y + 25, C.WHITE);
      text(ctx, String(e.score), 150, y + 14, C.ORANGE, 'right');
    });
    tiny(ctx, this.list.length > 3 ? t('hof.scroll') : t('hof.back'), 80, 134, C.WHITE, 'center');
  }
}

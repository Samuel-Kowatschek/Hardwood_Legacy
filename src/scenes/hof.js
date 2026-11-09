import { Scene } from './scene.js';
import { C, text, tiny, box } from '../gfx.js';
import { header } from '../ui.js';
import { input } from '../input.js';
import { save } from '../systems/save.js';
import { sfx } from '../systems/audio.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

export class HofScene extends Scene {
  enter() { this.list = save.hof(); this.scroll = 0; this.meta = save.meta(); }
  update(game) {
    if (input.pressed('down') && this.scroll < Math.max(0, this.list.length - 4)) { this.scroll++; sfx.blip(); }
    if (input.pressed('up') && this.scroll > 0) { this.scroll--; sfx.blip(); }
    if (input.pressed('b') || input.pressed('a')) {
      sfx.back();
      import('./title.js').then(m => game.set(new m.TitleScene()));
    }
  }
  draw(ctx) {
    header(ctx, 'HALL OF FAME', `${this.list.length}/10`);
    if (!this.list.length) {
      box(ctx, 8, 40, 144, 50);
      text(ctx, 'NOCH LEER.', 80, 52, C.WHITE, 'center');
      tiny(ctx, 'BEENDE EINE KARRIERE,', 80, 68, C.WHITE, 'center');
      tiny(ctx, 'UM HIER ZU HAENGEN.', 80, 76, C.WHITE, 'center');
    }
    this.list.slice(this.scroll, this.scroll + 4).forEach((e, k) => {
      const i = this.scroll + k, y = 16 + k * 29;
      box(ctx, 2, y, 156, 28);
      if (e.look) drawSprite(ctx, e.look, e.colors || ['#888', '#fff'], 6, y + 2, { frame: idleFrame(this.t + i * 9), age: e.age || 30 });
      text(ctx, `${i + 1}.`, 24, y + 4, C.ORANGE);
      tiny(ctx, `${e.first} ${e.last}`.slice(0, 26), 44, y + 5);
      tiny(ctx, `${e.tier}`, 24, y + 13, C.WHITE);
      tiny(ctx, `RINGE ${e.rings}  ${e.arch || ''}  ${e.seed || ''}`, 24, y + 20, C.WHITE);
      text(ctx, String(e.score), 154, y + 10, C.ORANGE, 'right');
    });
    if (this.list.length > 4) tiny(ctx, 'HOCH/RUNTER', 80, 138, C.WHITE, 'center');
    else tiny(ctx, 'A/B ZURUECK', 80, 138, C.WHITE, 'center');
  }
}

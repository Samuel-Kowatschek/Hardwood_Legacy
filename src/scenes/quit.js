// Overlay waehrend eines Runs: zurueck ins Hauptmenue? (Spielstand liegt vom Season-Beginn vor)
import { C, text, tiny, box } from '../gfx.js';
import { Menu } from '../ui.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';

export class QuitScene {
  constructor(game) {
    this.game = game; this.t = 0;
    this.menu = new Menu([{ label: t('quit.yes') }, { label: t('quit.no') }], { rowH: 14, hint: false });
    this.menu.i = 1;
    sfx.select();
  }
  close() { this.game.overlay = null; sfx.back(); }
  update(game) {
    if (this.t > 2 && (input.pressed('b') || input.pressed('menu'))) return this.close();
    const i = this.menu.update();
    if (i === 1) return this.close();
    if (i === 0) {
      game.overlay = null;
      game.run = null;
      import('./title.js').then(m => game.set(new m.TitleScene()));
    }
  }
  draw(ctx) {
    const run = this.game.run;
    box(ctx, 14, 34, 132, 76);
    text(ctx, t('quit.title'), 80, 42, C.ORANGE, 'center');
    if (run) {
      tiny(ctx, t('quit.saved1'), 80, 56, C.WHITE, 'center');
      tiny(ctx, t('quit.saved2', { s: run.seasonNo }), 80, 63, C.WHITE, 'center');
    }
    this.menu.draw(ctx, 40, 78, 80);
  }
}

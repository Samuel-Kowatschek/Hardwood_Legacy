// Hilfe-Seiten: alle Mechaniken und das Spielprinzip.
import { Scene } from './scene.js';
import { C, text, tiny, box, wrap, tinyNorm } from '../gfx.js';
import { header } from '../ui.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';

export class HelpScene extends Scene {
  constructor(back = null) { super(); this.backScene = back; this.page = 0; this.noStats = true; }
  enter(game) { this.game = game; }
  update() {
    const pages = t('help.pages');
    if (input.pressed('right') || input.pressed('down') || input.pressed('a')) {
      if (this.page < pages.length - 1) { this.page++; sfx.blip(); } else if (input.pressed('a')) this.close();
    }
    if (input.pressed('left') || input.pressed('up')) { if (this.page > 0) { this.page--; sfx.blip(); } }
    if (input.pressed('b')) this.close();
  }
  close() {
    sfx.back();
    if (this.backScene) this.game.set(this.backScene, 'none');
    else import('./title.js').then(m => this.game.set(new m.TitleScene()));
  }
  draw(ctx) {
    const pages = t('help.pages');
    const pg = pages[this.page];
    header(ctx, t('help.title'), `${this.page + 1}/${pages.length}`);
    box(ctx, 0, 14, 160, 118);
    text(ctx, pg.t.slice(0, 18), 7, 20, C.ORANGE);
    const lines = wrap(tinyNorm(t('help.pages.' + this.page + '.b')), 37);
    lines.slice(0, 15).forEach((ln, i) => tiny(ctx, ln, 7, 32 + i * 6.5 | 0, C.WHITE));
    tiny(ctx, t('help.nav'), 80, 136, C.WHITE, 'center');
  }
}

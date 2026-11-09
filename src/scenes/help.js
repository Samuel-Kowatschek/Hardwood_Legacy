// Hilfe-Seiten: alle Mechaniken und das Spielprinzip.
// Als Szene (Menue "How to play") oder als Popup-Overlay beim Laden der Seite (popup = true).
import { Scene } from './scene.js';
import { C, text, tiny, box, wrap, tinyNorm } from '../gfx.js';
import { header } from '../ui.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';

export class HelpScene extends Scene {
  constructor({ popup = false, game = null } = {}) { super(); this.popup = popup; this.game = game; this.page = 0; this.noStats = true; }
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
    if (this.popup) { this.game.overlay = null; return; }
    import('./title.js').then(m => this.game.set(new m.TitleScene()));
  }
  draw(ctx) {
    const pages = t('help.pages');
    const pg = pages[this.page];
    if (this.popup) {
      // Popup-Fenster ueber dem Titelbild
      ctx.fillStyle = C.BG; ctx.fillRect(0, 0, 160, 144);
      box(ctx, 2, 2, 156, 140);
      tiny(ctx, t('help.title'), 9, 8, C.ORANGE);
      tiny(ctx, `${this.page + 1}/${pages.length}`, 151, 8, C.WHITE, 'right');
      ctx.fillStyle = C.WHITE; ctx.fillRect(8, 15, 144, 1);
    } else {
      header(ctx, t('help.title'), `${this.page + 1}/${pages.length}`);
      box(ctx, 0, 14, 160, 118);
    }
    const y0 = this.popup ? 19 : 20;
    text(ctx, pg.t.slice(0, 17), 9, y0, C.ORANGE);
    const lines = wrap(tinyNorm(t('help.pages.' + this.page + '.b')), 35);
    lines.slice(0, 15).forEach((ln, i) => tiny(ctx, ln, 9, (y0 + 12 + i * 6.5) | 0, C.WHITE));
    const nav = this.popup ? t('help.navPopup') : t('help.nav');
    tiny(ctx, nav, 80, this.popup ? 133 : 136, this.popup ? C.ORANGE : C.WHITE, 'center');
  }
}

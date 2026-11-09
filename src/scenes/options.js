// Optionen: Sprache, Farbschema, Ton.
import { Scene } from './scene.js';
import { C, text, tiny, box, cursor, SCHEME_LIST, SCHEMES, setScheme } from '../gfx.js';
import { header } from '../ui.js';
import { input } from '../input.js';
import { save } from '../systems/save.js';
import { sfx, isMuted } from '../systems/audio.js';
import { t, LANG_LIST, setLang, lang } from '../i18n/index.js';

export class OptionsScene extends Scene {
  enter(game) { this.game = game; this.i = 0; }
  rows() {
    const s = save.settings();
    return [
      { id: 'lang', label: t('options.lang'), value: t('langName.' + lang()) },
      { id: 'scheme', label: t('options.colors'), value: t('options.schemes.' + (SCHEMES[s.scheme] ? s.scheme : 'classic')) },
      { id: 'sound', label: t('options.sound'), value: isMuted() ? t('options.off') : t('options.on') },
      { id: 'back', label: t('options.back') },
    ];
  }
  change(id, dir) {
    const s = save.settings();
    if (id === 'lang') {
      const l = LANG_LIST[(LANG_LIST.indexOf(lang()) + dir + LANG_LIST.length) % LANG_LIST.length];
      setLang(l); save.setSettings({ ...s, lang: l });
    } else if (id === 'scheme') {
      const cur = SCHEMES[s.scheme] ? s.scheme : 'classic';
      const n = SCHEME_LIST[(SCHEME_LIST.indexOf(cur) + dir + SCHEME_LIST.length) % SCHEME_LIST.length];
      setScheme(n); save.setSettings({ ...s, scheme: n });
    } else if (id === 'sound') this.game.toggleMute();
    sfx.select();
  }
  back() { sfx.back(); import('./title.js').then(m => this.game.set(new m.TitleScene())); }
  update() {
    const rows = this.rows();
    if (input.pressed('down')) { this.i = (this.i + 1) % rows.length; sfx.blip(); }
    if (input.pressed('up')) { this.i = (this.i + rows.length - 1) % rows.length; sfx.blip(); }
    const id = rows[this.i].id;
    if (input.pressed('b')) return this.back();
    if (id === 'back') { if (input.pressed('a')) this.back(); return; }
    if (input.pressed('a') || input.pressed('right')) this.change(id, 1);
    else if (input.pressed('left')) this.change(id, -1);
  }
  draw(ctx) {
    header(ctx, t('options.title'));
    box(ctx, 4, 20, 152, 92);
    this.rows().forEach((r, k) => {
      const y = 30 + k * 20;
      if (k === this.i) cursor(ctx, 10, y);
      text(ctx, r.label, 18, y, k === this.i ? C.ORANGE : C.WHITE);
      if (r.value) tiny(ctx, `< ${r.value} >`, 18, y + 10, C.WHITE);
    });
    tiny(ctx, t('options.hint'), 80, 130, C.WHITE, 'center');
  }
}

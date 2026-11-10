// Optionen: Sprache, Farbschema, Ton.
import { Scene } from './scene.js';
import { C, text, tiny, box, cursor, SCHEME_LIST, SCHEMES, setScheme } from '../gfx.js';
import { header } from '../ui.js';
import { input } from '../input.js';
import { save } from '../systems/save.js';
import { sfx, isMuted } from '../systems/audio.js';
import { t, LANG_LIST, setLang, lang } from '../i18n/index.js';

export class OptionsScene extends Scene {
  // overlay = true: waehrend eines Runs ueber der laufenden Szene (Taste O / OPTIONS-Button)
  constructor({ overlay = false, game = null } = {}) { super(); this.overlay = overlay; this.game = game; this.i = 0; this.noStats = true; }
  enter(game) { this.game = game; this.i = 0; }
  rows() {
    const s = save.settings();
    return [
      { id: 'lang', label: t('options.lang'), value: t('langName.' + lang()) },
      { id: 'scheme', label: t('options.colors'), value: t('options.schemes.' + (SCHEMES[s.scheme] ? s.scheme : 'classic')) },
      { id: 'sound', label: t('options.sound'), value: isMuted() ? t('options.off') : t('options.on') },
      ...(this.overlay && this.game?.run ? [{ id: 'savequit', label: t('options.saveQuit') }] : []),
      { id: 'back', label: t('options.back') },
    ];
  }
  change(id, dir) {
    const s = save.settings();
    if (id === 'lang') {
      const l = LANG_LIST[(LANG_LIST.indexOf(lang()) + dir + LANG_LIST.length) % LANG_LIST.length];
      setLang(l); save.setSettings({ ...s, lang: l });
      window.dispatchEvent(new Event('langchange'));
    } else if (id === 'scheme') {
      const cur = SCHEMES[s.scheme] ? s.scheme : 'classic';
      const n = SCHEME_LIST[(SCHEME_LIST.indexOf(cur) + dir + SCHEME_LIST.length) % SCHEME_LIST.length];
      setScheme(n); save.setSettings({ ...s, scheme: n });
    } else if (id === 'sound') this.game.toggleMute();
    sfx.select();
  }
  // Spielstand liegt bereits (Autosave zu Beginn der Season) -> zurueck ins Hauptmenue
  saveQuit() {
    sfx.select();
    this.game.overlay = null;
    this.game.run = null;
    import('./title.js').then(m => this.game.set(new m.TitleScene()));
  }
  back() {
    sfx.back();
    if (this.overlay) { this.game.overlay = null; return; }
    import('./title.js').then(m => this.game.set(new m.TitleScene()));
  }
  update() {
    const rows = this.rows();
    if (this.backClick) { this.backClick = false; return this.back(); }
    if (this.clickRow != null) {
      const k = this.clickRow; this.clickRow = null; this.i = k;
      if (rows[k].id === 'back') return this.back();
      if (rows[k].id === 'savequit') return this.saveQuit();
      this.change(rows[k].id, 1);
      return;
    }
    if (input.pressed('down')) { this.i = (this.i + 1) % rows.length; sfx.blip(); }
    if (input.pressed('up')) { this.i = (this.i + rows.length - 1) % rows.length; sfx.blip(); }
    const id = rows[this.i].id;
    if (input.pressed('b')) return this.back();
    if (id === 'back') { if (input.pressed('a')) this.back(); return; }
    if (id === 'savequit') { if (input.pressed('a')) this.saveQuit(); return; }
    if (input.pressed('a') || input.pressed('right')) this.change(id, 1);
    else if (input.pressed('left')) this.change(id, -1);
  }
  draw(ctx) {
    if (this.overlay) { ctx.fillStyle = C.BG; ctx.fillRect(0, 0, 160, 144); }
    header(ctx, t('options.title'), '', () => { this.backClick = true; });
    const rows = this.rows(), rh = rows.length > 4 ? 19 : 20;
    box(ctx, 4, 18, 152, rows.length * rh + 12);
    rows.forEach((r, k) => {
      const y = 27 + k * rh;
      input.region(8, y - 3, 144, rh, () => { if (this.i !== k) { this.i = k; sfx.blip(); } }, () => { this.clickRow = k; });
      if (k === this.i) cursor(ctx, 10, y);
      text(ctx, r.label, 18, y, k === this.i ? C.ORANGE : C.WHITE);
      if (r.value) tiny(ctx, `< ${r.value} >`, 18, y + 10, C.WHITE);
    });
    if (rows.some(r => r.id === 'savequit')) tiny(ctx, t('options.saveNote', { s: this.game.run.seasonNo }), 80, 128, C.ORANGE, 'center');
    tiny(ctx, t('options.hint'), 80, 136, C.WHITE, 'center');
  }
}

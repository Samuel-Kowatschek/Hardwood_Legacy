// Entscheidungs-/Event-Karte: Text (Typewriter) -> 2-3 Optionen mit Hinweis -> Ergebnis.
import { Scene } from './scene.js';
import { C, text, tiny, box, downArrow } from '../gfx.js';
import { Typewriter, Menu, drawStatus } from '../ui.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';
import { cardText, hintFor, applyOption } from '../data/cards.js';

export class CardScene extends Scene {
  constructor(run, card, phase) { super(); this.run = run; this.card = card; this.phase0 = phase; }
  enter() {
    if (this.tw) return;
    this.tw = new Typewriter(cardText(this.run, this.card), 17, 4);
    const labels = t(`cards.${this.card.id}.o`);
    this.menu = new Menu(this.card.opts.map((o, i) => ({ label: labels[i], hint: hintFor(o) })), { rowH: 16 });
    this.phase = 'text';
  }
  update() {
    if (this.phase === 'text') {
      if (this.tw.update(false)) this.phase = 'choose';
    } else if (this.phase === 'choose') {
      const i = this.menu.update();
      if (i !== null) {
        this.res = new Typewriter(applyOption(this.run, this.card, i), 17, 4);
        this.run.cur.events.push(this.card.id);
        this.phase = 'result';
        sfx.hit();
      }
    } else if (this.res.update()) this.finish();
  }
  draw(ctx) {
    drawStatus(ctx, this.run, this.t, t('status.' + this.phase0));
    box(ctx, 0, 31, 160, 58);
    text(ctx, t(`cards.${this.card.id}.t`).slice(0, 17), 10, 37, C.ORANGE);
    this.tw.draw(ctx, 10, 48, 9);
    box(ctx, 0, 88, 160, 56);
    if (this.phase === 'choose') this.menu.draw(ctx, 8, 94);
    else if (this.phase === 'result') {
      if (this.res.draw(ctx, 10, 96, 10, C.WHITE)) downArrow(ctx, 146, 134, this.t);
    }
  }
}

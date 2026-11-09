// Entscheidungs-/Event-Karte: Text (Typewriter) -> 2-3 Optionen mit Risiko-Hinweis -> Ergebnis.
import { Scene } from './scene.js';
import { C, text, tiny, box, downArrow } from '../gfx.js';
import { Typewriter, Menu, drawStatus } from '../ui.js';
import { sfx } from '../systems/audio.js';

export class CardScene extends Scene {
  constructor(run, card, kind) { super(); this.run = run; this.card = card; this.kind = kind; }
  enter() {
    this.tw = new Typewriter(this.card.text(this.run), 18, 4);
    this.menu = new Menu(this.card.options.map(o => ({ label: o.label, hint: o.hint })), { rowH: 16 });
    this.phase = 'text';
  }
  update() {
    if (this.phase === 'text') {
      if (this.tw.update(false)) this.phase = 'choose';
    } else if (this.phase === 'choose') {
      const i = this.menu.update();
      if (i !== null) {
        const opt = this.card.options[i];
        const res = opt.apply(this.run) || 'Nichts passiert.';
        this.run.cur.events.push(`${this.card.title}: ${opt.label}`);
        this.res = new Typewriter(res, 18, 4);
        this.phase = 'result';
        sfx.hit();
      }
    } else if (this.res.update()) this.finish();
  }
  draw(ctx) {
    const run = this.run;
    drawStatus(ctx, run, this.t);
    box(ctx, 0, 31, 160, 58);
    tiny(ctx, this.kind, 66, 10, C.ORANGE);
    text(ctx, this.card.title.slice(0, 18), 8, 37, C.ORANGE);
    this.tw.draw(ctx, 8, 48, 9);
    box(ctx, 0, 88, 160, 56);
    if (this.phase === 'choose') this.menu.draw(ctx, 6, 94);
    else if (this.phase === 'result') {
      if (this.res.draw(ctx, 8, 96, 10, C.WHITE)) downArrow(ctx, 146, 134, this.t);
    }
  }
}

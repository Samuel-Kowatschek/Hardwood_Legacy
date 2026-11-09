// Ticker-Szene (Playoffs): Zeilen erscheinen nacheinander, Meldungen in der Textbox. Wird vom Flow gesteuert.
import { Scene } from './scene.js';
import { C, text, tiny } from '../gfx.js';
import { header, TextBox } from '../ui.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

export class LogScene extends Scene {
  constructor(run, title, right = '') {
    super();
    this.run = run; this.title = title; this.right = right;
    this.lines = []; this.box = null; this.wait = null;
  }
  line(str, color = C.WHITE) {
    this.lines.push({ str, color });
    sfx.blip();
    return new Promise(res => { this.wait = { n: 28, res }; });
  }
  msg(str) {
    this.box = new TextBox(str);
    return new Promise(res => { this.boxRes = res; });
  }
  update() {
    if (this.box) {
      if (this.box.update()) { const r = this.boxRes; this.box = null; this.boxRes = null; r?.(); }
    } else if (this.wait) {
      this.wait.n--;
      if (this.wait.n <= 0 || input.pressed('a')) { const r = this.wait.res; this.wait = null; r(); }
    }
  }
  draw(ctx) {
    header(ctx, this.title, this.right);
    const p = this.run.p;
    const shown = this.lines.slice(-7);
    shown.forEach((l, i) => text(ctx, l.str.slice(0, 19), 2, 17 + i * 11, l.color));
    if (!this.box) drawSprite(ctx, p.look, this.run.teams[p.teamId].colors, 140, 112, { frame: idleFrame(this.t), age: p.age });
    else this.box.draw(ctx, this.t);
  }
}

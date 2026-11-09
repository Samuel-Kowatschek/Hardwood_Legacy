// Generische Szene: optionaler Bild-Callback oben + Typewriter-Textbox unten.
import { Scene } from './scene.js';
import { TextBox } from '../ui.js';

export class MessageScene extends Scene {
  constructor(str, drawTop = null, { auto = 0 } = {}) {
    super();
    this.box = new TextBox(str);
    this.drawTop = drawTop;
    this.auto = auto;
  }
  update() {
    if (this.box.update()) this.finish();
  }
  draw(ctx, game) {
    this.drawTop?.(ctx, this.t, game);
    this.box.draw(ctx, this.t);
  }
}

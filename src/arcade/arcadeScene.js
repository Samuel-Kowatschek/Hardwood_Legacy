// Arcade-Moment (Key Game): Intro -> Minispiel (5-15 Sek.) -> Ergebnis. Liefert Qualitaet 0..1 an den Flow.
import { Scene } from '../scenes/scene.js';
import { TextBox } from '../ui.js';
import { C, tiny } from '../gfx.js';
import { playMusic } from '../systems/audio.js';
import { drawBattle } from './common.js';
import { ShotMeter } from './shotMeter.js';
import { Clutch } from './clutch.js';
import { FastBreak } from './fastBreak.js';
import { DefenseStop } from './defenseStop.js';

const GAMES = { shot: ShotMeter, clutch: Clutch, fast: FastBreak, defense: DefenseStop };
const INTRO = {
  shot: 'SHOT-METER! Druecke A, wenn der Marker in der orangen Zone ist. 3 Wuerfe.',
  clutch: 'BUZZER-BEATER! Ein Wurf. Triff die Zone, bevor die Uhr ablaeuft. Achtung, Fakes!',
  fast: 'FAST-BREAK! Haemmere A fuer Tempo, dann A in der Mitte fuer den Dunk!',
  defense: 'DEFENSE-STOP! Druecke die Richtung, bevor der Kreis zu ist. Spaet = Steal!',
};

export class ArcadeScene extends Scene {
  constructor(run, opts) {
    super();
    this.run = run;
    this.opts = { scoreLine: [98, 99], situation: '', pressure: 0.2, ...opts };
    this.phase = 'intro';
  }
  enter() {
    playMusic('arcade');
    const o = this.opts;
    this.box = new TextBox(`${o.title}! ${INTRO[o.kind]}`);
  }
  update() {
    if (this.phase === 'intro') {
      if (this.box.update()) { this.phase = 'play'; this.game = new GAMES[this.opts.kind](this); }
    } else if (this.phase === 'play') {
      this.game.update();
      if (this.game.done) { this.phase = 'result'; this.box = new TextBox(this.game.resultText); }
    } else if (this.box.update()) this.finish(this.game.q);
  }
  draw(ctx) {
    if (this.phase === 'intro') {
      drawBattle(ctx, this, this.t, { showHoop: this.opts.kind !== 'defense' });
      tiny(ctx, this.opts.title, 6, 32, C.ORANGE);
      this.box.draw(ctx, this.t);
      return;
    }
    this.game.draw(ctx, this.t);
    if (this.phase === 'result') this.box.draw(ctx, this.t);
  }
}

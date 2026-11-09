import { Scene } from './scene.js';
import { C, text, tiny, box, cursor, bar } from '../gfx.js';
import { header } from '../ui.js';
import { input } from '../input.js';
import { RNG } from '../systems/rng.js';
import { save } from '../systems/save.js';
import { sfx } from '../systems/audio.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { drawSprite, idleFrame, rollLook } from '../sprites/spriteGen.js';
import { createRun } from '../systems/league.js';
import { playRun } from '../flow.js';

const SK = [['sho', 'WURF'], ['pla', 'PLAY'], ['def', 'DEF'], ['ath', 'ATH'], ['clu', 'CLUTCH']];

export class CreateScene extends Scene {
  constructor(seed, daily = false) { super(); this.seed = seed; this.daily = daily; }
  enter(game) {
    this.game = game;
    this.meta = save.meta();
    this.rerolls = 3;
    this.roll(0);
    this.locked = ARCHETYPES.map(a => !!a.unlock && !a.unlock.test(this.meta) && !this.meta.unlocked.includes(a.id));
    this.i = 0;
    this.msg = '';
  }
  roll(n) {
    const r = new RNG(this.seed).fork('create' + n);
    this.name = this.game.names.player(r);
    this.look = rollLook(r);
  }
  update(game) {
    const n = ARCHETYPES.length;
    if (input.pressed('down')) { this.i = (this.i + 1) % n; sfx.blip(); }
    if (input.pressed('up')) { this.i = (this.i + n - 1) % n; sfx.blip(); }
    if (input.pressed('b')) {
      if (this.rerolls > 0) { this.rerolls--; this.roll(3 - this.rerolls); sfx.select(); }
      else sfx.back();
    }
    if (input.pressed('a')) {
      if (this.locked[this.i]) { sfx.back(); this.msg = 'GESPERRT: ' + ARCHETYPES[this.i].unlock.text; return; }
      sfx.select();
      const run = createRun(this.seed, game.names, {
        archId: ARCHETYPES[this.i].id, look: this.look, name: { first: this.name.first, last: this.name.last }, hof: save.hof(),
      });
      run.daily = this.daily;
      playRun(game, run);
    }
  }
  draw(ctx) {
    header(ctx, 'NEUER SPIELER', (this.daily ? 'DAILY ' : 'SEED ') + this.seed);
    const a = ARCHETYPES[this.i];
    box(ctx, 2, 15, 42, 56);
    drawSprite(ctx, this.look, ['#ffffff', '#f97316'], 7, 19, { frame: idleFrame(this.t), scale: 2 });
    const fits = s => s.length <= 13;
    if (fits(this.name.first)) text(ctx, this.name.first, 48, 17); else tiny(ctx, this.name.first, 48, 18);
    if (fits(this.name.last)) text(ctx, this.name.last, 48, 28, C.ORANGE); else tiny(ctx, this.name.last, 48, 29, C.ORANGE);
    tiny(ctx, `POSITION ${this.locked[this.i] ? '?' : a.pos}`, 48, 41);
    tiny(ctx, `B = REROLL (${this.rerolls})`, 48, 49, this.rerolls ? C.WHITE : C.DARK);
    tiny(ctx, 'A = DRAFT STARTEN', 48, 57, C.ORANGE);
    tiny(ctx, 'ARCHETYP:', 48, 65);

    box(ctx, 0, 73, 160, 63);
    ARCHETYPES.forEach((ar, k) => {
      const y = 79 + k * 10;
      if (k === this.i) cursor(ctx, 6, y);
      text(ctx, this.locked[k] ? '???' : ar.name, 13, y, this.locked[k] ? C.DARK : k === this.i ? C.ORANGE : C.WHITE);
    });
    // Skills des gewaehlten Archetyps
    SK.forEach(([k, l], j) => {
      const y = 79 + j * 10;
      tiny(ctx, l, 113, y + 1);
      bar(ctx, 138, y, 18, 6, this.locked[this.i] ? 0 : a.skills[k] / 90);
    });
    const desc = this.msg && this.locked[this.i] ? this.msg : this.locked[this.i] ? 'NOCH GESPERRT' : a.desc;
    tiny(ctx, desc, 80, 138, this.locked[this.i] ? C.ORANGE : C.WHITE, 'center');
  }
}

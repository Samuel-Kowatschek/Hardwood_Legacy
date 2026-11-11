// Daily Seed: Archetyp, Stats und Draft sind durch den Tages-Seed fest (fuer alle gleich, keine Rerolls).
// Nur Name und Aussehen duerfen geaendert werden (rein kosmetisch). Pro Tag nur ein Versuch.
import { Scene } from './scene.js';
import { C, text, tiny, box, cursor, bar } from '../gfx.js';
import { header } from '../ui.js';
import { input } from '../input.js';
import { RNG } from '../systems/rng.js';
import { save } from '../systems/save.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { drawSprite, idleFrame, rollLook } from '../sprites/spriteGen.js';
import { createRun } from '../systems/league.js';
import { ovr } from '../systems/sim.js';
import { playRun } from '../flow.js';
import { openNameInput } from '../helpModal.js';

const SK = ['sho', 'pla', 'def', 'ath', 'clu'];

export function dailyArchetype(seed) { return new RNG(seed).fork('dailyarch').pick(ARCHETYPES).id; }
export function dailyDone(seed) { return save.meta().dailyDone === seed; }
// Tag als gespielt markieren (beim Start des Runs)
export function markDaily(seed) { const m = save.meta(); m.dailyDone = seed; save.setMeta(m); }

export class DailyCreateScene extends Scene {
  constructor(seed) { super(); this.seed = seed; this.noStats = true; }
  enter(game) {
    this.game = game;
    if (this.preview) return;
    this.archId = dailyArchetype(this.seed);
    const r = new RNG(this.seed).fork('create0');
    this.name = game.names.player(r);
    this.look = rollLook(r);
    this.lookN = 1;
    // Vorschau: genau der Spieler, der im Run entsteht (Name/Look beeinflussen den Zufall nicht)
    this.preview = this.build().p;
    this.i = 0;
  }
  build() {
    return createRun(this.seed, this.game.names, { archId: this.archId, look: this.look, name: { first: this.name.first, last: this.name.last }, hof: [] });
  }
  get rows() { return 4; } // START, AUSSEHEN, NAME, ZURUECK
  act(k) {
    if (k === 0) {
      sfx.select();
      const run = this.build();
      run.daily = true;
      markDaily(this.seed);
      playRun(this.game, run);
    } else if (k === 1) {
      sfx.select();
      this.look = rollLook(new RNG(this.seed).fork('look' + this.lookN++));
    } else if (k === 2) {
      sfx.select();
      openNameInput(this.name, nm => { this.name = nm; });
    } else this.back();
  }
  back() { sfx.back(); import('./title.js').then(m => this.game.set(new m.TitleScene())); }
  update() {
    if (input.pressed('down')) { this.i = (this.i + 1) % this.rows; sfx.blip(); }
    if (input.pressed('up')) { this.i = (this.i + this.rows - 1) % this.rows; sfx.blip(); }
    if (input.pressed('b')) return this.back();
    if (this.clickRow != null) { this.i = this.clickRow; this.clickRow = null; return this.act(this.i); }
    if (input.pressed('a')) this.act(this.i);
  }
  draw(ctx) {
    header(ctx, t('daily.title'), '', () => this.back());
    const a = ARCHETYPES.find(x => x.id === this.archId), p = this.preview;
    box(ctx, 2, 15, 42, 56);
    drawSprite(ctx, this.look, ['#ffffff', '#f97316'], 7, 19, { frame: idleFrame(this.t), scale: 2 });
    const fits = s => s.length <= 13;
    if (fits(this.name.first)) text(ctx, this.name.first, 48, 16); else tiny(ctx, this.name.first, 48, 17);
    if (fits(this.name.last)) text(ctx, this.name.last, 48, 26, C.ORANGE); else tiny(ctx, this.name.last, 48, 27, C.ORANGE);
    tiny(ctx, `${a.name.toUpperCase()}  ${a.pos}`.slice(0, 27), 48, 37, C.ORANGE);
    tiny(ctx, t('daily.pick', { n: p.draftPick, o: ovr(p) }), 48, 45);
    tiny(ctx, t('create.daily', { s: this.seed }), 48, 53);
    tiny(ctx, t('daily.fixed'), 48, 61, C.ORANGE);

    box(ctx, 0, 72, 160, 72);
    const labels = [t('daily.start'), t('daily.look'), t('daily.name'), t('create.back')];
    labels.forEach((l, k) => {
      const y = 80 + k * 14;
      input.region(6, y - 3, 98, 13, () => { if (this.i !== k) { this.i = k; sfx.blip(); } }, () => { this.clickRow = k; });
      if (k === this.i) cursor(ctx, 8, y);
      text(ctx, l, 16, y, k === this.i ? C.ORANGE : C.WHITE);
    });
    SK.forEach((k, j) => {
      const y = 79 + j * 11;
      tiny(ctx, t('stat.' + k).slice(0, 6), 113, y);
      tiny(ctx, String(p.skills[k]), 152, y, C.ORANGE, 'right');
      bar(ctx, 113, y + 6, 40, 3, p.skills[k] / 90);
    });
  }
}

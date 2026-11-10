// Trainingsmodus: alle Minigames frei waehlbar, mit einem zufaellig generierten Spieler (Stats sichtbar).
import { Scene } from './scene.js';
import { C, text, tiny, box, cursor, bar } from '../gfx.js';
import { header } from '../ui.js';
import { input } from '../input.js';
import { sfx, playMusic } from '../systems/audio.js';
import { RNG, randomSeedString } from '../systems/rng.js';
import { t } from '../i18n/index.js';
import { ARCHETYPES } from '../data/archetypes.js';
import { arcadeMods } from '../data/perks.js';
import { createRun } from '../systems/league.js';
import { freshSeason, ovr } from '../systems/sim.js';
import { drawSprite, idleFrame, rollLook } from '../sprites/spriteGen.js';
import { ArcadeScene, ARCADE_KINDS } from '../arcade/arcadeScene.js';

const SK = ['sho', 'pla', 'def', 'ath', 'clu'];

export class PracticeScene extends Scene {
  constructor() { super(); this.i = 0; this.last = null; this.run = null; this.noStats = true; }
  enter(game) {
    this.game = game;
    game.run = null;
    playMusic('title');
    if (!this.run) this.roll();
  }
  // Zufaelliger Trainingsspieler mit zufaelligen Skills
  roll() {
    const seed = 'P' + randomSeedString();
    const rng = new RNG(seed);
    const arch = rng.pick(ARCHETYPES);
    const run = createRun(seed, this.game.names, { archId: arch.id, look: rollLook(rng), name: this.game.names.player(rng) });
    for (const k of SK) run.p.skills[k] = rng.int(35, 92);
    run.p.form = rng.int(50, 88);
    run.cur = freshSeason();
    this.run = run;
  }
  get rows() { return [...ARCADE_KINDS, 'reroll', 'back']; }
  back() { sfx.back(); import('./title.js').then(m => this.game.set(new m.TitleScene())); }
  async play(kind) {
    const run = this.run, rng = run.rng;
    const opp = rng.pick(run.teams.filter(x => x.id !== run.p.teamId));
    const a = rng.int(90, 104);
    const q = await this.game.show(new ArcadeScene(run, {
      kind, title: t('arcade.names.' + kind), opp, pressure: 0.2, situation: t('practice.situation'),
      scoreLine: [a, a + rng.int(-2, 2)], mods: arcadeMods(run.p.perks),
    }), 'flash');
    this.last = { kind, q };
    this.game.set(this, 'wipe');
  }
  activate(k) {
    const id = this.rows[k];
    if (id === 'back') return this.back();
    if (id === 'reroll') { sfx.select(); this.roll(); return; }
    sfx.select();
    this.play(id);
  }
  update() {
    const n = this.rows.length;
    if (input.pressed('down')) { this.i = (this.i + 1) % n; sfx.blip(); }
    if (input.pressed('up')) { this.i = (this.i + n - 1) % n; sfx.blip(); }
    if (input.pressed('b')) return this.back();
    if (this.clickRow != null) { this.i = this.clickRow; this.clickRow = null; return this.activate(this.i); }
    if (input.pressed('a')) this.activate(this.i);
  }
  draw(ctx) {
    header(ctx, t('practice.title'), '', () => { this.clickRow = this.rows.length - 1; });
    // Liste links (alle Namen in normaler Schrift), Trainingsspieler rechts
    box(ctx, 0, 14, 121, 130);
    this.rows.forEach((id, k) => {
      const y = 21 + k * 11 + (k >= ARCADE_KINDS.length ? 4 : 0);
      input.region(3, y - 2, 116, 11, () => { if (this.i !== k) { this.i = k; sfx.blip(); } }, () => { this.clickRow = k; });
      if (k === this.i) cursor(ctx, 5, y);
      const label = id === 'reroll' ? t('practice.reroll') : id === 'back' ? t('options.back') : t('arcade.names.' + id);
      const col = k === this.i ? C.ORANGE : C.WHITE;
      if (k < ARCADE_KINDS.length) text(ctx, label.slice(0, 13), 13, y, col); else tiny(ctx, label, 13, y + 1, col);
    });
    const p = this.run.p, team = this.run.teams[p.teamId];
    box(ctx, 121, 14, 39, 130);
    drawSprite(ctx, p.look, team.colors, 132, 20, { frame: idleFrame(this.t) });
    tiny(ctx, p.last.toUpperCase().slice(0, 8), 140, 47, C.WHITE, 'center');
    tiny(ctx, ARCHETYPES.find(a => a.id === p.arch).name.toUpperCase().slice(0, 8), 140, 54, C.ORANGE, 'center');
    tiny(ctx, `${t('stat.ovr')} ${ovr(p)}`, 140, 62, C.WHITE, 'center');
    SK.forEach((k, j) => {
      const y = 72 + j * 11;
      tiny(ctx, t('stat.' + k).slice(0, 3), 126, y);
      tiny(ctx, String(p.skills[k]), 155, y, C.ORANGE, 'right');
      bar(ctx, 126, y + 6, 29, 3, p.skills[k] / 99);
    });
    if (this.last) tiny(ctx, `${Math.round(this.last.q * 100)}%`, 140, 131, C.ORANGE, 'center');
  }
}

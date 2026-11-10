// Arcade-Moment (Key Game): Intro (inkl. aktiver Boni) -> Minigame (5-15 Sek.) -> Ergebnis. Liefert Qualitaet 0..1.
import { Scene } from '../scenes/scene.js';
import { TextBox } from '../ui.js';
import { C, tiny } from '../gfx.js';
import { playMusic } from '../systems/audio.js';
import { input } from '../input.js';
import { t } from '../i18n/index.js';
import { drawBattle } from './common.js';
import { ShotMeter } from './shotMeter.js';
import { Clutch } from './clutch.js';
import { FastBreak } from './fastBreak.js';
import { DefenseStop } from './defenseStop.js';
import { Drive } from './drive.js';
import { Rebound } from './rebound.js';
import { Pass } from './pass.js';
import { FreeThrow } from './freeThrow.js';
import { Post } from './post.js';

const GAMES = { shot: ShotMeter, clutch: Clutch, fast: FastBreak, defense: DefenseStop, drive: Drive, rebound: Rebound, pass: Pass, ft: FreeThrow, post: Post };
export const ARCADE_KINDS = Object.keys(GAMES);
// Welche Perk-Modifikatoren fuer welches Minigame zaehlen
const MOD_KEYS = { shot: ['zone'], clutch: ['zone', 'time'], fast: ['fast'], defense: ['def'], drive: ['drive'], rebound: ['reb'], pass: ['pass'], ft: ['ft'], post: ['reb'] };

export class ArcadeScene extends Scene {
  constructor(run, opts) {
    super();
    this.run = run;
    this.opts = { scoreLine: [98, 99], situation: '', pressure: 0.2, ...opts };
    this.phase = 'intro';
    this.noStats = true;
    const src = new Set();
    for (const k of MOD_KEYS[this.opts.kind] || []) for (const n of this.opts.mods?.src?.[k] || []) src.add(n);
    this.bonus = [...src];
  }
  enter() {
    playMusic('arcade');
    const introKey = this.opts.kind === 'shot' && this.opts.contest ? 'shot3' : this.opts.kind;
    this.box = new TextBox(`${this.opts.title}! ${t('arcade.intro.' + introKey, { n: this.opts.shots || 3 })}`);
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
      drawBattle(ctx, this, this.t, { showHoop: !['defense', 'pass'].includes(this.opts.kind) });
      tiny(ctx, this.opts.title, 6, 32, C.ORANGE);
      if (this.bonus.length) tiny(ctx, t('arcade.bonus', { x: this.bonus.join(', ').toUpperCase() }).slice(0, 18), 6, 39, C.WHITE);
      this.box.draw(ctx, this.t);
      return;
    }
    this.game.draw(ctx, this.t);
    if (this.phase === 'result') { input.clearRegions(); this.box.draw(ctx, this.t); }
  }
}

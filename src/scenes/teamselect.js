// Teamwahl vor dem Draft: alle Teams mit Staerke und Draft-Pick.
// Schwaches Team = frueher Pick (mehr Talent), starkes Team = spaeter Pick (bessere Mitspieler).
import { Scene } from './scene.js';
import { C, text, tiny, box, cursor, bar, upArrow, downArrow } from '../gfx.js';
import { header } from '../ui.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { save } from '../systems/save.js';
import { RNG } from '../systems/rng.js';
import { t } from '../i18n/index.js';
import { createLeague, createRun, pickForTeam } from '../systems/league.js';
import { playRun } from '../flow.js';

const VIS = 9;

export class TeamSelectScene extends Scene {
  constructor(back, opts) { super(); this.backScene = back; this.opts = opts; this.noStats = true; this.i = 0; this.scroll = 0; }
  enter(game) {
    this.game = game;
    if (this.teams) return;
    // Gleiche Liga wie im Run (gleicher Seed-Ast)
    const league = createLeague(new RNG(this.opts.seed).fork('league'), game.names);
    this.teams = league.slice().sort((a, b) => b.base - a.base);
    this.picks = Object.fromEntries(league.map(x => [x.id, pickForTeam(league, x.id)]));
  }
  get rows() { return this.teams.length + 1; } // 0 = Zufall
  back() { sfx.back(); this.game.set(this.backScene); }
  start(k) {
    sfx.select();
    const o = this.opts;
    const run = createRun(o.seed, this.game.names, {
      archId: o.archId, look: o.look, name: o.name, hof: save.hof(), teamId: k === 0 ? null : this.teams[k - 1].id,
    });
    run.daily = o.daily;
    playRun(this.game, run);
  }
  update() {
    const n = this.rows;
    if (input.pressed('down')) { this.i = (this.i + 1) % n; sfx.blip(); }
    if (input.pressed('up')) { this.i = (this.i + n - 1) % n; sfx.blip(); }
    if (input.pressed('b') || this.backClick) { this.backClick = false; return this.back(); }
    if (this.clickRow != null) { this.i = this.clickRow; this.clickRow = null; return this.start(this.i); }
    if (this.i < this.scroll) this.scroll = this.i;
    if (this.i >= this.scroll + VIS) this.scroll = this.i - VIS + 1;
    if (input.pressed('a')) this.start(this.i);
  }
  draw(ctx) {
    header(ctx, t('teamsel.title'), '', () => { this.backClick = true; });
    box(ctx, 0, 14, 160, 130);
    tiny(ctx, t('teamsel.cols'), 152, 19, C.WHITE, 'right');
    for (let v = 0; v < VIS; v++) {
      const k = this.scroll + v;
      if (k >= this.rows) break;
      const y = 27 + v * 12;
      input.region(4, y - 3, 152, 12, () => { if (this.i !== k) { this.i = k; sfx.blip(); } }, () => { this.clickRow = k; });
      if (k === this.i) cursor(ctx, 6, y - 1);
      const col = k === this.i ? C.ORANGE : C.WHITE;
      if (k === 0) { text(ctx, t('teamsel.random'), 14, y - 1, col); continue; }
      const tm = this.teams[k - 1];
      tiny(ctx, tm.abbr, 14, y, col);
      tiny(ctx, tm.nick.toUpperCase().slice(0, 13), 30, y, col);
      bar(ctx, 86, y, 36, 5, (tm.base - 30) / 55, C.ORANGE);
      tiny(ctx, String(tm.base), 132, y, C.WHITE, 'right');
      tiny(ctx, `#${this.picks[tm.id]}`, 152, y, C.ORANGE, 'right');
    }
    if (this.scroll > 0) upArrow(ctx, 77, 16);
    if (this.scroll + VIS < this.rows) downArrow(ctx, 74, 136, 0);
  }
}

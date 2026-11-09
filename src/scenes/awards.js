// Season-Abschluss: Awards erscheinen nacheinander, dann Altersverlauf.
import { Scene } from './scene.js';
import { C, text, tiny, ball } from '../gfx.js';
import { header, TextBox } from '../ui.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { ovr } from '../systems/sim.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

const REACHED = { LOTTERY: 'LOTTERY', 'PLAY-IN': 'PLAY-IN', R1: '1. RUNDE', R2: '2. RUNDE', CF: 'CONF FINALS', FIN: 'FINALS', CHAMP: 'CHAMPION' };

export class AwardsScene extends Scene {
  constructor(run, season, po, aw, aging) {
    super();
    this.run = run;
    const rows = [];
    rows.push({ s: `${season.w}-${season.l}  ${REACHED[po.reached]}`, c: C.WHITE });
    for (const a of aw.list) {
      if (a.won) rows.push({ s: a.label, c: C.ORANGE, ball: true, sfx: a.id === 'ring' || a.id === 'mvp' || a.id === 'fmvp' ? 'fanfare' : 'hit' });
      else rows.push({ s: `${a.label}: ${a.winner}`.slice(0, 19), c: C.WHITE });
    }
    for (const m of aw.newMs) rows.push({ s: m, c: C.ORANGE, ball: true, sfx: 'hit' });
    if (!rows.some(r => r.ball)) rows.push({ s: 'KEINE AWARDS', c: C.WHITE });
    this.rows = rows.slice(0, 7);
    const sgn = v => (v > 0 ? '+' : '') + v;
    this.aging = `Alter ${run.p.age}. OVR ${ovr(run.p)} (${sgn(aging.dOvr)}), Koerper ${sgn(aging.db)}.`;
    this.shown = 0; this.box = null;
  }
  update() {
    if (this.shown < this.rows.length) {
      if (this.t % 22 === 0 || input.pressed('a')) {
        const r = this.rows[this.shown++];
        if (r.sfx) sfx[r.sfx](); else sfx.blip();
      }
      return;
    }
    if (!this.box) this.box = new TextBox(this.aging);
    else if (this.box.update()) this.finish();
  }
  draw(ctx) {
    const run = this.run, p = run.p;
    header(ctx, 'SEASON-BILANZ', `S${run.seasonNo} ${run.year}`);
    this.rows.slice(0, this.shown).forEach((r, i) => {
      const y = 17 + i * 11;
      if (r.ball) ball(ctx, 2, y + 1);
      text(ctx, r.s.slice(0, 18), 9, y, r.c);
    });
    if (this.box) this.box.draw(ctx, this.t);
    else drawSprite(ctx, p.look, run.teams[p.teamId].colors, 140, 112, { frame: idleFrame(this.t), age: p.age });
  }
}

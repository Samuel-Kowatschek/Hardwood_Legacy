// Award-Screen: nach der Regular Season (MVP, All-Star ...) und nach den Playoffs (Ring, FMVP, Meilensteine, Alterung).
import { Scene } from './scene.js';
import { C, text, ball } from '../gfx.js';
import { header, TextBox } from '../ui.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

export class AwardsScene extends Scene {
  // opts: { title, first (erste Zeile), list (Awards), newMs (Meilensteine), outro (Text unten) }
  constructor(run, { title, first, list = [], newMs = [], outro = '' }) {
    super();
    this.run = run; this.title = title; this.outro = outro;
    const rows = [{ s: first, c: C.WHITE }];
    for (const a of list) {
      if (a.won) rows.push({ s: t('awards.' + a.id), c: C.ORANGE, ball: true, sfx: ['ring', 'mvp', 'fmvp'].includes(a.id) ? 'fanfare' : 'hit' });
      else rows.push({ s: `${t('awards.' + a.id)}: ${a.winner === '@teammate' ? t('awards.teammate') : a.winner}`, c: C.WHITE });
    }
    for (const m of newMs) rows.push({ s: t('milestone.' + m), c: C.ORANGE, ball: true, sfx: 'hit' });
    if (!rows.some(r => r.ball)) rows.push({ s: t('awards.none'), c: C.WHITE });
    this.rows = rows.slice(0, 7);
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
    if (!this.box) this.box = new TextBox(this.outro || '...');
    else if (this.box.update()) this.finish();
  }
  draw(ctx) {
    const run = this.run, p = run.p;
    header(ctx, this.title, `S${run.seasonNo} ${run.year}`);
    this.rows.slice(0, this.shown).forEach((r, i) => {
      const y = 17 + i * 11;
      if (r.ball) ball(ctx, 2, y + 1);
      text(ctx, r.s.slice(0, 18), 9, y, r.c);
    });
    if (this.box) this.box.draw(ctx, this.t);
    else drawSprite(ctx, p.look, run.teams[p.teamId].colors, 140, 112, { frame: idleFrame(this.t), age: p.age });
  }
}

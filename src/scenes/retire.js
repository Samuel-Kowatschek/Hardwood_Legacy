// Retire-Gamble: Legacy jetzt vs. Risiko einer weiteren Season.
import { Scene } from './scene.js';
import { C, text, tiny, box, bar } from '../gfx.js';
import { header, Menu, TextBox, bigText } from '../ui.js';
import { sfx, playMusic } from '../systems/audio.js';
import { BALANCE } from '../data/balance.js';
import { legacy } from '../systems/legacy.js';
import { ovr, injuryChance } from '../systems/sim.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

function projection(age) {
  if (age <= 22) return 3; if (age <= 26) return 2; if (age <= 29) return 0; if (age <= 32) return -2; return -3;
}

export class RetireScene extends Scene {
  constructor(run, forced) {
    super();
    this.run = run; this.forced = forced;
    this.lg = legacy(run);
    this.menu = new Menu([{ label: 'RETIRE' }, { label: 'NOCH EINE SEASON' }], { rowH: 12, hint: false });
    this.menu.i = 1;
    this.box = forced ? new TextBox(forced) : null;
  }
  update() {
    if (this.box) { if (this.box.update()) { sfx.sad(); this.finish('retire'); } return; }
    const i = this.menu.update();
    if (i === 0) this.finish('retire');
    else if (i === 1) this.finish('continue');
  }
  draw(ctx) {
    const run = this.run, p = run.p, lg = this.lg;
    const last = run.log[run.log.length - 1];
    header(ctx, 'RETIRE?', `SEASON ${run.seasonNo}/${BALANCE.maxSeasons}`);
    drawSprite(ctx, p.look, run.teams[p.teamId].colors, 6, 16, { frame: idleFrame(this.t), scale: 2, age: p.age });
    const x = 44;
    const o = ovr(p), d = last ? o - last.ovr : 0;
    tiny(ctx, `ALTER ${p.age}`, x, 17);
    tiny(ctx, `OVR ${o}`, x, 25); tiny(ctx, `TREND ${d > 0 ? '+' : ''}${d}`, x + 40, 25, d < 0 ? C.ORANGE : C.WHITE);
    tiny(ctx, 'KOERPER', x, 33); bar(ctx, x + 32, 33, 50, 5, p.body / 100, p.body < 35 ? C.ORANGE : C.WHITE);
    const a = p.awards;
    tiny(ctx, `RINGE ${a.rings}  MVP ${a.mvp}  FMVP ${a.fmvp}`, x, 41);
    tiny(ctx, `ALL-STAR ${a.allStar}  PTS ${p.career.pts}`, x, 49);
    tiny(ctx, `PROGNOSE OVR ${projection(p.age) >= 0 ? '+' : ''}${projection(p.age)} / VERL. ${Math.round(injuryChance(p) * 100)}%`, x, 57, C.ORANGE);

    box(ctx, 0, 66, 160, 46);
    tiny(ctx, 'WENN DU JETZT RETIRED:', 80, 71, C.WHITE, 'center');
    bigText(ctx, lg.score, 80, 78, C.ORANGE, 2);
    tiny(ctx, `${lg.base} X ${lg.mult.toFixed(2)}  ${lg.tier.name.toUpperCase()}`, 80, 96, C.WHITE, 'center');
    const mp = lg.multParts.map(([n, v]) => `${n} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`).join(' ');
    const warn = run.retire.weakStreak ? `NAECHSTE SCHWACHE SEASON -${Math.round(BALANCE.retire.overstayStep * (run.retire.weakStreak + 1) * 100)}%` : 'SCHWACHE SEASON = OVERSTAYED-MALUS';
    tiny(ctx, (mp || warn).slice(0, 38), 80, 103, mp && lg.mult < 1 ? C.ORANGE : mp ? C.ORANGE : C.WHITE, 'center');

    if (this.box) this.box.draw(ctx, this.t);
    else {
      box(ctx, 0, 112, 160, 32);
      this.menu.draw(ctx, 8, 118);
    }
  }
}

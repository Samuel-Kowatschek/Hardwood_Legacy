// Drive: Seitenansicht, 3 Spuren. HOCH/RUNTER wechselt die Spur, Verteidigern ausweichen, dann Korbleger.
import { C, text, tiny, box, ball, bar } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';
import { drawSprite } from '../sprites/spriteGen.js';

const LANES = [30, 48, 66];
const PX = 18, DUR = 400;

export class Drive {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    this.lane = 1; this.y = LANES[1]; this.f = 0; this.hits = 0; this.defs = []; this.flash = 0;
    this.speed = 1.5 + pr * 0.9;
    this.every = Math.round(46 * (1 + m.drive) * (0.8 + (p.skills.ath + p.skills.pla) / 400));
    this.next = 20; this.end = 0;
  }
  update() {
    const rng = this.s.run.rng;
    this.f++;
    if (this.end) {
      this.end++;
      if (this.end === 20) { if (this.hits < 3) sfx.swish(); }
      if (this.end > 60) this.finish();
      return;
    }
    if (input.pressed('up') && this.lane > 0) { this.lane--; sfx.blip(); }
    if (input.pressed('down') && this.lane < 2) { this.lane++; sfx.blip(); }
    this.y += (LANES[this.lane] - this.y) * 0.45;
    // Verteidiger spawnen (immer mind. eine Spur frei)
    if (this.f < DUR && --this.next <= 0) {
      this.next = this.every + rng.int(-8, 8);
      const free = rng.int(0, 2);
      const two = rng.chance(0.35 + this.s.opts.pressure * 0.4);
      for (let l = 0; l < 3; l++) {
        if (l === free) continue;
        if (!two && rng.chance(0.5)) continue;
        this.defs.push({ x: 164 + rng.int(0, 10), lane: l });
      }
    }
    for (const d of this.defs) d.x -= this.speed;
    for (const d of this.defs) {
      if (!d.hit && d.lane === this.lane && d.x < PX + 12 && d.x > PX - 10) {
        d.hit = true; this.hits++; this.flash = 12; sfx.miss();
        if (this.hits >= 3) { this.stripped = true; this.end = 1; return; }
      }
    }
    this.defs = this.defs.filter(d => d.x > -20);
    if (this.flash) this.flash--;
    if (this.f >= DUR && !this.defs.length) this.end = 1;
  }
  finish() {
    this.done = true;
    this.q = this.stripped ? 0.1 : [1, 0.7, 0.45][this.hits];
    this.resultText = this.stripped ? t('arcade.driveStrip') : this.hits ? t('arcade.driveBump', { n: this.hits }) : t('arcade.driveClean');
  }
  draw(ctx, tt) {
    const { run, opts } = this.s;
    const p = run.p, team = run.teams[p.teamId], opp = opts.opp;
    tiny(ctx, opts.title.slice(0, 20), 4, 3, C.WHITE);
    tiny(ctx, `${opts.scoreLine[0]}-${opts.scoreLine[1]}  ${opts.situation}`.slice(0, 36), 4, 10, C.ORANGE);
    // Spuren
    ctx.fillStyle = C.DARK;
    LANES.forEach(y => ctx.fillRect(0, y + 22, 160, 2));
    for (let i = 0; i < 10; i++) ctx.fillRect(((i * 20 - Math.floor(this.f * this.speed)) % 200 + 200) % 200 - 20, 92, 8, 1);
    const prog = clamp(this.f / DUR, 0, 1);
    if (prog > 0.8 || this.end) {
      const hx = 150 - Math.round((prog - 0.8) * 60);
      ctx.fillStyle = C.WHITE; ctx.fillRect(hx + 6, 18, 2, 70);
      ctx.fillStyle = C.ORANGE; ctx.fillRect(hx - 6, 30, 12, 2);
    }
    const sorted = this.defs.slice().sort((a, b) => a.lane - b.lane);
    for (const d of sorted) drawSprite(ctx, opp.star.look, opp.colors, Math.round(d.x), LANES[d.lane], { frame: Math.floor(tt / 10) % 2 ? 'idle0' : 'idle1' });
    if (!(this.flash && Math.floor(this.flash / 3) % 2)) {
      const ex = this.end ? Math.min(40, this.end * 3) : 0;
      drawSprite(ctx, p.look, team.colors, PX + ex, Math.round(this.y) - (this.end ? Math.min(12, this.end) : 0), { view: 'side', frame: Math.floor(tt / 6) % 2 ? 'run0' : 'run1', age: p.age });
      if (!this.stripped) ball(ctx, PX + ex + 13, Math.round(this.y) + 12 + (Math.floor(tt / 6) % 2) * 4);
    }
    input.dirPad(PX + 8, Math.round(this.y) + 12, 6, 'dominant');
    box(ctx, 0, 96, 160, 48);
    text(ctx, t('arcade.drive'), 8, 103, C.ORANGE);
    tiny(ctx, t('arcade.contact', { n: this.hits }), 152, 104, this.hits ? C.ORANGE : C.WHITE, 'right');
    bar(ctx, 12, 117, 136, 6, prog);
    if (this.end && !this.stripped) text(ctx, t('arcade.layupGood'), 80, 129, C.ORANGE, 'center');
    else tiny(ctx, t('arcade.driveHint'), 80, 131, C.WHITE, 'center');
  }
}

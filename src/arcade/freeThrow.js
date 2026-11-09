// Freiwuerfe: Das Fadenkreuz wackelt (Nervositaet). Mit den Pfeilen gegensteuern, SPACE werfen.
import { C, text, tiny, box, ball, platform } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

const RX = 80, RY = 40, N = 3;

export class FreeThrow {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    this.amp = 0.16 * (1 + pr * 1.2) * clamp(1.35 - (p.skills.clu + p.skills.sho) / 220, 0.6, 1.3) * (1 - clamp(m.ft, 0, 0.6));
    this.i = 0; this.makes = 0; this.swishes = 0;
    this.start();
  }
  start() {
    const rng = this.s.run.rng;
    this.x = RX + rng.float(-10, 10); this.y = RY + rng.float(-8, 8);
    this.vx = 0; this.vy = 0; this.clock = 360; this.fly = 0; this.res = null;
  }
  update() {
    const rng = this.s.run.rng;
    if (this.fly) {
      this.fly++;
      if (this.fly === 24) { if (this.res.make) { sfx.swish(); sfx.crowd(0.6); } else sfx.miss(); }
      if (this.fly > 50) {
        this.i++;
        if (this.i >= N) {
          this.done = true;
          this.q = clamp((this.makes + 0.2 * this.swishes) / N, 0, 1);
          this.resultText = t('arcade.ftRes', { n: this.makes, m: N });
        } else this.start();
      }
      return;
    }
    this.clock--;
    // Wackeln wird mit der Zeit staerker
    const a = this.amp * (1 + (360 - this.clock) / 300);
    this.vx += rng.gauss(0, a); this.vy += rng.gauss(0, a);
    if (input.isDown('left')) this.vx -= 0.09;
    if (input.isDown('right')) this.vx += 0.09;
    if (input.isDown('up')) this.vy -= 0.09;
    if (input.isDown('down')) this.vy += 0.09;
    this.vx *= 0.94; this.vy *= 0.94;
    this.x = clamp(this.x + this.vx, 20, 140); this.y = clamp(this.y + this.vy, 8, 84);
    if (input.pressed('a') || this.clock <= 0) {
      const d = Math.hypot(this.x - RX, this.y - RY);
      const make = d < 7, swish = d < 3;
      if (make) this.makes++;
      if (swish) this.swishes++;
      this.res = { make, swish };
      this.fly = 1;
    }
  }
  draw(ctx, tt) {
    const { run, opts } = this.s;
    const p = run.p, team = run.teams[p.teamId];
    tiny(ctx, opts.title.slice(0, 20), 4, 3, C.WHITE);
    // grosser Korb
    ctx.fillStyle = C.WHITE; ctx.fillRect(RX - 22, RY - 26, 44, 30);
    ctx.fillStyle = C.BG; ctx.fillRect(RX - 21, RY - 25, 42, 28);
    ctx.fillStyle = C.WHITE; ctx.fillRect(RX - 8, RY - 14, 16, 12);
    ctx.fillStyle = C.BG; ctx.fillRect(RX - 7, RY - 13, 14, 10);
    ctx.fillStyle = C.ORANGE; ctx.fillRect(RX - 9, RY, 18, 2);
    ctx.fillStyle = C.WHITE; for (let i = 0; i < 6; i++) ctx.fillRect(RX - 7 + i * 3, RY + 2 + (i % 2), 1, 7);
    platform(ctx, 30, 92, 26, 4);
    drawSprite(ctx, p.look, team.colors, 14, 46, { view: 'back', frame: this.fly && this.fly < 18 ? 'shoot' : idleFrame(tt), scale: 2, age: p.age });
    if (this.fly) {
      const k = Math.min(1, this.fly / 24);
      const tx = this.res.make ? RX - 2 : this.x - 2, ty = this.res.make ? RY - 4 : this.y - 2;
      ball(ctx, Math.round(28 + (tx - 28) * k), Math.round(48 + (ty - 48) * k - Math.sin(k * Math.PI) * 24) + (this.fly > 24 && this.res.make ? Math.min(10, this.fly - 24) : 0));
    } else {
      // Fadenkreuz
      const x = Math.round(this.x), y = Math.round(this.y);
      ctx.fillStyle = C.ORANGE;
      ctx.fillRect(x - 4, y, 3, 1); ctx.fillRect(x + 2, y, 3, 1); ctx.fillRect(x, y - 4, 1, 3); ctx.fillRect(x, y + 2, 1, 3);
      ctx.fillStyle = C.WHITE; ctx.fillRect(x, y, 1, 1);
    }
    box(ctx, 0, 96, 160, 48);
    text(ctx, t('arcade.ft', { i: Math.min(this.i + 1, N), n: N }), 8, 103);
    tiny(ctx, `${this.makes}/${N}`, 152, 104, C.ORANGE, 'right');
    if (this.res && this.fly > 20) text(ctx, this.res.swish ? t('arcade.swish') : this.res.make ? t('arcade.make') : t('arcade.miss'), 80, 119, this.res.make ? C.ORANGE : C.WHITE, 'center');
    else { ctx.fillStyle = C.WHITE; ctx.fillRect(12, 120, Math.round(136 * this.clock / 360), 2); }
    tiny(ctx, t('arcade.ftHint'), 80, 133, C.WHITE, 'center');
  }
}

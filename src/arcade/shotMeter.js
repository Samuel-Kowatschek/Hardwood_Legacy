// Shot-Meter: Marker pendelt, A in der orangen Zone = Treffer. 3 Wuerfe, je 5 Sek. Shot-Clock.
import { C, text, tiny, box, ball, drawBattle } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';

const MX = 12, MW = 136;

export class ShotMeter {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    this.shots = 3; this.i = 0; this.makes = 0; this.perfects = 0;
    this.zw = clamp(0.16 * (0.75 + p.skills.sho / 200) * (1 + m.zone) * (1 - pr * 0.35), 0.06, 0.38);
    this.next();
  }
  next() {
    const rng = this.s.run.rng;
    this.m = rng.float(0, 1); this.dir = rng.chance(0.5) ? 1 : -1;
    this.v = 0.017 * (1 + this.i * 0.15) * (1 + this.s.opts.pressure * 0.6);
    this.zc = rng.float(this.zw / 2 + 0.05, 1 - this.zw / 2 - 0.05);
    this.clock = 300; this.fly = 0; this.res = null;
  }
  update() {
    if (this.fly) {
      this.fly++;
      if (this.fly === 26) { if (this.res.make) { sfx.swish(); sfx.crowd(0.8); } else sfx.miss(); }
      if (this.fly > 50) {
        this.i++;
        if (this.i >= this.shots) {
          this.done = true;
          this.q = clamp((this.makes + 0.25 * this.perfects) / this.shots, 0, 1);
          this.resultText = `${this.makes}/${this.shots} getroffen!` + (this.perfects ? ` ${this.perfects}x PERFEKT.` : '');
        } else this.next();
      }
      return;
    }
    this.m += this.v * this.dir;
    if (this.m > 1) { this.m = 1; this.dir = -1; } else if (this.m < 0) { this.m = 0; this.dir = 1; }
    this.clock--;
    if (input.pressed('a') || this.clock <= 0) {
      const d = Math.abs(this.m - this.zc);
      const make = this.clock > 0 && d <= this.zw / 2;
      const perfect = make && d <= this.zw * 0.15;
      if (make) this.makes++;
      if (perfect) this.perfects++;
      this.res = { make, perfect, timeout: this.clock <= 0 };
      this.fly = 1;
    }
  }
  draw(ctx, t) {
    drawBattle(ctx, this.s, t, { myFrame: this.fly && this.fly < 20 ? 'shoot' : null });
    // Ballflug
    if (this.fly) {
      const k = Math.min(1, this.fly / 26);
      const tx = this.res.make ? 93 : 99, ty = 12;
      const x = 30 + (tx - 30) * k, y = 40 + (ty - 40) * k - Math.sin(k * Math.PI) * 30;
      if (this.fly <= 26) ball(ctx, Math.round(x), Math.round(y));
      else if (this.res.make) ball(ctx, 92, 12 + Math.min(14, this.fly - 26));
      else ball(ctx, 99 + (this.fly - 26), 14 + Math.round(Math.abs(Math.sin((this.fly - 26) / 6)) * -6) + (this.fly - 26));
    } else ball(ctx, 30, 40);
    box(ctx, 0, 96, 160, 48);
    text(ctx, `WURF ${this.i + 1}/${this.shots}`, 8, 104);
    tiny(ctx, `TREFFER ${this.makes}`, 152, 105, C.ORANGE, 'right');
    // Meter
    ctx.fillStyle = C.WHITE; ctx.fillRect(MX - 1, 117, MW + 2, 10);
    ctx.fillStyle = C.DARK; ctx.fillRect(MX, 118, MW, 8);
    ctx.fillStyle = C.ORANGE;
    ctx.fillRect(MX + Math.round((this.zc - this.zw / 2) * MW), 118, Math.max(2, Math.round(this.zw * MW)), 8);
    ctx.fillStyle = C.WHITE;
    ctx.fillRect(MX + Math.round(this.zc * MW) - 1, 118, 2, 1);
    const mx = MX + Math.round(this.m * MW);
    ctx.fillRect(mx - 1, 114, 3, 16);
    if (this.res && this.fly > 20) text(ctx, this.res.timeout ? 'SHOT CLOCK!' : this.res.perfect ? 'SWISH! PERFEKT' : this.res.make ? 'TREFFER!' : 'DANEBEN', 80, 132, this.res.make ? C.ORANGE : C.WHITE, 'center');
    else {
      ctx.fillStyle = C.WHITE; ctx.fillRect(12, 130, Math.round(136 * this.clock / 300), 1);
      tiny(ctx, 'A = WERFEN', 80, 133, C.WHITE, 'center');
    }
  }
}

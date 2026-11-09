// Shot-Meter: Marker pendelt, SPACE in der orangen Zone = Treffer, weisse Mitte = AND ONE. 3 Wuerfe.
import { C, text, tiny, box, ball, drawBattle, drawMeter, meterHit } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';

export class ShotMeter {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    this.shots = 3; this.i = 0; this.makes = 0; this.ands = 0;
    this.zw = clamp(0.16 * (0.7 + p.skills.sho / 150) * (1 + m.zone) * (1 - pr * 0.35), 0.07, 0.42);
    this.inner = this.zw * 0.25;
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
      if (this.fly === 26) { if (this.res.make) { sfx.swish(); sfx.crowd(this.res.andOne ? 1.5 : 0.8); } else sfx.miss(); }
      if (this.fly === 34 && this.res.andOne) sfx.fanfare();
      if (this.fly > (this.res.andOne ? 70 : 50)) {
        this.i++;
        if (this.i >= this.shots) {
          this.done = true;
          this.q = clamp((this.makes + 0.35 * this.ands) / this.shots, 0, 1);
          this.resultText = t('arcade.resShot', { m: this.makes, n: this.shots }) + (this.ands ? t('arcade.resAndOne', { n: this.ands }) : '');
        } else this.next();
      }
      return;
    }
    this.m += this.v * this.dir;
    if (this.m > 1) { this.m = 1; this.dir = -1; } else if (this.m < 0) { this.m = 0; this.dir = 1; }
    this.clock--;
    if (input.pressed('a') || this.clock <= 0) {
      const h = this.clock > 0 ? meterHit(this.m, this.zc, this.zw, this.inner) : { make: false, andOne: false };
      if (h.make) this.makes++;
      if (h.andOne) this.ands++;
      this.res = { ...h, timeout: this.clock <= 0 };
      this.fly = 1;
    }
  }
  draw(ctx, tt) {
    drawBattle(ctx, this.s, tt, { myFrame: this.fly && this.fly < 20 ? 'shoot' : null });
    if (this.fly) {
      const k = Math.min(1, this.fly / 26);
      const tx = this.res.make ? 93 : 99, ty = 12;
      const x = 30 + (tx - 30) * k, y = 40 + (ty - 40) * k - Math.sin(k * Math.PI) * 30;
      if (this.fly <= 26) ball(ctx, Math.round(x), Math.round(y));
      else if (this.res.make) ball(ctx, 92, 12 + Math.min(14, this.fly - 26));
      else ball(ctx, 99 + Math.min(40, this.fly - 26), Math.min(80, 14 + (this.fly - 26)));
    } else ball(ctx, 30, 40);
    box(ctx, 0, 96, 160, 48);
    text(ctx, t('arcade.shotN', { i: Math.min(this.i + 1, this.shots), n: this.shots }), 8, 103);
    tiny(ctx, t('arcade.makes', { n: this.makes }), 152, 104, C.ORANGE, 'right');
    drawMeter(ctx, this.m, this.zc, this.zw, this.inner);
    if (this.res && this.fly > 20) {
      const r = this.res;
      text(ctx, r.timeout ? t('arcade.shotClock') : r.andOne ? t('arcade.andOne') : r.make ? t('arcade.swish') : t('arcade.miss'), 80, 131, r.make ? C.ORANGE : C.WHITE, 'center');
    } else {
      ctx.fillStyle = C.WHITE; ctx.fillRect(12, 130, Math.round(136 * this.clock / 300), 1);
      tiny(ctx, t('arcade.shoot'), 80, 133, C.WHITE, 'center');
    }
  }
}

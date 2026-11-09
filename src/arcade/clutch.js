// Clutch-Shot: Buzzer-Beater, 1 Wurf, kleine Zone, Uhr laeuft, Verteidiger verschiebt per Fake die Zone.
import { C, text, tiny, box, ball, drawBattle, drawMeter, meterHit } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';

export class Clutch {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure, rng = s.run.rng;
    this.total = Math.round((5 + m.time + (p.skills.clu - 50) / 40) * 60);
    this.clock = this.total;
    this.zw = clamp(0.11 * (0.7 + (p.skills.clu + p.skills.sho) / 300) * (1 + m.zone) * (1 - pr * 0.3), 0.05, 0.32);
    this.inner = this.zw * 0.25;
    this.zc = rng.float(0.2, 0.8);
    this.m = 0; this.dir = 1; this.v = 0.026 * (1 + pr * 0.4);
    this.fakeIn = rng.int(40, 70); this.oppDx = 0; this.fakeT = 0;
    this.fly = 0;
  }
  update() {
    const rng = this.s.run.rng;
    if (this.fly) {
      this.fly++;
      if (this.fly === 26) { if (this.res.make) { sfx.swish(); sfx.crowd(2); } else sfx.miss(); }
      if (this.fly === 30) sfx.buzzer();
      if (this.fly > 70) this.finish();
      return;
    }
    this.clock--;
    if (this.clock % 60 === 0) sfx.tick();
    this.m += this.v * this.dir;
    if (this.m > 1) { this.m = 1; this.dir = -1; } else if (this.m < 0) { this.m = 0; this.dir = 1; }
    if (--this.fakeIn <= 0) {
      this.fakeIn = rng.int(45, 80);
      this.oppDx = rng.chance(0.5) ? -8 : 8;
      this.fakeT = 14;
      this.zc = clamp(this.zc + (this.oppDx > 0 ? 1 : -1) * rng.float(0.15, 0.3), this.zw / 2 + 0.05, 1 - this.zw / 2 - 0.05);
      sfx.blip();
    }
    if (this.fakeT > 0 && --this.fakeT === 0) this.oppDx = 0;
    if (input.pressed('a')) {
      this.res = meterHit(this.m, this.zc, this.zw, this.inner);
      this.fly = 1;
    } else if (this.clock <= 0) {
      this.res = { make: false, timeout: true };
      this.fly = 27;
      sfx.buzzer();
    }
  }
  finish() {
    this.done = true;
    const r = this.res;
    this.q = r.timeout ? 0 : r.andOne ? 1 : r.make ? 0.9 : 0.15;
    this.resultText = r.timeout ? t('arcade.clutchTime') : r.andOne ? t('arcade.clutchAnd') : r.make ? t('arcade.clutchMake') : t('arcade.clutchMiss');
  }
  draw(ctx, tt) {
    drawBattle(ctx, this.s, tt, { oppDx: this.oppDx, myFrame: this.fly && this.fly < 20 ? 'shoot' : null });
    if (this.fakeT > 0) text(ctx, '!', 126 + this.oppDx, 0, C.ORANGE);
    if (this.fly && !this.res.timeout) {
      const k = Math.min(1, this.fly / 26);
      const tx = this.res.make ? 93 : 100;
      const x = 30 + (tx - 30) * k, y = 40 + (12 - 40) * k - Math.sin(k * Math.PI) * 34;
      if (this.fly <= 26) ball(ctx, Math.round(x), Math.round(y));
      else if (this.res.make) ball(ctx, 92, Math.min(26, 12 + this.fly - 26));
      else ball(ctx, Math.min(150, 100 + this.fly - 26), Math.min(90, 12 + (this.fly - 26) * 2));
    } else if (!this.fly) ball(ctx, 30, 40);
    box(ctx, 0, 96, 160, 48);
    const sec = Math.max(0, this.clock / 60);
    text(ctx, `0:0${sec.toFixed(1)}`, 8, 103, sec < 2 ? C.ORANGE : C.WHITE);
    tiny(ctx, t('arcade.clutchLabel'), 152, 104, C.ORANGE, 'right');
    drawMeter(ctx, this.m, this.zc, this.zw, this.inner);
    if (this.fly > 22) {
      const r = this.res;
      text(ctx, r.timeout ? t('arcade.tooLate') : r.andOne ? t('arcade.andOne') : r.make ? t('arcade.good') : t('arcade.miss'), 80, 131, r.make ? C.ORANGE : C.WHITE, 'center');
    } else tiny(ctx, t('arcade.shoot'), 80, 133, C.WHITE, 'center');
  }
}

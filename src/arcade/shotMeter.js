// Shot-Meter: Marker pendelt, SPACE in der orangen Zone = Treffer, weisse Mitte = AND ONE. 3 Wuerfe.
import { C, text, tiny, box, ball, drawBattle, drawMeter, meterHit } from './common.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';

export class ShotMeter {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    this.shots = s.opts.shots || 3; this.i = 0; this.makes = 0; this.ands = 0;
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
          // Dreier-Contest: weisse Mitte = MONEYBALL (doppelte Punkte) statt And One
          this.resultText = t('arcade.resShot', { m: this.makes, n: this.shots }) + (this.ands ? t(this.s.opts.contest ? 'arcade.resMoney' : 'arcade.resAndOne', { n: this.ands }) : '');
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
    if (this.s.opts.contest) drawContest(ctx, this.s, tt, this);
    else drawBattle(ctx, this.s, tt, { myFrame: this.fly && this.fly < 20 ? 'shoot' : null });
    if (this.s.opts.contest) { /* Ballflug zeichnet drawContest */ } else if (this.fly) {
      const k = Math.min(1, this.fly / 26);
      const tx = this.res.make ? 93 : 99, ty = 12;
      const x = 30 + (tx - 30) * k, y = 40 + (ty - 40) * k - Math.sin(k * Math.PI) * 30;
      if (this.fly <= 26) ball(ctx, Math.round(x), Math.round(y));
      else if (this.res.make) ball(ctx, 92, 12 + Math.min(14, this.fly - 26));
      else ball(ctx, 99 + Math.min(40, this.fly - 26), Math.min(80, 14 + (this.fly - 26)));
    } else ball(ctx, 30, 40);
    box(ctx, 0, 96, 160, 48);
    text(ctx, t('arcade.shotN', { i: Math.min(this.i + 1, this.shots), n: this.shots }), 8, 103);
    tiny(ctx, this.s.opts.contest ? t('arcade.points', { n: this.makes + this.ands }) : t('arcade.makes', { n: this.makes }), 152, 104, C.ORANGE, 'right');
    drawMeter(ctx, this.m, this.zc, this.zw, this.inner);
    if (this.res && this.fly > 20) {
      const r = this.res;
      text(ctx, r.timeout ? t('arcade.shotClock') : r.andOne ? t(this.s.opts.contest ? 'arcade.moneyball' : 'arcade.andOne') : r.make ? t('arcade.swish') : t('arcade.miss'), 80, 131, r.make ? C.ORANGE : C.WHITE, 'center');
    } else {
      ctx.fillStyle = C.WHITE; ctx.fillRect(12, 130, Math.round(136 * this.clock / 300), 1);
      tiny(ctx, t('arcade.shoot'), 80, 133, C.WHITE, 'center');
    }
  }
}

// Dreier-Contest (All-Star Weekend): kein Verteidiger. Publikum, grosser Korb, Dreierlinie,
// Ballwagen mit den restlichen Baellen, Punktestand. sm = ShotMeter (oder null im Intro).
export function drawContest(ctx, s, tt, sm = null) {
  const { run, opts } = s;
  const p = run.p, team = run.teams[p.teamId];
  // Publikum
  for (let y = 0; y < 3; y++) for (let x = 0; x < 40; x++) {
    const on = (x * 7 + y * 3 + Math.floor(tt / (sm && sm.res && sm.res.make ? 4 : 20))) % 5 === 0;
    ctx.fillStyle = on ? C.WHITE : C.DARK;
    ctx.fillRect(x * 4 + (y % 2) * 2, 1 + y * 4, 2, 2);
  }
  tiny(ctx, opts.title.slice(0, 20), 80, 15, C.ORANGE, 'center');
  // Grosser Korb in der Mitte
  ctx.fillStyle = C.WHITE; ctx.fillRect(62, 22, 36, 22);
  ctx.fillStyle = C.BG; ctx.fillRect(63, 23, 34, 20);
  ctx.fillStyle = C.WHITE; ctx.fillRect(73, 30, 14, 10);
  ctx.fillStyle = C.BG; ctx.fillRect(74, 31, 12, 8);
  ctx.fillStyle = C.WHITE; ctx.fillRect(79, 44, 2, 22);
  const shake = sm && sm.res && sm.res.make && sm.fly > 26 && sm.fly < 32 ? 1 : 0;
  ctx.fillStyle = C.ORANGE; ctx.fillRect(73, 42 + shake, 14, 2);
  ctx.fillStyle = C.WHITE; for (let i = 0; i < 5; i++) ctx.fillRect(74 + i * 3, 44 + shake + (i % 2), 1, 6);
  // Boden mit Dreierlinie
  ctx.fillStyle = C.DARK; ctx.fillRect(0, 66, 160, 30);
  ctx.fillStyle = C.WHITE;
  for (let a = 0; a <= 40; a++) { const th = a / 40 * Math.PI; ctx.fillRect(Math.round(80 - Math.cos(th) * 70), Math.round(68 + Math.sin(th) * 22), 2, 1); }
  // Ballwagen (restliche Baelle)
  const left = sm ? sm.shots - sm.i - (sm.fly ? 1 : 0) : (opts.shots || 5);
  ctx.fillStyle = C.WHITE; ctx.fillRect(108, 84, 34, 2); ctx.fillRect(110, 86, 1, 6); ctx.fillRect(139, 86, 1, 6);
  for (let i = 0; i < Math.max(0, left); i++) ball(ctx, 109 + i * 6, 78);
  // Schuetze (Rueckansicht) auf der Dreierlinie
  const shooting = sm && sm.fly && sm.fly < 20;
  drawSprite(ctx, p.look, team.colors, 30, 44, { view: 'back', frame: shooting ? 'shoot' : idleFrame(tt), scale: 2, age: p.age });
  // Ballflug
  if (sm) {
    if (sm.fly) {
      const k = Math.min(1, sm.fly / 26), r = sm.res;
      const tx = r.make ? 78 : 86, ty = 38;
      const x = 44 + (tx - 44) * k, y = 44 + (ty - 44) * k - Math.sin(k * Math.PI) * 26;
      if (sm.fly <= 26) ball(ctx, Math.round(x), Math.round(y));
      else if (r.make) ball(ctx, 78, Math.min(62, 40 + (sm.fly - 26)));
      else ball(ctx, Math.min(150, 88 + (sm.fly - 26)), Math.min(88, 40 + (sm.fly - 26) * 2));
    } else ball(ctx, 44, 44);
  }
}

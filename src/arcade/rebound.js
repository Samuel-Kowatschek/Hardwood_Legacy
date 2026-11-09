// Rebound: Ball prallt vom Ring ab. LINKS/RECHTS unter den Ball, SPACE springen. Gegen den gegnerischen Center.
import { C, text, tiny, box, ball, hoop } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';
import { drawSprite } from '../sprites/spriteGen.js';

const FLOOR = 90, N = 3;

export class Rebound {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    this.mv = 1.5 * (1 + m.reb) * (0.85 + p.skills.ath / 300);
    this.aiV = 0.9 + pr * 0.8;
    this.jumpPow = 1 + m.reb * 0.5;
    this.i = 0; this.got = 0; this.px = 50; this.ox = 100;
    this.start();
  }
  start() {
    const rng = this.s.run.rng;
    this.bx = 80; this.by = 26; this.bvx = rng.float(-1.5, 1.5); this.bvy = -rng.float(1.6, 2.4);
    this.jump = 0; this.ojump = 0; this.res = null; this.wait = 30; this.pause = 0;
  }
  // Wo landet der Ball ungefaehr (fuer die KI)
  landing() {
    let x = this.bx, y = this.by, vx = this.bvx, vy = this.bvy;
    for (let i = 0; i < 200 && y < 62; i++) { x += vx; y += vy; vy += 0.09; if (x < 4 || x > 156) vx = -vx; }
    return x;
  }
  update() {
    if (this.res) {
      if (++this.pause > 45) {
        this.i++;
        if (this.i >= N) {
          this.done = true;
          this.q = clamp(this.got / N, 0, 1);
          this.resultText = t('arcade.rebRes', { n: this.got, m: N });
        } else this.start();
      }
      return;
    }
    if (input.isDown('left')) this.px -= this.mv;
    if (input.isDown('right')) this.px += this.mv;
    this.px = clamp(this.px, 4, 140);
    if (input.pressed('a') && !this.jump) { this.jump = 1; sfx.blip(); }
    if (this.jump) { this.jump++; if (this.jump > 30) this.jump = 0; }
    if (this.wait > 0) { this.wait--; return; }
    // Ball-Physik
    this.bx += this.bvx; this.by += this.bvy; this.bvy += 0.09;
    if (this.bx < 4 || this.bx > 152) this.bvx = -this.bvx;
    // Gegner-KI laeuft zum Landepunkt und springt
    const target = this.landing() - 8;
    this.ox += clamp(target - this.ox, -this.aiV, this.aiV);
    if (!this.ojump && this.by > 40 && Math.abs(this.bx - (this.ox + 8)) < 14) this.ojump = 1;
    if (this.ojump) { this.ojump++; if (this.ojump > 30) this.ojump = 0; }
    // Fangen
    const reach = (j, pow) => 64 - Math.round(Math.sin(Math.min(1, j / 30) * Math.PI) * 16 * pow);
    const myTop = reach(this.jump, this.jumpPow), oTop = reach(this.ojump, 1);
    const near = (x) => Math.abs(this.bx + 2 - (x + 8)) < 9;
    if (this.bvy > 0 && near(this.px) && this.by >= myTop - 4 && this.by <= myTop + 8 && (this.jump || this.by >= 60)) return this.win(true);
    if (this.bvy > 0 && near(this.ox) && this.by >= oTop - 4 && this.by <= oTop + 8 && (this.ojump || this.by >= 60)) return this.win(false);
    if (this.by >= FLOOR - 4) {
      const mine = Math.abs(this.bx - (this.px + 8)) < Math.abs(this.bx - (this.ox + 8));
      this.win(mine);
    }
  }
  win(mine) {
    this.res = mine ? 'got' : 'lost';
    if (mine) { this.got++; sfx.hit(); sfx.crowd(0.6); } else sfx.miss();
  }
  draw(ctx, tt) {
    const { run, opts } = this.s;
    const p = run.p, team = run.teams[p.teamId], opp = opts.opp;
    tiny(ctx, opts.title.slice(0, 20), 4, 3, C.WHITE);
    tiny(ctx, `${opts.scoreLine[0]}-${opts.scoreLine[1]}`, 4, 10, C.ORANGE);
    hoop(ctx, 73, 14);
    ctx.fillStyle = C.DARK; ctx.fillRect(0, FLOOR, 160, 6);
    // Schatten unter dem Ball
    if (!this.res) { ctx.fillStyle = C.DARK; ctx.fillRect(Math.round(this.bx) - 1, FLOOR - 2, 7, 2); }
    const jy = (j, pow) => Math.round(Math.sin(Math.min(1, j / 30) * Math.PI) * 16 * pow);
    drawSprite(ctx, opp.star.look, opp.colors, Math.round(this.ox), 66 - jy(this.ojump, 1), { frame: this.ojump ? 'shoot' : 'idle0' });
    drawSprite(ctx, p.look, team.colors, Math.round(this.px), 66 - jy(this.jump, this.jumpPow), { frame: this.jump ? 'shoot' : 'idle0', age: p.age });
    if (!this.res) ball(ctx, Math.round(this.bx), Math.round(this.by));
    else if (this.res === 'got') ball(ctx, Math.round(this.px) + 6, 62);
    else ball(ctx, Math.round(this.ox) + 6, 62);
    box(ctx, 0, 96, 160, 48);
    text(ctx, t('arcade.reb', { i: Math.min(this.i + 1, N), n: N }), 8, 103);
    tiny(ctx, `${this.got}/${N}`, 152, 104, C.ORANGE, 'right');
    if (this.res) text(ctx, this.res === 'got' ? t('arcade.rebGot') : t('arcade.rebLost'), 80, 120, this.res === 'got' ? C.ORANGE : C.WHITE, 'center');
    tiny(ctx, t('arcade.rebHint'), 80, 133, C.WHITE, 'center');
  }
}

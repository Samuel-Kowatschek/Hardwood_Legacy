// Standing Dunk (Big Man): direkt unter dem Korb. SPACE halten = Sprungkraft laden, loslassen in der
// orangen Zone = Dunk, weisse Mitte = Poster. Springt der Verteidiger gerade, wird geblockt (ausser Poster).
import { C, text, tiny, box, ball } from './common.js';
import { drawMeter, meterHit } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

const N = 3, RIM_X = 118, RIM_Y = 34, FLOOR = 90;

export class Post {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    this.zw = clamp(0.2 * (0.75 + p.skills.ath / 200) * (1 + m.reb * 0.6) * (1 - pr * 0.3), 0.1, 0.36);
    this.inner = this.zw * 0.28;
    this.zc = 0.78;
    this.rate = 0.022 * (1 + pr * 0.5);
    this.i = 0; this.makes = 0; this.posters = 0;
    this.start();
  }
  start() {
    const rng = this.s.run.rng;
    this.pow = 0; this.charging = false; this.res = null; this.f = 0; this.anim = 0;
    this.armed = false;
    // Verteidiger springt zu zufaelligen Zeitpunkten (Ankuendigung "!" kurz vorher)
    this.defJumpAt = rng.int(40, 110); this.defAir = 0; this.clock = 300;
  }
  update() {
    if (this.res) {
      this.anim++;
      if (this.anim === 16) {
        if (this.res.kind === 'dunk' || this.res.kind === 'poster') { sfx.dunk(); sfx.crowd(this.res.kind === 'poster' ? 2 : 1); }
        else sfx.miss();
      }
      if (this.anim === 22 && this.res.kind === 'poster') sfx.fanfare();
      if (this.anim > 60) {
        this.i++;
        if (this.i >= N) {
          this.done = true;
          this.q = clamp((this.makes + 0.3 * this.posters) / N, 0, 1);
          this.resultText = t('arcade.postRes', { n: this.makes, m: N }) + (this.posters ? t('arcade.postPosters', { n: this.posters }) : '');
        } else this.start();
      }
      return;
    }
    this.f++; this.clock--;
    // Verteidiger
    if (this.f >= this.defJumpAt && !this.defAir) { this.defAir = 1; }
    if (this.defAir) { this.defAir++; if (this.defAir > 34) { this.defAir = 0; this.defJumpAt = this.f + this.s.run.rng.int(40, 100); } }
    // Erst laden, wenn SPACE vorher losgelassen war (kein Hineinrutschen aus der letzten Eingabe)
    if (!input.isDown('a')) this.armed = true;
    if (this.armed && input.isDown('a')) {
      this.charging = true;
      this.pow += this.rate;
      if (this.pow > 1.05) this.pow = 0; // ueberladen -> von vorn
    } else if (this.charging) {
      this.release();
    } else if (this.clock <= 0) {
      this.pow = 0.2; this.release();
    }
  }
  release() {
    this.charging = false;
    const h = meterHit(this.pow, this.zc, this.zw, this.inner);
    const contested = this.defAir > 4 && this.defAir < 30;
    let kind;
    if (h.andOne) kind = 'poster';
    else if (h.make && !contested) kind = 'dunk';
    else if (h.make && contested) kind = 'blocked';
    else kind = this.pow < this.zc ? 'short' : 'rimout';
    if (kind === 'dunk' || kind === 'poster') this.makes++;
    if (kind === 'poster') this.posters++;
    this.res = { kind };
    this.anim = 1;
  }
  draw(ctx, tt) {
    const { run, opts } = this.s;
    const p = run.p, team = run.teams[p.teamId], opp = opts.opp;
    tiny(ctx, opts.title.slice(0, 20), 4, 3, C.WHITE);
    tiny(ctx, `${opts.scoreLine[0]}-${opts.scoreLine[1]}`, 4, 10, C.ORANGE);
    // Boden + Korb
    ctx.fillStyle = C.DARK; ctx.fillRect(0, FLOOR, 160, 6);
    ctx.fillStyle = C.WHITE; ctx.fillRect(RIM_X + 14, 14, 2, FLOOR - 14); ctx.fillRect(RIM_X + 10, 12, 3, 26);
    const shake = this.res && (this.res.kind === 'dunk' || this.res.kind === 'poster') && this.anim >= 16 && this.anim < 24 ? 1 : 0;
    ctx.fillStyle = C.ORANGE; ctx.fillRect(RIM_X - 8, RIM_Y + shake, 18, 2);
    ctx.fillStyle = C.WHITE; for (let i = 0; i < 6; i++) ctx.fillRect(RIM_X - 7 + i * 3, RIM_Y + 2 + shake + (i % 2), 1, 6);
    // Verteidiger (vorne, springt)
    const dj = this.defAir ? Math.round(Math.sin(Math.min(1, this.defAir / 34) * Math.PI) * 18) : 0;
    const blockedAnim = this.res && this.res.kind === 'blocked';
    drawSprite(ctx, opp.star.look, opp.colors, 96, FLOOR - 24 - (blockedAnim && this.anim < 20 ? 16 : dj), { frame: this.defAir || blockedAnim ? 'shoot' : idleFrame(tt) });
    if (!this.res && this.defJumpAt - this.f < 14 && this.defJumpAt - this.f > 0) text(ctx, '!', 101, FLOOR - 38, C.ORANGE);
    // Eigener Spieler (Seitenansicht), springt beim Abschluss
    let jy = 0, px = 70;
    if (this.charging) jy = -Math.round(this.pow * 3); // in die Knie
    if (this.res) {
      const k = Math.min(1, this.anim / 16), top = this.res.kind === 'short' ? 12 : 28;
      jy = this.anim < 16 ? Math.round(Math.sin(k * Math.PI / 2) * top) : Math.max(0, top - (this.anim - 16) * 2);
      px = 70 + Math.round(Math.min(1, this.anim / 16) * 30);
    }
    drawSprite(ctx, p.look, team.colors, px, FLOOR - 24 - jy + (this.charging ? 2 : 0), { view: 'side', frame: 'run0', age: p.age });
    // Ball
    if (!this.res || this.anim < 16) ball(ctx, px + 12, FLOOR - 24 - jy + 4);
    else if (this.res.kind === 'dunk' || this.res.kind === 'poster') ball(ctx, RIM_X - 2, Math.min(FLOOR - 5, RIM_Y + (this.anim - 16) * 2));
    else if (this.res.kind === 'blocked') ball(ctx, Math.max(4, px - (this.anim - 16) * 3), Math.min(FLOOR - 5, RIM_Y + (this.anim - 16)));
    else ball(ctx, RIM_X + 6 + (this.anim - 16), Math.min(FLOOR - 5, RIM_Y - 4 + (this.anim - 16) * 2));
    // Steuerung
    box(ctx, 0, 96, 160, 48);
    text(ctx, t('arcade.post', { i: Math.min(this.i + 1, N), n: N }), 8, 103);
    tiny(ctx, `${this.makes}/${N}`, 152, 104, C.ORANGE, 'right');
    drawMeter(ctx, this.pow, this.zc, this.zw, this.inner);
    if (this.res && this.anim > 14) {
      const k = this.res.kind;
      text(ctx, t('arcade.post_' + k), 80, 131, k === 'dunk' || k === 'poster' ? C.ORANGE : C.WHITE, 'center');
    } else tiny(ctx, t('arcade.postHint'), 80, 133, C.WHITE, 'center');
  }
}

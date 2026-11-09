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
    // Ruhige, langsame Drift (Summe weicher Sinuswellen) statt Zufallszittern; Groesse haengt von Druck, Skills und Perks ab
    this.amp = 11 * (1 + pr * 0.8) * clamp(1.3 - (p.skills.clu + p.skills.sho) / 240, 0.6, 1.2) * (1 - clamp(m.ft, 0, 0.6));
    this.i = 0; this.makes = 0; this.swishes = 0;
    this.start();
  }
  start() {
    const rng = this.s.run.rng;
    this.ph = [rng.float(0, 6.3), rng.float(0, 6.3), rng.float(0, 6.3), rng.float(0, 6.3)];
    this.cx = 0; this.cy = 0; // Gegensteuerung des Spielers
    this.f = 0; this.clock = 420; this.fly = 0; this.res = null;
    this.pos();
  }
  pos() {
    const f = this.f, ph = this.ph, grow = 1 + Math.min(1, f / 360) * 0.5;
    const dx = (Math.sin(f * 0.021 + ph[0]) * 0.7 + Math.sin(f * 0.047 + ph[1]) * 0.3) * this.amp * grow;
    const dy = (Math.sin(f * 0.017 + ph[2]) * 0.7 + Math.sin(f * 0.039 + ph[3]) * 0.3) * this.amp * 0.8 * grow;
    this.x = clamp(RX + dx + this.cx, 20, 140);
    this.y = clamp(RY + dy + this.cy, 8, 84);
  }
  update() {
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
    this.f++; this.clock--;
    const sp = 0.55;
    if (input.isDown('left')) this.cx -= sp;
    if (input.isDown('right')) this.cx += sp;
    if (input.isDown('up')) this.cy -= sp;
    if (input.isDown('down')) this.cy += sp;
    this.cx = clamp(this.cx, -40, 40); this.cy = clamp(this.cy, -30, 30);
    this.pos();
    if (input.pressed('a') || this.clock <= 0) {
      const d = Math.hypot(this.x - RX, this.y - RY);
      const make = d < 8, swish = d < 3.5;
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
    // Zielkreis (Trefferbereich)
    ctx.fillStyle = C.DARK;
    for (let k = 0; k < 24; k++) { const r = k / 24 * Math.PI * 2; ctx.fillRect(Math.round(RX + Math.cos(r) * 8), Math.round(RY + Math.sin(r) * 8), 1, 1); }
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
    else { ctx.fillStyle = C.WHITE; ctx.fillRect(12, 120, Math.round(136 * this.clock / 420), 2); }
    tiny(ctx, t('arcade.ftHint'), 80, 133, C.WHITE, 'center');
  }
}

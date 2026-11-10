// Freiwuerfe: Das Fadenkreuz wackelt (Nervositaet). Mit den Pfeilen gegensteuern, SPACE werfen.
import { C, text, tiny, box, ball, platform } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

const RX = 80, RY = 40, N = 3, CLOCK = 270; // 4,5 Sek. pro Freiwurf

export class FreeThrow {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    // Ruhige, langsame Drift (Summe weicher Sinuswellen) statt Zufallszittern; Groesse haengt von Druck, Skills und Perks ab
    // Schwieriger: groessere, schnellere Drift + Zittern; Skills/Perks daempfen weiterhin
    this.amp = 17 * (1 + pr * 0.8) * clamp(1.35 - (p.skills.clu + p.skills.sho) / 240, 0.7, 1.25) * (1 - clamp(m.ft, 0, 0.5));
    this.i = 0; this.makes = 0; this.swishes = 0;
    this.start();
  }
  start() {
    const rng = this.s.run.rng;
    this.ph = Array.from({ length: 6 }, () => rng.float(0, 6.3));
    this.gx = 0; this.gy = 0; this.gtx = 0; this.gty = 0; this.gust = rng.int(30, 70);
    this.cx = 0; this.cy = 0; this.vx = 0; this.vy = 0; // Gegensteuerung mit Traegheit
    this.f = 0; this.clock = CLOCK; this.fly = 0; this.res = null;
    this.pos();
  }
  pos() {
    const f = this.f, ph = this.ph, grow = 1 + Math.min(1, f / 300) * 0.8;
    // langsame Drift + schnelleres Zittern (Nervositaet)
    const dx = (Math.sin(f * 0.026 + ph[0]) * 0.6 + Math.sin(f * 0.061 + ph[1]) * 0.3 + Math.sin(f * 0.13 + ph[4]) * 0.15) * this.amp * grow;
    const dy = (Math.sin(f * 0.022 + ph[2]) * 0.6 + Math.sin(f * 0.053 + ph[3]) * 0.3 + Math.sin(f * 0.11 + ph[5]) * 0.15) * this.amp * 0.8 * grow;
    // ploetzliche "Windstoesse": Ziel springt, Kreuz gleitet weich hinterher
    this.gx += (this.gtx - this.gx) * 0.06; this.gy += (this.gty - this.gy) * 0.06;
    this.x = clamp(RX + dx + this.gx + this.cx, 20, 140);
    this.y = clamp(RY + dy + this.gy + this.cy, 8, 84);
  }
  update() {
    if (this.fly) {
      this.fly++;
      if (this.res.bank) {
        if (this.fly === 24) sfx.hit();
        if (this.fly === 34) { sfx.swish(); sfx.crowd(0.6); }
      } else if (this.fly === 24) { if (this.res.make) { sfx.swish(); sfx.crowd(0.6); } else sfx.miss(); }
      if (this.fly > (this.res.bank ? 60 : 50)) {
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
    if (--this.gust <= 0) {
      const rng = this.s.run.rng;
      this.gust = rng.int(40, 80);
      this.gtx = rng.float(-1, 1) * this.amp * 0.9; this.gty = rng.float(-1, 1) * this.amp * 0.6;
    }
    const sp = 0.16;
    // Steuerung mit Traegheit: man schiesst leicht ueber das Ziel hinaus
    if (input.isDown('left')) this.vx -= sp;
    if (input.isDown('right')) this.vx += sp;
    if (input.isDown('up')) this.vy -= sp;
    if (input.isDown('down')) this.vy += sp;
    this.vx *= 0.88; this.vy *= 0.88;
    this.cx = clamp(this.cx + this.vx, -45, 45); this.cy = clamp(this.cy + this.vy, -35, 35);
    this.pos();
    if (input.pressed('a') || this.clock <= 0) {
      const d = Math.hypot(this.x - RX, this.y - RY);
      const swish = d < 3;
      // Kleines Rechteck am Brett getroffen = Bank Shot (zaehlt voll, nur ohne Swish-Bonus)
      const bank = d >= 7 && this.x >= RX - 8 && this.x <= RX + 8 && this.y >= RY - 14 && this.y <= RY - 2;
      const make = d < 7 || bank;
      if (make) this.makes++;
      if (swish) this.swishes++;
      this.res = { make, swish, bank };
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
    for (let k = 0; k < 24; k++) { const r = k / 24 * Math.PI * 2; ctx.fillRect(Math.round(RX + Math.cos(r) * 7), Math.round(RY + Math.sin(r) * 7), 1, 1); }
    platform(ctx, 30, 92, 26, 4);
    drawSprite(ctx, p.look, team.colors, 14, 46, { view: 'back', frame: this.fly && this.fly < 18 ? 'shoot' : idleFrame(tt), scale: 2, age: p.age });
    if (this.fly) {
      const k = Math.min(1, this.fly / 24);
      const r = this.res;
      if (r.bank && this.fly > 24) {
        // vom Brett zurueck in den Ring, dann durchs Netz
        const k2 = Math.min(1, (this.fly - 24) / 10);
        const bx = this.x - 2 + (RX - 2 - (this.x - 2)) * k2, by = this.y - 2 + (RY - 4 - (this.y - 2)) * k2;
        ball(ctx, Math.round(bx), Math.round(by) + (this.fly > 34 ? Math.min(10, this.fly - 34) : 0));
      } else {
        const tx = r.make && !r.bank ? RX - 2 : this.x - 2, ty = r.make && !r.bank ? RY - 4 : this.y - 2;
        ball(ctx, Math.round(28 + (tx - 28) * k), Math.round(48 + (ty - 48) * k - Math.sin(k * Math.PI) * 24) + (this.fly > 24 && r.make && !r.bank ? Math.min(10, this.fly - 24) : 0));
      }
    } else {
      // Fadenkreuz (Maus: Klick/Halten in eine Richtung lenkt, Klick aufs Kreuz wirft)
      const x = Math.round(this.x), y = Math.round(this.y);
      input.dirPad(x, y, 5, 'both');
      ctx.fillStyle = C.ORANGE;
      ctx.fillRect(x - 4, y, 3, 1); ctx.fillRect(x + 2, y, 3, 1); ctx.fillRect(x, y - 4, 1, 3); ctx.fillRect(x, y + 2, 1, 3);
      ctx.fillStyle = C.WHITE; ctx.fillRect(x, y, 1, 1);
    }
    box(ctx, 0, 96, 160, 48);
    text(ctx, t('arcade.ft', { i: Math.min(this.i + 1, N), n: N }), 8, 103);
    tiny(ctx, `${this.makes}/${N}`, 152, 104, C.ORANGE, 'right');
    if (this.res && this.fly > 20) text(ctx, this.res.swish ? t('arcade.swish') : this.res.bank ? t('arcade.bank') : this.res.make ? t('arcade.make') : t('arcade.miss'), 80, 119, this.res.make ? C.ORANGE : C.WHITE, 'center');
    else { ctx.fillStyle = C.WHITE; ctx.fillRect(12, 120, Math.round(136 * this.clock / CLOCK), 2); }
    tiny(ctx, t('arcade.ftHint'), 80, 133, C.WHITE, 'center');
  }
}

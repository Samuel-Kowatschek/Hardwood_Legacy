// Drive: Seitenansicht, 3 Spuren. HOCH/RUNTER wechselt die Spur, Verteidigern ausweichen, dann Korbleger.
import { C, text, tiny, box, ball, bar } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';
import { drawSprite } from '../sprites/spriteGen.js';

const LANES = [30, 48, 66];
const PX = 18, DUR = 400, RIM_X = 132;

// Korb in Seitenansicht: Ring-Mitte bei rx, Ring auf Hoehe 40
function drawHoop(ctx, rx, shake) {
  const dy = shake ? 1 : 0;
  ctx.fillStyle = C.WHITE;
  ctx.fillRect(rx + 12, 24, 2, 70);          // Pfosten
  ctx.fillRect(rx + 9, 20, 3, 24);           // Brett
  ctx.fillStyle = C.ORANGE;
  ctx.fillRect(rx - 7, 40 + dy, 16, 2);       // Ring
  ctx.fillStyle = C.WHITE;
  for (let i = 0; i < 5; i++) ctx.fillRect(rx - 6 + i * 3, 42 + dy + (i % 2), 1, 6 - (i % 2));
}

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
      const e = this.end;
      if (this.stripped) { if (e > 50) this.finish(); return; }
      // Abschluss: Anlauf -> Absprung -> Dunk (sauber) oder Korbleger (mit Kontakt)
      if (this.hits === 0 && e === 48) { sfx.dunk(); sfx.crowd(1.6); }
      if (this.hits > 0 && e === 52) { sfx.swish(); sfx.crowd(0.8); }
      if (e > 95) this.finish();
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
  // Position von Spieler und Ball waehrend des Abschlusses
  finishPose() {
    const e = this.end, ease = k => k * k * (3 - 2 * k);
    const k1 = Math.min(1, e / 30);
    let px = PX + (RIM_X - 32 - PX) * ease(k1);
    let py = this.y + (48 - this.y) * ease(k1);
    let air = false;
    const dunk = this.hits === 0;
    if (e > 30) {
      air = true;
      const k2 = Math.min(1, (e - 30) / 18); // Absprung bis Frame 48
      px = RIM_X - 32 + 18 * ease(k2);
      const top = dunk ? 26 : 18;
      const hang = dunk && e > 48 && e < 58;
      py = 48 - top * Math.sin(Math.min(1, k2) * Math.PI / 2);
      if (!hang && e >= 58) { const k3 = Math.min(1, (e - 58) / 12); py = 48 - top + top * ease(k3); air = k3 < 1; }
    }
    let bx = px + 13, by = py + 6;
    if (dunk && e >= 48) { bx = RIM_X - 2; by = 36 + Math.min(22, (e - 48) * 2); }
    if (!dunk && e >= 42) {
      const k = Math.min(1, (e - 42) / 10);
      const sx = RIM_X - 32 + 18 + 13, sy = 48 - 18 + 6;
      bx = sx + (RIM_X - 2 - sx) * k; by = sy + (34 - sy) * k - Math.sin(k * Math.PI) * 10;
      if (e >= 52) { bx = RIM_X - 2; by = 34 + Math.min(22, (e - 52) * 2); }
    }
    return { px, py, bx, by, air, rimX: RIM_X, shake: dunk && e >= 48 && e < 56 };
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
    const fin = this.end && !this.stripped ? this.finishPose() : null;
    // Korb erscheint erst, wenn keine Verteidiger mehr kommen, und faehrt an seine Position
    const since = this.f - DUR - 25;
    if (!this.stripped && (since > 0 || this.end)) {
      const rx = fin ? fin.rimX : Math.max(RIM_X, 176 - Math.round(Math.max(0, since) * 0.9));
      drawHoop(ctx, rx, fin && fin.shake);
    }
    const sorted = this.defs.slice().sort((a, b) => a.lane - b.lane);
    for (const d of sorted) drawSprite(ctx, opp.star.look, opp.colors, Math.round(d.x), LANES[d.lane], { frame: Math.floor(tt / 10) % 2 ? 'idle0' : 'idle1' });
    if (fin) {
      drawSprite(ctx, p.look, team.colors, Math.round(fin.px), Math.round(fin.py), { view: 'side', frame: fin.air ? 'run0' : Math.floor(tt / 5) % 2 ? 'run0' : 'run1', age: p.age });
      ball(ctx, Math.round(fin.bx), Math.round(fin.by));
    } else if (!(this.flash && Math.floor(this.flash / 3) % 2)) {
      drawSprite(ctx, p.look, team.colors, PX, Math.round(this.y), { view: 'side', frame: Math.floor(tt / 6) % 2 ? 'run0' : 'run1', age: p.age });
      if (!this.stripped) ball(ctx, PX + 13, Math.round(this.y) + 12 + (Math.floor(tt / 6) % 2) * 4);
    }
    input.dirPad(PX + 8, Math.round(this.y) + 12, 6, 'dominant');
    box(ctx, 0, 96, 160, 48);
    text(ctx, t('arcade.drive'), 8, 103, C.ORANGE);
    tiny(ctx, t('arcade.contact', { n: this.hits }), 152, 104, this.hits ? C.ORANGE : C.WHITE, 'right');
    bar(ctx, 12, 117, 136, 6, prog);
    if (this.end && !this.stripped && this.end > 46) text(ctx, this.hits === 0 ? t('arcade.slam') : t('arcade.layupGood'), 80, 129, C.ORANGE, 'center');
    else if (this.stripped) text(ctx, t('arcade.blocked'), 80, 129, C.WHITE, 'center');
    else tiny(ctx, t('arcade.driveHint'), 80, 131, C.WHITE, 'center');
  }
}

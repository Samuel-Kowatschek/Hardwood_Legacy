// Defense-Stop: Richtungs-Input im Takt. 5 Moves des Gegners lesen.
import { C, text, tiny, box, drawBattle } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';

const DIRS = ['up', 'down', 'left', 'right'];
const LABEL = { up: 'HOCH', down: 'RUNTER', left: 'LINKS', right: 'RECHTS' };

function arrow(ctx, cx, cy, dir, color) {
  ctx.fillStyle = color;
  for (let i = 0; i < 6; i++) {
    const w = 1 + i * 2;
    if (dir === 'up') ctx.fillRect(cx - i, cy - 6 + i, w, 1);
    if (dir === 'down') ctx.fillRect(cx - i, cy + 6 - i, w, 1);
    if (dir === 'left') ctx.fillRect(cx - 6 + i, cy - i, 1, w);
    if (dir === 'right') ctx.fillRect(cx + 6 - i, cy - i, 1, w);
  }
  if (dir === 'up' || dir === 'down') ctx.fillRect(cx - 1, dir === 'up' ? cy : cy - 6, 3, 7);
  else ctx.fillRect(dir === 'left' ? cx : cx - 6, cy - 1, 7, 3);
}

function ring(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  for (let a = 0; a < 48; a++) {
    const t = (a / 48) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(t) * r), Math.round(cy + Math.sin(t) * r), 1, 1);
  }
}

export class DefenseStop {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    this.n = 5; this.i = 0; this.hits = 0; this.perfects = 0;
    this.win = Math.round(clamp(40 * (0.8 + p.skills.def / 250) * (1 + m.def) * (1 - pr * 0.3), 22, 70));
    this.gap = 24; this.f = -30; this.cur = null; this.fb = null;
  }
  update() {
    const rng = this.s.run.rng;
    this.f++;
    if (this.fb && --this.fb.t <= 0) this.fb = null;
    if (!this.cur) {
      if (this.f >= 0) { this.cur = { dir: rng.pick(DIRS), t: 0 }; sfx.blip(); }
      return;
    }
    this.cur.t++;
    let pressed = null;
    for (const d of DIRS) if (input.pressed(d)) pressed = d;
    if (pressed || this.cur.t >= this.win) {
      const ok = pressed === this.cur.dir;
      const perfect = ok && this.cur.t >= this.win * 0.55;
      if (ok) { this.hits++; sfx.hit(); } else sfx.miss();
      if (perfect) this.perfects++;
      this.fb = { t: 20, s: !pressed ? 'ZU LANGSAM' : !ok ? 'FALSCH!' : perfect ? 'STEAL!' : 'GESTOPPT!', ok };
      this.lastDir = this.cur.dir;
      this.cur = null; this.f = -this.gap; this.i++;
      if (this.i >= this.n) {
        this.done = true;
        this.q = clamp((this.hits + 0.2 * this.perfects) / this.n, 0, 1);
        this.resultText = `${this.hits}/${this.n} Moves gestoppt!` + (this.perfects ? ` ${this.perfects} Steals.` : '');
      }
    }
  }
  draw(ctx, t) {
    const dx = this.cur ? (this.cur.dir === 'left' ? -6 : this.cur.dir === 'right' ? 6 : 0) : 0;
    drawBattle(ctx, this.s, t, { oppDx: dx, showHoop: false });
    box(ctx, 0, 96, 160, 48);
    text(ctx, `MOVE ${Math.min(this.i + 1, this.n)}/${this.n}`, 8, 104);
    tiny(ctx, `STOPS ${this.hits}`, 152, 105, C.ORANGE, 'right');
    if (this.cur) {
      const k = 1 - this.cur.t / this.win;
      ring(ctx, 80, 126, 3 + Math.round(12 * k), this.cur.t >= this.win * 0.55 ? C.ORANGE : C.WHITE);
      arrow(ctx, 80, 126, this.cur.dir, C.WHITE);
      tiny(ctx, LABEL[this.cur.dir], 104, 124, C.WHITE);
      arrow(ctx, 96, 40, this.cur.dir, C.ORANGE);
    } else if (this.fb) text(ctx, this.fb.s, 80, 122, this.fb.ok ? C.ORANGE : C.WHITE, 'center');
    else tiny(ctx, 'RICHTUNG IM TAKT DRUECKEN', 80, 124, C.WHITE, 'center');
  }
}

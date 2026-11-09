// Playmaker: Draufsicht. Wird ein Mitspieler frei (sein Verteidiger hilft aus), Pfeil dieses Mitspielers druecken.
// Achtung Fakes: Verteidiger tun so, als wuerden sie weggehen.
import { C, text, tiny, box, ball } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';

const SPOTS = { up: [80, 20], left: [22, 46], right: [138, 46], down: [80, 82] };
const ME = [80, 56];
const DIRS = ['up', 'left', 'right', 'down'];
const N = 4;

function mini(ctx, x, y, jersey, skin = '#c98e5f') {
  ctx.fillStyle = '#0b1026'; ctx.fillRect(x - 3, y - 4, 7, 10);
  ctx.fillStyle = skin; ctx.fillRect(x - 1, y - 3, 3, 3);
  ctx.fillStyle = jersey; ctx.fillRect(x - 2, y, 5, 5);
}
function arrowIcon(ctx, x, y, dir, col) {
  ctx.fillStyle = col;
  for (let i = 0; i < 3; i++) {
    if (dir === 'up') ctx.fillRect(x - i, y + i, 1 + i * 2, 1);
    if (dir === 'down') ctx.fillRect(x - i, y + 2 - i, 1 + i * 2, 1);
    if (dir === 'left') ctx.fillRect(x + i, y - i, 1, 1 + i * 2);
    if (dir === 'right') ctx.fillRect(x + 2 - i, y - i, 1, 1 + i * 2);
  }
}

export class Pass {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    this.win = Math.round(clamp(42 * (0.8 + p.skills.pla / 250) * (1 + m.pass) * (1 - pr * 0.35), 18, 80));
    this.i = 0; this.ok = 0; this.fb = null;
    this.off = { up: 0, left: 0, right: 0, down: 0 }; // wie weit der Verteidiger weg ist (0..1)
    this.round();
  }
  round() {
    const rng = this.s.run.rng;
    this.wait = rng.int(30, 70);
    this.open = null; this.openT = 0;
    this.fake = rng.chance(0.45 + this.s.opts.pressure * 0.3) ? { dir: rng.pick(DIRS), t: 0 } : null;
    this.target = rng.pick(DIRS.filter(d => !this.fake || d !== this.fake.dir));
    this.flight = null;
  }
  update() {
    if (this.flight) {
      if (++this.flight.t > 18) {
        this.flight = null;
        this.i++;
        if (this.i >= N) {
          this.done = true;
          this.q = clamp(this.ok / N, 0, 1);
          this.resultText = t('arcade.passRes', { n: this.ok, m: N });
        } else this.round();
      }
      return;
    }
    if (this.fb && --this.fb.t <= 0) this.fb = null;
    // Verteidiger-Bewegungen
    for (const d of DIRS) {
      const want = this.open === d ? 1 : this.fake && this.fake.dir === d && this.fake.t < 22 ? 0.45 : 0;
      this.off[d] += (want - this.off[d]) * 0.25;
    }
    if (this.fake) this.fake.t++;
    if (this.wait > 0) { this.wait--; if (this.wait === 0) { this.open = this.target; this.openT = 0; } }
    else if (this.open) {
      this.openT++;
      if (this.openT > this.win) { this.miss('slow'); return; }
    }
    let pressed = null;
    for (const d of DIRS) if (input.pressed(d)) pressed = d;
    if (!pressed) return;
    if (this.open && pressed === this.open) {
      this.ok++; sfx.hit(); sfx.crowd(0.5);
      this.fb = { t: 30, s: t('arcade.passGood'), good: true };
      this.flight = { t: 0, to: pressed };
      this.open = null;
    } else this.miss('bad', pressed);
  }
  miss(kind, to) {
    sfx.miss();
    this.fb = { t: 30, s: kind === 'slow' ? t('arcade.passSlow') : t('arcade.passBad'), good: false };
    this.flight = { t: 0, to: to || null, lost: true };
    this.open = null;
  }
  draw(ctx, tt) {
    const { run, opts } = this.s;
    const team = run.teams[run.p.teamId], opp = opts.opp;
    // Halbfeld von oben
    ctx.fillStyle = C.DARK; ctx.fillRect(4, 4, 152, 90);
    ctx.fillStyle = C.WHITE;
    ctx.fillRect(4, 4, 152, 1); ctx.fillRect(62, 4, 1, 34); ctx.fillRect(98, 4, 1, 34); ctx.fillRect(62, 38, 37, 1);
    for (let a = 0; a <= 32; a++) { const r = a / 32 * Math.PI; ctx.fillRect(Math.round(80 - Math.cos(r) * 66), Math.round(4 + Math.sin(r) * 62), 1, 1); }
    ctx.fillStyle = C.ORANGE; ctx.fillRect(77, 7, 7, 2);
    tiny(ctx, opts.title.slice(0, 20), 6, 86, C.WHITE);
    for (const d of DIRS) {
      const [x, y] = SPOTS[d];
      mini(ctx, x, y, team.colors[0]);
      // Verteidiger steht zwischen Mitspieler und Ballfuehrer, rueckt bei "offen" zur Mitte
      const k = 0.28 + this.off[d] * 0.45;
      const dx = Math.round(x + (ME[0] - x) * k), dy = Math.round(y + (ME[1] - y) * k);
      mini(ctx, dx, dy, opp.colors[0]);
      const ax = x + (d === 'left' ? -10 : d === 'right' ? 8 : -1), ay = y + (d === 'up' ? -10 : d === 'down' ? 8 : -1);
      arrowIcon(ctx, ax, ay, d, this.open === d ? C.ORANGE : C.WHITE);
    }
    mini(ctx, ME[0], ME[1], team.colors[0]);
    input.dirPad(ME[0], ME[1], 8, 'dominant');
    if (this.flight && this.flight.to) {
      const [x, y] = SPOTS[this.flight.to];
      const k = Math.min(1, this.flight.t / 12);
      const kk = this.flight.lost ? Math.min(k, 0.5) : k;
      ball(ctx, Math.round(ME[0] + (x - ME[0]) * kk) - 2, Math.round(ME[1] + (y - ME[1]) * kk) - 2);
    } else ball(ctx, ME[0] + 3, ME[1] - 2);
    box(ctx, 0, 96, 160, 48);
    text(ctx, t('arcade.pass', { i: Math.min(this.i + 1, N), n: N }), 8, 103);
    tiny(ctx, `${this.ok}/${N}`, 152, 104, C.ORANGE, 'right');
    if (this.open) { ctx.fillStyle = C.ORANGE; ctx.fillRect(12, 116, Math.round(136 * (1 - this.openT / this.win)), 3); }
    if (this.fb) text(ctx, this.fb.s, 80, 122, this.fb.good ? C.ORANGE : C.WHITE, 'center');
    tiny(ctx, t('arcade.passHint'), 80, 133, C.WHITE, 'center');
  }
}

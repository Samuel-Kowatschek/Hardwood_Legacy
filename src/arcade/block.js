// Rim Protector (Defense): Angreifer springen zum Korb. Unten rechts schrumpft ein Kreis auf eine orange Zone zu.
// SPACE druecken, wenn der Kreis in der Zone ist = Block. Der Kreis zeigt immer den echten Wurfzeitpunkt,
// Pumpfakes (Ball geht runter und kommt spaeter) lassen ihn nur langsamer schrumpfen.
import { C, text, tiny, box, ball } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

const N = 5, FLOOR = 90, RIM_X = 126, RIM_Y = 38;
const LAUNCH_X = 66, AIR = 46, REL = 30, REL_FAKE = 44, JUMP = 22;
const RING_X = 130, RING_Y = 120, R0 = 21, RT = 8; // Kreis: Start- und Zielradius
const eased = k => k * k * (3 - 2 * k);

// Pixel-Kreis (Ring) bzw. gefuellter Ring zwischen r1 und r2
function ring(ctx, cx, cy, r1, r2, col) {
  ctx.fillStyle = col;
  const R = Math.ceil(r2) + 1;
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) {
    const d = Math.hypot(x, y);
    if (d >= r1 && d <= r2) ctx.fillRect(cx + x, cy + y, 1, 1);
  }
}

export class Block {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    // Fenster in Frames um den Wurf: Verteidigung/Athletik/Perks machen es groesser, Druck kleiner
    this.tol = clamp(8 * (0.8 + (p.skills.def + p.skills.ath) / 300) * (1 + m.def) * (1 - pr * 0.2), 5, 13);
    this.speed = 2.2 + pr * 1.0;
    this.i = 0; this.blocks = 0; this.perfects = 0;
    this.fakes = s.run.rng.shuffle([false, false, false, true, true]); // 2 von 5 Angreifern pumpen
    this.start();
  }
  start() {
    this.f = 0; this.phase = 'approach'; this.ax = -14; this.jf = -1; this.pf = null; this.res = null;
    this.fake = this.fakes[this.i]; this.rel = this.fake ? REL_FAKE : REL;
    this.v = (R0 - RT) / this.rel; // Schrumpf-Geschwindigkeit des Kreises (px/Frame)
    this.anim = 0; this.sounded = false;
  }
  radius() { return this.phase === 'approach' ? R0 : Math.max(0, R0 - this.f * this.v); }
  update() {
    this.f++;
    if (this.jf >= 0 && ++this.jf >= JUMP) this.jf = -1;
    if (this.phase === 'approach') {
      this.ax += this.speed;
      if (!this.res && input.pressed('a')) this.press(-1);
      if (this.ax >= LAUNCH_X) { this.phase = 'air'; this.f = 0; sfx.blip(); }
      return;
    }
    if (!this.res && input.pressed('a')) this.press(this.f);
    if (!this.res && this.f > this.rel + this.tol) this.resolve('late'); // verpasst = zu spaet
    // Sound im Moment des Blocks bzw. wenn der Ball am Ring ist
    if (this.res && !this.sounded) {
      const ok = this.res === 'block' || this.res === 'perfect';
      if (ok && this.f >= Math.max(this.rel, this.pf)) { sfx.hit(); sfx.crowd(0.8); this.sounded = true; }
      if (!ok && this.f >= this.rel + 14) { sfx.swish(); this.sounded = true; }
    }
    if (this.phase === 'air' && this.res && this.f > this.rel + 18) this.phase = 'after';
    if (this.phase === 'after' && ++this.anim > 40) {
      this.i++;
      if (this.i >= N) {
        this.done = true;
        this.q = clamp((this.blocks + 0.25 * this.perfects) / N, 0, 1);
        this.resultText = t('arcade.blockRes', { n: this.blocks, m: N });
      } else this.start();
    }
  }
  // SPACE: ein Sprung pro Angreifer; frame -1 = noch vor dem Absprung
  press(frame) {
    this.jf = 0; sfx.blip();
    if (frame < 0) { this.pf = 0; return this.resolve('early'); }
    this.pf = frame;
    const d = this.rel - frame; // + = zu frueh, - = zu spaet
    this.resolve(Math.abs(d) <= 2 ? 'perfect' : Math.abs(d) <= this.tol ? 'block' : d > 0 ? 'early' : 'late');
  }
  resolve(kind) {
    this.res = kind;
    if (kind === 'block' || kind === 'perfect') this.blocks++;
    if (kind === 'perfect') this.perfects++;
  }
  // Ballflug ab dem Wurf (fr = Frames seit Wurf) Richtung Ring
  shotPos(fr, sx, sy) {
    const tx = RIM_X - 2, ty = RIM_Y - 2, k = clamp(fr / 14, 0, 1);
    if (k < 1) return [sx + (tx - sx) * k, sy + (ty - sy) * k - Math.sin(k * Math.PI) * 10];
    return [tx, Math.min(FLOOR - 5, ty + (fr - 14) * 2)];
  }
  draw(ctx, tt) {
    const { run, opts } = this.s;
    const p = run.p, team = run.teams[p.teamId], opp = opts.opp;
    tiny(ctx, opts.title.slice(0, 20), 4, 3, C.WHITE);
    tiny(ctx, `${opts.scoreLine[0]}-${opts.scoreLine[1]}  ${opts.situation}`.slice(0, 36), 4, 10, C.ORANGE);
    const ok = this.res === 'block' || this.res === 'perfect';
    const f = this.f, fr = f - this.rel;
    // Korb + Boden
    ctx.fillStyle = C.DARK; ctx.fillRect(0, FLOOR, 160, 6);
    ctx.fillStyle = C.WHITE; ctx.fillRect(RIM_X + 12, 20, 2, FLOOR - 20); ctx.fillRect(RIM_X + 9, 18, 3, 26);
    const shake = this.res && !ok && fr >= 14 && fr < 22;
    ctx.fillStyle = C.ORANGE; ctx.fillRect(RIM_X - 8, RIM_Y + (shake ? 1 : 0), 17, 2);
    ctx.fillStyle = C.WHITE; for (let i = 0; i < 5; i++) ctx.fillRect(RIM_X - 7 + i * 3, RIM_Y + 2 + (i % 2), 1, 6);

    // Angreifer
    let ax = this.ax, ay = FLOOR - 24, frame = Math.floor(tt / 5) % 2 ? 'run0' : 'run1';
    if (this.phase !== 'approach') {
      const k = Math.min(1, f / AIR);
      ax = LAUNCH_X + (RIM_X - 12 - LAUNCH_X) * eased(k);
      ay = f > AIR ? FLOOR - 24 : FLOOR - 24 - 34 * Math.sin(k * Math.PI);
      frame = 'run0';
    }
    // Ball: in der Hand (Pumpfake: hoch, runter, wieder hoch), ab dem Wurf im Flug
    let bx, by;
    if (this.phase !== 'approach' && fr < 0) {
      const k = f / this.rel;
      const h = this.fake ? (k < 0.45 ? Math.sin(k / 0.45 * Math.PI / 2) * 8 : k < 0.7 ? 8 - Math.sin((k - 0.45) / 0.25 * Math.PI / 2) * 11 : -3 + Math.sin((k - 0.7) / 0.3 * Math.PI / 2) * 14) : Math.sin(k * Math.PI / 2) * 10;
      bx = ax + 12; by = ay + 6 - h;
    } else if (this.phase !== 'approach') {
      const sx = LAUNCH_X + (RIM_X - 12 - LAUNCH_X) * eased(Math.min(1, this.rel / AIR)) + 12;
      const sy = FLOOR - 24 + 6 - 34 * Math.sin(Math.min(1, this.rel / AIR) * Math.PI) - 10;
      const hit = ok ? Math.max(0, this.pf - this.rel) : Infinity; // Moment des Blocks (Frames nach dem Wurf)
      if (fr <= hit) [bx, by] = this.shotPos(fr, sx, sy);
      else {
        // abgewehrt: Ball fliegt zurueck Richtung Mitte und faellt
        const [x0, y0] = this.shotPos(hit, sx, sy), d = fr - hit;
        bx = x0 - d * 2.2; by = Math.min(FLOOR - 5, y0 - Math.sin(Math.min(1, d / 12) * Math.PI / 2) * 6 + Math.max(0, d - 12) * 2.2);
      }
    }
    if (this.phase === 'approach') ball(ctx, Math.round(ax) + 13, FLOOR - 12 + (Math.floor(tt / 5) % 2) * 3);
    drawSprite(ctx, opp.star.look, opp.colors, Math.round(ax), Math.round(ay), { view: 'side', frame });
    if (this.phase !== 'approach') ball(ctx, Math.round(bx), Math.round(by));
    if (this.phase === 'air' && f < 10) text(ctx, '!', Math.round(ax) + 4, Math.round(ay) - 10, C.ORANGE);

    // Eigener Verteidiger (unter dem Korb, schaut nach links; im Sprung Arme hoch)
    const jumping = this.jf >= 0;
    const jy = jumping ? Math.round(Math.sin(this.jf / JUMP * Math.PI) * 30) : 0;
    drawSprite(ctx, p.look, team.colors, 104, FLOOR - 24 - jy, { view: jumping ? 'front' : 'side', frame: jumping ? 'shoot' : idleFrame(tt), flip: !jumping, age: p.age });

    // Anzeige unten: links Text, rechts der Timing-Kreis
    box(ctx, 0, 96, 160, 48);
    text(ctx, t('arcade.blockN', { i: Math.min(this.i + 1, N), n: N }), 8, 102);
    tiny(ctx, t('arcade.blocks', { n: this.blocks }), 8, 112, C.ORANGE);
    const showRes = this.res && (fr >= 0 || this.res === 'early');
    if (showRes) text(ctx, t('arcade.block_' + this.res).slice(0, 11), 8, 121, ok ? C.ORANGE : C.WHITE);
    else tiny(ctx, t('arcade.blockHint'), 8, 123, C.WHITE);
    if (this.fake && this.phase === 'air' && f > 14 && fr < 0 && !this.res) tiny(ctx, t('arcade.blockPump'), 8, 133, C.ORANGE);
    // Zielzone (Breite = Zeitfenster) + schrumpfender Kreis
    const band = this.tol * this.v, active = this.phase !== 'approach';
    ring(ctx, RING_X, RING_Y, Math.max(0, RT - band), RT + band, active ? C.ORANGE : C.DARK);
    ring(ctx, RING_X, RING_Y, RT - 0.5, RT + 0.5, C.WHITE);
    if (!this.res || !showRes) {
      const r = this.radius();
      ring(ctx, RING_X, RING_Y, r - 0.6, r + 0.6, active ? C.WHITE : C.DARK);
    } else {
      // eingefroren beim Druecken
      const r = this.pf != null ? Math.max(0, R0 - this.pf * this.v) : 0;
      if (this.pf != null && Math.floor(tt / 4) % 2) ring(ctx, RING_X, RING_Y, r - 0.6, r + 0.6, ok ? C.WHITE : C.DARK);
    }
  }
}

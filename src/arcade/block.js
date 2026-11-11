// Rim Protector (Defense): Angreifer laufen auf den Korb zu und springen ab. SPACE = Sprung. Triff den Ball
// beim Wurf in der Luft (Block). Zu frueh oder zu spaet = Korb. Einige Angreifer machen eine Pumpfake:
// der Ball geht erst runter und kommt spaeter - nicht darauf hereinfallen!
import { C, text, tiny, box, ball } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

const N = 5, FLOOR = 90, RIM_X = 126, RIM_Y = 38;
const LAUNCH_X = 66, AIR = 46, REL = 30, REL_FAKE = 44, JUMP = 28, APEX = 14;
const eased = k => k * k * (3 - 2 * k);

export class Block {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    // Fenster (in Frames um den Scheitelpunkt des eigenen Sprungs): Verteidigung/Athletik/Perks machen es groesser
    this.tol = clamp(6 * (0.75 + (p.skills.def + p.skills.ath) / 330) * (1 + m.def) * (1 - pr * 0.25), 3.5, 11);
    this.speed = 2.2 + pr * 1.2;
    this.i = 0; this.blocks = 0; this.perfects = 0; this.log = [];
    // 2 von 5 Angreifern pumpen
    const rng = s.run.rng;
    this.fakes = rng.shuffle([false, false, false, true, true]);
    this.start();
  }
  start() {
    this.f = 0; this.phase = 'approach'; this.ax = -14; this.jf = -1; this.pressedAt = null; this.res = null;
    this.fake = this.fakes[this.i]; this.rel = this.fake ? REL_FAKE : REL;
    this.wait = 0; this.anim = 0; this.resolved = false;
  }
  update() {
    const rng = this.s.run.rng;
    this.f++;
    if (this.phase === 'approach') {
      this.ax += this.speed;
      this.checkPress(0);
      if (this.ax >= LAUNCH_X) { this.phase = 'air'; this.f = 0; sfx.blip(); }
    } else if (this.phase === 'air') {
      this.checkPress(this.f);
      if (this.f === this.rel && !this.resolved) this.resolve();
      if (this.f > this.rel + 16) this.phase = 'after';
      if (this.jf >= 0) this.jf++;
    } else if (this.phase === 'after') {
      this.anim++;
      if (this.jf >= 0) this.jf++;
      if (this.anim === 2) {
        if (this.res.kind === 'block' || this.res.kind === 'perfect') { sfx.hit(); sfx.crowd(0.8); }
        else { sfx.swish(); }
      }
      if (this.anim > 46) {
        this.i++;
        if (this.i >= N) {
          this.done = true;
          this.q = clamp((this.blocks + 0.25 * this.perfects) / N, 0, 1);
          this.resultText = t('arcade.blockRes', { n: this.blocks, m: N });
        } else this.start();
      }
    }
    if (this.jf >= JUMP) this.jf = -1;
  }
  // SPACE: ein Sprung pro Angreifer (frame = Frames seit dem Absprung des Angreifers)
  checkPress(frame) {
    if (this.pressedAt === null && input.pressed('a')) {
      this.pressedAt = frame; this.jf = 0; sfx.blip();
      // gedrueckt vor dem Absprung zaehlt negativ
      if (this.phase === 'approach') this.pressedAt = -Math.max(1, Math.round((LAUNCH_X - this.ax) / this.speed));
    }
  }
  resolve() {
    this.resolved = true;
    const tp = this.pressedAt;
    let kind;
    if (tp === null) kind = 'nojump';
    else {
      const d = (this.rel) - (tp + APEX);       // + = Sprung war zu frueh (Scheitel vor dem Wurf), - = zu spaet
      if (Math.abs(d) <= 2) kind = 'perfect';
      else if (Math.abs(d) <= this.tol) kind = 'block';
      else kind = d > 0 ? 'early' : 'late';
    }
    this.res = { kind };
    if (kind === 'block' || kind === 'perfect') this.blocks++;
    if (kind === 'perfect') this.perfects++;
  }
  draw(ctx, tt) {
    const { run, opts } = this.s;
    const p = run.p, team = run.teams[p.teamId], opp = opts.opp;
    tiny(ctx, opts.title.slice(0, 20), 4, 3, C.WHITE);
    tiny(ctx, `${opts.scoreLine[0]}-${opts.scoreLine[1]}  ${opts.situation}`.slice(0, 36), 4, 10, C.ORANGE);
    // Korb + Boden
    ctx.fillStyle = C.DARK; ctx.fillRect(0, FLOOR, 160, 6);
    ctx.fillStyle = C.WHITE; ctx.fillRect(RIM_X + 12, 20, 2, FLOOR - 20); ctx.fillRect(RIM_X + 9, 18, 3, 26);
    const scored = this.res && !['block', 'perfect'].includes(this.res.kind) && this.phase === 'after' && this.anim > 14;
    ctx.fillStyle = C.ORANGE; ctx.fillRect(RIM_X - 8, RIM_Y + (scored && this.anim < 22 ? 1 : 0), 17, 2);
    ctx.fillStyle = C.WHITE; for (let i = 0; i < 5; i++) ctx.fillRect(RIM_X - 7 + i * 3, RIM_Y + 2 + (i % 2), 1, 6);

    // Angreifer
    let ax = this.ax, ay = FLOOR - 24, view = 'side', frame = Math.floor(tt / 5) % 2 ? 'run0' : 'run1', bx = 0, by = 0, ballFree = false;
    const f = this.f;
    if (this.phase !== 'approach') {
      const k = Math.min(1, f / AIR);
      ax = LAUNCH_X + (RIM_X - 12 - LAUNCH_X) * eased(Math.min(1, f / AIR));
      ay = FLOOR - 24 - 34 * Math.sin(Math.min(1, k) * Math.PI);
      frame = 'run0';
      if (this.phase === 'after' && f > AIR) ay = FLOOR - 24;
    }
    // Ball in der Hand: Normal hoch zum Wurf, Pumpfake: hoch, runter, wieder hoch
    const hand = (h) => [ax + 12, ay + 6 - h];
    let h = 0;
    if (this.phase === 'air') {
      const k = f / this.rel;
      h = this.fake ? (k < 0.45 ? Math.sin(k / 0.45 * Math.PI / 2) * 8 : k < 0.7 ? 8 - Math.sin((k - 0.45) / 0.25 * Math.PI / 2) * 11 : -3 + Math.sin((k - 0.7) / 0.3 * Math.PI / 2) * 14) : Math.sin(Math.min(1, k) * Math.PI / 2) * 10;
    } else if (this.phase === 'after') h = 11;
    [bx, by] = hand(h);
    if (this.phase === 'after' || (this.phase === 'air' && f >= this.rel)) ballFree = true;
    if (this.phase !== 'approach' && this.phase !== 'air' || (this.phase === 'air' && f >= this.rel)) {
      // Flug des Balls ab dem Wurf
      const fr = this.phase === 'air' ? f - this.rel : 16 + this.anim;
      const sx = ax + 12, sy = FLOOR - 24 + 6 - 34 * Math.sin(Math.min(1, this.rel / AIR) * Math.PI) - 11;
      const k = clamp(fr / 14, 0, 1);
      if (this.res && (this.res.kind === 'block' || this.res.kind === 'perfect')) {
        // abgewehrt: Ball fliegt zurueck Richtung Mitte und faellt
        const t2 = fr;
        bx = sx - t2 * 2.2; by = Math.min(FLOOR - 5, sy - Math.sin(Math.min(1, t2 / 12) * Math.PI / 2) * 6 + Math.max(0, t2 - 12) * 2.2);
      } else if (this.res) {
        const tx = RIM_X - 2, ty = RIM_Y - 2;
        if (k < 1) { bx = sx + (tx - sx) * k; by = sy + (ty - sy) * k - Math.sin(k * Math.PI) * 10; }
        else { bx = tx; by = Math.min(FLOOR - 5, ty + (fr - 14) * 2); }
      }
    }
    if (this.phase === 'approach') ball(ctx, Math.round(ax) + 13, FLOOR - 12 + (Math.floor(tt / 5) % 2) * 3);
    drawSprite(ctx, opp.star.look, opp.colors, Math.round(ax), Math.round(ay), { view, frame });
    if (this.phase !== 'approach') ball(ctx, Math.round(bx), Math.round(by));
    // Absprung-Hinweis
    if (this.phase === 'air' && f < 10) text(ctx, '!', Math.round(ax) + 4, Math.round(ay) - 10, C.ORANGE);

    // Eigener Verteidiger (unter dem Korb, schaut nach links; im Sprung Arme hoch)
    const jumping = this.jf >= 0;
    const jy = jumping ? Math.round(Math.sin(Math.min(1, this.jf / JUMP) * Math.PI) * 30) : 0;
    drawSprite(ctx, p.look, team.colors, 104, FLOOR - 24 - jy, { view: jumping ? 'front' : 'side', frame: jumping ? 'shoot' : idleFrame(tt), flip: !jumping, age: p.age });

    // Anzeige unten
    box(ctx, 0, 96, 160, 48);
    text(ctx, t('arcade.blockN', { i: Math.min(this.i + 1, N), n: N }), 8, 103);
    tiny(ctx, t('arcade.blocks', { n: this.blocks }), 152, 104, C.ORANGE, 'right');
    if (this.res && (this.phase === 'after' || f > this.rel)) {
      const k = this.res.kind;
      text(ctx, t('arcade.block_' + k), 80, 121, k === 'block' || k === 'perfect' ? C.ORANGE : C.WHITE, 'center');
    } else tiny(ctx, t('arcade.blockHint'), 80, 124, C.WHITE, 'center');
    tiny(ctx, this.fake && this.phase === 'air' && f > 18 && f < this.rel ? t('arcade.blockPump') : '', 80, 134, C.ORANGE, 'center');
  }
}

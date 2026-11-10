// Dunk Contest (All-Star Weekend): kein Verteidiger, nichts ist blockbar - ein Dunk geht rein oder daneben.
// 3 Runden: pro Runde einen Dunk waehlen (schwerer = mehr Punkte), Marker in der Zone stoppen, 5 Judges bewerten.
import { C, text, tiny, box, ball, drawMeter, meterHit } from './common.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { t } from '../i18n/index.js';
import { drawSprite } from '../sprites/spriteGen.js';

// base = Punkte (max. 50), zone = Treffer-Zone, speed = Marker-Tempo, from = Absprungpunkt (je weiter, desto schwerer)
export const DUNKS = [
  { id: 'tomahawk', base: 38, zone: 0.30, speed: 0.016, from: 84 },
  { id: 'windmill', base: 43, zone: 0.22, speed: 0.022, from: 78 },
  { id: 'legs', base: 46, zone: 0.16, speed: 0.028, from: 76 },
  { id: 'spin', base: 48, zone: 0.115, speed: 0.034, from: 72 },
  { id: 'line', base: 50, zone: 0.08, speed: 0.040, from: 52 },
];
const ROUNDS = 3, HOOP_X = 124, RIM_Y = 36, FLOOR = 90, START_X = 10;
const MISS_SCORE = 20, MAX = ROUNDS * 50;

// Buehne (auch fuer das Intro): Publikum, Korb, Boden, Judges-Tische
export function drawDunkStage(ctx, s, tt, gm = null) {
  const loud = gm && gm.cheer > 0;
  for (let y = 0; y < 3; y++) for (let x = 0; x < 40; x++) {
    const on = (x * 7 + y * 3 + Math.floor(tt / (loud ? 4 : 20))) % 5 === 0;
    ctx.fillStyle = on ? C.WHITE : C.DARK;
    ctx.fillRect(x * 4 + (y % 2) * 2, 1 + y * 4, 2, 2);
  }
  ctx.fillStyle = C.DARK; ctx.fillRect(0, FLOOR, 160, 6);
  ctx.fillStyle = C.WHITE;
  ctx.fillRect(HOOP_X + 12, 20, 2, FLOOR - 20); ctx.fillRect(HOOP_X + 9, 16, 3, 28);
  const shake = gm && gm.shake > 0 ? 1 : 0;
  ctx.fillStyle = C.ORANGE; ctx.fillRect(HOOP_X - 8, RIM_Y + shake, 17, 2);
  ctx.fillStyle = C.WHITE; for (let i = 0; i < 5; i++) ctx.fillRect(HOOP_X - 7 + i * 3, RIM_Y + 2 + shake + (i % 2), 1, 6);
}

export class DunkContest {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    // Athletik und Perks (Spring Legs ...) machen die Zonen groesser
    this.zoneMul = clamp((0.75 + p.skills.ath / 190) * (1 + m.fast) * (1 - pr * 0.25), 0.6, 1.5);
    this.round = 0; this.total = 0; this.phase = 'pick'; this.i = 0; this.scores = [];
    this.judges = []; this.cheer = 0; this.shake = 0;
    this.reset();
  }
  reset() {
    this.f = 0; this.mark = 0; this.dir = 1; this.res = null; this.shown = 0; this.d = null; this.armed = false;
  }
  get dunk() { return DUNKS[this.i]; }
  update() {
    if (this.cheer > 0) this.cheer--;
    if (this.shake > 0) this.shake--;
    this.f++;
    if (this.phase === 'pick') {
      if (input.pressed('down')) { this.i = (this.i + 1) % DUNKS.length; sfx.blip(); }
      if (input.pressed('up')) { this.i = (this.i + DUNKS.length - 1) % DUNKS.length; sfx.blip(); }
      if (this.clickRow != null) { this.i = this.clickRow; this.clickRow = null; this.choose(); return; }
      if (input.pressed('a')) this.choose();
    } else if (this.phase === 'run') {
      // Anlauf, dann Marker; Taste erst nach dem Loslassen wieder gueltig
      if (!input.isDown('a')) this.armed = true;
      if (this.f > 34) {
        this.phase = 'meter'; this.f = 0; this.mark = 0; this.dir = 1; this.armed = this.armed && !input.isDown('a');
      }
    } else if (this.phase === 'meter') {
      const d = this.d;
      this.mark += d.speed * this.dir;
      if (this.mark > 1) { this.mark = 1; this.dir = -1; } else if (this.mark < 0) { this.mark = 0; this.dir = 1; }
      if (!input.isDown('a')) this.armed = true;
      if ((this.armed && this.f > 8 && input.pressed('a')) || this.f > 260) this.jump();
    } else if (this.phase === 'air') {
      if (this.f === 30 && this.res.made) { sfx.dunk(); this.shake = 10; this.cheer = 70; sfx.crowd(1.4); }
      if (this.f === 30 && !this.res.made) sfx.miss();
      if (this.f > 62) { this.phase = 'judges'; this.f = 0; this.deal(); }
    } else if (this.phase === 'judges') {
      if (this.f % 12 === 0 && this.shown < 5) { this.shown++; sfx.tick(); }
      if (this.shown >= 5 && this.f > 80) this.next();
    }
  }
  choose() {
    sfx.select();
    this.d = this.dunk;
    this.phase = 'run'; this.f = 0; this.armed = false;
  }
  jump() {
    const d = this.d, zone = clamp(d.zone * this.zoneMul, 0.05, 0.5);
    const h = meterHit(this.mark, 0.5, zone, zone * 0.25);
    this.res = { made: h.make && this.f <= 260, perfect: h.andOne && this.f <= 260, zone };
    this.phase = 'air'; this.f = 0;
    sfx.blip();
  }
  // Judges: Summe = Punkte der Runde (Fehlversuch = Mitleidspunkte), Perfekt = +2 (max. 50)
  deal() {
    const d = this.d, r = this.res, rng = this.s.run.rng;
    const score = r.made ? Math.min(50, d.base + (r.perfect ? 2 : 0)) : MISS_SCORE;
    this.score = score;
    const base = Math.floor(score / 5);
    const cards = Array(5).fill(base);
    let rest = score - base * 5, k = 0;
    while (rest > 0) { cards[(k++ + rng.int(0, 4)) % 5]++; rest--; }
    this.judges = cards;
    this.scores.push(score); this.total += score;
  }
  next() {
    this.round++;
    if (this.round >= ROUNDS) {
      this.done = true;
      // 90 Punkte (3x Fehlversuch/leicht) = 0, 150 = 1 -> Sieg ab ca. 135 (nur schwere Dunks)
      this.q = clamp((this.total / MAX - 0.6) / 0.4, 0, 1);
      this.resultText = t('arcade.dkRes', { s: this.total, m: MAX });
    } else { this.phase = 'pick'; this.reset(); }
  }
  // Absprung-/Landeposition, abhaengig vom Dunk
  pose(tt) {
    const d = this.d || this.dunk, ph = this.phase, f = this.f;
    const ease = k => k * k * (3 - 2 * k);
    let x = START_X, y = FLOOR - 24, view = 'side', flip = false, frame = 'run0', ballPos = null;
    if (ph === 'run') {
      const k = Math.min(1, f / 34);
      x = START_X + (d.from - START_X) * ease(k);
      frame = Math.floor(tt / 5) % 2 ? 'run0' : 'run1';
    } else if (ph === 'meter') {
      x = d.from; frame = 'run0';
    } else if (ph === 'air' || ph === 'judges') {
      const k = ph === 'air' ? Math.min(1, f / 30) : 1;
      const endX = HOOP_X - 16;
      x = d.from + (endX - d.from) * ease(k);
      const apex = (d.id === 'tomahawk' ? 34 : d.id === 'line' ? 40 : 38) * (this.res.made ? 1 : 0.85);
      // Steigflug bis zum Ring (Frame 30), kurz haengen, dann fallen
      y = FLOOR - 24 - apex * Math.sin(Math.min(1, k) * Math.PI / 2);
      if (ph === 'air' && f > 38) y = FLOOR - 24 - apex + Math.min(apex, (f - 38) * 1.7);
      if (ph === 'judges') { y = FLOOR - 24; x = endX; }
      // Pose je Dunk
      if (ph === 'air' && k < 1) {
        if (d.id === 'windmill') { view = Math.floor(f / 4) % 2 ? 'front' : 'side'; frame = 'shoot'; }
        else if (d.id === 'spin') { const seq = ['front', 'side', 'back', 'side']; view = seq[Math.floor(f / 5) % 4]; flip = Math.floor(f / 5) % 4 === 3; frame = 'shoot'; }
        else if (d.id === 'line') { view = k < 0.7 ? 'front' : 'side'; frame = 'shoot'; }
        else if (d.id === 'legs') { view = 'side'; frame = 'run1'; }
      }
      if (ph === 'air') {
        const bx = x + 12, by = y + 6;
        if (d.id === 'legs' && k < 0.85) ballPos = [x + 6 + Math.round(Math.sin(f * 0.6) * 5), y + 16];
        else if (d.id === 'windmill' && k < 0.85) ballPos = [x + 8 + Math.round(Math.cos(f * 0.5) * 7), y + 4 + Math.round(Math.sin(f * 0.5) * 7)];
        else ballPos = [bx, by];
        if (k >= 1) {
          if (this.res.made) ballPos = [HOOP_X - 2, Math.min(FLOOR - 5, RIM_Y + (f - 30) * 2)];
          else ballPos = [HOOP_X + 4 + (f - 30) * 2, Math.min(FLOOR - 5, RIM_Y - 6 + (f - 30) * 1.4 + (Math.abs(Math.sin((f - 30) / 5)) * -6))];
        }
      }
    }
    return { x, y, view, flip, frame, ballPos };
  }
  draw(ctx, tt) {
    const { run, opts } = this.s;
    const p = run.p, team = run.teams[p.teamId];
    drawDunkStage(ctx, this.s, tt, this);
    tiny(ctx, opts.title.slice(0, 20), 80, 16, C.ORANGE, 'center');
    // Judges-Tisch (oben rechts im Bild, nach der Wertung sichtbar)
    if (this.phase === 'judges') {
      for (let j = 0; j < 5; j++) {
        const x = 8 + j * 21;
        ctx.fillStyle = C.WHITE; ctx.fillRect(x, 26, 18, 18);
        ctx.fillStyle = C.DARK; ctx.fillRect(x + 1, 27, 16, 16);
        if (j < this.shown) text(ctx, String(this.judges[j]), x + 9, 31, C.ORANGE, 'center'); // mittig auch bei 10
      }
      if (this.shown >= 5) text(ctx, t('arcade.dkScore', { s: this.score }), 59, 56, this.res.made ? C.ORANGE : C.WHITE, 'center');
    }
    // Spieler (Seitenansicht) + Ball
    if (this.phase !== 'pick') {
      const ps = this.pose(tt);
      drawSprite(ctx, p.look, team.colors, Math.round(ps.x), Math.round(ps.y), { view: ps.view, frame: ps.frame, age: p.age, flip: ps.flip });
      if (this.phase === 'run' || this.phase === 'meter') ball(ctx, Math.round(ps.x) + 13, Math.round(ps.y) + 12 + (Math.floor(tt / 6) % 2) * 3);
      else if (ps.ballPos && this.phase === 'air') ball(ctx, Math.round(ps.ballPos[0]), Math.round(ps.ballPos[1]));
    } else {
      drawSprite(ctx, p.look, team.colors, START_X, FLOOR - 24, { view: 'side', frame: 'run0', age: p.age });
      ball(ctx, START_X + 13, FLOOR - 12);
    }
    // Unterer Bereich
    box(ctx, 0, 96, 160, 48);
    text(ctx, t('arcade.dkRound', { i: Math.min(this.round + 1, ROUNDS), n: ROUNDS }), 8, 103);
    tiny(ctx, t('arcade.dkTotal', { s: this.total }), 152, 104, C.ORANGE, 'right');
    if (this.phase === 'pick') this.drawPicker(ctx);
    else if (this.phase === 'run') tiny(ctx, t(`arcade.dunks.${this.d.id}`).toUpperCase(), 80, 123, C.WHITE, 'center');
    else if (this.phase === 'meter') {
      const zone = clamp(this.d.zone * this.zoneMul, 0.05, 0.5);
      drawMeter(ctx, this.mark, 0.5, zone, zone * 0.25);
      tiny(ctx, `${t(`arcade.dunks.${this.d.id}`).toUpperCase()}  -  ${t('arcade.dkHint')}`, 80, 133, C.WHITE, 'center');
    } else if (this.phase === 'air' && this.f > 28) {
      const r = this.res;
      text(ctx, r.made ? (r.perfect ? t('arcade.dkPerfect') : t('arcade.dkMade')) : t('arcade.dkMiss'), 80, 120, r.made ? C.ORANGE : C.WHITE, 'center');
    }
  }
  drawPicker(ctx) {
    DUNKS.forEach((d, k) => {
      const y = 112 + k * 6;
      input.region(6, y - 1, 148, 7, () => { if (this.i !== k) { this.i = k; sfx.blip(); } }, () => { this.clickRow = k; });
      const col = k === this.i ? C.ORANGE : C.WHITE;
      if (k === this.i) { ctx.fillStyle = C.ORANGE; ctx.fillRect(8, y + 1, 2, 3); }
      tiny(ctx, t(`arcade.dunks.${d.id}`).toUpperCase().slice(0, 22), 13, y, col);
      tiny(ctx, '*'.repeat(k + 1), 118, y, col, 'right');
      tiny(ctx, `${d.base} ${t('arcade.dkPts')}`, 152, y, col, 'right');
    });
  }
}

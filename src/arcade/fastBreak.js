// Fast-Break: A haemmern fuer Tempo, dann A im richtigen Moment fuer den Dunk.
import { C, text, tiny, box, ball, drawMeter, MX, MW } from './common.js';
import { t } from '../i18n/index.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { clamp } from '../systems/rng.js';
import { drawSprite } from '../sprites/spriteGen.js';

const GOAL = 104;

export class FastBreak {
  constructor(s) {
    this.s = s;
    const p = s.run.p, m = s.opts.mods, pr = s.opts.pressure;
    this.phase = 'run'; this.f = 0; this.x = 4; this.speed = 0;
    this.boost = 0.42 * (1 + m.fast) * (0.85 + p.skills.ath / 300);
    this.chaseX = -20; this.chaseV = 0.55 + pr * 0.5;
    this.win = clamp(0.2 * (0.8 + p.skills.ath / 250) * (1 + m.fast) * (1 - pr * 0.3), 0.08, 0.4);
    this.tm = 0; this.tdir = 1;
  }
  update() {
    this.f++;
    if (this.phase === 'run') {
      if (input.pressed('a')) { this.speed = Math.min(2.6, this.speed + this.boost); sfx.tick(); }
      this.speed *= 0.95;
      this.x += this.speed;
      this.chaseX += this.chaseV;
      if (this.x >= GOAL || this.f >= 200) {
        this.mash = this.x >= GOAL ? clamp(1 - (this.f - 70) / 260, 0.5, 1) : clamp(this.x / GOAL, 0, 1) * 0.6;
        this.caught = this.chaseX >= this.x - 6;
        // Kurze Pause "DUNK IT NOW!", damit das Haemmern nicht in den Timing-Check rutscht
        this.phase = 'ready'; this.f = 0; this.armed = false;
        sfx.blip();
      }
    } else if (this.phase === 'ready') {
      // Eingaben ignorieren; weiter erst, wenn man ~0,4 Sek. nicht mehr gedrueckt hat (Haemmern beendet)
      this.quiet = input.pressed('a') || input.isDown('a') ? 0 : (this.quiet || 0) + 1;
      if (this.f > 40 && this.quiet >= 25) { this.phase = 'jump'; this.f = 0; sfx.select(); }
    } else if (this.phase === 'jump') {
      this.tm += 0.03 * this.tdir;
      if (this.tm > 1) { this.tm = 1; this.tdir = -1; } else if (this.tm < 0) { this.tm = 0; this.tdir = 1; }
      if (!input.isDown('a')) this.armed = true;
      if ((this.armed && this.f > 10 && input.pressed('a')) || this.f > 150) {
        const d = Math.abs(this.tm - 0.5);
        this.timing = this.f > 150 ? 0.1 : d <= this.win / 8 ? 1 : d <= this.win / 2 ? 0.85 : d <= this.win ? 0.5 : 0.15;
        this.phase = 'dunk'; this.f = 0;
        if (this.timing >= 0.85) { sfx.dunk(); sfx.crowd(1.5); if (this.timing >= 1) sfx.fanfare(); } else if (this.timing >= 0.5) sfx.swish(); else sfx.miss();
      }
    } else if (this.f > 60) {
      this.done = true;
      this.q = clamp(0.4 * this.mash + 0.6 * this.timing - (this.caught ? 0.1 : 0), 0, 1);
      this.resultText = this.timing >= 1 ? t('arcade.fastPoster') : this.timing >= 0.85 ? t('arcade.fastDunk') : this.timing >= 0.5 ? t('arcade.fastLay') : t('arcade.fastBlock');
    }
  }
  draw(ctx, tt) {
    const { run, opts } = this.s;
    const p = run.p, team = run.teams[p.teamId], opp = opts.opp;
    // Court in Seitenansicht
    ctx.fillStyle = C.DARK; ctx.fillRect(0, 74, 160, 22);
    ctx.fillStyle = C.WHITE; ctx.fillRect(0, 74, 160, 1);
    for (let i = 0; i < 8; i++) ctx.fillRect(((i * 24 - Math.floor(this.x * 0.5)) % 192 + 192) % 192 - 16, 84, 10, 1);
    ctx.fillStyle = C.WHITE; ctx.fillRect(150, 14, 2, 60); ctx.fillRect(146, 14, 2, 16);
    ctx.fillStyle = C.ORANGE; ctx.fillRect(134, 30, 12, 2);
    ctx.fillStyle = C.WHITE; for (let i = 0; i < 4; i++) ctx.fillRect(136 + i * 3, 32 + (i % 2), 1, 5);
    tiny(ctx, opts.title.slice(0, 20), 4, 4, C.WHITE);
    tiny(ctx, `${opts.scoreLine[0]}-${opts.scoreLine[1]}  ${opts.situation}`.slice(0, 36), 4, 11, C.ORANGE);
    // Verfolger
    if (this.phase === 'run') {
      drawSprite(ctx, opp.star.look, opp.colors, Math.round(this.chaseX), 50, { view: 'side', frame: Math.floor(tt / 8) % 2 ? 'run0' : 'run1' });
      drawSprite(ctx, p.look, team.colors, Math.round(this.x), 50, { view: 'side', frame: Math.floor(tt / (this.speed > 1 ? 4 : 8)) % 2 ? 'run0' : 'run1', age: p.age });
      ball(ctx, Math.round(this.x) + 12, 62 + (Math.floor(tt / 6) % 2) * 6);
    } else {
      const k = this.phase === 'ready' ? 0 : this.phase === 'jump' ? Math.min(1, this.f / 20) : 1;
      const jx = GOAL + 6 * k, jy = 50 - 22 * k + (this.phase === 'dunk' ? Math.min(22, this.f) : 0);
      drawSprite(ctx, p.look, team.colors, Math.round(jx), Math.round(jy), { view: 'side', frame: 'run0', age: p.age });
      if (this.phase === 'jump' || this.phase === 'ready' || this.f < 10) ball(ctx, Math.round(jx) + 13, Math.round(jy) + 6);
      else if (this.timing >= 0.5) ball(ctx, 138, Math.min(70, 34 + this.f));
      else ball(ctx, Math.max(60, 130 - this.f * 2), 40 + this.f);
    }
    box(ctx, 0, 96, 160, 48);
    if (this.phase === 'run') {
      text(ctx, t('arcade.mash'), 8, 104, C.ORANGE);
      ctx.fillStyle = C.WHITE; ctx.fillRect(11, 117, 138, 8);
      ctx.fillStyle = C.DARK; ctx.fillRect(12, 118, 136, 6);
      ctx.fillStyle = C.ORANGE; ctx.fillRect(12, 118, Math.round(136 * clamp(this.x / GOAL, 0, 1)), 6);
      tiny(ctx, t('arcade.speed'), 12, 129);
      ctx.fillStyle = C.WHITE; ctx.fillRect(36, 129, Math.round(this.speed / 2.6 * 112), 4);
    } else if (this.phase === 'ready') {
      if (Math.floor(this.f / 6) % 2 === 0) text(ctx, t('arcade.dunkNow'), 80, 112, C.ORANGE, 'center');
      tiny(ctx, t('arcade.getReady'), 80, 130, C.WHITE, 'center');
    } else if (this.phase === 'jump') {
      text(ctx, t('arcade.now'), 8, 104, C.ORANGE);
      drawMeter(ctx, this.tm, 0.5, this.win, this.win / 4);
      tiny(ctx, t('arcade.center'), 80, 133, C.WHITE, 'center');
    } else {
      text(ctx, this.timing >= 1 ? t('arcade.poster') : this.timing >= 0.85 ? t('arcade.slam') : this.timing >= 0.5 ? t('arcade.layup') : t('arcade.blocked'), 80, 116, this.timing >= 0.5 ? C.ORANGE : C.WHITE, 'center');
    }
  }
}

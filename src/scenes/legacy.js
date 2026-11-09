// Legacy-Screen: Berechnung -> Trading-Card. PNG-Export + Seed kopieren.
import { Scene } from './scene.js';
import { C, W, H, text, tiny, box, cursor, ball } from '../gfx.js';
import { header, bigText, TextBox } from '../ui.js';
import { input } from '../input.js';
import { sfx, playMusic } from '../systems/audio.js';
import { save } from '../systems/save.js';
import { legacy } from '../systems/legacy.js';
import { archetypeById, ARCHETYPES } from '../data/archetypes.js';
import { PERKS } from '../data/perks.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

const MENU = ['NEU', 'PNG', 'SEED', 'MENUE'];

export class LegacyScene extends Scene {
  constructor(run) {
    super();
    this.run = run;
    this.lg = legacy(run);
    this.phase = 'calc';
    this.i = 0;
    this.note = '';
    this.unlocks = [];
    this.saved = false;
  }
  enter() {
    playMusic('title');
    if (this.saved) return;
    this.saved = true;
    const run = this.run, p = run.p, lg = this.lg;
    const meta = save.meta();
    const metaBefore = { ...meta, unlocked: meta.unlocked.slice() };
    meta.runs++;
    meta.best = Math.max(meta.best, lg.score);
    meta.totalRings += p.awards.rings;
    meta.fmvps += p.awards.fmvp;
    meta.bestTier = Math.max(meta.bestTier, lg.tier.idx);
    for (const x of [...ARCHETYPES, ...PERKS]) {
      if (x.unlock && !x.unlock.test(metaBefore) && !meta.unlocked.includes(x.id) && x.unlock.test(meta)) {
        meta.unlocked.push(x.id);
        this.unlocks.push(x.name);
      }
    }
    save.setMeta(meta);
    const team = run.teams[p.teamId];
    this.rank = save.addHof({
      first: p.first, last: p.last, look: p.look, colors: team.colors, age: p.age,
      score: lg.score, rings: p.awards.rings, tier: lg.tier.name, arch: archetypeById(p.arch).name, seed: run.seed,
      date: new Date().toISOString().slice(0, 10),
    });
    this.lines = [];
    for (const [label, n, pts] of lg.parts) this.lines.push([`${label} ${n}`, `${pts > 0 ? '+' : ''}${pts}`]);
    this.lines.push(['BASIS', String(lg.base)]);
    const mp = lg.multParts.map(([n, v]) => `${n} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`).join(' ');
    this.lines.push([mp ? mp.slice(0, 30) : 'MULTIPLIKATOR', 'X' + lg.mult.toFixed(2)]);
    this.shown = 0;
  }
  update(game) {
    if (this.phase === 'calc') {
      if (this.shown < this.lines.length) {
        if (this.t % 12 === 0 || input.pressed('a')) { this.shown++; sfx.tick(); }
        return;
      }
      if (!this.countT) { this.countT = this.t; }
      const k = Math.min(1, (this.t - this.countT) / 60);
      if (k < 1 && this.t % 4 === 0) sfx.tick();
      if (k >= 1 && !this.fanfared) { this.fanfared = true; sfx.fanfare(); sfx.crowd(2); }
      if (k >= 1 && input.pressed('a')) {
        if (this.unlocks.length && !this.box) { this.box = new TextBox(`FREIGESCHALTET: ${this.unlocks.join(', ')}!`); return; }
        this.phase = 'card'; sfx.select();
      }
      if (this.box && this.box.update()) { this.box = null; this.phase = 'card'; }
      return;
    }
    if (input.pressed('right')) { this.i = (this.i + 1) % MENU.length; sfx.blip(); }
    if (input.pressed('left')) { this.i = (this.i + MENU.length - 1) % MENU.length; sfx.blip(); }
    if (input.pressed('a')) {
      sfx.select();
      const m = MENU[this.i];
      if (m === 'NEU' || m === 'MENUE') {
        Promise.all([import('./create.js'), import('../systems/rng.js'), import('./title.js')]).then(([c, r, tt]) => {
          game.set(m === 'NEU' ? new c.CreateScene(r.randomSeedString()) : new tt.TitleScene());
        });
      } else if (m === 'PNG') this.exportPng();
      else if (m === 'SEED') this.copySeed();
    }
  }
  copySeed() {
    const s = this.run.seed;
    const url = `${location.origin}${location.pathname}?seed=${s}`;
    const done = ok => { this.note = ok ? 'SEED KOPIERT!' : `SEED: ${s}`; };
    try { navigator.clipboard.writeText(`Hardwood Legacy Seed ${s} – Score ${this.lg.score}: ${url}`).then(() => done(true), () => done(false)); }
    catch { done(false); }
  }
  exportPng() {
    try {
      const cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      const c = cv.getContext('2d');
      c.fillStyle = C.BG; c.fillRect(0, 0, W, H);
      this.drawCard(c, 0, false);
      const big = document.createElement('canvas');
      big.width = W * 4; big.height = H * 4;
      const b = big.getContext('2d');
      b.imageSmoothingEnabled = false;
      b.drawImage(cv, 0, 0, big.width, big.height);
      big.toBlob(blob => {
        if (!blob) { this.note = 'PNG FEHLER'; return; }
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `hardwood-legacy-${this.run.p.last.toLowerCase()}-${this.lg.score}.png`;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        this.note = 'PNG GESPEICHERT!';
      });
    } catch { this.note = 'PNG FEHLER'; }
  }
  drawCard(ctx, t, withMenu = true) {
    const run = this.run, p = run.p, lg = this.lg, a = p.awards;
    const team = run.teams[p.teamId];
    box(ctx, 1, 1, 158, withMenu ? 130 : 142);
    // Kopf
    text(ctx, p.first.slice(0, 18), 8, 7, C.WHITE);
    text(ctx, p.last.slice(0, 14), 8, 17, C.ORANGE);
    const y0 = run.log[0]?.year ?? run.year, y1 = run.log[run.log.length - 1]?.year ?? run.year;
    tiny(ctx, `${p.pos} ${archetypeById(p.arch).name.toUpperCase()}  ${y0}-${y1}`, 8, 27);
    // Sprite-Rahmen
    ctx.fillStyle = C.DARK; ctx.fillRect(8, 35, 38, 54);
    ctx.fillStyle = C.WHITE; ctx.fillRect(8, 35, 38, 1); ctx.fillRect(8, 88, 38, 1); ctx.fillRect(8, 35, 1, 54); ctx.fillRect(45, 35, 1, 54);
    drawSprite(ctx, p.look, team.colors, 11, 38, { frame: idleFrame(t), scale: 2, age: p.age });
    // Stats
    const rows = [
      ['RINGE', a.rings], ['MVP', a.mvp], ['FINALS MVP', a.fmvp], ['DPOY', a.dpoy],
      ['SCORING', a.scoring], ['ALL-STAR', a.allStar], ['SEASONS', p.career.seasons], ['PUNKTE', p.career.pts],
    ];
    rows.forEach(([l, v], i) => {
      const y = 36 + i * 7;
      tiny(ctx, l, 52, y);
      tiny(ctx, String(v), 151, y, v && i < 6 ? C.ORANGE : C.WHITE, 'right');
    });
    tiny(ctx, 'TEAMS ' + p.teamsPlayed.map(id => run.teams[id].abbr).join(' ').slice(0, 30), 8, 92);
    const mtxt = lg.multParts.length ? lg.multParts.map(([n]) => n).join(' + ') : 'KEIN BONUS';
    tiny(ctx, `X${lg.mult.toFixed(2)} ${mtxt}`.slice(0, 37), 8, 98, lg.mult >= 1 ? C.WHITE : C.ORANGE);
    bigText(ctx, lg.score, 80, 105, C.ORANGE, 2);
    tiny(ctx, withMenu && this.note ? this.note : lg.tier.name.toUpperCase(), 80, withMenu ? 122 : 124, withMenu && this.note ? C.ORANGE : C.WHITE, 'center');
    if (!withMenu) tiny(ctx, `HARDWOOD LEGACY  SEED ${run.seed}`, 80, 135, C.ORANGE, 'center');
  }
  draw(ctx, game) {
    if (this.phase === 'calc') {
      header(ctx, 'LEGACY', this.run.seed);
      this.lines.slice(0, this.shown).forEach(([l, v], i) => {
        const y = 16 + i * 6;
        const strong = i >= this.lines.length - 2;
        tiny(ctx, l, 6, y, strong ? C.ORANGE : C.WHITE);
        tiny(ctx, v, 154, y, strong ? C.ORANGE : C.WHITE, 'right');
      });
      if (this.shown >= this.lines.length) {
        const k = Math.min(1, (this.t - (this.countT || this.t)) / 60);
        bigText(ctx, Math.round(this.lg.score * k), 80, 102, C.ORANGE, 2);
        if (k >= 1) {
          text(ctx, this.lg.tier.name.slice(0, 18), 80, 120, C.WHITE, 'center');
          if (this.rank >= 0 && this.rank < 10) tiny(ctx, `HALL OF FAME PLATZ ${this.rank + 1}`, 80, 131, C.ORANGE, 'center');
          if (!this.box) tiny(ctx, 'A = KARTE', 80, 138, C.WHITE, 'center');
        }
      }
      if (this.box) this.box.draw(ctx, this.t);
      return;
    }
    this.drawCard(ctx, this.t, true);
    MENU.forEach((m, k) => {
      const x = 4 + k * 39;
      if (k === this.i) cursor(ctx, x, 134);
      tiny(ctx, m, x + 7, 135, k === this.i ? C.ORANGE : C.WHITE);
    });
  }
}

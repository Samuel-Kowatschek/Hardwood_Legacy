// Legacy-Screen: Berechnung + Ranking -> Trading-Card. PNG-Export + Seed kopieren.
import { Scene } from './scene.js';
import { C, W, H, text, tiny, box, cursor } from '../gfx.js';
import { header, bigText, TextBox } from '../ui.js';
import { input } from '../input.js';
import { sfx, playMusic } from '../systems/audio.js';
import { save } from '../systems/save.js';
import { t } from '../i18n/index.js';
import { legacy } from '../systems/legacy.js';
import { percentileOf } from '../data/scoreDist.js';
import { archetypeById, ARCHETYPES } from '../data/archetypes.js';
import { PERKS } from '../data/perks.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';
import { openShare } from '../helpModal.js';

export class LegacyScene extends Scene {
  constructor(run) {
    super();
    this.run = run;
    this.lg = legacy(run);
    this.phase = 'calc';
    this.i = 0; this.note = ''; this.unlocks = []; this.saved = false;
    this.noStats = true;
  }
  enter(game) {
    playMusic('title');
    game.run = null;
    if (this.saved) return;
    this.saved = true;
    save.clearRun(); // Run beendet: Spielstand loeschen
    const run = this.run, p = run.p, lg = this.lg;
    const meta = save.meta();
    const metaBefore = { ...meta, unlocked: meta.unlocked.slice(), ach: { ...(meta.ach || {}) } };
    this.prevBest = meta.runs ? meta.best : null;
    this.newBest = meta.runs > 0 && lg.score > meta.best;
    meta.runs++;
    meta.best = Math.max(meta.best, lg.score);
    meta.totalRings += p.awards.rings;
    meta.fmvps += p.awards.fmvp;
    meta.bestTier = Math.max(meta.bestTier, lg.tier.idx);
    meta.scores = (meta.scores || []).concat(lg.score).slice(-500);
    // Erfolge fuer Freischaltungen
    const a = p.awards, ach = meta.ach = { ...(meta.ach || {}) };
    const peakOvr = Math.max(0, ...run.log.map(l => l.ovr || 0));
    if (a.allStar > 0) ach.allstar = true;
    if (a.dpoy > 0) ach.dpoy = true;
    if (a.mvp > 0) ach.mvp = true;
    if (a.rings > 0) ach.ring = true;
    if (a.rings >= 3) ach.rings3 = true;
    if (a.fmvp > 0) ach.fmvp = true;
    if ((a.contests || 0) > 0) ach.contest = true;
    if (p.flags.hundred) ach.hundred = true;
    if (lg.score >= 1000) ach.legacy1000 = true;
    if (p.career.seasons >= 15) ach.seasons15 = true;
    if (peakOvr >= 90) ach.ovr90 = true;
    this.localRank = meta.scores.filter(s => s > lg.score).length + 1;
    this.localN = meta.scores.length;
    this.pctl = percentileOf(lg.score);
    for (const x of [...ARCHETYPES, ...PERKS]) {
      if (x.unlock && !x.unlock.test(metaBefore) && !meta.unlocked.includes(x.id) && x.unlock.test(meta)) {
        meta.unlocked.push(x.id);
        this.unlocks.push(x.name);
      }
    }
    // Testmodus: nichts dauerhaft speichern (keine Unlocks, keine Hall of Fame)
    if (run.test) { this.unlocks = []; this.rank = -1; } else save.setMeta(meta);
    const team = run.teams[p.teamId];
    if (!run.test) this.rank = save.addHof({
      first: p.first, last: p.last, look: p.look, colors: team.colors, age: p.age,
      score: lg.score, rings: p.awards.rings, tier: t('tiers')[lg.tier.idx], arch: archetypeById(p.arch).name, seed: run.seed,
      date: new Date().toISOString().slice(0, 10),
    });
    this.lines = [];
    for (const [key, n, pts] of lg.parts) this.lines.push([`${t('legacy.parts.' + key)} ${n}`, `${pts > 0 ? '+' : ''}${pts}`]);
    this.lines.push([t('legacy.base'), String(lg.base)]);
    const mp = lg.multParts.map(([n, v]) => `${t('mult.' + n)} ${v > 0 ? '+' : ''}${Math.round(v * 100)}%`).join(' ');
    this.lines.push([mp ? mp.slice(0, 30) : t('legacy.mult'), 'X' + lg.mult.toFixed(2)]);
    this.shown = 0;
  }
  get tierName() { return t('tiers')[this.lg.tier.idx]; }
  update(game) {
    if (this.phase === 'calc') {
      if (this.shown < this.lines.length) {
        if (this.t % 12 === 0 || input.pressed('a')) { this.shown++; sfx.tick(); }
        return;
      }
      if (!this.countT) this.countT = this.t;
      const k = Math.min(1, (this.t - this.countT) / 60);
      if (k < 1 && this.t % 4 === 0) sfx.tick();
      if (k >= 1 && !this.fanfared) { this.fanfared = true; sfx.fanfare(); sfx.crowd(2); }
      if (this.box) { if (this.box.update()) { this.box = null; this.phase = 'card'; } return; }
      if (k >= 1 && input.pressed('a')) {
        if (this.unlocks.length) { this.box = new TextBox(t('legacy.unlocked', { x: this.unlocks.join(', ') })); return; }
        this.phase = 'card'; sfx.select();
      }
      return;
    }
    const menu = t('legacy.menu');
    if (input.pressed('right')) { this.i = (this.i + 1) % menu.length; sfx.blip(); }
    if (input.pressed('left')) { this.i = (this.i + menu.length - 1) % menu.length; sfx.blip(); }
    if (input.pressed('b')) { this.i = 2; }
    const clicked = this.clickRow != null;
    if (clicked) { this.i = this.clickRow; this.clickRow = null; }
    if (input.pressed('a') || clicked) {
      sfx.select();
      if (this.i === 0 || this.i === 2) {
        Promise.all([import('./create.js'), import('../systems/rng.js'), import('./title.js')]).then(([c, r, tt]) => {
          game.set(this.i === 0 ? new c.CreateScene(r.randomSeedString()) : new tt.TitleScene());
        });
      } else this.share();
    }
  }
  // Legacy-Karte als PNG (4x skaliert)
  makePng() {
    return new Promise(res => {
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
        big.toBlob(blob => res(blob), 'image/png');
      } catch { res(null); }
    });
  }
  share() {
    const s = this.run.seed;
    const url = `${location.origin}${location.pathname}?seed=${s}`;
    openShare({
      text: t('share.text', { tier: this.tierName, score: this.lg.score, s }), url,
      file: `hardwood-legacy-${this.run.p.last.toLowerCase().replace(/[^a-z]/g, '')}-${this.lg.score}.png`,
      png: () => this.makePng(),
    });
  }
  drawCard(ctx, tt, withMenu = true) {
    const run = this.run, p = run.p, lg = this.lg, a = p.awards;
    const team = run.teams[p.teamId];
    box(ctx, 1, 1, 158, withMenu ? 130 : 142);
    text(ctx, p.first.slice(0, 18), 8, 7, C.WHITE);
    text(ctx, p.last.slice(0, 14), 8, 17, C.ORANGE);
    const y0 = run.log[0]?.year ?? run.year, y1 = run.log[run.log.length - 1]?.year ?? run.year;
    tiny(ctx, `${p.pos} ${archetypeById(p.arch).name.toUpperCase()}  ${y0}-${y1}`, 8, 27);
    ctx.fillStyle = C.DARK; ctx.fillRect(8, 35, 38, 54);
    ctx.fillStyle = C.WHITE; ctx.fillRect(8, 35, 38, 1); ctx.fillRect(8, 88, 38, 1); ctx.fillRect(8, 35, 1, 54); ctx.fillRect(45, 35, 1, 54);
    drawSprite(ctx, p.look, team.colors, 11, 38, { frame: idleFrame(tt), scale: 2, age: p.age });
    const r = k => t('legacy.rows.' + k);
    const rows = [[r('rings'), a.rings], [r('mvp'), a.mvp], [r('fmvp'), a.fmvp], [r('dpoy'), a.dpoy],
      [r('scoring'), a.scoring], [r('allStar'), a.allStar], [r('seasons'), p.career.seasons], [r('points'), p.career.pts]];
    rows.forEach(([l, v], i) => {
      const y = 36 + i * 7;
      tiny(ctx, l, 52, y);
      tiny(ctx, String(v), 151, y, v && i < 6 ? C.ORANGE : C.WHITE, 'right');
    });
    tiny(ctx, t('legacy.teams', { x: p.teamsPlayed.map(id => run.teams[id].abbr).join(' ') }).slice(0, 36), 8, 92);
    const mtxt = lg.multParts.length ? lg.multParts.map(([n]) => t('mult.' + n)).join(' + ') : t('legacy.noBonus');
    tiny(ctx, `X${lg.mult.toFixed(2)} ${mtxt}`.slice(0, 37), 8, 98, lg.mult >= 1 ? C.WHITE : C.ORANGE);
    bigText(ctx, lg.score, 80, 105, C.ORANGE, 2);
    const showNote = withMenu && this.note;
    tiny(ctx, showNote ? this.note : this.tierName.toUpperCase(), 80, withMenu ? 122 : 124, showNote ? C.ORANGE : C.WHITE, 'center');
    if (!withMenu) tiny(ctx, `HARDWOOD LEGACY  SEED ${run.seed}`, 80, 135, C.ORANGE, 'center');
  }
  draw(ctx) {
    if (this.phase === 'calc') {
      header(ctx, t('legacy.title'), this.run.seed);
      this.lines.slice(0, this.shown).forEach(([l, v], i) => {
        const y = 16 + i * 6, strong = i >= this.lines.length - 2;
        tiny(ctx, l, 6, y, strong ? C.ORANGE : C.WHITE);
        tiny(ctx, v, 154, y, strong ? C.ORANGE : C.WHITE, 'right');
      });
      if (this.shown >= this.lines.length) {
        const k = Math.min(1, (this.t - (this.countT || this.t)) / 60);
        bigText(ctx, Math.round(this.lg.score * k), 80, 96, C.ORANGE, 2);
        if (k >= 1) {
          text(ctx, this.tierName.slice(0, 18), 80, 113, C.WHITE, 'center');
          tiny(ctx, t('legacy.pctl', { p: this.pctl }), 80, 123, C.ORANGE, 'center');
          const loc = this.newBest ? t('legacy.newBest') : t('legacy.localRank', { r: this.localRank, n: this.localN });
          tiny(ctx, loc, 80, 130, this.newBest ? C.ORANGE : C.WHITE, 'center');
          if (!this.box) tiny(ctx, t('legacy.card'), 80, 138, C.WHITE, 'center');
        }
      }
      if (this.box) this.box.draw(ctx, this.t);
      return;
    }
    this.drawCard(ctx, this.t, true);
    t('legacy.menu').forEach((m, k) => {
      const x = 8 + k * 52;
      input.region(x - 2, 131, 38, 12, () => { if (this.i !== k) { this.i = k; sfx.blip(); } }, () => { this.clickRow = k; });
      if (k === this.i) cursor(ctx, x, 134);
      tiny(ctx, m, x + 7, 135, k === this.i ? C.ORANGE : C.WHITE);
    });
  }
}

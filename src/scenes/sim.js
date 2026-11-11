// Regular Season: Record laeuft hoch und wird fuer Events unterbrochen (Flow ruft playTo(k) mehrfach auf).
import { Scene } from './scene.js';
import { C, text, tiny, bar } from '../gfx.js';
import { header, TextBox, bigText } from '../ui.js';
import { input } from '../input.js';
import { sfx, playMusic } from '../systems/audio.js';
import { t } from '../i18n/index.js';
import { simTo, standingsOf, ovr } from '../systems/sim.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';
import { odds } from '../systems/testmode.js';

const FRAMES_PER_GAME = 2.4;

export class SimScene extends Scene {
  constructor(run, st) {
    super();
    this.run = run; this.st = st;
    this.shown = { g: 0, recs: st.recs.map(r => ({ w: 0, l: 0 })) };
    this.from = null; this.anim = null; this.box = null; this.note = null;
  }
  enter() { playMusic('season'); }
  // Simuliert bis Anteil k der Season und animiert dorthin. Liefert ggf. eine neue Verletzung.
  playTo(k) {
    const target = Math.round(82 * k);
    const before = this.st.recs.map(r => ({ w: r.w, l: r.l }));
    const g0 = this.st.g;
    const injury = simTo(this.run, this.st, target);
    if (injury) this.note = injury;
    const dur = Math.max(1, Math.round((this.st.g - g0) * FRAMES_PER_GAME));
    return new Promise(res => { this.anim = { t: 0, dur, before, g0, res, injury }; });
  }
  summary(msg) {
    this.box = new TextBox(msg);
    return new Promise(res => { this.boxRes = res; });
  }
  update() {
    if (this.anim) {
      const a = this.anim;
      a.t++;
      if (input.pressed('a') && a.t > 4) a.t = a.dur;
      if (a.t % 6 === 0) sfx.tick();
      const k = Math.min(1, a.t / a.dur);
      this.shown.g = Math.round(a.g0 + (this.st.g - a.g0) * k);
      this.shown.recs = this.st.recs.map((r, i) => ({
        w: Math.round(a.before[i].w + (r.w - a.before[i].w) * k), l: Math.round(a.before[i].l + (r.l - a.before[i].l) * k),
      }));
      if (k >= 1) { this.anim = null; a.res(a.injury); }
    } else if (this.box) {
      if (this.box.update()) { this.box = null; const r = this.boxRes; this.boxRes = null; r?.(); }
    }
  }
  draw(ctx) {
    const { run } = this;
    const p = run.p, team = run.teams[p.teamId];
    header(ctx, t('sim.title'), String(run.year));
    const mine = this.shown.recs[p.teamId];
    drawSprite(ctx, p.look, team.colors, 4, 16, { frame: idleFrame(this.t), age: p.age });
    bigText(ctx, `${mine.w}-${mine.l}`, 84, 17, C.ORANGE, 2);
    bar(ctx, 24, 36, 132, 4, this.shown.g / 82);
    tiny(ctx, t('sim.games', { g: this.shown.g }), 24, 42, C.WHITE);
    tiny(ctx, t('sim.ovr', { o: ovr(p) }), 156, 42, C.WHITE, 'right');
    if (this.st.gp) {
      const gp = this.st.gp;
      tiny(ctx, `PPG ${(this.st.pts / gp).toFixed(1)}  RPG ${(this.st.reb / gp).toFixed(1)}  APG ${(this.st.ast / gp).toFixed(1)}`, 80, 48, C.WHITE, 'center');
    }
    // Tabelle (live)
    const conf = team.conf;
    const live = { recs: this.st.recs.map((r, i) => ({ ...r, w: this.shown.recs[i].w, l: this.shown.recs[i].l, pct: this.shown.recs[i].w / Math.max(1, this.shown.recs[i].w + this.shown.recs[i].l) })) };
    const st = standingsOf(live)[conf];
    const rank = st.findIndex(r => r.id === p.teamId) + 1;
    let rows = st.slice(0, 6).map((r, i) => [i + 1, r]);
    if (rank > 6) rows = rows.slice(0, 5).concat([[rank, st[rank - 1]]]);
    tiny(ctx, conf === 'E' ? t('sim.confEast') : t('sim.confWest'), 8, 55, C.ORANGE);
    rows.forEach(([rk, r], i) => {
      const y = 61 + i * 6, col = r.id === p.teamId ? C.ORANGE : C.WHITE;
      tiny(ctx, `${rk}.`, 16, y, col, 'right');
      tiny(ctx, run.teams[r.id].abbr, 20, y, col);
      tiny(ctx, run.teams[r.id].nick.toUpperCase().slice(0, 16), 36, y, col);
      tiny(ctx, `${r.w}-${r.l}`, 150, y, col, 'right');
    });
    if (this.note) tiny(ctx, (this.note.major ? t('sim.injMajor', { g: this.note.games }) : t('sim.inj', { g: this.note.games })), 152, 55, C.ORANGE, 'right');
    if (this.box) this.box.draw(ctx, this.t);
    else if (this.anim) tiny(ctx, t('sim.faster'), 80, 130, C.WHITE, 'center');
    // Testmodus: Live-Chancen (alle 30 Frames neu berechnet)
    if (run.test && !this.box) {
      if (!this.odds || this.t % 30 === 0) this.odds = odds(run);
      const o = this.odds, pc = x => Math.round(x * 100) + '%';
      tiny(ctx, t('test.simLine1', { a: pc(o.allStar), m: pc(o.mvp), d: pc(o.dpoy) }), 8, 100, C.ORANGE);
      tiny(ctx, t('test.simLine2', { s: pc(o.scoring), p: pc(o.playoffs), r: pc(o.ring) }), 8, 107, C.ORANGE);
      tiny(ctx, t('test.simLine3'), 8, 114, C.WHITE);
    }
  }
}

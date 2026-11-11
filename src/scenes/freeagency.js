// Free-Agency-Auswahl: alle Teams (nach Staerke), Tags und Konsequenzen sichtbar; oben "Bleiben".
import { Scene } from './scene.js';
import { C, text, tiny, box, cursor, bar, upArrow, downArrow } from '../gfx.js';
import { header, TextBox } from '../ui.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { t } from '../i18n/index.js';
import { fx, hintFor } from '../data/cards.js';
import { faProfile, signWith } from '../systems/freeagency.js';
import { analyzeTeam } from '../systems/testmode.js';

const VIS = 7;

export class FreeAgencyScene extends Scene {
  constructor(run) {
    super();
    this.run = run; this.i = 0; this.scroll = 0; this.box = null; this.noStats = !run.test;
    this.teams = run.teams.filter(x => x.id !== run.p.teamId).sort((a, b) => b.base - a.base);
    this.profiles = Object.fromEntries(this.teams.map(x => [x.id, faProfile(run, x)]));
  }
  get rows() { return this.teams.length + 1; } // 0 = Bleiben
  choose(k) {
    sfx.select();
    let msg;
    if (k === 0) msg = t('fa.stayMsg') + ' ' + fx(this.run, { chem: 8 });
    else {
      const tm = this.teams[k - 1];
      msg = t('fa.signMsg', { city: tm.city, nick: tm.nick }) + ' ' + signWith(this.run, tm);
      if (this.profiles[tm.id].ringChase) msg += ' ' + t('fa.ringNote');
    }
    this.box = new TextBox(msg.trim());
  }
  update() {
    if (this.box) { if (this.box.update()) this.finish(); return; }
    const n = this.rows;
    if (input.pressed('down')) { this.i = (this.i + 1) % n; sfx.blip(); }
    if (input.pressed('up')) { this.i = (this.i + n - 1) % n; sfx.blip(); }
    if (this.clickRow != null) { this.i = this.clickRow; this.clickRow = null; return this.choose(this.i); }
    if (this.i < this.scroll) this.scroll = this.i;
    if (this.i >= this.scroll + VIS) this.scroll = this.i - VIS + 1;
    if (input.pressed('a')) this.choose(this.i);
  }
  tagText(pr) { return pr.tags.map(x => t('fa.tags.' + x)).join(' '); }
  draw(ctx) {
    const run = this.run;
    header(ctx, t('fa.title'), run.teams[run.p.teamId].abbr);
    box(ctx, 0, 14, 160, 88);
    for (let v = 0; v < VIS; v++) {
      const k = this.scroll + v;
      if (k >= this.rows) break;
      const y = 21 + v * 11;
      if (!this.box) input.region(4, y - 3, 152, 11, () => { if (this.i !== k) { this.i = k; sfx.blip(); } }, () => { this.clickRow = k; });
      if (k === this.i) cursor(ctx, 6, y - 1);
      const col = k === this.i ? C.ORANGE : C.WHITE;
      if (k === 0) { text(ctx, t('fa.stay'), 14, y - 1, col); continue; }
      const tm = this.teams[k - 1], pr = this.profiles[tm.id];
      tiny(ctx, tm.abbr, 14, y, col);
      tiny(ctx, tm.nick.toUpperCase().slice(0, 12), 30, y, col);
      bar(ctx, 82, y, 26, 5, (tm.base - 30) / 55, C.ORANGE);
      tiny(ctx, t('fa.tags.' + pr.tags[0]).slice(0, 10), 152, y, C.WHITE, 'right');
    }
    if (this.scroll > 0) upArrow(ctx, 77, 15);
    if (this.scroll + VIS < this.rows) downArrow(ctx, 74, 96, 0);
    // Details zum markierten Eintrag
    box(ctx, 0, 102, 160, 42);
    if (this.box) { this.box.draw(ctx, this.t); return; }
    if (this.i === 0) {
      tiny(ctx, t('fa.stayInfo'), 9, 110, C.WHITE);
      tiny(ctx, hintFor({ fx: { chem: 8 } }), 9, 119, C.ORANGE);
    } else {
      const tm = this.teams[this.i - 1], pr = this.profiles[tm.id];
      tiny(ctx, `${tm.city} ${tm.nick}`.toUpperCase().slice(0, 36), 9, 109, C.WHITE);
      tiny(ctx, this.tagText(pr).slice(0, 36), 9, 117, C.ORANGE);
      const eff = hintFor({ fx: pr.eff }) + (pr.ringChase ? '  ' + t('fa.ringChase') : '');
      tiny(ctx, eff.slice(0, 36), 9, 125, C.WHITE);
      if (run.test) {
        // Testmodus: Chancen-Aenderung bei diesem Wechsel (gecacht pro Eintrag)
        if (!this.tcache || this.tcache.i !== this.i) this.tcache = { i: this.i, s: analyzeTeam(run, tm, signWith) };
        tiny(ctx, this.tcache.s.slice(0, 36), 9, 133, C.ORANGE);
      } else tiny(ctx, t('fa.strength', { n: tm.base, r: pr.rank }), 9, 133, C.WHITE);
    }
  }
}

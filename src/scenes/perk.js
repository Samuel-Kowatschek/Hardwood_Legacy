// Perk-Wahl: 1 aus 3, Synergien werden angezeigt.
import { Scene } from './scene.js';
import { C, text, tiny, box, cursor } from '../gfx.js';
import { header, TextBox } from '../ui.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { save } from '../systems/save.js';
import { t } from '../i18n/index.js';
import { PERKS, perkById, activeSynergies, SYNERGIES } from '../data/perks.js';
import { clamp } from '../systems/rng.js';

export class PerkScene extends Scene {
  constructor(run) {
    super();
    this.run = run;
    const meta = save.meta();
    const have = run.p.perks;
    const avail = PERKS.filter(pk => !have.includes(pk.id) && (!pk.unlock || pk.unlock.test(meta) || meta.unlocked.includes(pk.id)));
    const partner = id => SYNERGIES.some(s => s.needs.includes(id) && s.needs.some(n => have.includes(n)));
    this.opts = [];
    const pool = avail.slice();
    while (this.opts.length < 3 && pool.length) {
      const pk = run.rng.weighted(pool, x => (partner(x.id) ? 3 : 1));
      this.opts.push(pk); pool.splice(pool.indexOf(pk), 1);
    }
    this.i = 0; this.box = null;
  }
  update() {
    if (this.box) { if (this.box.update()) this.finish(); return; }
    if (!this.opts.length) { this.finish(); return; }
    const n = this.opts.length;
    if (input.pressed('down')) { this.i = (this.i + 1) % n; sfx.blip(); }
    if (input.pressed('up')) { this.i = (this.i + n - 1) % n; sfx.blip(); }
    const clicked = this.clickRow != null;
    if (clicked) { this.i = this.clickRow; this.clickRow = null; }
    if (input.pressed('a') || clicked) {
      const pk = this.opts[this.i], p = this.run.p;
      const before = activeSynergies(p.perks).map(s => s.id);
      p.perks.push(pk.id);
      if (pk.skills) for (const k in pk.skills) p.skills[k] = clamp(p.skills[k] + pk.skills[k], 0, 99);
      const syn = activeSynergies(p.perks).filter(s => !before.includes(s.id));
      sfx.fanfare();
      this.box = new TextBox(t('perk.activated', { name: pk.name }) + (syn.length ? t('perk.synergy', { names: syn.map(s => s.name).join(', ') }) : ''));
    }
  }
  draw(ctx) {
    const p = this.run.p;
    header(ctx, t('perk.title'), t('perk.active', { n: p.perks.length }));
    this.opts.forEach((pk, k) => {
      const y = 15 + k * 26;
      if (!this.box) input.region(0, y, 160, 26, () => { if (this.i !== k) { this.i = k; sfx.blip(); } }, () => { this.clickRow = k; });
      box(ctx, 0, y, 160, 26);
      if (k === this.i) cursor(ctx, 7, y + 6);
      text(ctx, pk.name, 15, y + 6, k === this.i ? C.ORANGE : C.WHITE);
      tiny(ctx, t('perks.' + pk.id).slice(0, 34), 15, y + 16);
    });
    const syn = activeSynergies(p.perks);
    tiny(ctx, t('perk.activeList', { x: p.perks.map(id => perkById(id).name).join(', ') || '-' }).slice(0, 38), 2, 97);
    if (syn.length) tiny(ctx, t('perk.synList', { x: syn.map(s => s.name).join(', ') }).slice(0, 38), 2, 104, C.ORANGE);
    const sel = this.opts[this.i];
    if (sel && !this.box) {
      const hit = SYNERGIES.find(s => s.needs.includes(sel.id) && s.needs.every(n => n === sel.id || p.perks.includes(n)));
      if (hit) tiny(ctx, t('perk.synHint', { x: hit.name.toUpperCase() }), 2, 113, C.ORANGE);
    }
    if (this.box) this.box.draw(ctx, this.t);
  }
}

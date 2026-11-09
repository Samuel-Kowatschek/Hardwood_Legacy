// Perk-Wahl: 1 aus 3, Synergien werden angezeigt.
import { Scene } from './scene.js';
import { C, text, tiny, box, cursor } from '../gfx.js';
import { header, TextBox, Typewriter } from '../ui.js';
import { input } from '../input.js';
import { sfx } from '../systems/audio.js';
import { save } from '../systems/save.js';
import { PERKS, perkById, activeSynergies, SYNERGIES } from '../data/perks.js';
import { clamp } from '../systems/rng.js';

export class PerkScene extends Scene {
  constructor(run) {
    super();
    this.run = run;
    const meta = save.meta();
    const have = run.p.perks;
    const avail = PERKS.filter(pk => !have.includes(pk.id) && (!pk.unlock || pk.unlock.test(meta) || meta.unlocked.includes(pk.id)));
    // Synergie-Partner bevorzugen, damit Builds entstehen
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
    if (input.pressed('a')) {
      const pk = this.opts[this.i], p = this.run.p;
      const before = activeSynergies(p.perks).map(s => s.id);
      p.perks.push(pk.id);
      if (pk.skills) for (const k in pk.skills) p.skills[k] = clamp(p.skills[k] + pk.skills[k], 0, 99);
      const syn = activeSynergies(p.perks).filter(s => !before.includes(s.id));
      sfx.fanfare();
      this.box = new TextBox(`${pk.name} aktiviert!` + (syn.length ? ` SYNERGIE: ${syn.map(s => s.name).join(', ')}!` : ''));
    }
  }
  draw(ctx) {
    header(ctx, 'PERK WAEHLEN', `${this.run.p.perks.length} AKTIV`);
    this.opts.forEach((pk, k) => {
      const y = 16 + k * 26;
      box(ctx, 0, y, 160, 26);
      if (k === this.i) cursor(ctx, 5, y + 5);
      text(ctx, pk.name, 12, y + 5, k === this.i ? C.ORANGE : C.WHITE);
      tiny(ctx, pk.desc.slice(0, 36), 12, y + 16);
    });
    const p = this.run.p;
    const syn = activeSynergies(p.perks);
    tiny(ctx, 'AKTIV: ' + (p.perks.map(id => perkById(id).name.split(' ')[0].split('-')[0]).join(', ') || '-'), 2, 98, C.WHITE);
    if (syn.length) tiny(ctx, 'SYNERGIE: ' + syn.map(s => s.name).join(', '), 2, 105, C.ORANGE);
    // Hinweis auf moegliche Synergie
    const sel = this.opts[this.i];
    if (sel && !this.box) {
      const hit = SYNERGIES.find(s => s.needs.includes(sel.id) && s.needs.every(n => n === sel.id || p.perks.includes(n)));
      if (hit) tiny(ctx, `-> SYNERGIE ${hit.name.toUpperCase()}!`, 2, 114, C.ORANGE);
    }
    if (this.box) this.box.draw(ctx, this.t);
  }
}

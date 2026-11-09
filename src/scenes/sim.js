// Regular-Season-Sim: Record laeuft hoch (3-4 Sek.), Stats + Tabelle, dann Zusammenfassung.
import { Scene } from './scene.js';
import { C, text, tiny, bar } from '../gfx.js';
import { header, TextBox, bigText } from '../ui.js';
import { input } from '../input.js';
import { sfx, playMusic } from '../systems/audio.js';
import { drawSprite, idleFrame } from '../sprites/spriteGen.js';

const DUR = 200;

export class SimScene extends Scene {
  constructor(run, season) { super(); this.run = run; this.s = season; }
  enter() { playMusic('season'); this.box = null; }
  get k() { return Math.min(1, this.t / DUR); }
  update() {
    if (!this.box) {
      if (this.t % 6 === 0 && this.k < 1) sfx.tick();
      if (input.pressed('a') && this.t > 10) this.t = DUR;
      if (this.k >= 1) {
        const s = this.s;
        const confName = s.conf === 'E' ? 'Osten' : 'Westen';
        let msg = `${s.w}-${s.l}! Platz ${s.rank} im ${confName}. `;
        msg += s.rank <= 6 ? 'Ab in die Playoffs!' : s.rank <= 10 ? 'Das heisst Play-In!' : 'Keine Playoffs...';
        if (s.injury) msg += ` Verletzung: ${s.injury.games} Spiele verpasst.`;
        this.box = new TextBox(msg);
      }
    } else if (this.box.update()) this.finish();
  }
  draw(ctx) {
    const { run, s } = this, k = this.k;
    const p = run.p, team = run.teams[p.teamId];
    header(ctx, 'REGULAR SEASON', String(run.year));
    const w = Math.round(s.w * k), l = Math.round(s.l * k);
    drawSprite(ctx, p.look, team.colors, 4, 16, { frame: idleFrame(this.t), age: p.age });
    bigText(ctx, `${w}-${l}`, 84, 17, C.ORANGE, 2);
    bar(ctx, 24, 36, 132, 4, k);
    const gp = Math.round(s.gp * k);
    tiny(ctx, `PPG ${s.ppg.toFixed(1)}  RPG ${s.rpg.toFixed(1)}  APG ${s.apg.toFixed(1)}`, 80, 42, C.WHITE, 'center');
    tiny(ctx, `OVR ${s.ovr}   SPIELE ${gp}`, 80, 48, C.WHITE, 'center');
    // Tabelle der eigenen Conference
    const st = s.standings[s.conf];
    let rows = st.slice(0, 6).map((r, i) => [i + 1, r]);
    if (s.rank > 6) rows = rows.slice(0, 5).concat([[s.rank, st[s.rank - 1]]]);
    tiny(ctx, s.conf === 'E' ? 'OSTEN' : 'WESTEN', 8, 55, C.ORANGE);
    rows.forEach(([rk, r], i) => {
      const y = 61 + i * 6;
      const mine = r.id === p.teamId;
      const col = mine ? C.ORANGE : C.WHITE;
      const rw = Math.round(r.w * k), rl = Math.round(r.l * k);
      tiny(ctx, `${rk}.`, 16, y, col, 'right');
      tiny(ctx, run.teams[r.id].abbr, 20, y, col);
      tiny(ctx, run.teams[r.id].nick.toUpperCase().slice(0, 14), 36, y, col);
      tiny(ctx, `${rw}-${rl}`, 150, y, col, 'right');
    });
    if (s.injury && k > 0.45) tiny(ctx, s.injury.major ? 'SCHWER VERLETZT!' : 'VERLETZT!', 152, 55, C.ORANGE, 'right');
    if (this.box) this.box.draw(ctx, this.t);
    else tiny(ctx, 'A = SCHNELLER', 80, 130, C.WHITE, 'center');
  }
}

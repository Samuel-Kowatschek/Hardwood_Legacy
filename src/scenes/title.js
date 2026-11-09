import { Scene } from './scene.js';
import { C, text, tiny, box, ball } from '../gfx.js';
import { Menu, bigText } from '../ui.js';
import { save } from '../systems/save.js';
import { playMusic, isMuted } from '../systems/audio.js';
import { randomSeedString, dailySeedString, RNG } from '../systems/rng.js';
import { drawSprite, idleFrame, rollLook } from '../sprites/spriteGen.js';
import { CreateScene } from './create.js';
import { HofScene } from './hof.js';

export class TitleScene extends Scene {
  enter(game) {
    this.game = game;
    playMusic('title');
    this.meta = save.meta();
    try { this.touch = matchMedia('(pointer: coarse)').matches; } catch { this.touch = false; }
    const params = new URLSearchParams(location.search);
    this.urlSeed = (params.get('seed') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    this.buildMenu();
    const r = new RNG('title' + Math.floor(Date.now() / 60000));
    this.looks = [rollLook(r), rollLook(r)];
  }
  buildMenu() {
    const items = [{ label: 'NEUER RUN' }, { label: 'DAILY SEED' }];
    if (this.urlSeed) items.push({ label: `SEED ${this.urlSeed.slice(0, 7)}` });
    items.push({ label: 'HALL OF FAME' }, { label: isMuted() ? 'TON: AUS' : 'TON: AN' });
    this.items = items;
    this.menu = new Menu(items, { rowH: 10, hint: false });
  }
  update(game) {
    const i = this.menu.update();
    if (i === null) return;
    const lbl = this.items[i].label;
    if (lbl === 'NEUER RUN') game.set(new CreateScene(randomSeedString()));
    else if (lbl === 'DAILY SEED') game.set(new CreateScene(dailySeedString(), true));
    else if (lbl.startsWith('SEED')) game.set(new CreateScene(this.urlSeed));
    else if (lbl === 'HALL OF FAME') game.set(new HofScene());
    else { game.toggleMute(); const k = this.menu.i; this.buildMenu(); this.menu.i = k; }
  }
  draw(ctx, game) {
    const t = this.t;
    // Logo
    bigText(ctx, 'HARDWOOD', 80, 5, C.WHITE, 2);
    bigText(ctx, 'LEGACY', 80, 22, C.ORANGE, 2);
    ctx.fillStyle = C.WHITE; ctx.fillRect(16, 40, 128, 1);
    // Zwei Spieler + springender Ball
    drawSprite(ctx, this.looks[0], ['#1e5aa8', '#f97316'], 28, 44, { frame: idleFrame(t) });
    drawSprite(ctx, this.looks[1], ['#ffffff', '#142a63'], 116, 44, { frame: idleFrame(t + 16), view: 'front' });
    const bt = (t % 50) / 50;
    const bx = 48 + Math.round(64 * (t % 100 < 50 ? bt : 1 - bt));
    const by = 60 - Math.round(Math.sin(bt * Math.PI) * 16);
    ball(ctx, bx, by);
    box(ctx, 20, 70, 120, this.items.length * 10 + 9);
    this.menu.draw(ctx, 28, 75);
    tiny(ctx, this.meta.runs ? `RUNS ${this.meta.runs}  BEST ${this.meta.best}` : 'EIN RUN = EINE KARRIERE', 80, 133, C.WHITE, 'center');
    tiny(ctx, this.touch ? 'A = OK   B = ZURUECK' : 'A/Z/SPACE OK  X ZURUECK  M TON', 80, 139, C.ORANGE, 'center');
  }
}
